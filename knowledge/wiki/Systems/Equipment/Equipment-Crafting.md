---
type: concept
created: 2026-11-06
updated: 2026-11-07
status: documented
aliases:
  - Anvil
  - Equipment rerolling
sources:
  - "[[wiki/Sources/Source-Save-Compatibility]]"
  - "[[wiki/Sources/Source-Town-Terminology]]"
  - "[[wiki/Sources/Source-Equipment-Design-Intent]]"
tags:
  - concept
  - equipment
  - crafting
---

# Anvil (equipment rerolling)

## Summary

The owner names the rerolling system **Anvil**. **Crafting**, **Craft**, and
**Crafting system** mean creating items and remain separate terms. The filename
and underlying `crafting` fields preserve earlier implementation vocabulary.
Naming evidence: [[raw/2026-11-06/batch-03/town-terminology.txt|Owner clarification]],
paragraph 1; [[wiki/Foundations/Game-Glossary|Shared glossary]].

The reference captured on 2026-11-06 separates crafted rolls, a saved copy of
weapon rolls, permanent stats, and session-only auto-roll selections.
[[wiki/Sources/Source-Save-Compatibility|Source provenance]].

## Supported facts

### Persistence and roll transactions

`itemCrafts` stores crafted slots per item ID and defaults to `{}` in older
profiles. Rolls survive equips, imports, and saves; unknown item/stat IDs are
retained and item aliases remap them. `itemRollSaves` stores one independent
roll copy per weapon ID. Saving/replacing it costs 10,000 gold; restoration is
free and consumes the copy atomically. Rerolling never overwrites that copy.
Older profiles default to `{}`; full reset clears saved and crafted rolls.

Rerolls replace all configured slots with distinct stat keys and persist the
whole transaction before success. Storage failure restores resources, rolls,
HP, and mana. Capacity changes clamp health/mana without healing.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Crafted equipment|Roll storage and transactions]].

### Presets and active slots

Items define permanent stats, `equipmentType`, positive integer `tier`, and
`crafting` material costs/slot counts. `craftingPresets` supplies per-type/tier
gold cost, possible stats, and inclusive min/max/step. Gold is charged once per
action regardless of slots. Omitted `crafting.pool` inherits the whole matching
preset. Legacy inline ranges/explicit selections retain their values. Old
packages lacking presets gain project defaults in the editor. Presets missing
gold use the median linked item's cost, or 100 per tier if no previous cost
exists; shared gold overrides old per-item gold. Standalone unmatched legacy
items keep their old gold cost until assigned a type and tier.

Changing future ranges preserves earned rolls/permanent stats. Rolled stats can
match permanent ones: additive values add and multipliers multiply; uniqueness
applies between crafted slots only. `crafting.slots` cannot exceed distinct
potential stats. Increasing slots retains rolls and adds empty slots; reducing
slots leaves surplus saved rolls inactive until a reroll replaces the array.
Both editors save/export the same item catalogue.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Crafted equipment|Preset and slot rules]].

### Auto roll

Targets are session-only stat-type selections limited to active crafted slots.
All targets must occur together; permanent stats and numeric roll values do not
satisfy/restrict them. One ordinary paid, persisted reroll runs every 500 ms,
stopping at a match, failure, or insufficient resources. Manual stop, item/page
changes, hiding the game, loading a profile, or resetting cancels it. Auto roll
never changes saved weapon rolls, resumes after reload, or simulates background
missed rolls.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Crafted equipment|Auto-roll behavior]].

## Connections

[[wiki/Design/Equipment-Design-Intent]] records the owner's goal of combining item
discovery with roll improvement, keeping a weapon until better stats or a
build-improving unique effect makes another worthwhile. This describes the
intended role of Anvil investment, not a tested balance outcome. Evidence:
[[raw/2026-11-06/batch-05/equipment-design-intent.txt|Owner direction]], line 1.

[[wiki/Systems/Saves/Save-Compatibility|Save compatibility]] handles aliases and missing items.
[[wiki/Systems/Saves/Development-and-Playtest-Profiles|Developer profiles]] distinguish item
ownership from craft-completion history when granting/deleting equipment.

## Open questions

Current crafting behavior and browser regression coverage were not tested by
this documentation import.
