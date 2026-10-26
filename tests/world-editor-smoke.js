(async function () {
    const $ = id => document.getElementById(id);
    const phaseKey = 'worldEditorSmokePhase';
    const savedPhase = JSON.parse(localStorage.getItem(phaseKey) || 'null');
    const checks = savedPhase?.checks || [];
    function check(label, condition) { checks.push((condition ? 'PASS ' : 'FAIL ') + label); if (!condition) throw new Error(label); }
    const draft = () => JSON.parse(localStorage.getItem('idleAdventureWorldEditorDraft'));
    function input(node, value) { node.value = value; node.dispatchEvent(new Event('input', {bubbles: true})); }
    function select(node, value) { node.value = value; node.dispatchEvent(new Event('change', {bubbles: true})); }
    function tab(kind) { document.querySelector('[data-kind="' + kind + '"]').click(); }
    async function until(predicate) {
        for (let i = 0; i < 150; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 20)); }
        throw new Error('Timed out: ' + $('status').textContent + ' ' + $('assetStatus').textContent);
    }
    function fileInput(node, file) { const transfer = new DataTransfer(); transfer.items.add(file); node.files = transfer.files; node.dispatchEvent(new Event('change', {bubbles: true})); }
    const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='), char => char.charCodeAt(0));
    const blobs = new Map(), downloads = [];
    const originalUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = originalUrl(blob); blobs.set(url, blob); return url; };
    HTMLAnchorElement.prototype.click = function () { downloads.push({name: this.download, blob: blobs.get(this.href)}); };
    let archiveBase64 = savedPhase?.archive;
    try {
        if (savedPhase) {
            check('selected monster and search resume after reload', $('entryId').value === savedPhase.monsterId && $('entryName').value === 'Test Blob' && $('search').value === 'Test');
            check('monster numerical edits survive reload', $('monster-health').value === '77');
            check('monster damage elements survive reload', $('monster-element').value === 'fire');
            await until(() => document.querySelector('.image-choice img')?.src.startsWith('blob:'));
            check('imported sprites return from browser storage', document.querySelector('.image-choice img').src.startsWith('blob:'));
            check('world background image also persists', draft().assets.some(asset => asset.kind === 'background' && asset.path.includes('area-')));
            localStorage.removeItem(phaseKey);
        } else {
            check('existing content loads with valid references', !$('exportGame').disabled && $('entryName').value === window.adventureWorld.maps[0].name);
            const mapId = $('entryId').value;
            check('map ID is permanent', $('entryId').readOnly);
            input($('entryName'), 'Test Grove'); input($('mapGoal'), '42');
            check('map names and clear goals update without changing IDs', draft().maps.find(map => map.id === mapId).goal === 42 && $('entryId').value === mapId && $('preview').textContent.includes('Test Grove'));
            $('duplicateEntry').click();
            check('duplicating a map keeps a separate identity', $('entryId').value !== mapId && draft().maps.length === window.adventureWorld.maps.length + 1);
            $('undo').click();
            check('undo restores map identity and progression list', $('entryId').value === mapId && draft().maps.length === window.adventureWorld.maps.length);
            $('addSpawn').click(); input($('spawn-1-count'), '2'); input($('override-1-health'), '123');
            select($('override-1-element'),'fire');
            const placed = WorldContent.definitions(draft(), draft().maps.find(map => map.id === mapId));
            check('spawn counts and per-placement overrides are independent', placed.length === 3 && placed.filter(monster => monster.health === 123).length === 2 && placed[0].health !== 123);
            check('placements can override inherited damage elements',placed.filter(monster=>monster.element==='fire').length===2);
            tab('worlds'); $('moveDown').click();
            check('world order is editable', draft().worlds[1].id === window.adventureWorld.worlds[0].id);
            $('undo').click();
            select($('backgroundMode'), 'custom');
            document.querySelector('.image-choice button').click();
            fileInput($('importAsset'), new File([png], 'area.png', {type: 'image/png'}));
            await until(() => !$('assetDialog').open);
            check('world background import creates a reusable library image', draft().worlds[0].background.sprite.startsWith('assets/backgrounds/area-') && draft().assets.some(asset => asset.kind === 'background' && asset.name === 'area'));
            tab('maps');
            select($('backgroundMode'),'inherit');
            check('maps inherit the world background', $('backgroundMode').value === 'inherit' && document.querySelector('.background-preview').style.backgroundImage.includes('blob:'));
            select($('backgroundMode'), 'custom'); document.querySelector('.image-choice button').click();
            [...$('assetLibrary').querySelectorAll('button')].find(button => button.textContent === 'area').click();
            select($('backgroundFit'), 'tile'); input($('backgroundTileSize'), '128');
            check('map-specific backgrounds reuse earlier imports', draft().maps[0].background.sprite === draft().worlds[0].background.sprite && document.querySelector('.background-preview').style.backgroundSize.includes('128px'));
            select($('backgroundMode'), 'inherit');
            tab('monsters'); const monsterId = $('entryId').value;
            input($('entryName'), 'Test Blob'); input($('monster-health'), '77');
            select($('monster-element'),'fire');
            input($('monster-attackInterval'), '0');
            check('invalid combat values prevent export', $('exportGame').disabled);
            input($('monster-attackInterval'), '2');
            const chance = document.querySelector('[data-drop-kind="drops"] .drop-row input'); input(chance, '0.1');
            check('drop chances use percentages with rare-drop odds', draft().monsters[0].drops[0].chance === 0.001 && document.querySelector('.drop-odds').textContent.includes('1,000'));
            document.querySelector('.image-choice button').click(); fileInput($('importAsset'), new File([png], 'monster.png', {type: 'image/png'}));
            await until(() => !$('assetDialog').open);
            check('monster sprites import and preview crisply', draft().monsters[0].sprite.startsWith('assets/monsters/monster-') && getComputedStyle(document.querySelector('.preview-monster img')).imageRendering === 'pixelated');
            $('exportJson').click(); const json = JSON.parse(await downloads.at(-1).blob.text());
            check('all original world, map and monster IDs survive export', ['worlds', 'maps', 'monsters'].every(kind => window.adventureWorld[kind].every(entry => json[kind].some(exported => exported.id === entry.id))));
            const invalid = structuredClone(json); invalid.maps[0].spawns[0].monsterId = 'missingMonster';
            check('missing monster references are rejected', WorldContent.validate(invalid, window.adventureItems).some(error => error.includes('spawn')));
            const invalidDrop = structuredClone(json); invalidDrop.monsters[0].itemDrops = [{id: 'missingEquipment', chance: 0.1}];
            check('missing drop targets are rejected', WorldContent.validate(invalidDrop, window.adventureItems).some(error => error.includes('missingEquipment')));
            $('exportGame').click(); await until(() => downloads.some(download => download.name.endsWith('-world-content.zip')));
            const archive = downloads.find(download => download.name.endsWith('-world-content.zip'));
            const bytes = new Uint8Array(await archive.blob.arrayBuffer()), view = new DataView(bytes.buffer);
            let offset = 0; const files = [];
            while (view.getUint32(offset, true) === 0x04034b50) {
                const size = view.getUint32(offset + 18, true), nameLength = view.getUint16(offset + 26, true);
                const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength));
                const contents = bytes.slice(offset + 30 + nameLength, offset + 30 + nameLength + size);
                check('ZIP CRC matches ' + name, ItemPackage.crc32(contents) === view.getUint32(offset + 14, true));
                files.push({name, contents}); offset += 30 + nameLength + size;
            }
            check('ZIP contains complete data and both imported images', files.length === 3 && files[0].name === 'js/world-content.js' && files.some(file => file.name.startsWith('assets/monsters/')) && files.some(file => file.name.startsWith('assets/backgrounds/')));
            check('exported content validates after loading', (() => { const target = {}; new Function('window', new TextDecoder().decode(files[0].contents))(target); return !WorldContent.validate(target.adventureWorld, window.adventureItems).length; })());
            archiveBase64 = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
            fileInput($('importJson'), new File([JSON.stringify(invalid)], 'invalid.json', {type: 'application/json'}));
            await until(() => $('status').textContent.startsWith('Could not import JSON'));
            check('invalid JSON leaves the current draft intact', !draft().maps.some(map => map.spawns.some(spawn => spawn.monsterId === 'missingMonster')) && !$('exportGame').disabled);
            input($('search'), 'Test');
            localStorage.setItem(phaseKey, JSON.stringify({checks, archive: archiveBase64, monsterId}));
            location.reload(); return;
        }
        check('editor layout fits the window', document.documentElement.scrollWidth <= innerWidth + 1);
        check('no editor runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    if (archiveBase64) { const archive = document.createElement('pre'); archive.id = 'archive-results'; archive.hidden = true; archive.textContent = archiveBase64; document.body.append(archive); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
