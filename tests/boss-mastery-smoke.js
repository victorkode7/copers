(async function(){
    const checks=[],check=(name,ok)=>{checks.push((ok?'PASS ':'FAIL ')+name);if(!ok)throw new Error(name);};
    const originalRandom=Math.random,originalStats=itemById.testAmulet.stats;
    try{
        await document.fonts.ready;state.combatPaused=true;resetCombatClock();
        state.townProgress=TownProgression.defaults();state.townProgress.buildings.menagerie={tier:1,level:10};
        state.mapMastery={};state.kills=Object.fromEntries(mapData.map(map=>[map.id,0]));
        const regular=mapData.find(map=>map.id===worldData[0].mapIds[0]);
        const boss=mapData.find(map=>map.id===worldData[0].mapIds.at(-1));
        boss.goal=10;
        worldContent.maps.find(map=>map.id===boss.id).goal=10;
        const progress=(kills,earned=0)=>MasterySystem.milestone(boss,kills,earned,worldContent);
        check('boss milestones begin at twice the map goal and still award two points',progress(19).earned===0&&progress(19).next===20&&progress(20).earned===2&&progress(20).next===200);
        check('later boss milestones keep tenfold spacing at fivefold lower thresholds',progress(199).earned===2&&progress(200).earned===4&&progress(2000).earned===6&&progress(2000).next===20000);
        check('regular mastery thresholds retain the previous curve',MasterySystem.milestone({...regular,goal:10},99,0,worldContent).earned===0&&MasterySystem.milestone({...regular,goal:10},100,0,worldContent).earned===2);
        for(const world of worldData.slice(0,2)){
            const map=mapData.find(map=>map.id===world.mapIds.at(-1));
            state.selectedMap=map.id;state.selectedWorld=world.id;state.currentView='map';state.isInTown=false;
            state.kills[map.id]=0;state.townProgress.killFractions||={};state.townProgress.killFractions[map.id]=.75;
            resetMonsterStates(map);defeatEnemy(state.monsterStates[0]);
            check(world.name+' boss counts once at maximum Menagerie level without consuming old fractional credit',state.kills[map.id]===1&&state.townProgress.killFractions[map.id]===.75);
        }
        state.selectedMap=regular.id;state.selectedWorld=worldData[0].id;resetMonsterStates(regular);const before=state.kills[regular.id];
        defeatEnemy(state.monsterStates[0]);
        check('normal monsters retain the full Menagerie bonus',state.kills[regular.id]===before+10);
        regular.masteryType='boss';const marked=MasterySystem.milestone({...regular,goal:10},20,0,worldContent);const markedBefore=state.kills[regular.id];
        defeatEnemy(state.monsterStates[0]);
        check('explicit boss encounters use the same single-kill and reduced-threshold rules',state.kills[regular.id]===markedBefore+1&&marked.earned===2);delete regular.masteryType;
        state.selectedMap=boss.id;state.selectedWorld=worldData[0].id;state.mapMastery={};state.kills[boss.id]=19;resetMonsterStates(boss);
        defeatEnemy(state.monsterStates[0]);MapMastery.open();
        check('real boss combat awards the first two mastery points at the new threshold',state.kills[boss.id]===20&&state.mapMastery[boss.id].earned===2);
        check('the mastery panel shows the next reduced boss threshold',document.getElementById('mapMasteryMilestone').textContent.includes('200 kills'));
        const parsed=parseGameSave(JSON.stringify(createGameSave()));
        check('boss kill totals and earned points survive profile parsing',parsed.kills[boss.id]===20&&parsed.mapMastery[boss.id].earned===2);
        const legacy=JSON.parse(JSON.stringify(parsed));legacy.kills[boss.id]=0;legacy.mapMastery[boss.id]={earned:8,nodes:['wealth1']};
        const preserved=parseGameSave(JSON.stringify(legacy));
        check('existing points and allocations are never removed by the balance change',preserved.mapMastery[boss.id].earned===8&&preserved.mapMastery[boss.id].nodes[0]==='wealth1'&&progress(0,8).next===200000);
        const historical=JSON.parse(JSON.stringify(parsed));historical.kills[boss.id]=999;
        check('historical kill counts remain intact and receive the lower-threshold credit',parseGameSave(JSON.stringify(historical)).kills[boss.id]===999&&parseGameSave(JSON.stringify(historical)).mapMastery[boss.id].earned===4);
        MapMastery.close(false);
        state.mapMastery={};state.kills[boss.id]=0;state.townProgress.killFractions={};
        state.skillRanks={};pendingSkillRanks={};state.level=0;state.experience=0;state.experienceRemainder=0;state.skillPoints=0;
        state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];
        itemById.testAmulet.stats={damage:1000,evasion:10000,accuracy:10000,health:1000};
        boss.spawns=[{id:'bossMasteryTarget',monsterId:worldContent.monsters[0].id,count:1,overrides:{health:1,attackDamage:0,accuracy:1,evasion:0,attackInterval:1000,respawnSeconds:.1,experience:0,gold:[0,0],drops:[],itemDrops:[]}}];
        boss.drops=[];boss.itemDrops=[];monsterDefinitionCache.delete(boss);invalidateSkillBonusCache();resetMonsterStates(boss);
        state.playerHp=getPlayerMaxHealth();state.playerMana=getPlayerMaxMana();state.combatPaused=false;Math.random=()=>.5;resetCombatClock();
        const baseline=parseGameSave(JSON.stringify(createGameSave()));
        for(let tick=0;tick<200;tick++)simulateCombatStep(.1);
        const summary=()=>JSON.stringify({kills:state.kills[boss.id],mastery:state.mapMastery[boss.id],fractions:state.townProgress.killFractions});
        const foreground=summary();check('boss combat simulation registers actual defeats',state.kills[boss.id]>0);
        applyGameSave(baseline);Math.random=()=>.5;resetCombatClock();pendingCombatSeconds=20;combatCatchingUp=true;processCombatBacklog();
        for(let attempt=0;pendingCombatSeconds>=gameTickSeconds-1e-8&&attempt<100;attempt++)await new Promise(resolve=>setTimeout(resolve,5));
        check('offline and foreground boss kills and mastery points agree',summary()===foreground);
        check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}finally{Math.random=originalRandom;itemById.testAmulet.stats=originalStats;}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
