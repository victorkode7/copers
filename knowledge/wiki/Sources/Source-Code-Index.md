---
type: source
created: 2026-11-06
updated: 2026-11-07
raw_path: raw/2026-11-06/batch-03/index.html
original_path: index.html
sha256: 4acc8d9dfd08e11f8a8cc67e01855ca8d1f334365338cbea8cc8c896d83d2f75
status: complete
review_scope: "Navigation, Town containers, effect labels, and runtime script loading"
tags:
  - source
  - implementation
---

# Game entry page

## Provenance

Exact working-file snapshot captured on 2026-11-06 in batch-03; 458 lines,
36902 bytes. Original and snapshot matched the SHA-256 above. The working tree
was based on Git revision `7426d3bea6679ce03d73f92658bc00f0c3bc6d99`. Extraction used UTF-8 text.
[[raw/2026-11-06/batch-03/index.html|Captured source]]; line references below refer to this snapshot.
No prior imported snapshot of this file is superseded. Raw code is evidence;
edit the original project file when implementing changes, then capture a new version.

## Summary

The browser entry page provides the game navigation and loads the runtime's content and behavior modules.

Review scope: Navigation, Town containers, effect labels, and runtime script loading.

## Findings and evidence

- Lines 41-44 label Town, Map, Crafting, Skill Tree, and Inventory; the Crafting button retains the historical ID townButton.
- Lines 120-124 define the Town resource strip, world browser, and building grid.
- Lines 401-405 distinguish optional effect controls and use the label Monster plate shaking.
- Lines 416-456 list runtime scripts, including js/skill-tree.js, Town modules, and game.js. The top-level skill-tree.js is not the script loaded here.

Evidence: [[raw/2026-11-06/batch-03/index.html|index.html]], at the symbols and lines listed above.

## Derived concepts

- [[wiki/Foundations/Game-Overview]]
- [[wiki/Foundations/Game-Glossary]]
- [[wiki/Foundations/System-Map]]
- [[wiki/Systems/Town/Town-System]]

## Open questions

Static inspection establishes the captured definitions and control flow. Browser
behavior, performance, and complete regression coverage were not tested here.
The design reasons behind these choices need the owner's input.

