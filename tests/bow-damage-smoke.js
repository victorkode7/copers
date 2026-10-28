(function () {
    const checks = [];
    const check = (name, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) throw new Error(name); };
    const near = (a, b) => Math.abs(a - b) < 1e-6;
    const originalRandom = Math.random;
    try {
        const bonusNode = skillNodes.find(node => !node.start && Object.hasOwn(node.stats, 'damage'));
        bonusNode.stats = {bowDamageIncrease: .25};
        itemById.testAmulet.stats = {bowDamageIncrease: .5};
        state.skillRanks = {[bonusNode.id]: 2};
        state.gear = createEmptyGear(); state.gear.necklace = 'testAmulet';
        state.ownedItemIds = ['testAmulet']; state.crafted = [];
        state.upgrades = {strength: 0, haste: 0, evasion: 0};
        state.currentView = 'map'; state.isInTown = false;
        const map = currentMap();
        map.spawns = [{id: 'bowTarget', monsterId: worldContent.monsters[0].id, count: 9,
            overrides: {health: 10000, attackDamage: 1, attackInterval: 100, evasion: 0,
                gold: [0, 0], experience: 0, drops: [], itemDrops: []}}];
        resetMonsterStates(map); resetCombatClock(); clearOfflineRecap();
        state.monsterColumns = 3; state.combatPaused = false;
        state.playerHp = getPlayerMaxHealth();
        Math.random = () => 0;
        const monsters = state.monsterStates;
        const restore = () => monsters.forEach(monster => { monster.hp = 10000; monster.bleed = null; monster.poisonStacks = []; });
        check('equipment and ranked skill increases add together', near(getBowDamageMultiplier(), 2));
        check('base physical damage remains unchanged', getDamage() === 2);
        check('item tooltip displays an increased bow damage percentage',
            Equipment.describe(itemById.testAmulet) === '+50% Increased damage with bow attacks');
        check('skill descriptions display an increased bow damage percentage',
            SkillDescriptions.describe({...bonusNode, customDescription: false}).includes('+25% increased damage with bow attacks'));
        check('items with the new stat validate', Equipment.validate(itemData).length === 0);

        for (const [kind, base, expected] of [['multiShot', 10, 20], ['piercingArrow', 20, 40], ['forkingArrow', 10, 20]]) {
            restore();
            shootAbilityArrow([monsters[0]], base, kind);
            check(kind + ' receives the bow bonus', near(10000 - monsters[0].hp, expected));
        }
        for (const [type, ability] of [['physical', null], ['physical', 'shockwaveSlash'], ['physical', 'shieldSlam'],
            ['physical', 'volcanicEruption'], ['spell', 'voidBolt'], ['dot', 'emberBrand'], ['poison', null], ['bleed', null]]) {
            restore();
            applyDamageToMonster(monsters[0], 10, type, ability);
            check((ability || type) + ' keeps its existing damage', near(10000 - monsters[0].hp, 10));
        }

        state.skillRanks.forkingArrow = 1;
        restore(); shootAbilityArrow([monsters[0]], 10, 'forkingArrow');
        check('each hit of a chained fork receives the bonus once', monsters.every((monster, i) =>
            near(10000 - monster.hp, [0, 4, 2].includes(i) ? 20 : 0)));

        state.skillRanks.piercingArrow = 1;
        restore(); shootAbilityArrow([monsters[0]], 10, 'multiShot');
        // Initial Multishot, its generated Piercing Arrow and its separate fork
        // all hit the first target: (10 + 20 + 10) * 2, with no recursive bonus.
        check('Multishot-generated arrows do not multiply the bonus again', near(10000 - monsters[0].hp, 80));

        state.skillRanks = {[bonusNode.id]: 2, shockwaveSlash: 1};
        restore(); shootAbilityArrow([monsters[0]], 10, 'multiShot');
        check('Shockwave triggered by Multishot retains its own scaling', near(10000 - monsters[1].hp, 3.3));

        bonusNode.stats.bleedChance = 1;
        state.skillRanks = {[bonusNode.id]: 2};
        restore(); shootAbilityArrow([monsters[0]], 10, 'multiShot');
        check('Multishot Bleed snapshots the increased hit damage', near(monsters[0].bleed?.baseDamagePerTick, 2));

        elements.detailedStats.open = true; renderDetailedStats();
        const details = elements.detailedStats.querySelector('[data-stat="bowDamage"]');
        check('combat stats show bow damage and separate skill and gear increases', details &&
            details.querySelector('strong').textContent === '4' && details.textContent.includes('Piercing Arrow damage') &&
            [...details.querySelectorAll('dd')].filter(row => row.textContent === '+50%').length === 2);

        state.gear = createEmptyGear(); state.skillRanks = {};
        check('no bow bonuses gives the original damage multiplier', getBowDamageMultiplier() === 1);
        bonusNode.stats = {bowDamageIncrease: -2}; state.skillRanks = {[bonusNode.id]: 1};
        restore(); applyDamageToMonster(monsters[0], 10, 'physical', 'multiShot');
        check('negative bonuses cannot heal enemies', monsters[0].hp === 10000 && getBowDamageMultiplier() === 0);
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    finally { Math.random = originalRandom; }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
