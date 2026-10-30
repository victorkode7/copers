(function () {
    'use strict';
    const root = document.createElement('div'); root.className = 'loot-effects';
    const row = document.createElement('div'); row.className = 'loot-drop-row';
    row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Recent loot'); row.hidden = true;
    root.append(row); document.body.append(root);
    const active = new Map(), flashes = new Map();
    const rarityOrder = {common: 0, uncommon: 1, rare: 2, epic: 3, unique: 4};
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const number = value => new Intl.NumberFormat('en-US').format(value);
    let mapId, lastPosition;

    function statusBounds() {
        const bounds = document.getElementById('combatStatus')?.getBoundingClientRect();
        return bounds?.width && bounds.height && bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth ? bounds : null;
    }
    function remove(token) {
        if (active.get(token.key) !== token) return;
        active.delete(token.key);
        if (token.animation) { token.animation.onfinish = null; token.animation.cancel(); }
        token.node.remove();
    }
    function dismiss(token) { remove(token); reposition(); }
    function fadeOut(token) {
        if (token.dismissing || active.get(token.key) !== token) return;
        token.dismissing = true;
        const opacity = getComputedStyle(token.node).opacity;
        if (token.animation) { token.animation.onfinish = null; token.animation.cancel(); }
        token.node.disabled = true;
        token.node.classList.add('is-dismissing');
        token.animation = token.node.animate([{opacity}, {opacity: 0}], {duration: 260, easing: 'ease-out', fill: 'forwards'});
        token.animation.onfinish = () => dismiss(token);
    }
    function clear() {
        for (const token of [...active.values()]) remove(token);
        root.getAnimations({subtree: true}).forEach(animation => animation.cancel());
        active.clear(); flashes.clear(); row.replaceChildren(); root.replaceChildren(row);
        row.hidden = true; lastPosition = null;
    }
    function sync(activeView, nextMapId) {
        if (!activeView || nextMapId !== mapId) clear();
        else reposition();
        mapId = nextMapId;
    }
    function reposition() {
        const bounds = statusBounds(), viewportWidth = document.documentElement.clientWidth;
        if (!bounds) {
            // Unique rewards survive scrolling; normal drops remain transient.
            for (const token of [...active.values()]) if (!token.persistent) remove(token);
        }
        row.hidden = active.size === 0;
        if (active.size) {
            const idealWidth = [...active.values()].reduce((total, token) => total + (token.reward.equipment ? 112 : token.reward.gold ? 48 : 40), 0) + (active.size - 1) * 6;
            const width = Math.min(viewportWidth - 24, idealWidth);
            const beside = bounds && bounds.right + 12 + width <= viewportWidth - 12;
            const x = bounds ? (beside ? bounds.right + 12 : Math.max(12, Math.min(viewportWidth - width - 12, bounds.left))) : (lastPosition?.x || 12);
            const y = bounds ? (beside ? bounds.top + bounds.height / 2 - 32 : bounds.bottom + 12) : (lastPosition?.y || 12);
            row.style.width = width + 'px';
            row.style.left = Math.max(12, Math.min(viewportWidth - width - 12, x)) + 'px';
            row.style.top = Math.max(8, Math.min(innerHeight - 112, y)) + 'px';
            lastPosition = {x: parseFloat(row.style.left), y: parseFloat(row.style.top)};
        }
        for (const [card, effect] of flashes) {
            const rect = card.getBoundingClientRect();
            Object.assign(effect.node.style, {left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px'});
        }
    }
    function flash(source, reward) {
        if (window.CombatSettings?.enabled('glows') === false) return;
        const card = source?.closest('.enemy-card');
        if (!card || reducedMotion()) return;
        if(window.CombatWebGLEffects?.lootFlash(card,reward.rarity))return;
        const previous = flashes.get(card);
        if (previous) { previous.animation.cancel(); previous.node.remove(); }
        const bounds = card.getBoundingClientRect(), node = document.createElement('span');
        node.className = 'loot-plate-flash'; node.dataset.rarity = reward.rarity; node.setAttribute('aria-hidden', 'true');
        Object.assign(node.style, {left: bounds.left + 'px', top: bounds.top + 'px', width: bounds.width + 'px', height: bounds.height + 'px'});
        root.prepend(node);
        const animation = node.animate([{opacity: 0}, {opacity: 1, offset: .2}, {opacity: 0}], {duration: 700, easing: 'ease-out'});
        const effect = {node, animation}; flashes.set(card, effect);
        animation.onfinish = () => {
            node.remove(); animation.cancel();
            if (flashes.get(card) === effect) flashes.delete(card);
        };
    }
    function drop(rewards, source, nextMapId) {
        if (window.CombatSettings?.enabled() === false) return;
        if (document.hidden || !rewards.length) return;
        sync(true, nextMapId);
        const now = performance.now(), visibleStatus = statusBounds();
        const equipment = rewards.filter(reward => reward.equipment)
            .sort((a, b) => (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0));
        const materials = rewards.filter(reward => !reward.gold && !reward.equipment);
        const visible = [...rewards.filter(reward => reward.gold), ...materials,
            ...equipment.filter(reward => reward.rarity === 'unique'),
            ...equipment.filter(reward => reward.rarity !== 'unique').slice(0, 2)];
        const special = equipment.find(reward => rarityOrder[reward.rarity] >= 2);
        if (visibleStatus && special) flash(source, special);
        visible.forEach(reward => {
            const persistent = Boolean(reward.equipment && reward.rarity === 'unique');
            if (!visibleStatus && !persistent) return;
            const key = reward.key, previous = active.get(key);
            if (previous && !previous.dismissing && (previous.persistent || now - previous.created < 700)) {
                previous.reward.amount += reward.amount;
                previous.quantity.textContent = (reward.gold ? '+' : '×') + number(previous.reward.amount);
                return;
            }
            if (previous) remove(previous);
            if (active.size >= 18) {
                const ordinary = [...active.values()].find(token => !token.persistent);
                if (reward.equipment && ordinary) remove(ordinary);
                else if (!persistent) return;
            }
            const node = document.createElement(persistent ? 'button' : 'span');
            node.className = 'loot-drop ' + (reward.gold ? 'loot-drop-gold' : reward.equipment ? 'loot-drop-equipment' : 'loot-drop-material');
            node.dataset.lootKey = reward.key; node.dataset.lootSource = 'combatStatus';
            if (reward.rarity) node.dataset.rarity = reward.rarity;
            const isSpecial = reward.equipment && rarityOrder[reward.rarity] >= 2;
            node.classList.toggle('is-special', Boolean(isSpecial));
            node.classList.toggle('is-persistent', persistent);
            if (persistent) {
                node.type = 'button';
                node.setAttribute('aria-label', 'Dismiss unique drop: ' + reward.name);
                node.title = reward.name + ' · Click to dismiss';
            } else {
                node.setAttribute('aria-hidden', 'true');
                node.title = reward.name + ' ×' + number(reward.amount);
            }
            const quantity = document.createElement('strong'); quantity.className = 'loot-drop-amount';
            quantity.textContent = (reward.gold ? '+' : '×') + number(reward.amount);
            if (!reward.gold) {
                const icon = Equipment.createIcon(reward, reward.equipment ? '✦' : '◇');
                if (reward.equipment) node.append(icon);
                else {
                    const visual = document.createElement('span'); visual.className = 'loot-material-visual';
                    visual.append(icon, quantity); node.append(visual);
                }
            }
            if (reward.equipment) {
                const name = document.createElement('strong'); name.className = 'loot-drop-name'; name.textContent = reward.name;
                node.append(name);
            } else if (reward.gold) node.append(quantity);
            row.append(node);
            const token = {key, node, quantity, persistent, reward: {...reward}, created: now}; active.set(key, token);
            if (persistent) node.addEventListener('click', () => fadeOut(token));
            const duration = reward.equipment ? (isSpecial ? 2300 : 1700) : 1250;
            const frames = persistent ? [
                {opacity: 0}, {opacity: 1}
            ] : reducedMotion() ? [
                {opacity: 0}, {opacity: 1, offset: .2}, {opacity: 1, offset: .7}, {opacity: 0}
            ] : [
                {opacity: 0, transform: 'translateY(12px)'},
                {opacity: 1, transform: 'translateY(0)', offset: .2},
                {opacity: 1, transform: 'translateY(-30px)', offset: .7},
                {opacity: 0, transform: 'translateY(-48px)'}
            ];
            token.animation = node.animate(frames, {duration: persistent ? 360 : duration, easing: 'linear', fill: 'forwards'});
            token.animation.onfinish = () => {
                if (persistent) {
                    token.animation.onfinish = null; token.animation.cancel(); token.animation = null;
                } else dismiss(token);
            };
        });
        reposition();
    }
    window.addEventListener('scroll', reposition, {passive: true});
    window.addEventListener('resize', reposition, {passive: true});
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
    window.LootEffects = {drop, sync, clear};
}());
