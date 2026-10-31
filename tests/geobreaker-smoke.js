(function () {
    const checks = [], originalRandom = Math.random, originalStats = itemById.testAmulet.stats;
    const map = currentMap(), geobreaker = itemData.items.find(item => item.uniqueEffect === 'geobreakerShockwave');
    const near = (a,b) => Math.abs(a-b) < 1e-6;
    const check = (name,ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) throw new Error(name); };
    function fresh({equipped = true, owned = true, ranks = {shockwaveSlash:1,resonantGuard:1}, count = 3} = {}) {
        combatStatCache = null; combatPoisonForecasts = null; clearFury();
        state.skillRanks = {...ranks}; pendingSkillRanks = {}; state.shieldStacks = 0;
        state.level = 100; state.skillPoints = 0; state.experience = 0;
        state.gear = createEmptyGear(); state.gear.necklace = 'testAmulet';
        if (equipped) state.gear.weapon = geobreaker.id;
        state.ownedItemIds = ['testAmulet',...(owned ? [geobreaker.id] : [])]; state.crafted = []; state.itemCrafts = {};
        itemById.testAmulet.stats = {poisonChance:1}; state.upgrades = {strength:0,haste:0,evasion:0};
        state.kills = Object.fromEntries(mapData.map(entry => [entry.id,0]));
        state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id,0]));
        state.gold = 0; state.lootLog = []; state.lastLoot = null; state.tutorials = createTutorialState();
        state.selectedMap = map.id; state.selectedWorld = worldForMap(map.id).id; state.currentView = 'map'; state.isInTown = false;
        state.playerHp = 100; state.combatPaused = false; state.attackTimer = 0;
        map.drops = []; map.itemDrops = [];
        map.spawns = [{id:'geobreakerTarget',monsterId:worldContent.monsters[0].id,count,overrides:{health:1000,attackDamage:0,attackInterval:1000,accuracy:0,evasion:0,respawnSeconds:5,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map); resetCombatClock(); clearOfflineRecap(); Math.random = () => .4;
        return state.monsterStates;
    }
    try {
        check('Geobreaker unique effect is defined and validates', Boolean(geobreaker) && !Equipment.validate(itemData).length);
        check('item tooltip explains the chance, double activation and skill requirement', Equipment.describe(geobreaker).includes('50%') && Equipment.describe(geobreaker).includes('twice') && Equipment.describe(geobreaker).includes('Requires Shockwave Slash'));
        const comparison = document.createElement('span'); renderItemComparison(comparison,geobreaker);
        check('inventory comparison includes the unique effect', comparison.querySelector('.item-unique-effect')?.textContent.includes('50%'));
        let mobs = fresh(); triggerShockwaveSlash(mobs[0],100);
        check('equipped Geobreaker procs above the ordinary 25% chance and hits twice', mobs[0].hp === 1000 && mobs.slice(1).every(mob => near(mob.hp,934)));
        check('each wave applies its own Poison hit', mobs[0].poisonStacks.length === 0 && mobs.slice(1).every(mob => mob.poisonStacks.length === 2));
        check('Resonant Guard grants a shield for each activation', state.shieldStacks === 2);
        mobs = fresh(); Math.random = () => .499999; triggerShockwaveSlash(mobs[0],100);
        check('a roll just below 50% triggers both waves', near(mobs[1].hp,934));
        mobs = fresh(); Math.random = () => .5; triggerShockwaveSlash(mobs[0],100);
        check('50% boundary fails without shields or splash damage', mobs.every(mob => mob.hp === 1000) && state.shieldStacks === 0);
        mobs = fresh({equipped:false}); triggerShockwaveSlash(mobs[0],100);
        check('owning Geobreaker without equipping it keeps ordinary proc odds', mobs.every(mob => mob.hp === 1000));
        Math.random = () => .249999; triggerShockwaveSlash(mobs[0],100);
        check('ordinary Shockwave still fires once at 25% chance', near(mobs[1].hp,967) && state.shieldStacks === 1);
        mobs = fresh({owned:false}); triggerShockwaveSlash(mobs[0],100);
        check('an unowned item in a gear slot cannot grant the unique effect', mobs.every(mob => mob.hp === 1000));
        mobs = fresh({ranks:{resonantGuard:1}}); Math.random = () => { throw new Error('Unlearned Shockwave rolled a proc'); }; triggerShockwaveSlash(mobs[0],100);
        check('Geobreaker requires the Shockwave Slash skill', mobs.every(mob => mob.hp === 1000) && state.shieldStacks === 0);
        mobs = fresh({count:1}); triggerShockwaveSlash(mobs[0],100);
        check('a lone boss still grants two activation shields without self-splash', state.shieldStacks === 2 && mobs[0].hp === 1000);
        mobs = fresh(); state.shieldStacks = 9; triggerShockwaveSlash(mobs[0],100);
        check('double activation respects maximum shields', state.shieldStacks === getPlayerMaxShields());
        mobs = fresh(); mobs[1].hp = 20; mobs[2].hp = 80; triggerShockwaveSlash(mobs[0],100);
        check('a kill on wave one cannot grant duplicate kill rewards on wave two', mobs[1].hp === 0 && near(mobs[2].hp,14) && state.kills[map.id] === 1 && state.gold === 1);
        mobs = fresh({ranks:{shockwaveSlash:1,resonantGuard:1,multiShot:1}}); shootAbilityArrow([mobs[0]],100,'multiShot');
        check('Multishot can trigger both Geobreaker waves without recursion', near(mobs[0].hp,900) && mobs.slice(1).every(mob => near(mob.hp,934)) && state.shieldStacks === 2);
        mobs = fresh(); state.gear.weapon = null; triggerShockwaveSlash(mobs[0],100);
        check('unequipping immediately removes the modifier', mobs.every(mob => mob.hp === 1000));
        check('no runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    finally { Math.random = originalRandom; itemById.testAmulet.stats = originalStats; }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
