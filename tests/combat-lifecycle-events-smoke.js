(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const near=(a,b)=>Math.abs(a-b)<1e-6,clone=value=>JSON.parse(JSON.stringify(value));
    const random=Math.random,originalEmit=emitCombatEvent,enabled=CombatSettings.enabled,create=document.createElement,createNS=document.createElementNS;
    const getCard=getCombatEffectCard,getBounds=getCombatEffectBounds,now=performance.now,timer=window.setTimeout,storage=Storage.prototype.setItem;
    const drop=LootEffects.drop,trail=CombatWebGL.trail,hidden=Object.getOwnPropertyDescriptor(document,'hidden');
    const stats=itemById.testAmulet.stats,helm={...itemById.testDropHelm},materials=itemData.materialDetails,gelName=materialNames.gel;
    const fireId=(skillNodeById.righteousFire||skillNodeById.fireOfTheRighteous).id;
    const restoreHidden=()=>{if(hidden)Object.defineProperty(document,'hidden',hidden);else delete document.hidden;};
    const choose=value=>{const select=document.getElementById('combatEffectRenderer');select.value=value;select.dispatchEvent(new Event('change'));};
    const toggle=(key,value)=>{const button=document.querySelector(`[data-effect-setting="${key}"]`);if(button.getAttribute('aria-checked')!==String(value))button.click();};
    const clear=()=>{elements.combatPanel.querySelectorAll('.poison-transfer,.void-volley-player-glow,.elemental-effect-layer').forEach(element=>element.remove());elements.enemyRoster.querySelectorAll('.is-defeating').forEach(card=>card.classList.remove('is-defeating'));LootEffects.clear();CombatWebGL.clear();};
    function collect(action,visuals=true){const previous=combatEffects,simulating=simulatingCombat;combatEffects=visuals?[]:null;simulatingCombat=true;try{action();return combatEffects||[];}finally{combatEffects=previous;simulatingCombat=simulating;}}
    function guarded(action){
        try{
            const fail=()=>{throw new Error('Combat simulation accessed presentation or persistence');};
            document.createElement=fail;document.createElementNS=fail;getCombatEffectCard=fail;getCombatEffectBounds=fail;performance.now=fail;window.setTimeout=fail;CombatSettings.enabled=fail;Storage.prototype.setItem=fail;
            Object.defineProperty(document,'hidden',{configurable:true,get:fail});return action();
        }finally{document.createElement=create;document.createElementNS=createNS;getCombatEffectCard=getCard;getCombatEffectBounds=getBounds;performance.now=now;window.setTimeout=timer;CombatSettings.enabled=enabled;Storage.prototype.setItem=storage;restoreHidden();}
    }
    try{
        for(const key of ['all','abilities','projectiles','glows','shaking'])toggle(key,true);choose('svg');
        state.currentView='map';state.isInTown=false;state.skillRanks={bloomingFlower:1};state.level=1;
        state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];itemById.testAmulet.stats={damage:10};
        state.upgrades={strength:0,haste:0,evasion:0};state.pendingEruptions=[];state.pendingVoidMissiles=[];state.shieldStacks=0;state.voidCharges=0;clearFury();clearGatheringPower();
        state.ownedItemIds=state.ownedItemIds.filter(id=>id!=='testDropHelm');
        itemById.testDropHelm.sprite='tests/fixtures/equipment-sprite.svg';itemData.materialDetails={...materials,gel:{sprite:'tests/fixtures/equipment-sprite.svg'}};
        const map=currentMap();map.drops=[{id:'gel',amount:[2,2],chance:1}];map.itemDrops=[];
        map.spawns=[{id:'lifecycleMob',monsterId:worldContent.monsters[0].id,count:3,overrides:{health:100,attackDamage:0,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:2,gold:[7,7],experience:0,drops:[{id:'gel',amount:[3,3],chance:1}],itemDrops:[{id:'testDropHelm',chance:1}]}}];
        resetMonsterStates(map);clearOfflineRecap();state.playerHp=getPlayerMaxHealth();state.combatPaused=false;state.attackTimer=0;render();clear();
        elements.combatStatus.scrollIntoView({block:'center'});await new Promise(resolve=>requestAnimationFrame(resolve));
        const initial=clone(state),ids=state.monsterStates.map(monster=>monster.id);
        function fresh(){Object.assign(state,clone(initial));combatStatCache=null;invalidateSkillBonusCache();resetDamageBreakdown(map.id);render();clear();Math.random=()=>0;}
        const stack=(remainingDuration,timeUntilTick)=>({remainingDuration,timeUntilTick});
        state.monsterStates[0].poisonStacks=[stack(3,.4),stack(2,.7)];state.monsterStates[1].poisonStacks=[stack(1,.2)];
        Math.random=()=>0;const killed=guarded(()=>collect(()=>applyDamageToMonster(state.monsterStates[0],1000,'physical')));
        const death=killed.find(event=>event.type==='monsterDefeated'),transfer=killed.find(event=>event.type==='poisonTransferred');
        check('a lethal hit queues only serializable data, including death, loot, target cleanup and poison transfer',!!death&&!!transfer&&killed.some(event=>event.type==='enemyDamageCleared')&&killed.every(event=>typeof event==='object')&&clone(killed).length===killed.length);
        check('simulation awards gold, combined materials and equipment once before presenting loot',state.gold===initial.gold+7&&state.materials.gel===initial.materials.gel+5&&ownsItem('testDropHelm')&&state.monsterStates[0].hp===0&&state.kills[map.id]===initial.kills[map.id]+1);
        check('Blooming Flower still moves complete stacks to one target with their original clocks',transfer.sourceId===ids[0]&&transfer.targetId===ids[1]&&state.monsterStates[1].poisonStacks.length===3&&state.monsterStates[2].poisonStacks.length===0&&near(state.monsterStates[1].poisonStacks[1].remainingDuration,3)&&near(state.monsterStates[1].poisonStacks[1].timeUntilTick,.4));
        check('collecting a death creates no loot or transfer overlays and no defeat animation',!document.querySelector('.loot-drop,.poison-transfer,.is-defeating'));
        const saved=clone(killed),before=JSON.stringify(state),drops=[];
        LootEffects.drop=(...args)=>{drops.push(args);return drop(...args);};Math.random=()=>{throw new Error('Presentation consumed combat randomness');};
        itemById.testDropHelm.name='Changed after kill';itemById.testDropHelm.sprite='changed.svg';materialNames.gel='Changed material';
        flushCombatEffects(saved);
        check('death events snapshot reward names, sprites, rarity and amounts at the actual kill',drops.length===1&&drops[0][0].find(reward=>reward.key==='equipment:testDropHelm').name===helm.name&&drops[0][0].find(reward=>reward.key==='equipment:testDropHelm').sprite==='tests/fixtures/equipment-sprite.svg'&&drops[0][0].find(reward=>reward.key==='material:gel').name===gelName&&drops[0][0].find(reward=>reward.gold).amount===7&&JSON.stringify(state)===before);
        check('loot presentation uses the defeated sprite and original SVG poison transfer',drops[0][1]===getCombatEffectCard(ids[0]).querySelector('.enemy-mark')&&document.querySelectorAll('.loot-drop').length===3&&getCombatEffectCard(ids[0]).classList.contains('is-defeating')&&!!elements.combatPanel.querySelector('.poison-transfer'));
        const line=elements.combatPanel.querySelector('.poison-transfer line'),svg=line.parentElement,frame=getCombatEffectBounds(svg),mark=getCombatEffectBounds(getCombatEffectCard(ids[1]).querySelector('.enemy-mark'));
        check('the poison trail still ends at the receiving sprite',near(Number(line.getAttribute('x2')),mark.left+mark.width/2-frame.left)&&near(Number(line.getAttribute('y2')),mark.top+mark.height/2-frame.top));
        line.dispatchEvent(new Event('animationend',{bubbles:true}));check('drawing completion leaves the transfer visible until its fade ends',svg.isConnected);svg.dispatchEvent(new Event('animationend'));check('completed transfers release their SVG overlay',!svg.isConnected);
        Object.assign(itemById.testDropHelm,helm,{sprite:'tests/fixtures/equipment-sprite.svg'});materialNames.gel=gelName;LootEffects.drop=drop;

        fresh();state.skillRanks={[fireId]:1};itemById.testAmulet.stats={healthRegen:20};state.playerHp=30;state.monsterStates[0].hp=0;state.monsterStates[0].respawnRemaining=2;
        const fire=guarded(()=>collect(()=>tickPlayerRegeneration(1))),fireEvent=fire.find(event=>event.type==='righteousFireHit');
        check('Righteous Fire records living target IDs and flash duration after applying its split damage',fireEvent.targetIds.join(',')===ids.slice(1).join(',')&&fireEvent.duration===350&&state.playerHp===30&&state.monsterStates[1].hp===95&&state.monsterStates[2].hp===95&&!righteousFireHitUntil.has(state.monsterStates[1]));
        const fireBefore=JSON.stringify(state),start=performance.now();flushCombatEffects(fire);renderCombat();
        check('presenting a burn sets only presentation deadlines and lights the living plates',JSON.stringify(state)===fireBefore&&righteousFireHitUntil.get(state.monsterStates[1])>=start+350&&!righteousFireHitUntil.has(state.monsterStates[0])&&getCombatEffectCard(ids[1]).classList.contains('is-righteous-fire'));
        await new Promise(resolve=>setTimeout(resolve,390));renderCombat();check('burn flashes expire without changing health or damage',!getCombatEffectCard(ids[1]).classList.contains('is-righteous-fire')&&JSON.stringify(state)===fireBefore);
        fresh();showVoidVolleyPlayerGlow(1);state.furyStacks=3;state.shieldStacks=4;state.voidCharges=5;state.gatheringPower={stacks:3,progress:0,remaining:1};
        const playerDeath=guarded(()=>collect(()=>applyDamageToPlayer(10000,'self')));
        check('player death clears simulation buffs and emits cleanup without touching their UI',state.playerHp===0&&state.combatPaused&&state.furyStacks===0&&state.shieldStacks===0&&state.voidCharges===0&&state.gatheringPower.stacks===0&&playerDeath.some(event=>event.type==='playerCombatBuffsCleared')&&!!elements.playerHealthPanel.querySelector('.void-volley-player-glow'));
        flushCombatEffects(playerDeath);check('presenting death cleanup removes the old Volley glow',!elements.playerHealthPanel.querySelector('.void-volley-player-glow'));
        fresh();recentEnemyDamage=9;const indicator=getCombatEffectCard(ids[0]).querySelector('.enemy-health-damage');indicator.classList.add('is-visible');
        const reset=guarded(()=>collect(()=>clearEnemyDamageIndicator()));check('target-change cleanup is also a data record',reset[0]?.type==='enemyDamageCleared'&&recentEnemyDamage===9&&indicator.classList.contains('is-visible'));flushCombatEffects(reset);check('presenting target cleanup clears the previous damage strip',recentEnemyDamage===0&&!indicator.classList.contains('is-visible'));
        const encounterReset=guarded(()=>collect(()=>resetMonsterStates(map)));check('encounter reset queues only data for buff, elemental-overlay and Volley cleanup',encounterReset.every(event=>typeof event==='object')&&encounterReset.some(event=>event.type==='elementalEffectsCleared')&&encounterReset.some(event=>event.type==='voidVolleyReset'));flushCombatEffects(encounterReset);

        for(const renderer of ['svg','webgl']){
            itemById.testAmulet.stats=stats;fresh();choose(renderer);const records=[clone(death),clone(transfer),{type:'righteousFireHit',mapId:map.id,targetIds:[ids[1]],duration:350}];
            state.monsterStates[0].hp=0;const loot=[];LootEffects.drop=(...args)=>{loot.push(args);return drop(...args);};
            for(const mode of ['hidden','map','view','all']){
                clear();loot.length=0;const selected=state.selectedMap;
                if(mode==='hidden')Object.defineProperty(document,'hidden',{configurable:true,value:true});if(mode==='map')state.selectedMap='another-map';if(mode==='view')state.currentView='inventory';if(mode==='all')toggle('all',false);
                try{flushCombatEffects(records);check(renderer+' discards '+mode+' death, burn and transfer presentation',loot.length===0&&!elements.combatPanel.querySelector('.poison-transfer')&&!CombatWebGL.status().active);}
                finally{restoreHidden();state.selectedMap=selected;state.currentView='map';if(mode==='all')toggle('all',true);}
            }
            clear();loot.length=0;toggle('projectiles',false);flushCombatEffects(records);
            check(renderer+' projectile settings suppress the transfer while preserving earned loot',loot.length===1&&!elements.combatPanel.querySelector('.poison-transfer')&&!CombatWebGL.status().types.includes('poisonTransfer'));toggle('projectiles',true);
            clear();loot.length=0;toggle('shaking',false);flushCombatEffects([death]);check(renderer+' disabling shake preserves loot without a defeat animation',loot.length===1&&!getCombatEffectCard(ids[0]).classList.contains('is-defeating'));toggle('shaking',true);
            clear();loot.length=0;state.monsterStates[0].hp=100;flushCombatEffects([death]);check(renderer+' a delayed death still shows earned loot without shaking a respawn',loot.length===1&&!getCombatEffectCard(ids[0]).classList.contains('is-defeating'));
            clear();loot.length=0;const card=getCombatEffectCard(ids[0]),next=card.nextSibling;card.remove();
            try{flushCombatEffects([death,transfer]);check(renderer+' missing source plates keep status-row loot and suppress phantom transfers',loot.length===1&&!loot[0][1]&&!elements.combatPanel.querySelector('.poison-transfer')&&!CombatWebGL.status().types.includes('poisonTransfer'));}finally{elements.enemyRoster.insertBefore(card,next);}
            clear();const roster=state.monsterStates;state.monsterStates=roster.filter(monster=>monster.id!==ids[1]);
            try{flushCombatEffects([transfer,records[2]]);check(renderer+' leftover plates cannot receive transfers for removed monsters',!elements.combatPanel.querySelector('.poison-transfer')&&!CombatWebGL.status().active);}finally{state.monsterStates=roster;}
            LootEffects.drop=drop;
        }
        fresh();choose('webgl');const trails=[];CombatWebGL.trail=spec=>{trails.push(spec);return trail(spec);};
        try{flushCombatEffects([transfer]);}finally{CombatWebGL.trail=trail;}
        check('GPU poison transfers retain their green core, glow and 180 ms flight',trails.length===1&&trails[0].type==='poisonTransfer'&&trails[0].flight===180&&trails[0].duration===700&&trails[0].strokeWidth===3&&trails[0].glowRadius===5&&!elements.combatPanel.querySelector('.poison-transfer'));

        function fight(visuals,legacy=false,isolate=false){
            itemById.testAmulet.stats={damage:100,healthRegen:20,spellDamage:12,mana:100,manaRegen:10};fresh();
            state.skillRanks={bloomingFlower:1,snakeBite:1,volcanicEruption:1,eruptionChain:1,shieldGenerator:1,shieldSlam:1,overflowingSlam:1,[fireId]:1,rimeBrand:1,glacialRupture:1,emberBrand:1,cinderRupture:1,voidBolt:1,voidVolley:1,voidVortex:1,echoingVoid:1};
            state.playerHp=30;state.shieldStacks=10;state.playerMana=100;state.manaCapacity=getPlayerMaxMana();state.attackTimer=getAttackSpeed()-.05;state.monsterStates[0].hp=1;state.monsterStates[0].poisonStacks=[stack(3,.1)];syncLegacyEnemyState();
            let seed=9387,rolls=0,records=0;Math.random=()=>{rolls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            const remaining=new Set(['poisonTransferred','righteousFireHit','monsterDefeated','enemyDamageCleared','playerCombatBuffsCleared','elementalEffectsCleared']);
            if(legacy)emitCombatEvent=(type,details)=>{if(!remaining.has(type)){originalEmit(type,details);return;}presentCombatEffect(()=>presentCombatEvent({...details,type}),type==='poisonTransferred'?'projectiles':'general');};
            const run=()=>{for(let index=0;index<200;index++){const result=simulateCombatStep(.1,visuals);records+=result.effects.filter(event=>remaining.has(event.type)).length;if(!visuals&&result.effects.length)throw new Error('Offline combat retained presentation');if(!legacy&&result.effects.some(event=>typeof event!=='object'))throw new Error('Simulation returned a callback');if(!legacy)JSON.stringify(result.effects);pruneVoidMissilePresentations();}};
            try{if(isolate)guarded(run);else run();}finally{emitCombatEvent=originalEmit;}
            return{value:JSON.stringify({state,damage:getDamageBreakdown()}),rolls,records,kills:state.kills[map.id]};
        }
        const legacy=fight(true,true),live=fight(true,false,true),offline=fight(false,false,true);
        check('complete combat steps including deaths and ability chains run without presentation, timers, visibility, settings or storage access',live.records>0&&live.kills>initial.kills[map.id]);
        check('remaining events preserve seeded health, damage, poison, resources, rewards, deaths and random-roll order',live.value===legacy.value&&live.rolls===legacy.rolls);
        check('offline combat matches without retaining presentation work',offline.value===live.value&&offline.rolls===live.rolls&&offline.records===0);
        check('no browser script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push(error.stack||String(error));}
    finally{Math.random=random;emitCombatEvent=originalEmit;CombatSettings.enabled=enabled;document.createElement=create;document.createElementNS=createNS;getCombatEffectCard=getCard;getCombatEffectBounds=getBounds;performance.now=now;window.setTimeout=timer;Storage.prototype.setItem=storage;LootEffects.drop=drop;CombatWebGL.trail=trail;restoreHidden();itemById.testAmulet.stats=stats;Object.assign(itemById.testDropHelm,helm);itemData.materialDetails=materials;materialNames.gel=gelName;clear();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
