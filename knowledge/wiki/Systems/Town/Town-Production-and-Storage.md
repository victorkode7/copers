---
type: concept
created: 2026-11-06
updated: 2026-11-07
status: documented
sources:
  - "[[wiki/Sources/Source-Save-Compatibility]]"
  - "[[wiki/Sources/Source-Code-Town-Content]]"
  - "[[wiki/Sources/Source-Code-Town-Progression]]"
  - "[[wiki/Sources/Source-Code-Combat-Simulation]]"
  - "[[wiki/Sources/Source-Code-Game]]"
  - "[[wiki/Sources/Source-Town-Terminology]]"
  - "[[wiki/Sources/Source-Town-Terminology-Revision]]"
tags:
  - concept
  - town
  - production
  - storage
---

# Town production and storage

## Summary

The reference captured on 2026-11-06 specifies hourly production, conversion
recipes, partial progress, and storage caps shared by foreground/offline play.
[[wiki/Sources/Source-Save-Compatibility|Source provenance]].

## Supported facts

### Implementation check on 2026-11-06

Batch-03 code inspection confirms the listed resource capacities, base rates,
recipes, and Verdant Hall productivity calculation. The production tick iterates
owned buildings across worlds, orders sources before converters, and limits
output by inputs and capacity. Its invocation is part of simulation step
ordering. [[wiki/Systems/Town/Town-System|The Town system guide]] explains these boundaries.
Evidence: [[raw/2026-11-06/batch-03/js/town-content.js|Town definitions]], 15-25;
[[raw/2026-11-06/batch-03/js/town-progression.js|Production rules]], 67-130;
[[raw/2026-11-06/batch-03/js/combat-simulation.js|Simulation tick]], 7-16;
[[raw/2026-11-06/batch-03/js/game.js|Host wiring]], 4360-4365 and 4467-4489.
This establishes code structure; runtime foreground/offline equivalence was
not tested in this task.

### Rates and recipes

Let `step = tier * 10 + level`. Base rates, before Town productivity, are:

| Producer | Output per hour | Input per output unit |
| --- | --- | --- |
| Lumber Outpost | `step * 720` Logs | None |
| Saw Mill | `step * 90` Planks | 2 Logs |
| Mine | `step * 360` Ore | None |
| Smeltery | `step * 10` Bars | 10 Ore |

Smeltery is the owner's confirmed name, matching the captured implementation
and ID `smeltery`. Evidence:
[[raw/2026-11-06/batch-04/town-smeltery-naming.txt|Naming revision]], line 1.

At matching tier/level, the Outpost produces four times the Mill's Log input:
T0 level 10 yields 7,200 Logs/hour and 900 Planks/hour, consuming 1,800 Logs/hour
and leaving 5,400. Matching Mine output is 3.6 times Smeltery Ore consumption.
The source labels Outpost output an 80% reduction and Mine output half of
matching Outpost output; these are captured balance claims.

Each Verdant Hall level upgrade adds 10 percentage points of productivity.
Earned upgrades are `tier * 9 + level - 1`; level 1 initially gives no bonus
and prestige adds none by itself. The multiplier applies equally to production
and converter consumption, preserving recipe ratios. `perHour` is normalized to
seconds; legacy `perSecond` remains supported. `wood` keeps its ID but displays
as Logs; Smeltery discovers `bars` at zero, and buying Mine discovers Ore without
granting stock.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Town page|Rates, recipes, and productivity]].

### Simulation and display

Owned producers optionally retain `production: {fraction, phase, total}`.
Production uses the shared simulation clock during combat, Town visits, and
offline catch-up. Converters consume inputs only with output; starvation cannot
bank work. Profiles with converters retain 100 ms paused offline steps to match
foreground balances. Material balances, levels, and partial progress survive
rate changes.

The bottom bar batches at high rates; building glows cap at two per second and
respect reduced motion. There are no per-log timers or saves. Visible producer
progress uses one compositor animation; leaving Town/hiding the tab cancels it.
Fixed-width cards show discovered Town materials, including zero balances;
gold/adventure materials stay outside that strip.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Town page|Simulation and presentation]].

### Storage and over-cap profiles

| Resource | Base capacity |
| --- | --- |
| Logs | 50,000 |
| Planks | 50,000 |
| Ore | 100,000 |
| Bars | 10,000 |

Definitions use `capacity`; storage buildings declare total `storageCapacity`,
with the strongest owned capacity applied per resource. Timber Depot raises
Log capacity to 100,000 on purchase, adding 100,000 per level to 1,000,000 at
level 10. Capacity is derived from levels, without duplicate saved cap fields.

Legacy over-cap balances remain spendable; production pauses until room exists.
Full output storage stops converters before input consumption, clears pending
fractions, and cannot bank elapsed time. Foreground/offline caps match. Full
producers show Storage full and stop animation; more storage resumes production
without changing current stock. `Number.MAX_SAFE_INTEGER` remains the
save-validation limit for preserved legacy balances.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Town storage|Capacity and pause rules]],
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Town page|Legacy validation limit]].

## Connections

[[wiki/Systems/Town/Town-Progression|Town progression]] supplies producer prerequisites,
upgrade costs, and Depot unlocks. [[wiki/Systems/Saves/Save-Compatibility|Save compatibility]]
preserves partial production and legacy resource balances.

## Open questions

Live rates and foreground/offline equivalence were not tested during import.
The source lists `tests/town-storage-smoke.js` and
`tests/town-smeltery-smoke.js` as coverage; those are not fresh test results.
