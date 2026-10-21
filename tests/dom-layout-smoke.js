// Capture visible content geometry and presentation before/after a DOM refactor.
// Run through run-equipment-smoke.ps1 with -ReportPath and compare JSON reports.
(async function () {
    const snapshots = {};
    const pause = () => new Promise(resolve => setTimeout(resolve, 250));
    async function capture(name) {
        await pause();
        const occurrences = new Map();
        const content = {};
        document.querySelectorAll('h1,h2,h3,h4,p,strong,button,input,select,textarea,img,span[id],.craft-material-label > span:first-child').forEach(element => {
            if (!element.getClientRects().length || !element.getBoundingClientRect().height) return;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const label = element.id || [element.tagName, element.dataset.craft || '', element.textContent.trim(), element.getAttribute('src') || ''].join('|');
            const occurrence = occurrences.get(label) || 0;
            occurrences.set(label, occurrence + 1);
            content[label + ':' + occurrence] = {
                rect: [rect.x, rect.y, rect.width, rect.height].map(value => Math.round(value * 100) / 100),
                style: ['color', 'fontSize', 'fontWeight', 'lineHeight', 'textAlign', 'imageRendering'].map(key => style[key])
            };
        });
        snapshots[name] = {nodes: document.querySelectorAll('*').length, content};
    }
    try {
        await document.fonts.ready;
        if (document.body.classList.contains('idle-adventure')) {
            state.ownedItemIds = recipes.map(item => item.id);
            for (const view of ['town', 'inventory', 'map', 'upgrades']) {
                state.currentView = view;
                render();
                await capture(view);
            }
            document.querySelector('.loot-panel').open = true;
            await capture('loot-open');
        } else {
            await capture('editor');
        }
        if (window.smokeErrors.length) throw new Error(window.smokeErrors.join('\n'));
        const result = document.createElement('pre');
        result.id = 'smoke-results';
        result.textContent = JSON.stringify(snapshots) + '\nSMOKE PASSED';
        document.body.append(result);
    } catch (error) {
        const result = document.createElement('pre');
        result.id = 'smoke-results';
        result.textContent = 'FAIL ' + error.stack;
        document.body.append(result);
    }
}());
