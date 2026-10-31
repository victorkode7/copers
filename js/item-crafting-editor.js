(function () {
    'use strict';
    function create(config) {
        const $ = id => document.getElementById(id), item = config.current, data = config.data;
        let page = 'items';
        const control = (text, input) => { const label = document.createElement('label'); label.append(text, input); return label; };
        const number = (value, change) => {
            const input = document.createElement('input'); input.type = 'number'; input.step = 'any'; input.value = value;
            input.addEventListener('change', () => { change(input.valueAsNumber); config.changed(); }); return input;
        };
        const removeButton = (label, remove) => {
            const button = document.createElement('button'); button.type = 'button'; button.textContent = '×'; button.setAttribute('aria-label', label);
            button.addEventListener('click', () => { remove(); config.changed(); render(); }); return button;
        };
        const manager = CraftingPresetEditor.create({data, changed:config.changed, rangesChanged:() => { renderMetadata(); renderSource(); }});
        function setPage(next) {
            page = next === 'tiers' ? 'tiers' : 'items';
            $('itemsEditorPage').hidden = page !== 'items'; $('tierEditorPage').hidden = page !== 'tiers';
            $('showItemsPage').setAttribute('aria-pressed', String(page === 'items'));
            $('showTiersPage').setAttribute('aria-pressed', String(page === 'tiers'));
            if (page === 'tiers') manager.render();
        }
        function renderMetadata() {
            const types = data().equipmentTypes || [], selected = item();
            const guess = selected?.slot === 'weapon' ? /bow/i.test(selected.name) ? 'bow' : /wand|staff|sceptre/i.test(selected.name) ? 'wand' : 'melee'
                : ['ring','necklace'].includes(selected?.slot) ? 'accessory' : 'armor';
            const type = selected?.equipmentType || types.find(entry => entry.id === guess)?.id || types[0]?.id || '';
            $('equipmentType').replaceChildren(...types.map(entry => new Option(entry.name,entry.id))); $('equipmentType').value = type;
            const tiers = (data().craftingPresets || []).filter(entry => entry.equipmentType === type).sort((a,b) => a.tier-b.tier);
            $('equipmentTier').replaceChildren(...tiers.map(entry => new Option('Tier ' + entry.tier,entry.tier)));
            $('equipmentTier').value = tiers.some(entry => entry.tier === selected?.tier) ? selected.tier : tiers[0]?.tier || '';
            $('editSharedCraftingPreset').disabled = !tiers.length;
        }
        const selectedPreset = () => Equipment.craftingPreset({equipmentType:$('equipmentType').value,tier:Number($('equipmentTier').value)},data());
        const commitMetadata = () => { item().equipmentType = $('equipmentType').value; item().tier = Number($('equipmentTier').value); };
        function renderSource() {
            const craft = item()?.crafting;
            const custom = craft?.pool !== undefined;
            const typeName = data().equipmentTypes?.find(type => type.id === $('equipmentType').value)?.name || 'equipment';
            $('craftingRangeSource').textContent = custom
                ? 'This imported item has custom rolls. Choose Use tier rolls to replace them with the shared pool.'
                : 'Uses all ' + (selectedPreset()?.pool.length || 0) + ' possible stats from ' + typeName + ', Tier ' + $('equipmentTier').value + '.';
            $('useSharedCraftingPreset').hidden = !craft || !custom;
            $('useSharedCraftingPreset').disabled = !selectedPreset();
            const gold = Equipment.craftingGold(item(),data());
            $('itemRerollGold').textContent = Number.isSafeInteger(gold) && gold > 0 ? gold.toLocaleString('en-US') + ' gold per reroll' + (Equipment.craftingPreset(item(),data()) ? ' (from type & tier settings).' : ' (legacy item cost).') : 'Set gold per reroll in the type & tier settings.';
        }
        function render() {
            renderMetadata();
            if (page === 'items') manager.select($('equipmentType').value,Number($('equipmentTier').value));
            else manager.render();
            const craft = item()?.crafting;
            $('rerollable').checked = Boolean(craft); $('rerollEditorFields').hidden = !craft;
            $('statBonusesHeading').textContent = craft ? 'Permanent stat bonuses' : 'Stat bonuses';
            renderSource();
            if (!craft) return;
            $('craftedSlotCount').value = craft.slots;
            $('rerollMaterialRows').replaceChildren();
            Object.entries(craft.cost.materials).forEach(([id, amount]) => {
                const row = document.createElement('div'); row.className = 'data-row';
                const select = document.createElement('select');
                Object.entries(data().materials).filter(([key]) => key === id || !Object.hasOwn(craft.cost.materials, key)).forEach(([key, name]) => select.add(new Option(name, key)));
                select.value = id;
                select.addEventListener('change', () => { delete craft.cost.materials[id]; craft.cost.materials[select.value] = amount; config.changed(); render(); });
                row.append(control('Material', select), control('Amount', number(amount, value => { craft.cost.materials[id] = value; })),
                    removeButton('Remove reroll material', () => delete craft.cost.materials[id]));
                $('rerollMaterialRows').append(row);
            });
            $('addRerollMaterial').disabled = !Object.keys(data().materials).some(id => !Object.hasOwn(craft.cost.materials, id));
        }
        $('showItemsPage').addEventListener('click', () => setPage('items'));
        $('showTiersPage').addEventListener('click', () => setPage('tiers'));
        $('equipmentType').addEventListener('change', () => {
            if (!item()) return;
            item().equipmentType = $('equipmentType').value;
            const tiers = (data().craftingPresets || []).filter(entry => entry.equipmentType === item().equipmentType).sort((a,b) => a.tier-b.tier);
            if (!tiers.some(entry => entry.tier === item().tier)) item().tier = tiers[0]?.tier || 1;
            if (item().crafting) delete item().crafting.pool;
            config.changed(); render();
        });
        $('equipmentTier').addEventListener('change', () => {
            if (!item()) return;
            commitMetadata(); if (item().crafting) delete item().crafting.pool; config.changed(); render();
        });
        $('rerollable').addEventListener('change', () => {
            if (!item()) return;
            if ($('rerollable').checked) {
                commitMetadata();
                item().crafting = {slots:Math.min(2,selectedPreset()?.pool.length || 2),cost:{materials:{[Object.keys(data().materials)[0]]:10}}};
            } else delete item().crafting;
            config.changed(); render();
        });
        $('useSharedCraftingPreset').addEventListener('click', () => {
            if (!selectedPreset() || !item()?.crafting) return;
            commitMetadata(); delete item().crafting.pool; config.changed(); render();
        });
        $('editSharedCraftingPreset').addEventListener('click', () => {
            manager.select($('equipmentType').value,Number($('equipmentTier').value)); setPage('tiers');
        });
        $('craftedSlotCount').addEventListener('change', () => { if (item()?.crafting) { item().crafting.slots = $('craftedSlotCount').valueAsNumber; config.changed(); } });
        $('addRerollMaterial').addEventListener('click', () => {
            const craft = item()?.crafting, id = craft && Object.keys(data().materials).find(key => !Object.hasOwn(craft.cost.materials, key));
            if (id) { craft.cost.materials[id] = 10; config.changed(); render(); }
        });
        $('tierEditorPage').addEventListener('input', event => {
            if (event.target.matches('input[type=number]')) event.target.dispatchEvent(new Event('change', {bubbles:true}));
        });
        return {render, setPage, page:() => page};
    }
    window.ItemCraftingEditor = {create};
}());
