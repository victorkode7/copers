---
type: log
created: 2026-11-06
updated: 2026-11-08
tags:
  - maintenance
---

# Library changelog

## 2026-11-06 - Initial library

- Captured `docs/scythe-reap.md` as an immutable raw snapshot and registered its
  SHA-256 in [[wiki/Maintenance/Sources|the source inventory]].
- Created [[wiki/Sources/Source-Scythe-Reap|the source summary]],
  [[wiki/Systems/Combat/Reap-Combat|Reap combat]], and [[wiki/Systems/Combat/Reap-Rendering|Reap rendering]].
- Added [[wiki/Home|navigation]], maintenance rules, two templates, and import,
  retrieval, and refresh prompts.
- Extraction blockers: none for this one-file batch. Current code behavior and
  the source's browser suites were outside this documentation import.

## 2026-11-06 - Setup review

- Checked the preserved snapshot's SHA-256 against the inventory and source
  note, wiki metadata, internal link targets and headings, and Obsidian JSON.
- Escaped link aliases inside the Home and Sources tables for Obsidian.
- Recorded that the original `docs/scythe-reap.md` is missing from this checkout.
  The preserved source is readable and its registered hash matches; checking
  the current original and refreshing it remain unavailable until it is restored.
- Preserved existing raw bytes, templates, processing rules, and Obsidian settings.

## 2026-11-06 - Step 4 source staging (batch-02)

- Copied the project's `SAVE_COMPATIBILITY.md` without modification to
  `raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md`.
- Verified the copy against the original with SHA-256 and registered it as
  pending in [[wiki/Maintenance/Sources|the source inventory]]. Added the staged batch to
  [[wiki/Home|Home]].
- Preserved the working document and the previously registered Reap snapshot.
- Captured 1 new source; 1 existing source unchanged; 0 duplicates; 0 blocked.
  No source summaries or concept notes were generated in this staging step.
  Step 5 will process the pending document and validate its derived notes.

## 2026-11-06 - Step 5 import (batch-02)

- Processed `raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md` into
  [[wiki/Sources/Source-Save-Compatibility|a source summary]] with provenance and
  citations to the captured document's headings.
- Created [[wiki/Systems/Saves/Save-Compatibility|Save compatibility]],
  [[wiki/Systems/Progression/World-Progression-and-Mastery|World progression and mastery]],
  [[wiki/Systems/Town/Town-Progression|Town progression]],
  [[wiki/Systems/Town/Town-Production-and-Storage|Town production and storage]],
  [[wiki/Systems/Equipment/Equipment-Crafting|Equipment crafting]], and
  [[wiki/Systems/Saves/Development-and-Playtest-Profiles|Development and playtest profiles]].
  Connected the notes through their sources and relevant topics.
- Updated [[wiki/Home|navigation]] and [[wiki/Maintenance/Sources|the source inventory]].
  Verified source hashes, required metadata, internal targets, citation headings,
  and table columns before marking the import complete.
- Processed 1 source; skipped 1 unchanged source; 0 duplicates; 0 blocked.
  No pending sources remain. Preserved both raw snapshots and the working
  original. Existing Reap concepts were reused without regeneration.
- Extraction blockers and unresolved source conflicts: none. The document's
  publication/release identity is unspecified; current code and source-listed
  regression suites were not verified by this documentation import.

## 2026-11-06 - Shared game definitions and Town baseline (batch-03)

- Captured ten exact working-code snapshots for entry/UI labels, content
  catalogues, Town definitions/rules/presentation, spending, game wiring, and
  simulation ordering. Registered a scoped source note and SHA-256 for each.
- Preserved two owner replies as raw text: the Town design direction and the
  Forge/Anvil/Crafting clarification. Linked both through source notes.
- Created [[wiki/Foundations/Game-Overview]], [[wiki/Foundations/Game-Glossary]], [[wiki/Foundations/System-Map]],
  [[wiki/Systems/Town/Town-System]], and [[wiki/Design/Town-Design-Intent]]. Added these foundations
  to [[wiki/Home]] and connected existing Town topic notes to code evidence.
- Recorded Town as optional adventure support with meaningful investment
  tradeoffs. Kept candidate mechanisms and undetermined pacing separate from
  current implementation.
