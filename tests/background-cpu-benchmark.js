// Isolated browser benchmark: 60 simulated seconds per run, without rendering
// or visual effects. Run through run-equipment-smoke.ps1, never a live save.
(function () {
    const checks = [], results = [];
    const originalRandom = Math.random, originalStats = itemById.testAmulet.stats;
    const originalSave = localStorage.getItem(saveKey);
    const map = currentMap();
    const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    const round = value => Math.round(value * 1000) / 1000;
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const allRanks = Object.fromEntries(skillNodes.filter(node => !node.start && node.maxRank > 0).map(node => [node.id, node.maxRank]));
    function fresh(scenario) {
        combatStatCache = null;
        state.skillRanks = scenario.skills === 'all' ? {...allRanks} : {};
        state.level = Object.values(state.skillRanks).reduce((sum, rank) => sum + rank, 0);
        state.skillPoints = 0; state.experience = 0; pendingSkillRanks = {};
        state.upgrades = {strength: 0, haste: 0, evasion: 0};
        state.gear = createEmptyGear(); state.gear.necklace = 'testAmulet';
        state.ownedItemIds = ['testAmulet']; state.crafted = [];
        // Sustain combat so a dead player does not make a busy scenario look cheap.
        itemById.testAmulet.stats = {health: 10000, healthRegen: 100000};
        state.kills = Object.fromEntries(mapData.map(entry => [entry.id, 0]));
        state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id, 0]));
        state.gold = 0; state.lootLog = []; state.lastLoot = null; state.tutorials = createTutorialState();
        state.selectedMap = map.id; state.selectedWorld = worldForMap(map.id).id;
        state.currentView = 'map'; state.isInTown = false;
        map.drops = []; map.itemDrops = [];
        map.spawns = [{id: 'backgroundBench', monsterId: worldContent.monsters[0].id, count: scenario.monsters,
            overrides: {health: 100000, attackDamage: 1, attackInterval: 3, accuracy: 100, evasion: 10,
                respawnSeconds: 2, gold: [1, 3], experience: 1, drops: [], itemDrops: []}}];
        resetMonsterStates(map); resetCombatClock(); clearOfflineRecap();
        state.playerHp = getPlayerMaxHealth(); state.playerMana = getPlayerMaxMana();
        state.combatPaused = false; state.attackTimer = 0;
        let seed = 654321;
        Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    }
    function measure(scenario) {
        fresh(scenario);
        const observer = new MutationObserver(() => {});
        observer.observe(document.body, {subtree: true, childList: true, attributes: true, characterData: true});
        let simulationMs = 0, savingMs = 0;
        try {
            for (let second = 0; second < 60; second++) {
                let start = performance.now();
                for (let tick = 0; tick < 10; tick++) {
                    // A regular 100 ms callback starts a fresh stat cache. This
                    // deliberately excludes rendering, timers, and visual effects.
                    combatStatCache = new Map();
                    simulateCombatStep(.1, false);
                    combatStatCache = null;
                    lastSimulatedAt += 100;
                }
                simulationMs += performance.now() - start;
                start = performance.now(); saveGame(); savingMs += performance.now() - start;
            }
            check(scenario.label + ' advances all 600 ticks without dying', !state.combatPaused && state.playerHp > 0);
            check(scenario.label + ' simulation and saves do not change page elements', observer.takeRecords().length === 0);
        } finally { observer.disconnect(); combatStatCache = null; }
        const source = localStorage.getItem(saveKey);
        check(scenario.label + ' writes a valid current save', JSON.parse(source).monsterStates.length === scenario.monsters);
        const outcome = JSON.stringify({hp:state.playerHp,mana:state.playerMana,voidCharges:state.voidCharges,
            power:state.gatheringPower,missiles:state.pendingVoidMissiles,paused:state.combatPaused,
            attack:state.attackTimer,monsters:state.monsterStates,pending:state.pendingEruptions,
            kills:state.kills,gold:state.gold,materials:state.materials,level:state.level,xp:state.experience,
            target:state.targetMonsterId,loot:state.lootLog,fury:state.furyStacks,furyTime:state.furyRemaining,shields:state.shieldStacks});
        return {simulationMs, savingMs, saveBytes: new TextEncoder().encode(source).length, outcome};
    }
    function referenceOutcome(scenario) {
        const stat = getSkillStat, multiplier = getSkillMultiplier;
        try {
            // The previous per-batch implementation is the behavior reference.
            getSkillStat = key => cachedCombatStat('getSkillStat:' + key, () => getSkillStatFromRanks(key, state.skillRanks));
            getSkillMultiplier = key => cachedCombatStat('getSkillMultiplier:' + key, () => Object.entries(state.skillRanks).reduce((total, [id, rank]) => {
                const node = skillNodeById[id];
                if (!node || !rank) return total;
                if (key === 'attackSpeedMultiplier' && node.stats.attackSpeedPerLevel) total *= Math.pow(1 + node.stats.attackSpeedPerLevel, state.level * rank);
                return total * Math.pow(node.stats[key] || 1, rank);
            }, 1));
            return measure(scenario).outcome;
        } finally { getSkillStat = stat; getSkillMultiplier = multiplier; }
    }
    function saveBreakdown() {
        const build = [], serialize = [], store = [];
        for (let run = 0; run < 60; run++) {
            let start = performance.now(); const save = createGameSave(); build.push(performance.now() - start);
            start = performance.now(); const source = JSON.stringify(save); serialize.push(performance.now() - start);
            start = performance.now(); localStorage.setItem(saveKey, source); store.push(performance.now() - start);
        }
        const average = values => round(values.reduce((sum, value) => sum + value, 0) / values.length);
        return {buildMsPerSave: average(build), serializeMsPerSave: average(serialize), storageMsPerSave: average(store)};
    }
    function profileSimulation(scenario) {
        fresh(scenario);
        const names = ['getSkillStatFromRanks', 'getSkillMultiplier', 'getGearStat',
            'tickMonsterPoison', 'tickMonsterBleed', 'tickElementalBrands',
            'tickPendingEruptions', 'monsterDefinition', 'defeatEnemy'];
        const originals = {}, samples = {};
        try {
            for (const name of names) {
                originals[name] = window[name]; samples[name] = {calls: 0, inclusiveMs: 0};
                window[name] = function (...args) {
                    const start = performance.now();
                    try { return originals[name].apply(this, args); }
                    finally { samples[name].calls++; samples[name].inclusiveMs += performance.now() - start; }
                };
            }
            for (let tick = 0; tick < 600; tick++) {
                combatStatCache = new Map(); simulateCombatStep(.1, false); combatStatCache = null;
            }
        } finally { for (const name of names) window[name] = originals[name]; combatStatCache = null; }
        return {label: scenario.label, simulatedSeconds: 60,
            note: 'Instrumented inclusive timings overlap and must not be added to the uninstrumented totals.',
            functions: Object.entries(samples).map(([name, values]) => ({name, calls: values.calls, inclusiveMs: round(values.inclusiveMs)}))
                .sort((a, b) => b.inclusiveMs - a.inclusiveMs)};
    }
    try {
        const scenarios = [
            {label: 'basic-1', monsters: 1, skills: 'none'},
            {label: 'all-skills-1', monsters: 1, skills: 'all'},
            {label: 'all-skills-8', monsters: 8, skills: 'all'},
            {label: 'all-skills-64', monsters: 64, skills: 'all'}
        ];
        for (const scenario of scenarios) {
            const expected = referenceOutcome(scenario);
            const measured = [];
            for (let run = 0; run < 4; run++) {
                const result = measure(scenario);
                check(scenario.label + ' cached combat matches the previous implementation', result.outcome === expected);
                if (run > 0) measured.push(result); // Discard one warm-up run.
            }
            const simulationMs = median(measured.map(run => run.simulationMs));
            const savingMs = median(measured.map(run => run.savingMs));
            const result = {...scenario, simulatedSeconds: 60, measuredRuns: 3,
                simulationMs: round(simulationMs), savingMs: round(savingMs),
                simulationMsPerSecond: round(simulationMs / 60), savingMsPerSecond: round(savingMs / 60),
                saveBytes: median(measured.map(run => run.saveBytes)), saveBreakdown: saveBreakdown()};
            results.push(result);
        }
        const profile = profileSimulation(scenarios[3]);
        check('no browser runtime errors', !window.smokeErrors.length);
        checks.push(...results.map(result => 'BENCH ' + JSON.stringify(result)), 'PROFILE ' + JSON.stringify(profile), 'SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    finally {
        Math.random = originalRandom; itemById.testAmulet.stats = originalStats; combatStatCache = null;
        if (originalSave === null) localStorage.removeItem(saveKey); else localStorage.setItem(saveKey, originalSave);
        resetCombatClock(); clearOfflineRecap();
    }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
