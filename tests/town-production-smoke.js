(async function(){
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const spec=TownContent.buildings.lumberOutpost.production;
    const originalCapacity=TownContent.resources.wood.capacity;
    const secondsPerLog=1/TownProgression.production('lumberOutpost',{tier:0,level:1}).perSecond;
    const fresh=()=>{const profile={gold:10000,townProgress:TownProgression.defaults()};TownProgression.apply(profile,'purchase','lumberOutpost');return profile;};
    try{
        await document.fonts.ready;state.defeatedBossWorldIds=[worldData[0].id];
        const locked={townProgress:TownProgression.defaults()};TownProgression.tick(locked,100);
        check('unowned outposts produce nothing',!Object.hasOwn(locked.townProgress.resources,'wood'));
        const short=fresh();TownProgression.tick(short,.6*secondsPerLog);
        check('partial cycles do not grant logs early',short.townProgress.resources.wood===0);
        short.townProgress=TownProgression.normalize(JSON.parse(JSON.stringify(short.townProgress)));TownProgression.tick(short,.4*secondsPerLog);
        check('saved partial production completes exactly one log',short.townProgress.resources.wood===1&&short.townProgress.buildings.lumberOutpost.production.fraction===0);
        const stepped=fresh(),offline=fresh();for(let i=0;i<1234;i++)TownProgression.tick(stepped,.1);TownProgression.tick(offline,123.4);
        check('offline and foreground award equal logs and retain fractions',stepped.townProgress.resources.wood===offline.townProgress.resources.wood&&Math.abs(stepped.townProgress.buildings.lumberOutpost.production.fraction-offline.townProgress.buildings.lumberOutpost.production.fraction)<1e-7);
        const boosted=fresh();boosted.gold=4000;boosted.townProgress.resources.wood=4000;
        TownProgression.apply(boosted,'upgrade','townHall');TownProgression.tick(boosted,10*secondsPerLog);
        check('one Hall upgrade adds ten percent to actual production',boosted.townProgress.resources.wood===2011&&TownProgression.productivity(boosted)===1.1);
        TownProgression.apply(boosted,'upgrade','townHall');TownProgression.tick(boosted,10*secondsPerLog);
        check('Hall upgrades stack additively rather than compounding',boosted.townProgress.resources.wood===23&&TownProgression.productivity(boosted)===1.2);
        const invalid=TownProgression.clone(short.townProgress);invalid.buildings.lumberOutpost.production.phase=Infinity;let rejected=false;try{TownProgression.normalize(invalid);}catch{rejected=true;}
        check('invalid saved production is rejected',rejected);
        state.townProgress=fresh().townProgress;state.combatPaused=true;state.currentView='townPage';state.isInTown=true;state.playerHp=0;render();
        simulateCombatStep(.5*secondsPerLog);TownPage.renderProduction();
        const card=document.querySelector('[data-building="lumberOutpost"]'),bar=card.querySelector('[role="progressbar"]'),fill=bar.firstElementChild;
        check('production runs while dead and combat is paused',state.townProgress.buildings.lumberOutpost.production.fraction===.5);
        check('outpost has a half-full bottom production bar',!bar.parentElement.hidden&&bar.getAttribute('aria-valuenow')==='50'&&fill.style.transform==='scaleX(0.5)');
        if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
            const animation=fill.getAnimations()[0];
            check('the fill uses one continuous linear animation',animation&&animation.effect.getTiming().iterations===Infinity&&animation.effect.getTiming().easing==='linear');
            const duration=animation.effect.getTiming().duration;
            animation.pause();animation.currentTime=duration*.2;TownPage.renderProduction();TownPage.renderProduction();
            check('repeated game renders never rewind or replace the fill',fill.getAnimations()[0]===animation&&animation.currentTime===duration*.2);
            animation.play();await animation.ready;const before=animation.currentTime;await new Promise(resolve=>setTimeout(resolve,160));
            check('the fill advances between simulation updates ('+Math.round(animation.currentTime-before)+' ms)',animation.currentTime-before>80);
            animation.pause();animation.currentTime=duration-10;
            const production=state.townProgress.buildings.lumberOutpost.production,phase=production.phase;production.phase=.01;
            TownPage.renderProduction();
            check('a simulation cycle rollover does not seek the bar backwards',animation.currentTime===duration-10&&fill.getAnimations().length===1);
            animation.play();await animation.ready;await new Promise(resolve=>setTimeout(resolve,80));
            check('the continuous fill completes and starts its next cycle',animation.currentTime>duration);
            production.phase=phase;
            state.currentView='map';render();check('leaving Town cancels the fill animation',fill.getAnimations().length===0);
            state.currentView='townPage';render();check('returning to Town resumes a single fill animation',fill.getAnimations().length===1);
        }
        const nodes=card.querySelectorAll('*').length;
        simulateCombatStep(.5*secondsPerLog);await new Promise(resolve=>setTimeout(resolve,520));TownPage.renderProduction();
        check('logs update totals without floating popups',!card.querySelector('.town-log-gain')&&state.townProgress.resources.wood===1);
        TownContent.buildings.lumberOutpost.production={resource:'wood',perSecond:1e12};
        TownContent.resources.wood.capacity=Number.MAX_SAFE_INTEGER;
        const huge=fresh(),start=performance.now();TownProgression.tick(huge,60);
        check('trillions are calculated arithmetically',huge.townProgress.resources.wood===60e12&&performance.now()-start<100);
        state.townProgress=huge.townProgress;TownPage.render();TownProgression.tick(state,.5);await new Promise(resolve=>setTimeout(resolve,520));TownPage.renderProduction();
        check('large output adds no popups or extra nodes',!card.querySelector('.town-log-gain')&&card.querySelectorAll('*').length===nodes&&state.townProgress.resources.wood===60.5e12);
        const saved=parseGameSave(JSON.stringify(createGameSave()));
        check('large production and cycle phase round-trip through profiles',saved.townProgress.resources.wood===60.5e12&&saved.townProgress.buildings.lumberOutpost.production.phase===state.townProgress.buildings.lumberOutpost.production.phase);
        check('resource totals use compact notation',document.querySelector('[data-resource="wood"] strong').textContent==='60.5T');
        TownProgression.tick(state,1e20);check('extreme production stays saveable',TownProgression.normalize(state.townProgress).resources.wood===Number.MAX_SAFE_INTEGER);
        TownContent.buildings.lumberOutpost.production=spec;TownContent.resources.wood.capacity=originalCapacity;state.townProgress=fresh().townProgress;TownPage.render();simulateCombatStep(.5*secondsPerLog);TownPage.renderProduction();document.getElementById('townPageView').scrollIntoView({block:'start'});
        check('layout fits the viewport',document.documentElement.scrollWidth<=innerWidth);
        check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}finally{TownContent.buildings.lumberOutpost.production=spec;TownContent.resources.wood.capacity=originalCapacity;}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
