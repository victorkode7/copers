(function () {
    const checks=[],check=(name,ok)=>{checks.push((ok?'PASS ':'FAIL ')+name);if(!ok)throw new Error(name);};
    const near=(a,b)=>Math.abs(a-b)<1e-8,copy=value=>JSON.parse(JSON.stringify(value));
    const originalGear=getGearStat,originalSkill=getSkillStat,originalMultiplier=getSkillMultiplier;
    try {
        clearOfflineRecap();resetCombatClock();
        state.alchemy=Alchemy.defaults();state.alchemy.unlocked=true;
        state.professions=Professions.defaults();state.professions.xp.alchemy=Professions.xpForLevel(20);
        state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,100]));
        for(const liquid of Object.values(state.alchemy.liquids)){liquid.unlocked=true;liquid.amount=120;}
        const old=copy(state.alchemy);for(const id of ['gildedDraught','moonspring','emberwell','lifebloom'])delete old.potions[id];
        check('old saves receive empty reserves for new potions',Alchemy.normalize(old).potions.lifebloom===0&&Alchemy.normalize(old).potions.gildedDraught===0);
        for(const id of ['gildedDraught','moonspring','emberwell','lifebloom']){
            const recipe=AlchemyContent.recipes[id];
            check(id+' has a unique reachable ingredient combination',Alchemy.matchingRecipe(Object.keys(recipe.liquids),Object.keys(recipe.materials)[0])===id);
            check(id+' queues with existing materials',!!Alchemy.brew(state,id));
            Alchemy.tick(state,recipe.brewSeconds,()=>0);
            check(id+' discovery creates a usable reserve',state.alchemy.discovered.includes(id)&&state.alchemy.potions[id]===recipe.seconds);
        }
        let gear={health:100,healthMultiplier:1.5,evasion:20,evasionMultiplier:2,maxShields:4,maxShieldsMultiplier:2,
            healthRegen:3,healthRegenPercent:.01,healthRegenIncrease:.5,mana:100,manaRegen:2,manaRegenIncrease:.5};
        let skills={health:50,evasion:10,healthRegen:7,healthRegenIncrease:.2,mana:50,manaRegen:4,manaRegenIncrease:.1};
        getGearStat=stat=>gear[stat]??Equipment.stats[stat].default;
        getSkillStat=stat=>skills[stat]||0;
        getSkillMultiplier=stat=>stat==='evasionMultiplier'?1.5:1;
        state.upgrades.evasion=2;state.combatPaused=false;state.playerHp=50;
        const equip=id=>{if(id)state.alchemy.potions[id]=60;Alchemy.equip(state,id);if(combatStatCache)combatStatCache.clear();};
        equip(null);
        const originalGold=getGoldMultiplier();equip('gildedDraught');
        check('Gilded Draught provides 25 percent more gold',near(getGoldMultiplier(),originalGold*1.25));equip(null);
        const health=getPlayerHealthRegen(),mana=getPlayerManaRegen(),damage=getDamage(),maxMana=getPlayerMaxMana();
        equip('moonveil');check('Moonveil adds its own regeneration before increased regeneration and the final multiplier',near(getPlayerHealthRegen(),(health+getPlayerMaxHealth()*.002*1.7)*1.3));
        const regenSkills=skills,regenGear=gear;skills={};gear={};
        check('Moonveil grants regeneration without any skill or gear regeneration',near(getPlayerHealthRegen(),getPlayerMaxHealth()*.002*1.3));
        const nakedMaximum=getPlayerMaxHealth();state.playerHp=nakedMaximum/2;tickPlayerRegeneration(1);
        check('Moonveil actually heals a character with no regeneration investment',near(state.playerHp,nakedMaximum*(.5+.002*1.3)));
        skills=regenSkills;gear=regenGear;
        equip('emberheart');check('Emberheart multiplies final mana regeneration once',near(getPlayerManaRegen(),mana*1.3));
        const equippedHealth=(basePlayerMaxHealth+50+100)*1.5,baselineHealth=basePlayerMaxHealth+50;
        const equippedEvasion=(basePlayerEvasion+10+10+20)*1.5*2,baselineEvasion=(basePlayerEvasion+10+10)*1.5;
        const baselineRegen=CombatHealth.getHealthRegeneration(baselineHealth,7,0,.2);
        equip('twilight');
        check('Twilight scales final gear health contribution',getPlayerMaxHealth()===Math.round(baselineHealth+(equippedHealth-baselineHealth)*1.3));
        check('Twilight scales final evasion contribution once',getPlayerEvasion()===Math.round(baselineEvasion+(equippedEvasion-baselineEvasion)*1.3));
        check('Twilight scales final gear regeneration contribution once',near(getPlayerHealthRegen(),baselineRegen+(health-baselineRegen)*1.3));
        check('Twilight scales final gear shield contribution once',getPlayerMaxShields()===Math.round(basePlayerMaxShields+((basePlayerMaxShields+4)*2-basePlayerMaxShields)*1.3));
        check('Twilight leaves offensive stats and mana unchanged',getDamage()===damage&&getPlayerMaxMana()===maxMana&&near(getPlayerManaRegen(),mana));
        const equippedGear=gear;gear={};equip(null);const naked=getPlayerEvasion();equip('twilight');
        check('Twilight does not boost evasion without equipment',getPlayerEvasion()===naked);gear=equippedGear;
        const map=currentMap();resetMonsterStates(map);state.combatPaused=false;state.playerHp=50;
        equip('moonspring');state.alchemy.liquids.moonwater.amount=0;
        const monster=state.monsterStates[0];applyDamageToMonster(monster,1e12,'spell');
        check('real monster defeat grants exactly one Moonwater',state.alchemy.liquids.moonwater.amount===1);
        applyDamageToMonster(monster,1e12,'spell');
        check('hitting a corpse cannot award potion resources twice',state.alchemy.liquids.moonwater.amount===1);
        state.alchemy.liquids.moonwater.amount=119;state.alchemy.liquids.moonwater.work=12;
        Alchemy.onKill(state,getPlayerMaxHealth());Alchemy.onKill(state,getPlayerMaxHealth());
        check('kill liquids respect storage and clear capped production work',state.alchemy.liquids.moonwater.amount===120&&state.alchemy.liquids.moonwater.work===0);
        equip('emberwell');state.alchemy.liquids.emberOil.amount=0;Alchemy.onKill(state,getPlayerMaxHealth());
        check('Emberwell grants Ember Oil',state.alchemy.liquids.emberOil.amount===1);
        state.alchemy.liquids.emberOil.unlocked=false;state.alchemy.liquids.emberOil.amount=0;Alchemy.onKill(state,getPlayerMaxHealth());
        check('kill effects do not unlock locked liquids',state.alchemy.liquids.emberOil.amount===0);state.alchemy.liquids.emberOil.unlocked=true;
        equip('lifebloom');const maximum=getPlayerMaxHealth();state.playerHp=maximum/2;Alchemy.onKill(state,maximum);
        check('Lifebloom instantly restores one percent of maximum life',near(state.playerHp,maximum*.51));
        state.playerHp=maximum-.1;Alchemy.onKill(state,maximum);check('life on kill cannot overheal',state.playerHp===maximum);
        state.playerHp=0;Alchemy.onKill(state,maximum);check('life on kill cannot revive a dead player',state.playerHp===0);
        state.playerHp=maximum/2;state.combatPaused=true;Alchemy.onKill(state,maximum);check('paused combat does not award kill effects',state.playerHp===maximum/2);
        state.combatPaused=false;resetMonsterStates(map);state.playerHp=getPlayerMaxHealth();
        equip('emberheart');state.alchemy.potions.emberheart=.1;combatStatCache=new Map();
        check('mana boost can be cached during catch-up',near(getPlayerManaRegen(),mana*1.3));
        simulateCombatStep(.1,false);
        check('expiry invalidates cached potion stats during catch-up',state.alchemy.equipped===null&&near(getPlayerManaRegen(),mana));combatStatCache=null;
        equip('twilight');state.alchemy.potions.twilight=.1;state.playerHp=getPlayerMaxHealth();state.shieldStacks=getPlayerMaxShields();
        simulateCombatStep(.1,false);
        check('Twilight expiry clamps health and shield capacity',state.alchemy.equipped===null&&state.playerHp<=getPlayerMaxHealth()&&state.shieldStacks<=getPlayerMaxShields());
        equip('moonspring');state.alchemy.potions.moonspring=0;const beforeExpired=state.alchemy.liquids.moonwater.amount;
        Alchemy.onKill(state,getPlayerMaxHealth());check('empty potion reserves cannot grant kill effects',state.alchemy.liquids.moonwater.amount===beforeExpired);
        for(const id of ['moonspring','emberwell','lifebloom']){
            const data=copy(state.alchemy);state.playerHp=maximum/2;state.combatPaused=false;resetMonsterStates(map);equip(id);
            const base=copy(state.alchemy),startHp=state.playerHp;
            function run(visual){state.alchemy=copy(base);state.playerHp=startHp;resetMonsterStates(map);simulateCombatStep(.1,visual);const mob=state.monsterStates[0];finishMonsterDefeat(mob,monsterDefinition(mob),[]);return JSON.stringify([state.alchemy,state.playerHp]);}
            check(id+' agrees in foreground and offline simulation',run(true)===run(false));state.alchemy=data;
        }
        check('no browser errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error){checks.push('ERROR '+error.stack);}
    finally{getGearStat=originalGear;getSkillStat=originalSkill;getSkillMultiplier=originalMultiplier;combatStatCache=null;}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
