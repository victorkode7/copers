---
type: concept
created: 2026-11-06
updated: 2026-11-08
status: baseline
evidence_level: static-code-review
sources:
  - "[[wiki/Sources/Source-Code-Town-Content]]"
  - "[[wiki/Sources/Source-Code-Town-Content-2026-11-08]]"
  - "[[wiki/Sources/Source-Town-Upgrade-Independence]]"
  - "[[wiki/Sources/Source-Code-Town-Progression]]"
  - "[[wiki/Sources/Source-Code-Town-Page]]"
  - "[[wiki/Sources/Source-Code-Resources]]"
  - "[[wiki/Sources/Source-Code-Game]]"
  - "[[wiki/Sources/Source-Code-Combat-Simulation]]"
  - "[[wiki/Sources/Source-Code-Index]]"
  - "[[wiki/Sources/Source-Save-Compatibility]]"
  - "[[wiki/Sources/Source-Town-Design-Intent]]"
  - "[[wiki/Sources/Source-Town-Terminology]]"
  - "[[wiki/Sources/Source-Town-Terminology-Revision]]"
tags:
  - concept
  - town
  - system-guide
---

# Town system

## Summary

The first detailed system definition, based on static inspection of working-code
snapshots captured on 2026-11-06. Town combines a building economy with production,
storage, and Menagerie support for map mastery. The code establishes those
connections. [[wiki/Design/Town-Design-Intent]] records the owner's working direction:
optional adventure support with choices between Town investment and immediate
player benefit. Specific costs, rewards, and pacing remain undecided.

Design evidence: [[raw/2026-11-06/batch-03/town-design-intent.txt|Owner note]],
paragraphs 1-4. That direction is recorded separately from the current rules below.
The 2026-11-08 requirement revision and targeted browser checks are documented
in the upgrade-policy section below.

## Supported facts

### Definitions, player state, and presentation

| Layer | Where it lives | What it means |
| --- | --- | --- |
| Content | `TownContent.resources` / `.buildings` | Shared definitions used by every profile |
| Player progression | `state.townProgress.buildings[id]` | Owned building tier/level and optional production progress |
| Player stock | `state.townProgress.resources[id]` | Town material quantities and discovery keys |
| Gold | `state.gold` | Shared currency; Town passes its own material balances to spending helpers |
| Rules | `TownProgression` | Eligibility, costs, state changes, production, and capacity |
| Screen | `TownPage` and `townPageView` | Displays the economy and handles player action transactions |

`townProgress` version 1 contains `buildings` and `resources`, with optional
`killFractions`. A building starts at tier 0, level 1; production can retain
`{fraction, phase, total}`. Normalization preserves safe unknown building/resource
IDs and adds always-owned buildings and unlocked resource keys. Creating a
resource definition alone does not show its card: the UI requires a corresponding
key in the player's resource object, which can have balance zero.
Evidence: [[raw/2026-11-06/batch-03/js/town-progression.js|Town state]],
`defaults` / `normalize` (7-23); [[raw/2026-11-06/batch-03/js/resources.js|Spending]],
6-15; [[raw/2026-11-06/batch-03/js/town-page.js|Resource display]], 139-150;
[[raw/2026-11-06/batch-03/index.html|Town containers]], 120-124.

### Building locations and roles

| World | Human slot / code plot | Building ID | Observed role |
| --- | --- | --- | --- |
| Verdant Reach | 1 / 0 | `townHall` | Always owned; Town productivity |
| Verdant Reach | 2 / 1 | `lumberOutpost` | Produces Logs |
| Verdant Reach | 3 / 2 | `sawMill` | Converts Logs to Planks |
| Verdant Reach | 4 / 3 | `menagerie` | Mastery access and non-boss kill credit |
| Verdant Reach | 5 / 4 | `timberDepot` | Total Log storage capacity |
| Slippery Slopes | 1 / 0 | `slopesTownHall` | Always owned; upgrade gate; effects currently null |
| Slippery Slopes | 2 / 1 | `mine` | Produces Ore |
| Slippery Slopes | 3 / 2 | `smeltery` | Converts Ore to Bars |

The owner confirms **Smeltery** for the W2 Ore-to-Bars building, matching the
catalogue name and ID `smeltery`. **Anvil** names equipment rerolling;
**Crafting** names item creation. Evidence:
[[raw/2026-11-06/batch-04/town-smeltery-naming.txt|Naming revision]], line 1;
[[raw/2026-11-06/batch-03/town-terminology.txt|Anvil/Crafting clarification]], paragraph 1;
[[raw/2026-11-06/batch-03/js/town-content.js|Building definition]], line 24.

Roles above are descriptions derived from fields, not an explicit building-type
enum. There are five cards per Town world. Content uses world IDs, including
`verdantReach` and Slippery Slopes' `world_c791ede123810fd894db2294`, plus a
zero-based `plot`. Town world browsing keeps a local selection and does not
change the active adventure map.
Evidence: [[raw/2026-11-06/batch-03/js/town-content.js|Building catalogue]],
16-25; [[raw/2026-11-06/batch-03/js/town-page.js|World selection and cards]],
15, 25-30, and 125-137.

### Fields that control a building

