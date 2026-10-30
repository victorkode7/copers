const shieldSlamVisualSettings = Object.freeze({maximumWaves:6, maximumImpacts:12});

function showShieldSlamWave(hitIds) {
    if (!combatEffectEnabled('abilities')) return;
    if (!hitIds.length) return;
    const mapId = state.selectedMap;
    presentCombatEffect(() => {
        if (document.hidden || state.currentView !== 'map' || state.selectedMap !== mapId) return;
        const cards = hitIds.map(id => getCombatEffectCard(id)).filter(Boolean);
        if (!cards.length) return;
        const existing = elements.combatPanel.querySelectorAll('.shield-slam-wave');
        for (let index = 0; index <= existing.length - shieldSlamVisualSettings.maximumWaves; index++) existing[index].remove();
        const namespace = 'http://www.w3.org/2000/svg';
        function shape(tag, className, attributes = {}) {
            const element = document.createElementNS(namespace, tag);
            element.setAttribute('class', className);
            Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
            return element;
        }
        const svg = shape('svg', 'shield-slam-wave', {'aria-hidden':'true', focusable:'false'});
        svg.dataset.hitIds = hitIds.join(' ');
        const count = Math.min(cards.length, shieldSlamVisualSettings.maximumImpacts);
        const spacing = count > 1 ? Math.min(90, 540 / (count - 1)) : 0;
        const duration = 680 + spacing * (count - 1);
        svg.style.setProperty('--shield-slam-duration', duration + 'ms');
        elements.combatPanel.append(svg);
        const frame = getCombatOverlayBounds(svg);
        if (!frame.width || !frame.height) { svg.remove(); return; }
        svg.setAttribute('viewBox', '0 0 ' + frame.width + ' ' + frame.height);
        // Keep the first and last impacts when long overkill chains need sampling.
        for (let index = 0; index < count; index++) {
            const card = cards[Math.round(index * (cards.length - 1) / Math.max(1, count - 1))];
            const box = getCombatEffectBounds(card);
            const x = box.left + box.width / 2 - frame.left;
            const y = box.top + box.height / 2 - frame.top;
            const scale = Math.min(1.1, box.width / 150, box.height / 110);
            const impact = shape('g', 'shield-slam-impact', {transform:`translate(${x} ${y}) scale(${scale})`});
            impact.dataset.monsterId = card.dataset.monsterId;
            impact.style.setProperty('--shield-slam-delay', Math.round(index * spacing) + 'ms');
            const halo = shape('ellipse', 'shield-slam-pressure', {cx:0, cy:23, rx:43, ry:18});
            const shield = shape('g', 'shield-slam-stamp');
            shield.append(
                shape('path', 'shield-slam-face', {d:'M0,-38 L29,-28 L26,7 Q23,28 0,40 Q-23,28 -26,7 L-29,-28 Z'}),
                shape('path', 'shield-slam-rim', {d:'M0,-31 L22,-23 L20,7 Q17,23 0,32 Q-17,23 -20,7 L-22,-23 Z'}),
                shape('path', 'shield-slam-emblem', {d:'M0,-20 L6,-4 L17,0 L6,5 L0,22 L-6,5 L-17,0 L-6,-4 Z'})
            );
            impact.append(halo, shield);
            // Six pieces burst out after impact, without consuming combat's random rolls.
            for (let shardIndex = 0; shardIndex < 6; shardIndex++) {
                const angle = shardIndex * Math.PI / 3 - Math.PI / 2;
                const shard = shape('path', 'shield-slam-shard', {d:'M-4,-8 L5,-4 L2,8 L-3,3 Z'});
                shard.style.setProperty('--shard-x', (Math.cos(angle) * 57).toFixed(2) + 'px');
                shard.style.setProperty('--shard-y', (Math.sin(angle) * 48).toFixed(2) + 'px');
                shard.style.setProperty('--shard-angle', (shardIndex * 60 + 35) + 'deg');
                impact.append(shard);
            }
            svg.append(impact);
        }
        svg.addEventListener('animationend', event => { if (event.target === svg) svg.remove(); });
        window.setTimeout(() => svg.remove(), duration + 100);
    });
}
