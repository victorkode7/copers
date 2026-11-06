const bleedDamageType = Object.freeze({hitDamageRatio:.1, secondsPerApplication:1, maximumDuration:5, tickIntervalSeconds:1});
const deepWoundsSettings = Object.freeze({hitDamageRatio:.5, maximumStacks:3});

function hasDeepWounds() {
    return getSkillNodeRank('deepWounds') > 0;
}

function getBleedHitDamageRatio() {
    return hasDeepWounds() ? deepWoundsSettings.hitDamageRatio : bleedDamageType.hitDamageRatio;
}

function getBleedMaximumStacks() {
    return hasDeepWounds() ? deepWoundsSettings.maximumStacks : Number.MAX_SAFE_INTEGER;
}

function getBleedStacksPerApplication() {
    return getSkillNodeRank('bleederer') > 0 ? 2 : 1;
}

function strongestBleedApplications(bleed) {
    return combatAbilities.strongestBleedApplications(bleed);
}

function sumBleedApplications(applications) {
    return combatAbilities.sumBleedApplications(applications);
}

function getBleedChance() {
    return cachedCombatStat('getBleedChance', () => Math.max(0, Math.min(1,
        (getSkillStat('bleedChance') + getGearStat('bleedChance')) *
        getSkillMultiplier('bleedChanceMultiplier') * getGearStat('bleedChanceMultiplier'))));
}

function getBleedDamageMultiplier() {
    return cachedCombatStat('getBleedDamageMultiplier', () =>
        getSkillMultiplier('bleedDamageMultiplier') * getGearStat('bleedDamageMultiplier'));
}

function getFlatBleedDamage() {
    return cachedCombatStat('getFlatBleedDamage', () => getSkillStat('bleedDamage') + getGearStat('bleedDamage'));
}

function getBleedDamage(hitDamage = getDamage()) {
    return Math.max(0, (hitDamage * getBleedHitDamageRatio() + getFlatBleedDamage()) * getBleedDamageMultiplier()) * getBleedStacksPerApplication();
}

function getBleedTickDamage(bleed) {
    if (!bleed) return 0;
    // Older saves used one base damage per stack. Keep that pending damage
    // while new applications accumulate damage from their actual triggering hit.
    const stacks = Math.min(bleed.stacks, getBleedMaximumStacks());
    const baseDamage = stacks < bleed.stacks ? sumBleedApplications(strongestBleedApplications(bleed)) : bleed.baseDamagePerTick ?? bleed.stacks;
    return Math.max(0, (baseDamage + stacks * getFlatBleedDamage()) * getBleedDamageMultiplier());
}

function getBleedTickInterval() {
    return cachedCombatStat('getBleedTickInterval', () => bleedDamageType.tickIntervalSeconds / Math.max(.1,
        (1 + getSkillStat('bleedTickRate') + getGearStat('bleedTickRate')) *
        getSkillMultiplier('bleedTickRateMultiplier') * getGearStat('bleedTickRateMultiplier')));
}

function isValidBleedState(bleed) {
    return bleed === undefined || bleed === null || typeof bleed === 'object' && !Array.isArray(bleed) &&
        Number.isSafeInteger(bleed.stacks) && bleed.stacks > 0 &&
        (bleed.baseDamagePerTick === undefined || Number.isFinite(bleed.baseDamagePerTick) && bleed.baseDamagePerTick >= 0) &&
        (bleed.strongestApplications === undefined || Array.isArray(bleed.strongestApplications) &&
            bleed.strongestApplications.length === Math.min(bleed.stacks, deepWoundsSettings.maximumStacks) &&
            bleed.strongestApplications.every(damage => Number.isFinite(damage) && damage >= 0) &&
            sumBleedApplications(bleed.strongestApplications) - (bleed.baseDamagePerTick ?? bleed.stacks) <= Math.max(1e-8, (bleed.baseDamagePerTick ?? bleed.stacks) * 1e-12)) &&
        Number.isFinite(bleed.remainingDuration) && bleed.remainingDuration > 0 && bleed.remainingDuration <= bleedDamageType.maximumDuration &&
        Number.isFinite(bleed.timeUntilTick) && bleed.timeUntilTick > 0 && bleed.timeUntilTick <= 10;
}

function remainingBleedTicks(bleed) {
    return combatAbilities.remainingBleedTicks(bleed);
}

function getRemainingBleedDamage(monster) {
    return combatAbilities.getRemainingBleedDamage(monster);
}

function tryApplyBleed(monster, hitDamage) {
    return combatAbilities.tryApplyBleed(monster, hitDamage);
}

function presentBleedStackProc(monsterId) {
    if (!combatEffectEnabled()) return;
    const monster = getCombatEffectMonster(monsterId);
    const card = getCombatEffectCard(monsterId);
    const badge = card?.querySelector('[data-enemy-bleed-status]');
    if (!monster || !badge) return;
    updateBleedStatus(badge, monster);
    if (monster.hp > 0 && monster.bleed) restartCombatAnimation(badge, 'is-applying');
}

function tickMonsterBleed(monster, elapsed) {
    return combatAbilities.tickMonsterBleed(monster, elapsed);
}

function updateBleedStatus(badge, monster) {
    const bleed = monster.hp > 0 ? monster.bleed : null;
    updateCombatHidden(badge, !bleed);
    if (!bleed) return;
    const stacks = Math.min(bleed.stacks, getBleedMaximumStacks());
    updateCombatText(badge.querySelector('[data-enemy-bleed-count]'), formatBuffAmount(stacks) + 'x');
    updateCombatText(badge.querySelector('[data-enemy-bleed-duration]'), combatStatFormatter.format(bleed.remainingDuration) + 's');
    const description = stacks + ' bleed ' + (stacks === 1 ? 'stack' : 'stacks') + ', ' +
        combatStatFormatter.format(bleed.remainingDuration) + 's remaining. ' +
        combatStatFormatter.format(getBleedTickDamage(bleed) * getMonsterDamageTakenMultiplier(monster)) + ' damage per tick. All stacks expire together.';
    updateCombatAttribute(badge, 'title', description);
    updateCombatAttribute(badge, 'aria-label', description);
}
