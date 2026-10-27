(function () {
    const checks=[],check=(name,ok)=>{checks.push((ok?'PASS ':'FAIL ')+name);if(!ok)throw new Error(name);};
    const near=(a,b)=>Math.abs(a-b)<1e-7,clone=value=>JSON.parse(JSON.stringify(value));
    const map=currentMap(),root=skillNodes.find(node=>node.start).id,random=Math.random;
    const passives={baseMana1:1,baseSpellDamage1:1,multiSpellDamage1:1};
    // Keep numerical expectations independent of balance edits in the tree.
    skillNodeById.baseMana1.stats={mana:100};
    skillNodeById.baseSpellDamage1.stats={spellDamage:10};
    skillNodeById.multiSpellDamage1.stats={spellDamageMultiplier:1.2};
    const all={rimeBrand:1,emberBrand:1,glacialRupture:1,cinderRupture:1,gatheringPower:1};
    function fresh(ranks={},count=9) {
        combatStatCache=null;combatPoisonForecasts=null;clearFury();clearGatheringPower();
        state.skillRanks={...passives,...ranks};state.skillPoints=0;state.level=Object.keys(state.skillRanks).length;state.experience=0;
        state.upgrades={strength:0,haste:0,evasion:0};state.gear=createEmptyGear();state.ownedItemIds=[];state.crafted=[];
        state.selectedMap=map.id;state.selectedWorld=worldForMap(map.id).id;state.currentView='map';state.isInTown=false;
        state.playerHp=100;state.combatPaused=false;state.attackTimer=0;state.shieldStacks=0;state.voidCharges=0;
        state.kills=Object.fromEntries(mapData.map(entry=>[entry.id,0]));state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,0]));
        map.drops=[];map.itemDrops=[];map.spawns=[{id:'elementMob',monsterId:worldContent.monsters[0].id,count,overrides:{health:100000,attackDamage:1,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:10,gold:[1,1],experience:1,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);state.monsterColumns=3;state.manaCapacity=getPlayerMaxMana();state.playerMana=state.manaCapacity;
        resetCombatClock();resetDamageBreakdown(map.id);Math.random=()=>.5;
        return state.monsterStates;
    }
    const dealt=id=>getDamageBreakdown().rows.find(row=>row.source===id)?.damage||0;
    try {
        check('five nodes have custom descriptions and correct prerequisites',Object.keys(all).every(id=>skillNodeById[id]?.customDescription)&&skillNodeById.glacialRupture.requires.includes('rimeBrand')&&skillNodeById.cinderRupture.requires.includes('emberBrand'));
        check('brand abilities are single target and explosions are AOE',['rimeBrand','emberBrand'].every(id=>SkillDescriptions.getAbilityTargeting(skillNodeById[id])==='singleTarget')&&['glacialRupture','cinderRupture'].every(id=>SkillDescriptions.getAbilityTargeting(skillNodeById[id])==='aoe'));
        for (const id of ['rimeBrand','emberBrand']) {
            let mobs=fresh({[id]:1});
            check(id+' applies once for 5 mana without instant damage',castElementalBrand(id)&&mobs[0][id]&&state.playerMana===95&&mobs[0].hp===100000);
            const first=mobs[0][id];castElementalBrand(id);
            check(id+' spreads to an unbranded enemy and never refreshes the original',mobs[0][id]===first&&Boolean(mobs[1][id])&&state.playerMana===90);
            for(let index=2;index<9;index++)castElementalBrand(id);
            const mana=state.playerMana;
            check(id+' stops spending mana when all targets are branded',!castElementalBrand(id)&&state.playerMana===mana);
            tickElementalBrands(mobs[0],.9);check(id+' waits one full second for its first tick',mobs[0].hp===100000);
            tickElementalBrands(mobs[0],.1);check(id+' deals 100 percent current spell damage per second',mobs[0].hp===99988&&mobs[0][id].stacks===0);
            tickElementalBrands(mobs[0],8.9);check(id+' remains active just before ten seconds',Boolean(mobs[0][id])&&near(mobs[0][id].remainingDuration,.1));
            tickElementalBrands(mobs[0],.1);check(id+' expires after ten ticks without building Fury',!mobs[0][id]&&mobs[0].hp===99880&&state.furyStacks===0);
            check(id+' can be applied again after expiring',castElementalBrand(id)&&mobs[0][id].remainingDuration===10);
            tickElementalBrands(mobs[0],60);check(id+' cannot tick beyond its duration in a long step',!mobs[0][id]&&mobs[0].hp===99760);
            mobs=fresh({[id]:1});state.playerMana=4;check(id+' cannot cast with insufficient mana',!castElementalBrand(id)&&state.playerMana===4);
            state.playerMana=5;state.combatPaused=true;check(id+' cannot cast while paused',!castElementalBrand(id)&&state.playerMana===5);
            state.combatPaused=false;castElementalBrand(id);state.combatPaused=true;state.playerHp=0;
            for(let step=0;step<10;step++)simulateCombatStep(.1);
            check(id+' continues ticking after player death like other DOTs',mobs[0].hp===99988&&Boolean(mobs[0][id]));
            fresh();check(id+' requires its allocated node',!castElementalBrand(id));
        }
        let mobs=fresh({rimeBrand:1,glacialRupture:1});state.targetMonsterId=mobs[4].id;castElementalBrand('rimeBrand');
        tickElementalBrands(mobs[4],9);
        check('Rime builds one stack per tick and waits for ten',mobs[4].rimeBrand.stacks===9&&dealt('glacialRupture')===0);
        tickElementalBrands(mobs[4],1);
        const adjacent=[1,3,5,7],corners=[0,2,6,8];
        check('Glacial Rupture deals 500 percent spell damage only to living orthogonal neighbours',adjacent.every(index=>mobs[index].hp===99940)&&corners.every(index=>mobs[index].hp===100000)&&mobs[4].hp===99880&&dealt('glacialRupture')===240);
        check('Glacial Rupture freezes its blast targets before the brand expires',adjacent.every(index=>mobs[index].freezeRemaining===9)&&!mobs[4].rimeBrand&&getMonsterAttackInterval(mobs[1])===1003);
        castElementalBrand('rimeBrand');tickElementalBrands(mobs[4],10);check('reapplying an expired brand can trigger another explosion',dealt('glacialRupture')===480&&!mobs[4].rimeBrand);
        mobs=fresh({rimeBrand:1,glacialRupture:1});state.targetMonsterId=mobs[4].id;castElementalBrand('rimeBrand');mobs[4].hp=120;
        tickElementalBrands(mobs[4],10);check('a lethal tenth tick still explodes and clears the dead brand',mobs[4].hp===0&&!mobs[4].rimeBrand&&dealt('glacialRupture')===240);
        mobs=fresh({emberBrand:1,cinderRupture:1});state.targetMonsterId=mobs[4].id;castElementalBrand('emberBrand');tickElementalBrands(mobs[4],10);
        check('Cinder Rupture damages neighbours then applies non-stacking Scorched',adjacent.every(index=>mobs[index].hp===99940&&mobs[index].scorched)&&!mobs[4].scorched&&dealt('cinderRupture')===240);
        const target=mobs[1],before=target.hp;applyDamageToMonster(target,10,'spell','voidBolt');applyDamageToMonster(target,10,'dot','emberBrand');
        check('Scorched boosts fire damage by 20 percent and leaves other damage unchanged',near(before-target.hp,22));
        const fireBefore=target.hp;applyDamageToMonster(target,10,'physical','volcanicEruption');applyDamageToMonster(target,10,'dot','righteousFire');
        check('existing fire abilities also benefit from Scorched',near(fireBefore-target.hp,24));
        castElementalBrand('emberBrand');tickElementalBrands(mobs[4],10);check('repeated fire explosions refresh Scorched without stacking its bonus',getFireDamageTakenMultiplier(target,'emberBrand')===1.2&&typeof target.scorched==='boolean');
        mobs=fresh({gatheringPower:1});tickGatheringPower(.9);check('Gathering Power waits one second before its first stack',state.gatheringPower.stacks===0);
        tickGatheringPower(.1);tickGatheringPower(99);check('Gathering Power caps at 50 stacks and double damage',state.gatheringPower.stacks===50&&near(getGatheringPowerMultiplier(),2));
        applyDamageToMonster(mobs[0],10,'physical');applyDamageToMonster(mobs[0],10,'spell','voidBolt');applyDamageToMonster(mobs[0],10,'dot','rimeBrand');applyDamageToMonster(mobs[0],10,'poison');applyDamageToMonster(mobs[0],10,'bleed');
        check('Gathering Power scales physical, spell and DOT damage exactly once',near(mobs[0].hp,99900));
        state.combatPaused=true;tickGatheringPower(.9);check('all stacks persist during the one second grace period',state.gatheringPower.stacks===50);
        tickGatheringPower(.1);check('all stacks expire together after one second without combat',state.gatheringPower.stacks===0);
        state.combatPaused=false;tickGatheringPower(2);mobs.forEach(monster=>{monster.hp=0;});tickGatheringPower(2);
        check('waiting for respawns also expires Gathering Power',state.gatheringPower.stacks===0);
        mobs=fresh(all);castElementalBrand('rimeBrand');castElementalBrand('emberBrand');tickElementalBrands(mobs[0],3.3);mobs[0].scorched=true;tickGatheringPower(4.4);
        skillNodes.filter(node=>!node.start).forEach(node=>{skillNodeConnections[root].add(node.id);skillNodeConnections[node.id].add(root);});
        const saved=clone(createGameSave());applyGameSave(parseGameSave(JSON.stringify(saved)));
        const oldPower=clone(saved);oldPower.gatheringPower.stacks=500;oldPower.gatheringPower.remaining=2;
        const migratedPower=parseGameSave(JSON.stringify(oldPower));
        check('old uncapped saves load with 50 stacks and a one second reset',migratedPower.gatheringPower.stacks===50&&migratedPower.gatheringPower.remaining===1&&near(migratedPower.gatheringPower.progress,.4));
        check('save/load preserves brands, tick progress, explosion stacks and Scorched',state.monsterStates[0].rimeBrand.stacks===3&&near(state.monsterStates[0].rimeBrand.timeUntilTick,.7)&&state.monsterStates[0].emberBrand.stacks===3&&state.monsterStates[0].scorched);
        check('save/load preserves combat power stacks and partial seconds',state.gatheringPower.stacks===4&&near(state.gatheringPower.progress,.4));
        check('save/load preserves the remaining brand duration',near(state.monsterStates[0].rimeBrand.remainingDuration,6.7)&&near(state.monsterStates[0].emberBrand.remainingDuration,6.7));
        const oldBrands=clone(saved);delete oldBrands.monsterStates[0].rimeBrand.remainingDuration;delete oldBrands.monsterStates[0].emberBrand.remainingDuration;
        const upgradedBrands=parseGameSave(JSON.stringify(oldBrands));
        check('old permanent brands migrate to ten seconds without losing stacks',upgradedBrands.monsterStates[0].rimeBrand.remainingDuration===10&&upgradedBrands.monsterStates[0].rimeBrand.stacks===3&&upgradedBrands.monsterStates[0].emberBrand.remainingDuration===10);
        const roundedTimerSave=clone(saved);
        roundedTimerSave.monsterStates[0].rimeBrand.timeUntilTick=1+Number.EPSILON;
        roundedTimerSave.monsterStates[0].emberBrand.timeUntilTick=1+Number.EPSILON;
        const roundedTimerRaw=JSON.stringify(roundedTimerSave);
        localStorage.setItem(saveKey,roundedTimerRaw);
        check('rounding at a brand tick boundary cannot lock a real save',loadGame()&&!SaveCompatibility.protection.blocked&&state.monsterStates[0].rimeBrand.timeUntilTick===1&&state.monsterStates[0].emberBrand.timeUntilTick===1);
        check('repairing timer rounding preserves the exact original backup',SaveCompatibility.backups().some(entry=>entry.raw===roundedTimerRaw));
        mobs=fresh(all);castElementalBrand('rimeBrand');castElementalBrand('emberBrand');
        for(let step=0;step<120;step++) {
            simulateCombatStep(.1);
            parseGameSave(JSON.stringify(createGameSave()));
        }
        check('every fixed-step combat save remains loadable across brand tick boundaries',state.monsterStates.every(monster=>isValidBrandState(monster.rimeBrand)&&isValidBrandState(monster.emberBrand)));
        for (const edit of [data=>{data.monsterStates[0].rimeBrand.stacks=10;},data=>{data.monsterStates[0].emberBrand.timeUntilTick=-1;},data=>{data.monsterStates[0].emberBrand.timeUntilTick=1.01;},data=>{data.monsterStates[0].scorched=2;},data=>{data.gatheringPower.stacks=-1;}]) {
            const invalid=clone(saved);edit(invalid);let rejected=false;try{parseGameSave(JSON.stringify(invalid));}catch{rejected=true;}check('malformed elemental save state is rejected',rejected);
        }
        const legacy=clone(saved);delete legacy.gatheringPower;legacy.monsterStates.forEach(monster=>{delete monster.rimeBrand;delete monster.emberBrand;delete monster.scorched;});
        applyGameSave(parseGameSave(JSON.stringify(legacy)));check('older saves default to no brands or combat power',!state.monsterStates[0].rimeBrand&&!state.monsterStates[0].scorched&&state.gatheringPower.stacks===0);
        mobs=fresh(all);castElementalBrand('rimeBrand');castElementalBrand('emberBrand');tickElementalBrands(mobs[0],2);render();
        check('brand counters appear on enemy cards',document.querySelector('[data-elemental-status="rimeBrand"]').textContent.includes('2/10')&&document.querySelector('[data-elemental-status="emberBrand"]').textContent.includes('2/10'));
        tickGatheringPower(2);renderCombatBuffs();check('Gathering Power appears in the buff list',Boolean(document.querySelector('[data-buff-id="gatheringPower"]')));
        resetMonsterStates(map);check('changing encounters clears brands and elemental debuffs',state.monsterStates.every(monster=>!monster.rimeBrand&&!monster.emberBrand&&!monster.scorched));
        const run=effects=>{
            fresh(all);
            for(let step=0;step<240;step++){const result=simulateCombatStep(.1,effects);if(effects)flushCombatEffects(result.effects);}
            return JSON.stringify({monsters:state.monsterStates,mana:state.playerMana,power:state.gatheringPower,damage:getDamageBreakdown().rows.map(row=>[row.source,row.damage])});
        };
        check('visible and offline simulation produce identical elemental combat',run(false)===run(true));
        check('no runtime errors',!window.smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error) {checks.push('ERROR '+error.stack);}
    Math.random=random;
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
