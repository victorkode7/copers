---
type: source
created: 2026-11-06
updated: 2026-11-08
raw_path: raw/2026-11-06/batch-03/js/game.js
original_path: js/game.js
sha256: bb7547b07278b0978198020f2534ad7fb5b106347862dced51b690846e533069
status: complete
review_scope: "Focused content/state/save/Town wiring extraction, plus unique ability settings and item-drop handling; 2026-11-08 extension: target selection, attack/hit/damage formulas, shared damage application, death/rewards, and scheduling; skills review: bidirectional skill paths, ordinary allocation/refund/reset handlers, flat and multiplicative rank aggregation"
tags:
  - source
  - implementation
---

# Game orchestration and state

## Provenance

Exact working-file snapshot captured on 2026-11-06 in batch-03; 4714 lines,
249740 bytes. Original and snapshot matched the SHA-256 above. The working tree
was based on Git revision `7426d3bea6679ce03d73f92658bc00f0c3bc6d99`. Extraction used UTF-8 text.
[[raw/2026-11-06/batch-03/js/game.js|Captured source]]; line references below refer to this snapshot.
No prior imported snapshot of this file is superseded. Raw code is evidence;
edit the original project file when implementing changes, then capture a new version.

## Summary

The main game module connects content catalogues, player state, rewards, saving, and the simulation. This import maps selected boundaries rather than auditing every combat rule.

Review scope: Focused extraction of content loading, state, travel, save wiring, rewards, and Town simulation hooks.

## Findings and evidence

- Lines 1-45 load world/items, derive crafting recipes from item definitions, and route adventure drops. Lines 124-160 define character, inventory, skill, Town, navigation, and encounter state.
- currentMap (641), createMonsterStates (701), resetMonsterStates (737), and travelToMap (1629) distinguish map definitions from active encounters.
- createGameSave (1690), parseGameSave (1760), and Town normalization at lines 1900/2077 connect Town state to saves/imports.
- awardExperience (3663) and defeatEnemy (3672-3715) connect kills, gold, XP, material drops, boss rewards, and Menagerie credit.
- Lines 4360-4365 inject TownProgression.tick into CombatSimulation; processCombatBacklog at 4467-4493 advances elapsed time and retains converter step boundaries.

Evidence: [[raw/2026-11-06/batch-03/js/game.js|js/game.js]], at the symbols and lines listed above.

Focused unique-item extension on 2026-11-06: line 99 defines ordinary Fire of
the Righteous settings (30% healing cap, 10% maximum-HP drain/second, multiplier
1). Lines 1271-1287 select equipped unique overrides and apply the healing cap;
4346-4348 select Geobreaker's Shockwave settings over the ordinary 25%/one-proc
settings. `defeatEnemy` applies mastery drop-rate modifiers to item drops.
The live original matched this snapshot's hash. See [[wiki/Systems/Equipment/Unique-Item-Effects]].

## Combat review extension: 2026-11-08

The live original matched this unchanged snapshot's registered SHA-256.
Expanded scope: target selection, attack/hit/damage formulas, shared damage application, death/rewards, and scheduling.

- activeMonster/ensureLiveMonsterTarget (753-777) choose a living target; selectNextMonsterTarget (788-801) resets the timer only when the current target dies.
- getDamage/getMultiHit/getPlayerAccuracy/getAttackSpeed/getHitChance/getEnemyHitChance (1317-1353) assemble basic damage, target count, attack interval, and accuracy.
- applyDamageToPlayer (3815-3828) pauses combat on player death; applyDamageToMonster (3831-3870) handles target multipliers, Fury, immediate death, and direct-ability status checks.
- defeatEnemy/finishMonsterDefeat (3672-3775) award rewards, clear defeated-monster state, start respawn, and save; processCombatBacklog (4467-4493) schedules steps.

Evidence: [[raw/2026-11-06/batch-03/js/game.js|Captured code]], symbols and lines above.
This is static inspection; no browser tests or balance comparisons were run.

## Skills review extension: 2026-11-08

Both the raw snapshot and live original matched the registered SHA-256.
Lines 73-85 normalize/index nodes and build bidirectional connections. getPlannedSkillRanks and refund checks (981-1012) separate pending ranks from committed state. getSkillStatFromRanks/getSkillStat (1015-1026) and getSkillMultiplier (1302-1314) aggregate rank contributions plus applicable mastery. Connectivity checks (1513-1534), point getters (1546-1556), and ordinary Confirm/Reset/refund/selection handlers (4092-4174) establish the reviewed point workflow. Saved-build editing and underlying Progression formulas are not fully reviewed here.

Evidence: [[raw/2026-11-06/batch-03/js/game.js|Captured source]], symbols and lines above.
This extends static coverage; no gameplay or browser test result is implied.

## Derived concepts

- [[wiki/Systems/Combat/Skills-and-Abilities|Skills and abilities]].

- [[wiki/Systems/Combat/How-Attacks-Work|How attacks work]] documents this path.

- [[wiki/Foundations/Game-Overview]]
- [[wiki/Foundations/Game-Glossary]]
- [[wiki/Foundations/System-Map]]
- [[wiki/Systems/Town/Town-System]]

## Open questions

Static inspection establishes the captured definitions and control flow. Browser
behavior, performance, and complete regression coverage were not tested here.
The design reasons behind these choices need the owner's input.

