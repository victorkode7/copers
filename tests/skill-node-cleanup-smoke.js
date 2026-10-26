(function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const near=(a,b)=>Math.abs(a-b)<1e-6,clone=value=>JSON.parse(JSON.stringify(value));
    const aliases=SkillStatCompat.nodeIdAliases,reverse=Object.fromEntries(Object.entries(aliases).map(([oldId,id])=>[id,oldId]));
    const originalRandom=Math.random,originalStats=itemById.testAmulet.stats,map=currentMap();
    const root=skillNodes.find(node=>node.start).id;
    const originalLinks=Object.fromEntries(Object.entries(skillNodeConnections).map(([id,links])=>[id,new Set(links)]));
    function fresh(ranks={bleederer:1},count=4) {
        combatStatCache=null;combatPoisonForecasts=null;clearFury();state.shieldStacks=0;state.skillRanks={...ranks};pendingSkillRanks={};
        state.level=Object.keys(ranks).length;state.experience=0;state.skillPoints=0;state.upgrades={strength:0,haste:0,evasion:0};
        state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];state.crafted=[];itemById.testAmulet.stats={bleedChance:1};
        state.kills=Object.fromEntries(mapData.map(entry=>[entry.id,0]));state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,0]));
        state.gold=0;state.lootLog=[];state.lastLoot=null;state.tutorials=createTutorialState();
        state.selectedMap=map.id;state.selectedWorld=worldForMap(map.id).id;state.currentView='map';state.isInTown=false;state.playerHp=100;state.combatPaused=false;state.attackTimer=0;
        map.drops=[];map.itemDrops=[];map.spawns=[{id:'nodeAuditMob',monsterId:worldContent.monsters[0].id,count,overrides:{health:1000,attackDamage:0,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:2,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);resetCombatClock();clearOfflineRecap();Math.random=()=>0;return state.monsterStates;
    }
    try {
        const original=clone(window.adventureSkillTree),legacy=clone(original);
        legacy.nodes.forEach(node=>{node.id=reverse[node.id]||node.id;node.requires=node.requires.map(id=>reverse[id]||id);node.name+=' Copy Copy';});
        const normalized=SkillDescriptions.normalize(SkillStatCompat.normalize(legacy));
        check('the tree has unique meaningful identifiers without Copy or New Node placeholders',new Set(original.nodes.map(node=>node.id)).size===original.nodes.length&&original.nodes.every(node=>!/_copy|^newNode/.test(node.id)&&!/(?:\s+Copy)+$/i.test(node.name)));
        check('old node IDs migrate without moving nodes or changing connections',original.nodes.every(node=>{const restored=normalized.nodes.find(entry=>entry.id===node.id);return restored&&restored.column===node.column&&restored.row===node.row&&restored.size===node.size&&JSON.stringify(restored.requires)===JSON.stringify(node.requires);}));
        check('cleanup is idempotent and removes nested Copy labels',JSON.stringify(SkillDescriptions.normalize(SkillStatCompat.normalize(clone(normalized))))===JSON.stringify(normalized)&&normalized.nodes.every(node=>!/(?:\s+Copy)+$/i.test(node.name)));
        check('every connection refers to an existing node',original.nodes.every(node=>node.requires.every(id=>original.nodes.some(other=>other.id===id))));
        const collision={nodes:[{id:'maxFury_copy',name:'Fury Copy',stats:{maxFury:3},requires:[]},{id:'maxFury2',name:'Custom Fury',stats:{maxFury:8},requires:['maxFury_copy']}]};
        SkillStatCompat.normalize(collision);
        check('ID collisions never merge or discard edited nodes',collision.nodes[0].id==='maxFury_copy'&&collision.nodes[1].requires[0]==='maxFury_copy'&&collision.nodes[0].stats.maxFury===3&&collision.nodes[1].stats.maxFury===8);
        let [a]=fresh();let rolls=0;Math.random=()=>{rolls++;return 0;};tryApplyBleed(a,100);
        check('Bleederer grants two stacks from one chance roll',rolls===1&&a.bleed.stacks===2&&a.bleed.baseDamagePerTick===20&&a.bleed.remainingDuration===2&&getBleedDamage(100)===20);
        tickMonsterBleed(a,.4);tryApplyBleed(a,200);
        check('both stacks add damage and duration without refreshing the tick phase',a.bleed.stacks===4&&a.bleed.baseDamagePerTick===60&&near(a.bleed.remainingDuration,3.6)&&near(a.bleed.timeUntilTick,.6));
        tickMonsterBleed(a,.6);check('the double application ticks as one combined DOT',a.hp===940);
        [a]=fresh({bleederer:1,deepWounds:1});tryApplyBleed(a,100);tryApplyBleed(a,200);tryApplyBleed(a,300);
        check('Bleederer respects Deep Wounds and keeps only the strongest three stacks',a.bleed.stacks===3&&a.bleed.baseDamagePerTick===400&&a.bleed.strongestApplications.join(',')==='150,150,100'&&a.bleed.remainingDuration===5&&isValidBleedState(a.bleed));
        [a]=fresh();itemById.testAmulet.stats={};Math.random=()=>{throw new Error('Zero Bleed chance consumed randomness');};
        check('Bleederer does not grant Bleed chance',!tryApplyBleed(a,100)&&!a.bleed);
        [a]=fresh();itemById.testAmulet.stats.bleedChance=.25;Math.random=()=>.3;
        check('a failed chance roll creates neither stack',!tryApplyBleed(a,100)&&!a.bleed);
        [a]=fresh();shootAbilityArrow([a],100,'multiShot');
        check('eligible single-target abilities also receive two stacks',a.hp===900&&a.bleed.stacks===2&&a.bleed.baseDamagePerTick===20);
        [a]=fresh();for(const type of ['poison','bleed','dot'])applyDamageToMonster(a,1,type,'multiShot');
        check('DOTs cannot trigger Bleederer',!a.bleed);
        fresh({maxHealthRegen4:1,maxFury2:1,heavyBlows:1,greedierPig:1,soGreedy:1,bleedDamage:1,quickBleeding:1});itemById.testAmulet.stats={};
        check('renamed passive nodes retain regeneration, Fury, damage, gold, speed and Bleed bonuses',getPlayerHealthRegen()===2&&getPlayerMaxFury()===10&&getDamage()===12&&getSkillMultiplier('goldBonusMultiplier')===3&&getBleedDamageMultiplier()===2&&near(getBleedChance(),.1)&&getSkillMultiplier('attackSpeedMultiplier')===1.1);
        // Save compatibility is independent of the user's intentionally changing
        // editor connections, including unconnected work-in-progress nodes.
        skillNodes.filter(node=>!node.start).forEach(node=>{skillNodeConnections[root].add(node.id);skillNodeConnections[node.id].add(root);});
        const ranks=Object.fromEntries(skillNodes.filter(node=>!node.start).map(node=>[node.id,1]));
        fresh(ranks);const saved=clone(createGameSave()),oldSave=clone(saved);
        oldSave.skillRanks=Object.fromEntries(Object.entries(saved.skillRanks).map(([id,rank])=>[reverse[id]||id,rank]));
        const migrated=parseGameSave(JSON.stringify(oldSave));
        check('old profile allocations migrate to all canonical IDs without losing skill points',JSON.stringify(Object.entries(migrated.skillRanks).sort())===JSON.stringify(Object.entries(saved.skillRanks).sort())&&migrated.skillPoints===saved.skillPoints);
        const duplicate=clone(saved);duplicate.level++;duplicate.skillRanks.maxFury_copy=1;
        const refunded=parseGameSave(JSON.stringify(duplicate));
        check('profiles containing both old and new IDs refund the duplicate allocation',refunded.skillRanks.maxFury2===1&&!Object.hasOwn(refunded.skillRanks,'maxFury_copy')&&refunded.skillPoints===1);
        const invalid=clone(saved);invalid.skillRanks.maxFury_copy=-1;let rejected=false;
        try{parseGameSave(JSON.stringify(invalid));}catch(_){rejected=true;}
        check('invalid legacy ranks cannot cancel valid allocations during migration',rejected);
        function run(effects){fresh({bleederer:1,deepWounds:1,singledOff:1,multiShot:1},8);Object.assign(itemById.testAmulet.stats,{damage:40,attackSpeedMultiplier:4});let seed=9453;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<400;i++)simulateCombatStep(.1,effects);return JSON.stringify({monsters:state.monsterStates,kills:state.kills,gold:state.gold,meter:getDamageBreakdown()});}
        check('double-stack Bleed matches between foreground and offline simulation',run(true)===run(false)&&state.kills[map.id]>0);
        check('no runtime errors: '+window.smokeErrors.join('; '),!window.smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    finally{Math.random=originalRandom;itemById.testAmulet.stats=originalStats;combatStatCache=null;combatPoisonForecasts=null;resetCombatClock();clearOfflineRecap();Object.entries(originalLinks).forEach(([id,links])=>{skillNodeConnections[id]=links;});}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
