// Investigation-only harness. Production code is instrumented only in this
// isolated browser fixture; game files and live profiles are not modified.
(function(){
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),round=n=>Math.round(n*1000)/1000;
    const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
    const p95=values=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*.95))]||0;
    const originalRandom=Math.random,originalStats=itemById.testAmulet.stats,map=currentMap();
    let sprite;
    function clear(){ReapSprite.clear();CombatWebGL.clear();LootEffects.clear();elements.combatPanel.querySelectorAll('.combat-arrow,.spell-effect,.eruption-chain,.eruption-burst,.elemental-effect-layer,.shield-slam-wave,.poison-transfer').forEach(node=>node.remove());}
    async function prepare(config){
        await document.fonts.ready;sprite=await ReapSprite.ready;clear();MapMastery.close(false);clearOfflineRecap();combatStatCache=null;
        state.townProgress=TownProgression.defaults();state.mapMastery={};state.skillRanks=config.all?Object.fromEntries(skillNodes.filter(node=>!node.start).map(node=>[node.id,node.maxRank])):config.reap?{reapPreview:1,reapingEcho:1}:{};
        state.level=Object.values(state.skillRanks).reduce((a,b)=>a+b,0);state.skillPoints=0;state.experience=0;state.experienceRemainder=0;pendingSkillRanks={};
        state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];state.crafted=[];state.upgrades={strength:0,haste:0,evasion:0};
        itemById.testAmulet.stats={health:1e8,healthRegen:1e8,damage:10,...(config.fast?{attackSpeedMultiplier:20}:{})};
        state.gold=0;state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,0]));state.kills=Object.fromEntries(mapData.map(entry=>[entry.id,0]));state.lootLog=[];state.lastLoot=null;state.tutorials=createTutorialState();
        state.currentView='map';state.isInTown=false;state.selectedMap=map.id;state.selectedWorld=worldForMap(map.id).id;state.combatPaused=false;
        map.goal=1000000;map.drops=[];map.itemDrops=[];
        map.spawns=[{id:'audit',monsterId:worldContent.monsters[0].id,count:config.count||9,overrides:{health:config.health||100000,attackDamage:0,evasion:0,accuracy:0,attackInterval:1000,respawnSeconds:2,experience:0,gold:[1,1],drops:[],itemDrops:[]}}];
        resetMonsterStates(map);invalidateSkillBonusCache();state.playerHp=getPlayerMaxHealth();state.playerMana=getPlayerMaxMana();state.attackTimer=0;resetCombatClock();
        let seed=654321;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
        render();elements.combatPanel.scrollIntoView({block:'start'});
        if(config.mastery){state.townProgress.buildings.menagerie={tier:0,level:1};state.mapMastery={[map.id]:{earned:6,nodes:[]}};MapMastery.open();}
        if(config.inventory){state.currentView='inventory';state.isInTown=true;render();}
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        return {interval:getAttackSpeed(),damage:getDamage(),columns:state.monsterColumns,count:state.monsterStates.length};
    }
    function instrument(){
        const original={},stats={},restore=[],slowRectReads=[];
        const wrap=(owner,name,label=name)=>{if(typeof owner[name]!=='function')return;const fn=owner[name];stats[label]={calls:0,inclusiveMs:0};owner[name]=function(...args){const start=performance.now();try{return fn.apply(this,args);}finally{stats[label].calls++;stats[label].inclusiveMs+=performance.now()-start;}};restore.push(()=>owner[name]=fn);};
        for(const name of ['simulateCombatStep','render','renderCombat','renderMaps','renderWorlds','renderDetailedStats','flushCombatEffects','getCombatEffectCard','monsterDefinition','createGameSave','saveGame'])wrap(window,name);
        wrap(MapMastery,'render','masteryRender');wrap(CombatWebGLEffects,'sync','gpuAmbientSync');wrap(sprite,'tick','reapTick');
        wrap(Element.prototype,'getBoundingClientRect','rectReads');wrap(Storage.prototype,'setItem','storageWrites');wrap(document,'createElement','createdElements');
        const readRect=Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect=function(){const start=performance.now(),result=readRect.call(this),elapsed=performance.now()-start;if(elapsed>=1&&slowRectReads.length<12)slowRectReads.push({ms:round(elapsed),element:this.id||this.className,stack:new Error().stack});return result;};
        return {stats,stop:()=>restore.reverse().forEach(fn=>fn()),snapshot:()=>({...Object.fromEntries(Object.entries(stats).map(([key,value])=>[key,{calls:value.calls,inclusiveMs:round(value.inclusiveMs)}])),slowRectReads})};
    }
    function digest(){return JSON.stringify({hp:state.playerHp,monsters:state.monsterStates,kills:state.kills,pending:state.pendingReapAttacks,attack:state.attackTimer});}
    function outcomeHash(value){let hash=2166136261;for(let index=0;index<value.length;index++)hash=Math.imul(hash^value.charCodeAt(index),16777619);return (hash>>>0).toString(16).padStart(8,'0');}
    async function core(config){
        const totals=[],ticks=[];let kills,expected,profile;
        for(let run=0;run<5;run++){
            await prepare(config);const meter=run===4?instrument():null,start=performance.now();
            for(let i=0;i<600;i++){combatStatCache=new Map();const t=performance.now();simulateCombatStep(.1,false);if(run===3)ticks.push(performance.now()-t);combatStatCache=null;}
            const elapsed=performance.now()-start,current=digest();if(!run)expected=current;else if(current!==expected)throw new Error('Non-deterministic core fixture');
            if(run>0&&run<4)totals.push(elapsed);kills=state.kills[map.id];if(meter){profile=meter.snapshot();meter.stop();}
        }
        return {scenario:config.label,simulatedSeconds:60,medianSimulationMs:round(median(totals)),tickP95Ms:round(p95(ticks)),kills,alive:state.playerHp>0,outcomeHash:outcomeHash(expected),inclusiveProfile:profile};
    }
    async function rendering(config){
        let mutations=0,lastFrame,animationFrame;const frameGaps=[];
        const meter=instrument(),observer=new MutationObserver(records=>mutations+=records.length);observer.observe(document.body,{attributes:true,childList:true,subtree:true,characterData:true});
        const totals=[],simulation=[],visual=[];
        function monitor(now){if(lastFrame!==undefined)frameGaps.push(now-lastFrame);lastFrame=now;animationFrame=requestAnimationFrame(monitor);}
        animationFrame=requestAnimationFrame(monitor);
        try{
            await new Promise((resolve,reject)=>{const timer=auditSetInterval(()=>{try{
                combatStatCache=new Map();const t=performance.now(),result=simulateCombatStep(.1,true),after=performance.now();combatStatCache=null;
                flushCombatEffects(result.effects);if(result.needsRender)render();else renderCombat();
                visual.push(performance.now()-after);simulation.push(after-t);totals.push(performance.now()-t);
                if(totals.length===15){clearInterval(timer);resolve();}
            }catch(error){clearInterval(timer);reject(error);}},100);});
            mutations+=observer.takeRecords().length;
            return {scenario:config.label,ticks:15,simulatedSeconds:1.5,medianTickMs:round(median(totals)),p95TickMs:round(p95(totals)),frameP95Ms:round(p95(frameGaps)),framesOver25:frameGaps.filter(gap=>gap>25).length,simulationMs:round(simulation.reduce((a,b)=>a+b,0)),visualMs:round(visual.reduce((a,b)=>a+b,0)),mutations,kills:state.kills[map.id],inclusiveProfile:meter.snapshot()};
        }finally{cancelAnimationFrame(animationFrame);observer.disconnect();meter.stop();clear();}
    }
    async function effects(config){
        const meter=instrument(),gaps=[];let last,frame,peak=0;
        const start=performance.now(),id=state.monsterStates[0].id;
        const placement=ReapSprite.layout(getCombatEffectCard(id).getBoundingClientRect(),[]),size=Math.min(placement.size,1000);
        let replenisher;
        function replenish(){while(sprite.active.size<config.casts){const index=sprite.active.size,targetId=state.monsterStates[index%Math.min(8,state.monsterStates.length)].id;sprite.play({target:()=>getCombatEffectCard(targetId),size,facing:index%4*Math.PI/2});}peak=Math.max(peak,sprite.active.size);}
        function monitor(now){if(last!==undefined)gaps.push(now-last);last=now;frame=requestAnimationFrame(monitor);}
        try{
            replenish();replenisher=auditSetInterval(replenish,100);frame=requestAnimationFrame(monitor);await wait(1800);
            return {scenario:config.label,elapsedMs:round(performance.now()-start),activeCasts:config.casts,peak,frames:gaps.length,frameMedianMs:round(median(gaps)),frameP95Ms:round(p95(gaps)),framesOver25:gaps.filter(gap=>gap>25).length,castLookups:meter.stats.getCombatEffectCard.calls,rectReads:meter.stats.rectReads.calls,reapTickMs:round(meter.stats.reapTick.inclusiveMs),reapFrames:meter.stats.reapTick.calls,inclusiveProfile:meter.snapshot()};
        }finally{clearInterval(replenisher);cancelAnimationFrame(frame);clear();meter.stop();}
    }
    async function memory(config){
        const samples=[];
        for(let cycle=0;cycle<config.cycles;cycle++){
            for(let i=0;i<64;i++)sprite.play({target:()=>getCombatEffectCard(state.monsterStates[i%8].id),size:1000,facing:i%4*Math.PI/2});
            await wait(720);samples.push({cycle,active:sprite.active.size,overlays:document.querySelectorAll('.scythe-reap-effect').length,domNodes:document.getElementsByTagName('*').length,heapUsed:performance.memory?.usedJSHeapSize});
        }
        return {scenario:config.label,samples,active:sprite.active.size,overlays:document.querySelectorAll('.scythe-reap-effect').length};
    }
    function saving(){
        const build=[],serialize=[],storage=[];let bytes=0;
        for(let i=0;i<80;i++){let t=performance.now();const value=createGameSave();build.push(performance.now()-t);t=performance.now();const json=JSON.stringify(value);serialize.push(performance.now()-t);bytes=new TextEncoder().encode(json).length;t=performance.now();localStorage.setItem(saveKey,json);storage.push(performance.now()-t);}
        return {scenario:'save-'+state.monsterStates.length,bytes,buildMedianMs:round(median(build)),serializeMedianMs:round(median(serialize)),storageMedianMs:round(median(storage)),totalMedianMs:round(median(build.map((n,i)=>n+serialize[i]+storage[i])))};
    }
    async function catchup(config){
        resetCombatClock(Date.now()-60000);lastSave=Date.now();const before=lastSimulatedAt,meter=instrument(),start=performance.now();
        try{processCombatBacklog();while(pendingCombatSeconds+1e-8>=gameTickSeconds)await wait(0);
            return {scenario:config.label,elapsedMs:round(performance.now()-start),simulatedSeconds:round((lastSimulatedAt-before)/1000),kills:state.kills[map.id],inclusiveProfile:meter.snapshot()};
        }finally{meter.stop();}
    }
    function interactions(config){
        const meter=instrument(),learn=[],refund=[],tree=MasterySystem.tree(worldContent,map),record=MasterySystem.record(state,map,worldContent);
        const node=tree.nodes.find(node=>!node.start&&MasterySystem.canLearn(tree,record.nodes,node.id));
        try{for(let index=0;index<20;index++){let start=performance.now();if(!MapMastery.learn(node.id))throw new Error('Mastery purchase failed');learn.push(performance.now()-start);start=performance.now();if(!MapMastery.refund(node.id))throw new Error('Mastery refund failed');refund.push(performance.now()-start);}
            return {scenario:config.label,learnMedianMs:round(median(learn)),refundMedianMs:round(median(refund)),learnP95Ms:round(p95(learn)),refundP95Ms:round(p95(refund)),inclusiveProfile:meter.snapshot()};
        }finally{meter.stop();}
    }
    function cases(phase){
        const basic={label:'normal-9',count:9};
        if(phase==='core')return [basic,{label:'fast-9',count:9,fast:true},{label:'crowded-100',count:100},{label:'reap-chain-64',count:64,fast:true,reap:true,health:20},{label:'all-skills-64',count:64,all:true}];
        if(phase==='render')return [basic,{label:'render-64',count:64},{label:'fast-reap-kills-64',count:64,reap:true,fast:true,health:20},{label:'all-skills-visible-64',count:64,all:true},{label:'inventory-hidden-combat',count:64,inventory:true},{label:'mastery-idle',count:64,mastery:true}];
        if(phase==='effects')return [0,8,32,64].map(casts=>({label:'reap-'+casts,count:64,casts}));
        if(phase==='memory')return [{label:'idle-memory',count:64,cycles:0},{label:'reap-soak-'+(window.auditMemoryCycles||10)+'-cycles',count:64,cycles:window.auditMemoryCycles||10}];
        if(phase==='catchup')return [{label:'offline-reap-60s',count:64,reap:true,fast:true,health:20},{label:'offline-all-skills-60s',count:64,all:true}];
        if(phase==='interactions')return [{label:'mastery-purchase-refund',count:64,mastery:true}];
        return [{label:'save-9',count:9},{label:'save-100',count:100}];
    }
    async function run(phase,config){
        let result;
        if(phase==='core')result=await core(config);else if(phase==='render')result=await rendering(config);else if(phase==='effects')result=await effects(config);else if(phase==='memory')result=await memory(config);else if(phase==='catchup')result=await catchup(config);else if(phase==='interactions')result=interactions(config);else result=saving();
        if(smokeErrors.length)throw new Error(smokeErrors.join('\n'));return result;
    }
    function environment(){const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl'),debug=gl?.getExtension('WEBGL_debug_renderer_info'),renderer=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl?.getParameter(gl.RENDERER);gl?.getExtension('WEBGL_lose_context')?.loseContext();return {userAgent:navigator.userAgent,width:innerWidth,height:innerHeight,devicePixelRatio,logicalProcessors:navigator.hardwareConcurrency,gpu:renderer,reapFrames:16,simulationTickMs:100};}
    window.PerformanceAudit={prepare,run,cases,environment,cleanup:()=>{clear();Math.random=originalRandom;itemById.testAmulet.stats=originalStats;}};
}());
