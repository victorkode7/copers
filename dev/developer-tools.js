(function(){
    'use strict';
    // This file owns developer capabilities. Keep it optional: the main game
    // calls guarded hooks, and playtest packages must omit this entire folder.
    // Saved flags are preferences, not an authorization boundary or anti-cheat.
    const saveKey='idleAdventureSave:development';
    let root,status,picker,search,mode,equipment,tools,grantButton,deleteButton,message='',lastCatalogue='';
    const node=(tag,text,id)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(id)el.id=id;return el;};
    function allows(capability,profile){
        if(!profile)return false;
        if(capability==='equipment')return profile.developerItemsEnabled===true;
        if(capability==='travel'||capability==='resources')return profile.developerTravelEnabled===true;
        return false;
    }
    const owns=(item,profile)=>Boolean(item?.developerOnly&&allows('equipment',profile));
    const writable=()=>!SaveCompatibility.protection.blocked&&!simulatingCombat&&!combatCatchingUp;
    function refresh(){
        ItemCrafting.stopAuto('Auto rolling stopped after a developer change.');
        invalidateSkillBonusCache();lastRenderedGearSignature=null;
        state.playerHp=Math.min(state.playerHp,getPlayerMaxHealth());
        state.playerMana=Math.min(state.playerMana,getPlayerMaxMana());state.manaCapacity=getPlayerMaxMana();
    }
    function transact(change,success){
        if(!writable())return false;
        const before={...state};
        try{
            // Clone the mutable collections touched by tools, retaining the full
            // previous live state for rollback if browser storage rejects it.
            state.ownedItemIds=[...state.ownedItemIds];state.gear={...state.gear};
            state.townProgress=TownProgression.clone(state.townProgress);
            state.tutorials={...state.tutorials};
            change();refresh();localStorage.setItem(saveKey,JSON.stringify(createGameSave()));message=success;
        }catch{
            Object.assign(state,before);invalidateSkillBonusCache();lastRenderedGearSignature=null;message='Could not save. Your previous progress was kept.';
            window.render();return false;
        }
        window.render();return true;
    }
    function grant(id){
        const item=itemById[id];
        if(!allows('travel',state)||!item||item.developerOnly||!gearSlots.includes(item.slot)||ownsItem(id))return false;
        return transact(()=>{state.ownedItemIds.push(id);},item.name+' added to inventory.');
    }
    function remove(id){
        const item=itemById[id];
        if(!allows('travel',state)||!item||item.developerOnly||!state.ownedItemIds.includes(id))return false;
        return transact(()=>{
            state.ownedItemIds=state.ownedItemIds.filter(owned=>owned!==id);
            for(const slot of gearSlots)if(state.gear[slot]===id)state.gear[slot]=null;
            // Craft completion, base bonuses, and stored rolls are history; do not
            // delete them or add rewards when the item is acquired again.
            if(state.tutorials.firstGearItemId===id)Object.assign(state.tutorials,{firstGearPending:false,firstGearItemId:null,firstGearSlot:null,firstGearSlotSelected:false});
        },item.name+' removed. It can be acquired again; crafting history and stored rolls were kept.');
    }
    function normalizeTravel(){
        const worldIndex=worldData.findIndex(world=>world.id===state.selectedWorld);
        const world=worldIsUnlocked(worldIndex)?worldData[worldIndex]:worldData[0],maps=mapsForWorld(world.id);
        const index=maps.findIndex(map=>map.id===state.selectedMap);
        const destination=mapIsUnlocked(maps,index)?maps[index]:maps.filter((map,index)=>mapIsUnlocked(maps,index)).at(-1);
        if(destination.id!==state.selectedMap){
            state.selectedWorld=world.id;state.selectedMap=destination.id;state.lastMapByWorld={...state.lastMapByWorld,[world.id]:destination.id};
            resetMonsterStates(destination);clearEnemyDamageIndicator();state.attackTimer=0;
            state.lastLoot=null;state.lastDrop='Defeat enemies to find loot.';
        }
    }
    function setMode(enabled){
        return transact(()=>{
            state.developerTravelEnabled=Boolean(enabled);state.developerItemsEnabled=Boolean(enabled);state.mapListExpanded=true;
            if(!enabled){for(const slot of gearSlots)if(itemById[state.gear[slot]]?.developerOnly)state.gear[slot]=null;normalizeTravel();}
        },enabled?'Developer mode enabled. Spending resources is free; admin equipment is available.':'Developer mode disabled. Normal spending restored.');
    }
    function setEquipment(enabled){
        return transact(()=>{state.developerItemsEnabled=Boolean(enabled);if(!enabled)for(const slot of gearSlots)if(itemById[state.gear[slot]]?.developerOnly)state.gear[slot]=null;},'Developer equipment preference saved.');
    }
    function resetTown(){
        if(!writable()||!window.confirm('Reset all Town buildings and materials? Adventure progress and gold will be kept.'))return false;
        const ok=transact(()=>{state.townProgress=TownProgression.defaults();},'Town reset.');
        const label=document.getElementById('resetTownStatus');label.hidden=false;label.textContent=ok?'Town reset.':'Could not save. Town progress kept.';
        return ok;
    }
    function increaseLevel(){
        if(!allows('travel',state))return false;
        const previousPoints=getEarnedSkillPoints();
        const ok=transact(()=>{
            state.level++;state.experience=0;state.experienceRemainder=0;syncSkillPoints();
        },'Character level increased by 1.');
        if(ok)triggerLevelUpEffect({level:state.level,skillPoints:Math.max(0,getEarnedSkillPoints()-previousPoints)});
        return ok;
    }
    function copyPlaytest(){
        if(!writable()||!window.confirm('Copy your playtest profile into this development slot? The playtest profile stays untouched. Current development progress will be backed up.'))return false;
        try{
            const raw=localStorage.getItem('idleAdventureSave');if(!raw)throw new Error('No playtest profile is stored in this browser.');
            const saved=parseGameSave(raw);saved.developerItemsEnabled=false;saved.developerTravelEnabled=false;
            restoreImportedProfile(saved,raw);refresh();message='Playtest profile copied into the development slot. Original kept.';window.render();return true;
        }catch(error){message=error.message;render();return false;}
    }
    function render(){
        if(!root)return;
        mode.checked=state.developerTravelEnabled;equipment.checked=state.developerItemsEnabled;
        const active=allows('travel',state),locked=!writable();tools.hidden=!active;
        mode.disabled=equipment.disabled=locked;status.textContent=message;
        const signature=JSON.stringify([search.value,state.ownedItemIds]);
        if(signature!==lastCatalogue){
            const candidates=itemData.items.filter(item=>!item.developerOnly&&gearSlots.includes(item.slot)&&(!search.value||[item.name,item.id,item.slot].some(value=>value.toLowerCase().includes(search.value.trim().toLowerCase()))));
            const selected=picker.value;picker.replaceChildren(...candidates.map(item=>{const option=node('option',item.name+' · '+item.slot+(state.ownedItemIds.includes(item.id)?' · Owned':''));option.value=item.id;return option;}));
            if(candidates.some(item=>item.id===selected))picker.value=selected;
            lastCatalogue=signature;
        }
        grantButton.disabled=locked||!picker.value||ownsItem(picker.value);deleteButton.disabled=locked||!state.ownedItemIds.includes(picker.value);
        document.getElementById('developerCopyPlaytest').disabled=locked;
        document.getElementById('resetTownProgress').disabled=locked;
        document.getElementById('increaseLevelButton').disabled=locked||!active;
        document.getElementById('previewScytheReap').disabled=locked||!active;
    }
    function mount(){
        if(root)return;
        const interfaceLabel=node('label');interfaceLabel.className='interface-setting';
        const navigationToggle=node('input',undefined,'hideDeveloperNavigation');navigationToggle.type='checkbox';
        const navigationCopy=node('span','Hide developer navigation');navigationCopy.append(node('small','Hide the top Game and editor links. Settings and the game navigation remain available.'));
        interfaceLabel.append(navigationToggle,navigationCopy);
        document.getElementById('combatSettingsDialog').insertBefore(interfaceLabel,document.getElementById('combatSettingsDialog').children[1]);
        try{navigationToggle.checked=JSON.parse(localStorage.getItem(saveKey+':interface')||'null')?.hideNavigation===true;}catch{/* Default to visible. */}
        document.querySelector('.app-nav').hidden=navigationToggle.checked;
        navigationToggle.addEventListener('change',()=>{document.querySelector('.app-nav').hidden=navigationToggle.checked;try{localStorage.setItem(saveKey+':interface',JSON.stringify({hideNavigation:navigationToggle.checked}));}catch{message='Navigation preference applied for this session.';render();}});
        root=node('footer');root.className='developer-options';root.id='developerTools';
        const details=node('details'),summary=node('summary','Developer tools · separate development save');
        const info=node('p','Development build. Developer mode makes spending free; resource balances and normal production stay unchanged.');
        function checkbox(id,text,handler){const label=node('label'),input=node('input',undefined,id);input.type='checkbox';input.addEventListener('change',()=>handler(input.checked));label.append(input,document.createTextNode(' '+text));details.append(label);return input;}
        details.append(summary,info);mode=checkbox('developerTravel','Developer mode',setMode);equipment=checkbox('developerItems','Enable developer equipment',setEquipment);
        tools=node('div');tools.style.cssText='max-width:48rem;padding:.75rem 0';
        const level=node('button','Increase Level by 1','increaseLevelButton');level.type='button';level.className='dev-level-button';
        level.title='Gain one level; skill points respect the boss cap';level.addEventListener('click',increaseLevel);tools.append(level);
        const preview=node('button','Preview Reap','previewScytheReap');preview.type='button';
        preview.addEventListener('click',()=>{
            if(!allows('travel',state))return;document.getElementById('mapButton').click();
            window.ReapSprite?.ready.then(()=>window.ReapSprite.show(state.targetMonsterId||state.monsterStates[0]?.id));
        });tools.append(preview);
        const searchLabel=node('label','Find normal equipment');search=node('input',undefined,'developerEquipmentSearch');search.type='search';search.placeholder='Name, slot, or item ID';searchLabel.append(search);
        const pickerLabel=node('label','Equipment');picker=node('select',undefined,'developerEquipmentPicker');picker.style.maxWidth='100%';pickerLabel.append(picker);
        grantButton=node('button','Add equipment','developerGrantItem');deleteButton=node('button','Delete equipment','developerDeleteItem');
        grantButton.type=deleteButton.type='button';grantButton.addEventListener('click',()=>grant(picker.value));deleteButton.addEventListener('click',()=>remove(picker.value));
        search.addEventListener('input',render);picker.addEventListener('change',render);tools.append(searchLabel,pickerLabel,grantButton,deleteButton);
        const copy=node('button','Copy playtest profile into development','developerCopyPlaytest');copy.type='button';copy.addEventListener('click',copyPlaytest);
        const reset=node('button','Reset Town','resetTownProgress');reset.type='button';reset.addEventListener('click',resetTown);
        const resetStatus=node('p','','resetTownStatus');resetStatus.hidden=true;resetStatus.setAttribute('role','status');
        status=node('p','','developerToolsStatus');status.setAttribute('role','status');
        details.append(tools,copy,reset,resetStatus,status);root.append(details);document.body.append(root);render();
    }
    window.DeveloperTools=Object.freeze({saveKey,environment:'development',allows,owns,mount,render,grant,remove,setMode,setEquipment,resetTown,copyPlaytest,setBusy:active=>{if(root)root.inert=active;}});
}());
