(function () {
    const checks = [];
    function check(label, condition) {
        checks.push((condition ? 'PASS ' : 'FAIL ') + label);
        if (!condition) throw new Error(label);
    }
    function visit(mapId) {
        const map = mapData.find(entry => entry.id === mapId);
        state.selectedMap = mapId;
        state.selectedWorld = worldForMap(mapId).id;
        state.currentView = 'map';
        resetMonsterStates(map);
        render();
        const definitions = monsterDefinitions(map);
        const cards = [...elements.enemyRoster.querySelectorAll('.enemy-card')];
        check(mapId + ' shows current monster sprites and names', cards.length === definitions.length &&
            cards.every((card, index) =>
                card.querySelector('.enemy-mark img')?.getAttribute('src') === definitions[index].sprite &&
                card.querySelector('[data-enemy-name]').textContent === definitions[index].name &&
                card.querySelector('.health-track').getAttribute('aria-label') === definitions[index].name + ' health'));
        const image = cards[0].querySelector('.enemy-mark img');
        renderCombat(); renderCombat();
        check(mapId + ' keeps the image between combat ticks', cards[0].querySelector('.enemy-mark img') === image);
    }
    try {
        // All three maps have one spawn named "main", but different monsters.
        ['greenfields', 'verdantWarden', 'greenfields', 'brineAndPunishment',
            'verdantWarden', 'whisperingWoods', 'greenfields'].forEach(visit);
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre');
    report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
