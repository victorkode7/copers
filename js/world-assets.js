(function () {
    'use strict';
    const assets = new Map();
    let database;
    function db() {
        return database ||= new Promise((resolve, reject) => {
            const request = indexedDB.open('idleAdventureWorldImages', 1);
            request.onupgradeneeded = () => request.result.createObjectStore('images');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async function storage(mode, path, blob) {
        const database = await db();
        return new Promise((resolve, reject) => {
            const transaction = database.transaction('images', mode);
            const store = transaction.objectStore('images');
            const request = mode === 'readwrite' ? store.put(blob, path) : store.get(path);
            transaction.oncomplete = () => resolve(request.result);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }
    function remember(path, blob) {
        if (assets.has(path)) URL.revokeObjectURL(assets.get(path).url);
        assets.set(path, {blob, url: URL.createObjectURL(blob)});
    }
    function stem(name) {
        return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'image';
    }
    async function restore(paths) {
        await Promise.all([...new Set(paths.filter(WorldContent.safePath))].map(async path => {
            if (assets.has(path)) return;
            try { const blob = await storage('readonly', path); if (blob) remember(path, blob); }
            catch { /* Existing project files can load directly. */ }
        }));
    }
    async function importImage(file, kind) {
        const extension = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif'}[file.type];
        if (!extension) throw new Error('Choose a PNG, JPEG, WebP, or GIF image.');
        const temporary = URL.createObjectURL(file);
        try { const image = new Image(); image.src = temporary; await image.decode(); }
        finally { URL.revokeObjectURL(temporary); }
        const bytes = new Uint8Array(await file.arrayBuffer());
        const name = file.name.replace(/\.[^.]+$/, '');
        const hash = ItemPackage.crc32(bytes).toString(16).padStart(8, '0');
        const path = 'assets/' + (kind === 'monster' ? 'monsters' : 'backgrounds') + '/' + stem(name) + '-' + hash + '.' + extension;
        remember(path, file);
        let persisted = true;
        try { await storage('readwrite', path, file); } catch { persisted = false; }
        return {name, path, kind, persisted};
    }
    async function packageEntries(paths) {
        await restore(paths);
        const entries = [];
        for (const path of new Set(paths.filter(WorldContent.safePath))) {
            const asset = assets.get(path);
            if (asset) entries.push({name: path, bytes: new Uint8Array(await asset.blob.arrayBuffer())});
        }
        return entries;
    }
    window.WorldAssets = {restore, importImage, packageEntries, stem, source: path => assets.get(path)?.url || WorldContent.safePath(path)};
}());
