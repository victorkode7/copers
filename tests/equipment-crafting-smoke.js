(async function () {
    const checks = [], check = (name, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) throw new Error(name); };
    const clone = value => JSON.parse(JSON.stringify(value)), near = (a, b) => Math.abs(a - b) < 1e-6;
    const originalRandom = Math.random, originalSetItem = Storage.prototype.setItem;
    try {
        const names = ['Ice helmet','Ice body','Ice legs','Ice wand','Opal bow','blade'];
        const items = names.map(name => itemData.items.find(item => item.name === name)), wand = items[3];
        check('all six selected pieces have valid editable reroll rules', items.every(item => item.crafting?.slots === 2) && Equipment.validate(itemData).length === 0);
        check('ice armor has only permanent health and evasion', items.slice(0,3).every(item => Object.keys(item.stats).sort().join(',') === 'evasion,health'));
        check('weapons have exactly the requested permanent stats', ['manaRegenPercent,spellDamage','attackSpeedMultiplier,bowDamageIncrease','attackSpeedMultiplier,damage'].every((stats,index) => Object.keys(items[index + 3].stats).sort().join(',') === stats));
        state.skillRanks = {}; state.level = 0; state.skillPoints = 0; state.experience = 0;
        state.upgrades = {strength:0,haste:0,evasion:0}; state.gear = createEmptyGear(); state.gear.weapon = wand.id;
        state.ownedItemIds = items.map(item => item.id); state.crafted = []; state.itemCrafts = {};
        state.gold = 1000000; state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id,100000]));
        state.currentView = 'town'; state.isInTown = true; state.combatPaused = false;
        resetMonsterStates(currentMap()); state.playerHp = getPlayerMaxHealth(); state.playerMana = 0;
        ItemCrafting.setMode('stats'); render();
        check('the crafted-stat tab is named Anvil', document.querySelector('[data-crafting-mode="stats"]').textContent.trim() === 'Anvil' && document.getElementById('statCrafting').getAttribute('aria-label') === 'Anvil');
        check('the new workbench shows six equipment choices and two empty slots', document.querySelectorAll('[data-reroll-item]').length === 6 && document.querySelectorAll('#rerollStatContent .crafted-stat-card').length === 2 && [...document.querySelectorAll('#rerollStatContent .crafted-stat-card strong')].every(node => node.textContent === 'Empty'));
        const savedRollPanel = document.getElementById('weaponRollSave');
        check('saved weapon roll has its own container beneath the crafted stats', savedRollPanel.parentElement.classList.contains('reroll-item-panel') && savedRollPanel.previousElementSibling.id === 'rerollItemStats' && savedRollPanel.classList.contains('weapon-roll-save'));
        const savedRollList = document.getElementById('savedWeaponRolls'), savedRollOffset = () => savedRollPanel.parentElement.getBoundingClientRect().bottom - savedRollPanel.getBoundingClientRect().bottom, savedRollBottom = savedRollOffset();
        check('saved-roll stats remain unwrapped without a scroll area', !['auto','scroll'].includes(getComputedStyle(savedRollList).overflowY) && getComputedStyle(savedRollList).whiteSpace === 'nowrap');
        check('selected item panel has a compact stable reserved height', Math.round(savedRollPanel.parentElement.getBoundingClientRect().height) === 520);
        check('saved roll sits close beneath the item stats', savedRollPanel.getBoundingClientRect().top - document.getElementById('rerollItemStats').getBoundingClientRect().bottom < 160);
        check('rolled item stats do not use a scrollbar', getComputedStyle(document.getElementById('rerollItemStats')).overflowY === 'visible');
        const gearSlot = document.getElementById('rerollGearSlot'), gearSort = document.getElementById('rerollGearSort');
        const gearOptions = () => [...document.querySelectorAll('[data-reroll-item]')];
        const equippedSlots = () => [...document.querySelectorAll('[data-reroll-slot]')];
        check('anvil shows compact inventory-style equipment slots', equippedSlots().length === itemData.slots.length && equippedSlots().every(button => button.querySelector('.equipment-slot-icon') && button.querySelector('.reroll-equipment-slot-label')));
        check('equipped slots follow the MMO paper-doll layout', getComputedStyle(document.getElementById('rerollEquippedSlots')).gridTemplateAreas.includes('"weapon body cape"') && getComputedStyle(document.getElementById('rerollEquippedSlots')).gridTemplateAreas.includes('"necklace helmet ."'));
        check('chest slot is presented as Body', document.querySelector('[data-reroll-slot="chest"] .reroll-equipment-slot-label').textContent === 'Body' && gearSlot.querySelector('option[value="chest"]')?.textContent === 'Body');
        check('equipment choices omit the Owned label', gearOptions().every(button => !button.textContent.includes('Owned')));
        check('anvil slots have no redundant numbering', !document.querySelector('#rerollStatContent .crafted-stat-card small') && !document.getElementById('rerollSlotSummary').textContent);
        check('permanent stats use locked grey cards', document.querySelectorAll('#rerollStatContent .permanent-stat').length === Object.keys(wand.stats).length && [...document.querySelectorAll('#rerollStatContent .permanent-stat')].every(row => row.querySelector('.permanent-stat-lock')?.getAttribute('aria-hidden') === 'true' && getComputedStyle(row).backgroundColor !== getComputedStyle(document.querySelector('#rerollStatContent .crafted-stat-card')).backgroundColor));
        check('equipped gear is first in the default gear list', gearOptions()[0]?.dataset.rerollItem === wand.id && gearOptions()[0].classList.contains('is-equipped'));
        check('equipped labels are highlighted and item rarity is hidden', gearOptions().some(button => button.querySelector('.is-equipped-label')?.textContent.startsWith('Equipped')) && !gearOptions().some(button => button.textContent.includes('common') || button.textContent.includes('uncommon') || button.textContent.includes('rare') || button.textContent.includes('epic') || button.textContent.includes('unique')));
        check('currently rerolled item omits rarity and uses a larger sprite', !document.getElementById('rerollItemMeta').textContent.includes(wand.rarity) && Math.round(document.getElementById('rerollItemArt').getBoundingClientRect().width) === 66);
        equippedSlots().find(button => button.dataset.rerollSlot === 'weapon').click();
        check('clicking an equipped slot selects its item and filters that slot', gearSlot.value === 'weapon' && document.querySelector('[data-reroll-item="' + wand.id + '"]')?.getAttribute('aria-pressed') === 'true');
        gearSlot.value = 'all'; gearSlot.dispatchEvent(new Event('change', {bubbles:true}));
        gearSlot.value = 'helmet'; gearSlot.dispatchEvent(new Event('change', {bubbles:true}));
        check('equipment slot filter shows only matching items', gearOptions().length === 1 && gearOptions()[0].dataset.rerollItem === items[0].id);
        check('item stat changes use staggered in/out transitions', matchMedia('(prefers-reduced-motion: reduce)').matches
            ? !document.querySelector('.reroll-stat-exit') && [...document.querySelectorAll('#rerollStatContent .permanent-stat,#rerollStatContent .crafted-stat-card')].every(row => row.getAnimations().length === 0)
            : Boolean(document.querySelector('.reroll-stat-exit')) && [...document.querySelectorAll('#rerollStatContent .permanent-stat,#rerollStatContent .crafted-stat-card')].some(row => row.getAnimations().length > 0));
        gearSlot.value = 'weapon'; gearSlot.dispatchEvent(new Event('change', {bubbles:true}));
        check('changing slots keeps the equipped item easy to select', gearOptions()[0]?.dataset.rerollItem === wand.id);
        gearSort.value = 'name'; gearSort.dispatchEvent(new Event('change', {bubbles:true}));
        check('name sort orders matching gear alphabetically', gearOptions().map(button => itemById[button.dataset.rerollItem].name)
            .every((name, index, names) => index === 0 || names[index - 1].localeCompare(name) <= 0));
        gearSlot.value = 'all'; gearSlot.dispatchEvent(new Event('change', {bubbles:true}));
        gearSort.value = 'rarity'; gearSort.dispatchEvent(new Event('change', {bubbles:true}));
        const rarityRank = {common:0, uncommon:1, rare:2, epic:3, unique:4};
        check('rarity sort puts higher rarity first', gearOptions().map(button => rarityRank[itemById[button.dataset.rerollItem].rarity] ?? -1)
            .every((rank, index, ranks) => index === 0 || ranks[index - 1] >= rank));
        gearSort.value = 'equipped'; gearSort.dispatchEvent(new Event('change', {bubbles:true}));
        gearOptions()[0].click();
        const costPanel = document.querySelector('.reroll-recipe-panel').getBoundingClientRect(), selection = document.querySelector('.reroll-gear-selection').getBoundingClientRect();
        check('gear selection is to the right of the cost panel', selection.left >= costPanel.right - 1);
        const workbenchRect = document.getElementById('rerollWorkbench').getBoundingClientRect(), selectedItemRect = document.querySelector('.reroll-item-panel').getBoundingClientRect();
        check('the selected item panel takes about two-fifths of the workbench', selectedItemRect.width / workbenchRect.width >= .37 && selectedItemRect.width / workbenchRect.width <= .43);
        check('the crafting page fits the viewport width', document.documentElement.scrollWidth <= innerWidth);
        document.querySelector('[data-reroll-item="' + wand.id + '"]').click();
        check('selected gear shows its exact gold/material cost and potential roll list', document.getElementById('rerollCost').children.length === Object.keys(wand.crafting.cost.materials).length + 1 && document.getElementById('potentialRolls').children.length === Equipment.craftingPool(wand,itemData).length && document.getElementById('rerollCost').textContent.includes(Equipment.craftingGold(wand,itemData).toLocaleString()));
        const permanent = JSON.stringify(wand.stats), oldGold = state.gold, oldMaterials = {...state.materials};
        Math.random = () => 0;
        document.getElementById('rerollEquipment').click();
        const rolls = state.itemCrafts[wand.id];
        const craftedMana = rolls.find(roll => roll.stat === 'mana')?.value || 0;
        check('one action fills both slots with two different stats', rolls.length === 2 && rolls[0].stat !== rolls[1].stat && rolls.every(Boolean));
        check('one action pays its cost once', state.gold === oldGold - Equipment.craftingGold(wand,itemData) && Object.entries(wand.crafting.cost.materials).every(([id,cost]) => state.materials[id] === oldMaterials[id] - cost));
        check('permanent stats never change', JSON.stringify(wand.stats) === permanent);
        check('crafted stats affect equipped gear immediately', near(getGearStat('spellDamageMultiplier'), rolls.find(roll => roll.stat === 'spellDamageMultiplier').value) && getPlayerMaxMana() === craftedMana);
        check('filled slots show their values without a reroll message', document.querySelectorAll('#rerollStatContent .crafted-stat-card.is-filled').length === 2 && !document.getElementById('rerollStatus').textContent.includes('crafted stats rerolled'));
        const saved = parseGameSave(localStorage.getItem(saveKey));
        check('profile loading preserves rolls and crafted mana capacity', JSON.stringify(saved.itemCrafts) === JSON.stringify(state.itemCrafts) && getProfileMaxMana(saved) === getPlayerMaxMana());
        const profileInput = document.getElementById('importProfileFile'), transfer = new DataTransfer();
        transfer.items.add(new File([JSON.stringify({format:'idle-adventure-profile',version:1,save:saved})], 'crafted-profile.json', {type:'application/json'}));
        state.itemCrafts = {};
        profileInput.files = transfer.files; profileInput.dispatchEvent(new Event('change'));
        for (let wait = 0; document.getElementById('importProfile').disabled && wait < 200; wait++) await new Promise(resolve => setTimeout(resolve,5));
        check('the real profile import restores crafted slots and equipped bonuses', JSON.stringify(state.itemCrafts) === JSON.stringify(saved.itemCrafts) && getPlayerMaxMana() === craftedMana);
        const first = JSON.stringify(rolls); Math.random = () => .999999;
        check('rerolling replaces both old slots', ItemCrafting.reroll(wand.id).ok && JSON.stringify(state.itemCrafts[wand.id]) !== first && state.itemCrafts[wand.id].every(roll => !rolls.some(old => old.stat === roll.stat)));
        for (let sample = 0; sample < 30; sample++) {
            Math.random = () => ((sample * 1543 + 391) % 1000) / 1000;
            const result = ItemCrafting.reroll(wand.id);
            check('sample ' + sample + ' uses configured ranges, steps and no duplicate stats', result.ok && state.itemCrafts[wand.id].every(roll => {
                const rule = Equipment.craftingPool(wand,itemData).find(entry => entry.stat === roll.stat);
                return rule && roll.value >= rule.min - 1e-8 && roll.value <= rule.max + 1e-8 && near((roll.value-rule.min)/rule.step, Math.round((roll.value-rule.min)/rule.step));
            }) && state.itemCrafts[wand.id][0].stat !== state.itemCrafts[wand.id][1].stat);
        }
        const originalCrafting = clone(wand.crafting), originalRolls = clone(state.itemCrafts[wand.id]);
        for (const count of [1,3,5,7]) {
            wand.crafting.slots = count;
            const beforeGold = state.gold, beforeMaterials = {...state.materials};
            check(count + ' crafted stats are valid with enough potential stats', !Equipment.validate(itemData).length && ItemCrafting.reroll(wand.id).ok);
            const generated = state.itemCrafts[wand.id];
            check(count + ' slots roll distinct stats for one configured cost', generated.length === count && new Set(generated.map(roll => roll.stat)).size === count && state.gold === beforeGold - Equipment.craftingGold(wand,itemData) && Object.entries(wand.crafting.cost.materials).every(([id,cost]) => state.materials[id] === beforeMaterials[id] - cost));
            renderCrafting();
            check(count + ' slots appear in the workbench and button label', document.querySelectorAll('#rerollStatContent .crafted-stat-card').length === count && document.getElementById('rerollEquipment').textContent.includes(String(count)) && !document.getElementById('rerollSlotSummary').textContent);
            if (count <= 3) check(count + ' crafted mods keep the saved roll anchored to the bottom', Math.abs(savedRollOffset() - savedRollBottom) < 1);
            check(count + ' crafted mods keep the item panel height fixed', Math.round(savedRollPanel.parentElement.getBoundingClientRect().height) === 520);
            if (count === 3) check('saved weapon roll stays visible at the bottom of the item panel', !savedRollPanel.hidden && savedRollPanel.getBoundingClientRect().height > 0 && savedRollPanel.getBoundingClientRect().bottom <= savedRollPanel.parentElement.getBoundingClientRect().bottom + 1);
            if (count === 7) {
                wand.crafting.slots = 6;
                state.itemCrafts[wand.id] = clone(generated.slice(0,6));
                state.itemRollSaves[wand.id] = clone(generated.slice(0,6));
                renderCrafting();
                check('saved roll shows all six stats without scrolling', savedRollList.children.length === 6 && savedRollList.scrollHeight === savedRollList.clientHeight && getComputedStyle(savedRollList).overflowY === 'visible');
                delete state.itemRollSaves[wand.id];
                wand.crafting.slots = count;
                state.itemCrafts[wand.id] = generated;
                renderCrafting();
            }
            const variableSave = parseGameSave(JSON.stringify(createGameSave()));
            applyGameSave(variableSave);
            check(count + ' slots survive save parsing and restoration', state.itemCrafts[wand.id].length === count);
        }
        const expandedRolls = clone(state.itemCrafts[wand.id]);
        wand.crafting.slots = 1;
        check('reducing slot count keeps surplus rolls saved but inactive', ItemCrafting.rollsFor(wand).length === 1 && JSON.stringify(state.itemCrafts[wand.id]) === JSON.stringify(expandedRolls) && parseGameSave(JSON.stringify(createGameSave())).itemCrafts[wand.id].length === 7);
        const activeFirst = ItemCrafting.effective(wand).stats;
        check('only visible crafted slots contribute equipped stats', expandedRolls.slice(1).every(roll => near(activeFirst[roll.stat] ?? Equipment.stats[roll.stat].default, wand.stats[roll.stat] ?? Equipment.stats[roll.stat].default)));
        wand.crafting.slots = 4; state.itemCrafts[wand.id] = originalRolls;
        const grownSlots = ItemCrafting.rollsFor(wand);
        check('increasing slot count retains earned rolls and adds empty slots', grownSlots.length === 4 && JSON.stringify(grownSlots.slice(0,2)) === JSON.stringify(originalRolls) && grownSlots.slice(2).every(roll => roll === null));
        wand.crafting.slots = Equipment.craftingPool(wand,itemData).length + 1;
        const beforeInvalid = state.gold;
        check('an impossible roll count is rejected without charging', !ItemCrafting.reroll(wand.id).ok && state.gold === beforeInvalid && Equipment.validate(itemData).length > 0);
        wand.crafting = originalCrafting;
        const arbitrary = itemData.items.find(item => !item.crafting), arbitraryStats = JSON.stringify(arbitrary.stats);
        arbitrary.equipmentType = wand.equipmentType; arbitrary.tier = wand.tier;
        arbitrary.crafting = {...clone(originalCrafting), slots:3}; state.ownedItemIds.push(arbitrary.id);
        check('another item can have an independent crafted slot count', ItemCrafting.reroll(arbitrary.id).ok && state.itemCrafts[arbitrary.id].length === 3 && JSON.stringify(arbitrary.stats) === arbitraryStats && wand.crafting.slots === 2);
        delete arbitrary.crafting;
        state.ownedItemIds = state.ownedItemIds.filter(id => id !== arbitrary.id);
        const armorPreset = Equipment.craftingPreset(items[0],itemData), originalRange = clone(armorPreset.pool[0]);
        Math.random = () => 0;
        check('original tier ranges generate the expected armor roll', ItemCrafting.reroll(items[0].id).ok && state.itemCrafts[items[0].id][0].value === originalRange.min);
        Object.assign(armorPreset.pool[0],{min:1.04,max:1.12,step:.02});
        check('editing a shared range changes future rolls on another linked item', ItemCrafting.reroll(items[1].id).ok && state.itemCrafts[items[1].id][0].value === 1.04);
        check('earned rolls retain their values after a shared preset edit', state.itemCrafts[items[0].id][0].value === originalRange.min && parseGameSave(JSON.stringify(createGameSave())).itemCrafts[items[0].id][0].value === originalRange.min);
        items[0].tier = 3;
        const tier3Range = Equipment.craftingPreset(items[0],itemData).pool[0];
        check('changing tier uses the new preset for future rolls', ItemCrafting.reroll(items[0].id).ok && state.itemCrafts[items[0].id][0].value === tier3Range.min);
        items[0].tier = 99;
        const goldBeforeMissingTier = state.gold;
        check('missing tier ranges cannot charge resources or generate invalid rolls', !ItemCrafting.reroll(items[0].id).ok && state.gold === goldBeforeMissingTier && Equipment.validate(itemData).length > 0);
        items[0].tier = 2; Object.assign(armorPreset.pool[0],originalRange);
        const previousGoldCost = armorPreset.gold, previousGold = state.gold;
        armorPreset.gold = 1234;
        document.querySelector('[data-reroll-item="' + items[1].id + '"]').click();
        state.gold = 1233; render();
        check('shared price controls affordability', document.getElementById('rerollEquipment').disabled && document.getElementById('rerollCost').textContent.includes('1,234'));
        state.gold = 1234; render();
        check('changing shared gold updates the display and charges exactly once', !document.getElementById('rerollEquipment').disabled && ItemCrafting.reroll(items[1].id).ok && state.gold === 0);
        state.gold = previousGold;
        armorPreset.gold = 0;
        const invalidCostRolls = JSON.stringify(state.itemCrafts);
        check('invalid shared costs cannot generate free rolls', !ItemCrafting.reroll(items[1].id).ok && state.gold === previousGold && JSON.stringify(state.itemCrafts) === invalidCostRolls && Equipment.validate(itemData).length > 0);
        armorPreset.gold = previousGoldCost;
        document.querySelector('[data-reroll-item="' + wand.id + '"]').click();
        const tieredCrafting = clone(wand.crafting);
        wand.crafting.pool = clone(Equipment.craftingPool(wand,itemData));
        Object.assign(wand.crafting.pool[0],{min:1.11,max:1.11});
        check('legacy item-specific ranges remain usable', ItemCrafting.reroll(wand.id).ok && state.itemCrafts[wand.id][0].value === 1.11);
        wand.crafting = tieredCrafting;
        const beforeFailure = JSON.stringify(createGameSave()), raw = localStorage.getItem(saveKey);
        Storage.prototype.setItem = function(key, value) { if (key === saveKey) throw new DOMException('Full','QuotaExceededError'); return originalSetItem.call(this,key,value); };
        check('failed persistence rolls back gold, materials, rolls, health and mana', !ItemCrafting.reroll(wand.id).ok && JSON.stringify(createGameSave()) === beforeFailure && localStorage.getItem(saveKey) === raw);
        Storage.prototype.setItem = originalSetItem;
        state.gold = 0; const beforePoor = JSON.stringify(state.itemCrafts);
        check('insufficient gold keeps existing rolls', !ItemCrafting.reroll(wand.id).ok && JSON.stringify(state.itemCrafts) === beforePoor);
        state.gold = 100000; state.ownedItemIds = [wand.id];
        renderCrafting();
        check('unowned equipment is hidden and cannot be rerolled', !document.querySelector('[data-reroll-item="' + items[5].id + '"]') && !ItemCrafting.reroll(items[5].id).ok);
        const profile = createGameSave(); delete profile.itemCrafts;
        check('older saves get empty crafted slots without resetting progress', Object.keys(parseGameSave(JSON.stringify(profile)).itemCrafts).length === 0);
        const returningProfile = createGameSave();
        profile.playerMana = 150;
        applyGameSave(parseGameSave(JSON.stringify(profile)));
        check('old wand mana is safely clamped after permanent stat changes', state.playerMana <= getPlayerMaxMana() && state.ownedItemIds.includes(wand.id) && state.gold === profile.gold);
        applyGameSave(parseGameSave(JSON.stringify(returningProfile)));
        const futureProfile = createGameSave();
        futureProfile.itemCrafts.futureEquipment = [{stat:'futureStat',value:.2},null];
        check('temporarily unavailable equipment and stats keep their saved rolls',
            parseGameSave(JSON.stringify(futureProfile)).itemCrafts.futureEquipment[0].stat === 'futureStat');
        const invalids = [null, [], {[wand.id]:[]}, {[wand.id]:[{stat:'mana',value:20},{stat:'mana',value:30}]}, {[wand.id]:[{stat:'minimumEnemyHitChance',value:0},null]}];
        for (const invalid of invalids) {
            const profile = createGameSave(); profile.itemCrafts = invalid;
            let rejected = false; try { parseGameSave(JSON.stringify(profile)); } catch { rejected = true; }
            check('malformed crafted rolls are rejected safely', rejected);
        }
        state.currentView = 'inventory'; inventoryCategory = 'all'; lastRenderedGearSignature = null; render();
        check('equipped tooltip includes permanent and crafted stats', document.getElementById('equipped-stats-weapon').textContent.includes('[Crafted]'));
        const originalConfirm = window.confirm;
        try { window.confirm = () => true; document.getElementById('resetGame').click(); }
        finally { window.confirm = originalConfirm; }
        check('explicit game reset clears crafted rolls in memory and storage', !Object.keys(state.itemCrafts).length && !Object.keys(JSON.parse(localStorage.getItem(saveKey)).itemCrafts).length);
        check('no runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    finally { Math.random = originalRandom; Storage.prototype.setItem = originalSetItem; }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
