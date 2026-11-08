(function () {
    const checks = [];
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    try {
        const lootBefore = JSON.stringify(state.lastLoot);
        const goldBefore = state.gold;
        const materialsBefore = JSON.stringify(state.materials);
        state.currentView = 'map';
        render();
        check('latest loot panel is removed', !document.querySelector('#lastDrop, .loot-notice'));
        check('saved loot data remains normalized', normalizeLootNotice(state.lastLoot) === null ||
            JSON.stringify(normalizeLootNotice(state.lastLoot)) === lootBefore);
        renderCombat();
        check('combat rendering preserves loot and rewards', JSON.stringify(state.lastLoot) === lootBefore &&
            state.gold === goldBefore && JSON.stringify(state.materials) === materialsBefore);
        check('combat renders without a latest-loot panel', !document.querySelector('#lastDrop, .loot-notice'));
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
