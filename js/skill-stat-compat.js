(function() {
    'use strict';
    // Older skill files used attackSpeedMultiplier for interval reduction and
    // attackSpeedRateMultiplier for faster attacks. Normalize both on import.
    function normalize(tree) {
        if (!tree || !Array.isArray(tree.nodes) || tree.statSchemaVersion === 2) return tree;
        for (const node of tree.nodes) {
            const stats = node && node.stats;
            if (!stats || typeof stats !== 'object' || Array.isArray(stats)) continue;
            if (Object.hasOwn(stats, 'attackSpeedMultiplier') || Object.hasOwn(stats, 'attackSpeedRateMultiplier')) {
                const interval = stats.attackSpeedMultiplier ?? 1;
                const rate = stats.attackSpeedRateMultiplier ?? 1;
                stats.attackSpeedMultiplier = Number.isFinite(interval) && interval > 0 && Number.isFinite(rate) && rate > 0
                    ? rate / interval : null;
                delete stats.attackSpeedRateMultiplier;
            }
        }
        tree.statSchemaVersion = 2;
        return tree;
    }
    window.SkillStatCompat = {normalize};
})();
