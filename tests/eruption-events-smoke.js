(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const near=(a,b)=>Math.abs(a-b)<1e-7;
    const random=Math.random,showBurst=showVolcanicEruption,showChain=showEruptionChain,enabled=CombatSettings.enabled;
    const create=document.createElement,createNS=document.createElementNS,getCard=getCombatEffectCard,getBounds=getCombatEffectBounds,now=performance.now;
    const hidden=Object.getOwnPropertyDescriptor(document,'hidden'),emit=CombatWebGL.emit,gpuChain=CombatWebGL.eruptionChain;
    const choose=value=>{const select=document.getElementById('combatEffectRenderer');select.value=value;select.dispatchEvent(new Event('change'));};
    const toggle=(key,value)=>{const button=document.querySelector(`[data-effect-setting="${key}"]`);if(button.getAttribute('aria-checked')!==String(value))button.click();};
    const restoreHidden=()=>{if(hidden)Object.defineProperty(document,'hidden',hidden);else delete document.hidden;};
    const clear=()=>{elements.combatPanel.querySelectorAll('.eruption-burst,.eruption-chain').forEach(element=>element.remove());CombatWebGL.clear();};
    function collect(action,visuals=true){const previous=combatEffects;combatEffects=visuals?[]:null;try{action();return combatEffects||[];}finally{combatEffects=previous;}}
    function guarded(action){
        try{
            const fail=()=>{throw new Error('Eruption simulation accessed presentation');};
            document.createElement=fail;document.createElementNS=fail;getCombatEffectCard=fail;getCombatEffectBounds=fail;performance.now=fail;CombatSettings.enabled=fail;
            Object.defineProperty(document,'hidden',{configurable:true,get:fail});return collect(action);
        }finally{document.createElement=create;document.createElementNS=createNS;getCombatEffectCard=getCard;getCombatEffectBounds=getBounds;performance.now=now;CombatSettings.enabled=enabled;restoreHidden();}
    }
    try{
        for(const key of ['all','abilities','projectiles','glows'])toggle(key,true);choose('svg');
        state.currentView='map';state.isInTown=false;state.skillRanks={volcanicEruption:1,eruptionChain:1};state.level=1;
        state.gear=createEmptyGear();state.ownedItemIds=[];state.upgrades={strength:0,haste:0,evasion:0};
        state.pendingEruptions=[];state.pendingVoidMissiles=[];state.shieldStacks=0;state.voidCharges=0;clearFury();clearGatheringPower();
        const map=currentMap();map.drops=[];map.itemDrops=[];
        map.spawns=[{id:'eruptionEventMob',monsterId:worldContent.monsters[0].id,count:9,overrides:{health:100,attackDamage:0,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:.5,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);clearOfflineRecap();state.playerHp=getPlayerMaxHealth();state.combatPaused=false;state.attackTimer=0;render();state.monsterColumns=3;clear();
        elements.combatPanel.scrollIntoView({block:'start'});await new Promise(resolve=>requestAnimationFrame(resolve));
        const initial=JSON.stringify(state),ids=state.monsterStates.map(monster=>monster.id),affected=[1,3,4,5,7];
        function fresh(){resetVoidMissilePresentation();Object.assign(state,JSON.parse(initial));combatStatCache=null;resetDamageBreakdown(map.id);render();state.monsterColumns=3;clear();Math.random=()=>.999;}
        Math.random=()=>.999;const queued=guarded(()=>triggerVolcanicEruption(state.monsterStates[4],10));
        const burst=queued.find(effect=>effect.type==='volcanicEruption'),chain=queued.find(effect=>effect.type==='eruptionChain');
        check('a real eruption queues plain explosion and chain records without HTML, visual settings, visibility or wall-clock access',burst?.centerId===ids[4]&&burst.mapId===map.id&&burst.targetIds.join(',')===affected.map(index=>ids[index]).join(',')&&chain?.sourceId===ids[4]&&chain.targetId===ids[8]&&chain.mapId===map.id&&chain.delay===0&&chain.flight===1000&&chain.duration===2000&&queued.every(effect=>typeof effect==='object'));
        check('simulation retains cardinal damage, one health payment and a pending one-second chain',state.monsterStates.every((monster,index)=>monster.hp===(affected.includes(index)?90:100))&&state.playerHp===95&&state.pendingEruptions.length===1&&state.pendingEruptions[0].remaining===1&&state.pendingEruptions[0].damage===10);
        check('collecting eruption events creates no burst or crack elements',!elements.combatPanel.querySelector('.eruption-burst,.eruption-chain'));
        const before=JSON.stringify(state);Math.random=()=>{throw new Error('Eruption presentation consumed combat randomness');};flushCombatEffects(JSON.parse(JSON.stringify(queued)));
        check('presenting explosion and crack records preserves combat and the original affected plates',JSON.stringify(state)===before&&elements.enemyRoster.querySelectorAll('.eruption-burst').length===5&&getCombatEffectCard(ids[4]).querySelector('.eruption-burst.is-center')&&elements.combatPanel.querySelector('.eruption-chain')?.dataset.targetId===ids[8]);
        const early=guarded(()=>tickPendingEruptions(.9));
        check('chain travel creates no early damage or explosion event',state.monsterStates[8].hp===100&&near(state.pendingEruptions[0].remaining,.1)&&!early.some(effect=>effect.type==='volcanicEruption'));
        const arrived=guarded(()=>tickPendingEruptions(.1));
        check('arrival emits a destination explosion at the same damage deadline without another health payment',arrived.some(effect=>effect.type==='volcanicEruption'&&effect.centerId===ids[8])&&state.monsterStates[8].hp===90&&state.playerHp===95&&state.pendingEruptions.length===0);

        fresh();const raw=[ids[1],ids[3],ids[4],ids[5],ids[7]],snapshot=JSON.parse(JSON.stringify(collect(()=>showVolcanicEruption(ids[4],raw))[0]));raw.splice(0,raw.length,ids[8]);state.skillRanks={};state.targetMonsterId=ids[8];flushCombatEffects([snapshot]);
        check('explosion target IDs survive caller-array, active-target and skill changes',snapshot.targetIds.join(',')===affected.map(index=>ids[index]).join(',')&&elements.enemyRoster.querySelectorAll('.eruption-burst').length===5&&!getCombatEffectCard(ids[8]).querySelector('.eruption-burst'));
        clear();state.monsterStates[4].hp=0;flushCombatEffects([{...snapshot,targetIds:[]}]);
        check('a dead center still gets its eruption even without living splash targets',!!getCombatEffectCard(ids[4]).querySelector('.eruption-burst.is-center'));
        clear();const custom={...chain,delay:125,flight:650,duration:1600};flushCombatEffects([custom]);
        const crack=elements.combatPanel.querySelector('.eruption-chain'),stops=[...crack.querySelectorAll('stop')];
        check('SVG cracks use stored delay, flight and trail duration throughout the reveal and fading gradient',crack.style.getPropertyValue('--eruption-delay')==='125ms'&&crack.style.getPropertyValue('--eruption-flight')==='650ms'&&crack.style.getPropertyValue('--eruption-trail-duration')==='1600ms'&&near(parseFloat(stops[0].style.getPropertyValue('--trail-delay')),125)&&near(parseFloat(stops.at(-1).style.getPropertyValue('--trail-delay')),775)&&stops.every(stop=>near(parseFloat(stop.style.getPropertyValue('--trail-duration')),650/6)));
        check('same-center chains create no visual record',guarded(()=>showEruptionChain(ids[4],ids[4],0)).length===0);
        for(const renderer of ['webgl','webgl-cracks']){
            fresh();choose(renderer);const shapes=[],trails=[];
            CombatWebGL.emit=spec=>{shapes.push(spec);return emit(spec);};CombatWebGL.eruptionChain=spec=>{trails.push(spec);return gpuChain(spec);};
            try{Math.random=()=>{throw new Error('GPU eruption presentation consumed combat randomness');};flushCombatEffects([snapshot,custom]);}finally{CombatWebGL.emit=emit;CombatWebGL.eruptionChain=gpuChain;}
            const spec=trails[0],source=getCombatEffectBounds(getCombatEffectCard(ids[4])),target=getCombatEffectBounds(getCombatEffectCard(ids[8])),frame=getCombatEffectBounds(elements.combatPanel);
            check(renderer+' cracks retain copied timing and actual plate-center endpoints on one GPU surface',trails.length===1&&spec.delay===125&&spec.flight===650&&spec.duration===1600&&near(spec.points[0].x,source.left+source.width/2-frame.left)&&near(spec.points.at(-1).y,target.top+target.height/2-frame.top)&&CombatWebGL.status().types.includes('eruptionChain')&&!elements.combatPanel.querySelector('.eruption-chain')&&document.querySelectorAll('.combat-webgl-layer').length===1);
            check(renderer+' retains its intended explosion renderer',renderer==='webgl'?shapes.filter(shape=>shape.type==='eruption').length===6&&shapes.filter(shape=>shape.type==='eruption'&&shape.style===2).filter(shape=>shape.opacity===.9).length===1&&!elements.enemyRoster.querySelector('.eruption-burst'):elements.enemyRoster.querySelectorAll('.eruption-burst').length===5&&!shapes.some(shape=>shape.type==='eruption'));
        }
        fresh();choose('webgl');const adapter=CombatWebGLEffects.eruption;CombatWebGLEffects.eruption=()=>false;CombatWebGL.eruptionChain=()=>false;
        try{flushCombatEffects([snapshot,chain]);check('unavailable GPU effects fall back to the original bursts and cracks',elements.enemyRoster.querySelectorAll('.eruption-burst').length===5&&!!elements.combatPanel.querySelector('.eruption-chain'));}finally{CombatWebGLEffects.eruption=adapter;CombatWebGL.eruptionChain=gpuChain;}
        for(const renderer of ['svg','webgl']){
            fresh();choose(renderer);toggle('projectiles',false);flushCombatEffects([snapshot,chain]);
            check(renderer+' eruptions stay available independently of the projectile setting',renderer==='svg'?!!elements.combatPanel.querySelector('.eruption-burst')&&!!elements.combatPanel.querySelector('.eruption-chain'):CombatWebGL.status().types.includes('eruption')&&CombatWebGL.status().types.includes('eruptionChain'));toggle('projectiles',true);
            for(const mode of ['hidden','map','view','missing','removed','abilities','all']){
                clear();const selected=state.selectedMap,roster=state.monsterStates,cards=[...elements.enemyRoster.children];
                if(mode==='hidden')Object.defineProperty(document,'hidden',{configurable:true,value:true});if(mode==='map')state.selectedMap='another-map';if(mode==='view')state.currentView='inventory';
                if(mode==='missing')cards.forEach(card=>card.remove());if(mode==='removed')state.monsterStates=[];if(mode==='abilities'||mode==='all')toggle(mode,false);
                try{flushCombatEffects([snapshot,chain]);check(renderer+' ignores '+mode+' explosion and chain events',!elements.combatPanel.querySelector('.eruption-burst,.eruption-chain')&&!CombatWebGL.status().active);}
                finally{restoreHidden();state.selectedMap=selected;state.currentView='map';state.monsterStates=roster;if(mode==='missing')elements.enemyRoster.append(...cards);if(mode==='abilities'||mode==='all')toggle(mode,true);}
            }
            clear();const center=state.monsterStates[4],roster=state.monsterStates;state.monsterStates=roster.filter(monster=>monster!==center);
            try{flushCombatEffects([snapshot,chain]);check(renderer+' keeps valid splash feedback without drawing a removed center or chain source',renderer==='svg'?elements.enemyRoster.querySelectorAll('.eruption-burst').length===4&&!getCombatEffectCard(ids[4]).querySelector('.eruption-burst')&&!elements.combatPanel.querySelector('.eruption-chain'):CombatWebGL.status().types.includes('eruption')&&!CombatWebGL.status().types.includes('eruptionChain'));}finally{state.monsterStates=roster;}
        }
        function fight(visuals,legacy=false){
            fresh();state.skillRanks.eruptionChain2=1;state.monsterStates.forEach(monster=>{monster.hp=5;});state.targetMonsterId=ids[4];syncLegacyEnemyState();
            let seed=9387,rolls=0,count=0;Math.random=()=>{rolls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            if(legacy){showVolcanicEruption=(centerId,targetIds)=>{if(!combatEffectEnabled('abilities'))return;const mapId=state.selectedMap;presentCombatEffect(()=>{if(isCombatView()&&state.selectedMap===mapId)presentVolcanicEruption({centerId,targetIds});});};showEruptionChain=(sourceId,targetId,delay)=>{if(!combatEffectEnabled('abilities')||sourceId===targetId)return;const mapId=state.selectedMap;presentCombatEffect(()=>{if(isCombatView()&&state.selectedMap===mapId)presentEruptionChain({sourceId,targetId,delay,flight:1000,duration:2000});});};}
            try{for(let index=0;index<300;index++){const result=simulateCombatStep(.1,visuals);count+=result.effects.filter(effect=>effect.type==='volcanicEruption'||effect.type==='eruptionChain').length;if(!visuals&&result.effects.length)throw new Error('Offline combat retained eruption effects');}}
            finally{showVolcanicEruption=showBurst;showEruptionChain=showChain;}
            return{value:JSON.stringify({state,damage:getDamageBreakdown()}),rolls,count,kills:state.kills[map.id]};
        }
        const legacy=fight(true,true),live=fight(true),offline=fight(false);
        check('eruption events preserve original seeded damage, chain choices, self-damage, deaths, rewards and random rolls',legacy.value===live.value&&legacy.rolls===live.rolls&&live.count>0&&live.kills>JSON.parse(initial).kills[map.id]);
        check('offline eruptions match live combat without retaining presentation events',offline.value===live.value&&offline.rolls===live.rolls&&offline.count===0);
        check('no browser script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push(error.stack||String(error));}
    finally{Math.random=random;showVolcanicEruption=showBurst;showEruptionChain=showChain;CombatSettings.enabled=enabled;document.createElement=create;document.createElementNS=createNS;getCombatEffectCard=getCard;getCombatEffectBounds=getBounds;performance.now=now;restoreHidden();CombatWebGL.emit=emit;CombatWebGL.eruptionChain=gpuChain;clear();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
