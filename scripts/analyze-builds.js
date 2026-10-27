// Run in the actual game through tests/run-equipment-smoke.ps1.
(function () {
    const originalRandom=Math.random, baseMap=currentMap(), root=skillNodes.find(node=>node.start).id;
    const nodes=skillNodes.filter(node=>!node.start&&node.maxRank>0);
    let searchSeed=817251, simulations=0;
    const random=()=>{searchSeed=(Math.imul(searchSeed,1664525)+1013904223)>>>0;return searchSeed/4294967296;};
    const clone=value=>JSON.parse(JSON.stringify(value));
    const originalMaps=clone(mapData);
    const scenarios=[
        {id:'roaming',count:9,health:250,attackDamage:8,attackInterval:2.5,accuracy:150,evasion:25,respawnSeconds:1.5},
        {id:'tough-packs',count:9,health:2500,attackDamage:20,attackInterval:2.5,accuracy:220,evasion:75,respawnSeconds:2},
        {id:'boss',count:1,health:100000,attackDamage:60,attackInterval:2,accuracy:400,evasion:125,respawnSeconds:5}
    ];
    const styles=[
        {id:'balanced',name:'Shielded Vanguard',core:['healthRegeneration2','heavyBlows','maxFury','maxFury2','piercingArrow','multiShot','shieldGenerator','resonantGuard','freezingArrows','gatheringPower'],flavour:'Balanced physical, shields and recovery.'},
        {id:'poison',name:'Venom Volley',core:['healthRegeneration2','basicallySnake','bloomingFlower','poisonExecute','multiShot','piercingArrow','forkingArrow','freezingArrows','heavyBlows','shieldGenerator','gatheringPower'],flavour:'Poison spreading and many attack hits.'},
        {id:'elemental',name:'Elemental Warden',core:['healthRegeneration2','baseManaRegen','baseSpellDamage1','multiSpellDamage1','rimeBrand','emberBrand','glacialRupture','cinderRupture','gatheringPower'],flavour:'Cold and fire brands, rupture explosions and mana sustain.'},
        {id:'righteous',name:'Righteous Bulwark',core:['flatHealthRegen','maxHealthRegen','maxHealthRegen2','maxHealthRegen3','righteousFire','health2','heavyBlows','shieldGenerator','resonantGuard','gatheringPower','volcanicEruption','eruptionChain','multiShot'],flavour:'Regeneration fuels burning damage and pays eruption self-damage.'},
        {id:'bleed',name:'Crimson Arrows',core:['healthRegeneration2','heavyBlows','maxFury','maxFury2','quickBleeding','bleed','deepWounds','bleederer','bleedDamage','multiShot','freezingArrows','shieldGenerator','resonantGuard','gatheringPower'],flavour:'Strong single-target Bleed with attack and shield support.'}
    ];
    function pathTo(ranks,target) {
        const queue=[[root],...Object.keys(ranks).map(id=>[id])],seen=new Set(queue.flat());
        for(let index=0;index<queue.length;index++){
            const path=queue[index],last=path[path.length-1];if(last===target)return path.filter(id=>id!==root&&!ranks[id]);
            for(const id of skillNodeConnections[last])if(!seen.has(id)){seen.add(id);queue.push([...path,id]);}
        }
        return null;
    }
    function inactiveNode(id,ranks) {
        const bleedChance=getSkillStatFromRanks('bleedChance',ranks),poisonChance=getSkillStatFromRanks('poisonChance',ranks);
        return (['deepWounds','bleederer','bleedDamage'].includes(id)&&bleedChance<=0)||
            (['poisonExecute','bloomingFlower'].includes(id)&&poisonChance<=0)||
            (id==='echoingVoid'&&!ranks.voidVortex)||(id==='glacialRupture'&&!ranks.rimeBrand)||(id==='cinderRupture'&&!ranks.emberBrand);
    }
    function weight(node,style,ranks) {
        if(inactiveNode(node.id,ranks))return .001;
        const s=node.stats;let value=1;
        value+=(s.healthRegen||0)*1.5+(s.healthRegenPercent||0)*55+(s.healthRegenIncrease||0)*12;
        value+=(s.damage||0)*1.4+Math.max(0,(s.damageMultiplier||1)-1)*70;
        value+=Math.max(0,(s.attackSpeedMultiplier||1)-1)*80+(s.multiHit||0)*30;
        value+=(s.health||0)*.12+Math.max(0,(s.healthMultiplier||1)-1)*10;
        value+=(s.maxFury||0)*.8+Math.max(0,(s.evasionMultiplier||1)-1)*20+(s.evasion||0)*.12;
        if(style.id==='poison')value+=(s.poisonChance||0)*50+(s.poisonDamage||0)*4+(s.poisonTickRate||0)*30;
        if(style.id==='elemental')value+=(s.spellDamage||0)*3+Math.max(0,(s.spellDamageMultiplier||1)-1)*90+(s.manaRegen||0)*3+(s.mana||0)*.15;
        if(style.id==='bleed')value+=(s.bleedChance||0)*65+Math.max(0,(s.bleedDamageMultiplier||1)-1)*30;
        if(style.id==='righteous')value+=(s.health||0)*.5+Math.max(0,(s.healthMultiplier||1)-1)*40+(s.healthRegenPercent||0)*100;
        if(['multiShot','piercingArrow','freezingArrows','shieldGenerator','resonantGuard','gatheringPower','heavyBlows','deepWounds','poisonExecute','bloomingFlower','shockwaveSlash'].includes(node.id))value+=22;
        if(['greedyPig','greedierPig','soGreedy'].includes(node.id))value+=8;
        return value;
    }
    function makeBuild(style,limit,variant) {
        const ranks={},order=[];
        const add=id=>{const path=pathTo(ranks,id);if(!path||order.length+path.length>limit)return false;path.forEach(key=>{ranks[key]=1;order.push(key);});return true;};
        for(const id of style.core)if(skillNodeById[id])add(id);
        while(order.length<limit) {
            const options=nodes.filter(node=>!ranks[node.id]).map(node=>{const path=pathTo(ranks,node.id);return {node,path,value:weight(node,style,ranks)*(variant?Math.pow(.08+random(),variant%3+1):1)/(path?.length||1)};}).filter(option=>option.path&&option.path.length&&option.path.length<=limit-order.length);
            if(!options.length)break;options.sort((a,b)=>b.value-a.value);add(options[0].node.id);
        }
        return {ranks,order};
    }
    function evaluate(ranks,seed=654321,testScenarios=scenarios) {
        const metrics=[];simulations++;
        for(const scenario of testScenarios) {
            let roll=seed;Math.random=()=>{roll=(Math.imul(roll,1664525)+1013904223)>>>0;return roll/4294967296;};
            combatStatCache=null;combatPoisonForecasts=null;
            state.skillRanks={...ranks};state.level=60;state.skillPoints=60-Object.values(ranks).reduce((a,b)=>a+b,0);state.experience=0;
            state.upgrades={strength:0,haste:0,evasion:0};state.gear=createEmptyGear();state.ownedItemIds=[];state.crafted=[];
            state.gold=0;state.kills=Object.fromEntries(mapData.map(map=>[map.id,0]));state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,0]));
            state.lootLog=[];state.lastLoot=null;state.tutorials=createTutorialState();state.currentView='map';state.isInTown=false;
            state.selectedMap=baseMap.id;state.selectedWorld=worldForMap(baseMap.id).id;state.playerHp=100;state.combatPaused=false;state.attackTimer=0;
            const {id,count,...overrides}=scenario;
            baseMap.drops=[];baseMap.itemDrops=[];baseMap.spawns=scenario.spawns?clone(scenario.spawns):[{id:'buildBenchmark',monsterId:worldContent.monsters[0].id,count,overrides:{...overrides,experience:1,gold:[1,1],drops:[],itemDrops:[]}}];
            resetMonsterStates(baseMap);state.monsterColumns=3;state.playerHp=getPlayerMaxHealth();state.manaCapacity=getPlayerMaxMana();state.playerMana=state.manaCapacity;
            resetCombatClock();combatStatCache=new Map();
            let aliveSeconds=0,minimumHp=1;
            for(let step=0;step<600;step++){
                simulateCombatStep(.1,false);
                if(!state.combatPaused){aliveSeconds+=.1;minimumHp=Math.min(minimumHp,state.playerHp/getPlayerMaxHealth());}else break;
            }
            const damage=getDamageBreakdown().rows.reduce((sum,row)=>sum+row.damage,0);
            metrics.push({scenario:scenario.id,dps:Math.round(damage/60*100)/100,kills:state.kills[baseMap.id],gold:state.gold,aliveSeconds:Math.round(aliveSeconds*10)/10,survived:!state.combatPaused,minimumHp:Math.round(minimumHp*100),endHp:Math.round(state.playerHp/getPlayerMaxHealth()*100)});
            combatStatCache=null;
        }
        const score=metrics.reduce((sum,m)=>sum+(Math.log1p(m.dps)+.13*Math.log1p(m.gold))*(m.survived?1:.15+.65*m.aliveSeconds/60),0)/metrics.length;
        return {score,metrics};
    }
    try {
        if(new URL(document.currentScript.src).searchParams.has('audit')) {
            const request=new XMLHttpRequest();request.open('GET',new URL('builds/analysis.json',location.href),false);request.send();
            const previous=JSON.parse(request.responseText),changes=[];
            const actualScenarios=previous.actualScenarios.map(({id})=>originalMaps.find(map=>map.id===id)).filter(Boolean).map(map=>({id:map.id,spawns:map.spawns}));
            for(const build of previous.builds) {
                for(const id of [...Object.keys(build.ranks)]) {
                    if(!inactiveNode(id,build.ranks))continue;
                    const reduced={...build.ranks};delete reduced[id];
                    try{SkillBuilds.validate({format:'copers-skill-build',version:1,skillRanks:reduced});}catch{continue;}
                    const alternatives=[];
                    for(const node of nodes) {
                        if(reduced[node.id]||node.id===id||inactiveNode(node.id,{...reduced,[node.id]:1}))continue;
                        const ranks={...reduced,[node.id]:1};
                        try{SkillBuilds.validate({format:'copers-skill-build',version:1,skillRanks:ranks});}catch{continue;}
                        alternatives.push({added:node.id,ranks,...evaluate(ranks)});
                    }
                    alternatives.sort((a,b)=>b.score-a.score);const best=alternatives[0];if(!best)continue;
                    const before={score:build.score,metrics:build.metrics};
                    build.ranks=best.ranks;build.order=build.order.filter(key=>key!==id).concat(best.added);build.score=best.score;build.metrics=best.metrics;
                    build.verification=[evaluate(build.ranks,12345).metrics,evaluate(build.ranks,98765).metrics];
                    build.actualMaps=[evaluate(build.ranks,654321,actualScenarios).metrics,evaluate(build.ranks,12345,actualScenarios).metrics];
                    combatStatCache=null;state.skillRanks={...build.ranks};clearPlayerCombatBuffs();
                    build.stats={physicalDamage:getDamage(),spellDamage:getSpellDamage(),health:getPlayerMaxHealth(),healthRegen:getPlayerHealthRegen(),mana:getPlayerMaxMana(),manaRegen:getPlayerManaRegen(),attackInterval:getAttackSpeed(),multiHit:getMultiHit(),poisonChance:getPoisonChance(),bleedChance:getBleedChance(),goldMultiplier:getGoldMultiplier()};
                    changes.push({build:build.name,removed:id,added:best.added,candidates:alternatives.length,before,after:{score:build.score,metrics:build.metrics},topAlternatives:alternatives.slice(0,5).map(({added,score,metrics})=>({added,score,metrics}))});
                }
            }
            previous.audit={changes,simulations};
            const pre=document.createElement('pre');pre.id='smoke-results';pre.textContent=JSON.stringify(previous)+'\nSMOKE PASSED';document.body.append(pre);
            Math.random=originalRandom;return;
        }
        const candidates=[];
        for(const style of styles) {
            const unique=new Set();
            for(let variant=0;variant<36;variant++){
                const build=makeBuild(style,60,variant),signature=Object.keys(build.ranks).sort().join(',');if(unique.has(signature))continue;unique.add(signature);
                SkillBuilds.validate({format:'copers-skill-build',version:1,skillRanks:build.ranks});
                candidates.push({style:style.id,name:style.name,flavour:style.flavour,...build,...evaluate(build.ranks)});
            }
        }
        const winners=styles.map(style=>candidates.filter(build=>build.style===style.id).sort((a,b)=>b.score-a.score)[0]);
        for(const build of winners) {
            build.verification=[evaluate(build.ranks,12345).metrics,evaluate(build.ranks,98765).metrics];
            build.stats={};combatStatCache=null;state.skillRanks={...build.ranks};clearPlayerCombatBuffs();
            build.stats={physicalDamage:getDamage(),spellDamage:getSpellDamage(),health:getPlayerMaxHealth(),healthRegen:getPlayerHealthRegen(),mana:getPlayerMaxMana(),manaRegen:getPlayerManaRegen(),attackInterval:getAttackSpeed(),multiHit:getMultiHit(),poisonChance:getPoisonChance(),bleedChance:getBleedChance(),goldMultiplier:getGoldMultiplier()};
        }
        const actualIds=['cinderPaddock','verdantWarden','map_251364409b26827581f151b0','map_ec2f730a5baeceee738b2f15','salmen','brineAndPunishment'];
        const actualScenarios=actualIds.map(id=>originalMaps.find(map=>map.id===id)).filter(Boolean).map(map=>({id:map.id,name:map.name,spawns:map.spawns}));
        for(const build of winners)build.actualMaps=[evaluate(build.ranks,654321,actualScenarios).metrics,evaluate(build.ranks,12345,actualScenarios).metrics];
        const starterRanks=Object.fromEntries(winners[0].order.slice(0,30).map(id=>[id,1]));
        const starter={style:'starter',name:'Shielded Vanguard Starter',flavour:'A 30 point start with recovery, physical damage, arrows, shields and mana sustain.',ranks:starterRanks,order:winners[0].order.slice(0,30),...evaluate(starterRanks),actualMaps:[evaluate(starterRanks,654321,actualScenarios).metrics]};
        const report={version:1,date:'2026-10-27',candidateCount:candidates.length,simulations,method:'Actual game simulation; 60 seconds per scenario; no gear/upgrades; fixed seeds; all builds connected and at most 60 points. Search is heuristic, not an exhaustive proof of optimality.',scenarios,actualScenarios:actualScenarios.map(({id,name})=>({id,name})),builds:[...winners,starter]};
        const pre=document.createElement('pre');pre.id='smoke-results';pre.textContent=JSON.stringify(report)+'\nSMOKE PASSED';document.body.append(pre);
    }catch(error){const pre=document.createElement('pre');pre.id='smoke-results';pre.textContent='ERROR '+error.stack;document.body.append(pre);}
    Math.random=originalRandom;
}());
