---
type: concept
created: 2026-11-08
updated: 2026-11-08
status: baseline
evidence_level: static-code-review
sources:
  - "[[wiki/Sources/Source-Code-Game]]"
  - "[[wiki/Sources/Source-Code-Combat-Simulation]]"
  - "[[wiki/Sources/Source-Code-Combat-Abilities]]"
  - "[[wiki/Sources/Source-Code-Combat-Health]]"
  - "[[wiki/Sources/Source-Code-Item-System]]"
tags:
  - concept
  - combat
  - attacks
---

# How Attacks Work

## Summary

An attack happens when the player's attack timer reaches its interval. The game
chooses living targets, checks accuracy separately against each one, applies
damage on a hit, and checks the relevant effects and abilities. A monster that
reaches zero HP immediately awards its rewards and starts its respawn timer.

This describes current code checked on 2026-11-08 against unchanged snapshots
captured on 2026-11-06. It covers the basic attack path and its handoffs to
abilities, damage, and rewards. It is a static review, not a browser playtest or
a complete description of every skill.

## Supported facts

### 1. Advance the combat timers

During active combat, the host normally advances the simulation in 0.1-second
steps. Animation timing does not decide when damage happens. The host processes
elapsed-time backlogs in bounded batches; it can skip idle time in the specific
paused state where no active effects need individual steps.

Within a step, the order is:

1. Tick Town, Fury, Gathering Power, shields, and player regeneration.
2. Update freeze and monster respawn timers.
3. Process pending eruptions and Void Missiles, check Shield Slam, and tick mana.
4. Tick poison, then bleed, then elemental brands on surviving monsters.
5. Resolve living monsters' attacks.
6. Advance the player's attack timer and perform attacks that are due.

Monsters therefore get their scheduled attacks before the player's basic attacks
in the same step. If the player dies, combat pauses and the player's basic
attack loop stops. Pausing does not stop every process: the simulation still
calls Town, respawn, pending-effect, and damage-over-time rules.

Evidence: [[raw/2026-11-06/batch-03/js/combat-simulation.js|Simulation order]],
CombatSimulation.create/step, lines 7-117;
[[raw/2026-11-06/batch-03/js/game.js|Host scheduling and player death]],
simulateCombatStep (4419-4435), processCombatBacklog (4467-4493), and
applyDamageToPlayer (3815-3828).

### 2. Choose the target and any extra targets

The current target is a living monster matching targetMonsterId. If it is no
longer alive, the game searches forward through the encounter's monster list,
wrapping around to find another living monster.

Multi-hit means additional distinct living targets in the same attack. The
whole-number part guarantees that many target slots; the fractional part is
the chance for one more. For example, multi-hit 2.4 gives two slots and a 40%
chance of a third, limited by the number of living monsters. Selection starts
with the current target and searches forward. It does not hit the same monster
twice to fill unused slots. Each selected target gets its own accuracy check.

When the current target dies, selecting the next target resets the player's
attack timer. A splash or damage-over-time kill on a different monster does
not interrupt the current target's timer. With no living target, the simulation
clears the timer rather than storing attacks for a future spawn.

Evidence: [[raw/2026-11-06/batch-03/js/game.js|Target selection]],
activeMonster/ensureLiveMonsterTarget (753-777), selectNextMonsterTarget
(788-801), getMultiHit (1322-1325);
[[raw/2026-11-06/batch-07/js/combat-abilities.js|Multi-hit selection]],
getPlayerAttackTargets (491-503);
[[raw/2026-11-06/batch-03/js/combat-simulation.js|Attack timer]],
lines 69-86.

### 3. Check whether the basic attack hits

The player's hit chance, in percent, is accuracy minus the target's evasion,
with a minimum of 5% and maximum of 95%. The attack hits when a random number
from 0 up to, but not including, 100 is below that chance.

A miss does no basic-attack damage to that target and emits a dodge event.
It also skips that basic hit's bleed, poison, and Shockwave Slash checks.
Some attack-triggered abilities are checked separately afterward; see step 5.

