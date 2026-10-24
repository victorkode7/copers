(function () {
    const checks = [];
    function check(label, condition) { checks.push((condition ? 'PASS ' : 'FAIL ') + label); if (!condition) throw new Error(label); }
    const size = () => ({width: elements.combatPanel.offsetWidth, height: elements.combatPanel.offsetHeight});
    const same = (a, b) => a.width === b.width && a.height === b.height;
    try {
        state.currentView = 'map';
        const map = currentMap(), monsterId = worldContent.monsters[0].id;
        for (const count of [1, 3, 9]) {
            state.combatPaused = false; state.playerHp = getPlayerMaxHealth(); state.kills[map.id] = 0;
            map.spawns = [{id: 'stableLayout' + count, monsterId, count, overrides: {health: 12345, respawnSeconds: 10}}];
            resetMonsterStates(map); render();
            const alive = size(), monsters = state.monsterStates;
            const background = getComputedStyle(elements.combatPanel).backgroundImage;
            monsters[0].hp = 0; monsters[0].respawnRemaining = 10;
            if (count > 1) state.targetMonsterId = monsters[1].id;
            renderCombat();
            check(count + ' monsters: a death and target change keep the panel size', same(alive, size()));
            monsters.forEach(monster => { monster.hp = 0; monster.respawnRemaining = 9.9; }); renderCombat();
            check(count + ' monsters: all respawning keeps the panel size', same(alive, size()));
            monsters.forEach(monster => { monster.hp = 1; monster.respawnRemaining = 0; monster.poisonStacks = [{remainingDuration: 4, timeUntilTick: 1}]; });
            renderCombat();
            monsters.forEach(monster => { showMonsterHitBadge(monster.id, 'MULTI-HIT', true); showMonsterProc(monster.id, 'SHOCKWAVE HIT · BLOOMING FLOWER'); });
            check(count + ' monsters: multihit, poison, and proc notices keep the panel size', same(alive, size()));
            state.combatPaused = true; state.playerHp = 0; state.kills[map.id] = map.goal; renderCombat();
            check(count + ' monsters: revive controls and a cleared goal keep the panel size', same(alive, size()));
            check(count + ' monsters: background fitting area stays unchanged', getComputedStyle(elements.combatPanel).backgroundImage === background && same(alive, size()));
        }
        check('no runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
