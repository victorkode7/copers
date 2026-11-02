(function () {
    const $ = id => document.getElementById(id);
    const draftKey = 'idleAdventureWorldEditorDraft';
    const backupKey = 'idleAdventureWorldEditorPreviousDraft';
    const phaseKey = 'worldProjectLoadSmoke';
    const phase = JSON.parse(sessionStorage.getItem(phaseKey) || 'null');
    const checks = phase?.checks || [];
    const check = (label, ok) => {
        checks.push((ok ? 'PASS ' : 'FAIL ') + label);
        if (!ok) throw new Error(label);
    };
    const draft = () => JSON.parse(localStorage.getItem(draftKey));
    const until = async predicate => {
        for (let i=0; i<300; i++) { if(predicate())return; await new Promise(resolve => setTimeout(resolve,10)); }
        throw new Error('Timed out loading project: ' + $('status').textContent);
    };
    const reload = step => {
        sessionStorage.setItem(phaseKey, JSON.stringify({step, checks}));
        location.reload();
    };
    async function run() {
        try {
            if (!phase) {
                const old = WorldContent.clone(window.adventureWorld);
                old.worlds = old.worlds.slice(0, 1);
                old.maps = old.maps.slice(0, 1);
                old.monsters = old.monsters.slice(0, 1);
                const boss = window.adventureWorld.monsters.find(monster => monster.name === 'Mr boss man');
                if(boss) old.monsters.push({...WorldContent.clone(boss),health:10,accuracy:50});
                old.worlds[0].mapIds = [old.maps[0].id];
                old.maps[0].spawns = [{id: 'main', monsterId: old.monsters[0].id, count: 1, overrides: {}}];
                old.maps[0].goal = 777;
                localStorage.setItem(draftKey, JSON.stringify(old));
                reload('stale'); return;
            }
            if (phase.step === 'stale') {
                check('stale draft is identified without discarding edits', $('status').textContent.includes('Your browser draft omits') && $('mapGoal').value === '777');
                const boss = window.adventureWorld.monsters.find(monster => monster.name === 'Mr boss man');
                if(boss) {
                    check('stale monster stats are identified as browser draft values', $('status').textContent.includes('draft stats that differ'));
                    document.querySelector('[data-kind="monsters"]').click();
                    $('entryList').querySelector('[data-entry-id="' + boss.id + '"]').click();
                    check('the test reproduces the stale boss HP', $('monster-health').value === '10');
                }
                const previous = localStorage.getItem(draftKey);
                // Failure to save the backup must leave the active draft untouched.
                const original = Storage.prototype.setItem;
                Storage.prototype.setItem = function (key, value) {
                    if (key === backupKey) throw new Error('Storage full');
                    return original.call(this, key, value);
                };
                try {
                    $('loadProject').click();
                    check('backup failure prevents replacing the draft', localStorage.getItem(draftKey) === previous && $('status').textContent.includes('Storage full'));
                } finally { Storage.prototype.setItem = original; }
                $('search').value = 'missing search';
                $('search').dispatchEvent(new Event('input', {bubbles: true}));
                $('loadProject').click();
                await until(() => !$('loadProject').disabled);
                const loaded = draft();
                check('load uses all current worlds maps and monsters', ['worlds', 'maps', 'monsters'].every(kind => loaded[kind].length === window.adventureWorld[kind].length));
                check('load preserves project content and its existing validation issues', JSON.stringify(WorldContent.validate(loaded, window.adventureItems)) === JSON.stringify(WorldContent.validate(window.adventureWorld, window.adventureItems)));
                if(boss) {
                    check('project loading preserves the selected boss and refreshes HP and accuracy', $('entryId').value === boss.id && Number($('monster-health').value) === boss.health && Number($('monster-accuracy').value) === boss.accuracy);
                    const map = loaded.maps.find(map => map.spawns.some(spawn => spawn.monsterId === boss.id));
                    check('editor values match the monster definition used by the game', WorldContent.definitions(loaded,map).find(monster => monster.monsterId === boss.id).health === Number($('monster-health').value));
                    check('loading does not delete unresolved boss drop references', JSON.stringify(loaded.monsters.find(monster => monster.id === boss.id).itemDrops) === JSON.stringify(boss.itemDrops));
                }
                if(WorldContent.validate(loaded,window.adventureItems).length) check('project values load despite unrelated drop validation warnings', $('status').textContent.startsWith('Loaded project content') && $('status').textContent.includes('validation issue') && $('exportGame').disabled);
                check('old draft is backed up exactly', localStorage.getItem(backupKey) === previous);
                check('search is cleared to reveal project entries', $('search').value === '');
                reload('loaded'); return;
            }
            check('project content stays loaded after reload', draft().maps.length === window.adventureWorld.maps.length && draft().monsters.length === window.adventureWorld.monsters.length);
            check('backup recovery remains available after reload', !$('restorePreviousDraft').hidden);
            $('restorePreviousDraft').click();
            check('old draft and edits can be recovered', draft().maps.length === 1 && draft().maps[0].goal === 777 && $('mapGoal').value === '777');
            $('undo').click();
            check('draft recovery can be undone', draft().maps.length === window.adventureWorld.maps.length);
            check('no editor runtime errors', !window.smokeErrors.length);
            sessionStorage.removeItem(phaseKey);
            checks.push('SMOKE PASSED');
        } catch (error) { checks.push('ERROR ' + error.stack); }
        const output = document.createElement('pre');
        output.id = 'smoke-results'; output.textContent = checks.join('\n'); document.body.append(output);
    }
    run();
}());