The player's attack interval is 1.2 seconds divided by the combined attack-speed
multiplier, bounded by the equipment minimum interval. The equipment registry's
default minimum is 0.25 seconds; special equipment stats can lower that limit.
The code function getAttackSpeed returns this interval: a smaller value means
more frequent attacks.

Evidence: [[raw/2026-11-06/batch-03/js/game.js|Accuracy and attack interval]],
getPlayerAccuracy (1328-1331), getAttackSpeedMultiplier/getAttackSpeed
(1333-1340), getHitChance (1347-1349);
[[raw/2026-11-06/batch-07/js/item-system.js|Equipment limits]],
stats.minimumAttackInterval (42), aggregate (288-294);
[[raw/2026-11-06/batch-03/js/combat-simulation.js|Hit and miss branches]],
lines 75-97.

### 4. Calculate damage and subtract HP

For a basic attack, the starting physical damage is:

- Flat amount: 2 + twice the Strength upgrade level + equipment damage + skill damage.
- Multiply by the skill damage multiplier, equipment damage multiplier, and
  the Fury factor (1 + Fury stacks × damage per stack).
- Round to a whole number, with a minimum result of 1.

Equipment stats use their registered aggregation rule: added values, multiplied
values, or a minimum limit. The flat damage stat and a damage multiplier are
therefore different inputs.

The shared monster-damage function then applies the current damage-taken
modifiers. Gathering Power contributes here; Singled Off multiplies by 1.3
when enabled and this is the only living monster. Eligible fire abilities
also consult the fire damage-taken modifier. Poison Execute has an explicit
exception that bypasses those target multipliers. Monster HP is clamped at
zero, and recorded damage is limited to HP actually removed.

Successful direct hits build Fury; poison, bleed, and other damage-over-time
calls do not. Damage for each basic hit is obtained before that hit is applied,
so later hits can observe changes made by earlier hits.

Evidence: [[raw/2026-11-06/batch-03/js/game.js|Damage assembly and application]],
getGearStat (1063-1066), getDamage (1317-1320),
getMonsterDamageTakenMultiplier/applyDamageToMonster (3831-3870);
[[raw/2026-11-06/batch-07/js/combat-health.js|Damage arithmetic]],
getPhysicalDamage (10-12), getMonsterDamageTakenMultiplier (60-64),
applyMonsterDamage (70-74);
[[raw/2026-11-06/batch-07/js/item-system.js|Equipment aggregation]],
aggregate (288-294);
[[raw/2026-11-06/batch-03/js/combat-simulation.js|Per-target damage lookup]],
lines 83-94.

### 5. Check effects and triggered abilities

A trigger check is an opportunity to activate an effect. It does not guarantee
activation: the ability's own learned-skill, chance, target, resource, and other
conditions still apply.

| Where the check occurs | What the basic attack loop checks |
| --- | --- |
| After a successful basic hit, including extra multi-hit targets | Bleed, poison, and Shockwave Slash |
| After the basic-target loop, if the attack had a primary target | Volcanic Eruption at that original target, arrow skills, and attack-triggered spells |
| For each additional multi-hit target successfully hit | Another Volcanic Eruption check |

The second row runs even if the basic hit missed. The primary target and arrow
damage used there were captured before the basic-target loop; a basic attack
can also kill that original target before these checks run.

Ability hits use their own paths. For example, ability arrows make separate
accuracy rolls. The shared damage function checks bleed for eligible
single-target direct abilities and poison for direct physical/spell ability
hits that survive the earlier death/execute checks. Damage over time does not
apply poison through that branch. Multishot can generate additional arrow
checks, but its generated arrows cannot recursively cast Multishot.

For the equipped unique modifiers to Shockwave Slash and Fire of the Righteous,
see [[wiki/Systems/Equipment/Unique-Item-Effects|Unique item effects]].

Evidence: [[raw/2026-11-06/batch-03/js/combat-simulation.js|Basic-hit and attack triggers]],
lines 79-104;
[[raw/2026-11-06/batch-07/js/combat-abilities.js|Arrow execution]],
shootAbilityArrow/triggerAttackArrowSkills (54-124);
[[raw/2026-11-06/batch-03/js/game.js|Direct ability effects]],
applyDamageToMonster (3840-3865).

