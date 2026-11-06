(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const near=(a,b)=>Math.abs(a-b)<1e-7;
    const random=Math.random,show=showShieldSlamWave,enabled=CombatSettings.enabled,create=document.createElementNS;
    const getCard=getCombatEffectCard,getBounds=getCombatEffectBounds,now=performance.now,emit=CombatWebGL.emit;
    const hidden=Object.getOwnPropertyDescriptor(document,'hidden'),stats=itemById.testAmulet.stats;
    const restoreHidden=()=>{if(hidden)Object.defineProperty(document,'hidden',hidden);else delete document.hidden;};
    const choose=value=>{const select=document.getElementById('combatEffectRenderer');select.value=value;select.dispatchEvent(new Event('change'));};
    const toggle=(key,value)=>{const button=document.querySelector(`[data-effect-setting="${key}"]`);if(button.getAttribute('aria-checked')!==String(value))button.click();};
    const clear=()=>{elements.combatPanel.querySelectorAll('.shield-slam-wave').forEach(element=>element.remove());CombatWebGL.clear();};
    function collect(action,visuals=true){const previous=combatEffects;combatEffects=visuals?[]:null;try{action();return combatEffects||[];}finally{combatEffects=previous;}}
    function guarded(action){
        try{
            const fail=()=>{throw new Error('Shield Slam simulation accessed presentation');};
            document.createElementNS=fail;getCombatEffectCard=fail;getCombatEffectBounds=fail;performance.now=fail;CombatSettings.enabled=fail;
            Object.defineProperty(document,'hidden',{configurable:true,get:fail});return collect(action);
        }finally{document.createElementNS=create;getCombatEffectCard=getCard;getCombatEffectBounds=getBounds;performance.now=now;CombatSettings.enabled=enabled;restoreHidden();}
    }
    try{
        for(const key of ['all','abilities','projectiles','glows'])toggle(key,true);choose('svg');
        state.currentView='map';state.isInTown=false;state.skillRanks={shieldGenerator:1,shieldSlam:1,overflowingSlam:1};state.level=1;
        state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];itemById.testAmulet.stats={damage:98};
        state.upgrades={strength:0,haste:0,evasion:0};state.pendingEruptions=[];state.pendingVoidMissiles=[];state.shieldStacks=0;state.voidCharges=0;clearFury();clearGatheringPower();
        const map=currentMap();map.drops=[];map.itemDrops=[];
        map.spawns=[{id:'slamEventMob',monsterId:worldContent.monsters[0].id,count:30,overrides:{health:1000,attackDamage:0,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:.5,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);clearOfflineRecap();state.playerHp=getPlayerMaxHealth();state.combatPaused=false;state.attackTimer=0;render();clear();
        elements.combatPanel.scrollIntoView({block:'start'});await new Promise(resolve=>requestAnimationFrame(resolve));
        const initial=JSON.stringify(state),ids=state.monsterStates.map(monster=>monster.id);
        function fresh(){resetVoidMissilePresentation();Object.assign(state,JSON.parse(initial));combatStatCache=null;resetDamageBreakdown(map.id);render();clear();Math.random=()=>.5;}
        state.shieldStacks=10;const queued=guarded(()=>tryShieldSlam()),event=queued.find(effect=>effect.type==='shieldSlamWave');
        check('a real slam emits a plain map and ordered-hit record without HTML, visual settings, visibility or wall-clock access',event?.mapId===map.id&&event.hitIds.join(',')===ids[0]&&queued.every(effect=>typeof effect==='object'));
        check('Shield Slam consumes half the shields and retains its original physical damage',state.shieldStacks===5&&state.monsterStates[0].hp===500&&state.monsterStates.slice(1).every(monster=>monster.hp===1000)&&!combatAbilities.resolvingShieldSlam);
        check('collecting a slam creates no visual wave',!elements.combatPanel.querySelector('.shield-slam-wave'));
        const before=JSON.stringify(state);Math.random=()=>{throw new Error('Shield presentation consumed combat randomness');};flushCombatEffects(JSON.parse(JSON.stringify(queued)));
        check('presenting a single hit preserves state and creates one shield, pressure ring and six shards',JSON.stringify(state)===before&&elements.combatPanel.querySelectorAll('.shield-slam-stamp').length===1&&elements.combatPanel.querySelectorAll('.shield-slam-pressure').length===1&&elements.combatPanel.querySelectorAll('.shield-slam-shard').length===6);
        fresh();state.monsterStates[0].hp=50;state.monsterStates[1].hp=60;state.shieldStacks=10;
        const overflow=collect(()=>tryShieldSlam()),overflowEvent=overflow.find(effect=>effect.type==='shieldSlamWave');
        check('overflow records the original hit order while damage, kill rewards and shield regeneration remain in simulation',overflowEvent.hitIds.join(',')===ids.slice(0,3).join(',')&&state.monsterStates[0].hp===0&&state.monsterStates[1].hp===0&&state.monsterStates[2].hp===610&&state.shieldStacks===7&&state.gold===JSON.parse(initial).gold+2);
        flushCombatEffects([overflowEvent]);check('killed targets still receive their recorded slam impacts',elements.combatPanel.querySelectorAll('.shield-slam-impact').length===3&&elements.combatPanel.querySelector('.shield-slam-impact').dataset.monsterId===ids[0]);
        fresh();const raw=[ids[8],ids[0],ids[4]],snapshot=JSON.parse(JSON.stringify(collect(()=>showShieldSlamWave(raw))[0]));raw.splice(0,3,ids[29]);state.skillRanks={};state.targetMonsterId=ids[29];flushCombatEffects([snapshot]);
        let wave=elements.combatPanel.querySelector('.shield-slam-wave'),impacts=[...wave.querySelectorAll('.shield-slam-impact')];
        check('copied hit IDs preserve their order after caller, active-target and skill changes',snapshot.hitIds.join(',')===[ids[8],ids[0],ids[4]].join(',')&&impacts.map(impact=>impact.dataset.monsterId).join(',')===snapshot.hitIds.join(',')&&impacts.every((impact,index)=>parseFloat(impact.style.getPropertyValue('--shield-slam-delay'))===index*90)&&wave.style.getPropertyValue('--shield-slam-duration')==='860ms');
        check('shield stamps stay centered on current plate positions',impacts.every(impact=>{const box=getCombatEffectBounds(getCombatEffectCard(impact.dataset.monsterId)),frame=getCombatEffectBounds(wave),matrix=impact.transform.baseVal.consolidate().matrix;return Math.abs(matrix.e-(box.left+box.width/2-frame.left))<.01&&Math.abs(matrix.f-(box.top+box.height/2-frame.top))<.01;}));
        impacts[0].dispatchEvent(new Event('animationend',{bubbles:true}));check('child animation completion cannot remove the whole wave',wave.isConnected);wave.dispatchEvent(new Event('animationend'));check('completed waves release their SVG overlay',!wave.isConnected);
        const crowded={...snapshot,hitIds:ids};flushCombatEffects([crowded]);wave=elements.combatPanel.querySelector('.shield-slam-wave');impacts=[...wave.querySelectorAll('.shield-slam-impact')];
        check('long hit lists retain first and last impacts while capping work at twelve',impacts.length===12&&impacts[0].dataset.monsterId===ids[0]&&impacts.at(-1).dataset.monsterId===ids.at(-1)&&impacts.every((impact,index)=>impact.dataset.monsterId===ids[Math.round(index*(ids.length-1)/11)]));
        for(let index=0;index<12;index++)flushCombatEffects([crowded]);check('rapid SVG slams retain their six-wave cap',elements.combatPanel.querySelectorAll('.shield-slam-wave').length===6);
        clear();choose('webgl');const specs=[];CombatWebGL.emit=spec=>{specs.push(spec);return emit(spec);};
        try{Math.random=()=>{throw new Error('GPU Shield Slam consumed combat randomness');};flushCombatEffects([crowded]);}finally{CombatWebGL.emit=emit;}
        const stamps=specs.filter(spec=>spec.type==='shield'&&spec.style===5),shapes=specs.filter(spec=>spec.type==='shield');
        check('GPU slams retain twelve sampled shields, pressure rings and six shards per impact',stamps.length===12&&shapes.length===96&&shapes.filter(spec=>spec.style===1).length===12&&shapes.filter(spec=>spec.style===3).length===72&&stamps.every((spec,index)=>near(spec.delay,index*540/11)&&spec.duration===650&&spec.color.join(',')===[.6,.85,1].join(','))&&!elements.combatPanel.querySelector('.shield-slam-wave')&&document.querySelectorAll('.combat-webgl-layer').length===1);
        const first=getCombatEffectBounds(getCombatEffectCard(ids[0])),last=getCombatEffectBounds(getCombatEffectCard(ids.at(-1))),frame=getCombatEffectBounds(elements.combatPanel);
        check('GPU sampling keeps the first and last plate centers',near(stamps[0].x,first.left+first.width/2-frame.left)&&near(stamps.at(-1).x,last.left+last.width/2-frame.left)&&near(stamps.at(-1).y,last.top+last.height/2-frame.top-12));
        clear();const adapter=CombatWebGLEffects.shield;CombatWebGLEffects.shield=()=>false;
        try{flushCombatEffects([snapshot]);check('unavailable GPU slams fall back to the original shield stamps',elements.combatPanel.querySelectorAll('.shield-slam-stamp').length===3);}finally{CombatWebGLEffects.shield=adapter;}
        for(const renderer of ['svg','webgl']){
            fresh();choose(renderer);toggle('projectiles',false);toggle('glows',false);flushCombatEffects([snapshot]);
            check(renderer+' slam impacts remain available with projectile and decorative glow switches off',renderer==='svg'?!!elements.combatPanel.querySelector('.shield-slam-wave'):CombatWebGL.status().types.includes('shield'));toggle('projectiles',true);toggle('glows',true);
            for(const mode of ['hidden','map','view','missing','removed','abilities','all']){
                clear();const selected=state.selectedMap,roster=state.monsterStates,cards=[...elements.enemyRoster.children];
                if(mode==='hidden')Object.defineProperty(document,'hidden',{configurable:true,value:true});if(mode==='map')state.selectedMap='another-map';if(mode==='view')state.currentView='inventory';
                if(mode==='missing')cards.forEach(card=>card.remove());if(mode==='removed')state.monsterStates=[];if(mode==='abilities'||mode==='all')toggle(mode,false);
                try{flushCombatEffects([snapshot]);check(renderer+' ignores '+mode+' slam events',!elements.combatPanel.querySelector('.shield-slam-wave')&&!CombatWebGL.status().active);}
                finally{restoreHidden();state.selectedMap=selected;state.currentView='map';state.monsterStates=roster;if(mode==='missing')elements.enemyRoster.append(...cards);if(mode==='abilities'||mode==='all')toggle(mode,true);}
            }
            clear();const roster=state.monsterStates;state.monsterStates=roster.filter(monster=>monster.id!==ids[8]);
            try{flushCombatEffects([snapshot]);check(renderer+' retains surviving hits when one monster disappears',renderer==='svg'?elements.combatPanel.querySelectorAll('.shield-slam-impact').length===2:CombatWebGL.status().active===16);}finally{state.monsterStates=roster;}
        }
        fresh();state.shieldStacks=9;check('shields below capacity create no slam event or damage',guarded(()=>tryShieldSlam()).length===0&&state.shieldStacks===9&&state.monsterStates[0].hp===1000);
        check('an empty hit list creates no visual event',guarded(()=>showShieldSlamWave([])).length===0);
        function fight(visuals,legacy=false){
            fresh();state.monsterStates[0].hp=50;state.monsterStates[1].hp=60;state.shieldStacks=10;syncLegacyEnemyState();
            let seed=9387,rolls=0,count=0;Math.random=()=>{rolls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            if(legacy)showShieldSlamWave=hitIds=>{if(!combatEffectEnabled('abilities')||!hitIds.length)return;const mapId=state.selectedMap;presentCombatEffect(()=>{if(isCombatView()&&state.selectedMap===mapId)presentShieldSlamWave({hitIds});});};
            try{for(let index=0;index<300;index++){const result=simulateCombatStep(.1,visuals);count+=result.effects.filter(effect=>effect.type==='shieldSlamWave').length;if(!visuals&&result.effects.length)throw new Error('Offline combat retained slam effects');}}
            finally{showShieldSlamWave=show;}
            return{value:JSON.stringify({state,damage:getDamageBreakdown()}),rolls,count,kills:state.kills[map.id]};
        }
        const legacy=fight(true,true),live=fight(true),offline=fight(false);
        check('slam events preserve original seeded damage, overflow, shields, deaths, rewards and random rolls',legacy.value===live.value&&legacy.rolls===live.rolls&&live.count>0&&live.kills>JSON.parse(initial).kills[map.id]);
        check('offline Shield Slam combat matches live results without retaining visual events',offline.value===live.value&&offline.rolls===live.rolls&&offline.count===0);
        check('no browser script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push(error.stack||String(error));}
    finally{Math.random=random;showShieldSlamWave=show;CombatSettings.enabled=enabled;document.createElementNS=create;getCombatEffectCard=getCard;getCombatEffectBounds=getBounds;performance.now=now;CombatWebGL.emit=emit;restoreHidden();itemById.testAmulet.stats=stats;clear();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
