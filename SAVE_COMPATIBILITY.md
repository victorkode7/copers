# Save compatibility

The save schema is version 4. `parseGameSave` in `js/game.js` is the shared,
side-effect-free entry point for browser saves and profile imports. It upgrades
schemas 1–3, then runs `SaveCompatibility.migrate` before validating the result.
New combat fields default safely; new stats on skills and items use the current
content definitions. Unknown unrelated top-level fields and material/kill counters
survive subsequent saves.

## World progression and skill point caps

Skill points earned are `min(level, 15 + 15 * defeated world bosses)`, including
both spent and unspent points. Each world's final map is its boss encounter;
the first kill awards that world's cap increase once. `defeatedBossWorldIds`
preserves those rewards across saves, imports and map edits, with aliases
following the world migration rules. Older profiles infer victories from boss
map kill counts. Levels are retained when applying the cap.
The XP strip shows total earned points / cap; the skill tree separately shows
confirmed spent points and available points. Boss rewards set the optional
`tutorials.skillPointCapPending` / `skillPointCapDismissed` flags, which default
to false for older profiles. The cap highlight and dismissible notification
identify each new maximum; dismissal persists and repeat kills cannot reopen it.

Profiles above the cap retain their full previous tree in
`skillPointRecoveryRanks`. Their active skills are refunded to the capped budget,
combat pauses, and the original plan opens for trimming. The plan remains saved
and available through Recover previous build after applying or cancelling an
edit; `skillPointTrimPending` controls the initial prompt. Profile backups retain
the exact original save. Saved recovery plans also follow node aliases and
intentional removals without granting additional points.

XP rewards depend on the combat map's world, starting at level 15/30/45 for
Worlds 1/2/3. Reductions are 90%, 95%, 99%, 99.9%, then 99.99% for all later
levels in that world. `experienceRemainder` retains fractional earned XP in
`[0,1)` across kills, saves, imports and offline simulation. Large rewards
recalculate the penalty each time they cross a level. Ordinary XP remains an
integer for existing save and offline-recap compatibility. New fields default
safely; a full reset clears the boss rewards, remainder and recovery plan.

## Retired Town prototype

The Town prototype and its progression, buildings, housing, resource production
and encounters have been removed. The historical `currentView: town` value still
means Crafting and remains supported.

Loading an old `settlement` view returns to Map with combat paused. Any active
Town encounter is replaced with the normal selected-map encounter, clearing
temporary enemy states, queued attacks and combat buffs. The retired `settlement`
field is removed from future saves and exports. Character progression, equipment,
gold, adventure materials, ordinary map kills and mastery remain intact. Existing
automatic migration backups retain the exact original profile.

Regression coverage: `tests/retired-town-smoke.js`.

## Town page

The fresh Town page uses `currentView: townPage`, with a resource strip, local
world browsing and five building slots. Verdant Reach has an always-unlocked Town
Hall in plot 1 and a Lumber Outpost in plot 2. The outpost costs 10,000 gold.
Optional `townProgress` version 1 stores building `{tier, level}` records and Town
material quantities. Existing `townUnlocks` purchases migrate to T0, level 1
without charging again. The always-owned Hall starts at T0, level 1 as well.
Purchases, upgrades and prestige persist atomically and restore gold/materials
if saving fails. Profile imports restore progression; full reset clears it.
The temporary Developer options > Reset Town control restores Town defaults only,
including production and material discovery, preserving adventure progress and gold.
It saves immediately with rollback on failure, and must be removed before playtesting.
`js/town-content.js` defines each building's purchase price, level cap, optional
per-tier overrides, resource unlocks, upgrade/prestige costs and effects.
Optional purchase/upgrade/prestige `Preview` fields accept text
or functions of building tier/level. Cards show production previews from the real
next-level production increase unless custom preview text is supplied. Production
upgrades and prestige show the change in output and input consumption, including
Town productivity; purchase previews show their initial rates. Custom Menagerie
and Depot upgrade text likewise shows added kill credit and storage. These
are content/UI fields; no additional profile state is required.
Cards show real progression with icon-based rates and costs, next-level previews,
and four plots per desktop row. Temporary layout samples, fake materials and building
descriptions have been removed; the resource strip keeps its resource names.
Prestige requires the current level cap and resets to level 1 in the next tier.
Costs and effects left null remain unspecified. T0 Town Hall upgrades each use
500 Logs; its first prestige uses 2,000 Logs. From T1, upgrades and prestige
require 2,000 Logs and 2,000 Planks. Outpost upgrades
after T0 and every Outpost prestige use a base cost of 10 Planks, multiplied by
`2 ** tier`: upgrades cost 20 at T1, 40 at T2, 80 at T3, and so on. Resource recipes are
independent of the Town-only gold curve; adventure rewards/costs are unaffected.
From T4 onward, Outpost level upgrades additionally require a base cost of
10 Town Ore (`ore`), using the same tier scaling: 160 at T4, 320 at T5.
Ore is produced by the Slippery Slopes Mine.
Town material `wood` keeps its save ID but is displayed as Logs.

