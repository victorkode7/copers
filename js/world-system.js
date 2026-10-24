(function () {
    'use strict';
    const clone = value => JSON.parse(JSON.stringify(value));
    const object = value => value && typeof value === 'object' && !Array.isArray(value);
    const idPattern = /^[A-Za-z_][A-Za-z0-9_-]*$/;
    const statFields = ['health', 'accuracy', 'evasion', 'attackDamage', 'attackInterval', 'respawnSeconds', 'experience'];
    const defaults = {health: 10, accuracy: 50, evasion: 0, attackDamage: 1, attackInterval: 2, respawnSeconds: 5, experience: 10, gold: [1, 2], drops: [], itemDrops: [], sprite: ''};
    const appliedBackgrounds = new WeakMap();
    function safePath(value) {
        return typeof value === 'string' && /^(?![\/\\]|.*(?:[:\\?#]|\.\.))[a-z0-9_ ./-]+\.(png|jpe?g|webp|gif|svg)$/i.test(value) ? value : '';
    }
    function chanceText(chance) { return (chance * 100).toLocaleString('en-US', {maximumSignificantDigits: 6}) + '%'; }
    function definitions(data, map) {
        return (map.spawns || []).flatMap(spawn => {
            const monster = data.monsters.find(entry => entry.id === spawn.monsterId);
            if (!monster) return [];
            const count = Math.max(1, Math.min(100, Math.floor(spawn.count || 1)));
            return Array.from({length: count}, (_, index) => ({
                ...defaults, ...monster, ...spawn.overrides,
                id: index === 0 ? spawn.id : spawn.id + '-copy-' + (index + 1),
                monsterId: monster.id
            }));
        });
    }
    function background(data, map) {
        return map.background || data.worlds.find(world => world.mapIds.includes(map.id))?.background || null;
    }
    function applyBackground(element, value, resolve = path => path) {
        element.classList.toggle('has-area-background', Boolean(value));
        const path = safePath(value?.sprite);
        const source = path ? resolve(path) : '';
        const signature = JSON.stringify([value, source]);
        if (appliedBackgrounds.get(element) === signature) return;
        appliedBackgrounds.set(element, signature);
        element.querySelector(':scope > .combat-background-art')?.remove();
        element.style.removeProperty('background-image');
        element.style.removeProperty('background-size');
        element.style.removeProperty('background-repeat');
        element.style.removeProperty('background-position');
        element.style.removeProperty('background-color');
        if (!value) return;
        element.style.backgroundColor = /^#[\da-f]{6}$/i.test(value.color) ? value.color : '#172632';
        if (path) {
            const shade = Math.max(0, Math.min(0.9, value.dim ?? 0.55));
            element.style.backgroundImage = 'linear-gradient(rgba(0,0,0,' + shade + '),rgba(0,0,0,' + shade + ')),url("' + source.replace(/["\\]/g, '') + '")';
            element.style.backgroundSize = value.fit === 'tile' ? 'auto, ' + (value.tileSize || 256) + 'px' : 'auto, ' + (value.fit === 'contain' ? 'contain' : 'cover');
            element.style.backgroundRepeat = value.fit === 'tile' ? 'no-repeat, repeat' : 'no-repeat';
            element.style.backgroundPosition = 'center';
            // A single width-sized image keeps its natural proportions even
            // when a large encounter makes the combat panel much taller.
            if (value.fit === 'cover' && element.classList.contains('combat-panel')) {
                element.style.backgroundImage = 'none';
                const image = document.createElement('img');
                image.className = 'combat-background-art';
                image.alt = '';
                image.setAttribute('aria-hidden', 'true');
                image.draggable = false;
                image.style.opacity = String(1 - shade);
                image.addEventListener('error', () => { image.hidden = true; });
                image.src = source;
                element.prepend(image);
            }
        }
    }
    function sources(data) {
        const result = {};
        data.maps.forEach(map => definitions(data, map).forEach(monster => {
            [...(map.drops || []), ...(monster.drops || [])].filter(drop => drop.chance > 0).forEach(drop => {
                const entries = result[drop.id] ||= [];
                if (!entries.some(entry => entry.enemy === monster.name && entry.location === map.name)) entries.push({enemy: monster.name, location: map.name});
            });
        }));
        return result;
    }
    function validate(data, items) {
        const errors = [];
        if (!object(data) || data.schemaVersion !== 1 || !['worlds', 'maps', 'monsters', 'assets'].every(key => Array.isArray(data[key]))) return ['Expected a world content file with schemaVersion 1, worlds, maps, monsters, and assets.'];
        const add = (label, message) => errors.push(label + ': ' + message);
        for (const kind of ['worlds', 'maps', 'monsters']) {
            const seen = new Set();
            data[kind].forEach((entry, index) => {
                const label = entry?.name || kind + ' ' + (index + 1);
                if (!object(entry)) { add(label, 'invalid entry.'); return; }
                if (!idPattern.test(entry.id) || ['__proto__', 'constructor', 'prototype'].includes(entry.id) || seen.has(entry.id)) add(label, 'invalid or duplicate internal ID.');
                seen.add(entry.id);
                if (typeof entry.name !== 'string' || !entry.name.trim()) add(label, 'a name is required.');
            });
        }
        if (errors.length) return errors;
        if (!data.worlds.length || !data.maps.length || !data.monsters.length) errors.push('Keep at least one world, map, and monster.');
        const checkBackground = (value, label) => {
            if (value == null) return;
            if (!object(value) || typeof value.sprite !== 'string' || (value.sprite && !safePath(value.sprite)) || !/^#[\da-f]{6}$/i.test(value.color) || !['cover', 'contain', 'tile'].includes(value.fit) || !Number.isFinite(value.dim) || value.dim < 0 || value.dim > 0.9 || !Number.isFinite(value.tileSize) || value.tileSize < 16 || value.tileSize > 4096) add(label, 'invalid background settings.');
        };
        const checkDrops = (entry, label) => {
            for (const kind of ['drops', 'itemDrops']) {
                if (entry[kind] === undefined) continue;
                if (!Array.isArray(entry[kind])) { add(label, 'invalid drop table.'); continue; }
                const seen = new Set();
                entry[kind].forEach(drop => {
                    if (!object(drop) || typeof drop.id !== 'string' || seen.has(drop.id) || !Number.isFinite(drop.chance) || drop.chance < 0 || drop.chance > 1) { add(label, 'invalid or duplicate drop.'); return; }
                    seen.add(drop.id);
                    if (kind === 'drops' && (!Array.isArray(drop.amount) || drop.amount.length !== 2 || !drop.amount.every(value => Number.isSafeInteger(value) && value >= 1) || drop.amount[0] > drop.amount[1])) add(label, 'invalid material quantity range.');
                    if (items && (kind === 'drops' ? !Object.hasOwn(items.materials, drop.id) : !items.items.some(item => item.id === drop.id && !item.developerOnly))) add(label, 'drop references missing material or equipment: ' + drop.id + '.');
                });
            }
        };
        const checkStats = (entry, label, overrides = false) => {
            if (overrides && entry.name !== undefined && (typeof entry.name !== 'string' || !entry.name.trim())) add(label, 'invalid name override.');
            statFields.forEach(key => {
                if (overrides && entry[key] === undefined) return;
                const value = entry[key];
                if (!Number.isFinite(value) || value < (['health', 'attackInterval', 'respawnSeconds'].includes(key) ? 0.001 : 0) || (['health', 'experience'].includes(key) && !Number.isSafeInteger(value))) add(label, 'invalid ' + key + '.');
            });
            if (!overrides || entry.gold !== undefined) {
                if (!Array.isArray(entry.gold) || entry.gold.length !== 2 || !entry.gold.every(value => Number.isSafeInteger(value) && value >= 0) || entry.gold[0] > entry.gold[1]) add(label, 'invalid gold range.');
            }
            if ((!overrides || entry.sprite !== undefined) && (typeof entry.sprite !== 'string' || (entry.sprite && !safePath(entry.sprite)))) add(label, 'use a local sprite image path.');
            checkDrops(entry, label);
        };
        const assigned = new Set();
        data.worlds.forEach(world => {
            if (!Array.isArray(world.mapIds) || !world.mapIds.length) add(world.name, 'at least one map is required.');
            else world.mapIds.forEach(id => {
                if (!data.maps.some(map => map.id === id) || assigned.has(id)) add(world.name, 'each map must belong to exactly one world.');
                assigned.add(id);
            });
            checkBackground(world.background, world.name);
        });
        data.monsters.forEach(monster => checkStats(monster, monster.name));
        data.maps.forEach(map => {
            if (!assigned.has(map.id)) add(map.name, 'assign this map to a world.');
            if (typeof map.description !== 'string' || !Number.isSafeInteger(map.goal) || map.goal < 0) add(map.name, 'invalid description or kill goal.');
            checkBackground(map.background, map.name); checkDrops(map, map.name);
            if (!Array.isArray(map.spawns) || !map.spawns.length) { add(map.name, 'at least one monster spawn is required.'); return; }
            const ids = new Set(); let total = 0;
            map.spawns.forEach(spawn => {
                if (!object(spawn) || !idPattern.test(spawn.id) || !data.monsters.some(monster => monster.id === spawn.monsterId) || !Number.isSafeInteger(spawn.count) || spawn.count < 1 || spawn.count > 100 || !object(spawn.overrides)) { add(map.name, 'invalid monster spawn.'); return; }
                total += spawn.count;
                for (let i = 0; i < spawn.count; i++) {
                    const id = i === 0 ? spawn.id : spawn.id + '-copy-' + (i + 1);
                    if (ids.has(id)) add(map.name, 'duplicate spawn ID.');
                    ids.add(id);
                }
                checkStats(spawn.overrides, map.name + ' spawn', true);
            });
            if (total > 100) add(map.name, 'a maximum of 100 monsters can be active.');
        });
        data.assets.forEach(asset => {
            if (!object(asset) || typeof asset.name !== 'string' || !safePath(asset.path) || !['monster', 'background'].includes(asset.kind)) errors.push('Invalid image-library entry.');
        });
        return errors;
    }
    window.WorldContent = {clone, defaults, statFields, safePath, chanceText, definitions, background, applyBackground, sources, validate};
}());
