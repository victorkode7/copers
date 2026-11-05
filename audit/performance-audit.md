Performance audit — 5 November 2026

Rendering and effect positioning are the strongest optimization opportunities in the measured fixtures. The fixed-step combat simulation and small-profile saves are comparatively inexpensive. No production JavaScript, CSS, combat rules, or save formats were changed for this audit.

**Measurement scope and limits**

- Traced `index.html` into the combat loop, retained combat DOM, mastery, Canvas Reap renderer, shared WebGL renderer, loot effects, save compatibility, and offline processing/cache code.
- Used isolated Chrome profiles with synthetic equipment/content fixtures, deterministic combat randomness, and no existing player saves. Automatic game intervals were disabled; rendering scenarios used a native 100 ms interval. Effects retained their normal lifetimes and animation frames between ticks.
- Desktop: 1440 × 1000; narrow: 390 × 844; DPR 1, eight logical processors, Headless Chrome 156, ANGLE/NVIDIA RTX 3070/D3D11. The narrow case is a desktop viewport test, not a throttled mobile-device benchmark. Approximately 240 animation frames per second were observed in light workloads.
- Rendering: three rounds of 15 ticks per scenario, 1.5 simulated seconds per round. These are short burst samples. The harness's `p95TickMs` is effectively the maximum with only 15 observations; below it is described as the slowest update, not a stable tail-latency estimate. Warm-up and effect scheduling introduce variability.
- Simulation: 600 fixed 100 ms steps (60 simulated seconds), one discarded warm-up, three uninstrumented timed repetitions, then an instrumented repetition; identical state digests were required across repetitions.
- Reap load: sustained 0/8/32/64 active casts for about 1.8 seconds each, replenishing naturally expired casts. These isolate rendering and do not apply combat damage. Separate combat scenarios exercise actual Reaping Echo kills and queues.
- Save: 80 construction/serialization/storage measurements at each of 9 and 100 monsters. Offline: two 60-second backlogs. Mastery: 20 purchase/refund pairs plus idle mastery rendering.
- Timings for nested instrumented functions are inclusive and must not be added together. CDP layout/style timings include browser work between ticks; renderer-process task time excludes GPU-process execution. Instrumentation adds overhead. A separate diagnostic run captured the first twelve geometry reads taking at least 1 ms; its timings are not pooled with the baseline.
- The combat spawn limit is 100. Desktop fixtures resolved to three columns and narrow fixtures to one; cone targeting therefore differs by viewport. Compare before and after within the same viewport, not kill totals across layouts.

Raw results: [desktop rendering](performance-render-desktop.json), [narrow rendering](performance-render-narrow.json), [simulation](performance-core-desktop.json), [Reap load](performance-effects-desktop.json), [slow-read call stacks](performance-render-diagnostic.json), [offline catch-up](performance-catchup-desktop.json), [saves](performance-save-desktop.json), [mastery interactions](performance-mastery-interactions.json). Memory results are discussed below.

| Scenario | Desktop median update | Narrow median update | Desktop slowest update across rounds | Narrow slowest update across rounds |
| --- | ---: | ---: | ---: | ---: |
| Normal, 9 enemies | 1.6 ms | 1.5 ms | 2.5–7.9 ms | 3.4–11.9 ms |
| Normal, 64 enemies | 4.3 ms | 3.9 ms | 5.9–7.8 ms | 5.4–19.4 ms |
| Fast attacks + Reaping Echo, 64 enemies | 5.8 ms | 5.4 ms | 24.9–46.7 ms | 18.5–42.8 ms |
| All skills, 64 enemies | 13.0 ms | 10.9 ms | 163.2–224.3 ms | 132.4–175.5 ms |
| Inventory open, hidden combat with 64 enemies | 2.9 ms | 3.2 ms | 4.7–15.6 ms | 4.0–6.6 ms |
| Mastery open, 64 enemies | 0.6 ms | 0.6 ms | 1.1–1.9 ms | 1.5–2.3 ms |

Median update is the median of the three per-round medians. Each update includes simulation and synchronous presentation, not all asynchronous Canvas/WebGL/compositor work.

**Prioritized findings supported by measurements**

