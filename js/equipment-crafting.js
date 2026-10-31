(function () {
    'use strict';
    const $ = id => document.getElementById(id), record = value => value && typeof value === 'object' && !Array.isArray(value);
    let mode = 'stats', selectedId = null, signature = '', message = '';
    const node = (tag, className, text) => { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; };
    const rollText = roll => Equipment.describe({stats: {[roll.stat]: roll.value}});
    function validateSave(value) {
        if (!record(value)) throw new Error('Invalid crafted equipment in profile.');
        for (const [id, rolls] of Object.entries(value)) {
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id) ||
                !Array.isArray(rolls) || !rolls.length) throw new Error('Invalid crafted equipment slots.');
            const seen = new Set();
            for (const roll of rolls) {
                if (roll === null) continue;
                if (!record(roll) || typeof roll.stat !== 'string' || !/^[A-Za-z][A-Za-z0-9]*$/.test(roll.stat) ||
                    !Number.isFinite(roll.value) || roll.value < 0 || seen.has(roll.stat) ||
                    Equipment.stats[roll.stat]?.developer || Equipment.stats[roll.stat]?.mode === 'multiply' && roll.value <= 0) throw new Error('Invalid crafted equipment stat.');
                seen.add(roll.stat);
            }
        }
    }
    function rollsFor(item, source = state) {
        return item?.crafting ? Array.from({length:item.crafting.slots}, (_, index) => source.itemCrafts?.[item.id]?.[index] || null) : [];
    }
    function effective(item, source = state) {
        if (!item?.crafting || item.craftedRolls) return item;
        const stats = {...item.stats}, rolls = rollsFor(item, source);
        for (const roll of rolls) {
            const rule = roll && Equipment.stats[roll.stat];
            if (!rule || rule.developer) continue; // Keep returning/unknown content in the save, inactive until supported.
            const previous = stats[roll.stat] ?? rule.default;
            stats[roll.stat] = rule.mode === 'multiply' ? previous * roll.value : rule.mode === 'min' ? Math.min(previous, roll.value) : previous + roll.value;
        }
        return {...item, stats, craftedRolls: rolls};
    }
    function describe(item, source = state) {
        if (!item?.crafting) return Equipment.describe(item);
        const base = itemById[item.id] || item;
        return Equipment.describe(base) + '\n' + rollsFor(base, source).map(roll =>
            roll && Equipment.stats[roll.stat] ? rollText(roll) + ' [Crafted]' : 'Crafted stat (empty)').join('\n');
    }
    function appendSlots(container, item, source = state, emptyOnly = false) {
        rollsFor(item, source).forEach((roll, index) => {
            if (emptyOnly && roll) return;
            const line = node('span', 'item-crafted-slot' + (roll ? ' is-filled' : ''),
                roll && Equipment.stats[roll.stat] ? rollText(roll) : 'Crafted stat');
            line.title = 'Crafted slot ' + (index + 1) + '. All crafted slots are replaced when rerolling.';
            container.append(line);
        });
    }
    function reroll(id) {
        const item = itemById[id], craft = item?.crafting;
        if (!craft || !ownsItem(id) || SaveCompatibility.protection.blocked || simulatingCombat) return {ok: false, message: 'Choose an owned piece of rerollable equipment.'};
        const pool = [...Equipment.craftingPool(item, itemData)], rolls = [];
        const gold = Equipment.craftingGold(item, itemData);
        if (!Number.isSafeInteger(gold) || gold < 1) return {ok:false,message:'Set a valid gold cost for this equipment type and tier.'};
        if (!Number.isSafeInteger(craft.slots) || craft.slots < 1 || craft.slots > pool.length || pool.some(roll => ![roll.min,roll.max,roll.step].every(Number.isFinite))) return {ok:false,message:'This item needs a valid crafted slot count and enough potential stats.'};
        if (state.gold < gold || !Object.entries(craft.cost.materials).every(([material, amount]) => (state.materials[material] || 0) >= amount)) return {ok: false, message: 'You need more gold or materials.'};
        for (let slot = 0; slot < craft.slots; slot++) {
            const [choice] = pool.splice(Math.floor(Math.random() * pool.length), 1);
            const steps = Math.round((choice.max - choice.min) / choice.step);
            rolls.push({stat: choice.stat, value: Number((choice.min + Math.floor(Math.random() * (steps + 1)) * choice.step).toFixed(6))});
        }
        const previous = {gold: state.gold, materials: state.materials, crafts: state.itemCrafts, hp: state.playerHp, mana: state.playerMana, capacity: state.manaCapacity};
        state.gold -= gold;
        state.materials = {...state.materials};
        Object.entries(craft.cost.materials).forEach(([material, amount]) => { state.materials[material] -= amount; });
        state.itemCrafts = {...state.itemCrafts, [id]: rolls};
        if (combatStatCache) combatStatCache.clear();
        try {
            validateSave(state.itemCrafts);
            state.playerHp = Math.min(state.playerHp, getPlayerMaxHealth());
            state.playerMana = Math.min(state.playerMana, getPlayerMaxMana());
            state.manaCapacity = getPlayerMaxMana();
            localStorage.setItem(saveKey, JSON.stringify(createGameSave()));
        } catch {
            Object.assign(state, {gold: previous.gold, materials: previous.materials, itemCrafts: previous.crafts,
                playerHp: previous.hp, playerMana: previous.mana, manaCapacity: previous.capacity});
            if (combatStatCache) combatStatCache.clear();
            return {ok: false, message: 'Could not save the roll. Your gold, materials and previous stats were kept.'};
        }
        lastRenderedGearSignature = null;
        return {ok: true, message: craft.slots + ' crafted stat' + (craft.slots === 1 ? '' : 's') + ' rerolled. ' + rolls.map(rollText).join(' · ')};
    }
    function showCost(item) {
        const list = $('rerollCost'); list.replaceChildren();
        const costs = [['gold', Equipment.craftingGold(item,itemData)], ...Object.entries(item.crafting.cost.materials)];
        for (const [id, required] of costs) {
            const owned = id === 'gold' ? state.gold : state.materials[id] || 0;
            const row = node('li', owned >= required ? 'has-enough' : 'needs-more');
            if (id !== 'gold') row.append(Equipment.createIcon(itemData.materialDetails?.[id]));
            else row.append(node('span', 'reroll-gold-mark', 'G'));
            const copy = node('span', 'reroll-cost-name', id === 'gold' ? 'Gold' : materialNames[id]);
            const count = node('strong', '', Number.isSafeInteger(required) && required > 0 ? required.toLocaleString('en-US') : 'Invalid cost');
            count.append(node('small', '', ' / ' + Math.floor(owned).toLocaleString('en-US') + ' owned'));
            row.append(copy, count); list.append(row);
        }
    }
    function showPool(item) {
        const list = $('potentialRolls'); list.replaceChildren();
        Equipment.craftingPool(item, itemData).forEach(roll => {
            const rule = Equipment.stats[roll.stat], type = rule.display.type;
            const amount = value => Number(((type === 'percentBonus' ? value - 1 : value) * (['percent', 'percentBonus'].includes(type) ? 100 : 1)).toFixed(2));
            const range = '+' + amount(roll.min) + '–' + amount(roll.max) + (type === 'flat' ? '' : '%');
            const row = node('li'); row.append(node('span', '', rule.display.label), node('strong', '', range)); list.append(row);
        });
        $('rollPoolHint').textContent = 'Each craft grants ' + item.crafting.slots + (item.crafting.slots === 1 ? ' stat.' : ' different stats.') + ' Every listed stat is equally likely, and previous results can roll again.';
    }
    function render() {
        $('recipeCrafting').hidden = mode !== 'recipes'; $('statCrafting').hidden = mode !== 'stats';
        document.querySelectorAll('[data-crafting-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.craftingMode === mode)));
        if (mode !== 'stats') return;
        const items = itemData.items.filter(item => item.crafting && (!item.developerOnly || state.developerItemsEnabled));
        if (!items.some(item => item.id === selectedId)) selectedId = items.find(item => ownsItem(item.id))?.id || items[0]?.id || null;
        const item = itemById[selectedId];
        const next = JSON.stringify({id: selectedId, slots:item?.crafting.slots, type:item?.equipmentType, tier:item?.tier, pool:item && Equipment.craftingPool(item,itemData), cost:item && {gold:Equipment.craftingGold(item,itemData),materials:item.crafting.cost.materials}, developerItemsEnabled:state.developerItemsEnabled, rolls: state.itemCrafts, gold: Math.floor(state.gold), materials: state.materials, owned: state.ownedItemIds, gear: state.gear, message});
        if (next === signature) return;
        signature = next;
        $('rerollWorkbench').hidden = !item; $('rerollEmpty').hidden = Boolean(item);
        $('rerollGearList').replaceChildren();
        for (const entry of items) {
            const owned = ownsItem(entry.id), button = node('button', 'reroll-gear-option' + (owned ? '' : ' is-unowned'));
            button.type = 'button'; button.dataset.rerollItem = entry.id; button.setAttribute('aria-pressed', String(entry.id === selectedId));
            const ownership = owned ? Object.values(state.gear).includes(entry.id) ? 'Equipped' : 'Owned' : 'Not owned';
            button.append(Equipment.createIcon(entry), node('strong', '', entry.name), node('small', '', ownership + (entry.tier ? ' · Tier ' + entry.tier : '') + ' · ' + entry.crafting.slots + ' crafted slot' + (entry.crafting.slots === 1 ? '' : 's')));
            $('rerollGearList').append(button);
        }
        $('rerollSlotSummary').textContent = item ? item.crafting.slots + ' crafted slot' + (item.crafting.slots === 1 ? '' : 's') + ' on this item' : '';
        if (!item) return;
        $('rerollItemArt').replaceChildren(EquipmentSpritePreview.createIcon(item));
        $('rerollItemName').textContent = item.name;
        const typeName = itemData.equipmentTypes?.find(type => type.id === item.equipmentType)?.name;
        $('rerollItemMeta').textContent = (typeName || item.slot) + (item.tier ? ' · Tier ' + item.tier : '') + ' · ' + item.rarity + ' · ' + (ownsItem(item.id) ? 'Your equipment' : 'Preview — acquire this item to reroll it');
        $('rerollPermanentStats').replaceChildren(...Equipment.describe(item).split('\n').map(text => node('li', 'permanent-stat', text)));
        $('rerollSlots').replaceChildren();
        rollsFor(item).forEach((roll, index) => {
            const card = node('div', 'crafted-stat-card' + (roll ? ' is-filled' : ''));
            card.append(node('small', '', 'CRAFTED SLOT ' + (index + 1)), node('strong', '', roll && Equipment.stats[roll.stat] ? rollText(roll) : 'Crafted stat'),
                node('span', '', roll ? 'Replaced on your next roll' : 'Empty · craft to reveal a stat'));
            $('rerollSlots').append(card);
        });
        showCost(item); showPool(item);
        const gold = Equipment.craftingGold(item,itemData);
        const affordable = Number.isSafeInteger(gold) && gold > 0 && state.gold >= gold && Object.entries(item.crafting.cost.materials).every(([id, amount]) => (state.materials[id] || 0) >= amount);
        $('rerollEquipment').disabled = !ownsItem(item.id) || !affordable || SaveCompatibility.protection.blocked;
        $('rerollEquipment').textContent = rollsFor(item).some(Boolean) ? 'Reroll ' + (item.crafting.slots === 1 ? '' : 'all ') + item.crafting.slots + ' crafted stat' + (item.crafting.slots === 1 ? '' : 's') : 'Craft ' + item.crafting.slots + ' stat' + (item.crafting.slots === 1 ? '' : 's');
        $('rerollStatus').textContent = message || (!ownsItem(item.id) ? 'Craft or find this equipment first.' : affordable ? 'Permanent stats stay locked. All crafted slots change with each roll.' : 'Collect the missing gold and materials to craft.');
    }
    function setMode(next) { mode = next === 'recipes' ? 'recipes' : 'stats'; signature = ''; }
    document.addEventListener('click', event => {
        const tab = event.target.closest('[data-crafting-mode]'), pick = event.target.closest('[data-reroll-item]');
        if (tab) { setMode(tab.dataset.craftingMode); renderCrafting(); }
        if (pick) { selectedId = pick.dataset.rerollItem; message = ''; render(); $('rerollWorkbench').scrollIntoView({block:'nearest'}); }
        if (event.target.closest('#rerollEquipment') && !event.target.closest('button').disabled) {
            const result = reroll(selectedId); message = result.message; window.render();
        }
    });
    window.ItemCrafting = {validateSave, rollsFor, effective, describe, appendSlots, reroll, render, setMode, mode: () => mode};
}());
