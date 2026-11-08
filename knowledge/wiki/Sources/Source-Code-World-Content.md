---
type: source
created: 2026-11-06
updated: 2026-11-07
raw_path: raw/2026-11-06/batch-03/js/world-content.js
original_path: js/world-content.js
sha256: fc02e6541ec28523dbdefd8ec3ff3e5a77341a82c320651d0f13432177702fa5
status: complete
review_scope: "Root schema, representative definitions, and Geobreaker's W1 boss drop mapping"
tags:
  - source
  - implementation
---

# World, map, and monster catalogue

## Provenance

Exact working-file snapshot captured on 2026-11-06 in batch-03; 2152 lines,
70237 bytes. Original and snapshot matched the SHA-256 above. The working tree
was based on Git revision `7426d3bea6679ce03d73f92658bc00f0c3bc6d99`. Extraction used UTF-8 text.
[[raw/2026-11-06/batch-03/js/world-content.js|Captured source]]; line references below refer to this snapshot.
No prior imported snapshot of this file is superseded. Raw code is evidence;
edit the original project file when implementing changes, then capture a new version.

## Summary

adventureWorld separates worlds, maps, spawn entries, and reusable monster definitions.

Review scope: Root schema and representative world, map/spawn, and monster definitions.

## Findings and evidence

- Lines 1-23 show schema version 1 and a world with stable ID, name, ordered mapIds, background, and mastery presets.
- maps begins at 334. Greenfields at 335-356 has its own ID, goal, drops/itemDrops, and spawn entries referencing monsterId with count and overrides.
- monsters begins at 1035. The first monster at 1036-1066 defines Blob's ID, stats, respawn, rewards, and drops.
- All catalogue bytes are preserved; every world/map/monster and its balance has not been individually audited.

Evidence: [[raw/2026-11-06/batch-03/js/world-content.js|js/world-content.js]], at the symbols and lines listed above.

Focused unique-item extension on 2026-11-06: Verdant Reach's last map is
`verdantWarden` (3-14), which spawns `verdantWardenMonster` (466-485). Grove
Guardian's definition (1204-1231) references Geobreaker's item ID with chance
0.01. This confirms a 1% base W1-boss drop, not a measured acquisition time.
The live original matched the stored hash. See [[wiki/Systems/Equipment/Unique-Item-Effects]].

## Derived concepts

- [[wiki/Foundations/Game-Overview]]
- [[wiki/Foundations/Game-Glossary]]
- [[wiki/Foundations/System-Map]]

## Open questions

Static inspection establishes the captured definitions and control flow. Browser
behavior, performance, and complete regression coverage were not tested here.
The design reasons behind these choices need the owner's input.

