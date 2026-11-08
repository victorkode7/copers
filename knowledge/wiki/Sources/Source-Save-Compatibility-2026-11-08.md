---
type: source
created: 2026-11-08
updated: 2026-11-08
raw_path: raw/2026-11-08/batch-04/SAVE_COMPATIBILITY.md
original_path: SAVE_COMPATIBILITY.md
sha256: 9390720697540cc08a9cbfe7d424a3c78b223712d5692b7f779fb869d2e0a20d
status: complete
review_scope: "Revised Town upgrade/prerequisite wording; remaining reference content unchanged"
tags:
  - source
  - save-compatibility
  - town
---

# Save compatibility reference: independent Town upgrades

## Provenance

Exact live-document snapshot captured on 2026-11-08 in batch-04. Original and
copy matched the SHA-256 above. This supersedes
[[wiki/Sources/Source-Save-Compatibility|the 2026-11-06 document version]] for
current reference wording; the earlier raw snapshot remains preserved.

## Summary

The reference now agrees with independent Town upgrades: Saw Mill level
upgrades and its first prestige do not require specific Outpost progress;
Smeltery upgrades do not require matching Mine progress.

## Findings and evidence

- Mill purchases still require an owned Outpost, while level upgrades and
  first prestige have no Outpost level/tier requirement (108-109).
- Smeltery upgrades remain subject to their configured material/gold costs,
  with no matching-Mine-progress gate (147-149).
- The remainder of the reference is unchanged from the previous snapshot.
  This review does not independently revalidate every documented save rule.

Evidence: [[raw/2026-11-08/batch-04/SAVE_COMPATIBILITY.md|Updated document]], lines 108-109 and 147-149.
[[wiki/Sources/Source-Code-Town-Content-2026-11-08|The revised code snapshot]]
records the corresponding implementation and targeted browser checks.

## Derived concepts

- [[wiki/Systems/Town/Town-Progression|Town progression]] combines the updated
  requirements with the earlier state, cost, and unlock reference.
- [[wiki/Design/Town-Design-Intent|Town design intent]] records the owner's rule.

## Open questions

Broader save migration and game balance were not retested by this reference
edit; the targeted Town suites are described in the implementation source note.
