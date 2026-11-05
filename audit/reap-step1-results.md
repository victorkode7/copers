Reap optimization 1 — lookup and geometry reuse

Implemented only the first agreed change. Other audit recommendations remain pending the user's in-game bug check.

- `js/game.js`: retain an enemy-card lookup outside synchronous effect batches; validate the card's parent and ID before using it, rebuild on a miss, and clear the index on roster rebuilds.
- `js/scythe-reap-effect.js`: measure each unique target once per animation frame. Cache positions only for that callback so movement, scroll, shaking and resizing remain live. Remove formation-wide setup reads whose calculated size was unused. Keep the existing compact sizing cache and invalidation unchanged.
- Updated script query versions and regenerated the offline manifest.

No damage, attack schedule, targeting, rewards, save schema, sprite artwork, display size, cast count, or layer order changes were made.

**Validation**

Seven browser runs passed, totaling 212 checks: the existing scythe sprite, cone targeting, Reaping Echo, and ordinary local-file permission suites; plus new geometry regressions on desktop, a 390 × 844 viewport, and reduced motion. Coverage includes all animation frames, hilt/shaft appearance, blood layering, delayed 100%/300% physical damage, corpse-origin chains, save/load, foreground/offline equivalence, consistent size across target counts, current-card lookup after replacement/removal/renaming, target movement/resize, hidden targets, and cleanup. Local-file checks also select both WebGL and SVG settings.

New geometry regression: sixteen overlapping casts on two targets produce two geometry reads per frame, keep all sixteen weapon/blood pairs and individual callbacks, and remeasure after movement on the next frame. A single-target cast in a 64-card roster no longer measures unrelated enemy cards.

The five deterministic 60-second simulation scenarios matched their pre-change outcome hashes:

| Scenario | Before and after hash | Kills |
| --- | --- | ---: |
| Normal, 9 | c3e7c4b3 | 0 |
| Fast, 9 | e895fec5 | 0 |
| Normal, 100 | 64c6d4b6 | 0 |
| Reap chains, 64 | 5fb571ae | 859 |
| All skills, 64 | 2fb247e1 | 1920 |

The hash covers player HP, monster state, kills, pending Reaps, and the attack timer. The visual change does not modify reward code; this hash is not a separate exhaustive reward/save-format test.

**Measurements**

Same isolated headless Chrome/GPU setup as the audit. Sustained 64-cast load for approximately 1.8 seconds, distributed across eight target cards:

| Metric | Before | After |
| --- | ---: | ---: |
| Reap animation callbacks | 276 | 339 |
| Rectangle reads, including fixture setup | 17,474 | 2,697 |
| Rectangle reads / animation callback | approximately 63 | approximately 8 |
| Inclusive card lookup time | 466.4 ms | 25.4 ms |
| Inclusive Reap tick time | 1,112.0 ms | 581.7 ms |
| Animation frame-gap p95 | 8.4 ms | 8.4 ms |

These are single short stress samples with instrumentation. The lookup count itself is still per cast; each lookup now avoids allocating/scanning the roster. Read counts are normalized by actual callback count because the browser schedules different numbers of frames. No frame cap or visual reduction was introduced.

The real-time fast-Reap scenario made 1,632–1,949 rectangle reads per 15 updates after the change, versus 2,957–3,809 in the audit's three baseline rounds. All rounds still produced 21 kills. Median synchronous update time across rounds was 6.5 ms after versus 5.8 ms before; therefore these short whole-combat samples do not demonstrate a general update-time or FPS gain, despite the reduced geometry work. Remaining layout stalls and Canvas drawing are outside this change.

Raw measurements: `reap-step1-before-effects.json`, `reap-step1-after-effects.json`, `reap-step1-before-core.json`, `reap-step1-after-core.json`, `reap-step1-after-render-desktop.json`. Baseline real-time rounds remain in `performance-render-desktop.json`. Browser check transcripts are in `reap-step1-*.txt`.

**In-game check before the next change**

Reload the game and try overlapping Reaps/Reaping Echo in a crowded fight, then a lone enemy, a map switch, scrolling, and resizing. Check that targeting, sweep size, diagonal alignment, blood layering, and cleanup look the same. No second optimization has been started.
