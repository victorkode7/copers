(function () {
    const checks = [];
    function check(label, condition) { checks.push((condition ? 'PASS ' : 'FAIL ') + label); if (!condition) throw new Error(label); }
    try {
        itemData.materialDetails = {gel: {description: 'A luminous crafting ingredient.', sprite: 'tests/fixtures/equipment-sprite.svg'}};
        state.materials.gel = 3; state.currentView = 'inventory'; render();
        const entry = [...elements.inventory.querySelectorAll('.material-entry')].find(node => node.textContent.includes(materialNames.gel));
        check('inventory shows material sprites, descriptions, and quantities', entry.querySelector('img')?.getAttribute('src') === itemData.materialDetails.gel.sprite && entry.querySelector('small').textContent === itemData.materialDetails.gel.description && entry.querySelector('strong').textContent === '3');
        renderCrafting();
        const requirement = [...elements.crafts.querySelectorAll('.craft-material-label')].find(node => node.textContent.includes(materialNames.gel));
        check('crafting requirements use material artwork and descriptions', requirement?.querySelector('img')?.getAttribute('src') === itemData.materialDetails.gel.sprite && requirement.querySelector('[title]')?.title === itemData.materialDetails.gel.description);
        const map = currentMap();
        map.drops = [{id: 'gel', amount: [1, 2], chance: .5}];
        const definition = monsterDefinition(activeMonster(), map);
        definition.drops = [{id: 'gel', amount: [3, 3], chance: 1}];
        state.currentView = 'map'; render();
        elements.mapLootTable.closest('details').open = true;
        const materialDrops = [...elements.mapLootTable.querySelectorAll('[data-material-id="gel"]')];
        check('map and monster loot tables both show the configured material artwork', materialDrops.length === 2 && materialDrops.every(row => row.querySelector('img')?.getAttribute('src') === itemData.materialDetails.gel.sprite && row.querySelector('.loot-table-label').textContent === materialNames.gel));
        check('material icons preserve loot amounts and drop chances', materialDrops[0].querySelector('strong').textContent === '1–2 · 50%' && materialDrops[1].querySelector('strong').textContent === '3 · 100%');
        const lootIcon = materialDrops[0].querySelector('.item-sprite');
        check('loot icons stay compact, pixelated, and decorative', lootIcon.offsetWidth === 24 && lootIcon.offsetHeight === 24 && getComputedStyle(lootIcon.querySelector('img')).imageRendering === 'pixelated' && lootIcon.getAttribute('aria-hidden') === 'true');
        check('gold loot remains a text reward', !elements.mapLootTable.firstElementChild.querySelector('.item-sprite') && elements.mapLootTable.firstElementChild.textContent.startsWith('Gold'));
        materialDrops[0].querySelector('img').dispatchEvent(new Event('error'));
        check('missing artwork falls back without removing the material name', !lootIcon.querySelector('img') && lootIcon.textContent.length > 0 && materialDrops[0].querySelector('.loot-table-label').textContent.includes(materialNames.gel));
        delete itemData.materialDetails.gel.sprite; renderCombat();
        check('materials without sprites still have readable loot entries', [...elements.mapLootTable.querySelectorAll('[data-material-id="gel"]')].every(row => !row.querySelector('img') && row.textContent.includes(materialNames.gel)));
        itemData.materialDetails.gel.sprite = 'tests/fixtures/equipment-sprite.svg';
        saveGame(); materialNames.newMaterial = 'New Material';
        check('existing saves accept newly added materials with zero quantity', loadGame() && state.materials.newMaterial === 0 && state.materials.gel === 3);
        const invalid = WorldContent.clone(itemData); invalid.materialDetails.gel.sprite = '../outside.png';
        check('unsafe material images are rejected by game validation', Equipment.validate(invalid).some(error => error.includes('material sprite')));
        check('no runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
