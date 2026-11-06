// Brands and combat power use simulation time, including offline play.
const elementalSkillSettings = Object.freeze({manaCost:5, duration:10, tickSeconds:1, explosionStacks:10, explosionMultiplier:5, scorchedMultiplier:1.2});
const elementalBrands = Object.freeze([
    {id:'rimeBrand', upgrade:'glacialRupture', name:'Rime Brand', stacks:'Rime', element:'cold'},
    {id:'emberBrand', upgrade:'cinderRupture', name:'Ember Brand', stacks:'Cinders', element:'fire'}
]);
const fireAbilityIds = new Set(['emberBrand','cinderRupture','volcanicEruption','righteousFire','fireOfTheRighteous']);
const gatheringPowerSettings = Object.freeze({maxStacks:50,damagePerStack:.02,resetSeconds:1});

function normalizeElementalSaveTimers(saved) {
    const power=saved.gatheringPower;
    // Older saves allowed unlimited stacks and a two-second grace period.
    // Bring valid historical values within the new limits before validation.
    if (power && typeof power==='object' && !Array.isArray(power) &&
        Number.isSafeInteger(power.stacks) && power.stacks>=0 &&
        Number.isFinite(power.remaining) && power.remaining>=0 && power.remaining<=2) {
        power.stacks=Math.min(gatheringPowerSettings.maxStacks,power.stacks);
        power.remaining=Math.min(gatheringPowerSettings.resetSeconds,power.remaining);
    }
    if (!Array.isArray(saved.monsterStates)) return;
    for (const monster of saved.monsterStates) {
        if (!monster || typeof monster!=='object') continue;
        for (const settings of elementalBrands) {
            const brand=monster[settings.id];
            if (brand && typeof brand==='object' && !Array.isArray(brand) && brand.remainingDuration===undefined) {
                brand.remainingDuration=elementalSkillSettings.duration;
            }
            // Old fixed-step ticks could save 1.0000000000000002 at the
            // one-second boundary. Repair only that tiny numerical overshoot.
            if (brand && typeof brand==='object' && !Array.isArray(brand) &&
                Number.isFinite(brand.timeUntilTick) && brand.timeUntilTick>elementalSkillSettings.tickSeconds &&
                brand.timeUntilTick<=elementalSkillSettings.tickSeconds+1e-8) {
                brand.timeUntilTick=elementalSkillSettings.tickSeconds;
            }
        }
    }
}

function isValidBrandState(brand) {
    return brand === undefined || brand === null || typeof brand === 'object' && !Array.isArray(brand) &&
        Number.isFinite(brand.timeUntilTick) && brand.timeUntilTick > 0 && brand.timeUntilTick <= elementalSkillSettings.tickSeconds &&
        Number.isSafeInteger(brand.stacks) && brand.stacks >= 0 && brand.stacks < elementalSkillSettings.explosionStacks &&
        (brand.remainingDuration===undefined || Number.isFinite(brand.remainingDuration) && brand.remainingDuration>0 && brand.remainingDuration<=elementalSkillSettings.duration);
}

function isValidGatheringPower(power) {
    return power === undefined || power !== null && typeof power === 'object' && !Array.isArray(power) &&
        Number.isSafeInteger(power.stacks) && power.stacks >= 0 && power.stacks<=gatheringPowerSettings.maxStacks &&
        Number.isFinite(power.progress) && power.progress >= 0 && power.progress < 1 &&
        Number.isFinite(power.remaining) && power.remaining >= 0 && power.remaining <= gatheringPowerSettings.resetSeconds;
}

function clearGatheringPower() {
    CombatBuffs.clearGatheringPower(state);
}

function getGatheringPowerMultiplier() {
    return CombatBuffs.getGatheringPowerMultiplier(state, getSkillNodeRank('gatheringPower')>0, gatheringPowerSettings);
}

function tickGatheringPower(elapsed) {
    CombatBuffs.tickGatheringPower(state, elapsed, getSkillNodeRank('gatheringPower')>0, gatheringPowerSettings);
}

function castElementalBrand(id) {
    return combatAbilities.castElementalBrand(id);
}

function getElementalExplosionTargets(center) {
    return combatAbilities.getElementalExplosionTargets(center);
}

function detonateElementalBrand(center, settings) {
    return combatAbilities.detonateElementalBrand(center, settings);
}

function tickElementalBrands(monster,elapsed) {
    return combatAbilities.tickElementalBrands(monster, elapsed);
}

function clearElementalDebuffs(monster) {
    return combatAbilities.clearElementalDebuffs(monster);
}

