(async function () {
    const checks = [];
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const near = (a, b) => Math.abs(a - b) < 1e-6;
    const $ = id => document.getElementById(id);
    const settle = () => new Promise(resolve => setTimeout(resolve, 0));
    const change = (element, value, type = 'change') => { element.value = value; element.dispatchEvent(new Event(type, {bubbles: true})); };
    async function exportData() {
        const originalUrl = URL.createObjectURL, originalClick = HTMLAnchorElement.prototype.click, blobs = new Map();
        let download;
        try {
            URL.createObjectURL = blob => { const url = originalUrl.call(URL, blob); blobs.set(url, blob); return url; };
            HTMLAnchorElement.prototype.click = function () { download = blobs.get(this.href); };
            $('exportJson').click();
            return JSON.parse(await download.text());
        } finally { URL.createObjectURL = originalUrl; HTMLAnchorElement.prototype.click = originalClick; }
    }
    try {
        if ($('nodeForm')) {
            $('nodeList').querySelector('[data-node-id="healthNode"]').click();
            // Replace the existing health bonus, keeping this test independent of its value.
            let row = $('statBonusRows').firstElementChild;
            if (!row) { $('addStatBonus').click(); row = $('statBonusRows').lastElementChild; }
            row.querySelectorAll('select')[0].value = 'healthRegen';
            row.querySelectorAll('select')[1].value = 'additive';
            change(row.querySelector('input'), '1.25', 'input'); await settle();
            check('skill editor offers health regeneration with an automatic description', $('nodeEffect').value.includes('+1.25 health regeneration per second'));
            $('addStatBonus').click(); row = $('statBonusRows').lastElementChild;
            row.querySelectorAll('select')[0].value = 'healthRegen';
            row.querySelectorAll('select')[1].value = 'multiplier';
            change(row.querySelector('input'), '1.5', 'input'); await settle();
            check('skill regeneration multipliers describe their percentage bonus', $('nodeEffect').value.includes('+50% health regeneration per second') && $('statsError').hidden);
            const exported = await exportData(), node = exported.nodes.find(node => node.id === 'healthNode');
            check('skill exports preserve both regeneration bonuses', node.stats.healthRegen === 1.25 && node.stats.healthRegenMultiplier === 1.5 && !$('validationList').textContent.includes('unsupported stat "healthRegen'));
        } else if ($('itemForm')) {
            $('addItem').click(); $('addStat').click();
            change($('statRows').querySelector('select'), 'healthRegen');
            change($('statRows').querySelector('input'), '0.25');
            check('items preview fractional HP per second', $('preview').textContent.includes('+0.25 Health regeneration per second'));
            check('regeneration guides explain offline healing and death', $('statRows').querySelector('.stat-guide').textContent.includes('does not revive'));
            $('addStat').click(); change($('statRows').lastElementChild.querySelector('select'), 'healthRegenMultiplier');
            change($('statRows').lastElementChild.querySelector('input'), '1.5');
            check('items support regeneration multipliers and value guides', $('preview').textContent.includes('+50% Health regeneration per second') && ItemStatGuides.get('healthRegenMultiplier'));
            const exported = await exportData(), item = exported.items.find(item => item.id === $('itemId').value);
            check('item exports retain regeneration and pass validation', item.stats.healthRegen === 0.25 && item.stats.healthRegenMultiplier === 1.5 && Equipment.validate(exported).length === 0);
        } else {
            const originalRandom = Math.random, originalNode = skillNodeById.healthNode.stats, originalItem = itemById.testAmulet.stats;
            const map = currentMap();
            const fresh = (ranks = {}) => {
                state.skillRanks = ranks; pendingSkillRanks = {}; state.level = Object.keys(ranks).length; state.skillPoints = 0; state.experience = 0;
                state.gear = createEmptyGear(); state.ownedItemIds = []; state.crafted = []; state.upgrades = {strength: 0, haste: 0, evasion: 0};
                state.currentView = 'map'; state.isInTown = false;
                map.spawns = [{id: 'regenTarget', monsterId: worldContent.monsters[0].id, count: 1, overrides: {health: 100000, attackDamage: 0, attackInterval: 100000, evasion: 0, experience: 0, drops: [], itemDrops: []}}];
                resetMonsterStates(map); resetCombatClock(); clearOfflineRecap();
                state.playerHp = 50; state.combatPaused = false; state.attackTimer = 0; render();
            };
            const equip = () => { state.gear.necklace = 'testAmulet'; state.ownedItemIds = ['testAmulet']; };
            try {
                fresh(); simulateCombatStep(.1);
                check('regeneration starts at zero', getPlayerHealthRegen() === 0 && state.playerHp === 50);
                skillNodeById.healthNode.stats = {healthRegen: 1, healthRegenMultiplier: 2};
                itemById.testAmulet.stats = {healthRegen: .25, healthRegenMultiplier: 1.5};
                fresh({healthNode: 1}); equip(); render();
                check('flat node and item regeneration add before their multipliers', getPlayerHealthRegen() === 3.75 && elements.healthRegen.textContent === '3.75 HP/s');
                for (let index = 0; index < 10; index++) simulateCombatStep(.1);
                check('fractional regeneration accumulates accurately each second', near(state.playerHp, 53.75));
                check('regeneration appears in gear tooltips and comparisons', Equipment.describe(itemById.testAmulet) === '+0.25 Health regeneration per second\n+50% Health regeneration per second' && Equipment.compare(itemById.testAmulet, null).every(line => line.status === 'new'));
                state.playerHp = getPlayerMaxHealth() - .1; simulateCombatStep(.1);
                check('healing never exceeds maximum health', state.playerHp === getPlayerMaxHealth());
                state.playerHp = 50; state.monsterStates[0].hp = 0; state.monsterStates[0].respawnRemaining = 5; simulateCombatStep(.1);
                check('healing continues while waiting for enemies to respawn', near(state.playerHp, 50.375));
                state.currentView = 'upgrades'; simulateCombatStep(.1);
                check('healing continues on other game pages', near(state.playerHp, 50.75));
                state.playerHp = 0; state.combatPaused = true; simulateCombatStep(10);
                check('regeneration cannot revive a dead character', state.playerHp === 0 && state.combatPaused);
                skillNodeById.healthNode.stats = {healthRegen: -1}; state.gear = createEmptyGear();
                check('penalties cannot make regeneration damage the player', getPlayerHealthRegen() === 0);
                skillNodeById.healthNode.stats = {healthRegen: 1, healthRegenMultiplier: 2};
                fresh({healthNode: 1}); equip();
                const queue = skillNodes.filter(node => node.start).map(node => [node.id]), seen = new Set(queue.flat());
                let path;
                for (let index = 0; index < queue.length; index++) {
                    const current = queue[index], last = current.at(-1);
                    if (last === 'healthNode') { path = current; break; }
                    skillNodeConnections[last].forEach(next => { if (!seen.has(next)) { seen.add(next); queue.push([...current, next]); } });
                }
                state.skillRanks = Object.fromEntries(path.filter(id => !skillNodeById[id].start).map(id => [id, 1]));
                state.level = Object.keys(state.skillRanks).length; state.skillPoints = 0; state.playerHp = 41.375;
                const expected = getPlayerHealthRegen(); saveGame();
                check('saving and loading preserves fractional health and recomputes regeneration', loadGame() && near(state.playerHp, 41.375) && getPlayerHealthRegen() === expected);
                const seedRandom = () => { let seed = 1234; Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; };
                const snapshot = () => JSON.stringify({hp: state.playerHp, paused: state.combatPaused, attack: state.attackTimer, monsters: state.monsterStates, pending: state.pendingEruptions});
                fresh({healthNode: 1, volcanicEruption: 1, eruptionChain: 1}); equip(); seedRandom();
                for (let index = 0; index < 300; index++) simulateCombatStep(.1);
                const reference = snapshot();
                fresh({healthNode: 1, volcanicEruption: 1, eruptionChain: 1}); equip(); seedRandom();
                resetCombatClock(Date.now() - 30000); processCombatBacklog();
                for (let index = 0; pendingCombatSeconds + 1e-8 >= gameTickSeconds && index < 100; index++) await settle();
                check('offline regeneration and eruption self-damage match foreground combat exactly', pendingCombatSeconds < gameTickSeconds && snapshot() === reference && state.playerHp > 0);
                triggerVolcanicEruption(state.monsterStates[0], 1);
                const burst = elements.enemyRoster.querySelector('.eruption-burst');
                burst.style.animationName = 'volcanic-eruption-burst';
                burst.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = 150; });
                const card = burst.parentElement.getBoundingClientRect(), bounds = burst.getBoundingClientRect();
                check('eruption glow reaches the top and bottom of the whole plate', Math.abs(bounds.top - card.top) <= 2 && Math.abs(bounds.bottom - card.bottom) <= 2 && getComputedStyle(burst).backgroundImage.includes('100%'));
            } finally { Math.random = originalRandom; skillNodeById.healthNode.stats = originalNode; itemById.testAmulet.stats = originalItem; resetCombatClock(); clearOfflineRecap(); }
        }
        check('no runtime errors: ' + window.smokeErrors.join('; '), !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
