// Health and damage rules depend only on supplied values and actor state.
// The host resolves equipment/skills, hit procs, death rewards and visual events.
(function (root) {
    'use strict';

    function getMaxHealth(baseHealth, skillMultiplier, gearMultiplier) {
        return Math.max(1, Math.round(baseHealth * skillMultiplier * gearMultiplier));
    }

    function getPhysicalDamage(baseDamage, skillMultiplier, gearMultiplier, furyStacks, furyDamagePerStack) {
        return Math.max(1, Math.round(baseDamage * skillMultiplier * gearMultiplier * (1 + furyStacks * furyDamagePerStack)));
    }

    function getSpellDamage(baseDamage, skillMultiplier, gearMultiplier, furyStacks, furyDamagePerStack) {
        return Math.max(0, baseDamage * skillMultiplier * gearMultiplier * (1 + furyStacks * furyDamagePerStack));
    }

    function getHealthRegeneration(maximumHealth, flat, maximumHealthRate, increase) {
        return Math.max(0, flat + maximumHealth * maximumHealthRate) * Math.max(0, 1 + increase);
    }

    function getRighteousFireRegeneration(state, elapsed, maximumHealth, regenerationPerSecond, settings) {
        const regeneration = regenerationPerSecond * elapsed;
        const drain = maximumHealth * settings.healthDrainPerSecond * elapsed;
        const healing = Math.min(regeneration, Math.max(0,
            maximumHealth * settings.regenHealthCap - state.playerHp + drain));
        return {drain, healing, excess:regeneration - healing};
    }

    function applyPlayerHealing(state, amount, maximumHealth, healingCap) {
        if (!Number.isFinite(amount) || amount <= 0) return 0;
        const limit = maximumHealth * healingCap;
        const previousHp = state.playerHp;
        // Health above a healing cap drains normally; healing cannot add to it.
        if (previousHp >= limit) return 0;
        state.playerHp = Math.min(limit, previousHp + amount);
        return state.playerHp - previousHp;
    }

    function isValidDamage(health, damage) {
        return health > 0 && Number.isFinite(damage) && damage > 0;
    }

    function applyPlayerDamage(state, damage, source) {
        if (!isValidDamage(state.playerHp, damage)) return null;
        if (source === 'enemy' && state.shieldStacks > 0) {
            state.shieldStacks--;
            return {blocked:true, damageDealt:0, died:false};
        }
        const previousHp = state.playerHp;
        state.playerHp = Math.max(0, state.playerHp - damage);
        if (state.playerHp < 1e-8) state.playerHp = 0;
        return {blocked:false, damageDealt:previousHp - state.playerHp, died:state.playerHp === 0};
    }

    function getBowDamageMultiplier(skillIncrease, gearIncrease) {
        return Math.max(0, 1 + skillIncrease + gearIncrease);
    }

    function getMonsterDamageTakenMultiplier(state, monster, power, singledOffEnabled) {
        if (!monster || monster.hp <= 0 || !singledOffEnabled) return power;
        // Resolve isolation at each hit; a kill can isolate the next target.
        return power * (state.monsterStates.some(other => other !== monster && other.hp > 0) ? 1 : 1.3);
    }

    function getFireDamageTakenMultiplier(monster, fireAbility, scorchedMultiplier) {
        return monster.scorched && fireAbility ? scorchedMultiplier : 1;
    }

    function applyMonsterDamage(monster, damage, multiplier) {
        if (!monster || !isValidDamage(monster.hp, damage)) return null;
        const previousHp = monster.hp;
        monster.hp = Math.max(0, monster.hp - damage * multiplier);
        return {damageDealt:previousHp - monster.hp, died:monster.hp <= 0};
    }

    root.CombatHealth = Object.freeze({
        getMaxHealth, getPhysicalDamage, getSpellDamage, getHealthRegeneration,
        getRighteousFireRegeneration, applyPlayerHealing, isValidDamage, applyPlayerDamage,
        getBowDamageMultiplier, getMonsterDamageTakenMultiplier, getFireDamageTakenMultiplier, applyMonsterDamage
    });
}(globalThis));
