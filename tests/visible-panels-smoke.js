(function () {
    const checks = [];
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const original = {tree: renderUpgrades, crafting: renderCrafting, inventory: renderInventory, random: Math.random};
    const calls = {tree: 0, crafting: 0, inventory: 0};
    const resetCalls = () => { calls.tree = calls.crafting = calls.inventory = 0; };
    const click = id => document.getElementById(id).click();
    try {
        state.currentView = 'map'; state.isInTown = false; state.combatPaused = false;
        state.skillRanks = {}; pendingSkillRanks = {}; refundMode = false;
        state.level = 0; state.experience = 0; state.skillPoints = 0;
        state.gear = createEmptyGear(); state.ownedItemIds = []; state.crafted = [];
        state.upgrades = {strength: 0, haste: 0, evasion: 0}; state.tutorials = createTutorialState();
        state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id, 0]));
        const map = currentMap();
        map.drops = []; map.itemDrops = [];
        map.spawns = [{id: 'panelTest', monsterId: worldContent.monsters[0].id, count: 1,
            overrides: {health: 1, attackDamage: 0, evasion: 0, gold: [3, 3], experience: experienceForNextLevel(0),
                drops: [{id: 'gel', amount: [2, 2], chance: 1}], itemDrops: [{id: 'testDropHelm', chance: 1}]}}];
        materialSources.gel = [{mapId: map.id}];
        resetMonsterStates(map); state.playerHp = getPlayerMaxHealth(); resetCombatClock(); clearOfflineRecap();
        render();
        check('the hidden skill tree is not constructed at startup', !elements.upgrades.querySelector('.skill-tree-board'));
        inventoryCategory = 'all'; selectedCraftCategory = 'all';
        click('inventoryButton'); click('townButton'); click('upgradesButton'); click('mapButton');
        renderUpgrades = () => { calls.tree++; return original.tree(); };
        renderCrafting = () => { calls.crafting++; return original.crafting(); };
        renderInventory = () => { calls.inventory++; return original.inventory(); };
        const observer = new MutationObserver(() => {});
        for (const panel of [elements.upgrades, elements.crafts, elements.inventoryView]) {
            observer.observe(panel, {subtree: true, childList: true, characterData: true});
        }
        const killsBefore = state.kills[map.id], goldBefore = state.gold;
        Math.random = () => 0;
        state.attackTimer = getAttackSpeed(); pendingCombatSeconds = .1;
        processCombatBacklog();
        check('combat awards loot and levels normally', state.kills[map.id] === killsBefore + 1 && state.materials.gel === 2 && ownsItem('testDropHelm') && state.level === 1);
        check('combat full refreshes skip all three hidden panels', Object.values(calls).every(count => count === 0));
        check('hidden panel contents are untouched', observer.takeRecords().length === 0);
        observer.disconnect();
        check('visible gold level and skill-point displays stay current', elements.gold.textContent === formatAmount(goldBefore + 3) && elements.level.textContent === 'Level 1' && elements.skillPoints.textContent === '1 SP');
        check('tutorial notifications update without rendering hidden views', !elements.tutorialNotifications.hidden && elements.tutorialNotifications.textContent.includes('Test Drop Helm'));
        click('inventoryButton');
        check('opening inventory refreshes only inventory', calls.inventory === 1 && calls.tree === 0 && calls.crafting === 0);
        check('new combat equipment appears immediately on opening inventory', !!elements.gearInventory.querySelector('[data-equip="testDropHelm"]'));
        click('townButton');
        check('opening crafting refreshes only crafting', calls.inventory === 1 && calls.tree === 0 && calls.crafting === 1);
        check('crafting uses the latest material counts', !elements.crafts.querySelector('[data-craft="testAmulet"]').disabled);
        click('upgradesButton');
        check('opening the skill tree refreshes only the skill tree', calls.inventory === 1 && calls.tree === 1 && calls.crafting === 1);
        check('skill points gained in combat appear when the tree opens', document.getElementById('skillPointsDisplay').textContent.includes('Available points: 1'));
        resetCalls(); awardExperience(experienceForNextLevel(state.level)); render();
        check('a visible tree refreshes when progression changes', calls.tree === 1 && calls.inventory === 0 && calls.crafting === 0 && document.getElementById('skillPointsDisplay').textContent.includes('Available points: 2'));
        click('inventoryButton'); resetCalls(); state.ownedItemIds.push('testAmulet'); render();
        check('a visible inventory still updates immediately', calls.inventory === 1 && calls.tree === 0 && calls.crafting === 0 && !!elements.gearInventory.querySelector('[data-equip="testAmulet"]'));
        state.ownedItemIds = state.ownedItemIds.filter(id => id !== 'testAmulet');
        click('townButton');
        check('returning to crafting still shows an affordable unowned recipe', !elements.crafts.querySelector('[data-craft="testAmulet"]').disabled);
        resetCalls(); state.materials.gel = 0; render();
        check('visible crafting responds to changed materials', calls.crafting === 1 && calls.tree === 0 && calls.inventory === 0 && elements.crafts.querySelector('[data-craft="testAmulet"]').disabled);
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    finally {
        renderUpgrades = original.tree; renderCrafting = original.crafting; renderInventory = original.inventory; Math.random = original.random;
    }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
