# Scythe Reap

The main page loads `js/scythe-reap-effect.js`. The existing Reap skill node
automatically uses it on attacks, with the existing four-target adjacency rules
and delayed combat damage. Rendering does not apply additional damage.

Reap deals 100% of physical damage to its primary target and 300% to each of
its up to three adjacent targets. The connected **Reaping Echo** node makes
each enemy killed by a direct Reap hit spawn another Reap at its corpse.
Those echoes hit up to three living neighbors for 300% and can chain on kills.
They do not consume an attack or trigger additional attack-only arrows or spells.
Other abilities, poison, and bleed cannot generate these echoes. Reap damage
appears separately in the damage meter. The original `reapPreview` ID remains
in saves; its displayed name is now Reap.

To preview in the website, open Settings, expand Developer Tools, enable
Developer mode, then click **Preview Reap**. Combat ability effects must be enabled.

## Trigger from game code

```js
await ReapSprite.ready;
ReapSprite.show(state.targetMonsterId);
```

For a reusable instance with independent settings:

```js
const reap = new ScytheReapEffect({
    size: 700,        // Full square sprite frame in CSS pixels.
    duration: 600,    // Milliseconds at speed 1.
    speed: 1,
    onComplete: ({ cancelled }) => console.log('Reap finished', cancelled)
});
await reap.ready;
const attack = reap.play({
    target: () => getCombatEffectCard(state.targetMonsterId),
    restart: true
});
```

The target's center is the fixed hilt pivot. A target lookup tracks DOM card
replacement and scrolling. Each cast retains its starting display size; the
canvas follows viewport resizing. `position: {x, y}` can replace `target` for a
fixed viewport position. Override `size`, `duration`, `speed`, and `onComplete`
per call. `restart: true` cancels this instance's previous casts. Otherwise,
concurrent attacks can finish independently.

The game adapter aims the midpoint of the rotating portion (frame 6 of frames
0–12) toward the diagonal target. It measures the actual card centers for one
constant `facing` angle in radians, while reach uses the compact reference size.
Weapon and blood share that facing; the sprite frames still supply the swing.
When no living diagonal is available, facing follows the selected cone direction.
The game measures a hidden compact formation once per viewport layout to set
one reference size for every encounter. One, two, or three enemies use that
same size as larger groups, regardless of their larger cards or dead slots.
The reference follows responsive layout changes and is removed immediately
after measurement; each active cast keeps its starting size.

`attack.cancel()`, `pause()`, `seek(frameIndex)`, and `resume()` support inspection.
`reap.clear()` cancels all casts and removes the overlay. Reduced motion is
detected automatically, using a static pose and fade. The game adapter also
clears on effect-settings changes and when the page becomes hidden.

An optional `onHit` callback fires once when playback crosses frame 5. Existing
game damage stays on the simulation clock (200 ms) so hidden tabs, offline
progress, or disabled visuals cannot change damage. Do not apply that damage
again from the rendering callback.

## Asset inspection and alignment

The supplied weapon is actually **3072 × 3072**, with sixteen **768 × 768** cells.
It is copied unchanged to `assets/effects/scythe-ccw-270-4x4.png`. Its hilt pivot
is the center of every cell. The frames already perform a 270-degree
counterclockwise turn; frames 12–15 are identical. Rendering adds only the fixed
cast facing, with no animated rotation, stretching, per-frame cropping, or
changes in display size.

The renderer prepares a cached copy of all sixteen weapon frames with just the
small hilt end masked out at the original pivot. A short transparency feather
softens that end while preserving the long shaft and blade. Source PNGs remain untouched;
frame dimensions, pivot, timing, and blood alignment are preserved. The prepared
sheet is shared by instances, so masking adds no per-frame processing.

`scripts/prepare-scythe-assets.ps1` preserves `blood-4x4-source.png`, separates
the fractional 1254-pixel grid at rounded boundaries, then uniformly fits each
cell inside a 512-pixel cell with transparent gutters. The result is
`blood-4x4-normalized.png`. Sampling isolated cells prevents adjacent-frame bleed.

The blood source does **not** exactly match the weapon's spatial or temporal
motion. The fitted correction rotates only the blood by −85 degrees, scales
it to 92%, suppresses its faint wind-up particles, and progressively reveals
the region behind the measured cutting edge. That transform remains constant
throughout the swing. Frames 13–15 fade its opacity to zero. Both layers use
one shared frame clock and genuine PNG alpha, preserving the dark weapon.
The weapon fades in frames 11–12 and disappears before the held frames 13–15
(about 488 ms into a 600 ms cast). Blood continues fading through the end.
Blood renders above all weapons, including when Reaping Echo casts overlap.

The game loads `assets/effects/blood-4x4-clean.png`, prepared ahead of time.
Opening `index.html` directly from disk works without canvas pixel-read access.
The procedural Reap module, styles, shader branches, and fallback hook are removed;
all renderer settings use the current sixteen-frame sprite effect.

The preparation step cleans the blood texture for its alignment. Low-alpha
background residue is removed with a soft threshold, restoring full opacity
by alpha 80/255. A 4% feather at each cell boundary hides source-frame cuts.
The progressive reveal is baked into this texture with soft angular boundaries
instead of a hard canvas clip. Bright arc pixels away from the boundaries keep
their original opacity. Run `scripts/prepare-reap-blood.ps1` after changing the
cleanup algorithm or source blood sheet, then regenerate the offline manifest.
Custom sources/alignments can still be prepared through `prepareBlood()` when
canvas readback is permitted; `preparedBloodSrc` can supply a prebuilt texture
for custom instances that must also work from local files.

Some source blood effects already touch cell edges. Preparation preserves all
available pixels but cannot restore details clipped in the original sheet.
`assets/effects/scythe-reap-assets.json` records per-frame edge contacts and
calibration. Exact artistic correspondence would require a matched blood sheet.

## Validation

Reap retains its Canvas pixels between animation callbacks when the visible
scene is unchanged. Timelines, hit callbacks and target tracking continue at
the normal callback rate. Source-frame, fade, position, cast, size/facing and
viewport/DPR changes redraw immediately; clearing the last cast also releases
the retained scene. This avoids duplicate GPU drawing on high-refresh displays
without capping animation speed, reducing quality or dropping casts.

Run the browser checks sequentially:

```powershell
powershell -ExecutionPolicy Bypass -File tests/run-equipment-smoke.ps1 -TestScript tests/scythe-reap-smoke.js
powershell -ExecutionPolicy Bypass -File tests/run-equipment-smoke.ps1 -TestScript tests/reap-cone-smoke.js
powershell -ExecutionPolicy Bypass -File tests/run-equipment-smoke.ps1 -TestScript tests/reap-echo-smoke.js
powershell -ExecutionPolicy Bypass -File tests/run-equipment-smoke.ps1 -TestScript tests/reap-local-file-smoke.js -RestrictFileAccess
powershell -ExecutionPolicy Bypass -File tests/run-equipment-smoke.ps1 -TestScript tests/reap-redraw-smoke.js -EnableGpu
powershell -ExecutionPolicy Bypass -File tests/run-equipment-smoke.ps1 -TestScript tests/developer-tools-smoke.js
```

For a captured in-game inspection frame, use `tests/scythe-reap-smoke.js?preview`
with `-ScreenshotPath scythe-reap-completed.png`. The runner also supports
`-ReducedMotion -ViewportSize 390,844`.
