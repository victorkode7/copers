(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const originalRandom=Math.random,originalEmit=emitCombatEvent,originalGetCard=getCombatEffectCard;
    const originalEnabled=CombatSettings.enabled,originalPulse=CombatWebGLEffects.pulse;
    const panelDescriptor=Object.getOwnPropertyDescriptor(elements,'playerHealthPanel'),panel=elements.playerHealthPanel;
    const hiddenDescriptor=Object.getOwnPropertyDescriptor(document,'hidden');
    const choose=value=>{const select=document.getElementById('combatEffectRenderer');select.value=value;select.dispatchEvent(new Event('change'));};
    const toggle=(key,value)=>{const button=document.querySelector(`[data-effect-setting="${key}"]`);if(button.getAttribute('aria-checked')!==String(value))button.click();};
    const restoreHidden=()=>{if(hiddenDescriptor)Object.defineProperty(document,'hidden',hiddenDescriptor);else delete document.hidden;};
    const track=id=>getCombatEffectCard(id).querySelector('.health-track');
    function resetImpacts() {
        panel.classList.remove('is-shield-blocking');
        elements.enemyRoster.querySelectorAll('.is-shockwave-hit,.is-shockwave-splashed').forEach(element=>element.classList.remove('is-shockwave-hit','is-shockwave-splashed'));
        CombatWebGL.clear();
    }
    function collect(action) {
        const previous=combatEffects;combatEffects=[];
        try {action();return combatEffects;}
        finally {combatEffects=previous;}
    }
    try {
        for(const key of ['all','abilities','glows','shaking'])toggle(key,true);choose('svg');
        state.currentView='map';state.isInTown=false;state.skillRanks={shockwaveSlash:1,shieldGenerator:1,resonantGuard:1};state.level=3;
        state.gear=createEmptyGear();state.upgrades={strength:0,haste:0,evasion:0};
        state.pendingEruptions=[];state.pendingVoidMissiles=[];state.shieldStacks=3;state.voidCharges=0;
        clearFury();clearGatheringPower();
        const map=currentMap();map.drops=[];map.itemDrops=[];
        map.spawns=[{id:'impactMob',monsterId:worldContent.monsters[0].id,count:3,overrides:{health:1000,attackDamage:4,attackInterval:.5,accuracy:50,evasion:0,respawnSeconds:.5,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);clearOfflineRecap();state.playerHp=getPlayerMaxHealth();state.combatPaused=false;state.shieldStacks=3;
        state.attackTimer=getAttackSpeed()-.05;render();resetImpacts();
        elements.combatPanel.scrollIntoView({block:'start'});await new Promise(resolve=>requestAnimationFrame(resolve));
        const [a,b,c]=state.monsterStates,initial=JSON.stringify(state),hp=state.playerHp;
        let queued;
        try {
            Object.defineProperty(elements,'playerHealthPanel',{configurable:true,get(){throw new Error('Impact calculation accessed player HTML');}});
            getCombatEffectCard=()=>{throw new Error('Impact calculation looked up a monster plate');};
            Object.defineProperty(document,'hidden',{configurable:true,get(){throw new Error('Impact calculation read visibility');}});
            CombatSettings.enabled=()=>{throw new Error('Impact calculation read effect settings');};
            Math.random=()=>0;queued=collect(()=>{applyDamageToPlayer(10000);triggerShockwaveSlash(a,30);});
        } finally {Object.defineProperty(elements,'playerHealthPanel',panelDescriptor);getCombatEffectCard=originalGetCard;restoreHidden();CombatSettings.enabled=originalEnabled;}
        const shield=queued.find(event=>event.type==='playerShieldBlocked');
        const wave=queued.filter(event=>event.type==='monsterShockwaveFlash'||event.type==='monsterShockwaveShake');
        check('real shield blocks and Shockwave hits emit map-scoped records without presentation access',shield?.mapId===map.id&&wave.length===4&&wave.every(event=>event.mapId===map.id&&[b.id,c.id].includes(event.monsterId)));
        check('blocking a lethal hit and gaining a resonance shield preserve health and shield math',state.playerHp===hp&&state.shieldStacks===3&&!state.combatPaused);
        check('Shockwave keeps its original splash damage and leaves its source untouched',a.hp===1000&&Math.abs(b.hp-990.1)<1e-8&&Math.abs(c.hp-990.1)<1e-8);
        check('collecting impacts does not start visual effects',!panel.classList.contains('is-shield-blocking')&&!elements.enemyRoster.querySelector('.is-shockwave-hit,.is-shockwave-splashed'));
        const before=JSON.stringify(state);Math.random=()=>{throw new Error('Impact presentation consumed combat randomness');};flushCombatEffects(queued);
        check('presentation preserves state and displays all original impact effects',JSON.stringify(state)===before&&panel.classList.contains('is-shield-blocking')&&[b,c].every(monster=>getCombatEffectCard(monster.id).classList.contains('is-shockwave-splashed')&&track(monster.id).classList.contains('is-shockwave-hit'))&&!getCombatEffectCard(a.id).classList.contains('is-shockwave-splashed'));
        const animations=[...panel.getAnimations(),...getCombatEffectCard(b.id).getAnimations(),...track(b.id).getAnimations()];
        check('CSS shield, health flash and plate impact retain their original durations',animations.some(animation=>animation.animationName==='shield-block-flash'&&animation.effect.getTiming().duration===400)&&animations.some(animation=>animation.animationName==='shockwave-health-impact'&&animation.effect.getTiming().duration===380)&&animations.some(animation=>animation.animationName==='shockwave-card-hit'&&animation.effect.getTiming().duration===650));
        await Promise.race([Promise.all(animations.map(animation=>animation.finished.catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,1600))]);
        await new Promise(resolve=>requestAnimationFrame(resolve));
        check('Shockwave animation cleanup still removes both impact classes',!getCombatEffectCard(b.id).classList.contains('is-shockwave-splashed')&&!track(b.id).classList.contains('is-shockwave-hit'));
        const sample=[shield,...wave.filter(event=>event.monsterId===b.id)];
        resetImpacts();toggle('glows',false);flushCombatEffects(sample);
        check('glows off suppresses shield and health flashes while retaining plate impacts',!panel.classList.contains('is-shield-blocking')&&!track(b.id).classList.contains('is-shockwave-hit')&&getCombatEffectCard(b.id).classList.contains('is-shockwave-splashed'));
        toggle('glows',true);toggle('shaking',false);resetImpacts();flushCombatEffects(sample);
        check('shaking off suppresses plate impacts while retaining both glow effects',panel.classList.contains('is-shield-blocking')&&track(b.id).classList.contains('is-shockwave-hit')&&!getCombatEffectCard(b.id).classList.contains('is-shockwave-splashed'));
        toggle('shaking',true);toggle('abilities',false);resetImpacts();flushCombatEffects(sample);
        check('abilities off suppresses both Shockwave effects independently of shield feedback',panel.classList.contains('is-shield-blocking')&&!track(b.id).classList.contains('is-shockwave-hit')&&!getCombatEffectCard(b.id).classList.contains('is-shockwave-splashed'));
        toggle('abilities',true);resetImpacts();flushCombatEffects([()=>flushCombatEffects(sample)]);
        check('nested effect batches preserve impact animation restarts',panel.classList.contains('is-shield-blocking')&&track(b.id).classList.contains('is-shockwave-hit')&&getCombatEffectCard(b.id).classList.contains('is-shockwave-splashed'));
        resetImpacts();state.playerHp=hp;state.shieldStacks=1;
        const self=collect(()=>applyDamageToPlayer(5,'self'));
        check('self damage still bypasses shields and never emits a block',state.playerHp===hp-5&&state.shieldStacks===1&&!self.some(event=>event.type==='playerShieldBlocked'));
        const invalid=collect(()=>{for(const amount of [0,-1,Infinity,NaN])applyDamageToPlayer(amount);});
        check('invalid damage never spends shields or emits impacts',invalid.length===0&&state.shieldStacks===1);
        state.playerHp=0;const dead=collect(()=>applyDamageToPlayer(10));
        check('dead players do not spend shields or show a block',dead.length===0&&state.shieldStacks===1);
        state.playerHp=1;state.shieldStacks=0;const lethal=collect(()=>applyDamageToPlayer(10));
        check('unshielded lethal hits retain the damage and death path',state.playerHp===0&&state.combatPaused&&!lethal.some(event=>event.type==='playerShieldBlocked')&&lethal.some(event=>event.type==='playerDamaged'));

        function fight(collectEffects,legacy=false) {
            Object.assign(state,JSON.parse(initial));combatStatCache=null;resetDamageBreakdown(map.id);
            state.monsterStates.forEach(monster=>{monster.hp=5;});syncLegacyEnemyState();
            let seed=9387,rolls=0,blocks=0,flashes=0,shakes=0;
            Math.random=()=>{rolls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            if(legacy)emitCombatEvent=(type,details)=>{
                if(type==='playerShieldBlocked')presentCombatEffect(()=>restartCombatAnimation(elements.playerHealthPanel,'is-shield-blocking'));
                else if(type==='monsterShockwaveFlash') {
                    if(!combatEffectEnabled('glows')||!combatEffectEnabled('abilities'))return;
                    presentCombatEffect(()=>{const element=getCombatEffectCard(details.monsterId)?.querySelector('.health-track');if(element)restartCombatAnimation(element,'is-shockwave-hit');});
                } else if(type==='monsterShockwaveShake') {
                    if(!combatEffectEnabled('shaking')||!combatEffectEnabled('abilities'))return;
                    presentCombatEffect(()=>{const element=getCombatEffectCard(details.monsterId);if(element)restartCombatAnimation(element,'is-shockwave-splashed');});
                } else originalEmit(type,details);
            };
            try {
                for(let index=0;index<200;index++) {
                    const result=simulateCombatStep(.1,collectEffects);
                    blocks+=result.effects.filter(event=>event.type==='playerShieldBlocked').length;flashes+=result.effects.filter(event=>event.type==='monsterShockwaveFlash').length;shakes+=result.effects.filter(event=>event.type==='monsterShockwaveShake').length;
                    if(!collectEffects&&result.effects.length)throw new Error('Offline combat retained impact visuals');
                }
            } finally {emitCombatEvent=originalEmit;}
            return {state:JSON.stringify({state,damage:getDamageBreakdown()}),rolls,blocks,flashes,shakes};
        }
        const legacy=fight(true,true),live=fight(true),offline=fight(false);
        check('impact events preserve original seeded shield use, damage, kills, rewards and random rolls',legacy.state===live.state&&legacy.rolls===live.rolls&&live.blocks>0&&live.flashes>0&&live.shakes>0);
        check('offline combat matches without retaining impact events',offline.state===live.state&&offline.rolls===live.rolls&&offline.blocks===0&&offline.flashes===0&&offline.shakes===0);
        render();resetImpacts();const targetCard=getCombatEffectCard(b.id),targetTrack=track(b.id),seen=[];
        choose('webgl');resetImpacts();CombatWebGLEffects.pulse=(element,name)=>{seen.push({element,name});return originalPulse(element,name);};
        flushCombatEffects(sample);CombatWebGLEffects.pulse=originalPulse;
        check('WebGL routes shield and Shockwave glows to the correct elements',seen.some(pulse=>pulse.element===panel&&pulse.name==='is-shield-blocking')&&seen.some(pulse=>pulse.element===targetTrack&&pulse.name==='is-shockwave-hit')&&CombatWebGL.status().types.includes('pulse'));
        check('WebGL mode keeps plate impacts in HTML',targetCard.classList.contains('is-shockwave-splashed')&&!targetTrack.classList.contains('is-shockwave-hit'));
        resetImpacts();
        try {
            Object.defineProperty(document,'hidden',{configurable:true,value:true});flushCombatEffects(sample);
            check('backgrounding the app suppresses queued impacts',!CombatWebGL.status().active&&!panel.classList.contains('is-shield-blocking')&&!targetCard.classList.contains('is-shockwave-splashed'));
        } finally {restoreHidden();}
        const originalMap=state.selectedMap;
        try {state.selectedMap=mapData.find(entry=>entry.id!==originalMap).id;flushCombatEffects(sample);check('map changes discard shield and Shockwave impact events',!CombatWebGL.status().active&&!panel.classList.contains('is-shield-blocking')&&!targetCard.classList.contains('is-shockwave-splashed'));}
        finally {state.selectedMap=originalMap;}
        state.currentView='inventory';flushCombatEffects(sample);check('leaving combat discards impact events',!CombatWebGL.status().active&&!targetCard.classList.contains('is-shockwave-splashed'));state.currentView='map';
        const next=targetCard.nextSibling;targetCard.remove();flushCombatEffects(sample.filter(event=>event.monsterId));
        check('missing target plates cannot create Shockwave impact effects',!CombatWebGL.status().active&&!targetCard.classList.contains('is-shockwave-splashed'));elements.enemyRoster.insertBefore(targetCard,next);
        toggle('all',false);resetImpacts();flushCombatEffects(sample);
        check('the master switch suppresses all impact effects',!CombatWebGL.status().active&&!panel.classList.contains('is-shield-blocking')&&!targetCard.classList.contains('is-shockwave-splashed'));
        check('no browser script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error){checks.push(error.stack||String(error));}
    finally {Math.random=originalRandom;emitCombatEvent=originalEmit;getCombatEffectCard=originalGetCard;CombatSettings.enabled=originalEnabled;CombatWebGLEffects.pulse=originalPulse;Object.defineProperty(elements,'playerHealthPanel',panelDescriptor);restoreHidden();resetImpacts();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
