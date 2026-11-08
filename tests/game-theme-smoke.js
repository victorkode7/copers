// Visual states can be captured with ?screen=town-w2 (or map, crafting,
// rerolls, inventory, skills, mastery, settings, tooltip) and -ScreenshotPath.
const gameThemePreview = new URL(document.currentScript.src).searchParams.get('screen') || 'town-w1';
(async function(){
    const checks=[], $=id=>document.getElementById(id);
    const check=(name,ok)=>{checks.push((ok?'PASS ':'FAIL ')+name);if(!ok)throw new Error(name);};
    const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
    const theme=document.querySelector('link[href^="css/game-theme.css"]');
    const views=['town-w1','town-w2','town-w3','map','paused','defeated','crafting','rerolls','inventory','skills','mastery','settings','tooltip'];
    const colors=new Set();
    async function show(name){
        for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
        MapMastery.close(false);
        state.currentView=name.startsWith('town-')?'townPage':name==='crafting'||name==='rerolls'?'town':name==='inventory'?'inventory':name==='skills'?'upgrades':'map';
        state.isInTown=['town','townPage'].includes(state.currentView);
        state.combatPaused=name==='paused'||name==='defeated';
        state.playerHp=name==='defeated'?0:getPlayerMaxHealth();
        if(state.currentView==='town')ItemCrafting.setMode(name==='rerolls'?'stats':'recipes');
        render();
        if(name==='crafting'&&$('showHiddenRecipes').getAttribute('aria-pressed')!=='true')$('showHiddenRecipes').click();
        if(name==='rerolls'){
            const weapon=itemData.items.find(item=>item.slot==='weapon'&&item.crafting&&!item.developerOnly&&!item.id.startsWith('test'));
            document.querySelector('[data-reroll-item="'+weapon.id+'"]').click();
        }
        if(name.startsWith('town-'))$('townWorldList').children[Number(name.at(-1))-1].click();
        if(name==='mastery')MapMastery.open();
        if(name==='settings')$('openCombatSettings').click();
        if(name==='tooltip'){
            updateCombatAttribute(elements.skillPoints,'title','Mana regeneration: 12 / second.\nGold gained: +25%.');
            elements.skillPoints.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
        }else elements.skillPoints.dispatchEvent(new PointerEvent('pointerout',{bubbles:true,pointerType:'mouse',relatedTarget:document.body}));
        window.scrollTo(0,0);await frame();await frame();
    }
    const geometry=nodes=>nodes.map(node=>{const box=node.getBoundingClientRect();return [box.x,box.y,box.width,box.height];});
    const gameState=()=>JSON.stringify({gold:state.gold,kills:state.kills,gear:state.gear,materials:state.materials,town:state.townProgress,ranks:state.skillRanks,mastery:state.mapMastery});
    try{
        await document.fonts.ready;
        check('the game-only theme is loaded',Boolean(theme?.sheet));
        state.combatPaused=true;resetCombatClock();clearOfflineRecap();state.tutorials=createTutorialState();
        const request=new XMLHttpRequest();request.open('GET','builds/shielded-vanguard-starter-30.json',false);request.send();
        state.skillRanks=JSON.parse(request.responseText).skillRanks;state.level=30;state.skillPoints=0;pendingSkillRanks={};
        state.defeatedBossWorldIds=worldData.slice(0,2).map(world=>world.id);
        state.unlockedWorldIds=worldData.map(world=>world.id);state.unlockedMapIds=mapData.map(map=>map.id);
        const map=mapsForWorld(worldData[0].id).at(-2);state.selectedMap=map.id;state.selectedWorld=worldData[0].id;
        state.kills=Object.fromEntries(mapData.map(entry=>[entry.id,entry.id===map.id?entry.goal*12:entry.goal]));
        state.mapMastery={[map.id]:{earned:4,nodes:['wealth1']}};
        state.mapListExpanded=true;state.mapListLocked=false;
        state.gold=123456;state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,800]));
        const equipment=itemData.items.filter(item=>!item.developerOnly&&(item.recipe||item.crafting));
        state.ownedItemIds=equipment.map(item=>item.id);state.crafted=equipment.filter(item=>item.recipe).map(item=>item.id);
        state.gear=createEmptyGear();state.itemCrafts={};
        const weapon=equipment.find(item=>item.slot==='weapon'&&item.crafting&&!item.id.startsWith('test'));
        state.itemCrafts[weapon.id]=Equipment.craftingPool(weapon,itemData).slice(0,weapon.crafting.slots).map(roll=>({stat:roll.stat,value:roll.min}));
        for(const slot of Object.keys(state.gear))state.gear[slot]=equipment.find(item=>item.slot===slot)?.id||null;
        inventoryCategory='all';
        state.townProgress=TownProgression.defaults();state.townProgress.buildings.anvil={tier:0,level:1};
        Object.assign(state.townProgress.buildings,{townHall:{tier:3,level:4},lumberOutpost:{tier:1,level:4},sawMill:{tier:1,level:6},menagerie:{tier:1,level:3},timberDepot:{tier:0,level:2},slopesTownHall:{tier:1,level:5},mine:{tier:1,level:4},smeltery:{tier:0,level:3}});
        state.townProgress.resources={wood:12500,planks:3200,ore:48000,bars:750};
        combatStatCache=null;invalidateSkillBonusCache();resetMonsterStates(map);state.playerHp=getPlayerMaxHealth();state.manaCapacity=getPlayerMaxMana();state.playerMana=state.manaCapacity*.65;
        for(const name of views){
            await show(name);
            const nodes=[...document.querySelectorAll('.nav-header button,.page-view:not([hidden]),.town-resource,.town-building-card,.craft-card,.equipment-slot,.skill-node,.mastery-node,dialog[open]')].filter(node=>{const box=node.getBoundingClientRect();return box.width&&box.height;});
            const saved=gameState();theme.disabled=true;await frame();await frame();const before=geometry(nodes);
            theme.disabled=false;await frame();await frame();
            check(name+' preserves layout dimensions and positions',geometry(nodes).every((box,index)=>box.every((value,axis)=>Math.abs(value-before[index][axis])<.6)));
            check(name+' fits the viewport without horizontal overflow',document.documentElement.scrollWidth<=innerWidth);
            check(name+' preserves progression and resource balances',gameState()===saved);
            if(name.startsWith('town-'))colors.add(getComputedStyle($('townPageView')).getPropertyValue('--town-surface-rgb').trim());
        }
        check('all Town worlds retain distinct color palettes',colors.size===3);
        await show('town-w1');
        const cards=[...$('townResourceList').children],before=geometry(cards);
        for(const amount of [9,9999,1e12]){
            for(const id of Object.keys(state.townProgress.resources))state.townProgress.resources[id]=amount;
            TownPage.renderProduction();
            check('resource cards remain fixed at '+amount,geometry(cards).every((box,index)=>box.every((value,axis)=>Math.abs(value-before[index][axis])<.6)));
        }
        state.townProgress.resources={wood:12500,planks:3200,ore:48000,bars:750};TownPage.renderProduction();
        check('resource hover tooltips remain absent',cards.every(card=>!card.hasAttribute('title')&&!card.querySelector('[title]')));
        check('page scrolling retains no scrollbar gutter',getComputedStyle(document.documentElement).scrollbarWidth==='none'&&document.documentElement.clientWidth===innerWidth);
        check('ordinary game text remains unselectable',getComputedStyle($('goldDisplay')).userSelect==='none');
        await show('skills');$('renameSkillPreset').click();
        const input=$('skillPresetName');
        check('preset renaming retains editable text selection',!input.hidden&&getComputedStyle(input).userSelect==='text'&&input.selectionEnd-input.selectionStart===input.value.length);
        input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
        await show('map');elements.mapSelectorLock.click();
        elements.mapList.querySelector('[data-map="'+state.selectedMap+'"]').click();
        check('the map lock still keeps the selector expanded',state.mapListLocked&&state.mapListExpanded);
        elements.mapSelectorLock.click();elements.mapList.querySelector('[data-map="'+state.selectedMap+'"]').click();
        check('collapsed map selectors still hide the lock',!state.mapListExpanded&&elements.mapSelectorLock.getClientRects().length===0);
        state.mapListExpanded=true;
        check('the theme adds no page-wide saturation or blur',getComputedStyle(document.body).filter==='none'&&getComputedStyle($('townPageView')).filter==='none');
        check('the pixel font remains active',getComputedStyle(document.body).fontFamily.includes('Copers Sans'));
        check('the navigation logo stays above the XP strip',document.querySelector('.logo').getBoundingClientRect().bottom<=document.querySelector('.experience-strip').getBoundingClientRect().top+1);
        await show(views.includes(gameThemePreview)?gameThemePreview:'town-w1');
        check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){if(theme)theme.disabled=false;checks.push('ERROR '+error.stack);}
    const style=document.createElement('style');style.textContent='#smoke-results{display:none}';document.head.append(style);
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
