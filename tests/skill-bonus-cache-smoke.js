(function () {
    const checks = [];
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const near = (a, b) => Math.abs(a - b) < 1e-9;
    const original = {scan: getSkillStatFromRanks, confirm: window.confirm};
    const id = 'cacheTestSkill';
    function matchesReference() {
        const keys = new Set(Object.values(skillNodeById).flatMap(node => Object.keys(node.stats || {})));
        return [...keys].every(key => near(getSkillStat(key), original.scan(key, state.skillRanks)));
    }
    try {
        skillNodeById[id] = {id, stats: {damage: 5, damageMultiplier: 1.2, attackSpeedPerLevel: .01}};
        state.skillRanks = {[id]: 1}; state.level = 2; combatStatCache = null;
        let scans = 0;
        getSkillStatFromRanks = (...args) => { scans++; return original.scan(...args); };
        check('flat bonuses retain their original values', getSkillStat('damage') === 5);
        for (let tick = 0; tick < 100; tick++) { combatStatCache = new Map(); getSkillStat('damage'); getSkillMultiplier('damageMultiplier'); }
        check('unchanged bonuses survive combat cache resets without rescanning ranks', scans === 1 && near(getSkillMultiplier('damageMultiplier'), 1.2));
        check('level-based speed is initially correct', near(getSkillMultiplier('attackSpeedMultiplier'), Math.pow(1.01, 2)));
        state.level = 3;
        check('level changes refresh level-based speed immediately', near(getSkillMultiplier('attackSpeedMultiplier'), Math.pow(1.01, 3)));
        state.skillRanks = {[id]: 2};
        check('replacing an allocation refreshes both flat and multiplier bonuses', getSkillStat('damage') === 10 && near(getSkillMultiplier('damageMultiplier'), 1.44));
        combatStatCache = null; state.gear = createEmptyGear(); state.skillRanks = {};
        state.currentView = 'upgrades'; state.skillPoints = 5; state.level = 5; pendingSkillRanks = {}; refundMode = false;
        render();
        const button = elements.upgrades.querySelector('.skill-node.is-available:not(.is-origin)');
        const nodeId = button.dataset.skillNode;
        // Prime every stat, including the node we are about to purchase.
        for (const key of Object.keys(skillNodeById[nodeId].stats)) getSkillStat(key);
        button.click(); document.getElementById('confirmSkillSelection').click();
        check('confirming an in-place allocation refreshes cached bonuses', state.skillRanks[nodeId] === 1 && matchesReference());
        document.getElementById('refundSkillPoints').click(); button.click();
        check('refunding refreshes cached bonuses', !state.skillRanks[nodeId] && getSkillStat('damage') === 0 && matchesReference());
        document.getElementById('refundSkillPoints').click(); button.click(); document.getElementById('confirmSkillSelection').click();
        window.confirm = () => true; document.getElementById('resetSkillTree').click();
        check('resetting the tree clears cached bonuses', !Object.keys(state.skillRanks).length && getSkillStat('damage') === 0);
        state.skillRanks = {[id]: 1}; state.gear = createEmptyGear(); combatStatCache = null;
        state.furyStacks = 0; const damage = getDamage(); state.furyStacks = 3;
        check('temporary Fury remains dynamic while skill bonuses are cached', getDamage() > damage && getSkillStat('damage') === 5);
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    finally { getSkillStatFromRanks = original.scan; window.confirm = original.confirm; delete skillNodeById[id]; combatStatCache = null; invalidateSkillBonusCache(); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
