COPERS PROGRESSION BUILDS — 27 OCTOBER 2026

Import in the game: Skill Tree > Import build > select a JSON file > Apply build.
The preview shows the cost. If it exceeds your earned points, Edit to fit points
opens the build with its nodes selected. Remove the number shown in red, then
Apply build. Your active skills stay unchanged until you apply or cancel.
Your spent and unspent points are pooled; imports cannot grant points.
Import, Export and four empty preset slots sit together below the tree. Slots
can be named, saved and loaded in this browser. Click the pencil beside the
selector to rename a slot in place; Enter saves and Escape cancels.
Saving a preset spends no
points; loading uses the same budget checks. Available Points is plain text
overlaid below that bar. The game backs up your profile before replacing
your allocation. Gear, gold, level and kill progress remain unchanged.
Export build shares your confirmed skills only, without your character save.

RECOMMENDATIONS

Shielded Vanguard — 60 points: safest default progression build.
  Recovery, evasion, Fury, Multishot, Piercing/Forking Arrows, freezing and shields.
  Deep Wounds was removed: this allocation has no Bleed chance, so that point
  was inactive. Forking Arrow is the best tested one-point replacement.
  Gathering Power caps at double damage. All three gold nodes give x3.75 gold.
  Stayed at full HP in the six actual-map tests for both random seeds.

Righteous Bulwark — 60 points: highest farming throughput in this search.
  Percentage health regeneration feeds Fire of the Righteous; shields and
  evasion help cover Volcanic Eruption's self-damage. Includes x3.75 gold.
  Fire caps healing at 30% maximum HP, so its low displayed HP is expected.
  Keep the regeneration nodes together. When levelling manually, buy Fire
  together with its flat/percentage regeneration support, rather than leaving
  yourself with the drain alone. Full-build import includes all that support.

Crimson Arrows — 60 points: strong boss and single-target option.
  Deep Wounds keeps the three strongest Bleed applications; Bleederer builds
  stacks quickly. Multishot, Fury and physical bonuses increase those hits.
  Shields, recovery and evasion kept it at full HP in the actual-map tests.
  Singled Off replaces the inactive Poison Execute pick (no Poison chance).
  It skips the gold branch; use a farming build for earning gold.

Venom Volley — 60 points: crowded-map farming alternative.
  Many arrow hits apply poison; Blooming Flower transfers remaining poison
  on death, while Poison Execute finishes enemies. Includes x3.75 gold.
  A viable poison playstyle; the corrected Vanguard farms Eyecicles faster.

Elemental Warden — 60 points: viable spell-focused alternative.
  Rime/Ember Brands, both rupture upgrades, mana sustain, spell damage and
  Gathering Power, supported by arrows and shields. Both brands last 10s.
  Completed all six actual-map tests, but had lower crowded-map throughput
  and less spare health than the strongest alternatives. Choose for the playstyle.

Shielded Vanguard Starter — 30 points: early route into the 60-point version.
  Includes recovery, Heavy Blows, Fury, arrows, shields and basic mana sustain.
  Cleared Cinder Paddock and the Verdant Warden without equipment. Later
  crowded maps killed it: use the 60-point build or improve your gear there.
  The next point toward the full build buys Gathering Power.

COMPARISON

Build                  Tough-pack DPS   Boss DPS   Actual Eyecicle kills/min*
Righteous Bulwark           3216           1649             142–147
Venom Volley               2415            858             122–131
Shielded Vanguard          2796            793             141–142
Crimson Arrows             2171           1999              99–102
Elemental Warden           2268            812              75–82

Tough-pack and boss DPS are from synthetic 60-second encounters: 9 x 2,500 HP
targets and 1 x 100,000 HP target. DPS includes all elapsed time and respawns.
*Actual Eyecicle results use Cold Stare Gallery (formerly map 9), with 21 enemies,
two seeds.
All five full builds survived all six actual-map tests with both seeds.

Actual maps checked: Cinder Paddock, Verdant Warden, Cold Stare Gallery,
Kevin's Cold Storage (Kevin the Frost Lord), Salmen, and Brine and Punishment.

HOW THIS WAS ANALYZED

173 distinct, connected 60-point candidates were tested using the game's real
100ms combat simulation. No equipment, upgrades, developer items or bonus points
were used. Trials lasted 60 seconds; the archetype winners were checked with
two extra seeds, then against six actual maps with two seeds. The connection
rules allow travelling either direction along a link; each allocation includes
the paths needed to reach its selected nodes.

After review, 51 connected one-point replacements were compared for inactive
upgrade leaves. Vanguard's Deep Wounds became Forking Arrow; Crimson Arrows'
Poison Execute became Singled Off. Both corrected builds were rechecked on the
same scenarios and actual maps, and both retained full-HP survival there.

This is a heuristic comparison, not an exhaustive proof of optimality. Gear,
enemy formation, fight duration, random rolls and later tree edits can change
the ranking. Gold nodes help gold progression, not experience gained per kill.
Low-level areas can be respawn-limited, which makes extra DPS less useful there.

Each JSON includes allocationOrder: a connected order for spending points by
hand. Full imports require the stated total and apply the entire allocation.
analysis.json contains the measured results and the source-tree SHA-256.
scripts/analyze-builds.js documents the reproducible search and benchmarks.
