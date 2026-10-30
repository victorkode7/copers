(async function () {
    const checks=[],originalPanel=elements.combatPanel;
    const check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
    const panel=document.createElement('div');
    panel.style.cssText='position:fixed;left:40px;top:40px;width:680px;height:600px;background:#14202b';
    const select=document.getElementById('combatEffectRenderer');
    let canvas,gl;
    function capture() {
        const pixels=new Uint8Array(canvas.width*canvas.height*4);
        gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        return (x,y)=>{
            const px=Math.floor((x+40)*canvas.width/document.documentElement.clientWidth);
            const py=canvas.height-1-Math.floor((y+40)*canvas.height/innerHeight);
            return pixels[(py*canvas.width+px)*4+3];
        };
    }
    function scene() {
        CombatWebGL.clear();CombatWebGL.ready(panel,'projectiles');
        for(const [x,y,rotation] of [[300,90,0],[520,90,Math.PI],[300,180,Math.PI/2],[520,180,-Math.PI/2]]) {
            const source=document.createElement('div'),target=document.createElement('div');
            source.style.cssText=`position:absolute;left:${x-Math.cos(rotation)*100-1}px;top:${y-Math.sin(rotation)*100-1}px;width:2px;height:2px`;
            target.style.cssText=`position:absolute;left:${x-1}px;top:${y-1}px;width:2px;height:2px`;
            panel.append(source,target);
            CombatWebGLEffects.arrow({source,target,kind:'forkingArrow',direction:0,delay:-500,freezing:false});
            source.remove();target.remove();
        }
        for(const [y,strokeWidth,color,style] of [[300,3,[1,1,1],12],[360,4,[.94,.76,1],15],[420,5,[.85,.73,1],14]]) {
            CombatWebGL.trail({points:[{x:100,y},{x:560,y}],flight:2000,duration:4000,delay:-1000,
                strokeWidth,glowRadius:style===12?4:6,style,color,glowColor:color,type:'preview'});
        }
        CombatWebGL.emit({x:560,y:510,width:64,height:48,style:4,duration:2000,delay:-500,color:[1,.886,.588],category:'projectiles'});
    }
    try {
        select.value='webgl';select.dispatchEvent(new Event('change'));
        for(const key of ['all','abilities','projectiles','glows']) {
            const button=document.querySelector(`[data-effect-setting="${key}"]`);
            if(button.getAttribute('aria-checked')!=='true')button.click();
        }
        for(const child of document.body.children)if(child.tagName!=='SCRIPT'&&!child.classList.contains('combat-webgl-layer'))child.style.display='none';
        document.body.append(panel);elements.combatPanel=panel;
        scene();await nextFrame();await nextFrame();
        canvas=document.querySelector('.combat-webgl-layer');gl=canvas.getContext('webgl');
        let alpha=capture();
        check('fork arrowheads remain filled and outlined at the destination after flight',alpha(290,85)>180&&alpha(290,95)>180&&alpha(301,90)>180);
        check('arrowheads retain their notch rather than becoming triangles',alpha(545,510)<170&&alpha(550,505)>180);
        check('left, down and up arrowheads follow their actual flight direction',alpha(530,85)>180&&alpha(305,170)>180&&alpha(515,190)>180);
        function coreWidth(x,y){let count=0;for(let dy=-12;dy<=12;dy++)if(alpha(x,y+dy)>180)count++;return count;}
        const midpoint=y=>{const solid=[];for(let x=100;x<560;x++)if(alpha(x,y)>180)solid.push(x);return solid[Math.floor(solid.length/2)];};
        let volleyX=midpoint(360),boltX=midpoint(420);
        check('piercing beams keep the original three-pixel core',Math.abs(coreWidth(200,300)-3)<=1);
        check('Void Volley keeps its original four-pixel core',Math.abs(coreWidth(volleyX,360)-4)<=1);
        check('Void Bolt keeps its original five-pixel core',Math.abs(coreWidth(boltX,420)-5)<=1);
        check('beam and spell glows extend beyond their solid cores',alpha(200,308)>20&&alpha(volleyX,370)>20&&alpha(boltX,430)>20);
        document.querySelector('[data-effect-setting="glows"]').click();
        scene();await nextFrame();await nextFrame();alpha=capture();
        boltX=midpoint(420);
        check('turning glows off removes halos while preserving solid projectile cores',alpha(200,308)<5&&alpha(boltX,430)<5&&alpha(boltX,420)>180&&alpha(290,85)>180);
        check('projectiles draw without WebGL or script errors',gl.getError()===gl.NO_ERROR&&!smokeErrors.length);
        document.querySelector('[data-effect-setting="glows"]').click();
        scene();
        // Freeze a representative frame for optional screenshot inspection.
        await nextFrame();await nextFrame();
        const pixels=new Uint8Array(canvas.width*canvas.height*4);
        gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
        const preview=document.createElement('canvas');preview.width=canvas.width;preview.height=canvas.height;
        const context=preview.getContext('2d'),data=context.createImageData(canvas.width,canvas.height);
        for(let y=0;y<canvas.height;y++)data.data.set(pixels.subarray(y*canvas.width*4,(y+1)*canvas.width*4),(canvas.height-1-y)*canvas.width*4);
        context.putImageData(data,0,0);preview.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:4';
        CombatWebGL.clear();document.body.append(preview);
        checks.push('SMOKE PASSED');
    } catch(error){checks.push(error.stack||String(error));}
    finally {elements.combatPanel=originalPanel;}
    const output=document.createElement('pre');output.id='smoke-results';output.textContent=checks.join('\n');
    const report=document.createElement('div');
    report.style.cssText='position:fixed;left:760px;top:50px;color:white;font:14px monospace;width:620px';
    report.append(output);document.body.append(report);
}());