Town Hall and Lumber Outpost level upgrades start at 1,000 gold. Within a tier,
the nine upgrade prices are 1,000 / 1,150 / 1,300 / 1,500 / 1,750 / 2,000 /
2,300 / 2,650 / 3,050. Prestige costs 3,300 gold, above the last upgrade. The
first Hall cycle still totals 20,000 gold (16,700 upgrades + 3,300 prestige) and
6,500 Logs. Hall prestige reveals the Saw Mill, now purchased for 5,000 gold;
the Outpost purchase remains 10,000. Mill upgrades start at 750 gold, rising to
2,300, and also use 10 Planks. Its recipe remains 2 Logs per Plank.
The mill's first prestige requires a T1 Lumber Outpost and costs 2,500 gold,
1,000 Planks and 10,000 Ore. It enters T1 at level 1; T1 upgrades add 10 Ore alongside
10 Planks and tier-scaled gold. No second mill prestige is configured yet.
Saw Mill base output is `(tier * 10 + level) * 90` Planks/hour: 90–900 at T0
and 990–1,800 at T1. Outpost output is `(tier * 10 + level) * 720` Logs/hour,
an 80% reduction. At matching tiers and levels, it produces four times the
mill's log consumption, leaving 75% of log production as surplus. For example,
T0 level-10 buildings produce 7,200 Logs/hour and 900 Planks/hour; the mill uses
1,800 Logs/hour and leaves 5,400 Logs/hour. Town Hall bonuses scale both equally.
Mill purchases require an owned Outpost; level upgrades do not require specific
Outpost levels. The first mill prestige still requires an Outpost at T1.
Blocked owned-building actions remain visible with a requirement preview.
An Outpost behind its mill can be upgraded to restore the intended log surplus.
Purchases can still spend saved logs.
Production content and card previews use hourly rates (`perHour`), normalized to
seconds for the existing simulation. Legacy `perSecond` definitions still work.
Existing material balances, levels and
partial production progress are retained.

`goldLevelGrowth` (1.15) applies per existing level to upgrade base gold, rounded
to `goldRounding` (50). Then `goldPrestigeMultiplier ** tier` (2 per tier) applies
to both upgrade and prestige prices, ensuring exact doubling without 5x cliffs.
`materialPrestigeMultiplier ** tier` separately scales non-gold costs; the Outpost
sets this multiplier to 2. Base cost objects are never mutated by cost reads.
These fields are editable per building in `js/town-content.js`. Prestige does
not apply the level multiplier again. Costs saturate at Number.MAX_SAFE_INTEGER.
Existing purchases, levels and balances are retained; no retroactive refunds.

Slippery Slopes (`world_c791ede123810fd894db2294`) has a separate always-owned
`slopesTownHall` in plot 1. Its bonus remains unset (`effects: null`); it does not
add Verdant Hall productivity. Its upgrades start at 5,000 gold + 2,000 Ore +
2,000 Planks; prestige uses the same materials and 16,500 base gold. The normal
15% level growth / 2x tier gold scaling applies. Existing profiles receive the
free Hall through normal progression normalization.

