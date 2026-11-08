(async function () {
    const preview = new URL(document.currentScript.src).searchParams.has('preview');
    const checks = [], $ = id => document.getElementById(id), clone = value => JSON.parse(JSON.stringify(value));
    const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
    const check = (name,ok) => {checks.push((ok?'PASS ':'FAIL ')+name);if(!ok)throw new Error(name);};
    const originalWrite = Storage.prototype.setItem, originalRandom = Math.random, originalConfirm = window.confirm;
    try {
        state.townProgress = TownProgression.defaults(); state.townProgress.buildings.anvil = {tier:0,level:1};
        const base = itemData.items.find(item=>item.slot==='weapon'&&item.crafting);
        const makeWeapon = (id,name) => ({...base,id,name,equipmentType:undefined,tier:undefined,stats:{spellDamage:10},recipe:null,
            crafting:{slots:2,cost:{gold:1000,materials:{gel:1}},pool:[{stat:'mana',min:20,max:20,step:1},{stat:'health',min:50,max:50,step:1},{stat:'damage',min:10,max:10,step:1},{stat:'attackSpeedMultiplier',min:1.2,max:1.2,step:.1}]}});
        const wand = makeWeapon('testSavedWand','Saved roll test wand'), bow = makeWeapon('testSavedBow','Saved roll test bow'), armor = itemData.items.find(item=>item.slot==='helmet'&&item.crafting);
        itemData.items.push(wand,bow);itemById[wand.id]=wand;itemById[bow.id]=bow;
        state.skillRanks={};state.level=0;state.skillPoints=0;state.experience=0;state.experienceRemainder=0;state.mapMastery={};
        state.skillPointRecoveryRanks=null;state.skillPointTrimPending=false;state.defeatedBossWorldIds=[];
        state.gear=createEmptyGear();state.gear.weapon=wand.id;state.ownedItemIds=[wand.id,bow.id,armor.id];state.crafted=[];
        state.itemCrafts={};state.itemRollSaves={};state.gold=1000000;state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,100000]));
        state.currentView='town';state.isInTown=true;state.combatPaused=true;state.tutorials=createTutorialState();
        resetMonsterStates(currentMap());state.playerHp=getPlayerMaxHealth();state.playerMana=0;resetCombatClock();clearOfflineRecap();
        ItemCrafting.setMode('stats');render();
        const pick = item => document.querySelector('[data-reroll-item="'+item.id+'"]').click();
        pick(wand);
        check('weapon saving explains its exact price and free restoration',!$('weaponRollSave').hidden&&$('saveWeaponRoll').textContent.includes('10,000')&&$('restoreWeaponRoll').textContent.includes('Free'));
        check('empty weapons cannot purchase a save or restore',!ItemCrafting.saveRoll(wand.id).ok&&$('saveWeaponRoll').disabled&&$('restoreWeaponRoll').disabled);
        Math.random=()=>0;
        check('weapon can first craft its normal stats',ItemCrafting.reroll(wand.id).ok);
        render();const first=clone(state.itemCrafts[wand.id]), permanent=clone(wand.stats), materials=clone(state.materials), gold=state.gold;
        $('saveWeaponRoll').click();
        check('buying a saved roll charges exactly 10000 gold without materials',state.gold===gold-10000&&same(state.materials,materials));
        check('purchase stores an independent copy without changing current stats',same(state.itemRollSaves[wand.id],first)&&same(state.itemCrafts[wand.id],first)&&state.itemRollSaves[wand.id]!==state.itemCrafts[wand.id]&&state.itemRollSaves[wand.id][0]!==state.itemCrafts[wand.id][0]);
        check('saved stats are visible and an identical save cannot waste gold',$('savedWeaponRolls').children.length===wand.crafting.slots&&$('saveWeaponRoll').disabled&&!ItemCrafting.saveRoll(wand.id).ok);
        Math.random=()=>.999999;
        check('rerolling retains the saved result',ItemCrafting.reroll(wand.id).ok&&!same(state.itemCrafts[wand.id],first)&&same(state.itemRollSaves[wand.id],first));
        render();check('a changed roll enables free restore and paid replacement',!$('restoreWeaponRoll').disabled&&!$('saveWeaponRoll').disabled&&$('saveWeaponRoll').textContent.includes('Replace'));
        const changed=clone(state.itemCrafts[wand.id]);
        const raw=localStorage.getItem(saveKey);state.itemRollSaves={};state.itemCrafts={};applyGameSave(parseGameSave(raw));
        check('normal save loading retains the snapshot and current roll independently',same(state.itemRollSaves[wand.id],first)&&same(state.itemCrafts[wand.id],changed));
        state.gold=0;render();const poorMaterials=clone(state.materials);
        $('restoreWeaponRoll').click();
        check('zero-gold restore recovers the exact previous roll for free',state.gold===0&&same(state.materials,poorMaterials)&&same(state.itemCrafts[wand.id],first)&&same(wand.stats,permanent));
        check('restoring updates equipped bonuses and consumes the saved copy',getPlayerMaxMana()===20&&!Object.hasOwn(state.itemRollSaves,wand.id)&&$('restoreWeaponRoll').disabled&&!$('savedWeaponRolls').children.length);
        applyGameSave(parseGameSave(localStorage.getItem(saveKey)));
        check('consumption survives reload and prevents a second reclaim',!Object.hasOwn(state.itemRollSaves,wand.id)&&!ItemCrafting.restoreRoll(wand.id).ok&&same(state.itemCrafts[wand.id],first));
        state.gold=1000000;
        check('a new save after reclaim costs another 10000 gold',ItemCrafting.saveRoll(wand.id).ok&&state.gold===990000&&same(state.itemRollSaves[wand.id],first));
        ItemCrafting.reroll(wand.id);const beforeReplace=state.gold,replacement=clone(state.itemCrafts[wand.id]);
        check('replacing the snapshot costs another 10000 gold',ItemCrafting.saveRoll(wand.id).ok&&state.gold===beforeReplace-10000&&same(state.itemRollSaves[wand.id],replacement));
        state.itemCrafts={...state.itemCrafts,[wand.id]:[{stat:'mana',value:250},{stat:'health',value:500}]};
        state.playerMana=getPlayerMaxMana();state.manaCapacity=getPlayerMaxMana();state.playerHp=getPlayerMaxHealth();
        check('restoring safely clamps health and mana to the restored gear',ItemCrafting.restoreRoll(wand.id).ok&&state.playerMana<=getPlayerMaxMana()&&state.playerHp<=getPlayerMaxHealth()&&state.manaCapacity===getPlayerMaxMana());
        check('saving a reclaimed roll purchases a fresh snapshot',ItemCrafting.saveRoll(wand.id).ok);
        Math.random=()=>0;ItemCrafting.reroll(bow.id);const wandSave=clone(state.itemRollSaves[wand.id]);
        check('each weapon has its own independent saved roll',ItemCrafting.saveRoll(bow.id).ok&&same(state.itemRollSaves[wand.id],wandSave)&&same(state.itemRollSaves[bow.id],state.itemCrafts[bow.id]));
        const savedEquipment = [armor,...itemData.slots.filter(slot=>slot.id!=='weapon'&&slot.id!==armor.slot).map(slot=>{
            const item={...makeWeapon('testSaved_'+slot.id,'Saved '+slot.name),slot:slot.id};
            itemData.items.push(item);itemById[item.id]=item;state.ownedItemIds.push(item.id);return item;
        })];
        for(const item of savedEquipment){
            Math.random=()=>0;
            check(item.slot+' can craft stats before saving',ItemCrafting.reroll(item.id).ok);
            render();pick(item);
            check(item.slot+' shows saved-roll controls',!$('weaponRollSave').hidden&&!$('saveWeaponRoll').disabled);
            const original=clone(state.itemCrafts[item.id]),beforeSaveGold=state.gold;
            $('saveWeaponRoll').click();
            check(item.slot+' saves its own independent roll for 10000 gold',state.gold===beforeSaveGold-10000&&same(state.itemRollSaves[item.id],original)&&state.itemRollSaves[item.id]!==state.itemCrafts[item.id]&&same(state.itemRollSaves[wand.id],wandSave));
            Math.random=()=>.999999;ItemCrafting.reroll(item.id);render();
            check(item.slot+' keeps its saved roll after rerolling',!same(state.itemCrafts[item.id],original)&&same(state.itemRollSaves[item.id],original)&&!$('restoreWeaponRoll').disabled);
            const beforeRestoreGold=state.gold;
            $('restoreWeaponRoll').click();
            check(item.slot+' restores for free and consumes the snapshot',state.gold===beforeRestoreGold&&same(state.itemCrafts[item.id],original)&&!Object.hasOwn(state.itemRollSaves,item.id));
            check(item.slot+' can save again for profile export',ItemCrafting.saveRoll(item.id).ok);
        }
        const noCraft={...armor,id:'testNoSavedSlots',crafting:undefined};itemData.items.push(noCraft);itemById[noCraft.id]=noCraft;state.ownedItemIds.push(noCraft.id);
        check('equipment without crafted slots cannot save or restore',!ItemCrafting.saveRoll(noCraft.id).ok&&!ItemCrafting.restoreRoll(noCraft.id).ok);
        Math.random=()=>0;
        pick(wand);state.itemCrafts={...state.itemCrafts,[wand.id]:clone(first)};state.gold=9999;const poor=clone(createGameSave());
        check('insufficient funds preserve gold, current stats and the previous saved roll',!ItemCrafting.saveRoll(wand.id).ok&&same(createGameSave(),poor));
        state.gold=1000000;ItemCrafting.reroll(wand.id);
        const before=clone(createGameSave()), stored=localStorage.getItem(saveKey);
        Storage.prototype.setItem=function(key,value){if(key===saveKey)throw new DOMException('Full','QuotaExceededError');return originalWrite.call(this,key,value);};
        check('failed snapshot purchase rolls back gold and both sets of rolls',!ItemCrafting.saveRoll(wand.id).ok&&same(createGameSave(),before)&&localStorage.getItem(saveKey)===stored);
        check('failed restoration retains the saved roll and current stats, health and mana',!ItemCrafting.restoreRoll(wand.id).ok&&same(createGameSave(),before)&&same(state.itemRollSaves[wand.id],before.itemRollSaves[wand.id])&&localStorage.getItem(saveKey)===stored);
        Storage.prototype.setItem=originalWrite;
        const owned=state.ownedItemIds;state.ownedItemIds=[];const unowned=clone(createGameSave());
        check('unowned weapons cannot purchase or restore saved rolls',!ItemCrafting.saveRoll(wand.id).ok&&!ItemCrafting.restoreRoll(wand.id).ok&&same(createGameSave(),unowned));state.ownedItemIds=owned;
        const profile=clone(createGameSave()), transfer=new DataTransfer();
        transfer.items.add(new File([JSON.stringify({format:'idle-adventure-profile',version:1,save:profile})],'weapon-rolls.json',{type:'application/json'}));
        state.itemRollSaves={};$('importProfileFile').files=transfer.files;$('importProfileFile').dispatchEvent(new Event('change'));
        for(let i=0;$('importProfile').disabled&&i<200;i++)await new Promise(resolve=>setTimeout(resolve,5));
        check('profile imports recover saved rolls for every equipment slot',same(state.itemRollSaves,profile.itemRollSaves)&&savedEquipment.every(item=>same(state.itemRollSaves[item.id],profile.itemRollSaves[item.id])));
        const legacy=clone(profile);delete legacy.itemRollSaves;
        check('older saves start with no snapshots and preserve other progress',Object.keys(parseGameSave(JSON.stringify(legacy)).itemRollSaves).length===0&&parseGameSave(JSON.stringify(legacy)).gold===profile.gold);
        const future=clone(profile);future.itemRollSaves.futureWeapon=[{stat:'futureStat',value:7},null];
        check('unavailable weapons and unknown stats remain recoverable',same(parseGameSave(JSON.stringify(future)).itemRollSaves.futureWeapon,future.itemRollSaves.futureWeapon));
        const aliases=clone(profile);aliases.itemRollSaves.oldWeapon=aliases.itemRollSaves[wand.id];delete aliases.itemRollSaves[wand.id];
        const migrated=SaveCompatibility.migrate(aliases,saveCompatibilityContext(),[{version:99,items:{aliases:{oldWeapon:wand.id},removed:[]}}]);
        check('item renames preserve their saved crafted rolls',same(migrated.itemRollSaves[wand.id],profile.itemRollSaves[wand.id])&&!migrated.itemRollSaves.oldWeapon);
        for(const bad of [null,[],{bad:[]},{bad:[{stat:'mana',value:-1}]},{bad:[{stat:'mana',value:1},{stat:'mana',value:2}]}]) {
            let rejected=false;try{parseGameSave(JSON.stringify({...profile,itemRollSaves:bad}));}catch{rejected=true;}
            check('malformed saved weapon rolls are rejected safely',rejected);
        }
        const count=wand.crafting.slots;wand.crafting.slots=1;
        check('slot-count edits preserve reclaimed surplus stats and consume the snapshot',ItemCrafting.restoreRoll(wand.id).ok&&state.itemCrafts[wand.id].length===profile.itemRollSaves[wand.id].length&&ItemCrafting.rollsFor(wand).length===1&&!Object.hasOwn(state.itemRollSaves,wand.id));
        wand.crafting.slots=count;ItemCrafting.setMode('stats');render();pick(wand);
        check('saved weapon roll controls fit the viewport',document.documentElement.scrollWidth<=innerWidth);
        if(preview){$('weaponRollSave').scrollIntoView({block:'center'});}
        else {
            window.confirm=()=>true;$('resetGame').click();
            check('full reset clears saved rolls in memory and storage',!Object.keys(state.itemRollSaves).length&&!Object.keys(JSON.parse(localStorage.getItem(saveKey)).itemRollSaves).length);
        }
        check('no runtime errors',!window.smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error) {checks.push('ERROR '+error.stack);}
    finally {Storage.prototype.setItem=originalWrite;Math.random=originalRandom;window.confirm=originalConfirm;}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
