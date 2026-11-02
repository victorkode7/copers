(function () {
    const $ = id => document.getElementById(id), checks = [], content = window.adventureWorld;
    const check = (name,ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) throw new Error(name); };
    const draft = () => JSON.parse(localStorage.getItem('idleAdventureWorldEditorDraft')) || content;
    const tab = kind => document.querySelector('[data-kind="' + kind + '"]').click();
    const input = (node,value) => { node.value = value; node.dispatchEvent(new Event('input',{bubbles:true})); };
    const select = (node,value) => { node.value = value; node.dispatchEvent(new Event('change',{bubbles:true})); };
    const groups = () => [...$('entryList').querySelectorAll('[data-monster-group]')];
    try {
        tab('monsters');
        check('monster groups follow world progression order', content.worlds.every((world,index) => groups()[index]?.dataset.monsterGroup === world.id));
        const assigned = new Set(content.worlds.flatMap(world => world.mapIds.flatMap(id => content.maps.find(map => map.id === id)?.spawns.map(spawn => spawn.monsterId) || [])));
        const uncategorized = content.monsters.filter(monster => !assigned.has(monster.id));
        check('unassigned monsters appear last under Uncategorized', !uncategorized.length || groups().at(-1).dataset.monsterGroup === 'uncategorized' && uncategorized.every(monster => groups().at(-1).querySelector('[data-entry-id="' + monster.id + '"]')));
        check('every monster remains visible in the grouped catalogue', content.monsters.every(monster => $('entryList').querySelector('[data-entry-id="' + monster.id + '"]')));
        $('addEntry').click(); const addedMonster = $('entryId').value;
        check('new monsters begin in Uncategorized', $('entryList').querySelector('[data-monster-group="uncategorized"] [data-entry-id="' + addedMonster + '"]'));
        $('undo').click(); tab('maps');
        const secondWorld = content.worlds[1], sharedId = content.maps.find(map => map.id === secondWorld.mapIds[0]).spawns[0].monsterId;
        select($('spawn-0-monster'), sharedId); tab('monsters');
        check('shared monsters appear under each world using them', [content.worlds[0],secondWorld].every(world => $('entryList').querySelector('[data-monster-group="' + world.id + '"] [data-entry-id="' + sharedId + '"]')));
        input($('search'),content.monsters.find(monster => monster.id === sharedId).name);
        check('search filters monsters within their world groups', $('entryList').querySelectorAll('[data-entry-id="' + sharedId + '"]').length === 2 && groups().every(group => group.querySelector('[data-entry-id="' + sharedId + '"]')));
        $('entryList').querySelector('[data-entry-id="' + sharedId + '"]').click();
        check('grouped monster entries still open the correct definition', $('entryId').value === sharedId);
        input($('search'),'No matching monster 0000');
        check('empty monster searches remain readable', $('entryList').textContent === 'No matches.');
        input($('search'),''); $('undo').click(); tab('monsters');
        check('undo updates world membership without reordering definitions', draft().monsters.map(monster => monster.id).join() === content.monsters.map(monster => monster.id).join() && !$('entryList').querySelector('[data-monster-group="' + content.worlds[0].id + '"] [data-entry-id="' + sharedId + '"]'));
        check('no editor runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch(error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre'); report.id='smoke-results'; report.textContent=checks.join('\n'); document.body.append(report);
}());
