// Isolated diagnostics only: counts submitted drawing work, not GPU execution time.
(function(){
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    async function run(scenario){
        const setup=await PerformanceAudit.prepare({count:64}),sprite=await ReapSprite.ready;
        const frames=[],counts={webglDraws:0,spriteDraws:0,canvasClears:0};let frame,last,replenisher;
        const draw=WebGLRenderingContext.prototype.drawArrays,imageDraw=CanvasRenderingContext2D.prototype.drawImage,clear=CanvasRenderingContext2D.prototype.clearRect;
        WebGLRenderingContext.prototype.drawArrays=function(...args){counts.webglDraws++;return draw.apply(this,args);};
        CanvasRenderingContext2D.prototype.drawImage=function(...args){counts.spriteDraws++;return imageDraw.apply(this,args);};
        CanvasRenderingContext2D.prototype.clearRect=function(...args){counts.canvasClears++;return clear.apply(this,args);};
        const monitor=now=>{if(last!==undefined)frames.push(now-last);last=now;frame=requestAnimationFrame(monitor);};
        const ids=state.monsterStates.slice(0,8).map(monster=>monster.id);
        const replenish=()=>{while(sprite.active.size<32){const id=ids[sprite.active.size%ids.length];sprite.play({target:()=>getCombatEffectCard(id),size:1000,facing:sprite.active.size%4*Math.PI/2});}};
        let status;
        const started=performance.now();
        try{
            if(scenario==='ambient'){
                for(const card of elements.enemyRoster.children)card.classList.add('is-poisoned');
                CombatWebGLEffects.sync();
            }
            if(scenario==='reap32'){replenish();replenisher=auditSetInterval(replenish,100);}
            frame=requestAnimationFrame(monitor);await wait(2400);status=CombatWebGL.status();
            if(smokeErrors.length)throw new Error(smokeErrors.join('\n'));
            const elapsed=performance.now()-started,sorted=[...frames].sort((a,b)=>a-b);
            return {scenario,setup,elapsedMs:Math.round(elapsed),animationCallbacksPerSecond:Math.round(frames.length*1000/elapsed),frameP95Ms:sorted[Math.floor(sorted.length*.95)],
                ...counts,webglDrawsPerSecond:Math.round(counts.webglDraws*1000/elapsed),spriteDrawsPerSecond:Math.round(counts.spriteDraws*1000/elapsed),canvasClearsPerSecond:Math.round(counts.canvasClears*1000/elapsed),
                webglStatus:status,activeReaps:sprite.active.size,canvases:[...document.querySelectorAll('.combat-webgl-layer,.scythe-reap-effect canvas')].map(canvas=>({className:canvas.className,width:canvas.width,height:canvas.height}))};
        }finally{
            cancelAnimationFrame(frame);clearInterval(replenisher);ReapSprite.clear();CombatWebGL.clear();
            WebGLRenderingContext.prototype.drawArrays=draw;CanvasRenderingContext2D.prototype.drawImage=imageDraw;CanvasRenderingContext2D.prototype.clearRect=clear;
        }
    }
    window.BrowserGpuDiagnostic={run};
}());
