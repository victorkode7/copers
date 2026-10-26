(async function () {
    const phase=sessionStorage.getItem('saveCompatPhase'),checks=JSON.parse(sessionStorage.getItem('saveCompatChecks')||'[]');
    const check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const clone=value=>JSON.parse(JSON.stringify(value)),settle=()=>new Promise(resolve=>setTimeout(resolve,5));
    const originalLinks=Object.fromEntries(Object.entries(skillNodeConnections).map(([id,links])=>[id,new Set(links)]));
    const originalGoals=mapData.map(map=>map.goal),originalRanks=Object.fromEntries(skillNodes.map(node=>[node.id,node.maxRank]));
    const primaryKey=saveKey,root=skillNodes.find(node=>node.start).id;
    async function importText(text) {
        const transfer=new DataTransfer();transfer.items.add(new File([text],'old-profile.json',{type:'application/json'}));
        const input=document.getElementById('importProfileFile');input.files=transfer.files;input.dispatchEvent(new Event('change'));
        for(let i=0;document.getElementById('importProfile').disabled&&i<300;i++)await settle();
        if(document.getElementById('importProfile').disabled)throw new Error('Import did not finish');
    }
    function sameProgress(actual,expected) {
        return actual.gold===expected.gold&&actual.level===expected.level&&actual.experience===expected.experience&&
            JSON.stringify(actual.materials)===JSON.stringify(expected.materials)&&JSON.stringify(actual.kills)===JSON.stringify(expected.kills)&&
            JSON.stringify(actual.ownedItemIds)===JSON.stringify(expected.ownedItemIds)&&JSON.stringify(actual.gear)===JSON.stringify(expected.gear);
    }
    try {
        if(phase==='failed-startup') {
            const raw=sessionStorage.getItem('saveCompatInvalid'),valid=sessionStorage.getItem('saveCompatValid');
            check('startup preserves an unsupported save byte for byte',localStorage.getItem(primaryKey)===raw&&SaveCompatibility.protection.blocked&&document.getElementById('saveRecovery').open);
            const before=JSON.stringify(state);saveGame();updateCombatClock();simulateCombatStep(60);processCombatBacklog();window.dispatchEvent(new Event('pagehide'));
            check('autosave, combat and page exit cannot replace a failed startup save',localStorage.getItem(primaryKey)===raw&&JSON.stringify(state)===before);
            const createUrl=URL.createObjectURL,anchorClick=HTMLAnchorElement.prototype.click;let download;
            try {
                URL.createObjectURL=blob=>{download=blob;return 'blob:recovery-test';};HTMLAnchorElement.prototype.click=()=>{};
                document.getElementById('downloadProtectedSave').click();
                check('the recovery download contains the exact original input',await download.text()===raw);
            }finally{URL.createObjectURL=createUrl;HTMLAnchorElement.prototype.click=anchorClick;}
            document.getElementById('browseRecoveryBackups').click();
            check('automatic backups are accessible inside the recovery screen',document.getElementById('saveBackupsDialog').open&&document.getElementById('saveBackupsList').querySelector('button'));
            document.getElementById('closeSaveBackups').click();
            await importText(valid);
            check('a valid imported backup exits recovery and restores progression',!SaveCompatibility.protection.blocked&&!document.getElementById('saveRecovery').open&&state.gold===4321&&state.level===8&&JSON.parse(localStorage.getItem(primaryKey)).version===SaveCompatibility.version);
            check('recovery never deletes the preserved original',SaveCompatibility.backups().some(entry=>entry.raw===raw));
            for(const key of ['saveCompatPhase','saveCompatChecks','saveCompatInvalid','saveCompatValid'])sessionStorage.removeItem(key);
        } else {
            // A controlled valid build reproduces a connection edit independently
            // of the user's working tree and temporarily unconnected new nodes.
            for(const id of ['damageNode','mightyBlows','shockwaveSlash'])skillNodeConnections[id]=new Set();
            skillNodeConnections[root].add('damageNode');skillNodeConnections.damageNode.add(root);
            skillNodeConnections.damageNode.add('mightyBlows');skillNodeConnections.mightyBlows.add('damageNode');
            skillNodeConnections.mightyBlows.add('shockwaveSlash');skillNodeConnections.shockwaveSlash.add('mightyBlows');
            state.skillRanks={damageNode:1,mightyBlows:1,shockwaveSlash:1};state.level=8;state.skillPoints=5;state.experience=17;state.gold=4321;
            state.kills=Object.fromEntries(mapData.map(map=>[map.id,map.goal+30]));state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,7]));
            state.materials.futureOre=17;state.upgrades={strength:2,haste:1,evasion:0};state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.gear.helmet='testDropHelm';
            state.ownedItemIds=['testAmulet','testDropHelm'];state.crafted=['testAmulet'];state.tutorials=createTutorialState();state.developerTravelEnabled=false;state.developerItemsEnabled=false;
            state.unlockedMapIds=[];state.unlockedWorldIds=[];state.selectedWorld=worldData[0].id;state.selectedMap=worldData[0].mapIds[0];
            state.lastMapByWorld=Object.fromEntries(worldData.map(world=>[world.id,world.mapIds[0]]));state.currentView='map';state.isInTown=false;
            resetMonsterStates(currentMap());state.playerHp=100;state.combatPaused=true;state.attackTimer=.27;resetCombatClock();clearOfflineRecap();
            const baseline=clone(createGameSave());baseline.questProgress={chapter:'old-story',completed:['intro']};
            const removed=clone(baseline);removed.version=3;removed.skillRanks.deletedSkill=2;removed.skillPoints-=2;
            let migrated=parseGameSave(JSON.stringify(removed));
            check('removed skill nodes refund their exact cost without resetting unrelated progress',migrated.skillPoints===5&&!migrated.skillRanks.deletedSkill&&sameProgress(migrated,baseline));
            check('migrations are idempotent after a profile is updated',JSON.stringify(parseGameSave(JSON.stringify(migrated)))===JSON.stringify(migrated));
            const renamed=clone(baseline);renamed.skillRanks.maxFury_copy=1;renamed.skillPoints--;
            skillNodeConnections[root].add('maxFury2');skillNodeConnections.maxFury2.add(root);
            migrated=parseGameSave(JSON.stringify(renamed));
            check('renamed IDs retain allocations and points on a valid path',migrated.skillRanks.maxFury2===1&&!Object.hasOwn(migrated.skillRanks,'maxFury_copy')&&migrated.skillPoints===4&&sameProgress(migrated,baseline));
            const ranked=clone(baseline);ranked.skillRanks.damageNode=3;ranked.skillPoints=3;
            migrated=parseGameSave(JSON.stringify(ranked));
            check('reduced rank limits refund excess ranks and retain downstream skills',migrated.skillRanks.damageNode===1&&migrated.skillRanks.shockwaveSlash===1&&migrated.skillPoints===5&&sameProgress(migrated,baseline));
            skillNodeById.damageNode.maxRank=2;migrated=parseGameSave(JSON.stringify(ranked));skillNodeById.damageNode.maxRank=originalRanks.damageNode;
            check('rank migration honors the actual new maximum rather than assuming one rank',migrated.skillRanks.damageNode===2&&migrated.skillPoints===4);
            skillNodeConnections.damageNode.delete('mightyBlows');skillNodeConnections.mightyBlows.delete('damageNode');
            const oldRaw=JSON.stringify(baseline);localStorage.setItem(primaryKey,oldRaw);
            check('normal loading succeeds after an allocated branch becomes disconnected',loadGame()&&state.skillPoints===7&&state.skillRanks.damageNode===1&&!state.skillRanks.mightyBlows&&!state.skillRanks.shockwaveSlash&&sameProgress(createGameSave(),baseline));
            check('the pre-migration original is backed up exactly',SaveCompatibility.backups().some(entry=>entry.raw===oldRaw));
            const normalResult=JSON.stringify(state.skillRanks);await importText(oldRaw);
            check('imports use the same topology migration and preserve progression',JSON.stringify(state.skillRanks)===normalResult&&state.skillPoints===7&&sameProgress(createGameSave(),baseline));
            check('unknown unrelated save fields survive migration and the next save',JSON.stringify(createGameSave().questProgress)===JSON.stringify(baseline.questProgress));
            skillNodeConnections.damageNode.add('mightyBlows');skillNodeConnections.mightyBlows.add('damageNode');
            const legacy=clone(baseline);legacy.version=3;
            for(const key of ['unlockedMapIds','unlockedWorldIds','preservedContent','contentMigrationVersion','furyStacks','furyRemaining','shieldStacks','developerTravelEnabled'])delete legacy[key];
            delete legacy.upgrades.evasion;delete legacy.gear.boots;delete legacy.tutorials.firstSkillPointDismissed;
            migrated=parseGameSave(JSON.stringify(legacy));
            check('older profiles gain safe defaults for new fields and stats',migrated.version===SaveCompatibility.version&&migrated.upgrades.evasion===0&&migrated.gear.boots===null&&migrated.furyStacks===0&&migrated.shieldStacks===0&&migrated.tutorials.firstSkillPointDismissed===false&&migrated.unlockedWorldIds.length===worldData.length);
            const context=saveCompatibilityContext(),missingItems={...context,items:{...context.items}};delete missingItems.items.testAmulet;
            const developerProfile=clone(baseline);developerProfile.developerItemsEnabled=true;developerProfile.gear.ring='adminRing';
            migrated=parseGameSave(JSON.stringify(developerProfile));
            check('enabled developer equipment remains equipped without normal ownership entries',migrated.gear.ring==='adminRing'&&!migrated.ownedItemIds.includes('adminRing'));
            developerProfile.developerItemsEnabled=false;developerProfile.ownedItemIds.push('adminRing');migrated=parseGameSave(JSON.stringify(developerProfile));
            check('disabled developer equipment safely unequips without invalidating normal progress',migrated.gear.ring===null&&migrated.gold===baseline.gold);
            const editorRenamed=clone(baseline);editorRenamed.skillRanks.historicalDamage=editorRenamed.skillRanks.damageNode;delete editorRenamed.skillRanks.damageNode;
            migrated=SaveCompatibility.migrate(editorRenamed,{...context,skillAliases:{historicalDamage:'damageNode'}});
            check('rename history exported by the editor preserves allocations',migrated.skillRanks.damageNode===1&&!migrated.skillRanks.historicalDamage&&migrated.skillPoints===5);
            migrated=SaveCompatibility.migrate(clone(baseline),{...context,removedSkills:[{id:'shockwaveSlash',reason:'Removed in editor'}]});
            check('editor removal history refunds the removed node without changing progression',!migrated.skillRanks.shockwaveSlash&&migrated.skillPoints===6&&sameProgress(migrated,baseline));
            const previousAliases=skillTreeData.nodeIdAliases,renamedNode=skillNodeById.shockwaveSlash;
            try {
                skillTreeData.nodeIdAliases={...previousAliases,shockwaveSlash:'renamedShockwave'};
                skillNodeById.renamedShockwave=renamedNode;delete skillNodeById.shockwaveSlash;
                check('renamed abilities retain their runtime identity, rank and targeting tag',getSkillNodeRank('shockwaveSlash',{renamedShockwave:1})===1&&skillNodeDefinition('shockwaveSlash')===renamedNode&&SkillDescriptions.getAbilityTargeting(skillNodeDefinition('shockwaveSlash'))==='aoe');
            }finally{skillTreeData.nodeIdAliases=previousAliases;skillNodeById.shockwaveSlash=renamedNode;delete skillNodeById.renamedShockwave;}
            const cycle=clone(baseline);cycle.skillRanks.cycleA=1;cycle.skillPoints--;let cycleRejected=false;
            try{SaveCompatibility.migrate(cycle,{...context,skillAliases:{cycleA:'cycleB',cycleB:'cycleA'}});}catch{cycleRejected=true;}
            check('invalid alias cycles fail safely instead of losing skill allocations',cycleRejected);
            const unavailable=SaveCompatibility.migrate(clone(baseline),missingItems);
            check('unavailable equipment and crafting history are preserved instead of deleted',!unavailable.ownedItemIds.includes('testAmulet')&&unavailable.gear.necklace===null&&unavailable.preservedContent.ownedItemIds.includes('testAmulet')&&unavailable.preservedContent.crafted.includes('testAmulet')&&unavailable.preservedContent.gear.necklace==='testAmulet');
            const returned=SaveCompatibility.migrate(clone(unavailable),context);
            check('returning content restores item ownership, crafting history and equipment',returned.ownedItemIds.includes('testAmulet')&&returned.crafted.includes('testAmulet')&&returned.gear.necklace==='testAmulet');
            const retiredRules=[...SaveCompatibility.contentMigrations,{version:2,description:'Test retirement',items:{removed:[{id:'testAmulet',reason:'Explicit test retirement'}]}}];
            const retired=SaveCompatibility.migrate(clone(unavailable),context,retiredRules);
            check('documented removals apply to active and preserved ownership only for the retired item',!retired.ownedItemIds.includes('testAmulet')&&!retired.preservedContent.ownedItemIds.includes('testAmulet')&&!retired.preservedContent.crafted.includes('testAmulet')&&retired.gear.necklace===null&&retired.ownedItemIds.includes('testDropHelm')&&retired.gold===baseline.gold);
            const aliasSource=clone(baseline);aliasSource.ownedItemIds[0]='oldAmulet';aliasSource.crafted[0]='oldAmulet';aliasSource.gear.necklace='oldAmulet';aliasSource.materials.oldOre=3;
            const aliasRules=[...SaveCompatibility.contentMigrations,{version:2,description:'Test rename',items:{aliases:{oldAmulet:'testAmulet'}},materials:{aliases:{oldOre:'gel'}}}];
            const aliases=SaveCompatibility.migrate(aliasSource,context,aliasRules);
            check('explicit item and material renames retain ownership and merge quantities',aliases.gear.necklace==='testAmulet'&&aliases.ownedItemIds.includes('testAmulet')&&aliases.materials.gel===baseline.materials.gel+3&&!Object.hasOwn(aliases.materials,'oldOre')&&aliases.materials.futureOre===17);
            const worldId=baseline.selectedWorld,mapId=baseline.selectedMap,oldDestination=clone(baseline);
            oldDestination.selectedWorld='oldWorld';oldDestination.selectedMap='oldMap';oldDestination.lastMapByWorld={oldWorld:'oldMap'};
            oldDestination.unlockedWorldIds=['oldWorld'];oldDestination.unlockedMapIds=['oldMap'];oldDestination.kills.oldMap=12;delete oldDestination.kills[mapId];
            const destinationAliases=SaveCompatibility.migrate(oldDestination,context,[...SaveCompatibility.contentMigrations,{version:2,description:'Test destination rename',worlds:{aliases:{oldWorld:worldId}},maps:{aliases:{oldMap:mapId}}}]);
            check('world and map renames retain destination, kill history and unlocks',destinationAliases.selectedWorld===worldId&&destinationAliases.selectedMap===mapId&&destinationAliases.kills[mapId]===12&&destinationAliases.lastMapByWorld[worldId]===mapId&&destinationAliases.unlockedWorldIds.includes(worldId)&&destinationAliases.unlockedMapIds.includes(mapId));
            const oldMap=baseline.selectedMap,removedMapContext={...context,maps:{...context.maps},worlds:context.worlds.map(world=>({...world,mapIds:world.mapIds.filter(id=>id!==oldMap)}))};delete removedMapContext.maps[oldMap];
            const mapRules=[...SaveCompatibility.contentMigrations,{version:2,description:'Test map retirement',maps:{removed:[{id:oldMap,reason:'Explicit test map retirement'}]}}];
            const destination=SaveCompatibility.migrate(clone(baseline),removedMapContext,mapRules);
            check('retired maps choose an unlocked destination and reset only encounter state',destination.selectedMap!==oldMap&&destination.unlockedMapIds.includes(destination.selectedMap)&&Object.hasOwn(context.maps,destination.selectedMap)&&destination.monsterStates.length===0&&destination.gold===baseline.gold&&destination.level===baseline.level&&JSON.stringify(destination.materials)===JSON.stringify(baseline.materials));
            mapData.forEach(map=>{map.goal+=1000;});migrated=parseGameSave(JSON.stringify(baseline));applyGameSave(migrated);
            check('earned map and world unlocks survive higher kill requirements',worldData.every((world,index)=>worldIsUnlocked(index)&&mapsForWorld(world.id).every((map,mapIndex)=>mapIsUnlocked(mapsForWorld(world.id),mapIndex))));
            const visited=clone(legacy);visited.selectedWorld=worldData[1].id;visited.selectedMap=worldData[1].mapIds.at(-1);visited.lastMapByWorld[worldData[1].id]=visited.selectedMap;
            migrated=parseGameSave(JSON.stringify(visited));
            check('legacy visited destinations preserve unlocks even without newer unlock fields',migrated.unlockedWorldIds.includes(worldData[1].id)&&migrated.unlockedMapIds.includes(visited.selectedMap));
            mapData.forEach((map,index)=>{map.goal=originalGoals[index];});
            const setItem=Storage.prototype.setItem;const rawLegacy=JSON.stringify(removed);localStorage.setItem(primaryKey,rawLegacy);const beforeFailure=JSON.stringify(state);
            try {
                Storage.prototype.setItem=function(key,value){if(key.startsWith('idleAdventureSave:backup:'))throw new DOMException('Full','QuotaExceededError');return setItem.call(this,key,value);};
                // Force a new backup payload, so an earlier deduplicated copy cannot bypass storage.
                const uniqueRaw=rawLegacy+' ';localStorage.setItem(primaryKey,uniqueRaw);
                check('failed backup storage blocks migration without changing live progress',!loadGame()&&SaveCompatibility.protection.blocked&&localStorage.getItem(primaryKey)===uniqueRaw&&JSON.stringify(state)===beforeFailure);
            }finally{Storage.prototype.setItem=setItem;}
            check('retrying after storage recovers loads and unlocks saving',loadGame()&&!SaveCompatibility.protection.blocked&&state.gold===4321);
            const bomRaw='\uFEFF'+JSON.stringify(baseline);localStorage.setItem(primaryKey,bomRaw);
            check('normal loading accepts a legacy byte order mark and backs up the exact bytes',loadGame()&&state.gold===4321&&SaveCompatibility.backups().some(entry=>entry.raw===bomRaw));
            const migrationRaw=JSON.stringify(removed)+'  ',beforeWriteFailure=JSON.stringify(state);localStorage.setItem(primaryKey,migrationRaw);
            try {
                Storage.prototype.setItem=function(key,value){if(key===primaryKey)throw new DOMException('Full','QuotaExceededError');return setItem.call(this,key,value);};
                check('failed migration persistence rolls back live progress and retains the primary original',!loadGame()&&SaveCompatibility.protection.blocked&&localStorage.getItem(primaryKey)===migrationRaw&&JSON.stringify(state)===beforeWriteFailure);
            }finally{Storage.prototype.setItem=setItem;}
            check('retrying a failed migration write safely completes recovery',loadGame()&&!SaveCompatibility.protection.blocked&&state.gold===4321);
            const oldApply=applyGameSave,beforeImportRaw=localStorage.getItem(primaryKey),beforeImport=clone(createGameSave()),failing=clone(beforeImport);failing.gold=9999;
            try {
                applyGameSave=function(saved){if(saved.gold===9999){state.gold=9999;throw new Error('Simulated apply failure');}return oldApply(saved);};
                await importText(JSON.stringify(failing));
                check('an import apply failure rolls back both storage and the running profile',localStorage.getItem(primaryKey)===beforeImportRaw&&state.gold===beforeImport.gold&&document.getElementById('profileStatus').classList.contains('is-error'));
            }finally{applyGameSave=oldApply;}
            const invalid=' {"version":999,"gold":48123,"keep":"original bytes"} ';
            // The next navigation exercises the real startup path that formerly
            // mistook a load error for a new game and overwrote the original.
            sessionStorage.setItem('saveCompatValid',JSON.stringify(baseline));sessionStorage.setItem('saveCompatInvalid',invalid);
            sessionStorage.setItem('saveCompatPhase','failed-startup');sessionStorage.setItem('saveCompatChecks',JSON.stringify(checks));
            localStorage.setItem(primaryKey,invalid);
            // Do not let the outgoing healthy page's normal pagehide autosave
            // replace this synthetic startup input before the next page reads it.
            SaveCompatibility.protection.blocked=true;location.reload();return;
        }
        check('no unexpected runtime errors: '+window.smokeErrors.join('; '),!window.smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    finally{Object.entries(originalLinks).forEach(([id,links])=>{skillNodeConnections[id]=links;});mapData.forEach((map,index)=>{map.goal=originalGoals[index];});skillNodes.forEach(node=>{node.maxRank=originalRanks[node.id];});}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
