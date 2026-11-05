Optimization 3 — skip unchanged Reap canvas presentations

The user reports approximately 70% Chrome GPU usage with WebGL selected versus 10–15% in Firefox, and a substantial decrease when Abilities are disabled. That isolates ability presentation as a contributor, but does not establish Reap as the sole cause or reproduce the interactive GPU percentages.

Implemented one targeted Reap rendering change. The animation still evaluates time, hit/completion callbacks, and current target positions on each animation callback. It retains the existing Canvas pixels when the complete visible scene matches the last presentation: cast identity/order, source frame, target coordinates, size/facing, layer opacities, and viewport/DPR. Any change redraws the scene with the same weapon-before-blood ordering. Finishing the final cast releases the cached scene. There is no frame-rate cap, effect-count limit, smaller sprite, lower resolution, or simulation change.

**Validation**

Eight Reap browser runs passed, totaling 237 checks: new redraw tests on desktop, 390 × 844, and reduced motion; the existing sprite, cone, Echo, geometry, and ordinary local-file suites. Coverage includes retaining visible pixels without draw calls, immediate source-frame changes, paused/seeked frames, transparent ending frames, live reduced-motion fades, target movement/resizing/scroll, cancelling overlapping casts, detached targets, hit-callback cancellation, retriggering, and DPR/viewport changes that keep the same backing-store dimensions. Existing tests cover sixteen frames, artwork/shaft/hilt, size, layering, 100%/300% damage, chain behavior, save/load, foreground/offline agreement, both renderer settings, and cleanup.

Five additional pre-push suites passed for mastery gestures, notifications, Town unlocks, level-up behavior, and save compatibility: 120 checks. Combined total for this step and pre-push checks: 357 passing assertions.

The first redraw test used byte-exact repeated pixel-readback checksums. Those differed even while instrumentation confirmed exactly one draw and one clear. The test now checks retained visible alpha plus operation counts; it does not depend on byte-identical GPU readbacks. All final transcripts pass.

All five deterministic 60-second simulation outcome hashes match the preceding stage: `c3e7c4b3`, `e895fec5`, `64c6d4b6`, `5fb571ae`, `2fb247e1`. These cover player HP, monster state, kills, pending Reaps, and attack timer, with the same 859 Reap-chain and 1,920 all-skills kills. Reward/save compatibility is also covered by the relevant existing suites; the hashes are not an independent exhaustive profile-format proof.

**Chrome draw-submission measurements**

Fresh isolated Chrome runs, 1440 × 1000, DPR 1, roughly 2.4 seconds per synthetic workload. The Reap fixture replenishes 32 casts, distributed over eight stationary targets. Both Reap samples ended with 32 active casts. The aura and Reap cases are separate.

| Metric | Before | After |
| --- | ---: | ---: |
| Reap Canvas image draws/sec | 7,985 | 1,185 |
| Reap Canvas clears/sec | 163 | 24 |
| Animation-monitor callbacks/sec during Reaps | 187 | 229 |
| Reap frame-gap p95 | 8.4 ms | 4.3 ms |
| WebGL draws/sec in the separate aura workload | 223 | 233 |

These are short, instrumented samples of submitted work, not direct GPU utilization measurements or a promised FPS improvement. Aura rendering was not changed; its variation illustrates scheduling noise. Moving targets and continuously changing reduced-motion opacity intentionally redraw as needed, so the reduction is workload-dependent. The actual Chrome-versus-Firefox discrepancy still requires the user's foreground check.

Raw results: `reap-step3-before-gpu.json`, `reap-step3-after-gpu.json`, `reap-step3-after-core.json`, the `reap-step3-*.txt` transcripts, and `pre-push-*.txt`. The diagnostic runner now accepts `-ReportPath` so subsequent runs preserve previous results.

Script query version and offline cache manifest are refreshed for the completed source. Other audit recommendations remain separate; this is the last rendering change before the user’s next in-game bug/GPU check.
