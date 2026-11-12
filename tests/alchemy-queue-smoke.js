(function () {
    const checks=[],check=(name,ok)=>{if(!ok)throw new Error(name);checks.push('PASS '+name);};
    const A=Alchemy,P=Professions,C=AlchemyContent,copy=value=>JSON.parse(JSON.stringify(value));
    function profile(level=1) {
        const p={gold:0,materials:{gel:1000,fang:1000,crystal:1000},alchemy:A.defaults(),professions:P.defaults(),combatPaused:true,playerHp:0,monsterStates:[]};
        p.professions.xp.alchemy=P.xpForLevel(level);p.alchemy.unlocked=true;p.alchemy.rngState=1234;
        for(const liquid of Object.values(p.alchemy.liquids)){liquid.unlocked=true;liquid.amount=120;}
        return p;
    }
    try {
        clearOfflineRecap();resetCombatClock();
        const p=profile();A.brewBatch(p,'moonveil',2);
        check('only the active brew pays ingredients',p.materials.gel===997&&p.alchemy.liquids.moonwater.amount===115&&p.alchemy.potions.moonveil===0&&p.professions.xp.alchemy===0&&!p.alchemy.discovered.length);
        A.tick(p,9.9);check('first brew waits the full ten seconds',p.alchemy.queue[0].work===9900000&&p.alchemy.potions.moonveil===0);
        A.tick(p,.1);check('completion starts and charges the next brew once',p.alchemy.potions.moonveil===600&&p.professions.xp.alchemy===10&&p.alchemy.queue[0].remaining===1&&p.alchemy.discovered.includes('moonveil')&&p.materials.gel===994&&p.alchemy.liquids.moonwater.amount===110);
        A.tick(p,10,()=>.99);check('failed completion consumes its paid attempt without rewards',!p.alchemy.queue.length&&p.alchemy.lastBrew.succeeded===1&&p.alchemy.lastBrew.failed===1&&p.alchemy.potions.moonveil===600&&p.professions.xp.alchemy===10);
        const waiting=profile();A.brewBatch(waiting,'moonveil',2);waiting.alchemy.liquids.moonwater.amount=0;const waitingSteps=copy(waiting);
        A.tick(waiting,159,()=>0);for(let i=0;i<1590;i++)A.tick(waitingSteps,.1,()=>0);
        check('liquid shortages resume at the correct offline production time',JSON.stringify(waiting)===JSON.stringify(waitingSteps)&&waiting.alchemy.queue[0].paid&&waiting.alchemy.queue[0].work===9000000&&waiting.alchemy.potions.moonveil===600);
        A.tick(waiting,1,()=>0);check('resumed brew completes after its own full duration',waiting.alchemy.queue.length===0&&waiting.alchemy.potions.moonveil===1200);
        const missing=profile();A.brewBatch(missing,'moonveil',2);missing.materials.gel=0;A.tick(missing,100);
        check('material shortages pause without spending or banking brew work',missing.alchemy.queue[0].remaining===1&&!missing.alchemy.queue[0].paid&&missing.alchemy.queue[0].work===0&&missing.materials.gel===0);
        const missingRestored=copy(missing);missingRestored.alchemy=A.normalize(missingRestored.alchemy);missingRestored.materials.gel=3;A.tick(missingRestored,1,()=>0);
        check('paused queues survive reload and charge once on resuming',missingRestored.materials.gel===0&&missingRestored.alchemy.queue[0].paid&&missingRestored.alchemy.queue[0].work===1000000);
        const oldPaid=profile();A.brewBatch(oldPaid,'moonveil',2);A.tick(oldPaid,2);oldPaid.materials.gel-=3;oldPaid.alchemy.liquids.moonwater.amount-=5;
        delete oldPaid.alchemy.queue[0].paid;delete oldPaid.alchemy.queue[0].prepaid;oldPaid.alchemy=A.normalize(oldPaid.alchemy);const paidMaterials=oldPaid.materials.gel;
        A.tick(oldPaid,18,()=>0);check('older prepaid queues never charge ingredients twice',oldPaid.materials.gel===paidMaterials&&oldPaid.alchemy.queue.length===0&&oldPaid.alchemy.potions.moonveil===1200);
        const later=profile(6);A.brewBatch(later,'moonveil');const laterBefore=JSON.stringify(later);
        check('busy station rejects another recipe without spending',A.brewBatch(later,'emberheart')===false&&JSON.stringify(later)===laterBefore);
        const ordered=profile(6);A.brewBatch(ordered,'moonveil',2);
        A.tick(ordered,20);check('finishing a batch frees the station',!ordered.alchemy.queue.length&&A.brewBatch(ordered,'emberheart'));
        A.tick(ordered,19);check('second recipe takes twenty seconds',ordered.alchemy.potions.emberheart===0);A.tick(ordered,1);
        A.brewBatch(ordered,'twilight');
        A.tick(ordered,29);check('third recipe takes thirty seconds',ordered.alchemy.potions.twilight===0);A.tick(ordered,1);
        check('later recipes finish at their configured times',!ordered.alchemy.queue.length&&ordered.alchemy.potions.emberheart===600&&ordered.alchemy.potions.twilight===900);
        const bulk=profile(6);A.brewBatch(bulk,'moonveil',20);const steps=copy(bulk);
        A.tick(bulk,183.7);for(let i=0;i<1837;i++)A.tick(steps,.1);
        check('offline bulk and foreground steps give identical queue, RNG, XP and stock',JSON.stringify(bulk)===JSON.stringify(steps));
        const resumed=copy(bulk);resumed.alchemy=A.normalize(resumed.alchemy);resumed.professions=P.normalize(resumed.professions);
        A.tick(bulk,100);A.tick(resumed,100);
        check('saving halfway through a brew resumes identical outcomes',JSON.stringify(bulk)===JSON.stringify(resumed));
        const equipped=profile(20);equipped.combatPaused=false;equipped.playerHp=100;equipped.monsterStates=[{hp:100}];equipped.alchemy.potions.moonveil=15;equipped.alchemy.discovered=['moonveil'];A.equip(equipped,'moonveil');A.brewBatch(equipped,'moonveil',2);const equippedSteps=copy(equipped);
        A.tick(equipped,30);for(let i=0;i<300;i++)A.tick(equippedSteps,.1);
        check('new potions join equipped reserves at their completion time',JSON.stringify(equipped)===JSON.stringify(equippedSteps)&&equipped.alchemy.potions.moonveil===1185);
        const legacy=copy(profile().alchemy);delete legacy.queue;delete legacy.rngState;delete legacy.lastBrew;
        check('legacy saves migrate with an empty queue',A.normalize(legacy).queue.length===0);
        const bad=profile();A.brewBatch(bad,'moonveil');
        for(const edit of [d=>d.queue[0].work=10000000,d=>d.queue[0].remaining=0,d=>d.queue[0].id='missing',d=>d.queue[0].succeeded=3,d=>d.rngState=null,d=>d.unlocked=false]) {
            const value=copy(bad.alchemy);edit(value);let rejected=false;try{A.normalize(value);}catch{rejected=true;}check('malformed saved queue is rejected',rejected);
        }
        const full=profile(20);full.alchemy.liquids.moonwater.capacityLevel=10;full.alchemy.liquids.moonwater.amount=1320;
        for(let i=0;i<C.maximumQueueEntries;i++)A.brewBatch(full,'moonveil');const before=JSON.stringify(full);
        check('full queue rejects additions without charging',A.brewBatch(full,'moonveil')===false&&JSON.stringify(full)===before);
        state.alchemy=profile().alchemy;state.professions=P.defaults();state.materials={...state.materials,gel:100};state.currentView='alchemy';state.combatPaused=true;state.playerHp=0;render();
        document.querySelector('[data-select-liquid="moonwater"]').click();document.querySelector('[data-select-material="gel"]').click();document.getElementById('alchemyBrew').click();
        check('UI queues a pending brew and saves it',state.alchemy.queue.length===1&&parseGameSave(localStorage.getItem(saveKey)).alchemy.queue.length===1&&document.getElementById('alchemyQueueList').children.length===1&&state.professions.xp.alchemy===0);
        simulateCombatStep(4.5,false);const saved=parseGameSave(JSON.stringify(createGameSave()));applyGameSave(saved);
        check('profile round trip retains partial brew work',state.alchemy.queue[0].work===4500000);
        for(const view of ['map','town','townPage','inventory','upgrades','alchemy']) {
            state.alchemy=profile().alchemy;state.professions=P.defaults();state.currentView=view;A.brewBatch(state,'moonveil');simulateCombatStep(10,false);
            check('queue completes while dead on '+view,state.alchemy.queue.length===0&&state.alchemy.potions.moonveil===600&&state.professions.xp.alchemy===10);
        }
        state.alchemy=profile().alchemy;state.professions=P.defaults();A.brewBatch(state,'moonveil',2);
        const offline=createGameSave();offline.lastSimulatedAt=Date.now()-25000;
        applyGameSave(parseGameSave(JSON.stringify(offline)));processCombatBacklog();
        check('saved queue completes through the actual offline catch-up clock',!state.alchemy.queue.length&&state.alchemy.potions.moonveil>=600&&state.alchemy.lastBrew.total===2&&pendingCombatSeconds<.1);
        resetCombatClock();
        state.alchemy=profile().alchemy;state.professions=P.defaults();state.currentView='alchemy';render();
        const snapshot=JSON.stringify([state.materials,state.alchemy,state.professions]);const original=Storage.prototype.setItem;
        Storage.prototype.setItem=function(key,value){if(key===saveKey)throw new Error('full');return original.call(this,key,value);};
        try{document.getElementById('alchemyBrew').click();}finally{Storage.prototype.setItem=original;}
        check('failed queue save restores ingredients and queue',snapshot===JSON.stringify([state.materials,state.alchemy,state.professions]));
        A.brewBatch(state,'moonveil',2);A.tick(state,3);render();
        check('active queue shows progress and timing',document.getElementById('alchemyQueueProgress').value===.3&&document.getElementById('alchemyQueueList').textContent.includes('7s'));
        const scene=document.getElementById('alchemyScene'),queue=document.querySelector('.alchemy-queue'),panel=document.querySelector('.alchemy-brew-panel');
        check('queue appears below the cauldron and before potion selection',scene.nextElementSibling===queue&&queue.nextElementSibling===panel&&queue.getBoundingClientRect().top>=scene.getBoundingClientRect().bottom);
        check('explanatory and placeholder text is removed',!document.getElementById('alchemyTrainingNote')&&!document.querySelector('.alchemy-coming')&&!document.querySelector('.alchemy-slot-count'));
        check('queue fits viewport',document.documentElement.scrollWidth<=innerWidth);
        A.tick(state,20,()=>0);render();
        const heading=document.getElementById('alchemyQueueHeading'),result=document.getElementById('alchemyQueueResult');
        check('finished results share the Brewing heading row',result.textContent.includes('brewed')&&result.parentElement===heading.parentElement&&Math.abs(result.getBoundingClientRect().bottom-heading.getBoundingClientRect().bottom)<8);
        state.currentView='inventory';render();state.currentView='alchemy';render();
        check('leaving after brewing clears the previous results',result.textContent==='');
        A.brewBatch(state,'moonveil');render();A.tick(state,10,()=>0);render();
        check('new brewing shows a fresh completion result',result.textContent.includes('brewed'));
        check('results remain inside the queue on mobile',result.getBoundingClientRect().right<=queue.getBoundingClientRect().right&&document.documentElement.scrollWidth<=innerWidth);
        check('no browser errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
