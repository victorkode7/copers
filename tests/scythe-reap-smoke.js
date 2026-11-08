(async function(){
    const checks=[],originalRandom=Math.random,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const params=new URL(document.currentScript.src).searchParams,preview=params.has('preview'),overlap=params.has('overlap');
    try{
        await document.fonts.ready;const live=await ReapSprite.ready;clearOfflineRecap();ReapSprite.clear();
        check('native weapon resolution is preserved',live.weaponImage.naturalWidth===3072&&live.weaponImage.naturalHeight===3072);
        check('blood is normalized into equal padded cells',live.bloodImage.naturalWidth===2048&&live.bloodImage.naturalHeight===2048);
        const sourceBlood=new Image();await new Promise((resolve,reject)=>{sourceBlood.onload=resolve;sourceBlood.onerror=reject;sourceBlood.src='assets/effects/blood-4x4-source.png';});
        const runtimeBlood=ScytheReapEffect.normalizeBlood(sourceBlood);
        check('raw 1254px blood can also normalize at runtime',runtimeBlood.width===2048&&runtimeBlood.height===2048);
        const scan=document.createElement('canvas');scan.width=scan.height=768;const ctx=scan.getContext('2d',{willReadFrequently:true});
        const angles=[],hashes=[];
        let hiltsRemoved=true,softEdges=true,shaftsPreserved=true,outerBladesPreserved=true;
        for(let index=0;index<16;index++){
            const frame=ScytheReapEffect.frameRect(live.weaponImage,index);
            check('weapon frame '+index+' selects the correct cell',frame.x===index%4*768&&frame.y===Math.floor(index/4)*768&&frame.width===768&&frame.height===768);
            ctx.clearRect(0,0,768,768);ctx.drawImage(live.weaponImage,frame.x,frame.y,768,768,0,0,768,768);
            const pixels=ctx.getImageData(0,0,768,768).data;let xSum=0,ySum=0,nonempty=false,hash=2166136261;
            for(let i=0;i<pixels.length;i++){hash=Math.imul(hash^pixels[i],16777619);if((i%4)===3&&pixels[i])nonempty=true;}
            hashes.push(hash);check('weapon frame '+index+' is present and transparent at its borders',nonempty&&pixels[3]===0);
            for(let y=0;y<768;y+=4)for(let x=0;x<768;x+=4){const alpha=pixels[(y*768+x)*4+3];if(alpha>20&&Math.hypot(x-384,y-384)>192){xSum+=(x-384)*alpha;ySum+=(y-384)*alpha;}}
            ctx.clearRect(0,0,768,768);ctx.drawImage(live.weaponSprite,frame.x,frame.y,768,768,0,0,768,768);
            const masked=ctx.getImageData(0,0,768,768).data;let hiltPixels=0,featherPixels=0,shaftPixels=0,bladePixels=0;
            for(let y=0;y<768;y+=2)for(let x=0;x<768;x+=2){
                const offset=(y*768+x)*4+3,alpha=pixels[offset],result=masked[offset],radius=Math.hypot(x-384,y-384)/768;
                if(alpha<200)continue;
                if(radius<.009){hiltPixels++;if(result!==0)hiltsRemoved=false;}
                if(radius>.015&&radius<.027&&result>0&&result<alpha)featherPixels++;
                if(radius>.04&&radius<.3){shaftPixels++;if(Math.abs(result-alpha)>1)shaftsPreserved=false;}
                if(radius>.41){bladePixels++;if(Math.abs(result-alpha)>1)outerBladesPreserved=false;}
            }
            hiltsRemoved&&=hiltPixels>0;softEdges&&=featherPixels>0;shaftsPreserved&&=shaftPixels>0;outerBladesPreserved&&=bladePixels>0;
            let angle=Math.atan2(ySum,xSum)*180/Math.PI;if(index){while(angle>angles[index-1]+180)angle-=360;while(angle<angles[index-1]-180)angle+=360;}angles.push(angle);
        }
        check('weapon turns counterclockwise through 270 degrees exactly once',angles.slice(1,13).every((angle,index)=>angle<angles[index])&&Math.abs(angles[12]-angles[0]+270)<2);
        check('frames 13–15 hold the final source pose',hashes.slice(12).every(hash=>hash===hashes[12]));
        check('only the hilt end is removed in every animation frame',hiltsRemoved);
        check('every hilt end has a short feathered transition',softEdges);
        check('the long shaft remains opaque in all sixteen frames',shaftsPreserved);
        check('outer blade detail is preserved in all sixteen frames',outerBladesPreserved);
        scan.width=scan.height=512;
        let residueRemoved=true,preservedCorePixels=0;
        for(let index=0;index<16;index++){
            const frame=ScytheReapEffect.frameRect(live.bloodImage,index);ctx.clearRect(0,0,512,512);ctx.drawImage(live.bloodImage,frame.x,frame.y,512,512,0,0,512,512);
            const pixels=ctx.getImageData(0,0,512,512).data;let safe=true;
            for(let y=0;y<512;y++)for(let x=0;x<512;x++)if((x<4||x>=508||y<4||y>=508)&&pixels[(y*512+x)*4+3]!==0)safe=false;
            check('blood frame '+index+' has transparent anti-bleed gutters',safe);
            ctx.clearRect(0,0,512,512);ctx.drawImage(live.bloodSprite,frame.x,frame.y,512,512,0,0,512,512);
            const cleaned=ctx.getImageData(0,0,512,512).data;
            for(let offset=3;offset<pixels.length;offset+=16){
                if(pixels[offset]<=24&&cleaned[offset]!==0)residueRemoved=false;
                if(pixels[offset]>200&&cleaned[offset]===pixels[offset])preservedCorePixels++;
            }
        }
        check('low-opacity background residue is removed from every blood frame',residueRemoved);
        check('the bright blood core retains its original opacity',preservedCorePixels>1000);
        const solid=document.createElement('canvas');solid.width=solid.height=512;
        const solidContext=solid.getContext('2d');solidContext.fillStyle='#ed182e';solidContext.fillRect(0,0,512,512);
        const borderSheet=ScytheReapEffect.prepareBlood(solid,{rotation:0,scale:1,reveal:false});
        const borderContext=borderSheet.getContext('2d'),borderPixels=borderContext.getImageData(0,0,512,512).data;
        const alphaAt=(pixels,x,y)=>pixels[(y*512+x)*4+3];
        const edgeProfile=Array.from({length:9},(_,x)=>alphaAt(borderPixels,x,64));
        check('frame boundaries feather smoothly instead of cutting off opaque blood',edgeProfile[0]===0&&edgeProfile.at(-1)===255&&edgeProfile.every((alpha,index)=>!index||alpha>=edgeProfile[index-1])&&new Set(edgeProfile.filter(alpha=>alpha>0&&alpha<255)).size>=3);
        let internalEdgesSafe=true;
        for(let row=0;row<4;row++)for(let column=0;column<4;column++)if(alphaAt(borderPixels,column*128,row*128+64)!==0||alphaAt(borderPixels,column*128+64,row*128)!==0)internalEdgesSafe=false;
        check('all sixteen cell boundaries stay transparent',internalEdgesSafe);
        const revealSheet=ScytheReapEffect.prepareBlood(solid,{rotation:0,scale:1}),revealPixels=revealSheet.getContext('2d').getImageData(0,0,512,512).data;
        const ray=angle=>alphaAt(revealPixels,256+Math.round(64+38*Math.cos(angle*Math.PI/180)),128+Math.round(64+38*Math.sin(angle*Math.PI/180)));
        const leading=[-97,-93,-90,-87,-84,-81].map(ray),trailing=[100,105,109,112,116,120].map(ray);
        check('both reveal boundaries have a smooth opacity transition',leading[0]===255&&leading.at(-1)===0&&trailing[0]===0&&trailing.at(-1)===255&&[leading,trailing].every(samples=>new Set(samples.filter(alpha=>alpha>0&&alpha<255)).size>=2));
        const layered=document.createElement('canvas');layered.width=layered.height=512;const layeredContext=layered.getContext('2d');
        for(let cast=0;cast<40;cast++)layeredContext.drawImage(borderSheet,0,0);
        const layeredPixels=layeredContext.getImageData(0,0,512,512).data;
        check('forty overlapping casts do not expose rectangular frame edges',alphaAt(layeredPixels,0,64)===0&&alphaAt(layeredPixels,128,64)===0&&alphaAt(layeredPixels,64,128)===0);
        const drawLog=[],canvas=document.createElement('canvas');canvas.width=canvas.height=1200;const context=canvas.getContext('2d'),draw=context.drawImage.bind(context);let inspectionFrame=0;
        context.drawImage=(image,...args)=>{drawLog.push({frame:inspectionFrame,weapon:image===live.weaponSprite,transform:context.getTransform(),destination:args.slice(-4),alpha:context.globalAlpha});draw(image,...args);};
        for(inspectionFrame=0;inspectionFrame<16;inspectionFrame++)live.drawFrame(context,inspectionFrame,600,600,512);
        const weapons=drawLog.filter(call=>call.weapon),blood=drawLog.filter(call=>!call.weapon);
        check('all visible weapon frames have identical size and position',weapons.length===13&&weapons.every(call=>JSON.stringify(call.destination)==='[-256,-256,512,512]'&&call.transform.e===600&&call.transform.f===600));
        check('the weapon fades at the end of the swing and omits all held frames',weapons[10].alpha===1&&Math.abs(weapons[11].alpha-2/3)<.001&&Math.abs(weapons[12].alpha-1/3)<.001&&weapons.every(call=>call.frame<13));
        check('blood remains visible after the weapon disappears',blood.some(call=>call.frame===13&&call.alpha>0)&&blood.some(call=>call.frame===14&&call.alpha>0));
        check('blood composites above the weapon in each frame',Array.from({length:16},(_,frame)=>drawLog.filter(call=>call.frame===frame)).every(calls=>calls.length<2||calls[0].weapon&&!calls.at(-1).weapon));
        check('no additional rotation or distortion is applied to the weapon',weapons.every(call=>call.transform.a===1&&call.transform.b===0&&call.transform.c===0&&call.transform.d===1));
        check('only blood receives the independent alignment correction',blood.every(call=>Math.abs(Math.atan2(call.transform.b,call.transform.a)*180/Math.PI+85)<.01));
        check('blood is absent during wind-up and fades over the final three frames',ScytheReapEffect.stateAt(0).bloodAlpha===0&&ScytheReapEffect.stateAt(70).bloodAlpha===0&&[13,14,15].map(frame=>ScytheReapEffect.stateAt((frame+.5)/16*600).bloodAlpha).join(',')==='0.6666666666666666,0.3333333333333333,0');
        let now=0,next,completed=0,hits=0;
        const effect=new ScytheReapEffect({weaponImage:live.weaponImage,bloodImage:live.bloodImage,now:()=>now,requestFrame:callback=>{next=callback;return 1;},cancelFrame:()=>{next=null;}});await effect.ready;
        check('instances reuse the prepared weapon sheet',effect.weaponSprite===live.weaponSprite);
        check('instances reuse the cleaned blood texture',effect.bloodSprite===live.bloodSprite);
        const run=time=>{now=time;const callback=next;next=null;callback?.();};
        const cast=effect.play({position:{x:300,y:300},onHit:()=>hits++,onComplete:()=>completed++});
        const frames=[];for(let frame=0;frame<16;frame++){run(frame*600/16);frames.push(cast.frameIndex);}
        check('all sixteen timeline frames play in sequence',frames.every((value,index)=>value===index));
        check('both layers share one animation container',effect.element.querySelectorAll('canvas').length===1);
        check('one hit callback occurs during the swing',hits===1);
        run(600);run(616);check('playback completes once and removes its container',completed===1&&cast.finished&&!effect.element);
        effect.play({position:{x:300,y:300}});effect.play({position:{x:300,y:300}});
        const layerOrder=[],overlapDraw=effect.context.drawImage.bind(effect.context);
        effect.context.drawImage=(image,...args)=>{layerOrder.push(image===live.weaponSprite?'weapon':'blood');overlapDraw(image,...args);};run(750);
        check('overlapping casts keep every blood layer above every weapon',layerOrder.join(',')==='weapon,weapon,blood,blood');effect.clear();
        const first=effect.play({position:{x:300,y:300}});run(800);
        const restarted=effect.play({position:{x:300,y:300},restart:true});run(800);
        check('rapid retrigger restarts at frame zero cleanly',first.finished&&restarted.frameIndex===0&&effect.active.size===1);
        effect.clear();const fast=effect.play({position:{x:300,y:300},speed:2});run(950);
        check('playback speed is configurable',fast.frameIndex===8);run(1100);run(1116);check('speed changes still complete once',fast.finished);
        const seek=effect.play({position:{x:300,y:300}});seek.seek(14);run(1300);check('frame inspection pauses both layers together',seek.frameIndex===14);seek.cancel();
        let skippedHits=0;const skipped=effect.play({position:{x:300,y:300},onHit:()=>skippedHits++});run(1850);run(1900);
        check('skipping frames cannot lose or duplicate the hit callback',skippedHits===1);skipped.cancel();
        const marker=document.createElement('div');marker.style.cssText='position:fixed;left:100px;top:100px;width:100px;height:100px';document.body.append(marker);
        const widthDescriptor=Object.getOwnPropertyDescriptor(window,'innerWidth');
        try{
            const moving=effect.play({target:marker,size:700});run(1900);marker.style.left='200px';marker.style.width='200px';
            Object.defineProperty(window,'innerWidth',{configurable:true,value:700});run(1950);
            check('viewport resize retains the cast size and updates canvas dimensions',effect.canvas.width===Math.round(700*Math.min(devicePixelRatio||1,2))&&[...effect.active][0].size===700);
            check('target layout changes do not restart the animation',moving.frameIndex===1&&effect.active.size===1);moving.cancel();
        }finally{marker.remove();if(widthDescriptor)Object.defineProperty(window,'innerWidth',widthDescriptor);else delete window.innerWidth;effect.clear();}
        const map=currentMap();state.currentView='map';state.isInTown=false;state.combatPaused=false;state.playerHp=100;
        state.level=1;state.experience=0;state.experienceRemainder=0;state.skillPoints=0;state.skillRanks={reapPreview:1};state.gear=createEmptyGear();state.upgrades={strength:0,haste:0,evasion:0};state.tutorials=createTutorialState();
        map.spawns=[{id:'scytheTarget',monsterId:worldContent.monsters[0].id,count:4,overrides:{health:10000,attackDamage:0,attackInterval:1000,evasion:0,gold:[0,0],experience:0,drops:[],itemDrops:[]}}];
        combatStatCache=null;invalidateSkillBonusCache();resetMonsterStates(map);render();Math.random=()=>0;state.attackTimer=getAttackSpeed()-.05;
        const target=activeMonster(),hp=target.hp,damage=getDamage();let result=simulateCombatStep(.1,true);flushCombatEffects(result.effects);
        check('existing Reap node triggers the new two-layer component',!!document.querySelector('.scythe-reap-effect'));
        check('damage is still delayed from frame zero',target.hp===hp&&state.pendingReapAttacks.length===1);
        const saved=parseGameSave(JSON.stringify(createGameSave()));applyGameSave(saved);
        simulateCombatStep(.1,false);simulateCombatStep(.1,false);
        check('saved hit still lands at frame five on the combat clock',activeMonster().hp===hp-damage);
        state.combatPaused=true;ReapSprite.clear();check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
        if(preview){
            elements.combatPanel.scrollIntoView({block:'start'});await wait(60);ReapSprite.show(state.targetMonsterId);const active=[...live.active][0];
            if(overlap){
                const size=active.size;live.clear();
                for(let index=0;index<20;index++){
                    const rect=getCombatEffectCard(state.monsterStates[index%state.monsterStates.length].id).getBoundingClientRect();
                    live.play({position:{x:rect.left+rect.width/2,y:rect.top+rect.height/2},size,facing:index%4*Math.PI/2,freezeAt:220+index%6*37.5});
                }
            }else live.now=()=>active.born+300;
            live.tick();await wait(40);
        }
    }catch(error){checks.push('ERROR '+error.stack);}finally{Math.random=originalRandom;}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