Plot 2 is `mine`, purchased once for 100,000 gold. Buying it discovers Ore without
granting stock. It produces `(tier * 10 + level) * 360` Ore/hour, half of matching
Outpost output, multiplied by existing
Town productivity. Mine upgrades start at 5,000 gold + 100 Planks, and level-10
prestige costs 16,500 gold + 100 Planks before tier scaling. The same shared
simulation, partial-output persistence and offline rules apply across all worlds.
W2 plot 3 unlocks as Smeltery when `slopesTownHall` reaches T1, independently of
the Verdant Hall tier. Purchase also requires an owned Mine and costs 50,000 gold,
500 Planks and 1,000 Ore. It discovers the Town-only `bars` resource at zero.
The Smeltery converts 10 Ore into each whole Bar at 10 Bars/hour per production
step (`tier * 10 + level`), before Town productivity. Its hourly output and upgrade
gains remain whole numbers with the Town Hall's 10% productivity increments.
At matching levels, Mine output is 3.6 times the Smeltery's Ore consumption.
Upgrades require matching
Mine progress and cost 10,000 base gold, 100 Planks and 10 Bars, with normal
15% level-based gold growth. Ten levels are configured; no prestige is set yet.
Full Bar storage or missing Ore pauses conversion without wasting input or
banking elapsed work. The existing converter simulation supports both industries
simultaneously, including offline catch-up and saved fractional progress.
Each Town Hall level upgrade adds 10 percentage points to Town productivity.
Starting level 1 gives no bonus. Earned level upgrades are derived from
`tier * 9 + level - 1`, preserving their bonus across prestige with no extra
bonus for the prestige action itself. All producer rates (including converter
input consumption and output) use this multiplier, keeping recipe ratios fixed.
UI rates and next-level previews include the bonus; fractional output is retained.
Outpost base output is `(tier * 10 + level) * 720` Logs/hour. Cost maps reserve `gold` for
adventure gold; other keys spend Town materials. `production` defines the resource and rate, with optional tier overrides
or a function of building level. Owned producers store optional
`production: {fraction, phase, total}` to retain partial logs and batch progress.
The shared simulation clock produces logs during combat, Town visits, and offline
catch-up, using one arithmetic update per producer. Converters consume inputs
only when producing outputs and cannot bank work while starved. Profiles with
converters retain 100 ms simulation steps during paused offline catch-up, so
input/output balances match foreground play. Resource production stops at the
configured storage capacity; Number.MAX_SAFE_INTEGER remains the save-validation
limit for preserved legacy balances. The bottom bar follows single logs at low rates and
half-second batches at high rates; building glows are capped at two per second,
reuse existing DOM, and respect reduced motion. No per-log timers or save writes.
The progress fill uses one continuous compositor animation per visible producer.
Simulation updates gently adjust its speed instead of seeking or restarting it;
leaving Town or hiding the tab cancels it until the page becomes visible again.
Resource cards have fixed widths, fixed icon/value slots and tabular digits;
changing quantities or switching compact notation cannot move neighboring cards.
The resource strip shows only discovered Town materials, including zero balances;
gold and adventure materials stay outside that strip. Purchasing Lumber Outpost
discovers Logs; purchasing the mill discovers Planks. Cards show compact tier/level information, without unlocked labels
or placeholder descriptions.
There is no retired settlement or encounter state. World browsing does not alter map
travel or unlocks. The historical `town` value continues to mean Crafting.
Combat side panels are hidden only while the fresh Town page is open.

## Town storage

Base Town capacities are 50,000 Logs, 50,000 Planks, 100,000 Ore and 10,000 Bars. Gold and
adventure crafting materials are outside this Town storage system. Resource
definitions in `js/town-content.js` declare `capacity`; storage buildings declare
`storageCapacity` totals, with the strongest owned capacity applying per resource.

Verdant Reach plot 5 becomes Timber Depot at Town Hall T3. Buying it costs
250,000 gold, 10,000 Planks and 25,000 Ore and raises total Log capacity to
100,000. Each level adds another 100,000 capacity, reaching 1,000,000 at level 10.
Upgrades cost `5,000 * current level` Planks, `10,000 * current level` Ore and
100,000 base gold with the existing 15% level growth. The final upgrade requires
45,000 Planks and 90,000 Ore, below their storage caps. No Depot prestige is
configured. Purchase costs can now declare `purchaseCost` maps; older buildings
retain their `initialGold` fallback. All purchase costs are spent atomically with
the existing Town save rollback behavior.

