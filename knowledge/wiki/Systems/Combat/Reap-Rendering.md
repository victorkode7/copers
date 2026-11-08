---
type: concept
created: 2026-11-06
updated: 2026-11-07
status: documented
sources:
  - "[[wiki/Sources/Source-Scythe-Reap]]"
tags:
  - concept
  - rendering
  - reap
---

# Reap rendering

## Summary

The Reap document captured on 2026-11-06 describes a sprite-based presentation
layer loaded by `js/scythe-reap-effect.js`.
[[raw/2026-11-06/scythe-reap.md#Scythe Reap|Module reference]].

## Supported facts

- The weapon sheet has sixteen 768 by 768 cells in a 3072 by 3072 image. Each
  cell's center is the hilt pivot; frames supply the 270-degree counterclockwise
  swing. Rendering applies a fixed facing without animated rotation or size
  changes. [[raw/2026-11-06/scythe-reap.md#Asset inspection and alignment|Weapon layout]].
- Each cast retains its initial display size. The game adapter uses a compact
  formation reference size, including for encounters with fewer enemies.
  Target lookup follows card replacement and scrolling. Reduced motion uses a
  static pose and fade. [[raw/2026-11-06/scythe-reap.md#Trigger from game code|Sizing and playback]].
- Weapon and blood share a frame clock. The blood correction rotates only the
  blood by -85 degrees and scales it to 92%; cleanup and reveal are baked into
  the game's prepared blood texture. Blood renders above weapons, including
  overlapping echoes. The source artwork prevents a perfect match.
  [[raw/2026-11-06/scythe-reap.md#Asset inspection and alignment|Blood alignment and limits]].
- The renderer retains canvas pixels when the visible scene is unchanged.
  Playback timing and target tracking continue; visual changes trigger redraws.
  [[raw/2026-11-06/scythe-reap.md#Validation|Redraw behavior]].

## Connections

[[wiki/Systems/Combat/Reap-Combat|Reap combat]] owns the damage rules and simulation timing.
The visual `onHit` callback must not duplicate gameplay damage.
[[raw/2026-11-06/scythe-reap.md#Trigger from game code|Timing boundary]].
[[wiki/Sources/Source-Scythe-Reap|The source note]] links the full API examples,
asset preparation details, and browser validation commands.

## Open questions

The browser suites listed in the source were not rerun during this import.
Current implementation and visual quality require separate verification.
