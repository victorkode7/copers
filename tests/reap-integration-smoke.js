(async function () {
    const checks = [], originalRandom = Math.random;
    const check = (name, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) throw new Error(name); };
    const clone = value => JSON.parse(JSON.stringify(value));
    try {
        await document.fonts.ready;
        Math.random = () => 0;
        clearOfflineRecap();
        const map = currentMap();
        const fresh = () => {
            state.skillRanks = {reapPreview:1,reapingEcho:1,voidBolt:1,piercingArrow:1};
            state.level = 4; state.skillPoints = 0; state.experience = 0; state.experienceRemainder = 0;
            state.gear = createEmptyGear(); state.gear.necklace = 'testAmulet'; state.ownedItemIds = ['testAmulet'];
            itemById.testAmulet.stats = {damage:20,spellDamage:10,mana:100};
            state.upgrades = {strength:0,haste:0,evasion:0};
            state.currentView = 'map'; state.isInTown = false; combatStatCache = null; invalidateSkillBonusCache();
            map.spawns = [{id:'reapIntegration',monsterId:worldContent.monsters[0].id,count:9,
                overrides:{health:1000,attackDamage:0,attackInterval:1000,evasion:0,respawnSeconds:100,
                    gold:[0,0],experience:0,drops:[],itemDrops:[]}}];
            resetMonsterStates(map); state.monsterColumns = 3; state.targetMonsterId = state.monsterStates[4].id;
            state.playerHp = getPlayerMaxHealth(); state.playerMana = 100; state.manaCapacity = 100;
            state.voidCharges = 0; state.combatPaused = false; state.attackTimer = 0;
            return state.monsterStates;
        };
        fresh(); state.attackTimer = getAttackSpeed() - 0.1;
        const launch = simulateCombatStep(0.1, true);
        check('Reap replaces a due basic attack with one delayed swing', state.pendingReapAttacks.length === 1 && state.monsterStates.every(monster => monster.hp === 1000));
        check('Reap emits serializable presentation records', launch.effects.some(event => event.type === 'reapStarted') && launch.effects.every(event => typeof event === 'object') && Boolean(JSON.stringify(launch.effects)));
        const saved = createGameSave(), legacy = clone(saved); delete legacy.pendingReapAttacks;
        check('older saves default to an empty Reap queue', parseGameSave(JSON.stringify(legacy)).pendingReapAttacks.length === 0);
        for (const invalid of [null, {}, [{...saved.pendingReapAttacks[0],remaining:0}],
            [{...saved.pendingReapAttacks[0],remaining:1}], [{...saved.pendingReapAttacks[0],mapId:'missingMap'}],
            [{...saved.pendingReapAttacks[0],targetIds:['x','x']}],
            [{...saved.pendingReapAttacks[0],targetIds:['a','b','c','d','e']}]]) {
            const malformed = clone(saved); malformed.pendingReapAttacks = invalid;
            let rejected = false; try { parseGameSave(JSON.stringify(malformed)); } catch { rejected = true; }
            check('malformed or oversized pending Reap data is rejected', rejected);
        }
        let monsters = fresh(); const origin = monsters[4]; origin.hp = 0; origin.respawnRemaining = 100;
        queueReapAttack(origin.id, {fromKill:true});
        simulateCombatStep(0.1, false); simulateCombatStep(0.1, false);
        check('echoes damage living neighbors of the corpse', monsters.some(monster => monster !== origin && monster.hp < 1000));
        check('echoes do not spend mana or generate attack-only Void casts', state.playerMana === 100 && state.voidCharges === 0);
        monsters = fresh(); queueReapAttack(monsters[4].id); state.playerHp = 0; state.combatPaused = true;
        simulateCombatStep(0.1, false); simulateCombatStep(0.1, false);
        check('a dead player cannot resolve a pending Reap hit', monsters.every(monster => monster.hp === 1000) && state.pendingReapAttacks.length === 0);
        check('no browser errors', !smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    finally { Math.random = originalRandom; }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
