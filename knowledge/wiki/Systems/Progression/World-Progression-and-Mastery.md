---
type: concept
created: 2026-11-06
updated: 2026-11-08
status: documented
sources:
  - "[[wiki/Sources/Source-Save-Compatibility]]"
  - "[[wiki/Sources/Source-World-Progression-Design-Intent]]"
tags:
  - concept
  - progression
  - mastery
---

# World progression and mastery

## Summary

The reference captured on 2026-11-06 distinguishes character skill points from
per-map mastery and documents persistent boss rewards and kill credit.
[[wiki/Sources/Source-Save-Compatibility|Source provenance]].

## Supported facts

### Character progression

Earned skill points, spent plus unspent, are
`min(level, 15 + 15 * defeated world bosses)`. Each world's final map is its boss;
the first victory raises the cap once. `defeatedBossWorldIds` retains rewards
through saves, imports, aliases, and map edits; older saves infer victories from
boss-map kills. Levels are retained. Optional
`tutorials.skillPointCapPending` / `skillPointCapDismissed` track the dismissible
cap notice and default to false in older profiles.

Over-cap profiles keep the old tree in `skillPointRecoveryRanks`, refund active
skills to the capped budget, pause combat, and open the trimming plan.
`skillPointTrimPending` controls its initial prompt; the saved plan remains
available after applying/cancelling edits and follows aliases/removals without
granting points. Original profiles remain in backups.

XP penalties begin at levels 15/30/45 for Worlds 1/2/3. Successive reductions
are 90%, 95%, 99%, 99.9%, then 99.99% for later levels in that world. Large
rewards recalculate penalties across level boundaries. `experienceRemainder`
preserves fractional XP in `[0,1)` through kills, saves, imports, and offline
simulation while ordinary XP stays integer. Full reset clears boss rewards,
the remainder, and recovery plan.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#World progression and skill point caps|Character progression evidence]].

### Map mastery

`mapMastery` stores `{earned, nodes}` per permanent map ID. Each milestone
awards two points: regular maps use 10x, 100x, 1,000x, then tenfold multiples of
the kill requirement (minimum goal 1); bosses use 2x, 20x, 200x, then tenfold.
Existing kills earn retroactive credit; earned points never decrease after goal
edits. Unknown map/node IDs remain stored but inactive. Imports preserve mastery;
full reset clears it.

World `masteryPresets.regular` / `.boss` default to fourteen-node trees; map
`masteryTree` overrides them. `masteryType` is `auto`, `regular`, or `boss`;
automatic uses the world's final map. The root is free; other nodes cost one
point. Disconnected/unsupported selections remain spent but inactive until
refunded, reset, or supported again. Stats and penalties apply only on that map;
drop chance caps at 100% and active population at 100. Enemy changes retain HP
percentages and remaining respawn fractions. Learning/refunding rolls back on
storage failure. Foreground and offline mastery effects match.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Monster mastery|Mastery evidence]].

### Menagerie kill credit

The Verdant Reach plot-4 Menagerie requires Town Hall T2. Ownership unlocks
World 1 mastery; its single prestige unlocks World 2 while retaining World 1's
10x kill credit. Saved allocations stay inactive until their world's unlock is
owned. `townProgress.killFractions` retains per-map quarter-kill remainders;
invalid remainders reject loading. Bosses always count once and do not consume
these fractions. Historical credited kills are not divided retroactively. XP,
gold, drops, and boss rewards occur once per actual defeated monster.
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Content edits|Menagerie evidence]],
[[raw/2026-11-06/batch-02/SAVE_COMPATIBILITY.md#Monster mastery|Boss exclusion]].

## Owner direction: world difficulty

As of 2026-11-08, the owner wants the current world-progression default to be
make enemies stronger, unless they state otherwise. Enemy variety, weaknesses,
and other strategic mechanics are tentative ideas; any such strategy might
use something other than skill-tree or equipment changes.

This is owner direction, separate from the documented rules above.
[[wiki/Design/World-Progression-Design-Intent|World progression design intent]]
records the default and the distinction between it and future possibilities.
Evidence: [[raw/2026-11-08/batch-03/world-progression-design-intent.txt|Owner reply]],
line 1.

## Connections

[[wiki/Systems/Saves/Save-Compatibility|Save compatibility]] preserves these IDs and counters.
[[wiki/Systems/Town/Town-Progression|Town progression]] provides the Hall tiers that unlock
the Menagerie.

## Open questions

These are documented rules; current gameplay and migration behavior were not
independently tested during import.
