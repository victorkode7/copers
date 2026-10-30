(function () {
    const checks = [];
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const near = (a, b) => Math.abs(a - b) < .01;
    const rect = element => element.getBoundingClientRect();
    function segment(bar, track, start, size) {
        const a = rect(bar), b = rect(track);
        return near(a.left, b.left + b.width * start / 100) && near(a.width, b.width * size / 100);
    }
    try {
        state.currentView = 'map'; state.isInTown = false; state.combatPaused = false;
        state.skillRanks = {}; state.gear = createEmptyGear();
        state.upgrades = {strength: 0, haste: 0, evasion: 0};
        const map = currentMap();
        map.spawns = [{id: 'barTest', monsterId: worldContent.monsters[0].id, count: 1, overrides: {health: 200}}];
        resetMonsterStates(map); state.playerHp = 100; render();
        const enemy = state.monsterStates[0], card = elements.enemyRoster.firstElementChild;
        const track = card.querySelector('.health-track'), health = card.querySelector('.health-fill');
        const poison = card.querySelector('.enemy-health-poison-damage:not(.enemy-health-bleed-damage)');
        const bleed = card.querySelector('.enemy-health-bleed-damage');
        const damage = card.querySelector('.enemy-health-damage');
        check('health and forecast transitions use transforms with original timing', [health, poison, bleed, elements.playerHealthBar].every(bar => getComputedStyle(bar).transitionProperty === 'transform' && getComputedStyle(bar).transitionDuration === '0.15s'));
        check('damage fade timing is preserved', getComputedStyle(damage).transitionDuration === '0.3s' && getComputedStyle(elements.playerHealthDamage).transitionDuration === '0.7s');
        for (const bar of [health, poison, bleed, damage, elements.playerHealthBar, elements.playerHealthDamage]) bar.style.transition = 'none';
        for (const percent of [100, 60, 30.3, .25, 0]) {
            state.playerHp = percent; enemy.hp = percent * 2; renderCombat();
            check('player and enemy fill correctly at ' + percent + '%', segment(health, track, 0, percent) && segment(elements.playerHealthBar, elements.playerHealthTrack, 0, percent));
            check('health accessibility values remain correct at ' + percent + '%', track.getAttribute('aria-valuenow') === String(Math.round(percent)) && elements.playerHealthTrack.getAttribute('aria-valuenow') === String(Math.round(percent)));
        }
        state.playerHp = 80; enemy.hp = 150;
        applyDamageToPlayer(20); applyDamageToMonster(enemy, 20); renderCombat();
        check('player damage occupies the lost health segment', segment(elements.playerHealthDamage, elements.playerHealthTrack, 60, 20));
        check('enemy damage occupies the lost health segment', segment(damage, track, 65, 10));
        check('damage segments retain visible hit feedback', damage.classList.contains('is-visible') && elements.playerHealthDamage.classList.contains('is-visible'));
        enemy.poisonStacks = [{remainingDuration: 5, timeUntilTick: 1}];
        enemy.bleed = {stacks: 1, baseDamagePerTick: 3, remainingDuration: 5, timeUntilTick: 1};
        renderCombat();
        const hp = enemy.hp / 2, poisonPercent = Math.min(enemy.hp, getRemainingPoisonDamage(enemy)) / 2;
        const bleedPercent = Math.min(enemy.hp - poisonPercent * 2, getRemainingBleedDamage(enemy)) / 2;
        check('poison and bleed segments retain their forecast sizes and positions', poisonPercent > 0 && bleedPercent > 0 && segment(poison, track, hp - poisonPercent, poisonPercent) && segment(bleed, track, hp - poisonPercent - bleedPercent, bleedPercent));
        const observer = new MutationObserver(() => {});
        observer.observe(track, {subtree: true, attributes: true, attributeOldValue: true});
        observer.observe(elements.playerHealthBar, {attributes: true});
        renderCombat(); renderCombat();
        check('unchanged bars do not rewrite their styles', !observer.takeRecords().some(record => record.attributeName === 'style'));
        observer.disconnect();
        clearEnemyDamageIndicator();
        check('clearing forecasts empties both segments', segment(poison, track, 0, 0) && segment(bleed, track, 0, 0));
        check('bars have no inline width or offset updates', [health, poison, bleed, damage, elements.playerHealthBar, elements.playerHealthDamage].every(bar => !bar.style.width && !bar.style.left));
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
