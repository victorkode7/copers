---
type: concept
created: 2026-11-06
updated: 2026-11-08
status: baseline
evidence_level: static-code-review
sources:
  - "[[wiki/Sources/Source-Code-Index]]"
  - "[[wiki/Sources/Source-Code-World-Content]]"
  - "[[wiki/Sources/Source-Code-Game]]"
  - "[[wiki/Sources/Source-Code-Items]]"
  - "[[wiki/Sources/Source-Code-Skill-Tree]]"
  - "[[wiki/Sources/Source-Code-Town-Content]]"
  - "[[wiki/Sources/Source-Code-Town-Progression]]"
  - "[[wiki/Sources/Source-Code-Town-Page]]"
  - "[[wiki/Sources/Source-Code-Resources]]"
  - "[[wiki/Sources/Source-Town-Design-Intent]]"
  - "[[wiki/Sources/Source-Town-Terminology]]"
  - "[[wiki/Sources/Source-Town-Terminology-Revision]]"
  - "[[wiki/Sources/Source-Code-Item-System]]"
tags:
  - concept
  - foundations
  - glossary
---

# Game glossary

## Summary

Working vocabulary based on the UI and code captured on 2026-11-06. UI names
are used where available. Explanatory terms such as producer and converter
describe code structure; they are not new content-type fields or settled design
decisions. Owner preferences can revise the vocabulary while preserving IDs.

## Supported facts

### Worlds, encounters, and skills

| Term | Meaning in this library | Code reference |
| --- | --- | --- |
| World | Named group with an ordered list of maps | `adventureWorld.worlds`, `mapIds` |
| Map | Location defining a goal, spawns, and optional rewards/background | `adventureWorld.maps` |
| Monster definition | Reusable monster identity, stats, rewards, and artwork | `adventureWorld.monsters` |
| Spawn entry | A map's reference to a monster, with count and optional overrides | `map.spawns` |
| Encounter | Working term for the active map's living/dead monster instances | `state.monsterStates` |
| Monster plate | Visible representation of an enemy; the UI also uses card-related code names | Settings label: Monster plate shaking |
| Skill node | An entry in the character tree with an ID, dependencies, ranks, and optional stats/metadata | `adventureSkillTree.nodes`, `state.skillRanks` |
| Ability | Working term for combat behavior, potentially enabled by a skill node; each behavior needs its runtime implementation examined | `CombatAbilities` and ability modules loaded by the entry page |
| Unique item effect | Item-specific runtime modifier, distinct from the ability it modifies | `item.uniqueEffect`, `Equipment.uniqueEffect` |
| Visual effect | Optional presentation such as projectiles, shaking, or glows | Combat effects settings |

Evidence: [[raw/2026-11-06/batch-03/js/world-content.js|World catalogue]], lines
3-23, 334-356, 1035-1066; [[raw/2026-11-06/batch-03/js/game.js|Game state]],
lines 124-160 and functions `createMonsterStates` / `resetMonsterStates`;
[[raw/2026-11-06/batch-03/js/skill-tree.js|Skill nodes]], lines 1-60;
[[raw/2026-11-06/batch-03/index.html|UI labels and loaded modules]], lines 401-405
and 423-450. [[wiki/Systems/Combat/How-Attacks-Work|How attacks work]] now traces
basic attacks, successful hits, and attack-triggered checks.
[[wiki/Systems/Combat/Skills-and-Abilities|Skills and abilities]] distinguishes
nodes, ranks, stat bonuses, ability behavior, and unique item modifiers.

[[wiki/Systems/Equipment/Unique-Item-Effects]] illustrates the item/ability distinction:
[[raw/2026-11-06/batch-07/js/item-system.js|Registry]], lines 3-15, resolves
Geobreaker's Shockwave modifier and Purple Flame's Black Sun modifier. Both
modify the corresponding learned ability; neither is itself a separate skill node.

### Town and progression

