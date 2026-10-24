(async function () {
    const $ = id => document.getElementById(id);
    const savedPhase = JSON.parse(sessionStorage.getItem('materialEditorSmokePhase') || 'null');
    const checks = savedPhase?.checks || [];
    function check(label, condition) { checks.push((condition ? 'PASS ' : 'FAIL ') + label); if (!condition) throw new Error(label); }
    const draft = () => JSON.parse(localStorage.getItem('idleAdventureItemEditorDraft'));
    function input(id, value) { $(id).value = value; $(id).dispatchEvent(new Event('input', {bubbles: true})); }
    function fileInput(id, file) { const transfer = new DataTransfer(); transfer.items.add(file); $(id).files = transfer.files; $(id).dispatchEvent(new Event('change')); }
    async function until(test) { for (let i = 0; i < 150; i++) { if (test()) return; await new Promise(resolve => setTimeout(resolve, 20)); } throw new Error('Timed out: ' + $('status').textContent); }
    const blobs = new Map(), downloads = [], originalUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = originalUrl(blob); blobs.set(url, blob); return url; };
    HTMLAnchorElement.prototype.click = function () { downloads.push({name: this.download, blob: blobs.get(this.href)}); };
    try {
        if (savedPhase) {
            check('material selection and search survive reload', $('materialId').value === savedPhase.id && $('search').value === 'luminous');
            await until(() => $('preview').querySelector('img')?.src.startsWith('blob:'));
            check('material artwork and description restore from browser storage', $('materialDescription').value === 'Fine luminous dust.' && $('materialSprite').value === savedPhase.path);
            const encoded = document.createElement('pre'); encoded.id = 'archive-results'; encoded.hidden = true; encoded.textContent = savedPhase.archive; document.body.append(encoded);
            sessionStorage.removeItem('materialEditorSmokePhase');
        } else {
        const originalCount = Object.keys(window.adventureItems.materials).length;
        check('all existing materials load', $('materialList').querySelectorAll('button').length === originalCount);
        const originalId = $('materialId').value;
        input('materialName', 'Renamed Material');
        check('renaming preserves the material ID and equipment catalogue', $('materialId').value === originalId && draft().materials[originalId] === 'Renamed Material' && JSON.stringify(draft().items) === JSON.stringify(window.adventureItems.items));
        $('deleteMaterial').click();
        check('materials referenced by drops or recipes cannot be deleted', $('status').textContent.startsWith('Remove this material') && Object.hasOwn(draft().materials, originalId));
        $('addMaterial').click(); const id = $('materialId').value;
        input('materialName', 'Moon Dust'); input('materialDescription', 'Fine luminous dust.');
        check('new materials get stable IDs and metadata', id !== originalId && draft().materialDetails[id].description === 'Fine luminous dust.');
        input('materialSprite', '../bad.png');
        check('unsafe image paths block export', $('exportGame').disabled);
        input('materialSprite', '');
        check('clearing an invalid path restores export', !$('exportGame').disabled);
        $('duplicateMaterial').click(); const duplicate = $('materialId').value;
        check('duplicate has its own identity', duplicate !== id && draft().materials[duplicate] === 'Moon Dust Copy');
        $('deleteMaterial').click(); check('unused materials can be deleted', !Object.hasOwn(draft().materials, duplicate));
        $('undo').click(); check('undo restores deleted material and selection', draft().materials[duplicate] === 'Moon Dust Copy' && $('materialId').value === duplicate);
        document.querySelector('[data-material-id="' + id + '"]').click();
        const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='), character => character.charCodeAt(0));
        fileInput('importSprite', new File([png], 'dust.png', {type: 'image/png'}));
        await until(() => $('status').textContent.startsWith('Sprite imported.'));
        const path = $('materialSprite').value;
        check('imported material sprite previews and persists', path.startsWith('assets/materials/') && $('preview').querySelector('img').src.startsWith('blob:') && draft().materialDetails[id].sprite === path);
        $('exportJson').click(); const json = JSON.parse(await downloads.at(-1).blob.text());
        check('JSON keeps materials, equipment, and valid recipe references', json.materials[id] === 'Moon Dust' && json.items.length === window.adventureItems.items.length && Equipment.validate(json).length === 0);
        $('exportGame').click(); await until(() => downloads.some(file => file.name === 'materials.zip'));
        const bytes = new Uint8Array(await downloads.find(file => file.name === 'materials.zip').blob.arrayBuffer());
        const view = new DataView(bytes.buffer), entries = []; let offset = 0;
        while (view.getUint32(offset, true) === 0x04034b50) {
            const length = view.getUint32(offset + 18, true), nameLength = view.getUint16(offset + 26, true);
            const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength));
            const contents = bytes.slice(offset + 30 + nameLength, offset + 30 + nameLength + length);
            check('ZIP CRC matches ' + name, ItemPackage.crc32(contents) === view.getUint32(offset + 14, true));
            entries.push(name); offset += 30 + nameLength + length;
        }
        check('package includes complete catalogue and imported material sprite', entries.length === 2 && entries.includes('js/items.js') && entries.includes(path));
        const encoded = document.createElement('pre'); encoded.id = 'archive-results'; encoded.hidden = true; encoded.textContent = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')); document.body.append(encoded);
        const invalid = JSON.parse(JSON.stringify(json)); invalid.materials[id] = '';
        fileInput('importJson', new File([JSON.stringify(invalid)], 'bad.json', {type: 'application/json'}));
        await until(() => $('status').textContent.startsWith('Could not import JSON'));
        check('invalid imports leave the draft intact', draft().materials[id] === 'Moon Dust');
        fileInput('importJson', new File([JSON.stringify(json)], 'items.json', {type: 'application/json'}));
        await until(() => $('status').textContent === 'Item and material catalogue imported.');
        check('valid JSON imports keep material sprites', draft().materialDetails[id].sprite === path);
        input('search', 'luminous'); check('search includes descriptions', $('materialList').querySelectorAll('button').length === 2);
        document.querySelector('[data-material-id="' + id + '"]').click();
        sessionStorage.setItem('materialEditorSmokePhase', JSON.stringify({checks, id, path, archive: encoded.textContent}));
        location.reload(); return;
        }
        check('no editor runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
