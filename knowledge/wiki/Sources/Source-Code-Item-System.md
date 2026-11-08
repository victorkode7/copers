---
type: source
created: 2026-11-06
updated: 2026-11-08
raw_path: raw/2026-11-06/batch-07/js/item-system.js
original_path: js/item-system.js
sha256: 88c1615e905fd39692ff075a3e67e44f2f5e6c16669bd41b18a729b1663672f8
status: complete
review_scope: "Unique-effect registry and resolver, lines 3-15; 2026-11-08 extension: stat aggregation and attack/hit limits, alongside the earlier unique-effect registry review; skills review: reused unique registry as evidence separating equipment modifiers from learned abilities"
tags:
  - source
  - implementation
  - unique-effects
---

# Unique item effect registry

## Provenance

Exact working-file snapshot captured on 2026-11-06 in batch-07, 313 lines.
Original and snapshot matched the SHA-256 above.
[[raw/2026-11-06/batch-07/js/item-system.js|Captured code]]; symbol/line references use this snapshot.
This is the first import of this file; no earlier version is superseded.

## Summary

The uniqueEffects registry defines Geobreaker's Shockwave modifier and Purple Flame's Black Sun modifier. Equipment.uniqueEffect resolves an item's registered key.

## Findings and evidence

- Lines 4-6 define geobreakerShockwave: 50% proc chance and two activations, requiring Shockwave Slash.
- Lines 8-10 define blackSun: Fire of the Righteous healing cap 1% of maximum HP and burning-damage multiplier 2; its description retains the 10% maximum-HP drain per second.
- Lines 13-15 resolve an item.uniqueEffect key. Only these two registry entries are present in the captured file.

Evidence: [[raw/2026-11-06/batch-07/js/item-system.js|js/item-system.js]], Unique-effect registry and resolver, lines 3-15.

## Combat review extension: 2026-11-08

The live original matched this unchanged snapshot's registered SHA-256.
Expanded scope: stat aggregation and attack/hit limits, alongside the earlier unique-effect registry review.

- stats.minimumAttackInterval and stats.minimumEnemyHitChance (42-43) define default limits of 0.25 seconds and 5%, with lower developer-stat values permitted.
- aggregate (288-294) follows the stat's registered add, multiply, or min mode, using that rule's default and appropriate values for missing item stats.

Evidence: [[raw/2026-11-06/batch-07/js/item-system.js|Captured code]], symbols and lines above.
This is static inspection; no browser tests or balance comparisons were run.

## Skills review extension: 2026-11-08

Both the raw snapshot and live original matched the registered SHA-256.
The existing registry (3-15) supplies Geobreaker and Black Sun settings with learned-ability requirements stated in their descriptions. Runtime eligibility is checked by the ability implementation, not created by this registry alone.

Evidence: [[raw/2026-11-06/batch-07/js/item-system.js|Captured source]], symbols and lines above.
This extends static coverage; no gameplay or browser test result is implied.

## Derived concepts

- [[wiki/Systems/Combat/Skills-and-Abilities|Skills and abilities]].

- [[wiki/Systems/Combat/How-Attacks-Work|How attacks work]] documents this path.

[[wiki/Systems/Equipment/Unique-Item-Effects]] records the two current examples and separates
implemented behavior from the owner's balance concerns. [[wiki/Foundations/System-Map]]
links the implementation boundary.

## Open questions

No browser suites or cross-world build comparisons were run in this review.
The facts above describe the inspected code, not measured balance.

