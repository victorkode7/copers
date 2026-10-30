// Combat uses saved grid coordinates, never DOM measurements. Rendering updates
// the column count while playing; background catch-up keeps the saved formation.
const arrowSkillSettings = Object.freeze({piercingChance: 0.3, forkingChance: 0.1, freezeDuration: 9, freezeDelay: 3});
const bowAttackAbilityIds = new Set(['multiShot', 'piercingArrow', 'forkingArrow']);

function getBowDamageMultiplier() {
    return Math.max(0, 1 + getSkillStat('bowDamageIncrease') + getGearStat('bowDamageIncrease'));
}

const arrowTravelDirections = Object.freeze([{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}]);
const arrowVisualDurations = Object.freeze({piercingArrow: 1400 * 2 / 3, forkingArrow: 2000, multiShot: 450});
const arrowImpactPause = 90;
let nextArrowTrailId = 0;

function getArrowFlightTime(kind, sourceId) {
    return kind === 'piercingArrow' ? 160 : sourceId ? 200 : 300;
}

function updateCombatFormation() {
    if (combatCatchingUp || document.hidden || state.currentView !== 'map' || !elements.enemyRoster.clientWidth) return;
    const tracks = getComputedStyle(elements.enemyRoster).gridTemplateColumns;
    if (tracks && tracks !== 'none') {
        state.monsterColumns = Math.max(1, Math.min(state.monsterStates.length, tracks.trim().split(/\s+/).length));
    }
}

function getMonsterGridPosition(monster) {
    const index = state.monsterStates.indexOf(monster);
    const columns = Math.max(1, state.monsterColumns || 1);
    return {row: Math.floor(index / columns), column: index % columns};
}

function getArrowRowTargets(target) {
    const row = getMonsterGridPosition(target).row;
    const columns = Math.max(1, state.monsterColumns || 1);
    return state.monsterStates.slice(row * columns, (row + 1) * columns).filter(monster => monster.hp > 0);
}

function getForwardDiagonalArrowTargets(source, visited, travel) {
    const position = getMonsterGridPosition(source);
    const columns = Math.max(1, state.monsterColumns || 1);
    // Keep the original firing direction for the whole chain. Each fork may
    // choose either forward diagonal, allowing a zigzag without turning back.
    return [{x: -1, y: -1}, {x: 1, y: -1}, {x: -1, y: 1}, {x: 1, y: 1}]
        .filter(offset => offset.x * travel.x + offset.y * travel.y > 0)
        .map(offset => {
            const row = position.row + offset.y, column = position.column + offset.x;
            return row >= 0 && column >= 0 && column < columns
                ? state.monsterStates[row * columns + column] : null;
        })
        .filter(monster => monster && monster.hp > 0 && !visited.has(monster.id));
}

function getMonsterAttackInterval(monster) {
    return monsterDefinition(monster).attackInterval +
        (monster.freezeRemaining > 0 ? arrowSkillSettings.freezeDelay : 0);
}

function applyArrowFreeze(monster) {
    if (getSkillNodeRank('freezingArrows') <= 0 || monster.hp <= 0) return;
    // Refresh the duration; repeated arrows never stack the slowdown.
    monster.freezeRemaining = arrowSkillSettings.freezeDuration;
}

function shootAbilityArrow(targets, damage, kind, direction = 0) {
    if (!targets.length) return;
    if (kind === 'piercingArrow') {
        direction = 0;
        // One full-row beam, regardless of how many enemies it hits or misses.
        showCombatArrow(null, targets[0].id, kind, direction);
    }
    // Reserve piercing's initial row so a fork cannot hit a row target twice.
    const visited = new Set(targets.map(monster => monster.id));
    const queue = targets.map(target => ({target, sourceId: null, kind, travel: arrowTravelDirections[direction], visualDelay: 0}));
    const canFork = getSkillNodeRank('forkingArrow') > 0;
    const visualShots = [];
    for (let index = 0; index < queue.length; index++) {
        const shot = queue[index], target = shot.target;
        if (target.hp <= 0) continue;
        if (shot.kind !== 'piercingArrow') visualShots.push(shot);
        if (Math.random() * 100 >= getHitChance(getPlayerAccuracy(), monsterDefinition(target).evasion)) {
            presentCombatEffect(() => {
                const card = getCombatEffectCard(target.id);
                if (card) flashDodge(card.querySelector('.health-track'));
            });
            continue;
        }
        if (shot.kind === 'multiShot') showMonsterHitBadge(target.id, 'MULTISHOT');
        applyDamageToMonster(target, damage, 'physical', shot.kind);
        applyArrowFreeze(target);
        // Only Multishot's original arrow rolls attack procs. Generated arrows
        // still poison, freeze and fork, but cannot recursively cast Multishot.
        if (shot.kind === 'multiShot') {
            triggerShockwaveSlash(target, damage);
            triggerVolcanicEruption(target, damage);
            triggerAttackArrowSkills(target, damage, false);
        }
        if (canFork) {
            const adjacent = getForwardDiagonalArrowTargets(target, visited, shot.travel);
            if (adjacent.length) {
                const next = adjacent[Math.floor(Math.random() * adjacent.length)];
                visited.add(next.id);
                queue.push({target: next, sourceId: target.id, kind: 'forkingArrow',
                    travel: shot.travel,
                    visualDelay: shot.visualDelay + getArrowFlightTime(shot.kind, shot.sourceId) + arrowImpactPause});
            }
        }
    }
    // Only animate a fork when an arrow actually travels to a
    // second living target. Keep the final hop visible even if it cannot fork again.
    const forked = visualShots.some(shot => shot.sourceId);
    visualShots.forEach(shot => {
        // Multishot has no separate projectile effect. If it forks, show its
        // incoming leg as part of that real fork chain so the origin stays clear.
        if (shot.kind === 'multiShot' && !forked) return;
        if (shot.kind === 'forkingArrow' && !shot.sourceId && !forked) return;
        const visualKind = shot.kind === 'multiShot' ? 'forkingArrow' : shot.kind;
        showCombatArrow(shot.sourceId, shot.target.id, visualKind, direction, {delay: shot.visualDelay});
    });
}

