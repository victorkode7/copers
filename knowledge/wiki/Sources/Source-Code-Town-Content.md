---
type: source
created: 2026-11-06
updated: 2026-11-08
raw_path: raw/2026-11-06/batch-03/js/town-content.js
original_path: js/town-content.js
sha256: 50e42f590b6c9095569c1ae32a472cc838212bfb7db7b294130d9c73ff18149a
status: superseded
review_scope: "Complete resource and building definition object"
tags:
  - source
  - implementation
---

# Town content definitions

## Provenance

Exact working-file snapshot captured on 2026-11-06 in batch-03; 26 lines,
5243 bytes. Original and snapshot matched the SHA-256 above. The working tree
was based on Git revision `7426d3bea6679ce03d73f92658bc00f0c3bc6d99`. Extraction used UTF-8 text.
[[raw/2026-11-06/batch-03/js/town-content.js|Captured source]]; line references below refer to this snapshot.
No prior imported snapshot of this file is superseded. Raw code is evidence;
edit the original project file when implementing changes, then capture a new version.

## Version status

Superseded for current definitions by [[wiki/Sources/Source-Code-Town-Content-2026-11-08|the 2026-11-08 catalogue]].
That revision removes the Smeltery-to-Mine upgrade and Saw Mill-to-Outpost
prestige gates. The snapshot and findings below describe the earlier version;
other unchanged definitions remain useful historical evidence.

## Summary

TownContent defines resource labels/capacities and the stable building IDs, locations, costs, prerequisites, production, and effects.

Review scope: Complete resource and building definition object.

## Findings and evidence

- Lines 13-15 define TownContent.resources: wood is Logs, ore is Town Ore, and each resource declares a capacity.
- Lines 16-25 define eight buildings using world IDs and zero-based plots. The two Town Halls share a visible name but have different IDs and effects.
- Building entries use purchaseCost or initialGold, upgradeCost/prestigeCost, requires and action-specific requirements; production outputs use perHour with optional inputs.
- Town Hall productivity is defined only on townHall. slopesTownHall.effects and selected prestigeCost fields are null.

Evidence: [[raw/2026-11-06/batch-03/js/town-content.js|js/town-content.js]], at the symbols and lines listed above.

## Derived concepts

- [[wiki/Foundations/Game-Glossary]]
- [[wiki/Foundations/System-Map]]
- [[wiki/Systems/Town/Town-System]]
- [[wiki/Systems/Town/Town-Progression]]
- [[wiki/Systems/Town/Town-Production-and-Storage]]

## Open questions

Static inspection establishes the captured definitions and control flow. Browser
behavior, performance, and complete regression coverage were not tested here.
The design reasons behind these choices need the owner's input.

