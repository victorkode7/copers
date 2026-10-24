(function () {
    const checks = [];
    function check(label, condition) { checks.push((condition ? 'PASS ' : 'FAIL ') + label); if (!condition) throw new Error(label); }
    function bounds() {
        const art = elements.combatArt.getBoundingClientRect(), panel = elements.combatPanel.getBoundingClientRect();
        return {x: art.left - panel.left, y: art.top - panel.top, width: art.width, height: art.height};
    }
    const same = (a, b) => Object.keys(a).every(key => Math.abs(a[key] - b[key]) < 0.15);
    try {
        state.currentView = 'map'; state.combatPaused = false;
        const map = currentMap(), monsterId = worldContent.monsters[0].id;
        map.spawns = [{id: 'layoutMonster', monsterId, count: 1, overrides: {sprite: 'tests/fixtures/equipment-sprite.svg'}}];
        resetMonsterStates(map); render();
        const alive = bounds(), src = elements.combatArt.getAttribute('src');
        const monster = state.monsterStates[0];
        monster.hp = 0; monster.respawnRemaining = 5; renderCombat();
        const dead = bounds();
        checks.push('Artwork bounds alive: ' + JSON.stringify(alive) + '; waiting: ' + JSON.stringify(dead));
        check('large artwork stays fixed while waiting for respawn', same(alive, dead));
        monster.hp = monsterDefinition(monster).health; monster.respawnRemaining = 0; renderCombat();
        check('large artwork stays fixed when the monster respawns', same(alive, bounds()));
        check('respawning keeps the same sprite source', elements.combatArt.getAttribute('src') === src);
        state.playerHp = 0; state.combatPaused = true; renderCombat();
        check('revive controls do not move or resize artwork', same(alive, bounds()));
        check('no runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
