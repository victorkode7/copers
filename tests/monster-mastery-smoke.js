(async function () {
    const preview=new URL(document.currentScript.src).searchParams.has('preview');
    const checks=[],near=(a,b)=>Math.abs(a-b)<1e-6,$=id=>document.getElementById(id);
    const check=(name,ok)=>{checks.push((ok?'PASS ':'FAIL ')+name);if(!ok)throw new Error(name);};
    const originalRandom=Math.random,originalWrite=Storage.prototype.setItem,originalStats=itemById.testAmulet.stats,map=currentMap();
    const dataTree=()=>MasterySystem.tree(worldContent,map);
    function fresh(nodes=[],kills=10000) {
        state.townProgress=TownProgression.defaults();state.townProgress.buildings.menagerie={tier:0,level:1};
        MapMastery.close(false);combatStatCache=null;clearPlayerCombatBuffs();
        state.skillRanks={};pendingSkillRanks={};state.level=0;state.skillPoints=0;state.experience=0;state.experienceRemainder=0;state.defeatedBossWorldIds=[];
        state.skillPointRecoveryRanks=null;state.skillPointTrimPending=false;
        state.upgrades={strength:0,haste:0,evasion:0};state.gear=createEmptyGear();state.ownedItemIds=[];state.itemCrafts={};state.crafted=[];
        state.mapMastery={[map.id]:{earned:6,nodes:[...nodes]}};state.kills=Object.fromEntries(mapData.map(entry=>[entry.id,entry.id===map.id?kills:0]));
        state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,0]));state.gold=0;state.lootLog=[];state.lastLoot=null;state.tutorials=createTutorialState();
        state.selectedMap=map.id;state.selectedWorld=worldForMap(map.id).id;state.currentView='map';state.isInTown=false;
        state.playerHp=100;state.playerMana=0;state.combatPaused=true;state.attackTimer=0;
        map.goal=10;delete map.masteryTree;map.drops=[];map.itemDrops=[];
        map.spawns=[{id:'masteryTarget',monsterId:worldContent.monsters[0].id,count:1,overrides:{health:100,attackDamage:2,accuracy:50,evasion:0,attackInterval:1000,respawnSeconds:4,experience:0,gold:[10,10],drops:[{id:'gel',amount:[1,1],chance:.1}],itemDrops:[{id:'testDropHelm',chance:.1}]}}];
        resetMonsterStates(map);resetCombatClock();clearOfflineRecap();invalidateSkillBonusCache();Math.random=()=>.15;
    }
    try {
        // Exercise the built-in balance independently of World Editor custom presets.
        worldData.forEach((world,index)=>{world.masteryPresets={regular:MasterySystem.clone(MasterySystem.defaultTree(world,index,false)),boss:MasterySystem.clone(MasterySystem.defaultTree(world,index,true))};});
        for(const world of worldData)for(const type of ['regular','boss']) {
            const tree=MasterySystem.preset(worldContent,world,type);
            check(world.name+' '+type+' has a valid fourteen-node mastery tree',tree.nodes.length===14&&!MasterySystem.validateTree(tree,'Test').length&&tree.nodes.filter(node=>node.start).length===1);
        }
        const boss=mapData.find(entry=>entry.id===worldData[0].mapIds.at(-1));
        check('boss and ordinary maps inherit different world presets',MasterySystem.kind(worldContent,boss)==='boss'&&MasterySystem.tree(worldContent,boss)!==dataTree());
        fresh([],99);state.mapMastery={};render();
        check('mastery starts with no points before ten times the kill goal',MasterySystem.available(state,map)===0);
        defeatEnemy(state.monsterStates[0]);render();
        check('the first mastery milestone awards exactly two separate points',state.mapMastery[map.id].earned===2&&state.skillPoints===0&&$('openMapMastery').textContent==='Mastery (2)');
        state.kills[map.id]=200;MapMastery.award(map);
        check('twenty times the goal does not award a second exponential milestone',state.mapMastery[map.id].earned===2);
        state.kills[map.id]=1000;MapMastery.award(map);MapMastery.award(map);
        check('one hundred times the goal awards the next two points once',state.mapMastery[map.id].earned===4);
        state.kills[map.id]=10000;MapMastery.award(map);
        check('one thousand times the goal awards six total points',state.mapMastery[map.id].earned===6);
        $('openMapMastery').click();
        check('mastery replaces the fighting window with the specified tree',elements.combatPanel.hidden&&!$('mapMasteryPanel').hidden&&$('mapMasteryTree').querySelectorAll('[data-mastery-node]').length===14);
        check('the starting node is free and the capstone joins three branch tips',dataTree().nodes.find(node=>node.start).row===5&&dataTree().nodes.find(node=>node.id==='capstone').requires.length===3&&MasterySystem.available(state,map)===6);
        check('locked descendants cannot be purchased early',!MapMastery.learn('wealth4'));
        resetMonsterStates(map);state.monsterStates[0].hp=50;
        check('the first branch node can be purchased',MapMastery.learn('wealth1'));
        check('gold bonus and enemy health trade-off apply immediately',near(getGoldMultiplier(),1.1)&&monsterDefinition(state.monsterStates[0]).health===125&&near(state.monsterStates[0].hp,62.5));
        const other=mapData.find(entry=>entry.id!==map.id),savedMap=state.selectedMap;state.selectedMap=other.id;
        check('mastery bonuses do not leak into another map',getGoldMultiplier()===1);state.selectedMap=savedMap;
        MapMastery.open();const root=$('mapMasteryTree').querySelector('[data-mastery-node="root"]');state.kills[map.id]++;renderCombat();
        check('kill updates retain tree nodes instead of rebuilding them',root===$('mapMasteryTree').querySelector('[data-mastery-node="root"]'));
        for(const id of ['wealth2','wealth3','wealth4'])check(id+' follows its branch prerequisites',MapMastery.learn(id));
        check('completing one branch unlocks the large capstone',MapMastery.learn('capstone')&&MasterySystem.available(state,map)===1);
        check('the capstone applies tenfold enemy damage and accuracy trade-offs',near(monsterDefinition(state.monsterStates[0]).attackDamage,25)&&near(monsterDefinition(state.monsterStates[0]).accuracy,750));
        check('refunding a prerequisite also refunds dependent nodes',MapMastery.refund('wealth2')&&state.mapMastery[map.id].nodes.join()==='wealth1'&&MasterySystem.available(state,map)===5);
        fresh();MapMastery.learn('population1');
        check('respawn reductions change actual monster respawn time',near(monsterDefinition(state.monsterStates[0]).respawnSeconds,3.6));
        MapMastery.learn('population2');
        check('population mastery adds real monsters with unique IDs',state.monsterStates.length===2&&new Set(state.monsterStates.map(monster=>monster.id)).size===2);
        fresh();MapMastery.learn('drops1');
        check('drop-rate mastery modifies the real material and equipment rolls',MasterySystem.bonus(worldContent,map,state,'dropRateMultiplier')===1.1);
        map.masteryTree=MasterySystem.clone(dataTree());map.masteryTree.nodes.find(node=>node.id==='drops1').stats.dropRateMultiplier=2;
        state.mapMastery={[map.id]:{earned:6,nodes:['drops1']}};resetMonsterStates(map);render();
        defeatEnemy(state.monsterStates[0]);render();
        check('increased drop rates affect both loot-table types',state.materials.gel===1&&ownsItem('testDropHelm')&&elements.mapLootTable.textContent.includes('20%'));
        const profile=createGameSave(),parsed=parseGameSave(JSON.stringify(profile));
        check('mastery points and allocations survive profile parsing',JSON.stringify(parsed.mapMastery)===JSON.stringify(state.mapMastery));
        const legacy=JSON.parse(JSON.stringify(profile));delete legacy.mapMastery;
        check('older saves receive mastery credit from their existing kills',parseGameSave(JSON.stringify(legacy)).mapMastery[map.id].earned===6);
        for(const bad of [{earned:1,nodes:['wealth1','wealth2']},{earned:2,nodes:['root']},{earned:2,nodes:['wealth1','wealth1']},{earned:-1,nodes:[]}]) {
            let rejected=false;try{parseGameSave(JSON.stringify({...profile,mapMastery:{[map.id]:bad}}));}catch{rejected=true;}check('malformed mastery saves are rejected safely',rejected);
        }
        fresh();const before=JSON.stringify({mastery:state.mapMastery,monsters:state.monsterStates,hp:state.playerHp,gold:state.gold});
        Storage.prototype.setItem=function(key,value){if(key===saveKey)throw new Error('Storage full');return originalWrite.call(this,key,value);};
        check('failed persistence rolls back mastery and the encounter',!MapMastery.learn('wealth1')&&JSON.stringify({mastery:state.mapMastery,monsters:state.monsterStates,hp:state.playerHp,gold:state.gold})===before);
        Storage.prototype.setItem=originalWrite;
        fresh(['wealth1','population1','population2','drops1']);state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];itemById.testAmulet.stats={damage:1000,evasion:10000};state.combatPaused=false;
        state.townProgress.buildings.menagerie.level=2;
        for(let i=0;i<100;i++)simulateCombatStep(.1);const foreground=JSON.stringify({mastery:state.mapMastery,kills:state.kills,fractions:state.townProgress.killFractions,gold:state.gold,materials:state.materials,monsters:state.monsterStates});
        fresh(['wealth1','population1','population2','drops1']);state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];itemById.testAmulet.stats={damage:1000,evasion:10000};state.combatPaused=false;
        state.townProgress.buildings.menagerie.level=2;
        resetCombatClock(Date.now()-10000);processCombatBacklog();for(let i=0;pendingCombatSeconds+1e-8>=gameTickSeconds&&i<100;i++)await new Promise(resolve=>setTimeout(resolve,0));
        check('foreground and offline mastery combat agree with fractional Menagerie credit',JSON.stringify({mastery:state.mapMastery,kills:state.kills,fractions:state.townProgress.killFractions,gold:state.gold,materials:state.materials,monsters:state.monsterStates})===foreground);
        MapMastery.open();check('mastery fits the viewport',document.documentElement.scrollWidth<=innerWidth);
        $('closeMapMastery').click();check('back to combat restores the fighting window',!elements.combatPanel.hidden&&$('mapMasteryPanel').hidden);
        if(preview){MapMastery.open();$('mapMasteryPanel').scrollIntoView({block:'start'});}
        check('no runtime errors',!window.smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    finally{Math.random=originalRandom;Storage.prototype.setItem=originalWrite;itemById.testAmulet.stats=originalStats;combatStatCache=null;resetCombatClock();clearOfflineRecap();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
