---
type: concept
created: 2026-11-06
updated: 2026-11-07
status: documented
sources:
  - "[[wiki/Sources/Source-Save-Compatibility]]"
tags:
  - concept
  - save-compatibility
  - recovery
---

# Save compatibility

## Summary

The reference captured on 2026-11-06 describes schema migration, content
reconciliation, and recovery while retaining unrelated player progress.
[[wiki/Sources/Source-Save-Compatibility|Source provenance]].

## Supported facts

### Schema and content identity

The save schema is 4. The shared, side-effect-free `parseGameSave` in
`js/game.js` upgrades schemas 1-3, runs `SaveCompatibility.migrate`, then
validates. New combat fields default safely; new skill/item stats use current
definitions. Unknown unrelated top-level fields and material/kill counters survive.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Save compatibility|Schema evidence]].

Content changes use numbered, cumulative, idempotent `contentMigrations` in
`js/save-compat.js`. Keep IDs stable; explicit removals need an ID and reason,
removal from the catalogue, and no reuse for unrelated content. Tree exports
retain `nodeIdAliases` and `removedNodes`, including undo history. Removed skills,
excess ranks, and disconnected allocated branches refund their points.
Missing equipment retains ownership, crafting history, and slots in
`preservedContent`; explicit retirement removes it permanently. An already
occupied slot takes priority when archived equipment returns. Aliases merge
material quantities/map kills and remap item ownership/equipped slots. Migration
2 maps Thunderstorm/Thunderbolt/`skillNode4` to Void Bolt and Saltwater Bolt to
Void Volley, removes Wet, and defaults Void Charges to zero. Travelling Void
Volley missiles preserve damage, destination, and travel time; invalid records
reject loading and map changes clear them.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Content edits|Migration rules and examples]].

### View state and preferences

- Historical `currentView: town` still means Crafting.
- Old `settlement` loads Map with combat paused, replaces a Town encounter with
  the selected-map encounter, clears temporary attacks/buffs, and removes the
  retired field while preserving ordinary progress.
- Fresh Town uses `currentView: townPage` and optional `townProgress` version 1.

[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Retired Town prototype|Retired prototype]],
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Town page|Fresh Town state]].

Device navigation visibility lives in `idleAdventureCombatSettings` and survives
imports/resets. Profile preference `mapListLocked` defaults to false; malformed
values are rejected.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Device preferences|Device settings]],
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Content edits|Map preference]].

### Backups and failed loads

Before migration, the exact original text is backed up under the normal slot's
`idleAdventureSave:backup:*` prefix. Imports also back up the original file,
stored profile, and current live progress. Identical originals are deduplicated;
different originals are never overwritten. Failed loads/backups pause combat
and saving, retain the primary save, and open recovery. Starting over requires
explicit reset and a successful backup. Failed imports retain or roll back the
previous running/stored profile. Backups remain browser-local until exported.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Recovery|Recovery evidence]].

## Connections

[[wiki/Systems/Saves/Development-and-Playtest-Profiles|Development profiles]] use a separate
slot and backup prefix. [[wiki/Systems/Progression/World-Progression-and-Mastery|Progression]],
[[wiki/Systems/Town/Town-Progression|Town]], and [[wiki/Systems/Equipment/Equipment-Crafting|crafting]] specify
the state this compatibility layer preserves.

## Open questions

Current implementation and the source-listed regression suites have not been
verified by this import. Consult the raw reference for omitted edge cases.
