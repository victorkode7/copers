---
type: concept
created: 2026-11-08
updated: 2026-11-08
status: working-direction
evidence_level: owner-statement
sources:
  - "[[wiki/Sources/Source-Build-Design-Intent]]"
  - "[[wiki/Sources/Source-Build-Balance-Boundaries]]"
tags:
  - concept
  - builds
  - skills
  - design-intent
---

# Build design intent

## Summary

As of 2026-11-08, the owner's priority is players discovering interesting builds
and item/ability interactions. The design target is not a particular number of
abilities. Strong, surprising combinations are welcome. The owner's subsequent
clarification makes acceptable power dependent on the content: a build can
excel at one task and remain good elsewhere without being best at everything.

This records design direction and the owner's balance observations. It does
not establish measured performance or change gameplay.

## Owner-stated goals

- Give players freedom to make the builds they want.
- Encourage discovery of interesting interactions between items and abilities.
- Allow powerful or surprising interactions within a limit of not feeling
  overly broken.
- Judge the result by whether players find cool builds, rather than whether
  they use a few abilities or many.

Evidence: [[raw/2026-11-08/batch-01/build-design-intent.txt|Owner reply]], line 1.

## Reported concern: broadly useful combinations

The owner currently dislikes combining Piercing Arrow and Gathering Power
feeling like a direct upgrade in almost every build. They suspect this benefit
may not apply to builds using only spell damage, which may gain little from
Piercing Arrow.

This is a reported balance concern. No comparative test in this import
establishes which builds benefit, by how much, or whether their opportunity
cost is sufficient.

Evidence: [[raw/2026-11-08/batch-01/build-design-intent.txt|Owner reply]], line 1.

## Content-dependent balance boundaries

The owner would accept the example of a build that melts bosses despite its
power, and tentatively considers being very good at one thing but less effective
at others acceptable. Feeling overpowered alone is not the concern; the intended
challenge of the content matters.

For content intended to be really hard or require planning, the owner would
consider investigating a build that breezes through without needing any
adjustment. Possible preparation could involve a build change, a different
unique weapon, or a future system. This is a reason to review the interaction,
not an automatic decision to weaken it or require every build to change.

A build can be good at the hard task and remain good elsewhere. The desired
boundary is that success at that task should not also make it best at
everything. This does not require making the build bad at other content.

The dungeon and potion examples illustrate possible future content and
preparation; they are not committed mechanics or specifications.

Evidence: [[raw/2026-11-08/batch-02/build-balance-boundaries.txt|Owner clarification]],
line 1. No numerical threshold or content-specific pass/fail rule is selected.

## Possible direction: specialization through stats

The owner suggests more specialized stats, such as ranged damage on weapons,
might help make focusing on one direction or another worthwhile. This is a
tentative route to explore, not an approved implementation change or a claim
that more stats will necessarily resolve the cited combination.

No new stat, weapon restriction, ability-count limit, or nerf is specified.

Evidence: [[raw/2026-11-08/batch-01/build-design-intent.txt|Owner reply]], line 1.

## Implications to explore

These are interpretations of the direction, not additional owner decisions:

- When reviewing a strong combination, consider whether it offers an interesting
  build choice or becomes an automatic addition across otherwise different builds.
- Compare benefits with the points, equipment choices, or other opportunities
  a build gives up, rather than treating a surprising interaction alone as a
  reason to remove it.
- When exploring specialized stats, check whether they create meaningful choices
  while preserving room to discover cross-system interactions.

Basis: [[raw/2026-11-08/batch-01/build-design-intent.txt|Owner reply]], line 1.
These are review questions, not chosen balance criteria or numerical targets.

## Connections

- [[wiki/Systems/Combat/Skills-and-Abilities|Skills and abilities]] documents
  nodes, ranks, tree paths, stat aggregation, and representative activation rules.
- [[wiki/Design/Equipment-Design-Intent|Equipment design intent]] records how
  item discovery, roll quality, and unique effects can improve a build.
- [[wiki/Systems/Equipment/Unique-Item-Effects|Unique item effects]] gives current
  examples of items modifying learned abilities.

## Open questions

- What challenge and preparation should each future hard activity reward?
  The owner has clarified the contextual boundary; content-specific criteria
  and numerical thresholds remain undecided.
- Which tradeoffs should make specialization worthwhile without closing off
  interesting combinations?
- How widely does Piercing Arrow plus Gathering Power improve current builds,
  including spell-focused and mixed builds? This needs a focused balance review.