1. **Separate status/loot mutations from effect geometry reads. Highest measured stall priority.**

   Files/functions: `js/game.js:428` (`flushCombatEffects`), `js/game.js:723` (`showPoisonStackProc`), `js/combat-webgl-effects.js:158` (`pulse`/`box`), `js/loot-effects.js:45` (`reposition`/`drop`).

   Cause: effect closures reveal status indicators and replace their text, then immediately request their bounds for glows; loot presentation also changes DOM and reads `combatStatus` bounds repeatedly. The batch WeakMap avoids duplicate measurements of one element, but does not prevent layout when different elements are first measured after intervening writes. Animation restart batching already exists and should remain.

   Evidence: the all-skills desktop rounds produced 127–150 layouts per 15 ticks, versus 1–2 in normal combat. One baseline round spent 214.6 ms inside 285 `getBoundingClientRect` calls and 372.8 ms in synchronous presentation, against 7.2 ms simulation. Diagnostic stacks identify `showPoisonStackProc → restartCombatAnimation → CombatWebGLEffects.pulse → box`, and `LootEffects.drop → sync/reposition → statusBounds`. A diagnostic read took 271.6 ms, but this outlier includes browser initialization/scheduling and is not a recurring per-indicator cost.

   Improvement: introduce effect presentation phases: apply visibility/text changes, measure required unique elements, then emit glows and position overlays. Coalesce loot positioning once per presentation batch and share the current status bounds. Keep updated indicator dimensions, visual event ordering, and gameplay execution unchanged; do not cache a hidden indicator's zero rectangle.

   Expected benefit: fewer forced layouts and smaller effect-burst stalls, including the WebGL path. Effort: medium. Regression risk: medium, particularly glow alignment and loot positioning during scroll/resize. No numeric speedup has been established.

2. **Remove duplicate Reap setup and per-frame target measurements. Best first implementation because it is narrowly scoped.**

   Files/functions: `js/scythe-reap-effect.js:169` (`ScytheReapEffect.tick`), `:220` (`compactSize`), `:241` (`ReapSprite.show`), `js/game.js:449` (`getCombatEffectCard`).

   Cause: `show()` reads every card's bounds to compute `layout().size`, then discards that size and uses `compactSize(card)`. Only the primary and adjacent targets are needed for the facing calculation. `compactSize` caches its result but still performs style/size reads to construct the key on every call. During animation, each cast separately resolves its card and reads its rectangle. Outside `flushCombatEffects`, resolving a card allocates an array and scans the entire roster. Many casts share targets.

   Evidence: actual fast-Reap combat made 2,957–3,809 rectangle reads in each 1.5-second desktop round, compared with 15 for normal 64-enemy combat. In the isolated 64-active-cast test, 244 Reap animation callbacks made 15,489 card lookups and 15,489 rectangle reads in 1.81 seconds. Instrumented lookup time was 415.1 ms within 883.9 ms inclusive Reap tick time. The existing card Map and bounds WeakMap apply only during the synchronous effect flush, not these animation callbacks. Diagnostic stacks also show a 9.3 ms initial compact reference-probe layout; that probe is already cached and is not recreated for every cast.

   Improvement: remove formation-wide measurement when calculating facing; retain the current compact size and midpoint/diagonal calibration. Maintain an ID→element index with roster-generation invalidation. In each Reap animation callback, resolve and measure each unique target once, then share that result across casts. Refresh rectangles each frame so scrolling and plate shaking still track correctly. Invalidate compact sizing on actual host size/font changes, using the existing resize/font invalidation as the starting point.

   Expected benefit: less allocation, roster scanning, and geometry work as casts overlap, with unchanged sprites, cast counts, size, and timing. Effort: small to medium. Regression risk: low for removing the unused size calculation and a per-frame cache; medium for persistent sizing invalidation. Avoid a cross-frame rectangle cache without proper invalidation.

