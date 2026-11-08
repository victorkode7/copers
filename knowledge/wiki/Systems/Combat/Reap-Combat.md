---
type: concept
created: 2026-11-06
updated: 2026-11-07
status: documented
sources:
  - "[[wiki/Sources/Source-Scythe-Reap]]"
tags:
  - concept
  - combat
  - reap
---

# Reap combat

## Summary

According to the Reap document captured on 2026-11-06, Reap is a physical attack
with adjacent hits and optional kill-triggered echoes.

## Supported facts

| Hit | Targets | Physical damage |
| --- | --- | --- |
| Direct primary | One primary enemy | 100% |
| Direct adjacent | Up to three adjacent enemies | 300% each |
| Reaping Echo | Up to three living neighbors of the corpse | 300% each |

Reaping Echo requires its connected skill node. Each kill from a direct Reap
hit can start an echo at the corpse; echo kills can continue the chain. Echoes
consume no attack and do not trigger additional attack-only arrows or spells.
Other abilities, poison, and bleed do not generate these echoes. Reap is listed
separately in the damage meter. Its historical save ID remains `reapPreview`.
[[raw/2026-11-06/scythe-reap.md#Scythe Reap|Damage and echo evidence]].

Gameplay damage is timed by the simulation at 200 ms. The optional visual
`onHit` callback fires when playback crosses frame 5 and must not apply that
damage again. The source says hidden tabs, offline progress, and disabled
visuals must not change damage.
[[raw/2026-11-06/scythe-reap.md#Trigger from game code|Timing evidence]].

## Connections

[[wiki/Systems/Combat/Reap-Rendering|Reap rendering]] presents these attacks without applying
combat damage. [[wiki/Sources/Source-Scythe-Reap|The source note]] records provenance
and the source's validation instructions.

## Open questions

Current code behavior has not been independently verified by this import.
