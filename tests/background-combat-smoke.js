(async function () {
    const checks = [];
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const near = (a, b) => Math.abs(a - b) < 1e-6;
    const originalRandom = Math.random, originalDateNow = Date.now;
    const performanceDescriptor = Object.getOwnPropertyDescriptor(performance, 'now');
    const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
    const visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    const originalStorageWrite = Storage.prototype.setItem;
    let wall = Date.now(), monotonic = performance.now(), hidden = false, writes = 0;
    Date.now = () => wall;
    Object.defineProperty(performance, 'now', {configurable: true, value: () => monotonic});
    Object.defineProperty(document, 'hidden', {configurable: true, get: () => hidden});
    Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => hidden ? 'hidden' : 'visible'});
    Storage.prototype.setItem = function (...args) { if (args[0] === saveKey) writes++; return originalStorageWrite.apply(this, args); };
    let observer;
    const map = mapData.find(entry => entry.id === worldData[0].mapIds[0]);
    const ranks = ['damageNode', 'mightyBlows', 'shockwaveSlash', 'accuracyNode', 'multiHit1',
        'attackSpeedNode', 'attackSpeedNode2', 'snakeBite', 'poisonDMG_3', 'poisonDMG_2',
        'basicallySnake', 'bigAttackSpeed_1', 'bigAttackSpeed_4', 'bigAttackSpeed_3',
        'poisonExecute', 'bloomingFlower', 'healthNode', 'thickHide', 'untouchable', 'quickHands', 'fleetFooted',
        'accuracyNode2', 'piercingArrow', 'forkingArrow', 'multiShot', 'freezingArrows'];
    function seedRandom(seed = 48271) {
        Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    }
    function fresh({harmless = false} = {}) {
        hidden = false;
        state.selectedMap = map.id; state.selectedWorld = worldData[0].id;
        state.currentView = 'map'; state.isInTown = false;
        state.kills = Object.fromEntries(mapData.map(entry => [entry.id, 0]));
        state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id, 0]));
        state.gold = 0; state.upgrades = {strength: 0, haste: 0, evasion: 0};
        state.skillRanks = Object.fromEntries(ranks.map(id => [id, 1]));
        state.level = ranks.length; state.skillPoints = 0;
        state.experience = experienceForNextLevel(state.level) - 5;
        state.gear = createEmptyGear(); state.gear.necklace = 'testAmulet';
        state.ownedItemIds = ['testAmulet']; state.crafted = [];
        state.developerTravelEnabled = state.developerItemsEnabled = false;
        state.tutorials = createTutorialState(); state.lootLog = []; state.lastLoot = null;
        state.lastDrop = 'Defeat enemies to find loot.';
        map.drops = [{id: 'gel', amount: [1, 2], chance: .5}]; map.itemDrops = [];
        map.spawns = [0, 1, 2].map(index => ({id: 'clockEnemy' + index,
            monsterId: worldContent.monsters[0].id, count: 1, overrides: {
                health: 40 + index * 20, attackDamage: harmless ? 0 : index + 1,
                attackInterval: .7 + index * .2, accuracy: 100, evasion: 10,
                respawnSeconds: .4 + index * .4, gold: [3, 5], experience: 10,
                drops: [{id: 'gel', amount: [2, 2], chance: 1}],
                itemDrops: [{id: 'testDropHelm', chance: 1}]
            }}));
        resetMonsterStates(map); state.playerHp = getPlayerMaxHealth();
        state.attackTimer = 0; state.combatPaused = false;
        resetCombatClock(); lastSave = wall; seedRandom(); render(); writes = 0;
    }
    const snapshot = () => JSON.stringify({
        gold: state.gold, kills: state.kills,
        materials: Object.fromEntries(Object.keys(materialNames).map(id => [id, state.materials[id]])),
        level: state.level, experience: state.experience, skillPoints: state.skillPoints,
        playerHp: state.playerHp, combatPaused: state.combatPaused,
        attackTimer: state.attackTimer, monsterStates: state.monsterStates,
        target: state.targetMonsterId, owned: state.ownedItemIds,
        lootLog: state.lootLog, lastLoot: state.lastLoot, tutorials: state.tutorials
    });
    function elapse(seconds, {sleep = false} = {}) {
        wall += seconds * 1000;
        if (!sleep) monotonic += seconds * 1000;
        smokeIntervals.at(-1)();
    }
    async function drain() {
        updateCombatClock();
        for (let count = 0; pendingCombatSeconds + 1e-8 >= gameTickSeconds && count < 100; count++) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        check('catch-up finishes without dropping its remaining time', pendingCombatSeconds < gameTickSeconds);
    }
    try {
        fresh({harmless: true});
        for (let step = 0; step < 600; step++) simulateCombatStep(gameTickSeconds);
        const reference = snapshot();
        check('reference combat exercises rewards, level-ups, and unique equipment ownership',
            state.kills[map.id] > 10 && state.level > ranks.length && state.materials.gel > 0 && ownsItem('testDropHelm'));
        fresh({harmless: true}); hidden = true;
        observer = new MutationObserver(() => {});
        observer.observe(document.body, {subtree: true, childList: true, attributes: true, characterData: true});
        elapse(60);
        check('delayed background callbacks process multiple steps and keep a backlog', state.kills[map.id] > 0 && pendingCombatSeconds > 0);
        check('background simulation does not change the DOM', observer.takeRecords().length === 0);
        observer.disconnect();
        check('catch-up saves once per batch interval rather than once per kill', writes === 1);
        const checkpoint = JSON.parse(localStorage.getItem(saveKey));
        check('partial catch-up saves the simulated timestamp and player attack progress', checkpoint.lastSimulatedAt < wall && near(checkpoint.attackTimer, state.attackTimer));
        check('reloading resumes unfinished time with the same combat state', loadGame() && pendingCombatSeconds > 0);
        await drain();
        if (snapshot() !== reference) {
            const expected = JSON.parse(reference), actual = JSON.parse(snapshot());
            for (const key of Object.keys(expected)) if (JSON.stringify(expected[key]) !== JSON.stringify(actual[key])) checks.push('DIFFERENCE ' + key + ': expected ' + JSON.stringify(expected[key]) + ', received ' + JSON.stringify(actual[key]));
        }
        check('background catch-up matches foreground combat including poison, spreads, procs, rewards, and level-ups', snapshot() === reference);
        const completed = snapshot(); processCombatBacklog();
        check('processing a settled clock never awards the same elapsed time twice', snapshot() === completed);
        hidden = false; document.dispatchEvent(new Event('visibilitychange'));
        check('returning to the page refreshes inventory totals and clears catch-up controls',
            elements.gold.textContent === formatAmount(state.gold) && !document.querySelector('main').inert && !document.querySelector('main').hasAttribute('aria-busy'));

        fresh();
        elapse(.06); check('fractional elapsed time is retained until a full combat step', near(state.attackTimer, 0) && near(pendingCombatSeconds, .06));
        elapse(.06); check('fractional time carries into the next callback', near(state.attackTimer, .1) && near(pendingCombatSeconds, .02));

        fresh({harmless: true});
        for (let step = 0; step < 50; step++) simulateCombatStep(gameTickSeconds);
        const beforeSleep = snapshot();
        fresh({harmless: true}); hidden = true; elapse(5, {sleep: true}); await drain();
        check('device sleep is recovered even when the monotonic clock does not advance', snapshot() === beforeSleep);

        fresh();
        state.playerHp = 1; state.monsterStates[0].attackTimer = 1;
        state.monsterStates[0].poisonStacks = [{remainingDuration: 2, timeUntilTick: .2}];
        const deathStart = JSON.stringify(state);
        Math.random = () => 0;
        for (let step = 0; step < 1000; step++) simulateCombatStep(gameTickSeconds);
        const deathReference = snapshot();
        Object.assign(state, JSON.parse(deathStart)); resetCombatClock(); hidden = true; Math.random = () => 0;
        elapse(100); await drain();
        check('catch-up preserves death, remaining poison, and respawns without auto-reviving', snapshot() === deathReference && state.combatPaused && state.playerHp === 0);
        const killsAfterDeath = state.kills[map.id];
        elapse(86400 * 3); await drain();
        check('long periods after death skip idle time without extra kills or revival', state.kills[map.id] === killsAfterDeath && state.playerHp === 0 && !state.monsterStates.some(monster => monster.respawnRemaining > 0));

        fresh({harmless: true});
        elapse(3600);
        check('long catch-up yields to the browser and pauses build/map controls until complete', pendingCombatSeconds > 3500 && document.querySelector('main').inert && document.querySelector('.nav-header').inert && document.querySelector('.experience-strip').inert && !document.querySelector('#combatCatchupNotice').hidden && elements.combatStatusLabel.textContent === 'Catching up…');
        saveGame(); const savedBacklog = pendingCombatSeconds;
        check('saving during a long catch-up keeps the remaining time across reloads', loadGame() && near(pendingCombatSeconds, savedBacklog));
        // Reset this hour-long fixture; the previous checks cover completion on
        // shorter gaps using the same simulation and scheduling path.
        fresh();
        state.monsterStates[0].hp = 35; state.attackTimer = getAttackSpeed();
        observer = new MutationObserver(() => {});
        observer.observe(elements.enemyRoster, {subtree: true, childList: true, attributes: true, characterData: true});
        const live = simulateCombatStep(gameTickSeconds, true);
        check('live simulation collects visual effects without drawing them', live.effects.length > 0 && observer.takeRecords().length === 0);
        live.effects.forEach(effect => effect());
        check('foreground effects still display when presented', observer.takeRecords().length > 0);
        observer.disconnect();
        saveGame(); const legacy = JSON.parse(localStorage.getItem(saveKey));
        delete legacy.lastSimulatedAt; delete legacy.attackTimer;
        localStorage.setItem(saveKey, JSON.stringify(legacy));
        check('older saves load without inventing offline time', loadGame() && near(pendingCombatSeconds, 0) && state.attackTimer === 0);
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    finally {
        observer?.disconnect(); hidden = false; resetCombatClock();
        Math.random = originalRandom; Date.now = originalDateNow;
        Storage.prototype.setItem = originalStorageWrite;
        for (const [target, name, descriptor] of [[performance, 'now', performanceDescriptor], [document, 'hidden', hiddenDescriptor], [document, 'visibilityState', visibilityDescriptor]]) {
            if (descriptor) Object.defineProperty(target, name, descriptor); else delete target[name];
        }
    }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
