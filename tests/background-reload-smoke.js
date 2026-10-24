(async function () {
    const checks = [];
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const phaseKey = 'backgroundReloadSmoke';
    try {
        const phase = sessionStorage.getItem(phaseKey);
        if (!phase) {
            // Use real seed content and a real page reload so startup must load
            // the timestamp and process the gap before the test can inspect it.
            state.monsterStates[0].hp = 1;
            state.attackTimer = .2;
            state.combatPaused = false;
            state.playerHp = getPlayerMaxHealth();
            lastSimulatedAt = Date.now() - 10000;
            saveGame();
            sessionStorage.setItem(phaseKey, 'catchup');
            location.reload();
            return;
        }
        for (let attempt = 0; pendingCombatSeconds + 1e-8 >= gameTickSeconds && attempt < 100; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        check('startup finishes offline catch-up', pendingCombatSeconds < gameTickSeconds);
        if (phase === 'catchup') {
            check('a reloaded page awards the missed combat rewards', state.kills[currentMap().id] >= 1 && state.gold > 0 && state.materials.gel > 0 && state.experience > 0);
            check('reopening shows a recap of the credited rewards', document.getElementById('offlineRecap').open && offlineRecapReport.gold === state.gold && offlineRecapReport.experience === state.experience && offlineRecapReport.materials.find(drop => drop.id === 'gel').amount === state.materials.gel);
            document.getElementById('offlineRecapContinue').click();
            saveGame();
            sessionStorage.setItem(phaseKey, JSON.stringify({kills: state.kills[currentMap().id], gold: state.gold, gel: state.materials.gel}));
            location.reload();
            return;
        }
        const previous = JSON.parse(phase);
        check('another reload does not repeat the already credited absence', state.kills[currentMap().id] === previous.kills && state.gold === previous.gold && state.materials.gel === previous.gel);
        check('a dismissed recap stays dismissed across a quick reload', !document.getElementById('offlineRecap').open && !pendingOfflineRecap);
        check('game controls are available after startup catch-up', !document.querySelector('main').inert && document.getElementById('combatCatchupNotice').hidden);
        check('no runtime errors', !window.smokeErrors.length);
        sessionStorage.removeItem(phaseKey);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
