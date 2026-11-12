# Profession skills

Profession logic tracks Alchemy levels separately from character XP, combat
skill points, the Skill Tree, map mastery, and Town building levels. There is no
Skills page; the Alchemy tab displays the level, XP, and progress bar.

Alchemy is the only defined profession. Successful brewing awards XP and levels
unlock materials and improve brewing success.

## Progression and storage

`js/professions.js` owns the definitions and DOM-free rules. Each profession starts
at level 1 and caps at 99. Total XP to reach level L is `50 * (L - 1) * L`:
level 2 needs 100 total XP, level 3 needs 300, and level 99 needs 485,100.
This initial curve is a tuning default, not a final balance decision.

Profiles save `professions: {version: 1, xp: {alchemy: 0}}`.
Levels are derived, never saved separately. Missing profession data in old saves
defaults to level 1. Invalid data rejects a save through the existing recovery
flow. New definitions default to zero XP when absent; unknown future IDs and
additional metadata survive save round trips. Full profile resets clear progress.

## Alchemy training

Recipe settings live in `js/alchemy-content.js`:

| Recipe | Required level | Material | Base XP per success | Initial success | Brew time |
| --- | --- | --- | --- | --- | --- |
| Moonveil | 1 | Gel | 10 | 70% | 10 seconds |
| Emberheart | 3 | Fang | 25 | 60% | 20 seconds |
| Twilight | 6 | Crystal | 60 | 50% | 30 seconds |

Only owned materials used by a level-unlocked recipe appear in the ingredient
tray. Locked recipes cannot brew, even through direct gameplay calls. Existing
discoveries and potion reserves survive the addition of level requirements.

Each level above a recipe's requirement adds 5 percentage points to success,
capped at 100%. The first potion of a discovery is guaranteed; remaining attempts
in that batch use the normal chance. All attempts spend ingredients. Only
successful attempts add potion duration and XP. Batch attempts run sequentially,
so levels earned during the batch improve subsequent attempts.

XP is `baseXP * 0.85^(level - recipeLevel)`. From level 10, multiply by
`0.001 * 0.1^(level - 10)` as well. This soft cap makes progression beyond
current content extremely slow without a hard level limit. These are initial
balance values. Fractional XP persists as `professions.alchemyXpRemainder`,
validated in `[0, 1)`, so tiny awards accumulate across reloads.

`Alchemy.brewBatch(profile, id, amount)` appends a batch to
the saved queue, returning `{id, queued}` or `false` for an invalid request.
`Alchemy.brew` retains a boolean API: true means a batch was queued. Neither call
grants potions, discovery, or XP immediately. The page saves the ingredient spend
and queue together; a failed save restores both. Ingredients are charged one
attempt at a time when that brew starts, including the first attempt immediately
if the station is idle. Waiting batches do not reserve or spend ingredients.

One brewing station accepts one recipe batch at a time, up to 10,000 attempts.
Additional batches are rejected until the current batch finishes or is canceled.
Older saved multi-batch queues remain loadable and finish in their original order.
`Alchemy.tick`
advances partial work using integer microseconds, resolves completed attempts,
and immediately starts the next attempt. It runs through the existing gameplay
simulation on every page, while dead, and during offline catch-up. Equipped
potion reserves are drained between brew completions to preserve chronology.
If ingredients run out, the queue waits without banking brew work. It resumes
when ingredients become available. Liquid production is advanced in order with
brewing so long offline steps start waiting brews at the correct time.

Queue entries save recipe ID, total and remaining attempts, partial work,
successes, failures, awarded XP, and whether the active attempt has paid its
cost. Older queues retain prepaid ingredient credit to avoid charging twice.
A saved RNG state makes brewing independent
of combat randomness and produces the same results across reloads and elapsed
step sizes. Tests may inject a random function as `Alchemy.tick`'s third argument.
Old profiles migrate with an empty queue. Invalid queues reject the save through
the existing recovery flow. Completed batch summaries remain in `alchemy.lastBrew`.

While a batch is queued, the page locks ingredient selection and replaces the
recipe controls with Cancel. The cauldron animates its separate liquid and fire
sprite sheets only while an attempt is actively brewing. Waiting for ingredients,
completion, and cancellation stop the animation; reduced-motion settings disable
it. The scene follows the active recipe after loading or returning to the page.

