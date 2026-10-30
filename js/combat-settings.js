(function () {
    'use strict';
    const storageKey = 'idleAdventureCombatSettings';
    const settings = {all: true, projectiles: true, abilities: true, shaking: true, glows: true};
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey));
        for (const key of Object.keys(settings)) if (typeof saved?.[key] === 'boolean') settings[key] = saved[key];
    } catch { /* Defaults work without browser storage. */ }
    function enabled(category = 'general') {
        if (!settings.all) return false;
        if (category === 'projectiles') return settings.projectiles && settings.abilities;
        return settings[category] !== false;
    }
    const dialog = document.getElementById('combatSettingsDialog');
    function apply() {
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
    }
    dialog.addEventListener('click', event => {
        const button = event.target.closest('[data-effect-setting]');
        if (button && !button.disabled) {
            const key = button.dataset.effectSetting;
            settings[key] = !settings[key];
            apply();
            try { localStorage.setItem(storageKey, JSON.stringify(settings)); }
            catch { document.getElementById('combatSettingsStatus').textContent = 'Applied for this session. Browser storage is unavailable.'; }
        } else if (event.target === dialog) {
            const bounds = dialog.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
        }
    });
    document.getElementById('openCombatSettings').addEventListener('click', () => dialog.showModal());
    document.getElementById('closeCombatSettings').addEventListener('click', () => dialog.close());
    window.CombatSettings = {enabled};
    apply();
}());
