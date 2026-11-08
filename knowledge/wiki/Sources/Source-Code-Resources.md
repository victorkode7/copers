---
type: source
created: 2026-11-06
updated: 2026-11-07
raw_path: raw/2026-11-06/batch-03/js/resources.js
original_path: js/resources.js
sha256: 5e8166f48e8c3a6e6377a0b1a2770ae6c3c757f986e854cc448a7344641ca522
status: complete
review_scope: "Complete GameResources module, static inspection"
tags:
  - source
  - implementation
---

# Shared resource spending

## Provenance

Exact working-file snapshot captured on 2026-11-06 in batch-03; 23 lines,
1199 bytes. Original and snapshot matched the SHA-256 above. The working tree
was based on Git revision `7426d3bea6679ce03d73f92658bc00f0c3bc6d99`. Extraction used UTF-8 text.
[[raw/2026-11-06/batch-03/js/resources.js|Captured source]]; line references below refer to this snapshot.
No prior imported snapshot of this file is superseded. Raw code is evidence;
edit the original project file when implementing changes, then capture a new version.

## Summary

GameResources checks and spends cost maps using a supplied material balance, with adventure materials as the default.

Review scope: Complete GameResources module, static inspection.

## Findings and evidence

- Lines 5-15 define canSpend and spend. gold always routes to profile.gold; other IDs route to the supplied balances object, defaulting to profile.materials.
- Lines 17-21 define payment using a cloned adventure-material balance.
- The optional developer module supplies any spending bypass; ordinary saved flags alone do not grant it.

Evidence: [[raw/2026-11-06/batch-03/js/resources.js|js/resources.js]], at the symbols and lines listed above.

## Derived concepts

- [[wiki/Foundations/Game-Glossary]]
- [[wiki/Foundations/System-Map]]
- [[wiki/Systems/Town/Town-System]]

## Open questions

Static inspection establishes the captured definitions and control flow. Browser
behavior, performance, and complete regression coverage were not tested here.
The design reasons behind these choices need the owner's input.

