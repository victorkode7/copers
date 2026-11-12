(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const near=(a,b)=>Math.abs(a-b)<1e-7;
    const random=Math.random,show=showVoidVortex,enabled=CombatSettings.enabled,create=document.createElementNS;
    const getCard=getCombatEffectCard,getBounds=getCombatEffectBounds,now=performance.now,emit=CombatWebGL.emit,trail=CombatWebGL.trail;
    const hidden=Object.getOwnPropertyDescriptor(document,'hidden'),stats=itemById.testAmulet.stats;
    const matchMedia=window.matchMedia,setTimeout=window.setTimeout;
    const restoreHidden=()=>{if(hidden)Object.defineProperty(document,'hidden',hidden);else delete document.hidden;};
    const choose=value=>{const select=document.getElementById('combatEffectRenderer');select.value=value;select.dispatchEvent(new Event('change'));};
    const toggle=(key,value)=>{const button=document.querySelector(`[data-effect-setting="${key}"]`);if(button.getAttribute('aria-checked')!==String(value))button.click();};
    const clear=()=>{elements.combatPanel.querySelectorAll('.spell-effect,.void-volley-player-glow').forEach(element=>element.remove());CombatWebGL.clear();};
    function collect(action,visuals=true){const previous=combatEffects;combatEffects=visuals?[]:null;try{action();return combatEffects||[];}finally{combatEffects=previous;}}
    function guarded(action){
        try{
            const fail=()=>{throw new Error('Vortex simulation accessed presentation');};
            document.createElementNS=fail;getCombatEffectCard=fail;getCombatEffectBounds=fail;performance.now=fail;CombatSettings.enabled=fail;
            Object.defineProperty(document,'hidden',{configurable:true,get:fail});return collect(action);
        }finally{document.createElementNS=create;getCombatEffectCard=getCard;getCombatEffectBounds=getBounds;performance.now=now;CombatSettings.enabled=enabled;restoreHidden();}
    }
    try{
        for(const key of ['all','abilities','projectiles','glows'])toggle(key,true);choose('svg');
        state.currentView='map';state.isInTown=false;state.skillRanks={voidVortex:1};state.level=1;
        state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];
        itemById.testAmulet.stats={spellDamage:12,mana:100,manaRegen:10};state.upgrades={strength:0,haste:0,evasion:0};
        state.pendingEruptions=[];state.pendingVoidMissiles=[];state.shieldStacks=0;state.voidCharges=0;clearFury();clearGatheringPower();
        const map=currentMap();map.drops=[];map.itemDrops=[];
        map.spawns=[{id:'vortexMob',monsterId:worldContent.monsters[0].id,count:9,overrides:{health:1000,attackDamage:1,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:.5,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);clearOfflineRecap();state.playerHp=getPlayerMaxHealth();state.combatPaused=false;
        state.manaCapacity=getPlayerMaxMana();state.playerMana=state.manaCapacity;state.attackTimer=0;render();state.monsterColumns=3;clear();
        elements.combatPanel.scrollIntoView({block:'start'});await new Promise(resolve=>requestAnimationFrame(resolve));
        const initial=JSON.stringify(state),ids=state.monsterStates.map(monster=>monster.id),mana=state.playerMana,damage=getSpellDamage()*.75;
        function fresh(){resetVoidMissilePresentation();Object.assign(state,JSON.parse(initial));combatStatCache=null;resetDamageBreakdown(map.id);render();state.monsterColumns=3;clear();Math.random=()=>.5;}
        let cast;const queued=guarded(()=>{cast=castVoidVortex();}),event=queued.find(effect=>effect.type==='voidVortexCast');
        check('a real row cast queues plain target IDs and delay without HTML, visual settings, visibility or wall-clock access',cast&&event?.mapId===map.id&&event.targetIds.join(',')===ids.slice(0,3).join(',')&&event.visualDelay===0&&queued.every(effect=>typeof effect==='object'));
        check('Vortex retains 75 percent row damage, its twenty-mana cost and capped charges',state.monsterStates.slice(0,3).every(monster=>monster.hp===1000-damage)&&state.monsterStates.slice(3).every(monster=>monster.hp===1000)&&state.playerMana===mana-20&&state.voidCharges===5);
        check('collecting a Vortex draws no spell overlay',!elements.combatPanel.querySelector('.spell-effect'));
        const before=JSON.stringify(state);Math.random=()=>{throw new Error('Vortex presentation consumed combat randomness');};flushCombatEffects(queued);
        let svg=elements.combatPanel.querySelector('.spell-void-vortex');
        const boxes=event.targetIds.map(id=>getCombatEffectBounds(getCombatEffectCard(id).querySelector('.enemy-mark'))),frame=getCombatEffectBounds(elements.combatPanel);
        const contacts=[...svg.querySelectorAll('.vortex-contact')],streams=[...svg.querySelectorAll('.vortex-stream')];
        check('SVG Vortex draws styled inward spirals and sprite-centered contacts without changing combat state',JSON.stringify(state)===before&&streams.length===16&&contacts.length===3&&!svg.querySelector('ellipse')&&contacts.every((ring,index)=>ring.dataset.targetId===ids[index]&&near(Number(ring.getAttribute('cx')),boxes[index].left+boxes[index].width/2-frame.left)&&near(Number(ring.getAttribute('cy')),boxes[index].top+boxes[index].height/2-frame.top))&&getComputedStyle(svg.querySelector('.vortex-stream-edge')).stroke==='rgb(199, 161, 255)'&&getComputedStyle(svg.querySelector('.vortex-curl')).animationName==='vortex-inward-curl');

        fresh();state.skillRanks.echoingVoid=1;Math.random=()=>.329;const echoed=guarded(()=>castVoidVortex()),casts=echoed.filter(effect=>effect.type==='voidVortexCast');
        check('Echoing Void repeats once for one mana payment and keeps its 180 ms visual delay',casts.length===2&&casts[0].visualDelay===0&&casts[1].visualDelay===180&&state.playerMana===mana-20&&state.monsterStates.slice(0,3).every(monster=>monster.hp===1000-damage*2)&&state.voidCharges===5);
        const timeouts=[];window.setTimeout=(callback,delay,...args)=>{timeouts.push({callback,delay});return setTimeout(callback,delay,...args);};
        try{flushCombatEffects(casts);}finally{window.setTimeout=setTimeout;}
        const overlays=[...elements.combatPanel.querySelectorAll('.spell-void-vortex')];
        check('echo spirals retain their 180 ms delay while contacts remain immediate',overlays.length===2&&[...overlays[1].querySelectorAll('.vortex-stream')].every(path=>near(parseFloat(path.style.animationDelay),180))&&[...overlays[1].querySelectorAll('.vortex-contact')].every(ring=>getComputedStyle(ring).animationDelay==='0s')&&timeouts.some(timer=>timer.delay===580)&&timeouts.some(timer=>timer.delay===760));
        timeouts.find(timer=>timer.delay===580).callback();check('the first Vortex cleanup leaves the echoed overlay intact',!overlays[0].isConnected&&overlays[1].isConnected);timeouts.find(timer=>timer.delay===760).callback();
        fresh();state.skillRanks.echoingVoid=1;Math.random=()=>.33;
        check('the 33 percent boundary does not trigger an echo',collect(()=>castVoidVortex()).filter(effect=>effect.type==='voidVortexCast').length===1&&state.monsterStates[0].hp===1000-damage);
        fresh();state.skillRanks.echoingVoid=1;state.monsterStates[0].hp=1;Math.random=()=>0;const lethal=collect(()=>castVoidVortex()).filter(effect=>effect.type==='voidVortexCast');
        check('echo targets skip the first hit kill and remain in the original row',lethal.length===2&&lethal[0].targetIds.length===3&&lethal[1].targetIds.join(',')===ids.slice(1,3).join(',')&&state.monsterStates[0].hp===0&&state.monsterStates[1].hp===1000-damage*2&&state.monsterStates.slice(3).every(monster=>monster.hp===1000));
        fresh();state.skillRanks.echoingVoid=1;state.monsterStates.slice(0,3).forEach(monster=>{monster.hp=1;});Math.random=()=>0;
        check('a fully killed row cannot echo onto another row',collect(()=>castVoidVortex()).filter(effect=>effect.type==='voidVortexCast').length===1&&state.monsterStates.slice(3).every(monster=>monster.hp===1000));
        fresh();state.skillRanks.voidVolley=1;const combined=guarded(()=>castVoidVortex());
        check('Vortex-generated charges still release a separately paid Volley',combined.some(effect=>effect.type==='voidVortexCast')&&combined.some(effect=>effect.type==='voidVolleyCast')&&state.pendingVoidMissiles.length===10&&state.playerMana===mana-30&&state.voidCharges===0);

        fresh();const rawIds=ids.slice(0,3),snapshot=JSON.parse(JSON.stringify(collect(()=>showVoidVortex(rawIds,180))[0]));rawIds.splice(0,3,ids[6]);state.skillRanks={};state.targetMonsterId=ids[6];
        flushCombatEffects([snapshot]);svg=elements.combatPanel.querySelector('.spell-void-vortex');
        check('target arrays and delay are copied before caller, skill or active-target changes',snapshot.targetIds.join(',')===ids.slice(0,3).join(',')&&svg.querySelector('.vortex-contact').dataset.targetId===ids[0]&&parseFloat(svg.querySelector('.vortex-stream').style.animationDelay)===180);
        clear();choose('webgl');const specs=[],trails=[];CombatWebGL.emit=spec=>{specs.push(spec);return emit(spec);};CombatWebGL.trail=spec=>{trails.push(spec);return trail(spec);};
        try{Math.random=()=>{throw new Error('GPU presentation consumed combat randomness');};flushCombatEffects([snapshot]);}finally{CombatWebGL.emit=emit;CombatWebGL.trail=trail;}
        check('GPU Vortex draws shared spiral trails and immediate contacts instead of old shrinking rings',trails.length===16&&trails.filter(spec=>spec.style===17).length===12&&trails.every(spec=>spec.type==='vortex'&&spec.category==='abilities'&&spec.duration===560&&spec.delay===180&&spec.opacity>0&&spec.opacity<=1)&&specs.length===6&&specs.every(spec=>spec.type==='vortexImpact'&&spec.style!==10)&&!elements.combatPanel.querySelector('.spell-effect')&&document.querySelectorAll('.combat-webgl-layer').length===1);
        clear();const adapter=CombatWebGLEffects.vortex;CombatWebGLEffects.vortex=()=>false;
        try{flushCombatEffects([snapshot]);check('an unavailable GPU adapter keeps SVG fallback and echo timing',!!elements.combatPanel.querySelector('.spell-void-vortex')&&parseFloat(elements.combatPanel.querySelector('.vortex-stream').style.animationDelay)===180);}finally{CombatWebGLEffects.vortex=adapter;}
        clear();choose('svg');window.matchMedia=query=>query==='(prefers-reduced-motion: reduce)'?{matches:true}:matchMedia.call(window,query);
        try{flushCombatEffects([snapshot]);check('reduced-motion Vortex shows contact flashes without moving spirals',!!elements.combatPanel.querySelector('.vortex-contact')&&!elements.combatPanel.querySelector('.vortex-stream'));}finally{window.matchMedia=matchMedia;}
        for(const renderer of ['svg','webgl']){
            choose(renderer);clear();toggle('projectiles',false);flushCombatEffects([snapshot]);
            check(renderer+' Vortex remains independent of the projectile switch',renderer==='svg'?!!elements.combatPanel.querySelector('.spell-void-vortex'):CombatWebGL.status().types.includes('vortex'));toggle('projectiles',true);
            for(const mode of ['hidden','map','view','missing','removed','abilities','all']){
                clear();const selected=state.selectedMap,roster=state.monsterStates,cards=snapshot.targetIds.map(id=>getCombatEffectCard(id)),siblings=cards.map(card=>card.nextSibling);
                if(mode==='hidden')Object.defineProperty(document,'hidden',{configurable:true,value:true});
                if(mode==='map')state.selectedMap='another-map';if(mode==='view')state.currentView='inventory';
                if(mode==='missing')cards.forEach(card=>card.remove());if(mode==='removed')state.monsterStates=roster.filter(monster=>!snapshot.targetIds.includes(monster.id));
                if(mode==='abilities'||mode==='all')toggle(mode,false);
                try{flushCombatEffects([snapshot]);check(renderer+' ignores '+mode+' Vortex effects',!elements.combatPanel.querySelector('.spell-effect')&&!CombatWebGL.status().active);}
                finally{restoreHidden();state.selectedMap=selected;state.currentView='map';state.monsterStates=roster;if(mode==='missing')for(let index=cards.length-1;index>=0;index--)elements.enemyRoster.insertBefore(cards[index],siblings[index]);if(mode==='abilities'||mode==='all')toggle(mode,true);}
            }
        }
        fresh();state.playerMana=19;let denied;
        check('insufficient mana creates no Vortex event or damage',collect(()=>{denied=castVoidVortex();}).length===0&&!denied&&state.monsterStates.every(monster=>monster.hp===1000));
        check('an empty visual Vortex cast creates no event',collect(()=>showVoidVortex([])).length===0);
        function fight(visuals,legacy=false){
            fresh();state.skillRanks.echoingVoid=1;state.skillRanks.voidVolley=1;state.monsterStates.forEach(monster=>{monster.hp=5;});syncLegacyEnemyState();
            let seed=9387,rolls=0,count=0;Math.random=()=>{rolls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            if(legacy)showVoidVortex=(targetIds,visualDelay=0)=>{if(!combatEffectEnabled('abilities'))return;const mapId=state.selectedMap;presentCombatEffect(()=>{if(isCombatView()&&state.selectedMap===mapId)presentVoidVortexCast({targetIds,visualDelay});});};
            try{for(let index=0;index<200;index++){const result=simulateCombatStep(.1,visuals);count+=result.effects.filter(effect=>effect.type==='voidVortexCast').length;if(!visuals&&result.effects.length)throw new Error('Offline combat retained Vortex effects');pruneVoidMissilePresentations();}}
            finally{showVoidVortex=show;}
            return{value:JSON.stringify({state,damage:getDamageBreakdown()}),rolls,count,kills:state.kills[map.id]};
        }
        const legacy=fight(true,true),live=fight(true),offline=fight(false);
        check('Vortex events preserve seeded damage, mana, charges, deaths, rewards and random-roll order',legacy.value===live.value&&legacy.rolls===live.rolls&&live.count>0&&live.kills>JSON.parse(initial).kills[map.id]);
        check('offline Vortex combat matches live results without retaining visual events',offline.value===live.value&&offline.rolls===live.rolls&&offline.count===0);
        check('no browser script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push(error.stack||String(error));}
    finally{Math.random=random;showVoidVortex=show;CombatSettings.enabled=enabled;document.createElementNS=create;getCombatEffectCard=getCard;getCombatEffectBounds=getBounds;performance.now=now;CombatWebGL.emit=emit;CombatWebGL.trail=trail;restoreHidden();itemById.testAmulet.stats=stats;window.matchMedia=matchMedia;window.setTimeout=setTimeout;clear();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
