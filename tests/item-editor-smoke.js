(async function() {
    const checks = [];
    const $ = id => document.getElementById(id);
    const count = () => Number($('itemCount').textContent.replace(/\D/g, ''));
    function check(label, condition) {
        checks.push((condition ? 'PASS ' : 'FAIL ') + label);
        if (!condition) throw new Error(label);
    }
    function change(node, value) { node.value = value; node.dispatchEvent(new Event('change', {bubbles: true})); }
    async function until(predicate) {
        for (let i = 0; i < 80; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 20)); }
        throw new Error('Timed out waiting for asynchronous editor action: ' + $('status').textContent);
    }
    function fileInput(input, file) {
        const transfer = new DataTransfer(); transfer.items.add(file); input.files = transfer.files;
        input.dispatchEvent(new Event('change', {bubbles: true}));
    }
    const blobs = new Map(), downloads = [];
    const originalObjectUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = originalObjectUrl(blob); blobs.set(url, blob); return url; };
    HTMLAnchorElement.prototype.click = function() { downloads.push({name: this.download, blob: blobs.get(this.href)}); };
    try {
        check('mana and spell stats include editable definitions and help',['mana','manaMultiplier','spellDamage','spellDamageMultiplier','manaRegen','manaRegenIncrease','manaRegenPercent'].every(id=>Equipment.stats[id]&&ItemStatGuides.get(id)?.formula));
        const initialCount = count();
        check('drop controls reserved for future map editor', !$('addDrop') && !$('dropRows'));
        check('editor loads catalogue', initialCount === window.adventureItems.items.length && !$('exportGame').disabled);
        const existingId = $('itemId').value;
        check('internal ID is read-only and tucked into closed advanced settings', $('itemId').readOnly && !$('itemId').closest('details').open);
        change($('itemName'), 'Renamed existing equipment');
        check('renaming existing equipment preserves its internal ID', $('itemId').value === existingId && JSON.parse(localStorage.getItem('idleAdventureItemEditorDraft')).items.some(item => item.id === existingId && item.name === 'Renamed existing equipment'));
        $('undo').click();
        $('addItem').click();
        const testItemId = $('itemId').value;
        check('new items receive an automatic permanent ID', /^item_[a-f0-9]{32}$/.test(testItemId));
        change($('itemName'), 'Test Necklace'); change($('itemSlot'), 'necklace');
        check('naming a new item leaves its internal ID unchanged', $('itemId').value === testItemId);
        check('create and edit item', count() === initialCount + 1 && $('preview').textContent.includes('Test Necklace'));
        $('addStat').click();
        check('only one attack speed multiplier option', [...$('statRows').querySelectorAll('option')].filter(option => /attack (speed|interval).*multiplier/i.test(option.textContent)).length === 1);
        change($('statRows').querySelector('input'), '12');
        check('stat bonus preview uses edited values', $('preview').textContent.includes('+12 Damage'));
        check('every supported stat has a value guide', Object.keys(Equipment.stats).every(key => ItemStatGuides.get(key)?.formula));
        check('guide reflects current input', $('statRows').querySelector('.stat-guide summary').textContent.includes('+12 Damage'));
        change($('statRows').querySelector('select'), 'healthMultiplier');
        change($('statRows').querySelector('input'), '1.5');
        check('multiplier guide shows input formula and live effect', $('statRows').querySelector('.stat-guide').textContent.includes('1 + desired bonus (%) ÷ 100') && $('statRows').querySelector('.stat-guide summary').textContent.includes('+50% Maximum health'));
        change($('statRows').querySelector('select'), 'poisonChance');
        check('poison guide explains chance addition', $('statRows').querySelector('.stat-guide').textContent.includes('0.05 gives 15% before multipliers'));
        change($('statRows').querySelector('select'), 'attackSpeedMultiplier');
        check('speed guide explains interval and limit', $('statRows').querySelector('.stat-guide').textContent.includes('0.8 seconds') && $('statRows').querySelector('.stat-guide').textContent.includes('0.25 seconds'));
        change($('statRows').querySelector('select'), 'damage');
        change($('statRows').querySelector('input'), '12');
        $('craftable').checked = true; $('craftable').dispatchEvent(new Event('change'));
        change($('materialRows').querySelector('input'), '8');
        check('recipe material preview updates', $('preview').textContent.includes('8 ' + Object.values(window.adventureItems.materials)[0]));
        change($('materialRows').querySelector('input'), '0');
        check('invalid recipes block game export', $('exportGame').disabled);
        $('restoreDraft').click(); await until(() => $('status').textContent.startsWith('Local draft restored'));
        [...$('itemList').querySelectorAll('button')].find(button => button.textContent.includes('Test Necklace')).click();
        check('unfinished draft restores for further editing', $('exportGame').disabled && $('materialRows').querySelector('input').value === '0');
        change($('materialRows').querySelector('input'), '8');
        $('duplicateItem').click();
        const duplicateId = $('itemId').value;
        check('duplicate creates distinct item ID', /^item_[a-f0-9]{32}$/.test(duplicateId) && duplicateId !== testItemId && $('itemName').value === 'Test Necklace Copy' && count() === initialCount + 2);
        $('deleteItem').click(); $('undo').click();
        check('undo restores deleted item and its permanent ID', count() === initialCount + 2 && $('itemId').value === duplicateId);
        $('deleteItem').click();
        const testButton = [...$('itemList').querySelectorAll('button')].find(button => button.textContent.includes('Test Necklace'));
        testButton.click();
        const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='), c => c.charCodeAt(0));
        fileInput($('importSprite'), new File([png], 'sprite.png', {type: 'image/png'}));
        await until(() => $('status').textContent.startsWith('Sprite imported'));
        check('sprite import uses the item name for its asset path', /^assets\/items\/Test-Necklace-[a-f0-9]+\.png$/.test($('itemSprite').value));
        check('sprite import previews image', Boolean($('preview').querySelector('img')));
        check('local draft saved', JSON.parse(localStorage.getItem('idleAdventureItemEditorDraft')).items.some(item => item.id === testItemId));
        $('exportJson').click();
        const json = JSON.parse(await downloads.at(-1).blob.text());
        check('JSON exports paths without embedding images', json.items.find(item => item.id === testItemId).sprite.startsWith('assets/items/') && !JSON.stringify(json).includes('data:image'));
        check('export preserves every existing internal ID', window.adventureItems.items.every(item => json.items.some(exported => exported.id === item.id)));
        $('exportGame').click(); await until(() => downloads.some(download => download.name === 'Test-Necklace.zip'));
        const archive = downloads.find(download => download.name === 'Test-Necklace.zip');
        const bytes = new Uint8Array(await archive.blob.arrayBuffer());
        const view = new DataView(bytes.buffer);
        let offset = 0; const files = [];
        while (view.getUint32(offset, true) === 0x04034b50) {
            const size = view.getUint32(offset + 18, true), nameLength = view.getUint16(offset + 26, true);
            const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength));
            const contents = bytes.slice(offset + 30 + nameLength, offset + 30 + nameLength + size);
            check('ZIP entry CRC matches contents: ' + name, ItemPackage.crc32(contents) === view.getUint32(offset + 14, true));
            files.push({name, contents}); offset += 30 + nameLength + size;
        }
        check('ZIP contains game data and imported sprite', files.length === 2 && files[0].name === 'js/items.js' && files[1].name === json.items.find(item => item.id === testItemId).sprite);
        const importedSource = new TextDecoder().decode(files[0].contents);
        check('exported game data includes new item and recipe', importedSource.includes(testItemId) && importedSource.includes('"' + Object.keys(window.adventureItems.materials)[0] + '": 8'));
        const encoded = document.createElement('pre'); encoded.id = 'archive-results'; encoded.hidden = true;
        encoded.textContent = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')); document.body.append(encoded);
        // Import the JSON through the actual file input, then restore its saved image from IndexedDB.
        fileInput($('importJson'), new File([JSON.stringify(json)], 'items.json', {type: 'application/json'}));
        await until(() => $('status').textContent.startsWith('JSON imported'));
        check('JSON import preserves item count', count() === initialCount + 1);
        $('restoreDraft').click(); await until(() => $('status').textContent.startsWith('Local draft restored'));
        check('draft restore succeeds', !$('exportGame').disabled);
        const invalid = JSON.parse(JSON.stringify(json)); invalid.items[0].id = invalid.items[1].id;
        fileInput($('importJson'), new File([JSON.stringify(invalid)], 'bad.json', {type: 'application/json'}));
        await until(() => $('status').textContent.startsWith('Could not import JSON'));
        check('invalid import leaves catalogue intact', count() === initialCount + 1 && !$('exportGame').disabled);
        check('no editor runtime errors', !window.smokeErrors.length);
    } catch (error) { checks.push('ERROR ' + error.message + '\n' + error.stack); }
    const output = document.createElement('pre'); output.id = 'smoke-results';
    output.textContent = checks.join('\n') + '\n' + (checks.some(line => /^(FAIL|ERROR)/.test(line)) ? 'SMOKE FAILED' : 'SMOKE PASSED');
    document.body.append(output);
})();
