(async function(){
    const checks=[],$=id=>document.getElementById(id),check=(name,ok)=>{checks.push((ok?'PASS ':'FAIL ')+name);if(!ok)throw new Error(name);};
    const originalWrite=Storage.prototype.setItem;
    try{
        await document.fonts.ready;
        state.townProgress=TownProgression.defaults();state.gold=1e8;state.combatPaused=true;state.currentView='townPage';state.isInTown=true;resetCombatClock();render();
        const plot=$('townBuildingGrid').children[3];
        state.townProgress.buildings.townHall={tier:1,level:10};render();
        check('plot 4 remains hidden before Town Hall T2',plot.querySelector('h3').textContent==='Building 4'&&!TownProgression.can(state,'purchase','menagerie'));
        state.townProgress.buildings.townHall={tier:2,level:1};render();
        check('Town Hall T2 reveals the Menagerie in plot 4',plot.dataset.building==='menagerie'&&plot.querySelector('h3').textContent==='Menagerie'&&plot.querySelector('.town-building-preview').textContent.includes('Unlock W1 Mastery tree'));
        const map=mapData.find(map=>worldData[0].mapIds.includes(map.id));
        state.selectedMap=map.id;state.selectedWorld=worldData[0].id;
        state.mapMastery={[map.id]:{earned:2,nodes:['wealth1']}};
        const tree=MasterySystem.tree(worldContent,map),node=tree.nodes.find(node=>node.id==='wealth1');
        const oldStats=node.stats;node.stats={goldBonus:.1};
        check('mastery effects and opening are gated before purchase',MasterySystem.bonus(worldContent,map,state,'goldBonus')===0&&MapMastery.open()===false);
        const before=JSON.stringify(state.townProgress),gold=state.gold;
        Storage.prototype.setItem=function(key,value){if(key===saveKey)throw new Error('Storage full');return originalWrite.call(this,key,value);};plot.querySelector('button').click();Storage.prototype.setItem=originalWrite;
        check('failed Menagerie purchase restores gold and progression',state.gold===gold&&JSON.stringify(state.townProgress)===before);
        plot.querySelector('button').click();
        check('purchase unlocks World 1 only and activates preserved mastery',TownProgression.masteryUnlocked(state,0)&&!TownProgression.masteryUnlocked(state,1)&&MasterySystem.bonus(worldContent,map,state,'goldBonus')===.1);
        node.stats=oldStats;
        state.townProgress.resources.planks=10000;
        check('prestige requires level 10',!TownProgression.apply(state,'prestige','menagerie'));
        const expected=[1,1.25,1.75,2.5,3.5,4.5,5.5,6.75,8.25,10];
        for(let level=1;level<=10;level++){
            check('World 1 level '+level+' grants '+expected[level-1]+'x',TownProgression.killCountMultiplier(state,0)===expected[level-1]);
            if(level<10)check('upgrade '+level+' succeeds',TownProgression.apply(state,'upgrade','menagerie'));
        }
        check('prestige retains World 1 at 10x and unlocks World 2 at 1x',TownProgression.apply(state,'prestige','menagerie')&&TownProgression.masteryUnlocked(state,1)&&TownProgression.killCountMultiplier(state,0)===10&&TownProgression.killCountMultiplier(state,1)===1);
        for(let level=1;level<10;level++){
            check('World 2 level '+level+' uses the same curve',TownProgression.killCountMultiplier(state,1)===expected[level-1]&&TownProgression.apply(state,'upgrade','menagerie'));
        }
        check('World 2 caps at 10x without unlocking another world',TownProgression.killCountMultiplier(state,1)===10&&!TownProgression.masteryUnlocked(state,2)&&!TownProgression.apply(state,'prestige','menagerie'));
        state.townProgress.buildings.menagerie={tier:0,level:2};state.townProgress.killFractions={};
        const other=worldData[1].mapIds[0];
        check('locked worlds receive normal kill credit',TownProgression.killCredit(state,other,1)===1&&!state.townProgress.killFractions[other]);
        state.currentView='map';state.isInTown=false;state.mapMastery={};state.kills[map.id]=map.goal-1;
        resetMonsterStates(map);invalidateSkillBonusCache();
        const initialGold=state.gold;defeatEnemy(state.monsterStates[0]);
        check('real combat stores quarter-kill credit without fractional kill counters',state.kills[map.id]===map.goal&&state.townProgress.killFractions[map.id]===.25&&state.gold>=initialGold);
        const saved=parseGameSave(JSON.stringify(createGameSave()));applyGameSave(saved);
        check('fractional credit and building level survive full save loading',state.townProgress.killFractions[map.id]===.25&&state.townProgress.buildings.menagerie.level===2);
        const startKills=state.kills[map.id];for(let i=0;i<3;i++)defeatEnemy(state.monsterStates[0]);
        check('four real kills total five kill-count credit at 1.25x',state.kills[map.id]===startKills+4&&state.townProgress.killFractions[map.id]===0);
        state.townProgress.buildings.menagerie={tier:0,level:10};state.kills[map.id]=map.goal-1;state.tutorials=createTutorialState();
        defeatEnemy(state.monsterStates[0]);
        check('10x credit triggers map goals even when jumping past the threshold',state.kills[map.id]===map.goal+9&&state.tutorials.firstMapGoalPending);
        const legacy=JSON.parse(JSON.stringify(createGameSave()));delete legacy.townProgress.killFractions;delete legacy.townProgress.buildings.menagerie;
        check('older profiles load without granting Menagerie ownership',!parseGameSave(JSON.stringify(legacy)).townProgress.buildings.menagerie);
        for(const value of [-.25,1,.3,'0.25']){const bad=JSON.parse(JSON.stringify(createGameSave()));bad.townProgress.killFractions={[map.id]:value};let rejected=false;try{parseGameSave(JSON.stringify(bad));}catch{rejected=true;}check('invalid fractional credit is rejected: '+value,rejected);}
        state.currentView='townPage';render();
        check('Menagerie displays its current kill-count multiplier',plot.querySelector('.town-production-rate').textContent.includes('10x kills'));
        check('layout fits viewport',document.documentElement.scrollWidth<=innerWidth);
        check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}finally{Storage.prototype.setItem=originalWrite;}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
