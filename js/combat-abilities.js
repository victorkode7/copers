// Ability rules operate on supplied state, settings, randomness and callbacks.
// Presentation, stat lookup and death/reward handling are supplied by the host.
(function (root) {
    'use strict';

    function create({state, rules, random, settings}) {
        const {
            arrowSkillSettings, arrowTravelDirections, arrowImpactPause, eruptionSkillSettings,
            spellSettings, voidMissileTiming, gameTickSeconds, elementalSkillSettings, elementalBrands,
            bleedDamageType, deepWoundsSettings, poisonDamageType, shieldSlamDamagePerStack
        } = settings;
        let resolvingShieldSlam = false;

        // Arrows and formation

        function getMonsterGridPosition(monster) {
            const index = state.monsterStates.indexOf(monster);
            const columns = Math.max(1, state.monsterColumns || 1);
            return {row: Math.floor(index / columns), column: index % columns};
        }

        function getArrowRowTargets(target) {
            const row = getMonsterGridPosition(target).row;
            const columns = Math.max(1, state.monsterColumns || 1);
            return state.monsterStates.slice(row * columns, (row + 1) * columns).filter(monster => monster.hp > 0);
        }

        function getForwardDiagonalArrowTargets(source, visited, travel) {
            const position = getMonsterGridPosition(source);
            const columns = Math.max(1, state.monsterColumns || 1);
            // Keep the original firing direction for the whole chain. Each fork may
            // choose either forward diagonal, allowing a zigzag without turning back.
            return [{x: -1, y: -1}, {x: 1, y: -1}, {x: -1, y: 1}, {x: 1, y: 1}]
                .filter(offset => offset.x * travel.x + offset.y * travel.y > 0)
                .map(offset => {
                    const row = position.row + offset.y, column = position.column + offset.x;
                    return row >= 0 && column >= 0 && column < columns
                        ? state.monsterStates[row * columns + column] : null;
                })
                .filter(monster => monster && monster.hp > 0 && !visited.has(monster.id));
        }

        function getMonsterAttackInterval(monster) {
            return rules.monsterDefinition(monster).attackInterval +
                (monster.freezeRemaining > 0 ? arrowSkillSettings.freezeDelay : 0);
        }

        function applyArrowFreeze(monster) {
            if (rules.getSkillNodeRank('freezingArrows') <= 0 || monster.hp <= 0) return;
            // Refresh the duration; repeated arrows never stack the slowdown.
            monster.freezeRemaining = arrowSkillSettings.freezeDuration;
        }

        function shootAbilityArrow(targets, damage, kind, direction = 0) {
            if (!targets.length) return;
            if (kind === 'piercingArrow') {
                direction = 0;
                // One full-row beam, regardless of how many enemies it hits or misses.
                rules.showCombatArrow(null, targets[0].id, kind, direction);
            }
            // Reserve piercing's initial row so a fork cannot hit a row target twice.
            const visited = new Set(targets.map(monster => monster.id));
            const queue = targets.map(target => ({target, sourceId: null, kind, travel: arrowTravelDirections[direction], visualDelay: 0}));
            const canFork = rules.getSkillNodeRank('forkingArrow') > 0;
            const visualShots = [];
            for (let index = 0; index < queue.length; index++) {
                const shot = queue[index], target = shot.target;
                if (target.hp <= 0) continue;
                if (shot.kind !== 'piercingArrow') visualShots.push(shot);
                if (random() * 100 >= rules.getHitChance(rules.getPlayerAccuracy(), rules.monsterDefinition(target).evasion)) {
                    rules.emitCombatEvent('monsterDodged', {monsterId: target.id});
                    continue;
                }
                if (shot.kind === 'multiShot') rules.showMonsterHitBadge(target.id, 'MULTISHOT');
                rules.applyDamageToMonster(target, damage, 'physical', shot.kind);
                applyArrowFreeze(target);
                // Only Multishot's original arrow rolls attack procs. Generated arrows
                // still poison, freeze and fork, but cannot recursively cast Multishot.
                if (shot.kind === 'multiShot') {
                    triggerShockwaveSlash(target, damage);
                    triggerVolcanicEruption(target, damage);
                    triggerAttackArrowSkills(target, damage, false);
                }
                if (canFork) {
                    const adjacent = getForwardDiagonalArrowTargets(target, visited, shot.travel);
                    if (adjacent.length) {
                        const next = adjacent[Math.floor(random() * adjacent.length)];
                        visited.add(next.id);
                        queue.push({target: next, sourceId: target.id, kind: 'forkingArrow',
                            travel: shot.travel,
                            visualDelay: shot.visualDelay + rules.getArrowFlightTime(shot.kind, shot.sourceId) + arrowImpactPause});
                    }
                }
            }
            // Only animate a fork when an arrow actually travels to a
            // second living target. Keep the final hop visible even if it cannot fork again.
            const forked = visualShots.some(shot => shot.sourceId);
            visualShots.forEach(shot => {
                // Multishot has no separate projectile effect. If it forks, show its
                // incoming leg as part of that real fork chain so the origin stays clear.
                if (shot.kind === 'multiShot' && !forked) return;
                if (shot.kind === 'forkingArrow' && !shot.sourceId && !forked) return;
                const visualKind = shot.kind === 'multiShot' ? 'forkingArrow' : shot.kind;
                rules.showCombatArrow(shot.sourceId, shot.target.id, visualKind, direction, {delay: shot.visualDelay});
            });
        }

        function triggerAttackArrowSkills(target, damage, includeMultishot = true) {
            if (rules.getSkillNodeRank('piercingArrow') > 0 && random() < arrowSkillSettings.piercingChance) {
                shootAbilityArrow(getArrowRowTargets(target), damage * 2, 'piercingArrow');
            }
            if (rules.getSkillNodeRank('forkingArrow') > 0 && random() < arrowSkillSettings.forkingChance) {
                const living = state.monsterStates.filter(monster => monster.hp > 0);
                if (living.length) {
                    const enemy = living[Math.floor(random() * living.length)];
                    const direction = Math.floor(random() * 4);
                    shootAbilityArrow([enemy], damage, 'forkingArrow', direction);
                }
            }
            if (includeMultishot && rules.getSkillNodeRank('multiShot') > 0) {
                const living = state.monsterStates.filter(monster => monster.hp > 0);
                if (living.length) shootAbilityArrow([living[Math.floor(random() * living.length)]], damage, 'multiShot');
            }
        }

        // Eruptions and chains

        function getMaxEruptionChains() {
            return Math.max(0, Math.floor(rules.getSkillStat('eruptionChains')));
        }

        function getEruptionTargets(center) {
            const origin = getMonsterGridPosition(center);
            const columns = Math.max(1, state.monsterColumns || 1);
            return state.monsterStates.filter((monster, index) => {
                if (monster.hp <= 0) return false;
                return Math.abs(Math.floor(index / columns) - origin.row) + Math.abs(index % columns - origin.column) <= 1;
            });
        }

        function triggerVolcanicEruption(target, damage) {
            if (rules.getSkillNodeRank('volcanicEruption') <= 0 || !target || state.playerHp <= 0) return;
            detonateEruption(target, damage);
            queueEruptionChain(target.id, damage, getMaxEruptionChains());
            // Each triggering hit pays once, regardless of splash targets or chains.
            rules.applyDamageToPlayer(rules.getPlayerMaxHealth() * eruptionSkillSettings.healthCost, 'self');
        }

        function detonateEruption(center, damage) {
            const targets = getEruptionTargets(center);
            rules.showVolcanicEruption(center.id, targets.map(monster => monster.id));
            targets.forEach(monster => {
                rules.applyDamageToMonster(monster, damage * eruptionSkillSettings.damageMultiplier, 'physical', 'volcanicEruption');
            });
        }

        function queueEruptionChain(sourceId, damage, chains) {
            if (chains <= 0) return;
            const living = state.monsterStates.filter(monster => monster.hp > 0);
            if (!living.length) return;
            const target = living[Math.floor(random() * living.length)];
            state.pendingEruptions.push({targetId: target.id, damage, chainsRemaining: chains - 1,
                remaining: eruptionSkillSettings.chainDelay / 1000});
            rules.showEruptionChain(sourceId, target.id, 0);
        }

        function tickPendingEruptions(elapsed) {
            let remaining = elapsed;
            while (state.pendingEruptions.length) {
                const nextArrival = Math.min(...state.pendingEruptions.map(hit => hit.remaining));
                const step = Math.min(remaining, nextArrival);
                state.pendingEruptions.forEach(hit => { hit.remaining = Math.max(0, hit.remaining - step); });
                remaining -= step;
                const arrived = state.pendingEruptions.filter(hit => hit.remaining < 1e-8);
                state.pendingEruptions = state.pendingEruptions.filter(hit => hit.remaining >= 1e-8);
                if (!arrived.length) break;
                arrived.forEach(hit => {
                    const center = state.monsterStates.find(monster => monster.id === hit.targetId);
                    if (!center) return;
                    // The crack erupts at its destination even if that monster died en route.
                    detonateEruption(center, hit.damage);
                    queueEruptionChain(center.id, hit.damage, hit.chainsRemaining);
                });
                if (remaining < 1e-8) break;
            }
        }

        // Mana and Void spells

        function getVoidMissileSchedule(index,visualDelay=0,flight=voidMissileTiming.flight) {
            const delay=visualDelay/1000+index*voidMissileTiming.stagger;
            // Impacts are resolved on fixed combat steps. Stretch individual flights by
            // at most one step so the visible arrival shares the actual damage deadline.
            const arrival=Math.ceil((delay+flight-1e-8)/gameTickSeconds)*gameTickSeconds;
            return {delay,flight:arrival-delay,arrival};
        }

        function normalizePlayerMana() {
            const maximum=rules.getPlayerMaxMana();
            // Unlocking the first reserve grants a full pool; subsequent capacity
            // increases and swapping equipment cannot repeatedly refill an existing pool.
            if (!state.manaCapacity && maximum > 0) state.playerMana=maximum;
            state.manaCapacity=maximum;
            state.playerMana=Math.max(0,Math.min(maximum,Number.isFinite(state.playerMana)?state.playerMana:0));
            return maximum;
        }

        function normalizeVoidCharges() {
            state.voidCharges=(rules.getSkillNodeRank('voidBolt')>0 || rules.getSkillNodeRank('voidVortex')>0)
                ? Math.max(0,Math.min(spellSettings.voidVolley.charges,state.voidCharges||0)) : 0;
        }

        function castVoidVolley(visualDelay=0) {
            normalizeVoidCharges();
            if (rules.getSkillNodeRank('voidVolley')<=0 || state.voidCharges<spellSettings.voidVolley.charges ||
                state.combatPaused || state.playerHp<=0 ||
                state.playerMana+1e-8<spellSettings.voidVolley.manaCost || !state.monsterStates.some(monster=>monster.hp>0)) return false;
            const damage=rules.getSpellDamage();if(damage<=0)return false;
            // Every volley gets a short charge-up, including a ready volley released
            // directly by mana regeneration. Damage keeps the same projectile deadline.
            visualDelay=Math.max(visualDelay,voidMissileTiming.windup*1000);
            state.playerMana=Math.max(0,state.playerMana-spellSettings.voidVolley.manaCost);
            state.voidCharges-=spellSettings.voidVolley.charges;
            rules.showVoidVolleyBuffProc();
            const hits=[];
            for(let missile=0;missile<spellSettings.voidVolley.missiles;missile++){
                const living=state.monsterStates.filter(monster=>monster.hp>0);
                if(!living.length)break;
                const target=living[Math.floor(random()*living.length)];
                const pending={targetId:target.id,damage,
                    remaining:getVoidMissileSchedule(missile,visualDelay).arrival};
                hits.push({targetId:target.id,missile:pending});
                state.pendingVoidMissiles.push(pending);
            }
            rules.showSpellCast('voidVolley',hits,visualDelay);
            return true;
        }

        function tickPendingVoidMissiles(elapsed) {
            // Resolve arrivals in time order, including redirects inside a long step.
            // Simulation owns damage; CSS/SMIL events never award hits or rewards.
            let remaining=elapsed;
            while(state.pendingVoidMissiles.length){
                const next=Math.min(...state.pendingVoidMissiles.map(hit=>hit.remaining));
                const step=Math.min(remaining,next);
                state.pendingVoidMissiles.forEach(hit=>{
                    hit.remaining=Math.max(0,hit.remaining-step);
                    rules.advanceVoidMissile(hit);
                });
                remaining-=step;
                const arrived=state.pendingVoidMissiles.filter(hit=>hit.remaining<1e-8);
                if(!arrived.length)break;
                state.pendingVoidMissiles=state.pendingVoidMissiles.filter(hit=>hit.remaining>=1e-8);
                for(const hit of arrived){
                    const target=state.monsterStates.find(monster=>monster.id===hit.targetId && monster.hp>0);
                    if(target){
                        rules.applyDamageToMonster(target,hit.damage,'spell','voidVolley');
                        rules.showVoidMissileImpact(target.id,hit);
                    }else{
                        rules.cancelVoidMissile(hit);
                        const living=state.monsterStates.filter(monster=>monster.hp>0);
                        if(!living.length)continue;
                        // A target can die during flight. Turn toward another living
                        // enemy and give that visible redirect its own travel time.
                        const replacement=living[Math.floor(random()*living.length)];
                        const redirected={...hit,targetId:replacement.id,remaining:voidMissileTiming.redirect};
                        state.pendingVoidMissiles.push(redirected);
                        rules.showSpellCast('voidVolley',[{targetId:replacement.id,sourceId:hit.targetId,flight:voidMissileTiming.redirect,missile:redirected}]);
                    }
                }
                if(remaining<1e-8)break;
            }
        }

        function castVoidBolt() {
            normalizeVoidCharges();
            if (rules.getSkillNodeRank('voidBolt')<=0 || state.combatPaused || state.playerHp<=0 || rules.getSpellDamage()<=0 ||
                state.playerMana+1e-8<spellSettings.voidBolt.manaCost || !rules.activeMonster()) return false;
            // Reserve mana for a charged volley instead of letting repeated cheap bolts
            // keep its mana forever below the 10 needed to release it.
            if(state.voidCharges>=spellSettings.voidVolley.charges && rules.getSkillNodeRank('voidVolley')>0){
                if(!castVoidVolley() || state.playerMana+1e-8<spellSettings.voidBolt.manaCost || !rules.activeMonster())return false;
            }
            const damage=rules.getSpellDamage();
            const targets=getPlayerAttackTargets();
            if(!targets.length)return false;
            state.playerMana=Math.max(0,state.playerMana-spellSettings.voidBolt.manaCost);
            const hits=[];
            for(const target of targets){
                if(target.hp<=0)continue;
                hits.push({targetId:target.id});
                rules.applyDamageToMonster(target,damage,'spell','voidBolt');
                state.voidCharges=Math.min(spellSettings.voidVolley.charges,state.voidCharges+1);
                castVoidVolley(voidMissileTiming.flight*1000+hits.length*voidMissileTiming.stagger*1000);
            }
            rules.showSpellCast('voidBolt',hits);
            return true;
        }

        function castVoidVortex() {
            normalizeVoidCharges();
            if (rules.getSkillNodeRank('voidVortex')<=0 || state.combatPaused || state.playerHp<=0 ||
                state.playerMana+1e-8<spellSettings.voidVortex.manaCost) return false;
            const target=rules.activeMonster(),damage=rules.getSpellDamage()*spellSettings.voidVortex.damageMultiplier;
            if (!target || damage<=0) return false;
            const targets=getArrowRowTargets(target);
            if (!targets.length) return false;
            state.playerMana=Math.max(0,state.playerMana-spellSettings.voidVortex.manaCost);
            // Roll once per paid cast. The repeat stays in the original row and cannot
            // recursively repeat or generate charges from enemies killed by the first hit.
            const triggers=rules.getSkillNodeRank('echoingVoid')>0 && random()<spellSettings.voidVortex.doubleChance ? 2 : 1;
            for (let trigger=0;trigger<triggers;trigger++) {
                const living=targets.filter(monster=>monster.hp>0);
                if (!living.length) break;
                rules.showVoidVortex(living.map(monster=>monster.id),trigger*180);
                for (const monster of living) {
                    rules.applyDamageToMonster(monster,damage,'spell','voidVortex');
                    state.voidCharges=Math.min(spellSettings.voidVolley.charges,
                        state.voidCharges+spellSettings.voidVortex.chargesPerHit);
                    castVoidVolley();
                }
            }
            return true;
        }

        function tickPlayerMana(elapsed) {
            const maximum=normalizePlayerMana();
            normalizeVoidCharges();
            if (maximum<=0 || state.combatPaused || state.playerHp<=0) return;
            state.playerMana=Math.min(maximum,state.playerMana+rules.getPlayerManaRegen()*elapsed);
            // A charged volley waits at five stacks when mana is short or no target
            // is alive, then fires as soon as its requirements are satisfied.
            castVoidVolley();
        }

        function triggerAttackSpells() {
            // One attempt per primary attack, independent of multihit count. Generated
            // abilities and spells cannot recursively generate more spell casts.
            if (state.combatPaused || state.playerHp<=0 || rules.getPlayerMaxMana()<=0) return;
            normalizePlayerMana();
            castVoidVolley();
            castElementalBrand('rimeBrand');
            castElementalBrand('emberBrand');
            if (rules.getSkillNodeRank('voidVortex')>0) castVoidVortex();
            if (rules.getSkillNodeRank('voidBolt')>0) castVoidBolt();
        }

        // Elemental brands

        function castElementalBrand(id) {
            const settings=elementalBrands.find(brand=>brand.id===id);
            if (!settings || rules.getSkillNodeRank(id)<=0 || state.combatPaused || state.playerHp<=0 || rules.getSpellDamage()<=0 ||
                state.playerMana+1e-8<elementalSkillSettings.manaCost) return false;
            const current=rules.activeMonster();
            const target=current && !current[id] ? current : state.monsterStates.find(monster=>monster.hp>0 && !monster[id]);
            if (!target) return false;
            state.playerMana=Math.max(0,state.playerMana-elementalSkillSettings.manaCost);
            target[id]={timeUntilTick:elementalSkillSettings.tickSeconds,stacks:0,remainingDuration:elementalSkillSettings.duration};
            rules.showElementalBurst([target.id],settings.element,false);
            return true;
        }

        function getElementalExplosionTargets(center) {
            // Match the game's four orthogonal neighbours. The branded enemy is the
            // source of the explosion; only its living neighbours receive the blast.
            return getEruptionTargets(center).filter(monster=>monster!==center);
        }

        function detonateElementalBrand(center, settings) {
            const targets=getElementalExplosionTargets(center);
            const damage=rules.getSpellDamage()*elementalSkillSettings.explosionMultiplier;
            rules.showElementalBurst([center.id,...targets.map(monster=>monster.id)],settings.element,true);
            for (const monster of targets) {
                rules.applyDamageToMonster(monster,damage,'spell',settings.upgrade);
                if (monster.hp<=0) continue;
                if (settings.element==='cold') monster.freezeRemaining=arrowSkillSettings.freezeDuration;
                else monster.scorched=true;
            }
        }

        function tickElementalBrands(monster,elapsed) {
            // Like Poison and Bleed, an applied brand keeps ticking after player death.
            if (monster.hp<=0 || elapsed<=0) return;
            for (const settings of elementalBrands) {
                const brand=monster[settings.id];
                if (!brand) continue;
                if (rules.getSkillNodeRank(settings.id)<=0) {monster[settings.id]=null;continue;}
                const upgraded=rules.getSkillNodeRank(settings.upgrade)>0;
                if (!upgraded) brand.stacks=0;
                brand.remainingDuration ??= elementalSkillSettings.duration;
                const activeElapsed=Math.min(elapsed,brand.remainingDuration);
                brand.remainingDuration=Math.max(0,brand.remainingDuration-elapsed);
                brand.timeUntilTick-=activeElapsed;
                while (brand.timeUntilTick<1e-8 && monster.hp>0) {
                    brand.timeUntilTick+=elementalSkillSettings.tickSeconds;
                    if (upgraded) brand.stacks++;
                    const explode=upgraded && brand.stacks>=elementalSkillSettings.explosionStacks;
                    if (explode) brand.stacks=0;
                    rules.applyDamageToMonster(monster,rules.getSpellDamage(),'dot',settings.id);
                    if (explode) detonateElementalBrand(monster,settings);
                }
                // Subtracting 0.1 ten times can leave a positive epsilon before the
                // interval is added back. Never write an out-of-range timer to a save.
                brand.timeUntilTick=Math.min(elementalSkillSettings.tickSeconds,brand.timeUntilTick);
                // Resolve the tick at exactly ten seconds before removing the brand,
                // so the tenth stack can still trigger its explosion.
                if (brand.remainingDuration<1e-8) monster[settings.id]=null;
            }
        }

        function clearElementalDebuffs(monster) {
            monster.rimeBrand=null;monster.emberBrand=null;monster.scorched=false;
        }

        // Bleed applications and ticks

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

        function remainingBleedTicks(bleed) {
            return bleed && bleed.timeUntilTick <= bleed.remainingDuration + 1e-8
                ? Math.max(0, 1 + Math.floor((bleed.remainingDuration - bleed.timeUntilTick + 1e-8) / rules.getBleedTickInterval())) : 0;
        }

        function getRemainingBleedDamage(monster) {
            return monster?.hp > 0 && monster.bleed
                ? remainingBleedTicks(monster.bleed) * rules.getBleedTickDamage(monster.bleed) * rules.getMonsterDamageTakenMultiplier(monster) : 0;
        }

        function tryApplyBleed(monster, hitDamage) {
            if (!monster || monster.hp <= 0 || !Number.isFinite(hitDamage) || hitDamage <= 0) return false;
            const chance = rules.getBleedChance();
            if (chance <= 0 || random() >= chance) return false;
            const bleed = monster.bleed;
            // Target vulnerability is applied when the DOT ticks, not baked into the
            // pool as well. This keeps direct attacks and ability hits consistent.
            const addedDamage = hitDamage * rules.getBleedHitDamageRatio();
            const applications = rules.getBleedStacksPerApplication();
            const strongest = strongestBleedApplications(bleed && bleed.remainingDuration > 0 ? bleed : null);
            for (let index = 0; index < applications; index++) strongest.push(addedDamage);
            strongest.sort((a,b) => b-a);
            strongest.length = Math.min(strongest.length, deepWoundsSettings.maximumStacks);
            if (bleed && bleed.remainingDuration > 0) {
                bleed.baseDamagePerTick = rules.hasDeepWounds() ? sumBleedApplications(strongest)
                    : Math.min(Number.MAX_VALUE, (bleed.baseDamagePerTick ?? bleed.stacks) + addedDamage * applications);
                bleed.stacks = Math.min(rules.getBleedMaximumStacks(), bleed.stacks + applications);
                bleed.strongestApplications = strongest;
                bleed.remainingDuration = Math.min(bleedDamageType.maximumDuration, bleed.remainingDuration + bleedDamageType.secondsPerApplication * applications);
            } else {
                monster.bleed = {stacks:applications, baseDamagePerTick:addedDamage * applications, strongestApplications:strongest,
                    remainingDuration:bleedDamageType.secondsPerApplication * applications, timeUntilTick:rules.getBleedTickInterval()};
            }
            rules.emitCombatEvent('monsterBleedApplied', {monsterId: monster.id});
            return true;
        }

        function tickMonsterBleed(monster, elapsed) {
            const bleed = monster.bleed;
            if (monster.hp <= 0 || !bleed || elapsed <= 0) return false;
            if (bleed.stacks > rules.getBleedMaximumStacks()) {
                bleed.strongestApplications = strongestBleedApplications(bleed);
                bleed.stacks = rules.getBleedMaximumStacks();
                bleed.baseDamagePerTick = sumBleedApplications(bleed.strongestApplications);
            }
            const activeSeconds = Math.min(elapsed, bleed.remainingDuration);
            const interval = rules.getBleedTickInterval();
            const ticks = bleed.timeUntilTick <= activeSeconds + 1e-8
                ? Math.max(0, 1 + Math.floor((activeSeconds - bleed.timeUntilTick + 1e-8) / interval)) : 0;
            const damage = ticks * rules.getBleedTickDamage(bleed);
            bleed.timeUntilTick = Math.max(1e-8, bleed.timeUntilTick - activeSeconds + ticks * interval);
            bleed.remainingDuration = Math.max(0, bleed.remainingDuration - elapsed);
            // The tick exactly at expiry still lands; no stacks survive the shared timer.
            if (bleed.remainingDuration < 1e-8) monster.bleed = null;
            if (damage > 0) rules.applyDamageToMonster(monster, damage, 'bleed');
            return monster.hp <= 0;
        }

        // Shared attacks, shields, poison and burning

        function getPlayerAttackTargets() {
            if (!rules.activeMonster()) return [];
            const targetIndex = state.monsterStates.findIndex(monster => monster.id === state.targetMonsterId);
            const multiHit = rules.getMultiHit();
            const guaranteedHits = Math.floor(multiHit);
            const extraHit = random() < multiHit - guaranteedHits ? 1 : 0;
            const targets = [];
            for (let offset = 0; offset < state.monsterStates.length && targets.length < guaranteedHits + extraHit; offset++) {
                const monster = state.monsterStates[(targetIndex + offset) % state.monsterStates.length];
                if (monster.hp > 0) targets.push(monster);
            }
            return targets;
        }

        function normalizeShields() {
            state.shieldStacks = rules.hasShieldGeneration()
                ? Math.min(rules.getPlayerMaxShields(), Math.max(0, Math.floor(state.shieldStacks))) : 0;
        }

        function gainShields() {
            if (!rules.hasShieldGeneration() || state.playerHp <= 0 || state.combatPaused) return;
            normalizeShields();
            state.shieldStacks = Math.min(rules.getPlayerMaxShields(), state.shieldStacks + 1);
            tryShieldSlam();
        }

        function gainShieldFromKill() {
            if (rules.getSkillNodeRank('shieldGenerator') > 0) gainShields();
        }

        function tryShieldSlam() {
            if (resolvingShieldSlam || rules.getSkillNodeRank('shieldSlam') <= 0 || state.playerHp <= 0 || state.combatPaused) return;
            normalizeShields();
            const maximum = rules.getPlayerMaxShields();
            if (!maximum || state.shieldStacks < maximum) return;
            // A slam kill can grant another shield. Resolve those triggers iteratively,
            // including a capacity of one, without recursively overflowing the stack.
            resolvingShieldSlam = true;
            try {
                while (state.shieldStacks >= maximum) {
                    const target = rules.activeMonster() || state.monsterStates.find(monster => monster.hp > 0);
                    if (!target) break; // Keep shields until there is a target to slam.
                    const consumed = Math.max(1, Math.floor(state.shieldStacks / 2));
                    state.shieldStacks -= consumed;
                    let remainingDamage = rules.getDamage() * shieldSlamDamagePerStack * consumed;
                    const overflowing = rules.getSkillNodeRank('overflowingSlam') > 0;
                    const hitIds = [];
                    let slamTarget = target;
                    while (slamTarget && remainingDamage > 1e-8) {
                        const healthBefore = slamTarget.hp;
                        const damageMultiplier = rules.getMonsterDamageTakenMultiplier(slamTarget);
                        hitIds.push(slamTarget.id);
                        rules.applyDamageToMonster(slamTarget, remainingDamage, 'physical', hitIds.length === 1 ? 'shieldSlam' : 'overflowingSlam');
                        // Only unused physical damage carries on. Poison executions
                        // and newly gained Fury cannot increase this slam's budget.
                        remainingDamage = Math.max(0, remainingDamage - healthBefore / damageMultiplier);
                        if (!overflowing || slamTarget.hp > 0 || remainingDamage <= 1e-8) break;
                        slamTarget = rules.activeMonster();
                    }
                    rules.showShieldSlamWave(hitIds);
                }
            } finally {
                resolvingShieldSlam = false;
            }
        }

        function getRemainingPoisonDamage(monster) {
            if (!monster || monster.hp <= 0 || !Array.isArray(monster.poisonStacks) || !monster.poisonStacks.length) return 0;
            const tickInterval = rules.getPoisonTickInterval();
            const damagePerTick = rules.getPoisonDamage();
            const damageMultiplier = rules.getMonsterDamageTakenMultiplier(monster);
            const cached = rules.getPoisonForecast(monster);
            // Ticking replaces the array; applying or spreading poison changes its length.
            // Scope forecasts to this simulation step and recheck stats after level-ups.
            if (cached && cached.stacks === monster.poisonStacks && cached.length === monster.poisonStacks.length &&
                cached.interval === tickInterval && cached.damage === damagePerTick) return cached.total * damageMultiplier;
            const total = monster.poisonStacks.reduce((total, stack) => {
                const firstTickIn = Math.max(0, stack.timeUntilTick);
                if (firstTickIn > stack.remainingDuration + 1e-6) return total;
                const ticksRemaining = 1 + Math.floor(
                    (stack.remainingDuration - firstTickIn + 1e-6) / tickInterval
                );
                return total + Math.max(0, ticksRemaining) * damagePerTick;
            }, 0);
            rules.setPoisonForecast(monster, {
                stacks: monster.poisonStacks, length: monster.poisonStacks.length,
                interval: tickInterval, damage: damagePerTick, total
            });
            return total * damageMultiplier;
        }

        function tryExecutePoison(monster) {
            if (rules.getSkillNodeRank('poisonExecute') <= 0 || !monster || monster.hp <= 0 ||
                getRemainingPoisonDamage(monster) < monster.hp) return false;
            rules.showMonsterProc(monster.id, 'POISON EXECUTE');
            return rules.applyDamageToMonster(monster, monster.hp, 'poison', 'poisonExecute');
        }

        function tryApplyPoison(monster) {
            const poisonChance = rules.getPoisonChance();
            if (!monster || monster.hp <= 0 || poisonChance <= 0 || random() >= poisonChance) return false;
            if (!Array.isArray(monster.poisonStacks)) monster.poisonStacks = [];
            monster.poisonStacks.push({
                remainingDuration: poisonDamageType.durationSeconds,
                timeUntilTick: rules.getPoisonTickInterval()
            });
            rules.showPoisonStackProc(monster);
            tryExecutePoison(monster);
            return true;
        }

        function tickMonsterPoison(monster, elapsed) {
            if (monster.hp <= 0 || !Array.isArray(monster.poisonStacks) || !monster.poisonStacks.length) return false;
            if (tryExecutePoison(monster)) return true;
            const tickInterval = rules.getPoisonTickInterval();
            const remainingStacks = [];
            let damage = 0;
            for (const stack of monster.poisonStacks) {
                stack.remainingDuration -= elapsed;
                stack.timeUntilTick -= elapsed;
                while (stack.timeUntilTick <= 0 && stack.remainingDuration >= -1e-6) {
                    damage += rules.getPoisonDamage();
                    stack.timeUntilTick += tickInterval;
                }
                if (stack.remainingDuration > 0) remainingStacks.push(stack);
            }
            // Advance every stack before dealing damage so death transfers cannot
            // repeat a tick or carry stacks with stale lifetimes to another enemy.
            monster.poisonStacks = remainingStacks;
            if (damage > 0) rules.applyDamageToMonster(monster, damage, 'poison');
            return monster.hp <= 0 || tryExecutePoison(monster);
        }

        function playerHasShockwaveSlash() {
            return (state.skillRanks.shockwaveSlash || 0) > 0;
        }

        function triggerShockwaveSlash(hitMonster, hitDamage) {
            if (!playerHasShockwaveSlash()) return;
            const {chance, triggers} = rules.getShockwaveSettings();
            if (random() >= chance) return;
            const splashDamage = hitDamage * 0.33;
            for (let activation = 0; activation < triggers; activation++) {
                // Resolve each activation separately so both can apply on-hit effects,
                // while enemies killed by the first wave cannot be hit or looted twice.
                const splashTargets = state.monsterStates
                    .filter(monster => monster.hp > 0 && monster.id !== hitMonster.id);
                splashTargets.forEach(monster => {
                    rules.showMonsterProc(monster.id, 'SHOCKWAVE HIT');
                    rules.flashShockwaveCard(monster.id);
                    rules.flashShockwaveHealthBar(monster.id);
                    rules.applyDamageToMonster(monster, splashDamage, 'physical', 'shockwaveSlash');
                });
                // One shield per activation, including procs against a lone boss.
                if (rules.getSkillNodeRank('resonantGuard') > 0) gainShields();
            }
        }

        function transferPoisonOnDeath(monster, stacks) {
            if (rules.getSkillNodeRank('bloomingFlower') <= 0 || !stacks.length) return;
            const targets = state.monsterStates.filter(target => target !== monster && target.hp > 0);
            if (!targets.length) return;
            const target = targets[Math.floor(random() * targets.length)];
            if (!Array.isArray(target.poisonStacks)) target.poisonStacks = [];
            target.poisonStacks.push(...stacks);
            rules.showPoisonTransfer(monster.id, target.id);
            rules.showMonsterProc(target.id, 'BLOOMING FLOWER');
            rules.showPoisonStackProc(target);
        }

        function tickPlayerRegeneration(elapsed) {
            if (state.combatPaused || state.playerHp <= 0) return;
            if (!rules.hasFireOfTheRighteous()) {
                rules.applyPlayerHealing(rules.getPlayerHealthRegen() * elapsed);
                return;
            }

            // Resolve regeneration and drain together. Reserve healing to offset the
            // drain and reach the current healing cap; convert only regeneration left over.
            const {drain, healing, excess} = rules.getRighteousFireRegeneration(elapsed);
            if (healing >= drain) rules.applyPlayerHealing(healing - drain);
            else rules.applyDamageToPlayer(drain - healing, 'self');

            if (excess <= 0 || state.playerHp <= 0) return;
            // Snapshot living targets so kills cannot redistribute this tick's damage.
            const targets = state.monsterStates.filter(monster => monster.hp > 0);
            if (!targets.length) return;
            const damage = excess * rules.getRighteousFireSettings().damageMultiplier / targets.length;
            targets.forEach(monster => rules.applyDamageToMonster(monster, damage, 'dot', 'righteousFire'));
            rules.showRighteousFireHit(targets);
        }

        return Object.freeze({
            getMonsterGridPosition,
            getArrowRowTargets,
            getForwardDiagonalArrowTargets,
            getMonsterAttackInterval,
            applyArrowFreeze,
            shootAbilityArrow,
            triggerAttackArrowSkills,
            getMaxEruptionChains,
            getEruptionTargets,
            triggerVolcanicEruption,
            detonateEruption,
            queueEruptionChain,
            tickPendingEruptions,
            getVoidMissileSchedule,
            normalizePlayerMana,
            normalizeVoidCharges,
            castVoidVolley,
            tickPendingVoidMissiles,
            castVoidBolt,
            castVoidVortex,
            tickPlayerMana,
            triggerAttackSpells,
            castElementalBrand,
            getElementalExplosionTargets,
            detonateElementalBrand,
            tickElementalBrands,
            clearElementalDebuffs,
            strongestBleedApplications,
            sumBleedApplications,
            remainingBleedTicks,
            getRemainingBleedDamage,
            tryApplyBleed,
            tickMonsterBleed,
            getPlayerAttackTargets,
            normalizeShields,
            gainShields,
            gainShieldFromKill,
            tryShieldSlam,
            getRemainingPoisonDamage,
            tryExecutePoison,
            tryApplyPoison,
            tickMonsterPoison,
            playerHasShockwaveSlash,
            triggerShockwaveSlash,
            transferPoisonOnDeath,
            tickPlayerRegeneration,
            get resolvingShieldSlam() {return resolvingShieldSlam;}
        });
    }

    root.CombatAbilities = Object.freeze({create});
}(globalThis));
