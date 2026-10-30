(async function () {
    const checks = [], originalStats = itemById.testAmulet.stats;
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const bounds = element => element.getBoundingClientRect();
    const sameBounds = (a, b) => ['left', 'top', 'width', 'height'].every(key => Math.abs(a[key] - b[key]) < .1);
    try {
        await document.fonts.ready;
        combatStatCache = null; clearFury(); clearOfflineRecap();
        state.skillRanks = {}; state.upgrades = {strength:0,haste:0,evasion:0};
        state.gear = createEmptyGear(); state.gear.necklace = 'testAmulet';
        state.currentView = 'map'; state.isInTown = false; state.combatPaused = false;
        itemById.testAmulet.stats = {health:999900};
        state.playerHp = getPlayerMaxHealth(); render();
        const track = elements.playerHealthTrack, baseline = bounds(track);
        const rosterTop = bounds(elements.enemyRoster).top;
        let stationary = true, wholeNumbers = true;
        for (const hp of [999999, 10000.75, 1000.1, 999.9, 100, 99.5, 9.9, 1, .25, 0]) {
            state.playerHp = hp; renderCombat();
            stationary &&= sameBounds(baseline, bounds(track)) && Math.abs(bounds(elements.enemyRoster).top - rosterTop) < .1;
            wholeNumbers &&= /^(?:<1|\d+) \/ \d+ HP$/.test(elements.playerHealthText.textContent);
        }
        check('HP digit changes leave the player health track and roster stationary', stationary);
        check('the health label displays only whole numbers', wholeNumbers);
        itemById.testAmulet.stats.health = 0; state.playerHp = 100; renderCombat();
        check('changing maximum HP does not resize or move the health track', sameBounds(baseline, bounds(track)));
        state.playerHp = .25; renderCombat();
        check('a living player below one HP is distinguished from zero HP without decimals', elements.playerHealthText.textContent === '<1 / 100 HP');
        state.playerHp = 30.3; renderCombat();
        elements.playerHealthBar.style.transition = 'none';
        check('display rounding preserves fractional combat health and bar fill', state.playerHp === 30.3 && elements.playerHealthText.textContent === '30 / 100 HP' && Math.abs(bounds(elements.playerHealthBar).width / bounds(track).width - .303) < 1e-6);
        const text = bounds(elements.playerHealthText), heading = bounds(elements.playerHealthText.parentElement);
        check('the health label fits within its heading without overlapping the track', text.right <= heading.right + .1 && text.bottom <= bounds(track).top);
        const beforeDamage = bounds(track);
        track.classList.add('is-damaged');
        const animations = track.getAnimations();
        check('taking damage retains visual feedback', animations.length > 0);
        let noMovement = true;
        for (const animation of animations) {
            animation.pause();
            const duration = animation.effect.getTiming().duration;
            for (const progress of [.1, .35, .65, .95]) {
                animation.currentTime = duration * progress;
                noMovement &&= sameBounds(beforeDamage, bounds(track));
            }
            animation.cancel();
        }
        check('the damage animation keeps the health track in place throughout the hit', noMovement);
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    finally { itemById.testAmulet.stats = originalStats; combatStatCache = null; resetCombatClock(); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
