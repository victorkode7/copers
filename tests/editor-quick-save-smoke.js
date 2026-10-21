(async function () {
    const $ = id => document.getElementById(id);
    const itemEditor = Boolean($('itemForm'));
    const filename = itemEditor ? 'items.js' : 'skill-tree.js';
    const namespace = itemEditor ? 'adventureItems' : 'adventureSkillTree';
    const phaseKey = 'editorQuickSaveSmoke-' + filename;
    const phase = JSON.parse(localStorage.getItem(phaseKey) || 'null'), checks = phase?.checks || [];
    const nameField = itemEditor ? 'itemName' : 'nodeName', spriteField = itemEditor ? 'itemSprite' : 'nodeSprite';
    const currentStatus = () => $(itemEditor ? 'status' : 'saveStatus').textContent;
    const available = () => $('quickSave').getAttribute('aria-disabled') === 'false';
    function check(label, condition) { checks.push((condition ? 'PASS ' : 'FAIL ') + label); if (!condition) throw new Error(label); }
    function input(node, value) { node.value = value; node.dispatchEvent(new Event('input', {bubbles: true})); }
    async function until(predicate) {
        for (let i = 0; i < 300; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 20)); }
        throw new Error('Timed out: ' + currentStatus() + ' / ' + $('quickSaveTip').textContent);
    }
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    let installedPath = phase?.installedPath;
    const originalSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(HTMLImageElement.prototype, 'src', {configurable: true, get: originalSrc.get, set(value) { originalSrc.set.call(this, installedPath && String(value).includes(installedPath) ? png : value); }});
    const blobs = new Map(), downloads = [], originalUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = originalUrl(blob); blobs.set(url, blob); return url; };
    HTMLAnchorElement.prototype.click = function () { downloads.push({name: this.download, blob: blobs.get(this.href)}); };
    let pickerCalls = 0;
    try {
        check('Chrome exposes direct file access on a file URL', window.isSecureContext && typeof window.showOpenFilePicker === 'function');
        const directory = await navigator.storage.getDirectory();
        const file = await directory.getFileHandle(filename, {create: true});
        window.showSaveFilePicker = async () => { throw new Error('Quick save must not create a new file.'); };
        window.showOpenFilePicker = async options => { pickerCalls++; check('picker selects an existing ' + filename, options.multiple === false && options.types[0].description.includes(filename)); return [file]; };
        async function savedData() { const target = {}; new Function('window', await (await file.getFile()).text())(target); return target[namespace]; }
        async function save() { $('quickSave').click(); await until(() => currentStatus().startsWith('Quick-saved')); }
        await until(available);
        if (!phase) {
            check('project file selection is visible before the first save', !$('chooseQuickSaveFile').hidden && $('chooseQuickSaveFile').textContent === 'Choose project file');
            const beforeSelection = await (await file.getFile()).text();
            $('chooseQuickSaveFile').click(); await until(() => currentStatus().startsWith('Quick-save file selected'));
            check('choosing the existing file does not write or download data', await (await file.getFile()).text() === beforeSelection && downloads.length === 0);
            if (!itemEditor) document.querySelector('[data-node-id="quickHands"]').click();
            const internalId = $(itemEditor ? 'itemId' : 'nodeId').value;
            input($(nameField), 'Quick Save Test'); await save();
            check('direct save writes the full current catalogue', (itemEditor ? (await savedData()).items : (await savedData()).nodes).some(entry => entry.id === internalId && entry.name === 'Quick Save Test'));
            input($(nameField), 'Quick Save Again');
            document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', ctrlKey: true, bubbles: true, cancelable: true}));
            await until(() => currentStatus().startsWith('Quick-saved'));
            check('Ctrl+S reuses the file without exporting a ZIP', pickerCalls === 1 && downloads.length === 0 && (itemEditor ? (await savedData()).items : (await savedData()).nodes).some(entry => entry.id === internalId && entry.name === 'Quick Save Again'));
            check('quick save has only the styled tooltip', !$('quickSave').hasAttribute('title'));
            const beforeInvalid = await (await file.getFile()).text();
            const oldAdvanced = itemEditor ? null : $('nodeStats').value;
            input($(itemEditor ? 'itemName' : 'nodeStats'), itemEditor ? '' : '{"unfinished":');
            $('quickSave').click();
            check('invalid or unfinished edits cannot overwrite saved data', !available() && await (await file.getFile()).text() === beforeInvalid);
            input($(itemEditor ? 'itemName' : 'nodeStats'), itemEditor ? 'Quick Save Again' : oldAdvanced);
            if (!itemEditor) {
                const column = Number($('nodeColumn').value) + 1;
                input($('nodeColumn'), String(column)); await save();
                check('quick save includes currently typed node settings', (await savedData()).nodes.find(node => node.id === internalId).column === column);
            }
            input($(spriteField), 'tests/fixtures/equipment-sprite.svg'); await until(available); await save();
            check('existing project images are allowed', (itemEditor ? (await savedData()).items : (await savedData()).nodes).some(entry => entry.id === internalId && entry.sprite === 'tests/fixtures/equipment-sprite.svg'));
            const bytes = Uint8Array.from(atob(png.split(',')[1]), char => char.charCodeAt(0));
            const transfer = new DataTransfer(); transfer.items.add(new File([bytes], 'direct-save-test.png', {type: 'image/png'}));
            const importer = $(itemEditor ? 'importSprite' : 'nodeSpriteFile'); importer.files = transfer.files; importer.dispatchEvent(new Event('change', {bubbles: true}));
            await until(() => $(spriteField).value.startsWith(itemEditor ? 'assets/items/' : 'assets/skills/') && $('quickSaveTip').textContent.includes('not available'));
            const beforeImportSave = await (await file.getFile()).text(); $('quickSave').click();
            check('new sprites block direct saving', !available() && await (await file.getFile()).text() === beforeImportSave);
            $(itemEditor ? 'exportGame' : 'exportJs').click(); await until(() => downloads.some(download => download.name.endsWith('.zip')));
            check('package download does not bypass image installation', !available());
            installedPath = $(spriteField).value; window.dispatchEvent(new Event('focus')); await until(available); await save();
            check('installing the sprite enables subsequent data-only saves', (await (await file.getFile()).text()).includes(installedPath));
            localStorage.setItem(phaseKey, JSON.stringify({checks, installedPath})); location.reload(); return;
        }
        input($(nameField), 'Saved After Reload'); await save();
        check('each editor remembers its own file after reload', pickerCalls === 0 && (itemEditor ? (await savedData()).items : (await savedData()).nodes).some(entry => entry.name === 'Saved After Reload'));
        window.showOpenFilePicker = undefined; $('quickSave').click(); await until(() => downloads.some(download => download.name === filename));
        check('download fallback uses the correct data file', (await downloads.find(download => download.name === filename).blob.text()).startsWith('window.' + namespace + ' = '));
        check('unsupported browsers explain that direct saving is unavailable', $('quickSaveTarget').textContent.includes('Direct saving is unavailable in this browser') && $('chooseQuickSaveFile').hidden);
        Object.defineProperty(window, 'isSecureContext', {value: false, configurable: true});
        document.dispatchEvent(new Event('input'));
        check('insecure addresses get localhost instructions', $('quickSaveTarget').textContent.includes('http://localhost') && $('quickSaveTarget').textContent.includes('Downloading saves a copy only'));
        check('editor fits the viewport', document.documentElement.scrollWidth <= innerWidth + 1);
        check('no runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
        localStorage.removeItem(phaseKey);
    } catch (error) { checks.push('ERROR ' + error.stack); }
    Object.defineProperty(HTMLImageElement.prototype, 'src', originalSrc);
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
