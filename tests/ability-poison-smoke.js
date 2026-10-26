// Direct attacks and abilities may apply Poison; damage over time may not.
(function () {
    const checks = [], originalRandom = Math.random, originalStats = itemById.testAmulet.stats;
    const map = currentMap();
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    function fresh(ranks = {}, count = 9) {
        combatStatCache = null; combatPoisonForecasts = null; clearFury();
        state.skillRanks = {...ranks}; pendingSkillRanks = {}; state.shieldStacks = 0; state.voidCharges = 0;
        state.level = 100; state.skillPoints = 0; state.experience = 0;
        state.upgrades = {strength:0,haste:0,evasion:0};
        state.gear = createEmptyGear(); state.gear.necklace = 'testAmulet'; state.ownedItemIds = ['testAmulet']; state.crafted = [];
        itemById.testAmulet.stats = {poisonChance:1,mana:100,spellDamage:10};
        state.kills = Object.fromEntries(mapData.map(entry => [entry.id,0]));
        state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id,0]));
        state.gold = 0; state.lootLog = []; state.lastLoot = null; state.tutorials = createTutorialState();
        state.selectedMap = map.id; state.selectedWorld = worldForMap(map.id).id; state.currentView = 'map'; state.isInTown = false;
        state.playerHp = 100; state.combatPaused = false; state.attackTimer = 0;
        map.drops = []; map.itemDrops = [];
        map.spawns = [{id:'poisonAbilityMob',monsterId:worldContent.monsters[0].id,count,overrides:{health:1000,attackDamage:0,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:2,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map); state.monsterColumns = 3;
        state.manaCapacity = getPlayerMaxMana(); state.playerMana = state.manaCapacity;
        resetCombatClock(); clearOfflineRecap(); Math.random = () => .5;
        return state.monsterStates;
    }
    const stacks = monster => monster.poisonStacks.length;
    try {
        for (const [id,type] of [['multiShot','physical'],['shockwaveSlash','physical'],['voidBolt','spell'],['voidVolley','spell']]) {
            const [target] = fresh();
            applyDamageToMonster(target,10,type,id);
            check(id + ' applies exactly one Poison stack per direct hit',target.hp === 990 && stacks(target) === 1);
        }
        let mobs = fresh();
        shootAbilityArrow([mobs[0]],10,'multiShot');
        check('Multishot does not roll Poison twice after centralizing ability hits',stacks(mobs[0]) === 1);
        mobs = fresh();
        shootAbilityArrow(mobs.slice(0,3),10,'piercingArrow');
        check('Piercing Arrow applies one stack to each enemy it hits',mobs.slice(0,3).every(m => stacks(m) === 1) && mobs.slice(3).every(m => stacks(m) === 0));
        mobs = fresh({forkingArrow:1});
        shootAbilityArrow([mobs[0]],10,'forkingArrow');
        check('every landed fork applies one stack without double applications',mobs.filter(m => m.hp < 1000).length > 1 && mobs.every(m => stacks(m) === (m.hp < 1000 ? 1 : 0)));
        mobs = fresh({shockwaveSlash:1}); Math.random = () => 0;
        triggerShockwaveSlash(mobs[0],30);
        check('Shockwave applies one stack per splash target',stacks(mobs[0]) === 0 && mobs.slice(1).every(m => stacks(m) === 1));
        mobs = fresh({volcanicEruption:1});
        triggerVolcanicEruption(mobs[4],10);
        check('Eruption applies Poison once to its center and cardinal splash targets',mobs.every((m,index) => stacks(m) === ([1,3,4,5,7].includes(index) ? 1 : 0)));
        mobs = fresh({shieldGenerator:1,shieldSlam:1}); state.shieldStacks = 10; tryShieldSlam();
        check('Shield Slam applies one Poison stack',stacks(mobs[0]) === 1 && mobs.slice(1).every(m => stacks(m) === 0));
        mobs = fresh({shieldGenerator:1,shieldSlam:1,overflowingSlam:1}); mobs[0].hp = 1; state.shieldStacks = 10; tryShieldSlam();
        check('overflow applies one stack to the surviving target and none to the slain target',mobs[0].hp === 0 && stacks(mobs[0]) === 0 && stacks(mobs[1]) === 1);
        mobs = fresh({voidBolt:1}); itemById.testAmulet.stats.multiHit = 2; castVoidBolt();
        check('Void Bolt multihits each roll Poison independently',mobs.slice(0,3).every(m => stacks(m) === 1) && mobs.slice(3).every(m => stacks(m) === 0));
        mobs = fresh({voidBolt:1,voidVolley:1},1); state.voidCharges = 5; castVoidVolley();
        tickPendingVoidMissiles(10);
        check('all ten Volley missiles can apply Poison to one surviving target',mobs[0].hp === 900 && stacks(mobs[0]) === 10);
        mobs = fresh({voidBolt:1,voidVolley:1},1); state.voidCharges = 4; castVoidBolt();
        tickPendingVoidMissiles(10);
        check('a Bolt-triggered Volley applies one stack per Bolt or missile hit',mobs[0].hp === 890 && stacks(mobs[0]) === 11);
        mobs = fresh(); itemById.testAmulet.stats.multiHit = 2; state.attackTimer = 1.2; simulateCombatStep(.1);
        check('basic attacks and multihits still apply one stack each',mobs.slice(0,3).every(m => stacks(m) === 1) && mobs.slice(3).every(m => stacks(m) === 0));

        mobs = fresh(); itemById.testAmulet.stats.poisonChance = .25;
        let rolls = 0; Math.random = () => { rolls++; return .25; };
        applyDamageToMonster(mobs[0],1,'spell','voidBolt');
        check('failed chance rolls do not apply Poison',rolls === 1 && stacks(mobs[0]) === 0);
        Math.random = () => { rolls++; return .249; };
        applyDamageToMonster(mobs[0],1,'spell','voidVolley');
        check('AOE hits use the configured Poison chance exactly once',rolls === 2 && stacks(mobs[0]) === 1);
        mobs = fresh(); itemById.testAmulet.stats.poisonChance = 0;
        Math.random = () => { throw new Error('Zero chance or DOT attempted a Poison roll'); };
        applyDamageToMonster(mobs[0],1,'spell','voidBolt');
        check('zero Poison chance cannot add stacks',stacks(mobs[0]) === 0);
        mobs = fresh(); Math.random = () => { throw new Error('DOT attempted a Poison roll'); };
        for (const [type,id] of [['poison','voidBolt'],['bleed','multiShot'],['dot','righteousFire'],['dot','voidVolley']]) applyDamageToMonster(mobs[0],1,type,id);
        check('Poison, Bleed and burning DOT cannot apply Poison regardless of targeting tag',mobs[0].hp === 996 && stacks(mobs[0]) === 0);
        for (const damage of [0,-1,NaN,Infinity]) applyDamageToMonster(mobs[0],damage,'spell','voidBolt');
        check('invalid or zero damage cannot apply Poison',stacks(mobs[0]) === 0);
        mobs = fresh(); Math.random = () => .999; shootAbilityArrow([mobs[0]],10,'multiShot');
        check('missed ability attacks never apply Poison',mobs[0].hp === 1000 && stacks(mobs[0]) === 0);

        mobs = fresh({poisonExecute:1,bloomingFlower:1},2); mobs[0].hp = 6;
        const killed = applyDamageToMonster(mobs[0],1,'spell','voidBolt');
        check('a newly applied spell Poison stack can execute and spread',killed && mobs[0].hp === 0 && stacks(mobs[0]) === 0 && stacks(mobs[1]) === 1);
        applyDamageToMonster(mobs[0],1,'spell','voidVolley');
        check('dead targets cannot grant duplicate kills or poison applications',state.kills[map.id] === 1 && stacks(mobs[1]) === 1);
        mobs = fresh(); applyDamageToMonster(mobs[0],1000,'spell','voidBolt');
        check('lethal direct damage does not poison a corpse',mobs[0].hp === 0 && stacks(mobs[0]) === 0);

        function run(effects) {
            fresh({voidBolt:1,voidVolley:1,shockwaveSlash:1},9);
            itemById.testAmulet.stats = {poisonChance:.5,mana:100,spellDamage:10,manaRegen:20,multiHit:1,healthRegen:10};
            let seed = 4356; Math.random = () => { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed / 4294967296; };
            for (let step = 0; step < 300; step++) simulateCombatStep(.1,effects);
            return JSON.stringify({monsters:state.monsterStates,kills:state.kills,gold:state.gold,mana:state.playerMana,charges:state.voidCharges,missiles:state.pendingVoidMissiles,hp:state.playerHp});
        }
        check('ability Poison has identical foreground and offline outcomes',run(true) === run(false));
        check('no runtime errors: ' + window.smokeErrors.join('; '),!window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    finally { Math.random = originalRandom; itemById.testAmulet.stats = originalStats; combatStatCache = null; combatPoisonForecasts = null; resetCombatClock(); clearOfflineRecap(); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