Capacity is derived from building levels, requiring no new profile version or
duplicate saved cap fields. Existing balances above a cap remain intact and
spendable, including imports; production pauses until there is room. Full output
storage stops converters before consuming their inputs, clears pending production
fractions, and does not bank elapsed full-storage time for an instant refill.
Foreground and offline simulation follow the same capped production rules.
Resource cards show current amount and capacity in fixed-width slots, highlighting
full stores. Full producers stop their progress animation and show Storage full.
Buying or upgrading storage resumes production without changing stored amounts.

Coverage: `tests/town-storage-smoke.js` checks the T3 unlock, material/gold costs,
rollback, affordable upgrades, cap boundaries, over-cap saves, converter inputs,
and foreground/offline consistency on desktop and mobile. `tests/town-smeltery-smoke.js`
also covers half-rate Ore, the W2 unlock, the 10:1 recipe, Bar storage and saves,
and fixed-backlog foreground/offline consistency with both converters running.

## Device preferences

The full-game reset is under Settings and retains its confirmation and
recovery-backup flow. Settings stores the developer-navigation visibility choice
in `idleAdventureCombatSettings`; profile imports and game resets do not replace
it. The in-game navigation and Settings remain available when the top Game/editor
navigation is hidden.

## Monster mastery

Optional `mapMastery` stores `{earned, nodes}` for each permanent map ID. Earned
points are separate from character skill points: regular maps award two points
at 10x, 100x, 1,000x, and subsequent powers of ten times the map's kill requirement
(minimum goal 1). Boss encounters award two points at 2x, 20x, 200x and subsequent
tenfold thresholds, five times lower than regular thresholds. Boss kills count
once and do not receive the Menagerie multiplier or consume its saved fractions.
Boss classification follows `masteryType`, including automatic final-map bosses.
Existing kills receive retroactive credit. Stored earned points never decrease
when map goals change; subsequent milestones continue after the credited tier.
Unknown map/node IDs remain stored, inactive until supported again. Map aliases
also remap mastery records. Full reset clears mastery; profile imports preserve it.

Worlds optionally define `masteryPresets.regular` and `.boss`; omitted presets
use the built-in fourteen-node trees. Maps inherit the matching world preset
unless `masteryTree` supplies a custom tree. `masteryType` can be `auto`, `regular`
or `boss`; automatic treats the world's last map as its boss. The root is free,
all other nodes cost one point. The default capstone accepts any completed
branch. Node IDs are stable; editing names, bonuses, penalties or positions keeps
player selections. Unsupported/disconnected selections stay spent and inactive
until refunded, reset or restored by future content.

Each node has separately editable `stats` and `penalties`, both applied on that
map. Player bonuses use the equipment stat registry; mastery also supports enemy
health/damage/accuracy/respawn multipliers, additional monsters and loot-table
drop chance multipliers. Drop chances cap at 100%; active population caps at 100.
Enemy stat changes preserve living HP percentages and remaining respawn fractions.
Each extra spawn has a stable unique ID. Learning/refunding persists atomically;
storage failure restores points, selections, encounter states, HP and mana.
Mastery applies identically during foreground and offline simulation. The mastery
page replaces combat visually while the simulation continues.

## Crafted equipment

Optional `itemCrafts` stores a variable number of crafted slots per item ID. Old profiles default
to an empty object. Rolls stay with owned items across equips, imports and saves;
unknown item IDs and unsupported stat keys are retained for returning content.
Item aliases also remap these IDs.

Optional `itemRollSaves` stores one independent copy of crafted rolls per weapon
ID. Saving or replacing this copy costs 10,000 gold; restoring is free and
consumes the saved copy in the same transaction. Rerolling never overwrites it.
Saved rolls follow the same validation, item aliases and preservation rules as `itemCrafts`, including
unknown stats/items and inactive surplus slots. Profile exports/imports preserve
these copies, older saves default to `{}`, and a full reset clears them. Purchase,
replacement and restoration persist atomically and roll back resources, rolls,
HP and mana if storage fails.

