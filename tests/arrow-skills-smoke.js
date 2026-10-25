(async function () {
    const checks = [];
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const near = (a, b) => Math.abs(a - b) < 1e-6;
    const originalRandom = Math.random, originalSpeed = getAttackSpeed;
    const map = currentMap();
    function fresh(ranks = {}, count = 6, columns = 3, overrides = {}) {
        state.skillRanks = ranks; state.level = Object.keys(ranks).length;
        state.skillPoints = 0; state.experience = 0;
        state.gear = createEmptyGear(); state.ownedItemIds = []; state.crafted = [];
        state.upgrades = {strength: 0, haste: 0, evasion: 0};
        state.gold = 0; state.kills = Object.fromEntries(mapData.map(entry => [entry.id, 0]));
        state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id, 0]));
        state.tutorials = createTutorialState(); state.lootLog = []; state.lastLoot = null;
        state.selectedMap = map.id; state.selectedWorld = worldForMap(map.id).id;
        state.currentView = 'map'; state.isInTown = false;
        map.drops = []; map.itemDrops = [];
        map.spawns = [{id: 'archerTarget', monsterId: worldContent.monsters[0].id, count,
            overrides: {health: 100, attackDamage: 1, attackInterval: 100, accuracy: 100, evasion: 0,
                respawnSeconds: 2, gold: [0, 0], experience: 0, drops: [], itemDrops: [], ...overrides}}];
        resetMonsterStates(map); resetCombatClock(); clearOfflineRecap();
        state.playerHp = getPlayerMaxHealth(); state.combatPaused = false; state.attackTimer = 0;
        render(); state.monsterColumns = columns;
        elements.combatPanel.querySelectorAll('.combat-arrow').forEach(arrow => arrow.remove());
        Math.random = () => 0;
        return state.monsterStates;
    }
    try {
        let monsters = fresh();
        Math.random = () => { throw new Error('Unallocated skills rolled randomness.'); };
        triggerAttackArrowSkills(monsters[0], getDamage());
        check('unallocated arrow skills do nothing and do not roll procs', monsters.every(monster => monster.hp === 100));

        monsters = fresh({piercingArrow: 1});
        const piercingDamage = getDamage() * 2;
        Math.random = () => .3;
        triggerAttackArrowSkills(monsters[1], getDamage());
        check('Piercing Arrow uses a strict 30 percent proc chance', monsters.every(monster => monster.hp === 100));
        Math.random = () => .299;
        triggerAttackArrowSkills(monsters[1], getDamage());
        check('Piercing Arrow deals twice normal physical damage to the target row only',
            monsters.slice(0, 3).every(monster => monster.hp === 100 - piercingDamage) && monsters.slice(3).every(monster => monster.hp === 100));
        check('piercing arrows have an on-screen effect', Boolean(elements.combatPanel.querySelector('[data-arrow-kind="piercingArrow"] path')));

        monsters = fresh({forkingArrow: 1}, 9);
        Math.random = () => .1;
        triggerAttackArrowSkills(monsters[0], getDamage());
        check('Forking Arrow uses a strict 10 percent proc chance', monsters.every(monster => monster.hp === 100));
        Math.random = () => 0;
        triggerAttackArrowSkills(monsters[0], getDamage());
        check('forks chain diagonally forward without revisiting enemies', monsters.every((monster, index) =>
            monster.hp === ([0, 4, 2].includes(index) ? 100 - getDamage() : 100)));
        check('forking stops at row boundaries instead of wrapping to the next row',
            getForwardDiagonalArrowTargets(monsters[2], new Set(), {x: 1, y: 0}).length === 0);
        const directions = [
            [{x: 1, y: 0}, [2, 8]], [{x: -1, y: 0}, [0, 6]],
            [{x: 0, y: 1}, [6, 8]], [{x: 0, y: -1}, [0, 2]],
            [{x: 1, y: 1}, [8]], [{x: 1, y: -1}, [2]],
            [{x: -1, y: 1}, [6]], [{x: -1, y: -1}, [0]]
        ];
        for (const [travel, expected] of directions) {
            const targets = getForwardDiagonalArrowTargets(monsters[4], new Set(), travel);
            check('only forward diagonals are eligible for direction ' + JSON.stringify(travel),
                targets.length === expected.length && targets.every(target => expected.includes(monsters.indexOf(target))));
        }
        check('already visited enemies cannot be fork targets',
            getForwardDiagonalArrowTargets(monsters[4], new Set([monsters[2].id, monsters[8].id]), {x: 1, y: 0}).length === 0);
        check('fork visuals connect one monster to the next', Boolean(elements.combatPanel.querySelector('.combat-arrow[data-source-id]')));
        const forkBadge = elements.enemyRoster.querySelector('[data-monster-id="' + monsters[4].id + '"] [data-combat-hit-badge]');
        showMonsterHitBadge(monsters[4].id, 'PIERCING ARROW');
        showMonsterHitBadge(monsters[4].id, 'MULTI-HIT', true);
        check('fork labels retain priority over piercing and multihit labels', forkBadge.textContent === 'FORKING ARROW');
        monsters = fresh({forkingArrow: 1}, 9, 3, {health: 1});
        triggerAttackArrowSkills(monsters[0], getDamage());
        check('forks continue forward from killed enemies and award each kill once',
            monsters.filter(monster => monster.hp === 0).length === 3 && state.kills[map.id] === 3 &&
            [0, 4, 2].every(index => monsters[index].hp === 0 && monsters[index].respawnRemaining === 2));
        monsters = fresh({forkingArrow: 1}, 9);
        shootAbilityArrow([monsters[2]], getDamage(), 'forkingArrow', 1);
        check('arrows arriving from the right fork diagonally left', monsters.every((monster, index) =>
            monster.hp === ([2, 4, 0].includes(index) ? 100 - getDamage() : 100)));
        monsters = fresh({forkingArrow: 1}, 9);
        shootAbilityArrow([monsters[8]], getDamage(), 'forkingArrow', 3);
        check('arrows arriving from below keep forking diagonally upward', monsters.every((monster, index) =>
            monster.hp === ([8, 4, 0].includes(index) ? 100 - getDamage() : 100)));
        for (const [direction, columns, start, path] of [
            [0, 4, 0, [0, 5, 2, 7]], // Down, up, down while moving right.
            [1, 4, 3, [3, 6, 1, 4]], // Down, up, down while moving left.
            [2, 2, 0, [0, 3, 4, 7]], // Right, left, right while moving down.
            [3, 2, 7, [7, 4, 3, 0]]  // Left, right, left while moving up.
        ]) {
            monsters = fresh({forkingArrow: 1}, 8, columns);
            shootAbilityArrow([monsters[start]], getDamage(), 'forkingArrow', direction);
            check('forks can zigzag while preserving original direction ' + direction,
                monsters.every((monster, index) => monster.hp === (path.includes(index) ? 100 - getDamage() : 100)));
            const segments = [...elements.combatPanel.querySelectorAll('.combat-arrow[data-source-id]')];
            check('zigzag visuals follow each actual fork segment for direction ' + direction,
                segments.length === path.length - 1 && segments.every((segment, index) =>
                    segment.dataset.sourceId === monsters[path[index]].id && segment.dataset.targetId === monsters[path[index + 1]].id));
            const incoming = elements.combatPanel.querySelector('.combat-arrow.is-incoming');
            check('an incoming arrow always precedes the first fork for direction ' + direction,
                incoming && incoming.dataset.targetId === monsters[start].id && incoming.querySelector('.arrow-origin') &&
                incoming.querySelector('.arrow-projectile') && incoming.querySelector('.arrow-impact') &&
                Number.parseFloat(segments[0].style.getPropertyValue('--arrow-delay')) >
                    Number.parseFloat(incoming.style.getPropertyValue('--arrow-flight')));
            check('later fork segments wait for the previous arrow to arrive for direction ' + direction,
                segments.every((segment, index) => !index ||
                    Number.parseFloat(segment.style.getPropertyValue('--arrow-delay')) >
                    Number.parseFloat(segments[index - 1].style.getPropertyValue('--arrow-delay')) +
                    Number.parseFloat(segments[index - 1].style.getPropertyValue('--arrow-flight'))));
            const pending = segments[0].querySelector('.arrow-projectile');
            const pendingAnimations = pending.getAnimations();
            pendingAnimations.forEach(animation => { animation.pause(); animation.currentTime = 150; });
            check('a fork stays hidden while the incoming arrow is still travelling for direction ' + direction,
                Number(getComputedStyle(pending).opacity) === 0);
            pendingAnimations.forEach(animation => { animation.currentTime = 0; animation.play(); });
        }
        monsters = fresh({forkingArrow: 1});
        monsters[4].hp = 0;
        shootAbilityArrow([monsters[0]], getDamage(), 'forkingArrow');
        check('forks cannot jump over a dead forward diagonal', monsters[0].hp < 100 &&
            monsters.every((monster, index) => index === 0 || index === 4 || monster.hp === 100));
        check('no fork animation or label appears when every forward neighbor is dead',
            !elements.combatPanel.querySelector('[data-arrow-kind="forkingArrow"]') &&
            !elements.enemyRoster.querySelector('[data-combat-hit-badge].is-visible'));
        monsters = fresh({forkingArrow: 1}, 8);
        check('incomplete rows do not create nonexistent diagonal neighbors',
            getForwardDiagonalArrowTargets(monsters[4], new Set(), {x: 1, y: 0}).map(target => monsters.indexOf(target)).join() === '2');
        monsters = fresh({forkingArrow: 1}, 3, 1);
        shootAbilityArrow([monsters[0]], getDamage(), 'forkingArrow');
        check('single-column formations cannot fork vertically', monsters[0].hp < 100 && monsters[1].hp === 100 && monsters[2].hp === 100);
        check('single-column formations show no failed fork animation', !elements.combatPanel.querySelector('[data-arrow-kind="forkingArrow"]'));
        monsters = fresh({forkingArrow: 1}, 1, 1);
        triggerAttackArrowSkills(monsters[0], getDamage());
        check('a solo-target fork proc keeps its damage but has no fork animation', monsters[0].hp === 100 - getDamage() &&
            !elements.combatPanel.querySelector('[data-arrow-kind="forkingArrow"]'));
        monsters = fresh({forkingArrow: 1}, 9);
        shootAbilityArrow([monsters[2]], getDamage(), 'forkingArrow', 0);
        check('arrows facing the edge of the formation do not animate an impossible fork', monsters[2].hp === 100 - getDamage() &&
            !elements.combatPanel.querySelector('[data-arrow-kind="forkingArrow"]'));
        monsters = fresh({forkingArrow: 1}, 9);
        shootAbilityArrow([monsters[0]], getDamage(), 'forkingArrow', 0);
        check('the final real fork segment remains visible when it has no further destination',
            Boolean(elements.combatPanel.querySelector('[data-source-id="' + monsters[4].id + '"][data-target-id="' + monsters[2].id + '"]')));
        monsters = fresh({multiShot: 1, forkingArrow: 1}, 1, 1, {health: 10000});
        shootAbilityArrow(monsters, 1, 'multiShot');
        check('Multishot draws no arrow when it cannot fork', !elements.combatPanel.querySelector('.combat-arrow'));
        monsters = fresh({multiShot: 1, freezingArrows: 1}, 1, 1);
        shootAbilityArrow(monsters, 1, 'multiShot');
        check('Multishot still damages and freezes its target without a separate blue arrow', monsters[0].hp === 99 &&
            monsters[0].freezeRemaining === 9 && !elements.combatPanel.querySelector('.combat-arrow'));
        monsters = fresh({piercingArrow: 1, forkingArrow: 1}, 3, 3);
        shootAbilityArrow(getArrowRowTargets(monsters[0]), 1, 'piercingArrow');
        check('Piercing Arrow keeps its row beam when there are no eligible fork targets',
            Boolean(elements.combatPanel.querySelector('[data-arrow-kind="piercingArrow"]')) &&
            !elements.combatPanel.querySelector('[data-arrow-kind="forkingArrow"]'));

        monsters = fresh({multiShot: 1}); Math.random = () => .75;
        triggerAttackArrowSkills(monsters[0], getDamage());
        check('Multishot always fires one extra arrow at a random living enemy', monsters[4].hp === 100 - getDamage() &&
            monsters.filter(monster => monster.hp < 100).length === 1);
        check('Multishot has no independent projectile animation', !elements.combatPanel.querySelector('[data-arrow-kind="multiShot"]'));
        monsters = fresh({multiShot: 1, forkingArrow: 1}, 8, 4);
        const multiRolls = [0, .5]; // Hit, then skip the separate Forking Arrow proc.
        Math.random = () => multiRolls.length ? multiRolls.shift() : 0;
        shootAbilityArrow([monsters[0]], 1, 'multiShot');
        const multiIncoming = elements.combatPanel.querySelector('[data-arrow-kind="forkingArrow"].is-incoming');
        check('an actual Multishot fork keeps its incoming leg as part of the fork animation', multiIncoming &&
            multiIncoming.dataset.targetId === monsters[0].id && !elements.combatPanel.querySelector('[data-arrow-kind="multiShot"]') &&
            multiIncoming.querySelector('.arrow-shaft') && multiIncoming.querySelector('.arrow-projectile') &&
            Number.parseFloat(multiIncoming.style.getPropertyValue('--arrow-duration')) >= 2000);
        monsters = fresh({multiShot: 1}, 2, 2);
        const values = [0, .99, .6, 0];
        Math.random = () => values.length ? values.shift() : 0;
        state.attackTimer = getAttackSpeed() - .05;
        const effects = simulateCombatStep(.1, true).effects;
        check('a missed normal attack still fires its Multishot arrow', monsters[0].hp === 100 && monsters[1].hp === 100 - getDamage());
        effects.forEach(effect => effect());

        monsters = fresh({multiShot: 1, piercingArrow: 1, forkingArrow: 1, freezingArrows: 1, shockwaveSlash: 1}, 1, 1, {health: 10000});
        let rolls = 0;
        Math.random = () => { if (++rolls > 1000) throw new Error('Recursive arrow procs did not stop.'); return 0; };
        triggerAttackArrowSkills(monsters[0], getDamage());
        check('Multishot triggers other attack skills without recursively firing itself',
            monsters[0].hp === 10000 - getDamage() * 7 && !elements.combatPanel.querySelector('[data-arrow-kind="multiShot"]') && rolls < 100);
        monsters = fresh({multiShot: 1, shockwaveSlash: 1}, 2, 2);
        triggerAttackArrowSkills(monsters[0], getDamage());
        check('Multishot can trigger Shockwave Slash', near(monsters[1].hp, 100 - getDamage() * .33));
        monsters = fresh({piercingArrow: 1, forkingArrow: 1});
        shootAbilityArrow(getArrowRowTargets(monsters[0]), 4, 'piercingArrow');
        check('piercing arrows fork diagonally forward without hitting their initial row twice', monsters.every((monster, index) =>
            monster.hp === (index === 3 ? 100 : 96)));
        monsters = fresh({multiShot: 1, snakeBite: 1, poisonExecute: 1}, 1, 1, {health: 4});
        shootAbilityArrow(monsters, 1, 'multiShot');
        check('arrow hits apply poison and honor Poison Execute without duplicate rewards', monsters[0].hp === 0 && state.kills[map.id] === 1);

        monsters = fresh({freezingArrows: 1}, 1, 1, {attackInterval: 2});
        const monster = monsters[0], beforeSize = elements.combatPanel.getBoundingClientRect();
        shootAbilityArrow([monster], 1, 'piercingArrow');
        check('ability arrows apply nine seconds of freezing and add three seconds to the attack interval',
            monster.freezeRemaining === 9 && getMonsterAttackInterval(monster) === 5);
        renderCombat();
        const card = elements.enemyRoster.querySelector('.enemy-card');
        check('frozen enemies display the status and slower attack interval without changing panel height', card.classList.contains('is-frozen') &&
            !card.querySelector('[data-enemy-freeze-status]').hidden && card.querySelector('[data-enemy-attack-interval]').textContent === '5.0s' &&
            beforeSize.height === elements.combatPanel.getBoundingClientRect().height && Boolean(elements.combatPanel.querySelector('.combat-arrow.is-freezing')));
        getAttackSpeed = () => 1000;
        simulateCombatStep(.1);
        check('freezing slows attack progress in the combat simulation', near(monster.attackTimer, .04) && near(monster.freezeRemaining, 8.9));
        for (let step = 1; step < 90; step++) simulateCombatStep(.1);
        check('freezing expires without releasing a burst of banked attacks', monster.freezeRemaining === 0 &&
            getMonsterAttackInterval(monster) === 2 && state.playerHp === getPlayerMaxHealth() - 1 && near(monster.attackTimer, 1.6));
        applyArrowFreeze(monster); simulateCombatStep(.1); applyArrowFreeze(monster);
        check('repeat hits refresh the duration instead of stacking the slowdown', monster.freezeRemaining === 9 && getMonsterAttackInterval(monster) === 5);
        const hp = monster.hp;
        Math.random = () => .99;
        shootAbilityArrow([monster], 1, 'piercingArrow');
        check('missed arrows do not damage or refresh freezing', monster.hp === hp && monster.freezeRemaining === 9);
        state.skillRanks = {}; monster.freezeRemaining = 0; Math.random = () => 0;
        shootAbilityArrow([monster], 1, 'piercingArrow');
        check('arrows do not freeze without the skill', monster.freezeRemaining === 0);

        state.level = 0; state.skillPoints = 0; state.attackTimer = 0;
        monster.freezeRemaining = 7.5; state.monsterColumns = 3;
        saveGame();
        check('freeze duration, attack progress and formation survive saving and loading', loadGame() &&
            state.monsterStates[0].freezeRemaining === 7.5 && near(state.monsterStates[0].attackTimer, monster.attackTimer) && state.monsterColumns === 3);
        const saved = JSON.parse(localStorage.getItem(saveKey));
        for (const value of [-1, 10, 'invalid', null]) {
            const invalid = JSON.parse(JSON.stringify(saved)); invalid.monsterStates[0].freezeRemaining = value;
            let rejected = false; try { parseGameSave(JSON.stringify(invalid)); } catch { rejected = true; }
            check('invalid frozen status is rejected (' + JSON.stringify(value) + ')', rejected);
        }
        delete saved.monsterColumns; saved.monsterStates.forEach(entry => { delete entry.freezeRemaining; });
        localStorage.setItem(saveKey, JSON.stringify(saved));
        check('older saves load with an unfrozen default formation', loadGame() && state.monsterColumns === 1 && state.monsterStates[0].freezeRemaining === 0);
        state.monsterStates[0].freezeRemaining = 9;
        applyDamageToMonster(state.monsterStates[0], 1000);
        check('death clears freezing before respawn', state.monsterStates[0].freezeRemaining === 0);
        state.combatPaused = true; state.playerHp = 0;
        for (let step = 0; step < 21; step++) simulateCombatStep(.1);
        check('respawned enemies start without freezing', state.monsterStates[0].hp === 100 && state.monsterStates[0].freezeRemaining === 0);

        monsters = fresh({piercingArrow: 1, freezingArrows: 1}, 9);
        renderCombat();
        const rowMonsters = monsters.slice(0, state.monsterColumns);
        if (rowMonsters.length > 1) {
            rowMonsters[0].hp = 0; rowMonsters[0].respawnRemaining = 2;
        }
        shootAbilityArrow(rowMonsters.filter(monster => monster.hp > 0), 1, 'piercingArrow', 1);
        const beams = elements.combatPanel.querySelectorAll('[data-arrow-kind="piercingArrow"]');
        check('piercing draws exactly one full-row beam per cast', beams.length === 1);
        const beam = beams[0], frame = beam.getBoundingClientRect();
        const first = elements.enemyRoster.querySelector('[data-monster-id="' + rowMonsters[0].id + '"]').getBoundingClientRect();
        const last = elements.enemyRoster.querySelector('[data-monster-id="' + rowMonsters[rowMonsters.length - 1].id + '"]').getBoundingClientRect();
        const coordinates = beam.querySelector('path').getAttribute('d').match(/^M([^,]+),([^ ]+) L([^,]+),([^ ]+)/).slice(1).map(Number);
        check('piercing spans the entire row from the first plate left edge to the last plate right edge',
            near(coordinates[0], first.left - frame.left) && near(coordinates[2], last.right - frame.left) &&
            coordinates[2] > coordinates[0] && near(coordinates[1], coordinates[3]) &&
            near(coordinates[1], first.top + first.height / 2 - frame.top));
        check('piercing stays white when Freezing Arrows is allocated', getComputedStyle(beam).color === 'rgb(255, 255, 255)');
        showCombatArrow(monsters[0].id, monsters.at(-1).id, 'forkingArrow', 0);
        const fork = elements.combatPanel.querySelector('[data-arrow-kind="forkingArrow"]');
        check('fork lines render above piercing and remain longer', Number(getComputedStyle(fork).zIndex) > Number(getComputedStyle(beam).zIndex) &&
            near(parseFloat(getComputedStyle(beam).animationDuration), 1.4 * 2 / 3) && parseFloat(getComputedStyle(fork).animationDuration) >= 2);
        const gradient = fork.querySelector('linearGradient');
        const forkCoordinates = fork.querySelector('path').getAttribute('d').match(/^M([^,]+),([^ ]+) L([^,]+),([^ ]+)/).slice(1).map(Number);
        check('the fork fade follows the line from its real source to destination', gradient.getAttribute('gradientUnits') === 'userSpaceOnUse' &&
            ['x1', 'y1', 'x2', 'y2'].every((attribute, index) => near(Number(gradient.getAttribute(attribute)), forkCoordinates[index])) &&
            fork.querySelector('path').style.stroke.includes(gradient.id));
        const stops = [...gradient.children];
        check('fork trail opacity has staggered CSS animations', stops.every(stop =>
            getComputedStyle(stop).animationName === 'arrow-trail-opacity'));
        const animations = fork.getAnimations({subtree: true});
        const seekTrail = time => animations.forEach(animation => { animation.pause(); animation.currentTime = time; });
        const opacity = stop => Number(getComputedStyle(stop).stopOpacity);
        seekTrail(150);
        const shaft = fork.querySelector('.arrow-shaft'), projectile = fork.querySelector('.arrow-projectile');
        const transform = new DOMMatrix(getComputedStyle(projectile).transform);
        check('a bright arrowhead moves from the source along a visibly drawn shaft', Number(getComputedStyle(projectile).opacity) > .9 &&
            parseFloat(getComputedStyle(shaft).strokeDashoffset) > 0 && parseFloat(getComputedStyle(shaft).strokeDashoffset) < 1 &&
            Math.abs(transform.e - (forkCoordinates[0] + (forkCoordinates[2] - forkCoordinates[0]) * .75)) < .01 &&
            Math.abs(transform.f - (forkCoordinates[1] + (forkCoordinates[3] - forkCoordinates[1]) * .75)) < .01);
        check('impact is hidden before the projectile arrives', Number(getComputedStyle(fork.querySelector('.arrow-impact')).opacity) === 0);
        seekTrail(300);
        check('the target flashes when the projectile arrives', Number(getComputedStyle(fork.querySelector('.arrow-impact')).opacity) > .5);
        seekTrail(1100);
        check('the source fades away while the destination stays bright', opacity(stops[0]) < .01 && opacity(stops.at(-1)) > .8);
        seekTrail(1800);
        check('the destination lingers after the rest of the trail fades', opacity(stops.at(-1)) > .1 && opacity(stops.at(-1)) > opacity(stops[0]) &&
            opacity(stops.at(-1)) > opacity(stops[4]));
        animations.forEach(animation => { animation.currentTime = 0; animation.play(); });
        for (const direction of [0, 1, 2, 3]) {
            showCombatArrow(null, monsters[0].id, 'forkingArrow', direction);
            const shot = elements.combatPanel.querySelector('.combat-arrow:last-child');
            const paint = shot.querySelector('linearGradient');
            const x1 = Number(paint.getAttribute('x1')), y1 = Number(paint.getAttribute('y1'));
            const x2 = Number(paint.getAttribute('x2')), y2 = Number(paint.getAttribute('y2'));
            check('directional fade points toward the target from side ' + direction,
                direction === 0 ? x1 < x2 && near(y1, y2) : direction === 1 ? x1 > x2 && near(y1, y2) :
                    direction === 2 ? y1 < y2 && near(x1, x2) : y1 > y2 && near(x1, x2));
        }
        beam.querySelector('path').dispatchEvent(new AnimationEvent('animationend', {bubbles: true}));
        check('finishing the line draw does not dismiss the beam', beam.isConnected);
        await new Promise(resolve => setTimeout(resolve, 750));
        check('both piercing and fork lines survive the previous short display timeout', beam.isConnected && fork.isConnected);
        await new Promise(resolve => setTimeout(resolve, 900));
        check('fork lines outlast piercing lines', !beam.isConnected && fork.isConnected);
        await new Promise(resolve => setTimeout(resolve, 600));
        check('lingering arrows are eventually removed', !fork.isConnected);
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    finally { Math.random = originalRandom; getAttackSpeed = originalSpeed; resetCombatClock(); clearOfflineRecap(); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
