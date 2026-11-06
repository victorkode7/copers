(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const originalRandom=Math.random,originalEmit=emitCombatEvent,originalGetCard=getCombatEffectCard;
    const originalEnabled=CombatSettings.enabled,originalStats=itemById.testAmulet.stats,originalPulse=CombatWebGLEffects.pulse;
    const hiddenDescriptor=Object.getOwnPropertyDescriptor(document,'hidden');
    const choose=value=>{const select=document.getElementById('combatEffectRenderer');select.value=value;select.dispatchEvent(new Event('change'));};
    const toggle=(key,value)=>{const button=document.querySelector(`[data-effect-setting="${key}"]`);if(button.getAttribute('aria-checked')!==String(value))button.click();};
    const restoreHidden=()=>{if(hiddenDescriptor)Object.defineProperty(document,'hidden',hiddenDescriptor);else delete document.hidden;};
    const badges=id=>{const card=getCombatEffectCard(id);return [card.querySelector('[data-enemy-dot-status]'),card.querySelector('[data-enemy-bleed-status]')];};
    const counts=id=>badges(id).map((badge,index)=>badge.querySelector(index?'[data-enemy-bleed-count]':'[data-enemy-dot-count]').textContent);
    function resetPulses() {elements.enemyRoster.querySelectorAll('.is-applying').forEach(element=>element.classList.remove('is-applying'));CombatWebGL.clear();}
    function collect(action) {
        const previous=combatEffects;combatEffects=[];
        try {action();return combatEffects;}
        finally {combatEffects=previous;}
    }
    try {
        toggle('all',true);toggle('abilities',true);toggle('glows',true);choose('svg');
        state.currentView='map';state.isInTown=false;state.skillRanks={};state.level=1;
        state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];
        itemById.testAmulet.stats={poisonChance:1,bleedChance:1};state.upgrades={strength:0,haste:0,evasion:0};
        state.pendingEruptions=[];state.pendingVoidMissiles=[];state.shieldStacks=0;state.voidCharges=0;
        clearFury();clearGatheringPower();
        const map=currentMap();map.drops=[];map.itemDrops=[];
        map.spawns=[{id:'stackMob',monsterId:worldContent.monsters[0].id,count:3,overrides:{health:1000,attackDamage:1,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:.5,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);clearOfflineRecap();state.playerHp=getPlayerMaxHealth();state.combatPaused=false;
        state.attackTimer=getAttackSpeed()-.05;render();resetPulses();
        elements.combatPanel.scrollIntoView({block:'start'});await new Promise(resolve=>requestAnimationFrame(resolve));
        const [a,b,c]=state.monsterStates,initial=JSON.stringify(state);
        let queued;
        try {
            getCombatEffectCard=()=>{throw new Error('Applying stacks accessed HTML');};
            Object.defineProperty(document,'hidden',{configurable:true,get(){throw new Error('Applying stacks read visibility');}});
            CombatSettings.enabled=()=>{throw new Error('Applying stacks read visual settings');};
            Math.random=()=>0;queued=collect(()=>{tryApplyPoison(b);tryApplyBleed(b,40);});
        } finally {getCombatEffectCard=originalGetCard;restoreHidden();CombatSettings.enabled=originalEnabled;}
        check('actual poison and bleed applications emit IDs and map data without presentation access',queued.some(event=>event.type==='monsterPoisonApplied'&&event.monsterId===b.id&&event.mapId===map.id)&&queued.some(event=>event.type==='monsterBleedApplied'&&event.monsterId===b.id));
        check('application changes status state without displaying badges',b.poisonStacks.length===1&&b.bleed.stacks===1&&badges(b.id).every(badge=>badge.hidden));
        collect(()=>{tryApplyPoison(b);tryApplyBleed(b,40);});renderCombat();
        check('regular rendering shows current counts without presenting pulse events',counts(b.id).join(',')==='2x,2x'&&badges(b.id).every(badge=>!badge.classList.contains('is-applying')));
        const before=JSON.stringify(state);Math.random=()=>{throw new Error('Stack presentation consumed combat randomness');};flushCombatEffects(queued);
        check('delayed events preserve state and pulse only the correct current stack counts',JSON.stringify(state)===before&&counts(b.id).join(',')==='2x,2x'&&badges(b.id).every(badge=>badge.classList.contains('is-applying'))&&badges(a.id).every(badge=>!badge.classList.contains('is-applying')));
        const animations=badges(b.id).flatMap(badge=>badge.getAnimations());
        await Promise.race([Promise.all(animations.map(animation=>animation.finished)),new Promise(resolve=>setTimeout(resolve,1500))]);
        await new Promise(resolve=>requestAnimationFrame(resolve));
        check('CSS stack pulses clean up while keeping readable counts',badges(b.id).every(badge=>!badge.classList.contains('is-applying'))&&counts(b.id).join(',')==='2x,2x');
        toggle('glows',false);Math.random=()=>0;
        const more=collect(()=>{tryApplyPoison(b);tryApplyBleed(b,40);});flushCombatEffects(more);
        check('disabling decorative glows preserves fresh counts without pulses',counts(b.id).join(',')==='3x,3x'&&badges(b.id).every(badge=>!badge.hidden&&!badge.classList.contains('is-applying'))&&!CombatWebGL.status().active);
        toggle('glows',true);resetPulses();state.skillRanks={deepWounds:1,bleederer:1};b.bleed=null;
        const capped=collect(()=>{for(let index=0;index<4;index++)tryApplyBleed(b,40);});flushCombatEffects(capped);
        check('Deep Wounds and doubled applications retain capped stacks and duration',b.bleed.stacks===3&&b.bleed.baseDamagePerTick===60&&badges(b.id)[1].querySelector('[data-enemy-bleed-count]').textContent==='3x'&&badges(b.id)[1].querySelector('[data-enemy-bleed-duration]').textContent==='5s');
        state.skillRanks={bloomingFlower:1};b.poisonStacks=b.poisonStacks.slice(0,2);resetPulses();
        const transfer=collect(()=>transferPoisonOnDeath(a,[{remainingDuration:5,timeUntilTick:1}]));flushCombatEffects(transfer);
        check('poison transferred by Blooming Flower pulses the recipient with its combined count',b.poisonStacks.length===3&&counts(b.id)[0]==='3x'&&badges(b.id)[0].classList.contains('is-applying'));
        resetPulses();b.poisonStacks=[];b.bleed=null;flushCombatEffects(queued);
        check('expired stacks cannot be shown again by an older event',badges(b.id).every(badge=>badge.hidden&&!badge.classList.contains('is-applying')));
        b.hp=0;b.respawnRemaining=.1;resetPulses();flushCombatEffects(queued);
        check('dead monsters cannot regain visible stack badges from queued pulses',badges(b.id).every(badge=>badge.hidden));
        state.attackTimer=-100;simulateCombatStep(.1,false);renderCombat();flushCombatEffects(queued);
        check('respawned monsters retain empty statuses despite old pulse events',b.hp===1000&&b.poisonStacks.length===0&&!b.bleed&&badges(b.id).every(badge=>badge.hidden));

        function fight(collectEffects,legacy=false) {
            Object.assign(state,JSON.parse(initial));combatStatCache=null;resetDamageBreakdown(map.id);
            state.monsterStates.forEach(monster=>{monster.hp=5;});syncLegacyEnemyState();
            let seed=9387,rolls=0,poison=0,bleed=0;
            Math.random=()=>{rolls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            if(legacy)emitCombatEvent=(type,details)=>{
                if(type!=='monsterPoisonApplied'&&type!=='monsterBleedApplied'){originalEmit(type,details);return;}
                const monster=state.monsterStates.find(entry=>entry.id===details.monsterId);
                if(type==='monsterPoisonApplied') {
                    if(!combatEffectEnabled('glows'))return;
                    presentCombatEffect(()=>{const card=getCombatEffectCard(monster.id),badge=card&&card.querySelector('[data-enemy-dot-status]');if(!badge)return;badge.hidden=false;badge.querySelector('[data-enemy-dot-count]').textContent=monster.poisonStacks.length+'x';restartCombatAnimation(badge,'is-applying');});
                } else presentCombatEffect(()=>{const card=getCombatEffectCard(monster.id),badge=card?.querySelector('[data-enemy-bleed-status]');if(!badge||!monster.bleed||monster.hp<=0)return;updateBleedStatus(badge,monster);restartCombatAnimation(badge,'is-applying');});
            };
            try {
                for(let index=0;index<200;index++) {
                    const result=simulateCombatStep(.1,collectEffects);
                    poison+=result.effects.filter(event=>event.type==='monsterPoisonApplied').length;bleed+=result.effects.filter(event=>event.type==='monsterBleedApplied').length;
                    if(!collectEffects&&result.effects.length)throw new Error('Offline combat retained stack pulses');
                }
            } finally {emitCombatEvent=originalEmit;}
            return {state:JSON.stringify({state,damage:getDamageBreakdown()}),rolls,poison,bleed,kills:state.kills[map.id]};
        }
        const legacy=fight(true,true),live=fight(true),offline=fight(false);
        check('stack events preserve seeded damage, status timers, deaths, rewards and random rolls',legacy.state===live.state&&legacy.rolls===live.rolls&&live.poison>0&&live.bleed>0&&live.kills>JSON.parse(initial).kills[map.id]);
        check('offline combat matches with no poison or bleed events retained',offline.state===live.state&&offline.rolls===live.rolls&&offline.poison===0&&offline.bleed===0);
        render();resetPulses();const target=state.monsterStates.find(monster=>monster.id===b.id);
        Math.random=()=>0;collect(()=>{tryApplyPoison(target);tryApplyBleed(target,40);});
        const expected=[String(target.poisonStacks.length)+'x',String(target.bleed.stacks)+'x'];
        for(const renderer of ['svg','webgl']) {
            choose(renderer);resetPulses();const seen=[];
            CombatWebGLEffects.pulse=(element,name)=>{seen.push({element,name});return originalPulse(element,name);};flushCombatEffects(queued);CombatWebGLEffects.pulse=originalPulse;
            check(renderer+' retains current readable stack counts',counts(target.id).join(',')===expected.join(',')&&badges(target.id).every(badge=>!badge.hidden));
            check(renderer+' routes the pulses to the correct status badges',renderer==='svg'?badges(target.id).every(badge=>badge.classList.contains('is-applying')):badges(target.id).every(badge=>seen.some(pulse=>pulse.element===badge&&pulse.name==='is-applying'))&&CombatWebGL.status().types.includes('pulse'));
        }
        resetPulses();toggle('abilities',false);flushCombatEffects(queued);
        check('status counts remain available independently of ability visuals',counts(target.id).join(',')===expected.join(',')&&badges(target.id).every(badge=>!badge.hidden));
        toggle('abilities',true);resetPulses();
        try {
            Object.defineProperty(document,'hidden',{configurable:true,value:true});flushCombatEffects(queued);
            check('backgrounding the app suppresses queued pulses',!CombatWebGL.status().active&&badges(target.id).every(badge=>!badge.classList.contains('is-applying')));
        } finally {restoreHidden();}
        const originalMap=state.selectedMap;
        try {state.selectedMap=mapData.find(entry=>entry.id!==originalMap).id;flushCombatEffects(queued);check('map changes discard stale stack pulses',!CombatWebGL.status().active);}
        finally {state.selectedMap=originalMap;}
        state.currentView='inventory';flushCombatEffects(queued);check('leaving combat discards stack pulses',!CombatWebGL.status().active);state.currentView='map';
        const card=getCombatEffectCard(target.id),next=card.nextSibling;card.remove();flushCombatEffects(queued);
        check('missing plates do not create pulse effects',!CombatWebGL.status().active);elements.enemyRoster.insertBefore(card,next);
        toggle('all',false);resetPulses();flushCombatEffects(queued);renderCombat();
        check('the master switch suppresses pulses while rendering still shows actual stack counts',!CombatWebGL.status().active&&counts(target.id).join(',')===expected.join(','));
        check('no browser script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error){checks.push(error.stack||String(error));}
    finally {Math.random=originalRandom;emitCombatEvent=originalEmit;getCombatEffectCard=originalGetCard;CombatSettings.enabled=originalEnabled;CombatWebGLEffects.pulse=originalPulse;itemById.testAmulet.stats=originalStats;restoreHidden();resetPulses();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
