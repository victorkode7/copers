(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const near=(a,b)=>Math.abs(a-b)<1e-7,clone=value=>JSON.parse(JSON.stringify(value));
    const random=Math.random,originalStats=itemById.testAmulet.stats,map=currentMap(),root=skillNodes.find(node=>node.start).id;
    const links=Object.fromEntries(Object.entries(skillNodeConnections).map(([id,value])=>[id,new Set(value)]));
    const passives={baseMana1:1,baseSpellDamage1:1,multiSpellDamage1:1,baseManaRegen:1,multiManaRegen:1,multMana1:1,maxManaRegen:1};
    const both={...passives,voidBolt:1,voidVolley:1};
    function fresh(ranks=passives,count=9) {
        elements.combatPanel.querySelectorAll('.spell-effect').forEach(effect=>effect.remove());
        combatStatCache=null;combatPoisonForecasts=null;clearFury();state.shieldStacks=0;state.voidCharges=0;
        state.skillRanks={...ranks};state.level=Object.keys(ranks).length;state.skillPoints=0;state.experience=0;
        state.upgrades={strength:0,haste:0,evasion:0};state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];state.crafted=[];
        itemById.testAmulet.stats={};state.kills=Object.fromEntries(mapData.map(entry=>[entry.id,0]));state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,0]));
        state.unlockedMapIds=[];state.unlockedWorldIds=[];state.gold=0;state.lootLog=[];state.lastLoot=null;state.tutorials=createTutorialState();
        state.selectedMap=map.id;state.selectedWorld=worldForMap(map.id).id;state.currentView='map';state.isInTown=false;state.playerHp=100;state.combatPaused=false;state.attackTimer=0;
        state.developerTravelEnabled=false;state.developerItemsEnabled=false;
        map.drops=[];map.itemDrops=[];map.spawns=[{id:'spellMob',monsterId:worldContent.monsters[0].id,count,overrides:{health:1000,attackDamage:20,attackInterval:1000,accuracy:1000,evasion:0,element:'fire',respawnSeconds:2,gold:[1,1],experience:1,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);state.monsterColumns=3;state.manaCapacity=getPlayerMaxMana();state.playerMana=state.manaCapacity;
        resetCombatClock();clearOfflineRecap();resetDamageBreakdown(map.id);Math.random=()=>.5;
        return state.monsterStates;
    }
    const dealt=source=>getDamageBreakdown().rows.find(row=>row.source===source)?.damage||0;
    const landMissiles=()=>tickPendingVoidMissiles(10);
    try {
        let vortexMobs=fresh({...passives,voidVortex:1});
        check('Void Vortex is an AOE node connected to Void Bolt',SkillDescriptions.getAbilityTargeting(skillNodeById.voidVortex)==='aoe'&&skillNodeById.voidVortex.requires.includes('voidBolt'));
        check('Vortex hits only the target row for 75% spell damage and costs 20 mana',castVoidVortex()&&vortexMobs.slice(0,3).every(monster=>monster.hp===991)&&vortexMobs.slice(3).every(monster=>monster.hp===1000)&&state.playerMana===105&&dealt('voidVortex')===27);
        check('Vortex generates two charges per target with the existing five-charge cap',state.voidCharges===5);
        vortexMobs=fresh({...passives,voidVortex:1},1);castVoidVortex();
        check('a single Vortex target generates exactly two charges',state.voidCharges===2&&state.playerMana===105);
        vortexMobs=fresh({...both,voidVortex:1});castVoidVortex();
        check('Vortex charges automatically release Volley and pay its separate mana cost',state.voidCharges===0&&state.playerMana===95&&state.pendingVoidMissiles.length===10);
        vortexMobs=fresh({...passives,voidVortex:1});vortexMobs[0].hp=1;vortexMobs[1].hp=0;castVoidVortex();
        check('Vortex counts lethal hits and skips dead row targets',state.voidCharges===4&&vortexMobs[0].hp===0&&vortexMobs[2].hp===991&&dealt('voidVortex')===10);
        vortexMobs=fresh({...passives,voidVortex:1});state.playerMana=19;
        check('insufficient mana prevents Vortex without spending mana or charges',!castVoidVortex()&&state.playerMana===19&&state.voidCharges===0&&vortexMobs.every(monster=>monster.hp===1000));
        state.playerMana=20;state.combatPaused=true;check('paused combat blocks Vortex',!castVoidVortex()&&state.playerMana===20);
        fresh(passives);check('locked Vortex cannot cast',!castVoidVortex());
        vortexMobs=fresh({...passives,voidVortex:1});itemById.testAmulet.stats={bleedChance:1};triggerAttackSpells();
        check('primary attacks cast Vortex once and AOE hits cannot bleed',dealt('voidVortex')===27&&state.playerMana===105&&vortexMobs.every(monster=>!monster.bleed));
        check('Echoing Void connects to Vortex as a passive upgrade',skillNodeById.echoingVoid.requires.includes('voidVortex')&&SkillDescriptions.getAbilityTargeting(skillNodeById.echoingVoid)===null);
        vortexMobs=fresh({...passives,voidVortex:1,echoingVoid:1},1);Math.random=()=>.329;castVoidVortex();
        check('a successful echo repeats damage and charges without another mana cost',vortexMobs[0].hp===982&&state.voidCharges===4&&state.playerMana===105&&dealt('voidVortex')===18);
        vortexMobs=fresh({...passives,voidVortex:1,echoingVoid:1},1);Math.random=()=>.33;castVoidVortex();
        check('a roll at the 33 percent boundary does not repeat',vortexMobs[0].hp===991&&state.voidCharges===2&&state.playerMana===105);
        vortexMobs=fresh({...passives,voidVortex:1},1);Math.random=()=>0;castVoidVortex();
        check('an unallocated echo cannot repeat even with a winning roll',vortexMobs[0].hp===991&&state.voidCharges===2);
        vortexMobs=fresh({...passives,voidVortex:1,echoingVoid:1});vortexMobs[0].hp=1;Math.random=()=>0;castVoidVortex();
        check('echo skips enemies killed by its first trigger and stays in the original row',vortexMobs[0].hp===0&&vortexMobs[1].hp===982&&vortexMobs[2].hp===982&&vortexMobs.slice(3).every(monster=>monster.hp===1000)&&dealt('voidVortex')===37);
        vortexMobs=fresh({...both,voidVortex:1,echoingVoid:1},2);Math.random=()=>0;castVoidVortex();
        check('repeat hits can release Volley and preserve remaining charges',vortexMobs.every(monster=>monster.hp===982)&&state.pendingVoidMissiles.length===10&&state.voidCharges===2&&state.playerMana===95);
        fresh();
        check('mana passives remain functional',Object.keys(passives).every(id=>Object.keys(skillNodeById[id].stats).length>0));
        check('removed spells are absent and both Void nodes have concise descriptions',!skillNodeById.thunderstorm&&!skillNodeById.saltWaterBolt&&['voidBolt','voidVolley'].every(id=>skillNodeById[id].effect.split('\n').length<=2));
        check('Void Bolt and Volley have appropriate targeting tags',SkillDescriptions.getAbilityTargeting(skillNodeById.voidBolt)==='singleTarget'&&SkillDescriptions.getAbilityTargeting(skillNodeById.voidVolley)==='aoe');
        check('replacement nodes retain the branch connection and alias history',SaveCompatibility.contentMigrations.some(migration=>migration.skills?.aliases?.thunderstorm==='voidBolt')&&skillNodeById.voidVolley.requires.includes('voidBolt'));
        check('mana, spell damage and regen still calculate correctly',getPlayerMaxMana()===125&&getSpellDamage()===12&&near(getPlayerManaRegen(),20.3125));
        itemById.testAmulet.stats={mana:50,manaMultiplier:2,spellDamage:5,spellDamageMultiplier:1.5,manaRegen:3,manaRegenPercent:.02,manaRegenIncrease:.5};
        check('equipment and tree spell stats combine correctly',getPlayerMaxMana()===375&&getSpellDamage()===27&&near(getPlayerManaRegen(),68.6875));
        fresh();itemById.testAmulet.stats={damage:100,damageMultiplier:4};
        check('physical damage does not scale Void spell damage',getSpellDamage()===12&&getDamage()===408);
        fresh();state.playerMana=0;tickPlayerMana(1);
        check('mana regen works without generating Void charges',near(state.playerMana,20.3125)&&state.voidCharges===0);
        state.playerMana=10000;normalizePlayerMana();check('mana is capped',state.playerMana===125);
        state.playerMana=20;itemById.testAmulet.stats={mana:100};normalizePlayerMana();
        check('capacity increases do not refill an existing reserve',state.playerMana===20&&getPlayerMaxMana()===250);

        let mobs=fresh({...passives,voidBolt:1});
        check('Void Bolt hits the selected target for 100% spell damage and costs 5 mana',castVoidBolt()&&mobs[0].hp===988&&mobs.slice(1).every(monster=>monster.hp===1000)&&state.playerMana===120&&state.voidCharges===1);
        mobs=fresh({...passives,voidBolt:1});itemById.testAmulet.stats={multiHit:2};castVoidBolt();
        check('multihit grants a charge for each hit while paying once per cast',mobs.slice(0,3).every(monster=>monster.hp===988)&&mobs.slice(3).every(monster=>monster.hp===1000)&&state.voidCharges===3&&state.playerMana===120);
        fresh({...passives,voidBolt:1});itemById.testAmulet.stats={multiHit:.5};Math.random=()=>.25;castVoidBolt();
        check('fractional multihit can add a second Void Bolt target',state.voidCharges===2);
        fresh({...passives,voidBolt:1});itemById.testAmulet.stats={multiHit:.5};Math.random=()=>.75;castVoidBolt();
        check('fractional multihit can remain one target',state.voidCharges===1);
        mobs=fresh({...passives,voidBolt:1},1);itemById.testAmulet.stats={multiHit:20};castVoidBolt();
        check('Void Bolt uses normal multihit rules against a lone enemy',mobs[0].hp===988&&state.voidCharges===1&&state.playerMana===120);
        mobs=fresh({...passives,voidBolt:1},1);for(let index=0;index<6;index++)castVoidBolt();
        check('the separate locked Volley node cannot fire and charges cap at five',state.voidCharges===5&&dealt('voidVolley')===0&&state.playerMana===95);
        state.skillRanks.voidVolley=1;tickPlayerMana(0);landMissiles();
        check('unlocking Volley releases an already charged buff',state.voidCharges===0&&dealt('voidVolley')===120&&state.playerMana===85);

        mobs=fresh(both,1);state.voidCharges=4;castVoidBolt();landMissiles();
        check('the fifth hit consumes five charges and 10 extra mana for a volley',state.voidCharges===0&&state.playerMana===110&&mobs[0].hp===868);
        check('ten Volley missiles all hit a single surviving enemy',dealt('voidBolt')===12&&dealt('voidVolley')===120);
        mobs=fresh(both,10);itemById.testAmulet.stats={multiHit:9};castVoidBolt();landMissiles();
        check('ten multihit Bolt hits can trigger two volleys without recursive charge generation',dealt('voidBolt')===120&&dealt('voidVolley')===240&&state.voidCharges===0&&state.playerMana===100);
        mobs=fresh(both);state.voidCharges=5;let pick=0;Math.random=()=>((pick++%9)+.5)/9;castVoidVolley();landMissiles();
        check('Volley picks living targets independently and may hit targets repeatedly',dealt('voidVolley')===120&&mobs.filter(monster=>monster.hp<1000).length===9&&state.playerMana===115&&state.voidCharges===0);
        mobs=fresh(both,3);mobs.forEach(monster=>{monster.hp=12;});state.voidCharges=5;castVoidVolley();landMissiles();
        check('Volley retargets after kills and stops when no enemies remain',state.kills[map.id]===3&&mobs.every(monster=>monster.hp===0)&&dealt('voidVolley')===36&&state.playerMana===115);

        mobs=fresh(both,1);state.voidCharges=5;state.playerMana=9;
        check('insufficient mana preserves a charged volley',!castVoidVolley()&&state.voidCharges===5&&state.playerMana===9&&mobs[0].hp===1000);
        triggerAttackSpells();
        check('pending Volley reserves mana instead of being starved by cheap Bolts',state.voidCharges===5&&state.playerMana===9&&mobs[0].hp===1000);
        tickPlayerMana(.1);landMissiles();
        check('a charged volley fires once regeneration provides its mana cost',state.voidCharges===0&&near(state.playerMana,1.03125)&&mobs[0].hp===880);
        mobs=fresh(both,1);state.voidCharges=5;mobs[0].hp=0;
        check('no living targets preserves charges and mana',!castVoidVolley()&&state.voidCharges===5&&state.playerMana===125);
        mobs[0].hp=1000;tickPlayerMana(0);landMissiles();
        check('pending charges fire when a living target becomes available',state.voidCharges===0&&dealt('voidVolley')===120);
        mobs=fresh(both);state.playerMana=4;
        check('an unaffordable Bolt cannot spend mana or add charges',!castVoidBolt()&&state.playerMana===4&&state.voidCharges===0);
        fresh(both);state.combatPaused=true;state.voidCharges=5;
        check('paused combat cannot cast spells or spend charges',!castVoidBolt()&&!castVoidVolley()&&state.voidCharges===5&&state.playerMana===125);
        fresh();state.voidCharges=5;
        check('unallocated Void nodes cannot cast',!castVoidBolt()&&!castVoidVolley()&&state.voidCharges===0);
        fresh({baseMana1:1,voidBolt:1});
        check('zero spell damage does not waste mana or add charges',!castVoidBolt()&&state.playerMana===100&&state.voidCharges===0);
        mobs=fresh(both);state.attackTimer=1.15;itemById.testAmulet.stats={multiHit:2};simulateCombatStep(.1);
        check('one primary multihit attack casts once and only Bolt hits build charges',state.playerMana===120&&state.voidCharges===3&&dealt('voidBolt')===36);
        mobs=fresh({...both,maxFury2:1},1);state.voidCharges=5;castVoidVolley();landMissiles();
        check('missile hits build Fury while preserving the volley damage snapshot',state.furyStacks===10&&mobs[0].hp===880&&dealt('voidVolley')===120&&state.voidCharges===0);
        mobs=fresh({...passives,voidBolt:1});itemById.testAmulet.stats={bleedChance:1};castVoidBolt();
        check('Single target Void Bolt follows the existing Bleed eligibility rule',mobs[0].bleed?.stacks===1&&near(mobs[0].bleed.baseDamagePerTick,1.2));
        mobs=fresh(both);itemById.testAmulet.stats={bleedChance:1};state.voidCharges=5;castVoidVolley();landMissiles();
        check('AOE Volley missiles cannot apply Bleed',mobs.every(monster=>!monster.bleed));
        mobs=fresh(both);mobs[0].attackTimer=999.95;Math.random=()=>0;simulateCombatStep(.1);
        check('removed Wet no longer reduces enemy damage',state.playerHp===80&&!Object.hasOwn(mobs[0],'wetRemaining'));

        fresh(both);state.voidCharges=3;render();
        const buff=document.querySelector('[data-buff-id="voidCharges"]');
        check('the charge buff displays its complete ratio on one line',buff?.querySelector('.buff-stacks').textContent==='3/5'&&getComputedStyle(buff.querySelector('.buff-stacks')).whiteSpace==='nowrap'&&buff.querySelector('.buff-value').hidden&&buff.querySelector('.buff-duration').hidden);
        const plateBounds=elements.playerHealthPanel.getBoundingClientRect();
        state.voidCharges=4;renderCombatBuffs();castVoidBolt();renderCombatBuffs();
        check('consumed charges briefly show 5/5 and glow even when gained and consumed in one attack',state.voidCharges===0&&buff.isConnected&&buff.classList.contains('is-proccing')&&buff.querySelector('.buff-stacks').textContent==='5/5'&&getComputedStyle(buff).animationName.startsWith('void-buff-release'));
        const plateGlow=elements.playerHealthPanel.querySelector('.void-volley-player-glow');
        const latestLaunch=Math.max(...[...document.querySelectorAll('.spell-void-volley path')].map(path=>parseFloat(path.style.animationDelay)));
        check('the player plate glows through the final delayed Volley launch without changing its size',plateGlow&&parseFloat(plateGlow.style.getPropertyValue('--void-volley-glow-hold'))>latestLaunch&&getComputedStyle(plateGlow).pointerEvents==='none'&&near(elements.playerHealthPanel.getBoundingClientRect().width,plateBounds.width)&&near(elements.playerHealthPanel.getBoundingClientRect().height,plateBounds.height));
        const preGlow=plateGlow.getAnimations().find(animation=>animation.animationName==='void-volley-player-charge');
        const windup=parseFloat(plateGlow.style.getPropertyValue('--void-volley-glow-windup'));
        preGlow.pause();preGlow.currentTime=0;
        check('the player plate begins with a faint purple charge-up before the lines appear',windup>0&&getComputedStyle(plateGlow).filter==='opacity(0.25)');
        preGlow.currentTime=windup;
        check('the charge-up reaches full glow as the lines begin',getComputedStyle(plateGlow).filter==='opacity(1)');
        const release=buff.getAnimations()[0];release.pause();release.currentTime=650;
        check('the proc glow fades out before the buff is removed',parseFloat(getComputedStyle(buff).opacity)===0);
        buff.dispatchEvent(new AnimationEvent('animationend',{animationName:'void-buff-release',bubbles:true}));
        check('the charge buff disappears when its release animation finishes',!buff.isConnected&&state.voidCharges===0);
        check('the player glow outlasts the fading buff while missiles are still launching',plateGlow.isConnected);
        const firstDeadline=Number(plateGlow.dataset.releaseAt);showVoidVolleyPlayerGlow(.01);
        check('an earlier finishing Volley cannot shorten the player glow',Number(plateGlow.dataset.releaseAt)===firstDeadline);
        showVoidVolleyPlayerGlow(2);
        check('overlapping volleys extend one shared player glow',elements.playerHealthPanel.querySelectorAll('.void-volley-player-glow').length===1&&Number(plateGlow.dataset.releaseAt)>firstDeadline);
        const glowAnimation=plateGlow.getAnimations()[0],hold=parseFloat(plateGlow.style.getPropertyValue('--void-volley-glow-hold'));
        glowAnimation.pause();glowAnimation.currentTime=hold-1;
        check('the player glow stays visible until launches finish',parseFloat(getComputedStyle(plateGlow).opacity)>.99);
        glowAnimation.currentTime=hold+160;
        check('the player glow fades out after launches finish',parseFloat(getComputedStyle(plateGlow).opacity)===0);
        state.voidCharges=4;renderCombatBuffs();castVoidBolt();state.voidCharges=1;
        const nextBuff=document.querySelector('[data-buff-id="voidCharges"]');
        nextBuff.dispatchEvent(new AnimationEvent('animationend',{animationName:'void-buff-release',bubbles:true}));
        check('new charges gained during a proc remain after the glow ends',nextBuff.isConnected&&!nextBuff.classList.contains('is-proccing')&&nextBuff.querySelector('.buff-stacks').textContent==='1/5');
        state.skillRanks={...passives};normalizeVoidCharges();renderCombatBuffs();
        check('refunding Void Bolt clears its charge buff',state.voidCharges===0&&!document.querySelector('[data-buff-id="voidCharges"]'));

        skillNodes.filter(node=>!node.start).forEach(node=>{skillNodeConnections[root].add(node.id);skillNodeConnections[node.id].add(root);});
        fresh(both);state.voidCharges=4;state.playerMana=37.25;const saved=clone(createGameSave());applyGameSave(parseGameSave(JSON.stringify(saved)));
        check('charges and mana survive save/load',state.voidCharges===4&&state.playerMana===37.25);
        const old=clone(saved);delete old.voidCharges;old.contentMigrationVersion=1;
        old.skillRanks.thunderstorm=old.skillRanks.voidBolt;delete old.skillRanks.voidBolt;
        old.skillRanks.saltWaterBolt=old.skillRanks.voidVolley;delete old.skillRanks.voidVolley;
        old.monsterStates[0].wetRemaining=9;const raw=JSON.stringify(old);localStorage.setItem(saveKey,raw);
        check('old spell allocations migrate and retired Wet is stripped without losing progress',loadGame()&&state.skillRanks.voidBolt===1&&state.skillRanks.voidVolley===1&&state.voidCharges===0&&state.playerMana===37.25&&!Object.hasOwn(state.monsterStates[0],'wetRemaining')&&state.level===saved.level&&state.gold===saved.gold);
        check('the original spell save is backed up byte for byte',SaveCompatibility.backups().some(entry=>entry.raw===raw));
        const file=new DataTransfer();file.items.add(new File([raw],'older-spells.json',{type:'application/json'}));
        const input=document.getElementById('importProfileFile');input.files=file.files;input.dispatchEvent(new Event('change'));
        for(let attempt=0;document.getElementById('importProfile').disabled&&attempt<200;attempt++)await new Promise(resolve=>setTimeout(resolve,5));
        check('profile imports apply the same spell replacements',!document.getElementById('profileStatus').classList.contains('is-error')&&state.skillRanks.voidBolt===1&&state.skillRanks.voidVolley===1&&state.level===saved.level);
        const earliest=clone(old);earliest.skillRanks.thunderbolt=earliest.skillRanks.thunderstorm;delete earliest.skillRanks.thunderstorm;
        check('historical Thunderbolt IDs also migrate to Void Bolt',parseGameSave(JSON.stringify(earliest)).skillRanks.voidBolt===1);
        for(const value of [-1,6,.5]){const corrupt=clone(saved);corrupt.voidCharges=value;let rejected=false;try{parseGameSave(JSON.stringify(corrupt));}catch{rejected=true;}check('invalid Void charge counts are rejected',rejected);}
        const legacyMana=clone(saved);delete legacyMana.playerMana;delete legacyMana.voidCharges;applyGameSave(parseGameSave(JSON.stringify(legacyMana)));
        delete legacyMana.pendingVoidMissiles;applyGameSave(parseGameSave(JSON.stringify(legacyMana)));
        check('older saves safely default missing mana, charges and travelling missiles',state.playerMana===125&&state.voidCharges===0&&state.pendingVoidMissiles.length===0);

        mobs=fresh(both,1);render();state.voidCharges=5;castVoidVolley();
        check('launching Volley spends its cost but does not deal damage or show an early impact',state.playerMana===115&&state.voidCharges===0&&mobs[0].hp===1000&&state.pendingVoidMissiles.length===10&&!document.querySelector('.spell-impact-effect'));
        check('an immediately ready Volley still leaves time for its charge-up',near(parseFloat(document.querySelector('.spell-void-volley .void-missile').style.animationDelay),voidMissileTiming.windup*1000));
        check('every missile and impact ring share its damage deadline',[...document.querySelector('.spell-void-volley').querySelectorAll('path')].every((path,index)=>near(parseFloat(path.nextElementSibling.style.animationDelay)/1000+parseFloat(path.nextElementSibling.querySelector('animateMotion').getAttribute('dur')),state.pendingVoidMissiles[index].remaining)&&near(parseFloat(path.nextElementSibling.nextElementSibling.style.animationDelay)/1000,state.pendingVoidMissiles[index].remaining)));
        tickPendingVoidMissiles(state.pendingVoidMissiles[0].remaining-.01);
        check('missiles cannot hit before their travel time finishes',mobs[0].hp===1000&&!document.querySelector('.spell-impact-effect'));
        tickPendingVoidMissiles(.01);
        check('the first missile deals damage without creating a second delayed impact ring',mobs[0].hp===988&&state.pendingVoidMissiles.length===9&&document.querySelectorAll('.spell-void-volley .void-impact').length===10&&!document.querySelector('.spell-impact-effect'));
        tickPendingVoidMissiles(.099);
        check('the second missile waits for its staggered arrival',mobs[0].hp===988);
        tickPendingVoidMissiles(.001);
        check('staggered missiles apply their own damage on arrival',mobs[0].hp===964&&state.pendingVoidMissiles.length===7);
        const inFlight=clone(createGameSave()),flightQueue=JSON.stringify(state.pendingVoidMissiles);
        applyGameSave(parseGameSave(JSON.stringify(inFlight)));
        check('save/load retains damage and remaining travel time for every missile',JSON.stringify(state.pendingVoidMissiles)===flightQueue);
        landMissiles();const hpAfterFlight=state.monsterStates[0].hp;landMissiles();
        check('saved missiles land once without duplicated damage',hpAfterFlight===880&&state.monsterStates[0].hp===880&&state.pendingVoidMissiles.length===0);
        for(const bad of [{remaining:-1},{remaining:'0.4'},{damage:0},{targetId:null}]){
            const corrupt=clone(inFlight);Object.assign(corrupt.pendingVoidMissiles[0],bad);let rejected=false;
            try{parseGameSave(JSON.stringify(corrupt));}catch{rejected=true;}
            check('invalid travelling missile data is rejected: '+JSON.stringify(bad),rejected);
        }
        mobs=fresh(both,2);state.voidCharges=5;Math.random=()=>0;castVoidVolley();mobs[0].hp=0;
        tickPendingVoidMissiles(state.pendingVoidMissiles[0].remaining);
        check('a dead target redirects the missile without instant damage to another enemy',mobs[1].hp===1000&&state.pendingVoidMissiles.some(hit=>hit.targetId===mobs[1].id&&near(hit.remaining,voidMissileTiming.redirect)));
        tickPendingVoidMissiles(voidMissileTiming.redirect);
        check('a redirected missile hits after its additional travel time',mobs[1].hp===988);
        resetMonsterStates(map);
        check('changing the encounter clears travelling missiles',state.pendingVoidMissiles.length===0);
        mobs=fresh(both,1);state.voidCharges=5;castVoidVolley(300);tickPendingVoidMissiles(.699);
        check('a delayed Volley waits for its complete launch and flight delay',mobs[0].hp===1000);
        tickPendingVoidMissiles(.001);
        check('a delayed Volley lands at the shared visual deadline',mobs[0].hp===988);

        fresh(both,1);render();state.voidCharges=5;
        const previousEffects=combatEffects,batched=[];
        try{combatEffects=batched;castVoidVolley();tickPendingVoidMissiles(.2);}finally{combatEffects=previousEffects;}
        flushCombatEffects(batched);
        let presented=document.querySelector('.spell-void-volley');
        check('batched casts use remaining travel time instead of replaying a full flight',near(parseFloat(presented.querySelector('.void-impact').style.animationDelay),400)&&near(parseFloat(presented.querySelector('.void-missile').style.animationDelay),0));
        fresh(both,1);render();state.voidCharges=5;batched.length=0;
        try{combatEffects=batched;castVoidVolley();tickPendingVoidMissiles(state.pendingVoidMissiles[0].remaining);}finally{combatEffects=previousEffects;}
        flushCombatEffects(batched);presented=document.querySelector('.spell-void-volley');
        check('an arrival presented in the same batch flashes immediately without a duplicate ring',near(parseFloat(presented.querySelector('.void-impact').style.animationDelay),0)&&!document.querySelector('.spell-impact-effect'));

        function run(effects){
            fresh(both);render();state.monsterColumns=3;let seed=6753;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
            for(let index=0;index<120;index++){const result=simulateCombatStep(.1,effects);if(effects)flushCombatEffects(result.effects);}
            return JSON.stringify({mana:state.playerMana,charges:state.voidCharges,missiles:state.pendingVoidMissiles,monsters:state.monsterStates,hp:state.playerHp,loot:state.lootLog,meter:getDamageBreakdown()});
        }
        check('visible projectiles and offline simulation produce identical combat',run(false)===run(true));
        fresh(both,1);render();state.voidCharges=5;castVoidVolley();castVoidBolt();
        const volley=document.querySelector('.spell-void-volley'),bolt=document.querySelector('.spell-void-bolt');
        check('a single-target volley displays ten separate projectiles',volley?.querySelectorAll('path').length===10&&new Set([...volley.querySelectorAll('path')].map(path=>path.getAttribute('d'))).size===10&&bolt?.querySelector('path'));
        const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        check('missile heads have individual motion paths and respect reduced-motion settings',volley.querySelectorAll('.void-missile animateMotion').length===10&&(reducedMotion?getComputedStyle(volley.querySelector('.void-missile')).display==='none':getComputedStyle(volley.querySelector('.void-missile')).animationName==='void-missile-glow'));
        const missiles=volley.querySelectorAll('path');
        check('projectiles or contact flashes stagger in both animation modes',getComputedStyle(missiles[0]).animationName===(reducedMotion?'void-contact-flash':'void-projectile-flight')&&parseFloat(getComputedStyle(missiles[9]).animationDelay)>parseFloat(getComputedStyle(missiles[0]).animationDelay));
        const firstRing=volley.querySelector('.void-impact'),ringAnimation=firstRing.getAnimations()[0],contact=parseFloat(firstRing.style.animationDelay);
        ringAnimation.pause();ringAnimation.currentTime=contact-.1;
        check('the actual impact ring stays invisible before contact',parseFloat(getComputedStyle(firstRing).opacity)===0);
        ringAnimation.currentTime=contact+.1;
        check('the actual impact ring is immediately visible at contact',parseFloat(getComputedStyle(firstRing).opacity)>.95);
        if(reducedMotion){
            const flash=missiles[0].getAnimations()[0];flash.pause();flash.currentTime=100;
            check('reduced-motion lines do not reveal the whole route before contact',parseFloat(getComputedStyle(missiles[0]).opacity)===0);
            flash.currentTime=contact+.1;
            check('reduced-motion lines and impact rings become visible together',parseFloat(getComputedStyle(missiles[0]).opacity)>.95&&near(parseFloat(getComputedStyle(missiles[0]).animationDelay),parseFloat(getComputedStyle(firstRing).animationDelay)));
        }
        check('Void projectiles do not consume gameplay randomness',(()=>{let calls=0;const current=Math.random;Math.random=()=>{calls++;return .5;};showSpellCast('voidVolley',Array.from({length:10},()=>({targetId:state.monsterStates[0].id})));Math.random=current;return calls===0;})());
        const beforePaths=[...volley.querySelectorAll('path')].map(path=>path.getAttribute('d'));
        const latest=[...document.querySelectorAll('.spell-void-volley')].at(-1);
        check('repeated volleys vary their curved paths while keeping missile endpoints fixed',[...latest.querySelectorAll('path')].every((path,index)=>path.getAttribute('d')!==beforePaths[index]&&path.getAttribute('d').split(' ').slice(-2).join(' ')===beforePaths[index].split(' ').slice(-2).join(' ')));
        check('the projectile head and trail share their travel duration',near(parseFloat(volley.querySelector('animateMotion').getAttribute('dur')),voidMissileTiming.flight)&&(reducedMotion||near(parseFloat(getComputedStyle(volley.querySelector('path')).animationDuration),voidMissileTiming.flight)));
        // Exercise native SVG motion and CSS trail positions even when the host
        // OS requests reduced motion; restore that preference after this check.
        const matchMedia=window.matchMedia,normalStyle=document.createElement('style');
        normalStyle.textContent='.idle-adventure .spell-effect path{animation-name:void-projectile-flight!important;animation-duration:400ms!important;stroke-dasharray:.14 1.1!important}.idle-adventure .spell-effect .void-missile{display:inline!important}.idle-adventure .spell-effect .void-impact{animation-name:void-impact!important;animation-duration:450ms!important;animation-timing-function:ease-out!important;animation-fill-mode:forwards!important}';
        try{
            document.head.append(normalStyle);
            window.matchMedia=query=>query==='(prefers-reduced-motion: reduce)'?{matches:false}:matchMedia.call(window,query);
            showSpellCast('voidVolley',[{targetId:state.monsterStates[0].id}],200);
            const normal=[...document.querySelectorAll('.spell-void-volley')].at(-1);
            await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
            const path=normal.querySelector('path'),head=normal.querySelector('.void-missile'),motion=head.querySelector('animateMotion');
            normal.pauseAnimations();normal.setCurrentTime(normal.getCurrentTime()+.3);
            const started=motion.getStartTime(),animation=path.getAnimations()[0];
            const geometry=path.getAttribute('d').match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi).map(Number);
            const [sx,sy,c1x,c1y,c2x,c2y,tx,ty]=geometry,dx=tx-sx,dy=ty-sy,length=Math.hypot(dx,dy);
            const openingSide=Math.abs((c1x-sx)*dy-(c1y-sy)*dx)/length;
            const approachSide=Math.abs((c2x-sx)*dy-(c2y-sy)*dx)/length;
            check('Volley opens with a broad curve and homes toward the aim line',openingSide>35&&approachSide<openingSide*.3);
            for(const progress of [.25,.5,.9]){
                normal.setCurrentTime(started+voidMissileTiming.flight*progress);
                animation.pause();animation.currentTime=200+voidMissileTiming.flight*progress*1000;
                const distance=progress*progress;
                const point=path.getPointAtLength(path.getTotalLength()*distance);
                const expected=new DOMPoint(point.x,point.y).matrixTransform(path.getCTM());
                const actual=new DOMPoint(0,0).matrixTransform(head.getCTM());
                check('the rendered missile accelerates along its curve at '+progress,Math.hypot(actual.x-expected.x,actual.y-expected.y)<1);
                check('the rendered trail shares the missile acceleration at '+progress,Math.abs(parseFloat(getComputedStyle(path).strokeDashoffset)-(.14-distance))<.001);
            }
            const normalRing=normal.querySelector('.void-impact'),impact=normalRing.getAnimations()[0],arrival=600;
            impact.pause();impact.currentTime=arrival-.1;
            check('normal-motion impact rings remain hidden until the missile arrives',parseFloat(getComputedStyle(normalRing).opacity)===0);
            impact.currentTime=arrival+.1;
            check('normal-motion impact rings appear at arrival without a fade-in delay',parseFloat(getComputedStyle(normalRing).opacity)>.95);
        }finally{window.matchMedia=matchMedia;normalStyle.remove();}
        check('no runtime errors: '+window.smokeErrors.join('; '),!window.smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    finally{Math.random=random;itemById.testAmulet.stats=originalStats;combatStatCache=null;combatPoisonForecasts=null;Object.entries(links).forEach(([id,value])=>{skillNodeConnections[id]=value;});resetCombatClock();clearOfflineRecap();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
