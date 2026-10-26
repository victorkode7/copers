const bleedDamageType = Object.freeze({hitDamageRatio:.1, secondsPerApplication:1, maximumDuration:5, tickIntervalSeconds:1});

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
    return Math.max(0, (hitDamage * bleedDamageType.hitDamageRatio + getFlatBleedDamage()) * getBleedDamageMultiplier());
}

function getBleedTickDamage(bleed) {
    if (!bleed) return 0;
    // Older saves used one base damage per stack. Keep that pending damage
    // while new applications accumulate damage from their actual triggering hit.
    const baseDamage = bleed.baseDamagePerTick ?? bleed.stacks;
    return Math.max(0, (baseDamage + bleed.stacks * getFlatBleedDamage()) * getBleedDamageMultiplier());
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
        Number.isFinite(bleed.remainingDuration) && bleed.remainingDuration > 0 && bleed.remainingDuration <= bleedDamageType.maximumDuration &&
        Number.isFinite(bleed.timeUntilTick) && bleed.timeUntilTick > 0 && bleed.timeUntilTick <= 10;
}

function remainingBleedTicks(bleed) {
    return bleed && bleed.timeUntilTick <= bleed.remainingDuration + 1e-8
        ? Math.max(0, 1 + Math.floor((bleed.remainingDuration - bleed.timeUntilTick + 1e-8) / getBleedTickInterval())) : 0;
}

function getRemainingBleedDamage(monster) {
    return monster?.hp > 0 && monster.bleed ? remainingBleedTicks(monster.bleed) * getBleedTickDamage(monster.bleed) : 0;
}

function tryApplyBleed(monster, hitDamage) {
    if (!monster || monster.hp <= 0 || !Number.isFinite(hitDamage) || hitDamage <= 0) return false;
    const chance = getBleedChance();
    if (chance <= 0 || Math.random() >= chance) return false;
    const bleed = monster.bleed;
    const addedDamage = hitDamage * bleedDamageType.hitDamageRatio;
    if (bleed && bleed.remainingDuration > 0) {
        bleed.baseDamagePerTick = Math.min(Number.MAX_VALUE, (bleed.baseDamagePerTick ?? bleed.stacks) + addedDamage);
        bleed.stacks = Math.min(Number.MAX_SAFE_INTEGER, bleed.stacks + 1);
        bleed.remainingDuration = Math.min(bleedDamageType.maximumDuration, bleed.remainingDuration + bleedDamageType.secondsPerApplication);
    } else {
        monster.bleed = {stacks:1, baseDamagePerTick:addedDamage, remainingDuration:bleedDamageType.secondsPerApplication, timeUntilTick:getBleedTickInterval()};
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
    updateCombatText(badge.querySelector('[data-enemy-bleed-count]'), formatBuffAmount(bleed.stacks) + 'x');
    updateCombatText(badge.querySelector('[data-enemy-bleed-duration]'), combatStatFormatter.format(bleed.remainingDuration) + 's');
    const description = bleed.stacks + ' bleed ' + (bleed.stacks === 1 ? 'stack' : 'stacks') + ', ' +
        combatStatFormatter.format(bleed.remainingDuration) + 's remaining. ' +
        combatStatFormatter.format(getBleedTickDamage(bleed)) + ' damage per tick. All stacks expire together.';
    updateCombatAttribute(badge, 'title', description);
    updateCombatAttribute(badge, 'aria-label', description);
}
