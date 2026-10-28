(async function () {
    const checks = [], $ = id => document.getElementById(id);
    const check = (name, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) throw new Error(name); };
    const skill = Boolean($('nodeForm'));
    const storageKey = skill ? 'idleAdventureSkillEditorDraft' : 'idleAdventureItemEditorDraft';
    const rows = $(skill ? 'statBonusRows' : 'statRows');
    const add = $(skill ? 'addStatBonus' : 'addStat');
    const search = document.querySelector('[aria-label="Search bonus stats"]');
    const category = document.querySelector('[aria-label="Bonus stat category"]');
    const edit = (node, value, type = 'input') => { node.value = value; node.dispatchEvent(new Event(type, {bubbles:true})); };
    const settle = () => new Promise(resolve => setTimeout(resolve, 0));
    try {
        if (!skill) $('addItem').click();
        if (!rows.querySelector('select')) add.click();
        await settle();
        const original = rows.querySelector('select').value;
        const saved = localStorage.getItem(storageKey);
        edit(search, 'regen'); await settle();
        check('search preserves the selected stat and saved bonuses', rows.querySelector('select').value === original && localStorage.getItem(storageKey) === saved);
        check('search filters choices while preserving the current selection', [...rows.querySelector('select').options].every(option => option.value === original || /regen/i.test(option.textContent)));
        edit(search, ''); edit(category, 'Poison', 'change'); edit(search, 'chance');
        check('category and search combine', [...rows.querySelector('select').options].every(option => option.value === original || /poison.*chance/i.test(option.textContent)));
        check('matching choices are grouped', Boolean(rows.querySelector('optgroup[label="Poison"]')));
        add.click();
        const last = rows.lastElementChild.querySelector('select');
        check('adding a filtered bonus starts with a matching stat', last.value === 'poisonChance');
        const amount = rows.lastElementChild.querySelector('input');
        edit(amount, '.25', skill ? 'input' : 'change'); await settle();
        const draft = JSON.parse(localStorage.getItem(storageKey));
        const stats = skill ? draft.tree.nodes.find(node => node.id === $('nodeId').value).stats : draft.items.find(item => item.id === $('itemId').value).stats;
        check('filtered bonuses still save their numeric values', stats.poisonChance === .25);
        edit(search, 'no_such_stat');
        check('no matches show a useful message and disable adding', add.disabled && document.querySelector('.stat-picker-status').textContent.includes('No matching stats'));
        edit(search, ''); edit(category, '', 'change');
        check('clearing filters restores all categories and adding', !add.disabled && rows.querySelectorAll('optgroup').length > 2);
        check('physical damage is explicit in bonus choices', [...rows.querySelector('select').options].some(option => option.value === 'damage' && option.textContent === 'Physical damage'));
        edit(category, 'Physical damage', 'change'); edit(search, 'bow');
        add.click();
        const bowRow = [...rows.children].find(row => row.querySelector('select')?.value === 'bowDamageIncrease');
        check('bow damage is searchable in the physical damage category', Boolean(bowRow));
        edit(bowRow.querySelector('input'), '.25', skill ? 'input' : 'change'); await settle();
        const bowDraft = JSON.parse(localStorage.getItem(storageKey));
        const bowStats = skill ? bowDraft.tree.nodes.find(node => node.id === $('nodeId').value).stats : bowDraft.items.find(item => item.id === $('itemId').value).stats;
        check('bow damage saves as an additive percentage', bowStats.bowDamageIncrease === .25);
        if (!skill) check('bow damage has a value guide explaining its scope and input',
            ItemStatGuides.get('bowDamageIncrease').input.includes('0.5 for +50%') &&
            ItemStatGuides.get('bowDamageIncrease').affects.includes('Multishot'));
        check('no runtime errors', !window.smokeErrors?.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const result = document.createElement('pre'); result.id = 'smoke-results'; result.textContent = checks.join('\n'); document.body.append(result);
}());
