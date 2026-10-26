(async function () {
    const checks=[], check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const near=(a,b)=>Math.abs(a-b)<1e-6;
    const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
    try {
        if (document.getElementById('nodeForm')) {
            const key='shieldExpansionSmokePhase',draftKey='idleAdventureSkillEditorDraft',phase=sessionStorage.getItem(key);
            const reloadDraft=(draft,nextPhase,keepInspector=false)=>{
                // Navigation autosaves must keep the synthetic draft we are testing.
                if(!keepInspector)delete draft.inspector;
                const setItem=Storage.prototype.setItem;
                Storage.prototype.setItem=function(key,value){return setItem.call(this,key,key===draftKey?JSON.stringify(draft):value);};
                localStorage.setItem(draftKey,JSON.stringify(draft));sessionStorage.setItem(key,nextPhase);location.reload();
            };
            if (!phase) {
                const old=JSON.parse(JSON.stringify(window.adventureSkillTree));
                old.nodes=old.nodes.filter(node=>!['overflowingSlam','resonantGuard','bleed','deepWounds'].includes(node.id)); delete old.shieldExpansionSchemaVersion;delete old.bleedSchemaVersion;delete old.deepWoundsSchemaVersion;
                const edited=old.nodes.find(node=>node.id==='healthNode'); edited.stats={health:321}; edited.column=-8; edited.row=-2;
                old.nodes.find(node=>node.id==='maxFury2').id='maxFury_copy';
                old.nodes.find(node=>node.id==='maxFury_copy').name='Fury Copy';
                old.nodes.forEach(node=>{node.requires=node.requires.map(id=>id==='maxFury2'?'maxFury_copy':id);});
                const legacyEffect='On reaching max shield stacks. Consume half your shield stacks. Dealing 30% physical damage per stack to the target.';
                old.nodes.find(node=>node.id==='shieldSlam').effect=legacyEffect;
                reloadDraft({version:1,tree:old,selectedId:'shieldSlam',selectedIds:['shieldSlam','maxFury_copy'],selectionAnchorId:'maxFury_copy',inspector:{fields:{nodeEffect:legacyEffect,nodeCustomDescription:true},bonuses:[]}},'restored',true);return;
            }
            if (phase==='restored') {
                for(const id of ['overflowingSlam','resonantGuard','bleed','deepWounds']) check(id+' is added once to the older local draft',document.querySelectorAll('#nodeList [data-node-id="'+id+'"]').length===1);
                check('restoring an older Shield Slam inspector shows the current damage description',document.getElementById('nodeEffect').value.includes('100%'));
                check('renamed nodes remain selected when an older draft is restored',document.querySelector('#graphNodes [data-node-id="maxFury2"]').getAttribute('aria-pressed')==='true');
                document.querySelector('#nodeList [data-node-id="resonantGuard"]').click();await settle();
                const draft=JSON.parse(localStorage.getItem(draftKey)),edited=draft.tree.nodes.find(node=>node.id==='healthNode');
                check('adding new skills preserves existing edited stats and positions',edited.stats.health===321&&edited.column===-8&&edited.row===-2);
                const addedDeepWounds=draft.tree.nodes.find(node=>node.id==='deepWounds');
                check('Deep Wounds avoids occupied positions when migrating an older draft',addedDeepWounds.column!==edited.column||addedDeepWounds.row!==edited.row);
                check('new shield nodes retain unique descriptions and the current editor connections',JSON.stringify(draft.tree.nodes.find(node=>node.id==='overflowingSlam').requires)===JSON.stringify(window.adventureSkillTree.nodes.find(node=>node.id==='overflowingSlam').requires)&&document.getElementById('nodeEffect').value.includes('1 shield')&&document.getElementById('nodeCustomDescription').checked);
                draft.tree.nodes=draft.tree.nodes.filter(node=>!['overflowingSlam','bleed','deepWounds'].includes(node.id));
                const guard=draft.tree.nodes.find(node=>node.id==='resonantGuard');guard.name='My Guard';guard.effect='My shield mechanic';guard.column=-4;guard.row=-2;guard.requires=['healthNode'];
                draft.tree.nodes.find(node=>node.id==='shieldSlam').effect='My custom slam description';
                const fury=draft.tree.nodes.find(node=>node.id==='maxFury2');fury.id='maxFury_copy';fury.name='Fury Copy';
                draft.tree.nodes.forEach(node=>{node.requires=node.requires.map(id=>id==='maxFury2'?'maxFury_copy':id);});
                draft.selectedId='maxFury_copy';draft.selectedIds=['maxFury_copy'];draft.selectionAnchorId='maxFury_copy';
                draft.inspector={fields:{nodeId:'maxFury_copy',nodeName:'Fury Copy'},bonuses:[]};
                reloadDraft(draft,'custom',true);return;
            }
            check('later intentional deletion of a new node is preserved',!document.querySelector('#nodeList [data-node-id="overflowingSlam"]'));
            check('later intentional deletion of Bleed is preserved',!document.querySelector('#nodeList [data-node-id="bleed"]'));
            check('later intentional deletion of Deep Wounds is preserved',!document.querySelector('#nodeList [data-node-id="deepWounds"]'));
            check('old inspector IDs and Copy labels cannot overwrite a migrated node',document.getElementById('nodeId').value==='maxFury2'&&document.getElementById('nodeName').value==='Fury');
            document.querySelector('#nodeList [data-node-id="resonantGuard"]').click();await settle();
            const draft=JSON.parse(localStorage.getItem(draftKey)),guard=draft.tree.nodes.find(node=>node.id==='resonantGuard');
            check('later names, descriptions, positions and connections remain editable',guard.name==='My Guard'&&guard.effect==='My shield mechanic'&&guard.column===-4&&guard.row===-2&&guard.requires.join()==='healthNode');
            check('a customized Shield Slam description remains untouched',draft.tree.nodes.find(node=>node.id==='shieldSlam').effect==='My custom slam description');
            sessionStorage.removeItem(key);
        } else {
            const originalRandom=Math.random,originalItem=itemById.testAmulet.stats,map=currentMap();
            const base={shieldGenerator:1,shieldSlam:1},overflow={...base,overflowingSlam:1},resonance={shockwaveSlash:1,resonantGuard:1};
            function fresh(ranks=overflow,count=3,health=1000) {
                combatStatCache=null;clearFury();state.shieldStacks=0;state.skillRanks={...ranks};pendingSkillRanks={};
                state.level=Object.keys(ranks).length;state.skillPoints=0;state.experience=0;state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];state.crafted=[];
                itemById.testAmulet.stats={damage:98};state.upgrades={strength:0,haste:0,evasion:0};state.playerHp=100;state.combatPaused=false;state.attackTimer=0;
                state.gold=0;state.kills=Object.fromEntries(mapData.map(entry=>[entry.id,0]));state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,0]));state.lootLog=[];state.lastLoot=null;state.tutorials=createTutorialState();
                state.selectedMap=map.id;state.selectedWorld=worldForMap(map.id).id;state.currentView='map';state.isInTown=false;map.drops=[];map.itemDrops=[];
                map.spawns=[{id:'shieldExpansion',monsterId:worldContent.monsters[0].id,count,overrides:{health,attackDamage:0,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:2,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
                resetMonsterStates(map);resetCombatClock();clearOfflineRecap();Math.random=()=>0;return state.monsterStates;
            }
            try {
                let [a,b,c]=fresh(base);a.hp=50;b.hp=60;state.shieldStacks=10;tryShieldSlam();
                check('unallocated Overflowing Slam leaves existing single-target slams unchanged',a.hp===0&&b.hp===60&&c.hp===1000&&state.shieldStacks===6);
                [a,b,c]=fresh();a.hp=50;b.hp=60;state.shieldStacks=10;tryShieldSlam();
                check('500 slam damage carries fifty then sixty then 390 damage across enemies',a.hp===0&&b.hp===0&&c.hp===610);
                check('overflow kills award normal rewards and keep target selection valid',state.kills[map.id]===2&&state.gold===2&&state.shieldStacks===7&&activeMonster()===c);
                [a,b,c]=fresh();a.hp=500;state.shieldStacks=10;tryShieldSlam();check('an exact kill creates no phantom overflow',a.hp===0&&b.hp===1000&&c.hp===1000);
                [a,b,c]=fresh({...overflow,poisonExecute:1});a.hp=510;a.poisonStacks=[{remainingDuration:10,timeUntilTick:1}];state.shieldStacks=10;tryShieldSlam();
                check('poison execution cannot create extra physical overflow damage',a.hp===0&&b.hp===1000&&c.hp===1000);
                [a,b,c]=fresh();itemById.testAmulet.stats.maxFury=50;a.hp=50;b.hp=60;state.shieldStacks=10;tryShieldSlam();
                check('Fury earned during an overflowing slam cannot inflate its original damage budget',c.hp===610&&state.furyStacks===3);
                [a]=fresh(base,1,2000);itemById.testAmulet.stats.damage=198;state.shieldStacks=10;tryShieldSlam();
                check('slam damage scales with physical damage rather than using flat damage per shield',a.hp===1000&&state.shieldStacks===5);
                const oldDescription='On reaching max shield stacks. Consume half your shield stacks. Dealing 30% physical damage per stack to the target.';
                check('legacy default descriptions update to 100 percent while custom descriptions remain intact',SkillStatCompat.normalizeShieldSlamDescription(oldDescription).includes('100%')&&SkillStatCompat.normalizeShieldSlamDescription('My slam description')==='My slam description');
                fresh({shieldGenerator:1,overflowingSlam:1});state.shieldStacks=10;tryShieldSlam();check('Overflowing Slam requires Shield Slam to fire',activeMonster().hp===1000&&state.shieldStacks===10);
                fresh(overflow,100,1);state.shieldStacks=10;tryShieldSlam();check('large overflow chains terminate and never duplicate kills',state.kills[map.id]===100&&state.gold===100&&!activeMonster()&&state.shieldStacks===10&&!resolvingShieldSlam);
                [a]=fresh({shockwaveSlash:1});triggerShockwaveSlash(a,10);check('ordinary Shockwave Slash does not grant shields',state.shieldStacks===0);
                [a]=fresh(resonance,64);triggerShockwaveSlash(a,10);check('one shockwave grants one shield regardless of how many enemies it hits',state.shieldStacks===1&&state.kills[map.id]===0);
                [a]=fresh(resonance,1);triggerShockwaveSlash(a,100);check('Resonant Guard generates shields in a single-enemy fight',state.shieldStacks===1&&a.hp===1000);
                applyDamageToPlayer(1e6);check('attack-generated shields block incoming hits without Shield Generator',state.shieldStacks===0&&state.playerHp===100);
                [a]=fresh(resonance);Math.random=()=>.999;triggerShockwaveSlash(a,10);check('failed shockwave procs do not grant shields',state.shieldStacks===0);
                [a]=fresh({resonantGuard:1});Math.random=()=>{throw new Error('Unallocated shockwave rolled a proc');};triggerShockwaveSlash(a,10);check('Resonant Guard requires Shockwave Slash to activate',state.shieldStacks===0);
                [a]=fresh(resonance);itemById.testAmulet.stats.multiHit=2;state.attackTimer=getAttackSpeed()-.05;simulateCombatStep(.1);
                check('multi-hit attacks grant one shield for each actual shockwave proc',state.shieldStacks===3&&state.kills[map.id]===0);
                [a]=fresh({...resonance,shieldSlam:1},1);for(let index=0;index<10;index++)triggerShockwaveSlash(a,100);
                check('a boss fight can build ten shields and trigger a slam without any kills',a.hp===500&&state.shieldStacks===5&&state.kills[map.id]===0);
                [a]=fresh({resonantGuard:1});applyDamageToMonster(a,1000);check('Resonant Guard alone does not grant shields on kills',state.shieldStacks===0);
                fresh({...resonance,shieldGenerator:1});state.shieldStacks=3;delete state.skillRanks.shieldGenerator;normalizeShields();check('removing one generation source preserves shields from the other',state.shieldStacks===3);
                delete state.skillRanks.resonantGuard;normalizeShields();check('removing both generation sources removes held shields',state.shieldStacks===0);
                const snapshot=()=>JSON.stringify({hp:state.playerHp,shields:state.shieldStacks,fury:state.furyStacks,target:state.targetMonsterId,attack:state.attackTimer,monsters:state.monsterStates,kills:state.kills,gold:state.gold});
                function run(effects) {
                    fresh({...overflow,...resonance},8,120);itemById.testAmulet.stats.multiHit=2;itemById.testAmulet.stats.maxShields=-6;
                    let seed=123;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
                    const observer=new MutationObserver(()=>{});observer.observe(document.body,{subtree:true,childList:true,attributes:true,characterData:true});
                    for(let index=0;index<200;index++)simulateCombatStep(.1,effects);
                    const mutations=observer.takeRecords().length;observer.disconnect();return {state:snapshot(),mutations};
                }
                const foreground=run(true),offline=run(false);
                check('overflow, resonance, kills and target selection match during offline simulation',foreground.state===offline.state);
                check('simulation collects the new visuals without changing the DOM',!foreground.mutations&&!offline.mutations);
                const queue=skillNodes.filter(node=>node.start).map(node=>[node.id]),seen=new Set(queue.flat()),paths=new Map();
                for(let index=0;index<queue.length;index++){const path=queue[index],id=path.at(-1);paths.set(id,path);skillNodeConnections[id].forEach(next=>{if(!seen.has(next)){seen.add(next);queue.push([...path,next]);}});}
                const ids=new Set(['overflowingSlam','resonantGuard'].flatMap(id=>paths.get(id)||[]));
                fresh(Object.fromEntries([...ids].filter(id=>!skillNodeById[id].start).map(id=>[id,1])));state.shieldStacks=4;
                const saved=parseGameSave(JSON.stringify(createGameSave()));state.shieldStacks=0;applyGameSave(saved);
                check('both new connected skills and attack-generated shields survive profile reload',state.skillRanks.overflowingSlam===1&&state.skillRanks.resonantGuard===1&&state.shieldStacks===4);
                fresh(overflow,8,10);render();state.shieldStacks=10;const result=simulateCombatStep(.1,true);flushCombatEffects(result.effects);renderCombat();
                const wave=elements.combatPanel.querySelector('.shield-slam-wave'),impacts=wave?.querySelectorAll('.shield-slam-impact');
                check('a real slam stamps a shield on each hit plate without a connecting line',wave&&wave.dataset.hitIds.split(' ').length===8&&impacts.length===8&&wave.querySelectorAll('.shield-slam-stamp').length===8&&!wave.querySelector('animateMotion,.shield-slam-trail'));
                check('overflow impacts play in hit order with pressure rings and six shards per impact',wave.querySelectorAll('.shield-slam-pressure').length===8&&wave.querySelectorAll('.shield-slam-shard').length===48&&parseFloat(impacts[0].style.getPropertyValue('--shield-slam-delay'))===0&&parseFloat(impacts[7].style.getPropertyValue('--shield-slam-delay'))>parseFloat(impacts[1].style.getPropertyValue('--shield-slam-delay')));
                const box=elements.enemyRoster.querySelector('[data-monster-id="'+impacts[0].dataset.monsterId+'"]').getBoundingClientRect(),frame=wave.getBoundingClientRect(),matrix=impacts[0].transform.baseVal.consolidate().matrix;
                check('shield impacts remain centered on their plates',near(matrix.e,box.left+box.width/2-frame.left)&&near(matrix.f,box.top+box.height/2-frame.top));
                check('the slam overlay cannot intercept clicks or overflow the layout',getComputedStyle(wave).pointerEvents==='none'&&getComputedStyle(wave).position==='absolute');
                for(let index=0;index<12;index++)showShieldSlamWave(state.monsterStates.map(monster=>monster.id));
                check('rapid slams keep at most six visual waves active',elements.combatPanel.querySelectorAll('.shield-slam-wave').length===6);
                await new Promise(resolve=>setTimeout(resolve,1450));check('finished slam visuals clean themselves up',!elements.combatPanel.querySelector('.shield-slam-wave'));
                fresh(overflow,1);render();state.shieldStacks=10;tryShieldSlam();check('a single-target slam still gets a shield impact',elements.combatPanel.querySelector('.shield-slam-wave')?.dataset.hitIds===state.monsterStates[0].id);
                fresh(overflow,100);render();showShieldSlamWave(state.monsterStates.map(monster=>monster.id));const crowded=elements.combatPanel.querySelector('.shield-slam-wave:last-child');
                check('long chains cap visual work while retaining the first and final impacts',crowded.querySelectorAll('.shield-slam-impact').length===12&&crowded.querySelector('.shield-slam-impact').dataset.monsterId===state.monsterStates[0].id&&crowded.querySelector('.shield-slam-impact:last-child').dataset.monsterId===state.monsterStates[99].id);
                elements.enemyRoster.dataset.mapId='previous-map';renderCombat();check('changing maps or rebuilding the roster clears stale slam effects',!elements.combatPanel.querySelector('.shield-slam-wave'));
            } finally {Math.random=originalRandom;itemById.testAmulet.stats=originalItem;combatStatCache=null;resetCombatClock();clearOfflineRecap();}
        }
        check('no runtime errors: '+window.smokeErrors.join('; '),!window.smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
