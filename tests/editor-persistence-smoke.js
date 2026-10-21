(async function() {
    const state = location.hash ? JSON.parse(decodeURIComponent(location.hash.slice(1))) : {phase: 'itemEdit', checks: []};
    const checks = state.checks;
    document.body.dataset.testPhase = state.phase;
    const $ = id => document.getElementById(id);
    function check(label, condition) { checks.push((condition ? 'PASS ' : 'FAIL ') + label); if (!condition) throw new Error(label); }
    function input(id, value) { $(id).value = value; $(id).dispatchEvent(new Event('input', {bubbles: true})); }
    function change(id, value) { $(id).value = value; $(id).dispatchEvent(new Event('change', {bubbles: true})); }
    function go(page, phase) {
        check('no runtime errors in ' + state.phase, !window.smokeErrors.length);
        location.href = page + '#' + encodeURIComponent(JSON.stringify({phase, checks}));
    }
    async function until(predicate) {
        for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 20)); }
        throw new Error('Timed out in ' + state.phase);
    }
    try {
        if (state.phase === 'itemEdit') {
            $('addItem').click(); input('itemName', 'Persisted Gear'); change('itemSlot', 'necklace');
            $('addStat').click();
            const amount = $('statRows').querySelector('input'); amount.value = '17'; amount.dispatchEvent(new Event('input', {bubbles: true}));
            input('search', 'Persisted'); change('filterSlot', 'necklace');
            const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='), c => c.charCodeAt(0));
            const transfer = new DataTransfer(); transfer.items.add(new File([png], 'persist.png', {type: 'image/png'}));
            $('importSprite').files = transfer.files; $('importSprite').dispatchEvent(new Event('change'));
            await until(() => $('status').textContent.startsWith('Sprite imported'));
            // Wait for the image transaction before deliberately unloading this document.
            const request = indexedDB.open('idleAdventureItemSprites', 1);
            const db = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = reject; });
            const path = $('itemSprite').value;
            const transaction = db.transaction('sprites', 'readonly');
            const read = transaction.objectStore('sprites').get(path);
            const blob = await new Promise((resolve, reject) => { read.onsuccess = () => resolve(read.result); read.onerror = reject; });
            check('sprite persisted before leaving item editor', blob instanceof Blob); db.close();
            go('.skill-editor-smoke.html', 'skillEdit'); return;
        }
        if (state.phase === 'skillEdit') {
            document.querySelector('[data-node-id="quickHands"]').click();
            input('nodeName', 'Saved skill name'); input('zoomRange', '125'); input('nodeSearch', 'Saved skill');
            document.querySelector('[data-view-mode="player"]').click();
            input('nodeStats', '{'); // Incomplete JSON must survive even though it cannot be applied yet.
            go('.equipment-smoke.html', 'itemReturn'); return;
        }
        if (state.phase === 'itemReturn') {
            check('item selection and name resume automatically', $('itemName').value === 'Persisted Gear');
            check('item numerical edits survive page switch', $('statRows').querySelector('input').value === '17');
            check('item filters survive page switch', $('search').value === 'Persisted' && $('filterSlot').value === 'necklace');
            await until(() => $('preview').querySelector('img')?.src.startsWith('blob:'));
            check('imported sprite reloads from browser storage', $('preview').querySelector('img').src.startsWith('blob:'));
            input('itemName', 'Updated after return');
            go('.skill-editor-smoke.html', 'skillReturn'); return;
        }
        if (state.phase === 'skillReturn') {
            check('skill selection and edits resume automatically', $('nodeName').value === 'Saved skill name');
            check('unfinished skill JSON survives navigation', $('nodeStats').value === '{');
            check('skill search and zoom resume', $('nodeSearch').value === 'Saved skill' && $('zoomRange').value === '125');
            check('skill preview mode resumes', document.querySelector('[data-view-mode="player"]').getAttribute('aria-pressed') === 'true');
            await new Promise(resolve => setTimeout(resolve, 150));
            window.dispatchEvent(new Event('focus'));
            check('repainting does not discard unfinished fields', $('nodeStats').value === '{');
            check('saved skill data remains independent of unfinished JSON', JSON.parse(localStorage.getItem('idleAdventureSkillEditorDraft')).tree.nodes.find(node => node.id === 'quickHands').name === 'Saved skill name');
            go('.equipment-smoke.html', 'itemFinal'); return;
        }
        check('further edits survive another round trip', $('itemName').value === 'Updated after return');
        check('no final runtime errors', !window.smokeErrors.length);
    } catch (error) { checks.push('ERROR ' + error.message + '\n' + error.stack); }
    const output = document.createElement('pre'); output.id = 'smoke-results';
    output.textContent = checks.join('\n') + '\n' + (checks.some(line => /^(FAIL|ERROR)/.test(line)) ? 'SMOKE FAILED' : 'SMOKE PASSED');
    document.body.append(output);
})();
