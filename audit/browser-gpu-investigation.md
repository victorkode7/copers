Chrome/Firefox GPU-usage investigation

User reports approximately 90% GPU use in Chrome versus 10% in Firefox with the same save, viewport, and effect-renderer settings, measured in Windows Task Manager. The exact interactive discrepancy has not been reproduced or attributed to a specific GPU engine.

**Confirmed code behavior**

- `js/combat-webgl.js`, `draw()`: while transient effects or persistent ambient auras exist, the renderer clears and draws its layer at every browser animation callback. Persistent auras can keep it drawing continuously. It stops when no effects remain; idle does not imply a runaway WebGL loop.
- `js/scythe-reap-effect.js`, `tick()`: while Reaps are active, the full-viewport Canvas is cleared and all visible layers are redrawn every animation callback, including callbacks where source sprite frames and target positions have not changed. Source frames progress through sixteen cells over 600 ms. The prior target-position optimization reduced DOM work but did not reduce Canvas draws.
- Neither effect loop has a separate graphics frame-rate setting. `requestAnimationFrame` usually follows the display refresh rate: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- The preceding status/loot changes address DOM/layout work, not a limit on GPU drawing.

**Isolated measurements and limits**

A separate fixture and fresh browser profiles were used, at 1440 × 1000 and DPR 1. Automatic combat intervals were disabled. Three synthetic workloads ran for about 2.4 seconds each: no active effects, 64 poison auras, and up to 32 Reaps replenished every 100 ms. Prototype wrappers counted actual WebGL draw submissions, Canvas image draws, and Canvas clears. They do not measure GPU execution time, utilization, power, or Windows Task Manager counters.

Chrome 156 reported the NVIDIA RTX 3070/ANGLE D3D11 renderer. In this run:

| Workload | WebGL draws/sec | Canvas image draws/sec | Canvas clears/sec |
| --- | ---: | ---: | ---: |
| Idle | 0 | 0 | 0 |
| 64 ambient auras | 230 | 0 | 0 |
| Reap stress | 0 | 9,240 | 186 |

Firefox 159's headless behavior was inconsistent between launches and stalled heavily under Reaps, reaching roughly 3 Canvas clears/sec with long gaps and inconsistent numbers of surviving casts at the sample boundary. Its headless aura run submitted 63 WebGL draws/sec. These numbers are not an equivalent foreground performance comparison: both the scheduling and completed workload differed. Lower GPU usage must not be interpreted as faster rendering from these data. Its reported WebGL renderer string is also different from Chrome's, so it does not establish equivalent underlying rendering paths. No claim is made that Firefox uses a different physical GPU.

The initial Firefox automation connection failed; a subsequent launch connected. The Chrome diagnostic initially needed a correction to the runner's target selection. Diagnostic Firefox processes were cleaned up by matching only the temporary diagnostic profiles; the final runner closes its own Firefox process tree. Personal browser sessions and profiles were not modified.

Raw results: `browser-gpu-chrome.json` and `browser-gpu-firefox.json`. Reproduce sequentially with `scripts/run-browser-gpu-diagnostic.ps1 -Browser Chrome` or `-Browser Firefox`. These headless results establish submitted drawing work, not the cause of the user's reported GPU percentages. Browser connection uses Chrome CDP and Firefox WebDriver BiDi; Firefox connection documentation: https://developer.mozilla.org/en-US/docs/Web/WebDriver/How_to/Create_BiDi_connection

**Next isolating check**

In the affected foreground Chrome window, keep the same combat/save and change only the effect renderer from WebGL to HTML/SVG. Compare Task Manager's same GPU/engine reading and perceived animation smoothness. A large decrease points toward the WebGL effect path; continuing high load leaves the shared Reap Canvas and other page/compositor work as candidates. Reap uses Canvas in both renderer settings, so this check does not turn Reap off.

Then select one measured rendering fix for the next staged implementation. Candidates are skipping unchanged Reap canvas presentations while retaining hit callbacks/cleanup/position tracking, or a configurable graphics frame-rate limit. A lower graphics frame-rate limit is a visual smoothness trade-off and should be evaluated explicitly, while preserving the existing 100 ms simulation, damage, targeting, rewards, and all effects. No new production optimization or browser setting change was applied in this investigation.