function getFireDamageTakenMultiplier(monster,abilityId) {
    return CombatHealth.getFireDamageTakenMultiplier(monster, fireAbilityIds.has(abilityId), elementalSkillSettings.scorchedMultiplier);
}

function createElementalIcon(kind) {
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
    const path=document.createElementNS(svg.namespaceURI,'path');
    if (kind==='rimeBrand') {
        path.setAttribute('d','M12 2v20M3.34 7l17.32 10M3.34 17l17.32-10M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M20 14l-4 1 1 4M7 19l1-4-4-1M17 5l-1 4 4 1');
        path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.8');
    } else {
        path.setAttribute('d',kind==='scorched'
            ? 'M13 2c3 5-1 7 2 10 1-2 3-3 3-3 6 10-1 14-6 14S2 18 6 11c0 4 3 4 4 2 2-3-1-5 3-11Zm-1 13-2 4h4l-2-4Z'
            : 'M13 1c2 6-3 8 1 12 1-3 4-5 4-5 7 11 1 15-6 15S1 18 5 10c0 4 3 5 4 2 1-4-1-6 4-11Z');
        path.setAttribute('fill','currentColor');path.setAttribute('fill-rule','evenodd');
    }
    svg.append(path);return svg;
}

function renderElementalStatuses(view,monster) {
    for (const settings of elementalBrands) {
        const brand=monster.hp>0 && getSkillNodeRank(settings.id)>0 && monster[settings.id];
        const badge=view[settings.id+'Status'];
        const upgraded=getSkillNodeRank(settings.upgrade)>0;
        updateCombatHidden(badge,!brand);
        const remaining=brand ? brand.remainingDuration ?? elementalSkillSettings.duration : 0;
        updateCombatText(badge.querySelector('strong'),brand ? (upgraded?brand.stacks+'/10':Math.ceil(remaining)+'s') : '');
        const label=settings.name+': 100% spell damage per second for 10 seconds; does not stack. '+combatStatFormatter.format(remaining)+'s remaining.'+(upgraded?' '+settings.stacks+' '+(brand?.stacks||0)+'/10. At 10 stacks, explode for 500% spell damage to adjacent enemies.':'');
        updateCombatAttribute(badge,'title',label);updateCombatAttribute(badge,'aria-label',label);
        view.card.classList.toggle('has-'+settings.id,Boolean(brand));
    }
    updateCombatHidden(view.scorchedStatus,monster.hp<=0 || !monster.scorched);
    updateCombatText(view.scorchedStatus.querySelector('strong'),'+20%');
    const scorchLabel='Scorched: takes 20% more damage from fire abilities until death. Does not stack.';
    updateCombatAttribute(view.scorchedStatus,'title',scorchLabel);updateCombatAttribute(view.scorchedStatus,'aria-label',scorchLabel);
}

function showElementalBurst(targetIds,element,explosion) {
    if(combatEffects===null || !targetIds.length)return;
    emitCombatEvent('elementalBurst', {mapId:state.selectedMap,targetIds:[...targetIds],element,explosion});
}

function presentElementalBurst({targetIds,element,explosion}) {
    if(!combatEffectEnabled('abilities'))return;
    const validIds=targetIds.filter(id=>getCombatEffectMonster(id) && getCombatEffectCard(id));
    if(!validIds.length)return;
    if(window.CombatWebGLEffects?.elemental(validIds,element,explosion))return;
    const layer=document.createElement('div');layer.className='elemental-effect-layer';
    layer.setAttribute('aria-hidden','true');elements.combatPanel.append(layer);
    const frame=getCombatOverlayBounds(layer);
    if (!frame.width || !frame.height) {layer.remove();return;}
    for (const id of validIds) {
        const card=getCombatEffectCard(id);if(!card)continue;
        const bounds=getCombatEffectBounds(card);
        const burst=document.createElement('span');
        burst.className='elemental-burst is-'+element+(explosion?' is-explosion':'');
        burst.style.left=(bounds.left-frame.left)+'px';burst.style.top=(bounds.top-frame.top)+'px';
        burst.style.width=bounds.width+'px';burst.style.height=bounds.height+'px';
        // Deterministic particle directions keep visuals out of combat RNG.
        for(let index=0;index<(explosion?8:5);index++) {
            const particle=document.createElement('i'),angle=index*Math.PI/4;
            particle.style.setProperty('--spark-x',Math.cos(angle)*70+'px');
            particle.style.setProperty('--spark-y',Math.sin(angle)*55+'px');
            particle.style.setProperty('--spark-angle',index*45+'deg');
            particle.style.setProperty('--spark-delay',index*14+'ms');burst.append(particle);
        }
        layer.append(burst);
    }
    setTimeout(()=>layer.remove(),1100);
}
