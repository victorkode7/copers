(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const near=(a,b)=>Math.abs(a-b)<1e-7;
    const originalRandom=Math.random,originalShow=showSpellCast,originalSchedule=getVoidMissileSchedule;
    const originalGetCard=getCombatEffectCard,originalBounds=getCombatEffectBounds,originalEnabled=CombatSettings.enabled;
    const originalStats=itemById.testAmulet.stats,originalTrail=CombatWebGL.trail,originalGpuEmit=CombatWebGL.emit;
    const hiddenDescriptor=Object.getOwnPropertyDescriptor(document,'hidden');
    const choose=value=>{const select=document.getElementById('combatEffectRenderer');select.value=value;select.dispatchEvent(new Event('change'));};
    const toggle=(key,value)=>{const button=document.querySelector(`[data-effect-setting="${key}"]`);if(button.getAttribute('aria-checked')!==String(value))button.click();};
    const restoreHidden=()=>{if(hiddenDescriptor)Object.defineProperty(document,'hidden',hiddenDescriptor);else delete document.hidden;};
    const clearSpells=()=>{elements.combatPanel.querySelectorAll('.spell-effect,.void-volley-player-glow').forEach(element=>element.remove());CombatWebGL.clear();};
    function collect(action) {
        const previous=combatEffects;combatEffects=[];
        try {action();return combatEffects;}
        finally {combatEffects=previous;}
    }
    try {
        for(const key of ['all','abilities','projectiles','glows'])toggle(key,true);choose('svg');
        state.currentView='map';state.isInTown=false;state.skillRanks={voidBolt:1};state.level=1;
        state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];
        itemById.testAmulet.stats={spellDamage:12,mana:100,manaRegen:5,multiHit:2};state.upgrades={strength:0,haste:0,evasion:0};
        state.pendingEruptions=[];state.pendingVoidMissiles=[];state.shieldStacks=0;state.voidCharges=0;
        clearFury();clearGatheringPower();
        const map=currentMap();map.drops=[];map.itemDrops=[];
        map.spawns=[{id:'boltMob',monsterId:worldContent.monsters[0].id,count:3,overrides:{health:1000,attackDamage:1,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:.5,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);clearOfflineRecap();state.playerHp=getPlayerMaxHealth();state.combatPaused=false;
        state.manaCapacity=getPlayerMaxMana();state.playerMana=state.manaCapacity;state.attackTimer=getAttackSpeed()-.05;render();clearSpells();
        elements.combatPanel.scrollIntoView({block:'start'});await new Promise(resolve=>requestAnimationFrame(resolve));
        const ids=state.monsterStates.map(monster=>monster.id),initial=JSON.stringify(state),mana=state.playerMana,spellDamage=getSpellDamage();
        let cast,queued;
        try {
            getCombatEffectCard=()=>{throw new Error('Bolt simulation accessed HTML');};getCombatEffectBounds=()=>{throw new Error('Bolt simulation measured geometry');};
            Object.defineProperty(document,'hidden',{configurable:true,get(){throw new Error('Bolt simulation read visibility');}});
            CombatSettings.enabled=()=>{throw new Error('Bolt simulation read visual settings');};
            Math.random=()=>0;queued=collect(()=>{cast=castVoidBolt();});
        } finally {getCombatEffectCard=originalGetCard;getCombatEffectBounds=originalBounds;restoreHidden();CombatSettings.enabled=originalEnabled;}
        const event=queued.find(effect=>effect.type==='voidBoltCast');
        check('a real multi-target Bolt cast queues plain data without presentation access',cast&&event?.mapId===map.id&&event.hits.length===3&&event.hits.every((hit,index)=>hit.targetId===ids[index]&&hit.schedule.flight>0));
        check('Bolt damage, mana cost and charge generation retain their original behavior',state.monsterStates.every(monster=>monster.hp===1000-spellDamage)&&state.playerMana===mana-5&&state.voidCharges===3&&state.pendingVoidMissiles.length===0);
        check('collecting a Bolt creates no spell overlay',!elements.combatPanel.querySelector('.spell-effect'));
        const before=JSON.stringify(state);Math.random=()=>{throw new Error('Bolt presentation consumed combat randomness');};flushCombatEffects(queued);
        let svg=elements.combatPanel.querySelector('.spell-void-bolt');
        check('presenting a Bolt preserves state and creates the original curved projectiles and rings',JSON.stringify(state)===before&&svg?.querySelectorAll('path').length===3&&svg.querySelectorAll('.void-missile').length===3&&svg.querySelectorAll('.void-impact').length===3&&[...svg.querySelectorAll('path')].every(path=>path.getAttribute('d').includes('Q')));
        check('each Bolt head and ring retain their snapshotted launch and arrival times',[...svg.querySelectorAll('.void-missile')].every((head,index)=>near(parseFloat(head.style.animationDelay),event.hits[index].schedule.delay*1000)&&near(parseFloat(head.querySelector('animateMotion').getAttribute('dur')),event.hits[index].schedule.flight)&&near(parseFloat(head.nextElementSibling.style.animationDelay),event.hits[index].schedule.arrival*1000)));
        const ring=svg.querySelector('.void-impact'),animation=ring.getAnimations()[0],arrival=event.hits[0].schedule.arrival*1000;
        animation.pause();animation.currentTime=arrival-.1;check('the Bolt impact remains hidden before its visual arrival',parseFloat(getComputedStyle(ring).opacity)===0);
        animation.currentTime=arrival+.1;check('the Bolt impact appears at its visual arrival without a second delay',parseFloat(getComputedStyle(ring).opacity)>.95);
        clearSpells();const raw=[{targetId:ids[0],flight:.2},{targetId:ids[1],sourceId:ids[0],flight:.35},{targetId:ids[2]}];
        const snapshots=collect(()=>showSpellCast('voidBolt',raw,200)),snapshot=JSON.parse(JSON.stringify(snapshots[0]));
        raw[0].targetId=ids[2];raw[0].flight=9;raw.push({targetId:ids[0]});state.skillRanks={};
        getVoidMissileSchedule=()=>{throw new Error('Renderer recalculated the Bolt schedule');};flushCombatEffects([snapshot]);svg=elements.combatPanel.querySelector('.spell-void-bolt');
        check('queued Bolt IDs, hit count and launch timing survive caller and skill changes',snapshot.hits.length===3&&snapshot.hits[0].targetId===ids[0]&&snapshot.lifetime===1350&&svg.querySelectorAll('path').length===3&&near(parseFloat(svg.querySelector('.void-missile').style.animationDelay),200)&&near(parseFloat(svg.querySelector('animateMotion').getAttribute('dur')),.2));
        clearSpells();choose('webgl');const trails=[],shapes=[];
        CombatWebGL.trail=spec=>{trails.push(spec);return originalTrail(spec);};CombatWebGL.emit=spec=>{shapes.push(spec);return originalGpuEmit(spec);};flushCombatEffects([snapshot]);
        CombatWebGL.trail=originalTrail;CombatWebGL.emit=originalGpuEmit;getVoidMissileSchedule=originalSchedule;
        check('GPU Bolts use the same stored launch, flight and impact times',trails.filter(trail=>trail.type==='spell').length===3&&trails.some(trail=>near(trail.delay,200)&&near(trail.flight,200))&&shapes.some(shape=>shape.type==='spellImpact'&&near(shape.delay,400)));
        check('Bolt events retain one GPU surface without Volley glow or per-cast SVG',CombatWebGL.status().types.includes('spell')&&!CombatWebGL.status().types.includes('playerGlow')&&!elements.combatPanel.querySelector('.spell-effect,.void-volley-player-glow'));

        function fight(collectEffects,legacy=false) {
            Object.assign(state,JSON.parse(initial));combatStatCache=null;resetDamageBreakdown(map.id);state.monsterStates.forEach(monster=>{monster.hp=5;});syncLegacyEnemyState();
            let seed=9387,rolls=0,events=0;Math.random=()=>{rolls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            if(legacy)showSpellCast=(kind,hits,delay=0)=>{
                if(kind!=='voidBolt'){originalShow(kind,hits,delay);return;}
                if(!combatEffectEnabled('projectiles'))return;
                const mapId=state.selectedMap;presentCombatEffect(()=>presentSpellCast(kind,hits,delay,hits.map(()=>null),mapId));
            };
            try {for(let index=0;index<200;index++){const result=simulateCombatStep(.1,collectEffects);events+=result.effects.filter(effect=>effect.type==='voidBoltCast').length;if(!collectEffects&&result.effects.length)throw new Error('Offline combat retained spell visuals');}}
            finally {showSpellCast=originalShow;}
            return {state:JSON.stringify({state,damage:getDamageBreakdown()}),rolls,events,kills:state.kills[map.id]};
        }
        choose('svg');clearSpells();const legacy=fight(true,true),live=fight(true),offline=fight(false);
        check('Bolt events preserve seeded damage, mana, charges, kills, rewards and random rolls',legacy.state===live.state&&legacy.rolls===live.rolls&&live.events>0&&live.kills>JSON.parse(initial).kills[map.id]);
        check('offline Bolt combat matches without retaining visual events',offline.state===live.state&&offline.rolls===live.rolls&&offline.events===0);
        Object.assign(state,JSON.parse(initial));state.playerMana=4;let denied;
        const invalid=collect(()=>{denied=castVoidBolt();});check('insufficient mana creates no cast event or damage',!denied&&invalid.length===0&&state.monsterStates.every(monster=>monster.hp===1000));
        check('an empty visual cast creates no event',collect(()=>showSpellCast('voidBolt',[])).length===0);

        Object.assign(state,JSON.parse(initial));state.skillRanks.voidVolley=1;state.voidCharges=5;render();clearSpells();Math.random=()=>0;
        const combined=collect(()=>castVoidBolt());
        check('a charged Volley queues its own cast alongside the Bolt event',state.pendingVoidMissiles.length===10&&state.playerMana===mana-15&&combined.some(effect=>effect.type==='voidVolleyCast')&&combined.some(effect=>effect.type==='voidBoltCast'));
        flushCombatEffects(combined);const missile=state.pendingVoidMissiles[0],oldVisual=getVoidMissileVisual(missile),oldRing=oldVisual.circle;
        check('Volley still owns its original cancellation handles and separate spell overlay',oldRing?.isConnected&&elements.combatPanel.querySelector('.spell-void-volley')&&elements.combatPanel.querySelector('.spell-void-bolt'));
        state.monsterStates[0].hp=0;const targetHp=state.monsterStates[1].hp;
        const redirected=collect(()=>tickPendingVoidMissiles(.6));flushCombatEffects(redirected);
        check('Volley redirection still cancels its old ring without early replacement damage',oldVisual.cancelled&&!oldRing.isConnected&&!getVoidMissileVisual(missile)&&state.monsterStates[1].hp===targetHp&&state.pendingVoidMissiles.some(hit=>hit.targetId===ids[1]&&near(hit.remaining,voidMissileTiming.redirect)));

        Object.assign(state,JSON.parse(initial));render();clearSpells();const only={...event,hits:[event.hits[0]]};
        for(const renderer of ['svg','webgl']) {
            choose(renderer);clearSpells();const card=getCombatEffectCard(ids[0]),next=card.nextSibling;card.remove();flushCombatEffects([only]);
            check(renderer+' ignores Bolts whose target plate disappeared',!elements.combatPanel.querySelector('.spell-effect')&&!CombatWebGL.status().active);elements.enemyRoster.insertBefore(card,next);
        }
        const roster=state.monsterStates;state.monsterStates=roster.filter(monster=>monster.id!==ids[0]);flushCombatEffects([only]);check('leftover plates cannot receive Bolts for removed monsters',!CombatWebGL.status().active);state.monsterStates=roster;
        toggle('projectiles',false);clearSpells();flushCombatEffects([event]);check('projectile settings suppress queued Bolt visuals',!CombatWebGL.status().active&&!elements.combatPanel.querySelector('.spell-effect'));toggle('projectiles',true);
        toggle('abilities',false);clearSpells();flushCombatEffects([event]);check('ability settings also suppress queued Bolts',!CombatWebGL.status().active);toggle('abilities',true);clearSpells();
        try {Object.defineProperty(document,'hidden',{configurable:true,value:true});flushCombatEffects([event]);check('backgrounding the app discards queued Bolt effects',!CombatWebGL.status().active);}
        finally {restoreHidden();}
        const originalMap=state.selectedMap;
        try {state.selectedMap=mapData.find(entry=>entry.id!==originalMap).id;flushCombatEffects([event]);check('map changes discard stale Bolt events',!CombatWebGL.status().active);}
        finally {state.selectedMap=originalMap;}
        state.currentView='inventory';flushCombatEffects([event]);check('leaving combat discards Bolt visuals',!CombatWebGL.status().active);state.currentView='map';
        toggle('all',false);clearSpells();flushCombatEffects([event]);check('the master switch suppresses queued Bolt visuals',!CombatWebGL.status().active&&!elements.combatPanel.querySelector('.spell-effect'));
        check('no browser script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error){checks.push(error.stack||String(error));}
    finally {Math.random=originalRandom;showSpellCast=originalShow;getVoidMissileSchedule=originalSchedule;getCombatEffectCard=originalGetCard;getCombatEffectBounds=originalBounds;CombatSettings.enabled=originalEnabled;itemById.testAmulet.stats=originalStats;CombatWebGL.trail=originalTrail;CombatWebGL.emit=originalGpuEmit;restoreHidden();clearSpells();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
