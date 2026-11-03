COPERS PROGRESSION BUILDS — 27 OCTOBER 2026

COLORFUL GAME UI
The game uses css/game-theme.css for shared navy surfaces, vivid accents and
pixel-style frames. Only the game loads this layer; editor pages keep their UI.
Town retains green, ice-blue and turquoise world palettes, with brighter scenery
and a neutral navigation bar. Gameplay, resource costs and save formats are unchanged.
Available skill nodes keep their stat colors with a quiet dashed border; learned
nodes have a solid inner ring. Equipped sprites select their slot, while sprite
zoom remains available in the inventory list and crafting. The right-hand Loot
Drops window is removed; Damage Breakdown remains.
Skill-tree connectors are clipped outside node edges, including when zooming.
Piercing Arrow uses a tighter white glow in both SVG and GPU rendering.
Geometry, resource-card stability, text selection and map locking are covered by
tests/game-theme-smoke.js. Use -ViewportSize 390,844 with run-equipment-smoke.ps1
to check a real phone viewport independently of Chrome's desktop window minimum.

ORE AND SMELTERY
Mine output is now half the matching Lumber Outpost: 360 Ore/hour per production
step (tier x 10 + level), before Town Hall productivity.
W2 building 3 is Smeltery, unlocked by the W2 Town Hall reaching T1 and owning
a Mine. Purchase costs 50000 gold + 500 Planks + 1000 Ore.
Smelting uses exactly 10 Ore per Bar. Output starts at 10 Bars/hour per level,
reaching 100/hour at level 10, before Town productivity. Hourly output and upgrade
gains stay whole with Town Hall bonuses (19/hour at level 1 and 190/hour at level
10 with a T1 level-1 W1 Town Hall). Upgrades require the Mine
to keep pace and cost 100 Planks + 10 Bars + 10000 base gold with level scaling.
Bars are a Town resource with a 10000 storage cap. Full storage pauses smelting
without consuming Ore. Existing Mine levels, Ore stock and partial progress stay.

TIMBER DEPOT AND TOWN STORAGE
Building 5 unlocks as Timber Depot at Town Hall T3. Purchase costs:
250000 gold + 10000 Planks + 25000 Ore.
Base Town caps: 50000 Logs, 50000 Planks, 100000 Ore, 10000 Bars.
The Depot raises Log capacity to 100000 at level 1 and 1000000 at level 10.
Each upgrade costs 5000 x current level Planks, 10000 x current level Ore,
and 100000 base gold with normal 15% level growth. Every upgrade fits inside
the Plank/Ore caps. Resource cards show current amount and capacity.
Full stores pause production; a full Plank store does not consume Logs.
Existing over-cap stockpiles are preserved and remain spendable. Production
resumes after spending below the cap or increasing storage capacity.

BOSS MASTERY BALANCE
Menagerie bonus kills apply to non-boss encounters only. Each boss defeat
counts as exactly one kill. Boss mastery awards 2 points at 2x / 20x / 200x /
2000x the map kill goal, versus 10x / 100x / 1000x / 10000x for regular maps.
This is a fivefold reduction in boss thresholds, partially compensating for
the removed 10x kill bonus. Existing credited kills and earned points are kept.

TOWN COSTS AND RESOURCE DISPLAY
W1 Town Hall T0 upgrades cost 500 Logs each, plus the existing gold costs.
Lumber Outpost material costs now double per prestige tier, like gold:
T1 upgrades use 20 Planks, T2 uses 40, T3 uses 80. Ore starts at 160 per
upgrade at T4 and doubles after that. Prestige plank costs scale too.
Saw Mill's first prestige requires a T1 Outpost and costs 2500 gold,
1000 Planks and 10000 Ore. T1 upgrades cost 10 Planks + 10 Ore and scaled gold.
T1 plank output runs from 990 to 1800/hour before Town Hall bonuses. Mill
level upgrades do not require specific Lumber Outpost levels.
Resource cards keep fixed widths so changing numbers do not shift them.

TOWN PRODUCTION BALANCE
Town production and upgrade previews now display rates per hour.
Lumber Outpost output is reduced by 80%, to 720 Logs/hour per production step
(tier * 10 + level). The Saw Mill keeps 90 Planks/hour per step and uses 2 Logs
per Plank. At matching tier/level, log production is 4x the mill's consumption,
leaving 75% of the logs as surplus. T0 level-10 buildings produce 7200 Logs/hour
and 900 Planks/hour; after feeding the mill, 5400 Logs/hour remain.
Town Hall productivity boosts both rates equally. Stockpiles, existing Outpost
costs and levels are preserved. If a mill is ahead of
its Outpost, upgrade the Outpost to restore the intended surplus.

DEVELOPMENT TOOLS AND PLAYTEST PACKAGES
The source index.html loads optional dev/developer-tools.js. Developer mode
provides free spending and normal equipment Add/Delete tools. Admin equipment
is supplied automatically. Saved resource balances stay finite.
Development uses a separate save slot. Use "Copy playtest profile into
development" in the developer panel to copy existing progress explicitly;
the normal profile is preserved. Development exports cannot be imported into
the playtest build. Deleting equipment preserves crafting history and stored
rolls and allows the equipment to be obtained again.

To package a playtest from the project root:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-playtest.ps1
This creates a new timestamped folder and ZIP inside the project's playtest/
folder, without developer tooling
or editor pages, and with its own verified offline manifest. Share that ZIP.
Saved developer flags cannot enable tools when the module is absent. This is
build separation, not protection against editing a local browser game.

BALANCE UPDATE - 30 OCTOBER 2026
Monster packs and attacks now scale more smoothly across all three worlds.
Cold Stare Gallery has 9 enemies; World 3 now has regular encounters and a final
boss. Its placeholder XP and unlock goals have also been filled in.
The comparisons below describe the older 27 October balance. Current survival
results are in progression-balance.json: 348 seeded trials across all 29 maps,
four builds, no deaths. This includes a 30-point build without shields/freezing.
Rechecked with the Ice set's new HP/evasion permanent stats and empty crafted slots.
Rerun with tests/run-equipment-smoke.ps1 -TestScript tests/progression-balance-smoke.js.

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
