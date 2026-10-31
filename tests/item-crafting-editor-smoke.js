(async function () {
    const checks = [], $ = id => document.getElementById(id);
    const check = (name, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) throw new Error(name); };
    const change = (input, value) => { input.value = value; input.dispatchEvent(new Event('change', {bubbles:true})); };
    const draft = () => JSON.parse(localStorage.getItem('idleAdventureItemEditorDraft') || JSON.stringify(window.adventureItems));
    const current = () => draft().items.find(item => item.id === $('itemId').value);
    const choose = name => { $('search').value = name; $('search').dispatchEvent(new Event('input')); [...$('itemList').children].find(button => button.querySelector('strong')?.textContent === name).click(); };
    const preset = (type,tier) => draft().craftingPresets.find(entry => entry.equipmentType === type && entry.tier === tier);
    try {
        choose('Ice helmet');
        check('equipment has explicit type and tier selectors', $('equipmentType').value === 'armor' && $('equipmentTier').value === '2');
        check('items inherit their full tier pool without per-item range controls', current().crafting.pool === undefined && !$('potentialRollRows') && !$('itemCraftingSettings').open);
        check('Items is the initial page', !$('itemsEditorPage').hidden && $('tierEditorPage').hidden && $('showItemsPage').getAttribute('aria-pressed') === 'true');
        check('fixed stats are clearly permanent', $('statBonusesHeading').textContent === 'Permanent stat bonuses' && $('preview').textContent.includes('Crafted stat'));
        change($('craftedSlotCount'),'4');
        check('variable slot count still updates the preview', current().crafting.slots === 4 && ($('preview').textContent.match(/Crafted stat/g) || []).length === 4);
        for (const value of ['0','1.5','8']) { change($('craftedSlotCount'),value); check('invalid counts remain blocked', Equipment.validate(draft()).length > 0); }
        change($('craftedSlotCount'),'4'); change($('rerollMaterialRows').querySelector('input'),'17');
        $('editSharedCraftingPreset').click();
        check('edit shared ranges opens the exact type and tier', $('itemsEditorPage').hidden && !$('tierEditorPage').hidden && $('presetEquipmentType').value === 'armor' && $('presetEquipmentTier').value === '2' && $('presetUseSummary').textContent.includes('3 item'));
        check('gold is configured only on the tier page', !$('rerollGold') && $('presetRerollGold').value === '2500');
        $('presetRerollGold').value = '4321'; $('presetRerollGold').dispatchEvent(new Event('input',{bubbles:true}));
        check('shared gold updates all three armor items', draft().items.filter(item => ['Ice helmet','Ice body','Ice legs'].includes(item.name)).every(item => Equipment.craftingGold(item,draft()) === 4321) && $('itemRerollGold').textContent.includes('4,321'));
        for (const value of ['0','1.5','']) { change($('presetRerollGold'),value); check('invalid gold is blocked', $('exportGame').disabled && $('tierValidation').textContent.includes('gold')); }
        change($('presetRerollGold'),'4321');
        let inputs = $('presetRollRows').firstElementChild.querySelectorAll('input');
        inputs[0].value = '1.04'; inputs[0].dispatchEvent(new Event('input',{bubbles:true}));
        change(inputs[1],'1.12'); change(inputs[2],'.02');
        check('one edit updates every linked Ice item', ['Ice helmet','Ice body','Ice legs'].every(name => {
            const data = draft(), item = data.items.find(item => item.name === name), roll = Equipment.craftingPool(item,data)[0];
            return roll.min === 1.04 && roll.max === 1.12 && roll.step === .02;
        }));
        check('range edits autosave while typing on the second page', preset('armor',2).pool[0].min === 1.04);
        check('validation is visible on the tier page', $('tierValidationSummary').textContent === 'All equipment data is valid.');
        check('material costs and slot counts remain per item', current().crafting.slots === 4 && !Object.hasOwn(current().crafting.cost,'gold') && Object.values(current().crafting.cost.materials)[0] === 17 && draft().items.find(item => item.name === 'Ice body').crafting.slots === 2);
        change(inputs[2],'.03');
        check('invalid shared increments appear on both pages and block packaging', Equipment.validate(draft()).some(error => error.includes('invalid potential roll')) && $('tierValidation').textContent === $('validation').textContent && $('exportGame').disabled);
        change(inputs[2],'.02');
        $('showItemsPage').click();
        check('Items tab restores the item form', !$('itemsEditorPage').hidden && $('tierEditorPage').hidden);
        choose('Ice body');
        check('choosing another item inherits the edited range automatically', Equipment.craftingPool(current(),draft())[0].min === 1.04);
        change($('equipmentTier'),'3');
        check('changing tier switches ranges without copying them onto the item', Equipment.craftingPool(current(),draft())[0].min === preset('armor',3).pool[0].min && current().crafting.pool === undefined && Equipment.craftingGold(current(),draft()) === preset('armor',3).gold);
        const fixed = JSON.stringify(current().stats);
        change($('equipmentType'),'bow');
        check('changing type uses its matching tier pool', current().equipmentType === 'bow' && Equipment.craftingPool(current(),draft())[0].stat === 'bowDamageIncrease' && JSON.stringify(current().stats) === fixed);
        choose('Ice helmet'); $('editSharedCraftingPreset').click();
        check('shared stat choices can be edited for all linked items', !$('presetRollRows').firstElementChild.querySelector('select').disabled);
        check('tier page fits the viewport', document.documentElement.scrollWidth <= innerWidth);
        const sharedCount = preset('armor',2).pool.length;
        $('addPresetRoll').click();
        check('new shared stats become available to linked items automatically', preset('armor',2).pool.length === sharedCount + 1 && Equipment.craftingPool(current(),draft()).length === sharedCount + 1 && current().crafting.pool === undefined);
        $('presetRollRows').lastElementChild.querySelector('button').click();
        const copied = JSON.stringify(preset('armor',2).pool);
        $('addEquipmentTier').click();
        check('additional tiers copy the current preset once', $('presetEquipmentTier').value === '6' && JSON.stringify(preset('armor',6).pool) === copied && preset('armor',6).gold === 4321);
        inputs = $('presetRollRows').firstElementChild.querySelectorAll('input'); change(inputs[0],'1.06');
        check('editing the new tier does not change its source tier', preset('armor',2).pool[0].min === 1.04 && preset('armor',6).pool[0].min === 1.06);
        $('newEquipmentTypeName').value = 'Daggers'; $('addEquipmentType').click();
        const daggerType = draft().equipmentTypes.find(type => type.name === 'Daggers');
        check('custom equipment types can be added with their own presets', daggerType && preset(daggerType.id,1).pool.length === sharedCount && preset(daggerType.id,1).gold === 4321);
        check('the full tiered catalogue validates', !Equipment.validate(draft()).length);
        let exported; const createUrl = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
        try { URL.createObjectURL = blob => { exported = blob; return 'blob:items-test'; }; HTMLAnchorElement.prototype.click = () => {}; $('exportJson').click(); }
        finally { URL.createObjectURL = createUrl; HTMLAnchorElement.prototype.click = click; }
        const source = JSON.parse(await exported.text());
        check('JSON exports include shared presets and item links', source.craftingPresets.length === 27 && source.equipmentTypes.length === 6 && source.items.find(item => item.name === 'Ice helmet').tier === 2 && source.items.find(item => item.name === 'Ice helmet').crafting.pool === undefined);
        const oldPresets = JSON.parse(JSON.stringify(source));
        oldPresets.craftingPresets.forEach(preset => delete preset.gold);
        oldPresets.items.filter(item => item.equipmentType === 'armor' && item.tier === 2 && item.crafting).forEach(item => { item.crafting.cost.gold = 3210; });
        Equipment.normalizeData(oldPresets);
        check('older preset catalogues migrate their shared gold from existing items', Equipment.craftingGold(oldPresets.items.find(item => item.name === 'Ice helmet'),oldPresets) === 3210 && !Equipment.validate(oldPresets).length);
        const legacy = JSON.parse(JSON.stringify(source));
        for (const item of legacy.items) {
            if (item.crafting) { item.crafting.pool = Equipment.craftingPool(item,source); item.crafting.cost.gold = Equipment.craftingGold(item,source); }
            delete item.equipmentType; delete item.tier;
        }
        delete legacy.equipmentTypes; delete legacy.craftingPresets;
        legacy.items[0].description = 'Legacy tier import test';
        const transfer = new DataTransfer(); transfer.items.add(new File([JSON.stringify(legacy)],'legacy-items.json',{type:'application/json'}));
        $('importJson').files = transfer.files; $('importJson').dispatchEvent(new Event('change'));
        for (let wait=0; wait<200 && draft().items[0].description !== 'Legacy tier import test'; wait++) await new Promise(resolve=>setTimeout(resolve,5));
        $('showItemsPage').click(); choose('Ice helmet');
        check('legacy imports preserve custom ranges and costs', current().crafting.cost.gold === 4321 && current().crafting.pool[0].min === 1.04 && !$('useSharedCraftingPreset').hidden);
        check('legacy imports gain the project shared presets for easy linking', draft().craftingPresets.length === 25 && $('equipmentType').options.length === 5);
        $('useSharedCraftingPreset').click();
        check('legacy ranges can be linked explicitly to a preset', current().crafting.pool === undefined && Equipment.craftingPool(current(),draft())[0].min === preset(current().equipmentType,current().tier).pool[0].min);
        $('rerollable').checked=false; $('rerollable').dispatchEvent(new Event('change'));
        check('disabling crafted stats preserves the permanent stats', !current().crafting && Object.keys(current().stats).sort().join(',') === 'evasion,health');
        $('loadProjectItems').click(); choose('Ice helmet');
        check('loading current project items keeps a recoverable draft', !$('restorePreviousItems').hidden && current().crafting.pool === undefined);
        $('restorePreviousItems').click(); choose('Ice helmet');
        check('previous draft remains recoverable', !$('rerollable').checked);
        choose('Long spear'); const beforeStats=JSON.stringify(current().stats);
        $('rerollable').checked=true; $('rerollable').dispatchEvent(new Event('change')); change($('craftedSlotCount'),'3');
        const permanentInput = $('statRows').querySelector('input'), previousValue = Number(permanentInput.value);
        change(permanentInput,previousValue + 5);
        check('permanent stats stay independently editable', JSON.stringify(current().stats) !== beforeStats);
        change(permanentInput,previousValue);
        check('new crafted items immediately use their type/tier presets', current().crafting.slots === 3 && current().crafting.pool === undefined && JSON.stringify(current().stats) === beforeStats && !Equipment.validate(draft()).length);
        check('no runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch(error) { checks.push('ERROR ' + error.stack); }
    const report=document.createElement('pre'); report.id='smoke-results'; report.textContent=checks.join('\n'); document.body.append(report);
}());
