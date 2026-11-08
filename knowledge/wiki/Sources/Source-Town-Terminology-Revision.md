---
type: source
created: 2026-11-06
updated: 2026-11-07
raw_path: raw/2026-11-06/batch-04/town-smeltery-naming.txt
original_path: "user chat: Smeltery naming revision (2026-11-06)"
sha256: 2a54bc46abb48fdab43eae0ac1fd73ee945906c38a25cbd9c92d257d106ea433
status: complete
source_kind: owner-design-note
supersedes: "[[wiki/Sources/Source-Town-Terminology]]"
supersedes_scope: "Forge naming preference only; Anvil and Crafting definitions are retained"
tags:
  - source
  - terminology
---

# Smeltery naming revision

## Provenance

Owner request captured from this conversation on 2026-11-06 as UTF-8 text with a
terminal newline. [[raw/2026-11-06/batch-04/town-smeltery-naming.txt|Original request]],
line 1. The hash above identifies the capture. It revises the earlier
[[wiki/Sources/Source-Town-Terminology|Forge naming preference]]; the original evidence
is preserved.

## Summary

Use **Smeltery** for the World 2 Town building that converts Ore into Bars.
Forge is a withdrawn proposed name for that building. Anvil still means
equipment rerolling, and Crafting / Craft still means item creation.

## Findings and evidence

- The owner explicitly changes the building's preferred name from Forge to Smeltery.
- The owner's stated reason is that Smeltery better fits the function and word meaning.
  This records their rationale, not an independent dictionary verification.
- Anvil and Crafting definitions are retained from the earlier clarification.
- The captured implementation already uses the display name Smeltery and ID
  smeltery; this naming decision agrees with that existing definition.

Evidence: [[raw/2026-11-06/batch-04/town-smeltery-naming.txt|Naming revision]], line 1;
[[raw/2026-11-06/batch-03/town-terminology.txt|Earlier Anvil/Crafting definitions]],
line 1; [[raw/2026-11-06/batch-03/js/town-content.js|Building definition]], line 24.

## Derived concepts

- [[wiki/Foundations/Game-Glossary]] records the current shared vocabulary.
- [[wiki/Systems/Town/Town-System]], [[wiki/Systems/Town/Town-Progression]], and
  [[wiki/Systems/Town/Town-Production-and-Storage]] use Smeltery.
- [[wiki/Design/Town-Design-Intent]] retains the design direction with updated terminology.

## Open questions

None for this naming decision. Town mechanics and pacing remain open in
[[wiki/Design/Town-Design-Intent]]; Anvil's desired UI naming is a separate implementation question.

