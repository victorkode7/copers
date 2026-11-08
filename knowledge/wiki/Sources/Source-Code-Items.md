---
type: source
created: 2026-11-06
updated: 2026-11-07
raw_path: raw/2026-11-06/batch-03/js/items.js
original_path: js/items.js
sha256: 2c7d54e3af76f1c2221ec8ea8845fa7d7f6e722ea3d5efa3fdadc38054635db5
status: complete
review_scope: "Catalogue structure, material names, item/recipe examples, equipment types, presets, and focused unique-weapon lookup"
tags:
  - source
  - implementation
---

# Equipment and adventure material catalogue

## Provenance

Exact working-file snapshot captured on 2026-11-06 in batch-03; 2765 lines,
84619 bytes. Original and snapshot matched the SHA-256 above. The working tree
was based on Git revision `7426d3bea6679ce03d73f92658bc00f0c3bc6d99`. Extraction used UTF-8 text.
[[raw/2026-11-06/batch-03/js/items.js|Captured source]]; line references below refer to this snapshot.
No prior imported snapshot of this file is superseded. Raw code is evidence;
edit the original project file when implementing changes, then capture a new version.

## Summary

adventureItems defines equipment slots, adventure materials, items and acquisition recipes, equipment types, and crafting presets.

Review scope: Catalogue structure, material names, item/recipe examples, equipment types, and preset structure.
The 2026-11-06 unique-item review additionally inspected Geobreaker and Purple Flame.

## Findings and evidence

- Lines 1-65 define schema version 2, gear slots, and adventure material labels; ore is Ember Ore at line 49.
- Lines 66-95 show stable item IDs, visible names, slots, stats, and recipe material costs.
- equipmentTypes starts at 1186 and craftingPresets at 1208; preset entries carry equipmentType, tier, and a stat roll pool.
- Detailed balance and every item/preset were not individually audited; the complete file is preserved for retrieval.

Evidence: [[raw/2026-11-06/batch-03/js/items.js|js/items.js]], at the symbols and lines listed above.

Focused extension: Geobreaker (335-348) references `geobreakerShockwave`;
Purple Flame (915-926) references `blackSun`. [[wiki/Systems/Equipment/Unique-Item-Effects]] links
their registry definitions, execution paths, and the owner's feedback. The live
original still matched this snapshot's hash at that review.

## Derived concepts

- [[wiki/Foundations/Game-Overview]]
- [[wiki/Foundations/Game-Glossary]]
- [[wiki/Foundations/System-Map]]

## Open questions

Static inspection establishes the captured definitions and control flow. Browser
behavior, performance, and complete regression coverage were not tested here.
The design reasons behind these choices need the owner's input.

