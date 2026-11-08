(function () {
    const checks=[],original={random:Math.random,multi:getMultiHit,bleed:getBleedChance,poison:getPoisonChance};
    const check=(name,ok)=>{checks.push((ok?'PASS ':'FAIL ')+name);if(!ok)throw new Error(name);};
    let multi=1,order=[];
    const capture=run=>{const previous=combatEffects;combatEffects=[];try{run();return combatEffects;}finally{combatEffects=previous;}};
    const results=events=>events.filter(event=>event.type==='attackHitResolved');
    try {
        clearOfflineRecap();const map=currentMap();
        getMultiHit=()=>multi;
        function fresh(ranks={reapPreview:1},count=9) {
            Math.random=()=>0;multi=1;getBleedChance=()=>0;getPoisonChance=()=>0;order=[];
            state.skillRanks={...ranks};state.level=Object.values(ranks).reduce((sum,rank)=>sum+rank,0);state.skillPoints=0;state.experience=0;state.experienceRemainder=0;
            state.gear=createEmptyGear();state.upgrades={strength:0,haste:0,evasion:0};
            state.currentView='map';state.isInTown=false;state.tutorials=createTutorialState();
            combatStatCache=null;invalidateSkillBonusCache();
            map.spawns=[{id:'contextMob',monsterId:worldContent.monsters[0].id,count,
                overrides:{health:10000,attackDamage:0,attackInterval:1000,evasion:0,respawnSeconds:100,
                    gold:[0,0],experience:0,drops:[],itemDrops:[]}}];
            resetMonsterStates(map);state.monsterColumns=3;state.targetMonsterId=state.monsterStates[Math.min(4,count-1)].id;
            state.combatPaused=false;state.playerHp=getPlayerMaxHealth();state.attackTimer=0;
            render();state.monsterColumns=3;
            return state.monsterStates;
        }
        function launch(){return capture(()=>combatAbilities.performPlayerAttack());}
        function impact(){return capture(()=>tickPendingReapAttacks(.2));}
        fresh();multi=2;launch();
        check('guaranteed multihit marks only the extra swing',state.pendingReapAttacks.length===2&&!state.pendingReapAttacks[0].multihit&&state.pendingReapAttacks[1].multihit);
        const saved=parseGameSave(JSON.stringify(createGameSave()));applyGameSave(saved);
        check('pending multihit provenance survives save/load',state.pendingReapAttacks[1].multihit===true);
        const hits=results(impact()),multiPrimary=hits.filter(event=>event.landed&&event.hit.role==='primary'&&event.hit.attack.multihit);
        check('exactly one successful primary carries multihit provenance',multiPrimary.length===1);
        check('Reap hit context retains source, trigger, delivery and damage type',hits.every(event=>event.hit.attack.abilityId==='reapPreview'&&event.hit.attack.trigger==='attack'&&event.hit.attack.delivery==='cone'&&event.hit.attack.damageType==='physical'));
        const shown=[],present=presentMonsterHitBadge;
        presentMonsterHitBadge=(...args)=>{shown.push(args);return present(...args);};
        try{flushCombatEffects(hits);}finally{presentMonsterHitBadge=present;}
        check('presentation labels only the multihit swing primary',shown.length===1&&shown[0][0]===multiPrimary[0].monsterId&&shown[0][1]==='MULTI-HIT'&&shown[0][2]===true);
        check('secondary cone results remain area hits',hits.some(event=>event.hit.role==='area'&&event.hit.attack.multihit));
        check('REAP hit text stays absent',!document.querySelector('[data-combat-hit-badge]')?.textContent.includes('REAP'));
        const badge=getCombatEffectCard(multiPrimary[0].monsterId).querySelector('[data-combat-hit-badge]');
        presentMonsterHitBadge(multiPrimary[0].monsterId,'PRIORITY',false,10);flushCombatEffects(multiPrimary);
        check('Reap multihit respects existing badge priorities',badge.textContent==='PRIORITY');
        const enabled=CombatSettings.enabled;
        badge.hidden=true;badge.classList.remove('is-visible');
        try{CombatSettings.enabled=()=>false;flushCombatEffects(multiPrimary);check('visual settings suppress Reap multihit labels',badge.hidden);}
        finally{CombatSettings.enabled=enabled;}
        state.currentView='inventory';flushCombatEffects(multiPrimary);
        check('leaving combat suppresses queued Reap labels',badge.hidden);state.currentView='map';

        for(const [roll,expected] of [[.25,2],[.75,1]]){
            fresh();multi=1.5;Math.random=()=>roll;launch();
            check('fractional multihit selection at '+roll,state.pendingReapAttacks.length===expected&&state.pendingReapAttacks.filter(attack=>attack.multihit).length===expected-1);
            Math.random=()=>0;
            check('fractional swing primary results at '+roll,results(impact()).filter(event=>event.hit.role==='primary'&&event.hit.attack.multihit&&event.landed).length===expected-1);
        }
        fresh();multi=2;launch();const before=state.monsterStates.map(monster=>monster.hp);Math.random=()=>.999;
        getBleedChance=()=>{throw new Error('A missed hit rolled bleed');};
        getPoisonChance=()=>{throw new Error('A missed hit rolled poison');};
        const missed=results(impact());
        check('misses retain context without damage or successful multihit results',missed.length>0&&missed.every(event=>!event.landed)&&JSON.stringify(before)===JSON.stringify(state.monsterStates.map(monster=>monster.hp)));

        fresh();launch();const legacy=createGameSave();delete legacy.pendingReapAttacks[0].multihit;
        applyGameSave(parseGameSave(JSON.stringify(legacy)));
        check('older pending Reaps default multihit safely',state.pendingReapAttacks[0].multihit===false&&results(impact()).every(event=>!event.hit.attack.multihit));
        fresh();launch();const malformed=createGameSave();malformed.pendingReapAttacks[0].multihit='yes';
        let rejected=false;try{parseGameSave(JSON.stringify(malformed));}catch{rejected=true;}
        check('invalid optional provenance is rejected',rejected);

        for(const reap of [false,true]){
            fresh(reap?{reapPreview:1,deepWounds:1}:{deepWounds:1});
            multi=2;
            getBleedChance=()=>{order.push('bleed');return 1;};getPoisonChance=()=>{order.push('poison');return 1;};
            const events=launch(),resolved=reap?impact():events,successful=results(resolved).filter(event=>event.landed);
            check((reap?'Reap':'basic')+' applies each eligible status exactly once',successful.every(event=>{
                const monster=state.monsterStates.find(monster=>monster.id===event.monsterId);
                const count=successful.filter(hit=>hit.monsterId===event.monsterId).length;
                return monster.poisonStacks.length===count&&monster.bleed?.stacks===count;
            })&&order.join(',')===successful.map(()=>reap?'poison,bleed':'bleed,poison').join(','));
        }
        let monsters=fresh({reapPreview:1,reapingEcho:1,multiShot:1});multi=2;
        monsters[4].hp=1;launch();impact();
        check('Reap kills generate separate unmarked echo attacks',state.pendingReapAttacks.some(attack=>attack.fromKill)&&state.pendingReapAttacks.filter(attack=>attack.fromKill).every(attack=>!attack.multihit&&attack.arrowTargetId===null));
        const echoes=results(impact());
        check('echo results are area hits with kill provenance',echoes.length>0&&echoes.every(event=>event.hit.role==='area'&&event.hit.attack.trigger==='kill'&&!event.hit.attack.multihit));
        check('echoes and Multishot do not recursively create attack swings',state.pendingReapAttacks.length===0);

        fresh({reapPreview:1,volcanicEruption:1});launch();Math.random=()=>.999;
        check('a missed Reap still rolls its primary attack eruption',impact().filter(event=>event.type==='volcanicEruption').length===1);
        fresh({reapPreview:1,volcanicEruption:1});launch();
        check('successful area hits retain their separate eruption triggers',impact().filter(event=>event.type==='volcanicEruption').length===4);
        monsters=fresh({reapPreview:1,volcanicEruption:1});monsters[4].hp=0;monsters[4].respawnRemaining=100;
        queueReapAttack(monsters[4].id,{fromKill:true,multihit:true});
        check('kill-triggered Reaps cannot generate attack eruptions',!impact().some(event=>event.type==='volcanicEruption'));
        monsters=fresh({reapPreview:1});monsters[4].hp=0;monsters[4].respawnRemaining=100;
        getBleedChance=()=>1;getPoisonChance=()=>1;queueReapAttack(monsters[4].id,{fromKill:true});
        const echoStatuses=results(impact());
        check('echo area hits retain poison and bleed eligibility exactly once',echoStatuses.length>0&&echoStatuses.every(event=>{
            const target=monsters.find(monster=>monster.id===event.monsterId);
            return target.poisonStacks.length===1&&target.bleed?.stacks===1;
        }));

        function run(visual){
            fresh({reapPreview:1,reapingEcho:1});multi=2;state.monsterStates[4].hp=1;state.attackTimer=getAttackSpeed()-.1;
            let seed=123,rolls=0;Math.random=()=>{rolls++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            for(let step=0;step<8;step++){const result=simulateCombatStep(.1,visual);if(visual)flushCombatEffects(result.effects);}
            return JSON.stringify([state.monsterStates,state.pendingReapAttacks,state.playerHp,rolls]);
        }
        check('multihit and echo foreground/offline state and RNG match',run(false)===run(true));
        check('no browser errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    finally{Math.random=original.random;getMultiHit=original.multi;getBleedChance=original.bleed;getPoisonChance=original.poison;}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
