const eruptionSkillSettings = Object.freeze({damageMultiplier: 1, healthCost: 0.05, chainDelay: 1000, trailDuration: 2000});
let nextEruptionTrailId = 0;

function getMaxEruptionChains() {
    return Math.max(0, Math.floor(getSkillStat('eruptionChains')));
}

function getEruptionTargets(center) {
    const origin = getMonsterGridPosition(center);
    const columns = Math.max(1, state.monsterColumns || 1);
    return state.monsterStates.filter((monster, index) => {
        if (monster.hp <= 0) return false;
        return Math.abs(Math.floor(index / columns) - origin.row) + Math.abs(index % columns - origin.column) <= 1;
    });
}

function triggerVolcanicEruption(target, damage) {
    if (getSkillNodeRank('volcanicEruption') <= 0 || !target || state.playerHp <= 0) return;
    detonateEruption(target, damage);
    queueEruptionChain(target.id, damage, getMaxEruptionChains());
    // Each triggering hit pays once, regardless of splash targets or chains.
    applyDamageToPlayer(getPlayerMaxHealth() * eruptionSkillSettings.healthCost, 'self');
}

function detonateEruption(center, damage) {
    const targets = getEruptionTargets(center);
    showVolcanicEruption(center.id, targets.map(monster => monster.id));
    targets.forEach(monster => {
        applyDamageToMonster(monster, damage * eruptionSkillSettings.damageMultiplier, 'physical', 'volcanicEruption');
    });
}

function queueEruptionChain(sourceId, damage, chains) {
    if (chains <= 0) return;
    const living = state.monsterStates.filter(monster => monster.hp > 0);
    if (!living.length) return;
    const target = living[Math.floor(Math.random() * living.length)];
    state.pendingEruptions.push({targetId: target.id, damage, chainsRemaining: chains - 1,
        remaining: eruptionSkillSettings.chainDelay / 1000});
    showEruptionChain(sourceId, target.id, 0);
}

function tickPendingEruptions(elapsed) {
    let remaining = elapsed;
    while (state.pendingEruptions.length) {
        const nextArrival = Math.min(...state.pendingEruptions.map(hit => hit.remaining));
        const step = Math.min(remaining, nextArrival);
        state.pendingEruptions.forEach(hit => { hit.remaining = Math.max(0, hit.remaining - step); });
        remaining -= step;
        const arrived = state.pendingEruptions.filter(hit => hit.remaining < 1e-8);
        state.pendingEruptions = state.pendingEruptions.filter(hit => hit.remaining >= 1e-8);
        if (!arrived.length) break;
        arrived.forEach(hit => {
            const center = state.monsterStates.find(monster => monster.id === hit.targetId);
            if (!center) return;
            // The crack erupts at its destination even if that monster died en route.
            detonateEruption(center, hit.damage);
            queueEruptionChain(center.id, hit.damage, hit.chainsRemaining);
        });
        if (remaining < 1e-8) break;
    }
}

function showVolcanicEruption(centerId, targetIds) {
    if (!combatEffectEnabled('abilities')) return;
    const mapId = state.selectedMap;
    presentCombatEffect(() => {
        if (document.hidden || state.currentView !== 'map' || state.selectedMap !== mapId) return;
        if(window.CombatWebGLEffects?.eruption(centerId,targetIds))return;
        const ids = new Set([centerId, ...targetIds]);
        ids.forEach(id => {
            const card = getCombatEffectCard(id);
            if (!card) return;
            const isCenter = card.dataset.monsterId === centerId;
            const burst = document.createElement('span');
            burst.className = 'eruption-burst';
            burst.classList.toggle('is-center', isCenter);
            burst.setAttribute('aria-hidden', 'true');
            burst.dataset.eruptionCenter = centerId;
            card.appendChild(burst);
            burst.addEventListener('animationend', () => burst.remove(), {once: true});
            window.setTimeout(() => burst.remove(), 950);
        });
    });
}

function createEruptionCrackPoints(start, end) {
    const dx = end.x - start.x, dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const segments = Math.max(4, Math.min(24, Math.ceil(length / 34)));
    // Cosmetic randomness must not consume combat rolls or change offline results.
    const noise = crypto.getRandomValues(new Uint32Array(segments * 2));
    const amplitude = Math.min(12, length * .06);
    const points = [start];
    let offset = 0;
    for (let index = 1; index < segments; index++) {
        const progress = (index + (noise[index * 2] / 4294967296 - .5) * .5) / segments;
        // Let the fault wander instead of alternating left/right like lightning.
        offset = offset * .5 + (noise[index * 2 + 1] / 4294967296 * 2 - 1) * amplitude * .75;
        points.push({x: start.x + dx * progress - dy / length * offset,
            y: start.y + dy * progress + dx / length * offset});
    }
    points.push(end);
    return points;
}

function createEruptionFissure(points) {
    const noise = crypto.getRandomValues(new Uint32Array(points.length * 2));
    const left = [], right = [];
    points.forEach((point, index) => {
        const before = points[Math.max(0, index - 1)], after = points[Math.min(points.length - 1, index + 1)];
        const dx = after.x - before.x, dy = after.y - before.y, length = Math.hypot(dx, dy) || 1;
        const taper = index === 0 || index === points.length - 1 ? .15 : 1;
        const a = (.7 + noise[index * 2] / 4294967296 * 2.2) * taper;
        const b = (.7 + noise[index * 2 + 1] / 4294967296 * 2.2) * taper;
        left.push({x: point.x - dy / length * a, y: point.y + dx / length * a});
        right.push({x: point.x + dy / length * b, y: point.y - dx / length * b});
    });
    return [...left, ...right.reverse()].map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ') + ' Z';
}

