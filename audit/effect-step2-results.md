Optimization 2 — batched status glows and loot presentation

Implemented this presentation change only. Hidden combat rendering, dirty UI sections, asset packaging reductions, and other audit recommendations remain pending the user's in-game check.

- `js/game.js`: defer glow restarts until the current effect batch finishes its status visibility/text updates. Preserve each GPU pulse request, including repeats and nested batches. Skip indicators removed before presentation. Continue using the existing CSS restart batch and geometry cache.
- `js/loot-effects.js`: collect a combat batch's drop presentations, measure the status anchor and flash sources before inserting reward DOM, then place the completed row once. Preserve reward order, merging, unique persistence/dismissal, map clearing, and synchronous standalone calls. Scroll/resize positioning measures first and applies positions afterward. No new timers, animation loops, or listeners were added.
- Script query versions were advanced and the offline manifest regenerated. Combat simulation, damage, targeting, attack timing, reward calculations, and save formats were not edited.

**Validation**

Ten browser runs passed, totaling 335 checks:

- New batching tests on desktop, 390 × 844, and reduced motion.
- Existing HTML/SVG loot tests on desktop and narrow screen.
- Existing WebGL effects and projectiles, including context loss/restoration and effect switches.
- Existing ability Poison, Bleed, and Reaping Echo tests, including applicable foreground/offline comparisons.

The targeted test verifies that sixteen indicators are revealed before their glow geometry is read, all 33 requested pulses (including duplicates/nesting) are emitted with correct dimensions/centers, and sixteen rewards merge using one status-anchor measurement. It also checks unique-drop dismissal, fallback plate bounds, map changes within a batch, removed indicators, clearing during a batch, exception recovery, disabled effects, and immediate standalone display.

A pre-change run exposed an existing mismatch in `loot-effects-smoke.js`: it asserts an HTML plate highlight while the default renderer can use WebGL. The smoke runner now explicitly selects SVG for that legacy visual suite, following its existing convention. WebGL is separately checked by the GPU suites and the new batching test. One new detached-indicator test fixture initially inherited an active animation class from its cloned SVG indicator; resetting that class corrected the fixture, and the final runs passed.

All five deterministic 60-second combat outcome hashes match optimization 1's baseline: `c3e7c4b3`, `e895fec5`, `64c6d4b6`, `5fb571ae`, and `2fb247e1`. Reap-chain and all-skills fixtures retain 859 and 1,920 kills respectively. Hash coverage is player HP, monster state, kill totals, pending Reaps, and attack timer; this is not an exhaustive independent save-format test. Reward preservation is additionally covered by the loot and presentation-state checks.

**Measurements**

Fresh before/after desktop rendering profiles used the same isolated browser fixtures, GPU, 100 ms cadence, and three 15-update rounds. The all-skills/64-enemy case produced 64 kills in every round.

| Metric per round | Before | After |
| --- | ---: | ---: |
| Layout count | 133–145 | 61–77 |
| Rectangle reads | 284–285 | 93–94 |
| Inclusive effect-flush time | 111.5–121.0 ms | 69.4–85.8 ms |
| Slowest synchronous update | 156.1–170.8 ms | 101.6–121.8 ms |
| Median update, median of rounds | 9.9 ms | 10.9 ms |
| Layout/style time, median of rounds | 377.9 ms | 388.1 ms |

The measured burst and layout-count reductions support the targeted change. Overall median update time, layout/style duration, and frame gaps do not establish a broad FPS improvement; other rendering and animation costs remain. Samples are short and instrumented, and GPU-process time is excluded. The narrow screen received functional/alignment checks in this step, not a separate performance claim.

Raw results: `effect-step2-before-render-desktop.json`, `effect-step2-after-render-desktop.json`, and `effect-step2-after-core.json`. Final browser transcripts are `effect-step2-after-loot-smoke.txt`, `effect-step2-batch-*.txt`, `effect-step2-webgl-*.txt`, `effect-step2-poison.txt`, `effect-step2-bleed.txt`, `effect-step2-reap-echo.txt`, and `effect-step2-loot-narrow.txt`. The intentionally preserved pre-change failing legacy test is `effect-step2-before-loot-smoke.txt`.

**In-game check before continuing**

Reload and try a busy fight with Poison/Bleed and overlapping Reaps. Check that status glows stay attached to their indicators, drops merge beside the combat badge, unique rewards remain clickable, and scrolling/resizing/map changes clear or reposition effects correctly. Check both renderer settings if convenient. No third optimization has been started.
