(function () {
    const checks = [], near = (a,b) => Math.abs(a-b) < 1e-6;
    const check = (name,ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) throw new Error(name); };
    const originalRandom = Math.random;
    try {
        check('all preset ranges and item definitions validate', Equipment.validate(itemData).length === 0);
        for(const preset of itemData.craftingPresets.filter(preset => preset.tier === 5 && ['wand','bow','melee'].includes(preset.equipmentType))) {
            for(const [stat,max] of Object.entries({damageMultiplier:2.5,bleedChance:.6,damage:150,attackSpeedMultiplier:2})) {
                const roll = preset.pool.find(roll => roll.stat === stat); if(!roll)continue;
                check(preset.equipmentType + ' tier 5 ' + stat + ' has the requested maximum', roll.max === max);
                const tiers = itemData.craftingPresets.filter(entry => entry.equipmentType === preset.equipmentType).sort((a,b) => a.tier-b.tier).map(entry => entry.pool.find(roll => roll.stat === stat)).filter(Boolean);
                check(preset.equipmentType + ' ' + stat + ' scales upward across tiers', tiers.every((roll,index) => index === 0 || roll.min >= tiers[index-1].min && roll.max >= tiers[index-1].max));
            }
        }
        for (const preset of itemData.craftingPresets) {
            const required = ['armor','accessory'].includes(preset.equipmentType) ? ['health','evasion']
                : ['wand','bow','melee'].includes(preset.equipmentType) ? [preset.equipmentType === 'wand' ? 'spellDamage' : 'damage','attackSpeedMultiplier'] : [];
            check(preset.equipmentType + ' tier ' + preset.tier + ' includes base stat rolls', required.every(stat => preset.pool.some(roll => roll.stat === stat)));
        }
        const items = itemData.items.filter(item => item.crafting && ['armor','wand','bow','melee'].includes(item.equipmentType));
        state.skillRanks = {}; state.level = 0; state.skillPoints = 0; state.experience = 0;
        state.upgrades = {strength:0,haste:0,evasion:0}; state.gear = createEmptyGear();
        state.ownedItemIds = []; state.itemCrafts = {}; state.townProgress = TownProgression.defaults();
        state.gold = 10000000; state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id,100000]));
        state.currentView = 'town'; state.isInTown = true; state.combatPaused = false;
        resetMonsterStates(currentMap()); state.playerHp = getPlayerMaxHealth(); state.playerMana = 0;
        render();
        const statsTab = document.querySelector('[data-crafting-mode="stats"]');
        check('crafted stats and its tab are hidden before owning eligible gear', statsTab.hidden && document.getElementById('statCrafting').hidden && !document.getElementById('recipeCrafting').hidden && document.querySelector('.crafting-mode-tabs').hidden);
        check('locked crafting pages are visually hidden while recipes remain visible', getComputedStyle(document.querySelector('.crafting-mode-tabs')).display === 'none' && !document.getElementById('statCrafting').getClientRects().length && document.getElementById('recipeCrafting').getClientRects().length > 0);
        ItemCrafting.setMode('stats'); renderCrafting();
        check('requesting the locked page keeps regular gear recipes visible', ItemCrafting.mode() === 'recipes' && document.getElementById('statCrafting').hidden);
        state.ownedItemIds = ['testDropHelm']; renderCrafting();
        check('ordinary gear does not unlock crafted stats', statsTab.hidden);
        state.ownedItemIds = [items[0].id]; renderCrafting();
        check('owning eligible gear leaves Anvil locked until building purchase', statsTab.hidden);
        state.townProgress.buildings.anvil = {tier:0,level:1}; renderCrafting();
        check('owning the Anvil unlocks the tab without interrupting recipes', !statsTab.hidden && !document.querySelector('.crafting-mode-tabs').hidden && ItemCrafting.mode() === 'recipes');
        statsTab.click();
        check('unlocked crafted stats can be opened', !document.getElementById('statCrafting').hidden && document.getElementById('recipeCrafting').hidden);
        check('the crafted stats list contains only owned eligible equipment', document.querySelectorAll('[data-reroll-item]').length === 1 && document.querySelector('[data-reroll-item]').dataset.rerollItem === items[0].id);
        if(items.length > 1) {
            check('unowned items cannot be rerolled directly', !ItemCrafting.reroll(items[1].id).ok);
            state.ownedItemIds.push(items[1].id); renderCrafting();
            check('newly acquired eligible equipment appears in the list', document.querySelectorAll('[data-reroll-item]').length === 2);
            document.querySelector('[data-reroll-item="' + items[1].id + '"]').click();
            state.ownedItemIds = [items[0].id]; renderCrafting();
            check('losing the selected item hides it and selects an owned item', document.querySelectorAll('[data-reroll-item]').length === 1 && document.querySelector('[data-reroll-item][aria-pressed=true]').dataset.rerollItem === items[0].id && document.getElementById('rerollItemName').textContent === items[0].name);
        }
        state.ownedItemIds = []; renderCrafting();
        check('removing eligible equipment keeps the built Anvil available', !statsTab.hidden && !document.getElementById('rerollEmpty').hidden);
        const dropped = itemById.testDropHelm, beforeDrop = {crafting:dropped.crafting,equipmentType:dropped.equipmentType,tier:dropped.tier,rarity:dropped.rarity};
        Object.assign(dropped,{crafting:JSON.parse(JSON.stringify(items[0].crafting)),equipmentType:items[0].equipmentType,tier:items[0].tier,rarity:'unique'});
        state.ownedItemIds = [dropped.id]; renderCrafting();
        check('a unique drop with crafted slots also unlocks the page', !statsTab.hidden);
        Object.entries(beforeDrop).forEach(([key,value]) => { if(value === undefined) delete dropped[key]; else dropped[key] = value; });
        state.ownedItemIds = items.map(item => item.id);
        ItemCrafting.setMode('stats');
        Math.random = () => .999999;
        for (const item of items) {
            const base = JSON.stringify(item.stats), gold = state.gold;
            const pool = Equipment.craftingPool(item,itemData), overlapIndex = pool.findIndex(roll => Object.hasOwn(item.stats,roll.stat));
            let draws = 0;
            Math.random = () => draws++ === 0 && overlapIndex >= 0 ? (overlapIndex + .5) / pool.length : .999999;
            state.gear = createEmptyGear(); state.gear[item.slot] = item.id;
            check(item.name + ' can roll its configured stat pool', ItemCrafting.reroll(item.id).ok);
            const rolls = state.itemCrafts[item.id], overlapping = rolls.filter(roll => Object.hasOwn(item.stats,roll.stat));
            check(item.name + (overlapIndex >= 0 ? ' can roll an existing permanent stat' : ' keeps item-exclusive permanent stats separate'), overlapIndex >= 0 ? overlapping.length > 0 : overlapping.length === 0);
            const effective = ItemCrafting.effective(item).stats;
            for (const roll of overlapping) {
                const expected = Equipment.stats[roll.stat].mode === 'multiply' ? item.stats[roll.stat] * roll.value : item.stats[roll.stat] + roll.value;
                check(item.name + ' combines ' + roll.stat + ' with its permanent bonus', near(effective[roll.stat],expected) && near(getGearStat(roll.stat),expected));
            }
            check(item.name + ' preserves permanent stats and charges the shared cost once', JSON.stringify(item.stats) === base && state.gold === gold - Equipment.craftingGold(item,itemData));
            check(item.name + ' keeps crafted slots distinct', new Set(rolls.map(roll => roll.stat)).size === rolls.length);
            render(); document.querySelector('[data-reroll-item="' + item.id + '"]').click();
            check(item.name + ' shows the new possible stats in the crafting window', document.getElementById('potentialRolls').children.length === Equipment.craftingPool(item,itemData).length);
            const saved = parseGameSave(JSON.stringify(createGameSave()));
            check(item.name + ' overlapping bonuses survive profile parsing', JSON.stringify(saved.itemCrafts[item.id]) === JSON.stringify(rolls));
        }
        check('no runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    finally { Math.random = originalRandom; }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