### 6. Handle monster death, rewards, and respawning

When the damage function reduces a monster to zero HP, defeatEnemy runs
immediately. It awards gold, kill credit, mastery, and experience through their
respective rules. A first world-boss victory also updates boss progression.

Map and monster material-drop entries are checked separately, as are equipment
entries. Mastery modifies drop chances, capped at 100%. Equipment drops exclude
unknown items, developer-only items, and equipment already owned.

The defeated monster loses its poison/bleed and elemental debuffs, gets its
configured respawn countdown, and has its attack/freeze timers cleared.
Death handling also calls poison transfer and shield-on-kill rules, selects
the next target when needed, and saves the game. Once the countdown expires,
the simulation restores the monster's defined health and resets its attack
timer. This note does not expand the separate XP, mastery, or loot-balance rules.

Evidence: [[raw/2026-11-06/batch-03/js/game.js|Death and rewards]],
defeatEnemy (3672-3752), finishMonsterDefeat (3764-3775);
[[raw/2026-11-06/batch-03/js/combat-simulation.js|Respawn]],
lines 30-39.

### What happens when a monster attacks?

Each living monster has its own attack timer and interval. Freeze slows timer
progress rather than completely preventing attacks. An attack that becomes
due compares the monster's accuracy minus player evasion against a random roll,
with a 95% ceiling and the equipment-defined minimum chance (default 5%).

A successful enemy hit consumes one available shield to block that hit.
Otherwise it removes the monster's attack damage from player HP. At zero player
HP, combat pauses, the basic attack timer resets, and player combat buffs clear.
The shared health function distinguishes enemy hits from self-damage: its
shield check only blocks damage whose source is enemy.

Evidence: [[raw/2026-11-06/batch-03/js/combat-simulation.js|Enemy attacks and freeze]],
lines 21-29 and 56-68;
[[raw/2026-11-06/batch-03/js/game.js|Enemy accuracy and damage]],
getEnemyHitChance (1351-1353), applyDamageToPlayer (3815-3828);
[[raw/2026-11-06/batch-07/js/combat-health.js|Shield and HP handling]],
applyPlayerDamage (44-54);
[[raw/2026-11-06/batch-07/js/item-system.js|Enemy hit-chance floor]],
stats.minimumEnemyHitChance (43).

### Worked example

Illustrative inputs, not a particular existing build: one selected target,
player accuracy 90, monster evasion 20, starting flat damage 10, skill damage
multiplier 1.2, equipment damage multiplier 1.1, no existing Fury stacks, no
target damage-taken bonuses, and monster HP 25.

1. Hit chance is 90 − 20 = 70%.
2. A random roll of 50 is below 70, so the hit succeeds.
3. Damage is round(10 × 1.2 × 1.1 × 1) = 13.
4. Monster HP falls from 25 to 12. No death rewards run.
5. The attack checks the hit effects and attack-triggered abilities described
   above; their activation is not assumed in this example.

With a roll of 80 instead, the basic hit misses: the monster keeps its 25 HP
from that basic attack, while the separate attack-triggered ability checks
still run. This example applies the cited hit, damage, and trigger formulas;
it is arithmetic derived from the code, not a measured combat result.

## Connections

- [[wiki/Foundations/System-Map|Where systems are defined]] identifies the files
  to inspect when changing attack timing, target selection, stats, or abilities.
- [[wiki/Systems/Equipment/Unique-Item-Effects|Unique item effects]] explains
  modifiers that change existing abilities.
- [[wiki/Systems/Combat/Reap-Combat|Reap combat]] describes a specific ability
  from captured documentation; its original is missing, so this review does
  not establish Reap's current runtime behavior.

## Open questions

- Is it intended that the primary attack-triggered ability checks still run
  after a basic miss? The control flow establishes the behavior, not its reason.
- Detailed spell, poison, bleed, elemental, and resource rules need their own
  focused reviews before changing those paths.
- Browser behavior, long-run balance, and cross-world build comparisons were
  not tested by this documentation task.
