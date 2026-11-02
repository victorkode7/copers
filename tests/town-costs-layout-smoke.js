(async function(){
    const checks=[],check=(name,ok)=>{checks.push((ok?'PASS ':'FAIL ')+name);if(!ok)throw new Error(name);};
    try{
        await document.fonts.ready;
        let scaled=true;
        for(let tier=0;tier<=5;tier++){
            const upgrade=TownProgression.cost('upgrade','lumberOutpost',{tier,level:1}),prestige=TownProgression.cost('prestige','lumberOutpost',{tier,level:10});
            scaled&&=upgrade.gold===1000*2**tier&&prestige.gold===3300*2**tier&&prestige.planks===10*2**tier;
            if(tier>0)scaled&&=upgrade.planks===10*2**tier;
            if(tier>=4)scaled&&=upgrade.ore===10*2**tier;
        }
        check('Outpost gold and material costs double at every prestige tier',scaled);
        check('material scaling does not compound on repeated cost reads',TownProgression.cost('prestige','lumberOutpost',{tier:3,level:10}).planks===80&&TownProgression.cost('prestige','lumberOutpost',{tier:3,level:10}).planks===80&&TownContent.buildings.lumberOutpost.prestigeCost.planks===10);
        const outpost={gold:2000,townProgress:TownProgression.defaults()};outpost.townProgress.buildings.lumberOutpost={tier:1,level:1};outpost.townProgress.resources.planks=19;
        check('Outpost upgrades reject the old flat material amount without charging gold',!TownProgression.apply(outpost,'upgrade','lumberOutpost')&&outpost.gold===2000&&outpost.townProgress.resources.planks===19);
        outpost.townProgress.resources.planks=20;
        check('Outpost upgrades charge the scaled plank cost exactly once',TownProgression.apply(outpost,'upgrade','lumberOutpost')&&outpost.gold===0&&outpost.townProgress.resources.planks===0);
        const capped=TownProgression.cost('upgrade','lumberOutpost',{tier:1024,level:1});
        check('extreme prestige costs stay finite and saveable',capped.gold===Number.MAX_SAFE_INTEGER&&capped.planks===Number.MAX_SAFE_INTEGER&&capped.ore===Number.MAX_SAFE_INTEGER);
        const mill={gold:2500,townProgress:TownProgression.defaults()};mill.townProgress.buildings.townHall={tier:1,level:1};mill.townProgress.buildings.lumberOutpost={tier:0,level:10};mill.townProgress.buildings.sawMill={tier:0,level:10};mill.townProgress.resources={wood:1000,planks:1000,ore:10000};
        check('Saw Mill prestige waits for the Outpost tier needed to preserve log surplus',!TownProgression.can(mill,'prestige','sawMill'));
        mill.townProgress.buildings.lumberOutpost={tier:1,level:1};mill.townProgress.resources.ore=9999;
        check('entering Saw Mill T1 requires the full Ore cost without partial deductions',!TownProgression.apply(mill,'prestige','sawMill')&&mill.gold===2500&&mill.townProgress.resources.planks===1000&&mill.townProgress.resources.ore===9999);
        mill.townProgress.resources.ore=10000;
        check('Saw Mill prestige consumes gold, planks and Ore and enters T1 level 1',TownProgression.apply(mill,'prestige','sawMill')&&mill.gold===0&&mill.townProgress.resources.planks===0&&mill.townProgress.resources.ore===0&&mill.townProgress.buildings.sawMill.tier===1&&mill.townProgress.buildings.sawMill.level===1);
        check('Saw Mill prestige retains output and adds another production step',Math.abs(TownProgression.production('sawMill',mill.townProgress.buildings.sawMill).perSecond*3600-990)<1e-6);
        mill.gold=1500;mill.townProgress.resources.planks=10;mill.townProgress.resources.ore=10;
        check('Saw Mill upgrades are available with a level 1 Outpost',TownProgression.can(mill,'upgrade','sawMill')&&mill.townProgress.buildings.lumberOutpost.level===1);
        mill.gold=1500;mill.townProgress.resources.planks=10;mill.townProgress.resources.ore=9;
        check('T1 Saw Mill upgrades cannot substitute planks for Ore',!TownProgression.apply(mill,'upgrade','sawMill')&&mill.gold===1500&&mill.townProgress.resources.planks===10);
        mill.townProgress.resources.ore=10;
        check('T1 Saw Mill upgrades spend all three costs',TownProgression.apply(mill,'upgrade','sawMill')&&mill.gold===0&&mill.townProgress.resources.planks===0&&mill.townProgress.resources.ore===0&&mill.townProgress.buildings.sawMill.level===2);
        const logs=TownProgression.production('lumberOutpost',{tier:1,level:10},mill),planks=TownProgression.production('sawMill',{tier:1,level:10},mill);
        check('matching T1 buildings leave 75 percent of log output as surplus',Math.abs(logs.perSecond/(planks.perSecond*planks.inputs.wood)-4)<1e-6);
        check('the new first prestige does not grant an unspecified T2',TownProgression.cost('prestige','sawMill',{tier:1,level:10})===null);
        state.gold=1700;state.townProgress=TownProgression.clone(mill.townProgress);state.townProgress.resources={wood:0,planks:10,ore:10};state.currentView='townPage';state.isInTown=true;state.combatPaused=true;resetCombatClock();
        document.getElementById('townWorldList').firstElementChild.click();render();
        const card=document.querySelector('[data-building="sawMill"]');
        check('mill upgrades remain enabled ahead of the Outpost and preview added production',!card.querySelector('button').hidden&&!card.querySelector('button').disabled&&state.townProgress.buildings.lumberOutpost.level===1&&card.querySelector('.town-building-preview').textContent.startsWith('Next level:'));
        check('T1 Saw Mill card displays Ore beside its other upgrade costs',!!card.querySelector('[aria-label="10 Ore"]')&&!!card.querySelector('[aria-label="10 Planks"]')&&!!card.querySelector('[aria-label="1,700 gold"]'));
        const resourceList=document.getElementById('townResourceList'),cards=Array.from(resourceList.children);
        const geometry=()=>cards.map(card=>{const box=card.getBoundingClientRect(),value=card.querySelector('strong').getBoundingClientRect();return [box.left,box.top,box.width,box.height,value.right,value.width];});
        const before=geometry();let stable=true;
        for(const amount of [9,99,999,9999,10000,999999,1e12,Number.MAX_SAFE_INTEGER,0]){
            state.townProgress.resources={wood:amount,planks:amount,ore:amount};TownPage.renderProduction();
            stable&&=geometry().every((box,index)=>box.every((value,axis)=>Math.abs(value-before[index][axis])<.5));
        }
        check('resource cards and value slots stay fixed across digit changes and compact notation',stable&&cards.length===3&&cards.every((card,index)=>resourceList.children[index]===card));
        const saved=parseGameSave(JSON.stringify(createGameSave()));
        check('Saw Mill prestige and Ore balances survive profile loading',saved.townProgress.buildings.sawMill.tier===1&&saved.townProgress.buildings.sawMill.level===2&&saved.townProgress.resources.ore===0);
        check('layout fits the viewport',document.documentElement.scrollWidth<=innerWidth);
        check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
