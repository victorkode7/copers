---
type: source
created: 2026-11-06
updated: 2026-11-08
raw_path: raw/2026-11-06/batch-03/js/skill-tree.js
original_path: js/skill-tree.js
sha256: b7798465385cbaa4061565dc6b685f80086e03cc947e1253b98574fbad67f617
status: complete
review_scope: "Root XP fields and representative node schema, dependencies, stats, and targeting metadata; skills review: representative stat, mana, and ability nodes; runtime connectivity is established by host code"
tags:
  - source
  - implementation
---

# Runtime skill tree definitions

## Provenance

Exact working-file snapshot captured on 2026-11-06 in batch-03; 2891 lines,
86735 bytes. Original and snapshot matched the SHA-256 above. The working tree
was based on Git revision `7426d3bea6679ce03d73f92658bc00f0c3bc6d99`. Extraction used UTF-8 text.
[[raw/2026-11-06/batch-03/js/skill-tree.js|Captured source]]; line references below refer to this snapshot.
No prior imported snapshot of this file is superseded. Raw code is evidence;
edit the original project file when implementing changes, then capture a new version.

## Summary

adventureSkillTree supplies the runtime tree's XP parameters and skill-node definitions.

Review scope: Root XP fields and representative node schema, dependencies, stats, and targeting metadata.

## Findings and evidence

- Lines 1-4 define experienceBase, experiencePerLevel, and nodes.
- Lines 5-41 show node ID/name, display effect text, requirements, position, maxRank, stats, and start flags.
- Lines 42-60 show Shockwave slash with empty stats and abilityTargeting metadata. A node definition alone does not document its complete runtime ability implementation.
- index.html loads js/skill-tree.js. Other similarly named project copies were outside this capture's review.

Evidence: [[raw/2026-11-06/batch-03/js/skill-tree.js|js/skill-tree.js]], at the symbols and lines listed above.

## Skills review extension: 2026-11-08

Both the raw snapshot and live original matched the registered SHA-256.
Representative nodes distinguish flat stats, multipliers, and abilities with empty stats: Mighty Blows/Shockwave Slash (22-60), Mana Reserve (1930-1950), Arcane Power/Spell Amplification/Void Bolt (1952-2014). The stored requires and requiresMode fields do not alone establish runtime purchase semantics; game.js constructs bidirectional connections and checks connectivity.

Evidence: [[raw/2026-11-06/batch-03/js/skill-tree.js|Captured source]], symbols and lines above.
This extends static coverage; no gameplay or browser test result is implied.

## Derived concepts

- [[wiki/Systems/Combat/Skills-and-Abilities|Skills and abilities]].

- [[wiki/Foundations/Game-Glossary]]
- [[wiki/Foundations/System-Map]]
- [[wiki/Foundations/Game-Overview]]

## Open questions

Static inspection establishes the captured definitions and control flow. Browser
behavior, performance, and complete regression coverage were not tested here.
The design reasons behind these choices need the owner's input.

