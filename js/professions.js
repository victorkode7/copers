// Profession progression is independent of character XP and combat skill points.
(function (root) {
    'use strict';
    const definitions = Object.freeze(Object.fromEntries([
        ['alchemy','Alchemy','Combining ingredients into potions.']
    ].map(([id,name,description]) => [id,Object.freeze({id,name,description})])));
    const maxLevel = 99;
    const known = id => typeof id === 'string' && Object.hasOwn(definitions,id);
    // Total XP is the only saved value; levels and progress are always derived.
    const xpForLevel = level => {
        if (!Number.isInteger(level) || level < 1 || level > maxLevel) throw new RangeError('Invalid profession level.');
        return 50 * (level - 1) * level;
    };
    const maxXp = xpForLevel(maxLevel);
    const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const defaults = () => ({version:1,xp:Object.fromEntries(Object.keys(definitions).map(id => [id,0]))});
    function normalize(value) {
        if (value === undefined) return defaults();
        const fail = () => {throw new Error('Invalid profession progress in profile.');};
        if (!record(value) || value.version !== 1 || !record(value.xp)) fail();
        if (value.alchemyXpRemainder !== undefined && (!Number.isFinite(value.alchemyXpRemainder) || value.alchemyXpRemainder < 0 || value.alchemyXpRemainder >= 1)) fail();
        // Retain future profession IDs on round trips without exposing them as playable skills.
        for (const [id,xp] of Object.entries(value.xp)) {
            if (!/^[a-z][a-zA-Z0-9_-]*$/.test(id) || ['constructor','prototype','__proto__'].includes(id) ||
                !Number.isSafeInteger(xp) || xp < 0 || known(id) && xp > maxXp) fail();
        }
        return {...JSON.parse(JSON.stringify(value)),xp:{...defaults().xp,...value.xp}};
    }
    function progress(data,id) {
        if (!known(id)) return null;
        const totalXp = data.xp[id];
        let level = 1;
        while (level < maxLevel && totalXp >= xpForLevel(level + 1)) level++;
        const capped = level === maxLevel, earned = totalXp - xpForLevel(level);
        const required = capped ? 0 : xpForLevel(level + 1) - xpForLevel(level);
        return {level,totalXp,earned,required,capped,fraction:capped ? 1 : earned / required};
    }
    // Gameplay callers award once after a successful action, including offline actions.
    // Alchemy owns recipe XP and its fractional remainder.
    function awardXp(profile,id,amount) {
        if (!known(id) || !Number.isSafeInteger(amount) || amount <= 0) return null;
        const data = profile.professions || defaults();
        const before = progress(data,id), added = Math.min(amount,maxXp - before.totalXp);
        profile.professions = data;
        data.xp[id] += added;
        const after = progress(data,id);
        return {added,level:after.level,levelsGained:after.level - before.level};
    }
    root.Professions = Object.freeze({definitions,maxLevel,maxXp,xpForLevel,defaults,normalize,progress,awardXp});
}(globalThis));
