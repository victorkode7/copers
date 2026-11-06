(async function () {
    const checks=[];
    const check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const originalRandom=Math.random,originalEmit=emitCombatEvent,originalFlash=flashDodge;
    const originalEnabled=CombatSettings.enabled;
    const originalGetCard=getCombatEffectCard;
    const trackDescriptor=Object.getOwnPropertyDescriptor(elements,'playerHealthTrack');
    const hiddenDescriptor=Object.getOwnPropertyDescriptor(document,'hidden');
    const track=elements.playerHealthTrack;
    const choose=value=>{const select=document.getElementById('combatEffectRenderer');select.value=value;select.dispatchEvent(new Event('change'));};
    const toggle=(key,value)=>{const button=document.querySelector(`[data-effect-setting="${key}"]`);if(button.getAttribute('aria-checked')!==String(value))button.click();};
    const restoreHidden=()=>{if(hiddenDescriptor)Object.defineProperty(document,'hidden',hiddenDescriptor);else delete document.hidden;};
    function resetFlash() {
        for(const element of [track,...elements.enemyRoster.querySelectorAll('.health-track')]) {
            clearTimeout(dodgeFlashTimeouts.get(element));dodgeFlashTimeouts.delete(element);
            element.classList.remove('is-dodging');
        }
        CombatWebGL.clear();
    }
    try {
        toggle('all',true);toggle('glows',true);choose('svg');
        state.currentView='map';state.isInTown=false;state.skillRanks={};state.level=1;
        state.gear=createEmptyGear();state.upgrades={strength:0,haste:0,evasion:0};
        state.pendingEruptions=[];state.pendingVoidMissiles=[];state.shieldStacks=0;state.voidCharges=0;
        clearFury();clearGatheringPower();
        const map=currentMap();map.drops=[];map.itemDrops=[];
        map.spawns=[{id:'eventMob',monsterId:worldContent.monsters[0].id,count:1,overrides:{
            health:10000,attackDamage:1,attackInterval:1,accuracy:50,evasion:0,respawnSeconds:2,
            gold:[0,0],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);clearOfflineRecap();state.playerHp=getPlayerMaxHealth();state.combatPaused=false;
        state.attackTimer=-100;state.monsterStates[0].attackTimer=.95;render();resetFlash();
        const initial=JSON.stringify(state);
        let isolated;
        try {
            Object.defineProperty(elements,'playerHealthTrack',{configurable:true,get(){throw new Error('Simulation accessed the dodge HTML element');}});
            Object.defineProperty(document,'hidden',{configurable:true,get(){throw new Error('Simulation read document visibility');}});
            CombatSettings.enabled=()=>{throw new Error('Simulation consulted visual settings');};
            Math.random=()=>.999;
            isolated=simulateCombatStep(.1,true);
        } finally {
            Object.defineProperty(elements,'playerHealthTrack',trackDescriptor);restoreHidden();CombatSettings.enabled=originalEnabled;
        }
        const dodge=isolated.effects.find(effect=>effect.type==='playerDodged');
        check('a real enemy miss queues a data record without accessing HTML, visibility or visual settings',!!dodge);
        check('collecting a dodge leaves player health and the interface unchanged',state.playerHp===JSON.parse(initial).playerHp&&!track.classList.contains('is-dodging'));

        function fight(collect,legacy=false,startingState=initial) {
            Object.assign(state,JSON.parse(startingState));combatStatCache=null;
            let seed=9387,rolls=0,events=0,monsterEvents=0;
            Math.random=()=>{rolls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            if(legacy)emitCombatEvent=(type,details)=>{
                if(type==='playerDodged')flashDodge(elements.playerHealthTrack);
                else if(type==='monsterDodged')presentCombatEffect(()=>{
                    const card=getCombatEffectCard(details.monsterId),targetTrack=card&&card.querySelector('.health-track');
                    if(targetTrack)flashDodge(targetTrack);
                });
                else if(type==='playerDamaged')presentCombatEffect(()=>showPlayerDamage(details.damage));
            };
            try {
                for(let step=0;step<200;step++) {
                    const result=simulateCombatStep(.1,collect);
                    events+=result.effects.filter(effect=>effect.type==='playerDodged').length;
                    monsterEvents+=result.effects.filter(effect=>effect.type==='monsterDodged').length;
                    if(!collect&&result.effects.length)throw new Error('Offline simulation retained presentation work');
                }
            } finally {emitCombatEvent=originalEmit;}
            return {state:JSON.stringify(state),rolls,events,monsterEvents};
        }
        const legacy=fight(true,true),live=fight(true),offline=fight(false);
        check('seeded combat state and random-roll count match the original dodge path',live.state===legacy.state&&live.rolls===legacy.rolls&&live.events>0);
        check('offline simulation matches live combat and retains no dodge events',live.state===offline.state&&live.rolls===offline.rolls&&offline.events===0);
        render();resetFlash();
        const order=[];
        flashDodge=element=>{order.push('dodge');originalFlash(element);};
        flushCombatEffects([()=>order.push('before'),dodge,()=>order.push('after')]);
        check('event records and existing callbacks retain their order in the same batch',order.join(',')==='before,dodge,after');
        check('presenting the record still starts the original dodge animation',track.classList.contains('is-dodging'));
        flashDodge=originalFlash;
        await new Promise(resolve=>setTimeout(resolve,470));
        check('the dodge animation still cleans itself up',!track.classList.contains('is-dodging')&&!dodgeFlashTimeouts.has(track));
        flushCombatEffects([()=>flushCombatEffects([dodge])]);
        check('nested effect batches also present data events',track.classList.contains('is-dodging'));
        resetFlash();emitCombatEvent('playerDodged');
        check('events outside simulation can still be presented immediately',track.classList.contains('is-dodging'));
        resetFlash();toggle('glows',false);flushCombatEffects([dodge]);
        check('presentation respects the current glow setting',!track.classList.contains('is-dodging')&&!dodgeFlashTimeouts.has(track));
        toggle('glows',true);
        try {
            Object.defineProperty(document,'hidden',{configurable:true,value:true});flushCombatEffects([dodge]);
            check('a queued dodge is not displayed after the app enters the background',!track.classList.contains('is-dodging')&&!dodgeFlashTimeouts.has(track));
        } finally {restoreHidden();}
        choose('webgl');resetFlash();flushCombatEffects([dodge]);
        check('the same event still reaches the WebGL glow renderer',CombatWebGL.status().types.includes('pulse')&&!track.classList.contains('is-dodging'));

        choose('svg');resetFlash();
        map.spawns[0].count=2;map.spawns[0].overrides.evasion=60;resetMonsterStates(map);
        state.targetMonsterId=state.monsterStates[1].id;state.playerHp=getPlayerMaxHealth();state.combatPaused=false;
        state.attackTimer=getAttackSpeed()-.05;render();resetFlash();
        const monsterInitial=JSON.stringify(state),targetId=state.targetMonsterId;
        let monsterStep;
        try {
            getCombatEffectCard=()=>{throw new Error('Simulation looked up a monster plate');};
            Object.defineProperty(document,'hidden',{configurable:true,get(){throw new Error('Simulation read document visibility');}});
            CombatSettings.enabled=()=>{throw new Error('Simulation consulted visual settings');};
            Math.random=()=>.999;
            monsterStep=simulateCombatStep(.1,true);
        } finally {getCombatEffectCard=originalGetCard;restoreHidden();CombatSettings.enabled=originalEnabled;}
        const monsterDodge=monsterStep.effects.find(effect=>effect.type==='monsterDodged');
        check('a missed attack queues the target ID and map without accessing presentation',monsterDodge?.monsterId===targetId&&monsterDodge.mapId===map.id);
        check('collecting a monster dodge leaves health and plate visuals unchanged',state.monsterStates.every(monster=>monster.hp===10000)&&!elements.enemyRoster.querySelector('.is-dodging'));
        const monsterLegacy=fight(true,true,monsterInitial),monsterLive=fight(true,false,monsterInitial),monsterOffline=fight(false,false,monsterInitial);
        check('monster dodge events preserve original seeded combat and random rolls',monsterLive.state===monsterLegacy.state&&monsterLive.rolls===monsterLegacy.rolls&&monsterLive.monsterEvents>0);
        check('offline combat matches with no monster dodge events retained',monsterLive.state===monsterOffline.state&&monsterLive.rolls===monsterOffline.rolls&&monsterOffline.monsterEvents===0);
        render();resetFlash();
        const targetCard=getCombatEffectCard(targetId),targetTrack=targetCard.querySelector('.health-track');
        const otherTrack=elements.enemyRoster.firstElementChild.querySelector('.health-track');
        flushCombatEffects([monsterDodge]);
        check('only the identified monster plate displays the original dodge animation',targetTrack.classList.contains('is-dodging')&&!otherTrack.classList.contains('is-dodging')&&!track.classList.contains('is-dodging'));
        await new Promise(resolve=>setTimeout(resolve,470));
        check('monster dodge animations still clean themselves up',!targetTrack.classList.contains('is-dodging')&&!dodgeFlashTimeouts.has(targetTrack));
        toggle('glows',false);flushCombatEffects([monsterDodge]);
        check('disabled glows suppress monster dodge events',!targetTrack.classList.contains('is-dodging')&&!dodgeFlashTimeouts.has(targetTrack));
        toggle('glows',true);
        const originalMap=state.selectedMap;
        try {
            state.selectedMap=mapData.find(entry=>entry.id!==originalMap).id;
            flushCombatEffects([monsterDodge]);
            check('map changes discard stale dodge events even if a matching plate exists',!targetTrack.classList.contains('is-dodging'));
        } finally {state.selectedMap=originalMap;}
        state.currentView='inventory';flushCombatEffects([monsterDodge]);
        check('leaving the combat view discards queued monster dodge visuals',!targetTrack.classList.contains('is-dodging'));
        state.currentView='map';
        const nextCard=targetCard.nextSibling;targetCard.remove();flushCombatEffects([monsterDodge]);
        check('disappeared monster plates are safely ignored',!dodgeFlashTimeouts.has(targetTrack));
        elements.enemyRoster.insertBefore(targetCard,nextCard);
        const seen=[];
        flashDodge=element=>{seen.push(element);originalFlash(element);};
        choose('webgl');resetFlash();flushCombatEffects([monsterDodge]);
        check('WebGL receives the same monster event on the correct health track',seen.length===1&&seen[0]===targetTrack&&CombatWebGL.status().types.includes('pulse')&&!targetTrack.classList.contains('is-dodging'));
        flashDodge=originalFlash;
        toggle('all',false);flushCombatEffects([dodge,monsterDodge]);
        check('the master effects switch suppresses queued dodge visuals',!CombatWebGL.status().active&&!track.classList.contains('is-dodging'));
        check('no browser script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error){checks.push(error.stack||String(error));}
    finally {
        Math.random=originalRandom;emitCombatEvent=originalEmit;flashDodge=originalFlash;getCombatEffectCard=originalGetCard;CombatSettings.enabled=originalEnabled;
        Object.defineProperty(elements,'playerHealthTrack',trackDescriptor);restoreHidden();resetFlash();
    }
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
