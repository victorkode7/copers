---
type: source
created: 2026-11-06
updated: 2026-11-07
raw_path: raw/2026-11-06/batch-03/js/town-page.js
original_path: js/town-page.js
sha256: 2b6969fc2f717902a860823fec0b04ca35d4e210df910e9e3c3934ca26522cf5
status: complete
review_scope: "Complete TownPage module, static inspection"
tags:
  - source
  - implementation
---

# Town presentation and transactions

## Provenance

Exact working-file snapshot captured on 2026-11-06 in batch-03; 209 lines,
20710 bytes. Original and snapshot matched the SHA-256 above. The working tree
was based on Git revision `7426d3bea6679ce03d73f92658bc00f0c3bc6d99`. Extraction used UTF-8 text.
[[raw/2026-11-06/batch-03/js/town-page.js|Captured source]]; line references below refer to this snapshot.
No prior imported snapshot of this file is superseded. Raw code is evidence;
edit the original project file when implementing changes, then capture a new version.

## Summary

TownPage builds and updates the Town UI and wraps player purchases/upgrades in save transactions.

Review scope: Complete TownPage module, static inspection.

## Findings and evidence

- Lines 15-30 keep a local selectedWorld and create five zero-based building slots. Browsing Town worlds changes this local selection, not state.selectedMap.
- Lines 31-49 create building cards with level, preview, action, costs, and production bar elements.
- Lines 51-57 implement perform: clone progress, apply the rule, persist createGameSave, and restore gold/progress if saving fails.
- Lines 75-150 format hourly production, prerequisites, costs, and cards. Lines 154-209 render production feedback and handle visibility and Town navigation.

Evidence: [[raw/2026-11-06/batch-03/js/town-page.js|js/town-page.js]], at the symbols and lines listed above.

## Derived concepts

- [[wiki/Foundations/Game-Glossary]]
- [[wiki/Foundations/System-Map]]
- [[wiki/Systems/Town/Town-System]]

## Open questions

Static inspection establishes the captured definitions and control flow. Browser
behavior, performance, and complete regression coverage were not tested here.
The design reasons behind these choices need the owner's input.

