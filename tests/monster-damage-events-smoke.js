(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const originalRandom=Math.random,originalEmit=emitCombatEvent,originalGetCard=getCombatEffectCard;
    const originalEnabled=CombatSettings.enabled,hiddenDescriptor=Object.getOwnPropertyDescriptor(document,'hidden');
    const choose=value=>{const select=document.getElementById('combatEffectRenderer');select.value=value;select.dispatchEvent(new Event('change'));};
    const toggle=(key,value)=>{const button=document.querySelector(`[data-effect-setting="${key}"]`);if(button.getAttribute('aria-checked')!==String(value))button.click();};
    const restoreHidden=()=>{if(hiddenDescriptor)Object.defineProperty(document,'hidden',hiddenDescriptor);else delete document.hidden;};
    const indicator=id=>getCombatEffectCard(id).querySelector('.enemy-health-damage');
    const segment=(id,start,size)=>indicator(id).style.transform===`translateX(${start}%) scaleX(${size/100})`;
    function resetFeedback() {
        recentEnemyDamage=0;
        for(const element of elements.enemyRoster.querySelectorAll('.enemy-health-damage')) {
            clearTimeout(enemyDamageIndicatorTimers.get(element));enemyDamageIndicatorTimers.delete(element);
            element.classList.remove('is-visible');setCombatBar(element,0);
        }
    }
    function damage(monster,amount,type='physical') {
        const previous=combatEffects;combatEffects=[];
        try {applyDamageToMonster(monster,amount,type);return combatEffects;}
        finally {combatEffects=previous;}
    }
    try {
        toggle('all',true);toggle('glows',true);choose('svg');
        state.currentView='map';state.isInTown=false;state.skillRanks={};state.level=1;
        state.gear=createEmptyGear();state.upgrades={strength:0,haste:0,evasion:0};
        state.pendingEruptions=[];state.pendingVoidMissiles=[];state.shieldStacks=0;state.voidCharges=0;
        clearFury();clearGatheringPower();
        const map=currentMap();map.drops=[];map.itemDrops=[];
        map.spawns=[{id:'damageMob',monsterId:worldContent.monsters[0].id,count:3,overrides:{
            health:200,attackDamage:1,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:.5,
            gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);clearOfflineRecap();state.playerHp=getPlayerMaxHealth();state.combatPaused=false;
        state.attackTimer=getAttackSpeed()-.05;render();resetFeedback();
        const [a,b,c]=state.monsterStates,initial=JSON.stringify(state);
        let queued;
        try {
            getCombatEffectCard=()=>{throw new Error('Damage calculation accessed a plate');};
            Object.defineProperty(document,'hidden',{configurable:true,get(){throw new Error('Damage calculation read visibility');}});
            CombatSettings.enabled=()=>{throw new Error('Damage calculation read visual settings');};
            queued=damage(b,25);
        } finally {getCombatEffectCard=originalGetCard;restoreHidden();CombatSettings.enabled=originalEnabled;}
        const hit=queued.find(event=>event.type==='monsterDamaged');
        check('damage calculation records the monster, map, actual damage and type without presentation access',hit?.monsterId===b.id&&hit.mapId===map.id&&hit.damage===25&&hit.damageType==='physical'&&b.hp===175);
        check('calculating damage does not display an indicator or update presentation state',recentEnemyDamage===0&&!indicator(b.id).classList.contains('is-visible'));
        renderCombat();
        check('the main health bar and label update even without presenting the hit',getCombatEffectCard(b.id).querySelector('[data-enemy-hp]').textContent==='175 / 200 HP'&&getCombatEffectCard(b.id).querySelector('.health-track').getAttribute('aria-valuenow')==='88');
        const before=JSON.stringify(state);Math.random=()=>{throw new Error('Damage presentation consumed combat randomness');};
        flushCombatEffects(queued);
        check('presenting the hit preserves state and draws the lost health segment on the right plate',JSON.stringify(state)===before&&recentEnemyDamage===25&&segment(b.id,87.5,12.5)&&indicator(b.id).classList.contains('is-visible')&&!indicator(a.id).classList.contains('is-visible'));
        await new Promise(resolve=>setTimeout(resolve,300));
        check('damage indicators keep their original fade timeout and release their timers',!indicator(b.id).classList.contains('is-visible')&&!enemyDamageIndicatorTimers.has(indicator(b.id)));
        resetFeedback();b.hp=200;
        const batched=[...damage(b,10),...damage(b,30)];flushCombatEffects(batched);
        check('batched hits preserve their snapshots and place the last hit beside current health',batched[0].damage===10&&batched[1].damage===30&&b.hp===160&&recentEnemyDamage===30&&segment(b.id,80,15));
        const secondTimer=enemyDamageIndicatorTimers.get(indicator(b.id));
        flushCombatEffects(damage(a,50));
        check('damage on another monster keeps each plate and fade timer independent',segment(a.id,75,25)&&segment(b.id,80,15)&&enemyDamageIndicatorTimers.get(indicator(b.id))===secondTimer);
        resetFeedback();flushCombatEffects(damage(a,.1));
        check('small hits retain the minimum visible segment width',Math.abs(a.hp-149.9)<1e-8&&segment(a.id,74.95,1));
        for(const type of ['spell','poison','bleed','dot']) {
            resetFeedback();const previousHp=a.hp,effects=damage(a,5,type);flushCombatEffects(effects);
            check(type+' retains health loss and its presentation amount without a physical damage strip',Math.abs(a.hp-(previousHp-5))<1e-8&&effects.some(event=>event.damageType===type)&&recentEnemyDamage===5&&!indicator(a.id).classList.contains('is-visible'));
        }
        resetFeedback();Math.random=()=>0;c.hp=20;
        const beforeDeath=damage(c,5),lethal=damage(c,30);
        check('lethal hits keep their existing death path without adding a damage-indicator event',c.hp===0&&c.respawnRemaining===.5&&!lethal.some(event=>event.type==='monsterDamaged')&&damage(c,1).length===0);
        flushCombatEffects(beforeDeath);renderCombat();
        check('a queued earlier hit cannot restore health after death',c.hp===0&&segment(c.id,0,2.5)&&getCombatEffectCard(c.id).querySelector('[data-enemy-hp]').textContent==='0 / 200 HP');
        state.attackTimer=-100;c.respawnRemaining=.1;simulateCombatStep(.1,false);resetFeedback();flushCombatEffects(beforeDeath);renderCombat();
        check('a hit presented after respawn uses current health and cannot draw beyond a full bar',c.hp===200&&segment(c.id,100,0)&&getCombatEffectCard(c.id).querySelector('[data-enemy-hp]').textContent==='200 / 200 HP');
        resetFeedback();const newLife=damage(c,4);flushCombatEffects([...beforeDeath,...newLife]);
        check('a new hit after respawn retains its own damage amount and bar position',c.hp===196&&recentEnemyDamage===4&&segment(c.id,98,2));
        const hpBeforeInvalid=a.hp;
        check('invalid damage and missing monsters create no indicator events',[0,-1,Infinity,NaN].every(amount=>damage(a,amount).length===0)&&damage(null,5).length===0&&a.hp===hpBeforeInvalid);

        function fight(collect,legacy=false) {
            Object.assign(state,JSON.parse(initial));combatStatCache=null;resetDamageBreakdown(map.id);
            state.monsterStates.forEach(monster=>{monster.hp=5;});syncLegacyEnemyState();
            let seed=9387,rolls=0,events=0;
            Math.random=()=>{rolls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            if(legacy)emitCombatEvent=(type,details)=>{
                if(type!=='monsterDamaged'){originalEmit(type,details);return;}
                const monster=state.monsterStates.find(entry=>entry.id===details.monsterId);
                presentCombatEffect(()=>{
                    recentEnemyDamage=details.damage;
                    const card=getCombatEffectCard(monster.id),element=details.damageType==='physical'&&card?card.querySelector('.enemy-health-damage'):null;
                    if(!element)return;
                    const max=monsterDefinition(monster).health,current=Math.max(0,Math.min(100,monster.hp/max*100));
                    setCombatBar(element,Math.min(100-current,Math.max(recentEnemyDamage/max*100,1)),current);
                    element.classList.add('is-visible');clearTimeout(enemyDamageIndicatorTimers.get(element));
                    enemyDamageIndicatorTimers.set(element,setTimeout(()=>{element.classList.remove('is-visible');enemyDamageIndicatorTimers.delete(element);},250));
                });
            };
            try {
                for(let index=0;index<200;index++) {
                    const result=simulateCombatStep(.1,collect);events+=result.effects.filter(event=>event.type==='monsterDamaged').length;
                    if(!collect&&result.effects.length)throw new Error('Offline combat retained visual work');
                }
            } finally {emitCombatEvent=originalEmit;}
            return {state:JSON.stringify({state,damage:getDamageBreakdown()}),rolls,events,kills:state.kills[map.id]};
        }
        const legacy=fight(true,true),live=fight(true),offline=fight(false);
        check('damage, deaths, rewards and random rolls match the original seeded combat',legacy.state===live.state&&legacy.rolls===live.rolls&&live.events>0&&live.kills>JSON.parse(initial).kills[map.id]);
        check('offline combat retains identical results with no damage events',offline.state===live.state&&offline.rolls===live.rolls&&offline.events===0);
        render();resetFeedback();const targetId=hit.monsterId;
        for(const renderer of ['svg','webgl']) {
            choose(renderer);resetFeedback();flushCombatEffects(queued);
            check(renderer+' keeps a visible HTML damage segment',indicator(targetId).classList.contains('is-visible')&&getComputedStyle(indicator(targetId)).display!=='none');
        }
        toggle('glows',false);resetFeedback();flushCombatEffects(queued);
        check('damage information remains available with decorative glows disabled',indicator(targetId).classList.contains('is-visible'));
        toggle('glows',true);resetFeedback();
        try {
            Object.defineProperty(document,'hidden',{configurable:true,value:true});flushCombatEffects(queued);
            check('backgrounding the app suppresses queued damage indicators',recentEnemyDamage===0&&!indicator(targetId).classList.contains('is-visible'));
        } finally {restoreHidden();}
        const originalMap=state.selectedMap;
        try {
            state.selectedMap=mapData.find(entry=>entry.id!==originalMap).id;flushCombatEffects(queued);
            check('map changes discard stale hit indicators',recentEnemyDamage===0&&!indicator(targetId).classList.contains('is-visible'));
        } finally {state.selectedMap=originalMap;}
        state.currentView='inventory';flushCombatEffects(queued);
        check('leaving combat discards queued damage indicators',!indicator(targetId).classList.contains('is-visible'));state.currentView='map';
        const card=getCombatEffectCard(targetId),element=indicator(targetId),next=card.nextSibling;card.remove();flushCombatEffects(queued);
        check('removed plates are ignored safely',!element.classList.contains('is-visible')&&!enemyDamageIndicatorTimers.has(element));
        elements.enemyRoster.insertBefore(card,next);
        const roster=state.monsterStates;state.monsterStates=roster.filter(monster=>monster.id!==targetId);flushCombatEffects(queued);
        check('a leftover plate cannot display damage for a missing monster',!element.classList.contains('is-visible'));state.monsterStates=roster;
        toggle('all',false);resetFeedback();const current=state.monsterStates.find(monster=>monster.id===targetId),hp=current.hp;
        damage(current,1);renderCombat();flushCombatEffects(queued);
        check('the master switch hides hit feedback while actual health still updates',current.hp===hp-1&&recentEnemyDamage===0&&!element.classList.contains('is-visible')&&card.querySelector('[data-enemy-hp]').textContent===`${Math.ceil(current.hp)} / 200 HP`);
        check('no browser script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error){checks.push(error.stack||String(error));}
    finally {Math.random=originalRandom;emitCombatEvent=originalEmit;getCombatEffectCard=originalGetCard;CombatSettings.enabled=originalEnabled;restoreHidden();resetFeedback();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
