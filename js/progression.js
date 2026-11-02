(function () {
    'use strict';
    const pointsPerWorld = 15;
    function defeatedBosses(profile, worlds) {
        const defeated = new Set((profile.defeatedBossWorldIds || []).filter(id => worlds.some(world => world.id === id)));
        worlds.forEach(world => {
            if ((profile.kills?.[world.mapIds.at(-1)] || 0) > 0) defeated.add(world.id);
        });
        return [...defeated];
    }
    const skillPointCap = (profile, worlds) => pointsPerWorld * (1 + defeatedBosses(profile, worlds).length);
    const earnedSkillPoints = (profile, worlds) => Math.min(profile.level, skillPointCap(profile, worlds));
    function experienceMultiplier(level, worldIndex) {
        const over = level - pointsPerWorld * (Math.max(0, worldIndex) + 1);
        return over < 0 ? 1 : [0.1, 0.05, 0.01, 0.001, 0.0001][Math.min(over, 4)];
    }
    function awardExperience(profile, rawAmount, worldIndex, requirement) {
        if (!Number.isFinite(rawAmount) || rawAmount <= 0) return 0;
        let remaining = rawAmount, levels = 0;
        while (remaining > 0) {
            const rate = experienceMultiplier(profile.level, worldIndex);
            const fraction = profile.experienceRemainder || 0;
            const needed = requirement(profile.level) - profile.experience;
            const gained = remaining * rate + fraction;
            if (gained + 1e-10 < needed) {
                const whole = Math.floor(gained + 1e-10);
                profile.experience += whole;
                profile.experienceRemainder = Math.max(0, gained - whole);
                break;
            }
            // Re-evaluate the penalty at each new level, even within one kill.
            remaining = Math.max(0, remaining - (needed - fraction) / rate);
            profile.experience = 0; profile.experienceRemainder = 0;
            profile.level++; levels++;
        }
        return levels;
    }
    function assertSave(profile) {
        if (profile.experienceRemainder !== undefined && (!Number.isFinite(profile.experienceRemainder) || profile.experienceRemainder < 0 || profile.experienceRemainder >= 1)) throw new Error('Invalid fractional experience in profile.');
        if (profile.skillPointTrimPending !== undefined && typeof profile.skillPointTrimPending !== 'boolean') throw new Error('Invalid skill point recovery state.');
    }
    function normalizeSave(profile, worlds) {
        profile.defeatedBossWorldIds = defeatedBosses(profile, worlds);
        profile.experienceRemainder ??= 0;
        profile.skillPointRecoveryRanks ??= null;
        profile.skillPointTrimPending ??= false;
        const earned = earnedSkillPoints(profile, worlds);
        const count = ranks => Object.values(ranks).reduce((sum, rank) => sum + rank, 0);
        if (count(profile.skillRanks) > earned) {
            profile.skillPointRecoveryRanks = {...profile.skillRanks};
            profile.skillPointTrimPending = true;
            profile.skillRanks = {};
            profile.currentView = 'upgrades'; profile.combatPaused = true;
        }
        profile.skillPoints = earned - count(profile.skillRanks);
        return profile;
    }
    window.Progression = {pointsPerWorld, defeatedBosses, skillPointCap, earnedSkillPoints, experienceMultiplier, awardExperience, assertSave, normalizeSave};
}());
