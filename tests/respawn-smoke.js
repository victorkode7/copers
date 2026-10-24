(function () {
    const checks = [];
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const near = (a, b) => Math.abs(a - b) < 0.000001;
    const priorRandom = Math.random;
    const tick = () => {
        const result = simulateCombatStep(gameTickSeconds, true);
        result.effects.forEach(effect => effect());
        if (result.needsRender) render(); else renderCombat();
    };
    try {
        const map = currentMap(), monsterId = worldContent.monsters[0].id;
        map.drops = []; map.itemDrops = [];
        map.spawns = [
            {id: 'quickRespawn', monsterId, count: 1, overrides: {health: 20, respawnSeconds: 0.25, attackInterval: 0.1, attackDamage: 2, gold: [0, 0], experience: 0, drops: [], itemDrops: []}},
            {id: 'slowRespawn', monsterId, count: 1, overrides: {health: 30, respawnSeconds: 0.45, attackInterval: 0.1, attackDamage: 3, gold: [0, 0], experience: 0, drops: [], itemDrops: []}}
        ];
        resetMonsterStates(map); state.currentView = 'map'; state.playerHp = 0; state.combatPaused = true; state.attackTimer = 0;
        let [quick, slow] = state.monsterStates;
        quick.hp = slow.hp = 0; quick.respawnRemaining = 0.25; slow.respawnRemaining = 0.45;
        quick.attackTimer = slow.attackTimer = 0.07; render();
        const gold = state.gold, xp = state.experience, kills = state.kills[map.id];
        tick();
        check('each monster’s respawn timer counts down while the player is dead', near(quick.respawnRemaining, 0.15) && near(slow.respawnRemaining, 0.35) && quick.hp === 0 && slow.hp === 0);
        check('dead-player countdown updates the plate and legacy state', !document.querySelector('[data-monster-id="quickRespawn"] [data-enemy-respawn]').hidden && near(state.enemyRespawnRemaining, 0.15));
        saveGame();
        check('dead-player countdowns survive saving and loading', loadGame() && state.combatPaused && state.playerHp === 0 && near(state.monsterStates[0].respawnRemaining, 0.15));
        [quick, slow] = state.monsterStates;
        tick(); tick();
        check('monsters respawn at their individual deadlines', quick.hp === 20 && quick.respawnRemaining === 0 && near(slow.respawnRemaining, 0.15) && slow.hp === 0);
        check('respawning restores the target and clears its countdown display', activeMonster()?.id === quick.id && document.querySelector('[data-monster-id="quickRespawn"] [data-enemy-respawn]').hidden);
        tick(); tick();
        check('remaining monsters also respawn while the player stays dead', slow.hp === 30 && slow.respawnRemaining === 0 && state.combatPaused && state.playerHp === 0);
        check('respawned monsters do not bank attacks or auto-revive the player', quick.attackTimer === 0 && slow.attackTimer === 0 && state.attackTimer === 0 && elements.combatStatusLabel.textContent === 'Dead' && !elements.resumeCombat.hidden);
        check('waiting for respawns does not award extra rewards or kills', state.gold === gold && state.experience === xp && state.kills[map.id] === kills);
        quick.hp = 1; quick.poisonStacks = [{remainingDuration: 5, timeUntilTick: 0.05}];
        tick();
        check('existing poison still ticks while dead and starts a new respawn timer', quick.hp === 0 && near(quick.respawnRemaining, 0.25) && state.kills[map.id] === kills + 1);
        tick(); tick(); tick();
        check('poison-killed monsters also respawn while the player is dead', quick.hp === 20 && quick.respawnRemaining === 0 && state.playerHp === 0);
        elements.resumeCombat.click(); Math.random = () => 0;
        const hp = state.playerHp; tick();
        check('normal combat resumes after the player revives', !state.combatPaused && state.playerHp === hp - 5);
        check('no runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    Math.random = priorRandom;
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
