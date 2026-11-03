(async function () {
    const checks = [];
    function check(label, condition) { checks.push((condition ? 'PASS ' : 'FAIL ') + label); if (!condition) throw new Error(label); }
    const page = document.getElementById('inventoryView');
    const category = value => page.querySelector('[data-inventory-category="' + value + '"]').click();
    const bag = () => [...elements.gearInventory.querySelectorAll('[data-equip]')].map(button => itemById[button.dataset.equip]);
    try {
        state.currentView = 'inventory';
        state.ownedItemIds = itemData.items.filter(item => !item.developerOnly).map(item => item.id);
        state.gear = createEmptyGear();
        state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id, 400]));
        render(); category('all');
        const tabs = [...page.querySelectorAll('[data-inventory-category]')];
        check('category tabs are text-only and compact', tabs.length === 4 && tabs.every(tab =>
            getComputedStyle(tab, '::before').backgroundImage === 'none' && tab.getBoundingClientRect().height < 44));
        check('nonessential inventory descriptions are removed', !page.textContent.includes('Select a slot to browse gear') &&
            !page.textContent.includes('watch your combat stats improve') &&
            !page.textContent.includes('Select a material for its description'));
        check('gear hint only appears for the first-gear tutorial', page.querySelector('#gearSelectionHint').hidden);
        check('inventory uses the shared navy theme and keeps its brick artwork', getComputedStyle(page).backgroundColor === 'rgb(16, 44, 83)' && getComputedStyle(page).borderImageSource === 'none' && getComputedStyle(page.querySelector('.town-section')).backgroundImage.includes('brick128.png') && !page.querySelector('.leather-frame, .cosmic-frame'));
        check('the redesign controls and item descriptions are removed', !page.querySelector('#inventorySearch, #inventoryRarity, .inventory-totals, .inventory-item-description'));
        check('gear displays the actual unequipped inventory', bag().length === state.ownedItemIds.length);
        check('item rows and square equip controls use the original layout', getComputedStyle(elements.gearInventory.firstElementChild).display === 'grid' && elements.gearInventory.querySelector('[data-equip]').offsetWidth === 72 && elements.gearInventory.querySelector('[data-equip]').offsetHeight === 72);
        category('weapons'); check('weapon filtering uses equipment slots', bag().length > 0 && bag().every(item => item.slot === 'weapon'));
        category('armor'); check('armor filtering includes supported armor slots', bag().length > 0 && bag().every(item => recipeCategories[item.slot] === 'armor'));
        const armor = bag()[0]; elements.gearInventory.querySelector('[data-equip="' + armor.id + '"]').click();
        check('category results equip into the correct slot', state.gear[armor.slot] === armor.id && !bag().some(item => item.id === armor.id));
        category('materials');
        check('materials shows collected resources and hides gear', getComputedStyle(page.querySelector('.gear-workspace')).display === 'none' && getComputedStyle(page.querySelector('.materials-panel')).display !== 'none' && elements.inventory.querySelectorAll('.material-entry').length === Object.keys(materialNames).length);
        category('all'); document.querySelector('[data-gear-slot="weapon"]').click();
        check('equipment slot selection narrows the bag', bag().length > 0 && bag().every(item => item.slot === 'weapon'));
        check('active category remains accessible', page.querySelector('[data-inventory-category="all"]').getAttribute('aria-pressed') === 'true' && page.querySelectorAll('[data-inventory-category][aria-pressed="true"]').length === 1);
        check('inventory fits without horizontal overflow', document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
        check('no runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
