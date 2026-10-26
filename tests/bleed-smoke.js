(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const near=(a,b)=>Math.abs(a-b)<1e-6,$=id=>document.getElementById(id),settle=()=>new Promise(resolve=>setTimeout(resolve,0));
    const change=(control,value)=>{control.value=value;control.dispatchEvent(new Event('change',{bubbles:true}));};
    try {
        if(typeof SkillStatCompat!=='undefined') {
            const oldDescription='25% chance to inflict Bleed on a physical hit. Each application adds 1 stack and 1 second to a shared timer, up to 5 seconds. Each stack deals 1 base damage per tick, once per second. All stacks expire together.';
            check('the old default Bleed description updates to two short lines',SkillStatCompat.normalizeBleedDescription(oldDescription)==='25% on hit: 10% hit damage/s.\nSingle target. +1s (max 5s).');
            check('custom Bleed descriptions remain untouched',SkillStatCompat.normalizeBleedDescription('My custom Bleed')==='My custom Bleed');
        }
        if ($('nodeForm')) {
            $('nodeList').querySelector('[data-node-id="bleed"]').click();
            check('Bleed has a two-line description and editable chance',$('nodeCustomDescription').checked&&$('nodeEffect').value.split('\n').length===2&&$('nodeEffect').value.includes('Single target')&&$('statBonusRows').querySelector('select').value==='bleedChance');
            change($('statBonusRows').querySelector('input'),'.5');await settle();
            $('addStatBonus').click();let row=$('statBonusRows').lastElementChild;
            change(row.querySelector('select'),'bleedDamage');change(row.querySelectorAll('select')[1],'multiplier');change(row.querySelector('input'),'2');await settle();
            $('addStatBonus').click();row=$('statBonusRows').lastElementChild;
            change(row.querySelector('select'),'bleedTickRate');change(row.querySelector('input'),'.5');await settle();
            const draft=JSON.parse(localStorage.getItem('idleAdventureSkillEditorDraft')),node=draft.tree.nodes.find(node=>node.id==='bleed');
            check('the skill editor saves Bleed chance, damage multiplier and tick speed',node.stats.bleedChance===.5&&node.stats.bleedDamageMultiplier===2&&node.stats.bleedTickRate===.5&&$('statsError').hidden);
            check('Bleed stats pass structural validation without an empty-stat warning',!$('validationList').textContent.includes('unsupported stat "bleed')&&!$('validationList').textContent.includes('Bleed: this filler node'));
        } else if ($('itemForm')) {
            $('addItem').click();
            for(const [key,value] of Object.entries({bleedChance:.25,bleedDamage:3,bleedTickRate:.5,bleedDamageMultiplier:2})){
                const previous=new Set([...$('statRows').querySelectorAll('select')].map(control=>control.value));
                $('addStat').click();change([...$('statRows').querySelectorAll('select')].find(control=>!previous.has(control.value)),key);
                const row=[...$('statRows').children].find(row=>row.querySelector('select')?.value===key);
                change(row.querySelector('input'),String(value));await settle();
            }
            check('the item editor previews Bleed chance and damage',$('preview').textContent.includes('Bleed chance')&&$('preview').textContent.includes('Bleed damage'));
            check('the item editor explains the shared timer',$('statRows').textContent.includes('shared timer'));
        } else {
            const originalRandom=Math.random,originalStats=itemById.testAmulet.stats,map=currentMap();
            function fresh(ranks={},count=4,health=1000) {
                combatStatCache=null;clearFury();state.shieldStacks=0;state.skillRanks={...ranks};pendingSkillRanks={};
                state.level=Object.keys(ranks).length;state.skillPoints=0;state.experience=0;state.upgrades={strength:0,haste:0,evasion:0};
                state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];state.crafted=[];itemById.testAmulet.stats={bleedChance:1};
                state.kills=Object.fromEntries(mapData.map(entry=>[entry.id,0]));state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,0]));state.gold=0;state.lootLog=[];state.lastLoot=null;state.tutorials=createTutorialState();
                state.selectedMap=map.id;state.selectedWorld=worldForMap(map.id).id;state.currentView='map';state.isInTown=false;state.playerHp=100;state.combatPaused=false;state.attackTimer=0;
                map.drops=[];map.itemDrops=[];map.spawns=[{id:'bleedMob',monsterId:worldContent.monsters[0].id,count,overrides:{health,attackDamage:0,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:2,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
                resetMonsterStates(map);resetCombatClock();clearOfflineRecap();Math.random=()=>0;return state.monsterStates;
            }
            const directHit=(monster,damage)=>{applyDamageToMonster(monster,damage);tryApplyBleed(monster,damage);};
            try {
                let [a]=fresh({bleed:1});itemById.testAmulet.stats={bleedChance:.1,bleedChanceMultiplier:2,bleedDamage:4,bleedDamageMultiplier:2,bleedTickRate:1,bleedTickRateMultiplier:2};
                check('skill and equipment Bleed stats combine correctly',near(getBleedChance(),.7)&&getBleedDamage(10)===10&&getBleedTickInterval()===.25);
                [a]=fresh();directHit(a,100);directHit(a,200);
                check('100 and 200 damage hits add ten and twenty damage to the shared DOT',a.hp===700&&a.bleed.stacks===2&&near(a.bleed.baseDamagePerTick,30)&&near(getRemainingBleedDamage(a),60));
                tickMonsterBleed(a,1);check('mixed-strength applications tick for their combined damage',near(a.hp,670)&&a.bleed.stacks===2);
                itemById.testAmulet.stats.damage=9998;tickMonsterBleed(a,1);
                check('changing attack damage cannot rewrite the damage of earlier Bleed applications',near(a.hp,640)&&!a.bleed);
                [a]=fresh();itemById.testAmulet.stats.bleedDamageMultiplier=2;directHit(a,100);directHit(a,200);tickMonsterBleed(a,1);
                check('Bleed damage multipliers scale the combined hit-based DOT',near(a.hp,640)&&near(getBleedTickDamage(a.bleed),60));
                itemById.testAmulet.stats.bleedDamageMultiplier=3;tickMonsterBleed(a,1);
                check('equipped Bleed modifiers continue to affect active DOTs',near(a.hp,550));
                [a]=fresh();directHit(a,1);tickMonsterBleed(a,1);
                check('small hits retain fractional Bleed damage instead of rounding up to one',near(a.hp,998.9));
                [a]=fresh();itemById.testAmulet.stats.maxFury=10;directHit(a,100);
                check('Fury gained by a hit does not change its Bleed contribution',state.furyStacks===1&&near(a.bleed.baseDamagePerTick,10));
                [a]=fresh();let rolls=0;Math.random=()=>{rolls++;return 0;};
                for(const damage of [undefined,NaN,Infinity,0,-1])tryApplyBleed(a,damage);
                check('missing or invalid triggering damage never creates Bleed or consumes a roll',!a.bleed&&rolls===0);
                [a]=fresh();itemById.testAmulet.stats={};Math.random=()=>{throw new Error('Bleed consumed randomness at zero chance');};directHit(a,2);
                check('zero chance preserves ordinary hits and combat random rolls',a.hp===998&&!a.bleed);
                [a]=fresh();tryApplyBleed(a,10);
                check('first application creates one stack with a one-second shared timer',a.bleed.stacks===1&&a.bleed.remainingDuration===1&&a.bleed.timeUntilTick===1);
                tickMonsterBleed(a,.4);tryApplyBleed(a,10);
                check('a later application adds time instead of resetting ticks or refreshing the duration',a.bleed.stacks===2&&near(a.bleed.remainingDuration,1.6)&&near(a.bleed.timeUntilTick,.6)&&a.hp===1000);
                for(let index=0;index<4;index++)tryApplyBleed(a,10);
                check('the shared timer caps at five seconds while stacks keep accumulating',a.bleed.stacks===6&&a.bleed.remainingDuration===5&&near(a.bleed.timeUntilTick,.6));
                tickMonsterBleed(a,.6);check('all stacks tick together',a.hp===994&&a.bleed.stacks===6&&near(a.bleed.remainingDuration,4.4));
                [a]=fresh();for(let index=0;index<3;index++)tryApplyBleed(a,10);tickMonsterBleed(a,2.5);
                check('old stacks stay active for the entire shared duration',a.hp===994&&a.bleed.stacks===3&&near(a.bleed.remainingDuration,.5));
                tickMonsterBleed(a,.5);check('the final tick lands at expiration and all stacks disappear together',a.hp===991&&a.bleed===null);
                [a]=fresh();tryApplyBleed(a,10);for(let index=0;index<10;index++)tickMonsterBleed(a,.1);
                check('fractional steps never drop or duplicate the expiry tick',a.hp===999&&a.bleed===null);
                const runTicks=steps=>{const [monster]=fresh();for(let index=0;index<5;index++)tryApplyBleed(monster,10);steps.forEach(elapsed=>tickMonsterBleed(monster,elapsed));return JSON.stringify({hp:monster.hp,bleed:monster.bleed});};
                check('large elapsed steps and small steps give identical total Bleed damage',runTicks([10])===runTicks(Array(100).fill(.1)));
                [a]=fresh();itemById.testAmulet.stats.bleedTickRate=3;tryApplyBleed(a,10);tickMonsterBleed(a,1);
                check('tick speed bonuses increase ticks without extending the duration',a.hp===996&&!a.bleed);
                [a]=fresh();itemById.testAmulet.stats.maxFury=10;tryApplyBleed(a,10);Math.random=()=>{throw new Error('DOT damage attempted an application roll');};tickMonsterBleed(a,1);applyDamageToMonster(a,1,'poison');applyDamageToMonster(a,1,'dot');
                check('Bleed and other DOTs cannot build Fury or apply additional Bleed',state.furyStacks===0&&!a.bleed&&a.hp===997);
                [a]=fresh();itemById.testAmulet.stats.poisonChance=1;itemById.testAmulet.stats.attackSpeedMultiplier=.001;tryApplyBleed(a,10);tryApplyPoison(a);simulateCombatStep(1);
                check('poison and Bleed coexist with independent timers',a.hp===998&&!a.bleed&&a.poisonStacks.length===1&&near(a.poisonStacks[0].remainingDuration,4));
                [a]=fresh();Math.random=()=>.999;state.attackTimer=getAttackSpeed();simulateCombatStep(.1);
                check('missed attacks do not apply Bleed',state.monsterStates.every(monster=>!monster.bleed));
                [a]=fresh();itemById.testAmulet.stats.damage=98;state.attackTimer=getAttackSpeed()-.1;simulateCombatStep(.1);
                check('basic attacks apply Bleed based on their actual hit damage',a.hp===900&&a.bleed?.stacks===1&&near(a.bleed.baseDamagePerTick,10));
                fresh();itemById.testAmulet.stats.multiHit=2;state.attackTimer=getAttackSpeed()-.1;simulateCombatStep(.1);
                check('multihits each apply Bleed once to their directly hit target',state.monsterStates.slice(0,3).every(monster=>monster.bleed?.stacks===1&&near(monster.bleed.baseDamagePerTick,.2))&&!state.monsterStates[3].bleed);
                [a]=fresh({shockwaveSlash:1});state.attackTimer=getAttackSpeed()-.1;simulateCombatStep(.1);
                check('a direct attack with Shockwave Slash applies Bleed only to the direct target',a.bleed?.stacks===1&&state.monsterStates.slice(1).every(monster=>monster.hp<1000&&!monster.bleed));
                [a]=fresh({shockwaveSlash:1});triggerShockwaveSlash(a,10);check('Shockwave Slash splash cannot apply Bleed',state.monsterStates.every(monster=>!monster.bleed));
                [a]=fresh({volcanicEruption:1});triggerVolcanicEruption(a,1);check('eruption impact and splash cannot apply Bleed',state.monsterStates.every(monster=>!monster.bleed));
                for(const kind of ['piercingArrow','forkingArrow']){[a]=fresh();shootAbilityArrow([a],1,kind);check(kind+' cannot apply Bleed',state.monsterStates.every(monster=>!monster.bleed));}
                [a]=fresh();shootAbilityArrow([a],1,'multiShot');check('single-target Multishot can apply Bleed',a.bleed?.stacks===1&&near(a.bleed.baseDamagePerTick,.1));
                [a]=fresh({shieldGenerator:1,shieldSlam:1});state.shieldStacks=10;tryShieldSlam();check('single-target Shield Slam can apply Bleed',a.bleed?.stacks===1&&near(a.bleed.baseDamagePerTick,1));
                [a]=fresh();tryApplyBleed(a,10);const beforeAbility=JSON.stringify(a.bleed);shootAbilityArrow([a],1,'piercingArrow');
                check('AOE ability hits cannot extend existing Bleed or add to its damage pool',JSON.stringify(a.bleed)===beforeAbility);
                let b;[a,b]=fresh({shieldGenerator:1,bloomingFlower:1});b.hp=1;tryApplyBleed(b,10);tickMonsterBleed(b,1);
                check('Bleed kills grant normal rewards and shields without switching a living target or spreading Bleed',b.hp===0&&!b.bleed&&state.kills[map.id]===1&&state.gold===1&&state.shieldStacks===1&&activeMonster()===a&&!a.bleed);
                simulateCombatStep(2);check('respawned enemies start without stale Bleed stacks',b.hp===1000&&!b.bleed);
                [a]=fresh({poisonExecute:1});for(let index=0;index<100;index++)tryApplyBleed(a,10);applyDamageToMonster(a,1);
                check('Poison Execute does not count future Bleed damage',a.hp===999&&state.kills[map.id]===0);
                [a]=fresh();tryApplyBleed(a,10);state.playerHp=0;state.combatPaused=true;simulateCombatStep(.5);simulateCombatStep(.5);
                check('Bleed keeps ticking after player death and expires normally',a.hp===999&&!a.bleed&&state.combatPaused);
                const queue=skillNodes.filter(node=>node.start).map(node=>[node.id]),seen=new Set(queue.flat());let path;
                for(let index=0;index<queue.length;index++){const route=queue[index],id=route.at(-1);if(id==='bleed'){path=route;break;}skillNodeConnections[id].forEach(next=>{if(!seen.has(next)){seen.add(next);queue.push([...route,next]);}});}
                check('the Bleed node is reachable from the center',Boolean(path));
                const ranks=Object.fromEntries(path.filter(id=>!skillNodeById[id].start).map(id=>[id,1]));
                [a]=fresh(ranks);for(let index=0;index<3;index++)tryApplyBleed(a,10);tickMonsterBleed(a,.4);
                const saved=JSON.parse(JSON.stringify(createGameSave())),expected=JSON.stringify(a.bleed);applyGameSave(parseGameSave(JSON.stringify(saved)));a=state.monsterStates[0];
                check('profiles preserve stacks, shared duration and partial tick progress',JSON.stringify(a.bleed)===expected);
                const previousVersion=JSON.parse(JSON.stringify(saved));delete previousVersion.monsterStates[0].bleed.baseDamagePerTick;
                applyGameSave(parseGameSave(JSON.stringify(previousVersion)));a=state.monsterStates[0];
                check('older active Bleed saves preserve their original pending base damage',a.bleed.baseDamagePerTick===a.bleed.stacks);
                tryApplyBleed(a,100);check('new hit-based damage adds correctly to a restored legacy DOT',near(a.bleed.baseDamagePerTick,13)&&a.bleed.stacks===4);
                const legacy=JSON.parse(JSON.stringify(saved));legacy.monsterStates.forEach(monster=>delete monster.bleed);applyGameSave(parseGameSave(JSON.stringify(legacy)));
                check('older profiles load without inventing Bleed',state.monsterStates.every(monster=>monster.bleed===null));
                for(const invalid of [{stacks:0},{stacks:.5},{stacks:-1},{baseDamagePerTick:-1},{baseDamagePerTick:null},{baseDamagePerTick:'10'},{remainingDuration:0},{remainingDuration:5.1},{timeUntilTick:0},{timeUntilTick:11},[],'bleed']){
                    const bad=JSON.parse(JSON.stringify(saved));bad.monsterStates[0].bleed=Array.isArray(invalid)||typeof invalid==='string'?invalid:{stacks:1,remainingDuration:1,timeUntilTick:1,...invalid};
                    let rejected=false;try{parseGameSave(JSON.stringify(bad));}catch(_){rejected=true;}check('malformed Bleed saves are rejected: '+JSON.stringify(invalid),rejected);
                }
                function simulate(effects){fresh({bleed:1,shieldGenerator:1,shockwaveSlash:1},8,60);Object.assign(itemById.testAmulet.stats,{bleedDamage:4,attackSpeedMultiplier:4,multiHit:2});let seed=7843;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};for(let index=0;index<400;index++)simulateCombatStep(.1,effects);return JSON.stringify({monsters:state.monsterStates,hp:state.playerHp,kills:state.kills,gold:state.gold,target:state.targetMonsterId,shields:state.shieldStacks});}
                const observer=new MutationObserver(()=>{});observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
                const foreground=simulate(true),offline=simulate(false);const mutations=observer.takeRecords();observer.disconnect();
                check('foreground and offline Bleed combat produce identical states and rewards',foreground===offline&&state.kills[map.id]>0);
                check('Bleed simulation does not mutate the DOM',mutations.length===0);
                [a]=fresh();for(let index=0;index<5;index++)tryApplyBleed(a,10);a.poisonStacks=[{remainingDuration:5,timeUntilTick:1}];render();
                const card=elements.enemyRoster.firstElementChild,badge=card.querySelector('[data-enemy-bleed-status]'),health=card.querySelector('.health-track'),before=health.getBoundingClientRect();
                check('plates show red Bleed stacks and the shared duration beside poison',!badge.hidden&&badge.querySelector('strong').textContent==='5x'&&badge.querySelector('[data-enemy-bleed-duration]').textContent==='5s'&&!card.querySelector('[data-enemy-dot-status]').hidden);
                check('Bleed status stays inside the plate on narrow screens',badge.getBoundingClientRect().right<=card.getBoundingClientRect().right+1&&badge.getBoundingClientRect().left>=card.getBoundingClientRect().left-1);
                const green=card.querySelector('.enemy-health-poison-damage:not(.enemy-health-bleed-damage)'),red=card.querySelector('.enemy-health-bleed-damage');
                check('poison and Bleed forecasts occupy separate health-bar segments',parseFloat(red.style.width)>0&&parseFloat(red.style.left)+parseFloat(red.style.width)<=parseFloat(green.style.left)+1e-6);
                tickMonsterBleed(a,5);a.poisonStacks=[];renderCombat();const after=health.getBoundingClientRect();
                check('expiring statuses hides the badge without moving the health bar',badge.hidden&&near(before.top,after.top)&&near(before.left,after.left)&&near(before.width,after.width));
                $('detailedStats').open=true;renderCombat();
                check('combat stats expose Bleed chance and damage details',$('bleedChanceDisplay').textContent==='100%'&&$('detailedStatsList').textContent.includes('Bleed from a normal hit'));
                state.currentView='upgrades';render();await document.fonts.ready;
                document.querySelector('[data-skill-node="bleed"]').dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));
                const description=$('skillNodeTooltip').querySelector('span');
                check('the Bleed tooltip renders no more than two lines',!$('skillNodeTooltip').hidden&&description.getBoundingClientRect().height<=parseFloat(getComputedStyle(description).lineHeight)*2+1);
            } finally {Math.random=originalRandom;itemById.testAmulet.stats=originalStats;combatStatCache=null;resetCombatClock();clearOfflineRecap();}
        }
        check('no runtime errors: '+window.smokeErrors.join('; '),!window.smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error){checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
