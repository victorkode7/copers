---
type: source
created: 2026-11-06
updated: 2026-11-07
raw_path: raw/2026-11-06/batch-03/js/town-progression.js
original_path: js/town-progression.js
sha256: 0dd0d2c4d3e672010e7b42a78d50f69450950eed5739b495645fb21d6f14bbc5
status: complete
review_scope: "Complete TownProgression module, static inspection"
tags:
  - source
  - implementation
---

# Town progression implementation

## Provenance

Exact working-file snapshot captured on 2026-11-06 in batch-03; 151 lines,
11971 bytes. Original and snapshot matched the SHA-256 above. The working tree
was based on Git revision `7426d3bea6679ce03d73f92658bc00f0c3bc6d99`. Extraction used UTF-8 text.
[[raw/2026-11-06/batch-03/js/town-progression.js|Captured source]]; line references below refer to this snapshot.
No prior imported snapshot of this file is superseded. Raw code is evidence;
edit the original project file when implementing changes, then capture a new version.

## Summary

TownProgression normalizes saved Town state and implements prerequisites, spending rules, upgrades, production, storage, and Menagerie credit.

Review scope: Complete TownProgression module, static inspection.

## Findings and evidence

- Lines 5-23 define tier overrides, max levels, defaults, and normalize; saved resources live in townProgress.resources and buildings in townProgress.buildings.
- Lines 25-65 implement cost, requirements, available, can, and apply. A null cost disables an action; apply mutates state and does not itself persist it.
- Lines 67-102 implement productivity, hourly-rate normalization, and strongest-owned storage capacity.
- Lines 105-149 implement production ticks, input-limited conversion, hasConverters, masteryUnlocked, and killCredit.

Evidence: [[raw/2026-11-06/batch-03/js/town-progression.js|js/town-progression.js]], at the symbols and lines listed above.

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

