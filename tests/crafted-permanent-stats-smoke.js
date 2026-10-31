(function () {
    const checks = [], near = (a,b) => Math.abs(a-b) < 1e-6;
    const check = (name,ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) throw new Error(name); };
    const originalRandom = Math.random;
    try {
        check('all preset ranges and item definitions validate', Equipment.validate(itemData).length === 0);
        for (const preset of itemData.craftingPresets) {
            const required = ['armor','accessory'].includes(preset.equipmentType) ? ['health','evasion']
                : ['wand','bow','melee'].includes(preset.equipmentType) ? [preset.equipmentType === 'wand' ? 'spellDamage' : 'damage','attackSpeedMultiplier'] : [];
            check(preset.equipmentType + ' tier ' + preset.tier + ' includes base stat rolls', required.every(stat => preset.pool.some(roll => roll.stat === stat)));
        }
        const items = itemData.items.filter(item => item.crafting && ['armor','wand','bow','melee'].includes(item.equipmentType));
        state.skillRanks = {}; state.level = 0; state.skillPoints = 0; state.experience = 0;
        state.upgrades = {strength:0,haste:0,evasion:0}; state.gear = createEmptyGear();
        state.ownedItemIds = items.map(item => item.id); state.itemCrafts = {};
        state.gold = 10000000; state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id,100000]));
        state.currentView = 'town'; state.isInTown = true; state.combatPaused = false;
        resetMonsterStates(currentMap()); state.playerHp = getPlayerMaxHealth(); state.playerMana = 0;
        ItemCrafting.setMode('stats');
        Math.random = () => .999999;
        for (const item of items) {
            const base = JSON.stringify(item.stats), gold = state.gold;
            state.gear = createEmptyGear(); state.gear[item.slot] = item.id;
            check(item.name + ' can roll permanent stat types', ItemCrafting.reroll(item.id).ok);
            const rolls = state.itemCrafts[item.id], overlapping = rolls.filter(roll => Object.hasOwn(item.stats,roll.stat));
            check(item.name + ' actually rolled an existing permanent stat', overlapping.length > 0);
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
