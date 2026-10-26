(function () {
    const checks = [], originalRandom = Math.random, originalStats = itemById.testAmulet.stats;
    const map = currentMap(), near = (a,b) => Math.abs(a-b) < 1e-6;
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    function fresh(capacity = 10, ranks = {}, health = 100000) {
        combatStatCache = null; clearFury();
        state.skillRanks = {...ranks}; state.level = Object.keys(ranks).length; state.skillPoints = 0; state.experience = 0;
        state.gear = createEmptyGear(); state.gear.necklace = 'testAmulet'; state.ownedItemIds = ['testAmulet']; state.crafted = [];
        itemById.testAmulet.stats = {maxFury:capacity,health:1000,healthRegen:100000};
        state.upgrades = {strength:0,haste:0,evasion:0};
        state.kills = Object.fromEntries(mapData.map(entry => [entry.id,0])); state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id,0]));
        state.gold = 0; state.tutorials = createTutorialState(); state.lootLog = []; state.lastLoot = null;
        state.selectedMap = map.id; state.selectedWorld = worldForMap(map.id).id; state.currentView = 'map'; state.isInTown = false;
        map.drops = []; map.itemDrops = [];
        map.spawns = [{id:'furyMob',monsterId:worldContent.monsters[0].id,count:9,overrides:{health,attackDamage:0,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:2,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map); state.monsterColumns = 3; state.playerHp = getPlayerMaxHealth(); state.combatPaused = false; state.attackTimer = 0;
        resetCombatClock(); clearOfflineRecap(); Math.random = () => 0;
        return state.monsterStates;
    }
    const hit = (count=1) => { for (let index=0;index<count;index++) applyDamageToMonster(state.monsterStates[0],1,'physical'); };
    const attack = () => { state.attackTimer = getAttackSpeed() - .05; simulateCombatStep(.1); };
    try {
        fresh(0); hit(); check('zero capacity cannot build Fury', state.furyStacks === 0 && state.furyRemaining === 0);
        fresh(); hit(); check('a successful direct hit gains one stack and 0.1 seconds', state.furyStacks === 1 && near(state.furyRemaining,.1));
        hit(9); check('ten stacks allow one second on one shared timer', state.furyStacks === 10 && near(state.furyRemaining,1));
        tickFury(.8); hit(); check('a hit at full stacks adds only 0.1 seconds rather than refreshing one second', state.furyStacks === 10 && near(state.furyRemaining,.3));
        hit(20); check('both stacks and time respect their caps', state.furyStacks === 10 && near(state.furyRemaining,1));
        tickFury(.9); check('all stacks persist while the shared timer drains', state.furyStacks === 10 && near(state.furyRemaining,.1));
        tickFury(.1); check('timer expiry removes only one stack and starts half-second decay', state.furyStacks === 9 && near(state.furyRemaining,.5));
        tickFury(.4); check('another stack remains until the next decay interval ends', state.furyStacks === 9 && near(state.furyRemaining,.1));
        tickFury(.1); check('continued inactivity loses one more stack', state.furyStacks === 8 && near(state.furyRemaining,.5));
        tickFury(10); check('long elapsed steps remove all remaining stacks without a negative timer', state.furyStacks === 0 && state.furyRemaining === 0);
        hit(); tickFury(.6); hit(); check('a low hit rate cannot accumulate Fury across expirations', state.furyStacks === 1 && near(state.furyRemaining,.1));
        fresh(); itemById.testAmulet.stats.damage = 98; combatStatCache = new Map();
        check('damage starts without an inactive Fury bonus',getDamage() === 100);
        hit(10); check('ten active Fury stacks grant twenty percent damage even within a cached batch',getDamage() === 120);
        tickFury(1); check('losing one Fury stack immediately reduces the bonus to eighteen percent',state.furyStacks === 9 && getDamage() === 118);
        hit(); check('a hit during decay restores a stack and adds only 0.1 seconds',state.furyStacks === 10 && near(state.furyRemaining,.6) && !state.furyDecaying && getDamage() === 120);
        combatStatCache = null; renderCombat(); check('the damage display updates as Fury changes',elements.damage.textContent === '120');
        const poisonDamage = getPoisonDamage(); tickFury(20);
        check('expired Fury removes its damage bonus and never changes poison damage',getDamage() === 100 && getPoisonDamage() === poisonDamage);
        fresh(); hit(10); tickFury(1.8); const decay = {stacks:state.furyStacks,time:state.furyRemaining};
        fresh(); hit(10); for (let index=0;index<18;index++) tickFury(.1);
        check('large elapsed steps and regular ticks lose the same number of stacks',state.furyStacks === decay.stacks && near(state.furyRemaining,decay.time));
        fresh(); applyDamageToMonster(state.monsterStates[0],0); applyDamageToMonster(state.monsterStates[0],NaN); Math.random=()=>.999; attack();
        check('misses and invalid damage do not generate Fury', state.furyStacks === 0);
        fresh(10,{},1); hit(); applyDamageToMonster(state.monsterStates[0],1);
        check('lethal direct hits count once and hitting a corpse does not count', state.furyStacks === 1 && state.kills[map.id] === 1);
        fresh(10,{snakeBite:1,poisonExecute:1}); hit(2); const time = state.furyRemaining;
        const poisonTarget = state.monsterStates[1]; poisonTarget.poisonStacks = [{remainingDuration:5,timeUntilTick:getPoisonTickInterval()}]; poisonTarget.hp = 1;
        tryExecutePoison(poisonTarget); applyDamageToMonster(state.monsterStates[2],1,'poison');
        check('poison damage and poison execution do not add stacks or duration', state.furyStacks === 2 && near(state.furyRemaining,time));
        fresh(10,{snakeBite:1}); state.monsterStates[0].poisonStacks = [{remainingDuration:5,timeUntilTick:.1}]; tickMonsterPoison(state.monsterStates[0],.1);
        check('actual poison ticks do not generate Fury', state.furyStacks === 0);
        fresh(); attack(); check('normal attacks build Fury through combat simulation', state.furyStacks === 1);
        fresh(); itemById.testAmulet.stats.multiHit = 2; attack(); check('each successful multi-hit builds Fury', state.furyStacks === 3);
        fresh(30,{shockwaveSlash:1}); attack(); check('shockwave hits each add Fury', state.furyStacks === 9);
        fresh(30,{volcanicEruption:1}); attack(); check('eruption direct and cardinal splash hits each add Fury', state.furyStacks === 4);
        fresh(30,{volcanicEruption:1,eruptionChain:1}); triggerVolcanicEruption(state.monsterStates[0],1); const initial = state.furyStacks; state.attackTimer=-100;
        simulateCombatStep(1); check('delayed eruption chain hits add Fury after the intervening timer decay', state.furyStacks === initial - 2 + 3);
        fresh(30,{multiShot:1}); attack(); check('Multishot hits build Fury', state.furyStacks === 2);
        fresh(30,{forkingArrow:1}); shootAbilityArrow([state.monsterStates[4]],1,'forkingArrow',0);
        check('incoming and forked arrows each build Fury', state.furyStacks === 2);
        fresh(); shootAbilityArrow(state.monsterStates.slice(0,3),1,'piercingArrow'); check('each piercing arrow target builds Fury', state.furyStacks === 3);
        fresh(); hit(10); itemById.testAmulet.stats.maxFury = 3; tickFury(0);
        check('lowering capacity clamps active stacks and duration', state.furyStacks === 3 && near(state.furyRemaining,.3));
        itemById.testAmulet.stats.maxFury = 0; renderCombatBuffs(); check('removing capacity clears Fury and removes its icon', state.furyStacks === 0 && state.furyRemaining === 0 && !elements.buffList.querySelector('[data-buff-id="fury"]'));
        fresh(); render(); const emptyRosterTop = elements.enemyRoster.getBoundingClientRect().top;
        hit(10); renderCombat();
        const furyIcon = elements.buffList.querySelector('[data-buff-id="fury"]');
        check('Fury uses a sprite with stacks and damage percent instead of a bar', !!furyIcon.querySelector('img') && furyIcon.querySelector('.buff-stacks').textContent === '10' && furyIcon.querySelector('.buff-value').textContent === '20%' && !document.getElementById('furyBar'));
        const durationLabel = furyIcon.querySelector('.buff-duration');
        check('remaining duration appears beneath the buff icon',durationLabel.textContent === '1s' && !durationLabel.hidden && durationLabel.getBoundingClientRect().top >= furyIcon.getBoundingClientRect().bottom);
        const bounds = furyIcon.getBoundingClientRect(), stackBounds = furyIcon.querySelector('.buff-stacks').getBoundingClientRect(), valueBounds = furyIcon.querySelector('.buff-value').getBoundingClientRect();
        check('stack count sits at the top right and damage value at the bottom left',stackBounds.right > bounds.left + bounds.width/2 && stackBounds.top < bounds.top + bounds.height/2 && valueBounds.left < bounds.left + bounds.width/2 && valueBounds.bottom > bounds.top + bounds.height/2);
        check('activating a buff does not shift the monster roster',near(elements.enemyRoster.getBoundingClientRect().top,emptyRosterTop));
        renderCombatBuffs(); check('unchanged buffs reuse their existing icon',elements.buffList.firstElementChild === furyIcon);
        renderBuffs([{id:'fury',name:'Fury',sprite:'assets/ui/icon-sword.png',stacks:10,value:'20%',description:'20% damage'}, {id:'otherBuff',name:'Other buff',sprite:'assets/ui/icon-helmet.png',stacks:2,value:'5%',description:'5% defense'}]);
        check('the buff section supports multiple independent icons',elements.buffList.children.length === 2 && elements.buffList.lastElementChild.querySelector('.buff-stacks').textContent === '2' && elements.buffList.lastElementChild.querySelector('.buff-value').textContent === '5%');
        renderCombatBuffs(); check('expired buffs disappear without removing other buffs',elements.buffList.children.length === 1 && elements.buffList.firstElementChild === furyIcon);
        state.combatPaused = true; simulateCombatStep(.4); check('Fury continues to decay while combat is paused', near(state.furyRemaining,.6));
        applyDamageToPlayer(state.playerHp); check('death preserves Fury for normal decay instead of removing every stack', state.furyStacks === 10 && near(state.furyRemaining,.6));
        simulateCombatStep(.6); renderCombatBuffs();
        check('dead players lose only one stack when their remaining duration expires',state.furyStacks === 9 && near(state.furyRemaining,.5) && elements.buffList.firstElementChild.querySelector('.buff-stacks').textContent === '9');
        simulateCombatStep(.5); check('dead players continue losing one stack every half second',state.furyStacks === 8 && near(state.furyRemaining,.5));
        fresh(30,{volcanicEruption:1}); hit(10); state.playerHp = getPlayerMaxHealth() * .05;
        triggerVolcanicEruption(state.monsterStates[0],1);
        check('lethal eruption self-damage no longer clears all accumulated Fury',state.playerHp === 0 && state.furyStacks === 13 && near(state.furyRemaining,1.3));
        state.furyRemaining = .1; pendingCombatSeconds = .1; processCombatBacklog();
        check('the game clock preserves gradual Fury decay while the player is dead',state.furyStacks === 12 && near(state.furyRemaining,.5) && elements.buffList.firstElementChild.querySelector('.buff-stacks').textContent === '12');
        fresh(30); render(); hit(30); state.attackTimer = -100;
        for (let index=0;index<29;index++) { simulateCombatStep(.1); renderCombat(); }
        check('all thirty stacks remain visible until the shared timer actually expires',state.furyStacks === 30 && elements.buffList.firstElementChild.querySelector('.buff-stacks').textContent === '30');
        for (let expected=29;expected>=0;expected--) {
            const ticks = expected === 29 ? 1 : 5;
            for (let index=0;index<ticks;index++) { simulateCombatStep(.1); renderCombat(); }
            const icon = elements.buffList.querySelector('[data-buff-id="fury"]');
            check('normal combat ticks and rendering decay to '+expected+' stacks',state.furyStacks === expected && (expected ? icon.querySelector('.buff-stacks').textContent === String(expected) && icon.querySelector('.buff-duration').textContent === '0.5s' : !icon));
        }
        fresh(); hit(10); tickFury(.2); const saved = createGameSave();
        const parsed = parseGameSave(JSON.stringify(saved)); clearFury(); applyGameSave(parsed);
        check('save and load preserve the shared timer without refreshing it', state.furyStacks === 10 && near(state.furyRemaining,.8));
        state.attackTimer=-100; state.combatPaused = true; simulateCombatStep(1);
        check('offline elapsed time removes just the first expired stack', state.furyStacks === 9 && near(state.furyRemaining,.3));
        const decaying = parseGameSave(JSON.stringify(createGameSave())); clearFury(); applyGameSave(decaying);
        check('saving during stack decay preserves stacks and the next expiry',state.furyStacks === 9 && near(state.furyRemaining,.3));
        simulateCombatStep(5); check('longer offline inactivity removes the remaining stacks',state.furyStacks === 0 && state.furyRemaining === 0);
        fresh(2); hit(2); tickFury(.2); const lastStack = parseGameSave(JSON.stringify(createGameSave()));
        clearFury(); applyGameSave(lastStack); state.combatPaused = true; simulateCombatStep(.4);
        check('saving the last decaying stack retains its full half-second loss interval',state.furyDecaying && state.furyStacks === 1 && near(state.furyRemaining,.1));
        simulateCombatStep(.1); check('the last stack expires after half a second rather than 0.1 seconds',state.furyStacks === 0 && !state.furyDecaying);
        const legacy = {...saved}; delete legacy.furyStacks; delete legacy.furyRemaining; delete legacy.furyDecaying; applyGameSave(parseGameSave(JSON.stringify(legacy)));
        check('older saves without Fury still load', state.furyStacks === 0 && state.furyRemaining === 0);
        for (const invalid of [{furyStacks:-1},{furyStacks:1.5},{furyRemaining:-.1},{furyRemaining:'5'},{furyDecaying:'yes'}]) {
            let rejected=false; try { parseGameSave(JSON.stringify({...saved,...invalid})); } catch (_) { rejected=true; }
            check('invalid Fury save data is rejected: '+JSON.stringify(invalid),rejected);
        }
        const snapshot = () => JSON.stringify({fury:state.furyStacks,time:state.furyRemaining,decaying:state.furyDecaying,hp:state.playerHp,monsters:state.monsterStates,pending:state.pendingEruptions,gold:state.gold});
        function run(effects) {
            fresh(30,{volcanicEruption:1,eruptionChain:1,multiShot:1,forkingArrow:1,piercingArrow:1,snakeBite:1,bloomingFlower:1,poisonExecute:1});
            let seed=1234; Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            for(let index=0;index<100;index++) simulateCombatStep(.1,effects);
            return snapshot();
        }
        check('foreground and offline steps build and expire Fury identically', run(true) === run(false));
        check('no runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR '+error.stack); }
    finally { Math.random=originalRandom; itemById.testAmulet.stats=originalStats; combatStatCache=null; clearFury(); resetCombatClock(); clearOfflineRecap(); }
    const report=document.createElement('pre'); report.id='smoke-results'; report.textContent=checks.join('\n'); document.body.append(report);
}());
