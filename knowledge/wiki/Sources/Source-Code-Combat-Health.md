---
type: source
created: 2026-11-06
updated: 2026-11-08
raw_path: raw/2026-11-06/batch-07/js/combat-health.js
original_path: js/combat-health.js
sha256: 44b82e74cc507758d74f15b71f94b70a2db269d2b5ab75cf6d3488cacc837b85
status: complete
review_scope: "Regeneration and capped healing, lines 20-39; 2026-11-08 extension: physical damage, HP/shield handling, target multipliers, and the earlier regeneration/healing review"
tags:
  - source
  - implementation
  - unique-effects
---

# Fire healing and health-drain arithmetic

## Provenance

Exact working-file snapshot captured on 2026-11-06 in batch-07, 82 lines.
Original and snapshot matched the SHA-256 above.
[[raw/2026-11-06/batch-07/js/combat-health.js|Captured code]]; symbol/line references use this snapshot.
This is the first import of this file; no earlier version is superseded.

## Summary

CombatHealth computes healing, maximum-health-based self-drain, excess regeneration, and direct-healing caps independently of presentation.

## Findings and evidence

- getRighteousFireRegeneration computes drain from maximumHealth, healthDrainPerSecond, and elapsed time, then reserves healing up to the configured cap after offsetting drain.
- Unused regeneration is returned as excess for the Fire damage path.
- applyPlayerHealing does not add HP above the configured healing cap. HP already above that cap is not instantly removed; it can drain down normally.

Evidence: [[raw/2026-11-06/batch-07/js/combat-health.js|js/combat-health.js]], Regeneration and capped healing, lines 20-39.

## Combat review extension: 2026-11-08

The live original matched this unchanged snapshot's registered SHA-256.
Expanded scope: physical damage, HP/shield handling, target multipliers, and the earlier regeneration/healing review.

- getPhysicalDamage (10-12) multiplies base, skill, equipment, and Fury factors, rounds, and enforces a minimum of 1.
- applyPlayerDamage (44-54) spends one shield only for an enemy hit, otherwise subtracts HP and reports death.
- getMonsterDamageTakenMultiplier (60-64) applies Singled Off's 1.3 factor only without another living monster; getFireDamageTakenMultiplier (66-68) handles eligible scorched targets.
- applyMonsterDamage (70-74) clamps HP to zero and reports actual HP removed.

Evidence: [[raw/2026-11-06/batch-07/js/combat-health.js|Captured code]], symbols and lines above.
This is static inspection; no browser tests or balance comparisons were run.

## Derived concepts

- [[wiki/Systems/Combat/How-Attacks-Work|How attacks work]] documents this path.

[[wiki/Systems/Equipment/Unique-Item-Effects]] records the two current examples and separates
implemented behavior from the owner's balance concerns. [[wiki/Foundations/System-Map]]
links the implementation boundary.

## Open questions

No browser suites or cross-world build comparisons were run in this review.
The facts above describe the inspected code, not measured balance.

