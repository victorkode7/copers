(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const near=(a,b)=>Math.abs(a-b)<1e-7;
    const random=Math.random,enabled=CombatSettings.enabled,create=document.createElementNS,now=performance.now;
    const getCard=getCombatEffectCard,getBounds=getCombatEffectBounds,tick=tickPendingVoidMissiles;
    const hidden=Object.getOwnPropertyDescriptor(document,'hidden'),stats=itemById.testAmulet.stats;
    const trail=CombatWebGL.trail,emit=CombatWebGL.emit,matchMedia=window.matchMedia;
    const restoreHidden=()=>{if(hidden)Object.defineProperty(document,'hidden',hidden);else delete document.hidden;};
    const choose=value=>{const select=document.getElementById('combatEffectRenderer');select.value=value;select.dispatchEvent(new Event('change'));};
    const toggle=(key,value)=>{const button=document.querySelector(`[data-effect-setting="${key}"]`);if(button.getAttribute('aria-checked')!==String(value))button.click();};
    function collect(action,show=true){const previous=combatEffects;combatEffects=show?[]:null;try{action();return combatEffects||[];}finally{combatEffects=previous;}}
    function noPresentation(action){
        try{
            const fail=()=>{throw new Error('Volley simulation accessed presentation');};
            document.createElementNS=fail;getCombatEffectCard=fail;getCombatEffectBounds=fail;CombatSettings.enabled=fail;performance.now=fail;
            Object.defineProperty(document,'hidden',{configurable:true,get:fail});return collect(action);
        }finally{document.createElementNS=create;getCombatEffectCard=getCard;getCombatEffectBounds=getBounds;CombatSettings.enabled=enabled;performance.now=now;restoreHidden();}
    }
    const clear=()=>{elements.combatPanel.querySelectorAll('.spell-effect,.void-volley-player-glow').forEach(element=>element.remove());CombatWebGL.clear();};
    try{
        for(const key of ['all','abilities','projectiles','glows'])toggle(key,true);choose('svg');
        state.currentView='map';state.isInTown=false;state.skillRanks={voidBolt:1,voidVolley:1};state.level=1;
        state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];
        itemById.testAmulet.stats={spellDamage:12,mana:100,manaRegen:5};state.upgrades={strength:0,haste:0,evasion:0};
        state.pendingEruptions=[];state.pendingVoidMissiles=[];state.shieldStacks=0;clearFury();clearGatheringPower();
        const map=currentMap();map.drops=[];map.itemDrops=[];
        map.spawns=[{id:'volleyMob',monsterId:worldContent.monsters[0].id,count:3,overrides:{health:1000,attackDamage:1,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:.5,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);clearOfflineRecap();state.playerHp=getPlayerMaxHealth();state.combatPaused=false;
        state.manaCapacity=getPlayerMaxMana();state.playerMana=state.manaCapacity;state.voidCharges=5;state.attackTimer=0;render();clear();
        elements.combatPanel.scrollIntoView({block:'start'});await new Promise(resolve=>requestAnimationFrame(resolve));
        const initial=JSON.stringify(state),ids=state.monsterStates.map(monster=>monster.id),damage=getSpellDamage();
        function fresh(){resetVoidMissilePresentation();Object.assign(state,JSON.parse(initial));combatStatCache=null;resetDamageBreakdown(map.id);render();clear();Math.random=()=>0;}
        Math.random=()=>0;let cast;
        const events=noPresentation(()=>{cast=castVoidVolley();tickPendingVoidMissiles(.2);});
        const event=events.find(effect=>effect.type==='voidVolleyCast'),snapshot=JSON.parse(JSON.stringify(events));
        check('Volley simulation queues serializable IDs and schedules without HTML, settings, visibility or wall-clock reads',cast&&event?.hits.length===10&&events.every(effect=>typeof effect==='object')&&event.hits.every(hit=>Number.isInteger(hit.missileId)&&!('missile' in hit)));
        check('casting spends ten mana and five charges while all damage waits for arrival',state.playerMana===JSON.parse(initial).playerMana-10&&state.voidCharges===0&&state.monsterStates.every(monster=>monster.hp===1000)&&near(state.pendingVoidMissiles[0].remaining,.4));
        check('collecting a Volley creates no overlay or glow',!elements.combatPanel.querySelector('.spell-effect,.void-volley-player-glow'));
        const before=JSON.stringify(state);Math.random=()=>{throw new Error('Presentation consumed combat randomness');};flushCombatEffects(snapshot);
        let svg=elements.combatPanel.querySelector('.spell-void-volley'),heads=[...svg.querySelectorAll('.void-missile')],rings=[...svg.querySelectorAll('.void-impact')];
        check('SVG Volley preserves its curved fan, acceleration, head size and impact radius without changing combat',JSON.stringify(state)===before&&heads.length===10&&[...svg.querySelectorAll('path')].every(path=>path.getAttribute('d').includes('C')&&path.style.animationTimingFunction.includes('cubic-bezier'))&&heads.every(head=>head.getAttribute('r')==='3.5'&&head.querySelector('animateMotion').getAttribute('calcMode')==='spline')&&rings.every(ring=>ring.getAttribute('r')==='18'));
        check('an aged batch starts partway through each snapshotted flight',heads.every((head,index)=>near(parseFloat(head.style.animationDelay),(event.hits[index].schedule.delay-.2)*1000)&&near(parseFloat(head.nextElementSibling.style.animationDelay),(event.hits[index].schedule.arrival-.2)*1000)));
        const glow=elements.playerHealthPanel.querySelector('.void-volley-player-glow'),until=Number(glow.dataset.releaseAt),launch=Number(glow.dataset.launchAt);
        showVoidVolleyPlayerGlow(.01,.8);check('overlapping player glows retain the earliest launch and latest release',Number(glow.dataset.releaseAt)===until&&Number(glow.dataset.launchAt)===launch);
        const first=state.pendingVoidMissiles[0],firstRing=getVoidMissileVisual(first).circle;
        const arrival=noPresentation(()=>tickPendingVoidMissiles(.4));flushCombatEffects(arrival);
        check('arrival consumes the owned ring without creating a duplicate impact',state.monsterStates[0].hp===1000-damage&&firstRing.isConnected&&!getVoidMissileVisual(first)&&!elements.combatPanel.querySelector('.spell-impact-effect')&&voidMissileTimelines.size===9);
        flushCombatEffects(collect(()=>tickPendingVoidMissiles(.5)));
        check('resolved volleys release all transient timeline and visual references',state.pendingVoidMissiles.length===0&&voidMissileTimelines.size===0&&voidMissileVisuals.size===0);

        fresh();const batched=collect(()=>{castVoidVolley();tickPendingVoidMissiles(.6);});flushCombatEffects(batched);
        check('launch and arrival in one batch share one ring at contact',elements.combatPanel.querySelectorAll('.spell-void-volley .void-impact').length===10&&!elements.combatPanel.querySelector('.spell-impact-effect')&&near(parseFloat(elements.combatPanel.querySelector('.void-impact').style.animationDelay),0));
        for(const renderer of ['svg','webgl']){
            fresh();choose(renderer);const launchEvents=collect(()=>castVoidVolley());flushCombatEffects(launchEvents);
            const missile=state.pendingVoidMissiles[0],visual=getVoidMissileVisual(missile),oldRing=visual.circle;
            const remove=oldRing.remove;let removed=false;oldRing.remove=function(){removed=true;return remove.call(this);};
            state.monsterStates[0].hp=0;const redirects=noPresentation(()=>tickPendingVoidMissiles(.6));flushCombatEffects(redirects);
            check(renderer+' redirects cancel the old ring and preserve the extra travel time',removed&&visual.cancelled&&!getVoidMissileVisual(missile)&&redirects.some(effect=>effect.type==='voidMissileCancelled')&&redirects.some(effect=>effect.type==='voidVolleyCast'&&effect.hits[0].sourceId===ids[0]&&near(effect.hits[0].schedule.flight,.2))&&state.monsterStates[1].hp===1000&&state.pendingVoidMissiles.some(hit=>hit.targetId===ids[1]&&near(hit.remaining,.2)));
        }
        fresh();choose('svg');const cancelled=collect(()=>{castVoidVolley();state.monsterStates[0].hp=0;tickPendingVoidMissiles(.6);});flushCombatEffects(cancelled);
        check('cancellation before presentation omits the abandoned missile and ring',elements.combatPanel.querySelector('.spell-void-volley').querySelectorAll('.void-missile').length===9&&elements.combatPanel.querySelectorAll('.spell-void-volley').length===2);
        fresh();const abandoned=collect(()=>{castVoidVolley();state.monsterStates.forEach(monster=>{monster.hp=0;});tickPendingVoidMissiles(2);});flushCombatEffects(abandoned);
        check('with no replacement target a Volley creates no phantom flights and releases its records',!state.pendingVoidMissiles.length&&!voidMissileTimelines.size&&!voidMissileVisuals.size&&!elements.combatPanel.querySelector('.spell-effect'));

        fresh();const loaded=JSON.parse(JSON.stringify({targetId:ids[0],damage,remaining:.1}));state.pendingVoidMissiles=[loaded];
        const loadedEvents=noPresentation(()=>tickPendingVoidMissiles(.1));flushCombatEffects(loadedEvents);
        check('missiles restored without transient IDs still damage and show a fallback impact',state.monsterStates[0].hp===1000-damage&&loadedEvents.some(effect=>effect.type==='voidMissileImpact'&&effect.missileId===undefined)&&!!elements.combatPanel.querySelector('.spell-impact-effect')&&Object.keys(loaded).sort().join(',')==='damage,remaining,targetId');
        fresh();toggle('projectiles',false);flushCombatEffects(collect(()=>castVoidVolley()));flushCombatEffects(collect(()=>tickPendingVoidMissiles(2)));
        check('projectiles off retains ability impact feedback without projectile or player-glow work',!elements.combatPanel.querySelector('.void-missile,.void-volley-player-glow')&&elements.combatPanel.querySelectorAll('.spell-impact-effect').length===10&&!voidMissileTimelines.size);toggle('projectiles',true);
        fresh();toggle('glows',false);flushCombatEffects(collect(()=>castVoidVolley()));
        check('glows off retains missiles while suppressing player and charge flashes',!!elements.combatPanel.querySelector('.void-missile')&&!elements.combatPanel.querySelector('.void-volley-player-glow'));toggle('glows',true);

        fresh();choose('webgl');const gpuEvents=collect(()=>{castVoidVolley();tickPendingVoidMissiles(.2);}),trails=[],shapes=[];
        CombatWebGL.trail=spec=>{trails.push(spec);return trail(spec);};CombatWebGL.emit=spec=>{shapes.push(spec);return emit(spec);};flushCombatEffects(gpuEvents);CombatWebGL.trail=trail;CombatWebGL.emit=emit;
        check('GPU Volley retains accelerated glowing trails and the same aged contact deadlines',trails.filter(spec=>spec.type==='spell').length===10&&trails.filter(spec=>spec.type==='spell').every(spec=>spec.style===15&&spec.strokeWidth===4&&spec.glowRadius===6)&&near(trails[0].delay,0)&&near(trails[0].flight,400)&&shapes.filter(spec=>spec.type==='spellImpact').some(spec=>near(spec.delay,400))&&!elements.combatPanel.querySelector('.spell-effect')&&CombatWebGL.status().types.includes('playerGlow'));
        resetVoidMissilePresentation();check('a presentation reset clears old GPU work and transient references',!CombatWebGL.status().active&&!voidMissileTimelines.size&&!voidMissileVisuals.size);
        flushCombatEffects(gpuEvents);check('events from a prior encounter cannot redraw after reset',!CombatWebGL.status().active);
        fresh();choose('svg');const normalMatch=window.matchMedia;
        window.matchMedia=query=>query==='(prefers-reduced-motion: reduce)'?{matches:true}:normalMatch.call(window,query);
        try{flushCombatEffects(collect(()=>castVoidVolley()));svg=elements.combatPanel.querySelector('.spell-void-volley');check('reduced-motion routes flash at contact instead of launch',near(parseFloat(svg.querySelector('path').style.animationDelay),600)&&near(parseFloat(elements.playerHealthPanel.querySelector('.void-volley-player-glow').style.getPropertyValue('--void-volley-glow-windup')),600));}finally{window.matchMedia=normalMatch;}

        for(const mode of ['hidden','map','view','missing','abilities','all']){
            fresh();choose('webgl');const pending=collect(()=>castVoidVolley()),selected=state.selectedMap;
            if(mode==='hidden')Object.defineProperty(document,'hidden',{configurable:true,value:true});
            if(mode==='map')state.selectedMap='another-map';
            if(mode==='view')state.currentView='inventory';
            const card=getCombatEffectCard(ids[0]),next=card.nextSibling;if(mode==='missing')card.remove();
            if(mode==='abilities'||mode==='all')toggle(mode,false);
            try{flushCombatEffects(pending);check(mode+' suppresses queued Volley flights and impacts',!CombatWebGL.status().types.some(type=>['spell','spellImpact','playerGlow'].includes(type))&&!elements.combatPanel.querySelector('.spell-effect,.void-volley-player-glow'));}
            finally{restoreHidden();state.selectedMap=selected;state.currentView='map';if(mode==='missing')elements.enemyRoster.insertBefore(card,next);if(mode==='abilities'||mode==='all')toggle(mode,true);}
        }
        fresh();choose('svg');flushCombatEffects(collect(()=>castVoidVolley()));
        const discarded=collect(()=>{state.monsterStates.forEach(monster=>{monster.hp=0;});tickPendingVoidMissiles(2);});
        check('discarded batches retain only data until cleanup',discarded.every(effect=>typeof effect==='object'));
        pruneVoidMissilePresentations();check('discarding a catch-up batch releases cancelled rings and references',!voidMissileTimelines.size&&!voidMissileVisuals.size&&!elements.combatPanel.querySelector('.void-impact'));

        // Reference the original arrival algorithm, without any visual hooks.
        function legacyTick(elapsed){let remaining=elapsed;while(state.pendingVoidMissiles.length){const next=Math.min(...state.pendingVoidMissiles.map(hit=>hit.remaining)),step=Math.min(remaining,next);state.pendingVoidMissiles.forEach(hit=>{hit.remaining=Math.max(0,hit.remaining-step);});remaining-=step;const arrived=state.pendingVoidMissiles.filter(hit=>hit.remaining<1e-8);if(!arrived.length)break;state.pendingVoidMissiles=state.pendingVoidMissiles.filter(hit=>hit.remaining>=1e-8);for(const hit of arrived){const target=state.monsterStates.find(monster=>monster.id===hit.targetId&&monster.hp>0);if(target)applyDamageToMonster(target,hit.damage,'spell','voidVolley');else{const living=state.monsterStates.filter(monster=>monster.hp>0);if(living.length){const replacement=living[Math.floor(Math.random()*living.length)];state.pendingVoidMissiles.push({...hit,targetId:replacement.id,remaining:voidMissileTiming.redirect});}}}if(remaining<1e-8)break;}}
        function fight(show,legacy=false,long=false){fresh();state.monsterStates.forEach(monster=>{monster.hp=1;});let seed=9387,rolls=0,casts=0;Math.random=()=>{rolls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};if(legacy)tickPendingVoidMissiles=legacyTick;try{if(long){collect(()=>{castVoidVolley();tickPendingVoidMissiles(2);},show);pruneVoidMissilePresentations();}else for(let index=0;index<200;index++){const result=simulateCombatStep(.1,show);casts+=result.effects.filter(effect=>effect.type==='voidVolleyCast').length;pruneVoidMissilePresentations();}}finally{tickPendingVoidMissiles=tick;}return{value:JSON.stringify({state,damage:getDamageBreakdown()}),rolls,casts};}
        const baseline=fight(false,true),live=fight(true),offline=fight(false),longBaseline=fight(false,true,true),longLive=fight(true,false,true);
        check('seeded live and offline combat preserve original damage, mana, charges, rewards and random-roll order',baseline.value===live.value&&live.value===offline.value&&baseline.rolls===live.rolls&&live.rolls===offline.rolls&&live.casts>0&&offline.casts===0);
        check('a long step preserves repeated redirects, deaths and random rolls',longBaseline.value===longLive.value&&longBaseline.rolls===longLive.rolls);
        fresh();const ignored=collect(()=>castVoidVolley(),false);check('offline casting retains no presentation events or timelines',ignored.length===0&&!voidMissileTimelines.size&&state.pendingVoidMissiles.length===10);
        check('no browser script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push(error.stack||String(error));}
    finally{Math.random=random;CombatSettings.enabled=enabled;document.createElementNS=create;performance.now=now;getCombatEffectCard=getCard;getCombatEffectBounds=getBounds;tickPendingVoidMissiles=tick;restoreHidden();itemById.testAmulet.stats=stats;CombatWebGL.trail=trail;CombatWebGL.emit=emit;window.matchMedia=matchMedia;clear();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
