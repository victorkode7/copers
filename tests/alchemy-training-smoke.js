(function () {
    const checks=[],check=(name,ok)=>{if(!ok)throw new Error(name);checks.push('PASS '+name);};
    const A=Alchemy,P=Professions,copy=value=>JSON.parse(JSON.stringify(value));
    function profile(level=1) {
        const p={gold:0,materials:{gel:100000,fang:100000,crystal:100000},alchemy:A.defaults(),professions:P.defaults()};
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
        const first=finish(p,'moonveil',1,()=>.99);
        check('first discovery succeeds without a lucky roll',first.succeeded===1&&p.alchemy.discovered.includes('moonveil')&&p.alchemy.potions.moonveil===600&&p.professions.xp.alchemy===10);
        const xp=p.professions.xp.alchemy,materials=p.materials.gel;
        const failed=finish(p,'moonveil',1,()=>.99);
        check('failed known brew consumes ingredients and grants neither potion nor XP',failed.succeeded===0&&failed.failed===1&&p.materials.gel===materials-3&&p.alchemy.potions.moonveil===600&&p.professions.xp.alchemy===xp);
        let rolls=0;const batch=finish(p,'moonveil',4,()=>++rolls%2?.1:.99);
        check('batch attempts roll independently',batch.succeeded===2&&batch.failed===2&&rolls===4);
        check('unlock levels introduce materials gradually',A.materialUnlocked(profile(3),'fang')&&!A.materialUnlocked(profile(3),'crystal')&&A.materialUnlocked(profile(6),'crystal'));
        check('later recipes award more XP at the same level',A.xpPerBrew(profile(6),'twilight')>A.xpPerBrew(profile(6),'emberheart')&&A.xpPerBrew(profile(6),'emberheart')>A.xpPerBrew(profile(6),'moonveil'));
        check('success scales with level and caps at 100 percent',A.successChance(profile(1),'moonveil')===.7&&A.successChance(profile(3),'moonveil')>.7&&A.successChance(profile(20),'twilight')===1);
        check('level ten sharply reduces XP with further slowdown at eleven',A.xpPerBrew(profile(10),'twilight')<A.xpPerBrew(profile(9),'twilight')/1000&&A.xpPerBrew(profile(11),'twilight')<A.xpPerBrew(profile(10),'twilight')/10);
        const slow=profile(10);finish(slow,'twilight',1,()=>.99);
        check('tiny XP is retained in saveable fractional progress',slow.professions.alchemyXpRemainder>0&&slow.professions.alchemyXpRemainder<1&&P.normalize(copy(slow.professions)).alchemyXpRemainder===slow.professions.alchemyXpRemainder);
        let rejected=false;try{P.normalize({...slow.professions,alchemyXpRemainder:1});}catch{rejected=true;}check('invalid fractional XP is rejected',rejected);
        const bulk=profile(2);bulk.professions.xp.alchemy=299;bulk.alchemy.discovered=['moonveil'];const steps=copy(bulk);
        finish(bulk,'moonveil',5,()=>0);for(let i=0;i<5;i++)finish(steps,'moonveil',1,()=>0);
        check('batch and single brews agree across level ups',JSON.stringify(bulk.professions)===JSON.stringify(steps.professions)&&bulk.alchemy.potions.moonveil===steps.alchemy.potions.moonveil);
        state.alchemy=profile().alchemy;state.professions=P.defaults();state.materials={...state.materials,gel:100,fang:100,crystal:100,wood:100};state.currentView='alchemy';render();
        const tray=()=>[...document.querySelectorAll('[data-select-material]')].map(node=>node.dataset.selectMaterial).sort().join(',');
        check('UI hides locked and unrelated owned materials',tray()==='gel');
        P.awardXp(state,'alchemy',P.xpForLevel(3));render();check('level three reveals Fang',tray()==='fang,gel');
        P.awardXp(state,'alchemy',P.xpForLevel(6)-P.xpForLevel(3));render();check('level six reveals Crystal',tray()==='crystal,fang,gel');
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
