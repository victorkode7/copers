---
type: concept
created: 2026-11-06
updated: 2026-11-08
status: documented
sources:
  - "[[wiki/Sources/Source-Save-Compatibility]]"
  - "[[wiki/Sources/Source-Save-Compatibility-2026-11-08]]"
  - "[[wiki/Sources/Source-Code-Town-Content]]"
  - "[[wiki/Sources/Source-Code-Town-Content-2026-11-08]]"
  - "[[wiki/Sources/Source-Town-Upgrade-Independence]]"
  - "[[wiki/Sources/Source-Code-Town-Progression]]"
  - "[[wiki/Sources/Source-Code-Town-Page]]"
  - "[[wiki/Sources/Source-Town-Terminology]]"
  - "[[wiki/Sources/Source-Town-Terminology-Revision]]"
tags:
  - concept
  - town
  - progression
---

# Town progression

## Summary

The reference captured on 2026-11-06 describes the fresh `townPage`, its
buildings, and the costs and prerequisites for upgrading them.
[[wiki/Sources/Source-Save-Compatibility|Source provenance]]. The 2026-11-08
catalogue revision below updates upgrade/prerequisite behavior.

## Supported facts

### Implementation check on 2026-11-06

The building catalogue, cost scaling, and action control flow were statically
reviewed against batch-03 snapshots. [[wiki/Systems/Town/Town-System|The Town system guide]]
maps the fields, player state, and transaction boundary. The earlier reference's
phrase that null costs are unspecified needs a runtime clarification: a cost
resolving to null disables its action. `effects: null` supplies no productivity
effect. The Outpost's first prestige also requires Verdant Hall T1 in code.
Evidence: [[raw/2026-11-06/batch-03/js/town-content.js|Town definitions]], 17-25;
[[raw/2026-11-06/batch-03/js/town-progression.js|Cost and eligibility]],
`cost`, `can`, `productivityBonus`; [[raw/2026-11-06/batch-03/js/town-page.js|Saving]],
`perform` (51-57). These checks did not execute the game.

### Independent building upgrades: 2026-11-08

Smeltery upgrades no longer depend on the Mine's tier or level. Saw Mill
prestige no longer depends on Lumber Outpost prestige. Required resources,
existing Town Hall gates, and the building's own level cap for prestige remain.
A low-level producer may take longer to supply materials, but its progression
is not a direct gate on these actions. Initial purchase still requires an
owned Mine/Outpost where specified.

Evidence: [[raw/2026-11-08/batch-04/js/town-content.js|Updated catalogue]], sawMill (19), smeltery (24);
[[raw/2026-11-08/batch-04/town-upgrade-independence.txt|Owner direction]], line 1. The prior catalogue had these gates;
its snapshot remains preserved as historical evidence. The live compatibility
reference was aligned with these requirements:
[[raw/2026-11-08/batch-04/SAVE_COMPATIBILITY.md|Updated reference]], lines 108-109 and 147-149.

### State and building unlocks

Optional `townProgress` version 1 stores building `{tier, level}` and materials.
Old `townUnlocks` purchases become T0 level 1 without charging again. Town
purchases, upgrades, and prestige save atomically with gold/material rollback.
Imports restore progression; full reset clears it. Prestige requires the current
level cap and enters the next tier at level 1. Null costs/effects are unspecified.

| Building | Location / prerequisite | Purchase |
| --- | --- | --- |
| Town Hall | Verdant Reach plot 1; always owned at T0 level 1 | Already owned |
| Lumber Outpost | Verdant Reach plot 2 | 10,000 gold |
| Saw Mill | Revealed by Hall prestige; requires owned Outpost | 5,000 gold |
| `slopesTownHall` | Slippery Slopes plot 1; always owned | Already owned |
| Mine (`mine`) | Slippery Slopes plot 2 | 100,000 gold |
| Smeltery | W2 plot 3; slopes Hall T1 and owned Mine | 50,000 gold + 500 Planks + 1,000 Ore |

