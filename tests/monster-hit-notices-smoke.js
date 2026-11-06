(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const originalRandom=Math.random,originalShow=showMonsterHitBadge,originalGetCard=getCombatEffectCard;
    const originalEnabled=CombatSettings.enabled,originalStats=itemById.testAmulet.stats;
    const hiddenDescriptor=Object.getOwnPropertyDescriptor(document,'hidden');
    const choose=value=>{const select=document.getElementById('combatEffectRenderer');select.value=value;select.dispatchEvent(new Event('change'));};
    const toggle=(key,value)=>{const button=document.querySelector(`[data-effect-setting="${key}"]`);if(button.getAttribute('aria-checked')!==String(value))button.click();};
    const restoreHidden=()=>{if(hiddenDescriptor)Object.defineProperty(document,'hidden',hiddenDescriptor);else delete document.hidden;};
    const badge=id=>getCombatEffectCard(id).querySelector('[data-combat-hit-badge]');
    function resetNotices() {
        for(const notice of elements.enemyRoster.querySelectorAll('[data-combat-hit-badge]')) {
            clearTimeout(shockwaveHitTimers.get(notice));shockwaveHitTimers.delete(notice);
            notice.classList.remove('is-visible','is-multihit');notice.hidden=true;notice.textContent='';delete notice.dataset.hitPriority;
        }
    }
    function collect(...notices) {
        const previous=combatEffects;combatEffects=[];
        try {notices.forEach(args=>showMonsterHitBadge(...args));return combatEffects;}
        finally {combatEffects=previous;}
    }
    try {
        toggle('all',true);toggle('abilities',true);toggle('glows',true);choose('svg');
        state.currentView='map';state.isInTown=false;state.skillRanks={multiShot:1};state.level=1;
        state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];
        itemById.testAmulet.stats={multiHit:2};state.upgrades={strength:0,haste:0,evasion:0};
        state.pendingEruptions=[];state.pendingVoidMissiles=[];state.shieldStacks=0;state.voidCharges=0;
        clearFury();clearGatheringPower();
        const map=currentMap();map.drops=[];map.itemDrops=[];
        map.spawns=[{id:'noticeMob',monsterId:worldContent.monsters[0].id,count:3,overrides:{
            health:10000,attackDamage:1,attackInterval:10000,accuracy:100,evasion:0,respawnSeconds:2,
            gold:[0,0],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);clearOfflineRecap();state.playerHp=getPlayerMaxHealth();state.combatPaused=false;
        state.attackTimer=getAttackSpeed()-.05;render();resetNotices();
        const [first,second,third]=state.monsterStates.map(monster=>monster.id),initial=JSON.stringify(state);
        let queued;
        try {
            getCombatEffectCard=()=>{throw new Error('Collecting a notice looked up HTML');};
            Object.defineProperty(document,'hidden',{configurable:true,get(){throw new Error('Collecting a notice read visibility');}});
            CombatSettings.enabled=()=>{throw new Error('Collecting a notice read visual settings');};
            queued=collect([second,'MULTI-HIT',true,2]);
        } finally {getCombatEffectCard=originalGetCard;restoreHidden();CombatSettings.enabled=originalEnabled;}
        const event=queued[0];
        check('notice collection needs no HTML, visibility or renderer settings',queued.length===1&&event.type==='monsterHitNotice');
        check('the event snapshots the monster, map, label, style and priority',event.monsterId===second&&event.mapId===map.id&&event.label==='MULTI-HIT'&&event.isMultiHit===true&&event.priority===2);
        check('collecting the notice leaves game state and badges unchanged',JSON.stringify(state)===initial&&badge(second).hidden);
        const observer=new MutationObserver(()=>{});observer.observe(elements.enemyRoster,{subtree:true,attributes:true,childList:true,characterData:true});
        Math.random=()=>0;const step=simulateCombatStep(.1,true);const mutations=observer.takeRecords();observer.disconnect();
        const notices=step.effects.filter(effect=>effect.type==='monsterHitNotice');
        check('real multi-hit attacks queue notices for their secondary targets',notices.some(notice=>notice.monsterId===second&&notice.label==='MULTI-HIT'&&notice.isMultiHit)&&notices.some(notice=>notice.monsterId===third&&notice.label==='MULTI-HIT'));
        check('the Multishot ability uses the same event path',notices.some(notice=>notice.monsterId===first&&notice.label==='MULTISHOT'&&!notice.isMultiHit));
        check('real combat does not change the roster or display notices before presentation',mutations.length===0&&[first,second,third].every(id=>badge(id).hidden));
        const before=JSON.stringify(state);Math.random=()=>{throw new Error('Notice presentation consumed combat randomness');};
        flushCombatEffects(step.effects);
        check('presenting real hit notices leaves combat state unchanged',JSON.stringify(state)===before);
        check('each actual hit notice retains its original text and style',badge(first).textContent==='MULTISHOT'&&!badge(first).classList.contains('is-multihit')&&badge(second).textContent==='MULTI-HIT'&&badge(second).classList.contains('is-multihit'));
        resetNotices();state.targetMonsterId=third;flushCombatEffects(queued);
        check('retargeting still displays the queued notice on its original monster',badge(second).textContent==='MULTI-HIT'&&badge(first).hidden&&badge(third).hidden);
        resetNotices();flushCombatEffects(collect([second,'HIGH',false,2],[second,'LOW',true,0]));
        check('a lower priority notice cannot replace a higher priority notice in one batch',badge(second).textContent==='HIGH'&&!badge(second).classList.contains('is-multihit')&&badge(second).classList.contains('is-visible'));
        const highTimer=shockwaveHitTimers.get(badge(second));flushCombatEffects(collect([second,'LOW AGAIN',true,0]));
        check('rejected lower priority notices do not refresh the existing lifetime',badge(second).textContent==='HIGH'&&shockwaveHitTimers.get(badge(second))===highTimer);
        resetNotices();flushCombatEffects(collect([second,'OLD',false,0],[second,'NEW',true,0]));
        check('equal priority notices retain last-hit order and update their style',badge(second).textContent==='NEW'&&badge(second).classList.contains('is-multihit'));
        resetNotices();flushCombatEffects(collect([second,'LOW',true,0],[second,'HIGH',false,2]));
        check('higher priority notices replace lower priority notices',badge(second).textContent==='HIGH'&&!badge(second).classList.contains('is-multihit'));
        resetNotices();flushCombatEffects([()=>flushCombatEffects(queued)]);
        check('nested batches retain notice animation restarts',badge(second).classList.contains('is-visible'));
        resetNotices();showMonsterHitBadge(second,'DIRECT');
        check('notices outside simulation still display immediately',badge(second).textContent==='DIRECT'&&badge(second).classList.contains('is-visible'));
        resetNotices();flushCombatEffects(collect([first,'REGULAR'],[second,'PRIORITY',false,2]));
        await new Promise(resolve=>setTimeout(resolve,1600));
        check('ordinary notices expire while priority notices keep their longer lifetime',!badge(first).classList.contains('is-visible')&&!shockwaveHitTimers.has(badge(first))&&badge(second).classList.contains('is-visible'));
        await new Promise(resolve=>setTimeout(resolve,500));
        check('priority notices also expire and release their timers',!badge(second).classList.contains('is-visible')&&!shockwaveHitTimers.has(badge(second)));

        function fight(collectEffects,legacy=false) {
            Object.assign(state,JSON.parse(initial));combatStatCache=null;resetDamageBreakdown(map.id);
            let seed=9387,rolls=0,events=0;
            Math.random=()=>{rolls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            if(legacy)showMonsterHitBadge=(id,label,multi=false,priority=0)=>{
                if(!combatEffectEnabled('abilities'))return;
                presentCombatEffect(()=>presentMonsterHitBadge(id,label,multi,priority));
            };
            try {
                for(let index=0;index<200;index++) {
                    const result=simulateCombatStep(.1,collectEffects);
                    events+=result.effects.filter(effect=>effect.type==='monsterHitNotice').length;
                    if(!collectEffects&&result.effects.length)throw new Error('Offline combat retained presentation work');
                }
            } finally {showMonsterHitBadge=originalShow;}
            return {state:JSON.stringify({state,damage:getDamageBreakdown()}),rolls,events};
        }
        const legacy=fight(true,true),live=fight(true),offline=fight(false);
        check('hit notice events preserve original seeded damage, rewards, state and random rolls',legacy.state===live.state&&legacy.rolls===live.rolls&&live.events>0);
        check('offline combat has identical results and retains no notices',offline.state===live.state&&offline.rolls===live.rolls&&offline.events===0);
        render();resetNotices();toggle('abilities',false);flushCombatEffects(queued);
        check('disabled abilities suppress previously queued notices',badge(second).hidden&&!shockwaveHitTimers.has(badge(second)));
        toggle('abilities',true);toggle('glows',false);flushCombatEffects(queued);
        check('hit labels remain available with decorative glows disabled',badge(second).textContent==='MULTI-HIT'&&badge(second).classList.contains('is-visible'));
        toggle('glows',true);resetNotices();
        try {
            Object.defineProperty(document,'hidden',{configurable:true,value:true});flushCombatEffects(queued);
            check('backgrounding the app discards queued notices',badge(second).hidden&&!shockwaveHitTimers.has(badge(second)));
        } finally {restoreHidden();}
        const originalMap=state.selectedMap;
        try {
            state.selectedMap=mapData.find(entry=>entry.id!==originalMap).id;flushCombatEffects(queued);
            check('map changes discard stale notices even when a matching plate exists',badge(second).hidden);
        } finally {state.selectedMap=originalMap;}
        state.currentView='inventory';flushCombatEffects(queued);
        check('leaving combat discards queued notices',badge(second).hidden);state.currentView='map';
        const targetCard=getCombatEffectCard(second),nextCard=targetCard.nextSibling;targetCard.remove();flushCombatEffects(queued);
        check('removed monster plates are safely ignored',!shockwaveHitTimers.has(targetCard.querySelector('[data-combat-hit-badge]')));
        elements.enemyRoster.insertBefore(targetCard,nextCard);
        for(const renderer of ['svg','webgl']) {
            choose(renderer);resetNotices();flushCombatEffects(queued);
            check(renderer+' retains a readable HTML label and its animation',badge(second).textContent==='MULTI-HIT'&&!badge(second).hidden&&badge(second).classList.contains('is-visible')&&getComputedStyle(badge(second)).display!=='none');
        }
        toggle('all',false);resetNotices();flushCombatEffects(queued);
        check('the master switch suppresses notices and their timers',badge(second).hidden&&!shockwaveHitTimers.has(badge(second)));
        check('no browser script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error){checks.push(error.stack||String(error));}
    finally {
        Math.random=originalRandom;showMonsterHitBadge=originalShow;getCombatEffectCard=originalGetCard;
        CombatSettings.enabled=originalEnabled;itemById.testAmulet.stats=originalStats;restoreHidden();resetNotices();
    }
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
