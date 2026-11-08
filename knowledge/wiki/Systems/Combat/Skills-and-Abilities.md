---
type: concept
created: 2026-11-08
updated: 2026-11-08
status: baseline
evidence_level: static-code-review
sources:
  - "[[wiki/Sources/Source-Code-Skill-Tree]]"
  - "[[wiki/Sources/Source-Code-Game]]"
  - "[[wiki/Sources/Source-Code-Combat-Abilities]]"
  - "[[wiki/Sources/Source-Code-Item-System]]"
  - "[[wiki/Sources/Source-Build-Design-Intent]]"
  - "[[wiki/Sources/Source-Build-Balance-Boundaries]]"
tags:
  - concept
  - combat
  - skills
---

# Skills and Abilities

## Summary

The skill tree records what the player has learned. Some nodes supply stats;
others enable or modify behavior implemented in combat code. Learning an ability
and equipping an item that modifies it are separate actions.

This is a focused static review of definitions, ordinary point allocation,
and representative activation paths. The four live code files matched their
2026-11-06 snapshots on 2026-11-08. It does not establish the balance or complete
rules of every skill. The owner's subsequent build direction is recorded
separately below.

## Supported facts

### Working vocabulary

These terms describe the inspected implementation. They are useful discussion
terms, not a newly imposed classification field in the game.

| Term | Meaning here | Example |
| --- | --- | --- |
| Skill node | A selectable entry in the tree, with an ID and maximum rank | Mighty Blows, Shockwave Slash |
| Rank | Points committed to a particular node | state.skillRanks stores ranks by node ID |
| Stat bonus | A number consumed by stat calculations | Mighty Blows contributes damage; Mana Reserve contributes maximum mana |
| Ability | Implemented combat behavior that can be enabled or modified by learned skills | Shockwave Slash |
| Trigger | The event or condition that causes an ability check | A successful hit, an attack, or reaching a resource threshold |
| Unique item effect | Equipment-specific behavior or modifier, separate from a learned skill | Geobreaker changes Shockwave Slash |
| Visual effect | Presentation of combat, separate from learning or activating an ability | The Shockwave flash shown when its hit is processed |

An automatically triggered ability can still deal damage, spend resources,
or apply a status. Calling it automatic does not make it the same thing as a
flat stat bonus.

Evidence: [[raw/2026-11-06/batch-03/js/skill-tree.js|Node definitions]],
origin/Mighty Blows/Shockwave Slash (5-60), Mana Reserve (1930-1950);
[[raw/2026-11-06/batch-03/js/game.js|Ranks and stat lookup]],
getSkillNodeRank (977-979), getSkillStatFromRanks (1015-1020);
[[raw/2026-11-06/batch-07/js/combat-abilities.js|Ability checks and presentation]],
triggerAttackSpells (336-346), triggerShockwaveSlash (624-645);
[[raw/2026-11-06/batch-07/js/item-system.js|Unique effects]], lines 3-15.

### What defines a node?

The runtime reads nodes from js/skill-tree.js, normalizes them, and indexes them
by ID. Important fields in the captured definitions include:

| Field | What it supplies |
| --- | --- |
| id / name | Stable identifier and displayed name |
| maxRank / start | Rank limit and starting-node marker |
| requires | Stored connections between tree nodes; see path rules below |
| stats | Numerical contributions consumed by stat calculations |
| effect / customDescription | Description text and its description setting; text alone does not implement behavior |
| abilityTargeting | Targeting metadata, such as singleTarget or aoe |
| column / row / size / icon / sprite | Tree layout and presentation |

Shockwave Slash has an empty stats object, yet implements a combat ability
through its learned-rank check. Void Bolt also has empty stats and a
singleTarget tag. Adding descriptive text or a targeting tag to a new node
does not, by itself, add an executable ability.

Evidence: [[raw/2026-11-06/batch-03/js/skill-tree.js|Representative nodes]],
lines 5-60 and 1996-2014;
[[raw/2026-11-06/batch-03/js/game.js|Tree loading]], lines 73-85;
[[raw/2026-11-06/batch-07/js/combat-abilities.js|Shockwave eligibility]],
playerHasShockwaveSlash/triggerShockwaveSlash (624-631).

### Following paths, spending points, and refunding

Despite its name, requires is used to construct connections that gameplay
can follow in either direction. Availability depends on a path back to a
starting node through the selected tree. A new node must touch that connected
selection, and disconnected loops cannot support themselves. Do not interpret
the stored list as a requirement to buy every listed node first, or assume
requiresMode controls the inspected availability check.

In the ordinary tree interaction, clicking nodes builds a pending selection.
Confirm validates the plan, adds its ranks to state.skillRanks, and spends one
point per selected rank. Pending selections are separate from committed ranks
used by combat. Rank limits and available point count constrain allocation.

