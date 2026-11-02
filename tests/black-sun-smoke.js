(async function () {
    const checks = [], originalStats = itemById.testAmulet.stats;
    const shield = itemData.items.find(item => item.uniqueEffect === 'blackSun'), fire = getRighteousFireNode() || skillNodeDefinition('righteousFire');
    const map = currentMap(), near = (a,b) => Math.abs(a-b) < 1e-6;
    const check = (name,ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) throw new Error(name); };
    function fresh({equipped=true,owned=true,learned=true,hp=1,regen=20,count=1} = {}) {
        combatStatCache=null; clearPlayerCombatBuffs(); state.skillRanks=learned?{[fire.id]:1}:{};
        pendingSkillRanks={}; state.level=learned?1:0;state.skillPoints=0;state.experience=0;state.experienceRemainder=0;
        state.defeatedBossWorldIds=[];state.skillPointRecoveryRanks=null;state.skillPointTrimPending=false;
        state.gear=createEmptyGear();state.gear.necklace='testAmulet';if(equipped)state.gear.weapon=shield.id;
        state.ownedItemIds=['testAmulet',...(owned?[shield.id]:[])];state.crafted=[];state.itemCrafts={};
        itemById.testAmulet.stats={healthRegen:regen};state.upgrades={strength:0,haste:0,evasion:0};
        state.kills=Object.fromEntries(mapData.map(entry=>[entry.id,0]));state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,0]));
        state.gold=0;state.tutorials=createTutorialState();state.lootLog=[];state.lastLoot=null;
        state.selectedMap=map.id;state.selectedWorld=worldForMap(map.id).id;state.currentView='map';state.isInTown=false;
        map.drops=[];map.itemDrops=[];map.spawns=[{id:'blackSunTarget',monsterId:worldContent.monsters[0].id,count,overrides:{health:1000,attackDamage:0,attackInterval:1000,accuracy:0,evasion:0,respawnSeconds:5,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);state.playerHp=hp;state.combatPaused=false;state.attackTimer=-100;resetCombatClock();clearOfflineRecap();
        return state.monsterStates;
    }
    try {
        check('Purple flame has a valid Black Sun unique effect', shield?.name === 'Purple flame' && !Equipment.validate(itemData).length);
        check('item tooltip describes the one-percent cap and doubled burn', Equipment.describe(shield).includes('Black Sun') && Equipment.describe(shield).includes('1%') && Equipment.describe(shield).includes('double burning damage'));
        let mobs=fresh();tickPlayerRegeneration(1);
        check('Black Sun sustains one percent HP and doubles the unused-regeneration burn',state.playerHp===1&&near(mobs[0].hp,980)&&getPlayerMaxHealth()===100);
        check('self-drain stays at ten percent maximum HP per second',getRighteousFireRegeneration(1).drain===10);
        mobs=fresh({count:5});tickPlayerRegeneration(1);
        check('the doubled burn remains split evenly among living enemies',mobs.every(monster=>near(monster.hp,996)));
        fresh({hp:.5});tickPlayerRegeneration(.1);
        check('simultaneous healing can recover to one percent without a drain-first death',near(state.playerHp,1)&&!state.combatPaused);
        fresh({hp:.5});applyPlayerHealing(100);
        check('direct healing also respects the one-percent limit',state.playerHp===1);
        fresh({hp:30});tickPlayerRegeneration(1);
        check('HP already above the cap drains normally rather than being deleted',state.playerHp===20);
        fresh({regen:0});tickPlayerRegeneration(.1);
        check('insufficient regeneration can still kill the player',state.playerHp===0&&state.combatPaused);
        mobs=fresh({equipped:false,hp:30});tickPlayerRegeneration(1);
        check('owning the shield without equipping it leaves ordinary Fire unchanged',state.playerHp===30&&near(mobs[0].hp,990));
        mobs=fresh({owned:false,hp:30});tickPlayerRegeneration(1);
        check('unowned gear cannot enable Black Sun',state.playerHp===30&&near(mobs[0].hp,990));
        mobs=fresh({learned:false,hp:30});tickPlayerRegeneration(1);
        check('without Fire of the Righteous normal healing and damage remain unchanged',state.playerHp===50&&mobs[0].hp===1000);
        fresh();render();const buff=elements.buffList.querySelector('[data-buff-id="fireOfTheRighteous"]');
        check('the Fire buff shows doubled damage and the actual Black Sun rules',buff?.querySelector('.buff-value').textContent==='20/s'&&buff.title.includes('Black Sun')&&buff.title.includes('1%')&&!buff.title.includes('30%'));
        state.gear.weapon=null;combatStatCache=null;tickPlayerRegeneration(1);
        check('unequipping restores the ordinary healing cap immediately',state.playerHp===11&&getRighteousFireSettings().regenHealthCap===.3);
        mobs=fresh();applyDamageToMonster(mobs[0],10,'spell','voidBolt');
        check('Black Sun does not double other abilities',mobs[0].hp===990);
        const snapshot=()=>JSON.stringify({hp:state.playerHp,monsters:state.monsterStates,kills:state.kills,gold:state.gold});
        fresh({count:4});for(let i=0;i<100;i++)simulateCombatStep(.1);const expected=snapshot();
        fresh({count:4});resetCombatClock(Date.now()-10000);processCombatBacklog();
        for(let i=0;pendingCombatSeconds+1e-8>=gameTickSeconds&&i<100;i++)await new Promise(resolve=>setTimeout(resolve,0));
        check('Black Sun behaves identically in foreground and offline combat',snapshot()===expected);
        fresh();
        const root=skillNodes.find(node=>node.start).id, paths=[[root]], visited=new Set([root]);let path;
        for(let i=0;i<paths.length;i++) { const current=paths[i],id=current.at(-1);if(id===fire.id){path=current.slice(1);break;}for(const next of skillNodeConnections[id])if(!visited.has(next)){visited.add(next);paths.push([...current,next]);} }
        if(!path)throw new Error('No connected Fire of the Righteous path');
        state.skillRanks=Object.fromEntries(path.map(id=>[id,1]));state.level=path.length;state.defeatedBossWorldIds=worldData.map(world=>world.id);state.skillPoints=0;
        const saved=parseGameSave(JSON.stringify(createGameSave()));applyGameSave(saved);
        check('saved and imported equipment retains the effect',state.gear.weapon===shield.id&&hasFireOfTheRighteous()&&getRighteousFireSettings().regenHealthCap===.01&&getRighteousFireSettings().damageMultiplier===2);
        check('no runtime errors',!window.smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error) { checks.push('ERROR '+error.stack); }
    finally { itemById.testAmulet.stats=originalStats;combatStatCache=null;resetCombatClock();clearOfflineRecap(); }
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