function triggerAttackArrowSkills(target, damage, includeMultishot = true) {
    if (getSkillNodeRank('piercingArrow') > 0 && Math.random() < arrowSkillSettings.piercingChance) {
        shootAbilityArrow(getArrowRowTargets(target), damage * 2, 'piercingArrow');
    }
    if (getSkillNodeRank('forkingArrow') > 0 && Math.random() < arrowSkillSettings.forkingChance) {
        const living = state.monsterStates.filter(monster => monster.hp > 0);
        if (living.length) {
            const enemy = living[Math.floor(Math.random() * living.length)];
            const direction = Math.floor(Math.random() * 4);
            shootAbilityArrow([enemy], damage, 'forkingArrow', direction);
        }
    }
    if (includeMultishot && getSkillNodeRank('multiShot') > 0) {
        const living = state.monsterStates.filter(monster => monster.hp > 0);
        if (living.length) shootAbilityArrow([living[Math.floor(Math.random() * living.length)]], damage, 'multiShot');
    }
}

function showCombatArrow(sourceId, targetId, kind, direction, visual = {}) {
    if (!combatEffectEnabled('projectiles')) return;
    const mapId = state.selectedMap, freezing = getSkillNodeRank('freezingArrows') > 0;
    const columns = Math.max(1, state.monsterColumns || 1);
    const targetMonster = state.monsterStates.find(monster => monster.id === targetId);
    const row = getMonsterGridPosition(targetMonster).row;
    const rowIds = kind === 'piercingArrow'
        ? state.monsterStates.slice(row * columns, (row + 1) * columns).map(monster => monster.id) : [];
    presentCombatEffect(() => {
        if (document.hidden || state.currentView !== 'map' || state.selectedMap !== mapId) return;
        const target = getCombatEffectCard(targetId)?.querySelector('.enemy-mark');
        const source = getCombatEffectCard(sourceId)?.querySelector('.enemy-mark');
        if (!target) return;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('combat-arrow');
        svg.classList.toggle('is-freezing', freezing);
        const directed = kind === 'forkingArrow';
        svg.classList.toggle('is-directed', Boolean(directed));
        svg.classList.toggle('is-incoming', Boolean(directed && !sourceId));
        svg.dataset.arrowKind = kind;
        svg.dataset.targetId = targetId;
        if (sourceId) svg.dataset.sourceId = sourceId;
        const duration = directed ? arrowVisualDurations.forkingArrow : arrowVisualDurations[kind] || 450;
        const delay = visual.delay || 0;
        const flight = getArrowFlightTime(kind, sourceId);
        svg.style.setProperty('--arrow-duration', duration + 'ms');
        svg.style.setProperty('--arrow-delay', delay + 'ms');
        svg.style.setProperty('--arrow-flight', flight + 'ms');
        svg.style.setProperty('--arrow-impact-delay', delay + flight + 'ms');
        svg.setAttribute('aria-hidden', 'true');
        elements.combatPanel.append(svg);
        const frame = getCombatOverlayBounds(svg), to = getCombatEffectBounds(target);
        if (!frame.width || !frame.height) { svg.remove(); return; }
        svg.setAttribute('viewBox', '0 0 ' + frame.width + ' ' + frame.height);
        let end = {x: to.left + to.width / 2 - frame.left, y: to.top + to.height / 2 - frame.top};
        const starts = [{x: 4, y: end.y}, {x: frame.width - 4, y: end.y},
            {x: end.x, y: 4}, {x: end.x, y: frame.height - 4}];
        let start = starts[direction] || starts[0];
        if (kind === 'piercingArrow') {
            const first = getCombatEffectCard(rowIds[0]);
            const last = getCombatEffectCard(rowIds[rowIds.length - 1]);
            if (!first || !last) { svg.remove(); return; }
            const firstBounds = getCombatEffectBounds(first), lastBounds = getCombatEffectBounds(last);
            const y = firstBounds.top + firstBounds.height / 2 - frame.top;
            start = {x: firstBounds.left - frame.left, y};
            end = {x: lastBounds.right - frame.left, y};
        } else if (source) {
            const from = getCombatEffectBounds(source);
            start = {x: from.left + from.width / 2 - frame.left, y: from.top + from.height / 2 - frame.top};
        } else if (directed) {
            // Keep the incoming approach near its target, rather than starting
            // below a tall encounter where the player cannot see it arrive.
            const visibleLeft = Math.max(8, 8 - frame.left), visibleRight = Math.min(frame.width - 8, innerWidth - frame.left - 8);
            const visibleTop = Math.max(8, 8 - frame.top), visibleBottom = Math.min(frame.height - 8, innerHeight - frame.top - 8);
            const horizontalVisible = end.x >= visibleLeft && end.x <= visibleRight;
            const verticalVisible = end.y >= visibleTop && end.y <= visibleBottom;
            const left = horizontalVisible ? visibleLeft : 8, right = horizontalVisible ? visibleRight : frame.width - 8;
            const top = verticalVisible ? visibleTop : 8, bottom = verticalVisible ? visibleBottom : frame.height - 8;
            start = [{x: Math.max(left, end.x - 160), y: end.y}, {x: Math.min(right, end.x + 160), y: end.y},
                {x: end.x, y: Math.max(top, end.y - 160)}, {x: end.x, y: Math.min(bottom, end.y + 160)}][direction] || starts[0];
        }
        const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
        const dx = (end.x - start.x) / length, dy = (end.y - start.y) / length;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M${start.x},${start.y} L${end.x},${end.y}` + (directed ? '' :
            ` M${end.x - dx * 11 - dy * 5},${end.y - dy * 11 + dx * 5} L${end.x},${end.y} L${end.x - dx * 11 + dy * 5},${end.y - dy * 11 - dx * 5}`));
        path.setAttribute('pathLength', '1');
        if (directed) {
            path.classList.add('arrow-shaft');
            addDirectionalArrowTrail(svg, path, start, end, duration, delay, flight);
        }
        svg.append(path);
        if (directed) addArrowProjectile(svg, start, end, !sourceId);
        svg.addEventListener('animationend', event => { if (event.target === svg) svg.remove(); });
        window.setTimeout(() => svg.remove(), delay + duration + 150);
    });
}

function addDirectionalArrowTrail(svg, path, start, end, duration, delay, flight) {
    const namespace = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(namespace, 'defs');
    const gradient = document.createElementNS(namespace, 'linearGradient');
    gradient.id = 'combat-arrow-trail-' + ++nextArrowTrailId;
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    gradient.setAttribute('x1', String(start.x));
    gradient.setAttribute('y1', String(start.y));
    gradient.setAttribute('x2', String(end.x));
    gradient.setAttribute('y2', String(end.y));
    // The moving shaft reveals a bright trail immediately. Fade its origin
    // first and preserve the destination after the arrow has arrived.
    for (let index = 0; index <= 8; index++) {
        const progress = index / 8;
        const stop = document.createElementNS(namespace, 'stop');
        stop.setAttribute('offset', String(progress));
        stop.setAttribute('stop-color', 'currentColor');
        stop.classList.add('arrow-trail-stop');
        stop.style.setProperty('--trail-delay', delay + progress * flight + 'ms');
        stop.style.setProperty('--trail-duration', duration * .5 + progress * (duration * .5 - flight) + 'ms');
        gradient.append(stop);
    }
    defs.append(gradient);
    svg.append(defs);
    path.style.stroke = 'url(#' + gradient.id + ')';
}

function addArrowProjectile(svg, start, end, incoming) {
    const namespace = 'http://www.w3.org/2000/svg';
    svg.style.setProperty('--arrow-start-x', start.x + 'px');
    svg.style.setProperty('--arrow-start-y', start.y + 'px');
    svg.style.setProperty('--arrow-end-x', end.x + 'px');
    svg.style.setProperty('--arrow-end-y', end.y + 'px');
    svg.style.setProperty('--arrow-angle', Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI + 'deg');
    if (incoming) {
        const origin = document.createElementNS(namespace, 'circle');
        origin.classList.add('arrow-origin');
        origin.setAttribute('cx', String(start.x)); origin.setAttribute('cy', String(start.y)); origin.setAttribute('r', '5');
        svg.append(origin);
    }
    const projectile = document.createElementNS(namespace, 'g');
    projectile.classList.add('arrow-projectile');
    const head = document.createElementNS(namespace, 'path');
    head.setAttribute('d', 'M3,0 L-16,-8 L-11,0 L-16,8 Z');
    projectile.append(head); svg.append(projectile);
    const impact = document.createElementNS(namespace, 'circle');
    impact.classList.add('arrow-impact');
    impact.setAttribute('cx', String(end.x)); impact.setAttribute('cy', String(end.y)); impact.setAttribute('r', '10');
    svg.append(impact);
}