| Term | Meaning | Code reference |
| --- | --- | --- |
| Town | Building/resource page, separate from Crafting | `currentView: townPage`, `townPageButton` |
| Crafting / Craft / Crafting system | Owner's terms for creating items from recipes; some page identifiers retain historical town wording | `townButton`; legacy view value `town`; item `recipe` |
| Anvil | Owner's preferred name for equipment rerolling, separate from item creation | Documented `itemCrafts` / `itemRollSaves`; module name `equipment-crafting.js` |
| Building definition | Shared specification of name, location, costs, requirements, and behavior fields | `TownContent.buildings[id]` |
| Owned building | Player-specific tier/level and optional production progress | `townProgress.buildings[id]` |
| Plot / building slot | Location within a world's Town; code indices 0-4 correspond to human slots 1-5 | `definition.plot`; five UI cards |
| Character level | Character progression associated with XP and character skill-point earning | `state.level` |
| Building level | Current upgrade level within a building tier; starts at 1 | `townProgress.buildings[id].level` |
| Building tier | Prestige count; starts at 0 | `townProgress.buildings[id].tier` |
| Prestige | Eligible action at the level cap that increments tier and resets level to 1 | `TownProgression.can` / `apply` |
| Producer | Building with a valid `production` specification | `production.resource`, `perHour` |
| Converter | Producer that consumes input materials to make output | `production.inputs`; no separate converter type field |
| Storage building | Building supplying total capacity for one or more resources | `storageCapacity` |
| Discovered resource | Resource with a key in the player's Town resource object; its balance can be zero | `townProgress.resources`, resource-strip filtering |

Evidence: [[raw/2026-11-06/batch-03/js/town-content.js|Town definitions]], lines
13-25; [[raw/2026-11-06/batch-03/js/town-progression.js|Town rules]], functions
`defaults`, `normalize`, `can`, `apply`, `production`, `storage`, and
`hasConverters`; [[raw/2026-11-06/batch-03/js/town-page.js|Town UI]], lines
30-49 and 113-150; [[raw/2026-11-06/batch-03/js/game.js|Character state]],
lines 124-160. Historical views are documented in
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Retired Town prototype|the migration reference]].

### Names that need context

| Say | Visible name / internal ID | Player balance or definition |
| --- | --- | --- |
| Town Logs | Logs / `wood` | `state.townProgress.resources.wood` |
| Town Ore | Ore / `ore` | `state.townProgress.resources.ore` |
| Adventure Ember Ore | Ember Ore / `ore` | `state.materials.ore` |
| Gold | Shared adventure gold / `gold` | `state.gold` |
| Verdant Reach Town Hall | Town Hall / `townHall` | Verdant Reach; productivity effect |
| Slippery Slopes Town Hall | Town Hall / `slopesTownHall` | Slippery Slopes; `effects: null` |
| Menagerie; owner also wrote Managerie/managerie | Menagerie / `menagerie` | Mastery access and non-boss kill credit |
| Smeltery | Smeltery / `smeltery` | W2 Town Ore-to-Bars converter; owner-confirmed name |

Evidence: [[raw/2026-11-06/batch-03/js/town-content.js|Town resources/buildings]],
lines 15-25; [[raw/2026-11-06/batch-03/js/items.js|Adventure materials]], lines
45-65; [[raw/2026-11-06/batch-03/js/resources.js|Balance routing]], lines 6-15;
[[raw/2026-11-06/batch-03/js/town-progression.js|Town spending]], lines 50-65.
The words Town and Adventure disambiguate the two Ore balances in discussions;
they do not rename either resource in the game.

Owner terminology evidence:
[[raw/2026-11-06/batch-03/town-design-intent.txt|Town design note]], paragraphs
2-3. The [[raw/2026-11-06/batch-03/town-terminology.txt|earlier clarification]],
paragraph 1, establishes Anvil and Crafting. The owner's subsequent
[[raw/2026-11-06/batch-04/town-smeltery-naming.txt|naming revision]], line 1,
chooses Smeltery for the W2 Ore-to-Bars building, matching the current name and
ID `smeltery`. Forge was a withdrawn proposed name for this building, not its
current preferred name. Anvil's mechanics remain linked in
[[wiki/Systems/Equipment/Equipment-Crafting|the rerolling note]].

## Connections

[[wiki/Foundations/Game-Overview]] explains how the systems fit together.
[[wiki/Foundations/System-Map]] maps these terms to code ownership.
[[wiki/Systems/Town/Town-System]] provides field definitions and an addition workflow.

## Open questions

The working ability vocabulary is documented in
[[wiki/Systems/Combat/Skills-and-Abilities|Skills and abilities]]; a complete
classification and detailed rules for every ability remain open. Equipment tier and building tier should retain
their system names when discussed; the full equipment schema is a later review.
