(async function () {
    const preview=new URL(document.currentScript.src).searchParams.has('preview');
    const checks=[],$=id=>document.getElementById(id),check=(name,ok)=>{checks.push((ok?'PASS ':'FAIL ')+name);if(!ok)throw new Error(name);};
    const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
    try {
        state.currentView='town';state.isInTown=true;state.ownedItemIds=[];state.crafted=[];state.gear=createEmptyGear();state.itemCrafts={};state.itemRollSaves={};
        state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,10]));state.gold=1000000;state.combatPaused=true;
        state.tutorials=createTutorialState();state.mapMastery={};resetMonsterStates(currentMap());resetCombatClock();clearOfflineRecap();
        materialSources.gel=[{mapId:mapData[0].id,enemy:'Test monster',location:mapData[0].name}];
        ItemCrafting.setMode('recipes');render();
        const craft=$('craftList').querySelector('[data-craft="testAmulet"]'),card=craft.closest('.craft-card'),icon=card.querySelector('.equipment-sprite-trigger');
        const info=card.querySelector('.craft-material-info');info.click();const popover=$(info.dataset.materialInfo);info.focus();
        let replaced=0;const observer=new MutationObserver(records=>{for(const entry of records)replaced+=entry.removedNodes.length;});
        observer.observe($('craftList'),{childList:true});
        for(let i=0;i<40;i++){state.materials.gel++;state.gold++;renderCrafting();}
        await frame();observer.disconnect();
        check('resource updates retain recipe cards, sprites and open source popovers',card.isConnected&&icon.isConnected&&$(info.dataset.materialInfo)===popover&&popover.matches(':popover-open')&&document.activeElement===info);
        check('recipe refreshes update quantities without replacing the list',!replaced&&card.querySelector('.craft-materials>li>strong').textContent.startsWith(formatAmount(state.materials.gel)));
        popover.hidePopover();
        state.currentView='inventory';inventoryCategory='all';state.ownedItemIds=['testAmulet'];state.gear.necklace='testAmulet';render();
        const equipped=elements.gear.querySelector('[data-gear-slot="necklace"]'),material=elements.inventory.querySelector('[data-material-id="gel"]');
        material.open=true;const link=material.querySelector('[data-material-map]');link.focus();
        state.ownedItemIds.push('testDropHelm');state.materials.gel++;render();
        check('new loot keeps equipped hover targets, material details and focus stable',equipped===elements.gear.querySelector('[data-gear-slot="necklace"]')&&material===elements.inventory.querySelector('[data-material-id="gel"]')&&material.open&&document.activeElement===link);
        const weapon=itemData.items.find(item=>item.slot==='weapon'&&item.crafting);state.ownedItemIds.push(weapon.id);state.currentView='town';state.isInTown=true;ItemCrafting.setMode('stats');render();
        document.querySelector('[data-reroll-item="'+weapon.id+'"]').click();
        const art=$('rerollItemArt').firstElementChild,choice=$('potentialRolls').querySelector('button'),cost=$('rerollCost').firstElementChild,slot=$('rerollSlots').firstElementChild;
        choice.focus();
        for(let i=0;i<25;i++){state.gold++;state.materials.gel++;ItemCrafting.render();}
        check('reroll resource updates retain workbench art, stat choices, slots and focus',art===$('rerollItemArt').firstElementChild&&choice===$('potentialRolls').querySelector('button')&&cost===$('rerollCost').firstElementChild&&slot===$('rerollSlots').firstElementChild&&document.activeElement===choice);
        if(art.querySelector('img')){await art.querySelector('img').decode();art.click();const enlarged=document.querySelector('.equipment-sprite-preview');state.gold++;ItemCrafting.render();await frame();check('workbench sprite preview survives resource updates',enlarged&&enlarged===document.querySelector('.equipment-sprite-preview')&&art.getAttribute('aria-expanded')==='true');enlarged.click();}
        state.currentView='map';state.isInTown=false;render();
        const target=elements.skillPoints;updateCombatAttribute(target,'title','Live stacks: 1');target.scrollIntoView({block:'center'});
        target.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
        const tooltip=$('liveGameTooltip');
        check('changing combat hints use a single accessible tooltip',tooltip&&!tooltip.hidden&&tooltip.getAttribute('role')==='tooltip'&&tooltip.textContent==='Live stacks: 1'&&!target.hasAttribute('title'));
        for(let i=2;i<=100;i++)updateCombatAttribute(target,'title','Live stacks: '+i);
        check('live hint updates change text without dismissing or recreating the tooltip',tooltip===$('liveGameTooltip')&&!tooltip.hidden&&tooltip.textContent==='Live stacks: 100');
        await frame();await frame();
        const measure=target.getBoundingClientRect.bind(target);let reads=0;target.getBoundingClientRect=()=>{reads++;return measure();};
        await new Promise(resolve=>setTimeout(resolve,160));
        check('an idle open tooltip does not poll layout',reads===0);
        window.dispatchEvent(new Event('resize'));await frame();check('position updates respond to resize events',reads>0);target.getBoundingClientRect=measure;
        const bounds=tooltip.getBoundingClientRect();check('tooltip fits inside the viewport',bounds.left>=0&&bounds.right<=innerWidth+1&&bounds.top>=0&&bounds.bottom<=innerHeight+1);
        target.dispatchEvent(new PointerEvent('pointerout',{bubbles:true,relatedTarget:document.body,pointerType:'mouse'}));
        check('leaving a hint closes it and restores its latest native description',tooltip.hidden&&target.title==='Live stacks: 100');
        target.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));check('keyboard focus opens the same hint',!tooltip.hidden);
        document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));check('Escape dismisses the tooltip',tooltip.hidden);
        target.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
        target.hidden=true;LiveTooltips.refresh();check('hiding the target dismisses its tooltip',tooltip.hidden);target.hidden=false;
        const transient=document.createElement('span');elements.combatPanel.append(transient);updateCombatAttribute(transient,'title','Temporary effect');transient.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));transient.remove();LiveTooltips.refresh();check('expired effects dismiss their tooltip',tooltip.hidden);
        state.currentView='upgrades';render();await frame();await frame();
        const skill=document.querySelector('[data-skill-node="origin"]');skill.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
        const skillHint=$('skillNodeTooltip');for(let i=0;i<20;i++)renderUpgrades();
        check('skill tree hover survives ordinary game refreshes',!skillHint.hidden&&skillHint===$('skillNodeTooltip'));
        if(preview){state.currentView='map';render();updateCombatAttribute(target,'title','This tooltip stays open as the game updates.');target.scrollIntoView({block:'center'});target.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));}
        check('no runtime errors',!window.smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
