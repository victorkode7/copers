// Combat uses saved grid coordinates, never DOM measurements. Rendering updates
// the column count while playing; background catch-up keeps the saved formation.
const arrowSkillSettings = Object.freeze({piercingChance: 0.3, forkingChance: 0.1, freezeDuration: 9, freezeDelay: 3});
const bowAttackAbilityIds = new Set(['multiShot', 'piercingArrow', 'forkingArrow']);

function getBowDamageMultiplier() {
    return CombatHealth.getBowDamageMultiplier(getSkillStat('bowDamageIncrease'), getGearStat('bowDamageIncrease'));
}

const arrowTravelDirections = Object.freeze([{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}]);
const arrowVisualDurations = Object.freeze({piercingArrow: 1400 * 2 / 3, forkingArrow: 2000, multiShot: 450});
const arrowImpactPause = 90;
let nextArrowTrailId = 0;

function getArrowFlightTime(kind, sourceId) {
    return kind === 'piercingArrow' ? 160 : sourceId ? 200 : 300;
}

function updateCombatFormation() {
    if (combatCatchingUp || document.hidden || !isCombatView() || !elements.enemyRoster.clientWidth) return;
    const tracks = getComputedStyle(elements.enemyRoster).gridTemplateColumns;
    if (tracks && tracks !== 'none') {
        state.monsterColumns = Math.max(1, Math.min(state.monsterStates.length, tracks.trim().split(/\s+/).length));
    }
}

function getMonsterGridPosition(monster) {
    return combatAbilities.getMonsterGridPosition(monster);
}

function getArrowRowTargets(target) {
    return combatAbilities.getArrowRowTargets(target);
}

function getForwardDiagonalArrowTargets(source, visited, travel) {
    return combatAbilities.getForwardDiagonalArrowTargets(source, visited, travel);
}

function getMonsterAttackInterval(monster) {
    return combatAbilities.getMonsterAttackInterval(monster);
}

function applyArrowFreeze(monster) {
    return combatAbilities.applyArrowFreeze(monster);
}

function shootAbilityArrow(targets, damage, kind, direction = 0) {
    return combatAbilities.shootAbilityArrow(targets, damage, kind, direction);
}

function triggerAttackArrowSkills(target, damage, includeMultishot = true) {
    return combatAbilities.triggerAttackArrowSkills(target, damage, includeMultishot);
}

function showCombatArrow(sourceId, targetId, kind, direction, visual = {}) {
    if (combatEffects === null) return;
    const targetMonster = state.monsterStates.find(monster => monster.id === targetId);
    if (!targetMonster) return;
    const columns = Math.max(1, state.monsterColumns || 1);
    const row = getMonsterGridPosition(targetMonster).row;
    const rowIds = kind === 'piercingArrow'
        ? state.monsterStates.slice(row * columns, (row + 1) * columns).map(monster => monster.id) : [];
    emitCombatEvent('arrowFired', {
        mapId: state.selectedMap, sourceId, targetId, kind, direction, rowIds,
        freezing: getSkillNodeRank('freezingArrows') > 0,
        delay: visual.delay || 0, duration: arrowVisualDurations[kind] || 450,
        flight: getArrowFlightTime(kind, sourceId)
    });
}

function presentCombatArrow({mapId, sourceId, targetId, kind, direction, rowIds, freezing, delay, duration, flight}) {
    if (!combatEffectEnabled('projectiles')) return;
    if (document.hidden || !isCombatView() || state.selectedMap !== mapId) return;
    if (!getCombatEffectMonster(targetId) || sourceId && !getCombatEffectMonster(sourceId)) return;
    const target = getCombatEffectCard(targetId)?.querySelector('.enemy-mark');
    const source = getCombatEffectCard(sourceId)?.querySelector('.enemy-mark');
    if (!target || sourceId && !source) return;
    if(window.CombatWebGLEffects?.arrow({source,target,rowIds,kind,direction,delay,duration,flight,freezing,sourceId}))return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('combat-arrow');
    svg.classList.toggle('is-freezing', freezing);
    const directed = kind === 'forkingArrow';
    svg.classList.toggle('is-directed', Boolean(directed));
    svg.classList.toggle('is-incoming', Boolean(directed && !sourceId));
    svg.dataset.arrowKind = kind;
    svg.dataset.targetId = targetId;
    if (sourceId) svg.dataset.sourceId = sourceId;
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