3. **Stop updating hidden combat cards.**

   File/function: `js/game.js:3251` (`renderCombat`/`renderCombatContent`).

   Cause: `renderCombatContent` traverses and formats all enemy cards while inventory hides `mapView`. The visible-only checks already applied to crafting, inventory, and skill-tree panels do not apply to combat. There are mutation guards and retained card views, so this is repeated traversal/calculation rather than wholesale DOM rebuilding.

   Evidence: with inventory open and 64 enemies, synchronous presentation consumed 44.0–55.7 ms per 15 desktop ticks, despite no visible combat. The median whole update was 2.9 ms. Narrow median was 3.2 ms. Mastery already takes an early return and is substantially cheaper.

   Improvement: keep simulation, rewards, tutorials, and required renderer cleanup active, but defer card presentation while its parent view is hidden. Mark it dirty and refresh fully on return. Preserve saved formation columns while hidden, as `updateCombatFormation` currently does. Ensure graphics/loot layers are still cleared when switching views.

   Expected benefit: remove most hidden combat presentation work during other activities. Effort: small to medium. Regression risk: medium because view transitions and targeting columns must remain consistent. Extending this to offscreen cards in a visible roster is a separate, unmeasured optimization and needs visibility/scroll testing.

4. **Use dirty sections after kills and avoid placing the final offline render outside the responsiveness budget.**

   Files/functions: `js/game.js:3456` (`render`), `:2174`/`:2213` (`renderWorlds`/`renderMaps`), `:4493` (`processCombatBacklog`), `js/arrow-skills.js:19` (`updateCombatFormation`).

   Cause: a kill escalates to full `render()`, updating unrelated header/navigation/map metadata even if only rewards and combat changed. Some fields are assigned unconditionally. The subsequent presentation performs geometry reads after these writes. Offline simulation is correctly split into ≤8 ms batches, but its final synchronous render is not covered by that budget.

   Evidence: the fast-Reap desktop fixture produced six full renders during 15 ticks/21 kills. Maps and worlds are not individually the dominant measured costs: one representative round spent 1.6 ms in `renderMaps` and 0.6 ms in `renderWorlds`. The larger opportunity is reducing broad invalidation and the final geometry/layout cost. Two 60-second offline backlogs completed in 224.2/188.1 ms total, with one final render costing 34.5/40.3 ms. Their geometry reads accounted for 27.1/33.7 ms. There were no effect emissions or repeated full renders during catch-up.

   Improvement: track dirty rewards/XP, navigation unlocks, map progress, stats, and combat separately; use existing guarded text/attribute helpers for unchanged values. Read formation only when layout changes, preserving when those columns become authoritative for combat. For catch-up, commit authoritative state first, then schedule nonessential UI work around a minimal final visible update. Do not change fixed-step size, queued-hit ordering, elapsed time, or rewards.

   Expected benefit: less presentation work during rapid kills and a smaller catch-up completion hitch. Effort: medium. Regression risk: medium; all unlocks, level-up notices, visible totals, and foreground/offline results require regression checks. The figures do not establish a need to rewrite the simulation itself.

**Smaller concrete wins**

5. **Guard mastery progress writes before the existing render-signature return.** `js/map-mastery.js:87`, `render()`: the progress maximum/value/ARIA label and some button attributes are assigned before checking whether the tree changed. Idle mastery generated 90 mutation records per 15 ticks in both layouts, while its tree remained retained. Use guarded attributes/progress properties and, only if later justified, a revision key for the serialized signature. Expected benefit: small reduction in idle DOM churn; measured mastery rendering is already inexpensive. Effort/risk: small/low. Purchases/refunds measured 3.3/3.2 ms median, 7.1/4.8 ms sample p95; 40 successful transactions made 40 saves. Keep that durable transaction behavior.

6. **Exclude archival Reap sheets from offline packaging.** `scripts/update-offline-cache.ps1:24`, `js/offline-assets.js:40`, `offline-worker.js:10`: the generator includes every file under `assets`, and installation fetches the entire list. The unused `reap-sheet-v1.png` and `reap-sheet-v2.png` alone total 3,776,185 bytes (3.60 MiB), plus prompts and source assets. The legacy `js/reap-sprite-player.js` still references v2, but is not loaded by any project HTML; the current `index.html` loads `js/scythe-reap-effect.js`. Exclude the legacy module and its assets together from shipping, while retaining originals outside the shipping allowlist. Expected benefit: fewer installation/download/cache bytes, not a measured FPS increase. Effort/risk: small/low if offline-required current assets remain included. Network installation duration was not profiled.

