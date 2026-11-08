(async function(){
    const checks=[],check=(name,ok)=>{checks.push((ok?'PASS ':'FAIL ')+name);if(!ok)throw new Error(name);},$=id=>document.getElementById(id);
    const originalWrite=Storage.prototype.setItem,fresh=()=>({gold:1e6,townProgress:TownProgression.defaults()});
    try{
        await document.fonts.ready;
        let half=true,surplus=true,wholeRates=true;
        for(const hall of [{tier:0,level:1},{tier:1,level:1},{tier:3,level:10}])for(const tier of [0,1,4])for(let level=1;level<=10;level++){
            const profile=fresh();profile.townProgress.buildings.townHall=hall;
            const logs=TownProgression.production('lumberOutpost',{tier,level},profile),ore=TownProgression.production('mine',{tier,level},profile);
            half&&=Math.abs(ore.perSecond/logs.perSecond-.5)<1e-9;
            const bars=TownProgression.production('smeltery',{tier:0,level:Math.min(level,10)},profile);
            surplus&&=bars.perSecond*bars.inputs.ore*3.6<=ore.perSecond+1e-9;
            const hourly=bars.perSecond*3600;
            wholeRates&&=Math.abs(hourly-Math.round(hourly))<1e-8;
            if(level<10){
                const next=TownProgression.production('smeltery',{tier:0,level:level+1},profile),gain=(next.perSecond-bars.perSecond)*3600;
                wholeRates&&=Math.abs(gain-Math.round(gain))<1e-8;
            }
        }
        check('Mine output is half of Logs at matching tiers and levels, including productivity',half);
        check('matching Mine support supplies at least 3.6 times the smelting Ore consumption',surplus);
        check('Smeltery hourly output and every upgrade gain through level 10 stay whole with productivity',wholeRates);
        state.townProgress=TownProgression.defaults();state.townProgress.buildings.townHall={tier:1,level:1};state.townProgress.buildings.slopesTownHall={tier:0,level:10};state.townProgress.buildings.mine={tier:0,level:1};state.townProgress.resources={wood:0,planks:30000,ore:50000};state.gold=200000;state.currentView='townPage';state.isInTown=true;state.combatPaused=true;resetCombatClock();render();
        const w2=TownContent.buildings.mine.world;$('townWorldList').querySelector('[data-world="'+w2+'"]').click();
        const grid=$('townBuildingGrid'),hall=grid.children[0],smeltery=grid.children[2];
        check('W1 Town Hall T1 does not unlock the W2 Smeltery',smeltery.querySelector('h3').textContent==='Building 3'&&!TownProgression.can(state,'purchase','smeltery'));
        check('W2 Hall prestige previews the Smeltery unlock',hall.querySelector('.town-building-preview').textContent==='Next tier: Unlock Smeltery.');
        hall.querySelector('button').click();const buy=smeltery.querySelector('button');
        check('W2 Town Hall T1 reveals Smeltery in building 3',state.townProgress.buildings.slopesTownHall.tier===1&&smeltery.dataset.building==='smeltery'&&smeltery.querySelector('h3').textContent==='Smeltery'&&!buy.hidden&&!buy.disabled);
        check('Bars are undiscovered until the Smeltery is purchased',!Object.hasOwn(state.townProgress.resources,'bars')&&!document.querySelector('[data-resource="bars"]'));
        const before=JSON.stringify(state.townProgress),gold=state.gold;
        Storage.prototype.setItem=function(key,value){if(key===saveKey)throw new Error('Storage full');return originalWrite.call(this,key,value);};buy.click();Storage.prototype.setItem=originalWrite;
        check('failed Smeltery purchases restore gold and all material costs',state.gold===gold&&JSON.stringify(state.townProgress)===before&&!state.townProgress.buildings.smeltery);
        buy.click();
        check('purchase spends 50000 gold, 500 Planks and 1000 Ore and discovers Bars',state.gold===133500&&state.townProgress.resources.planks===27500&&state.townProgress.resources.ore===47000&&state.townProgress.resources.bars===0&&state.townProgress.buildings.smeltery.level===1&&!!document.querySelector('[data-resource="bars"]'));
        check('Bars show their own 10000 cap and the rate displays the 10-to-1 recipe',document.querySelector('[data-resource="bars"] .town-resource-capacity').textContent==='/ 10K'&&smeltery.querySelector('.town-production-rate').textContent==='190 ◆ → 19 ▱ / h');
        TownProgression.tick(state,3600);TownPage.renderProduction();
        check('one hour of boosted smelting consumes ten Ore per completed Bar',state.townProgress.resources.bars===19&&state.townProgress.resources.ore===47494);
        check('Smeltery upgrades are available with a T0 level 1 Mine',TownProgression.can(state,'upgrade','smeltery'));
        state.townProgress.resources.bars=9;render();const upgradeGold=state.gold,upgradePlanks=state.townProgress.resources.planks;buy.click();
        check('upgrades require enough Bars and preserve other costs when unaffordable',state.townProgress.buildings.smeltery.level===1&&state.gold===upgradeGold&&state.townProgress.resources.planks===upgradePlanks);
        state.townProgress.resources.bars=10;render();buy.click();
        check('Smeltery upgrades spend Bars, Planks and gold',state.townProgress.buildings.smeltery.level===2&&state.townProgress.resources.bars===0&&state.gold===upgradeGold-10000&&state.townProgress.resources.planks===upgradePlanks-100);
        check('upgrading the Smeltery does not require changing Mine progress',state.townProgress.buildings.mine.tier===0&&state.townProgress.buildings.mine.level===1);
        const independent=fresh();independent.townProgress.buildings.mine={tier:0,level:1};independent.townProgress.buildings.smeltery={tier:0,level:1};independent.townProgress.resources={ore:0,planks:10000,bars:1000};
        let upgraded=true;for(let level=1;level<10;level++)upgraded&&=TownProgression.apply(independent,'upgrade','smeltery');
        check('stockpiled materials let Smeltery reach level 10 with Mine still at T0 level 1',upgraded&&independent.townProgress.buildings.smeltery.level===10&&independent.townProgress.buildings.mine.tier===0&&independent.townProgress.buildings.mine.level===1);
        check('independent Smeltery upgrades still stop at its own level cap',!TownProgression.apply(independent,'upgrade','smeltery'));
        const saved=parseGameSave(JSON.stringify(createGameSave()));applyGameSave(saved);render();
        check('Smeltery levels, Ore and Bars survive profile loading',state.townProgress.buildings.smeltery.level===2&&state.townProgress.resources.bars===0&&state.townProgress.resources.ore===47494);
        const missingBars=JSON.parse(JSON.stringify(saved));delete missingBars.townProgress.resources.bars;
        check('older Smeltery saves discover missing Bars at zero',parseGameSave(JSON.stringify(missingBars)).townProgress.resources.bars===0);
        const conversion=fresh();conversion.townProgress.buildings.smeltery={tier:0,level:1};conversion.townProgress.resources={ore:100,bars:0};TownProgression.tick(conversion,4000);
        check('100 Ore crafts exactly 10 Bars',conversion.townProgress.resources.ore===0&&conversion.townProgress.resources.bars===10);
        const starved=fresh();starved.townProgress.buildings.smeltery={tier:0,level:1};starved.townProgress.resources={ore:0,bars:0};TownProgression.tick(starved,86400);
        check('a starved Smeltery cannot bank a day of work',starved.townProgress.resources.bars===0&&starved.townProgress.buildings.smeltery.production.fraction===0);
        const full=fresh();full.townProgress.buildings.smeltery={tier:0,level:10};full.townProgress.resources={ore:10000,bars:10000};TownProgression.tick(full,86400);
        check('full Bar storage pauses conversion without consuming Ore',full.townProgress.resources.ore===10000&&full.townProgress.resources.bars===10000&&full.townProgress.buildings.smeltery.production.fraction===0);
        GameResources.spend(full,{bars:1},full.townProgress.resources);TownProgression.tick(full,40);
        check('smelting resumes for one free storage slot using exactly 10 Ore',full.townProgress.resources.bars===10000&&full.townProgress.resources.ore===9990);
        const baseline=TownProgression.defaults();baseline.buildings.lumberOutpost={tier:0,level:10};baseline.buildings.sawMill={tier:0,level:10};baseline.buildings.mine={tier:0,level:10};baseline.buildings.smeltery={tier:0,level:10};baseline.resources={wood:1000,planks:0,ore:1000,bars:0};
        state.townProgress=TownProgression.clone(baseline);resetCombatClock();for(let tick=0;tick<1000;tick++)simulateCombatStep(.1);const foreground=JSON.stringify(state.townProgress);
        state.townProgress=TownProgression.clone(baseline);resetCombatClock();pendingCombatSeconds=100;combatCatchingUp=true;processCombatBacklog();
        // Drain the fixed backlog without adding the test's own wall time through
        // asynchronous clock updates between batches.
        for(let attempt=0;pendingCombatSeconds>=gameTickSeconds-1e-8&&attempt<100;attempt++)processCombatBacklog();
        check('offline catch-up matches foreground with both converters running',JSON.stringify(state.townProgress)===foreground);
        render();
        check('Bars remain Town-only and the layout fits the viewport',!Object.hasOwn(state.materials,'bars')&&document.documentElement.scrollWidth<=innerWidth);
        check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}finally{Storage.prototype.setItem=originalWrite;}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
