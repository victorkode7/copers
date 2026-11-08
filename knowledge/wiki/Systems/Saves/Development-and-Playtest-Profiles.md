---
type: concept
created: 2026-11-06
updated: 2026-11-07
status: documented
sources:
  - "[[wiki/Sources/Source-Save-Compatibility]]"
tags:
  - concept
  - development
  - playtest
---

# Development and playtest profiles

## Summary

The reference captured on 2026-11-06 separates developer capabilities, save slots,
and packaged playtests to avoid mixing development and balance-test progress.
[[wiki/Sources/Source-Save-Compatibility|Source provenance]].

## Supported facts

### Module and profile boundary

Optional `dev/developer-tools.js` owns developer UI, travel bypasses, admin gear,
free spending, equipment grants/deletion, and temporary Town reset. Core scripts
call guarded hooks; a saved boolean is insufficient to enable developer powers.

| Module | Save slot | Backup prefix |
| --- | --- | --- |
| Present | `idleAdventureSave:development` | `idleAdventureSave:development:backup:` |
| Absent | `idleAdventureSave` | `idleAdventureSave:backup:` |

Normal profiles are not automatically copied/overwritten. An explicit panel
action copies the playtest profile while backing up the development slot and
preserving the source. New profiles carry `profileEnvironment`; playtest builds
reject development profiles. Legacy profiles remain supported; absent the
module, developer flags are disabled and admin gear unequipped. Environment
markers are editable local data, not an anti-cheat mechanism.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Development and playtest profiles|Module and save-slot evidence]].

### Developer actions

Free spending bypasses affordability/deductions without inflating balances;
production, loot, XP, and prerequisites keep normal calculations. Equipment
deletion removes ownership/equips but retains completion history and rolls.
Missing equipment can be crafted again without another completion entry or
first-craft reward. Grants do not add craft history/progression rewards. Grants,
deletions, and developer preference changes roll back on failed saves.
The temporary Reset Town control restores Town production/discovery defaults
while preserving adventure progress and gold, with immediate-save rollback.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Development and playtest profiles|Developer actions]],
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Town page|Temporary Town reset]].

### Playtest packaging

The reference names `scripts/build-playtest.ps1` as the builder for a new folder
and ZIP under `playtest/`. The package excludes the developer module, editor
pages, and unused editor scripts, removes their HTML references, and regenerates
the included runtime's offline manifest. Hiding controls or deleting an already
cached module is insufficient. Package verification checks developer paths are
absent. The source lists `tests/developer-tools-smoke.js` and
`tests/playtest-build-smoke.js` as coverage. No build or suite ran during import.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Development and playtest profiles|Distribution and validation]].

## Connections

[[wiki/Systems/Saves/Save-Compatibility|Save compatibility]] explains backup/recovery behavior.
[[wiki/Systems/Equipment/Equipment-Crafting|Equipment crafting]] covers rolls retained after item
deletion. [[wiki/Systems/Town/Town-Progression|Town progression]] defines the state affected
by temporary Reset Town.

## Open questions

This import did not inspect packaged artifacts, cached runtime files, or current
module boundaries. The reference's build commands remain documentation only.
