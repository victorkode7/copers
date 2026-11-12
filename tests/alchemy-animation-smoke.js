(function () {
    const checks=[],check=(name,ok)=>{if(!ok)throw new Error(name);checks.push('PASS '+name);};
    const $=id=>document.getElementById(id);
    try {
        clearOfflineRecap();resetCombatClock();state.alchemy=Alchemy.defaults();state.alchemy.unlocked=true;state.professions=Professions.defaults();state.materials={...state.materials,gel:100};state.alchemy.liquids.moonwater.amount=120;state.currentView='alchemy';render();
        check('idle cauldron has no brewing animation',!$('alchemyScene').classList.contains('is-brewing')&&$('alchemyCancel').hidden&&!$('alchemyBrewHeading').hidden);
        const fire=document.querySelector('.alchemy-fire-overlay');
        check('idle fire is hidden',getComputedStyle(fire).visibility==='hidden');
        Alchemy.brewBatch(state,'moonveil',3);render();
        check('active brew animates the cauldron and shows only Cancel in the panel',$('alchemyScene').classList.contains('is-brewing')&&!$('alchemyCancel').hidden&&['alchemyBrewHeading','alchemyBrewInfo','alchemyBatch','alchemyBrew'].every(id=>$(id).hidden));
        const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
        check('sprite animation respects reduced motion',getComputedStyle(document.querySelector('.alchemy-liquid-sheet')).animationName===(reduced?'none':'alchemy-liquid-frames'));
        check('brewing fire appears and respects reduced motion',getComputedStyle(fire).visibility==='visible'&&getComputedStyle(document.querySelector('.alchemy-fire-sheet')).animationName===(reduced?'none':'alchemy-sprite-frames'));
        check('ingredient selection is locked during brewing',[...document.querySelectorAll('[data-select-liquid],[data-select-material]')].every(node=>node.disabled)&&$('alchemySelectedMaterials').hidden);
        const snapshot=JSON.stringify([state.materials,state.alchemy,state.professions]);
        check('another batch is rejected without charging',Alchemy.brewBatch(state,'moonveil')===false&&JSON.stringify([state.materials,state.alchemy,state.professions])===snapshot);
        Alchemy.tick(state,4);render();const original=Storage.prototype.setItem;
        Storage.prototype.setItem=function(key,value){if(key===saveKey)throw new Error('full');return original.call(this,key,value);};
        try{$('alchemyCancel').click();}finally{Storage.prototype.setItem=original;}
        check('failed cancellation save keeps the active brew and animation',state.alchemy.queue.length===1&&state.alchemy.queue[0].work===4000000&&$('alchemyScene').classList.contains('is-brewing'));
        const gel=state.materials.gel,water=state.alchemy.liquids.moonwater.amount;$('alchemyCancel').click();
        check('Cancel stops brewing without charging unstarted attempts',!state.alchemy.queue.length&&state.materials.gel===gel&&state.alchemy.liquids.moonwater.amount===water&&state.alchemy.potions.moonveil===0&&state.professions.xp.alchemy===0);
        check('Cancel restores controls and stops animation',$('alchemyCancel').hidden&&!$('alchemyBrewHeading').hidden&&!$('alchemyScene').classList.contains('is-brewing'));
        check('Cancel extinguishes the fire',getComputedStyle(fire).visibility==='hidden');
        check('cancellation persists in the saved profile',parseGameSave(localStorage.getItem(saveKey)).alchemy.queue.length===0);
        Alchemy.brewBatch(state,'moonveil',2);render();Alchemy.tick(state,10,()=>0);render();
        check('current batch results update while brewing',$('alchemyQueueResult').textContent.includes('1 brewed')&&state.professions.xp.alchemy===10);
        Alchemy.tick(state,10,()=>0);render();
        check('completion stops animation and restores ingredient controls',state.alchemy.queue.length===0&&!$('alchemyScene').classList.contains('is-brewing')&&$('alchemyCancel').hidden&&!$('alchemyBatch').hidden);
        check('finished batch extinguishes the fire',getComputedStyle(fire).visibility==='hidden');
        Alchemy.brewBatch(state,'moonveil',2);state.materials.gel=0;Alchemy.tick(state,10);render();
        check('waiting for ingredients stops animation but keeps Cancel',!state.alchemy.queue[0].paid&&!$('alchemyScene').classList.contains('is-brewing')&&!$('alchemyCancel').hidden);
        check('waiting for ingredients extinguishes the fire',getComputedStyle(fire).visibility==='hidden');
        state.materials.gel=3;Alchemy.tick(state,.1);render();check('animation resumes when ingredients arrive',$('alchemyScene').classList.contains('is-brewing'));
        state.currentView='inventory';render();state.currentView='alchemy';render();check('returning to the page restores the active animation',$('alchemyScene').classList.contains('is-brewing'));
        check('no page overflow',document.documentElement.scrollWidth<=innerWidth);
        check('no browser errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
