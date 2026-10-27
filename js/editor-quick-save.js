(function () {
    'use strict';
    function create(config) {
        const $ = id => document.getElementById(id);
        const button = $('quickSave'), tooltip = $('quickSaveTip'), changeFile = $('chooseQuickSaveFile'), targetLabel = $('quickSaveTarget');
        let busy = false, fileReady = false, timer, version = 0, errors = [];
        let imageCheck = {signature: '', checking: true, missing: []};
        const checks = new Map();
        const saver = EditorFileSave.create(config.key, config.filename, updateAvailability);
        const paths = () => [...new Set(config.getPaths().filter(Boolean))].sort();
        function imageAvailable(path, force = false) {
            if (!force && checks.has(path)) return checks.get(path);
            const check = new Promise(resolve => {
                const image = new Image(); let finished = false;
                const finish = available => {
                    if (finished) return;
                    finished = true; clearTimeout(timeout); image.onload = image.onerror = null; resolve(available);
                };
                const timeout = setTimeout(() => finish(false), 4000);
                image.onload = () => finish(image.naturalWidth > 0); image.onerror = () => finish(false);
                // Probe the project file, never the editor's in-memory preview.
                const source = new URL(path, document.baseURI);
                source.searchParams.set('quick-save-check', Date.now() + '-' + version);
                image.src = source.href;
            });
            checks.set(path, check); return check;
        }
        function updateAvailability() {
            let message = 'Save data only. For new sprites, download the game package.';
            if (busy) message = 'Saving data…';
            else if (errors.length) message = 'Fix the validation issues before quick-saving.';
            else if (!fileReady || imageCheck.checking) message = 'Checking sprites. For new sprites, download the game package.';
            else if (imageCheck.missing.length) message = 'Save data only. New sprites are not available yet. Download the game package.';
            else if (!saver.supported()) message = 'Save data only (downloads the JS file). For new sprites, download the game package.';
            button.setAttribute('aria-disabled', String(Boolean(busy || !fileReady || errors.length || imageCheck.checking || imageCheck.missing.length)));
            tooltip.textContent = message;
            changeFile.hidden = !saver.supported(); changeFile.disabled = busy || !fileReady;
            changeFile.textContent = saver.targetName() ? 'Change project file' : 'Choose project file';
            targetLabel.textContent = !saver.supported()
                ? saver.unavailableReason()
                : saver.targetName() ? 'Quick save overwrites the selected ' + saver.targetName() + ' file. Reload the game after saving.' : 'Choose the existing js/' + config.filename + ' file inside your game project once. Quick save will overwrite that file on later saves.';
        }
        function refresh(nextErrors, force = false) {
            errors = nextErrors || config.validate();
            const images = paths(), signature = JSON.stringify(images);
            if (!force && signature === imageCheck.signature) { updateAvailability(); return; }
            const currentVersion = ++version;
            clearTimeout(timer); imageCheck = {signature, checking: true, missing: []}; updateAvailability();
            timer = setTimeout(async () => {
                const available = await Promise.all(images.map(path => imageAvailable(path, force)));
                if (currentVersion !== version) return;
                imageCheck = {signature, checking: false, missing: images.filter((path, index) => !available[index])}; updateAvailability();
            }, 150);
        }
        async function save() {
            if (busy) return;
            refresh();
            if (errors.length) { config.status('Fix the validation issues before quick-saving.'); return; }
            config.beforeSave?.();
            refresh();
            if (errors.length) { config.status('Fix the validation issues before quick-saving.'); return; }
            if (!fileReady || imageCheck.checking || imageCheck.missing.length) {
                config.status(imageCheck.missing.length ? 'Quick save needs the new images in the project first. Download and extract the game package, then return here.' : 'Checking the project images. Try Quick save again when the check finishes.');
                refresh(undefined, true); return;
            }
            busy = true; updateAvailability();
            try {
                // Keep file-picker/permission requests inside the initiating user gesture.
                const target = await saver.prepare();
                if (config.reconcileProject && target) {
                    config.reconcileProject(await (await target.getFile()).text());
                    refresh();
                    if (errors.length) { config.status('Fix the validation issues before quick-saving.'); return; }
                }
                const source = config.getSource(), images = paths();
                const available = await Promise.all(images.map(path => imageAvailable(path, true)));
                const missing = images.filter((path, index) => !available[index]);
                if (missing.length) {
                    imageCheck = {signature: JSON.stringify(images), checking: false, missing};
                    config.status('Quick save stopped because an image is unavailable. Install the images using the game package first.'); return;
                }
                if (target) {
                    await saver.write(target, source);
                    config.status(config.getSource() === source ? 'Quick-saved js/' + config.filename + '. Reload the game to test your changes.' : 'Quick-saved the earlier version. Your latest edits still need saving.');
                } else {
                    config.download(config.filename, source);
                    config.status('Downloaded ' + config.filename + '. Replace js/' + config.filename + ' and reload the game.');
                }
            } catch (error) { config.status(error.name === 'AbortError' ? 'Quick save cancelled.' : 'Could not quick-save: ' + error.message); }
            finally { busy = false; refresh(); }
        }
        button.addEventListener('click', save);
        changeFile.addEventListener('click', async () => {
            if (busy || !saver.supported()) return;
            busy = true; updateAvailability();
            try {
                await saver.choose();
                if (config.reconcileProject) config.reconcileProject(await saver.readSource() || '');
                config.status('Quick-save file selected. Click Quick save to write your current changes.');
            }
            catch (error) { config.status(error.name === 'AbortError' ? 'File selection cancelled.' : 'Could not choose quick-save file: ' + error.message); }
            finally { busy = false; updateAvailability(); }
        });
        document.addEventListener('keydown', event => {
            if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's' && !document.querySelector('dialog[open]')) {
                event.preventDefault(); button.click();
            }
        });
        // Recheck even unfinished inspector edits that have not entered the data model.
        ['input', 'change'].forEach(type => document.addEventListener(type, () => refresh()));
        async function checkProject() {
            if (!config.reconcileProject || busy) return;
            try {
                const source = await saver.readSource();
                if (source !== null && !busy) config.reconcileProject(source);
            } catch (error) { config.status('Could not check project updates: ' + error.message); }
        }
        window.addEventListener('focus', () => { refresh(undefined, true); checkProject(); });
        document.addEventListener('visibilitychange', () => { if (!document.hidden) { refresh(undefined, true); checkProject(); } });
        saver.ready.then(() => { fileReady = true; updateAvailability(); checkProject(); });
        refresh();
        return {refresh, save};
    }
    window.EditorQuickSave = {create};
}());
