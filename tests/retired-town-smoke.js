(function () {
    const phaseKey='retiredTownSmoke',phase=JSON.parse(sessionStorage.getItem(phaseKey)||'null'),checks=phase?.checks||[];
    const clone=value=>JSON.parse(JSON.stringify(value)),check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const character=save=>JSON.stringify(Object.fromEntries(['gold','materials','kills','upgrades','level','experience','skillPoints','skillRanks','mapMastery','defeatedBossWorldIds','gear','ownedItemIds','crafted','itemCrafts','itemRollSaves','selectedMap','selectedWorld'].map(key=>[key,save[key]])));
    const originalRandom=Math.random;
    try {
        check('the retired Town mechanics and their scripts remain removed',!document.getElementById('settlementButton')&&!document.getElementById('settlementView')&&![...document.scripts].some(script=>/\/js\/town(?:-(?:system|catalog|map|dashboard))?\.js(?:\?|$)/.test(script.src))&&window.Town===undefined&&window.TownSystem===undefined&&window.TownCatalog===undefined);
        check('Settings and developer-navigation preference remain available',!!document.getElementById('hideDeveloperNavigation')&&document.getElementById('combatSettingsDialog').contains(document.getElementById('resetGame')));
        if(phase){
            sessionStorage.removeItem(phaseKey);
            check('an old active Town save loads without recovery mode',!SaveCompatibility.protection.blocked&&state.currentView==='map'&&state.combatPaused);
            check('the normal encounter replaces retired Town enemies',state.monsterStates.length===monsterDefinitions().length&&state.monsterStates.every(monster=>monster.hp>0&&!monster.id.startsWith('town_wave'))&&state.pendingEruptions.length===0&&state.pendingVoidMissiles.length===0);
            check('character, gear, gold, materials and map progress survive startup',character(createGameSave())===phase.character);
            check('the exact original Town save is kept in migration backups',SaveCompatibility.backups().some(entry=>entry.raw===phase.raw));
            check('subsequent saves and exports omit retired Town progress',!Object.hasOwn(createGameSave(),'settlement')&&!Object.hasOwn(JSON.parse(localStorage.getItem(saveKey)),'settlement'));
            Math.random=()=>.99;const target=activeMonster(),definition=monsterDefinition(target),gold=state.gold,kills=state.kills[currentMap().id];
            applyDamageToMonster(target,1e12);
            check('ordinary monsters still grant rewards and respawn normally',state.kills[currentMap().id]===kills+1&&state.gold>gold&&target.hp===0&&target.respawnRemaining===definition.respawnSeconds);
            document.getElementById('townButton').click();
            check('the historical town view still opens Crafting',state.currentView==='town'&&!elements.townView.hidden&&elements.townView.textContent.includes('Crafting'));
            document.getElementById('mapButton').click();
            check('the Map and combat side panels remain usable',state.currentView==='map'&&isCombatView()&&document.querySelector('.stats-panel').getClientRects().length>0&&document.querySelector('.loot-panel').getClientRects().length>0);
            check('no runtime errors',!window.smokeErrors.length);checks.push('SMOKE PASSED');
        }else{
            state.gold=24680;state.materials.gel=44;state.materials.hide=17;state.level=4;state.experience=7;state.skillPoints=4;state.skillRanks={};
            state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];state.itemCrafts={};state.itemRollSaves={};state.crafted=[];
            state.currentView='map';state.isInTown=false;state.combatPaused=true;invalidateSkillBonusCache();resetMonsterStates(currentMap());state.playerHp=getPlayerMaxHealth();state.playerMana=getPlayerMaxMana();state.manaCapacity=getPlayerMaxMana();resetCombatClock();clearOfflineRecap();
            const base=clone(createGameSave());
            for(const retired of [{purchased:true,hallLevel:2,sawmill:true,wood:500,cutters:2}, {version:3,buildings:[{type:'sawmill'}],land:{woodcutting:2}}, {invalid:'retired data no longer needs to validate'}]){
                const legacy={...clone(base),currentView:'town',settlement:retired},parsed=parseGameSave(JSON.stringify(legacy));
                check('retired Town data is discarded without changing Crafting or character progress',!Object.hasOwn(parsed,'settlement')&&parsed.currentView==='town'&&character(parsed)===character(base));
            }
            const oldPage=parseGameSave(JSON.stringify({...clone(base),currentView:'settlement',settlement:{purchased:true}}));
            check('an inactive retired Town page returns safely to Map',oldPage.currentView==='map'&&oldPage.combatPaused&&character(oldPage)===character(base));
            const active={...clone(base),currentView:'settlement',isInTown:true,combatPaused:false,settlement:{version:3,clearedLayers:2,battle:{wave:3,layer:3,active:true,returnPaused:true,defeatedIds:['town_wave3_enemy0']}}};
            active.monsterStates=[{...clone(base.monsterStates[0]),id:'town_wave3_enemy0',hp:0,respawnRemaining:0}];active.targetMonsterId='town_wave3_enemy0';active.enemyHp=0;active.enemyRespawnRemaining=0;
            active.voidCharges=3;active.gatheringPower={stacks:2,progress:0,remaining:1};active.furyStacks=1;active.furyRemaining=1;active.shieldStacks=1;
            const parsed=parseGameSave(JSON.stringify(active));
            check('active Town encounters and temporary buffs are retired before normal save validation',parsed.monsterStates.length===0&&parsed.targetMonsterId===null&&parsed.enemyHp>0&&parsed.enemyRespawnRemaining===0&&parsed.voidCharges===0&&parsed.gatheringPower.stacks===0&&parsed.furyStacks===0&&parsed.shieldStacks===0);
            check('retiring a Town encounter preserves ordinary progress',character(parsed)===character(base));
            let rejected=false;try{parseGameSave(JSON.stringify({...active,gold:-1}));}catch{rejected=true;}
            check('invalid character data is still rejected',rejected);
            const raw=' \n'+JSON.stringify(active);localStorage.setItem(saveKey,raw);sessionStorage.setItem(phaseKey,JSON.stringify({checks,raw,character:character(base)}));SaveCompatibility.protection.blocked=true;location.reload();return;
        }
    }catch(error){checks.push('ERROR '+error.stack);}
    finally{Math.random=originalRandom;}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
