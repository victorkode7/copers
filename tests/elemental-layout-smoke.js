(function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const map=currentMap();
    const ranks={baseMana1:1,baseSpellDamage1:1,rimeBrand:1,emberBrand:1,glacialRupture:1,cinderRupture:1,gatheringPower:1,voidBolt:1,voidVolley:1,maxFury:1,shieldGenerator:1};
    const rect=element=>{const b=element.getBoundingClientRect();return [b.x,b.y,b.width,b.height];};
    const same=(a,b)=>a.every((value,index)=>Math.abs(value-b[index])<.1);
    function setup(count) {
        combatStatCache=null;state.skillRanks={...ranks};state.gear=createEmptyGear();state.ownedItemIds=[];
        state.currentView='map';state.isInTown=false;state.combatPaused=false;state.playerHp=100;state.playerMana=100;
        map.spawns=[{id:'elementLayout',monsterId:worldContent.monsters[0].id,count,overrides:{health:10000,attackInterval:1000,respawnSeconds:10}}];
        resetMonsterStates(map);render();return state.monsterStates;
    }
    function fill(monster) {
        monster.rimeBrand={stacks:9,timeUntilTick:1};monster.emberBrand={stacks:9,timeUntilTick:1};monster.scorched=true;monster.freezeRemaining=9;
        monster.poisonStacks=[{remainingDuration:5,timeUntilTick:1}];
        monster.bleed={stacks:3,baseDamagePerTick:3,remainingDuration:5,timeUntilTick:1};
    }
    try {
        for (const count of [1,9,64]) {
            const mobs=setup(count),cards=[...elements.enemyRoster.querySelectorAll('.enemy-card')];
            const before=cards.map(rect),healthBefore=cards.map(card=>rect(card.querySelector('.health-track')));
            mobs.forEach(fill);renderCombat();
            check(count+' plates remain stationary when all debuffs apply',cards.every((card,index)=>same(before[index],rect(card))&&same(healthBefore[index],rect(card.querySelector('.health-track')))));
            check(count+' plates use compact SVG brand badges',cards.every(card=>[...card.querySelectorAll('[data-elemental-status]')].every(badge=>badge.querySelector('svg')&&badge.querySelector('strong')&&!badge.textContent.includes('Brand'))));
            check(count+' sprites show poison and bleed together',cards.every(card=>card.classList.contains('is-poisoned')&&card.classList.contains('is-bleeding')&&[...card.querySelectorAll('.enemy-dot-sprite-effect')].every(effect=>getComputedStyle(effect).display==='block'&&getComputedStyle(effect).pointerEvents==='none')));
            mobs.forEach(monster=>{clearElementalDebuffs(monster);monster.poisonStacks=[];monster.bleed=null;monster.freezeRemaining=0;});renderCombat();
            check(count+' plates remain stationary when debuffs expire',cards.every((card,index)=>same(before[index],rect(card))&&same(healthBefore[index],rect(card.querySelector('.health-track')))));
            check(count+' sprites lose poison and bleed visuals when effects expire',cards.every(card=>!card.classList.contains('is-poisoned')&&!card.classList.contains('is-bleeding')&&[...card.querySelectorAll('.enemy-dot-sprite-effect')].every(effect=>getComputedStyle(effect).display==='none')));
        }
        const mobs=setup(9);mobs.forEach(fill);renderCombat();
        showElementalBurst([mobs[0].id],'cold',true);showElementalBurst([mobs[1].id],'fire',true);
        const overlay=elements.combatPanel.querySelector('.elemental-effect-layer');
        check('explosions render above Void and arrow overlays',Number(getComputedStyle(overlay).zIndex)>7&&overlay.querySelectorAll('i').length===8&&getComputedStyle(overlay).pointerEvents==='none');
        check('frost and fire explosions have different particle shapes',getComputedStyle(elements.combatPanel.querySelector('.elemental-burst.is-cold i')).clipPath!==getComputedStyle(elements.combatPanel.querySelector('.elemental-burst.is-fire i')).clipPath);
        state.gatheringPower={stacks:12,progress:0,remaining:1};renderCombatBuffs();
        const power=document.querySelector('[data-buff-id="gatheringPower"]');
        check('Gathering Power shows damage and time units',power.querySelector('.buff-value').textContent==='+24% dmg'&&power.querySelector('.buff-duration').textContent==='1s');
        state.furyStacks=2;state.furyRemaining=.2;state.voidCharges=4;state.shieldStacks=2;
        applyDamageToPlayer(100000,'self');
        check('death immediately clears all player stack buffs',state.playerHp===0&&state.furyStacks===0&&state.voidCharges===0&&state.shieldStacks===0&&state.gatheringPower.stacks===0&&elements.buffList.children.length===0);
        state.playerHp=100;state.combatPaused=false;
        check('reviving cannot restore expired buffs',state.furyStacks===0&&state.gatheringPower.stacks===0&&state.voidCharges===0);
        state.furyStacks=2;state.furyRemaining=.2;state.voidCharges=4;state.shieldStacks=2;state.gatheringPower={stacks:12,progress:0,remaining:1};
        const destination=mapData.find(entry=>entry.id!==map.id);
        state.developerTravelEnabled=true;check('test can travel to another map',travelToMap(destination.id));
        check('changing maps immediately clears all player stack buffs',state.furyStacks===0&&state.voidCharges===0&&state.shieldStacks===0&&state.gatheringPower.stacks===0&&elements.buffList.children.length===0);
        check('no runtime errors',!window.smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error) {checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
