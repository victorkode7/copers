---
type: source
created: 2026-11-08
updated: 2026-11-08
raw_path: raw/2026-11-08/batch-04/js/town-content.js
original_path: js/town-content.js
sha256: f63b7da6a5050c4cbeca8576a37c423b94ad903ef740bf142eaaeab0d20d979c
status: complete
review_scope: "Complete catalogue; focused change to Smeltery upgrades and Saw Mill prestige requirements"
tags:
  - source
  - implementation
  - town
---

# Town content definitions: independent upgrades

## Provenance

Exact live-file snapshot captured on 2026-11-08 in batch-04 after the requirement
change; 26 lines, 5143 bytes. The live original and snapshot matched the
SHA-256 above. This supersedes
[[wiki/Sources/Source-Code-Town-Content|the 2026-11-06 catalogue snapshot]] for
current definitions. Both raw versions remain preserved.

Evidence: [[raw/2026-11-08/batch-04/js/town-content.js|Captured catalogue]].
The change implements [[wiki/Sources/Source-Town-Upgrade-Independence|the owner's upgrade rule]].

## Summary

Smeltery level upgrades no longer require matching Mine progression. Saw Mill's
first prestige no longer requires a T1 Lumber Outpost. Existing prices, Town
Hall gates, production, level caps, and available prestige tiers are retained.

## Findings and evidence

- Line 7 states production buildings do not depend on other production
  buildings' progression for level upgrades or prestige.
- sawMill (19) no longer has a Lumber Outpost prestigeRequires gate. Its
  purchase still requires Town Hall T1 and an owned Outpost; its first prestige
  costs 2,500 gold, 1,000 Planks, and 10,000 Ore.
- smeltery (24) no longer has a Mine upgradeRequires gate. Purchase still
  requires W2 Town Hall T1 and an owned Mine. Upgrade materials remain 100
  Planks and 10 Bars with base gold 10,000, subject to existing gold scaling.
- lumberOutpost (18) retains its Town Hall T1 prestige gate. No new Smeltery
  prestige or Saw Mill T2 is configured.
- The unchanged TownProgression.can implementation still checks a building's
  own level cap, whether prestige is configured, and affordability.

Evidence: [[raw/2026-11-08/batch-04/js/town-content.js|Catalogue]], lines 7, 18-19, 24;
[[raw/2026-11-06/batch-03/js/town-progression.js|Eligibility]], can/apply (50-65).

## Validation

Executed the updated town-smeltery, town-costs-layout, and town-sawmill browser
smoke suites in isolated headless Chrome profiles: 26, 21, and 39 checks passed
(86 total). Coverage includes independent Smeltery upgrades through level 10,
Saw Mill prestige with a T0 level-1 Outpost, cost failures, Town Hall gates,
production, and save/loading. Refreshed the generated offline-cache manifest.
This is targeted regression coverage, not a full game balance assessment.

## Derived concepts

- [[wiki/Design/Town-Design-Intent]]
- [[wiki/Systems/Town/Town-Progression]]
- [[wiki/Systems/Town/Town-System]]

## Open questions

No new numerical balance targets were selected. Production can still be
limited by available input materials even when upgrades are affordable.
