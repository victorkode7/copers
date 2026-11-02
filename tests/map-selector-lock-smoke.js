(async function(){
    const checks=[],check=(name,ok)=>{checks.push((ok?'PASS ':'FAIL ')+name);if(!ok)throw new Error(name);};
    const originalScroll=window.scrollTo;let scrolls=0;
    try{
        await document.fonts.ready;window.scrollTo=()=>{scrolls++;};
        state.combatPaused=true;resetCombatClock();state.currentView='map';state.isInTown=false;
        const world=worldData[0],maps=mapsForWorld(world.id),lock=elements.mapSelectorLock;
        state.selectedWorld=world.id;state.selectedMap=maps[0].id;state.unlockedMapIds=maps.slice(0,2).map(map=>map.id);state.kills=Object.fromEntries(mapData.map(map=>[map.id,0]));
        state.mapListLocked=false;state.mapListExpanded=true;resetMonsterStates(currentMap());render();
        const select=id=>elements.mapList.querySelector('[data-map="'+id+'"]').click();
        check('the expanded selector shows its lock control',lock.getClientRects().length>0);
        select(maps[1].id);
        check('unlocked selector still collapses when choosing another map',state.selectedMap===maps[1].id&&!state.mapListExpanded&&elements.mapList.classList.contains('collapsed'));
        check('the collapsed selector hides the lock and its controls row',lock.getClientRects().length===0&&getComputedStyle(lock.parentElement).display==='none');
        select(state.selectedMap);
        check('reopening the selector restores the lock control',state.mapListExpanded&&lock.getClientRects().length>0);
        lock.click();
        check('the lock expands the selector and announces its active state',state.mapListLocked&&state.mapListExpanded&&lock.getAttribute('aria-pressed')==='true'&&!elements.mapList.classList.contains('collapsed'));
        select(maps[1].id);
        check('clicking the current map cannot collapse a locked selector',state.mapListExpanded&&!elements.mapPanel.classList.contains('is-collapsed'));
        const before=scrolls;select(maps[0].id);
        check('switching maps keeps the selector open without scrolling the page',state.selectedMap===maps[0].id&&state.mapListExpanded&&scrolls===before&&elements.mapList.getAttribute('aria-expanded')==='true');
        check('current map instructions do not offer collapsing while locked',!elements.mapList.querySelector('[data-map="'+maps[0].id+'"]').getAttribute('aria-label').includes('collapse'));
        select(maps[2].id);
        check('pinning does not bypass map unlock requirements',state.selectedMap===maps[0].id&&elements.mapList.querySelector('[data-map="'+maps[2].id+'"]').disabled);
        const box=lock.getBoundingClientRect(),panel=elements.mapPanel.getBoundingClientRect();
        check('the lock sits inside the bottom-right of the selector',box.left>panel.left+panel.width/2&&box.right<=panel.right&&box.bottom<=panel.bottom&&panel.bottom-box.bottom<30);
        saveGame();state.mapListLocked=false;state.mapListExpanded=false;
        check('saved lock preference restores through normal loading',loadGame()&&state.mapListLocked&&state.mapListExpanded);
        render();lock.click();select(state.selectedMap);
        check('unlocking restores current-map collapse behavior',!state.mapListLocked&&!state.mapListExpanded&&lock.getAttribute('aria-pressed')==='false');
        check('collapsing after unlocking hides the lock control again',lock.getClientRects().length===0);
        const legacy=createGameSave();delete legacy.mapListLocked;
        check('older profiles default to an unlocked selector',parseGameSave(JSON.stringify(legacy)).mapListLocked===false);
        let rejected=false;try{parseGameSave(JSON.stringify({...legacy,mapListLocked:'true'}));}catch{rejected=true;}
        check('malformed lock preferences are rejected',rejected);
        check('layout fits the viewport',document.documentElement.scrollWidth<=innerWidth);
        check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}finally{window.scrollTo=originalScroll;}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