Refund mode returns one point for a rank, provided the remaining selection
still satisfies the connectivity check. Reset tree asks for confirmation,
clears committed ranks and pending selections, and returns the spent points.
These handlers do not charge gold or materials. The separate saved-build
editing workflow has not been fully reviewed here.

The host delegates total earned points and the cap to Progression, then
calculates available points as earned points minus committed ranks, floored
at zero. The underlying XP/cap formulas are outside this focused review.

Evidence: [[raw/2026-11-06/batch-03/js/game.js|Tree paths and transactions]],
connection construction (79-85), pending ranks/refund validation (981-1012),
skillNodeIsAllocated/skillNodeRequirementsMet (1513-1534),
getSkillPointCap/getEarnedSkillPoints/syncSkillPoints (1546-1556),
Confirm and Reset handlers (4092-4132), refund and selection handlers (4149-4174).

### How ranks affect stats

Flat node stats add their value multiplied by the learned rank. Multiplicative
stats multiply their value raised to that rank. For example, a hypothetical
rank-2 node with damage 3 contributes 6 flat damage; a rank-2 node with a
damage multiplier of 1.1 contributes 1.21. These examples illustrate the
calculations, not the rank limits of a specific existing node.

The host can also include mastery bonuses in these stat getters. The
attack-speed multiplier has an additional level-dependent path. A final
character stat therefore need not come only from the selected tree.

Evidence: [[raw/2026-11-06/batch-03/js/game.js|Stat aggregation]],
getSkillStatFromRanks/getSkillStat (1015-1026),
getSkillMultiplier (1302-1314).

### Learning an ability does not guarantee every activation

Shockwave Slash first requires the learned skill, then checks its activation
chance. On activation it deals splash damage to other living enemies.
Geobreaker's unique effect supplies different chance and activation-count
settings; it does not remove the learned-skill requirement.

Other abilities have different conditions. Attack-triggered spells have a
shared living-player, unpaused-combat, and positive-maximum-mana gate, then
run their individual checks. Elemental brands additionally check the learned
rank, spell damage, current mana, and an eligible target. Mana regeneration
and charged volleys also have their own tick path.

These examples establish that there is no single activation rule for all
abilities. They do not establish that every ability uses mana, makes an
accuracy roll, or triggers only after a successful basic hit.
[[wiki/Systems/Combat/How-Attacks-Work|How attacks work]] traces the basic
attack's hit checks and subsequent ability checks.
[[wiki/Systems/Equipment/Unique-Item-Effects|Unique item effects]] records
the inspected equipment modifiers in detail.

Evidence: [[raw/2026-11-06/batch-07/js/combat-abilities.js|Activation paths]],
tickPlayerMana (326-334), triggerAttackSpells (336-346),
castElementalBrand (350-360), Shockwave Slash (624-645);
[[raw/2026-11-06/batch-07/js/item-system.js|Geobreaker modifier]], lines 4-6.

## Owner direction: discovering builds

The owner wants freedom to find interesting builds and item/ability
interactions, rather than prescribing a few or many abilities. Strong,
surprising combinations are acceptable unless they feel excessively broken.

Their current concern is Piercing Arrow plus Gathering Power feeling like a
direct upgrade in almost every build. They suspect spell-only builds might
gain little from the combination.
More specialized weapon stats are a tentative solution to explore. This is
owner direction and a reported concern, not a measured balance result or an
instruction to change those nodes.

Evidence: [[raw/2026-11-08/batch-01/build-design-intent.txt|Owner reply]], line 1.
[[wiki/Design/Build-Design-Intent|Build design intent]] preserves the goals,
qualifications, possible direction, and unresolved balance questions.

The owner subsequently clarified that acceptable power depends on the content.
Excelling at a particular task can be fine; a build can remain good elsewhere
without being best at everything. Breezing through deliberately difficult
content without adjustment may warrant investigation. Dungeon and potion
examples are hypothetical, not committed systems or new ability requirements.
Evidence: [[raw/2026-11-08/batch-02/build-balance-boundaries.txt|Balance clarification]],
line 1.

## Connections

- [[wiki/Foundations/Game-Glossary|Game glossary]] keeps the vocabulary shared
  across systems.
- [[wiki/Foundations/System-Map|Where systems are defined]] routes future
  changes to definitions, stat calculations, and execution code.
- [[wiki/Design/Equipment-Design-Intent|Equipment design intent]] records the
  owner's goal that item stats and unique effects can improve a build.

## Open questions

- Which challenge goals and tradeoffs apply to each particular activity?
  The owner has clarified content-dependent balance, without numerical thresholds.
- How should individual abilities remain useful across worlds? Existing
  equipment concerns do not settle the balance of the whole tree.
- Detailed ability rules, saved-build editing, XP/cap formulas, editor
  synchronization, and browser behavior need their own focused reviews.
