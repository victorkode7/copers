---
type: source
created: 2026-11-06
updated: 2026-11-08
raw_path: raw/2026-11-06/batch-07/js/combat-abilities.js
original_path: js/combat-abilities.js
sha256: 327f8cce4e4aeaf1eb479288dc74812eca2bcabcd0d5568ad1cc73d0d856fd1d
status: complete
review_scope: "Shockwave Slash (624-647) and regeneration/Fire of the Righteous (661-681); 2026-11-08 extension: multi-hit targeting and arrow hit/trigger paths, alongside the earlier Shockwave and Fire review; skills review: representative mana, spell, brand, and Shockwave activation gates"
tags:
  - source
  - implementation
  - unique-effects
---

# Unique-modified combat execution

## Provenance

Exact working-file snapshot captured on 2026-11-06 in batch-07, 735 lines.
Original and snapshot matched the SHA-256 above.
[[raw/2026-11-06/batch-07/js/combat-abilities.js|Captured code]]; symbol/line references use this snapshot.
This is the first import of this file; no earlier version is superseded.

## Summary

Focused execution paths show how the equipped unique settings affect Shockwave Slash and Fire of the Righteous. Other ability implementations are preserved without a new audit.

## Findings and evidence

- Shockwave Slash requires the learned skill. Each activation deals 33% of triggering hit damage to other living enemies, excluding the primary target.
- The loop processes each activation separately and grants a Resonant Guard shield per activation, even when no splash target is present.
- Fire of the Righteous resolves drain and healing together and divides excess-regeneration burn, multiplied by its configured damageMultiplier, across living targets.

Evidence: [[raw/2026-11-06/batch-07/js/combat-abilities.js|js/combat-abilities.js]], Shockwave Slash (624-647) and regeneration/Fire of the Righteous (661-681).

## Combat review extension: 2026-11-08

The live original matched this unchanged snapshot's registered SHA-256.
Expanded scope: multi-hit targeting and arrow hit/trigger paths, alongside the earlier Shockwave and Fire review.

- getPlayerAttackTargets (491-503) uses the whole and fractional multi-hit value to select distinct living targets, starting with the current target and wrapping through the encounter list.
- shootAbilityArrow (54-105) checks accuracy per arrow target and applies physical ability damage. Multishot can check further arrow skills with includeMultishot=false to prevent recursive Multishot casts.
- triggerAttackArrowSkills (108-124) checks learned skills and chance/target conditions independently of the basic hit check.

Evidence: [[raw/2026-11-06/batch-07/js/combat-abilities.js|Captured code]], symbols and lines above.
This is static inspection; no browser tests or balance comparisons were run.

## Skills review extension: 2026-11-08

Both the raw snapshot and live original matched the registered SHA-256.
tickPlayerMana (326-334) regenerates mana and checks a charged volley; triggerAttackSpells (336-346) gates primary-attack spell attempts on player/combat/mana availability. castElementalBrand (350-360) also checks the learned rank, spell damage, current mana, and an eligible target. Shockwave Slash (624-645) requires a learned rank before rolling its equipment-modifiable chance.

Evidence: [[raw/2026-11-06/batch-07/js/combat-abilities.js|Captured source]], symbols and lines above.
This extends static coverage; no gameplay or browser test result is implied.

## Derived concepts

- [[wiki/Systems/Combat/Skills-and-Abilities|Skills and abilities]].

- [[wiki/Systems/Combat/How-Attacks-Work|How attacks work]] documents this path.

[[wiki/Systems/Equipment/Unique-Item-Effects]] records the two current examples and separates
implemented behavior from the owner's balance concerns. [[wiki/Foundations/System-Map]]
links the implementation boundary.

## Open questions

No browser suites or cross-world build comparisons were run in this review.
The facts above describe the inspected code, not measured balance.