function addEruptionCrackTrail(svg, path, start, end, delay) {
    const namespace = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(namespace, 'defs');
    const gradient = document.createElementNS(namespace, 'linearGradient');
    gradient.id = 'eruption-crack-trail-' + ++nextEruptionTrailId;
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    gradient.setAttribute('x1', String(start.x)); gradient.setAttribute('y1', String(start.y));
    gradient.setAttribute('x2', String(end.x)); gradient.setAttribute('y2', String(end.y));
    for (let index = 0; index <= 36; index++) {
        const progress = index / 36;
        const stop = document.createElementNS(namespace, 'stop');
        stop.setAttribute('offset', String(progress));
        stop.setAttribute('stop-color', 'currentColor');
        stop.classList.add('eruption-trail-stop');
        stop.style.setProperty('--trail-delay', delay + progress * eruptionSkillSettings.chainDelay + 'ms');
        // Keep the glow near the advancing edge, fading twice as quickly.
        stop.style.setProperty('--trail-duration', eruptionSkillSettings.chainDelay / 6 + 'ms');
        gradient.append(stop);
    }
    defs.append(gradient); svg.append(defs);
    path.style.stroke = 'url(#' + gradient.id + ')';
}

function showEruptionChain(sourceId, targetId, delay) {
    if (!combatEffectEnabled('abilities')) return;
    if (sourceId === targetId) return;
    const mapId = state.selectedMap;
    presentCombatEffect(() => {
        if (document.hidden || state.currentView !== 'map' || state.selectedMap !== mapId) return;
        const source = getCombatEffectCard(sourceId);
        const target = getCombatEffectCard(targetId);
        if (!source || !target) return;
        if (window.CombatSettings?.renderer() !== 'svg' && window.CombatWebGL) {
            const frame = getCombatEffectBounds(elements.combatPanel);
            const from = getCombatEffectBounds(source), to = getCombatEffectBounds(target);
            const start = {x: from.left + from.width / 2 - frame.left, y: from.top + from.height / 2 - frame.top};
            const end = {x: to.left + to.width / 2 - frame.left, y: to.top + to.height / 2 - frame.top};
            if (CombatWebGL.eruptionChain({panel: elements.combatPanel, points: createEruptionCrackPoints(start, end),
                delay, flight: eruptionSkillSettings.chainDelay, duration: eruptionSkillSettings.trailDuration})) return;
        }
        const namespace = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(namespace, 'svg');
        svg.classList.add('eruption-chain');
        svg.dataset.sourceId = sourceId;
        svg.dataset.targetId = targetId;
        svg.setAttribute('aria-hidden', 'true');
        svg.style.setProperty('--eruption-delay', delay + 'ms');
        svg.style.setProperty('--eruption-flight', eruptionSkillSettings.chainDelay + 'ms');
        svg.style.setProperty('--eruption-trail-duration', eruptionSkillSettings.trailDuration + 'ms');
        elements.combatPanel.append(svg);
        const frame = getCombatOverlayBounds(svg);
        if (!frame.width || !frame.height) { svg.remove(); return; }
        svg.setAttribute('viewBox', '0 0 ' + frame.width + ' ' + frame.height);
        const from = getCombatEffectBounds(source), to = getCombatEffectBounds(target);
        const start = {x: from.left + from.width / 2 - frame.left, y: from.top + from.height / 2 - frame.top};
        const end = {x: to.left + to.width / 2 - frame.left, y: to.top + to.height / 2 - frame.top};
        const points = createEruptionCrackPoints(start, end);
        const centerPath = points.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' ');
        const line = document.createElementNS(namespace, 'path');
        line.classList.add('eruption-crack-core');
        line.setAttribute('d', centerPath);
        line.setAttribute('pathLength', '1');
        addEruptionCrackTrail(svg, line, start, end, delay);
        const mask = document.createElementNS(namespace, 'mask');
        mask.id = 'eruption-opening-' + ++nextEruptionTrailId;
        mask.setAttribute('maskUnits', 'userSpaceOnUse');
        mask.setAttribute('x', '0'); mask.setAttribute('y', '0');
        mask.setAttribute('width', String(frame.width)); mask.setAttribute('height', String(frame.height));
        const opening = document.createElementNS(namespace, 'path');
        opening.classList.add('eruption-crack-reveal');
        opening.setAttribute('d', centerPath); opening.setAttribute('pathLength', '1');
        mask.append(opening); svg.querySelector('defs').append(mask);
        const edge = document.createElementNS(namespace, 'path');
        edge.classList.add('eruption-crack-edge');
        edge.setAttribute('d', createEruptionFissure(points));
        edge.setAttribute('mask', 'url(#' + mask.id + ')');
        svg.append(edge, line);
        svg.addEventListener('animationend', event => { if (event.target === svg) svg.remove(); });
        window.setTimeout(() => svg.remove(), delay + eruptionSkillSettings.trailDuration + 150);
    });
}
