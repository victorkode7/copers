(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const random=Math.random,show=showElementalBurst,enabled=CombatSettings.enabled,create=document.createElement,createNS=document.createElementNS;
    const getCard=getCombatEffectCard,getBounds=getCombatEffectBounds,now=performance.now,emit=CombatWebGL.emit,setTimeout=window.setTimeout;
    const hidden=Object.getOwnPropertyDescriptor(document,'hidden'),stats=itemById.testAmulet.stats;
    const restoreHidden=()=>{if(hidden)Object.defineProperty(document,'hidden',hidden);else delete document.hidden;};
    const choose=value=>{const select=document.getElementById('combatEffectRenderer');select.value=value;select.dispatchEvent(new Event('change'));};
    const toggle=(key,value)=>{const button=document.querySelector(`[data-effect-setting="${key}"]`);if(button.getAttribute('aria-checked')!==String(value))button.click();};
    const clear=()=>{elements.combatPanel.querySelectorAll('.elemental-effect-layer').forEach(element=>element.remove());CombatWebGL.clear();};
    function collect(action,visuals=true){const previous=combatEffects;combatEffects=visuals?[]:null;try{action();return combatEffects||[];}finally{combatEffects=previous;}}
    function guarded(action){
        try{
            const fail=()=>{throw new Error('Elemental simulation accessed presentation');};
            document.createElement=fail;document.createElementNS=fail;getCombatEffectCard=fail;getCombatEffectBounds=fail;performance.now=fail;CombatSettings.enabled=fail;
            Object.defineProperty(document,'hidden',{configurable:true,get:fail});return collect(action);
        }finally{document.createElement=create;document.createElementNS=createNS;getCombatEffectCard=getCard;getCombatEffectBounds=getBounds;performance.now=now;CombatSettings.enabled=enabled;restoreHidden();}
    }
    try{
        for(const key of ['all','abilities','projectiles','glows'])toggle(key,true);choose('svg');
        state.currentView='map';state.isInTown=false;state.skillRanks={rimeBrand:1,emberBrand:1,glacialRupture:1,cinderRupture:1};state.level=1;
        state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];itemById.testAmulet.stats={spellDamage:12,mana:100,manaRegen:10};
        state.upgrades={strength:0,haste:0,evasion:0};state.pendingEruptions=[];state.pendingVoidMissiles=[];state.shieldStacks=0;state.voidCharges=0;clearFury();clearGatheringPower();
        const map=currentMap();map.drops=[];map.itemDrops=[];
        map.spawns=[{id:'elementalEventMob',monsterId:worldContent.monsters[0].id,count:9,overrides:{health:1000,attackDamage:0,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:.5,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);clearOfflineRecap();state.playerHp=getPlayerMaxHealth();state.combatPaused=false;state.manaCapacity=getPlayerMaxMana();state.playerMana=state.manaCapacity;state.attackTimer=0;
        render();state.monsterColumns=3;state.targetMonsterId=state.monsterStates[4].id;clear();
        elements.combatPanel.scrollIntoView({block:'start'});await new Promise(resolve=>requestAnimationFrame(resolve));
        const initial=JSON.stringify(state),ids=state.monsterStates.map(monster=>monster.id),mana=state.playerMana,damage=getSpellDamage(),neighbors=[1,3,5,7];
        function fresh(){resetVoidMissilePresentation();Object.assign(state,JSON.parse(initial));combatStatCache=null;resetDamageBreakdown(map.id);render();state.monsterColumns=3;clear();Math.random=()=>.5;}
        let cold,fire;const casts=guarded(()=>{cold=castElementalBrand('rimeBrand');fire=castElementalBrand('emberBrand');});
        check('both brands emit plain element and target records without HTML, settings, visibility or wall-clock access',cold&&fire&&casts.length===2&&casts.every(effect=>effect.type==='elementalBurst'&&effect.mapId===map.id&&effect.targetIds.join(',')===ids[4]&&!effect.explosion)&&casts[0].element==='cold'&&casts[1].element==='fire');
        check('applying brands retains five mana per cast, ten-second durations and no instant damage',state.playerMana===mana-10&&state.monsterStates.every(monster=>monster.hp===1000)&&state.monsterStates[4].rimeBrand.remainingDuration===10&&state.monsterStates[4].emberBrand.stacks===0&&!elements.combatPanel.querySelector('.elemental-effect-layer'));
        const before=JSON.stringify(state);Math.random=()=>{throw new Error('Elemental presentation consumed combat randomness');};flushCombatEffects(JSON.parse(JSON.stringify(casts)));
        check('normal brand bursts retain their distinct element classes and five particles without changing combat',JSON.stringify(state)===before&&elements.combatPanel.querySelectorAll('.elemental-burst').length===2&&[...elements.combatPanel.querySelectorAll('.elemental-burst')].every(burst=>burst.children.length===5&&!burst.classList.contains('is-explosion'))&&!!elements.combatPanel.querySelector('.elemental-burst.is-cold')&&!!elements.combatPanel.querySelector('.elemental-burst.is-fire'));
        const early=guarded(()=>tickElementalBrands(state.monsterStates[4],9.9));
        check('nine brand ticks generate no premature explosion',!early.some(effect=>effect.type==='elementalBurst')&&state.monsterStates[4].hp===1000-damage*18&&state.monsterStates[4].rimeBrand.stacks===9&&state.monsterStates[4].emberBrand.stacks===9);
        const arrived=guarded(()=>tickElementalBrands(state.monsterStates[4],.1)),explosions=arrived.filter(effect=>effect.type==='elementalBurst');
        check('tenth ticks emit both explosions for the center and four orthogonal neighbors',explosions.length===2&&explosions.every(effect=>effect.explosion&&effect.targetIds.join(',')===[4,...neighbors].map(index=>ids[index]).join(','))&&state.monsterStates[4].hp===1000-damage*20&&neighbors.every(index=>state.monsterStates[index].hp===1000-damage*10));
        check('freeze, Scorched and brand expiry are resolved before presentation',neighbors.every(index=>state.monsterStates[index].freezeRemaining===arrowSkillSettings.freezeDuration&&state.monsterStates[index].scorched)&&!state.monsterStates[4].rimeBrand&&!state.monsterStates[4].emberBrand&&state.monsterStates.filter((monster,index)=>![4,...neighbors].includes(index)).every(monster=>monster.hp===1000));
        clear();const timeouts=[];window.setTimeout=(callback,delay,...args)=>{timeouts.push({callback,delay});return setTimeout(callback,delay,...args);};
        const resolved=JSON.stringify(state);try{flushCombatEffects(explosions);}finally{window.setTimeout=setTimeout;}
        const layers=[...elements.combatPanel.querySelectorAll('.elemental-effect-layer')],bursts=[...elements.combatPanel.querySelectorAll('.elemental-burst')];
        check('delayed explosions retain eight deterministic particles per plate and cannot restore expired brands',JSON.stringify(state)===resolved&&layers.length===2&&bursts.length===10&&bursts.every(burst=>burst.classList.contains('is-explosion')&&burst.children.length===8&&[...burst.children].every((particle,index)=>particle.style.getPropertyValue('--spark-angle')===index*45+'deg'&&particle.style.getPropertyValue('--spark-delay')===index*14+'ms')));
        check('burst geometry follows the current plate bounds',bursts.every(burst=>{const index=[...burst.parentElement.children].indexOf(burst),card=getCombatEffectCard(explosions[0].targetIds[index]),box=getCombatEffectBounds(card),frame=getCombatEffectBounds(burst.parentElement);return Math.abs(parseFloat(burst.style.left)-(box.left-frame.left))<.01&&Math.abs(parseFloat(burst.style.top)-(box.top-frame.top))<.01&&Math.abs(parseFloat(burst.style.width)-box.width)<.01&&Math.abs(parseFloat(burst.style.height)-box.height)<.01;}));
        timeouts.filter(timer=>timer.delay===1100).forEach(timer=>timer.callback());check('elemental overlay cleanup keeps the original 1100 ms lifetime',timeouts.filter(timer=>timer.delay===1100).length===2&&layers.every(layer=>!layer.isConnected));
        fresh();const raw=ids.slice(0,2),snapshot=JSON.parse(JSON.stringify(collect(()=>showElementalBurst(raw,'fire',true))[0]));raw.splice(0,2,ids[8]);state.skillRanks={};state.targetMonsterId=ids[8];flushCombatEffects([snapshot]);
        check('burst snapshots retain their IDs, element and explosion flag after caller and skill changes',snapshot.targetIds.join(',')===ids.slice(0,2).join(',')&&elements.combatPanel.querySelectorAll('.elemental-burst.is-fire.is-explosion').length===2&&!getCombatEffectCard(ids[8]).querySelector('.elemental-burst'));
        clear();choose('webgl');const specs=[];CombatWebGL.emit=spec=>{specs.push(spec);return emit(spec);};
        try{flushCombatEffects(explosions);}finally{CombatWebGL.emit=emit;}
        const elemental=specs.filter(spec=>spec.type==='elemental');
        check('GPU explosions retain plate flashes, rings, particle counts and separate fire/cold colors',elemental.length===100&&elemental.filter(spec=>spec.style===2).length===10&&elemental.filter(spec=>spec.style===1).length===10&&elemental.some(spec=>spec.color.join(',')===[1,.48,.12].join(','))&&elemental.some(spec=>spec.color.join(',')===[.42,.85,1].join(','))&&elemental.filter(spec=>spec.duration===800).length===80&&!elements.combatPanel.querySelector('.elemental-effect-layer')&&document.querySelectorAll('.combat-webgl-layer').length===1);
        clear();const adapter=CombatWebGLEffects.elemental;CombatWebGLEffects.elemental=()=>false;
        try{flushCombatEffects([snapshot]);check('unavailable GPU bursts use the original elemental overlay fallback',elements.combatPanel.querySelectorAll('.elemental-burst.is-fire.is-explosion').length===2);}finally{CombatWebGLEffects.elemental=adapter;}
        for(const renderer of ['svg','webgl']){
            fresh();choose(renderer);toggle('projectiles',false);flushCombatEffects([snapshot]);
            check(renderer+' elemental bursts remain independent of the projectile switch',renderer==='svg'?!!elements.combatPanel.querySelector('.elemental-burst'):CombatWebGL.status().types.includes('elemental'));toggle('projectiles',true);
            for(const mode of ['hidden','map','view','missing','removed','abilities','all']){
                clear();const selected=state.selectedMap,roster=state.monsterStates,cards=[...elements.enemyRoster.children];
                if(mode==='hidden')Object.defineProperty(document,'hidden',{configurable:true,value:true});if(mode==='map')state.selectedMap='another-map';if(mode==='view')state.currentView='inventory';
                if(mode==='missing')cards.forEach(card=>card.remove());if(mode==='removed')state.monsterStates=[];if(mode==='abilities'||mode==='all')toggle(mode,false);
                try{flushCombatEffects([snapshot]);check(renderer+' ignores '+mode+' elemental events',!elements.combatPanel.querySelector('.elemental-effect-layer')&&!CombatWebGL.status().active);}
                finally{restoreHidden();state.selectedMap=selected;state.currentView='map';state.monsterStates=roster;if(mode==='missing')elements.enemyRoster.append(...cards);if(mode==='abilities'||mode==='all')toggle(mode,true);}
            }
            clear();const roster=state.monsterStates;state.monsterStates=roster.filter(monster=>monster.id!==ids[0]);
            try{flushCombatEffects([snapshot]);check(renderer+' keeps remaining targets when one monster disappears',renderer==='svg'?elements.combatPanel.querySelectorAll('.elemental-burst').length===1:CombatWebGL.status().active===10);}finally{state.monsterStates=roster;}
        }
        check('an empty burst creates no event',collect(()=>showElementalBurst([],'cold',true)).length===0);
        function fight(visuals,legacy=false){
            fresh();state.skillRanks.gatheringPower=1;state.monsterStates[0].hp=5;state.targetMonsterId=ids[0];syncLegacyEnemyState();
            let seed=9387,rolls=0,count=0,ruptures=0;Math.random=()=>{rolls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            if(legacy)showElementalBurst=(targetIds,element,explosion)=>{if(!combatEffectEnabled('abilities'))return;const mapId=state.selectedMap;presentCombatEffect(()=>{if(isCombatView()&&state.selectedMap===mapId)presentElementalBurst({targetIds,element,explosion});});};
            try{for(let index=0;index<300;index++){const result=simulateCombatStep(.1,visuals);count+=result.effects.filter(effect=>effect.type==='elementalBurst').length;ruptures+=result.effects.filter(effect=>effect.type==='elementalBurst'&&effect.explosion).length;if(!visuals&&result.effects.length)throw new Error('Offline combat retained elemental effects');}}
            finally{showElementalBurst=show;}
            return{value:JSON.stringify({state,damage:getDamageBreakdown()}),rolls,count,ruptures,kills:state.kills[map.id]};
        }
        const legacy=fight(true,true),live=fight(true),offline=fight(false);
        check('elemental events preserve original seeded brands, damage, freeze, Scorched, deaths, rewards and random rolls',legacy.value===live.value&&legacy.rolls===live.rolls&&live.count>0&&live.ruptures>0&&live.kills>JSON.parse(initial).kills[map.id]);
        check('offline elemental combat matches live results without retaining visual events',offline.value===live.value&&offline.rolls===live.rolls&&offline.count===0);
        check('no browser script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push(error.stack||String(error));}
    finally{Math.random=random;showElementalBurst=show;CombatSettings.enabled=enabled;document.createElement=create;document.createElementNS=createNS;getCombatEffectCard=getCard;getCombatEffectBounds=getBounds;performance.now=now;CombatWebGL.emit=emit;window.setTimeout=setTimeout;restoreHidden();itemById.testAmulet.stats=stats;clear();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
