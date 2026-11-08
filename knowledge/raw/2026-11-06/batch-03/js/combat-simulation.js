// Combat-step ordering has no browser dependencies. The host supplies state,
// gameplay rules, the freeze-delay setting and randomness; it owns scheduling,
// event collection and persistence. Rule implementations can move independently.
(function (root) {
    'use strict';

    function create({state, rules, random, freezeDelay}) {
        function step(elapsed) {
            rules.tickTown(state,elapsed);
            const map = rules.currentMap();
            rules.tickFury(elapsed);
            rules.tickGatheringPower(elapsed);
            rules.normalizeShields();
            const killsBeforeTick = state.kills[map.id];
            const wasPaused = state.combatPaused;
            rules.tickPlayerRegeneration(elapsed);
            rules.ensureLiveMonsterTarget();
            const previousTarget = rules.activeMonster();
            let anyRespawned = false;
            const enemyAttackElapsed = [];
            state.monsterStates.forEach((monster, index) => {
                const frozenSeconds = Math.min(elapsed, monster.freezeRemaining || 0);
                monster.freezeRemaining = Math.max(0, (monster.freezeRemaining || 0) - elapsed);
                if (monster.freezeRemaining < 1e-6) monster.freezeRemaining = 0;
                const interval = rules.monsterDefinition(monster, map).attackInterval;
                // Keep attack progress in normal interval units. This avoids a burst
                // of banked attacks when freezing expires, including mid-step.
                enemyAttackElapsed[index] = elapsed - frozenSeconds +
                    frozenSeconds * interval / (interval + freezeDelay);
                if (monster.hp > 0 || monster.respawnRemaining <= 0) return;
                monster.respawnRemaining = Math.max(0, monster.respawnRemaining - elapsed);
                if (monster.respawnRemaining === 0) {
                    monster.hp = rules.monsterDefinition(monster, map).health;
                    monster.attackTimer = 0;
                    monster.freezeRemaining = 0;
                    monster.bleed = null;
                    rules.clearElementalDebuffs(monster);
                    anyRespawned = true;
                }
            });
            rules.tickPendingEruptions(elapsed);
            rules.tickPendingVoidMissiles(elapsed);
            rules.tryShieldSlam();
            rules.tickPlayerMana(elapsed);
            if (!state.combatPaused) {
                state.monsterStates.forEach(monster => {
                    if (monster.hp > 0) {
                        rules.tickMonsterPoison(monster, elapsed);
                        if (monster.hp > 0) rules.tickMonsterBleed(monster, elapsed);
                        if (monster.hp > 0) rules.tickElementalBrands(monster, elapsed);
                    }
                });
                rules.ensureLiveMonsterTarget();
                rules.syncLegacyEnemyState();
                const target = rules.activeMonster();
                state.monsterStates.forEach((monster, index) => {
                    if (monster.hp <= 0 || state.combatPaused) return;
                    const definition = rules.monsterDefinition(monster, map);
                    monster.attackTimer += enemyAttackElapsed[index];
                    while (monster.attackTimer >= definition.attackInterval && !state.combatPaused) {
                        monster.attackTimer -= definition.attackInterval;
                        if (random() * 100 < rules.getEnemyHitChance(monster)) {
                            rules.applyDamageToPlayer(definition.attackDamage, 'enemy');
                        } else {
                            rules.emitCombatEvent('playerDodged');
                        }
                    }
                });
                if (!target) {
                    state.attackTimer = 0;
                } else {
                    if (!previousTarget && target || anyRespawned && previousTarget && target.id !== previousTarget.id) {
                        state.attackTimer = 0;
                    }
                    const attackInterval = rules.getAttackSpeed();
                    state.attackTimer += elapsed;
                    while (state.attackTimer >= attackInterval && !state.combatPaused) {
                        state.attackTimer -= attackInterval;
                        const arrowTarget = rules.activeMonster();
                        const arrowDamage = rules.getDamage();
                        const attackTargets = rules.getPlayerAttackTargets();
                        const extraEruptionTargets = [];
                        for (let attackIndex = 0; attackIndex < attackTargets.length; attackIndex++) {
                            const attackTarget = attackTargets[attackIndex];
                            if (attackTarget.hp <= 0) continue;
                            if (random() * 100 < rules.getHitChance(rules.getPlayerAccuracy(), rules.monsterDefinition(attackTarget, map).evasion)) {
                                const hitDamage = rules.getDamage();
                                if (attackIndex > 0) rules.showMonsterHitBadge(attackTarget.id, 'MULTI-HIT', true);
                                rules.applyDamageToMonster(attackTarget, hitDamage, 'physical');
                                // Basic attacks also roll Bleed, including multihits.
                                rules.tryApplyBleed(attackTarget, hitDamage);
                                rules.tryApplyPoison(attackTarget);
                                rules.triggerShockwaveSlash(attackTarget, hitDamage);
                                if (attackIndex > 0) extraEruptionTargets.push({target: attackTarget, damage: hitDamage});
                            } else {
                                rules.emitCombatEvent('monsterDodged', {monsterId: attackTarget.id});
                            }
                        }
                        if (arrowTarget) {
                            rules.triggerVolcanicEruption(arrowTarget, arrowDamage);
                            extraEruptionTargets.forEach(hit => rules.triggerVolcanicEruption(hit.target, hit.damage));
                            rules.triggerAttackArrowSkills(arrowTarget, arrowDamage);
                            rules.triggerAttackSpells();
                        }
                    }
                }
            } else {
                state.monsterStates.forEach(monster => {
                    if (monster.hp > 0) {
                        rules.tickMonsterPoison(monster, elapsed);
                        if (monster.hp > 0) rules.tickMonsterBleed(monster, elapsed);
                        if (monster.hp > 0) rules.tickElementalBrands(monster, elapsed);
                    }
                });
                rules.ensureLiveMonsterTarget();
                rules.syncLegacyEnemyState();
            }

            return {
                needsRender: state.kills[map.id] !== killsBeforeTick || anyRespawned || wasPaused !== state.combatPaused
            };
        }

        return Object.freeze({step});
    }

    root.CombatSimulation = Object.freeze({create});
}(globalThis));
