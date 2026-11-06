(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const originalRandom=Math.random,originalEmit=emitCombatEvent,originalFlash=flashPlayerHealthBar;
    const originalEnabled=CombatSettings.enabled,originalPulse=CombatWebGLEffects.pulse;
    const hiddenDescriptor=Object.getOwnPropertyDescriptor(document,'hidden');
    const trackDescriptor=Object.getOwnPropertyDescriptor(elements,'playerHealthTrack');
    const damageDescriptor=Object.getOwnPropertyDescriptor(elements,'playerHealthDamage');
    const track=elements.playerHealthTrack,indicator=elements.playerHealthDamage;
    const choose=value=>{const select=document.getElementById('combatEffectRenderer');select.value=value;select.dispatchEvent(new Event('change'));};
    const toggle=(key,value)=>{const button=document.querySelector(`[data-effect-setting="${key}"]`);if(button.getAttribute('aria-checked')!==String(value))button.click();};
    const restoreHidden=()=>{if(hiddenDescriptor)Object.defineProperty(document,'hidden',hiddenDescriptor);else delete document.hidden;};
    function resetFeedback() {
        clearTimeout(damageFadeTimeout);damageFadeTimeout=0;recentPlayerDamage=0;
        track.classList.remove('is-damaged');indicator.classList.remove('is-visible');CombatWebGL.clear();
    }
    function damage(amount,source='enemy') {
        const previous=combatEffects;combatEffects=[];
        try {applyDamageToPlayer(amount,source);return combatEffects;}
        finally {combatEffects=previous;}
    }
    try {
        toggle('all',true);toggle('glows',true);choose('svg');
        state.currentView='map';state.isInTown=false;state.skillRanks={};state.level=1;
        state.gear=createEmptyGear();state.upgrades={strength:0,haste:0,evasion:0};
        state.pendingEruptions=[];state.pendingVoidMissiles=[];state.shieldStacks=0;state.voidCharges=0;
        clearFury();clearGatheringPower();
        const map=currentMap();map.drops=[];map.itemDrops=[];
        map.spawns=[{id:'damageEventMob',monsterId:worldContent.monsters[0].id,count:1,overrides:{
            health:10000,attackDamage:7,attackInterval:.2,accuracy:100,evasion:0,respawnSeconds:2,
            gold:[0,0],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);clearOfflineRecap();state.playerHp=getPlayerMaxHealth();state.combatPaused=false;
        state.attackTimer=-100;state.monsterStates[0].attackTimer=.15;render();resetFeedback();
        const initial=JSON.stringify(state),maxHp=state.playerHp,fullBar=elements.playerHealthBar.style.transform;
        let step;
        try {
            for(const key of ['playerHealthTrack','playerHealthDamage'])Object.defineProperty(elements,key,{configurable:true,get(){throw new Error('Simulation accessed damage HTML');}});
            Object.defineProperty(document,'hidden',{configurable:true,get(){throw new Error('Simulation read document visibility');}});
            CombatSettings.enabled=()=>{throw new Error('Simulation consulted visual settings');};
            Math.random=()=>0;step=simulateCombatStep(.1,true);
        } finally {
            Object.defineProperty(elements,'playerHealthTrack',trackDescriptor);Object.defineProperty(elements,'playerHealthDamage',damageDescriptor);
            restoreHidden();CombatSettings.enabled=originalEnabled;
        }
        const hit=step.effects.find(event=>event.type==='playerDamaged');
        check('a real enemy hit records actual damage without accessing HTML, visibility or visual settings',hit?.damage===7&&state.playerHp===maxHp-7);
        check('simulation applies health loss without starting damage feedback',recentPlayerDamage===0&&!track.classList.contains('is-damaged')&&!indicator.classList.contains('is-visible'));
        renderCombat();
        check('health text and bar update from state even without presenting the event',elements.playerHealthText.textContent===`${maxHp-7} / ${maxHp} HP`&&elements.playerHealthBar.style.transform!==fullBar);
        const before=JSON.stringify(state);Math.random=()=>{throw new Error('Presentation consumed a combat random roll');};
        flushCombatEffects(step.effects);
        check('presentation preserves combat state and starts the original flash and damage segment',JSON.stringify(state)===before&&track.classList.contains('is-damaged')&&indicator.classList.contains('is-visible')&&recentPlayerDamage===7);
        await new Promise(resolve=>setTimeout(resolve,550));
        check('the damage segment still disappears after its original timeout',!indicator.classList.contains('is-visible'));
        resetFeedback();state.playerHp=maxHp;state.combatPaused=false;
        const hits=[...damage(3),...damage(5)],shown=[];
        flashPlayerHealthBar=()=>{shown.push(recentPlayerDamage);originalFlash();};flushCombatEffects(hits);flashPlayerHealthBar=originalFlash;
        check('batched hits retain their own damage snapshots and original order',shown.join(',')==='3,5'&&recentPlayerDamage===5&&state.playerHp===maxHp-8);

        function fight(collect,legacy=false) {
            Object.assign(state,JSON.parse(initial));combatStatCache=null;
            let seed=9387,rolls=0,events=0;
            Math.random=()=>{rolls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            if(legacy)emitCombatEvent=(type,details)=>{
                if(type==='playerDamaged')presentCombatEffect(()=>{
                    recentPlayerDamage=details.damage;flashPlayerHealthBar();
                    restartCombatAnimation(elements.playerHealthDamage,'is-visible');clearTimeout(damageFadeTimeout);
                    damageFadeTimeout=setTimeout(()=>elements.playerHealthDamage.classList.remove('is-visible'),500);
                });
                else originalEmit(type,details);
            };
            try {
                for(let index=0;index<200;index++) {
                    const result=simulateCombatStep(.1,collect);
                    events+=result.effects.filter(event=>event.type==='playerDamaged').length;
                    if(!collect&&result.effects.length)throw new Error('Offline combat retained presentation work');
                }
            } finally {emitCombatEvent=originalEmit;}
            return {state:JSON.stringify(state),rolls,events};
        }
        const legacy=fight(true,true),live=fight(true),offline=fight(false);
        check('damage and death match the original seeded simulation with identical random rolls',legacy.state===live.state&&legacy.rolls===live.rolls&&live.events>0&&state.playerHp===0&&state.combatPaused);
        check('offline combat matches live results without retaining visual events',offline.state===live.state&&offline.rolls===live.rolls&&offline.events===0);
        resetFeedback();state.playerHp=maxHp;state.combatPaused=false;state.skillRanks={shieldGenerator:1};state.shieldStacks=1;
        const blocked=damage(7);
        check('a shield blocks health damage and emits no damage event',state.playerHp===maxHp&&state.shieldStacks===0&&!blocked.some(event=>event.type==='playerDamaged'));
        state.shieldStacks=1;const self=damage(7,'self');
        check('self damage still bypasses shields and snapshots the actual loss',state.playerHp===maxHp-7&&state.shieldStacks===1&&self.find(event=>event.type==='playerDamaged')?.damage===7);
        state.skillRanks={};state.shieldStacks=0;state.playerHp=3;state.attackTimer=.5;
        const fatal=damage(100);
        check('lethal damage clamps health, pauses attacks and records only the remaining HP',state.playerHp===0&&state.combatPaused&&state.attackTimer===0&&fatal.find(event=>event.type==='playerDamaged')?.damage===3);
        flushCombatEffects(fatal);renderCombat();
        check('a lethal hit still displays feedback with authoritative zero health',recentPlayerDamage===3&&indicator.classList.contains('is-visible')&&elements.playerHealthText.textContent===`0 / ${maxHp} HP`);
        check('dead players receive no further damage events',damage(5).length===0);
        state.playerHp=10;state.combatPaused=false;
        check('invalid or zero damage produces no event or health loss',[0,-1,Infinity,NaN].every(amount=>damage(amount).length===0)&&state.playerHp===10);

        Object.assign(state,JSON.parse(initial));state.playerHp=maxHp-7;render();resetFeedback();toggle('glows',false);flushCombatEffects([hit]);
        check('disabling glows removes the flash while retaining the damage segment',!track.classList.contains('is-damaged')&&indicator.classList.contains('is-visible')&&recentPlayerDamage===7);
        toggle('glows',true);resetFeedback();
        try {
            Object.defineProperty(document,'hidden',{configurable:true,value:true});flushCombatEffects([hit]);
            check('queued damage visuals are suppressed when the app enters the background',recentPlayerDamage===0&&!track.classList.contains('is-damaged')&&!indicator.classList.contains('is-visible'));
        } finally {restoreHidden();}
        choose('webgl');resetFeedback();const pulses=[];
        CombatWebGLEffects.pulse=(element,name)=>{pulses.push({element,name});return originalPulse(element,name);};
        flushCombatEffects([hit]);CombatWebGLEffects.pulse=originalPulse;
        check('WebGL presents the damage pulse on the player health track and retains the HTML segment',pulses.some(pulse=>pulse.element===track&&pulse.name==='is-damaged')&&CombatWebGL.status().types.includes('pulse')&&!track.classList.contains('is-damaged')&&indicator.classList.contains('is-visible'));
        toggle('all',false);resetFeedback();flushCombatEffects([hit]);renderCombat();
        check('the master switch suppresses feedback while health information stays current',!CombatWebGL.status().active&&!indicator.classList.contains('is-visible')&&recentPlayerDamage===0&&elements.playerHealthText.textContent===`${maxHp-7} / ${maxHp} HP`);
        check('no browser script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error){checks.push(error.stack||String(error));}
    finally {
        Math.random=originalRandom;emitCombatEvent=originalEmit;flashPlayerHealthBar=originalFlash;
        CombatSettings.enabled=originalEnabled;CombatWebGLEffects.pulse=originalPulse;restoreHidden();
        Object.defineProperty(elements,'playerHealthTrack',trackDescriptor);Object.defineProperty(elements,'playerHealthDamage',damageDescriptor);resetFeedback();
    }
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
