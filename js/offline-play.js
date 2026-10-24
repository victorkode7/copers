(function () {
    'use strict';
    // Downloaded copies work directly from local files. Hosted copies use a
    // service worker to keep the same files available after the first visit.
    if (!/^https?:$/.test(location.protocol) || !window.isSecureContext || !('serviceWorker' in navigator)) return;
    const root = new URL('../', document.currentScript.src);
    const status = document.getElementById('offlinePlayStatus');
    function message(text) { status.textContent = text; status.hidden = false; }
    async function prepare() {
        message('Preparing offline play…');
        try {
            const registration = await navigator.serviceWorker.register(new URL('offline-worker.js', root).href,
                {scope: root.href, updateViaCache: 'none'});
            const worker = registration.installing || registration.waiting;
            if (worker && !['installed', 'activated'].includes(worker.state)) {
                await new Promise((resolve, reject) => {
                    const changed = () => {
                        if (['installed', 'activated', 'redundant'].includes(worker.state)) {
                            worker.removeEventListener('statechange', changed);
                            if (worker.state === 'redundant') reject(new Error('Offline download did not finish.'));
                            else resolve();
                        }
                    };
                    worker.addEventListener('statechange', changed); changed();
                });
            }
            await navigator.serviceWorker.ready;
            message('Ready for offline play');
            window.setTimeout(() => { status.hidden = true; }, 6000);
        } catch (error) {
            message('Offline download incomplete. Reconnect and reopen to finish.');
            console.warn('Could not prepare offline play.', error);
        }
    }
    if (document.readyState === 'complete') prepare();
    else window.addEventListener('load', prepare, {once: true});
}());
