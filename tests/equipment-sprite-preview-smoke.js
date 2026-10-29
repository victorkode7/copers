(async function () {
    const checks = [];
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const preview = () => document.querySelector('.equipment-sprite-preview');
    const near = (a, b) => Math.abs(a - b) < 1;
    const tick = () => new Promise(resolve => requestAnimationFrame(resolve));
    async function openAndCheck(icon) {
        icon.scrollIntoView({block: 'center'});
        await icon.querySelector('img').decode();
        const before = icon.getBoundingClientRect();
        const source = icon.querySelector('img').getBoundingClientRect();
        icon.click();
        const enlarged = preview().getBoundingClientRect();
        check('preview measures 192 by 192', near(enlarged.width, 192) && near(enlarged.height, 192));
        check('enlargement preserves the image center', near(enlarged.left + 96, source.left + source.width / 2) && near(enlarged.top + 96, source.top + source.height / 2));
        check('enlargement does not move the original layout', near(before.top, icon.getBoundingClientRect().top) && near(before.width, icon.getBoundingClientRect().width));
        check('preview keeps pixelated rendering', getComputedStyle(preview().querySelector('img')).imageRendering === 'pixelated');
    }
    try {
        state.currentView = 'inventory'; state.ownedItemIds = ['testAmulet']; state.gear = createEmptyGear();
        inventoryCategory = 'all'; render();
        let icon = elements.gearInventory.querySelector('.equipment-sprite-trigger');
        check('inventory equipment sprites are interactive', !!icon);
        await openAndCheck(icon);
        preview().click();
        check('clicking the enlarged sprite closes it', !preview() && icon.getAttribute('aria-expanded') === 'false');
        icon.click(); icon.click();
        check('clicking the original sprite again closes it', !preview());
        icon.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
        check('keyboard opens the preview', !!preview());
        document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
        check('Escape closes the preview', !preview());
        icon.click(); document.body.click();
        check('clicking elsewhere closes the preview', !preview());
        elements.gearInventory.querySelector('[data-equip="testAmulet"]').click();
        check('Equip still works after closing the preview', state.gear.necklace === 'testAmulet');
        icon = elements.gear.querySelector('.equipment-sprite-trigger');
        const selectionBefore = selectedGearSlot;
        await openAndCheck(icon);
        check('equipped sprite preview does not select or change gear', selectedGearSlot === selectionBefore && state.gear.necklace === 'testAmulet');
        document.body.click();
        state.currentView = 'town'; state.isInTown = true;
        // Keep the test recipe available independently of the edited world's drops.
        materialSources.gel = [{mapId: mapData[0].id}];
        state.ownedItemIds = []; state.crafted = []; state.gear = createEmptyGear();
        state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id, 100000]));
        selectedCraftCategory = 'all'; render();
        icon = elements.crafts.querySelector('.equipment-sprite-trigger');
        check('crafting equipment sprites are interactive', !!icon);
        const materials = JSON.stringify(state.materials);
        await openAndCheck(icon);
        check('preview does not craft or consume materials', !state.ownedItemIds.length && JSON.stringify(state.materials) === materials);
        renderCrafting(); await tick(); await tick();
        check('rerendering removes a detached preview', !preview());
        elements.crafts.querySelector('[data-craft="testAmulet"]').click();
        check('Craft still works after closing the preview', ownsItem('testAmulet'));
        check('loot table has no preview triggers', !elements.mapLootTable.querySelector('.equipment-sprite-trigger'));
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
