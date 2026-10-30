// Game-facing effect adapters. Returning false keeps the original DOM renderer
// available, including reduced motion and graphics-context recovery.
(function () {
    'use strict';
    const colors={fire:[1,.48,.12],cold:[.42,.85,1],void:[.76,.46,1],poison:[.43,.94,.28],bleed:[1,.2,.3],shield:[.6,.85,1]};
    let localBounds=new WeakMap(), playerGlow;
    const gpu=()=>window.CombatWebGL;
    const available=(category='abilities')=>gpu()?.ready(elements.combatPanel,category)===true;
    const frame=()=>getCombatEffectBounds(elements.combatPanel);
    function box(element,cached=false) {
        if(cached&&localBounds.has(element))return localBounds.get(element);
        const origin=frame(),rect=getCombatEffectBounds(element);
        const result={x:rect.left+rect.width/2-origin.left,y:rect.top+rect.height/2-origin.top,width:rect.width,height:rect.height};
        if(cached)localBounds.set(element,result);return result;
    }
    const center=element=>{const {x,y}=box(element);return {x,y};};
    function emit(type,spec){return gpu().emit({type,...spec});}
    function ring(type,point,color,size=40,delay=0,category='abilities') {
        return emit(type,{...point,width:size,height:size,style:1,color,duration:450,delay,startScale:.25,scale:1.5,category});
    }
    function sparks(type,point,color,count=6,delay=0,fire=false) {
        for(let i=0;i<count;i++) {
            const angle=i*Math.PI*2/count;
            emit(type,{...point,width:fire?13:8,height:fire?26:18,endX:point.x+Math.cos(angle)*70,endY:point.y+Math.sin(angle)*55,
                move:1,rotation:angle,style:fire?0:3,color,duration:800,delay:delay+i*14,startScale:.3,scale:.7});
        }
    }
    function arrow({source,target,rowIds,kind,direction,delay=0,freezing,sourceId}) {
        if(!available('projectiles'))return false;
        const area=frame(),end=center(target),directed=kind==='forkingArrow';
        let start=[{x:4,y:end.y},{x:area.width-4,y:end.y},{x:end.x,y:4},{x:end.x,y:area.height-4}][direction]||{x:4,y:end.y};
        if(kind==='piercingArrow') {
            const first=getCombatEffectCard(rowIds[0]),last=getCombatEffectCard(rowIds.at(-1));if(!first||!last)return true;
            const a=box(first),b=box(last);start={x:a.x-a.width/2,y:a.y};end.x=b.x+b.width/2;end.y=a.y;
        } else if(source)start=center(source);
        else if(directed) {
            const left=Math.max(8,8-area.left),right=Math.min(area.width-8,innerWidth-area.left-8);
            const top=Math.max(8,8-area.top),bottom=Math.min(area.height-8,innerHeight-area.top-8);
            start=[{x:Math.max(left,end.x-160),y:end.y},{x:Math.min(right,end.x+160),y:end.y},
                {x:end.x,y:Math.max(top,end.y-160)},{x:end.x,y:Math.min(bottom,end.y+160)}][direction]||start;
        }
        const color=kind==='piercingArrow'?[1,1,1]:freezing?[.6,.929,1]:[1,.886,.588];
        const duration=arrowVisualDurations[kind]||450,flight=getArrowFlightTime(kind,sourceId);
        const angle=Math.atan2(end.y-start.y,end.x-start.x);
        gpu().trail({points:[start,end],flight,duration,delay,color,strokeWidth:directed?(source?4:5):3,
            glowRadius:4,style:directed?16:12,type:'arrow'});
        if(directed)emit('arrow',{...start,width:64,height:48,endX:end.x,endY:end.y,move:1,rotation:angle,
            style:4,flight,duration,delay,color,category:'projectiles'});
        else {
            const dx=Math.cos(angle),dy=Math.sin(angle);
            gpu().trail({points:[{x:end.x-dx*11-dy*5,y:end.y-dy*11+dx*5},end,
                {x:end.x-dx*11+dy*5,y:end.y-dy*11-dx*5}],flight:1,duration:duration-flight,
                delay:delay+flight,color,strokeWidth:3,glowRadius:4,type:'arrow'});
        }
        if(directed)ring('arrowImpact',end,color,32,delay+flight,'projectiles');
        return true;
    }
    function eruption(centerId,targetIds) {
        if(!available())return false;
        for(const id of new Set([centerId,...targetIds])) {
            const card=getCombatEffectCard(id);if(!card)continue;
            const rect=box(card),isCenter=id===centerId;
            emit('eruption',{...rect,style:2,color:colors.fire,duration:900,opacity:isCenter?.9:.35});
            if(isCenter)ring('eruption',rect,colors.fire,Math.min(rect.width,rect.height),0);
        }return true;
    }
    function elemental(targetIds,element,explosion) {
        if(!available())return false;
        for(const id of targetIds) {
            const card=getCombatEffectCard(id);if(!card)continue;
            const rect=box(card),color=element==='fire'?colors.fire:colors.cold;
            emit('elemental',{...rect,style:2,color,duration:850,opacity:explosion?.9:.5});
            ring('elemental',rect,color,Math.min(rect.width,rect.height)*(explosion?1.2:.8));
            sparks('elemental',rect,color,explosion?8:5,0,element==='fire');
        }return true;
    }
    function shield(hitIds) {
        if(!available())return false;
        const cards=hitIds.map(id=>getCombatEffectCard(id)).filter(Boolean);
        const count=Math.min(cards.length,shieldSlamVisualSettings.maximumImpacts),spacing=count>1?Math.min(90,540/(count-1)):0;
        for(let i=0;i<count;i++) {
            const rect=box(cards[Math.round(i*(cards.length-1)/Math.max(1,count-1))]);
            const scale=Math.min(1.1,rect.width/150,rect.height/110),delay=i*spacing;
            emit('shield',{x:rect.x,y:rect.y-12,width:64*scale,height:84*scale,endX:rect.x,endY:rect.y,move:1,
                style:5,color:colors.shield,duration:650,delay,startScale:1.25,scale:.95});
            ring('shield',{x:rect.x,y:rect.y+23},colors.shield,90*scale,delay);
            sparks('shield',rect,colors.shield,6,delay);
        }return true;
    }
    function vortex(targetIds,delay) {
        if(!available())return false;
        const boxes=targetIds.map(id=>getCombatEffectCard(id)).filter(Boolean).map(card=>box(card));if(!boxes.length)return true;
        const left=Math.min(...boxes.map(b=>b.x-b.width/2)),right=Math.max(...boxes.map(b=>b.x+b.width/2));
        const top=Math.min(...boxes.map(b=>b.y-b.height/2)),bottom=Math.max(...boxes.map(b=>b.y+b.height/2));
        for(let i=0;i<3;i++)emit('vortex',{x:(left+right)/2,y:(top+bottom)/2,width:(right-left)*(1-i*.15)*1.3,height:(bottom-top)*(1-i*.2)*1.3,
            style:10,rotation:(i-1)*.16,color:colors.void,duration:650,delay:delay+i*70,startScale:1.15,scale:.05});
        return true;
    }
    function bezierPoints(start,end,a,b) {
        const points=[];for(let i=0;i<=24;i++){const t=i/24,q=1-t;points.push({x:q*q*q*start.x+3*q*q*t*a.x+3*q*t*t*b.x+t*t*t*end.x,y:q*q*q*start.y+3*q*q*t*a.y+3*q*t*t*b.y+t*t*t*end.y});}return points;
    }
    function spells(kind,hits,visualDelay,visuals) {
        if(!available('projectiles'))return false;
        const area=frame(),player=box(elements.playerHealthPanel),origin={x:player.x,y:player.y+player.height/2};
        const noise=kind==='voidVolley'?crypto.getRandomValues(new Uint32Array(hits.length*4)):null;
        let hold=0,windup=Infinity;
        hits.forEach((hit,index)=>{
            if(visuals[index]?.cancelled)return;
            const target=getCombatEffectCard(hit.targetId);if(!target)return;
            const point=center(target),source=getCombatEffectCard(hit.sourceId),start=source?center(source):origin;
            const schedule=getVoidMissileSchedule(index,visualDelay,hit.flight??voidMissileTiming.flight);
            const age=Math.max(0,schedule.arrival-(hit.missile?.remaining??schedule.arrival));
            const flight=schedule.flight*1000,delay=(schedule.delay-age)*1000,contact=Math.max(0,schedule.arrival-age)*1000;
            let a,b;
            if(noise){const values=getVoidVolleyCurve(start,point,index,hits.length,noise,area).match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi).map(Number);a={x:values[0],y:values[1]};b={x:values[2],y:values[3]};}
            else {const fan=(index-(hits.length-1)/2)*12,control={x:(start.x+point.x)/2+fan,y:Math.max(0,(start.y+point.y)/2-Math.abs(fan)*.65-30)};
                a={x:start.x+(control.x-start.x)*2/3,y:start.y+(control.y-start.y)*2/3};b={x:point.x+(control.x-point.x)*2/3,y:point.y+(control.y-point.y)*2/3};}
            const accelerating=kind==='voidVolley';
            gpu().trail({points:bezierPoints(start,point,a,b),flight,duration:flight,delay,strokeWidth:accelerating?4:5,glowRadius:6,
                style:accelerating?15:14,color:accelerating?[.941,.761,1]:[.851,.733,1],
                glowColor:accelerating?[.757,.357,1]:[.588,.333,1],type:'spell',parametric:true});
            emit('spell',{...start,width:accelerating?44:46,height:accelerating?44:46,endX:point.x,endY:point.y,move:accelerating?3:2,
                control1:a,control2:b,style:.25,color:colors.void,duration:flight,delay,category:'projectiles'});
            const impact=ring('spellImpact',point,colors.void,accelerating?48:38,contact);
            if(visuals[index])visuals[index].circle=impact;
            if(accelerating&&!hit.sourceId){hold=Math.max(hold,schedule.delay-age+schedule.flight*.4);windup=Math.min(windup,Math.max(0,delay/1000));}
        });
        if(hold>0)showVoidVolleyPlayerGlow(hold,windup);
        return true;
    }
    function impact(targetId) {
        if(!available())return false;const card=getCombatEffectCard(targetId);if(card)ring('spellImpact',center(card),colors.void,48);return true;
    }
    function transfer(source,target) {
        if(!available('projectiles'))return false;
        gpu().trail({points:[center(source),center(target)],flight:180,duration:700,strokeWidth:3,glowRadius:5,
            color:[.463,1,.463],glowColor:[.224,.91,.353],style:12,type:'poisonTransfer'});return true;
    }
    function glow(holdSeconds,windupSeconds) {
        if(!available('glows')||!CombatSettings.enabled('abilities'))return false;
        const now=performance.now(),until=Math.max(playerGlow?.until||0,now+holdSeconds*1000);
        const launchAt=Math.min(playerGlow?.launchAt||Infinity,now+windupSeconds*1000);
        playerGlow?.handle.remove();
        playerGlow={until,launchAt,handle:emit('playerGlow',{...box(elements.playerHealthPanel),style:11,color:colors.void,
            duration:Math.max(1,until-Math.max(now,launchAt)),delay:Math.max(0,launchAt-now),category:'glows',requiresAbilities:true,opacity:.85})};
        return true;
    }
    function pulse(element,className) {
        if(!available('glows'))return false;
        const color=className==='is-damaged'||element.classList.contains('enemy-bleed-status')?colors.bleed:
            className==='is-shield-blocking'?colors.shield:className==='is-applying'?colors.poison:colors.void;
        emit('pulse',{...box(element),style:2,color,duration:500,category:'glows',startScale:.95,scale:1.05});return true;
    }
    function lootFlash(card,rarity) {
        if(!available('glows'))return false;
        const color=rarity==='unique'?[1,.75,.3]:rarity==='epic'?colors.void:colors.cold;
        emit('lootFlash',{...box(card),style:2,color,duration:700,category:'glows'});return true;
    }
    function sync() {
        if(typeof elements==='undefined')return;
        const full=state.currentView==='map'&&available();
        document.body.classList.toggle('combat-webgl-active',full);
        if(!full)return;
        const descriptors=[];
        const add=(key,type,element,style,color)=>descriptors.push({key,type,...box(element,true),style,color,opacity:.85,category:'abilities'});
        const fire=(key,type,element,portrait=false)=>{
            const rect=box(element,true),height=portrait?rect.height*.5:20;
            descriptors.push({key,type,...rect,y:portrait?rect.y+rect.height*.25:rect.y-rect.height/2-5,height,style:6,color:colors.fire,opacity:.7,category:'abilities'});
            if(!portrait)descriptors.push({key:key+'-rim',type,...rect,style:2,color:colors.fire,opacity:.45,category:'abilities'});
        };
        if(CombatSettings.enabled('glows')) {
            for(const card of elements.enemyRoster.children) {
                if(card.classList.contains('is-respawning'))continue;
                const mark=card.querySelector('.enemy-mark');if(!mark)continue;
                const id=card.dataset.monsterId;
                if(card.classList.contains('is-poisoned'))add(id+'-poison','poisonAura',mark,7,colors.poison);
                if(card.classList.contains('is-bleeding'))add(id+'-bleed','bleedAura',mark,8,colors.bleed);
                if(card.classList.contains('has-rimeBrand')||card.classList.contains('is-frozen'))add(id+'-ice','coldAura',mark,9,colors.cold);
                if(card.classList.contains('has-emberBrand'))fire(id+'-ember','emberAura',mark,true);
                if(card.classList.contains('is-righteous-fire'))fire(id+'-fire','righteousFire',card);
            }
            if(elements.playerHealthPanel.classList.contains('is-righteous-fire'))fire('player-fire','righteousFire',elements.playerHealthPanel);
            for(const buff of elements.buffList.children)if(buff.classList.contains('is-proccing'))descriptors.push({key:'buff-'+buff.dataset.buffId,type:'buffGlow',...box(buff),style:2,color:colors.void,opacity:.85,category:'glows'});
        }
        gpu().setAmbient(descriptors);
    }
    addEventListener('combat-webgl-clear',()=>{localBounds=new WeakMap();playerGlow=null;});
    addEventListener('combat-renderer-status',()=>{document.body.classList.remove('combat-webgl-active');localBounds=new WeakMap();});
    addEventListener('combat-settings-change',sync);
    window.CombatWebGLEffects={arrow,eruption,elemental,shield,vortex,spells,impact,transfer,glow,pulse,lootFlash,sync};
}());
