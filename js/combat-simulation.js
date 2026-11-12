// Combat-step ordering has no browser dependencies. The host supplies state,
// gameplay rules, the freeze-delay setting and randomness; it owns scheduling,
// event collection and persistence. Rule implementations can move independently.
(function (root) {
    'use strict';

    function create({state, rules, random, freezeDelay}) {
        function step(elapsed) {
            rules.tickTown(state,elapsed);
            rules.tickAlchemy?.(state,elapsed);
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
            rules.tickPendingReapAttacks?.(elapsed);
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
                        rules.performPlayerAttack();
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
