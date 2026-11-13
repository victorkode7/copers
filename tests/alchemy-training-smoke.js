(function () {
    const checks=[],check=(name,ok)=>{if(!ok)throw new Error(name);checks.push('PASS '+name);};
    const A=Alchemy,P=Professions,copy=value=>JSON.parse(JSON.stringify(value));
    function profile(level=1) {
        const p={gold:0,materials:Object.fromEntries(Object.keys(materialNames).map(id=>[id,100000])),alchemy:A.defaults(),professions:P.defaults()};
        p.professions.xp.alchemy=P.xpForLevel(level);p.alchemy.unlocked=true;
        for(const liquid of Object.values(p.alchemy.liquids)){liquid.unlocked=true;liquid.amount=120;}
        p.alchemy.rngState=42;
        return p;
    }
    function finish(p,id,amount=1,random=()=>0) {
        if(!A.brewBatch(p,id,amount))return false;
        A.tick(p,AlchemyContent.recipes[id].brewSeconds*amount,random);
        return p.alchemy.lastBrew;
    }
    try {
        clearOfflineRecap();resetCombatClock();
        const p=profile();
        check('only early material is unlocked at level one',A.materialUnlocked(p,'gel')&&!A.materialUnlocked(p,'fang')&&!A.materialUnlocked(p,'crystal')&&!A.materialUnlocked(p,'wood'));
        const before=JSON.stringify(p);
        check('locked recipes cannot brew even with ingredients',A.brewBatch(p,'emberheart')===false&&A.maxBrewAmount(p,'twilight')===0&&JSON.stringify(p)===before);
        check('Gilded Draught unlocks alongside Emberheart at level three',!A.recipeUnlocked(profile(2),'gildedDraught')&&A.recipeUnlocked(profile(3),'gildedDraught')&&A.recipeUnlocked(profile(3),'emberheart'));
        const lockedOil=profile(9);lockedOil.alchemy.liquids.emberOil={...A.defaults().liquids.emberOil};const oilBefore=JSON.stringify(lockedOil);
        check('Ember Oil cannot unlock below level ten or spend resources',!A.canUnlockLiquid(lockedOil,'emberOil')&&!A.upgrade(lockedOil,'emberOil','unlock')&&JSON.stringify(lockedOil)===oilBefore);
        lockedOil.professions.xp.alchemy=P.xpForLevel(10);const water=lockedOil.alchemy.liquids.moonwater.amount;
        check('level ten permits the paid Ember Oil unlock',A.canUnlockLiquid(lockedOil,'emberOil')&&A.upgrade(lockedOil,'emberOil','unlock')&&lockedOil.alchemy.liquids.emberOil.unlocked&&lockedOil.alchemy.liquids.moonwater.amount===water-10);
        const legacyOil=profile(1);legacyOil.alchemy.liquids.emberOil.amount=12;
        check('existing unlocked Ember Oil is preserved in older saves',A.normalize(legacyOil.alchemy).liquids.emberOil.amount===12);
        check('pre-ten recipes require only Moonwater',Object.values(AlchemyContent.recipes).filter(recipe=>recipe.level<10).every(recipe=>Object.keys(recipe.liquids).join(',')==='moonwater'));
        check('both liquid recovery recipes unlock at level ten',!A.recipeUnlocked(profile(9),'emberwell')&&!A.recipeUnlocked(profile(9),'moonspring')&&A.recipeUnlocked(profile(10),'emberwell')&&A.recipeUnlocked(profile(10),'moonspring'));
        const first=finish(p,'moonveil',1,()=>.99);
        check('first discovery succeeds without a lucky roll',first.succeeded===1&&p.alchemy.discovered.includes('moonveil')&&p.alchemy.potions.moonveil===600&&p.professions.xp.alchemy===10);
        const xp=p.professions.xp.alchemy,materials=p.materials.gel;
        const failed=finish(p,'moonveil',1,()=>.99);
        check('failed known brew consumes ingredients and grants neither potion nor XP',failed.succeeded===0&&failed.failed===1&&p.materials.gel===materials-3&&p.alchemy.potions.moonveil===600&&p.professions.xp.alchemy===xp);
        let rolls=0;const batch=finish(p,'moonveil',4,()=>++rolls%2?.1:.99);
        check('batch attempts roll independently',batch.succeeded===2&&batch.failed===2&&rolls===4);
        check('unlock levels introduce regular materials before boss materials',A.materialUnlocked(profile(3),'material_0e547cc411cb91fce7c30162')&&!A.materialUnlocked(profile(3),'hide')&&A.materialUnlocked(profile(5),'hide')&&!A.materialUnlocked(profile(6),'crystal')&&A.materialUnlocked(profile(7),'crystal')&&!A.materialUnlocked(profile(9),'material_985927188da978e5f7fa3e5c')&&A.materialUnlocked(profile(10),'material_985927188da978e5f7fa3e5c'));
        check('later recipes award more XP at the same level',A.xpPerBrew(profile(6),'twilight')>A.xpPerBrew(profile(6),'emberheart')&&A.xpPerBrew(profile(6),'emberheart')>A.xpPerBrew(profile(6),'moonveil'));
        check('success scales with level and caps at 100 percent',A.successChance(profile(1),'moonveil')===.7&&A.successChance(profile(3),'moonveil')>.7&&A.successChance(profile(20),'twilight')===1);
        check('level ten sharply reduces XP with further slowdown at eleven',A.xpPerBrew(profile(10),'twilight')<A.xpPerBrew(profile(9),'twilight')/1000&&A.xpPerBrew(profile(11),'twilight')<A.xpPerBrew(profile(10),'twilight')/10);
        const slow=profile(10);finish(slow,'twilight',1,()=>.99);
        check('tiny XP is retained in saveable fractional progress',slow.professions.alchemyXpRemainder>0&&slow.professions.alchemyXpRemainder<1&&P.normalize(copy(slow.professions)).alchemyXpRemainder===slow.professions.alchemyXpRemainder);
        let rejected=false;try{P.normalize({...slow.professions,alchemyXpRemainder:1});}catch{rejected=true;}check('invalid fractional XP is rejected',rejected);
        const bulk=profile(2);bulk.professions.xp.alchemy=299;bulk.alchemy.discovered=['moonveil'];const steps=copy(bulk);
        finish(bulk,'moonveil',5,()=>0);for(let i=0;i<5;i++)finish(steps,'moonveil',1,()=>0);
        check('batch and single brews agree across level ups',JSON.stringify(bulk.professions)===JSON.stringify(steps.professions)&&bulk.alchemy.potions.moonveil===steps.alchemy.potions.moonveil);
        state.alchemy=profile().alchemy;state.professions=P.defaults();state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,100]));state.materials.wood=100;state.currentView='alchemy';render();
        const tray=()=>[...document.querySelectorAll('[data-select-material]')].map(node=>node.dataset.selectMaterial).sort().join(',');
        check('UI hides locked and unrelated owned materials',tray()==='gel');
        const originalMoonspringMaterials=AlchemyContent.recipes.moonspring.materials;AlchemyContent.recipes.moonspring.materials={gel:3};
        document.querySelector('[data-select-liquid="emberOil"]').click();document.querySelector('[data-select-material="gel"]').click();
        check('unknown locked formulas hide their level, costs and recipe button',document.getElementById('alchemyBrewHeading').textContent==='Unknown mixture'&&document.getElementById('alchemyBrewInfo').textContent===''&&document.querySelector('.alchemy-material-cost').textContent==='?'&&document.getElementById('alchemyBrew').textContent.startsWith('Combine')&&!document.getElementById('alchemyBrew').disabled);
        const unknownBefore=JSON.stringify(state.alchemy);document.getElementById('alchemyBrew').click();
        check('attempting an unknown locked formula reveals no requirement or ingredients',document.getElementById('alchemyStatus').textContent==='No recipe found.'&&JSON.stringify(state.alchemy)===unknownBefore);
        document.querySelector('[data-select-liquid="emberOil"]').click();document.querySelector('[data-select-material="gel"]').click();
        AlchemyContent.recipes.moonspring.materials=originalMoonspringMaterials;
        const early=['gel','material_0e547cc411cb91fce7c30162','material_1b4e649727a05b3ad2ec7f8a'];
        P.awardXp(state,'alchemy',P.xpForLevel(3));render();check('level three reveals Tusk and Honeycomb',tray()===early.slice().sort().join(','));
        P.awardXp(state,'alchemy',P.xpForLevel(5)-P.xpForLevel(3));render();check('level five reveals Wolf Fur',tray()===[...early,'hide'].sort().join(','));
        P.awardXp(state,'alchemy',P.xpForLevel(7)-P.xpForLevel(5));render();check('level seven reveals the first boss material',tray()===[...early,'hide','crystal'].sort().join(','));
        state.alchemy.liquids.emberOil={...A.defaults().liquids.emberOil};state.professions.xp.alchemy=P.xpForLevel(9);render();
        const oilUnlock=document.querySelector('[data-liquid="emberOil"] [data-upgrade="unlock"]');
        check('UI shows the Ember Oil level requirement before ten',oilUnlock.disabled&&oilUnlock.textContent==='Level 10');
        state.professions.xp.alchemy=P.xpForLevel(10);render();check('UI enables Ember Oil unlocking at ten',!oilUnlock.disabled&&oilUnlock.textContent==='Unlock');
        state.professions=P.defaults();state.alchemy=profile().alchemy;render();
        document.querySelector('[data-select-liquid="moonwater"]').click();document.querySelector('[data-select-material="gel"]').click();
        document.getElementById('alchemyBrew').click();
        A.tick(state,10);render();
        check('brewing updates saved XP and discovery UI',state.professions.xp.alchemy===10&&state.alchemy.discovered.includes('moonveil')&&document.getElementById('alchemyBrewInfo').textContent.includes('70%'));
        const snapshot=JSON.stringify([state.materials,state.alchemy,state.professions]);
        const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key===saveKey)throw new Error('full');return original.call(this,key,value);};
        try{document.getElementById('alchemyBrew').click();}finally{Storage.prototype.setItem=original;}
        check('failed saving rolls back ingredients, potion results and XP',snapshot===JSON.stringify([state.materials,state.alchemy,state.professions]));
        const saved=parseGameSave(JSON.stringify(createGameSave()));applyGameSave(saved);render();
        check('training progress survives profile round trip',state.professions.xp.alchemy===10);
        check('no horizontal page overflow',document.documentElement.scrollWidth<=innerWidth);
        check('no browser errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
