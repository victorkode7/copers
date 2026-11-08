---
type: concept
created: 2026-11-06
updated: 2026-11-08
status: working-direction
evidence_level: owner-statement
sources:
  - "[[wiki/Sources/Source-Equipment-Design-Intent]]"
  - "[[wiki/Sources/Source-Weapon-World-Progression]]"
  - "[[wiki/Sources/Source-Town-Terminology]]"
  - "[[wiki/Sources/Source-Unique-Item-Feedback]]"
  - "[[wiki/Sources/Source-Crafting-Early-Game-Intent]]"
  - "[[wiki/Sources/Source-Crafting-Materials-Intent]]"
  - "[[wiki/Sources/Source-Build-Design-Intent]]"
tags:
  - concept
  - equipment
  - design-intent
---

# Equipment design intent

## Summary

The owner's direction as of 2026-11-06: equipment progression combines finding
items with improving their rolls. A weapon remains in use until another offers
better stats or a unique effect that makes the player's build work better.
New-world weapons should usually feel like direct upgrades; a unique ability
and near-perfect rolls may let an older weapon compete with early next-world drops.
This is a design goal; current implementation and balance have not been audited
against it. [[wiki/Sources/Source-Equipment-Design-Intent|Source and provenance]].

## Owner-stated goals

- **Discovery matters:** finding a different item should offer a route to improvement.
- **Roll improvement matters:** improving an existing item's rolls also contributes.
- **Replacement has a reason:** keep using a weapon until another is more useful.
- **Two replacement reasons:** better stats, or a unique effect that improves
  how the build works. A replacement does not have to be justified by both.

Evidence: [[raw/2026-11-06/batch-05/equipment-design-intent.txt|Owner reply]], line 1.
The example concerns weapons; how this applies to each other equipment slot
has not yet been specified.

### World transitions

- **Usual expectation:** a weapon from a new world should feel like a direct
  upgrade most of the time.
- **Possible carryover:** an older weapon with a unique ability and near-perfect
  rolls may remain competitive with something that drops early in the next world.
- **Scope:** the stated exception combines the unique ability and roll quality.
  It is conditional, and does not establish that older weapons stay competitive
  throughout the next world or across several worlds.

Evidence: [[raw/2026-11-06/batch-06/weapon-world-progression.txt|Owner clarification]],
line 1. This refines the earlier replacement goal without setting numerical
thresholds, drop rates, or item balance values.

## Implications to explore

These are interpretations of the stated direction, not additional owner decisions:

- Anvil investment can extend a useful weapon's life while discovery presents
  reasons to consider a replacement.
- Item comparisons should consider the player's current rolls and build fit,
  as well as the incoming item's stats and unique effect.
- A unique effect may justify replacing a weapon without a universal increase
  in every numerical stat. Exact tradeoffs need design and balance work.

Basis: [[raw/2026-11-06/batch-05/equipment-design-intent.txt|Original direction]], line 1.
No new unique effect, roll range, or comparison formula is selected here.

## First unique-item review

The owner questions Geobreaker's useful window: its rare W1-boss acquisition
may occur too late for Shockwave Slash's benefit to stay competitive. They are
uncertain whether a suitable build keeps up with W2 weapons. This is a balance
and acquisition concern, not an established performance result.
Evidence: [[raw/2026-11-06/batch-07/unique-item-feedback.txt|Owner feedback]],
paragraph 1. [[wiki/Systems/Equipment/Unique-Item-Effects]] records the proc rules, 1% base boss
drop, Resonant Guard synergy, and Purple Flame's Black Sun effect.

A design implication to evaluate is the period between obtaining a unique and
ordinary upgrades overtaking its benefit. Specific buffs, availability changes,
and new effects remain undecided.

## Build discovery

The owner clarified on 2026-11-08 that players should be free to discover
interesting item/ability combinations, without targeting a particular number
of abilities. Strong interactions are acceptable within a limit of not feeling
overly broken. More specialized weapon stats are a possible way to encourage
choices where a combination currently feels broadly beneficial.

[[wiki/Design/Build-Design-Intent|Build design intent]] records that direction,
the Piercing Arrow/Gathering Power concern, including the possibility that
spell-only builds gain little from that combination. It does not select
equipment changes or establish measured dominance.
Evidence: [[raw/2026-11-08/batch-01/build-design-intent.txt|Owner reply]], line 1.

## Connections

[[wiki/Design/Crafting-Design-Intent]] records the early item-creation role and the
owner's later material/pity preferences. The ordinary role after World 2 is
still open. Evidence:
[[raw/2026-11-07/batch-01/crafting-early-game-fragment.txt|Early role]], line 1;
[[raw/2026-11-07/batch-01/crafting-materials-direction.txt|Material direction]], line 1.

[[wiki/Systems/Equipment/Equipment-Crafting|Anvil]] documents the existing reference for rolls,
presets, saved rolls, and auto roll. The owner names rerolling Anvil and item
creation Crafting / Craft, per
[[raw/2026-11-06/batch-03/town-terminology.txt|the terminology clarification]], line 1.
[[wiki/Foundations/Game-Glossary]] preserves these terms and [[wiki/Foundations/Game-Overview]] supplies
the wider progression context.

## Open questions

- What defines near-perfect rolls and competitive performance for a particular build?
- What roll quality should be used when comparing early next-world drops with
  an exceptional previous-world weapon?
- How should later item drops and Crafting divide acquisition, given the
  preference to limit ordinary monster materials beyond World 2?
- What kinds of unique effects should change a build, and what does better
  mean for different builds? Geobreaker and Purple Flame are the first reviewed
  existing examples; performance metrics and future effect designs remain open.
