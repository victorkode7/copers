(async function(){
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
    const choose=value=>{const select=document.getElementById('combatEffectRenderer');select.value=value;select.dispatchEvent(new Event('change'));};
    const originalRect=Element.prototype.getBoundingClientRect,originalEmit=CombatWebGL.emit;
    try{
        await document.fonts.ready;await ReapSprite.ready;clearOfflineRecap();
        state.currentView='map';state.isInTown=false;state.combatPaused=false;state.level=1;state.skillRanks={};state.gear=createEmptyGear();state.tutorials=createTutorialState();
        combatStatCache=null;invalidateSkillBonusCache();const map=currentMap();
        map.spawns=[{id:'batchTarget',monsterId:worldContent.monsters[0].id,count:16,overrides:{health:10000,attackDamage:0,attackInterval:1000,evasion:0,gold:[0,0],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);state.playerHp=getPlayerMaxHealth();render();elements.combatStatus.scrollIntoView({block:'center'});await nextFrame();
        const cards=Array.from(elements.enemyRoster.children),indicators=cards.map(card=>card.querySelector('[data-enemy-dot-status]'));
        const root=document.querySelector('.loot-effects'),gold={key:'gold',name:'Gold',amount:1,gold:true};
        const unique={key:'equipment:batchUnique',name:'Batch Unique',amount:1,equipment:true,rarity:'unique'};
        const stateBefore=JSON.stringify({monsters:state.monsterStates,gold:state.gold,materials:state.materials,queues:state.pendingReapAttacks});
        for(const renderer of ['webgl','svg']){
            choose(renderer);render();LootEffects.clear();CombatWebGL.clear();
            indicators.forEach(indicator=>{indicator.hidden=true;indicator.classList.remove('is-applying');});
            let readyCount=0,statusReads=0,earlyIndicatorReads=0;const pulses=[];
            Element.prototype.getBoundingClientRect=function(){
                if(this===elements.combatStatus)statusReads++;
                if(indicators.includes(this)&&readyCount!==indicators.length)earlyIndicatorReads++;
                return originalRect.call(this);
            };
            CombatWebGL.emit=spec=>{if(spec.type==='pulse')pulses.push(spec);return originalEmit(spec);};
            const effects=indicators.map((indicator,index)=>()=>{
                indicator.hidden=false;indicator.querySelector('[data-enemy-dot-count]').textContent=(index+1)+'x';readyCount++;
                restartCombatAnimation(indicator,'is-applying');restartCombatAnimation(indicator,'is-applying');
                LootEffects.drop([gold],cards[index],map.id);
                if(index===0)flushCombatEffects([()=>restartCombatAnimation(indicator,'is-applying')]);
            });
            flushCombatEffects(effects);
            Element.prototype.getBoundingClientRect=originalRect;CombatWebGL.emit=originalEmit;
            check(renderer+': status geometry is read only after all indicators are revealed',earlyIndicatorReads===0);
            check(renderer+': one combat batch measures the loot anchor once',statusReads===1);
            check(renderer+': all drops merge into one correctly summed reward',root.querySelectorAll('.loot-drop').length===1&&root.querySelector('.loot-drop-gold').textContent==='+16');
            const gpu=renderer==='webgl'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
            if(gpu){
                check('WebGL retains every pulse including repeated and nested requests',pulses.length===33);
                const origin=elements.combatPanel.getBoundingClientRect();
                check('WebGL pulses use the revealed indicators dimensions and centers',pulses.every((pulse,index)=>{
                    const indicator=indicators[index<3?0:Math.floor((index-1)/2)],rect=indicator.getBoundingClientRect();
                    return rect.width>0&&rect.height>0&&Math.abs(pulse.width-rect.width)<.01&&Math.abs(pulse.height-rect.height)<.01&&Math.abs(pulse.x-(rect.left+rect.width/2-origin.left))<.01&&Math.abs(pulse.y-(rect.top+rect.height/2-origin.top))<.01;
                }));
            }else check(renderer+': fallback CSS restarts all requested indicator animations',indicators.every(indicator=>indicator.classList.contains('is-applying')));
            const row=root.querySelector('.loot-drop-row'),status=elements.combatStatus.getBoundingClientRect(),rect=row.getBoundingClientRect();
            check(renderer+': loot stays aligned beside or beneath the combat status',rect.left>=status.right||rect.top>=status.bottom&&rect.top<status.bottom+32);
            LootEffects.clear();flushCombatEffects([()=>LootEffects.drop([unique],cards[0],map.id),()=>LootEffects.drop([gold],cards[1],map.id)]);
            check(renderer+': batched unique loot remains dismissible',root.querySelector('.is-persistent')?.tagName==='BUTTON'&&root.querySelectorAll('.loot-drop').length===2);
            const uniqueNode=root.querySelector('.is-persistent');uniqueNode.click();uniqueNode.getAnimations().forEach(animation=>animation.finish());await nextFrame();
            check(renderer+': dismissing unique loot leaves the other reward intact',!uniqueNode.isConnected&&root.querySelectorAll('.loot-drop-gold').length===1);
            const current=cards[0].getBoundingClientRect(),flash=root.querySelector('.loot-plate-flash');
            if(renderer==='svg'&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&flash)check('HTML flash uses the premeasured card bounds',Math.abs(parseFloat(flash.style.left)-current.left)<.01&&Math.abs(parseFloat(flash.style.width)-current.width)<.01);
            LootEffects.clear();flushCombatEffects([()=>LootEffects.drop([gold],cards[0],map.id),()=>LootEffects.clear()]);
            check(renderer+': clearing during a batch discards pending loot',!root.querySelector('.loot-drop'));
            flushCombatEffects([
                ()=>LootEffects.drop([{...gold,amount:2}],cards[0],map.id),
                ()=>LootEffects.drop([{...gold,amount:3}],cards[0],map.id+'-other'),
                ()=>LootEffects.drop([{...gold,amount:4}],cards[0],map.id)
            ]);
            check(renderer+': map changes within a batch preserve reward clearing order',root.querySelector('.loot-drop-gold')?.textContent==='+4');LootEffects.clear();CombatWebGL.clear();
            const detached=indicators[0].cloneNode(true);detached.classList.remove('is-applying');cards[0].append(detached);
            flushCombatEffects([()=>restartCombatAnimation(detached,'is-applying'),()=>detached.remove()]);
            check(renderer+': removed indicators cannot leave deferred glows behind',!CombatWebGL.status().active&&!detached.classList.contains('is-applying'));
            let threw=false;try{flushCombatEffects([()=>{restartCombatAnimation(indicators[0],'is-applying');LootEffects.drop([gold],cards[0],map.id);throw new Error('intentional-batch-error');}]);}catch(error){threw=error.message==='intentional-batch-error';}
            check(renderer+': a failed batch restores effect state and discards queued loot',threw&&combatGlowRestarts===null&&combatAnimationRestarts===null&&combatEffectLayout===null&&!root.querySelector('.loot-drop'));
            flushCombatEffects([()=>LootEffects.drop([gold],cards[0],map.id)]);
            check(renderer+': the next batch still works after an exception',root.querySelector('.loot-drop-gold')?.textContent==='+1');
            LootEffects.clear();LootEffects.drop([gold],cards[0],map.id);
            check(renderer+': standalone loot still appears synchronously',root.querySelector('.loot-drop-gold')?.textContent==='+1');
            LootEffects.clear();CombatWebGL.clear();
        }
        check('presentation batching preserves combat and reward state',JSON.stringify({monsters:state.monsterStates,gold:state.gold,materials:state.materials,queues:state.pendingReapAttacks})===stateBefore);
        const toggle=document.querySelector('[data-effect-setting="all"]');toggle.click();
        flushCombatEffects([()=>LootEffects.drop([gold],cards[0],map.id),()=>restartCombatAnimation(indicators[0],'is-applying')]);
        check('disabled effects do not queue loot or GPU work',!root.querySelector('.loot-drop')&&!CombatWebGL.status().active);toggle.click();
        state.combatPaused=true;check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    finally{Element.prototype.getBoundingClientRect=originalRect;CombatWebGL.emit=originalEmit;LootEffects.clear();CombatWebGL.clear();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
