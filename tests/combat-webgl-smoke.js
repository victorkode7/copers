(async function () {
    const phaseKey = 'combatWebGLSmoke';
    const previous = JSON.parse(sessionStorage.getItem(phaseKey) || 'null');
    const checks = previous || [];
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const choose = value => {
        const select = document.getElementById('combatEffectRenderer'); select.value = value; select.dispatchEvent(new Event('change'));
    };
    const toggle = (key, value) => {
        const button = document.querySelector('[data-effect-setting="' + key + '"]');
        if (button.getAttribute('aria-checked') !== String(value)) button.click();
    };
    const report = () => {
        const output = document.createElement('pre'); output.id = 'smoke-results'; output.textContent = checks.join('\n'); document.body.append(output);
    };
    try {
        if (previous) {
            sessionStorage.removeItem(phaseKey);
            check('renderer preference is restored after reloading', CombatSettings.renderer() === 'svg' && document.getElementById('combatEffectRenderer').value === 'svg');
            choose('webgl');
            check('no errors after reload', !window.smokeErrors.length);
            checks.push('SMOKE PASSED');
            report(); return;
        }
        toggle('all', true); toggle('abilities', true); choose('webgl');
        state.currentView = 'map'; state.isInTown = false;
        const map = currentMap();
        map.spawns = [{id: 'webglMob', monsterId: worldContent.monsters[0].id, count: 4,
            overrides: {health: 100000, attackDamage: 1, attackInterval: 3, respawnSeconds: 2}}];
        resetMonsterStates(map); clearOfflineRecap(); render();
        elements.combatPanel.scrollIntoView({block: 'start'});
        await nextFrame();
        const [source, target] = state.monsterStates;
        showEruptionChain(source.id, target.id, 0);
        check('eruption chains use WebGL without SVG nodes', CombatWebGL.status().active === 1 && !document.querySelector('.eruption-chain'));
        for (let i = 0; i < 15; i++) showEruptionChain(source.id, target.id, 0);
        check('many cracks share one canvas', document.querySelectorAll('.combat-webgl-layer').length === 1 && CombatWebGL.status().active === 16);
        CombatWebGL.clear();
        CombatWebGL.eruptionChain({panel: elements.combatPanel, points: [{x: 30, y: 30}, {x: 140, y: 80}, {x: 280, y: 35}]});
        await wait(80); await nextFrame();
        const canvas = document.querySelector('.combat-webgl-layer'), gl = canvas.getContext('webgl');
        const pixels = new Uint8Array(canvas.width * canvas.height * 4);
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        check('shader actually draws visible pixels without WebGL errors', pixels.some((value, index) => index % 4 === 3 && value > 0) && gl.getError() === gl.NO_ERROR);
        check('canvas stays within the viewport and does not intercept input', canvas.clientWidth === document.documentElement.clientWidth && canvas.clientHeight === innerHeight && getComputedStyle(canvas).pointerEvents === 'none' && Math.max(canvas.width, canvas.height) <= 2048);
        const beforeScroll = elements.combatPanel.getBoundingClientRect().top;
        const pixelTop = data => {
            for (let row = canvas.height - 1; row >= 0; row--) {
                for (let x = 0; x < canvas.width; x++) if (data[(row * canvas.width + x) * 4 + 3] > 20) return canvas.height - row - 1;
            }
            return NaN;
        };
        const firstPixel = pixelTop(pixels);
        scrollTo(0, Math.max(0, scrollY - 40)); await nextFrame(); await nextFrame();
        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const scrollDelta = elements.combatPanel.getBoundingClientRect().top - beforeScroll;
        check('GPU cracks remain anchored to the combat panel while scrolling', scrollDelta > 0 && Math.abs(pixelTop(pixels) - firstPixel - scrollDelta * canvas.height / innerHeight) < 3);
        toggle('abilities', false);
        check('ability switch stops and hides the GPU layer immediately', !CombatWebGL.status().active && !CombatWebGL.status().running && canvas.hidden);
        toggle('abilities', true); showEruptionChain(source.id, target.id, 0); toggle('all', false);
        check('master switch stops GPU effects', !CombatWebGL.status().active && canvas.hidden);
        toggle('all', true); choose('svg'); showEruptionChain(source.id, target.id, 0);
        check('original renderer can be selected and persists independently', !!document.querySelector('.eruption-chain') && JSON.parse(localStorage.getItem('idleAdventureCombatSettings')).renderer === 'svg');
        choose('webgl'); showEruptionChain(source.id, target.id, 0);
        dispatchEvent(new Event('resize'));
        check('resizing clears endpoints from the previous layout', !CombatWebGL.status().active && !CombatWebGL.status().running);
        showEruptionChain(source.id, target.id, 0);
        CombatWebGL.sync(false, map.id);
        check('leaving combat stops all rendering', !CombatWebGL.status().running && canvas.hidden);
        CombatWebGL.sync(true, map.id); showEruptionChain(source.id, target.id, 0);
        CombatWebGL.sync(true, map.id + '-next');
        check('changing maps clears old GPU effects', !CombatWebGL.status().active);
        CombatWebGL.sync(true, map.id); showEruptionChain(source.id, target.id, 0);
        await wait(2200);
        check('finished effects stop the animation loop', !CombatWebGL.status().active && !CombatWebGL.status().running && canvas.hidden);
        const extension = gl.getExtension('WEBGL_lose_context');
        check('context loss can be exercised', !!extension);
        extension.loseContext(); await wait(100);
        showEruptionChain(source.id, target.id, 0);
        check('context loss falls back to the original renderer', !CombatWebGL.status().available && !!document.querySelector('.eruption-chain') && !CombatWebGL.status().running);
        extension.restoreContext();
        for (let i = 0; i < 30 && !CombatWebGL.status().available; i++) await wait(50);
        check('restored context becomes available again', CombatWebGL.status().available);
        document.querySelectorAll('.eruption-chain').forEach(node => node.remove());
        showEruptionChain(source.id, target.id, 0); await nextFrame();
        check('restored shaders draw new GPU effects', CombatWebGL.status().active === 1 && gl.getError() === gl.NO_ERROR);
        CombatWebGL.clear();
        // Exercise initial creation failure in a separate copy, without touching
        // the live renderer or needing a machine with WebGL disabled.
        const script = document.querySelector('script[src^="js/combat-webgl.js"]').src;
        const iframe = document.createElement('iframe');
        iframe.srcdoc = '<script>HTMLCanvasElement.prototype.getContext=()=>null;window.CombatSettings={enabled:()=>true,renderer:()=>"webgl"};<\/script><script src="' + script + '"><\/script>';
        document.body.append(iframe);
        await new Promise(resolve => { iframe.onload = resolve; });
        check('unavailable WebGL returns control to the SVG fallback', iframe.contentWindow.CombatWebGL.eruptionChain({panel: iframe.contentDocument.body, points: [{x: 0, y: 0}, {x: 20, y: 20}]}) === false && !iframe.contentWindow.CombatWebGL.status().available);
        iframe.remove();
        const reduced = document.createElement('iframe');
        reduced.srcdoc = '<script>window.matchMedia=()=>({matches:true,addEventListener(){}});window.CombatSettings={enabled:()=>true,renderer:()=>"webgl"};<\/script><script src="' + script + '"><\/script>';
        document.body.append(reduced);
        await new Promise(resolve => { reduced.onload = resolve; });
        check('reduced motion avoids creating a GPU animation layer', reduced.contentWindow.CombatWebGL.eruptionChain({panel: reduced.contentDocument.body, points: [{x: 0, y: 0}, {x: 20, y: 20}]}) === false && !reduced.contentDocument.querySelector('canvas'));
        reduced.remove();
        check('no browser script errors', !window.smokeErrors.length);
        choose('svg'); sessionStorage.setItem(phaseKey, JSON.stringify(checks)); location.reload(); return;
    } catch (error) { checks.push(error.stack || String(error)); }
    report();
}());
