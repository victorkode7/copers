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
    if (!bleed) return [];
    // Older profiles saved only the combined pool. Treat those applications as
    // equal shares; new profiles retain their three strongest contributions.
    const applications = bleed.strongestApplications
        ? [...bleed.strongestApplications]
        : Array(Math.min(bleed.stacks, deepWoundsSettings.maximumStacks)).fill((bleed.baseDamagePerTick ?? bleed.stacks) / bleed.stacks);
    return applications.sort((a,b) => b-a).slice(0,deepWoundsSettings.maximumStacks);
}

function sumBleedApplications(applications) {
    return applications.reduce((sum,damage) => Math.min(Number.MAX_VALUE, sum + damage), 0);
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
    return bleed && bleed.timeUntilTick <= bleed.remainingDuration + 1e-8
        ? Math.max(0, 1 + Math.floor((bleed.remainingDuration - bleed.timeUntilTick + 1e-8) / getBleedTickInterval())) : 0;
}

function getRemainingBleedDamage(monster) {
    return monster?.hp > 0 && monster.bleed
        ? remainingBleedTicks(monster.bleed) * getBleedTickDamage(monster.bleed) * getMonsterDamageTakenMultiplier(monster) : 0;
}

function tryApplyBleed(monster, hitDamage) {
    if (!monster || monster.hp <= 0 || !Number.isFinite(hitDamage) || hitDamage <= 0) return false;
    const chance = getBleedChance();
    if (chance <= 0 || Math.random() >= chance) return false;
    const bleed = monster.bleed;
    // Target vulnerability is applied when the DOT ticks, not baked into the
    // pool as well. This keeps direct attacks and ability hits consistent.
    const addedDamage = hitDamage * getBleedHitDamageRatio();
    const applications = getBleedStacksPerApplication();
    const strongest = strongestBleedApplications(bleed && bleed.remainingDuration > 0 ? bleed : null);
    for (let index = 0; index < applications; index++) strongest.push(addedDamage);
    strongest.sort((a,b) => b-a);
    strongest.length = Math.min(strongest.length, deepWoundsSettings.maximumStacks);
    if (bleed && bleed.remainingDuration > 0) {
        bleed.baseDamagePerTick = hasDeepWounds() ? sumBleedApplications(strongest)
            : Math.min(Number.MAX_VALUE, (bleed.baseDamagePerTick ?? bleed.stacks) + addedDamage * applications);
        bleed.stacks = Math.min(getBleedMaximumStacks(), bleed.stacks + applications);
        bleed.strongestApplications = strongest;
        bleed.remainingDuration = Math.min(bleedDamageType.maximumDuration, bleed.remainingDuration + bleedDamageType.secondsPerApplication * applications);
    } else {
        monster.bleed = {stacks:applications, baseDamagePerTick:addedDamage * applications, strongestApplications:strongest,
            remainingDuration:bleedDamageType.secondsPerApplication * applications, timeUntilTick:getBleedTickInterval()};
    }
    presentCombatEffect(() => {
        const card = getCombatEffectCard(monster.id);
        const badge = card?.querySelector('[data-enemy-bleed-status]');
        if (!badge || !monster.bleed || monster.hp <= 0) return;
        updateBleedStatus(badge, monster);
        restartCombatAnimation(badge, 'is-applying');
    });
    return true;
}

function tickMonsterBleed(monster, elapsed) {
    const bleed = monster.bleed;
    if (monster.hp <= 0 || !bleed || elapsed <= 0) return false;
    if (bleed.stacks > getBleedMaximumStacks()) {
        bleed.strongestApplications = strongestBleedApplications(bleed);
        bleed.stacks = getBleedMaximumStacks();
        bleed.baseDamagePerTick = sumBleedApplications(bleed.strongestApplications);
    }
    const activeSeconds = Math.min(elapsed, bleed.remainingDuration);
    const interval = getBleedTickInterval();
    const ticks = bleed.timeUntilTick <= activeSeconds + 1e-8
        ? Math.max(0, 1 + Math.floor((activeSeconds - bleed.timeUntilTick + 1e-8) / interval)) : 0;
    const damage = ticks * getBleedTickDamage(bleed);
    bleed.timeUntilTick = Math.max(1e-8, bleed.timeUntilTick - activeSeconds + ticks * interval);
    bleed.remainingDuration = Math.max(0, bleed.remainingDuration - elapsed);
    // The tick exactly at expiry still lands; no stacks survive the shared timer.
    if (bleed.remainingDuration < 1e-8) monster.bleed = null;
    if (damage > 0) applyDamageToMonster(monster, damage, 'bleed');
    return monster.hp <= 0;
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
