(async function(){
    const checks=[],check=(name,ok)=>{checks.push((ok?'PASS ':'FAIL ')+name);if(!ok)throw new Error(name);};
    try{
        await document.fonts.ready;state.combatPaused=true;resetCombatClock();
        check('game starts without the optional module or developer controls',!window.DeveloperTools&&!document.getElementById('developerTools')&&!document.getElementById('developerTravel')&&!document.getElementById('resetTownProgress')&&!document.getElementById('hideDeveloperNavigation'));
        check('playtest uses the existing normal save namespace',saveKey==='idleAdventureSave'&&createGameSave().profileEnvironment==='playtest');
        check('playtest has no developer level button',!document.getElementById('increaseLevelButton'));
        state.developerItemsEnabled=true;state.developerTravelEnabled=true;state.gold=0;
        check('changing developer flags cannot grant admin equipment',itemData.items.filter(item=>item.developerOnly).every(item=>!ownsItem(item.id)));
        check('changing flags cannot bypass travel or spending',!worldIsUnlocked(1)&&!GameResources.canSpend(state,{gold:1})&&!GameResources.spend(state,{gel:1}));
        check('Town purchases retain normal costs',!TownProgression.can(state,'purchase','lumberOutpost'));
        const save=createGameSave();delete save.profileEnvironment;save.developerItemsEnabled=true;save.developerTravelEnabled=true;
        const admin=itemData.items.find(item=>item.developerOnly);save.gear[admin.slot]=admin.id;
        const parsed=parseGameSave(JSON.stringify(save));
        check('legacy imported flags are disabled and admin gear is unequipped',!parsed.developerItemsEnabled&&!parsed.developerTravelEnabled&&parsed.gear[admin.slot]===null);
        let rejected=false;try{parseGameSave(JSON.stringify({...save,profileEnvironment:'development'}));}catch{rejected=true;}
        check('development profiles cannot accidentally overwrite playtest progress',rejected);
        applyGameSave(parsed);state.gold=10000;
        check('normal spending still works and deducts real balances',TownProgression.apply(state,'purchase','lumberOutpost')&&state.gold===0);
        const map=currentMap(),item=itemData.items.find(item=>!item.developerOnly&&item.recipe);
        state.ownedItemIds=[];state.crafted=[item.id];const history=parseGameSave(JSON.stringify(createGameSave()));
        check('crafting history survives absent ownership in normal saves',history.crafted.includes(item.id)&&!history.ownedItemIds.includes(item.id));
        state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,100000]));
        state.unlockedMapIds=mapData.map(map=>map.id);state.unlockedWorldIds=worldData.map(world=>world.id);
        craftGear(item.id);
        check('normal reacquisition preserves a single completion record',ownsItem(item.id)&&state.crafted.filter(id=>id===item.id).length===1);
        resetCombatClock(Date.now()-1000);processCombatBacklog();for(let i=0;pendingCombatSeconds>=gameTickSeconds&&i<100;i++)await new Promise(resolve=>setTimeout(resolve,0));
        check('offline catch-up works without developer DOM elements',!combatCatchingUp);
        render();saveGame();
        check('saved flags cannot be enabled in a module-free build',!JSON.parse(localStorage.getItem(saveKey)).developerItemsEnabled&&!JSON.parse(localStorage.getItem(saveKey)).developerTravelEnabled);
        check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
