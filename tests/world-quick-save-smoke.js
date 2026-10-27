(async function () {
    const $ = id => document.getElementById(id);
    const phaseKey = 'worldQuickSaveSmoke';
    const phase = JSON.parse(localStorage.getItem(phaseKey) || 'null');
    const checks = phase?.checks || [];
    function check(label, condition) { checks.push((condition ? 'PASS ' : 'FAIL ') + label); if (!condition) throw new Error(label); }
    function input(node, value) { node.value = value; node.dispatchEvent(new Event('input', {bubbles: true})); }
    function fileInput(node, file) { const transfer = new DataTransfer(); transfer.items.add(file); node.files = transfer.files; node.dispatchEvent(new Event('change', {bubbles: true})); }
    const available = () => $('quickSave').getAttribute('aria-disabled') === 'false';
    async function until(predicate) {
        for (let i = 0; i < 300; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 20)); }
        throw new Error('Timed out: ' + $('status').textContent + ' / ' + $('quickSaveTip').textContent);
    }
    const pngData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    let installedPath = phase?.installedPath;
    const originalSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    // Simulate installing an exported image without writing into the project.
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
        configurable: true,
        get: originalSrc.get,
        set(value) { originalSrc.set.call(this, installedPath && String(value).includes(installedPath) ? pngData : value); }
    });
    const blobs = new Map(), downloads = [];
    const originalUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = originalUrl(blob); blobs.set(url, blob); return url; };
    HTMLAnchorElement.prototype.click = function () { downloads.push({name: this.download, blob: blobs.get(this.href)}); };
    let pickerCalls = 0;
    let testFile;
    try {
        // Use a real file handle in the browser's private test storage, never a project file.
        const directory = await navigator.storage.getDirectory();
        testFile = await directory.getFileHandle('world-content.js', {create: true});
        window.showSaveFilePicker = async () => { throw new Error('Quick save must not create a new file.'); };
        window.showOpenFilePicker = async options => {
            pickerCalls++; check('picker selects the existing world content file', options.multiple === false && options.types[0].description.includes('world-content.js')); return [testFile];
        };
        await until(available);
        if (!phase) {
            check('quick save explains the new-image restriction', $('quickSaveTip').textContent.includes('new sprites'));
            input($('mapGoal'), '25'); $('quickSave').click();
            await until(() => $('status').textContent.startsWith('Quick-saved'));
            let saved = {}; new Function('window', await (await testFile.getFile()).text())(saved);
            check('quick save writes valid world content directly to the chosen file', saved.adventureWorld.maps[0].goal === 25);
            const external=JSON.parse(JSON.stringify(saved.adventureWorld));
            external.maps[0].name='New project map name';external.maps[0].description='New project map description';
            let externalWriter=await testFile.createWritable();await externalWriter.write('window.adventureWorld = '+JSON.stringify(external)+';\n');await externalWriter.close();
            input($('mapGoal'), '30'); document.dispatchEvent(new KeyboardEvent('keydown', {key: 's', ctrlKey: true, bubbles: true, cancelable: true}));
            await until(() => $('status').textContent.startsWith('Quick-saved'));
            saved = {}; new Function('window', await (await testFile.getFile()).text())(saved);
            check('Ctrl+S reuses the selected file', pickerCalls === 1 && saved.adventureWorld.maps[0].goal === 30);
            check('quick save imports current project map text before writing the draft',saved.adventureWorld.maps[0].name==='New project map name'&&saved.adventureWorld.maps[0].description==='New project map description'&&$('entryName').value==='New project map name');
            input($('entryName'),'My chosen map name');
            external.maps[0].name='Another external map name';external.maps[0].description='Refreshed project description';
            externalWriter=await testFile.createWritable();await externalWriter.write('window.adventureWorld = '+JSON.stringify(external)+';\n');await externalWriter.close();
            window.dispatchEvent(new Event('focus'));await until(()=>$('mapDescription').value==='Refreshed project description');
            check('returning to the editor refreshes unchanged text while keeping custom names and values',$('entryName').value==='My chosen map name'&&$('mapGoal').value==='30');
            await until(available);
            input($('mapGoal'), '-1');
            const validFile = await (await testFile.getFile()).text(); $('quickSave').click();
            check('invalid data cannot overwrite the chosen file', !available() && await (await testFile.getFile()).text() === validFile);
            input($('mapGoal'), '30');
            document.querySelector('[data-kind="monsters"]').click(); input($('monster-health'), '55');
            document.querySelector('.image-choice button').click(); input($('assetPath'), 'tests/fixtures/equipment-sprite.svg'); $('useAssetPath').click();
            await until(available); $('quickSave').click(); await until(() => $('status').textContent.startsWith('Quick-saved'));
            saved = {}; new Function('window', await (await testFile.getFile()).text())(saved);
            check('existing project sprites and monster values support quick save', saved.adventureWorld.monsters[0].health === 55 && saved.adventureWorld.monsters[0].sprite === 'tests/fixtures/equipment-sprite.svg');
            document.querySelector('.image-choice button').click();
            const png = Uint8Array.from(atob(pngData.split(',')[1]), char => char.charCodeAt(0));
            fileInput($('importAsset'), new File([png], 'quick-save-new-image.png', {type: 'image/png'}));
            await until(() => !$('assetDialog').open && $('quickSaveTip').textContent.includes('not available'));
            check('new images block quick save with an explanatory tooltip', !available() && $('quickSaveTip').textContent.includes('game package'));
            const before = await (await testFile.getFile()).text(); $('quickSave').click();
            await new Promise(resolve => setTimeout(resolve, 50));
            check('blocked quick save never overwrites the data file', await (await testFile.getFile()).text() === before && pickerCalls === 1);
            $('exportGame').click(); await until(() => downloads.some(download => download.name.endsWith('.zip')));
            check('downloading a package alone does not mark its images installed', !available());
            installedPath = JSON.parse(localStorage.getItem('idleAdventureWorldEditorDraft')).monsters[0].sprite;
            window.dispatchEvent(new Event('focus')); await until(available);
            check('quick save becomes available after images are installed', available());
            $('quickSave').click(); await until(() => $('status').textContent.startsWith('Quick-saved'));
            check('stat changes can be saved after installing the image', (await (await testFile.getFile()).text()).includes(installedPath));
            localStorage.setItem(phaseKey, JSON.stringify({checks, installedPath}));
            location.reload(); return;
        }
        input($('monster-health'), '67'); $('quickSave').click(); await until(() => $('status').textContent.startsWith('Quick-saved'));
        let saved = {}; new Function('window', await (await testFile.getFile()).text())(saved);
        check('chosen file is remembered across reloads', pickerCalls === 0 && saved.adventureWorld.monsters[0].health === 67);
        window.showOpenFilePicker = async () => { throw new DOMException('Cancelled', 'AbortError'); };
        $('chooseQuickSaveFile').click(); await until(() => $('status').textContent === 'File selection cancelled.');
        check('cancelling the picker preserves the chosen file', $('quickSaveTarget').textContent.includes('world-content.js'));
        window.showOpenFilePicker = async () => [{name: 'game.js'}];
        $('chooseQuickSaveFile').click(); await until(() => $('status').textContent.startsWith('Could not choose quick-save file'));
        check('choosing an unrelated file is rejected', $('status').textContent.includes('world-content.js'));
        let aborted = false;
        window.showOpenFilePicker = async () => [{name: 'world-content.js', getFile: () => testFile.getFile(), requestPermission: async () => 'granted', createWritable: async () => ({write: async () => { throw new Error('Simulated write failure'); }, close: async () => {}, abort: async () => { aborted = true; }})}];
        $('chooseQuickSaveFile').click(); await until(() => $('status').textContent.startsWith('Quick-save file selected'));
        const beforeFailure = await (await testFile.getFile()).text();
        $('quickSave').click(); await until(() => $('status').textContent.startsWith('Could not quick-save'));
        check('failed writes abort without replacing the existing file', aborted && await (await testFile.getFile()).text() === beforeFailure && !downloads.length);
        let permission = 'granted';
        window.showOpenFilePicker = async () => [{name: 'world-content.js', getFile: () => testFile.getFile(), requestPermission: async () => permission, createWritable: async () => { throw new Error('Should not open a denied file'); }}];
        $('chooseQuickSaveFile').click(); await until(() => $('status').textContent.startsWith('Quick-save file selected'));
        permission = 'denied';
        $('quickSave').click(); await until(() => $('status').textContent.startsWith('Could not quick-save'));
        check('denied file permission prevents saving', $('status').textContent.includes('not granted') && !downloads.length);
        window.showOpenFilePicker = undefined;
        $('quickSave').click(); await until(() => downloads.some(download => download.name === 'world-content.js'));
        check('unsupported browsers download the JS file instead', (await downloads.find(download => download.name === 'world-content.js').blob.text()).startsWith('window.adventureWorld = '));
        check('no runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
        localStorage.removeItem(phaseKey);
    } catch (error) { checks.push('ERROR ' + error.stack); }
    Object.defineProperty(HTMLImageElement.prototype, 'src', originalSrc);
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