7. **Precompute the current weapon hilt mask and avoid loading a redundant default blood source.** `js/scythe-reap-effect.js:18`, constructor/`maskHilt`: default startup retains the original weapon and a same-size masked Canvas; the weapon is actually 3072², as its asset metadata records. The mask is cached once, so this is startup/backing-store work, not per attack. A 3072² RGBA surface has a nominal 36 MiB pixel footprint; actual committed CPU/GPU memory was not measured. Defaults also load both normalized and already-cleaned blood sheets; only cleaned blood is drawn. Ship an equivalent pre-masked weapon and use the cleaned blood's own dimensions on the default path, retaining custom-source preparation support. Expected benefit: fewer decoded/backing surfaces and less startup processing; size of the realized saving requires measurement. Effort: small to medium; risk: medium, requiring alpha, shaft, frame-boundary, and alignment comparisons. Blood cleanup is already precomputed for default assets; do not add another runtime cleanup pipeline.

**Already optimized; no rewrite recommended from these results**

- Core simulation medians for 60 simulated seconds: 20.9 ms (9 normal enemies), 16.1 ms (9 fast), 44.5 ms (100 normal), 66.4 ms (64/Reaping Echo), 60.8 ms (64/all skills). Tick p95 was 0.1–0.5 ms in these fixtures. The apparently faster fast-attack case is not evidence that fast combat is intrinsically cheaper; these short synthetic cases exercise different branches and browser warm-up.
- Per-batch combat stat caching, persistent skill bonus caching, monster definition/index caching, poison forecasts, retained enemy card views, guarded combat text/attributes/transforms, loot-table structure signatures, and retained map buttons already exist. `WorldContent.applyBackground` also guards actual background writes. Do not recommend these as missing systems.
- `saveGame()` returns while `simulatingCombat` is true. The Reap simulation recorded 859 calls to that guarded function, but zero serialization/storage writes. Normal periodic saves are limited to approximately once per second. The 9/100-enemy fixtures serialized 4,998/20,924 bytes and saved in 0.1/0.2 ms median. Some individual substeps fell below timer resolution. These are small inventory profiles; they do not establish costs for unusually large imported saves. Do not reduce save reliability on this evidence.
- Catch-up retains fixed steps, yields after its simulation budget, suppresses VFX, coalesces final rendering, and has paused-state fast forwarding. One minute of active catch-up is measured here; very long absences and converter-heavy profiles need separate representative runs before altering the algorithm.
- Reaps use one shared Canvas 2D overlay and one animation loop per `ScytheReapEffect` instance, including when other effects use WebGL. There is no per-cast Canvas or animation loop. The shared WebGL renderer already batches effects, caches ambient vertices, skips geometry uploads when unchanged, stops without active work, and handles context loss/visibility/settings. Effect adapters retain their fallback path.
- `css/combat-settings.css:28` already disables duplicate CSS sprite effects, filters, shadows, and some status animations when the WebGL layer is active. `css/game.css` still provides the HTML/SVG fallback, plate shaking, and status styles. The measured stalls occur with WebGL selected despite those overrides. Separate fallback paint/GPU timings were not collected; removing shadows or shakes would be a visual trade-off without a measured benefit here. No blanket `will-change`, containment, or virtualization change is justified by these measurements.
- Reap `tick` allocates temporary arrays and paint/frame objects and redraws at display refresh even between its sixteen logical frames. This is observable source work, but the independent cost of those allocations/redraws was not isolated. Investigate it only after geometry/lookup changes; any frame skipping must also account for moving cards, scroll, fade, reduced motion, and callbacks. Moving all sprites into WebGL or redesigning buffer allocation is not justified by a GPU measurement in this pass.
- Level-up cleanup cancels its timer/animation frame, disconnects its observer, and removes temporary scroll/resize listeners. Tooltips disconnect their observer/listeners on close. Notification positioning uses one coalesced animation-frame callback. Source review did not identify an accumulating per-trigger listener registration in these paths; no notification/tooltip long-session heap soak was performed.

**Memory and long-session interpretation**

