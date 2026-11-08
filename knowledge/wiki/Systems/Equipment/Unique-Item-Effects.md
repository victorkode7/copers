---
type: concept
created: 2026-11-06
updated: 2026-11-07
status: baseline
evidence_level: static-code-review-and-owner-feedback
sources:
  - "[[wiki/Sources/Source-Code-Items]]"
  - "[[wiki/Sources/Source-Code-Item-System]]"
  - "[[wiki/Sources/Source-Code-Game]]"
  - "[[wiki/Sources/Source-Code-Combat-Abilities]]"
  - "[[wiki/Sources/Source-Code-Combat-Health]]"
  - "[[wiki/Sources/Source-Code-World-Content]]"
  - "[[wiki/Sources/Source-Unique-Item-Feedback]]"
tags:
  - concept
  - equipment
  - unique-effects
---

# Unique item effects

## Summary

Current examples reviewed from matching code snapshots on 2026-11-06.
Geobreaker modifies Shockwave Slash; Purple Flame modifies Fire of the Righteous.
Owner balance concerns are separate from verified code behavior. No browser
suite or cross-world build comparison was run.

## Supported facts

### Effect versus ability

`item.uniqueEffect` names a registry entry resolved by `Equipment.uniqueEffect`.
The game reads equipped items' modifiers when choosing ability settings.
Both current examples require the corresponding learned skill; they do not
grant that skill merely by being equipped.

| Item | Unique item effect | Modified ability |
| --- | --- | --- |
| Geobreaker | `geobreakerShockwave` | Shockwave Slash |
| Purple flame | `blackSun` (Black Sun) | Fire of the Righteous |

These are the two current registry entries, not a constraint on future designs.
Evidence: [[raw/2026-11-06/batch-03/js/items.js|Items]], 335-348 and 915-926;
[[raw/2026-11-06/batch-07/js/item-system.js|Registry]], 3-15;
[[raw/2026-11-06/batch-03/js/game.js|Equipped-item settings]], 1271-1287 and
4346-4348; [[raw/2026-11-06/batch-07/js/combat-abilities.js|Skill checks]],
624-629 and 661-665.

### Geobreaker

- Raises Shockwave Slash's chance from 25% to 50% and gives two activations per
  successful proc instead of one.
- Each activation deals 33% of triggering hit damage to other living enemies,
  excluding the primary target.
- With Resonant Guard, each activation grants one shield: two shield gains
  per successful Geobreaker proc, subject to the shield cap, even against a lone enemy.
- The raw item has 11 physical damage, attack-speed multiplier 1.21, accuracy
  21, and no Crafting recipe.
- The W1 final-map monster Grove Guardian defines a 1% base drop chance.
  Actual drop rolls apply the map's mastery drop-rate multiplier, capped at 100%.

Evidence: [[raw/2026-11-06/batch-03/js/items.js|Weapon]], 335-348;
[[raw/2026-11-06/batch-07/js/item-system.js|Modifier]], 4-6;
[[raw/2026-11-06/batch-03/js/game.js|Base settings]], 4346-4348 and
`defeatEnemy` item-drop handling;
[[raw/2026-11-06/batch-07/js/combat-abilities.js|Proc execution]], 624-647;
[[raw/2026-11-06/batch-03/js/world-content.js|Boss/drop mapping]], 3-14,
466-485, and 1204-1231.

### Purple Flame / Black Sun

Black Sun changes Fire of the Righteous's settings:

| Setting | Ordinary skill | With Purple Flame |
| --- | --- | --- |
| Healing cap | 30% of maximum HP | 1% of maximum HP |
| Burning-damage multiplier | 1 | 2 |
| Self-drain per second | 10% of maximum HP | 10% of maximum HP |

It requires learned Fire of the Righteous. This modifies that skill's burn,
not all damage. Black Sun does not lower maximum HP itself. HP already above
the healing cap is not instantly deleted; healing cannot raise it further and
self-drain continues normally.

Regeneration first offsets drain and heals toward the cap; unused regeneration
becomes burn, divided across living enemies and multiplied by the setting above.
Enough regeneration is still needed to sustain the self-drain.
Evidence: [[raw/2026-11-06/batch-03/js/items.js|Purple Flame]], 915-926;
[[raw/2026-11-06/batch-07/js/item-system.js|Black Sun]], 8-10;
[[raw/2026-11-06/batch-03/js/game.js|Baseline and overrides]], 99 and 1260-1287;
[[raw/2026-11-06/batch-07/js/combat-health.js|Healing]], 20-39;
[[raw/2026-11-06/batch-07/js/combat-abilities.js|Fire execution]], 661-681.

## Owner feedback and design implications

The owner suspects rare W1-boss acquisition leaves Geobreaker a short useful
window, questions Shockwave damage relevance, and is unsure whether a suitable
build can compete in W2. These remain concerns, not measured outcomes.
Evidence: [[raw/2026-11-06/batch-07/unique-item-feedback.txt|Owner feedback]],
paragraph 1 (line 1). The owner's Purple Flame memory in paragraph 2 (line 3)
matches Black Sun's implemented damage/survival tradeoff.

Code inspection confirms the effect and acquisition rules, not the length of
the useful window. A comparison should consider population, triggering hit
damage, rolls, build choices, shield utility, and actual acquisition timing.
A design question derived from the feedback is whether a unique becomes
available early enough for players to explore its benefit.

## Connections

[[wiki/Design/Equipment-Design-Intent]] gives the desired replacement/world-transition
goals. [[wiki/Foundations/Game-Glossary]] distinguishes abilities and item effects.
[[wiki/Systems/Equipment/Equipment-Crafting|Anvil]] covers rolls; [[wiki/Foundations/System-Map]] identifies owners.

## Open questions

- How does a realistic Geobreaker build compare with early W2 weapons, including
  defensive utility and when it is acquired?
- How long should rare uniques offer useful play before ordinary upgrades dominate?
- Which effects or acquisition rules should change? No buff, drop-rate change,
  or replacement effect is selected by this review.
