(function() {
    'use strict';
    const uniqueEffects = {
        geobreakerShockwave: {
            description: 'Shockwave Slash has a 50% chance to trigger and activates twice per successful proc. Requires Shockwave Slash.',
            shockwaveSlash: {chance: 0.5, triggers: 2}
        }
    };
    function uniqueEffect(item) {
        return item && Object.hasOwn(uniqueEffects, item.uniqueEffect) ? uniqueEffects[item.uniqueEffect] : null;
    }
    // This registry is shared by the game, item tooltips, and editor controls.
    const stats = Object.create(null);
    for (const [id, label] of Object.entries({damage: 'Physical damage', health: 'Maximum health', maxFury: 'Maximum fury', maxShields: 'Maximum shields', accuracy: 'Accuracy', evasion: 'Evasion', multiHit: 'Multi-hit', poisonDamage: 'Poison damage', poisonTickRate: 'Poison tick rate', bleedDamage: 'Bleed damage', bleedTickRate: 'Bleed tick rate'})) {
        const displayLabel = id.endsWith('TickRate') ? label.replace('rate', 'speed') : label;
        stats[id] = { label, mode: 'add', default: 0, display: {label: displayLabel, type: id.endsWith('TickRate') ? 'percent' : 'flat'} };
        stats[id + 'Multiplier'] = { label: label + ' multiplier', mode: 'multiply', default: 1, min: 0.000001, display: {label: displayLabel, type: 'percentBonus'} };
    }
    Object.assign(stats, {
        bowDamageIncrease: {label:'Increased damage with bow attacks (%)',mode:'add',default:0,display:{label:'Increased damage with bow attacks',type:'percent'}},
        mana: {label:'Maximum mana',mode:'add',default:0,display:{label:'Maximum mana',type:'flat'}},
        manaMultiplier: {label:'Maximum mana multiplier',mode:'multiply',default:1,min:0.000001,display:{label:'Maximum mana',type:'percentBonus'}},
        spellDamage: {label:'Spell damage',mode:'add',default:0,display:{label:'Spell damage',type:'flat'}},
        spellDamageMultiplier: {label:'Spell damage multiplier',mode:'multiply',default:1,min:0.000001,display:{label:'Spell damage',type:'percentBonus'}},
        manaRegen: {label:'Flat mana regeneration (mana/s)',mode:'add',default:0,display:{label:'Flat mana regeneration per second',type:'flat'}},
        manaRegenIncrease: {label:'Increased mana regeneration (%)',mode:'add',default:0,display:{label:'Increased mana regeneration',type:'percent'}},
        manaRegenPercent: {label:'Maximum mana regeneration (%/s)',mode:'add',default:0,display:{label:'Maximum mana regenerated per second',type:'percent'}},
        healthRegen: { label: 'Flat health regeneration (HP/s)', mode: 'add', default: 0, display: {label: 'Flat health regeneration per second', type: 'flat'} },
        healthRegenIncrease: { label: 'Increased health regeneration (%)', mode: 'add', default: 0, display: {label: 'Increased health regeneration', type: 'percent'} },
        healthRegenPercent: { label: 'Maximum health regeneration (%/s)', mode: 'add', default: 0, display: {label: 'Maximum health regenerated per second', type: 'percent'} },
        goldBonus: { label: 'Gold bonus', mode: 'add', default: 0, display: {label: 'Gold gained', type: 'percent'} },
        goldBonusMultiplier: { label: 'Gold multiplier', mode: 'multiply', default: 1, min: 0.000001, display: {label: 'Gold gained', type: 'percentBonus'} },
        poisonChance: { label: 'Poison chance', mode: 'add', default: 0, display: {label: 'Poison chance', type: 'percent'} },
        poisonChanceMultiplier: { label: 'Poison chance multiplier', mode: 'multiply', default: 1, min: 0.000001, display: {label: 'Poison chance', type: 'percentBonus'} },
        bleedChance: { label: 'Bleed chance', mode: 'add', default: 0, display: {label: 'Bleed chance', type: 'percent'} },
        bleedChanceMultiplier: { label: 'Bleed chance multiplier', mode: 'multiply', default: 1, min: 0.000001, display: {label: 'Bleed chance', type: 'percentBonus'} },
        attackSpeedMultiplier: { label: 'Attack speed multiplier (1.1 = 10% faster)', mode: 'multiply', default: 1, min: 0.000001, display: {label: 'Attack speed', type: 'percentBonus'} },
        minimumAttackInterval: { label: 'Minimum attack interval (seconds)', mode: 'min', default: 0.25, min: 0.001, max: 0.25, developer: true, display: {label: 'Minimum attack interval', type: 'limit', unit: 's'} },
        minimumEnemyHitChance: { label: 'Minimum enemy hit chance (%)', mode: 'min', default: 5, min: 0, max: 5, developer: true, display: {label: 'Minimum enemy hit chance', type: 'limit', unit: '%'} }
    });

    const statOrder = [
        'mana','manaMultiplier','manaRegen','manaRegenIncrease','manaRegenPercent','spellDamage','spellDamageMultiplier',
        'health', 'healthMultiplier', 'healthRegen', 'healthRegenIncrease', 'healthRegenPercent', 'maxFury', 'maxFuryMultiplier', 'maxShields', 'maxShieldsMultiplier', 'damage', 'damageMultiplier',
        'bowDamageIncrease', 'accuracy', 'accuracyMultiplier', 'evasion', 'evasionMultiplier',
        'multiHit', 'multiHitMultiplier', 'attackSpeedMultiplier',
        'poisonChance', 'poisonChanceMultiplier', 'poisonDamage', 'poisonDamageMultiplier',
        'poisonTickRate', 'poisonTickRateMultiplier', 'bleedChance', 'bleedChanceMultiplier',
        'bleedDamage', 'bleedDamageMultiplier', 'bleedTickRate', 'bleedTickRateMultiplier', 'goldBonus', 'goldBonusMultiplier',
        'minimumAttackInterval', 'minimumEnemyHitChance'
    ];
    const statRank = Object.fromEntries(statOrder.map((key, index) => [key, index]));
    function orderedStats(item) {
        return Object.entries(item.stats || {}).sort(([a], [b]) =>
            (statRank[a] ?? statOrder.length) - (statRank[b] ?? statOrder.length) || a.localeCompare(b));
    }

    function safeSprite(value) {
        if (typeof value !== 'string') return '';
        // Sprite files remain separate from item data and travel in the ZIP export.
        if (/^(?![\/\\]|.*(?:[:\\?#]|\.\.))[a-z0-9_ ./-]+\.(png|jpe?g|webp|gif|svg)$/i.test(value)) return value;
        return '';
    }

    function describe(item) {
        const bonuses = orderedStats(item).map(([key, value]) => {
            const rule = stats[key];
            if (!rule) return '';
            if (!Number.isFinite(value)) return rule.label + ': enter a valid number';
            if (rule.display) {
                const {label, type, unit} = rule.display;
                const amount = type === 'percentBonus' ? (value - 1) * 100 : type === 'percent' ? value * 100 : value;
                const digits = type === 'flat' || (type === 'limit' && unit !== '%') ? 6 : 2;
                const rounded = Number(amount.toFixed(digits));
                const number = (rounded === 0 ? 0 : rounded).toLocaleString('en-US', {maximumFractionDigits: digits});
                if (type === 'limit') return label + ': ' + number + (unit || '');
                return (rounded >= 0 ? '+' : '') + number + (type === 'flat' ? '' : '%') + ' ' + label;
            }
            const number = Number((rule.percent ? value * 100 : value).toFixed(rule.percent ? 2 : 6));
            const label = rule.label.replace(/ \(.*\)$/, '');
            return rule.mode === 'multiply' ? label + ': ×' + number
                : rule.mode === 'min' ? label + ': ' + number
                : (number >= 0 ? '+' : '') + number + (rule.percent ? '%' : '') + ' ' + label.toLowerCase();
        }).filter(Boolean).join('\n') || 'No stat bonuses';
        const effect = uniqueEffect(item);
        return bonuses + (effect ? '\nUnique: ' + effect.description : '');
    }

    function compare(candidate, equipped) {
        const incoming = candidate?.stats || {};
        const current = equipped?.stats || {};
        const keys = Object.fromEntries([...Object.keys(incoming), ...Object.keys(current)].map(key => [key, 0]));
        return orderedStats({stats: keys}).flatMap(([key]) => {
            const rule = stats[key];
            if (!rule) return [];
            const value = incoming[key] ?? rule.default;
            const previous = current[key] ?? rule.default;
            if (!Number.isFinite(value) || !Number.isFinite(previous)) return [];
            const difference = value - previous;
            const equal = Math.abs(difference) <= 1e-10 * Math.max(1, Math.abs(value), Math.abs(previous));
            // Lower combat limits are better; all other supported bonuses improve upward.
            const direction = rule.mode === 'min' ? -1 : 1;
            const neutral = Math.abs(value - rule.default) <= 1e-10;
            let status = 'equal';
            if (!equal) {
                if (direction * difference > 0) status = previous === rule.default ? 'new' : 'better';
                else status = neutral ? 'missing' : 'worse';
            }
            let text = describe({stats: {[key]: value}});
            if (status === 'missing') text = text.replace(/^\+0/, '0');
            let delta = '';
            let deltaDescription = '';
            if (!equal) {
                const percent = ['percent', 'percentBonus'].includes(rule.display?.type);
                const percentageDisplay = percent || rule.display?.unit === '%';
                const amount = difference * (percent ? 100 : 1);
                const digits = percentageDisplay ? 2 : 6;
                const number = Math.abs(Number(amount.toFixed(digits))).toLocaleString('en-US', {maximumFractionDigits: digits});
                const suffix = percent ? '%' : rule.display?.unit || '';
                delta = (amount < 0 ? '−' : '+') + number + suffix;
                deltaDescription = percentageDisplay ? 'Bonus difference: ' + (amount < 0 ? 'minus ' : 'plus ') + number + ' percentage points.' : 'Difference: ' + delta + '.';
            }
            return [{key, status, text, delta, deltaDescription}];
        });
    }

    function normalizeData(data) {
        if (!data || ![1, 2].includes(data.schemaVersion) || !Array.isArray(data.items)) return data;
        const legacySpeed = data.schemaVersion === 1;
        for (const item of data.items) {
            const values = item && item.stats;
            if (values && typeof values === 'object' && !Array.isArray(values) && Object.hasOwn(values, 'healthRegenMultiplier')) {
                const multiplier = values.healthRegenMultiplier;
                const increase = values.healthRegenIncrease ?? 0;
                values.healthRegenIncrease = Number.isFinite(multiplier) && multiplier > 0 && Number.isFinite(increase)
                    ? increase + multiplier - 1 : NaN;
                delete values.healthRegenMultiplier;
            }
            if (legacySpeed && values && typeof values === 'object' && !Array.isArray(values) &&
                (Object.hasOwn(values, 'attackSpeedMultiplier') || Object.hasOwn(values, 'attackSpeedRateMultiplier'))) {
                const interval = values.attackSpeedMultiplier ?? 1;
                const rate = values.attackSpeedRateMultiplier ?? 1;
                values.attackSpeedMultiplier = Number.isFinite(interval) && interval > 0 && Number.isFinite(rate) && rate > 0 ? rate / interval : null;
                delete values.attackSpeedRateMultiplier;
            }
            if (values && typeof values === 'object' && !Array.isArray(values) && Object.hasOwn(values, 'baseEvasionBonusPercent')) {
                values.evasionMultiplier = Number.isFinite(values.baseEvasionBonusPercent)
                    ? (values.evasionMultiplier ?? 1) * (1 + values.baseEvasionBonusPercent / 100) : null;
                delete values.baseEvasionBonusPercent;
            }
            if (item && typeof item === 'object') delete item.drops;
        }
        // Older catalogues stored gold on each item. Promote it once per shared preset.
        for (const preset of Array.isArray(data.craftingPresets) ? data.craftingPresets : []) {
            if (!preset || typeof preset !== 'object' || Array.isArray(preset) || preset.gold !== undefined) continue;
            const costs = data.items.filter(item => item?.equipmentType === preset.equipmentType && item?.tier === preset.tier)
                .map(item => item.crafting?.cost?.gold).filter(value => Number.isSafeInteger(value) && value > 0).sort((a,b) => a-b);
            if (Number.isSafeInteger(preset.tier) && preset.tier > 0)
                preset.gold = costs[Math.floor(costs.length / 2)] ?? preset.tier * 1000;
        }
        delete data.maps;
        data.schemaVersion = 2;
        return data;
    }

    function craftingPreset(item, data) {
        return (Array.isArray(data.craftingPresets) ? data.craftingPresets : []).find(preset => preset?.equipmentType === item?.equipmentType && preset?.tier === item?.tier) || null;
    }

    function craftingGold(item, data) {
        const preset = craftingPreset(item, data);
        return preset ? preset.gold : item?.crafting?.cost?.gold; // Standalone legacy items keep their original cost.
    }

    function craftingPool(item, data) {
        const preset = craftingPreset(item, data), shared = Array.isArray(preset?.pool) ? preset.pool : [];
        if (item?.crafting && item.crafting.pool === undefined) return shared;
        return (Array.isArray(item?.crafting?.pool) ? item.crafting.pool : []).map(entry => {
            if (entry && typeof entry === 'object' && 'min' in entry) return entry; // Older item packages retain their custom ranges.
            const stat = typeof entry === 'string' ? entry : entry?.stat;
            return shared.find(roll => roll?.stat === stat) || {stat,min:NaN,max:NaN,step:NaN};
        });
    }

    function validatePool(pool, label, required, errors) {
        if (!Array.isArray(pool) || pool.length < required) { errors.push(label + ': add at least one different potential stat per crafted slot.'); return; }
        const used = new Set();
        for (const roll of pool) {
            const rule = stats[roll?.stat];
            if (!rule || rule.developer || used.has(roll.stat) || ![roll.min, roll.max, roll.step].every(Number.isFinite) ||
                roll.min > roll.max || roll.step <= 0 || !Number.isSafeInteger(Math.round((roll.max - roll.min) / roll.step)) ||
                roll.min < (rule.min ?? 0) || roll.max > (rule.max ?? Infinity) || (rule.mode === 'multiply' && roll.min <= 0) ||
                Math.abs((roll.max - roll.min) / roll.step - Math.round((roll.max - roll.min) / roll.step)) > 1e-6)
                errors.push(label + ': invalid potential roll ' + (roll?.stat || '') + '. Use a unique stat and a range divisible by its step.');
            if (roll) used.add(roll.stat);
        }
    }

    function validate(data) {
        const errors = [];
        const object = value => value && typeof value === 'object' && !Array.isArray(value);
        if (!object(data) || data.schemaVersion !== 2 || !Array.isArray(data.items) || !Array.isArray(data.slots) || !object(data.materials)) {
            return ['Invalid equipment file: expected schemaVersion 2, items, slots, and materials.'];
        }
        const idPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
        const types = new Set(), presets = new Set();
        if (data.equipmentTypes !== undefined && !Array.isArray(data.equipmentTypes)) errors.push('Equipment types must be a list.');
        else for (const type of data.equipmentTypes || []) {
            if (!object(type) || !idPattern.test(type.id) || ['__proto__','constructor','prototype'].includes(type.id) || types.has(type.id) || typeof type.name !== 'string' || !type.name.trim()) errors.push('Invalid or duplicate equipment type.');
            if (type) types.add(type.id);
        }
        if (data.craftingPresets !== undefined && !Array.isArray(data.craftingPresets)) errors.push('Crafting presets must be a list.');
        else for (const preset of data.craftingPresets || []) {
            const key = preset?.equipmentType + ':' + preset?.tier;
            if (!object(preset) || !types.has(preset.equipmentType) || !Number.isSafeInteger(preset.tier) || preset.tier < 1 || presets.has(key)) errors.push('Invalid or duplicate equipment type/tier preset.');
            presets.add(key);
            if (!Number.isSafeInteger(preset?.gold) || preset.gold < 1) errors.push('Shared ' + key + ': gold per reroll must be a positive whole number.');
            validatePool(preset?.pool, 'Shared ' + key, 1, errors);
        }
        Object.entries(data.materials).forEach(([id, name]) => {
            if (!idPattern.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id)) errors.push('Invalid material ID: ' + id + '.');
            if (typeof name !== 'string' || !name.trim()) errors.push(id + ': a material name is required.');
        });
        if (data.materialDetails !== undefined && !object(data.materialDetails)) errors.push('Material details must be an object.');
        else Object.entries(data.materialDetails || {}).forEach(([id, material]) => {
            if (!Object.hasOwn(data.materials, id) || !object(material)) { errors.push(id + ': invalid material details.'); return; }
            if (material.description !== undefined && typeof material.description !== 'string') errors.push(id + ': material description must be text.');
            if (material.sprite !== undefined && (typeof material.sprite !== 'string' || (material.sprite && !safeSprite(material.sprite)))) errors.push(id + ': use a local material sprite path.');
        });
        for (const [label, entries] of [['slot', data.slots]]) {
            const seen = new Set();
            for (const entry of entries) {
                if (!object(entry) || !idPattern.test(entry.id) || seen.has(entry.id) || typeof entry.name !== 'string' || !entry.name.trim()) errors.push('Invalid or duplicate ' + label + '.');
                if (entry) seen.add(entry.id);
            }
        }
        if (!data.slots.length) errors.push('At least one equipment slot is required.');
        const seen = new Set();
        data.items.forEach((item, index) => {
            const label = item && (item.name || item.id) || 'Item ' + (index + 1);
            if (!object(item)) { errors.push(label + ': invalid item.'); return; }
            if (!idPattern.test(item.id) || ['__proto__', 'constructor', 'prototype'].includes(item.id) || seen.has(item.id)) errors.push(label + ': invalid or duplicate ID.');
            seen.add(item.id);
            if (typeof item.name !== 'string' || !item.name.trim()) errors.push(label + ': a name is required.');
            if (!data.slots.some(slot => slot && slot.id === item.slot)) errors.push(label + ': unknown slot.');
            if (!['common', 'uncommon', 'rare', 'epic', 'unique'].includes(item.rarity)) errors.push(label + ': unknown rarity.');
            if (item.uniqueEffect !== undefined && (typeof item.uniqueEffect !== 'string' || !uniqueEffect(item))) errors.push(label + ': unknown unique effect.');
            if (typeof item.description !== 'string') errors.push(label + ': description must be text.');
            if (typeof item.sprite !== 'string' || (item.sprite && !safeSprite(item.sprite))) errors.push(label + ': use a local image path or import a sprite.');
            if (item.developerOnly !== undefined && typeof item.developerOnly !== 'boolean') errors.push(label + ': invalid developer option.');
            if (item.equipmentType !== undefined && !types.has(item.equipmentType)) errors.push(label + ': unknown equipment type.');
            if (item.tier !== undefined && (!Number.isSafeInteger(item.tier) || item.tier < 1)) errors.push(label + ': tier must be a positive whole number.');
            if (!object(item.stats)) errors.push(label + ': stats must be an object.');
            else Object.entries(item.stats).forEach(([key, value]) => {
                const rule = stats[key];
                if (!rule || !Number.isFinite(value) || value < (rule.min ?? -Infinity) || value > (rule.max ?? Infinity)) errors.push(label + ': invalid stat ' + key + '.');
                if (rule && rule.developer && !item.developerOnly) errors.push(label + ': combat limit overrides require Developer only.');
            });
            if (item.recipe !== null) {
                if (!object(item.recipe) || !object(item.recipe.materials) || !Object.keys(item.recipe.materials).length) errors.push(label + ': a recipe needs at least one material.');
                else Object.entries(item.recipe.materials).forEach(([id, amount]) => {
                    if (!Object.hasOwn(data.materials, id) || !Number.isInteger(amount) || amount <= 0) errors.push(label + ': invalid recipe material ' + id + '.');
                });
            }
            if (item.crafting !== undefined) {
                const craft = item.crafting, gold = craftingGold(item, data);
                const validCost = object(craft?.cost) && Number.isSafeInteger(gold) && gold > 0 && object(craft.cost.materials);
                const validSlots = Number.isSafeInteger(craft?.slots) && craft.slots > 0;
                if (!object(craft) || !validSlots || !validCost || !Object.keys(craft.cost.materials).length) errors.push(label + ': rerolling needs a positive whole number of crafted slots, a positive gold cost and materials.');
                if (validCost) for (const [id, amount] of Object.entries(craft.cost.materials)) {
                    if (!Object.hasOwn(data.materials, id) || !Number.isSafeInteger(amount) || amount <= 0) errors.push(label + ': invalid reroll material ' + id + '.');
                }
                if (craft?.pool !== undefined && !Array.isArray(craft.pool)) errors.push(label + ': potential rolls must be a list.');
                else {
                    const linked = craft?.pool === undefined || craft.pool.some(entry => !entry || typeof entry !== 'object' || !('min' in entry));
                    if (linked && !craftingPreset(item, data)) errors.push(label + ': choose a shared preset for this equipment type and tier.');
                    if (Array.isArray(data.craftingPresets) || data.craftingPresets === undefined) validatePool(craftingPool(item, data), label, validSlots ? craft.slots : 1, errors);
                }
            }
        });
        return errors;
    }

    function aggregate(items, key) {
        const rule = stats[key];
        if (!rule) throw new Error('Unknown equipment stat: ' + key);
        return items.reduce((total, item) => {
            const value = item.stats[key] ?? (rule.mode === 'min' ? rule.default : rule.mode === 'multiply' ? 1 : 0);
            return rule.mode === 'multiply' ? total * value : rule.mode === 'min' ? Math.min(total, value) : total + value;
        }, rule.default);
    }

    function createIcon(item, fallback) {
        const icon = document.createElement('span');
        icon.className = 'item-sprite';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = fallback || '◇';
        const source = safeSprite(item && item.sprite);
        if (source) {
            const img = document.createElement('img');
            img.alt = '';
            img.src = source;
            img.addEventListener('error', () => { icon.textContent = fallback || '◇'; });
            icon.replaceChildren(img);
        }
        return icon;
    }
    window.Equipment = { stats, describe, validate, aggregate, createIcon, safeSprite, normalizeData, orderedStats, compare, craftingPool, craftingPreset, craftingGold, uniqueEffect };
})();