| Fields | Interpretation |
| --- | --- |
| `name`, `icon`, `world`, `plot` | Identity and presentation location |
| `alwaysOwned`, `maxLevel`, `tiers` | Starting ownership, level cap, optional tier overrides |
| `initialGold` / `purchaseCost` | Purchase cost; explicit cost takes precedence over legacy gold fallback |
| `upgradeCost`, `prestigeCost` | Cost map or function of tier/level; null disables that action |
| `requires`, `upgradeRequires`, `prestigeRequires` | Building tier/level gates; purchase uses `requires` |
| `goldLevelGrowth`, `goldRounding`, `goldPrestigeMultiplier` | Gold growth/rounding/tier scaling |
| `materialPrestigeMultiplier` | Independent tier scaling for non-gold costs |
| `unlockResources` | Material keys discovered when owned progression is normalized |
| `production` | Object/function giving output resource and hourly rate; optional input recipe |
| `storageCapacity` | Object/function giving total resource capacity; strongest owned total wins |
| `purchasePreview`, `upgradePreview`, `prestigePreview` | Optional text/function overriding the computed benefit preview |
| `effects` | Data requiring a consumer; productivity currently reads the Verdant Hall's specific effect |

Evidence: [[raw/2026-11-06/batch-03/js/town-content.js|Definitions]], 15-25;
[[raw/2026-11-06/batch-03/js/town-progression.js|Field interpretation]],
`definition`, `cost`, `requirements`, `productivityBonus`, `production`, and
`capacity`; [[raw/2026-11-06/batch-03/js/town-page.js|Previews]], `nextBenefit`.

### Upgrade policy: 2026-11-08

The requirement fields above are engine capabilities. Current owner policy
allows Town Hall prestige gates and material costs, without requiring another
production building to reach a particular level or prestige for an upgrade or
prestige action. The building's own prestige level cap remains applicable.

The current catalogue removes the Smeltery-to-Mine upgrade gate and the
Saw Mill-to-Outpost prestige gate. Resource supply still matters, and initial
purchase ownership requirements remain as defined.
Evidence: [[raw/2026-11-08/batch-04/town-upgrade-independence.txt|Owner policy]], line 1;
[[raw/2026-11-08/batch-04/js/town-content.js|Revised catalogue]], sawMill (19), smeltery (24).

### Action and production flow

`TownProgression.available` checks prerequisites. `can` additionally checks
ownership, level/tier eligibility, a non-null cost, and affordability. `apply`
spends and mutates progression; the UI's `perform` clones progression, invokes
the action, saves the full profile, and restores gold/progression on failure.
A new call path must preserve that transaction behavior.
Evidence: [[raw/2026-11-06/batch-03/js/town-progression.js|Actions]], 40-65;
[[raw/2026-11-06/batch-03/js/town-page.js|Transaction wrapper]], 51-57.

Production definitions use hourly rates before productivity; the rules normalize
them to seconds. Producers without inputs run before converters. Conversion is
limited by inputs and output space; full output clears pending fraction/phase
without spending inputs. Existing over-cap balances are retained. The simulation
calls Town ticking before its combat-pause checks, and the host preserves small
steps for converter catch-up. UI animation is a view of this saved progress.
Evidence: [[raw/2026-11-06/batch-03/js/town-progression.js|Production]], 67-130;
[[raw/2026-11-06/batch-03/js/combat-simulation.js|Step ordering]], 7-16;
[[raw/2026-11-06/batch-03/js/game.js|Clock integration]], 4360-4365, 4467-4489;
[[raw/2026-11-06/batch-03/js/town-page.js|Production rendering]], 154-205.

## Adding a building

This is an implementation-derived workflow, not a new game-design decision.

1. Check its purpose against [[wiki/Design/Town-Design-Intent|Town's design direction]]
   and choose a stable ID, world, and available plot. Decide
   whether it uses existing production/storage behavior or needs a new rule.
2. Add resource definitions if needed, with names, IDs, icons, and capacity.
   Use `unlockResources` to discover them through owned progression.
3. Add the building to `TownContent.buildings`: costs, gates, caps, and the
   relevant `production`, `storageCapacity`, or supported effect fields.
   Follow the upgrade policy above when defining prerequisites.
   A converter uses `production.inputs`; there is no separate converter class.
4. Check `TownProgression` for required behavior and saved-state changes.
   Arbitrary new effects need an implementation; definitions alone do not apply
   them. Preserve save IDs and follow [[wiki/Systems/Saves/Save-Compatibility|migration rules]].
5. Check the card, preview, costs, and transaction wrapper in `TownPage`.
   Custom building art is supplied by `buildingArt`; a sixth plot would also
   require changing the current five-card UI.
6. Validate the affected gameplay, persistence, and presentation. Existing
   entry points include `tests/town-page-smoke.js`, `town-production-smoke.js`,
   `town-storage-smoke.js`, and producer-specific suites under `tests/`.
   On 2026-11-08, the Smeltery, Saw Mill, and costs/layout suites passed
   86 browser checks. Other suites were not run for this requirement change.
7. Capture changed originals in a new raw batch and update the affected wiki
   notes, inventory, and changelog. Never edit the captured historical code.

Basis: the field and control-flow evidence above; the migration reference at
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Content edits|Content edits]].

## Connections

[[wiki/Systems/Town/Town-Progression]] records detailed costs/unlocks and
[[wiki/Systems/Town/Town-Production-and-Storage]] records rates/recipes/caps.
[[wiki/Foundations/Game-Glossary]] resolves names and [[wiki/Foundations/System-Map]] identifies owners.
[[wiki/Systems/Progression/World-Progression-and-Mastery]] explains Menagerie rewards.

## Open questions

- Which immediate benefits, tradeoffs, and pacing should be tried first?
- When should Anvil's preferred naming be applied to the game UI? Smeltery already matches the confirmed building name.
- Are producer/converter/support useful terms for future discussions?
- The new-building workflow is derived from static code; runtime, offline
  equivalence, rendering, and failure recovery still require appropriate tests
  for each implemented change.
