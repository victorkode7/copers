---
type: source
created: 2026-11-06
updated: 2026-11-07
raw_path: raw/2026-11-06/batch-03/town-terminology.txt
original_path: "user chat: Forge, Anvil, and Crafting clarification (2026-11-06)"
sha256: 6bb92da2b229b423a66e592d297c647aa9fc6e8305ca6a54659cd9a65d6ca0b5
status: superseded
superseded_by: "[[wiki/Sources/Source-Town-Terminology-Revision]]"
superseded_scope: "Forge naming preference only; Anvil and Crafting definitions remain valid"
source_kind: owner-design-note
tags:
  - source
  - terminology
---

# Owner's Forge, Anvil, and Crafting clarification

## Provenance

Owner clarification captured from this conversation on 2026-11-06. The UTF-8
file preserves the message text with terminal newlines for storage; its hash
identifies this capture. [[raw/2026-11-06/batch-03/town-terminology.txt|Original clarification]], paragraph 1
(line 1). It resolves the Forge ambiguity in [[wiki/Sources/Source-Town-Design-Intent]].

## Summary

This earlier clarification proposed Forge for the World 2 Ore-to-Bars building.
That preference is superseded by [[wiki/Sources/Source-Town-Terminology-Revision]], which
establishes Smeltery. Anvil remains the preferred name for equipment rerolling;
Crafting / Craft still means item creation. Findings below preserve the earlier
message's claims as history.

## Findings and evidence

- Forge: desired player-facing name for the W2 Ore-to-Bars building.
- Anvil: desired name for rerolling; keep distinct from item creation.
- Crafting / Craft / Crafting system: owner-accepted names for item creation.
- The captured catalogue implements the described Ore-to-Bars function under
  the name Smeltery and ID smeltery; the desired Forge name is absent. The
  mapping uses the owner's functional description. Record current and preferred
  names separately; this task changes documentation, not game display strings or IDs.

Naming evidence: [[raw/2026-11-06/batch-03/town-terminology.txt|Owner clarification]], line 1.
Implementation comparison: [[raw/2026-11-06/batch-03/js/town-content.js|Town catalogue]],
line 24, smeltery definition.

## Derived concepts

- [[wiki/Foundations/Game-Glossary]] defines the shared vocabulary and code-name mapping.
- [[wiki/Design/Town-Design-Intent]] applies the clarification to the earlier note.
- [[wiki/Systems/Town/Town-System]] identifies the existing building.
- [[wiki/Systems/Equipment/Equipment-Crafting|Anvil]] retains the documented rerolling rules.

## Open questions

The Forge preference is historical. Use Smeltery according to
[[wiki/Sources/Source-Town-Terminology-Revision]]. Anvil's UI naming and Town tradeoffs,
costs, and pacing remain separate open implementation/design questions.

