(function () {
    const checks=[],originalRandom=Math.random,originalStats=itemById.testAmulet.stats,map=currentMap();
    const check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const near=(a,b)=>Math.abs(a-b)<1e-6;
    function fresh(ranks={singledOff:1},count=1) {
        combatStatCache=null;combatPoisonForecasts=null;clearFury();state.shieldStacks=0;state.skillRanks={...ranks};pendingSkillRanks={};
        state.level=Object.keys(ranks).length;state.experience=0;state.skillPoints=0;state.upgrades={strength:0,haste:0,evasion:0};
        state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];state.crafted=[];itemById.testAmulet.stats={damage:98};
        state.kills=Object.fromEntries(mapData.map(entry=>[entry.id,0]));state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,0]));
        state.gold=0;state.lootLog=[];state.lastLoot=null;state.tutorials=createTutorialState();
        state.selectedMap=map.id;state.selectedWorld=worldForMap(map.id).id;state.currentView='map';state.isInTown=false;
        state.playerHp=100;state.combatPaused=false;state.attackTimer=0;
        map.drops=[];map.itemDrops=[];map.spawns=[{id:'isolationMob',monsterId:worldContent.monsters[0].id,count,overrides:{health:1000,attackDamage:0,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:2,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);state.monsterColumns=2;resetCombatClock();clearOfflineRecap();Math.random=()=>0;
        return state.monsterStates;
    }
    try {
        check('Singled Off is a unique effect without the placeholder flat damage bonus',Object.keys(skillNodeById.singledOff.stats).length===0&&SkillDescriptions.usesCustomDescription(skillNodeById.singledOff));
        let [a]=fresh({});applyDamageToMonster(a,100);
        check('unallocated Singled Off grants no bonus against a lone enemy',a.hp===900);
        for(const [type,ability] of [['physical',null],['physical','multiShot'],['physical','volcanicEruption'],['physical','shieldSlam'],['poison',null],['bleed',null],['dot','righteousFire']]) {
            [a]=fresh();applyDamageToMonster(a,100,type,ability);
            check(type+' '+(ability||'damage')+' deals 30% more to the last living enemy',a.hp===870&&getDamageBreakdown().total===130);
        }
        let b;[a,b]=fresh({singledOff:1},2);state.monsterColumns=1;
        applyDamageToMonster(a,100);check('two living enemies disable the bonus regardless of grid placement',a.hp===900);
        b.hp=10;applyDamageToMonster(b,10);applyDamageToMonster(a,100);
        check('a kill enables the bonus immediately while its plate awaits respawn',a.hp===770&&b.hp===0&&b.respawnRemaining>0);
        b.respawnRemaining=.1;simulateCombatStep(.1);applyDamageToMonster(a,100);
        check('respawning another enemy disables the bonus immediately',b.hp===1000&&a.hp===670);
        [a,b]=fresh({singledOff:1},2);
        a.poisonStacks=[{remainingDuration:5,timeUntilTick:1}];
        a.bleed={stacks:1,baseDamagePerTick:10,remainingDuration:5,timeUntilTick:1};
        combatPoisonForecasts=new WeakMap();combatStatCache=new Map();
        check('DOT forecasts are normal with multiple living enemies',getRemainingPoisonDamage(a)===5&&getRemainingBleedDamage(a)===50);
        b.hp=0;b.respawnRemaining=2;
        check('cached forecasts reflect isolation without rebuilding stacks or stat caches',near(getRemainingPoisonDamage(a),6.5)&&getRemainingBleedDamage(a)===65);
        b.hp=1000;
        check('cached forecasts immediately lose the bonus when an enemy returns',getRemainingPoisonDamage(a)===5&&getRemainingBleedDamage(a)===50);
        [a]=fresh();itemById.testAmulet.stats.poisonChance=1;tryApplyPoison(a);tickMonsterPoison(a,1);
        check('Poison ticks receive the bonus once',near(a.hp,998.7));
        [a]=fresh();itemById.testAmulet.stats.bleedChance=1;state.attackTimer=getAttackSpeed();simulateCombatStep(.1);
        check('a direct attack boosts its hit while keeping the Bleed base free of target modifiers',a.hp===870&&a.bleed?.baseDamagePerTick===10&&getRemainingBleedDamage(a)===13);
        tickMonsterBleed(a,1);check('Bleed from a direct attack receives the bonus once',a.hp===857);
        [a]=fresh();itemById.testAmulet.stats.bleedChance=1;shootAbilityArrow([a],100,'multiShot');tickMonsterBleed(a,1);
        check('single-target ability Bleed matches direct-attack Bleed without double dipping',a.hp===857&&damageBreakdownMeter.sources.get('multiShot')===130&&damageBreakdownMeter.sources.get('bleed')===13);
        [a]=fresh({singledOff:1,righteousFire:1});itemById.testAmulet.stats.healthRegen=50;state.playerHp=30;tickPlayerRegeneration(1);
        check('Fire of the Righteous gains damage without increasing its drain or healing',a.hp===948&&state.playerHp===30);
        [a]=fresh({singledOff:1,shieldGenerator:1,shieldSlam:1});state.shieldStacks=10;tryShieldSlam();
        check('Shield Slam receives the bonus on its actual damage',a.hp===350&&state.shieldStacks===5);
        [a,b]=fresh({singledOff:1,shieldGenerator:1,shieldSlam:1,overflowingSlam:1},2);a.hp=100;state.shieldStacks=10;tryShieldSlam();
        check('overflowing damage gains the bonus only after the first kill isolates the survivor',a.hp===0&&b.hp===480&&damageBreakdownMeter.sources.get('shieldSlam')===100&&damageBreakdownMeter.sources.get('overflowingSlam')===520);
        [a]=fresh({singledOff:1,poisonExecute:1});a.hp=6;a.poisonStacks=[{remainingDuration:5,timeUntilTick:1}];
        check('Poison Execute uses the boosted forecast and credits only actual remaining health',tryExecutePoison(a)&&a.hp===0&&damageBreakdownMeter.sources.get('poisonExecute')===6);
        [a,b]=fresh({singledOff:1,poisonExecute:1},2);a.hp=6;a.poisonStacks=[{remainingDuration:5,timeUntilTick:1}];
        check('Poison Execute does not use an isolation bonus with another living enemy',!tryExecutePoison(a)&&a.hp===6);
        [a]=fresh();a.hp=1;applyDamageToMonster(a,100);applyDamageToMonster(a,100);
        check('overkill and duplicate corpse hits cannot inflate damage or kill rewards',getDamageBreakdown().total===1&&state.kills[map.id]===1);
        function run(effects) {
            fresh({singledOff:1,multiShot:1,shockwaveSlash:1},3);itemById.testAmulet.stats={damage:98,poisonChance:1,bleedChance:1,attackSpeedMultiplier:3};
            let seed=7433;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            const observer=new MutationObserver(()=>{});observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
            for(let index=0;index<600;index++)simulateCombatStep(.1,effects);
            check('simulation remains free of DOM changes',observer.takeRecords().length===0);observer.disconnect();
            return JSON.stringify({monsters:state.monsterStates,kills:state.kills,gold:state.gold,hp:state.playerHp,meter:getDamageBreakdown()});
        }
        check('foreground and offline simulations produce identical combat and damage shares',run(true)===run(false));
        check('no runtime errors: '+window.smokeErrors.join('; '),!window.smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    finally{Math.random=originalRandom;itemById.testAmulet.stats=originalStats;combatStatCache=null;combatPoisonForecasts=null;resetCombatClock();clearOfflineRecap();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
