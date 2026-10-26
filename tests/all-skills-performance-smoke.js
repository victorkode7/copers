// Run with tests/run-equipment-smoke.ps1 -TestScript tests/all-skills-performance-smoke.js -TimeoutSeconds 120.
// Fixed digests include Fury, Fire of the Righteous, and the shield skills. Intentional tree or
// combat balance changes require reviewing and updating the reference outcomes.
(function () {
    const checks = [], originalRandom = Math.random, originalStats = itemById.testAmulet.stats;
    const map = currentMap(), material = Object.keys(materialNames)[0];
    const ranks = Object.fromEntries(skillNodes.filter(node => !node.start && node.maxRank > 0).map(node => [node.id, node.maxRank]));
    let visibleArrows = 0, visibleCracks = 0, advancedSteps = 0;
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
    const snapshot = () => JSON.stringify({hp:state.playerHp,paused:state.combatPaused,attack:state.attackTimer,monsters:state.monsterStates,pending:state.pendingEruptions,kills:state.kills,gold:state.gold,materials:state.materials,level:state.level,xp:state.experience,target:state.targetMonsterId,loot:state.lootLog,fury:state.furyStacks,furyTime:state.furyRemaining,shields:state.shieldStacks});
    function hash(value) { let result = 2166136261; for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619); return (result >>> 0).toString(16); }
    function fresh(count, durable = false, stress = false) {
        clearFury();
        state.shieldStacks = 0;
        state.skillRanks = {...ranks}; state.level = Object.values(ranks).reduce((sum, rank) => sum + rank, 0); state.skillPoints = 0; state.experience = 0;
        state.upgrades = {strength:0,haste:0,evasion:0}; state.gear = createEmptyGear(); state.gear.necklace = 'testAmulet'; state.ownedItemIds = ['testAmulet']; state.crafted = [];
        // Sustain eruption self-cost so the benchmark measures ongoing combat, not a dead player.
        itemById.testAmulet.stats = {health:10000,healthRegen:100000,...(stress ? {multiHit:4,attackSpeedMultiplier:4} : {})};
        state.kills = Object.fromEntries(mapData.map(entry => [entry.id, 0])); state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id, 0]));
        state.gold = 0; state.lootLog = []; state.lastLoot = null; state.tutorials = createTutorialState();
        state.selectedMap = map.id; state.selectedWorld = worldForMap(map.id).id; state.currentView = 'map'; state.isInTown = false;
        map.drops = [{id:material,amount:[1,2],chance:.5}]; map.itemDrops = [];
        map.spawns = [{id:'allSkillsMob',monsterId:worldContent.monsters[0].id,count,overrides:{health:durable ? 100000 : 500,attackDamage:1,attackInterval:3,accuracy:100,evasion:10,respawnSeconds:2,gold:[1,3],experience:1,drops:[],itemDrops:[]}}];
        resetMonsterStates(map); state.monsterColumns = 8; state.playerHp = getPlayerMaxHealth(); state.combatPaused = false; state.attackTimer = 0;
        resetCombatClock(); clearOfflineRecap();
        let seed = 654321; Math.random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed / 4294967296; };
    }
    function advance(steps, effects = false) {
        advancedSteps = 0;
        try {
            for (let index = 0; index < steps; index++) {
                if (state.combatPaused) break;
                if (index % 250 === 0) combatStatCache = new Map();
                const result = simulateCombatStep(.1, effects);
                advancedSteps++;
                if (effects) {
                    flushCombatEffects(result.effects); renderCombat();
                    visibleArrows += elements.combatPanel.querySelectorAll('.combat-arrow').length;
                    visibleCracks += elements.combatPanel.querySelectorAll('.eruption-chain').length;
                    // This synchronous benchmark has no animation clock. Retire effects
                    // between samples instead of accumulating ten seconds of live SVGs.
                    elements.combatPanel.querySelectorAll('.combat-arrow,.eruption-chain,.eruption-burst,.shield-slam-wave').forEach(effect => effect.remove());
                }
            }
        } finally { combatStatCache = null; }
    }
    function profile() {
        const names = ['getRemainingPoisonDamage','getPoisonDamage','getPoisonTickInterval','tickMonsterBleed','tryApplyBleed','getBleedTickDamage','getBleedChance','getPlayerAccuracy','getEnemyHitChance','getPlayerMaxHealth','getSkillStatFromRanks','getSkillMultiplier','getGearStat','getEruptionTargets','tickPendingEruptions','monsterDefinition','defeatEnemy','shootAbilityArrow','triggerShockwaveSlash'];
        const originals = {}, samples = {};
        try {
            names.forEach(name => { originals[name] = window[name]; samples[name] = {calls:0,ms:0}; window[name] = function (...args) { const start = performance.now(); try { return originals[name].apply(this, args); } finally { samples[name].calls++; samples[name].ms += performance.now() - start; } }; });
            advance(500);
        } finally { names.forEach(name => { window[name] = originals[name]; }); }
        checks.push('PROFILE ' + JSON.stringify(Object.entries(samples).sort((a,b) => b[1].ms - a[1].ms).map(([name,value]) => ({name,calls:value.calls,ms:Math.round(value.ms*100)/100}))));
    }
    try {
        fresh(64);
        check('every allocatable skill node is maxed', skillNodes.every(node => node.start || getSkillNodeRank(node.id) === node.maxRank));
        checks.push('BUILD ' + JSON.stringify({nodes:Object.keys(ranks).length,level:state.level,damage:getDamage(),attackInterval:getAttackSpeed(),multiHit:getMultiHit(),poisonChance:getPoisonChance(),chains:getMaxEruptionChains()}));
        // The extreme multi-hit build can kill itself through stacked eruption
        // costs while Fire caps healing at 30% HP. Stop timing at death so the
        // benchmark never reports idle simulation as fast combat.
        const scenarios = [{count:9,digest:'581e781'},{count:64,digest:'92d1036c'},{count:128,digest:'780148dd'},{count:64,durable:true,digest:'740e4997'},{count:64,durable:true,stress:true,digest:'62beae83'}];
        for (const scenario of scenarios) {
            const times = []; let reference;
            for (let run = 0; run < 4; run++) {
                fresh(scenario.count, scenario.durable, scenario.stress);
                const started = performance.now(); advance(1500); const elapsed = performance.now() - started, current = snapshot();
                if (!run) reference = current; else { check('all-skills ' + JSON.stringify(scenario) + ' repeat ' + run + ' matches', current === reference); times.push(elapsed); }
            }
            check('all-skills fight stays finite and only pauses on death', Number.isFinite(state.playerHp) && state.monsterStates.every(monster => Number.isFinite(monster.hp)) && (!state.combatPaused || state.playerHp === 0));
            if (!scenario.stress) check('sustained benchmark completes all 1500 combat steps', advancedSteps === 1500 && !state.combatPaused);
            check('all-skills outcomes match the expanded-tree combat reference', hash(reference) === scenario.digest);
            checks.push('BENCH ' + JSON.stringify({...scenario,steps:advancedSteps,medianMs:Math.round(median(times)*100)/100,digest:hash(reference),kills:state.kills[map.id],stacks:state.monsterStates.reduce((sum,m) => sum+m.poisonStacks.length,0),pending:state.pendingEruptions.length}));
        }
        fresh(64, true); profile();
        for (const stress of [false, true]) {
            fresh(64, true, stress); render(); advance(20); const noEffects = snapshot();
            fresh(64, true, stress); render(); visibleArrows = 0; visibleCracks = 0;
            const started = performance.now(); advance(20, true);
            checks.push('BENCH ' + JSON.stringify({scenario:'visible-effects',stress,ticks:advancedSteps,totalMs:Math.round((performance.now()-started)*100)/100,arrows:visibleArrows,cracks:visibleCracks}));
            check('visible effects preserve all-skills combat outcomes', snapshot() === noEffects);
            check('arrows and eruption cracks remain visible', visibleArrows > 0 && visibleCracks > 0);
        }
        const card = elements.enemyRoster.firstElementChild, badge = card.querySelector('[data-combat-hit-badge]');
        flushCombatEffects([() => { showMonsterHitBadge(card.dataset.monsterId, 'HIGH', false, 2); showMonsterHitBadge(card.dataset.monsterId, 'LOW', false, 0); }]);
        check('batching retains higher-priority hit notices and restarts animations', badge.textContent === 'HIGH' && badge.classList.contains('is-visible'));
        fresh(9, true); render();
        const first = state.monsterStates[0], last = state.monsterStates[8];
        flushCombatEffects([() => showCombatArrow(null, first.id, 'piercingArrow', 0), () => showEruptionChain(first.id, last.id, 0), () => showPoisonTransfer(first.id, last.id)]);
        const crack = elements.combatPanel.querySelector('.eruption-chain'), frame = crack.getBoundingClientRect();
        const from = elements.enemyRoster.firstElementChild.getBoundingClientRect(), to = elements.enemyRoster.lastElementChild.getBoundingClientRect();
        const path = crack.querySelector('.eruption-crack-core'), start = path.getPointAtLength(0), end = path.getPointAtLength(path.getTotalLength());
        check('batched cracks still join actual plate centers after the roster changes', Math.abs(start.x - (from.left + from.width/2 - frame.left)) < .01 && Math.abs(start.y - (from.top + from.height/2 - frame.top)) < .01 && Math.abs(end.x - (to.left + to.width/2 - frame.left)) < .01 && Math.abs(end.y - (to.top + to.height/2 - frame.top)) < .01);
        check('arrow, eruption and poison overlays share accurate coordinates', [...elements.combatPanel.querySelectorAll('.combat-arrow,.eruption-chain,.poison-transfer')].every(svg => Math.abs(svg.viewBox.baseVal.width - svg.getBoundingClientRect().width) < .01 && Math.abs(svg.viewBox.baseVal.height - svg.getBoundingClientRect().height) < .01));
        combatStatCache = new Map(); combatPoisonForecasts = new WeakMap();
        const interval = getPoisonTickInterval(), poisonDamage = getPoisonDamage();
        first.poisonStacks = [{remainingDuration:5,timeUntilTick:interval}];
        const single = getRemainingPoisonDamage(first);
        Math.random = () => 0; tryApplyPoison(first);
        const doubled = getRemainingPoisonDamage(first);
        check('adding a stack refreshes a cached poison forecast immediately', doubled === single * 2);
        tickMonsterPoison(first, interval);
        check('poison ticks refresh forecasts before execute checks', getRemainingPoisonDamage(first) === doubled - 2 * poisonDamage);
        itemById.testAmulet.stats.poisonDamage = 10; combatStatCache.clear();
        check('changed poison stats invalidate cached forecasts', getRemainingPoisonDamage(first) > doubled);
        combatStatCache = null; combatPoisonForecasts = null;
        check('effect and poison caches are released after each batch', combatAnimationRestarts === null && combatEffectLayout === null && combatPoisonForecasts === null);
        check('no runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    finally { Math.random = originalRandom; itemById.testAmulet.stats = originalStats; combatStatCache = null; combatPoisonForecasts = null; resetCombatClock(); clearOfflineRecap(); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
