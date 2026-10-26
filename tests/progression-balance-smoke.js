(function () {
    const checks = [];
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const originalRandom = Math.random;
    try {
        check('all rebalanced content validates', WorldContent.validate(worldContent, itemData).length === 0);
        for (const world of worldData) {
            const maps = mapsForWorld(world.id), bossMap = maps.at(-1);
            const boss = monsterDefinitions(bossMap);
            const regular = maps.slice(0, -1).flatMap(map => monsterDefinitions(map));
            check(world.name + ' ends with one boss and a one-kill goal', boss.length === 1 && bossMap.goal === 1);
            check(world.name + ' boss has at least ten times regular monster health', boss[0].health >= Math.max(...regular.map(monster => monster.health)) * 10);
            check(world.name + ' boss hits harder than every regular monster', boss[0].attackDamage >= Math.max(...regular.map(monster => monster.attackDamage)) * 1.5);
            check(world.name + ' regular kill goals increase', maps.slice(1, -1).every((map, index) => map.goal > maps[index].goal));
        }
        const second = mapsForWorld(worldData[1].id);
        check('world two starts above the first world regular enemies', monsterDefinitions(second[0])[0].health > monsterDefinitions(mapsForWorld(worldData[0].id).at(-2))[0].health);
        check('crowded maps retain their mobs without multiplying individual damage', monsterDefinitions(second[8]).length === 21 && monsterDefinitions(second[8])[0].attackDamage < monsterDefinitions(second[7])[0].attackDamage);
        state.developerTravelEnabled = false;
        state.kills = Object.fromEntries(mapData.map(map => [map.id, 0]));
        for (let worldIndex = 0; worldIndex < worldData.length; worldIndex++) {
            const maps = mapsForWorld(worldData[worldIndex].id);
            check('can enter earned world ' + worldData[worldIndex].name, worldIsUnlocked(worldIndex));
            for (let index = 0; index < maps.length; index++) {
                check('earned map is accessible: ' + worldData[worldIndex].name + '/' + maps[index].name, mapTravelAccess(maps[index].id).unlocked);
                if (index + 1 < maps.length) {
                    state.kills[maps[index].id] = maps[index].goal - 1;
                    check('next map stays locked below the new goal', !mapIsUnlocked(maps, index + 1));
                } else if (worldIndex + 1 < worldData.length) {
                    check('next world requires its boss kill', !worldIsUnlocked(worldIndex + 1));
                }
                state.kills[maps[index].id] = maps[index].goal;
            }
        }

        // Sample the actual combat simulation at fixed midpoint builds. These are
        // active-combat estimates: revives are immediate and extra farming, travel
        // and time spent planning/crafting are excluded. No legacy upgrades,
        // developer items or rare equipment drops are equipped. Disable only
        // presentation/persistence and XP gain so each sample measures a fixed build.
        render = renderCombat = saveGame = nudgePlayerHealthBar = flashDodge =
            clearEnemyDamageIndicator = showMonsterProc = showPoisonTransfer =
            showPoisonStackProc = showMonsterHitBadge = flashShockwaveCard =
            flashShockwaveHealthBar = () => {};
        awardExperience = () => 0;
        window.setTimeout = () => 0;
        elements.enemyRoster.replaceChildren();
        const tick = () => simulateCombatStep(gameTickSeconds);
        const readers = {getSkillStat, getSkillMultiplier, getGearStat};
        const memoize = reader => {
            const values = new Map();
            return stat => { if (!values.has(stat)) values.set(stat, reader(stat)); return values.get(stat); };
        };
        const priorities = ['damageNode', 'mightyBlows', 'shockwaveSlash', 'healthNode', 'thickHide', 'untouchable',
            'attackSpeedNode', 'attackSpeedNode2', 'bigAttackSpeed_1', 'bigAttackSpeed_2', 'quickHands', 'fleetFooted',
            'accuracyNode', 'multiHit1', 'multiHit1_copy', 'multiHit1_copy_copy', 'multiHit1_copy_copy_copy',
            'bigAttackSpeed_4', 'bigAttackSpeed_3', 'snakeBite', 'poisonDMG_3', 'poisonDMG_2', 'basicallySnake',
            'snakeBite_2', 'poisonExecute', 'bloomingFlower', 'damageNode2', 'accuracyNode2', 'healthNode2', 'scavenger', 'treasureHunter'].map(SkillStatCompat.resolveNodeId);
        const poisonNodes = new Set(['snakeBite', 'poisonDMG_3', 'poisonDMG_2', 'basicallySnake', 'snakeBite_2', 'poisonExecute', 'bloomingFlower']);
        const levelAt = xp => { let level = 0; while (xp >= experienceForNextLevel(level)) xp -= experienceForNextLevel(level++); return level; };
        function equip(names) {
            state.gear = createEmptyGear(); state.ownedItemIds = [];
            for (const name of names) {
                const item = itemData.items.find(entry => entry.name === name);
                if (!item) throw new Error('Missing balance fixture item: ' + name);
                state.gear[item.slot] = item.id; state.ownedItemIds.push(item.id);
            }
        }
        function measure(map, level, hybrid, worldIndex, mapIndex, singleFight = false) {
            getSkillStat = readers.getSkillStat;
            getSkillMultiplier = readers.getSkillMultiplier;
            getGearStat = readers.getGearStat;
            state.selectedWorld = worldForMap(map.id).id; state.selectedMap = map.id;
            state.currentView = 'town'; state.level = level;
            state.upgrades = {strength: 0, haste: 0, evasion: 0}; state.skillRanks = {};
            for (const id of priorities) {
                if (Object.keys(state.skillRanks).length >= level) break;
                if (!hybrid && poisonNodes.has(id)) continue;
                if (skillNodeIsAvailable(skillNodeById[id])) state.skillRanks[id] = 1;
            }
            const names = [];
            if (worldIndex > 0 || mapIndex >= 1) names.push('Blobhopper Boots');
            if (worldIndex > 0 || mapIndex >= 2) names.push('Slimy Necklace');
            if (worldIndex > 0 || mapIndex >= 3) {
                names.push('TestItem1', 'Wolf Helmet', "John's Coat", 'Woodland Greaves', 'Forest cape');
            }
            if (worldIndex > 0 || mapIndex >= 4) names.push('Wolf necklace');
            if (worldIndex > 0) names.push('Cinderstep Boots');
            if (worldIndex > 0 && mapIndex >= 1) names.push('Shark bow');
            if (worldIndex > 0 && hybrid && mapIndex >= 7) names.push('Wizard Cloak');
            if (worldIndex === 2) names.push('Ice helmet', 'Ice body', 'Ice legs', 'Wizard Cloak', 'Big ass hammer');
            equip(names);
            // Equipment and skill allocation stay fixed during this sample.
            getSkillStat = memoize(readers.getSkillStat);
            getSkillMultiplier = memoize(readers.getSkillMultiplier);
            getGearStat = memoize(readers.getGearStat);
            state.playerHp = getPlayerMaxHealth(); state.combatPaused = false; state.attackTimer = 0;
            resetMonsterStates(map);
            const start = state.kills[map.id]; let deaths = 0, firstKillSeconds = null, deathsBeforeFirstKill = 0;
            for (let step = 0; step < 6000; step++) {
                tick();
                if (firstKillSeconds === null && state.kills[map.id] > start) firstKillSeconds = (step + 1) / 10;
                if (state.combatPaused && firstKillSeconds === null) deathsBeforeFirstKill++;
                if (state.combatPaused) { deaths++; state.playerHp = getPlayerMaxHealth(); state.combatPaused = false; }
                if (singleFight && (firstKillSeconds !== null || deaths)) break;
            }
            const kills = state.kills[map.id] - start;
            if (!singleFight) check('sample can kill enemies on ' + map.name, kills > 0);
            return {seconds: map.goal === 1 ? firstKillSeconds : map.goal * 600 / kills,
                deaths, kills, firstKillSeconds, deathsBeforeFirstKill, damage: getDamage(), interval: getAttackSpeed(), level};
        }
        const forecasts = [];
        for (const hybrid of [true, false]) {
            let xp = 0, totalSeconds = 0, seed = 48271;
            Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
            const rows = [];
            for (let worldIndex = 0; worldIndex < 2; worldIndex++) {
                const maps = mapsForWorld(worldData[worldIndex].id);
                for (let index = 0; index < maps.length; index++) {
                    const map = maps[index], monster = monsterDefinitions(map)[0];
                    const level = levelAt(xp + map.goal * monster.experience / 2);
                    const sample = measure(map, level, hybrid, worldIndex, index);
                    totalSeconds += sample.seconds;
                    rows.push({world: worldIndex + 1, map: map.name, goal: map.goal, hours: +(sample.seconds / 3600).toFixed(2), ...sample});
                    xp += map.goal * monster.experience;
                }
            }
            forecasts.push({build: hybrid ? 'hybrid' : 'physical', hours: totalSeconds / 3600, rows});
        }
        for (const forecast of forecasts) {
            checks.push('FORECAST ' + forecast.build + ': ' + forecast.hours.toFixed(2) + ' active hours through world two');
            for (const row of forecast.rows) checks.push('  World ' + row.world + ', ' + row.map + ': ' + row.hours + 'h (' + row.goal + ' kills, level ' + row.level + ')');
            check(forecast.build + ' forecast finishes world two in 10–20 active hours', forecast.hours >= 10 && forecast.hours <= 20);
            const late = forecast.rows.filter(row => row.world === 2).slice(5, 9);
            check(forecast.build + ' late world two maps take progressively longer', late.every((row, index) => index === 0 || row.seconds > late[index - 1].seconds));
        }
        for (let worldIndex = 0; worldIndex < worldData.length; worldIndex++) {
            const maps = mapsForWorld(worldData[worldIndex].id), map = maps.at(-1);
            const level = worldIndex < 2 ? forecasts[0].rows.find(row => row.world === worldIndex + 1 && row.goal === 1).level : 220;
            let wins = 0;
            for (let trial = 0; trial < 20; trial++) {
                let seed = 7001 + trial * 99991;
                Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
                const fight = measure(map, level, true, worldIndex, maps.length - 1, true);
                if (fight.firstKillSeconds !== null && fight.deathsBeforeFirstKill === 0) wins++;
            }
            check('prepared build beats world ' + (worldIndex + 1) + ' boss without reviving in at least 80% of seeded fights (' + wins + '/20)', wins >= 16);
        }
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    Math.random = originalRandom;
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
