// Real combat at the minimum level earned by reaching each map. ?baseline
// reports existing problems without requiring successful survival.
(function () {
    const checks = [], rows = [], baseline = new URL(document.currentScript.src).searchParams.has('baseline');
    const originalRandom = Math.random, round = value => Math.round(value * 100) / 100;
    const check = (name, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) throw new Error(name); };
    const readBuild = name => {
        const request = new XMLHttpRequest(); request.open('GET', 'builds/' + name + '.json', false); request.send();
        return JSON.parse(request.responseText).allocationOrder;
    };
    function recoveryOrder() {
        const order = [], ranks = {}, root = skillNodes.find(node => node.start).id;
        const excluded = new Set(['shieldGenerator', 'shieldSlam', 'resonantGuard', 'overflowingSlam', 'freezingArrows', 'righteousFire', 'volcanicEruption']);
        const add = target => {
            const queue = [[root], ...order.map(id => [id])], seen = new Set(queue.flat());
            for (let index = 0; index < queue.length; index++) {
                const path = queue[index], last = path.at(-1);
                if (last === target) {
                    for (const id of path) if (id !== root && !ranks[id] && order.length < 60) { order.push(id); ranks[id] = 1; }
                    return;
                }
                for (const id of skillNodeConnections[last]) if (!seen.has(id) && !excluded.has(id)) { seen.add(id); queue.push([...path, id]); }
            }
        };
        ['healthNode', 'healthNode2', 'thickHide', 'untouchable', 'evasiveVitality', 'healthRegeneration2',
            'damageNode', 'mightyBlows', 'heavyBlows', 'maxFury', 'maxFury2', 'attackSpeedNode', 'attackSpeedNode2',
            'quickHands', 'accuracyNode', 'multiHit1', 'shockwaveSlash', 'multiShot', 'piercingArrow', 'gatheringPower',
            'damageBoost', 'forkingArrow'].forEach(add);
        skillNodes.filter(node => !node.start && !excluded.has(node.id) &&
            Object.keys(node.stats).some(key => /^(damage|accuracy|attackSpeed|multiHit)/.test(key))).forEach(node => add(node.id));
        return order;
    }
    function gearFor(worldIndex, mapIndex) {
        const names = [];
        if (worldIndex || mapIndex >= 1) names.push('Blobhopper Boots');
        if (worldIndex || mapIndex >= 2) names.push('Slimy Necklace');
        if (worldIndex || mapIndex >= 3) names.push('Long spear');
        if (worldIndex || mapIndex >= 4) names.push('TestItem1', 'Wolf Helmet', "John's Coat", 'Woodland Greaves', 'Forest cape');
        if (worldIndex || mapIndex >= 5) names.push('Wolf necklace');
        if (worldIndex) names.push('Cinderstep Boots');
        if (worldIndex > 1 || worldIndex === 1 && mapIndex >= 1) names.push('Shark bow');
        if (worldIndex > 1 || worldIndex === 1 && mapIndex >= 5) names.push('Ice helmet');
        if (worldIndex > 1 || worldIndex === 1 && mapIndex >= 7) names.push('Ice body', 'Ice legs');
        if (worldIndex > 1 || worldIndex === 1 && mapIndex >= 8) names.push('Wizard Cloak');
        // Established gear only: World 3's new armor has no stats yet.
        state.gear = createEmptyGear(); state.ownedItemIds = [];
        for (const name of names) {
            const item = itemData.items.find(entry => entry.name === name && !entry.developerOnly);
            if (!item) throw new Error('Missing progression equipment: ' + name);
            state.gear[item.slot] = item.id; state.ownedItemIds.push(item.id);
        }
    }
    function measure(map, worldIndex, mapIndex, level, order, seed, columns) {
        let roll = seed;
        Math.random = () => { roll = (Math.imul(roll, 1664525) + 1013904223) >>> 0; return roll / 4294967296; };
        combatStatCache = null;
        const ranks = Object.fromEntries(order.slice(0, Math.min(level, 60)).map(id => [id, 1]));
        SkillBuilds.validate({format: 'copers-skill-build', version: 1, skillRanks: ranks});
        state.skillRanks = ranks; state.level = level; state.skillPoints = level - Object.keys(ranks).length; state.experience = 0;
        state.upgrades = {strength: 0, haste: 0, evasion: 0}; state.developerItemsEnabled = false;
        state.kills = Object.fromEntries(mapData.map(entry => [entry.id, 0]));
        state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id, 0]));
        state.crafted = []; state.gold = 0; state.lootLog = []; state.lastLoot = null; state.tutorials = createTutorialState();
        state.selectedWorld = worldForMap(map.id).id; state.selectedMap = map.id; state.currentView = 'map'; state.isInTown = false;
        gearFor(worldIndex, mapIndex);
        resetMonsterStates(map); state.monsterColumns = columns;
        state.playerHp = getPlayerMaxHealth(); state.playerMana = getPlayerMaxMana(); state.manaCapacity = getPlayerMaxMana();
        state.attackTimer = 0; state.combatPaused = false; resetDamageBreakdown(map.id);
        const health = getPlayerMaxHealth(), definitions = monsterDefinitions(map);
        const rawBurst = definitions.reduce((sum, monster) => sum + monster.attackDamage, 0);
        const expectedIncoming = state.monsterStates.reduce((sum, monster) => sum + monsterDefinition(monster).attackDamage * getEnemyHitChance(monster) / 100 / monsterDefinition(monster).attackInterval, 0);
        const stats = {health, regen: round(getPlayerHealthRegen()), evasion: getPlayerEvasion(), points: Object.keys(ranks).length,
            expectedIncoming: round(expectedIncoming), rawBurstPercent: round(rawBurst / health * 100)};
        let minimumHp = 1, firstKill = null, seconds = 0;
        for (let step = 0; step < (map.goal === 1 ? 6000 : 1800); step++) {
            simulateCombatStep(.1, false); seconds = (step + 1) / 10;
            minimumHp = Math.min(minimumHp, state.playerHp / health);
            if (firstKill === null && state.kills[map.id]) firstKill = seconds;
            if (state.combatPaused || state.kills[map.id] >= map.goal) break;
        }
        return {seed, columns, ...stats, died: state.combatPaused, seconds, kills: state.kills[map.id], firstKill,
            minimumHp: round(minimumHp * 100), endHp: round(state.playerHp / health * 100)};
    }
    try {
        check('world content validates', WorldContent.validate(worldContent, itemData).length === 0);
        awardExperience = () => 0; // Hold the entry build fixed throughout each sample.
        const recovery = recoveryOrder();
        check('recovery allocation needs no shields, freezing or self-damage',
            ['shieldGenerator', 'resonantGuard', 'freezingArrows', 'glacialRupture', 'volcanicEruption', 'righteousFire'].every(id => !recovery.includes(id)));
        const styles = [{name: 'Vanguard', order: readBuild('shielded-vanguard-60')},
            {name: 'Elemental', order: readBuild('elemental-warden-60')},
            {name: 'Recovery without shields or freeze', order: recovery},
            {name: '30-point recovery', points: 30, order: recovery.slice(0, 30)}];
        for (const style of styles) {
            check(style.name + ' has its expected point budget', style.order.length === (style.points || 60));
            SkillBuilds.validate({format: 'copers-skill-build', version: 1, skillRanks: Object.fromEntries(style.order.map(id => [id, 1]))});
        }
        let xp = 0;
        for (const [worldIndex, world] of worldData.entries()) {
            const maps = mapsForWorld(world.id);
            if (!baseline) {
                check(world.name + ' ends with one boss', monsterDefinitions(maps.at(-1)).length === 1 && maps.at(-1).goal === 1);
                check(world.name + ' has increasing regular map goals', maps.slice(1, -1).every((map, index) => map.goal > maps[index].goal));
                const regular = maps.slice(0, -1).map(map => monsterDefinitions(map));
                const boss = monsterDefinitions(maps.at(-1))[0];
                check(world.name + ' regular health increases gradually', regular.slice(1).every((pack, index) => pack[0].health > regular[index][0].health));
                check(world.name + ' packs have at most nine attackers', regular.every(pack => pack.length <= 9));
                check(world.name + ' boss has at least ten times regular health', boss.health >= Math.max(...regular.flat().map(monster => monster.health)) * 10);
                check(world.name + ' boss has a stronger individual hit', boss.attackDamage >= Math.max(...regular.flat().map(monster => monster.attackDamage)) * 1.5);
            }
            for (const [mapIndex, map] of maps.entries()) {
                let remainingXp = xp, level = 0;
                while (remainingXp >= experienceForNextLevel(level)) remainingXp -= experienceForNextLevel(level++);
                const definitions = monsterDefinitions(map), boss = mapIndex === maps.length - 1;
                for (const style of styles) {
                    const trials = [48271, 98765, 654321].map((seed, i) => measure(map, worldIndex, mapIndex, level, style.order, seed, i === 2 ? 1 : 3));
                    rows.push({world: worldIndex + 1, mapId: map.id, map: map.name, build: style.name, level, boss,
                        count: definitions.length, monsterHealth: definitions[0].health, monsterDamage: definitions[0].attackDamage,
                        attackInterval: definitions[0].attackInterval, trials});
                    if (!baseline) {
                        check(style.name + ' survives ' + world.name + '/' + map.name, trials.every(trial => !trial.died));
                        check(style.name + ' can defeat enemies on ' + world.name + '/' + map.name, trials.every(trial => trial.firstKill !== null));
                        if (!boss) check(style.name + ' retains a safe HP margin on ' + world.name + '/' + map.name, trials.every(trial => trial.minimumHp >= 50));
                    }
                }
                xp += map.goal * Math.min(...definitions.map(monster => monster.experience));
            }
        }
        check('no runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    finally { Math.random = originalRandom; combatStatCache = null; }
    const report = document.createElement('pre'); report.id = 'smoke-results';
    report.textContent = JSON.stringify({method: 'Three entry-level seeded trials per map/build, including single-column formation; 180s regular maps or 600s bosses, capped at map goal; full HP, empty combat buffs, staged gear, at most 30 or 60 points, no crafted stats, legacy upgrades or developer items.', rows, checks});
    document.body.append(report);
}());
