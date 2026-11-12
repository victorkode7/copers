// ?renderer=svg|webgl&preview=single|row|overlap|mixed keeps a review frame.
const vortexReview=new URL(document.currentScript.src).searchParams;
(async function(){
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
    const originalRandom=Math.random,originalVortex=CombatWebGLEffects.vortex,plans=[];
    const renderer=vortexReview.get('renderer')||'svg',reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const select=document.getElementById('combatEffectRenderer');select.value=renderer;select.dispatchEvent(new Event('change'));
    const toggle=(key,value)=>{const button=document.querySelector('[data-effect-setting="'+key+'"]');if(button.getAttribute('aria-checked')!==String(value))button.click();};
    function setup(count=9){
        clearVoidVortexVisuals();CombatWebGL.clear();combatStatCache=null;combatPoisonForecasts=null;
        state.currentView='map';state.isInTown=false;state.skillRanks={voidVortex:1,echoingVoid:1};
        state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];
        itemById.testAmulet.stats={mana:200,spellDamage:100};state.furyStacks=0;state.voidCharges=0;
        state.monsterColumns=3;state.combatPaused=false;state.level=2;
        const map=currentMap();map.spawns=[{id:'vortexReview',monsterId:worldContent.monsters[0].id,count,
            overrides:{health:1000,attackDamage:1,attackInterval:1000,respawnSeconds:2}}];
        resetMonsterStates(map);state.playerHp=getPlayerMaxHealth();state.manaCapacity=200;state.playerMana=200;
        clearOfflineRecap();render();elements.combatPanel.scrollIntoView({block:'start'});
        return state.monsterStates;
    }
    const impactNodes=()=>[...document.querySelectorAll('.spell-void-vortex .vortex-contact')];
    try{
        toggle('all',true);toggle('abilities',true);toggle('projectiles',true);
        CombatWebGLEffects.vortex=plan=>{plans.push(plan);return originalVortex(plan);};
        let monsters=setup(1);await frame();await frame();
        const before=JSON.stringify(state);Math.random=()=>{throw new Error('Vortex visuals consumed combat RNG');};
        showVoidVortex([monsters[0].id]);
        check('single-target artwork preserves combat and consumes no RNG',JSON.stringify(state)===before);
        check('single target gets a compact sprite-centered effect',plans.at(-1).targets.length===1&&plans.at(-1).paths.flatMap(path=>path.points).every(p=>Math.abs(p.x-plans.at(-1).targets[0].x)<=41&&Math.abs(p.y-plans.at(-1).targets[0].y)<=41));
        check('the requested renderer is exercised',renderer==='webgl'&&!reduced?CombatWebGL.status().types.includes('vortexImpact')&&!document.querySelector('.spell-void-vortex'):impactNodes().length===1);

        monsters=setup();await frame();await frame();plans.length=0;
        Math.random=()=>0;const damage=getSpellDamage()*.75,row=getArrowRowTargets(activeMonster());
        const hp=monsters.map(m=>m.hp);castVoidVortex();Math.random=()=>{throw new Error('Visual RNG');};
        check('Echo preserves row targeting, immediate double damage and one mana payment',
            plans.length===2&&row.length>0&&monsters.every((m,i)=>m.hp===hp[i]-(row.includes(m)?2*damage:0))&&state.playerMana===180&&state.voidCharges===Math.min(5,row.length*4));
        check('every actual hit is anchored at its monster sprite',plans.every(plan=>plan.targets.length===row.length&&plan.targets.every(t=>{
            const rect=getCombatEffectCard(t.id).querySelector('.enemy-mark').getBoundingClientRect(),origin=elements.combatPanel.getBoundingClientRect();
            return Math.abs(t.x+origin.left-(rect.left+rect.width/2))<1&&Math.abs(t.y+origin.top-(rect.top+rect.height/2))<1;
        }))&&plans[1].echo&&plans[1].delay===180);
        if(renderer==='svg'||reduced)check('Echo contacts are not delayed with its aftermath',impactNodes().length===row.length*2&&impactNodes().every(n=>getComputedStyle(n).animationDelay==='0s'));
        check('cosmetic phases distinguish repeated spirals',JSON.stringify(plans[0].paths)!==JSON.stringify(plans[1].paths));

        clearVoidVortexVisuals();plans.length=0;row[0].hp=1;if(row[1])row[1].hp=0;state.playerMana=200;
        const firstHits=row.filter(m=>m.hp>0).map(m=>m.id),echoHits=firstHits.filter(id=>id!==row[0].id);
        Math.random=()=>0;castVoidVortex();Math.random=()=>{throw new Error('Visual RNG');};
        check('lethal hits get contacts while dead and killed Echo targets are excluded',plans.length===(echoHits.length?2:1)&&plans[0].targets.map(t=>t.id).join()===firstHits.join()&&(!echoHits.length||plans[1].targets.map(t=>t.id).join()===echoHits.join()));

        monsters=setup();await frame();await frame();const ids=getArrowRowTargets(activeMonster()).map(m=>m.id);
        for(let i=0;i<30;i++)showVoidVortex(ids,(i%2)*180);
        check('rapid overlapping casts have bounded live groups',voidVortexVisuals.size===4&&(renderer==='webgl'&&!reduced?CombatWebGL.status().active<=4*(4+6*ids.length):document.querySelectorAll('.spell-void-vortex').length===4));
        showCombatArrow(null,ids[0],'piercingArrow',0);showElementalBurst(ids,'fire',true);showSpellCast('voidBolt',[{targetId:ids.at(-1)}]);showShieldSlamWave(ids);
        await wait(70);await frame();
        check('mixed abilities retain an input-transparent Vortex layer',renderer==='webgl'&&!reduced?CombatWebGL.status().types.includes('arrow')&&CombatWebGL.status().types.includes('vortex'):!!document.querySelector('.combat-arrow')&&getComputedStyle(document.querySelector('.spell-void-vortex')).pointerEvents==='none');
        if(renderer==='webgl'&&!reduced){
            const canvas=document.querySelector('.combat-webgl-layer'),gl=canvas.getContext('webgl'),pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
            check('GPU effects draw visible pixels without shader errors',gl.getError()===gl.NO_ERROR&&pixels.some((value,i)=>i%4===3&&value>0));
        }
        if(reduced)check('reduced motion uses static fading contacts without moving spirals',!document.querySelector('.vortex-stream')&&impactNodes().every(n=>getComputedStyle(n).animationName==='vortex-contact-fade'));
        await wait(800);check('all cast handles and Vortex artwork expire',!voidVortexVisuals.size&&!document.querySelector('.spell-void-vortex')&&!CombatWebGL.status().types.some(type=>type.startsWith('vortex')));
        showVoidVortex(ids);state.currentView='inventory';render();
        check('leaving combat clears Vortex immediately',!voidVortexVisuals.size&&!document.querySelector('.spell-void-vortex'));
        state.currentView='map';render();showVoidVortex(ids);resetMonsterStates(currentMap());
        check('map resets clear Vortex handles and timers',!voidVortexVisuals.size&&!document.querySelector('.spell-void-vortex'));
        render();showVoidVortex(ids);toggle('abilities',false);
        check('disabling abilities clears existing and suppresses new casts',!voidVortexVisuals.size&&(showVoidVortex(ids),!voidVortexVisuals.size));toggle('abilities',true);
        check('the effect does not introduce horizontal overflow',document.documentElement.scrollWidth<=innerWidth+1);
        check('no script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
        const preview=vortexReview.get('preview');
        if(preview){
            monsters=setup(preview==='single'?1:9);await frame();await frame();
            const targets=getArrowRowTargets(activeMonster()).map(m=>m.id);
            const draw=()=>{
                showVoidVortex(targets);
                if(preview==='overlap'||preview==='mixed')showVoidVortex(targets,180);
                if(preview==='mixed'){showCombatArrow(null,targets[0],'piercingArrow',0);showElementalBurst(targets,'fire',true);showSpellCast('voidBolt',[{targetId:targets.at(-1)}]);}
            };
            draw();await wait(reduced?40:120);await frame();
            if(renderer==='svg'||reduced)for(const animation of elements.combatPanel.getAnimations({subtree:true}))animation.pause();
            else {let repeats=0;const repeat=()=>{if(++repeats<8){draw();setTimeout(repeat,160);}};setTimeout(repeat,160);}
        }
    }catch(error){checks.push(error.stack||String(error));}
    finally{Math.random=originalRandom;CombatWebGLEffects.vortex=originalVortex;}
    const output=document.createElement('pre');output.id='smoke-results';output.textContent=checks.join('\n');document.body.append(output);
}());
