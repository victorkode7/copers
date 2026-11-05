(async function(){
    const checks=[],random=Math.random,readPixels=CanvasRenderingContext2D.prototype.getImageData;
    const params=new URL(document.currentScript.src).searchParams,check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    let previousShow;
    try{
        await document.fonts.ready;const current=await ReapSprite.ready;clearOfflineRecap();
        check('sprite textures initialize with ordinary browser permissions',current.bloodSprite.src.endsWith('blood-4x4-clean.png'));
        check('the procedural module and stylesheet are no longer loaded',!window.ReapPreview&&!Array.from(document.scripts).some(script=>script.src.includes('/reap-preview.js'))&&!Array.from(document.styleSheets).some(style=>style.href?.includes('/reap-preview.css')));
        CanvasRenderingContext2D.prototype.getImageData=()=>{throw new Error('Runtime pixel readback is forbidden');};
        const fresh=new ScytheReapEffect();await fresh.ready;
        check('a new sprite instance loads without reading image pixels',!!fresh.weaponSprite&&!!fresh.bloodSprite);
        CanvasRenderingContext2D.prototype.getImageData=readPixels;
        const map=currentMap();state.currentView='map';state.isInTown=false;state.combatPaused=false;state.playerHp=100;
        state.level=1;state.skillRanks={reapPreview:1};state.gear=createEmptyGear();state.upgrades={strength:0,haste:0,evasion:0};state.tutorials=createTutorialState();combatStatCache=null;invalidateSkillBonusCache();
        map.spawns=[{id:'localReapTarget',monsterId:worldContent.monsters[0].id,count:4,overrides:{health:10000,attackDamage:0,attackInterval:1000,evasion:0,gold:[0,0],experience:0,drops:[],itemDrops:[]}}];
        resetMonsterStates(map);render();Math.random=()=>0;
        for(const renderer of ['webgl','svg']){
            const select=document.getElementById('combatEffectRenderer');select.value=renderer;select.dispatchEvent(new Event('change'));
            ReapSprite.clear();queueReapAttack(state.monsterStates[0].id);
            check(renderer+' settings use the current scythe sprite',current.active.size===1&&!!document.querySelector('.scythe-reap-effect')&&!document.querySelector('.reap-preview-effect'));
        }
        ReapSprite.clear();state.pendingReapAttacks=[];let fallbackCalls=0;
        window.ReapPreview={show:()=>{fallbackCalls++;return true;}};previousShow=ReapSprite.show;ReapSprite.show=()=>false;
        queueReapAttack(state.monsterStates[0].id);
        check('an unavailable sprite never invokes the removed procedural fallback',fallbackCalls===0);
        ReapSprite.show=previousShow;previousShow=null;delete window.ReapPreview;
        const targets=[...state.pendingReapAttacks[0].targetIds],damage=getDamage();state.combatPaused=true;
        simulateCombatStep(.1,false);simulateCombatStep(.1,false);
        check('visual unavailability does not change Reap damage',state.monsterStates.every(monster=>monster.hp===10000-(targets.includes(monster.id)?damage*(monster.id===targets[0]?1:3):0)));
        check('no runtime errors',!smokeErrors.length);
        if(params.has('preview')){
            elements.combatPanel.scrollIntoView({block:'start'});ReapSprite.show(state.monsterStates[0].id);
            const cast=Array.from(current.active)[0];cast.freezeAt=225;current.tick();
        }else ReapSprite.clear();
        checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.name+': '+error.message);}
    finally{CanvasRenderingContext2D.prototype.getImageData=readPixels;Math.random=random;if(previousShow)ReapSprite.show=previousShow;delete window.ReapPreview;}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
