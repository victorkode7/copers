(function () {
    'use strict';
    const $ = id => document.getElementById(id), record = value => value && typeof value === 'object' && !Array.isArray(value);
    let mode = 'stats', selectedId = null, displayedItemId = null, signature = '', message = '', gearSlot = 'all', gearSort = 'equipped';
    let costSignature='', poolSignature='', gearListSignature='', equipmentSlotsSignature='', workbenchSignature='', savedRollSignature='', uncraftableSignature='';
    let costViews=[];
    const autoTargets = new Map();
    let autoRun = null, autoTimer = null;
    const node = (tag, className, text) => { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; };
    const gearSlotSelect = $('rerollGearSlot');
    let gearSlotOptions = '';
    const rollText = roll => Equipment.describe({stats: {[roll.stat]: roll.value}});
    const rollSaveCost = 10000;
    const copyRolls = rolls => rolls.map(roll => roll && {...roll});
    const sameRolls = (a = [], b = []) => a.length === b.length && a.every((roll,index) =>
        roll === null ? b[index] === null : roll.stat === b[index]?.stat && roll.value === b[index]?.value);
    const canSaveRoll = item => Boolean(item?.crafting?.slots > 0);
    const matchesTargets = (item, targets) => {
        const rolled = new Set(rollsFor(item).filter(Boolean).map(roll => roll.stat));
        return targets.length > 0 && targets.every(stat => rolled.has(stat));
    };
    function prepareStatTransition(item) {
        const stage = $('rerollItemStats'), content = $('rerollStatContent');
        const changed = displayedItemId !== item.id;
        if (!changed) return null;
        content.querySelectorAll('.permanent-stat,.crafted-stat-card').forEach(element =>
            element.getAnimations().forEach(animation => animation.cancel()));
        stage.querySelectorAll('.reroll-stat-exit').forEach(exit => exit.remove());
        const shouldAnimate = displayedItemId !== null &&
            !window.matchMedia('(prefers-reduced-motion: reduce)').matches && typeof Element.prototype.animate === 'function';
        displayedItemId = item.id;
        if (!shouldAnimate) return null;
        stage.scrollTop = 0;
        const exit = node('div', 'reroll-stat-exit');
        exit.setAttribute('aria-hidden', 'true');
        const snapshot = content.cloneNode(true);
        snapshot.classList.add('reroll-stat-snapshot');
        snapshot.removeAttribute('id');
        snapshot.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
        exit.append(snapshot);
        stage.append(exit);
        return exit;
    }
    function animateStatTransition(exit) {
        if (!exit) return;
        const outgoing = [...exit.querySelectorAll('.permanent-stat,.crafted-stat-card')];
        outgoing.forEach((element, index) => element.animate(
            [{opacity:1,transform:'translate3d(0,0,0)'},{opacity:0,transform:'translate3d(14px,8px,0)'}],
            {duration:220,delay:(outgoing.length-index-1)*35,easing:'ease-in',fill:'both'}
        ));
        const cleanup = exit.animate([{opacity:1},{opacity:0}], {
            duration:220 + Math.max(0,outgoing.length-1)*35, easing:'ease-in', fill:'forwards'
        });
        cleanup.onfinish = () => exit.remove();
        const incoming = [...$('rerollStatContent').querySelectorAll('.permanent-stat,.crafted-stat-card')];
        incoming.forEach((element, index) => {
            const animation = element.animate(
                [{opacity:0,transform:'translate3d(-14px,-8px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],
                {duration:240,delay:index*45,easing:'ease-out',fill:'both'}
            );
            animation.onfinish = () => animation.cancel();
        });
    }
    const isUnlocked = () => Boolean(state.townProgress?.buildings.anvil);
    const targetsFor = id => {
        if (!autoTargets.has(id)) autoTargets.set(id, new Set());
        return autoTargets.get(id);
    };
    function stopAuto(reason = 'Auto rolling stopped.') {
        if (!autoRun) return false;
        if (autoTimer !== null) window.clearTimeout(autoTimer);
        autoTimer = null; autoRun = null; message = reason; signature = '';
        return true;
    }
    function autoContextValid(run) {
        const item = itemById[run.id];
        return isUnlocked() && mode === 'stats' && state.currentView === 'town' && selectedId === run.id &&
            !document.hidden && item?.crafting && ownsItem(run.id) && !SaveCompatibility.protection.blocked &&
            run.slots === item.crafting.slots && JSON.stringify(run.targets) === JSON.stringify([...targetsFor(run.id)]) &&
            run.targets.every(stat => Equipment.craftingPool(item,itemData).some(roll => roll.stat === stat));
    }
    function autoTick() {
        autoTimer = null;
        const run = autoRun;
        if (!run) return;
        const item = itemById[run.id];
        if (!autoContextValid(run)) stopAuto('Auto rolling stopped because the item or crafting page changed.');
        else if (matchesTargets(item,run.targets)) stopAuto('Selected stats are already on this item. No further rolls spent.');
        else {
            const result = reroll(run.id);
            if (!result.ok) stopAuto('Auto rolling stopped. '+result.message);
            else {
                run.count++;
                if (matchesTargets(item,run.targets)) stopAuto('Auto roll found all selected stats after '+run.count+' roll'+(run.count===1?'':'s')+'.');
                else if (rollProblem(item)) stopAuto('Auto rolling stopped after '+run.count+' roll'+(run.count===1?'':'s')+'. '+rollProblem(item));
                else message = 'Auto rolling · '+run.count+' roll'+(run.count===1?'':'s')+'. Waiting for all selected stats.';
            }
        }
        window.render();
        if (autoRun === run) autoTimer = window.setTimeout(autoTick,500);
    }
    function startAuto() {
        const item = itemById[selectedId], targets = [...targetsFor(selectedId)];
        if (autoRun || mode !== 'stats' || state.currentView !== 'town' || document.hidden) return false;
        const problem = rollProblem(item);
        if (problem || !targets.length || targets.length > item.crafting.slots) {
            message = problem || 'Choose between 1 and '+item.crafting.slots+' potential stats for auto roll.';
            signature = ''; return false;
        }
        if (matchesTargets(item,targets)) {message='Selected stats are already on this item. No rolls spent.'; signature=''; return false;}
        autoRun = {id:item.id, targets, slots:item.crafting.slots, count:0};
        message = 'Auto rolling every 0.5s. Waiting for all selected stats.'; signature = '';
        autoTimer = window.setTimeout(autoTick,500);
        return true;
    }
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
    function persist(changes, failureMessage) {
        const previous = {gold:state.gold, materials:state.materials, itemCrafts:state.itemCrafts, itemRollSaves:state.itemRollSaves,
            playerHp:state.playerHp, playerMana:state.playerMana, manaCapacity:state.manaCapacity};
        try {
            Object.assign(state, changes);
            validateSave(state.itemCrafts); validateSave(state.itemRollSaves);
            if (combatStatCache) combatStatCache.clear();
            state.playerHp = Math.min(state.playerHp, getPlayerMaxHealth());
            state.playerMana = Math.min(state.playerMana, getPlayerMaxMana());
            state.manaCapacity = getPlayerMaxMana();
            localStorage.setItem(saveKey, JSON.stringify(createGameSave()));
        } catch {
            Object.assign(state, previous);
            if (combatStatCache) combatStatCache.clear();
            return {ok:false, message:failureMessage};
        }
        lastRenderedGearSignature = null; signature = '';
        return {ok:true};
    }
    function saveRoll(id) {
        if (!isUnlocked()) return {ok:false, message:'Build the Anvil in Town first.'};
        if (autoRun) return {ok:false, message:'Stop auto rolling before saving a roll.'};
        const item = itemById[id];
        if (!canSaveRoll(item) || !ownsItem(id) || SaveCompatibility.protection.blocked || simulatingCombat) return {ok:false, message:'Choose an owned rerollable equipment item.'};
        if (!rollsFor(item).some(Boolean)) return {ok:false, message:'Craft equipment stats before saving a roll.'};
        if (sameRolls(state.itemCrafts[id], state.itemRollSaves[id])) return {ok:false, message:'This roll is already saved.'};
        if (!GameResources.canSpend(state,{gold:rollSaveCost})) return {ok:false, message:'You need 10,000 gold to save this roll.'};
        const result = persist({...GameResources.payment(state,{gold:rollSaveCost}), itemRollSaves:{...state.itemRollSaves, [id]:copyRolls(state.itemCrafts[id])}},
            'Could not save the roll. Your gold and previous saved roll were kept.');
        return result.ok ? {ok:true, message:'Equipment roll saved for 10,000 gold. Restore it once for free; reclaiming consumes the save.'} : result;
    }
    function restoreRoll(id) {
        if (!isUnlocked()) return {ok:false, message:'Build the Anvil in Town first.'};
        if (autoRun) return {ok:false, message:'Stop auto rolling before reclaiming a roll.'};
        const item = itemById[id], saved = state.itemRollSaves[id];
        if (!canSaveRoll(item) || !ownsItem(id) || SaveCompatibility.protection.blocked || simulatingCombat) return {ok:false, message:'Choose an owned rerollable equipment item.'};
        if (!saved) return {ok:false, message:'Save an equipment roll first.'};
        if (sameRolls(state.itemCrafts[id], saved)) return {ok:false, message:'Your equipment already has the saved roll.'};
        const remainingSaves = {...state.itemRollSaves}; delete remainingSaves[id];
        const result = persist({itemCrafts:{...state.itemCrafts, [id]:copyRolls(saved)}, itemRollSaves:remainingSaves},
            'Could not restore the roll. Your current stats and saved roll were kept.');
        return result.ok ? {ok:true, message:'Equipment roll reclaimed for free. The saved roll was consumed. Saving another roll costs 10,000 gold.'} : result;
    }
    function rollProblem(item) {
        if (!isUnlocked()) return 'Build the Anvil in Town first.';
        const craft = item?.crafting;
        if (!craft || !ownsItem(item.id) || SaveCompatibility.protection.blocked || simulatingCombat) return 'Choose an owned piece of rerollable equipment.';
        const pool = Equipment.craftingPool(item,itemData), gold = Equipment.craftingGold(item,itemData);
        if (!Number.isSafeInteger(gold) || gold < 1) return 'Set a valid gold cost for this equipment type and tier.';
        if (!Number.isSafeInteger(craft.slots) || craft.slots < 1 || craft.slots > pool.length || pool.some(roll => ![roll.min,roll.max,roll.step].every(Number.isFinite))) return 'This item needs a valid crafted slot count and enough potential stats.';
        if (!GameResources.canSpend(state,{...craft.cost.materials,gold})) return 'You need more gold or materials.';
        return '';
    }
    function reroll(id) {
        const item = itemById[id], craft = item?.crafting;
        const problem = rollProblem(item);
        if (problem) return {ok:false, message:problem};
        const pool = [...Equipment.craftingPool(item, itemData)], rolls = [];
        const gold = Equipment.craftingGold(item, itemData);
        for (let slot = 0; slot < craft.slots; slot++) {
            const [choice] = pool.splice(Math.floor(Math.random() * pool.length), 1);
            const steps = Math.round((choice.max - choice.min) / choice.step);
            rolls.push({stat: choice.stat, value: Number((choice.min + Math.floor(Math.random() * (steps + 1)) * choice.step).toFixed(6))});
        }
        const result = persist({...GameResources.payment(state,{...craft.cost.materials,gold}), itemCrafts:{...state.itemCrafts, [id]:rolls}},
            'Could not save the roll. Your gold, materials and previous stats were kept.');
        if (!result.ok) return result;
        return {ok: true, message: craft.slots + ' crafted stat' + (craft.slots === 1 ? '' : 's') + ' rerolled. ' + rolls.map(rollText).join(' · ')};
    }
    function showCost(item) {
        const list = $('rerollCost');
        const costs = [['gold', Equipment.craftingGold(item,itemData)], ...Object.entries(item.crafting.cost.materials)];
        const structure=JSON.stringify([item.id,costs,costs.map(([id])=>[materialNames[id],itemData.materialDetails?.[id]])]);
        if(costSignature!==structure){
        costSignature=structure;list.replaceChildren();costViews=[];
        for (const [id, required] of costs) {
            const owned = id === 'gold' ? state.gold : state.materials[id] || 0;
            const row = node('li', owned >= required ? 'has-enough' : 'needs-more');
            if (id !== 'gold') row.append(Equipment.createIcon(itemData.materialDetails?.[id]));
            else row.append(node('span', 'reroll-gold-mark', 'G'));
            const copy = node('span', 'reroll-cost-name', id === 'gold' ? 'Gold' : materialNames[id]);
            const count = node('strong', '', Number.isSafeInteger(required) && required > 0 ? required.toLocaleString('en-US') : 'Invalid cost');
            const ownedLabel=node('small');count.append(ownedLabel);
            row.append(copy, count); list.append(row);
            costViews.push({id,required,row,ownedLabel});
        }
        }
        costViews.forEach(({id,required,row,ownedLabel})=>{
            const owned=id==='gold'?state.gold:state.materials[id]||0;
            const enough=GameResources.canSpend(state,{[id]:required});
            row.classList.toggle('has-enough',enough);row.classList.toggle('needs-more',!enough);
            updateCombatText(ownedLabel,' / '+Math.floor(owned).toLocaleString('en-US')+' owned');
        });
    }
    function showPool(item) {
        const list = $('potentialRolls');
        const targets = targetsFor(item.id);
        const structure=JSON.stringify([item.id,Equipment.craftingPool(item,itemData)]);
        if(poolSignature!==structure){
        poolSignature=structure;list.replaceChildren();
        Equipment.craftingPool(item, itemData).forEach(roll => {
            const rule = Equipment.stats[roll.stat], type = rule.display.type;
            const amount = value => Number(((type === 'percentBonus' ? value - 1 : value) * (['percent', 'percentBonus'].includes(type) ? 100 : 1)).toFixed(2));
            const range = '+' + amount(roll.min) + '–' + amount(roll.max) + (type === 'flat' ? '' : '%');
            const row = node('li'), button = node('button','potential-roll-choice');
            button.type = 'button'; button.dataset.autoRollStat = roll.stat; button.setAttribute('aria-pressed',String(targets.has(roll.stat)));
            button.disabled = Boolean(autoRun) || !targets.has(roll.stat) && targets.size >= item.crafting.slots;
            const check = node('span','potential-roll-check',targets.has(roll.stat)?'✓':'+'); check.setAttribute('aria-hidden','true');
            button.append(check,node('span','potential-roll-label',rule.display.label),node('strong','',range));row.append(button);list.append(row);
        });
        }
        list.querySelectorAll('[data-auto-roll-stat]').forEach(button=>{
            const chosen=targets.has(button.dataset.autoRollStat);
            updateCombatAttribute(button,'aria-pressed',String(chosen));
            button.disabled=Boolean(autoRun)||!chosen&&targets.size>=item.crafting.slots;
            updateCombatText(button.querySelector('.potential-roll-check'),chosen?'✓':'+');
        });
        updateCombatText($('autoRollEquipment'),autoRun ? 'Stop rolling' : 'Auto roll');
        updateCombatAttribute($('autoRollEquipment'),'aria-pressed',String(Boolean(autoRun)));
        $('autoRollEquipment').disabled = !autoRun && (!targets.size || Boolean(rollProblem(item)) || matchesTargets(item,[...targets]));
    }
    function showSavedRoll(item) {
        const panel = $('weaponRollSave'); panel.hidden = !canSaveRoll(item);
        if (panel.hidden) return;
        const saved = state.itemRollSaves[item.id], matches = saved && sameRolls(state.itemCrafts[item.id], saved);
        const structure=JSON.stringify([item.id,item.crafting.slots,saved]);
        if(savedRollSignature!==structure){
        savedRollSignature=structure;
        $('savedWeaponRolls').replaceChildren(...(saved ? rollsFor(item, {itemCrafts:state.itemRollSaves}).map((roll, index) => {
            const text = roll && Equipment.stats[roll.stat] ? rollText(roll) : 'Crafted slot '+(index+1)+' (empty)';
            const row = node('li', '', text);
            row.title = text;
            return row;
        }) : []));
        }
        const blocked = Boolean(autoRun) || SaveCompatibility.protection.blocked || simulatingCombat || !ownsItem(item.id);
        $('saveWeaponRollLabel').textContent = saved ? 'Replace saved roll' : 'Save current roll';
        $('saveWeaponRoll').disabled = blocked || !GameResources.canSpend(state,{gold:rollSaveCost}) || !rollsFor(item).some(Boolean) || Boolean(matches);
        $('restoreWeaponRoll').disabled = blocked || !saved || Boolean(matches);
        $('weaponRollSaveStatus').textContent = saved ? matches ? 'Your current roll matches this save.' : 'Reclaim these stats for free. This replaces your current crafted stats and consumes the saved roll.' : 'No saved roll yet. Craft stats, then save a roll you want to keep.';
    }
    function render() {
        if (autoRun && !autoContextValid(autoRun)) stopAuto('Auto rolling stopped because the item or crafting page changed.');
        const slotOptions = JSON.stringify(itemData.slots);
        if (gearSlotOptions !== slotOptions) {
            gearSlotOptions = slotOptions;
            gearSlotSelect.replaceChildren(node('option', '', 'All slots'));
            gearSlotSelect.firstElementChild.value = 'all';
            itemData.slots.forEach(slot => {
                const option = node('option', '', slot.id === 'chest' ? 'Body' : slot.name);
                option.value = slot.id;
                gearSlotSelect.append(option);
            });
        }
        const unlocked = isUnlocked();
        document.querySelector('[data-crafting-mode="stats"]').hidden = !unlocked;
        document.querySelector('.crafting-mode-tabs').hidden = !unlocked;
        if (!unlocked) {
            mode = 'recipes'; selectedId = null; signature = ''; message = '';
        }
        $('recipeCrafting').hidden = mode !== 'recipes'; $('statCrafting').hidden = mode !== 'stats';
        document.querySelectorAll('[data-crafting-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.craftingMode === mode)));
        if (mode !== 'stats') return;
        const ownedItems = itemData.items.filter(item => item.crafting && ownsItem(item.id));
        const items = ownedItems.filter(item => gearSlot === 'all' || item.slot === gearSlot);
        const rarityRank = {common:0, uncommon:1, rare:2, epic:3, unique:4};
        items.sort((a,b) => {
            if (gearSort === 'equipped') {
                const equippedDifference = Number(Object.values(state.gear).includes(b.id)) - Number(Object.values(state.gear).includes(a.id));
                if (equippedDifference) return equippedDifference;
            } else if (gearSort === 'rarity') {
                const rarityDifference = (rarityRank[b.rarity] ?? -1) - (rarityRank[a.rarity] ?? -1);
                if (rarityDifference) return rarityDifference;
            }
            return a.name.localeCompare(b.name);
        });
        const selected = itemById[selectedId];
        const selectedUncraftable = selected && !selected.crafting && ownsItem(selected.id) &&
            Object.values(state.gear).includes(selected.id) && (gearSlot === 'all' || selected.slot === gearSlot);
        if (!items.some(item => item.id === selectedId) && !selectedUncraftable) { selectedId = items[0]?.id || null; message = ''; }
        const item = itemById[selectedId];
        const rerollable = Boolean(item?.crafting);
        if (rerollable) {
            const pool = new Set(Equipment.craftingPool(item,itemData).map(roll=>roll.stat)), targets=targetsFor(item.id);
            for (const stat of [...targets]) if (!pool.has(stat) || [...targets].indexOf(stat) >= item.crafting.slots) targets.delete(stat);
        }
        const uncraftable = item && !rerollable ? [item.id,item.name,item.sprite,item.slot,item.equipmentType,item.tier,Equipment.describe(effective(item))] : null;
        const next = JSON.stringify({id: selectedId, gearSlot, gearSort, slots:item?.crafting?.slots, type:item?.equipmentType, tier:item?.tier, pool:rerollable && Equipment.craftingPool(item,itemData), cost:rerollable && {gold:Equipment.craftingGold(item,itemData),materials:item.crafting.cost.materials}, uncraftable, developerItemsEnabled:state.developerItemsEnabled, rolls: state.itemCrafts, savedRolls:state.itemRollSaves, targets:[...targetsFor(selectedId)], auto:autoRun, blocked:SaveCompatibility.protection.blocked, gold: Math.floor(state.gold), materials: state.materials, owned: state.ownedItemIds, gear: state.gear, message});
        if (next === signature) return;
        signature = next;
        $('rerollWorkbench').hidden = ownedItems.length === 0;
        $('rerollWorkbench').querySelectorAll('.reroll-item-panel,.reroll-recipe-panel').forEach(panel => { panel.hidden = !rerollable; });
        $('rerollUncraftable').hidden = !uncraftable;
        $('rerollEmpty').hidden = ownedItems.length > 0;
        const equipmentSlotsStructure = JSON.stringify([gearSlot, itemData.slots, state.gear, state.ownedItemIds, itemData.items.filter(entry => entry.crafting).map(entry => [entry.id, entry.name, entry.sprite])]);
        if (equipmentSlotsSignature !== equipmentSlotsStructure) {
            equipmentSlotsSignature = equipmentSlotsStructure;
            $('rerollEquippedSlots').replaceChildren(...itemData.slots.map(slot => {
                const equippedItem = itemById[state.gear[slot.id]];
                const slotName = slot.id === 'chest' ? 'Body' : slot.name;
                const button = node('button', 'reroll-equipment-slot' + (equippedItem ? '' : ' is-empty'));
                button.type = 'button';
                button.dataset.rerollSlot = slot.id;
                button.setAttribute('aria-label', slotName + ': ' + (equippedItem?.name || 'Empty slot'));
                button.setAttribute('aria-pressed', String(gearSlot === slot.id));
                const icon = Equipment.createIcon(equippedItem, slot.icon);
                icon.classList.add('equipment-slot-icon');
                button.append(icon, node('span', 'reroll-equipment-slot-label', slotName), node('strong', 'reroll-equipment-slot-name', equippedItem?.name || 'Empty'));
                return button;
            }));
        }
        $('rerollEquippedSlots').querySelectorAll('[data-reroll-slot]').forEach(button =>
            updateCombatAttribute(button, 'aria-pressed', String(button.dataset.rerollSlot === gearSlot)));
        const gearStructure=JSON.stringify([gearSlot,gearSort,items.map(entry=>[entry.id,entry.name,entry.sprite,entry.tier,entry.rarity,entry.slot,entry.crafting.slots,Object.values(state.gear).includes(entry.id)])]);
        if(gearListSignature!==gearStructure){
        gearListSignature=gearStructure;
        $('rerollGearList').replaceChildren();
        $('rerollGearEmpty').hidden = items.length > 0;
        $('rerollGearEmpty').textContent = ownedItems.length
            ? 'No rerollable equipment in this slot.'
            : 'No rerollable equipment is available yet.';
        for (const entry of items) {
            const equipped = Object.values(state.gear).includes(entry.id);
            const button = node('button', 'reroll-gear-option' + (equipped ? ' is-equipped' : ''));
            button.type = 'button'; button.dataset.rerollItem = entry.id; button.setAttribute('aria-pressed', String(entry.id === selectedId));
            const details = [equipped ? 'Equipped' : '', entry.tier ? 'Tier ' + entry.tier : ''].filter(Boolean).join(' · ');
            button.append(Equipment.createIcon(entry), node('strong', '', entry.name), node('small', equipped ? 'is-equipped-label' : '', details));
            $('rerollGearList').append(button);
        }
        }
        $('rerollGearList').querySelectorAll('[data-reroll-item]').forEach(button=>updateCombatAttribute(button,'aria-pressed',String(button.dataset.rerollItem===selectedId)));
        updateCombatText($('rerollSlotSummary'),'');
        if (!item) { displayedItemId = null; return; }
        if (uncraftable) {
            displayedItemId = null;
            for (const id of ['rerollEquipment','autoRollEquipment','saveWeaponRoll','restoreWeaponRoll']) $(id).disabled = true;
            updateCombatAttribute($('autoRollEquipment'),'aria-pressed','false');
            const key = JSON.stringify(uncraftable);
            if (uncraftableSignature !== key) {
                uncraftableSignature = key;
                $('rerollUncraftableArt').replaceChildren(EquipmentSpritePreview.createIcon(item));
                $('rerollUncraftableName').textContent = item.name;
                const type = itemData.equipmentTypes?.find(type => type.id === item.equipmentType)?.name ||
                    itemData.slots.find(slot => slot.id === item.slot)?.name || item.slot;
                $('rerollUncraftableMeta').textContent = type;
                const stats = uncraftable.at(-1).split('\n').filter(Boolean);
                $('rerollUncraftableStats').replaceChildren(...(stats.length ? stats : ['No stats']).map(text => node('li', '', text)));
            }
            return;
        }
        const statTransition = prepareStatTransition(item);
        const workbenchStructure=JSON.stringify([item.id,item.name,item.sprite,item.slot,item.equipmentType,item.tier,Equipment.describe(item)]);
        if(workbenchSignature!==workbenchStructure){
        workbenchSignature=workbenchStructure;
        $('rerollItemArt').replaceChildren(EquipmentSpritePreview.createIcon(item));
        $('rerollItemName').textContent = item.name;
        const typeName = itemData.equipmentTypes?.find(type => type.id === item.equipmentType)?.name;
        $('rerollItemMeta').textContent = (typeName || item.slot) + (item.tier ? ' · Tier ' + item.tier : '');
        $('rerollPermanentStats').replaceChildren(...Equipment.describe(item).split('\n').map(text => {
            const row = node('li', 'permanent-stat');
            row.append(node('span', 'permanent-stat-label', text));
            const lock = node('span', 'permanent-stat-lock', '🔒');
            lock.setAttribute('aria-hidden', 'true');
            row.append(lock);
            return row;
        }));
        }
        while($('rerollSlots').children.length>item.crafting.slots)$('rerollSlots').lastElementChild.remove();
        rollsFor(item).forEach((roll, index) => {
            let card=$('rerollSlots').children[index];
            if(!card){card = node('div', 'crafted-stat-card');
            card.append(node('strong', '', roll && Equipment.stats[roll.stat] ? rollText(roll) : 'Empty'));
            $('rerollSlots').append(card);
            }
            card.classList.toggle('is-filled',Boolean(roll));
            updateCombatText(card.querySelector('strong'),roll&&Equipment.stats[roll.stat]?rollText(roll):'Empty');
        });
        animateStatTransition(statTransition);
        showCost(item); showPool(item); showSavedRoll(item);
        const gold = Equipment.craftingGold(item,itemData);
        const affordable = Number.isSafeInteger(gold) && gold > 0 && GameResources.canSpend(state,{...item.crafting.cost.materials,gold});
        $('rerollEquipment').disabled = Boolean(autoRun) || !ownsItem(item.id) || !affordable || SaveCompatibility.protection.blocked;
        $('rerollEquipment').textContent = rollsFor(item).some(Boolean) ? 'Reroll ' + (item.crafting.slots === 1 ? '' : 'all ') + item.crafting.slots + ' crafted stat' + (item.crafting.slots === 1 ? '' : 's') : 'Craft ' + item.crafting.slots + ' stat' + (item.crafting.slots === 1 ? '' : 's');
        $('rerollStatus').textContent = message || (!ownsItem(item.id) ? 'Craft or find this equipment first.' : affordable ? '' : 'Collect the missing gold and materials to craft.');
    }
    function setMode(next) { stopAuto(); mode = next === 'recipes' || !isUnlocked() ? 'recipes' : 'stats'; signature = ''; }
    document.addEventListener('click', event => {
        const tab = event.target.closest('[data-crafting-mode]'), pick = event.target.closest('[data-reroll-item]'), slotPick = event.target.closest('[data-reroll-slot]');
        if (tab) { setMode(tab.dataset.craftingMode); renderCrafting(); }
        if (pick) { stopAuto(); selectedId = pick.dataset.rerollItem; message = ''; render(); $('rerollWorkbench').scrollIntoView({block:'nearest'}); }
        if (slotPick) {
            stopAuto();
            gearSlot = slotPick.dataset.rerollSlot;
            gearSlotSelect.value = gearSlot;
            const equippedItem = itemById[state.gear[gearSlot]];
            if (equippedItem && ownsItem(equippedItem.id)) selectedId = equippedItem.id;
            message = '';
            signature = '';
            render();
        }
        const target = event.target.closest('[data-auto-roll-stat]');
        if (target && !target.disabled && !autoRun) {
            const targets = targetsFor(selectedId), stat = target.dataset.autoRollStat;
            if (targets.has(stat)) targets.delete(stat); else if (targets.size < itemById[selectedId].crafting.slots) targets.add(stat);
            message = ''; signature = ''; render();
            $('potentialRolls').querySelector('[data-auto-roll-stat="'+CSS.escape(stat)+'"]')?.focus({preventScroll:true});
        }
        if (event.target.closest('#autoRollEquipment') && !event.target.closest('button').disabled) {
            if (autoRun) stopAuto(); else startAuto();
            window.render();
        }
        if (event.target.closest('#rerollEquipment') && !event.target.closest('button').disabled) {
            const result = reroll(selectedId); message = result.ok ? '' : result.message; window.render();
        }
        if (event.target.closest('#saveWeaponRoll, #restoreWeaponRoll') && !event.target.closest('button').disabled) {
            const result = event.target.closest('#saveWeaponRoll') ? saveRoll(selectedId) : restoreRoll(selectedId);
            message = result.message; window.render();
        }
    });
    document.addEventListener('change', event => {
        if (event.target.id === 'rerollGearSlot' || event.target.id === 'rerollGearSort') {
            gearSlot = $('rerollGearSlot').value;
            gearSort = $('rerollGearSort').value;
            signature = '';
            render();
        }
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&stopAuto('Auto rolling stopped while the game is hidden.'))render();});
    window.addEventListener('pagehide',()=>stopAuto());
    window.ItemCrafting = {validateSave, rollsFor, effective, describe, appendSlots, reroll, saveRoll, restoreRoll, render, setMode, stopAuto, mode: () => mode};
}());
