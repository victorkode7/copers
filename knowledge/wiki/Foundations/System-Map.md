---
type: concept
created: 2026-11-06
updated: 2026-11-08
status: baseline
evidence_level: static-code-review
sources:
  - "[[wiki/Sources/Source-Code-Index]]"
  - "[[wiki/Sources/Source-Code-Town-Content]]"
  - "[[wiki/Sources/Source-Code-Town-Progression]]"
  - "[[wiki/Sources/Source-Code-Town-Page]]"
  - "[[wiki/Sources/Source-Code-Resources]]"
  - "[[wiki/Sources/Source-Code-Game]]"
  - "[[wiki/Sources/Source-Code-Items]]"
  - "[[wiki/Sources/Source-Code-World-Content]]"
  - "[[wiki/Sources/Source-Code-Skill-Tree]]"
  - "[[wiki/Sources/Source-Code-Combat-Simulation]]"
  - "[[wiki/Sources/Source-Code-Item-System]]"
  - "[[wiki/Sources/Source-Code-Combat-Abilities]]"
  - "[[wiki/Sources/Source-Code-Combat-Health]]"
  - "[[wiki/Sources/Source-Town-Design-Intent]]"
  - "[[wiki/Sources/Source-Town-Terminology]]"
  - "[[wiki/Sources/Source-Town-Terminology-Revision]]"
tags:
  - concept
  - foundations
  - architecture
---

# System map

## Summary

First map of definitions and responsibilities, based on static inspection of
2026-11-06 snapshots. Town and the main attack path have focused reviews; the
attack files were rechecked against live code on 2026-11-08. Other systems have
catalogue structure or entry points identified; their complete behavior remains
to review.
Original paths below are relative to the project root. Raw links preserve the
evidence for this version; future code changes need fresh checks and snapshots.

## Supported facts

| Area | Original file | Responsibility / review scope |
| --- | --- | --- |
| Navigation and page containers | `index.html` | Visible page names, Town DOM anchors, runtime load order |
| Town content | `js/town-content.js` | Resource/building definitions, balance functions, prerequisites, production specs |
| Town rules | `js/town-progression.js` | Defaults, validation, costs, eligibility, mutations, production, capacity, kill credit |
| Town UI and player transactions | `js/town-page.js` | Cards, world browsing, previews, action buttons, save/rollback wrapper, animation |
| Shared spending | `js/resources.js` | Gold plus a caller-selected material balance |
| State and orchestration | `js/game.js` | Content assembly, active state, travel, rewards, saves, simulation scheduling; focused review |
| Step ordering | `js/combat-simulation.js` | Combat step order, enemy/basic attacks, hit/attack triggers, and Town ticking; host owns scheduling/persistence |
| Unique item registry | `js/item-system.js` | Unique effects, stat aggregation, and combat limits; focused review |
| Unique-modified combat paths | `js/combat-abilities.js` | Shockwave/Fire paths, multi-hit selection, and arrow triggers; focused review |
| Health math | `js/combat-health.js` | Physical damage, target multipliers, HP/shields, and Fire healing; focused review |
| World/map/monster definitions | `js/world-content.js` | Shared catalogue and representative entries; detailed balance unreviewed |
| Equipment/adventure material definitions | `js/items.js` | Slots, materials, items/recipes, equipment types, preset structure |
| Runtime skill definitions | `js/skill-tree.js` | Node schema, stat examples, and ability metadata; host allocation/refund paths reviewed, detailed abilities unreviewed |

Evidence: [[raw/2026-11-06/batch-03/index.html|Runtime entry page]], lines 416-456;
[[wiki/Sources/Source-Code-Town-Content]], [[wiki/Sources/Source-Code-Town-Progression]],
[[wiki/Sources/Source-Code-Town-Page]], [[wiki/Sources/Source-Code-Resources]],
[[wiki/Sources/Source-Code-Game]], [[wiki/Sources/Source-Code-Combat-Simulation]],
[[wiki/Sources/Source-Code-World-Content]], [[wiki/Sources/Source-Code-Items]], and
[[wiki/Sources/Source-Code-Skill-Tree]] record the inspected symbols and line ranges.

### Choosing where to make a change