Auto roll targets are session-only selections per item, limited to its active
crafted slot count. All selected stat types must appear together in the crafted
slots; permanent stats and numeric roll values do not satisfy or restrict the
target. Auto roll schedules one ordinary paid, persisted roll every 500 ms and
stops at a match, a failed transaction or insufficient resources. Manual stop,
changing items/pages, hiding the game, profile loading and reset cancel the timer.
Auto roll never changes saved weapon rolls and does not resume after reload or
simulate missed rolls in the background.

Item definitions hold permanent stats, an
`equipmentType`, a positive integer `tier`, and per-item `crafting` material costs
and slot counts. Root `equipmentTypes` names the groups; `craftingPresets` supplies
the gold per reroll (`gold`), possible stats, inclusive min/max and step for each
type/tier pair. Gold is charged once per action, regardless of slot count. An omitted
`crafting.pool` inherits the entire matching preset automatically. Legacy inline
range arrays and explicit stat selections still resolve without losing custom
values; the item editor offers an explicit switch to tier rolls. Old packages
without preset tables gain the project's defaults when opened in the editor.
Older preset tables missing gold promote the median linked item's gold cost,
or default to 100 per tier when no previous cost exists. Shared gold takes
precedence over old per-item gold fields. Standalone legacy items without a
matching preset retain their old gold cost until assigned a type and tier.
Changing future roll ranges does not invalidate previously earned rolls or
change permanent stats. Default weapon presets also include flat damage and
attack speed; defensive presets include flat health and evasion. Rolled stats may
match permanent stats: additive stats add and multipliers multiply. Uniqueness
applies only between crafted slots, not between crafted and permanent stats.
Both editor pages save/export one item catalogue.

`crafting.slots` is a positive integer per item and cannot exceed the number of
distinct potential stats. Increasing the count displays extra empty slots while
retaining existing rolls. Reducing it makes surplus saved slots inactive without
deleting them. A subsequent reroll replaces the saved array with the new count.

Rerolls replace all configured slots, draw distinct stat keys, and persist the complete
transaction before reporting success. Failed storage writes restore currency,
materials, rolls, health and mana. Capacity changes clamp current health/mana
without healing the character. A full game reset clears crafted slots.

## Content edits

Keep content IDs stable. For intentional changes, append a numbered entry to
`contentMigrations` in `js/save-compat.js`. Each entry has a description and may
include `skills`, `items`, `materials`, `maps`, and `worlds`:

```js
{
    version: 2,
    description: 'Explain the release change here.',
    items: {aliases: {oldSword: 'newSword'}, removed: []},
    maps: {aliases: {}, removed: [{id: 'retiredMap', reason: 'Explain why.'}]}
}
```

This is an example, not an active retirement. Every removal must have an ID and
reason. Remove that ID from its catalogue too and never reuse it for unrelated
content. Rules are cumulative and idempotent: the stored content version protects
against opening profiles from future releases, while reconciliation also runs
when the editor changes a tree without a release version bump.

- Known historical skill IDs map to their replacements. The tree editor exports
  future renames as `nodeIdAliases` and documented deletions as `removedNodes`,
  including in drafts, JSON imports/exports and game packages. Undo restores this
  history too. Keep it with the published tree.
- Removed skills, excess ranks and allocated branches disconnected from the
  center refund their spent points. Other allocations remain. Renamed abilities
  retain their runtime identity and targeting tags through the alias history.
- Missing equipment is retained in `preservedContent`, including ownership,
  crafting history and equipped slots, and restored when its definition returns.
  Only an explicit retirement deletes it permanently. An occupied equipment slot
  takes priority when archived equipment returns.
- Item aliases update ownership and equipped slots. Material and map aliases
  merge quantities and kill counters. Explicit material/map/world retirements
  remove only the specified content. An unavailable destination falls back to an
  unlocked map and resets its encounter, leaving character progression intact.
- Earned map/world unlocks are stored independently of current kill requirements.
  Older profiles infer unlocks from kills and non-developer visited destinations.
- Content migration 2 replaces Thunderstorm (including historical Thunderbolt
  and `skillNode4` IDs) with Void Bolt, and Saltwater Bolt with Void Volley.
  Allocations, connections and spent points move to the replacements. The retired
  Wet debuff is explicitly removed from saved monsters. Void Charges default to
  zero and persist in subsequent saves; unrelated progression is retained.
