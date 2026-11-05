(async function(){
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    let player,marker,spacer;const savedScroll={x:scrollX,y:scrollY};
    const properties=['innerWidth','innerHeight','devicePixelRatio'],descriptors=Object.fromEntries(properties.map(key=>[key,Object.getOwnPropertyDescriptor(window,key)]));
    const restoreViewport=()=>properties.forEach(key=>{if(descriptors[key])Object.defineProperty(window,key,descriptors[key]);else delete window[key];});
    try{
        await document.fonts.ready;const live=await ReapSprite.ready;ReapSprite.clear();clearOfflineRecap();CombatWebGL.clear();
        let clock=0,next,hits=0,completed=0;
        player=new ScytheReapEffect({weaponImage:live.weaponImage,bloodImage:live.bloodImage,now:()=>clock,requestFrame:callback=>{next=callback;return 1;},cancelFrame:()=>{next=null;}});await player.ready;
        const run=time=>{clock=time;const callback=next;next=null;callback?.();};
        function meter(){const result={draws:0,clears:0},context=player.context,draw=context.drawImage.bind(context),clear=context.clearRect.bind(context);
            context.drawImage=(...args)=>{result.draws++;return draw(...args);};context.clearRect=(...args)=>{result.clears++;return clear(...args);};return result;}
        const pixels=()=>{const data=player.context.getImageData(0,0,Math.min(360,player.canvas.width),Math.min(400,player.canvas.height)).data;
            return {opaque:data.some((value,index)=>index%4===3&&value>16)};};
        const cast=player.play({position:{x:160,y:200},size:300,reducedMotion:false,onHit:()=>hits++,onComplete:()=>completed++});let count=meter();run(0);
        const initial=pixels();for(let time=4;time<=36;time+=4)run(time);
        const retained=pixels();
        check('high-refresh callbacks retain visible sprite pixels without clearing or drawing',initial.opaque&&retained.opaque&&count.clears===1&&count.draws===1);
        run(38);check('the next source frame redraws immediately',cast.frameIndex===1&&count.clears===2&&count.draws===2);
        cast.seek(6);run(40);const peakClears=count.clears,peakDraws=count.draws;run(44);run(48);
        check('a paused peak frame retains both layers without repeated drawing',count.clears===peakClears&&count.draws===peakDraws&&hits===1);
        cast.seek(14);run(52);check('seeking still updates the blood-only final frames',cast.frameIndex===14&&count.clears===peakClears+1&&count.draws===peakDraws+1);
        cast.seek(15);run(56);const transparentClears=count.clears;run(60);
        check('the final transparent frame clears old blood once',count.clears===transparentClears&&!pixels().opaque);
        cast.resume();run(90);run(94);
        check('completion still runs once after an unchanged transparent frame',cast.finished&&completed===1&&!player.element&&player.lastPresentation===null&&next===null);

        marker=document.createElement('div');marker.style.cssText='position:absolute;left:100px;top:120px;width:120px;height:140px';
        spacer=document.createElement('div');spacer.style.height='2400px';document.body.append(marker,spacer);scrollTo(0,0);
        const moving=player.play({target:marker,size:300,freezeAt:225,reducedMotion:false});count=meter();run(100);
        marker.style.transform='translate(17px,11px)';run(104);
        check('moving a target redraws even when the sprite frame is unchanged',count.clears===2);
        run(108);check('a stationary target does not trigger another redraw',count.clears===2);
        marker.style.width='150px';run(112);check('resizing a target refreshes its center',count.clears===3);
        scrollTo(0,30);run(116);check('scrolling redraws the effect at its new screen position',scrollY>0&&count.clears===4);scrollTo(0,0);
        const second=player.play({target:marker,size:300,freezeAt:225,reducedMotion:false});run(120);const bothClears=count.clears;second.cancel();run(124);
        check('cancelling one overlapping cast clears its old pixels while preserving the other',count.clears===bothClears+1&&player.active.size===1&&!moving.finished);
        marker.remove();run(128);check('removing the final target cancels and releases the cached scene',moving.finished&&!player.element&&player.lastPresentation===null);

        const reduced=player.play({position:{x:160,y:200},freezeAt:225,reducedMotion:true});count=meter();run(140);run(144);
        check('a paused reduced-motion fade can reuse identical pixels',count.clears===1);
        reduced.resume();run(148);check('a live reduced-motion fade redraws even inside the same source frame',count.clears===2);player.clear();

        const viewport=(width,height,ratio)=>{for(const [key,value]of Object.entries({innerWidth:width,innerHeight:height,devicePixelRatio:ratio}))Object.defineProperty(window,key,{configurable:true,value});};
        viewport(400,400,1);player.play({position:{x:100,y:100},size:180,freezeAt:225,reducedMotion:false});count=meter();run(160);
        viewport(200,200,2);run(164);
        check('DPR and viewport changes redraw even when backing dimensions stay identical',player.canvas.width===400&&player.canvas.height===400&&player.context.getTransform().a===2&&count.clears===2);
        viewport(300,200,2);run(168);check('backing-store resize invalidates retained pixels',player.canvas.width===600&&count.clears===3);player.clear();restoreViewport();

        let trigger,callbackHits=0;
        trigger=player.play({position:{x:160,y:200},freezeAt:225,reducedMotion:false,onHit:()=>{callbackHits++;trigger.cancel();}});run(180);
        check('hit callbacks may cancel a cast without leaving stale pixels or a running loop',callbackHits===1&&trigger.finished&&!player.element&&player.lastPresentation===null&&next===null);
        player.play({position:{x:160,y:200},freezeAt:225,reducedMotion:false});count=meter();run(184);run(188);
        const restarted=player.play({position:{x:160,y:200},restart:true,reducedMotion:false});count=meter();run(188);
        check('restarting an identical cast always paints the new canvas at frame zero',count.clears===1&&count.draws===1&&restarted.frameIndex===0);player.clear();
        check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    finally{player?.clear();ReapSprite.clear();marker?.remove();spacer?.remove();restoreViewport();scrollTo(savedScroll.x,savedScroll.y);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
