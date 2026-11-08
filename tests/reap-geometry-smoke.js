(async function(){
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    let player,markerA,markerB;
    try{
        await document.fonts.ready;const live=await ReapSprite.ready;clearOfflineRecap();ReapSprite.clear();
        const map=currentMap();state.currentView='map';state.isInTown=false;state.combatPaused=false;state.playerHp=100;
        state.level=1;state.skillRanks={reapPreview:1};state.gear=createEmptyGear();state.upgrades={strength:0,haste:0,evasion:0};state.tutorials=createTutorialState();combatStatCache=null;invalidateSkillBonusCache();
        function formation(count){
            map.spawns=[{id:'geometryTarget',monsterId:worldContent.monsters[0].id,count,overrides:{health:10000,attackDamage:0,attackInterval:1000,evasion:0,gold:[0,0],experience:0,drops:[],itemDrops:[]}}];
            resetMonsterStates(map);render();
        }
        formation(64);
        const id=state.monsterStates[1].id,old=getCombatEffectCard(id),replacement=old.cloneNode(true);
        old.replaceWith(replacement);
        check('card lookup follows a replacement in the middle of an unchanged-size roster',getCombatEffectCard(id)===replacement);
        replacement.dataset.monsterId='renamedGeometryTarget';
        check('renaming a card does not return it under its old ID',!getCombatEffectCard(id)&&getCombatEffectCard('renamedGeometryTarget')===replacement);
        replacement.remove();
        check('removed targets cannot be returned from the retained lookup',!getCombatEffectCard('renamedGeometryTarget'));
        elements.enemyRoster.dataset.mapId='force-rebuild';render();
        check('rerender restores lookups to the current roster',getCombatEffectCard(id)!==old&&getCombatEffectCard(id).parentElement===elements.enemyRoster);
        const primaryId=state.monsterStates[0].id,primary=getCombatEffectCard(primaryId);
        const readRect=Element.prototype.getBoundingClientRect;let otherCardReads=0;
        try{
            Element.prototype.getBoundingClientRect=function(){if(this.parentElement===elements.enemyRoster&&this!==primary)otherCardReads++;return readRect.call(this);};
            check('a single-target cast starts in a large formation',ReapSprite.show(primaryId,{targetIds:[primaryId],angle:-Math.PI/4}));
        }finally{Element.prototype.getBoundingClientRect=readRect;}
        check('single-target setup does not measure unrelated enemy cards',otherCardReads===0);
        const largeSize=[...live.active][0].size;ReapSprite.clear();formation(1);ReapSprite.show(state.monsterStates[0].id);
        check('one-target encounters retain the large-formation sprite size',Math.abs([...live.active][0].size-largeSize)<.01);ReapSprite.clear();

        let clock=0,next,hits=0,completed=0;
        player=new ScytheReapEffect({weaponImage:live.weaponImage,bloodImage:live.bloodImage,now:()=>clock,requestFrame:callback=>{next=callback;return 1;},cancelFrame:()=>{next=null;}});await player.ready;
        const run=time=>{clock=time;const callback=next;next=null;callback?.();},paints=[];
        player.drawFrame=(context,index,x,y,size,options)=>paints.push({x,y,size,weapon:options.weaponAlpha>0,blood:options.bloodAlpha>0});
        markerA=document.createElement('div');markerB=document.createElement('div');
        markerA.style.cssText='position:fixed;left:100px;top:100px;width:100px;height:100px';markerB.style.cssText='position:fixed;left:240px;top:100px;width:80px;height:120px';document.body.append(markerA,markerB);
        const rectA=markerA.getBoundingClientRect.bind(markerA),rectB=markerB.getBoundingClientRect.bind(markerB);let readsA=0,readsB=0;
        markerA.getBoundingClientRect=()=>{readsA++;return rectA();};markerB.getBoundingClientRect=()=>{readsB++;return rectB();};
        for(let index=0;index<16;index++)player.play({target:index<12?()=>markerA:markerB,size:700,freezeAt:225,onHit:()=>hits++,onComplete:()=>completed++});
        run(0);
        check('sixteen overlapping casts measure their two unique targets only once per frame',readsA===1&&readsB===1&&player.active.size===16);
        check('geometry sharing retains every weapon and foreground blood layer',paints.length===32&&paints.slice(0,16).every(paint=>paint.weapon&&!paint.blood)&&paints.slice(16).every(paint=>paint.blood&&!paint.weapon));
        check('sharing a target preserves a separate hit callback for each cast',hits===16);
        markerA.style.transform='translate(37px,-19px)';markerA.style.width='160px';readsA=readsB=0;paints.length=0;run(40);
        const moved=rectA();
        check('the next frame remeasures moved and resized targets',readsA===1&&readsB===1&&Math.abs(paints[0].x-(moved.left+moved.width/2))<.01&&Math.abs(paints[0].y-(moved.top+moved.height/2))<.01);
        check('target movement preserves cast size and does not repeat hits',paints.every(paint=>paint.size===700)&&hits===16);
        markerA.remove();readsA=readsB=0;run(80);
        check('disconnected targets cancel their casts without geometry reads',player.active.size===4&&readsA===0&&readsB===1&&completed===12);
        player.clear();
        check('cleanup completes every cast and removes the shared animation layer',completed===16&&!player.element&&next===null);
        markerB.style.display='none';let cancelled=false;player.play({target:markerB,onComplete:result=>{cancelled=result.cancelled;}});run(100);
        check('a hidden target still cancels cleanly',cancelled&&!player.active.size&&!player.element);
        state.combatPaused=true;check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    finally{player?.clear();ReapSprite.clear();markerA?.remove();markerB?.remove();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
