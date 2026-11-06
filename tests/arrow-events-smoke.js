(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const originalRandom=Math.random,originalShow=showCombatArrow,originalFlight=getArrowFlightTime,originalRank=getSkillNodeRank;
    const originalGetCard=getCombatEffectCard,originalBounds=getCombatEffectBounds,originalEnabled=CombatSettings.enabled;
    const originalTrail=CombatWebGL.trail,originalGpuEmit=CombatWebGL.emit;
    const hiddenDescriptor=Object.getOwnPropertyDescriptor(document,'hidden');
    const choose=value=>{const select=document.getElementById('combatEffectRenderer');select.value=value;select.dispatchEvent(new Event('change'));};
    const toggle=(key,value)=>{const button=document.querySelector(`[data-effect-setting="${key}"]`);if(button.getAttribute('aria-checked')!==String(value))button.click();};
    const restoreHidden=()=>{if(hiddenDescriptor)Object.defineProperty(document,'hidden',hiddenDescriptor);else delete document.hidden;};
    const clearArrows=()=>{elements.combatPanel.querySelectorAll('.combat-arrow').forEach(element=>element.remove());CombatWebGL.clear();};
    function collect(action) {
        const previous=combatEffects;combatEffects=[];
        try {action();return combatEffects;}
        finally {combatEffects=previous;}
    }
    try {
        for(const key of ['all','abilities','projectiles','glows'])toggle(key,true);choose('svg');
        state.currentView='map';state.isInTown=false;state.skillRanks={piercingArrow:1,forkingArrow:1,multiShot:1,freezingArrows:1};state.level=4;
        state.gear=createEmptyGear();state.upgrades={strength:0,haste:0,evasion:0};
        state.pendingEruptions=[];state.pendingVoidMissiles=[];state.shieldStacks=0;state.voidCharges=0;
        clearFury();clearGatheringPower();
        const map=currentMap();map.drops=[];map.itemDrops=[];
        map.spawns=[{id:'arrowEventMob',monsterId:worldContent.monsters[0].id,count:9,overrides:{health:10000,attackDamage:1,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:.5,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);clearOfflineRecap();state.playerHp=getPlayerMaxHealth();state.combatPaused=false;
        state.attackTimer=getAttackSpeed()-.05;render();state.monsterColumns=3;clearArrows();
        elements.combatPanel.scrollIntoView({block:'start'});await new Promise(resolve=>requestAnimationFrame(resolve));
        const ids=state.monsterStates.map(monster=>monster.id),initial=JSON.stringify(state);
        let chain,missed;
        try {
            getCombatEffectCard=()=>{throw new Error('Arrow calculation accessed HTML');};
            getCombatEffectBounds=()=>{throw new Error('Arrow calculation measured geometry');};
            Object.defineProperty(document,'hidden',{configurable:true,get(){throw new Error('Arrow calculation read visibility');}});
            CombatSettings.enabled=()=>{throw new Error('Arrow calculation read visual settings');};
            Math.random=()=>0;chain=collect(()=>shootAbilityArrow([state.monsterStates[0]],5,'forkingArrow',0));
            Object.assign(state,JSON.parse(initial));Math.random=()=>.999;
            missed=collect(()=>shootAbilityArrow([state.monsterStates[0]],5,'forkingArrow',0));
        } finally {getCombatEffectCard=originalGetCard;getCombatEffectBounds=originalBounds;restoreHidden();CombatSettings.enabled=originalEnabled;}
        const arrows=chain.filter(event=>event.type==='arrowFired');
        check('real fork chains collect data events without HTML, geometry, visibility or settings access',arrows.length>=3&&arrows.every(event=>event.mapId===map.id&&event.kind==='forkingArrow'&&event.direction===0&&event.freezing));
        check('incoming and chained segments preserve their scheduled flights and impact pauses',arrows[0].sourceId===null&&arrows[0].flight===300&&arrows[0].delay===0&&arrows.slice(1).every((event,index)=>event.sourceId===arrows[index].targetId&&event.flight===200&&event.delay===arrows[index].delay+arrows[index].flight+arrowImpactPause));
        check('missed arrows reuse monster dodge events without damage or a phantom fork',missed.some(event=>event.type==='monsterDodged'&&event.monsterId===ids[0])&&!missed.some(event=>event.type==='arrowFired')&&state.monsterStates[0].hp===10000&&state.monsterStates[0].freezeRemaining===0);
        check('collecting arrows creates no projectile elements',!elements.combatPanel.querySelector('.combat-arrow'));
        Object.assign(state,JSON.parse(initial));const visual={delay:125};
        const snapshots=collect(()=>{showCombatArrow(null,ids[4],'piercingArrow',0,visual);showCombatArrow(ids[0],ids[4],'forkingArrow',0,visual);});
        const beam=snapshots[0],fork=snapshots[1];visual.delay=900;state.monsterColumns=1;state.skillRanks={};getArrowFlightTime=()=>4000;
        check('piercing row membership, freezing and timing are captured at emission',beam.rowIds.join(',')===ids.slice(3,6).join(',')&&beam.flight===160&&beam.delay===125&&fork.flight===200&&fork.duration===2000&&fork.delay===125&&fork.freezing);
        const before=JSON.stringify(state);Math.random=()=>{throw new Error('Arrow presentation consumed combat randomness');};flushCombatEffects(snapshots);
        const svgBeam=elements.combatPanel.querySelector('[data-arrow-kind="piercingArrow"]'),svgFork=elements.combatPanel.querySelector('[data-arrow-kind="forkingArrow"]');
        check('SVG preserves snapshotted travel, impact, delay, lifetime and freezing style',svgBeam&&svgFork&&svgFork.style.getPropertyValue('--arrow-delay')==='125ms'&&svgFork.style.getPropertyValue('--arrow-flight')==='200ms'&&svgFork.style.getPropertyValue('--arrow-impact-delay')==='325ms'&&svgFork.style.getPropertyValue('--arrow-duration')==='2000ms'&&svgFork.classList.contains('is-freezing'));
        const line=svgBeam.querySelector('path').getAttribute('d').match(/^M(-?[\d.]+),(-?[\d.]+) L(-?[\d.]+),(-?[\d.]+)/).slice(1).map(Number);
        const frame=svgBeam.getBoundingClientRect(),left=getCombatEffectCard(ids[3]).getBoundingClientRect(),right=getCombatEffectCard(ids[5]).getBoundingClientRect();
        check('piercing still spans its original full row after formation changes',Math.abs(line[0]-(left.left-frame.left))<.1&&Math.abs(line[2]-(right.right-frame.left))<.1);
        check('drawing projectiles preserves combat state and random rolls',JSON.stringify(state)===before);
        clearArrows();choose('webgl');const trails=[],shapes=[];
        CombatWebGL.trail=spec=>{trails.push(spec);return originalTrail(spec);};CombatWebGL.emit=spec=>{shapes.push(spec);return originalGpuEmit(spec);};
        flushCombatEffects([fork]);CombatWebGL.trail=originalTrail;CombatWebGL.emit=originalGpuEmit;
        check('GPU arrows use the same snapshotted flight, delay and lifetime',trails.some(trail=>trail.type==='arrow'&&trail.flight===200&&trail.delay===125&&trail.duration===2000)&&shapes.some(shape=>shape.type==='arrow'&&shape.style===4&&shape.flight===200&&shape.delay===125&&shape.duration===2000));
        check('GPU impact rings retain the arrow arrival deadline',shapes.some(shape=>shape.type==='arrowImpact'&&shape.delay===325));
        check('GPU arrow events retain one shared canvas and create no SVG overlays',CombatWebGL.status().types.includes('arrow')&&document.querySelectorAll('.combat-webgl-layer').length===1&&!elements.combatPanel.querySelector('.combat-arrow'));
        getArrowFlightTime=originalFlight;

        function fight(collectEffects,legacy=false) {
            Object.assign(state,JSON.parse(initial));combatStatCache=null;resetDamageBreakdown(map.id);
            state.monsterStates.forEach(monster=>{monster.hp=5;});syncLegacyEnemyState();
            let seed=9387,rolls=0,events=0;
            Math.random=()=>{rolls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            if(legacy)showCombatArrow=(sourceId,targetId,kind,direction,visual={})=>{
                if(!combatEffectEnabled('projectiles'))return;
                const columns=Math.max(1,state.monsterColumns||1),monster=state.monsterStates.find(entry=>entry.id===targetId),row=getMonsterGridPosition(monster).row;
                const spec={mapId:state.selectedMap,sourceId,targetId,kind,direction,freezing:getSkillNodeRank('freezingArrows')>0,rowIds:kind==='piercingArrow'?state.monsterStates.slice(row*columns,(row+1)*columns).map(entry=>entry.id):[]};
                presentCombatEffect(()=>presentCombatArrow({...spec,delay:visual.delay||0,duration:arrowVisualDurations[kind]||450,flight:getArrowFlightTime(kind,sourceId)}));
            };
            try {
                for(let index=0;index<200;index++) {
                    const result=simulateCombatStep(.1,collectEffects);events+=result.effects.filter(event=>event.type==='arrowFired').length;
                    if(!collectEffects&&result.effects.length)throw new Error('Offline combat retained arrows');
                }
            } finally {showCombatArrow=originalShow;}
            return {state:JSON.stringify({state,damage:getDamageBreakdown()}),rolls,events,kills:state.kills[map.id]};
        }
        choose('svg');clearArrows();const legacy=fight(true,true),live=fight(true),offline=fight(false);
        check('arrow events preserve seeded damage, freezing, forks, kills, rewards and random rolls',legacy.state===live.state&&legacy.rolls===live.rolls&&live.events>0&&live.kills>JSON.parse(initial).kills[map.id]);
        check('offline combat matches live results without retaining arrow events',offline.state===live.state&&offline.rolls===live.rolls&&offline.events===0);
        const previous=combatEffects;
        try {combatEffects=null;getSkillNodeRank=()=>{throw new Error('Suppressed arrow performed visual preparation');};showCombatArrow(null,ids[4],'piercingArrow',0);}
        finally {combatEffects=previous;getSkillNodeRank=originalRank;}
        check('suppressed arrow visuals skip even their skill and row preparation',true);
        Object.assign(state,JSON.parse(initial));render();state.monsterColumns=3;clearArrows();
        for(const renderer of ['svg','webgl']) {
            choose(renderer);clearArrows();const source=getCombatEffectCard(fork.sourceId),next=source.nextSibling;source.remove();flushCombatEffects([fork]);
            check(renderer+' discards missing-source segments instead of inventing an incoming arrow',!elements.combatPanel.querySelector('.combat-arrow')&&!CombatWebGL.status().active);elements.enemyRoster.insertBefore(source,next);
            const target=getCombatEffectCard(fork.targetId),after=target.nextSibling;target.remove();flushCombatEffects([fork]);
            check(renderer+' safely discards arrows with missing target plates',!elements.combatPanel.querySelector('.combat-arrow')&&!CombatWebGL.status().active);elements.enemyRoster.insertBefore(target,after);
            const edge=getCombatEffectCard(beam.rowIds[0]),edgeNext=edge.nextSibling;edge.remove();flushCombatEffects([beam]);
            check(renderer+' safely discards a piercing beam with a missing row endpoint',!elements.combatPanel.querySelector('.combat-arrow')&&!CombatWebGL.status().active);elements.enemyRoster.insertBefore(edge,edgeNext);
        }
        const roster=state.monsterStates;state.monsterStates=roster.filter(monster=>monster.id!==fork.targetId);flushCombatEffects([fork]);
        check('a leftover plate cannot display an arrow for a removed monster',!CombatWebGL.status().active);state.monsterStates=roster;
        toggle('projectiles',false);clearArrows();flushCombatEffects([fork]);check('projectile settings suppress already queued arrows',!CombatWebGL.status().active&&!elements.combatPanel.querySelector('.combat-arrow'));toggle('projectiles',true);
        toggle('abilities',false);clearArrows();flushCombatEffects([fork]);check('ability settings also suppress queued arrows',!CombatWebGL.status().active);toggle('abilities',true);clearArrows();
        try {Object.defineProperty(document,'hidden',{configurable:true,value:true});flushCombatEffects([fork]);check('backgrounding the app discards queued arrows',!CombatWebGL.status().active);}
        finally {restoreHidden();}
        const originalMap=state.selectedMap;
        try {state.selectedMap=mapData.find(entry=>entry.id!==originalMap).id;flushCombatEffects([fork]);check('map changes discard old projectile records',!CombatWebGL.status().active);}
        finally {state.selectedMap=originalMap;}
        state.currentView='inventory';flushCombatEffects([fork]);check('leaving combat discards queued arrow effects',!CombatWebGL.status().active);state.currentView='map';
        choose('webgl-cracks');clearArrows();flushCombatEffects([fork]);check('cracks-only mode retains original SVG arrow rendering',!!elements.combatPanel.querySelector('.combat-arrow')&&!CombatWebGL.status().active);
        toggle('all',false);clearArrows();flushCombatEffects([fork]);check('the master switch suppresses queued arrow effects',!CombatWebGL.status().active&&!elements.combatPanel.querySelector('.combat-arrow'));
        check('no browser script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error){checks.push(error.stack||String(error));}
    finally {
        Math.random=originalRandom;showCombatArrow=originalShow;getArrowFlightTime=originalFlight;getSkillNodeRank=originalRank;getCombatEffectCard=originalGetCard;getCombatEffectBounds=originalBounds;CombatSettings.enabled=originalEnabled;
        CombatWebGL.trail=originalTrail;CombatWebGL.emit=originalGpuEmit;restoreHidden();clearArrows();
    }
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
