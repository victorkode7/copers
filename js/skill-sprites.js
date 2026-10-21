(function() {
    'use strict';
    const assets = new Map();
    let database;
    function safePath(value) {
        return typeof value === 'string' && /^(?![\/\\]|.*(?:[:\\?#]|\.\.))[a-z0-9_ ./-]+\.(png|jpe?g|webp|gif|svg)$/i.test(value) ? value : '';
    }
    function icon(node, className, draft = false) {
        const container = document.createElement('span');
        container.className = className;
        container.setAttribute('aria-hidden', 'true');
        const fallback = node.icon || '✦';
        container.textContent = fallback;
        const path = safePath(node.sprite);
        const source = path && (draft && assets.get(path)?.url || path);
        if (source) {
            const image = document.createElement('img');
            image.alt = '';
            image.addEventListener('error', () => { container.textContent = fallback; });
            image.src = source;
            container.replaceChildren(image);
        }
        return container;
    }
    function openDatabase() {
        if (!database) database = new Promise((resolve, reject) => {
            const request = indexedDB.open('idleAdventureSkillSprites', 1);
            request.onupgradeneeded = () => request.result.createObjectStore('sprites');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        return database;
    }
    async function storage(mode, path, blob) {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('sprites', mode);
            const store = transaction.objectStore('sprites');
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
    async function restore(nodes) {
        await Promise.all([...new Set(nodes.map(node => safePath(node.sprite)).filter(Boolean))].map(async path => {
            if (assets.has(path)) return;
            try { const blob = await storage('readonly', path); if (blob) remember(path, blob); }
            catch { /* Existing image files can still load directly from the project. */ }
        }));
    }
    async function importImage(file, id) {
        const extension = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif'}[file.type];
        if (!extension) throw new Error('Choose a PNG, JPEG, WebP, or GIF image.');
        const preview = URL.createObjectURL(file);
        try { const image = new Image(); image.src = preview; await image.decode(); }
        finally { URL.revokeObjectURL(preview); }
        const bytes = new Uint8Array(await file.arrayBuffer());
        const hash = ItemPackage.crc32(bytes).toString(16).padStart(8, '0');
        const stem = /^[A-Za-z_][A-Za-z0-9_]*$/.test(id) ? id : 'skill';
        const path = 'assets/skills/' + stem + '-' + hash + '.' + extension;
        remember(path, file);
        let persisted = true;
        try { await storage('readwrite', path, file); } catch { persisted = false; }
        return {path, persisted};
    }
    async function packageEntries(nodes) {
        await restore(nodes);
        const entries = [];
        for (const path of new Set(nodes.map(node => safePath(node.sprite)).filter(Boolean))) {
            const asset = assets.get(path);
            if (asset) entries.push({name: path, bytes: new Uint8Array(await asset.blob.arrayBuffer())});
        }
        return entries;
    }
    window.SkillSprites = {safePath, icon, restore, importImage, packageEntries};
})();
