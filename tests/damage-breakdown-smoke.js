(async function () {
    const checks = [], originalRandom = Math.random, originalStats = itemById.testAmulet.stats;
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const $ = id => document.getElementById(id), near = (a,b) => Math.abs(a-b) < 1e-6;
    const map = currentMap();
    const damage = source => damageBreakdownMeter.sources.get(source) || 0;
    function fresh(ranks = {}) {
        combatStatCache = null; clearFury(); state.shieldStacks = 0; state.skillRanks = {...ranks}; pendingSkillRanks = {};
        state.level = 1; state.experience = 0; state.skillPoints = 0; state.upgrades = {strength:0,haste:0,evasion:0};
        state.gear = createEmptyGear(); state.gear.necklace = 'testAmulet'; state.ownedItemIds = ['testAmulet']; state.crafted = [];
        itemById.testAmulet.stats = {};
        state.kills = Object.fromEntries(mapData.map(entry => [entry.id,0]));
        state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id,0]));
        state.gold = 0; state.lootLog = []; state.lastLoot = null; state.tutorials = createTutorialState();
        state.selectedMap = map.id; state.selectedWorld = worldForMap(map.id).id; state.currentView = 'map'; state.isInTown = false;
        state.playerHp = 100; state.combatPaused = false; state.attackTimer = 0;
        map.drops = []; map.itemDrops = [];
        map.spawns = [{id:'meterMob',monsterId:worldContent.monsters[0].id,count:4,overrides:{health:1000,attackDamage:0,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:2,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map); state.monsterColumns = 2; resetCombatClock(); clearOfflineRecap(); Math.random = () => 0;
        return state.monsterStates;
    }
    try {
        let [a,b] = fresh();
        applyDamageToMonster(a,50); applyDamageToMonster(a,30,'poison'); applyDamageToMonster(a,20,'bleed');
        applyDamageToMonster(a,10,'dot','righteousFire'); applyDamageToMonster(a,90,'physical','shieldSlam');
        check('direct hits, Poison, Bleed, Fire, and abilities are attributed separately',damage('attacks')===50 && damage('poison')===30 && damage('bleed')===20 && damage('righteousFire')===10 && damage('shieldSlam')===90 && getDamageBreakdown().total===200);
        applyDamageToMonster(a,5000,'physical','overflowingSlam');
        const before = getDamageBreakdown().total;
        for (const amount of [0,-1,NaN,Infinity]) applyDamageToMonster(b,amount);
        applyDamageToMonster(a,10); applyDamageToMonster(null,10);
        check('overkill is clipped and invalid or already-dead hits contribute nothing',damage('overflowingSlam')===800 && before===1000 && getDamageBreakdown().total===before);
        [a] = fresh({poisonExecute:1}); a.hp=100;
        a.poisonStacks=[{remainingDuration:5,timeUntilTick:1}];
        check('forecast poison damage does not count before it is dealt',getRemainingPoisonDamage(a)===5 && getDamageBreakdown().total===0);
        applyDamageToMonster(a,96);
        check('nested poison execution credits only the remaining health to Execute',a.hp===0 && damage('attacks')===96 && damage('poisonExecute')===4 && damage('poison')===0 && getDamageBreakdown().total===100);
        [a] = fresh(); a.poisonStacks=[{remainingDuration:5,timeUntilTick:1}]; tickMonsterPoison(a,1);
        itemById.testAmulet.stats.bleedChance=1; tryApplyBleed(a,100); tickMonsterBleed(a,1);
        check('real Poison and Bleed tick paths feed the breakdown',damage('poison')===1 && near(damage('bleed'),10));
        [a] = fresh(); itemById.testAmulet.stats.healthRegen=50; state.skillRanks.righteousFire=1; state.playerHp=30;
        tickPlayerRegeneration(1);
        check('Fire of the Righteous uses its own source rather than generic burning',damage('righteousFire')>0 && damage('burning')===0 && near(getDamageBreakdown().total,state.monsterStates.reduce((sum,mob)=>sum+1000-mob.hp,0)));
        fresh();
        for (const source of ['piercingArrow','forkingArrow','multiShot','volcanicEruption','shockwaveSlash']) applyDamageToMonster(state.monsterStates[0],1,'physical',source);
        check('each named ability retains its own contribution',getDamageBreakdown().rows.length===5 && getDamageBreakdown().rows.every(row=>row.damage===1));
        resetDamageBreakdown(map.id);
        for (const type of ['physical','poison','bleed']) recordMonsterDamage(1,type);
        let breakdown = getDamageBreakdown();
        check('rounded percentages add up to 100% for repeating fractions',breakdown.rows.reduce((sum,row)=>sum+row.units,0)===10000 && breakdown.rows.map(row=>row.units).join(',')==='3334,3333,3333');
        renderDamageBreakdown();
        check('visible percentages show at most two decimals',Array.from($('damageBreakdownList').querySelectorAll('strong')).every(label=>/^\d+(\.\d{1,2})?%$/.test(label.textContent)));
        const firstRow=$('damageBreakdownList').firstElementChild;
        recordMonsterDamage(2,'physical'); renderDamageBreakdown();
        check('live updates reuse existing source rows',firstRow===$('damageBreakdownList').firstElementChild);
        const observer=new MutationObserver(()=>{}); observer.observe($('damageBreakdownList'),{subtree:true,childList:true,attributes:true,characterData:true});
        renderDamageBreakdown(); check('unchanged renders do not mutate the breakdown',observer.takeRecords().length===0); observer.disconnect();
        const combatBefore=JSON.stringify({monsters:state.monsterStates,timer:state.attackTimer,ranks:state.skillRanks,gold:state.gold});
        $('resetDamageBreakdown').click();
        check('Reset clears the meter without changing combat',getDamageBreakdown().total===0 && !$('damageBreakdownEmpty').hidden && $('resetDamageBreakdown').disabled && combatBefore===JSON.stringify({monsters:state.monsterStates,timer:state.attackTimer,ranks:state.skillRanks,gold:state.gold}));
        recordMonsterDamage(1,'poison'); recordMonsterDamage(1000000,'physical'); renderDamageBreakdown();
        check('very small contributions remain visible',document.querySelector('[data-damage-source="poison"] strong').textContent==='<0.01%');
        state.currentView='inventory'; render();
        check('switching menu pages retains the current map totals',getDamageBreakdown().total===1000001);
        resetMonsterStates(map);
        check('starting another map encounter clears old contributions',getDamageBreakdown().total===0);
        const saved=createGameSave(); recordMonsterDamage(10,'physical'); applyGameSave(saved);
        check('loading a profile clears session contributions',getDamageBreakdown().total===0);
        function run(effects) {
            fresh({multiShot:1,shockwaveSlash:1}); itemById.testAmulet.stats={poisonChance:1,bleedChance:1,attackSpeedMultiplier:4};
            let seed=4536; Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            const watch=new MutationObserver(()=>{});watch.observe($('damageBreakdownList'),{subtree:true,childList:true,attributes:true,characterData:true});
            for(let index=0;index<300;index++)simulateCombatStep(.1,effects);
            check('simulation records damage without updating the panel DOM',watch.takeRecords().length===0);watch.disconnect();
            return JSON.stringify({meter:getDamageBreakdown(),monsters:state.monsterStates,gold:state.gold,kills:state.kills});
        }
        check('foreground and offline simulation produce identical damage shares and combat',run(true)===run(false));
        state.currentView='map'; render();
        const panel=document.querySelector('.damage-breakdown'),loot=document.querySelector('.loot-panel');
        check('the breakdown is placed directly below the loot panel',panel.previousElementSibling===loot && panel.getBoundingClientRect().top>=loot.getBoundingClientRect().bottom);
        check('the panel fits the viewport at this screen size',panel.getBoundingClientRect().left>=0 && panel.getBoundingClientRect().right<=innerWidth);
        loot.open=true;await new Promise(resolve=>setTimeout(resolve,350));
        check('expanding loot keeps the breakdown below it',panel.getBoundingClientRect().top>=loot.getBoundingClientRect().bottom);
        check('no runtime errors: '+window.smokeErrors.join('; '),!window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch(error) {checks.push('ERROR '+error.stack);}
    finally {Math.random=originalRandom;itemById.testAmulet.stats=originalStats;combatStatCache=null;resetCombatClock();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
