(function () {
    const checks = [];
    function check(label, condition) { checks.push((condition ? 'PASS ' : 'FAIL ') + label); if (!condition) throw new Error(label); }
    try {
        ItemCrafting.setMode('recipes');
        state.currentView = 'town'; state.isInTown = true;
        state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id, 100000]));
        state.ownedItemIds = []; state.crafted = []; render();
        const page = document.getElementById('townView'), style = getComputedStyle(page);
        check('crafting restores its original brick background and rounded panel', style.backgroundImage.includes('brick128.png') && style.borderImageSource === 'none' && style.borderRadius === '16px');
        check('the workshop heading and undecorated header are restored', page.querySelector('.eyebrow').textContent === 'THE WORKSHOP' && getComputedStyle(page, '::before').backgroundImage === 'none' && !page.querySelector('.cosmic-frame'));
        check('recipes restore the original rounded cards', [...page.querySelectorAll('.craft-card')].every(card => getComputedStyle(card).borderImageSource === 'none' && getComputedStyle(card).borderRadius === '12px'));
        check('recipe icons restore their original size', page.querySelector('.craft-card-heading .item-sprite').offsetWidth === 64 && page.querySelector('.craft-card-heading .item-sprite').offsetHeight === 64);
        const button = page.querySelector('.craft-action:not(:disabled)');
        check('craft controls restore their original responsive buttons', getComputedStyle(button).backgroundImage === 'none' && button.offsetWidth > 0 && button.offsetWidth <= button.parentElement.clientWidth);
        const recipe = itemById[button.dataset.craft], before = {...state.materials};
        button.click();
        check('crafting still grants gear and consumes the recipe materials', ownsItem(recipe.id) && Object.entries(recipe.recipe.materials).every(([id, amount]) => state.materials[id] === before[id] - amount));
        page.querySelector('[data-craft-category="armor"]').click();
        check('category tabs still filter recipes', [...page.querySelectorAll('.craft-card')].every(card => card.dataset.category === 'armor'));
        check('the page fits the browser without horizontal scrolling', document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
        check('the original background keeps pixelated rendering', getComputedStyle(page).imageRendering === 'pixelated');
        check('inventory retains its original game panels', !document.querySelector('#inventoryView .leather-frame') && getComputedStyle(document.getElementById('inventoryView')).borderImageSource === 'none');
        check('no runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
