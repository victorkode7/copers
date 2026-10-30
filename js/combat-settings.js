(function () {
    'use strict';
    const storageKey = 'idleAdventureCombatSettings';
    const settings = {all: true, projectiles: true, abilities: true, shaking: true, glows: true};
    let effectRenderer = 'webgl';
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey));
        for (const key of Object.keys(settings)) if (typeof saved?.[key] === 'boolean') settings[key] = saved[key];
        if (['svg','webgl-cracks'].includes(saved?.renderer)) effectRenderer = saved.renderer;
    } catch { /* Defaults work without browser storage. */ }
    function enabled(category = 'general') {
        if (!settings.all) return false;
        if (category === 'projectiles') return settings.projectiles && settings.abilities;
        return settings[category] !== false;
    }
    const dialog = document.getElementById('combatSettingsDialog');
    const rendererSelect = document.getElementById('combatEffectRenderer');
    function save() {
        try { localStorage.setItem(storageKey, JSON.stringify({...settings, renderer: effectRenderer})); }
        catch { document.getElementById('combatSettingsStatus').textContent = 'Applied for this session. Browser storage is unavailable.'; }
    }
    function rendererStatus() {
        const status = window.CombatWebGL?.status();
        document.getElementById('combatRendererStatus').textContent = effectRenderer === 'svg'
            ? 'Using the original HTML and SVG effects.' : status?.reducedMotion
                ? 'Reduced motion is enabled. Using the original reduced-motion effects.' : status?.available === false
                    ? 'WebGL is unavailable. Using the original effects automatically.'
                    : effectRenderer==='webgl-cracks' ? 'Only travelling eruption cracks use WebGL. Other effects use the original renderer.'
                        : 'Projectiles, bursts, particles, auras and glows share one GPU layer. Labels and plate movement use HTML.';
    }
    function apply() {
        rendererSelect.value = effectRenderer;
        document.body.classList.toggle('combat-effects-off', !settings.all);
        for (const key of ['projectiles', 'abilities', 'shaking', 'glows']) {
            document.body.classList.toggle('combat-no-' + key, !enabled(key));
        }
        for (const button of dialog.querySelectorAll('[data-effect-setting]')) {
            const key = button.dataset.effectSetting;
            button.setAttribute('aria-checked', String(settings[key]));
            button.querySelector('[data-switch-state]').textContent = settings[key] ? 'On' : 'Off';
            button.disabled = key !== 'all' && !settings.all || key === 'projectiles' && !settings.abilities;
        }
        const remove = [];
        if (!enabled('projectiles')) remove.push('.combat-arrow', '.spell-void-bolt', '.spell-void-volley:not(.spell-impact-effect)');
        if (!enabled('abilities')) remove.push('.spell-effect', '.eruption-chain', '.eruption-burst', '.shield-slam-wave', '.poison-transfer', '.elemental-effect-layer');
        if (!enabled('glows')) remove.push('.void-volley-player-glow', '.loot-plate-flash');
        if (remove.length) document.querySelectorAll(remove.join(',')).forEach(node => node.remove());
        if (!enabled('shaking')) document.querySelectorAll('.enemy-card.is-defeating, .enemy-card.is-shockwave-splashed').forEach(node => node.classList.remove('is-defeating', 'is-shockwave-splashed'));
        if (!enabled('glows')) {
            document.querySelectorAll('.loot-equipment').forEach(node => node.getAnimations().forEach(animation => animation.cancel()));
            document.querySelectorAll('.combat-panel .is-applying, .combat-panel .is-proccing, .combat-panel .is-damaged, .combat-panel .is-dodging, .combat-panel .is-shockwave-hit, .combat-panel .is-shield-blocking')
                .forEach(node => node.classList.remove('is-applying', 'is-proccing', 'is-damaged', 'is-dodging', 'is-shockwave-hit', 'is-shield-blocking'));
        }
        if (!settings.all) {
            window.LootEffects?.clear();
            document.getAnimations().forEach(animation => animation.cancel());
        }
        dispatchEvent(new Event('combat-settings-change'));
        rendererStatus();
    }
    dialog.addEventListener('click', event => {
        const button = event.target.closest('[data-effect-setting]');
        if (button && !button.disabled) {
            const key = button.dataset.effectSetting;
            settings[key] = !settings[key];
            apply();
            save();
        } else if (event.target === dialog) {
            const bounds = dialog.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
        }
    });
    rendererSelect.addEventListener('change', () => {
        effectRenderer = ['svg','webgl-cracks'].includes(rendererSelect.value) ? rendererSelect.value : 'webgl';
        document.querySelectorAll('.combat-arrow,.spell-effect,.eruption-chain,.eruption-burst,.elemental-effect-layer,.shield-slam-wave,.poison-transfer,.void-volley-player-glow,.loot-plate-flash').forEach(node => node.remove());
        window.CombatWebGL?.clear(); apply(); save();
    });
    addEventListener('combat-renderer-status', rendererStatus);
    document.getElementById('openCombatSettings').addEventListener('click', () => { rendererStatus(); dialog.showModal(); });
    document.getElementById('closeCombatSettings').addEventListener('click', () => dialog.close());
    window.CombatSettings = {enabled, renderer: () => effectRenderer};
    apply();
}());