- Travelling Void Volley missiles retain their snapshotted damage, destination
  and remaining travel time across saves/imports and offline progress. Older
  profiles default to an empty missile queue. Invalid missile records reject
  loading through the existing recovery flow; changing maps clears the queue.

The Menagerie in Verdant Reach plot 4 requires Town Hall T2 to purchase. Its
ownership unlocks World 1 monster mastery; its single prestige unlocks World 2
while retaining World 1's 10x kill credit. Existing kills and mastery allocations
are preserved, with mastery effects inactive until that world's unlock is owned.
Optional `townProgress.killFractions` stores per-map quarter-kill remainders so
fractional multipliers survive saves without changing integer kill counters.
Older saves need no migration. Invalid remainders reject loading. Kill credit
boosts regular map and mastery progress. Boss encounters always receive one kill
credit per defeat and use the lower mastery thresholds described above. Existing
boss kills and mastery points are preserved; historical credited kills are not
retroactively divided. XP, gold, drops and boss rewards still occur once per
actual defeated monster.

The optional boolean `mapListLocked` keeps the map selector expanded across map
choices and profile reloads. Older profiles default to false; malformed values
are rejected. This is a normal player preference available in playtest builds.

## Development and playtest profiles

`dev/developer-tools.js` is the optional owner of developer UI, travel bypasses,
automatic admin equipment, free spending, normal equipment granting/deletion and
the temporary Town reset. Core scripts call guarded hooks only; never implement
a developer capability by trusting a saved boolean in the main game. Removing
the module leaves ordinary spending and gameplay intact with no developer UI.

With the module present, saves use `idleAdventureSave:development` and recovery
backups use that slot's `:backup:` prefix. Without it, the original
`idleAdventureSave` slot is used. Existing normal profiles are not automatically
copied or overwritten. The developer panel has an explicit copy action that
backs up the development slot and preserves the source playtest profile.
New profiles carry `profileEnvironment`; playtest builds reject development
profiles to avoid accidental balance-test contamination. Legacy profiles remain
supported, with developer flags disabled and admin gear unequipped when the
optional module is absent. These markers are editable local data, not anti-cheat.

Free spending bypasses affordability and deductions without inflating saved
balances. Production, loot, XP and prerequisites retain normal calculations.
Deleting equipment removes ownership and unequips it, preserving craft completion
history and stored rolls. Completion no longer implies current ownership; missing
equipment can be crafted again without another completion entry or first-craft
reward. Granting equipment does not add crafting history or progression rewards.
Equipment deletion, grants and developer preference changes roll back on failed
saves. Normal gameplay still uses its existing persistence behavior.

Run `scripts/build-playtest.ps1` to create a new folder and ZIP under the top-level
`playtest/` folder.
The package excludes the developer module, editor pages and unused editor scripts,
removes their HTML references, and regenerates an offline manifest from the
included runtime files. Do not distribute a development folder with its controls
merely hidden, or assume deleting a previously cached module removes its cached
copy. Package verification also checks that developer paths are absent.

Coverage: `tests/developer-tools-smoke.js` and `tests/playtest-build-smoke.js`,
including an omitted module, a missing referenced file, and the packaged runtime.

## Recovery

Before applying a migration, the exact original text is stored under
`idleAdventureSave:backup:*` in browser storage. Imports also back up the original
file, previous stored profile and current live progress. Identical backups are
deduplicated; different originals are never overwritten. The **Backups** button
downloads these profiles for import or external storage.

A failed load or backup pauses combat and saving and opens a recovery dialog.
The original primary save stays intact. Download it, retry, or import a working
profile. Starting over requires an explicit reset and a successful backup first.
Failed imports retain or roll back the prior running profile and stored save.
Backups are local to the browser; exporting them provides an external copy.

Regression coverage: `tests/save-compat-smoke.js`, `tests/game-profiles-smoke.js`,
`tests/equipment-smoke.js`, `tests/skill-node-cleanup-smoke.js` and
`tests/skill-editor-selection-smoke.js`. The compatibility test includes a real
reload of an unsupported save to guard against startup overwriting it.
