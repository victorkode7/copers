(function () {
    'use strict';
    const uniqueEffects = new Set(['shockwaveSlash', 'poisonExecute', 'bloomingFlower',
        'piercingArrow', 'forkingArrow', 'multiShot', 'freezingArrows', 'volcanicEruption', 'eruptionChain', 'shieldGenerator', 'shieldSlam', 'overflowingSlam', 'resonantGuard', 'righteousFire', 'fireOfTheRighteous', 'bleed', 'singledOff', 'deepWounds', 'bleederer']);
    const abilityTargetingDefaults = Object.freeze({
        shockwaveSlash:'aoe', piercingArrow:'aoe', forkingArrow:'aoe', multiShot:'singleTarget',
        volcanicEruption:'aoe', shieldSlam:'singleTarget', overflowingSlam:'aoe',
        righteousFire:'aoe', fireOfTheRighteous:'aoe'
    });

    function getAbilityTargeting(node) {
        if (!node) return null;
        const targeting = node.abilityTargeting;
        if (targeting === undefined) return Object.hasOwn(abilityTargetingDefaults, node.id) ? abilityTargetingDefaults[node.id] : null;
        return targeting === 'singleTarget' || targeting === 'aoe' ? targeting : null;
    }

    function abilityTagLabel(node) {
        const targeting = getAbilityTargeting(node);
        return targeting === 'singleTarget' ? 'Single target' : targeting === 'aoe' ? 'AOE' : '';
    }
    const statDescriptions = [
        ['health', 'maximum health', 'flat'], ['healthMultiplier', 'maximum health', 'multiplier'],
        ['healthRegen', 'flat health regeneration per second', 'flat'],
        ['healthRegenIncrease', 'increased health regeneration', 'percent'],
        ['healthRegenPercent', 'maximum health regenerated per second', 'percent'],
        ['maxFury', 'maximum fury', 'flat'], ['maxFuryMultiplier', 'maximum fury', 'multiplier'],
        ['maxShields', 'maximum shields', 'flat'], ['maxShieldsMultiplier', 'maximum shields', 'multiplier'],
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
        ['bleedChance', 'bleed chance', 'percent'], ['bleedChanceMultiplier', 'bleed chance', 'multiplier'],
        ['bleedDamage', 'bleed damage', 'flat'], ['bleedDamageMultiplier', 'bleed damage', 'multiplier'],
        ['bleedTickRate', 'bleed tick speed', 'percent'], ['bleedTickRateMultiplier', 'bleed tick speed', 'multiplier'],
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
            if (node.abilityTargeting === undefined && Object.hasOwn(abilityTargetingDefaults, node.id)) {
                node.abilityTargeting = abilityTargetingDefaults[node.id];
            }
            node.customDescription = usesCustomDescription(node);
            if (!node.customDescription) node.effect = describe(node);
        });
        return tree;
    }

    window.SkillDescriptions = {describe, normalize, usesCustomDescription, getAbilityTargeting, abilityTagLabel};
}());
