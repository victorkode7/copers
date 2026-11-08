---
type: source
created: 2026-11-06
updated: 2026-11-07
raw_path: raw/2026-11-06/scythe-reap.md
original_path: docs/scythe-reap.md
sha256: e3e02fd66514044cd76df09edb09bd0590d5f2b2b367d7b0378125a3458acefd
status: complete
tags:
  - source
  - reap
---

# Scythe Reap source

## Provenance

Byte-for-byte snapshot of the project's `docs/scythe-reap.md`, captured
2026-11-06. The source provides no explicit document version or publication date.
Extraction used the existing UTF-8 Markdown; no OCR or format conversion was
needed. [[raw/2026-11-06/scythe-reap.md|Open the full snapshot]].

At the setup review on 2026-11-06, the snapshot hash matched its registered
SHA-256. The original path was absent from this checkout, so the original's
current contents and equality with the snapshot could not be independently
verified. The original location and capture details above are retained from
the existing import record.

## Summary

The document describes Reap's combat rules, its sprite renderer and game
adapter, blood asset preparation, and browser validation commands. These are
documented claims, not fresh test results from this library setup.

## Findings and evidence

- **Combat:** the primary hit deals 100% physical damage; up to three adjacent
  targets take 300% each. Direct Reap kills can trigger Reaping Echo, whose
  corpse-origin hits can chain. Poison, bleed, and other abilities do not
  generate these echoes. [[raw/2026-11-06/scythe-reap.md#Scythe Reap|Combat rules]].
- **Timing:** the visual callback crosses frame 5, while gameplay damage remains
  on the simulation clock at 200 ms. Applying damage again in the renderer would
  duplicate it. [[raw/2026-11-06/scythe-reap.md#Trigger from game code|Timing and API]].
- **Rendering:** sixteen 768 by 768 cells form a 3072 by 3072 sheet. Animation
  comes from the frames, with fixed cast facing and a central hilt pivot. Blood
  requires separate alignment and cleanup; the document identifies limits in
  the supplied blood artwork. [[raw/2026-11-06/scythe-reap.md#Asset inspection and alignment|Assets and limitations]].
- **Inspection and accessibility:** the API supports pause, seek, resume,
  cancellation, and cleanup. Reduced motion uses a static pose and fade.
  [[raw/2026-11-06/scythe-reap.md#Trigger from game code|Playback controls]].
- **Validation:** the source lists browser suites for the sprite, cone, echo,
  local-file behavior, redraw optimization, and developer tooling. These were
  not rerun during this import.
  [[raw/2026-11-06/scythe-reap.md#Validation|Validation commands]].

## Derived concepts

- [[wiki/Systems/Combat/Reap-Combat|Reap combat]] captures damage, chaining, and timing rules.
- [[wiki/Systems/Combat/Reap-Rendering|Reap rendering]] captures the presentation layer and how
  it stays independent of combat simulation.

## Open questions

Whether the live implementation still matches this snapshot requires inspecting
the current code and running relevant checks. The source says that precise
weapon/blood correspondence would require a matched blood sheet.
