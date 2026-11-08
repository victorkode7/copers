(function(){
    'use strict';
    const GRID=4,FRAMES=16;
    const weaponSprites=new WeakMap();
    const bloodSprites=new WeakMap();
    const DEFAULT_BLOOD='assets/effects/blood-4x4-normalized.png';
    const PREPARED_BLOOD='assets/effects/blood-4x4-clean.png';
    const bloodKey=({rotation=-85,scale=.92,x=0,y=0,reveal=true}={})=>JSON.stringify([rotation,scale,x,y,reveal]);
    // Opaque cutting-surface point measured in frame 6, halfway through the
    // source's rotating frames 0–12. Coordinates are relative to the hilt pivot.
    const MID_SWING_CONTACT=Object.freeze({x:-187/768,y:230/768});
    const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
    const smooth=value=>{const t=clamp(value,0,1);return t*t*(3-2*t);};
    const dimensions=image=>({width:image.naturalWidth||image.width,height:image.naturalHeight||image.height});
    const load=source=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Could not load scythe asset: '+source));image.src=source;});

    class ScytheReapEffect {
        constructor({weaponSrc='assets/effects/scythe-ccw-270-4x4.png',bloodSrc=DEFAULT_BLOOD,weaponImage,bloodImage,preparedBloodSrc,
            size=512,duration=600,speed=1,onComplete=()=>{},bloodAlignment={},now=()=>performance.now(),
            requestFrame=callback=>requestAnimationFrame(callback),cancelFrame=id=>cancelAnimationFrame(id)}={}){
            if(![size,duration,speed].every(value=>Number.isFinite(value)&&value>0))throw new Error('Size, duration and speed must be positive.');
            Object.assign(this,{size,duration,speed,onComplete,now,requestFrame,cancelFrame});
            // Only blood is calibrated. Weapon frames already contain all rotation.
            this.bloodAlignment={rotation:-85,scale:.92,x:0,y:0,reveal:true,...bloodAlignment};
            const preparedSrc=preparedBloodSrc===undefined?(!bloodImage&&bloodSrc===DEFAULT_BLOOD&&bloodKey(this.bloodAlignment)===bloodKey()?PREPARED_BLOOD:null):preparedBloodSrc;
            this.active=new Set();this.frame=null;
            this.ready=Promise.all([weaponImage?Promise.resolve(weaponImage):load(weaponSrc),bloodImage?Promise.resolve(bloodImage):load(bloodSrc),preparedSrc?load(preparedSrc):Promise.resolve(null)])
                .then(([weapon,blood,prepared])=>{
                    const weaponSize=dimensions(weapon),bloodSize=dimensions(blood);
                    if(!weaponSize.width||weaponSize.width!==weaponSize.height||weaponSize.width%GRID)throw new Error('Weapon requires sixteen equal square source frames.');
                    if(!bloodSize.width||!bloodSize.height)throw new Error('Blood sprite sheet is empty.');
                    this.weaponImage=weapon;this.weaponSprite=ScytheReapEffect.maskHilt(weapon);
                    this.bloodImage=bloodSize.width%GRID||bloodSize.height%GRID?ScytheReapEffect.normalizeBlood(blood):blood;
                    if(prepared){
                        const size=dimensions(prepared);
                        if(size.width!==dimensions(this.bloodImage).width||size.height!==dimensions(this.bloodImage).height)throw new Error('Prepared blood dimensions must match its source grid.');
                        let variants=bloodSprites.get(this.bloodImage);if(!variants){variants=new Map();bloodSprites.set(this.bloodImage,variants);}
                        variants.set(bloodKey(this.bloodAlignment),prepared);
                    }
                    this.bloodSprite=prepared||ScytheReapEffect.prepareBlood(this.bloodImage,this.bloodAlignment);
                    return this;
                });
        }
        static frameRect(image,index){
            const {width,height}=dimensions(image),frame=clamp(Math.floor(index),0,FRAMES-1);
            return {x:frame%GRID*width/GRID,y:Math.floor(frame/GRID)*height/GRID,width:width/GRID,height:height/GRID};
        }
        static maskHilt(image){
            if(weaponSprites.has(image))return weaponSprites.get(image);
            const {width,height}=dimensions(image),sheet=document.createElement('canvas');sheet.width=width;sheet.height=height;
            const context=sheet.getContext('2d');context.drawImage(image,0,0);
            const cell=width/GRID;
            // Every source pose has the same grip pivot at its cell center.
            // Remove just the small hilt end at that pivot. Keep the long shaft
            // opaque, with a short feather into it to soften the removed end.
            context.globalCompositeOperation='destination-in';
            for(let index=0;index<FRAMES;index++){
                const left=index%GRID*cell,top=Math.floor(index/GRID)*cell;
                const fade=context.createRadialGradient(left+cell/2,top+cell/2,cell*.014,left+cell/2,top+cell/2,cell*.028);
                fade.addColorStop(0,'rgba(255,255,255,0)');fade.addColorStop(.25,'rgba(255,255,255,.15625)');
                fade.addColorStop(.5,'rgba(255,255,255,.5)');fade.addColorStop(.75,'rgba(255,255,255,.84375)');fade.addColorStop(1,'white');
                context.save();context.beginPath();context.rect(left,top,cell,cell);context.clip();
                context.fillStyle=fade;context.fillRect(left,top,cell,cell);context.restore();
            }
            weaponSprites.set(image,sheet);return sheet;
        }
        static normalizeBlood(image,frameSize=512,gutter=4){
            const source=dimensions(image),sheet=document.createElement('canvas');sheet.width=sheet.height=GRID*frameSize;
            const context=sheet.getContext('2d');context.imageSmoothingQuality='high';
            for(let index=0;index<FRAMES;index++){
                const column=index%GRID,row=Math.floor(index/GRID);
                const x=Math.round(column*source.width/GRID),right=Math.round((column+1)*source.width/GRID);
                const y=Math.round(row*source.height/GRID),bottom=Math.round((row+1)*source.height/GRID);
                // Isolate first: resampling must never read a neighboring cell.
                const cell=document.createElement('canvas');cell.width=right-x;cell.height=bottom-y;
                cell.getContext('2d').drawImage(image,x,y,cell.width,cell.height,0,0,cell.width,cell.height);
                const scale=(frameSize-2*gutter)/Math.max(cell.width,cell.height),width=cell.width*scale,height=cell.height*scale;
                context.drawImage(cell,column*frameSize+(frameSize-width)/2,row*frameSize+(frameSize-height)/2,width,height);
            }
            return sheet;
        }
        static prepareBlood(image,{rotation=-85,scale=.92,x=0,y=0,reveal=true}={}){
            let variants=bloodSprites.get(image);
            if(!variants){variants=new Map();bloodSprites.set(image,variants);}
            const key=bloodKey({rotation,scale,x,y,reveal});if(variants.has(key))return variants.get(key);
            const {width,height}=dimensions(image),sheet=document.createElement('canvas');sheet.width=width;sheet.height=height;
            const context=sheet.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
            const pixels=context.getImageData(0,0,width,height),data=pixels.data,frameWidth=width/GRID,frameHeight=height/GRID;
            const turn=Math.PI*2,start=-85*Math.PI/180,radians=rotation*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians);
            const feather=Math.min(frameWidth,frameHeight)*.04;
            for(let index=0;index<FRAMES;index++){
                const left=index%GRID*frameWidth,top=Math.floor(index/GRID)*frameHeight;
                const sweep=(30+22.5*Math.min(index,12))*Math.PI/180;
                for(let row=0;row<frameHeight;row++)for(let column=0;column<frameWidth;column++){
                    const offset=((top+row)*width+left+column)*4,alpha=data[offset+3];
                    // The source has a low-alpha rectangular background. Soft-key
                    // that residue while preserving the bright arc unchanged.
                    let coverage=smooth((alpha-24)/56);
                    const edge=Math.min(column,row,frameWidth-1-column,frameHeight-1-row);
                    coverage*=smooth(edge/feather);
                    if(coverage&&reveal){
                        // Calibrate into the same battlefield space as the blade,
                        // then feather both ends of its already-swept sector.
                        const localX=((column+.5)/frameWidth-.5)*scale,localY=((row+.5)/frameHeight-.5)*scale;
                        const fieldX=localX*c-localY*s+x,fieldY=localX*s+localY*c+y;
                        const distance=(start-Math.atan2(fieldY,fieldX)+turn)%turn;
                        coverage*=distance>sweep?0:smooth(Math.min(distance,sweep-distance)/.1);
                        coverage*=smooth((.8-Math.hypot(fieldX,fieldY))/.025);
                    }
                    data[offset+3]=Math.round(alpha*coverage);
                    if(!data[offset+3])data[offset]=data[offset+1]=data[offset+2]=0;
                }
            }
            context.putImageData(pixels,0,0);variants.set(key,sheet);return sheet;
        }
        static stateAt(elapsed,duration=600){
            const frameIndex=clamp(Math.floor(Math.max(0,elapsed)/duration*FRAMES),0,FRAMES-1);
            return {frameIndex,weaponFrame:frameIndex,bloodFrame:frameIndex,
                weaponAlpha:clamp((13-frameIndex)/3,0,1),
                bloodAlpha:frameIndex<3?0:frameIndex>=13?(15-frameIndex)/3:Math.min(1,(frameIndex-2)/3)};
        }
        play({target,position,size=this.size,duration=this.duration,speed=this.speed,facing=0,onComplete=this.onComplete,onHit=()=>{},restart=false,reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches,freezeAt}={}){
            if(!this.weaponImage)throw new Error('Await effect.ready before calling play().');
            if(![size,duration,speed].every(value=>Number.isFinite(value)&&value>0)||!Number.isFinite(facing))throw new Error('Size, duration and speed must be positive; facing must be finite.');
            if(restart)this.clear();
            const cast={target,position:position?{...position}:null,size,facing,duration:duration/speed,onComplete,onHit,reducedMotion,freezeAt,
                born:this.now(),frameIndex:0,hit:false,finished:false,finishing:false};
            this.active.add(cast);this.ensureCanvas();this.wake();
            return {cancel:()=>this.finish(cast,true),pause:()=>{if(cast.freezeAt===undefined)cast.freezeAt=Math.max(0,this.now()-cast.born);},
                seek:frame=>{cast.freezeAt=(clamp(frame,0,15)+.5)/FRAMES*cast.duration;},
                resume:()=>{cast.born=this.now()-(cast.freezeAt||0);cast.freezeAt=undefined;},
                get frameIndex(){return cast.frameIndex;},get finished(){return cast.finished;}};
        }
        ensureCanvas(){
            if(this.canvas)return;
            this.element=document.createElement('div');this.element.className='scythe-reap-effect';this.element.setAttribute('aria-hidden','true');
            this.element.style.cssText='position:fixed;inset:0;z-index:9;pointer-events:none;overflow:visible;';
            this.canvas=document.createElement('canvas');this.canvas.style.cssText='width:100%;height:100%;display:block;pointer-events:none;';
            this.element.append(this.canvas);document.body.append(this.element);this.context=this.canvas.getContext('2d');this.lastPresentation=null;
        }
        wake(){if(this.frame===null)this.frame=this.requestFrame(()=>this.tick());}
        finish(cast,cancelled=false){
            if(cast.finished)return;cast.finished=true;this.active.delete(cast);
            try{cast.onComplete({cancelled,frameIndex:cast.frameIndex});}catch(error){console.error('Scythe completion callback failed.',error);}
            if(!this.active.size){if(this.frame!==null)this.cancelFrame(this.frame);this.frame=null;this.element?.remove();this.element=this.canvas=this.context=null;this.lastPresentation=null;}
        }
        clear(){[...this.active].forEach(cast=>this.finish(cast,true));}
        drawFrame(context,index,x,y,size,{bloodAlpha=ScytheReapEffect.stateAt((index+.5)/FRAMES*600).bloodAlpha,
            weaponAlpha=ScytheReapEffect.stateAt((index+.5)/FRAMES*600).weaponAlpha,alpha=1,facing=0}={}){
            const blood=ScytheReapEffect.frameRect(this.bloodImage,index),weapon=ScytheReapEffect.frameRect(this.weaponImage,index),alignment=this.bloodAlignment;
            context.save();context.translate(x,y);
            // A constant facing aims the whole cast; rotation over time still
            // comes exclusively from the source frames. Blood shares this aim.
            if(facing)context.rotate(facing);
            // Fade during the last moving poses, then omit the held weapon frames.
            if(weaponAlpha>0){
                context.globalAlpha=alpha*weaponAlpha;context.globalCompositeOperation='source-over';
                context.drawImage(this.weaponSprite,weapon.x,weapon.y,weapon.width,weapon.height,-size/2,-size/2,size,size);
            }
            // Blood is the foreground layer and covers the weapon beneath it.
            if(bloodAlpha>0){
                context.save();context.globalAlpha=alpha*bloodAlpha;context.globalCompositeOperation='source-over';
                context.translate(alignment.x*size,alignment.y*size);context.rotate(alignment.rotation*Math.PI/180);
                const bloodSize=size*alignment.scale;
                context.drawImage(this.bloodSprite,blood.x,blood.y,blood.width,blood.height,-bloodSize/2,-bloodSize/2,bloodSize,bloodSize);context.restore();
            }
            context.restore();
        }
        tick(){
            this.frame=null;if(!this.canvas)return;
            const ratio=Math.min(devicePixelRatio||1,2),viewportWidth=innerWidth,viewportHeight=innerHeight;
            const width=Math.round(viewportWidth*ratio),height=Math.round(viewportHeight*ratio),context=this.context;
            // Several echoes can follow the same card. Share its position only
            // within this frame so scrolling, shaking and resizing still track.
            const paints=[],positions=new Map();
            for(const cast of [...this.active]){
                if(cast.finishing){this.finish(cast);continue;}
                const target=typeof cast.target==='function'?cast.target():cast.target;
                let position=cast.position;
                if(target){
                    if(!target.isConnected){this.finish(cast,true);continue;}
                    if(!positions.has(target)){
                        const rect=target.getBoundingClientRect();
                        positions.set(target,rect.width&&rect.height?{x:rect.left+rect.width/2,y:rect.top+rect.height/2}:null);
                    }
                    position=positions.get(target);
                    if(!position){this.finish(cast,true);continue;}
                }
                position||={x:innerWidth/2,y:innerHeight/2};
                const elapsed=cast.freezeAt??Math.max(0,this.now()-cast.born),state=ScytheReapEffect.stateAt(elapsed,cast.duration);cast.frameIndex=state.frameIndex;
                if(!cast.hit&&state.frameIndex>=5){cast.hit=true;try{cast.onHit({frameIndex:Math.min(10,state.frameIndex)});}catch(error){this.finish(cast,true);console.error('Scythe hit callback failed.',error);continue;}}
                if(!this.active.has(cast)||!this.context)continue;
                paints.push({cast,index:cast.reducedMotion?12:state.frameIndex,position,weaponAlpha:state.weaponAlpha,
                    bloodAlpha:cast.reducedMotion?0.5:state.bloodAlpha,alpha:cast.reducedMotion?Math.max(0,1-elapsed/cast.duration):1});
                if(cast.freezeAt===undefined&&elapsed>=cast.duration)cast.finishing=true;
            }
            // Hit/completion callbacks can cancel or modify earlier casts.
            // Snapshot the scene only after all callbacks for this tick finish.
            let visible=0;
            for(const paint of paints){
                if(!this.active.has(paint.cast))continue;
                paint.x=paint.position.x;paint.y=paint.position.y;paint.size=paint.cast.size;paint.facing=paint.cast.facing;
                paints[visible++]=paint;
            }
            paints.length=visible;
            if(this.context===context){
                const previous=this.lastPresentation,resized=this.canvas.width!==width||this.canvas.height!==height;
                const unchanged=!resized&&previous&&previous.width===viewportWidth&&previous.height===viewportHeight&&previous.ratio===ratio&&previous.paints.length===paints.length&&paints.every((paint,index)=>{
                    const old=previous.paints[index];
                    return paint.cast===old.cast&&paint.index===old.index&&paint.x===old.x&&paint.y===old.y&&paint.size===old.size&&paint.facing===old.facing&&
                        paint.weaponAlpha===old.weaponAlpha&&paint.bloodAlpha===old.bloodAlpha&&paint.alpha===old.alpha;
                });
                // Sprite frames advance much slower than high-refresh displays.
                // Keep the existing pixels until something visible changes.
                if(!unchanged){
                    if(resized){this.canvas.width=width;this.canvas.height=height;}
                    context.setTransform(ratio,0,0,ratio,0,0);context.clearRect(0,0,viewportWidth,viewportHeight);context.imageSmoothingQuality='high';
                    // Keep every blood layer above every weapon across casts.
                    for(const layer of ['weapon','blood'])for(const paint of paints){
                        const {cast,index,x,y,size,facing,weaponAlpha,bloodAlpha,alpha}=paint;
                        if(!this.active.has(cast)||this.context!==context)continue;
                        this.drawFrame(context,index,x,y,size,
                            {weaponAlpha:layer==='weapon'?weaponAlpha:0,bloodAlpha:layer==='blood'?bloodAlpha:0,alpha,facing});
                    }
                    if(this.context===context)this.lastPresentation={paints,width:viewportWidth,height:viewportHeight,ratio};
                }
            }
            if(this.active.size)this.wake();
        }
    }
    ScytheReapEffect.frames=FRAMES;ScytheReapEffect.grid=GRID;
    ScytheReapEffect.midSwingContact=MID_SWING_CONTACT;
    window.ScytheReapEffect=ScytheReapEffect;
    const effect=new ScytheReapEffect();let ready=false;
    let referenceSize=null;
    effect.ready.then(()=>{ready=true;}).catch(error=>console.warn(error.message));
    function layout(rect,affected,angle=-Math.PI/4,formation=affected,gap={x:8,y:8}){
        const pivot={x:rect.left+rect.width/2,y:rect.top+rect.height/2};
        const offsetsFor=boxes=>boxes.filter(bounds=>bounds.width&&bounds.height).map(bounds=>({x:bounds.left+bounds.width/2-pivot.x,y:bounds.top+bounds.height/2-pivot.y}));
        const offsets=offsetsFor(affected),slots=offsetsFor(formation);
        const diagonal=offsets.find(point=>Math.abs(point.x)>rect.width*.5&&Math.abs(point.y)>rect.height*.5);
        const contact=MID_SWING_CONTACT;
        // Keep a full formation-sized sweep even if only the origin is alive.
        // Dead card slots still describe spacing; a lone slot uses its CSS gap.
        const xSteps=slots.filter(point=>Math.abs(point.x)>rect.width*.5&&Math.abs(point.y)<rect.height*.5).map(point=>Math.abs(point.x));
        const ySteps=slots.filter(point=>Math.abs(point.y)>rect.height*.5&&Math.abs(point.x)<rect.width*.5).map(point=>Math.abs(point.y));
        const stepX=xSteps.length?Math.min(...xSteps):rect.width+gap.x,stepY=ySteps.length?Math.min(...ySteps):rect.height+gap.y;
        const reach=diagonal?Math.hypot(diagonal.x,diagonal.y):Math.hypot(stepX,stepY);
        return {size:reach/Math.hypot(contact.x,contact.y),pivot,
            facing:(diagonal?Math.atan2(diagonal.y,diagonal.x):angle)-Math.atan2(contact.y,contact.x)};
    }
    function compactSize(card){
        const host=elements.enemyRoster.parentElement,hostStyle=getComputedStyle(host);
        const width=host.clientWidth-(parseFloat(hostStyle.paddingLeft)||0)-(parseFloat(hostStyle.paddingRight)||0);
        const key=[width,host.getBoundingClientRect().width,innerWidth,getComputedStyle(document.documentElement).fontSize].join(':');
        if(referenceSize?.key===key)return referenceSize.size;
        // Measure the same compact formation for every encounter. Its eight
        // hidden slots fill all four possible columns and provide a second row.
        const probe=document.createElement('div');probe.className='enemy-roster has-multiple is-crowded';
        probe.setAttribute('aria-hidden','true');probe.inert=true;probe.dataset.reapReference='';
        probe.style.cssText='position:absolute;top:0;left:0;visibility:hidden;pointer-events:none;contain:layout paint;width:'+width+'px;';
        for(let index=0;index<8;index++){
            const slot=card.cloneNode(true);slot.removeAttribute('id');slot.removeAttribute('data-monster-id');slot.className='enemy-card';
            slot.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));probe.append(slot);
        }
        host.append(probe);
        try{
            const boxes=Array.from(probe.children).map(slot=>slot.getBoundingClientRect()),style=getComputedStyle(probe);
            const size=layout(boxes[0],boxes.slice(1),-Math.PI/4,boxes,{x:parseFloat(style.columnGap)||0,y:parseFloat(style.rowGap)||0}).size;
            referenceSize={key,size};return size;
        }finally{probe.remove();}
    }
    function show(targetId,plan=ReapTargeting.select(state.monsterStates,targetId,state.monsterColumns)){
        if(!ready||document.hidden||!combatEffectEnabled('abilities'))return false;
        const target=()=>getCombatEffectCard(targetId),card=target();if(!card?.getClientRects().length)return false;
        const rect=card.getBoundingClientRect(),affected=plan.targetIds.filter(id=>id!==targetId).map(getCombatEffectCard).filter(Boolean).map(card=>card.getBoundingClientRect());
        // Facing depends on the selected neighbors; display size comes from
        // compactSize, so measuring the rest of the roster serves no purpose.
        const placement=layout(rect,affected,plan.angle);
        effect.play({target,size:compactSize(card),facing:placement.facing,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});return true;
    }
    addEventListener('resize',()=>{referenceSize=null;});
    document.fonts?.addEventListener('loadingdone',()=>{referenceSize=null;});
    addEventListener('combat-settings-change',()=>effect.clear());addEventListener('visibilitychange',()=>{if(document.hidden)effect.clear();});
    window.ReapSprite={show,layout,clear:()=>effect.clear(),ready:effect.ready};
}());
