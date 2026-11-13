// Gameplay rules have no DOM, wall clock, or Town production. Brewing accepts an RNG.
(function (root) {
    'use strict';
    const content = root.AlchemyContent;
    const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const clone = value => JSON.parse(JSON.stringify(value));
    const integer = value => Number.isSafeInteger(value) && value >= 0;
    // Optional developer capabilities own the bypass. Saved preferences alone
    // cannot enable free liquids in a module-free build.
    const infiniteLiquids = profile => root.DeveloperTools?.allows('alchemyLiquids',profile) === true;
    // Work is measured in microseconds at quarter speed. Integer accumulation
    // makes long offline steps and ordinary 100 ms steps produce the same stock.
    const workPerUnit = id => 3600000000 * 4 / content.liquids[id].perHour;
    const defaults = () => ({version: content.version,unlocked: false,
        liquids: Object.fromEntries(Object.entries(content.liquids).map(([id,def]) => [id,
            {unlocked: def.initiallyUnlocked,amount: 0,work: 0,rateLevel: 0,capacityLevel: 0}])),
        potions: Object.fromEntries(Object.keys(content.recipes).map(id => [id,0])),discovered: [],equipped: null,
        queue: [],rngState: null,lastBrew: null});
    const capacity = (data,id) => content.liquids[id].capacity * (1 + data.liquids[id].capacityLevel);
    const perHour = (data,id) => content.liquids[id].perHour * (1 + data.liquids[id].rateLevel / 4);
    function normalize(value) {
        if (value === undefined) return defaults();
        const data = clone(value), fail = () => {throw new Error('Invalid Alchemy progress in profile.');};
        if (!record(data) || data.version !== content.version || typeof data.unlocked !== 'boolean' ||
            !record(data.liquids) || !record(data.potions) ||
            data.equipped !== null && (typeof data.equipped !== 'string' || !Object.hasOwn(content.recipes,data.equipped))) fail();
        if (Object.keys(data.liquids).some(id => !Object.hasOwn(content.liquids,id)) ||
            Object.keys(data.potions).some(id => !Object.hasOwn(content.recipes,id))) fail();
        for (const [id,def] of Object.entries(content.liquids)) {
            const liquid = data.liquids[id];
            if (!record(liquid) || typeof liquid.unlocked !== 'boolean' || def.initiallyUnlocked && !liquid.unlocked ||
                !integer(liquid.amount) || !integer(liquid.work) || liquid.work >= workPerUnit(id) ||
                !integer(liquid.rateLevel) || liquid.rateLevel > content.maximumUpgradeLevel ||
                !integer(liquid.capacityLevel) || liquid.capacityLevel > content.maximumUpgradeLevel ||
                liquid.amount > capacity(data,id) || !liquid.unlocked && (liquid.amount || liquid.work || liquid.rateLevel || liquid.capacityLevel)) fail();
        }
        // New formulas start with no reserve in existing profiles.
        for (const id of Object.keys(content.recipes)) if (!Object.hasOwn(data.potions,id)) data.potions[id] = 0;
        if (Object.keys(content.recipes).some(id => !Number.isFinite(data.potions[id]) || data.potions[id] < 0 || data.potions[id] > Number.MAX_SAFE_INTEGER)) fail();
        // Earlier saves did not track discoveries; an existing reserve proves
        // the player has already brewed that formula.
        if (data.discovered === undefined) data.discovered = Object.keys(content.recipes).filter(id => data.potions[id] > 0);
        if (!Array.isArray(data.discovered) || data.discovered.some(id => typeof id !== 'string' || !Object.hasOwn(content.recipes,id)) ||
            new Set(data.discovered).size !== data.discovered.length) fail();
        if (data.equipped !== null && (!data.unlocked || data.potions[data.equipped] <= 0)) fail();
        // Profiles from before timed brewing have no queued work.
        if (data.queue === undefined) data.queue = [];
        if (data.rngState === undefined) data.rngState = null;
        if (data.lastBrew === undefined) data.lastBrew = null;
        if (data.rngState !== null && (!integer(data.rngState) || data.rngState > 0xffffffff)) fail();
        const validResult = job => record(job) && typeof job.id === 'string' && Object.hasOwn(content.recipes,job.id) &&
            integer(job.total) && job.total > 0 && job.total <= content.maximumBrewBatch && integer(job.succeeded) && integer(job.failed) &&
            job.succeeded + job.failed <= job.total && Number.isFinite(job.xp) && job.xp >= 0;
        if (!Array.isArray(data.queue) || data.queue.length > content.maximumQueueEntries || !data.unlocked && data.queue.length) fail();
        for (const [index,job] of data.queue.entries()) {
            if (!validResult(job) || !integer(job.remaining) || job.remaining < 1 || job.remaining + job.succeeded + job.failed !== job.total ||
                !integer(job.work) || job.work >= content.recipes[job.id].brewSeconds * 1000000 ||
                index > 0 && (job.work !== 0 || job.succeeded !== 0 || job.failed !== 0 || job.xp !== 0)) fail();
            // Old queues already paid for every remaining attempt. Keep that credit.
            if (job.paid === undefined && job.prepaid === undefined) {
                job.paid = index === 0 && job.work > 0;
                job.prepaid = job.remaining - (job.paid ? 1 : 0);
            }
            if (typeof job.paid !== 'boolean' || !integer(job.prepaid) || job.prepaid > job.remaining - (job.paid ? 1 : 0) ||
                !job.paid && job.work > 0 || index > 0 && job.paid) fail();
        }
        if (data.queue.reduce((sum,job) => sum + job.remaining,0) > content.maximumBrewBatch || data.queue.length && data.rngState === null) fail();
        if (data.lastBrew !== null && (!validResult(data.lastBrew) || data.lastBrew.succeeded + data.lastBrew.failed !== data.lastBrew.total)) fail();
        for (const id of Object.keys(content.recipes)) {
            const reserved = data.queue.filter(job => job.id === id).reduce((sum,job) => sum + job.remaining,0) * content.recipes[id].seconds;
            if (data.potions[id] + reserved > Number.MAX_SAFE_INTEGER) fail();
        }
        return data;
    }
    function canUnlock(profile,worldContent) {
        const index = worldContent.worlds.findIndex(world => world.id === content.unlockWorld);
        if (index < 0) return false;
        if (profile.unlockedWorldIds?.includes(content.unlockWorld) || index === 0) return true;
        const previous = worldContent.worlds[index - 1];
        const boss = worldContent.maps.find(map => map.id === previous.mapIds.at(-1));
        return Boolean(boss && (profile.kills?.[boss.id] || 0) >= boss.goal);
    }
    function unlock(profile) {
        profile.alchemy ||= defaults();
        profile.alchemy.unlocked = true;
    }
    function fighting(profile) {
        return profile.alchemy?.unlocked && !profile.combatPaused &&
            profile.playerHp > 0 && profile.monsterStates.some(monster => monster.hp > 0);
    }
    function tick(profile,seconds,random) {
        const data = profile.alchemy;
        if (!data?.unlocked || !Number.isFinite(seconds) || seconds <= 0) return;
        advanceQueue(profile,Math.round(seconds * 1000000),random);
    }
    function produce(profile,microseconds) {
        const data = profile.alchemy;
        for (const [id,liquid] of Object.entries(data.liquids)) {
            if (!liquid.unlocked) continue;
            const limit = capacity(data,id);
            if (liquid.amount >= limit) {liquid.work = 0;continue;}
            const total = liquid.work + microseconds * (4 + liquid.rateLevel);
            const produced = Math.floor(total / workPerUnit(id));
            liquid.amount = Math.min(limit,liquid.amount + produced);
            liquid.work = liquid.amount >= limit ? 0 : total % workPerUnit(id);
        }
        drainPotion(profile,microseconds);
    }
    function drainPotion(profile,microseconds) {
        const data = profile.alchemy;
        if (data.equipped && fighting(profile)) {
            const id = data.equipped;
            data.potions[id] = Math.max(0,Math.round((data.potions[id] - microseconds / 1000000) * 1000000) / 1000000);
            if (data.potions[id] === 0) data.equipped = null;
        }
    }
    // A saved RNG keeps brewing outcomes independent of combat rolls and step size.
    function nextRandom(data) {
        data.rngState = (Math.imul(data.rngState,1664525) + 1013904223) >>> 0;
        return data.rngState / 0x100000000;
    }
    function advanceQueue(profile,microseconds,random) {
        const data = profile.alchemy;
        while (data.queue.length) {
            const job = data.queue[0], recipe = content.recipes[job.id];
            if (!startBrew(profile)) {
                const wait = waitForIngredients(profile,recipe), step = Math.min(microseconds,wait);
                if (step > 0) produce(profile,step);
                microseconds -= step;
                if (!Number.isFinite(wait) || step < wait || step === 0) return;
                continue;
            }
            if (microseconds <= 0) return;
            const needed = recipe.brewSeconds * 1000000 - job.work;
            const step = Math.min(microseconds,needed);
            produce(profile,step);job.work += step;microseconds -= step;
            if (step < needed) break;
            job.work = 0;job.paid = false;job.remaining--;
            const discovery = !data.discovered.includes(job.id), chance = successChance(profile,job.id);
            const success = discovery || chance >= 1 || (random ? random() : nextRandom(data)) < chance;
            if (success) {
                job.succeeded++;data.potions[job.id] += recipe.seconds;
                if (discovery) data.discovered.push(job.id);
                job.xp += awardBrewXp(profile,job.id);
            } else job.failed++;
            if (!job.remaining) {
                data.lastBrew = {id:job.id,total:job.total,succeeded:job.succeeded,failed:job.failed,xp:job.xp};
                data.queue.shift();
            }
        }
        if (microseconds > 0) produce(profile,microseconds);
    }
    function startBrew(profile) {
        const job = profile.alchemy.queue[0];
        if (!job || job.paid) return Boolean(job);
        if (job.prepaid > 0) job.prepaid--;
        else if (!spend(profile,content.recipes[job.id])) return false;
        job.paid = true;
        return true;
    }
    function waitForIngredients(profile,recipe) {
        if (Object.entries(recipe.materials).some(([id,amount]) => (profile.materials[id] || 0) < amount)) return Infinity;
        let wait = 0;
        for (const [id,amount] of Object.entries(recipe.liquids)) {
            const liquid = profile.alchemy.liquids[id];
            if (!liquid.unlocked || capacity(profile.alchemy,id) < amount) return Infinity;
            if (infiniteLiquids(profile) || liquid.amount >= amount) continue;
            wait = Math.max(wait,Math.ceil(((amount - liquid.amount) * workPerUnit(id) - liquid.work) / (4 + liquid.rateLevel)));
        }
        return wait;
    }
    function upgradeCost(data,id,kind) {
        if (typeof id !== 'string' || !Object.hasOwn(content.liquids,id)) return null;
        const liquid = data.liquids[id];
        if (!liquid || !content.liquids[id]) return null;
        if (kind === 'unlock') return !liquid.unlocked ? content.liquids[id].unlockCost || null : null;
        const field = kind === 'rate' ? 'rateLevel' : kind === 'capacity' ? 'capacityLevel' : null;
        if (!field || !liquid.unlocked || liquid[field] >= content.maximumUpgradeLevel) return null;
        return {liquids: {[id]: 10 + 5 * liquid[field]}};
    }
    function affordable(profile,cost) {
        return Boolean(profile.alchemy?.unlocked && cost && (profile.gold || 0) >= (cost.gold || 0) &&
            Object.entries(cost.liquids || {}).every(([id,amount]) => profile.alchemy.liquids[id]?.unlocked && (infiniteLiquids(profile) || profile.alchemy.liquids[id].amount >= amount)) &&
            Object.entries(cost.materials || {}).every(([id,amount]) => (profile.materials?.[id] || 0) >= amount));
    }
    function spend(profile,cost) {
        if (!affordable(profile,cost)) return false;
        profile.gold -= cost.gold || 0;
        if (!infiniteLiquids(profile)) for (const [id,amount] of Object.entries(cost.liquids || {})) profile.alchemy.liquids[id].amount -= amount;
        for (const [id,amount] of Object.entries(cost.materials || {})) profile.materials[id] -= amount;
        return true;
    }
    function upgrade(profile,id,kind) {
        if (!profile.alchemy) return false;
        if (kind === 'unlock' && !canUnlockLiquid(profile,id)) return false;
        const cost = upgradeCost(profile.alchemy,id,kind);
        if (!spend(profile,cost)) return false;
        const liquid = profile.alchemy.liquids[id];
        if (kind === 'unlock') liquid.unlocked = true;
        else liquid[kind === 'rate' ? 'rateLevel' : 'capacityLevel']++;
        return true;
    }
    function matchingRecipe(liquidIds,materialId) {
        if (!Array.isArray(liquidIds) || !liquidIds.length || new Set(liquidIds).size !== liquidIds.length ||
            liquidIds.some(id => typeof id !== 'string' || !Object.hasOwn(content.liquids,id)) || typeof materialId !== 'string') return null;
        return Object.keys(content.recipes).find(id => {
            const recipe = content.recipes[id], liquids = Object.keys(recipe.liquids), materials = Object.keys(recipe.materials);
            return liquids.length === liquidIds.length && liquids.every(key => liquidIds.includes(key)) && materials.length === 1 && materials[0] === materialId;
        }) || null;
    }
    function maxBrewAmount(profile,id) {
        const recipe = typeof id === 'string' && Object.hasOwn(content.recipes,id) && content.recipes[id];
        if (!recipe || !recipeUnlocked(profile,id) || !profile.alchemy?.unlocked) return 0;
        const queue = profile.alchemy.queue;
        if (queue.length) return 0;
        const reserved = queue.filter(job => job.id === id).reduce((sum,job) => sum + job.remaining,0);
        return Math.max(0,Math.floor(Math.min(
            content.maximumBrewBatch - queue.reduce((sum,job) => sum + job.remaining,0),
            (Number.MAX_SAFE_INTEGER - profile.alchemy.potions[id]) / recipe.seconds - reserved,
            ...Object.entries(recipe.liquids).map(([key,amount]) => profile.alchemy.liquids[key]?.unlocked ? infiniteLiquids(profile) ? Number.MAX_SAFE_INTEGER : profile.alchemy.liquids[key].amount / amount : 0),
            ...Object.entries(recipe.materials).map(([key,amount]) => (profile.materials?.[key] || 0) / amount))));
    }
    const level = profile => root.Professions.progress(profile.professions || root.Professions.defaults(),'alchemy').level;
    const canUnlockLiquid = (profile,id) => Boolean(profile.alchemy?.unlocked && Object.hasOwn(content.liquids,id) && level(profile) >= (content.liquids[id].unlockLevel || 1));
    const recipeUnlocked = (profile,id) => typeof id === 'string' && Object.hasOwn(content.recipes,id) && level(profile) >= content.recipes[id].level;
    function materialUnlocked(profile,id) {
        return Object.entries(content.recipes).some(([key,recipe]) => recipeUnlocked(profile,key) && Object.hasOwn(recipe.materials,id));
    }
    function successChance(profile,id) {
        if (!recipeUnlocked(profile,id)) return 0;
        const recipe = content.recipes[id];
        return Math.min(1,recipe.successChance + (level(profile) - recipe.level) * recipe.successPerLevel);
    }
    function xpPerBrew(profile,id) {
        if (!recipeUnlocked(profile,id)) return 0;
        const current = level(profile), settings = content.progression;
        const softCap = current < settings.softCapLevel ? 1 : settings.softCapMultiplier * settings.softCapDecay ** (current - settings.softCapLevel);
        return content.recipes[id].xp * settings.outgrownMultiplier ** (current - content.recipes[id].level) * softCap;
    }
    function awardBrewXp(profile,id) {
        profile.professions ||= root.Professions.defaults();
        const progress = root.Professions.progress(profile.professions,'alchemy');
        if (progress.capped) {profile.professions.alchemyXpRemainder = 0;return 0;}
        const earned = xpPerBrew(profile,id), total = (profile.professions.alchemyXpRemainder || 0) + earned, whole = Math.floor(total);
        const result = whole > 0 ? root.Professions.awardXp(profile,'alchemy',whole) : null;
        profile.professions.alchemyXpRemainder = result?.level === root.Professions.maxLevel ? 0 : total - whole;
        return earned;
    }
    function brewBatch(profile,id,amount = 1) {
        if (!Number.isSafeInteger(amount) || amount <= 0 || amount > maxBrewAmount(profile,id)) return false;
        if (profile.alchemy.rngState === null) profile.alchemy.rngState = Math.floor(Math.random() * 0x100000000);
        profile.alchemy.queue.push({id,total:amount,remaining:amount,work:0,succeeded:0,failed:0,xp:0,paid:false,prepaid:0});
        startBrew(profile);
        return {id,queued:amount};
    }
    function brew(profile,id,amount = 1) {
        return Boolean(brewBatch(profile,id,amount));
    }
    function cancel(profile) {
        if (!profile.alchemy?.unlocked || !profile.alchemy.queue.length) return false;
        profile.alchemy.queue = [];
        return true;
    }
    function combine(profile,liquidIds,materialId,amount = 1) {
        const id = matchingRecipe(liquidIds,materialId);
        return id && brew(profile,id,amount) ? id : null;
    }
    function equip(profile,id) {
        if (!profile.alchemy?.unlocked || id !== null && (typeof id !== 'string' || !Object.hasOwn(content.recipes,id) || !(profile.alchemy.potions[id] > 0))) return false;
        profile.alchemy.equipped = id;
        return true;
    }
    function effects(profile) {
        const data = profile.alchemy;
        return data?.unlocked && data.equipped && data.potions[data.equipped] > 0
            ? content.recipes[data.equipped].effects || {} : {};
    }
    // Scale the final contribution, never both flat stats and their multipliers.
    function equipmentDefence(profile,withEquipment,withoutEquipment) {
        return withoutEquipment + (withEquipment - withoutEquipment) * (effects(profile).equipmentDefenceMultiplier || 1);
    }
    function onKill(profile,maximumHealth) {
        if (profile.playerHp <= 0 || profile.combatPaused) return 0;
        const active = effects(profile), data = profile.alchemy;
        for (const [id,amount] of Object.entries(active.liquidsOnKill || {})) {
            const liquid = data.liquids[id];
            if (!liquid?.unlocked) continue;
            liquid.amount = Math.min(capacity(data,id),liquid.amount + amount);
            if (liquid.amount === capacity(data,id)) liquid.work = 0;
        }
        // Instant recovery is separate from regeneration and its special caps.
        const recovered = Math.max(0,Math.min(maximumHealth - profile.playerHp,maximumHealth * (active.lifeOnKill || 0)));
        profile.playerHp += recovered;
        return recovered;
    }
    root.Alchemy = Object.freeze({defaults,normalize,clone,canUnlock,unlock,canUnlockLiquid,capacity,perHour,workPerUnit,fighting,tick,upgradeCost,affordable,upgrade,matchingRecipe,maxBrewAmount,level,recipeUnlocked,materialUnlocked,successChance,xpPerBrew,brewBatch,brew,cancel,combine,equip,infiniteLiquids,effects,equipmentDefence,onKill});
}(globalThis));
