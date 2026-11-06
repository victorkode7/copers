(function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const originalRandom=Math.random,originalStats=itemById.testAmulet.stats;
    const clone=value=>JSON.parse(JSON.stringify(value)),base=clone(state),map=currentMap();
    // Captured against commit 9ffc0a7 before extracting the combat loop.
    const expected={
        basic:{state:'7e3f831f',rolls:363,events:336,eventOrder:'4368ee6',render:'1a26b0d5'},
        freezing:{state:'394cb367',rolls:376,events:288,eventOrder:'2984e683',render:'5d35dffb'},
        spells:{state:'455c1a87',rolls:664,events:1151,eventOrder:'b4b6e8cb',render:'86433b07'},
        allSkills:{state:'623c6ddd',rolls:1182,events:784,eventOrder:'28f7d679',render:'d3de2f4d'},
        paused:{state:'58bfa643',rolls:13,events:28,eventOrder:'6a2348b5',render:'bf1c9ad1'},
        respawns:{state:'d22d3b9',rolls:213,events:194,eventOrder:'be61e096',render:'c2beda9e'}
    };
    const cases=[
        {name:'basic',seed:9387,steps:250,ranks:{},health:80},
        {name:'freezing',seed:42,steps:250,ranks:{freezingArrows:1,multiShot:1,piercingArrow:1,forkingArrow:1},health:300},
        {name:'spells',seed:193,steps:350,ranks:{voidBolt:1,voidVolley:1,voidVortex:1,echoingVoid:1,rimeBrand:1,emberBrand:1,glacialRupture:1,cinderRupture:1,bloomingFlower:1},health:300},
        {name:'allSkills',seed:104729,steps:300,ranks:Object.fromEntries(skillNodes.filter(node=>!node.start&&node.maxRank>0).map(node=>[node.id,node.maxRank])),health:1000},
        {name:'paused',seed:937,steps:150,ranks:{rimeBrand:1,emberBrand:1,glacialRupture:1,cinderRupture:1,bloomingFlower:1},health:100},
        {name:'respawns',seed:873,steps:150,ranks:{},health:30}
    ];
    function hash(value,result=2166136261){for(const char of value)result=Math.imul(result^char.charCodeAt(0),16777619);return result>>>0;}
    function prepare(scenario){
        Object.assign(state,clone(base));combatStatCache=null;clearOfflineRecap();resetDamageBreakdown(map.id);
        state.currentView='map';state.isInTown=false;state.skillRanks={...scenario.ranks};state.level=Object.values(state.skillRanks).reduce((sum,rank)=>sum+rank,1);
        state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];state.upgrades={strength:0,haste:0,evasion:0};
        itemById.testAmulet.stats={damage:12,health:500,mana:150,manaRegen:15,spellDamage:12,...(scenario.name==='allSkills'?{health:10000,healthRegen:100000,multiHit:2}:{})};
        map.drops=[{id:'gel',chance:.4,amount:[1,3]}];map.itemDrops=[{id:'testDropHelm',chance:.3}];
        map.spawns=[{id:'simulationMob',monsterId:worldContent.monsters[0].id,count:9,overrides:{health:scenario.health,attackDamage:1,attackInterval:.7,accuracy:70,evasion:20,respawnSeconds:.5,gold:[1,3],experience:2,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);state.playerHp=getPlayerMaxHealth();state.combatPaused=false;state.manaCapacity=getPlayerMaxMana();state.playerMana=state.manaCapacity;state.attackTimer=0;
        render();state.monsterColumns=3;
        if(scenario.name==='freezing'){state.monsterStates[0].freezeRemaining=.15;state.monsterStates[1].freezeRemaining=.05;}
        if(scenario.name==='paused'){
            state.playerHp=0;state.combatPaused=true;state.monsterStates[0].hp=4;state.monsterStates[0].poisonStacks=[{remainingDuration:3,timeUntilTick:.1}];
            state.monsterStates[1].rimeBrand={stacks:9,timeUntilTick:.1,remainingDuration:2};state.monsterStates[1].emberBrand={stacks:9,timeUntilTick:.1,remainingDuration:2};
            state.pendingEruptions=[{targetId:state.monsterStates[0].id,damage:5,chainsRemaining:1,remaining:.1}];
            state.pendingVoidMissiles=[{targetId:state.monsterStates[2].id,damage:5,remaining:.1}];
        }
        if(scenario.name==='respawns'){state.monsterStates.forEach((monster,index)=>{monster.hp=0;monster.respawnRemaining=(index+1)*.1;});state.attackTimer=9;}
        syncLegacyEnemyState();
    }
    function run(scenario,visuals){
        prepare(scenario);let seed=scenario.seed,rolls=0,eventHash=2166136261,renderHash=2166136261,events=0;
        const missileIds=new Map();Math.random=()=>{rolls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        for(let index=0;index<scenario.steps;index++){
            const result=simulateCombatStep(.1,visuals);events+=result.effects.length;
            if(!visuals&&result.effects.length)throw new Error('Offline simulation retained events');
            if(result.effects.some(event=>typeof event!=='object'))throw new Error('Combat returned a presentation callback');
            const serialized=JSON.stringify(result.effects,(key,value)=>{
                if(key==='epoch')return 0;
                if(key==='missileId'&&value!==undefined){if(!missileIds.has(value))missileIds.set(value,missileIds.size);return missileIds.get(value);}
                return value;
            });
            eventHash=hash(serialized,eventHash);renderHash=hash(String(result.needsRender),renderHash);
            pruneVoidMissilePresentations();
        }
        return{state:hash(JSON.stringify({state,damage:getDamageBreakdown()})).toString(16),rolls,events,eventOrder:eventHash.toString(16),render:renderHash.toString(16)};
    }
    try{
        for(const scenario of cases){
            const live=run(scenario,true),offline=run(scenario,false);
            check(scenario.name+' live/offline state, random rolls and render decisions match',live.state===offline.state&&live.rolls===offline.rolls&&live.render===offline.render&&offline.events===0);
            check(scenario.name+' matches the committed combat state, RNG and ordered event baseline',JSON.stringify(live)===JSON.stringify(expected[scenario.name]));
        }
        const originalContext={effects:combatEffects,simulation:simulatingCombat,forecasts:combatPoisonForecasts};
        const originalTick=tickFury;
        try{
            tickFury=()=>{throw new Error('expected rule failure');};let thrown=false;
            try{simulateCombatStep(.1,true);}catch(error){thrown=error.message==='expected rule failure';}
            check('a failing rule restores event collection, simulation and poison forecast context',thrown&&combatEffects===originalContext.effects&&simulatingCombat===originalContext.simulation&&combatPoisonForecasts===originalContext.forecasts);
        }finally{tickFury=originalTick;}
        check('no browser script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push(error.stack||String(error));}
    finally{Math.random=originalRandom;itemById.testAmulet.stats=originalStats;}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