Slippery Slopes is `world_c791ede123810fd894db2294`. Its Hall has
`effects: null`, so it adds no Verdant Hall productivity. Building definitions,
per-tier overrides, costs, effects, and optional text/function previews live in
`js/town-content.js`. World browsing does not change map travel/unlocks.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Town page|Town state and buildings]].

### Upgrade and prestige costs

The owner confirms Smeltery for this W2 Ore-to-Bars building, matching its
current name and ID `smeltery`. Naming evidence:
[[raw/2026-11-06/batch-04/town-smeltery-naming.txt|Owner naming revision]], line 1.

- Hall/Outpost base gold upgrades within a tier are 1,000 / 1,150 / 1,300 /
  1,500 / 1,750 / 2,000 / 2,300 / 2,650 / 3,050; base prestige is 3,300.
  The first Hall cycle totals 20,000 gold and 6,500 Logs.
- T0 Hall upgrades use 500 Logs each and first prestige 2,000 Logs; from T1,
  upgrades/prestige require 2,000 Logs and 2,000 Planks.
- Outpost upgrades after T0 and every prestige use base 10 Planks times
  `2 ** tier`. From T4, level upgrades add base 10 Ore with the same scaling:
  160 at T4 and 320 at T5.
- Mill upgrades start at 750 gold, rise to 2,300, and use 10 Planks. First
  prestige costs 2,500 gold + 1,000 Planks + 10,000 Ore, with no Outpost tier gate;
  T1 upgrades add 10 Ore. No second prestige is configured.
- Slopes Hall upgrades start at 5,000 gold + 2,000 Ore + 2,000 Planks;
  prestige uses 16,500 base gold and the same materials.
- Mine upgrades start at 5,000 gold + 100 Planks; level-10 prestige uses
  16,500 gold + 100 Planks before tier scaling.
- Smeltery upgrades are independent of Mine progress and use 10,000 base gold,
  100 Planks, and 10 Bars. It has ten levels and no configured prestige.

Current Saw Mill and Smeltery requirement evidence:
[[raw/2026-11-08/batch-04/js/town-content.js|2026-11-08 catalogue]], lines 19, 24.

Gold upgrades use `goldLevelGrowth` 1.15 per existing level, rounding to
`goldRounding` 50, then `goldPrestigeMultiplier ** tier` (2 per tier). Prestige
does not repeat level growth. Non-gold scaling uses
`materialPrestigeMultiplier ** tier`; the Outpost sets this to 2. Costs saturate
at `Number.MAX_SAFE_INTEGER`; balances/purchases are retained without retroactive
refunds. Adventure rewards/costs are outside this Town-only curve.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Town page|Cost evidence and scaling]].

### Later unlocks

Town Hall T2 unlocks purchase of the plot-4 Menagerie; its prestige unlocks
World 2 mastery. Hall T3 unlocks the plot-5 Timber Depot, costing 250,000 gold,
10,000 Planks, and 25,000 Ore. Depot upgrades use `5,000 * current level`
Planks, `10,000 * current level` Ore, and 100,000 base gold with level growth;
no prestige is configured. Purchase-cost maps use `purchaseCost`, with legacy
`initialGold` fallback.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Content edits|Menagerie]],
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Town storage|Depot]].

## Connections

[[wiki/Systems/Town/Town-Production-and-Storage|Production and storage]] explains building
output and Depot capacity. [[wiki/Systems/Progression/World-Progression-and-Mastery|Mastery]]
explains Menagerie rewards. [[wiki/Systems/Saves/Save-Compatibility|Save compatibility]]
distinguishes this Town from the retired settlement prototype.

## Open questions

On 2026-11-08, targeted Smeltery, Saw Mill, and costs/layout browser suites
passed 86 checks. Broader browser coverage and balance remain outside this
change. Historical documentation remains attributed to its captured version;
the dated requirement update establishes the current rule.