The initial 640-cast cleanup test ended every cycle with zero active casts and zero effect overlays, with stable DOM node counts. The post-GC heap changed from 2,007,304 to 2,120,052 bytes, which can include warm-up and is insufficient to diagnose a leak. See [initial memory results](performance-memory-desktop.json).

The longer [Reap soak](performance-memory-soak-desktop.json) completed 160 cycles × 64 casts = 10,240 casts over approximately 115 seconds of scheduled waits. Every cycle ended with zero active casts and zero overlays; document element count stayed exactly 5,477. CDP node count before/after was 7,758/7,758. Post-GC JS heap changed from 2,007,996 to 2,123,488 bytes: about 113 KiB above its own cold baseline, similar to the ten-cycle run's retained difference rather than proportional to cast count. This is encouraging cleanup evidence, not proof against long-session or GPU-memory leaks. These runs had no gameplay simulation or view transitions. The rounded `performance.memory` samples in the JSON are not suitable for heap-trend analysis; use CDP post-GC metrics instead.

Full-day memory growth, GPU resource retention, and detached-node retaining paths remain unverified. For release validation, run 30–60 minutes of real combat with repeated map/mastery/inventory transitions, notifications, hidden/visible tab changes, and effect-setting changes; take comparable forced-GC heap snapshots and inspect retaining paths if retained counts grow. A bounded short stress test cannot prove absence of a leak.

**First implementation and before/after benchmark**

Start with finding 2, specifically removing the unused formation-wide reads and sharing card lookup/geometry within each Reap animation frame. It is tightly contained, attacks a measured scaling cost, and can preserve every visible cast and current targeting/size. Follow with finding 1 for the largest mixed-skill burst stalls.

1. Use the same hardware/browser, viewport, DPR, effect settings, seed, enemy stats, attack interval, and sprite files. Keep desktop and narrow runs separate. Warm up each run. Preserve baseline JSON rather than overwriting it with the optimized result.
2. Compare fast-Reap combat and sustained 8/32/64-cast fixtures. Count card lookups and rectangle reads, CDP layout count/duration, renderer task time, frame-gap distribution, and synchronous tick time. Add five 60-second samples for credible tail-latency assessment; the supplied short baseline is a screening tool.
3. Verify identical simulation state/rewards/kill and pending-hit outcomes at fixed simulated timestamps. Preserve the saved formation for offline processing. Run `tests/reap-cone-smoke.js`, `tests/reap-echo-smoke.js`, `tests/scythe-reap-smoke.js`, and `tests/reap-local-file-smoke.js` through the project's existing smoke runner after an implementation. Validate map changes, resize, scroll, plate shaking, rapid casts, reduced motion, renderer fallback, and cleanup. This investigation did not modify production code or rerun those implementation regressions.
4. Reject a result that improves timing by changing target selection, damage, attack schedule, reward count, catch-up totals, sprite dimensions, overlapping blood order, or visible effect count. Effect caps, reduced resolution, shorter trails, and fewer casts are optional visual trade-offs, not equivalent optimizations, and are not proposed as the default fix.

Reproduce the audit using `scripts/run-performance-audit.ps1` with phases `core`, `render`, `effects`, `save`, `catchup`, `interactions`, or `memory`. Example:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-performance-audit.ps1 -Phase render -Rounds 3 -ReportPath audit/render-after-desktop.json
powershell -ExecutionPolicy Bypass -File scripts/run-performance-audit.ps1 -Phase render -Rounds 3 -ViewportSize 390,844 -ReportPath audit/render-after-narrow.json
powershell -ExecutionPolicy Bypass -File scripts/run-performance-audit.ps1 -Phase effects -ReportPath audit/effects-after.json
powershell -ExecutionPolicy Bypass -File scripts/run-performance-audit.ps1 -Phase memory -MemoryCycles 160 -ReportPath audit/memory-after.json
```

Run browser commands sequentially: the runner uses a shared temporary HTML fixture, isolated browser storage, and a temporary Chrome profile. It removes the HTML fixture after each run. The temporary browser profile directories are retained under the system temporary directory; they are test artifacts, not game runtime memory growth. The runner is Windows/Chrome-specific. No production dependencies were added.
