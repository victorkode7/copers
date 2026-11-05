(function () {
    'use strict';
    const GRID=8,FRAMES=GRID*GRID,HIT_START=20,HIT_END=40;
    // Await ready, then play({target: card, targets: affectedCards, onHit}).
    // onHit fires once on crossing frames 20–40, even if the browser skips frames.
    // The game adapter below leaves actual combat damage to its simulation clock.
    class ReapSpritePlayer {
        constructor({src,image,duration=480,composite='screen',now=()=>performance.now(),requestFrame=callback=>requestAnimationFrame(callback),cancelFrame=id=>cancelAnimationFrame(id)}={}) {
            if(!Number.isFinite(duration)||duration<=0)throw new Error('Animation duration must be positive.');
            if(!['screen','lighten','source-over'].includes(composite))throw new Error('Unsupported sprite blend mode.');
            this.duration=duration;this.composite=composite;this.now=now;this.requestFrame=requestFrame;this.cancelFrame=cancelFrame;
            this.active=new Set();this.frame=null;this.image=null;
            this.ready=image?Promise.resolve(image):new Promise((resolve,reject)=>{
                const asset=new Image();asset.onload=()=>resolve(asset);asset.onerror=()=>reject(new Error('Could not load Reap sprite sheet: '+src));asset.src=src;
            });
            this.ready=this.ready.then(asset=>{
                if(!(asset.naturalWidth||asset.width)||!(asset.naturalHeight||asset.height))throw new Error('Sprite sheet is empty.');
                this.image=asset;return this;
            });
        }
        static frameRect(image,frameIndex) {
            const frameWidth=(image.naturalWidth||image.width)/GRID,frameHeight=(image.naturalHeight||image.height)/GRID;
            const index=Math.max(0,Math.min(FRAMES-1,Math.floor(frameIndex)));
            return {x:(index%GRID)*frameWidth,y:Math.floor(index/GRID)*frameHeight,width:frameWidth,height:frameHeight};
        }
        play({target,targets=[],size,placement,clip,pivot={x:.5,y:.5},onHit=()=>{},onComplete=()=>{},reducedMotion=false}={}) {
            if(!this.image)throw new Error('Await player.ready before playing the sprite.');
            const cast={target,targets:typeof targets==='function'?targets:[...targets],size,placement,clip,pivot,onHit,onComplete,reducedMotion,born:this.now(),frameIndex:0,hit:false,finishing:false,finished:false};
            this.active.add(cast);this.ensureCanvas();if(this.frame===null)this.frame=this.requestFrame(()=>this.tick());
            return {cancel:()=>this.finish(cast,true),get frameIndex(){return cast.frameIndex;},get finished(){return cast.finished;}};
        }
        ensureCanvas() {
            if(this.canvas)return;
            this.canvas=document.createElement('canvas');this.canvas.className='reap-sprite-canvas';this.canvas.setAttribute('aria-hidden','true');
            this.canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9;mix-blend-mode:'+this.composite+';';
            document.body.append(this.canvas);this.context=this.canvas.getContext('2d');
        }
        finish(cast,cancelled=false) {
            if(cast.finished)return;cast.finished=true;this.active.delete(cast);
            try{cast.onComplete({cancelled});}catch(error){console.error('Reap completion callback failed.',error);}finally{
                if(!this.active.size){if(this.frame!==null)this.cancelFrame(this.frame);this.frame=null;this.canvas?.remove();this.canvas=null;this.context=null;}
            }
        }
        clear(){[...this.active].forEach(cast=>this.finish(cast,true));}
        tick() {
            this.frame=null;if(!this.canvas)return;
            const ratio=Math.min(devicePixelRatio||1,1.5),width=Math.round(innerWidth*ratio),height=Math.round(innerHeight*ratio);
            if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
            const context=this.context;context.setTransform(ratio,0,0,ratio,0,0);context.clearRect(0,0,innerWidth,innerHeight);
            context.globalCompositeOperation=this.composite;context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
            const now=this.now();
            for(const cast of [...this.active]) {
                if(cast.finishing){this.finish(cast);continue;}
                const target=typeof cast.target==='function'?cast.target():cast.target;
                if(!target?.isConnected){this.finish(cast,true);continue;}
                const rect=target.getBoundingClientRect();
                if(!rect.width||!rect.height){this.finish(cast,true);continue;}
                const elapsed=Math.max(0,now-cast.born),rawFrame=Math.floor(elapsed/this.duration*FRAMES);
                cast.frameIndex=Math.min(FRAMES-1,rawFrame);
                // Crossing the window still hits exactly once after a dropped frame.
                if(!cast.hit&&rawFrame>=HIT_START){
                    cast.hit=true;
                    try{cast.onHit({frameIndex:Math.min(HIT_END,cast.frameIndex),targets:typeof cast.targets==='function'?cast.targets():cast.targets,elapsed:Math.min(elapsed,this.duration*HIT_END/FRAMES)});}
                    catch(error){this.finish(cast,true);console.error('Reap hit callback failed.',error);continue;}
                }
                if(!this.active.has(cast)||!this.context)continue;
                const affected=typeof cast.targets==='function'?cast.targets():cast.targets;
                const layout=cast.placement?.(rect,affected.map(card=>card.getBoundingClientRect()))||{};
                const size=layout.size||cast.size||Math.max(180,Math.min(420,rect.width*1.3));
                const frame=ReapSpritePlayer.frameRect(this.image,cast.reducedMotion?30:cast.frameIndex);
                context.save();
                const clip=cast.clip?.();if(clip){context.beginPath();context.rect(clip.left,clip.top,clip.width,clip.height);context.clip();}
                context.globalAlpha=cast.reducedMotion?Math.max(0,1-elapsed/this.duration):1;
                // Every tile is registered to the grip end; only the artwork
                // changes between frames. The world-space hilt pivot stays put.
                context.translate(rect.left+rect.width/2,rect.top+rect.height/2);context.rotate(layout.rotation||0);
                context.drawImage(this.image,frame.x,frame.y,frame.width,frame.height,-size*cast.pivot.x,-size*cast.pivot.y,size,size);
                context.restore();
                // Hold frame 63 for a paint before removing the canvas next RAF.
                if(elapsed>=this.duration)cast.finishing=true;
            }
            if(this.active.size&&this.frame===null)this.frame=this.requestFrame(()=>this.tick());
        }
    }
    ReapSpritePlayer.grid=GRID;ReapSpritePlayer.frames=FRAMES;ReapSpritePlayer.hitWindow=Object.freeze([HIT_START,HIT_END]);
    window.ReapSpritePlayer=ReapSpritePlayer;
    const player=new ReapSpritePlayer({src:'assets/effects/reap-sheet-v2.png'});
    let ready=false;player.ready.then(()=>{ready=true;}).catch(error=>console.warn(error.message));
    function layout(rect,affected,angle=0){
        const center={x:rect.left+rect.width/2,y:rect.top+rect.height/2};
        const others=affected.filter(bounds=>bounds.width&&bounds.height).map(bounds=>({x:bounds.left+bounds.width/2-center.x,y:bounds.top+bounds.height/2-center.y,padding:Math.min(bounds.width,bounds.height)*.12}));
        const direction=others.reduce((sum,point)=>({x:sum.x+point.x,y:sum.y+point.y}),{x:0,y:0});
        const reach=Math.max(Math.max(rect.width,rect.height)*.5,...others.map(point=>Math.hypot(point.x,point.y)+point.padding));
        return {size:reach/.44,rotation:Math.hypot(direction.x,direction.y)>1?Math.atan2(direction.y,direction.x):angle,pivot:center};
    }
    const show=(targetId,plan=ReapTargeting.select(state.monsterStates,targetId,state.monsterColumns))=>{
        if(!ready||document.hidden||!combatEffectEnabled('abilities'))return false;
        const target=()=>getCombatEffectCard(targetId);if(!target()?.getClientRects().length)return false;
        const targetIds=plan.targetIds.slice(0,4);
        player.play({target,targets:()=>targetIds.filter(id=>id!==targetId).map(getCombatEffectCard).filter(Boolean),
            placement:(rect,others)=>layout(rect,others,plan.angle),clip:()=>elements.combatPanel.getBoundingClientRect(),
            reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});return true;
    };
    addEventListener('combat-settings-change',()=>player.clear());
    addEventListener('visibilitychange',()=>{if(document.hidden)player.clear();});
    window.ReapSprite={show,layout,clear:()=>player.clear(),ready:player.ready};
}());
