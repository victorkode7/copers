(async function() {
    const checks = [], downloads = [], blobs = new Map();
    const $ = id => document.getElementById(id);
    const near = (a, b) => Math.abs(a - b) < 0.000001;
    function check(label, condition) { checks.push((condition ? 'PASS ' : 'FAIL ') + label); if (!condition) throw new Error(label); }
    const originalUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = originalUrl(blob); blobs.set(url, blob); return url; };
    HTMLAnchorElement.prototype.click = function() { downloads.push(blobs.get(this.href)); };
    async function until(predicate) {
        for (let i = 0; i < 80; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 20)); }
        throw new Error('Timed out waiting for skill import.');
    }
    try {
        document.querySelector('[data-node-id="quickHands"]').click();
        const row = $('statBonusRows').querySelector('.stat-bonus-row');
        check('skill editor displays canonical speed multiplier', row && near(Number(row.querySelector('input').value), 1 / 0.99));
        $('exportJson').click(); const exported = JSON.parse(await downloads.at(-1).text());
        check('skill export declares speed stat schema', exported.statSchemaVersion === 2);
        check('skill export contains only one speed multiplier type', exported.nodes.every(node => !Object.hasOwn(node.stats, 'attackSpeedRateMultiplier')));
        const legacy = {experienceBase: 100, experiencePerLevel: 100, nodes: [
            {id: 'origin', name: 'Start', start: true, maxRank: 0, requires: [], column: 0, row: 0, stats: {}},
            {id: 'oldSpeed', name: 'Old Speed', maxRank: 1, requires: ['origin'], column: 1, row: 0, stats: {attackSpeedMultiplier: 0.8, attackSpeedRateMultiplier: 1.2}}
        ]};
        const transfer = new DataTransfer(); transfer.items.add(new File([JSON.stringify(legacy)], 'legacy.json', {type: 'application/json'}));
        $('importFile').files = transfer.files; $('importFile').dispatchEvent(new Event('change'));
        await until(() => Boolean(document.querySelector('[data-node-id="oldSpeed"]')));
        document.querySelector('[data-node-id="oldSpeed"]').click();
        check('legacy skill import combines old speed representations', near(Number($('statBonusRows').querySelector('input').value), 1.5));
        $('exportJson').click(); const converted = JSON.parse(await downloads.at(-1).text());
        check('legacy skill re-export retains converted schema', converted.statSchemaVersion === 2 && near(converted.nodes[1].stats.attackSpeedMultiplier, 1.5));
        check('no skill editor runtime errors', !window.smokeErrors.length);
    } catch (error) { checks.push('ERROR ' + error.message + '\n' + error.stack); }
    const output = document.createElement('pre'); output.id = 'smoke-results';
    output.textContent = checks.join('\n') + '\n' + (checks.some(line => /^(FAIL|ERROR)/.test(line)) ? 'SMOKE FAILED' : 'SMOKE PASSED');
    document.body.append(output);
})();
