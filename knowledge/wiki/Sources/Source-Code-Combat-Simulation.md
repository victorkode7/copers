---
type: source
created: 2026-11-06
updated: 2026-11-08
raw_path: raw/2026-11-06/batch-03/js/combat-simulation.js
original_path: js/combat-simulation.js
sha256: 1d28d1205c85d0e4ae34488cd98e907890151b4b0103c514d759a5196f90ccff
status: complete
review_scope: "Complete CombatSimulation module, with focus on Town tick ordering and host boundary; 2026-11-08 extension: complete step order, basic/enemy attacks, hit versus attack triggers, pause behavior, and respawn"
tags:
  - source
  - implementation
---

# Simulation step orchestration

## Provenance

Exact working-file snapshot captured on 2026-11-06 in batch-03; 128 lines,
7280 bytes. Original and snapshot matched the SHA-256 above. The working tree
was based on Git revision `7426d3bea6679ce03d73f92658bc00f0c3bc6d99`. Extraction used UTF-8 text.
[[raw/2026-11-06/batch-03/js/combat-simulation.js|Captured source]]; line references below refer to this snapshot.
No prior imported snapshot of this file is superseded. Raw code is evidence;
edit the original project file when implementing changes, then capture a new version.

## Summary

CombatSimulation.create returns a step function driven by injected state, rules, randomness, and freeze-delay settings.

Review scope: Complete CombatSimulation module, with focus on Town tick ordering and host boundary.

## Findings and evidence

- Lines 1-9 separate browser-independent step ordering from the host and call rules.tickTown at the beginning of each step.
- The combatPaused checks occur after Town ticking; opening or hiding the Town UI is not the production clock.
- Lines 119-127 return needsRender and export a frozen step API. Scheduling and persistence belong to the host described in the file header.

Evidence: [[raw/2026-11-06/batch-03/js/combat-simulation.js|js/combat-simulation.js]], at the symbols and lines listed above.

## Combat review extension: 2026-11-08

The live original matched this unchanged snapshot's registered SHA-256.
Expanded scope: complete step order, basic/enemy attacks, hit versus attack triggers, pause behavior, and respawn.

- step (9-44) orders Town, buffs, regeneration, freeze/respawn, pending attacks, Shield Slam, and mana before ordinary attacks.
- Lines 45-68 tick poison/bleed/brands before enemy attacks; lines 69-104 then advance basic player attacks.
- Lines 86-94 check bleed/poison/Shockwave after successful basic hits; lines 99-104 independently check primary eruption, arrows, and spells even after a basic miss.
- Lines 107-116 continue damage-over-time checks while combat is paused; lines 30-39 restore monsters when their respawn timers expire.

Evidence: [[raw/2026-11-06/batch-03/js/combat-simulation.js|Captured code]], symbols and lines above.
This is static inspection; no browser tests or balance comparisons were run.

## Derived concepts

- [[wiki/Systems/Combat/How-Attacks-Work|How attacks work]] documents this path.

- [[wiki/Foundations/Game-Overview]]
- [[wiki/Foundations/System-Map]]
- [[wiki/Systems/Town/Town-System]]
- [[wiki/Systems/Town/Town-Production-and-Storage]]

## Open questions

Static inspection establishes the captured definitions and control flow. Browser
behavior, performance, and complete regression coverage were not tested here.
The design reasons behind these choices need the owner's input.

