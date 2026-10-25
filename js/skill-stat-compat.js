(function() {
    'use strict';
    // Older skill files used attackSpeedMultiplier for interval reduction and
    // attackSpeedRateMultiplier for faster attacks. Normalize both on import.
    function normalize(tree) {
        if (!tree || !Array.isArray(tree.nodes)) return tree;
        const legacySpeed = tree.statSchemaVersion !== 2;
        const legacyFury = tree.furySchemaVersion !== 1;
        const legacyChains = tree.eruptionChainSchemaVersion !== 1;
        for (const node of tree.nodes) {
            const stats = node && node.stats;
            if (!stats || typeof stats !== 'object' || Array.isArray(stats)) continue;
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
        return tree;
    }
    window.SkillStatCompat = {normalize};
})();