The active hand-drawn cauldron PNG is 64 x 64. Blue and red liquid sheets are
256 x 128 with eight 64 x 64 frames in four columns and two rows. The fire sheet is 1774 x 887,
with eight 443.5 x 443.5 frames. Each sheet uses its own native frame spacing.
Steam is no longer rendered.
The source PNGs are copied unchanged into `assets/alchemy/` as
`cauldron-pixel-idle.png`, `cauldron-blue-liquid-4x2.png`, and
`cauldron-red-liquid-4x2.png`. The owner's blue source is spelled
`cauldron_blue_riquid.png`.
Shared 192 x 192 SVG canvases keep all layers
registered responsively. A nested SVG viewport selects the visible liquid
independently of the transparent frame padding. Coordinates are
documented in `assets/alchemy/cauldron-sprites.json` and applied in `index.html`.
CSS advances frames at 8 fps. Moonwater uses the original blue palette; Ember
Oil uses the original red palette. Mixed recipes tint the blue sheet to the
recipe color with an SVG color matrix that preserves alpha and shading.
Liquid frames advance by animating SVG image x/y coordinates, rather than
compositing translated images through nested filters. Blue/red sheets bypass
filtering; mixed-color filtering applies to a fixed 192 x 192 group region.
This avoids stale clipped areas during playback. Fire keeps its independent
transform-based sheet animation.
The room background is separate from the cauldron.
The room uses `assets/alchemy/apothecary-background.png`, copied unchanged from
the owner's `Big sprites/backgrounds/Apothecary.png`, with pixelated scaling.
The scene keeps the room's square aspect ratio and centers the background at
112% size to widen the hearth around the pot. The cauldron canvas occupies
`(97, 105, 120, 120)` within a 300 x 300 scene, placing its feet on the ash inside
the stone ring. The room zoom and cauldron position scale with the scene width.
Sheets play forward from frame 0 through 7 in a one-second loop. Replacement
art should make the final-to-first transition seamless; playback never reverses.
The liquid shares the cauldron's native 64 x 64 layout. The mask includes space
above the opening for rising bubbles. A second copy of the cauldron PNG, clipped along the curved
front rim, renders over the liquid.
All layers retain the shared canvas and pixelated scaling; PNG bytes are unchanged.
Fire renders over the cauldron's lower belly, between its feet, with flame tips
reaching the lower sides. It keeps its original warm colors independently of
recipe tint. It is visible only while an attempt is actively brewing, and
disappears when waiting for ingredients, on completion, or on cancellation.

`Alchemy.cancel(profile)` discards the remaining queue and partial brew work.
Completed potions and earned XP remain; ingredients already spent are not
refunded, and unstarted attempts incur no cost. The page saves cancellation
atomically and restores the queue if saving fails.

## Connecting future activities

After a successful action, call
`Professions.awardXp(profile, 'alchemy', amount)` with a positive safe integer.
It returns `{added, level, levelsGained}`, clamps at the cap, and returns `null`
for invalid IDs or awards. The caller owns saving, rendering, and notifications.
Use the same call from foreground and offline gameplay; award for completed
actions once, rather than from UI refreshes or elapsed time alone.

`Professions.progress(profile.professions, id)` returns the level, total XP,
XP earned within the level, required XP, capped status, and progress fraction.

Future recipes can set higher required levels, XP, and success values in content.
Revisit the temporary soft cap as more content becomes available.

Validation: `node tests/professions-node.cjs` and
`./tests/run-equipment-smoke.ps1 -TestScript tests/professions-smoke.js`.
Training-specific checks:
`./tests/run-equipment-smoke.ps1 -TestScript tests/alchemy-training-smoke.js`.
Queue and offline checks:
`./tests/run-equipment-smoke.ps1 -TestScript tests/alchemy-queue-smoke.js`.
Animation and cancellation checks:
`./tests/run-equipment-smoke.ps1 -TestScript tests/alchemy-animation-smoke.js`.
Sprite loading, registration, frame selection, and responsive checks:
`./tests/run-equipment-smoke.ps1 -TestScript tests/alchemy-sprites-smoke.js`.
