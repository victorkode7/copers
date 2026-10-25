(function () {
    'use strict';
    const uniqueEffects = new Set(['shockwaveSlash', 'poisonExecute', 'bloomingFlower',
        'piercingArrow', 'forkingArrow', 'multiShot', 'freezingArrows', 'volcanicEruption', 'eruptionChain']);
    const statDescriptions = [
        ['health', 'maximum health', 'flat'], ['healthMultiplier', 'maximum health', 'multiplier'],
        ['healthRegen', 'health regeneration per second', 'flat'], ['healthRegenMultiplier', 'health regeneration per second', 'multiplier'],
        ['maxFury', 'maximum fury', 'flat'], ['maxFuryMultiplier', 'maximum fury', 'multiplier'],
        ['eruptionChains', 'maximum eruption chains', 'flat'],
        ['damage', 'damage', 'flat'], ['damageMultiplier', 'damage', 'multiplier'],
        ['accuracy', 'accuracy', 'flat'], ['accuracyMultiplier', 'accuracy', 'multiplier'],
        ['evasion', 'evasion', 'flat'], ['evasionMultiplier', 'evasion', 'multiplier'],
        ['multiHit', 'multi-hit', 'flat'], ['multiHitMultiplier', 'multi-hit', 'multiplier'],
        ['attackSpeedBonus', 'attack speed', 'percent'], ['attackSpeedMultiplier', 'attack speed', 'multiplier'],
        ['attackSpeedPerLevel', 'attack speed per character level', 'percent'],
        ['poisonChance', 'poison chance', 'percent'], ['poisonChanceMultiplier', 'poison chance', 'multiplier'],
        ['poisonDamage', 'poison damage', 'flat'], ['poisonDamageMultiplier', 'poison damage', 'multiplier'],
        ['poisonTickRate', 'poison tick speed', 'percent'], ['poisonTickRateMultiplier', 'poison tick speed', 'multiplier'],
        ['goldBonus', 'gold gained', 'percent'], ['goldBonusMultiplier', 'gold gained', 'multiplier']
    ];
    const formatter = new Intl.NumberFormat('en-US', {maximumFractionDigits: 2});

    function statBonuses(node) {
        return statDescriptions.flatMap(([key, label, type]) => {
            const value = node.stats?.[key];
            if (!Number.isFinite(value) || value === (type === 'multiplier' ? 1 : 0)) return [];
            const amount = type === 'multiplier' ? (value - 1) * 100 : type === 'percent' ? value * 100 : value;
            const rounded = Number(amount.toFixed(2)) || 0;
            return [(rounded >= 0 ? '+' : '') + formatter.format(rounded) + (type === 'flat' ? '' : '%') + ' ' + label];
        });
    }

    function usesCustomDescription(node) {
        if (typeof node.customDescription === 'boolean') return node.customDescription;
        return Boolean(node.start || uniqueEffects.has(node.id) || !statBonuses(node).length);
    }

    function describe(node) {
        return usesCustomDescription(node) ? String(node.effect || '').trim() : statBonuses(node).join('\n') || 'No stat bonuses';
    }

    function normalize(tree) {
        if (!tree || !Array.isArray(tree.nodes)) return tree;
        tree.nodes.forEach(node => {
            node.customDescription = usesCustomDescription(node);
            if (!node.customDescription) node.effect = describe(node);
        });
        return tree;
    }

    window.SkillDescriptions = {describe, normalize, usesCustomDescription};
}());
