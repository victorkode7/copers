(function () {
    const checks = [], check = (name,ok) => {if(!ok)throw new Error(name);checks.push('PASS '+name);};
    try {
        const p={professions:Professions.defaults(),level:10,experience:50,skillPoints:3};
        check('exact XP threshold grants a level',Professions.awardXp(p,'alchemy',100).levelsGained===1 && Professions.progress(p.professions,'alchemy').earned===0);
        check('one award can grant several levels',Professions.awardXp(p,'alchemy',500).levelsGained===2);
        const before=JSON.stringify(p);
        for(const amount of [0,-1,.5,NaN,Infinity,'2',Number.MAX_SAFE_INTEGER+1]) check('invalid XP award is rejected',Professions.awardXp(p,'alchemy',amount)===null);
        for(const id of ['missing','constructor','__proto__',null]) check('invalid profession is rejected',Professions.awardXp(p,id,10)===null);
        check('rejected awards cannot change player progress',JSON.stringify(p)===before);
        check('XP caps safely at maximum level',Professions.awardXp(p,'alchemy',Number.MAX_SAFE_INTEGER).level===99 && Professions.awardXp(p,'alchemy',1).added===0 && Professions.progress(p.professions,'alchemy').fraction===1);
        check('profession awards keep combat progress independent',p.level===10 && p.experience===50 && p.skillPoints===3);
        check('Alchemy is the only defined profession',Object.keys(Professions.definitions).join(',')==='alchemy' && Object.keys(Professions.defaults().xp).join(',')==='alchemy');
        for(const id of ['woodcutting','mining','smithing','crafting'])check('removed profession cannot earn XP',Professions.awardXp(p,id,10)===null);
        const bulk={professions:Professions.defaults()},steps={professions:Professions.defaults()};
        Professions.awardXp(bulk,'alchemy',12345);for(let i=0;i<12345;i++)Professions.awardXp(steps,'alchemy',1);
        check('bulk and repeated awards produce identical progression',JSON.stringify(bulk)===JSON.stringify(steps));
        const future={version:1,xp:{fishing:400},future:{value:1}},normalized=Professions.normalize(future);
        check('normalization preserves future data and fills new professions',normalized.xp.fishing===400 && normalized.future.value===1 && normalized.xp.alchemy===0 && !Object.hasOwn(future.xp,'alchemy'));
        for(const bad of [null,[],{version:2,xp:{}},{version:1,xp:[]},...[-1,.5,'10',null,Professions.maxXp+1].map(alchemy=>({version:1,xp:{alchemy}})),JSON.parse('{"version":1,"xp":{"__proto__":0}}')]) {
            let rejected=false;try{Professions.normalize(bad);}catch{rejected=true;}check('malformed profession data rejects normalization',rejected);
        }
        clearOfflineRecap();resetCombatClock();
        state.professions = Professions.defaults();
        check('Skills page and navigation have been removed',!document.getElementById('professionsButton') && !document.getElementById('professionsView'));
        Professions.awardXp(state,'alchemy',175);render();
        check('Alchemy level and progress are available to future UI',Professions.progress(state.professions,'alchemy').level===2 && Professions.progress(state.professions,'alchemy').fraction===.375);
        const saved = createGameSave(), parsed = parseGameSave(JSON.stringify(saved));
        state.professions=Professions.defaults();applyGameSave(parsed);render();
        check('Alchemy XP survives save round trip',state.professions.xp.alchemy===175);
        const retired=JSON.parse(JSON.stringify(saved));retired.currentView='professions';retired.alchemy.unlocked=true;
        check('removed Skills page restores to Alchemy when unlocked',parseGameSave(JSON.stringify(retired)).currentView==='alchemy');
        retired.alchemy.unlocked=false;
        check('removed Skills page restores to Town when Alchemy is locked',parseGameSave(JSON.stringify(retired)).currentView==='townPage');
        delete saved.professions;
        check('old profiles receive fresh profession progress',parseGameSave(JSON.stringify(saved)).professions.xp.alchemy===0);
        saved.professions={version:1,xp:{alchemy:-1}};
        let rejected=false;try{parseGameSave(JSON.stringify(saved));}catch{rejected=true;}
        check('corrupt profession progress rejects the save',rejected);
        state.alchemy.unlocked=true;state.currentView='alchemy';render();
        check('Apothecary heading has no Alchemy eyebrow',!document.querySelector('.alchemy-heading .eyebrow'));
        check('Alchemy heading shows the saved level and XP',document.getElementById('alchemyLevel').textContent==='Level 2' && document.getElementById('alchemyLevelXp').textContent==='75 / 200 XP to next level' && document.getElementById('alchemyLevelProgress').value===.375);
        Professions.awardXp(state,'alchemy',Professions.maxXp);render();
        check('Alchemy heading handles maximum level',document.getElementById('alchemyLevel').textContent==='Level 99' && document.getElementById('alchemyLevelXp').textContent==='Maximum level' && document.getElementById('alchemyLevelProgress').value===1);
        check('Alchemy heading fits the viewport',document.documentElement.scrollWidth<=innerWidth);
        check('no browser errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error) {checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
