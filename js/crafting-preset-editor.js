(function () {
    'use strict';
    const clone = value => JSON.parse(JSON.stringify(value));
    function defaults(stat) {
        return Equipment.stats[stat].mode === 'multiply' ? {stat,min:1.05,max:1.15,step:.01}
            : Equipment.stats[stat].display.type === 'percent' ? {stat,min:.05,max:.15,step:.01} : {stat,min:1,max:10,step:1};
    }
    function create(config) {
        const $ = id => document.getElementById(id), data = config.data;
        let type = null, tier = null;
        const eligible = Object.entries(Equipment.stats).filter(([, rule]) => !rule.developer).map(([id, rule]) => ({id,label:rule.label}));
        const filter = StatPicker.createFilter($('presetRollRows'), eligible, renderRows);
        const current = () => Equipment.craftingPreset({equipmentType:type,tier},data());
        const linkedItems = stat => data().items.filter(item => item.equipmentType === type && item.tier === tier && item.crafting &&
            (item.crafting.pool === undefined || Array.isArray(item.crafting.pool) && item.crafting.pool.some(entry =>
                (typeof entry === 'string' || entry && typeof entry === 'object' && !('min' in entry)) && (!stat || (typeof entry === 'string' ? entry : entry.stat) === stat))));
        const explicitReferences = stat => linkedItems(stat).some(item => item.crafting.pool !== undefined);
        const changed = () => { config.changed(); config.rangesChanged(); };
        const control = (text, input) => { const label = document.createElement('label'); label.append(text,input); return label; };
        function renderRows() {
            $('presetRollRows').replaceChildren(); const preset = current();
            $('presetRerollGold').disabled = !preset; $('presetRerollGold').value = preset?.gold ?? '';
            if (!preset) { $('addPresetRoll').disabled = true; return; }
            preset.pool.forEach((roll, index) => {
                const row = document.createElement('div'); row.className = 'potential-roll-editor-row';
                const select = document.createElement('select'); select.setAttribute('aria-label','Shared potential stat');
                filter.populate(select,eligible.filter(stat => stat.id === roll.stat || !preset.pool.some(other => other.stat === stat.id)),roll.stat);
                select.disabled = explicitReferences(roll.stat);
                if (select.disabled) select.title = 'Referenced by linked items. Its range can be edited here.';
                select.addEventListener('change',() => { preset.pool[index] = defaults(select.value); changed(); renderRows(); });
                row.append(control('Stat',select));
                for (const [field,label] of [['min','Minimum'],['max','Maximum'],['step','Step']]) {
                    const input = document.createElement('input'); input.type = 'number'; input.step = 'any'; input.value = roll[field];
                    input.addEventListener('change',() => { roll[field] = input.valueAsNumber; changed(); }); row.append(control(label,input));
                }
                const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label','Remove shared stat');
                remove.disabled = explicitReferences(roll.stat) || preset.pool.length <= Math.max(1,...linkedItems().filter(item => item.crafting.pool === undefined).map(item => item.crafting.slots));
                if (remove.disabled) remove.title = 'Keep enough possible stats for linked items and preserve imported stat selections.';
                remove.addEventListener('click',() => { preset.pool.splice(index,1); changed(); renderRows(); }); row.append(remove);
                $('presetRollRows').append(row);
            });
            $('presetUseSummary').textContent = linkedItems().length + ' item(s) use these shared ranges. Changes apply to future rerolls.';
            $('addPresetRoll').disabled = !filter.filtered().some(stat => !preset.pool.some(roll => roll.stat === stat.id));
        }
        function render() {
            const types = data().equipmentTypes || [];
            if (!types.some(entry => entry.id === type)) type = types[0]?.id || null;
            $('presetEquipmentType').replaceChildren(...types.map(entry => new Option(entry.name,entry.id)));
            $('presetEquipmentType').value = type;
            const tiers = (data().craftingPresets || []).filter(entry => entry.equipmentType === type).sort((a,b) => a.tier-b.tier);
            if (!tiers.some(entry => entry.tier === tier)) tier = tiers[0]?.tier || null;
            $('presetEquipmentTier').replaceChildren(...tiers.map(entry => new Option('Tier ' + entry.tier,entry.tier)));
            $('presetEquipmentTier').value = tier;
            $('addEquipmentTier').disabled = !current(); renderRows();
        }
        function select(nextType,nextTier) { type = nextType; tier = nextTier; render(); }
        $('presetEquipmentType').addEventListener('change',() => { type = $('presetEquipmentType').value; tier = null; render(); });
        $('presetEquipmentTier').addEventListener('change',() => { tier = Number($('presetEquipmentTier').value); renderRows(); });
        $('presetRerollGold').addEventListener('change',() => {
            const preset = current(); if (preset) { preset.gold = $('presetRerollGold').valueAsNumber; changed(); }
        });
        $('addPresetRoll').addEventListener('click',() => {
            const preset = current(), stat = filter.filtered().find(entry => !preset?.pool.some(roll => roll.stat === entry.id));
            if (preset && stat) { preset.pool.push(defaults(stat.id)); changed(); renderRows(); }
        });
        $('addEquipmentTier').addEventListener('click',() => {
            const preset = current(); if (!preset) return;
            tier = Math.max(...data().craftingPresets.filter(entry => entry.equipmentType === type).map(entry => entry.tier)) + 1;
            data().craftingPresets.push({equipmentType:type,tier,gold:preset.gold,pool:clone(preset.pool)}); changed(); render();
        });
        $('addEquipmentType').addEventListener('click',() => {
            const name = $('newEquipmentTypeName').value.trim(); if (!name) { $('newEquipmentTypeName').focus(); return; }
            const pool = clone(current()?.pool || [defaults('healthMultiplier'),defaults('evasionMultiplier')]);
            const gold = current()?.gold ?? 1000;
            type = 'type_' + crypto.randomUUID().replace(/-/g,''); tier = 1;
            data().equipmentTypes ||= []; data().craftingPresets ||= [];
            data().equipmentTypes.push({id:type,name}); data().craftingPresets.push({equipmentType:type,tier,gold,pool});
            $('newEquipmentTypeName').value = ''; changed(); render();
        });
        return {render,select};
    }
    window.CraftingPresetEditor = {create,defaults};
}());
