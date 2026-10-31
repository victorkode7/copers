# Save compatibility

The save schema is version 4. `parseGameSave` in `js/game.js` is the shared,
side-effect-free entry point for browser saves and profile imports. It upgrades
schemas 1–3, then runs `SaveCompatibility.migrate` before validating the result.
New combat fields default safely; new stats on skills and items use the current
content definitions. Unknown unrelated top-level fields and material/kill counters
survive subsequent saves.

## Crafted equipment

Optional `itemCrafts` stores a variable number of crafted slots per item ID. Old profiles default
to an empty object. Rolls stay with owned items across equips, imports and saves;
unknown item IDs and unsupported stat keys are retained for returning content.
Item aliases also remap these IDs. Item definitions hold permanent stats, an
`equipmentType`, a positive integer `tier`, and per-item `crafting` material costs
and slot counts. Root `equipmentTypes` names the groups; `craftingPresets` supplies
the gold per reroll (`gold`), possible stats, inclusive min/max and step for each
type/tier pair. Gold is charged once per action, regardless of slot count. An omitted
`crafting.pool` inherits the entire matching preset automatically. Legacy inline
range arrays and explicit stat selections still resolve without losing custom
values; the item editor offers an explicit switch to tier rolls. Old packages
without preset tables gain the project's defaults when opened in the editor.
Older preset tables missing gold promote the median linked item's gold cost,
or default to 1,000 per tier when no previous cost exists. Shared gold takes
precedence over old per-item gold fields. Standalone legacy items without a
matching preset retain their old gold cost until assigned a type and tier.
Changing future roll ranges does not invalidate previously earned rolls or
change permanent stats. Default weapon presets also include flat damage and
attack speed; defensive presets include flat health and evasion. Rolled stats may
match permanent stats: additive stats add and multipliers multiply. Uniqueness
applies only between crafted slots, not between crafted and permanent stats.
Both editor pages save/export one item catalogue.

`crafting.slots` is a positive integer per item and cannot exceed the number of
distinct potential stats. Increasing the count displays extra empty slots while
retaining existing rolls. Reducing it makes surplus saved slots inactive without
deleting them. A subsequent reroll replaces the saved array with the new count.

Rerolls replace all configured slots, draw distinct stat keys, and persist the complete
transaction before reporting success. Failed storage writes restore currency,
materials, rolls, health and mana. Capacity changes clamp current health/mana
without healing the character. A full game reset clears crafted slots.

## Content edits

Keep content IDs stable. For intentional changes, append a numbered entry to
`contentMigrations` in `js/save-compat.js`. Each entry has a description and may
include `skills`, `items`, `materials`, `maps`, and `worlds`:

```js
{
    version: 2,
    description: 'Explain the release change here.',
    items: {aliases: {oldSword: 'newSword'}, removed: []},
    maps: {aliases: {}, removed: [{id: 'retiredMap', reason: 'Explain why.'}]}
}
```

This is an example, not an active retirement. Every removal must have an ID and
reason. Remove that ID from its catalogue too and never reuse it for unrelated
content. Rules are cumulative and idempotent: the stored content version protects
against opening profiles from future releases, while reconciliation also runs
when the editor changes a tree without a release version bump.

- Known historical skill IDs map to their replacements. The tree editor exports
  future renames as `nodeIdAliases` and documented deletions as `removedNodes`,
  including in drafts, JSON imports/exports and game packages. Undo restores this
  history too. Keep it with the published tree.
- Removed skills, excess ranks and allocated branches disconnected from the
  center refund their spent points. Other allocations remain. Renamed abilities
  retain their runtime identity and targeting tags through the alias history.
- Missing equipment is retained in `preservedContent`, including ownership,
  crafting history and equipped slots, and restored when its definition returns.
  Only an explicit retirement deletes it permanently. An occupied equipment slot
  takes priority when archived equipment returns.
- Item aliases update ownership and equipped slots. Material and map aliases
  merge quantities and kill counters. Explicit material/map/world retirements
  remove only the specified content. An unavailable destination falls back to an
  unlocked map and resets its encounter, leaving character progression intact.
- Earned map/world unlocks are stored independently of current kill requirements.
  Older profiles infer unlocks from kills and non-developer visited destinations.
- Content migration 2 replaces Thunderstorm (including historical Thunderbolt
  and `skillNode4` IDs) with Void Bolt, and Saltwater Bolt with Void Volley.
  Allocations, connections and spent points move to the replacements. The retired
  Wet debuff is explicitly removed from saved monsters. Void Charges default to
  zero and persist in subsequent saves; unrelated progression is retained.
- Travelling Void Volley missiles retain their snapshotted damage, destination
  and remaining travel time across saves/imports and offline progress. Older
  profiles default to an empty missile queue. Invalid missile records reject
  loading through the existing recovery flow; changing maps clears the queue.

## Recovery

Before applying a migration, the exact original text is stored under
`idleAdventureSave:backup:*` in browser storage. Imports also back up the original
file, previous stored profile and current live progress. Identical backups are
deduplicated; different originals are never overwritten. The **Backups** button
downloads these profiles for import or external storage.

A failed load or backup pauses combat and saving and opens a recovery dialog.
The original primary save stays intact. Download it, retry, or import a working
profile. Starting over requires an explicit reset and a successful backup first.
Failed imports retain or roll back the prior running profile and stored save.
Backups are local to the browser; exporting them provides an external copy.

Regression coverage: `tests/save-compat-smoke.js`, `tests/game-profiles-smoke.js`,
`tests/equipment-smoke.js`, `tests/skill-node-cleanup-smoke.js` and
`tests/skill-editor-selection-smoke.js`. The compatibility test includes a real
reload of an unsupported save to guard against startup overwriting it.