- Established Forge as the desired W2 Ore-to-Bars building name (current
  Smeltery, ID smeltery), Anvil as equipment rerolling, and Crafting/Craft as
  item creation. Added Anvil aliases to the existing rerolling note while
  preserving its filename and links.
- Clarified null action costs, distinct Town/adventure Ore balances, historical
  Crafting/town identifiers, and the difference between rule mutation and the
  UI's save/rollback transaction.
- Processed 12 new sources; skipped 2 unchanged; 0 duplicates; 0 blocked.
  Created 12 source notes and 5 foundation/design concepts. Updated navigation,
  inventory, the two existing Town notes, and affected terminology references.
- Verified snapshot hashes, matching code originals, required metadata,
  source registration, internal file/heading targets, and table structure.
  No game code or UI names were changed; browser/gameplay suites were not run.
- Remaining decisions: Town-exclusive unlocks compatible with optional play,
  concrete investment choices, costs/pacing, and when to implement the desired
  display names. Current code is evidence of implementation, not proof that
  the intended optional balance has been achieved.

## 2026-11-06 - Smeltery naming revision (batch-04)

- Preserved the owner's new request in `raw/2026-11-06/batch-04/town-smeltery-naming.txt`
  and registered [[wiki/Sources/Source-Town-Terminology-Revision|its source note]].
- Updated the glossary, overview, system map, Town guide, design brief, and
  Town economy notes to use Smeltery for W2 Ore-to-Bars production, matching
  the existing display name and ID `smeltery`.
- Superseded the earlier Forge preference while preserving its original raw
  note, source history, and unchanged Anvil/Crafting definitions. Historical
  changelog entries retain the terminology used when those decisions were made.
- Processed 1 new source; 14 existing snapshots unchanged; 0 duplicates;
  0 extraction blockers. Validated hashes, metadata, links, and table structure.
  No gameplay or UI implementation change is needed for the Smeltery name.

## 2026-11-06 - Equipment progression direction (batch-05)

- Preserved the owner's reply as `raw/2026-11-06/batch-05/equipment-design-intent.txt`
  and added [[wiki/Sources/Source-Equipment-Design-Intent|its source note]].
- Created [[wiki/Design/Equipment-Design-Intent]]: discovery and roll improvement both
  matter; players keep a weapon until better stats or a build-improving unique
  effect makes another worthwhile. Labeled further implications as interpretations.
- Connected the design direction to Home, the game overview, and Anvil.
  Weapon lifespan, effects, costs, drop rates, and the role of Crafting remain open.
- Processed 1 new source; 15 earlier snapshots unchanged; 0 duplicates;
  0 blockers. Validated hashes, metadata, and internal links. This records intent;
  no equipment balance or behavior was changed or tested.

## 2026-11-06 - Weapon upgrades across worlds (batch-06)

- Preserved the owner reply in `raw/2026-11-06/batch-06/weapon-world-progression.txt`
  and created [[wiki/Sources/Source-Weapon-World-Progression|its source summary]].