[[wiki/Systems/Combat/How-Attacks-Work|How attacks work]] traces the main combat
path with formulas and precise code locations. Begin with combat-simulation.js
for step order, game.js for stat assembly and rewards, combat-abilities.js for
target/trigger behavior, combat-health.js for HP arithmetic, and item-system.js
for equipment aggregation and limits. Detailed individual skills still need
focused review before changes.

[[wiki/Systems/Equipment/Unique-Item-Effects]] traces the current unique modifiers through
[[wiki/Sources/Source-Code-Item-System|the registry]],
[[wiki/Sources/Source-Code-Combat-Abilities|execution]], and
[[wiki/Sources/Source-Code-Combat-Health|health arithmetic]]. Their raw snapshots and
inspected symbols are recorded in those source notes. This focused review does
not establish every combat rule or cross-world balance.

Use the owner's names when discussing features: Smeltery (`smeltery`) is the W2
Ore-to-Bars building; Anvil is equipment rerolling; Crafting is item creation.
[[wiki/Foundations/Game-Glossary]] records the mapping. Evidence:
[[raw/2026-11-06/batch-04/town-smeltery-naming.txt|Current building name]], line 1;
[[raw/2026-11-06/batch-03/town-terminology.txt|Anvil/Crafting clarification]], paragraph 1.

- **Name, rate, cost, prerequisite, or existing building recipe:** begin with
  Town content, then check how Town rules and UI interpret that field.
- **New behavior or restriction:** inspect Town rules and host integration.
  An arbitrary new `effects` property needs code that consumes it.
- **Appearance, wording, or layout:** begin with Town UI and the relevant DOM
  anchors; related stylesheets need review for the particular visual change.
- **New saved state:** inspect normalization, save serialization/import, and
  [[wiki/Systems/Saves/Save-Compatibility|migration requirements]].

This routing is an implementation-derived guide. Basis:
[[raw/2026-11-06/batch-03/js/town-progression.js|Town rules]], `definition`,
`normalize`, `cost`, `productivityBonus`, `production`, and `capacity`;
[[raw/2026-11-06/batch-03/js/town-page.js|Town presentation]], `perform` and
`render`; [[raw/2026-11-06/batch-03/js/game.js|Save wiring]],
`createGameSave`, `parseGameSave`, and Town normalization at lines 1900/2077.

[[wiki/Systems/Combat/Skills-and-Abilities|Skills and abilities]] covers node
fields, tree connectivity, pending/committed ranks, refunds, and representative
activation gates. The host follows stored tree connections in both directions;
adding a node definition does not implement a new combat behavior.

### Other entry points to inspect when needed

The runtime also loads `js/item-system.js`, `js/world-system.js`,
`js/progression.js`, `js/mastery-system.js`, `js/equipment-crafting.js`,
`js/combat-abilities.js`, specialized skill modules, and visual-effect modules.
Their load references are established by the captured entry page; this map
does not claim a full implementation review of those modules. Editor pages
are linked from the main navigation, but their write/export paths still need
inspection before documenting how editor changes reach runtime files.
Evidence: [[raw/2026-11-06/batch-03/index.html|Entry page]], main navigation
and lines 416-456.

The runtime loads `js/skill-tree.js`. The top-level `skill-tree.js` and
`skill-tree.json` are separate project paths whose synchronization has not been
reviewed here. Use the loaded path as the starting point for runtime questions.
Evidence: [[raw/2026-11-06/batch-03/index.html|Loaded scripts]], line 423.

## Connections

[[wiki/Foundations/Game-Overview]] provides context and [[wiki/Foundations/Game-Glossary]] fixes the
meaning of terms. [[wiki/Systems/Town/Town-System]] walks through adding a Town building.

## Open questions

Broader stat interactions, editor synchronization, detailed individual skills,
and the complete catalogues are later review areas. [[wiki/Design/Town-Design-Intent]] now records Town's
working direction from [[raw/2026-11-06/batch-03/town-design-intent.txt|the owner reply]].
Intent for other systems and detailed balance rationale remain to be recorded.

For future documentation, label current behavior, owner-confirmed intent, and
proposals separately. Preserve original code/design notes in a new raw batch;
update the affected wiki notes and source inventory after an implemented change.
