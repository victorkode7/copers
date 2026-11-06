// Buff rules operate only on the supplied state, calculated limits and settings.
// Stat lookup, save validation and buff presentation belong to the host.
(function (root) {
    'use strict';

    function clearFury(state) {
        state.furyStacks = 0;
        state.furyRemaining = 0;
        state.furyDecaying = false;
    }

    function normalizeFury(state, maximum, settings) {
        state.furyStacks = Math.min(maximum, Math.max(0, state.furyStacks));
        // A decaying stack retains its full interval even at low stack counts.
        const durationCap = state.furyDecaying ? settings.decaySeconds : state.furyStacks * settings.secondsPerStack;
        state.furyRemaining = Math.min(state.furyRemaining, durationCap);
        if (state.furyStacks === 0) clearFury(state);
    }

    function gainFuryFromHit(state, maximum, settings) {
        if (state.playerHp <= 0 || state.combatPaused) return;
        normalizeFury(state, maximum, settings);
        if (!maximum) return;
        state.furyStacks = Math.min(maximum, state.furyStacks + 1);
        state.furyRemaining = Math.min(state.furyStacks * settings.secondsPerStack, state.furyRemaining + settings.secondsPerStack);
        state.furyDecaying = false;
    }

    function tickFury(state, elapsed, maximum, settings) {
        normalizeFury(state, maximum, settings);
        if (!state.furyStacks) return;
        state.furyRemaining -= elapsed;
        // Retain elapsed overshoot across every stack lost during a long step.
        if (state.furyRemaining < 1e-8) {
            const lostStacks = Math.min(state.furyStacks, 1 + Math.floor((1e-8 - state.furyRemaining) / settings.decaySeconds));
            state.furyStacks -= lostStacks;
            state.furyRemaining += lostStacks * settings.decaySeconds;
            state.furyDecaying = state.furyStacks > 0;
            if (!state.furyStacks) clearFury(state);
        }
    }

    function clearGatheringPower(state) {
        state.gatheringPower = {stacks:0, progress:0, remaining:0};
    }

    function getGatheringPowerMultiplier(state, enabled, settings) {
        return enabled ? 1 + Math.min(settings.maxStacks, state.gatheringPower?.stacks || 0) * settings.damagePerStack : 1;
    }

    function tickGatheringPower(state, elapsed, enabled, settings) {
        if (!enabled || state.playerHp <= 0) {clearGatheringPower(state); return;}
        const power = state.gatheringPower ||= {stacks:0, progress:0, remaining:0};
        power.stacks = Math.min(settings.maxStacks, power.stacks);
        power.remaining = Math.min(settings.resetSeconds, power.remaining);
        if (!state.combatPaused && state.playerHp > 0 && state.monsterStates.some(monster => monster.hp > 0)) {
            power.remaining = settings.resetSeconds;
            const progress = power.progress + elapsed;
            const gained = Math.floor(progress + 1e-8);
            power.stacks = Math.min(settings.maxStacks, power.stacks + gained);
            power.progress = Math.max(0, progress - gained);
        } else {
            power.progress = 0;
            power.remaining = Math.max(0, power.remaining - elapsed);
            if (power.remaining < 1e-8) clearGatheringPower(state);
        }
    }

    root.CombatBuffs = Object.freeze({
        clearFury, normalizeFury, gainFuryFromHit, tickFury,
        clearGatheringPower, getGatheringPowerMultiplier, tickGatheringPower
    });
}(globalThis));
