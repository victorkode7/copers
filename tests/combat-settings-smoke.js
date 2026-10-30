(function () {
    const phaseKey = 'combatSettingsSmoke', storageKey = 'idleAdventureCombatSettings';
    const phase = JSON.parse(sessionStorage.getItem(phaseKey) || 'null');
    const checks = phase?.checks || [];
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const control = key => document.querySelector('[data-effect-setting="' + key + '"]');
    const set = (key, on) => { if (control(key).getAttribute('aria-checked') !== String(on)) control(key).click(); };
    const effects = '.combat-arrow,.spell-effect,.eruption-chain,.eruption-burst,.shield-slam-wave,.poison-transfer,.elemental-effect-layer';
    const originalRandom = Math.random, originalStats = itemById.testAmulet.stats;
    function fresh() {
        combatStatCache = null; state.skillRanks = Object.fromEntries(skillNodes.filter(node => !node.start).map(node => [node.id, node.maxRank]));
        state.level = Object.values(state.skillRanks).reduce((sum, rank) => sum + rank, 0);
        state.skillPoints = 0; state.experience = 0; state.upgrades = {strength: 0, haste: 0, evasion: 0};
        state.gear = createEmptyGear(); state.gear.necklace = 'testAmulet'; state.ownedItemIds = ['testAmulet']; state.crafted = [];
        itemById.testAmulet.stats = {health: 10000, healthRegen: 100000};
        state.kills = Object.fromEntries(mapData.map(map => [map.id, 0]));
        state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id, 0]));
        state.gold = 0; state.lootLog = []; state.lastLoot = null; state.tutorials = createTutorialState();
        state.currentView = 'map'; state.isInTown = false;
        const map = currentMap(); map.drops = []; map.itemDrops = [];
        map.spawns = [{id: 'settingsMob', monsterId: worldContent.monsters[0].id, count: 8,
            overrides: {health: 100000, attackDamage: 1, attackInterval: 3, accuracy: 100, evasion: 0, respawnSeconds: 2, gold: [1, 1], experience: 0, drops: [], itemDrops: []}}];
        resetMonsterStates(map); resetCombatClock(); clearOfflineRecap();
        state.playerHp = getPlayerMaxHealth(); state.playerMana = getPlayerMaxMana(); state.combatPaused = false; state.attackTimer = getAttackSpeed();
        let seed = 2345; Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
        render();
        elements.combatPanel.querySelectorAll(effects).forEach(node => node.remove());
        return state.monsterStates[0];
    }
    function fight() {
        fresh();
        for (let tick = 0; tick < 20; tick++) {
            combatStatCache = new Map(); const result = simulateCombatStep(.1, true); combatStatCache = null;
            flushCombatEffects(result.effects); renderCombat();
        }
        return JSON.stringify({monsters: state.monsterStates, hp: state.playerHp, mana: state.playerMana,
            charges: state.voidCharges, power: state.gatheringPower, fury: state.furyStacks, furyTime: state.furyRemaining,
            shields: state.shieldStacks, pending: state.pendingEruptions, missiles: state.pendingVoidMissiles,
            target: state.targetMonsterId, timer: state.attackTimer, gold: state.gold, kills: state.kills, materials: state.materials});
    }
    try {
        if (phase) {
            sessionStorage.removeItem(phaseKey);
            check('master and individual choices persist after reload', !CombatSettings.enabled() && !JSON.parse(localStorage.getItem(storageKey)).projectiles && !JSON.parse(localStorage.getItem(storageKey)).glows);
            check('master off is applied before game visuals start', document.body.classList.contains('combat-effects-off'));
            set('all', true);
            check('reenabling master restores the saved individual choices', !CombatSettings.enabled('projectiles') && !CombatSettings.enabled('glows') && CombatSettings.enabled('abilities') && CombatSettings.enabled('shaking'));
            check('no runtime errors after reload', !window.smokeErrors.length);
            checks.push('SMOKE PASSED');
        } else {
            check('effects default to enabled', ['general', 'projectiles', 'abilities', 'shaking', 'glows'].every(key => CombatSettings.enabled(key)));
            document.getElementById('openCombatSettings').click();
            const dialog = document.getElementById('combatSettingsDialog');
            check('Settings opens an accessible modal', dialog.open && dialog.getAttribute('aria-labelledby') === 'combatSettingsHeading');
            check('settings panel fits the viewport', dialog.getBoundingClientRect().width <= innerWidth && dialog.clientHeight <= innerHeight);
            const monster = fresh(), id = monster.id, card = elements.enemyRoster.firstElementChild;
            showCombatArrow(null, id, 'multiShot', 0);
            check('projectiles are created with default settings', !!elements.combatPanel.querySelector('.combat-arrow'));
            set('projectiles', false);
            check('turning projectiles off removes existing projectiles immediately', !elements.combatPanel.querySelector('.combat-arrow'));
            showCombatArrow(null, id, 'multiShot', 0); showSpellCast('voidBolt', [{targetId: id}]);
            check('disabled projectiles do not create arrow or spell elements', !elements.combatPanel.querySelector('.combat-arrow,.spell-void-bolt'));
            showVolcanicEruption(id, [id]);
            check('projectile switch leaves other ability effects enabled', !!card.querySelector('.eruption-burst'));
            set('projectiles', true); set('abilities', false);
            showCombatArrow(null, id, 'multiShot', 0); showVolcanicEruption(id, [id]); showVoidVortex([id]);
            showShieldSlamWave([id]); showElementalBurst([id], 'fire', true); showPoisonTransfer(id, state.monsterStates[1].id);
            check('ability switch removes and prevents all ability effect elements', !elements.combatPanel.querySelector(effects));
            check('projectile choice is retained while ability effects are off', control('projectiles').disabled && control('projectiles').getAttribute('aria-checked') === 'true');
            set('abilities', true); set('shaking', false);
            flashShockwaveCard(id); restartCombatAnimation(card, 'is-defeating');
            check('plate shaking can be disabled independently', !card.classList.contains('is-defeating') && !card.classList.contains('is-shockwave-splashed') && getComputedStyle(card).animationName === 'none');
            set('shaking', true); restartCombatAnimation(card, 'is-defeating');
            check('plate shaking can be reenabled', card.classList.contains('is-defeating'));
            set('glows', false); monster.poisonStacks = [{remainingDuration: 5, timeUntilTick: 1}]; renderCombat();
            showPoisonStackProc(monster); showVoidVolleyPlayerGlow(1);
            const badge = card.querySelector('[data-enemy-dot-status]');
            check('glow switch suppresses stack pulses and player glow', !badge.classList.contains('is-applying') && !elements.playerHealthPanel.querySelector('.void-volley-player-glow') && getComputedStyle(badge).boxShadow === 'none');
            check('poison status counts remain readable with glows disabled', !badge.hidden && badge.textContent.includes('1x'));
            set('glows', true);
            const reference = fight();
            check('busy fights have visible effects by default', !!elements.combatPanel.querySelector(effects));
            for (const key of ['projectiles', 'abilities', 'shaking', 'glows']) {
                set(key, false);
                check(key + ' switch preserves the full combat outcome', fight() === reference);
                set(key, true);
            }
            set('all', false);
            check('master switch stops existing combat effects immediately', !elements.combatPanel.querySelector(effects));
            check('master switch disables subordinate controls', ['projectiles', 'abilities', 'shaking', 'glows'].every(key => control(key).disabled));
            const disabled = fight();
            check('all-effects-off combat has identical damage timers and rewards', reference === disabled);
            check('master off creates no ability effect elements', !elements.combatPanel.querySelector(effects));
            check('master off removes all combat animations', elements.combatPanel.getAnimations({subtree: true}).length === 0);
            check('health and status information still updates', elements.playerHealthText.textContent.includes('HP') && elements.enemyRoster.firstElementChild.querySelector('.health-track').hasAttribute('aria-valuenow'));
            set('all', true);
            check('effects can be reenabled after the master switch', ['projectiles', 'abilities', 'shaking', 'glows'].every(key => CombatSettings.enabled(key)));
            const beforeSettings = localStorage.getItem(storageKey); saveGame(); loadGame();
            check('profile save/load does not replace device visual preferences', localStorage.getItem(storageKey) === beforeSettings);
            set('projectiles', false); set('glows', false); set('all', false);
            document.getElementById('closeCombatSettings').click();
            check('Close dismisses Settings', !dialog.open);
            check('no runtime errors', !window.smokeErrors.length);
            sessionStorage.setItem(phaseKey, JSON.stringify({checks})); location.reload(); return;
        }
    } catch (error) { checks.push('ERROR ' + error.stack); }
    finally { Math.random = originalRandom; itemById.testAmulet.stats = originalStats; combatStatCache = null; }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
