(function () {
    'use strict';
    function create(key, filename, onTargetChange) {
        let handle = null, database;
        function db() {
            return database ||= new Promise((resolve, reject) => {
                const request = indexedDB.open('idleAdventureEditorFiles', 1);
                request.onupgradeneeded = () => request.result.createObjectStore('files');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
        async function storage(mode, value) {
            const database = await db();
            return new Promise((resolve, reject) => {
                const transaction = database.transaction('files', mode), store = transaction.objectStore('files');
                const request = mode === 'readwrite' ? store.put(value, key) : store.get(key);
                transaction.oncomplete = () => resolve(request.result);
                transaction.onerror = () => reject(transaction.error);
                transaction.onabort = () => reject(transaction.error);
            });
        }
        const supported = () => window.isSecureContext !== false && typeof window.showOpenFilePicker === 'function';
        function unavailableReason() {
            if (window.isSecureContext === false) return 'Direct saving is unavailable at this address. Open the editor through http://localhost, http://127.0.0.1, or HTTPS. Downloading saves a copy only.';
            if (window.top !== window) return 'Direct saving is unavailable in this preview. Open the editor in its own Chrome or Edge tab. Downloading saves a copy only.';
            return 'Direct saving is unavailable in this browser. Use Chrome or Edge, or download a copy of the JS file.';
        }
        const ready = (async () => {
            try {
                const saved = await storage('readonly');
                if (saved?.kind === 'file' && saved.name === filename && typeof saved.createWritable === 'function') handle = saved;
            } catch { /* A chosen file can still be remembered for this session. */ }
            onTargetChange?.(handle);
        })();
        async function choose() {
            if (!supported()) throw new Error(unavailableReason());
            // Open the picker directly from the click, before other asynchronous work.
            const [selected] = await window.showOpenFilePicker({
                id: key,
                multiple: false,
                excludeAcceptAllOption: true,
                types: [{description: 'Existing project file: ' + filename, accept: {'text/javascript': ['.js']}}]
            });
            if (selected?.name !== filename || typeof selected.createWritable !== 'function') throw new Error('Choose the existing js/' + filename + ' file inside your game project.');
            if (typeof selected.requestPermission === 'function' && await selected.requestPermission({mode: 'readwrite'}) !== 'granted') throw new Error('File access was not granted. Choose the quick-save file again.');
            handle = selected;
            try { await storage('readwrite', handle); } catch { /* Some browsers cannot persist file handles. */ }
            onTargetChange?.(handle);
            return handle;
        }
        async function prepare() {
            if (!supported()) return null;
            if (!handle) return choose();
            if (typeof handle.requestPermission === 'function' && await handle.requestPermission({mode: 'readwrite'}) !== 'granted') throw new Error('File access was not granted. Choose the quick-save file again.');
            return handle;
        }
        async function write(target, source) {
            const writable = await target.createWritable();
            try { await writable.write(source); await writable.close(); }
            catch (error) { try { await writable.abort(); } catch { /* Preserve the original write error. */ } throw error; }
        }
        return {ready, supported, unavailableReason, choose, prepare, write, targetName: () => handle?.name || ''};
    }
    window.EditorFileSave = {create};
}());
