(function() {
    'use strict';
    const nodeIdAliases = Object.freeze({
        "skillNode4": "voidBolt",
        "thunderstorm": "voidBolt",
        "thunderbolt": "voidBolt",
        "thunderBolt": "voidBolt",
        "saltWaterBolt": "voidVolley",
        "multiHit1_copy": "multiHit2",
        "attackSpeedNode5_copy": "arrowSpeed2",
        "eruptionChain_copy": "eruptionChain2",
        "eruptionChain_copy2": "eruptionChain3",
        "healthNode4": "flatHealthRegen",
        "healthNode5": "maxHealthRegen",
        "healthNode5_copy": "maxHealthRegen2",
        "healthNode5_copy2": "maxHealthRegen3",
        "attackSpeedNode9": "maxHealthRegen4",
        "addedShields_copy": "addedShields2",
        "addedShields_copy2": "reinforcedVitality",
        "addedShields_copy2_copy": "evasiveBulwark",
        "untouchable_copy": "untouchable2",
        "untouchable_copy2": "evasiveVitality",
        "maxFury_copy": "maxFury2",
        "bleed_copy": "bleedChance2",
        "bleed_copy2": "bleedChance3",
        "bleed_copy3": "bleedChance4",
        "bleed_copy4": "quickBleeding",
        "bleed_copy_copy": "bleedDamage",
        "greedyPig_copy": "greedierPig",
        "greedyPig_copy2": "soGreedy",
        "thickHide_copy": "thickHide2",
        "newNode": "heavyBlows",
        "newNode2": "bleederer",
        "bigAttackSpeed_3": "accuracyBoost",
        "bigAttackSpeed_4": "damageBoost"
    });

    function resolveNodeId(id) {
        return Object.hasOwn(nodeIdAliases, id) ? nodeIdAliases[id] : id;
    }

    function cleanNodeName(name) {
        return String(name || '').replace(/(?:\s+Copy)+$/i, '').trim();
    }

    function normalizeNodeIds(tree) {
        const legacyIds = tree.nodeIdSchemaVersion !== 1;
        const occupied = new Set(tree.nodes.map(node => node.id));
        const renamed = new Map();
        for (const node of tree.nodes) {
            const nextId = resolveNodeId(node.id);
            if (nextId !== node.id && !occupied.has(nextId)) {
                renamed.set(node.id, nextId);
                occupied.delete(node.id); occupied.add(nextId); node.id = nextId;
            }
            node.name = cleanNodeName(node.name);
            if (node.id === 'heavyBlows' && node.name === 'New Skill') node.name = 'Heavy Blows';
            if (/^maxHealthRegen\d*$/.test(node.id) && /^(?:Health|Max health regen|Attack Speed)$/i.test(node.name)) node.name = 'Maximum Health Regeneration';
            if (node.id === 'flatHealthRegen' && node.name === 'Health') node.name = 'Health Regeneration';
            if (node.id === 'reinforcedVitality' && /^Added shields$/i.test(node.name)) node.name = 'Reinforced Vitality';
            if (node.id === 'evasiveBulwark' && /^Added shields$/i.test(node.name)) node.name = 'Evasive Bulwark';
            if (node.id === 'bleedDamage' && /^Deep wound$/i.test(node.name)) node.name = 'Bleed Damage';
            if (/^bleedChance\d+$/.test(node.id) && node.name === 'Bleed') node.name = 'Bleed Chance';
            if (node.id === 'quickBleeding' && node.name === 'Bleed enemies') node.name = 'Quick Bleeding';
            if ((/^bleedChance\d+$/.test(node.id) || node.id === 'quickBleeding') && /^\d+% on hit: 10% hit damage\/s\./.test(node.effect || '')) node.customDescription = false;
            if (legacyIds && ['singledOff','bleederer'].includes(node.id) && Object.keys(node.stats || {}).length === 1 && node.stats.damage === 1) delete node.stats.damage;
            if (node.id === 'bleederer' && node.effect === 'Hits now generate two bleed stacks each time! (Requires chance to bleed)') node.effect = 'Successful Bleed rolls add 2 stacks.\nStill requires Bleed chance.';
            if (node.id === 'singledOff' && node.effect === 'Enemies become vulnerable. taking 30% more damage when they are alone.') node.effect = 'The last living enemy takes 30% more damage.';
        }
        tree.nodes.forEach(node => {node.requires = (node.requires || []).map(id => renamed.get(id) || id);});
        tree.nodeIdSchemaVersion = 1;
        return tree;
    }

    function normalizeRankIds(ranks, nodesById) {
        for (const [oldId, nextId] of Object.entries(nodeIdAliases)) {
            if (!Object.hasOwn(ranks, oldId) || nodesById[oldId] || !nodesById[nextId]) continue;
            const rank = ranks[oldId];
            if (Object.hasOwn(ranks, nextId)) {
                // Keep malformed values for the save validator to reject.
                if (!Number.isSafeInteger(rank) || rank <= 0 || !Number.isSafeInteger(ranks[nextId]) || ranks[nextId] <= 0) continue;
                ranks[nextId] += rank;
            } else ranks[nextId] = rank;
            delete ranks[oldId];
        }
        return ranks;
    }
    function normalizeShieldSlamDescription(effect) {
        return effect === 'On reaching max shield stacks. Consume half your shield stacks. Dealing 30% physical damage per stack to the target.'
            ? 'At maximum shields, consume half your shields. Deal 100% of your physical damage per shield consumed to the target.' : effect;
    }
    function normalizeBleedDescription(effect) {
        const oldDescriptions = [
            '25% chance to inflict Bleed on a physical hit. Each application adds 1 stack and 1 second to a shared timer, up to 5 seconds. Each stack deals 1 base damage per tick, once per second. All stacks expire together.',
            "25% chance to inflict Bleed on a physical hit. Each application adds 10% of that hit's damage to the shared DOT, dealing damage once per second. Adds 1 stack and 1 second to a shared timer, up to 5 seconds. Bleed damage modifiers apply. All stacks expire together.",
            '25% on hit: 10% hit damage/s.\nDirect hits. +1s (max 5s).'
        ];
        return oldDescriptions.includes(effect) ? '25% on hit: 10% hit damage/s.\nSingle target. +1s (max 5s).' : effect;
    }
    const spellNodeDefaults = {
        baseMana1:{name:'Mana Reserve',stats:{mana:100}},
        baseSpellDamage1:{name:'Arcane Power',stats:{spellDamage:10}},
        multiSpellDamage1:{name:'Spell Amplification',stats:{spellDamageMultiplier:1.2}},
        baseManaRegen:{name:'Mana Regeneration',stats:{manaRegen:10}},
        multiManaRegen:{name:'Flowing Mana',stats:{manaRegenIncrease:.25}},
        multMana1:{name:'Expanded Reserves',stats:{manaMultiplier:1.25}},
        maxManaRegen:{name:'Deep Wells',stats:{manaRegenPercent:.05}},
        voidBolt:{name:'Void Bolt',icon:'◈',targeting:'singleTarget',effect:'On attack: 100% spell damage to your target, affected by multihit.\nGain 1 Void Charge per hit. Costs 5 mana per cast.'},
        voidVolley:{name:'Void Volley',icon:'✺',targeting:'aoe',effect:'At 5 Void Charges, consume them to fire 10 missiles at random enemies.\nEach deals 100% spell damage. Costs 10 mana per volley.'}
    };
    // Older skill files used attackSpeedMultiplier for interval reduction and
    // attackSpeedRateMultiplier for faster attacks. Normalize both on import.
    function normalize(tree) {
        if (!tree || !Array.isArray(tree.nodes)) return tree;
        const legacySpeed = tree.statSchemaVersion !== 2;
        const legacyFury = tree.furySchemaVersion !== 1;
        const legacyChains = tree.eruptionChainSchemaVersion !== 1;
        const legacyShields = tree.shieldSchemaVersion !== 1;
        const legacyFire = tree.righteousFireSchemaVersion !== 1;
        const legacySpells = tree.spellSchemaVersion !== 2;
        for (const node of tree.nodes) {
            if (node?.id === 'shieldSlam') node.effect = normalizeShieldSlamDescription(node.effect);
            if (node?.id === 'bleed') node.effect = normalizeBleedDescription(node.effect);
            const stats = node && node.stats;
            if (!stats || typeof stats !== 'object' || Array.isArray(stats)) continue;
            const spell = spellNodeDefaults[resolveNodeId(node.id)];
            const replacedSpell=['thunderstorm','thunderbolt','thunderBolt','saltWaterBolt','skillNode4'].includes(node.id);
            if (legacySpells && spell && (replacedSpell || !Object.keys(stats).length || Object.keys(stats).length===1 && stats.damage===1)) {
                if (stats.damage===1) delete stats.damage;
                Object.assign(stats,spell.stats || {});
                node.name=spell.name;node.type='mana';node.customDescription=Boolean(spell.effect);
                if (spell.icon && (replacedSpell || !node.icon || node.icon==='✦')) node.icon=spell.icon;
                if (spell.effect) {node.effect=spell.effect;node.abilityTargeting=spell.targeting;}
            }
            // Replace old Fire placeholders in saved editor drafts once,
            // while preserving positions, connections, sprites and later edits.
            if (legacyFire && ['righteousFire', 'fireOfTheRighteous'].includes(node.id)) {
                if (!node.effect || /^drain\.?$/i.test(node.effect.trim())) {
                    node.effect = 'Regeneration heals only up to 30% of maximum HP.\nDrain 10% of maximum HP per second.\nDeal unused regeneration as burning damage, split evenly among all living enemies.';
                    node.customDescription = true;
                    if (Object.keys(stats).length === 1 && stats.damage === 1) delete stats.damage;
                }
                if (!node.icon || node.icon === '✦') node.icon = '🔥';
                if (/^fire of the righteous$/i.test(node.name || '')) node.name = 'Fire of the Righteous';
            }
            if (legacyShields && Object.keys(stats).length === 1 && stats.damage === 1) {
                if (/^(?:shieldGenerator|shieldSlam)(?:_copy\d*)*$/.test(node.id)) delete stats.damage;
                if (/^addedShields(?:_copy\d*)*$/.test(node.id)) {
                    delete stats.damage;
                    stats.maxShields = 3;
                    node.customDescription = false;
                }
            }
            if (Object.hasOwn(stats, 'healthRegenMultiplier')) {
                const multiplier = stats.healthRegenMultiplier;
                const increase = stats.healthRegenIncrease ?? 0;
                stats.healthRegenIncrease = Number.isFinite(multiplier) && multiplier > 0 && Number.isFinite(increase)
                    ? increase + multiplier - 1 : NaN;
                delete stats.healthRegenMultiplier;
            }
            // Chain nodes (including editor copies) originally carried placeholder damage.
            if (legacyChains && /^eruptionChain(?:_copy\d*)*$/.test(node.id) && !Object.hasOwn(stats, 'eruptionChains')) {
                if (Object.keys(stats).length === 1 && stats.damage === 1) delete stats.damage;
                stats.eruptionChains = 1;
                node.customDescription = false;
            }
            // The first Fury node used damage while its capacity stat was pending.
            if (legacyFury && node.id === 'maxFury' && Object.keys(stats).length === 1 && stats.damage === 1) {
                delete stats.damage;
                stats.maxFury = 1;
            }
            if (legacySpeed && (Object.hasOwn(stats, 'attackSpeedMultiplier') || Object.hasOwn(stats, 'attackSpeedRateMultiplier'))) {
                const interval = stats.attackSpeedMultiplier ?? 1;
                const rate = stats.attackSpeedRateMultiplier ?? 1;
                stats.attackSpeedMultiplier = Number.isFinite(interval) && interval > 0 && Number.isFinite(rate) && rate > 0
                    ? rate / interval : null;
                delete stats.attackSpeedRateMultiplier;
            }
        }
        tree.statSchemaVersion = 2;
        tree.furySchemaVersion = 1;
        tree.eruptionChainSchemaVersion = 1;
        tree.shieldSchemaVersion = 1;
        tree.righteousFireSchemaVersion = 1;
        tree.spellSchemaVersion = 2;
        return normalizeNodeIds(tree);
    }
    window.SkillStatCompat = {normalize, normalizeShieldSlamDescription, normalizeBleedDescription,
        nodeIdAliases, resolveNodeId, cleanNodeName, normalizeRankIds};
})();
