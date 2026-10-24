/* Regenerate js/offline-assets.js with scripts/update-offline-cache.ps1 after content changes. */
importScripts('js/offline-assets.js');

const root = new URL('./', self.location.href);
const cachePrefix = 'idle-adventure-offline-' + root.pathname + '-';
const cacheName = cachePrefix + self.adventureOfflineAssets.version;
const files = self.adventureOfflineAssets.files.map(path => new URL(path, root).href);
const paths = new Set(files.map(path => new URL(path).pathname));

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const alreadyCached = (await caches.keys()).includes(cacheName);
        const cache = await caches.open(cacheName);
        try {
            await cache.addAll(files.map(path => new Request(path, {cache: 'reload'})));
        } catch (error) {
            if (!alreadyCached) await caches.delete(cacheName);
            throw error;
        }
        // Updated versions wait for existing game tabs to close, keeping their
        // currently loaded code and artwork together until the next launch.
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter(name => name.startsWith(cachePrefix) && name !== cacheName).map(name => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    const request = event.request, url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== root.origin) return;
    const path = url.pathname === root.pathname ? new URL('index.html', root).pathname : url.pathname;
    const isAsset = path.startsWith(new URL('assets/', root).pathname);
    if (!paths.has(path) && !isAsset) return;
    const key = request.mode === 'navigate' ? new URL(path, root).href : request;
    const cached = () => caches.match(key).then(result => result || caches.match(key, {ignoreSearch: true}));
    const fromNetwork = async () => {
        const response = await fetch(request);
        if (!response.ok) throw new Error('Game file unavailable: ' + path);
        const cache = await caches.open(cacheName);
        await cache.put(key, response.clone()).catch(() => {});
        return response;
    };
    event.respondWith((async () => {
        if (isAsset) {
            const response = await cached();
            if (response) return response;
        }
        try { return await fromNetwork(); }
        catch (error) {
            const response = await cached();
            if (response) return response;
            throw error;
        }
    })());
});
