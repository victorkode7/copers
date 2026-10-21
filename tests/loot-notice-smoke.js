(async function () {
    const checks = [];
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const priorRandom = Math.random, priorMatchMedia = window.matchMedia;
    try {
        await document.fonts.ready;
        state.currentView = 'map'; render();
        check('empty state explains how to find loot', elements.lastDrop.textContent.includes('Defeat enemies'));
        const map = currentMap();
        map.drops = [{id: 'gel', amount: [2, 2], chance: 1}];
        map.itemDrops = [];
        map.spawns = [{id: 'lootNoticeMob', monsterId: worldContent.monsters[0].id, count: 1, overrides: {
            gold: [7, 7], experience: 0, drops: [{id: 'gel', amount: [3, 3], chance: 1}],
            itemDrops: [{id: 'testDropHelm', chance: 1}]
        }}];
        itemById.testDropHelm.sprite = 'tests/fixtures/equipment-sprite.svg';
        itemById.testDropHelm.name = 'A surprisingly long equipment name that should fit neatly inside the loot notification';
        state.gold = 0; state.materials.gel = 0;
        resetMonsterStates(map); Math.random = () => 0;
        defeatEnemy(state.monsterStates[0]); renderCombat();
        check('loot rewards do not change awarded quantities', state.gold === 7 && state.materials.gel === 5 && ownsItem('testDropHelm'));
        const chips = [...elements.lastDrop.querySelectorAll('.loot-reward')];
        check('matching material drops combine into a single readable quantity', chips.length === 2 && chips.some(chip => chip.textContent === materialNames.gel + '×5') && chips.some(chip => chip.textContent === 'Gold+7'));
        check('materials work without sprites', !elements.lastDrop.querySelector('.loot-rewards img'));
        const equipment = elements.lastDrop.querySelector('.loot-equipment-drop');
        const equipmentGroup = elements.lastDrop.querySelector('.loot-equipment');
        check('equipment uses its sprite and rarity color', equipment.dataset.rarity === 'rare' && equipment.querySelector('img').getAttribute('src') === itemById.testDropHelm.sprite && getComputedStyle(equipment.querySelector('strong')).color === 'rgb(131, 191, 255)');
        check('new drops animate once', window.matchMedia('(prefers-reduced-motion: reduce)').matches || elements.lastDrop.querySelector('.loot-rewards').getAnimations().length === 1);
        renderCombat();
        check('combat updates preserve notification nodes instead of restarting effects', chips[0] === elements.lastDrop.querySelector('.loot-reward'));
        const notice = elements.lastDrop.getBoundingClientRect();
        check('long equipment names stay inside the notification', equipment.getBoundingClientRect().right <= notice.right && equipment.scrollWidth <= equipment.clientWidth + 1);
        check('loot strip sits outside the combat background', !elements.combatPanel.contains(elements.lastDrop) && notice.top >= elements.combatPanel.getBoundingClientRect().bottom);
        window.matchMedia = query => query === '(prefers-reduced-motion: reduce)' ? {matches: true} : priorMatchMedia.call(window, query);
        state.monsterStates[0].hp = 1; state.monsterStates[0].respawnRemaining = 0;
        defeatEnemy(state.monsterStates[0]); renderCombat();
        check('equipment stays highlighted while later material drops update', elements.lastDrop.querySelector('.loot-equipment') === equipmentGroup && state.gold === 14 && state.materials.gel === 10 && state.ownedItemIds.filter(id => id === 'testDropHelm').length === 1);
        check('reduced motion disables notification animations', elements.lastDrop.querySelector('.loot-rewards').getAnimations().length === 0);
        saveGame(); state.lastLoot = null;
        check('structured loot survives saving and loading', loadGame() && state.lastLoot.gold === 7 && state.lastLoot.materials[0].amount === 5 && state.lastLoot.equipment[0] === 'testDropHelm');
        renderCombat();
        const saved = JSON.parse(localStorage.getItem(saveKey));
        delete saved.lastLoot; localStorage.setItem(saveKey, JSON.stringify(saved));
        check('legacy saves retain progress without structured loot', loadGame() && state.lastLoot === null && state.gold === 14 && ownsItem('testDropHelm'));
        renderCombat();
        check('legacy loot messages remain readable', elements.lastDrop.textContent.includes(state.lastDrop));
        check('invalid optional loot data is safely ignored', normalizeLootNotice({gold: 7, materials: [{id: {toString: 1}, amount: 3}], equipment: [{toString: 1}, 'missing']}).equipment.length === 0 && normalizeLootNotice({gold: 'bad', materials: [], equipment: []}) === null);
        state.lastLoot = {gold: 0, materials: [], equipment: []}; renderCombat();
        check('zero-reward kills have a readable empty state', elements.lastDrop.textContent.includes('No gold or materials'));
        state.lastLoot = {gold: 7, materials: [], equipment: ['testDropHelm']}; renderCombat();
        state.kills[map.id] = map.goal; renderMaps();
        const nextMap = mapsForWorld(state.selectedWorld).find(entry => entry.id !== map.id);
        elements.mapList.querySelector('[data-map="' + nextMap.id + '"]').click();
        check('switching maps clears the previous area’s loot highlight', state.lastLoot === null && !elements.lastDrop.querySelector('.loot-equipment'));
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    Math.random = priorRandom; window.matchMedia = priorMatchMedia;
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
