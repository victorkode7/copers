(function () {
    const checks = [], originalRandom = Math.random, originalStats = itemById.testAmulet.stats;
    const map = currentMap();
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const hash = value => { let result = 2166136261; for (const char of JSON.stringify(value)) result = Math.imul(result ^ char.charCodeAt(0), 16777619); return (result >>> 0).toString(16); };
    const median = values => values.sort((a,b) => a-b)[Math.floor(values.length/2)];
    function fresh(abilities) {
        state.skillRanks = abilities ? Object.fromEntries(['volcanicEruption','eruptionChain','eruptionChain_copy','piercingArrow','forkingArrow','multiShot','freezingArrows','snakeBite','bloomingFlower','poisonExecute'].map(id => [id,1])) : {};
        state.level = Object.keys(state.skillRanks).length; state.experience = 0; state.skillPoints = 0;
        state.upgrades = {strength:0,haste:0,evasion:0}; state.gear = createEmptyGear(); state.gear.necklace = 'testAmulet'; state.ownedItemIds = ['testAmulet']; state.crafted = [];
        itemById.testAmulet.stats = {health:10000,healthRegen:100000,damage:10,multiHit:2,attackSpeedMultiplier:2,poisonChance:abilities ? .5 : 0};
        state.kills = Object.fromEntries(mapData.map(entry => [entry.id,0])); state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id,0]));
        state.gold = 0; state.lootLog = []; state.lastLoot = null; state.tutorials = createTutorialState();
        state.selectedMap = map.id; state.selectedWorld = worldForMap(map.id).id; state.currentView = 'map'; state.isInTown = false;
        map.drops = [{id:Object.keys(materialNames)[0],amount:[1,2],chance:.5}]; map.itemDrops = [];
        map.spawns = [{id:'performanceMob',monsterId:worldContent.monsters[0].id,count:64,overrides:{health:abilities?80:1000,attackDamage:1,attackInterval:3,accuracy:100,evasion:10,respawnSeconds:2,gold:[1,3],experience:1,drops:[],itemDrops:[]}}];
        resetMonsterStates(map); state.monsterColumns = 8; state.playerHp = getPlayerMaxHealth(); state.combatPaused = false; state.attackTimer = 0;
        resetCombatClock(); clearOfflineRecap();
        let seed = 123456; Math.random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
    }
    function simulate(steps) {
        const started = performance.now();
        try { for (let index=0;index<steps;index++) { if(index%250===0)combatStatCache=new Map(); simulateCombatStep(.1); } }
        finally {combatStatCache=null;}
        return performance.now()-started;
    }
    try {
        for (const abilities of [false,true]) {
            const times = []; let digest;
            for(let run=0;run<4;run++) {
                fresh(abilities); const elapsed=simulate(1500);
                const current=hash({hp:state.playerHp,paused:state.combatPaused,attack:state.attackTimer,monsters:state.monsterStates,pending:state.pendingEruptions,kills:state.kills,gold:state.gold,materials:state.materials,level:state.level,xp:state.experience,target:state.targetMonsterId,loot:state.lootLog});
                if(run===0)digest=current;else {check((abilities?'abilities':'basic')+' combat is deterministic on repeat '+run,current===digest);times.push(elapsed);}
            }
            checks.push('BENCH '+JSON.stringify({scenario:abilities?'abilities':'basic',monsters:64,steps:1500,medianMs:Math.round(median(times)*100)/100,digest}));
            // Seeded reference outcomes; the ability snapshot includes cardinal-only eruption splash.
            check((abilities?'abilities':'basic')+' outcomes match the seeded reference',digest===(abilities?'3d6e2543':'412af9a8'));
        }
        fresh(false); render();
        const originalCreate = document.createElement, originalQuery = Element.prototype.querySelector;
        let creates=0,queries=0;const renderTimes=[];
        try {
            document.createElement=function(...args){creates++;return originalCreate.apply(this,args);};
            Element.prototype.querySelector=function(...args){queries++;return originalQuery.apply(this,args);};
            for(let run=0;run<5;run++){const started=performance.now();for(let index=0;index<20;index++)renderCombat();renderTimes.push((performance.now()-started)/20);}
        } finally {document.createElement=originalCreate;Element.prototype.querySelector=originalQuery;}
        checks.push('BENCH '+JSON.stringify({scenario:'render',monsters:64,frames:100,medianFrameMs:Math.round(median(renderTimes)*100)/100,creates,queries}));
        const rows=[...elements.mapLootTable.children];state.gold+=9;state.materials[Object.keys(materialNames)[0]]+=2;renderCombat();
        check('loot ownership remains current after combat rewards',elements.mapLootTable.textContent.includes('Owned: 9')&&elements.mapLootTable.textContent.includes('Owned: 2'));
        check('changing ownership updates existing loot rows instead of rebuilding them',rows.every((row,index)=>elements.mapLootTable.children[index]===row));
        check('the full crowded roster remains visible',elements.enemyRoster.children.length===64);
        const observer=new MutationObserver(()=>{});observer.observe(elements.combatPanel,{subtree:true,childList:true,characterData:true});
        renderCombat();
        check('an unchanged combat display does not rewrite text or recreate nodes',observer.takeRecords().length===0);observer.disconnect();
        const maxHealth=getPlayerMaxHealth();itemById.testAmulet.stats.health+=100;itemById.testAmulet.stats.accuracy=-20;renderCombat();
        check('render caches expire when equipment bonuses change',getPlayerMaxHealth()===maxHealth+100&&elements.playerHealthText.textContent.includes('/ '+(maxHealth+100)+' HP')&&elements.enemyRoster.firstElementChild.querySelector('[data-player-accuracy]').textContent==='70%');
        map.drops[0].amount[1]=3;renderCombat();
        check('changing a drop definition refreshes loot content',elements.mapLootTable.children[1]!==rows[1]&&elements.mapLootTable.children[1].textContent.includes('1–3'));
        const previousCard=elements.enemyRoster.firstElementChild,nextMap=mapData.find(entry=>entry.id!==map.id);
        nextMap.spawns=[{...map.spawns[0],count:2,overrides:{...map.spawns[0].overrides,health:2000}}];
        state.selectedMap=nextMap.id;resetMonsterStates(nextMap);renderCombat();
        check('map changes rebuild card references even when spawn IDs are reused',elements.enemyRoster.firstElementChild!==previousCard&&elements.enemyRoster.children.length===2&&elements.enemyRoster.firstElementChild.querySelector('[data-enemy-hp]').textContent==='2000 / 2000 HP');
        nextMap.spawns[0].overrides.health=2100;resetMonsterStates(nextMap);renderCombat();
        check('resetting a map invalidates its indexed monster definitions',monsterDefinition(state.monsterStates[0]).health===2100&&elements.enemyRoster.firstElementChild.querySelector('[data-enemy-hp]').textContent==='2100 / 2100 HP');
        check('no runtime errors',!window.smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    finally{Math.random=originalRandom;itemById.testAmulet.stats=originalStats;combatStatCache=null;resetCombatClock();clearOfflineRecap();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
