(async function () {
    const checks=[],originalRandom=Math.random,originalStats=itemById.testAmulet.stats,map=currentMap();
    const originalConnections=Object.fromEntries(Object.entries(skillNodeConnections).map(([id,links])=>[id,new Set(links)]));
    const check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const near=(a,b)=>Math.abs(a-b)<1e-6;
    function fresh(ranks={deepWounds:1},count=4) {
        combatStatCache=null;combatPoisonForecasts=null;clearFury();state.shieldStacks=0;state.skillRanks={...ranks};pendingSkillRanks={};
        state.level=Object.keys(ranks).length;state.experience=0;state.skillPoints=0;state.upgrades={strength:0,haste:0,evasion:0};
        state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];state.crafted=[];itemById.testAmulet.stats={bleedChance:1};
        state.kills=Object.fromEntries(mapData.map(entry=>[entry.id,0]));state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,0]));
        state.gold=0;state.lootLog=[];state.lastLoot=null;state.tutorials=createTutorialState();
        state.selectedMap=map.id;state.selectedWorld=worldForMap(map.id).id;state.currentView='map';state.isInTown=false;state.playerHp=100;state.combatPaused=false;state.attackTimer=0;
        map.drops=[];map.itemDrops=[];map.spawns=[{id:'deepWoundMob',monsterId:worldContent.monsters[0].id,count,overrides:{health:1000,attackDamage:0,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:2,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);resetCombatClock();clearOfflineRecap();Math.random=()=>0;return state.monsterStates;
    }
    try {
        let [a]=fresh({});for(let i=0;i<5;i++)tryApplyBleed(a,100);
        check('ordinary Bleed retains its 10% ratio and unlimited stacks',a.bleed.stacks===5&&a.bleed.baseDamagePerTick===50&&getBleedDamage(100)===10);
        check('normal Bleed tracks at most three strongest contributions',a.bleed.strongestApplications.length===3);
        [a]=fresh();tryApplyBleed(a,100);
        check('Deep Wounds adds 50% of the triggering hit per tick',a.bleed.baseDamagePerTick===50&&getBleedDamage(100)===50);
        for(const hit of [200,300,10,400])tryApplyBleed(a,hit);
        check('the three strongest applications survive the cap',a.bleed.stacks===3&&a.bleed.baseDamagePerTick===450&&a.bleed.strongestApplications.join(',')==='200,150,100');
        check('successful applications at the cap still build the shared timer',a.bleed.remainingDuration===5&&getRemainingBleedDamage(a)===2250);
        tickMonsterBleed(a,1);check('all retained applications tick together without double counting replacements',a.hp===550&&getRemainingBleedDamage(a)===1800);
        [a]=fresh();for(let i=0;i<3;i++)tryApplyBleed(a,100);tickMonsterBleed(a,.5);const phase=a.bleed.timeUntilTick;
        for(let i=0;i<100;i++)tryApplyBleed(a,1);
        check('weaker hits maintain duration without increasing damage or resetting tick progress',a.bleed.stacks===3&&a.bleed.baseDamagePerTick===150&&a.bleed.remainingDuration===5&&a.bleed.timeUntilTick===phase);
        itemById.testAmulet.stats.bleedDamage=2;itemById.testAmulet.stats.bleedDamageMultiplier=2;
        check('flat bonuses and multipliers still apply once per retained stack',getBleedTickDamage(a.bleed)===312&&getBleedDamage(100)===104);
        [a]=fresh();itemById.testAmulet.stats={};let rolls=0;Math.random=()=>{rolls++;return 0;};
        check('Deep Wounds does not grant Bleed chance on its own',!tryApplyBleed(a,100)&&!a.bleed&&rolls===0);
        [a]=fresh();Math.random=()=>.99;itemById.testAmulet.stats.bleedChance=.25;
        check('normal Bleed chance still controls application',!tryApplyBleed(a,100)&&!a.bleed);
        [a]=fresh();itemById.testAmulet.stats.bleedTickRate=1;tryApplyBleed(a,100);tickMonsterBleed(a,1);
        check('tick speed bonuses retain the final tick at expiry',a.hp===900&&a.bleed===null);
        const runTicks=steps=>{const [mob]=fresh();for(let i=0;i<3;i++)tryApplyBleed(mob,100);steps.forEach(dt=>tickMonsterBleed(mob,dt));return JSON.stringify({hp:mob.hp,bleed:mob.bleed});};
        check('large and fractional steps agree through shared expiration',runTicks([10])===runTicks(Array(100).fill(.1)));
        [a]=fresh({});for(const hit of [100,200,300,400,500])tryApplyBleed(a,hit);
        state.skillRanks.deepWounds=1;
        check('learning Deep Wounds caps an existing pool without retroactively amplifying its hits',getBleedTickDamage(a.bleed)===120);
        tickMonsterBleed(a,.1);
        check('active oversized pools normalize to the strongest three stacks',a.bleed.stacks===3&&a.bleed.baseDamagePerTick===120);
        state.skillRanks.deepWounds=0;tryApplyBleed(a,100);
        check('refunding Deep Wounds restores ordinary new applications without rewriting existing hits',a.bleed.stacks===4&&a.bleed.baseDamagePerTick===130&&getBleedDamage(100)===10);
        [a]=fresh({deepWounds:1,singledOff:1},1);shootAbilityArrow([a],100,'multiShot');tickMonsterBleed(a,1);
        check('single-target abilities and Singled Off apply their bonuses exactly once',a.hp===805&&damageBreakdownMeter.sources.get('multiShot')===130&&damageBreakdownMeter.sources.get('bleed')===65);
        [a]=fresh();shootAbilityArrow([a],100,'piercingArrow');
        check('AOE hits remain ineligible for Bleed',a.hp===900&&!a.bleed);
        [a]=fresh();applyDamageToMonster(a,1,'poison');applyDamageToMonster(a,1,'bleed');applyDamageToMonster(a,1,'dot','multiShot');
        check('DOT damage cannot create new Deep Wounds stacks',!a.bleed);
        const queue=skillNodes.filter(node=>node.start).map(node=>[node.id]),seen=new Set(queue.flat());let path;
        for(let i=0;i<queue.length;i++){const route=queue[i],id=route.at(-1);if(id==='deepWounds'){path=route;break;}skillNodeConnections[id].forEach(next=>{if(!seen.has(next)){seen.add(next);queue.push([...route,next]);}});}
        // The editor layout may intentionally leave this specialization without
        // connections. Exercise profile compatibility with a synthetic valid path.
        const root=skillNodes.find(node=>node.start).id;
        if(!path){skillNodeConnections[root].add('deepWounds');skillNodeConnections.deepWounds.add(root);path=[root,'deepWounds'];}
        check('Deep Wounds is registered as a unique modifier',SkillDescriptions.usesCustomDescription(skillNodeById.deepWounds));
        const ranks=Object.fromEntries(path.filter(id=>!skillNodeById[id].start).map(id=>[id,1]));
        [a]=fresh(ranks);for(const hit of [100,200,300])tryApplyBleed(a,hit);tickMonsterBleed(a,.4);
        const saved=JSON.parse(JSON.stringify(createGameSave())),expected=JSON.stringify(a.bleed);
        applyGameSave(parseGameSave(JSON.stringify(saved)));a=state.monsterStates[0];
        check('profile round trips preserve retained applications and tick progress',JSON.stringify(a.bleed)===expected);
        const legacy=JSON.parse(JSON.stringify(saved));legacy.monsterStates[0].bleed={stacks:6,baseDamagePerTick:600,remainingDuration:5,timeUntilTick:1};
        applyGameSave(parseGameSave(JSON.stringify(legacy)));a=state.monsterStates[0];tickMonsterBleed(a,.1);
        check('older aggregate-only profiles are safely capped using equal contribution shares',a.bleed.stacks===3&&a.bleed.baseDamagePerTick===300&&near(a.bleed.timeUntilTick,.9));
        for(const invalid of [null,{},[],[1],[1,2,3,4],[-1,2,3],[1,2,NaN],[10000,10000,10000]]) {
            const bad=JSON.parse(JSON.stringify(saved));bad.monsterStates[0].bleed.strongestApplications=invalid;
            let rejected=false;try{parseGameSave(JSON.stringify(bad));}catch(_){rejected=true;}
            check('invalid saved application data is rejected: '+JSON.stringify(invalid),rejected);
        }
        function simulate(effects) {
            fresh({deepWounds:1,singledOff:1,multiShot:1,shockwaveSlash:1},8);Object.assign(itemById.testAmulet.stats,{damage:40,attackSpeedMultiplier:4});
            let seed=9453;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            for(let i=0;i<600;i++)simulateCombatStep(.1,effects);
            return JSON.stringify({monsters:state.monsterStates,hp:state.playerHp,kills:state.kills,gold:state.gold,meter:getDamageBreakdown()});
        }
        const observer=new MutationObserver(()=>{});observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
        check('foreground and offline simulation produce identical Deep Wounds damage and rewards',simulate(true)===simulate(false)&&state.kills[map.id]>0);
        check('simulation does not mutate the DOM',observer.takeRecords().length===0);observer.disconnect();
        [a]=fresh();for(let i=0;i<6;i++)tryApplyBleed(a,100);render();
        const badge=elements.enemyRoster.firstElementChild.querySelector('[data-enemy-bleed-status]');
        check('monster plates show capped stacks and the correct per-tick damage',badge.querySelector('strong').textContent==='3x'&&badge.title.includes('150 damage per tick'));
        document.getElementById('detailedStats').open=true;renderCombat();
        const details=document.getElementById('detailedStatsList').textContent;
        check('detailed stats expose the 50% hit ratio and three-stack cap',details.includes('50%')&&details.includes('Maximum stacks'));
        state.currentView='upgrades';render();await document.fonts.ready;
        document.querySelector('[data-skill-node="deepWounds"]').dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));
        const tooltip=document.getElementById('skillNodeTooltip'),description=tooltip.querySelector('span');
        check('the new skill has a short unique tooltip',!tooltip.hidden&&description.textContent.includes('50%')&&description.getBoundingClientRect().height<=parseFloat(getComputedStyle(description).lineHeight)*2+1);
        check('no runtime errors: '+window.smokeErrors.join('; '),!window.smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error){checks.push('ERROR '+error.stack);}
    finally{Math.random=originalRandom;itemById.testAmulet.stats=originalStats;combatStatCache=null;combatPoisonForecasts=null;resetCombatClock();clearOfflineRecap();Object.entries(originalConnections).forEach(([id,links])=>{skillNodeConnections[id]=links;});}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
