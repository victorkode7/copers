(function() {
    'use strict';
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
    // Older skill files used attackSpeedMultiplier for interval reduction and
    // attackSpeedRateMultiplier for faster attacks. Normalize both on import.
    function normalize(tree) {
        if (!tree || !Array.isArray(tree.nodes)) return tree;
        const legacySpeed = tree.statSchemaVersion !== 2;
        const legacyFury = tree.furySchemaVersion !== 1;
        const legacyChains = tree.eruptionChainSchemaVersion !== 1;
        const legacyShields = tree.shieldSchemaVersion !== 1;
        const legacyFire = tree.righteousFireSchemaVersion !== 1;
        for (const node of tree.nodes) {
            if (node?.id === 'shieldSlam') node.effect = normalizeShieldSlamDescription(node.effect);
            if (node?.id === 'bleed') node.effect = normalizeBleedDescription(node.effect);
            const stats = node && node.stats;
            if (!stats || typeof stats !== 'object' || Array.isArray(stats)) continue;
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
        return tree;
    }
    window.SkillStatCompat = {normalize, normalizeShieldSlamDescription, normalizeBleedDescription};
})();
