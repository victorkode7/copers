---
type: source
created: 2026-11-06
updated: 2026-11-08
raw_path: raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md
original_path: SAVE_COMPATIBILITY.md
sha256: 3eadde1814b2b38b6ff6bd52a315d567821789f9b736ab77bf71cf91ebb1e659
status: superseded
tags:
  - source
  - save-compatibility
---

# Save compatibility source

## Provenance

Captured from the project's `SAVE_COMPATIBILITY.md` on 2026-11-06 in batch-02.
The original and snapshot matched the SHA-256 above at staging and import.
Extraction used the existing UTF-8 Markdown without OCR or conversion. The
document gives no explicit publication date or document version; save schema 4
is a described data schema, not a document version. No earlier source is superseded.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md|Open the preserved source]].

## Version status

Superseded for current reference wording by
[[wiki/Sources/Source-Save-Compatibility-2026-11-08|the 2026-11-08 document]]. That version removes the stated
Saw Mill-to-Outpost prestige and Smeltery-to-Mine upgrade gates. Other reference
content is unchanged; the findings below remain attributed to this earlier capture.

## Summary

This project reference documents save migration and recovery together with the
progression, Town, mastery, crafting, and developer-profile state that saves must
preserve. The derived notes describe this captured reference as of 2026-11-06.
They do not establish that the current implementation matches it.

## Findings and evidence

- **Migration and recovery:** schema 4 upgrades older schemas through a shared
  parser; stable content IDs, explicit aliases/removals, and preservation of
  missing equipment protect saved progress. Original profiles are backed up
  before migration; failures pause loading/saving and expose recovery choices.
  [[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Save compatibility|Schema]],
  [[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Content edits|Content migrations]],
  [[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Recovery|Recovery]].
- **Progression:** boss victories raise the character skill-point cap; map
  mastery has separate thresholds and persisted selections. Menagerie kill
  credit excludes bosses and does not multiply XP, gold, or drops.
  [[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#World progression and skill point caps|Character progression]],
  [[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Monster mastery|Map mastery]],
  [[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Content edits|Menagerie]].
- **Town:** the retired settlement prototype is distinct from the fresh
  `townPage`. The reference specifies building unlocks, costs, tier scaling,
  production recipes, capped storage, and offline behavior.
  [[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Retired Town prototype|Retired state]],
  [[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Town page|Town]],
  [[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Town storage|Storage]].
- **Equipment:** crafted rolls, saved weapon rolls, preset inheritance, and
  session-only auto roll have different persistence rules.
  [[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Crafted equipment|Crafting]].
- **Environment and preferences:** the optional developer module selects a
  separate save slot; packaged playtests omit developer/editor code. Device
  navigation preferences survive profile imports and game resets.
  [[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Development and playtest profiles|Profiles and packaging]],
  [[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Device preferences|Device preferences]].

## Derived concepts

- [[wiki/Systems/Saves/Save-Compatibility|Save compatibility]]: schema, content migration, and recovery.
- [[wiki/Systems/Progression/World-Progression-and-Mastery|World progression and mastery]]: caps, XP, and kill credit.
- [[wiki/Systems/Town/Town-Progression|Town progression]]: buildings, purchases, upgrades, and prestige.
- [[wiki/Systems/Town/Town-Production-and-Storage|Town production and storage]]: rates, recipes, capacity, and offline rules.
- [[wiki/Systems/Equipment/Equipment-Crafting|Anvil (equipment rerolling)]]: roll persistence, presets, and auto roll; the current library name follows the owner's later clarification.
- [[wiki/Systems/Saves/Development-and-Playtest-Profiles|Development and playtest profiles]]: module boundaries, save slots, and distribution.

## Open questions

The document's publication date and release identity are unspecified. Current
code and the regression suites listed in the reference were not checked by
this documentation import; their commands and filenames are source claims.
