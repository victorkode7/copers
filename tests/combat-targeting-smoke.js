(function () {
    const checks = [], originalRandom = Math.random, originalStats = itemById.testAmulet.stats;
    const map = currentMap(), near = (a,b) => Math.abs(a-b) < 1e-6;
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    function fresh(ranks = {}, count = 3) {
        combatStatCache = null; clearFury(); state.shieldStacks = 0; state.skillRanks = {...ranks}; pendingSkillRanks = {};
        state.level = Object.keys(ranks).length; state.experience = 0; state.skillPoints = 0;
        state.gear = createEmptyGear(); state.gear.necklace = 'testAmulet'; state.ownedItemIds = ['testAmulet']; state.crafted = [];
        itemById.testAmulet.stats = {damage:98}; state.upgrades = {strength:0,haste:0,evasion:0};
        state.gold = 0; state.kills = Object.fromEntries(mapData.map(entry => [entry.id,0])); state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id,0]));
        state.lootLog = []; state.lastLoot = null; state.tutorials = createTutorialState();
        state.selectedMap = map.id; state.selectedWorld = worldForMap(map.id).id; state.currentView = 'map'; state.isInTown = false;
        map.drops = []; map.itemDrops = [];
        map.spawns = [{id:'targetCheck',monsterId:worldContent.monsters[0].id,count,overrides:{health:1000,attackDamage:0,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:2,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map); state.monsterColumns = 3; state.playerHp = 100; state.combatPaused = false; state.attackTimer = .8;
        resetCombatClock(); clearOfflineRecap(); Math.random = () => 0;
        return state.monsterStates;
    }
    try {
        for (const type of ['physical','poison','bleed','dot']) {
            const [a,b,c] = fresh(); b.hp = 1; applyDamageToMonster(b,1,type);
            check(type+' killing a secondary enemy preserves the living primary target',state.targetMonsterId === a.id && a.hp === 1000 && b.hp === 0 && c.hp === 1000);
            check(type+' killing a secondary enemy preserves attack progress and awards once',near(state.attackTimer,.8) && state.kills[map.id] === 1 && state.gold === 1);
            applyDamageToMonster(b,1,type); check(type+' cannot retarget or award a second kill for a corpse',state.targetMonsterId === a.id && state.kills[map.id] === 1);
        }
        let [a,b,c] = fresh(); applyDamageToMonster(a,1000);
        check('killing the selected target advances to the next living enemy and resets attack progress',state.targetMonsterId === b.id && state.attackTimer === 0);
        state.attackTimer = .6; applyDamageToMonster(c,1000);
        check('a later secondary kill keeps the newly selected enemy and its attack progress',state.targetMonsterId === b.id && near(state.attackTimer,.6));
        applyDamageToMonster(b,1000);
        check('killing the last enemy clears attack progress while waiting for respawn',!activeMonster() && state.attackTimer === 0);
        b.respawnRemaining = .1; simulateCombatStep(.1);
        check('a respawn restores a valid target after the encounter is empty',activeMonster()?.id === b.id && near(state.attackTimer,.1));
        [a,b,c] = fresh(); state.targetMonsterId = c.id; applyDamageToMonster(c,1000);
        check('target selection wraps around the roster after the last slot dies',state.targetMonsterId === a.id && state.attackTimer === 0);
        [a,b,c] = fresh(); b.hp = 0; b.respawnRemaining = .1; simulateCombatStep(.1);
        check('a secondary respawn cannot steal a living target or reset its timer',state.targetMonsterId === a.id && near(state.attackTimer,.9) && b.hp === 1000);
        [a,b,c] = fresh(); b.hp = 1; b.poisonStacks = [{remainingDuration:5,timeUntilTick:.1}]; simulateCombatStep(.1);
        check('real poison kills preserve the living target and attack progress',a.hp === 1000 && b.hp === 0 && state.targetMonsterId === a.id && near(state.attackTimer,.9));
        const fireId = skillNodeById.righteousFire ? 'righteousFire' : 'fireOfTheRighteous';
        [a,b,c] = fresh({[fireId]:1}); itemById.testAmulet.stats.healthRegen = 40; state.playerHp = 30; b.hp = .5; simulateCombatStep(.1);
        check('Fire killing a secondary target preserves the surviving primary target',near(a.hp,999) && b.hp === 0 && state.targetMonsterId === a.id && near(state.attackTimer,.9));
        [a,b,c] = fresh(); itemById.testAmulet.stats.multiHit = 1; b.hp = 1; state.attackTimer = getAttackSpeed() + .2; simulateCombatStep(.1);
        check('multi-hit secondary kills preserve the primary and leftover attack progress',a.hp === 900 && b.hp === 0 && c.hp === 1000 && state.targetMonsterId === a.id && near(state.attackTimer,.3));
        [a,b,c] = fresh({shockwaveSlash:1}); b.hp = 1; triggerShockwaveSlash(a,100);
        check('shockwave splash kills do not move the selected target',a.hp === 1000 && b.hp === 0 && state.targetMonsterId === a.id && near(state.attackTimer,.8));
        [a,b,c] = fresh(); b.hp = 1; shootAbilityArrow([a,b,c],1,'piercingArrow');
        check('piercing arrow row kills do not move a surviving primary target',a.hp === 999 && b.hp === 0 && c.hp === 999 && state.targetMonsterId === a.id && near(state.attackTimer,.8));
        [a,b,c] = fresh(); b.hp = 1; shootAbilityArrow([b],1,'multiShot');
        check('an arrow hitting only a secondary enemy cannot change the primary',a.hp === 1000 && b.hp === 0 && state.targetMonsterId === a.id && near(state.attackTimer,.8));
        [a,b,c] = fresh({volcanicEruption:1}); b.hp = 1; triggerVolcanicEruption(b,1);
        check('eruption secondary kills preserve the surviving primary target and attack progress',a.hp === 999 && b.hp === 0 && state.targetMonsterId === a.id && near(state.attackTimer,.8));
        [a,b,c] = fresh({shieldGenerator:1,shieldSlam:1}); b.hp = 1; state.shieldStacks = 9; applyDamageToMonster(b,1);
        check('a secondary kill charges Shield Slam against the original selected enemy',a.hp === 500 && b.hp === 0 && c.hp === 1000 && state.targetMonsterId === a.id && state.shieldStacks === 5 && near(state.attackTimer,.8));
        for (const page of ['townButton','inventoryButton','upgradesButton']) {
            [a,b,c] = fresh(); state.targetMonsterId = c.id; render(); document.getElementById(page).click(); document.getElementById('mapButton').click();
            check('returning from '+page+' preserves the living target, HP and attack progress',state.currentView === 'map' && state.targetMonsterId === c.id && c.hp === 1000 && near(state.attackTimer,.8));
        }
        document.getElementById('mapButton').click(); check('clicking Map again does not reset an active fight',state.targetMonsterId === c.id && near(state.attackTimer,.8));
        b.hp = 0; b.respawnRemaining = 2; state.targetMonsterId = b.id; document.getElementById('mapButton').click();
        check('returning to Map still replaces a stale dead target and resets its attack progress',state.targetMonsterId === c.id && state.attackTimer === 0);
        [a,b,c] = fresh(); state.targetMonsterId = c.id;
        const saved = parseGameSave(JSON.stringify(createGameSave())); state.targetMonsterId = a.id; state.attackTimer = 0; applyGameSave(saved);
        check('save and load preserve a living target and its attack progress',state.targetMonsterId === c.id && near(state.attackTimer,.8));
        const snapshot = () => JSON.stringify({target:state.targetMonsterId,attack:state.attackTimer,hp:state.playerHp,monsters:state.monsterStates,kills:state.kills,gold:state.gold});
        function run(effects) {
            fresh({[fireId]:1}); itemById.testAmulet.stats.healthRegen = 40; state.playerHp = 30; state.monsterStates[1].hp = .5;
            for (let index = 0; index < 100; index++) simulateCombatStep(.1,effects);
            return snapshot();
        }
        check('foreground and offline combat agree on target selection and attack progress',run(true) === run(false));
        check('no runtime errors',!window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR '+error.stack); }
    finally { Math.random = originalRandom; itemById.testAmulet.stats = originalStats; combatStatCache = null; resetCombatClock(); clearOfflineRecap(); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
