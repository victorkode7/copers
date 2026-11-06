(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const originalRandom=Math.random,originalShow=showMonsterProc,originalGetCard=getCombatEffectCard;
    const originalEnabled=CombatSettings.enabled,hiddenDescriptor=Object.getOwnPropertyDescriptor(document,'hidden');
    const choose=value=>{const select=document.getElementById('combatEffectRenderer');select.value=value;select.dispatchEvent(new Event('change'));};
    const toggle=(key,value)=>{const button=document.querySelector(`[data-effect-setting="${key}"]`);if(button.getAttribute('aria-checked')!==String(value))button.click();};
    const restoreHidden=()=>{if(hiddenDescriptor)Object.defineProperty(document,'hidden',hiddenDescriptor);else delete document.hidden;};
    const notice=id=>getCombatEffectCard(id).querySelector('[data-enemy-proc-notice]');
    function resetNotices() {
        for(const element of elements.enemyRoster.querySelectorAll('[data-enemy-proc-notice]')) {
            clearTimeout(monsterProcTimers.get(element));monsterProcTimers.delete(element);
            element.textContent='';element.dataset.activeProcs='';element.classList.remove('is-visible');
        }
    }
    function collect(action) {
        const previous=combatEffects;combatEffects=[];
        try {action();return combatEffects;}
        finally {combatEffects=previous;}
    }
    try {
        toggle('all',true);toggle('abilities',true);toggle('glows',true);choose('svg');
        state.currentView='map';state.isInTown=false;state.skillRanks={shockwaveSlash:1,bloomingFlower:1,poisonExecute:1};state.level=3;
        state.gear=createEmptyGear();state.upgrades={strength:0,haste:0,evasion:0};
        state.pendingEruptions=[];state.pendingVoidMissiles=[];state.shieldStacks=0;state.voidCharges=0;
        clearFury();clearGatheringPower();
        const map=currentMap();map.drops=[];map.itemDrops=[];
        map.spawns=[{id:'procMob',monsterId:worldContent.monsters[0].id,count:3,overrides:{
            health:200,attackDamage:1,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:.5,
            gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);clearOfflineRecap();state.playerHp=getPlayerMaxHealth();state.combatPaused=false;
        state.attackTimer=getAttackSpeed()-.05;render();resetNotices();
        const [a,b,c]=state.monsterStates,initial=JSON.stringify(state);
        let queued;
        try {
            getCombatEffectCard=()=>{throw new Error('Proc collection accessed HTML');};
            Object.defineProperty(document,'hidden',{configurable:true,get(){throw new Error('Proc collection read visibility');}});
            CombatSettings.enabled=()=>{throw new Error('Proc collection read visual settings');};
            queued=collect(()=>showMonsterProc(b.id,'SHOCKWAVE HIT'));
        } finally {getCombatEffectCard=originalGetCard;restoreHidden();CombatSettings.enabled=originalEnabled;}
        const event=queued[0];
        check('proc collection records the monster, map and skill without presentation access',event?.type==='monsterProcNotice'&&event.monsterId===b.id&&event.mapId===map.id&&event.procName==='SHOCKWAVE HIT');
        check('collecting a proc leaves state and notices unchanged',JSON.stringify(state)===initial&&notice(b.id).textContent==='');
        Math.random=()=>0;
        const observer=new MutationObserver(()=>{});observer.observe(elements.enemyRoster,{subtree:true,attributes:true,childList:true,characterData:true});
        const shock=collect(()=>triggerShockwaveSlash(a,10));
        b.hp=1;b.poisonStacks=[{remainingDuration:3,timeUntilTick:1}];
        const execute=collect(()=>tryExecutePoison(b));
        const mutations=observer.takeRecords();observer.disconnect();
        const actual=[...shock,...execute],records=actual.filter(effect=>effect.type==='monsterProcNotice');
        check('real Shockwave, Poison Execute and Blooming Flower use data events',records.some(record=>record.monsterId===b.id&&record.procName==='SHOCKWAVE HIT')&&records.some(record=>record.monsterId===b.id&&record.procName==='POISON EXECUTE')&&records.some(record=>record.monsterId===a.id&&record.procName==='BLOOMING FLOWER'));
        check('collecting real proc effects leaves the roster untouched',mutations.length===0&&[a,b,c].every(monster=>notice(monster.id).textContent===''));
        const before=JSON.stringify(state);Math.random=()=>{throw new Error('Proc presentation consumed combat randomness');};
        flushCombatEffects(actual);
        check('presentation preserves combat state and combines actual triggered skills in order',JSON.stringify(state)===before&&notice(b.id).textContent==='SHOCKWAVE HIT · POISON EXECUTE'&&notice(a.id).textContent==='BLOOMING FLOWER'&&notice(c.id).textContent==='SHOCKWAVE HIT');
        resetNotices();flushCombatEffects(collect(()=>{showMonsterProc(b.id,'FIRST');showMonsterProc(b.id,'SECOND');showMonsterProc(b.id,'FIRST');}));
        check('simultaneous procs combine without duplicating repeated names',notice(b.id).textContent==='FIRST · SECOND'&&notice(b.id).dataset.activeProcs==='FIRST|SECOND'&&notice(b.id).classList.contains('is-visible'));
        const oldTimer=monsterProcTimers.get(notice(b.id));
        await new Promise(resolve=>setTimeout(resolve,650));showMonsterProc(b.id,'FIRST');
        check('repeated procs refresh their timeout without changing the label order',monsterProcTimers.get(notice(b.id))!==oldTimer&&notice(b.id).textContent==='FIRST · SECOND');
        await new Promise(resolve=>setTimeout(resolve,600));
        check('a refreshed notice survives its previous expiry deadline',notice(b.id).classList.contains('is-visible')&&notice(b.id).textContent==='FIRST · SECOND');
        await new Promise(resolve=>setTimeout(resolve,600));
        check('expiry clears the text, active names, visibility and timer',notice(b.id).textContent===''&&notice(b.id).dataset.activeProcs===''&&!notice(b.id).classList.contains('is-visible')&&!monsterProcTimers.has(notice(b.id)));
        showMonsterProc(b.id,'NEW');
        check('a new notice after expiry does not retain old skill names',notice(b.id).textContent==='NEW'&&notice(b.id).dataset.activeProcs==='NEW');
        showMonsterProc(a.id,'OTHER');const otherTimer=monsterProcTimers.get(notice(a.id));showMonsterProc(b.id,'EXTRA');
        check('monster notices combine independently without refreshing other plates',notice(b.id).textContent==='NEW · EXTRA'&&notice(a.id).textContent==='OTHER'&&monsterProcTimers.get(notice(a.id))===otherTimer);
        resetNotices();state.targetMonsterId=c.id;flushCombatEffects([()=>flushCombatEffects(queued)]);
        check('nested batches and retargeting still display the notice on its original plate',notice(b.id).textContent==='SHOCKWAVE HIT'&&notice(b.id).classList.contains('is-visible')&&notice(c.id).textContent==='');

        function fight(collectEffects,legacy=false) {
            Object.assign(state,JSON.parse(initial));combatStatCache=null;resetDamageBreakdown(map.id);
            state.monsterStates.forEach(monster=>{monster.hp=10;monster.poisonStacks=[{remainingDuration:5,timeUntilTick:2}];});syncLegacyEnemyState();
            let seed=9387,rolls=0,events=0;
            Math.random=()=>{rolls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            if(legacy)showMonsterProc=(id,name)=>{if(combatEffectEnabled('abilities'))presentCombatEffect(()=>presentMonsterProc(id,name));};
            try {
                for(let index=0;index<200;index++) {
                    const result=simulateCombatStep(.1,collectEffects);events+=result.effects.filter(effect=>effect.type==='monsterProcNotice').length;
                    if(!collectEffects&&result.effects.length)throw new Error('Offline combat retained proc visuals');
                }
            } finally {showMonsterProc=originalShow;}
            return {state:JSON.stringify({state,damage:getDamageBreakdown()}),rolls,events,kills:state.kills[map.id]};
        }
        const legacy=fight(true,true),live=fight(true),offline=fight(false);
        check('proc events preserve original seeded damage, kills, rewards and random rolls',legacy.state===live.state&&legacy.rolls===live.rolls&&live.events>0&&live.kills>JSON.parse(initial).kills[map.id]);
        check('offline combat matches exactly without retaining proc notices',offline.state===live.state&&offline.rolls===live.rolls&&offline.events===0);
        render();resetNotices();toggle('abilities',false);flushCombatEffects(queued);
        check('disabled ability effects suppress queued proc labels and timers',notice(b.id).textContent===''&&!monsterProcTimers.has(notice(b.id)));
        toggle('abilities',true);toggle('glows',false);flushCombatEffects(queued);
        check('proc labels remain readable with decorative glows disabled',notice(b.id).textContent==='SHOCKWAVE HIT'&&notice(b.id).classList.contains('is-visible'));
        toggle('glows',true);resetNotices();
        try {
            Object.defineProperty(document,'hidden',{configurable:true,value:true});flushCombatEffects(queued);
            check('backgrounding the app discards queued proc notices',notice(b.id).textContent===''&&!monsterProcTimers.has(notice(b.id)));
        } finally {restoreHidden();}
        const originalMap=state.selectedMap;
        try {
            state.selectedMap=mapData.find(entry=>entry.id!==originalMap).id;flushCombatEffects(queued);
            check('map changes discard stale notices even if a matching plate exists',notice(b.id).textContent==='');
        } finally {state.selectedMap=originalMap;}
        state.currentView='inventory';flushCombatEffects(queued);
        check('leaving combat discards queued proc notices',notice(b.id).textContent==='');state.currentView='map';
        const card=getCombatEffectCard(b.id),element=notice(b.id),next=card.nextSibling;card.remove();flushCombatEffects(queued);
        check('missing monster plates are ignored safely',element.textContent===''&&!monsterProcTimers.has(element));elements.enemyRoster.insertBefore(card,next);
        const nextNotice=element.nextSibling;element.remove();flushCombatEffects(queued);
        check('plates without a proc label are ignored safely',!monsterProcTimers.has(element));card.insertBefore(element,nextNotice);
        for(const renderer of ['svg','webgl']) {
            choose(renderer);resetNotices();flushCombatEffects(queued);
            check(renderer+' preserves a readable HTML proc label and its animation',notice(b.id).textContent==='SHOCKWAVE HIT'&&notice(b.id).classList.contains('is-visible')&&getComputedStyle(notice(b.id)).display!=='none');
        }
        toggle('all',false);resetNotices();flushCombatEffects(queued);
        check('the master switch suppresses proc labels and timers',notice(b.id).textContent===''&&!monsterProcTimers.has(notice(b.id)));
        check('no browser script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error){checks.push(error.stack||String(error));}
    finally {Math.random=originalRandom;showMonsterProc=originalShow;getCombatEffectCard=originalGetCard;CombatSettings.enabled=originalEnabled;restoreHidden();resetNotices();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
