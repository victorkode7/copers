(async function () {
    const checks = [];
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const dialog = document.getElementById('offlineRecap');
    const settle = () => new Promise(resolve => setTimeout(resolve, 0));
    try {
        await document.fonts.ready;
        check('a new game starts without an offline popup', !dialog.open && !pendingOfflineRecap);
        state.level = 0; state.experience = 25; state.skillPoints = 0; state.skillRanks = {};
        state.gold = 10; state.materials.gel = 4; state.materials.hide = 0;
        state.ownedItemIds = ['testAmulet']; state.gear = createEmptyGear();
        state.combatPaused = false;
        itemData.materialDetails.gel = {sprite: 'tests/fixtures/equipment-sprite.svg'};
        itemById.testDropHelm.rarity = 'unique';
        itemById.testDropHelm.sprite = 'tests/fixtures/equipment-sprite.svg';
        const before = captureOfflineRecapProgress(), now = Date.now();
        pendingOfflineRecap = {startedAt: now - 7384000, returnedAt: now, before};
        state.level = 2; state.experience = 40; state.skillPoints = 2;
        state.gold = 145; state.materials.gel = 9; state.materials.hide = 2;
        state.ownedItemIds.push('testDropHelm');
        const report = buildOfflineRecap(pendingOfflineRecap);
        check('XP counts all crossed levels and their different XP requirements', report.experience === 165 && Math.abs(report.levelPercent - 170) < 1e-6 && report.startLevel === 0 && report.endLevel === 2);
        check('rewards are gains rather than inventory totals and exclude previously owned gear', report.gold === 135 && report.materials.find(drop => drop.id === 'gel').amount === 5 && report.materials.find(drop => drop.id === 'hide').amount === 2 && report.items.length === 1 && report.items[0].id === 'testDropHelm');
        const balances = JSON.stringify(captureOfflineRecapProgress());
        showOfflineRecap();
        check('the recap is an accessible modal and focuses Continue', dialog.matches(':modal') && dialog.getAttribute('aria-labelledby') === 'offlineRecapHeading' && document.activeElement.id === 'offlineRecapContinue');
        check('elapsed time, XP, level percentage, and gold are shown', document.getElementById('offlineRecapTime').textContent.includes('2h 3m 4s') && document.getElementById('offlineRecapGold').textContent === '+135' && document.getElementById('offlineRecapXp').textContent === '+165 XP' && document.getElementById('offlineRecapLevels').textContent.includes('+170%') && document.getElementById('offlineRecapLevels').textContent.includes('Level 0 → 2'));
        check('materials and unique equipment show sprites and quantities', dialog.querySelector('[data-material-id="gel"] strong').textContent === '+5' && dialog.querySelector('[data-material-id="gel"] img').getAttribute('src') === itemData.materialDetails.gel.sprite && dialog.querySelector('[data-item-id="testDropHelm"] strong').textContent === '+1' && dialog.querySelector('[data-item-id="testDropHelm"]').dataset.rarity === 'unique');
        check('opening the recap never awards its rewards again', JSON.stringify(captureOfflineRecapProgress()) === balances);
        const bounds = dialog.getBoundingClientRect();
        check('the popup is centered and fits the viewport', Math.abs(bounds.left + bounds.width / 2 - innerWidth / 2) < 16 && Math.abs(bounds.top + bounds.height / 2 - innerHeight / 2) < 16 && bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight);
        document.getElementById('offlineRecapHeading').click();
        check('clicking inside the popup does not dismiss it', dialog.open);
        state.gold += 5; showOfflineRecap();
        check('the displayed recap stays stable as live combat continues', document.getElementById('offlineRecapGold').textContent === '+135');
        document.getElementById('offlineRecapContinue').click(); await settle();
        check('Continue dismisses and clears the persisted recap', !dialog.open && !pendingOfflineRecap && JSON.parse(localStorage.getItem(saveKey)).offlineRecap === null);
        showOfflineRecap(); check('a dismissed recap does not reopen on the next tick', !dialog.open);

        resetCombatClock(Date.now() - 4000); startOfflineRecap();
        check('quick refreshes do not open a recap', !pendingOfflineRecap);
        state.combatPaused = true;
        resetCombatClock(Date.now() - 12000); processCombatBacklog();
        check('ordinary background catch-up does not create a reopening recap', !pendingOfflineRecap && !dialog.open);

        state.combatPaused = false; state.playerHp = getPlayerMaxHealth();
        const map = currentMap();
        map.spawns = [{id: 'recapEnemy', monsterId: worldContent.monsters[0].id, count: 3,
            overrides: {health: 1, attackDamage: 0, attackInterval: 1, respawnSeconds: .3,
                gold: [1, 1], experience: 0, drops: [{id: 'gel', chance: 1, amount: [1, 1]}], itemDrops: []}}];
        resetMonsterStates(map); resetCombatClock(Date.now() - 60000); startOfflineRecap();
        const baselineGold = state.gold, baselineGel = state.materials.gel;
        processCombatBacklog();
        check('the popup waits until every catch-up batch has finished', pendingCombatSeconds > 0 && !dialog.open && !offlineRecapReport);
        saveGame();
        check('the original recap baseline survives saving mid-catch-up', loadGame() && pendingOfflineRecap.before.gold === baselineGold && pendingOfflineRecap.before.materials.gel === baselineGel);
        for (let batch = 0; pendingCombatSeconds + 1e-8 >= gameTickSeconds && batch < 100; batch++) processCombatBacklog();
        check('the finished recap includes rewards from all batches, including before a reload', dialog.open && offlineRecapReport.gold === state.gold - baselineGold && offlineRecapReport.materials.find(drop => drop.id === 'gel').amount === state.materials.gel - baselineGel && offlineRecapReport.gold > 0);
        document.getElementById('offlineRecapClose').click(); await settle();
        check('the close button also clears the recap', !dialog.open && !pendingOfflineRecap);

        state.combatPaused = true;
        pendingOfflineRecap = {startedAt: Date.now() - 86400000, returnedAt: Date.now(), before: captureOfflineRecapProgress()};
        showOfflineRecap();
        check('zero-reward absences and death have clear messages', document.getElementById('offlineRecapGold').textContent === '+0' && document.getElementById('offlineRecapXp').textContent === '+0 XP' && document.getElementById('offlineRecapMaterials').textContent.includes('No materials found.') && document.getElementById('offlineRecapItems').textContent.includes('No equipment found.') && !document.getElementById('offlineRecapDeath').hidden && document.getElementById('offlineRecapTime').textContent.includes('1d'));
        dialog.close(); await settle();
        check('native dialog dismissal clears the recap too', !pendingOfflineRecap);

        pendingOfflineRecap = {startedAt: Date.now() - 10000, returnedAt: Date.now(), before: captureOfflineRecapProgress()};
        offlineRecapReport = {elapsedSeconds: 10, gold: 9999999, experience: 999999, levelPercent: 250,
            startLevel: 1, endLevel: 3, dead: false,
            materials: Object.keys(materialNames).map(id => ({id, amount: 1234567})), items: [{id: 'testDropHelm', amount: 1}]};
        showOfflineRecap();
        const content = dialog.querySelector('.offline-recap-content'), close = document.getElementById('offlineRecapContinue').getBoundingClientRect();
        check('large recaps scroll inside the popup and keep Continue visible without horizontal overflow', content.scrollHeight > content.clientHeight && dialog.scrollWidth <= dialog.clientWidth + 1 && close.top >= 0 && close.bottom <= innerHeight && document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
        const frame = dialog.getBoundingClientRect();
        dialog.dispatchEvent(new MouseEvent('click', {clientX: frame.left - 5, clientY: frame.top - 5}));
        check('clicking the backdrop dismisses the popup', !dialog.open && !pendingOfflineRecap);
        check('malformed optional recap data is ignored', normalizeOfflineRecap({startedAt: 'invalid', before: {}}) === null);
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    clearOfflineRecap(); resetCombatClock();
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