- Updated [[wiki/Design/Equipment-Design-Intent#World transitions|the equipment direction]]:
  new-world weapons should usually feel like direct upgrades. A unique ability
  plus near-perfect rolls may let an older weapon compete with early next-world drops.
- Kept this additive to the earlier direction; recorded conditional language
  and left numerical roll/performance thresholds open. Updated Home and source navigation.
- Processed 1 new source; 16 prior snapshots unchanged; 0 duplicates; 0 blockers.
  Checked hashes, metadata, file/heading links, and table structure. No item
  stats, drop rates, or gameplay behavior were changed or tested.

## 2026-11-06 - First unique-item review (batch-07)

- Preserved the owner's Geobreaker feedback and Purple Flame question, plus
  exact snapshots of item-system.js, combat-abilities.js, and combat-health.js.
  Registered four source notes; reused the unchanged items/game/world snapshots.
- Created [[wiki/Systems/Equipment/Unique-Item-Effects]], linked it from Home, and clarified
  ability versus unique item effect in the glossary and implementation map.
- Verified Geobreaker's proc rules, Resonant Guard shield synergy, and 1% base
  W1-boss drop. Recorded the owner's short-useful-window concern in
  [[wiki/Design/Equipment-Design-Intent]] without treating W2 viability as measured.
- Verified Purple Flame's Black Sun modifier: Fire of the Righteous healing
  cap 30% to 1% of maximum HP, burn multiplier 1 to 2, self-drain unchanged at
  10% of maximum HP/second. The modifier requires that skill and does not
  directly reduce maximum HP or double all damage.
- Processed 4 new sources; 17 existing snapshots unchanged; 0 duplicates;
  0 blockers. Validated hashes, metadata, source registration, internal links,
  and table structure. No gameplay code changed; browser suites and build
  comparisons were not run. Geobreaker performance/timing remains an open question.

## 2026-11-07 - Crafting role and materials (batch-01)

- Preserved the earlier unfinished Crafting statement and the subsequent
  material/pity clarification as two distinct raw owner notes.
- Created [[wiki/Design/Crafting-Design-Intent]] and two cited source summaries;
  connected them to Home and the equipment direction.
- Recorded early item creation, no current pity-system plan, reluctance to
  expand ordinary monster materials beyond W2, and possible exclusive recipes
  or boss/special-area materials. Kept preferences and possibilities distinct.
- Left ordinary Crafting after W2 open; did not infer a continuation of the
  unfinished sentence or a policy for Town resources.
- Processed 2 new sources; 21 prior snapshots unchanged; 0 duplicates; 0 blockers.
  Checked hashes, metadata, links, and table structure. No recipe or gameplay
  implementation was changed or tested.

## 2026-11-07 - Tentative later recipe idea (batch-02)

- Preserved the owner's reply and added [[wiki/Sources/Source-Crafting-Later-Recipes]].
- Updated [[wiki/Design/Crafting-Design-Intent]] with the possibility of large costs
  using established materials. Kept 100k fangs as an illustrative quantity,
  not an approved recipe, target, or commitment. Later Crafting remains undecided.
- Updated Home and inventory. Processed 1 new source; 23 earlier snapshots
  unchanged; 0 duplicates; 0 blockers. Validated metadata, hashes, and links.
  No recipe or gameplay behavior was changed.

## 2026-11-07 - Categorized wiki

- Moved 42 notes into Foundations, Systems, Design, Sources, and Maintenance;
  kept Home at the root and preserved filenames and evidence.
- Added ten category/system indexes and made Home a category entry page.
  Updated internal links, source-property wikilinks, prompts, template examples,
  setup guidance, and Obsidian recent-file paths.
- Documented category placement and task retrieval through the relevant index.
  The default graph shows concepts; sources and navigation remain accessible
  through folders, links, and an unfiltered graph.
- Imported 0 sources; preserved 24 raw snapshots unchanged; 0 duplicates;
  0 blockers. Source status remains 23 complete and 1 superseded.
- Validated moved paths, metadata, file/heading links, local Markdown links,
  source registration/hashes, and Obsidian JSON. No gameplay files changed.

## 2026-11-08 - Removed category navigation pages

- Removed the ten per-folder Index.md pages at the owner's request; retained
  the category folders and all substantive concept/source notes.
- Simplified Home to direct note links and folder descriptions. Updated the
  setup guide, maintenance rules, and prompts to browse/search folders directly
  and avoid recreating category landing pages unless explicitly requested.
- Removed links to deleted pages and cleaned their saved Obsidian navigation
  references. Historical entries above retain the record of their creation.
- Imported 0 sources; 24 raw snapshots unchanged; 0 duplicates; 0 blockers.
  Checked remaining links, metadata, source hashes, and Obsidian JSON.
  Gameplay files and substantive source evidence were preserved.

## 2026-11-08 - How attacks work

- Added [[wiki/Systems/Combat/How-Attacks-Work|How attacks work]]: timing, target
  selection, multi-hit, accuracy, damage arithmetic, hit/attack triggers, enemy
  attacks, death rewards, respawn, and a worked numerical example.
- Expanded five existing code-source summaries and connected Home and the
  system map. Preserved the folder organization without adding category indexes.
- Reviewed 5 unchanged code sources; imported 0 new sources; 0 duplicates;
  0 blockers. All 24 raw snapshots remain registered and unchanged.
- Static inspection only; no gameplay code changed or browser tests run.
  The reason for ability checks after a basic miss remains an open design
  question. Detailed individual skill rules and balance remain outside scope.

## 2026-11-08 - Skills and abilities

- Added [[wiki/Systems/Combat/Skills-and-Abilities|Skills and abilities]] with
  working vocabulary, node fields, paths, pending/committed ranks, point refunds,
  stat aggregation, representative activation gates, and unique-item modifiers.
- Updated Home, glossary, system map, source summaries, and source inventory.
- Reused 4 unchanged code sources; imported 0; 0 duplicates; 0 blockers.
  Raw snapshots and gameplay code remain unchanged. Static review only.
- Owner direction on specialization versus broader ability builds remains open;
  no new design preference has been inferred from the implementation.

## 2026-11-08 - Owner's build direction (batch-01)

- Preserved the owner reply verbatim in a new immutable snapshot; added
  [[wiki/Sources/Source-Build-Design-Intent|its source note]] and
  [[wiki/Design/Build-Design-Intent|Build design intent]].
- Updated Home, [[wiki/Systems/Combat/Skills-and-Abilities|Skills and abilities]],
  [[wiki/Design/Equipment-Design-Intent|Equipment design intent]], and the source
  inventory. Ability count is no longer treated as an unanswered design goal.
- Kept the Piercing Arrow/Gathering Power observation separate from measured
  balance, preserved the possible spell-only exception, and marked specialized
  stats as tentative. No gameplay changes were requested or made.
- Processed 1 new source; 24 existing snapshots unchanged; 0 duplicates;
  0 blockers. Excessive-power limits, specialization tradeoffs, and comparative
  build performance remain open.

## 2026-11-08 - Content-dependent balance boundaries (batch-02)

- Preserved the owner's clarification verbatim and added
  [[wiki/Sources/Source-Build-Balance-Boundaries|its source summary]].
- Extended [[wiki/Design/Build-Design-Intent|Build design intent]], the skills
  note, earlier source summary, Home, and inventory. Recorded that task-specific
  strength can be acceptable, and intended hard content should reward planning;
  being good elsewhere does not mean being best everywhere.
- Kept investigation distinct from an automatic nerf or mandatory build swap.
  Dungeons and potions are examples, not committed feature specifications.
- Processed 1 new source; 25 existing snapshots unchanged; 0 duplicates;
  0 blockers. No gameplay edits or balance tests. Content-specific challenge
  goals and numerical thresholds remain open.

## 2026-11-08 - Clarify spell-only build wording

- Clarified that spell-only builds may gain little from Piercing Arrow plus
  Gathering Power. The earlier exception wording could sound like permission;
  the intended meaning concerns whether those builds benefit.
- Updated build and equipment design notes, the skills note, source summary,
  and inventory. Reused 1 existing source; 26 raw snapshots unchanged;
  0 new sources, duplicates, or blockers. No gameplay changes.

## 2026-11-08 - World progression direction (batch-03)

- Preserved the owner reply verbatim; added
  [[wiki/Sources/Source-World-Progression-Design-Intent|its source summary]] and
  [[wiki/Design/World-Progression-Design-Intent|World progression design intent]].
- Recorded stronger enemies as the current default until the owner changes it.
  Enemy variety, weaknesses, and other strategic mechanics remain tentative;
  their form need not require skill-tree or equipment changes.
- Updated Home, the progression note, and inventory. Processed 1 new source;
  26 existing snapshots unchanged; 0 duplicates; 0 blockers. No gameplay edits
  or runtime/balance tests. Numerical tuning and future strategic mechanics
  remain open.

## 2026-11-08 - Independent Town upgrades (batch-04)

- Recorded [[wiki/Sources/Source-Town-Upgrade-Independence|the owner's rule]] in Town design intent:
  level upgrades and prestige do not require another non-Town-Hall building's
  level/prestige. Materials and Town Hall gates remain valid constraints.
- Removed Smeltery's Mine upgrade requirement and Saw Mill's Lumber Outpost
  prestige requirement. Retained prices, production, purchase ownership gates,
  Town Hall gates, own-building caps, and available prestige tiers.
- Updated browser regressions; Smeltery (26), costs/layout (21), and Saw Mill
  (39) checks passed in isolated headless Chrome profiles: 86 total. Refreshed
  the offline-cache manifest. No full-game balance assessment was performed.
- Aligned the live compatibility reference, captured it alongside the owner
  reply and updated catalogue, superseded the two prior project-source versions,
  and updated affected Town notes, Home, and inventory. Processed 3 new sources;
  27 prior raw snapshots unchanged; 0 duplicates; 0 blockers. No new balance
  values or prestige tiers were selected.
