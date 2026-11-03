(async function () {
    const checks=[],random=Math.random;
    const check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
    const choose=value=>{const select=document.getElementById('combatEffectRenderer');select.value=value;select.dispatchEvent(new Event('change'));};
    const toggle=(key,value)=>{const button=document.querySelector('[data-effect-setting="'+key+'"]');if(button.getAttribute('aria-checked')!==String(value))button.click();};
    const legacy='.combat-arrow,.spell-effect,.eruption-chain,.eruption-burst,.shield-slam-wave,.poison-transfer,.elemental-effect-layer,.void-volley-player-glow';
    const types=()=>CombatWebGL.status().types;
    try {
        toggle('all',true);toggle('abilities',true);toggle('projectiles',true);toggle('glows',true);choose('webgl');
        state.currentView='map';state.isInTown=false;state.skillRanks={freezingArrows:1};state.level=2;
        const map=currentMap();map.spawns=[{id:'gpuEffects',monsterId:worldContent.monsters[0].id,count:9,
            overrides:{health:100000,attackDamage:1,attackInterval:3,respawnSeconds:2}}];
        resetMonsterStates(map);clearOfflineRecap();state.playerHp=getPlayerMaxHealth();state.combatPaused=false;render();
        elements.combatPanel.scrollIntoView({block:'start'});await nextFrame();
        const [a,b]=state.monsterStates,card=elements.enemyRoster.firstElementChild;
        const before=JSON.stringify({monsters:state.monsterStates,hp:state.playerHp,mana:state.playerMana,pending:state.pendingVoidMissiles});
        Math.random=()=>{throw new Error('Visuals consumed combat randomness');};
        const arrowTrails=[],originalTrail=CombatWebGL.trail;
        try{
            CombatWebGL.trail=spec=>{arrowTrails.push(spec);return originalTrail(spec);};
            showCombatArrow(null,a.id,'piercingArrow',0);
        }finally{CombatWebGL.trail=originalTrail;}
        check('GPU Piercing Arrow keeps a tight glow on both shaft and tip',arrowTrails.length===2&&arrowTrails.every(trail=>trail.glowRadius===1&&trail.strokeWidth===3));
        showCombatArrow(a.id,b.id,'forkingArrow',0);
        showVolcanicEruption(a.id,[a.id,b.id]);showEruptionChain(a.id,b.id,0);
        showShieldSlamWave([a.id,b.id]);showVoidVortex([a.id,b.id]);
        showElementalBurst([a.id],'fire',true);showElementalBurst([b.id],'cold',true);
        showSpellCast('voidBolt',[{targetId:a.id}]);
        const missile={remaining:.6};
        showSpellCast('voidVolley',[{targetId:b.id,missile}]);
        showVoidMissileImpact(a.id);showPoisonTransfer(a.id,b.id);showVoidVolleyPlayerGlow(1,.2);
        restartCombatAnimation(elements.playerHealthTrack,'is-damaged');
        CombatWebGLEffects.lootFlash(card,'unique');
        check('all major effects use GPU batches', ['arrow','arrowImpact','eruption','eruptionChain','shield','vortex','elemental','spell','spellImpact','poisonTransfer','playerGlow','pulse','lootFlash'].every(type=>types().includes(type)));
        check('GPU mode creates no per-effect SVG or HTML overlays',!elements.combatPanel.querySelector(legacy));
        check('all effects share one input-transparent canvas',document.querySelectorAll('.combat-webgl-layer').length===1&&getComputedStyle(document.querySelector('.combat-webgl-layer')).pointerEvents==='none');
        check('visuals preserve combat state and never consume its random rolls',before===JSON.stringify({monsters:state.monsterStates,hp:state.playerHp,mana:state.playerMana,pending:state.pendingVoidMissiles}));
        const count=CombatWebGL.status().active;
        voidMissileVisuals.get(missile).circle.remove();
        check('redirected missiles can cancel their original GPU impact',CombatWebGL.status().active===count-1);
        await wait(100);await nextFrame();
        const canvas=document.querySelector('.combat-webgl-layer'),gl=canvas.getContext('webgl');
        check('all effect shader styles draw without WebGL errors',!canvas.hidden&&gl.getError()===gl.NO_ERROR);
        toggle('projectiles',false);
        check('projectile switch immediately removes all GPU projectile families',!types().some(type=>['arrow','arrowImpact','spell','poisonTransfer'].includes(type))&&types().includes('shield'));
        toggle('abilities',false);
        check('ability switch removes ability visuals and dependent player glow',!types().some(type=>['eruption','eruptionChain','shield','vortex','elemental','spellImpact','playerGlow'].includes(type)));
        restartCombatAnimation(elements.playerHealthTrack,'is-damaged');
        check('independent health glows remain available with abilities off',types().includes('pulse'));
        toggle('glows',false);
        check('glow switch removes remaining GPU pulses',!CombatWebGL.status().active&&!CombatWebGL.status().ambient);
        toggle('abilities',true);toggle('projectiles',true);toggle('glows',true);
        CombatWebGL.clear();
        const targetBox=card.getBoundingClientRect();
        const readContact=()=>{
            const x=Math.round((targetBox.left+targetBox.width/2)*canvas.width/document.documentElement.clientWidth)-26;
            const y=Math.round((innerHeight-targetBox.top-targetBox.height/2)*canvas.height/innerHeight)-26;
            const pixels=new Uint8Array(52*52*4);gl.readPixels(x,y,52,52,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
            return pixels.some((value,index)=>index%4===3&&value>20);
        };
        showSpellCast('voidVolley',[{targetId:a.id,missile:{remaining:.6}}],200);
        await wait(300);await nextFrame();
        check('GPU missile impacts stay hidden before their combat deadline',!readContact());
        await wait(350);await nextFrame();
        check('GPU impact appears on the scheduled arrival timeline',readContact());
        CombatWebGL.clear();
        card.classList.add('is-poisoned','is-bleeding','has-rimeBrand','has-emberBrand','is-righteous-fire');
        elements.playerHealthPanel.classList.add('is-righteous-fire');CombatWebGLEffects.sync();
        check('persistent status and fire effects use GPU auras',CombatWebGL.status().ambient>=6&&['poisonAura','bleedAura','coldAura','emberAura','righteousFire'].every(type=>types().includes(type)));
        check('original portrait particles and fire layers are suppressed in full GPU mode',document.body.classList.contains('combat-webgl-active')&&getComputedStyle(card.querySelector('.enemy-dot-sprite-effect')).display==='none'&&getComputedStyle(card,'::before').display==='none');
        CombatWebGL.clear();
        card.classList.remove('is-poisoned','is-bleeding','has-rimeBrand','has-emberBrand','is-righteous-fire');
        elements.playerHealthPanel.classList.remove('is-righteous-fire');
        const testBuff=document.createElement('li');testBuff.className='combat-buff is-proccing';testBuff.dataset.buffId='voidCharges';
        const buffLabel=document.createElement('span');buffLabel.className='buff-stacks';buffLabel.textContent='5/5';testBuff.append(buffLabel);elements.buffList.append(testBuff);
        const buffRect=testBuff.getBoundingClientRect(),playerRect=elements.playerHealthPanel.getBoundingClientRect(),panelRect=elements.combatPanel.getBoundingClientRect(),observed=[];
        const labelRect=buffLabel.getBoundingClientRect();
        check('buff stack label stays inside the frame with an opaque background',labelRect.left>=buffRect.left+1&&labelRect.top>=buffRect.top+1&&labelRect.right<=buffRect.right-1&&labelRect.bottom<=buffRect.bottom-1&&getComputedStyle(buffLabel).backgroundColor==='rgb(9, 17, 23)');
        const originalSetAmbient=CombatWebGL.setAmbient,originalEmit=CombatWebGL.emit,emitted=[];
        CombatWebGL.setAmbient=descriptors=>{observed.push(...descriptors);originalSetAmbient(descriptors);};
        CombatWebGL.emit=spec=>{emitted.push(spec);return originalEmit(spec);};
        try{CombatWebGLEffects.sync();showVoidVolleyPlayerGlow(2,0);}finally{CombatWebGL.setAmbient=originalSetAmbient;CombatWebGL.emit=originalEmit;}
        const buffGlow=observed.find(effect=>effect.type==='buffGlow'),relativeBox=(rect)=>({x:rect.left+rect.width/2-panelRect.left,y:rect.top+rect.height/2-panelRect.top,width:rect.width,height:rect.height});
        check('WebGL buff glow uses the buff frame radius and bounds',Boolean(buffGlow)&&buffGlow.style===18&&buffGlow.cutouts.length===1&&['x','y','width','height'].every(key=>Math.abs(buffGlow[key]-relativeBox(buffRect)[key])<1));
        check('flashing buff frame and its text layer above the WebGL canvas',Number(getComputedStyle(testBuff).zIndex)>Number(getComputedStyle(canvas).zIndex)&&getComputedStyle(buffLabel).zIndex==='2');
        const playerGlow=emitted.find(effect=>effect.type==='playerGlow');
        check('WebGL player glow uses exactly the player frame bounds',Boolean(playerGlow)&&Math.abs(playerGlow.width-playerRect.width)<1&&Math.abs(playerGlow.height-playerRect.height)<1);
        check('WebGL buff glow reaches the GPU ambient batch',types().includes('buffGlow'));
        await wait(80);await nextFrame();
        const glowPixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,glowPixels);
        const ratioX=canvas.width/document.documentElement.clientWidth,ratioY=canvas.height/innerHeight;
        const glowRects=[buffRect,playerRect];
        let strayGlowPixel=false;
        for(let y=0;y<canvas.height&&!strayGlowPixel;y++)for(let x=0;x<canvas.width;x++){
            if(glowPixels[(y*canvas.width+x)*4+3]<=24)continue;
            const cssX=(x+.5)/ratioX,cssY=innerHeight-(y+.5)/ratioY;
            if(!glowRects.some(rect=>cssX>=rect.left-1&&cssX<=rect.right+1&&cssY>=rect.top-1&&cssY<=rect.bottom+1)){strayGlowPixel=true;break;}
        }
        check('WebGL buff and player glows stay inside their frames',!strayGlowPixel);
        const centerIsClear=rect=>{
            const x=Math.floor((rect.left+rect.width/2)*ratioX),y=canvas.height-1-Math.floor((rect.top+rect.height/2)*ratioY);
            return glowPixels[(y*canvas.width+x)*4+3]<=24;
        };
        check('WebGL glows leave the buff and player frame contents clear',glowRects.every(centerIsClear));
        const cornerX=Math.floor((buffRect.left+1.5)*ratioX),cornerY=canvas.height-1-Math.floor((buffRect.top+3.5)*ratioY);
        const cornerAlpha=glowPixels[(cornerY*canvas.width+cornerX)*4+3];
        check('WebGL buff glow follows the frame’s tighter rounded corners',cornerAlpha>24);
        const labelX=Math.floor((labelRect.left+labelRect.width/2)*ratioX),labelY=canvas.height-1-Math.floor((labelRect.top+labelRect.height/2)*ratioY);
        let labelCovered=false;
        for(let y=Math.max(0,Math.floor((innerHeight-labelRect.bottom)*ratioY));y<Math.min(canvas.height,Math.ceil((innerHeight-labelRect.top)*ratioY))&&!labelCovered;y++)
            for(let x=Math.max(0,Math.floor(labelRect.left*ratioX));x<Math.min(canvas.width,Math.ceil(labelRect.right*ratioX));x++)
                if(glowPixels[(y*canvas.width+x)*4+3]>24){labelCovered=true;break;}
        check('WebGL buff glow leaves the entire top-right label area clear',glowPixels[(labelY*canvas.width+labelX)*4+3]<=24&&!labelCovered);
        CombatWebGL.clear();testBuff.remove();
        toggle('glows',false);
        check('glow switch removes persistent auras immediately',CombatWebGL.status().ambient===0);
        toggle('glows',true);toggle('all',false);
        check('master off stops transient and persistent GPU work',!CombatWebGL.status().active&&!CombatWebGL.status().ambient&&!CombatWebGL.status().running&&canvas.hidden);
        toggle('all',true);choose('webgl-cracks');
        showCombatArrow(null,a.id,'multiShot',0);showEruptionChain(a.id,b.id,0);
        check('cracks-only comparison retains original projectiles',!!document.querySelector('.combat-arrow')&&types().includes('eruptionChain')&&!document.body.classList.contains('combat-webgl-active'));
        choose('svg');
        const cssBuff=document.createElement('li');cssBuff.className='combat-buff is-proccing';cssBuff.dataset.buffId='voidCharges';elements.buffList.append(cssBuff);
        await nextFrame();
        const buffAnimation=cssBuff.getAnimations().find(animation=>animation.effect.getKeyframes().some(keyframe=>keyframe.boxShadow));
        check('original buff glow retains its halo without scaling over the label',Boolean(buffAnimation)&&buffAnimation.effect.getKeyframes().every(keyframe=>!keyframe.transform)&&buffAnimation.effect.getKeyframes().some(keyframe=>keyframe.boxShadow?.includes('24px')&&!keyframe.boxShadow.includes('inset')));
        showVoidVolleyPlayerGlow(1,0);
        const cssPlayerGlow=elements.playerHealthPanel.querySelector('.void-volley-player-glow');
        const playerRadius=parseFloat(getComputedStyle(elements.playerHealthPanel).borderTopLeftRadius),glowRadius=parseFloat(getComputedStyle(cssPlayerGlow).borderTopLeftRadius);
        check('original player glow corner radius matches its expanded frame',Math.abs(glowRadius-playerRadius-2)<1);
        cssPlayerGlow.remove();cssBuff.remove();
        showShieldSlamWave([a.id]);showSpellCast('voidBolt',[{targetId:a.id}]);showElementalBurst([a.id],'fire',true);
        check('original renderer retains shields, spells and elemental effects',!!document.querySelector('.shield-slam-wave')&&!!document.querySelector('.spell-effect')&&!!document.querySelector('.elemental-effect-layer')&&!CombatWebGL.status().running);
        choose('webgl');render();const extension=gl.getExtension('WEBGL_lose_context');extension.loseContext();await wait(100);
        showCombatArrow(null,a.id,'multiShot',0);showShieldSlamWave([a.id]);showSpellCast('voidBolt',[{targetId:a.id}]);
        check('lost contexts restore original effects and portrait layers',!!document.querySelector('.combat-arrow')&&!!document.querySelector('.shield-slam-wave')&&!!document.querySelector('.spell-effect')&&!document.body.classList.contains('combat-webgl-active'));
        extension.restoreContext();for(let i=0;i<30&&!CombatWebGL.status().available;i++)await wait(50);
        render();showShieldSlamWave([a.id]);await nextFrame();
        check('all-effect rendering resumes after context restoration',CombatWebGL.status().available&&types().includes('shield')&&gl.getError()===gl.NO_ERROR);
        CombatWebGL.sync(false,map.id);
        check('leaving combat stops the shared surface',!CombatWebGL.status().active&&!CombatWebGL.status().ambient&&!CombatWebGL.status().running);
        check('no script errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push(error.stack||String(error));}
    finally{Math.random=random;CombatWebGL.clear();}
    const output=document.createElement('pre');output.id='smoke-results';output.textContent=checks.join('\n');document.body.append(output);
}());
