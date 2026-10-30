// Used only by run-combat-effects-benchmark.ps1 in an isolated browser profile.
(function () {
    const nativeInterval = window.benchmarkSetInterval;
    const modes = ['all-on', 'projectiles-off', 'abilities-off', 'shaking-off', 'glows-off', 'all-off'];
    const originalCreate = document.createElement, originalCreateNS = document.createElementNS;
    let created = 0;
    document.createElement = function (...args) { created++; return originalCreate.apply(this, args); };
    document.createElementNS = function (...args) { created++; return originalCreateNS.apply(this, args); };
    const control = key => document.querySelector('[data-effect-setting="' + key + '"]');
    const set = (key, on) => { if (control(key).getAttribute('aria-checked') !== String(on)) control(key).click(); };
    function prepare(mode, monsterHealth = 100000) {
        if (!modes.includes(mode)) throw new Error('Unknown mode');
        set('all', true); set('abilities', true);
        for (const key of ['projectiles', 'shaking', 'glows']) set(key, true);
        if (mode !== 'all-on') set(mode.replace('-off', ''), false);
        document.getAnimations().forEach(animation => animation.cancel());
        window.LootEffects?.clear();
        combatStatCache = null;
        state.skillRanks = Object.fromEntries(skillNodes.filter(node => !node.start).map(node => [node.id, node.maxRank]));
        state.level = Object.values(state.skillRanks).reduce((sum, rank) => sum + rank, 0);
        state.skillPoints = 0; state.experience = 0; pendingSkillRanks = {};
        state.upgrades = {strength: 0, haste: 0, evasion: 0};
        state.gear = createEmptyGear(); state.gear.necklace = 'testAmulet';
        state.ownedItemIds = ['testAmulet']; state.crafted = [];
        itemById.testAmulet.stats = {health: 10000, healthRegen: 100000};
        state.kills = Object.fromEntries(mapData.map(map => [map.id, 0]));
        state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id, 0]));
        state.gold = 0; state.lootLog = []; state.lastLoot = null; state.tutorials = createTutorialState();
        state.currentView = 'map'; state.isInTown = false; state.monsterColumns = 8;
        const map = currentMap(); map.drops = []; map.itemDrops = [];
        map.spawns = [{id: 'effectsBench', monsterId: worldContent.monsters[0].id, count: 64,
            overrides: {health: monsterHealth, attackDamage: 1, attackInterval: 3, accuracy: 100, evasion: 10,
                respawnSeconds: 2, gold: [1, 3], experience: 1, drops: [], itemDrops: []}}];
        resetMonsterStates(map); resetCombatClock(); clearOfflineRecap();
        state.playerHp = getPlayerMaxHealth(); state.playerMana = getPlayerMaxMana();
        state.combatPaused = false; state.attackTimer = getAttackSpeed();
        elements.combatPanel.querySelectorAll('.combat-arrow,.eruption-chain,.eruption-burst,.poison-transfer,.shield-slam-wave,.spell-effect,.elemental-effect-layer,.void-volley-player-glow').forEach(node => node.remove());
        elements.enemyRoster.replaceChildren(); render();
        let seed = 654321;
        Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
        elements.combatPanel.scrollIntoView({block: 'start'});
        void elements.combatPanel.offsetHeight;
        if (document.hidden) throw new Error('Benchmark page must be visible');
        return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    const digest = () => {
        const source = JSON.stringify({hp:state.playerHp,mana:state.playerMana,charges:state.voidCharges,power:state.gatheringPower,
            monsters:state.monsterStates,missiles:state.pendingVoidMissiles,eruption:state.pendingEruptions,
            fury:state.furyStacks,furyTime:state.furyRemaining,shields:state.shieldStacks,kills:state.kills,
            gold:state.gold,materials:state.materials,level:state.level,xp:state.experience,target:state.targetMonsterId,timer:state.attackTimer});
        let hash = 2166136261;
        for (const character of source) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
        return (hash >>> 0).toString(16);
    };
    async function run(ticks = 30) {
        let simulationMs = 0, visualMs = 0, peakEffectRoots = 0, tick = 0, frame = 0, lastFrame;
        const gaps = [], started = performance.now(), createdBefore = created;
        function monitor(now) { if (lastFrame !== undefined) gaps.push(now - lastFrame); lastFrame = now; frame = requestAnimationFrame(monitor); }
        frame = requestAnimationFrame(monitor);
        await new Promise((resolve, reject) => {
            const timer = nativeInterval(() => {
                try {
                    let start = performance.now(); combatStatCache = new Map();
                    const result = simulateCombatStep(.1, CombatSettings.enabled()); combatStatCache = null;
                    simulationMs += performance.now() - start;
                    start = performance.now(); flushCombatEffects(result.effects);
                    if (result.needsRender) render(); else renderCombat();
                    visualMs += performance.now() - start;
                    peakEffectRoots = Math.max(peakEffectRoots, elements.combatPanel.querySelectorAll('.combat-arrow,.eruption-chain,.eruption-burst,.poison-transfer,.shield-slam-wave,.spell-effect,.elemental-effect-layer').length);
                    tick++;
                    if (tick === ticks) { clearInterval(timer); resolve(); }
                } catch (error) { clearInterval(timer); reject(error); }
            }, 100);
        });
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        cancelAnimationFrame(frame);
        const elapsedMs = performance.now() - started;
        const sorted = [...gaps].sort((a, b) => a - b);
        if (window.benchmarkErrors.length) throw new Error(window.benchmarkErrors.join('\n'));
        if (state.combatPaused) throw new Error('Player died during the benchmark');
        return {ticks: tick, simulatedSeconds: tick / 10, elapsedMs, simulationMs, visualMs,
            createdElements: created - createdBefore, peakEffectRoots,
            frameP95Ms: sorted[Math.floor(sorted.length * .95)] || 0,
            framesOver25ms: gaps.filter(gap => gap > 25).length, frames: gaps.length,
            outcome: digest(), kills: Object.values(state.kills).reduce((sum, value) => sum + value, 0)};
    }
    function environment() {
        const gl = document.createElement('canvas').getContext('webgl');
        const debug = gl?.getExtension('WEBGL_debug_renderer_info');
        const renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER) || 'Unavailable';
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
        return {renderer, userAgent: navigator.userAgent, logicalProcessors: navigator.hardwareConcurrency,
            width: innerWidth, height: innerHeight, monsters: 64, skills: 'all unlocked', browserGpuDisabled: false};
    }
    window.CombatEffectsBenchmark = {prepare, run, environment};
}());
