---
type: concept
created: 2026-11-06
updated: 2026-11-08
status: working-direction
evidence_level: owner-statement
sources:
  - "[[wiki/Sources/Source-Town-Design-Intent]]"
  - "[[wiki/Sources/Source-Town-Terminology]]"
  - "[[wiki/Sources/Source-Town-Terminology-Revision]]"
  - "[[wiki/Sources/Source-Code-Town-Content]]"
  - "[[wiki/Sources/Source-Code-Town-Content-2026-11-08]]"
  - "[[wiki/Sources/Source-Town-Upgrade-Independence]]"
  - "[[wiki/Sources/Source-Code-Town-Progression]]"
  - "[[wiki/Sources/Source-Save-Compatibility]]"
tags:
  - concept
  - town
  - design-intent
---

# Town design intent

## Summary

The owner's working direction, recorded on 2026-11-06 and clarified on
2026-11-08: Town should be optional
support for adventure progression, with meaningful decisions between growing
Town and obtaining immediate player benefits. The owner says it is not fully
realized and the mechanisms are largely undecided. This note preserves that
status; it is not a claim that the current code already achieves the goal.
[[wiki/Sources/Source-Town-Design-Intent|Owner source and provenance]].

## Owner-stated direction

- **Participation:** players should be able to avoid Town if they want.
  Participation should reward them with easier/faster progression.
- **Unlocks:** some unlocks may come through Town, while the game should still
  avoid forcing participation. The exact boundary is undecided.
- **Decisions:** offer investment in production versus an immediate player
  unlock/buff, sometimes at the expense of Town's own progression.
- **Experience:** move beyond the owner's current experience of waiting for
  the next affordable upgrade. Aim for problem solving and choices.

Evidence: [[raw/2026-11-06/batch-03/town-design-intent.txt|Original owner note]],
paragraphs 1-2 and 4 (lines 1, 3, and 7).

## Building upgrade requirements

A building's level upgrades and prestige should not directly require another
non-Town-Hall building to reach a particular level or prestige. Town Hall
prestige gates and the required materials are sufficient cross-building
constraints. A building can still require its own level cap before prestige.

For example, players can upgrade the Smeltery while leaving the Mine at a low
level and without prestiging it, provided they have the upgrade materials.
Obtaining Ore from the Mine remains a resource dependency; the Mine's level
is not an additional upgrade gate. The owner's level-10 Mine / level-5 Smeltery
example does not select actual thresholds.

Evidence: [[raw/2026-11-08/batch-04/town-upgrade-independence.txt|Owner rule]], line 1. Implemented on 2026-11-08 by
removing the Smeltery's Mine upgrade requirement and the Saw Mill's Outpost
prestige requirement; see [[raw/2026-11-08/batch-04/js/town-content.js|Updated definitions]], lines 19, 24.
Existing purchase ownership requirements and Town Hall gates remain in code.

## Candidate mechanisms, still undecided

- A limited stockpile could be spent on stronger production or an immediate
  adventure benefit; the opportunity cost would matter to Town growth.
- Adventure progress could indirectly make Town progress easier, creating
  useful feedback between systems. The owner discussed the W2 Ore-to-Bars
  building and Menagerie as examples. Its confirmed name is Smeltery; Anvil
  names equipment rerolling, as established by the terminology decisions below.
- Some buildings could cost monster materials. This would give mastery
  choices affecting population, respawn, and drops more relevance to Town.

These are directions to explore, not selected buildings, prices, or effects.
Evidence: [[raw/2026-11-06/batch-03/town-design-intent.txt|Owner proposals]],
paragraphs 2-4 (lines 3, 5, and 7).

Terminology clarification:
[[raw/2026-11-06/batch-03/town-terminology.txt|Owner's follow-up]], paragraph 1.
The later [[raw/2026-11-06/batch-04/town-smeltery-naming.txt|naming revision]],
line 1, replaces the proposed Forge name with Smeltery.

## Current implementation and terminology

The captured Menagerie unlocks mastery and supplies non-boss kill credit;
mastery itself is documented as supporting enemy population, respawn, and
drop-chance modifiers. Keep that chain explicit when discussing resource gains:
Menagerie access leads to mastery choices, which can change farming conditions.
The Menagerie's kill-credit multiplier alone does not multiply XP, gold, or drops.
Evidence: [[raw/2026-11-06/batch-03/js/town-progression.js|Current Town rules]],
`masteryUnlocked`, `killCountMultiplier`, and `killCredit` (131-149);
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Monster mastery|Mastery effects]],
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Content edits|Kill-credit limits]].

The owner's Managerie/managerie spelling is recorded as an alias for the
current Menagerie name. Smeltery is the owner's confirmed name for the W2
Ore-to-Bars building, matching the captured display name and ID `smeltery`.
Forge was an earlier proposal, withdrawn by the naming revision.
Anvil means equipment rerolling, while Crafting / Craft / Crafting system means
item creation. No game display string or persisted ID is changed by this note.
Evidence: [[raw/2026-11-06/batch-04/town-smeltery-naming.txt|Current building name]], line 1;
[[raw/2026-11-06/batch-03/town-terminology.txt|Anvil/Crafting clarification]],
paragraph 1; [[raw/2026-11-06/batch-03/js/town-content.js|Town catalogue]],
line 24; [[wiki/Sources/Source-Town-Terminology|Clarification provenance]].

## Proposed review questions

These questions are derived from the owner's direction; they are not finalized
balance requirements or evidence of current gameplay viability.

1. Can a player continue the main adventure while choosing not to use Town?
2. Does an addition create a meaningful choice about resource use or timing?
3. Is the tradeoff between immediate adventure benefit and Town growth clear?
4. Does a Town-gated reward preserve the intended optional participation?
5. Does a feedback loop create interesting decisions rather than merely add a wait?

## Connections

[[wiki/Systems/Town/Town-System]] documents current fields and behavior.
[[wiki/Systems/Town/Town-Progression]] and [[wiki/Systems/Town/Town-Production-and-Storage]] provide the
current economy reference. [[wiki/Foundations/Game-Glossary]] tracks names and aliases;
[[wiki/Systems/Progression/World-Progression-and-Mastery]] explains the mastery connection.

## Open questions

- When should Anvil's preferred naming be applied to the game's UI? Smeltery already matches the confirmed name.
- Which unlocks can be exclusive to Town while Town participation stays optional?
- Which immediate benefits and investment alternatives should be explored first?
- What costs, pacing targets, and playtests would establish that Town is optional
  in practice? No numerical targets have been selected.
