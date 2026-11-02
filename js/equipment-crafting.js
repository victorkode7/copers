(function () {
    'use strict';
    const $ = id => document.getElementById(id), record = value => value && typeof value === 'object' && !Array.isArray(value);
    let mode = 'stats', selectedId = null, signature = '', message = '';
    let costSignature='', poolSignature='', gearListSignature='', workbenchSignature='', savedRollSignature='';
    let costViews=[];
    const autoTargets = new Map();
    let autoRun = null, autoTimer = null;
    const node = (tag, className, text) => { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; };
    const rollText = roll => Equipment.describe({stats: {[roll.stat]: roll.value}});
    const rollSaveCost = 10000;
    const copyRolls = rolls => rolls.map(roll => roll && {...roll});
    const sameRolls = (a = [], b = []) => a.length === b.length && a.every((roll,index) =>
        roll === null ? b[index] === null : roll.stat === b[index]?.stat && roll.value === b[index]?.value);
    const isWeapon = item => item?.slot === 'weapon' && item.crafting;
    const isUnlocked = () => itemData.items.some(item => item.crafting && ownsItem(item.id));
    const targetsFor = id => {
        if (!autoTargets.has(id)) autoTargets.set(id, new Set());
        return autoTargets.get(id);
    };
    const matchesTargets = (item, targets) => {
        const rolled = new Set(rollsFor(item).filter(Boolean).map(roll => roll.stat));
        return targets.length > 0 && targets.every(stat => rolled.has(stat));
    };
    function stopAuto(reason = 'Auto rolling stopped.') {
        if (!autoRun) return false;
        if (autoTimer !== null) window.clearTimeout(autoTimer);
        autoTimer = null; autoRun = null; message = reason; signature = '';
        return true;
    }
    function autoContextValid(run) {
        const item = itemById[run.id];
        return mode === 'stats' && state.currentView === 'town' && selectedId === run.id &&
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
        if (autoRun) return {ok:false, message:'Stop auto rolling before saving a roll.'};
        const item = itemById[id];
        if (!isWeapon(item) || !ownsItem(id) || SaveCompatibility.protection.blocked || simulatingCombat) return {ok:false, message:'Choose an owned rerollable weapon.'};
        if (!rollsFor(item).some(Boolean)) return {ok:false, message:'Craft weapon stats before saving a roll.'};
        if (sameRolls(state.itemCrafts[id], state.itemRollSaves[id])) return {ok:false, message:'This roll is already saved.'};
        if (!GameResources.canSpend(state,{gold:rollSaveCost})) return {ok:false, message:'You need 10,000 gold to save this roll.'};
        const result = persist({...GameResources.payment(state,{gold:rollSaveCost}), itemRollSaves:{...state.itemRollSaves, [id]:copyRolls(state.itemCrafts[id])}},
            'Could not save the roll. Your gold and previous saved roll were kept.');
        return result.ok ? {ok:true, message:'Weapon roll saved for 10,000 gold. Restore it once for free; reclaiming consumes the save.'} : result;
    }
    function restoreRoll(id) {
        if (autoRun) return {ok:false, message:'Stop auto rolling before reclaiming a roll.'};
        const item = itemById[id], saved = state.itemRollSaves[id];
        if (!isWeapon(item) || !ownsItem(id) || SaveCompatibility.protection.blocked || simulatingCombat) return {ok:false, message:'Choose an owned rerollable weapon.'};
        if (!saved) return {ok:false, message:'Save a weapon roll first.'};
        if (sameRolls(state.itemCrafts[id], saved)) return {ok:false, message:'Your weapon already has the saved roll.'};
        const remainingSaves = {...state.itemRollSaves}; delete remainingSaves[id];
        const result = persist({itemCrafts:{...state.itemCrafts, [id]:copyRolls(saved)}, itemRollSaves:remainingSaves},
            'Could not restore the roll. Your current stats and saved roll were kept.');
        return result.ok ? {ok:true, message:'Weapon roll reclaimed for free. The saved roll was consumed. Saving another roll costs 10,000 gold.'} : result;
    }
    function rollProblem(item) {
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
        updateCombatText($('rollPoolHint'),'Click up to '+item.crafting.slots+' stats to target. Auto roll stops when all selected stats appear together, at any value. Each roll pays the normal cost every 0.5s. Leaving crafting stops auto roll.');
        updateCombatText($('autoRollSelection'),targets.size ? targets.size+' / '+item.crafting.slots+' targeted: '+[...targets].map(stat=>Equipment.stats[stat].display.label).join(' + ')+(matchesTargets(item,[...targets])?' · Already on this roll.':'') : 'Select potential stats below to enable auto roll.');
        updateCombatText($('autoRollEquipment'),autoRun ? 'Stop rolling' : 'Auto roll');
        updateCombatAttribute($('autoRollEquipment'),'aria-pressed',String(Boolean(autoRun)));
        $('autoRollEquipment').disabled = !autoRun && (!targets.size || Boolean(rollProblem(item)) || matchesTargets(item,[...targets]));
    }
    function showSavedRoll(item) {
        const panel = $('weaponRollSave'); panel.hidden = !isWeapon(item);
        if (panel.hidden) return;
        const saved = state.itemRollSaves[item.id], matches = saved && sameRolls(state.itemCrafts[item.id], saved);
        const structure=JSON.stringify([item.id,item.crafting.slots,saved]);
        if(savedRollSignature!==structure){
        savedRollSignature=structure;
        $('savedWeaponRolls').replaceChildren(...(saved ? rollsFor(item, {itemCrafts:state.itemRollSaves}).map((roll, index) =>
            node('li', '', roll && Equipment.stats[roll.stat] ? rollText(roll) : 'Crafted slot '+(index+1)+' (empty)')) : []));
        }
        const blocked = Boolean(autoRun) || SaveCompatibility.protection.blocked || simulatingCombat || !ownsItem(item.id);
        $('saveWeaponRoll').textContent = (saved ? 'Replace saved roll' : 'Save current roll')+' · 10,000 gold';
        $('saveWeaponRoll').disabled = blocked || !GameResources.canSpend(state,{gold:rollSaveCost}) || !rollsFor(item).some(Boolean) || Boolean(matches);
        $('restoreWeaponRoll').disabled = blocked || !saved || Boolean(matches);
        $('weaponRollSaveStatus').textContent = saved ? matches ? 'Your current roll matches this save.' : 'Reclaim these stats for free. This replaces your current crafted stats and consumes the saved roll.' : 'No saved roll yet. Craft stats, then save a roll you want to keep.';
    }
    function render() {
        if (autoRun && !autoContextValid(autoRun)) stopAuto('Auto rolling stopped because the item or crafting page changed.');
        const unlocked = isUnlocked();
        document.querySelector('[data-crafting-mode="stats"]').hidden = !unlocked;
        document.querySelector('.crafting-mode-tabs').hidden = !unlocked;
        if (!unlocked) {
            mode = 'recipes'; selectedId = null; signature = ''; message = '';
        }
        $('recipeCrafting').hidden = mode !== 'recipes'; $('statCrafting').hidden = mode !== 'stats';
        document.querySelectorAll('[data-crafting-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.craftingMode === mode)));
        if (mode !== 'stats') return;
        const items = itemData.items.filter(item => item.crafting && ownsItem(item.id));
        if (!items.some(item => item.id === selectedId)) { selectedId = items[0]?.id || null; message = ''; }
        const item = itemById[selectedId];
        if (item) {
            const pool = new Set(Equipment.craftingPool(item,itemData).map(roll=>roll.stat)), targets=targetsFor(item.id);
            for (const stat of [...targets]) if (!pool.has(stat) || [...targets].indexOf(stat) >= item.crafting.slots) targets.delete(stat);
        }
        const next = JSON.stringify({id: selectedId, slots:item?.crafting.slots, type:item?.equipmentType, tier:item?.tier, pool:item && Equipment.craftingPool(item,itemData), cost:item && {gold:Equipment.craftingGold(item,itemData),materials:item.crafting.cost.materials}, developerItemsEnabled:state.developerItemsEnabled, rolls: state.itemCrafts, savedRolls:state.itemRollSaves, targets:[...targetsFor(selectedId)], auto:autoRun, blocked:SaveCompatibility.protection.blocked, gold: Math.floor(state.gold), materials: state.materials, owned: state.ownedItemIds, gear: state.gear, message});
        if (next === signature) return;
        signature = next;
        $('rerollWorkbench').hidden = !item; $('rerollEmpty').hidden = Boolean(item);
        const gearStructure=JSON.stringify(items.map(entry=>[entry.id,entry.name,entry.sprite,entry.tier,entry.crafting.slots,Object.values(state.gear).includes(entry.id)]));
        if(gearListSignature!==gearStructure){
        gearListSignature=gearStructure;
        $('rerollGearList').replaceChildren();
        for (const entry of items) {
            const button = node('button', 'reroll-gear-option');
            button.type = 'button'; button.dataset.rerollItem = entry.id; button.setAttribute('aria-pressed', String(entry.id === selectedId));
            const ownership = Object.values(state.gear).includes(entry.id) ? 'Equipped' : 'Owned';
            button.append(Equipment.createIcon(entry), node('strong', '', entry.name), node('small', '', ownership + (entry.tier ? ' · Tier ' + entry.tier : '') + ' · ' + entry.crafting.slots + ' crafted slot' + (entry.crafting.slots === 1 ? '' : 's')));
            $('rerollGearList').append(button);
        }
        }
        $('rerollGearList').querySelectorAll('[data-reroll-item]').forEach(button=>updateCombatAttribute(button,'aria-pressed',String(button.dataset.rerollItem===selectedId)));
        updateCombatText($('rerollSlotSummary'),item ? item.crafting.slots + ' crafted slot' + (item.crafting.slots === 1 ? '' : 's') + ' on this item' : '');
        if (!item) return;
        const workbenchStructure=JSON.stringify([item.id,item.name,item.sprite,item.slot,item.equipmentType,item.tier,item.rarity,Equipment.describe(item)]);
        if(workbenchSignature!==workbenchStructure){
        workbenchSignature=workbenchStructure;
        $('rerollItemArt').replaceChildren(EquipmentSpritePreview.createIcon(item));
        $('rerollItemName').textContent = item.name;
        const typeName = itemData.equipmentTypes?.find(type => type.id === item.equipmentType)?.name;
        $('rerollItemMeta').textContent = (typeName || item.slot) + (item.tier ? ' · Tier ' + item.tier : '') + ' · ' + item.rarity + ' · Your equipment';
        $('rerollPermanentStats').replaceChildren(...Equipment.describe(item).split('\n').map(text => node('li', 'permanent-stat', text)));
        }
        while($('rerollSlots').children.length>item.crafting.slots)$('rerollSlots').lastElementChild.remove();
        rollsFor(item).forEach((roll, index) => {
            let card=$('rerollSlots').children[index];
            if(!card){card = node('div', 'crafted-stat-card');
            card.append(node('small', '', 'CRAFTED SLOT ' + (index + 1)), node('strong', '', roll && Equipment.stats[roll.stat] ? rollText(roll) : 'Crafted stat'),
                node('span', '', roll ? 'Replaced on your next roll' : 'Empty · craft to reveal a stat'));
            $('rerollSlots').append(card);
            }
            card.classList.toggle('is-filled',Boolean(roll));
            updateCombatText(card.querySelector('strong'),roll&&Equipment.stats[roll.stat]?rollText(roll):'Crafted stat');
            updateCombatText(card.querySelector('span'),roll?'Replaced on your next roll':'Empty · craft to reveal a stat');
        });
        showCost(item); showPool(item); showSavedRoll(item);
        const gold = Equipment.craftingGold(item,itemData);
        const affordable = Number.isSafeInteger(gold) && gold > 0 && GameResources.canSpend(state,{...item.crafting.cost.materials,gold});
        $('rerollEquipment').disabled = Boolean(autoRun) || !ownsItem(item.id) || !affordable || SaveCompatibility.protection.blocked;
        $('rerollEquipment').textContent = rollsFor(item).some(Boolean) ? 'Reroll ' + (item.crafting.slots === 1 ? '' : 'all ') + item.crafting.slots + ' crafted stat' + (item.crafting.slots === 1 ? '' : 's') : 'Craft ' + item.crafting.slots + ' stat' + (item.crafting.slots === 1 ? '' : 's');
        $('rerollStatus').textContent = message || (!ownsItem(item.id) ? 'Craft or find this equipment first.' : affordable ? 'Permanent stats stay locked. All crafted slots change with each roll.' : 'Collect the missing gold and materials to craft.');
    }
    function setMode(next) { stopAuto(); mode = next === 'recipes' || !isUnlocked() ? 'recipes' : 'stats'; signature = ''; }
    document.addEventListener('click', event => {
        const tab = event.target.closest('[data-crafting-mode]'), pick = event.target.closest('[data-reroll-item]');
        if (tab) { setMode(tab.dataset.craftingMode); renderCrafting(); }
        if (pick) { stopAuto(); selectedId = pick.dataset.rerollItem; message = ''; render(); $('rerollWorkbench').scrollIntoView({block:'nearest'}); }
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
            const result = reroll(selectedId); message = result.message; window.render();
        }
        if (event.target.closest('#saveWeaponRoll, #restoreWeaponRoll') && !event.target.closest('button').disabled) {
            const result = event.target.closest('#saveWeaponRoll') ? saveRoll(selectedId) : restoreRoll(selectedId);
            message = result.message; window.render();
        }
    });
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&stopAuto('Auto rolling stopped while the game is hidden.'))render();});
    window.addEventListener('pagehide',()=>stopAuto());
    window.ItemCrafting = {validateSave, rollsFor, effective, describe, appendSlots, reroll, saveRoll, restoreRoll, render, setMode, stopAuto, mode: () => mode};
}());
