---
type: source
created: 2026-11-08
updated: 2026-11-08
raw_path: raw/2026-11-08/batch-03/world-progression-design-intent.txt
original_path: "user chat: world progression and enemy difficulty (2026-11-08)"
sha256: 519d34185f4a2bb9d1adaf0bba183f0d5a7e16d3729abff31a10e8daa029f514
status: complete
source_kind: owner-design-note
tags:
  - source
  - progression
  - design-intent
---

# Owner's world progression direction

## Provenance

Owner reply captured verbatim from this conversation on 2026-11-08 in batch-03,
with UTF-8 encoding and one terminal newline. It answers what enemies should
demand as the player enters a new world: stronger stats, new strategic problems,
or a mixture. The SHA-256 above identifies the capture.

Evidence: [[raw/2026-11-08/batch-03/world-progression-design-intent.txt|Original reply]], line 1.
This establishes current design direction and tentative ideas, not a code
audit. No earlier source is superseded.

## Summary

For now, follow the make-enemies-stronger rule for world progression unless
the owner states otherwise. Enemy variety, weaknesses, and other opportunities
for strategy are ideas to keep in mind.

## Findings and evidence

- The current default is to make enemies stronger, until the owner changes
  that direction. No particular stat, scaling formula, or difficulty curve is
  selected.
- The owner has considered a mix of enemies, enemy weaknesses, or other
  opportunities for strategy.
- The owner describes the proposed strategic direction as unimplemented.
  This import does not verify current code coverage.
- Such strategy might take a form other than changing the skill tree or
  equipment. The reply does not select a required player response.

Evidence for all findings: [[raw/2026-11-08/batch-03/world-progression-design-intent.txt|Owner reply]], line 1.

## Derived concepts

- [[wiki/Design/World-Progression-Design-Intent|World progression design intent]]
  separates the current default from possible later strategy mechanics.
- [[wiki/Systems/Progression/World-Progression-and-Mastery|World progression and mastery]]
  links this owner direction to the existing documented progression rules.

## Open questions

Numerical tuning and the form, timing, or inclusion of future strategic
mechanics remain unspecified. No new enemy mechanic is approved by this reply.
