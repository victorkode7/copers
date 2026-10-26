(async function () {
    const checks = [], check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const near = (a, b) => Math.abs(a - b) < 1e-6;
    const $ = id => document.getElementById(id);
    const settle = () => new Promise(resolve => setTimeout(resolve, 0));
    const change = (element, value, type = 'change') => { element.value = value; element.dispatchEvent(new Event(type, {bubbles:true})); };
    async function exportedData() {
        const originalUrl = URL.createObjectURL, originalClick = HTMLAnchorElement.prototype.click, blobs = new Map(); let downloaded;
        try {
            URL.createObjectURL = blob => { const url = originalUrl.call(URL, blob); blobs.set(url, blob); return url; };
            HTMLAnchorElement.prototype.click = function () { downloaded = blobs.get(this.href); };
            $('exportJson').click(); return JSON.parse(await downloaded.text());
        } finally { URL.createObjectURL = originalUrl; HTMLAnchorElement.prototype.click = originalClick; }
    }
    try {
        if (typeof SkillStatCompat !== 'undefined') {
            const tree = {statSchemaVersion:2,furySchemaVersion:1,eruptionChainSchemaVersion:1,nodes:[
                {id:'shieldGenerator',stats:{damage:1}}, {id:'shieldSlam',stats:{damage:1}},
                {id:'addedShields',stats:{damage:1}}, {id:'ordinary',stats:{damage:1}}
            ]};
            SkillStatCompat.normalize(tree);
            check('legacy shield placeholders migrate without changing ordinary damage nodes', !Object.keys(tree.nodes[0].stats).length && !Object.keys(tree.nodes[1].stats).length && tree.nodes[2].stats.maxShields === 3 && tree.nodes[3].stats.damage === 1);
            tree.nodes[0].stats = {damage:1}; SkillStatCompat.normalize(tree);
            check('the shield migration runs once and preserves subsequent intentional edits', tree.nodes[0].stats.damage === 1 && tree.shieldSchemaVersion === 1);
        }
        if ($('nodeForm')) {
            $('nodeList').querySelector('[data-node-id="addedShields"]').click();
            check('Added Shields grants editable capacity instead of placeholder damage', $('nodeEffect').value === '+3 maximum shields' && $('statBonusRows').querySelector('select').value === 'maxShields');
            change($('statBonusRows').querySelector('input'), '5', 'input'); await settle();
            $('addStatBonus').click(); const row = $('statBonusRows').lastElementChild, selects = row.querySelectorAll('select');
            selects[0].value = 'maxShields'; selects[1].value = 'multiplier'; change(row.querySelector('input'), '1.5', 'input'); await settle();
            check('shield node descriptions show flat capacity and multipliers', $('nodeEffect').value === '+5 maximum shields\n+50% maximum shields' && $('statsError').hidden);
            const data = await exportedData(), node = data.nodes.find(entry => entry.id === 'addedShields');
            check('shield stats export and validate in the skill editor', node.stats.maxShields === 5 && node.stats.maxShieldsMultiplier === 1.5 && !$('validationList').textContent.includes('unsupported stat "maxShields'));
            check('export preserves the user-controlled connection lines', ['shieldGenerator','shieldSlam','addedShields'].every(id => JSON.stringify(data.nodes.find(entry => entry.id === id).requires) === JSON.stringify(window.adventureSkillTree.nodes.find(entry => entry.id === id).requires)));
        } else if ($('itemForm')) {
            $('addItem').click(); $('addStat').click();
            change($('statRows').querySelector('select'), 'maxShields'); change($('statRows').querySelector('input'), '3');
            check('items support flat shield capacity with a one-hit shield guide', $('preview').textContent.includes('+3 Maximum shields') && $('statRows').querySelector('.stat-guide').textContent.includes('one enemy hit'));
            $('addStat').click(); let row = $('statRows').lastElementChild; change(row.querySelector('select'), 'maxShieldsMultiplier');
            row = $('statRows').lastElementChild; change(row.querySelector('input'), '1.5');
            const data = await exportedData(), item = data.items.find(entry => entry.id === $('itemId').value);
            check('items support shield multipliers and export valid capacity bonuses', item.stats.maxShields === 3 && item.stats.maxShieldsMultiplier === 1.5 && Equipment.validate(data).length === 0);
        } else {
            const originalRandom = Math.random, originalItem = itemById.testAmulet.stats;
            const originalConnections = Object.fromEntries(Object.entries(skillNodeConnections).map(([id, links]) => [id, new Set(links)]));
            const map = currentMap();
            function fresh(ranks = {shieldGenerator:1}, count = 32, health = 1000) {
                combatStatCache = null; clearFury(); state.shieldStacks = 0;
                state.skillRanks = {...ranks}; state.level = Object.keys(ranks).length; state.skillPoints = 0; state.experience = 0; pendingSkillRanks = {};
                state.gear = createEmptyGear(); state.gear.necklace = 'testAmulet'; state.ownedItemIds = ['testAmulet']; state.crafted = [];
                itemById.testAmulet.stats = {damage:98,attackSpeedMultiplier:.001}; state.upgrades = {strength:0,haste:0,evasion:0};
                state.gold = 0; state.kills = Object.fromEntries(mapData.map(entry => [entry.id,0])); state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id,0]));
                state.lootLog = []; state.lastLoot = null; state.tutorials = createTutorialState(); state.isInTown = false; state.currentView = 'map';
                state.selectedMap = map.id; state.selectedWorld = worldForMap(map.id).id; map.drops = []; map.itemDrops = [];
                map.spawns = [{id:'shieldMob',monsterId:worldContent.monsters[0].id,count,overrides:{health,attackDamage:7,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:2,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
                resetMonsterStates(map); state.playerHp = 100; state.combatPaused = false; state.attackTimer = 0; resetCombatClock(); clearOfflineRecap(); Math.random = () => .999;
                return state.monsterStates;
            }
            const kill = (monster = activeMonster(), type = 'physical') => applyDamageToMonster(monster, 1e9, type);
            const shieldRanks = {shieldGenerator:1,shieldSlam:1};
            try {
                fresh({}); kill(); check('kills without Shield Generator grant no shields', state.shieldStacks === 0);
                fresh(); const first = activeMonster(); kill(first); kill(first);
                check('each actual kill grants exactly one shield and rewards once', state.shieldStacks === 1 && state.kills[map.id] === 1 && state.gold === 1);
                for (let index = 0; index < 15; index++) kill();
                check('the default shield capacity is ten and excess kills cannot overfill it', state.shieldStacks === 10 && getPlayerMaxShields() === 10);
                fresh(); state.shieldStacks = 2; applyDamageToPlayer(NaN); applyDamageToPlayer(0); applyDamageToPlayer(-10);
                check('invalid or zero damage does not consume shields', state.shieldStacks === 2 && state.playerHp === 100);
                applyDamageToPlayer(1e6); check('one shield prevents an entire lethal enemy hit', state.shieldStacks === 1 && state.playerHp === 100 && !state.combatPaused);
                applyDamageToPlayer(1); applyDamageToPlayer(7);
                check('hits consume one shield each before subsequent damage reaches HP', state.shieldStacks === 0 && state.playerHp === 93);
                fresh(); state.shieldStacks = 3; applyDamageToPlayer(5, 'self');
                check('self-damage bypasses shields', state.shieldStacks === 3 && state.playerHp === 95);
                fresh({shieldGenerator:1,righteousFire:1}); state.shieldStacks = 3; simulateCombatStep(.1);
                check('Fire health drain cannot be blocked by shields', state.shieldStacks === 3 && near(state.playerHp,99));
                fresh({shieldGenerator:1,volcanicEruption:1}); state.shieldStacks = 3; triggerVolcanicEruption(activeMonster(),100);
                check('eruption self-damage cannot be blocked by shields', state.shieldStacks === 3 && state.playerHp === 95);
                fresh(); state.shieldStacks = 2; state.monsterStates[0].attackTimer = 999.9; Math.random = () => 0; simulateCombatStep(.1);
                check('actual enemy attacks spend shields instead of damaging HP', state.shieldStacks === 1 && state.playerHp === 100);
                state.monsterStates[0].attackTimer = 999.9; Math.random = () => .999; simulateCombatStep(.1);
                check('dodged attacks do not consume shields', state.shieldStacks === 1 && state.playerHp === 100);
                fresh({addedShields:1}); kill(); check('capacity bonuses alone do not generate shields', getPlayerMaxShields() === 13 && state.shieldStacks === 0);
                fresh({shieldGenerator:1,addedShields:1}); itemById.testAmulet.stats.maxShields = 7; itemById.testAmulet.stats.maxShieldsMultiplier = 2;
                check('skill and item capacity bonuses add before shield multipliers', getPlayerMaxShields() === 40 && getDamage() === 100);
                state.shieldStacks = 40; itemById.testAmulet.stats.maxShields = 0; itemById.testAmulet.stats.maxShieldsMultiplier = 1; normalizeShields();
                check('lowering maximum shields clamps the held stack count', state.shieldStacks === 13);
                state.skillRanks = {}; normalizeShields(); check('removing Shield Generator removes its shield buff', state.shieldStacks === 0);
                fresh(); kill(activeMonster(),'poison'); kill(activeMonster(),'dot'); check('poison and burning kills both generate shields', state.shieldStacks === 2);
                fresh({shieldGenerator:1,righteousFire:1},1,.5); itemById.testAmulet.stats.healthRegen = 20; state.playerHp = 30; simulateCombatStep(.1);
                check('real burning damage grants one shield on a kill', state.shieldStacks === 1 && state.kills[map.id] === 1);
                fresh(); state.monsterStates[0].hp = .5; state.monsterStates[0].poisonStacks = [{remainingDuration:5,timeUntilTick:.1}]; simulateCombatStep(.1);
                check('real poison ticks grant one shield on a kill', state.shieldStacks === 1 && state.kills[map.id] === 1);
                fresh(); state.playerHp = 0; state.combatPaused = true; kill(); check('kills after player death do not generate new shields', state.shieldStacks === 0);
                fresh(shieldRanks); state.shieldStacks = 9; tryShieldSlam(); check('Shield Slam cannot fire below maximum shields', state.shieldStacks === 9 && activeMonster().hp === 1000);
                kill(); check('reaching ten consumes five and deals 500 percent to the next living target', state.shieldStacks === 5 && activeMonster().hp === 500);
                fresh({...shieldRanks,addedShields:1}); state.shieldStacks = 12; kill();
                check('at thirteen shields the slam consumes six and deals 600 percent', state.shieldStacks === 7 && activeMonster().hp === 400);
                fresh(shieldRanks); state.shieldStacks = 9; state.monsterStates[1].hp = 100; kill();
                check('a slam kill generates a shield and awards its own rewards exactly once', state.shieldStacks === 6 && state.kills[map.id] === 2 && state.gold === 2);
                fresh({...shieldRanks,volcanicEruption:1,multiShot:1,shockwaveSlash:1,freezingArrows:1,piercingArrow:1,forkingArrow:1});
                itemById.testAmulet.stats.maxFury = 10; itemById.testAmulet.stats.poisonChance = 1; state.shieldStacks = 10; Math.random = () => 0;
                const slamDamage = getDamage() * 5; tryShieldSlam();
                check('slams are direct physical hits that build Fury and apply poison', state.furyStacks === 1 && near(state.monsterStates[0].hp,1000-slamDamage) && state.monsterStates[0].poisonStacks.length === 1);
                check('a slam does not trigger unrelated attacks, eruptions or arrow effects', state.playerHp === 100 && !state.pendingEruptions.length && state.monsterStates.slice(1).every(monster => monster.hp === 1000 && !monster.freezeRemaining));
                fresh(shieldRanks,1); state.shieldStacks = 9; kill();
                check('full shields wait without consumption when no target is alive', state.shieldStacks === 10);
                simulateCombatStep(2); check('a pending full-cap slam hits the respawned enemy', state.shieldStacks === 5 && state.monsterStates[0].hp === 500);
                fresh(shieldRanks,100,1); itemById.testAmulet.stats.maxShields = -9; state.shieldStacks = 1; tryShieldSlam();
                check('one-shield capacities resolve long kill chains without recursion or duplicate rewards', state.kills[map.id] === 100 && state.shieldStacks === 1 && !resolvingShieldSlam);
                fresh(shieldRanks); itemById.testAmulet.stats.maxShields = -10; gainShieldFromKill(); tryShieldSlam(); check('zero capacity neither generates shields nor slams', state.shieldStacks === 0 && activeMonster().hp === 1000);
                fresh(); state.shieldStacks = 3; render(); const icon = elements.buffList.querySelector('[data-buff-id="shields"]');
                check('the buff section displays shield stacks with no duration', icon && icon.querySelector('.buff-stacks').textContent === '3' && icon.querySelector('.buff-value').textContent === '1 hit' && icon.querySelector('.buff-duration').hidden && icon.getBoundingClientRect().width === 48);
                applyDamageToPlayer(1); applyDamageToPlayer(1); applyDamageToPlayer(1); renderCombat(); check('the shield icon disappears after the last shield is consumed', !elements.buffList.querySelector('[data-buff-id="shields"]'));
                // Keep this combat fixture's profile valid independently of
                // how the user arranges the three shield nodes in the editor.
                const links = [['origin','shieldGenerator'],['shieldGenerator','shieldSlam'],['shieldSlam','addedShields']];
                links.forEach(([a,b]) => { skillNodeConnections[a].add(b); skillNodeConnections[b].add(a); });
                fresh({...shieldRanks,addedShields:1}); state.shieldStacks = 7;
                const saved = parseGameSave(JSON.stringify(createGameSave())); state.shieldStacks = 0; applyGameSave(saved);
                check('profiles preserve shield stacks without granting or consuming new ones', state.shieldStacks === 7 && getPlayerMaxShields() === 13);
                const legacy = {...saved}; delete legacy.shieldStacks; applyGameSave(parseGameSave(JSON.stringify(legacy))); check('older profiles start with no shields', state.shieldStacks === 0);
                for (const invalid of [-1,.5,'5',null]) { let rejected = false; try { parseGameSave(JSON.stringify({...saved,shieldStacks:invalid})); } catch (_) { rejected = true; } check('invalid shield save values are rejected: '+JSON.stringify(invalid), rejected); }
                const snapshot = () => JSON.stringify({hp:state.playerHp,shields:state.shieldStacks,fury:state.furyStacks,monsters:state.monsterStates,kills:state.kills,gold:state.gold});
                function scenario(effects) {
                    fresh(shieldRanks,4,150); itemById.testAmulet.stats.attackSpeedMultiplier = 1; itemById.testAmulet.stats.healthRegen = 100; itemById.testAmulet.stats.maxShields = -6;
                    let seed = 42; Math.random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
                    for (let index = 0; index < 200; index++) simulateCombatStep(.1,effects);
                    return snapshot();
                }
                const observer = new MutationObserver(() => {}); observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true});
                const foreground = scenario(true), offline = scenario(false);
                check('offline and foreground combat produce identical shields, slams and rewards', foreground === offline);
                check('collecting shield combat effects leaves the DOM untouched', !observer.takeRecords().length); observer.disconnect();
                const confirm = window.confirm; window.confirm = () => true; try { $('resetGame').click(); } finally { window.confirm = confirm; }
                check('resetting a game clears stored shields', state.shieldStacks === 0);
            } finally {
                Math.random = originalRandom; itemById.testAmulet.stats = originalItem; combatStatCache = null; resetCombatClock(); clearOfflineRecap();
                Object.entries(originalConnections).forEach(([id, links]) => { skillNodeConnections[id] = links; });
            }
        }
        check('no runtime errors: '+window.smokeErrors.join('; '), !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR '+error.stack); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
