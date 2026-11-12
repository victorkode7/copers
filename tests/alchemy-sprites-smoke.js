(async function () {
    const checks=[],check=(name,ok)=>{if(!ok)throw new Error(name);checks.push('PASS '+name);};
    const $=id=>document.getElementById(id);
    const preview=new URL(document.currentScript.src).searchParams.get('liquid')||'blue';
    const previewFrame=new URL(document.currentScript.src).searchParams.get('frame');
    try {
        const images=await Promise.all(['cauldron-pixel-idle.png','cauldron-blue-liquid-4x2.png','cauldron-fire-4x2.png','cauldron-red-liquid-4x2.png'].map(async name=>{const image=new Image();image.src='assets/alchemy/'+name;await image.decode();return image;}));
        check('pixel cauldron, both liquid sheets and fire load at native sizes',images[0].naturalWidth===64&&images[0].naturalHeight===64&&[images[1],images[3]].every(image=>image.naturalWidth===256&&image.naturalHeight===128)&&images[2].naturalWidth===1774&&images[2].naturalHeight===887);
        const canvas=document.createElement('canvas');canvas.width=1774;canvas.height=1254;const context=canvas.getContext('2d',{willReadFrequently:true});
        for(const [index,image] of images.entries()) {
            context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0);
            check('sprite '+index+' has a transparent background',context.getImageData(0,0,1,1).data[3]<=1);
            if(index>0)for(let frame=0;frame<8;frame++){
                const size=image.width/4;
                const pixels=context.getImageData(Math.floor(frame%4*size),Math.floor(Math.floor(frame/4)*size),Math.floor(size),Math.floor(size)).data;
                let visible=0;for(let p=3;p<pixels.length;p+=4)if(pixels[p]>16)visible++;
                check('sheet '+index+' frame '+frame+' contains artwork',visible>50);
            }
        }
        clearOfflineRecap();resetCombatClock();state.alchemy=Alchemy.defaults();state.alchemy.unlocked=true;state.professions=Professions.defaults();state.materials={...state.materials,gel:100};state.alchemy.liquids.moonwater.amount=120;state.currentView='alchemy';render();
        check('idle scene shows an empty cauldron',$('alchemyBrewTint').hidden);
        const fire=document.querySelector('.alchemy-fire-overlay'),fireSheet=document.querySelector('.alchemy-fire-sheet');
        check('idle cauldron has no fire',getComputedStyle(fire).visibility==='hidden');
        check('steam has been removed from the scene',!document.querySelector('.alchemy-steam-overlay,.alchemy-steam-sheet'));
        Alchemy.brewBatch(state,'moonveil',3);render();
        const liquid=document.querySelector('.alchemy-liquid-window'),sheet=document.querySelector('.alchemy-liquid-sheet');
        check('liquid uses the matching 64-pixel canvas',liquid.getAttribute('viewBox')==='0 0 64 64'&&liquid.width.baseVal.value===192&&liquid.height.baseVal.value===192);
        check('Moonwater uses the original blue sheet',sheet.getAttribute('href').includes('cauldron-blue-liquid-4x2.png')&&$('alchemyLiquidColor').getAttribute('values')==='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0');
        check('fire appears beneath the new cauldron during brewing',getComputedStyle(fire).visibility==='visible'&&document.querySelector('.alchemy-fire-window').y.baseVal.value===142);
        check('recipe tint preserves the alpha channel',$('alchemyLiquidColor').getAttribute('values').split(' ').slice(-5).join(' ')==='0 0 0 1 0');
        const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
        check('liquid animates only when motion is allowed',getComputedStyle(sheet).animationName===(reduced?'none':'alchemy-liquid-frames'));
        check('native palettes bypass SVG filtering',$('alchemyLiquidLayer').getAttribute('filter')==='none');
        check('fire respects reduced motion',getComputedStyle(fireSheet).animationName===(reduced?'none':'alchemy-sprite-frames'));
        if(!reduced){
            for(const [sprite,size] of [[sheet,64],[fireSheet,443.5]]){
                const animation=sprite.getAnimations()[0];animation.pause();
                const sequence=[0,1,2,3,4,5,6,7,0];
                for(let step=0;step<sequence.length;step++){
                    const frame=sequence[step];animation.currentTime=step*125+1;const style=getComputedStyle(sprite),matrix=sprite===sheet?{e:parseFloat(style.x),f:parseFloat(style.y)}:new DOMMatrix(style.transform);
                    check(size+'px sheet forward step '+step+' selects cell '+frame,matrix.e===-(frame%4)*size&&matrix.f===-Math.floor(frame/4)*size);
                }
                animation.currentTime=0;animation.play();
            }
        }
        const body=document.querySelector('.alchemy-cauldron-body'),outer=$('alchemyBrewTint').firstElementChild;
        async function snapshot(svg,frame=0){
            const composed=svg.cloneNode(true);
            for(const image of composed.querySelectorAll('image')){
                const index=image.getAttribute('href').includes('red-liquid')?3:image.getAttribute('href').includes('blue-liquid')?1:0;
                const assetCanvas=document.createElement('canvas');assetCanvas.width=images[index].width;assetCanvas.height=images[index].height;assetCanvas.getContext('2d').drawImage(images[index],0,0);
                image.setAttribute('href',assetCanvas.toDataURL());image.style.imageRendering='pixelated';
                if(image.classList.contains('alchemy-liquid-sheet')){image.style.x=(-frame%4*64)+'px';image.style.y=(-Math.floor(frame/4)*64)+'px';}
            }
            composed.setAttribute('width','192');composed.setAttribute('height','192');
            const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(composed));await image.decode();return image;
        }
        const [baselineImage,compositeImage]=await Promise.all([snapshot(body),snapshot(outer)]);
        context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(baselineImage,0,0);const originalRim=[...context.getImageData(102,111,1,1).data],originalWall=[...context.getImageData(102,60,1,1).data],originalInside=[...context.getImageData(102,84,1,1).data];
        context.drawImage(compositeImage,0,0);
        const frontPixel=[...context.getImageData(102,111,1,1).data];
        // Slightly translucent edge pixels can round differently when composited twice.
        check('front rim pixels stay above the liquid',frontPixel.slice(0,3).every((value,index)=>Math.abs(value-originalRim[index])<=2)&&frontPixel[3]>=originalRim[3]);
        check('dark back wall remains visible',[...context.getImageData(102,60,1,1).data].join(',')===originalWall.join(','));
        check('liquid still appears inside the opening',[...context.getImageData(102,84,1,1).data].join(',')!==originalInside.join(','));
        for(const color of ['blue','red']) {
            sheet.setAttribute('href','assets/alchemy/cauldron-'+color+'-liquid-4x2.png');
            for(let frame=0;frame<8;frame++){
                const rendered=await snapshot(outer,frame);context.clearRect(0,0,192,192);context.drawImage(baselineImage,0,0);context.drawImage(rendered,0,0);
                const pixels=context.getImageData(78,78,45,15).data;let filled=0;
                for(let pixel=0;pixel<pixels.length;pixel+=4)if(Math.max(pixels[pixel],pixels[pixel+1],pixels[pixel+2])>65)filled++;
                check(color+' frame '+frame+' keeps the liquid surface filled',filled>45*15*.9);
            }
        }
        sheet.setAttribute('href','assets/alchemy/cauldron-blue-liquid-4x2.png');
        check('body and effects share the same responsive canvas',body.getBoundingClientRect().width===outer.getBoundingClientRect().width&&body.getBoundingClientRect().height===outer.getBoundingClientRect().height&&body.getAttribute('viewBox')===outer.getAttribute('viewBox'));
        const background=new Image();background.src='assets/alchemy/apothecary-background.png';await background.decode();
        check('scene loads the new Apothecary background',background.naturalWidth===300&&background.naturalHeight===300&&getComputedStyle($('alchemyScene')).backgroundImage.includes('apothecary-background.png'));
        Alchemy.cancel(state);state.professions.xp.alchemy=Professions.xpForLevel(6);state.alchemy.liquids.emberOil.unlocked=true;state.alchemy.liquids.emberOil.amount=120;state.materials.fang=100;state.materials.crystal=100;
        Alchemy.brewBatch(state,'emberheart',2);render();
        check('Ember Oil uses the original red sheet without recoloring',sheet.getAttribute('href').includes('cauldron-red-liquid-4x2.png')&&$('alchemyLiquidColor').getAttribute('values')==='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0');
        Alchemy.cancel(state);Alchemy.brewBatch(state,'twilight',2);render();
        check('mixed recipes tint the blue sheet purple',sheet.getAttribute('href').includes('cauldron-blue-liquid-4x2.png')&&$('alchemyScene').style.getPropertyValue('--brew-color')==='rgb(195, 162, 239)'&&$('alchemyLiquidColor').getAttribute('values')!=='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0');
        check('mixed tint uses a fixed full-canvas filter region',$('alchemyLiquidTint').getAttribute('filterUnits')==='userSpaceOnUse'&&$('alchemyLiquidTint').getAttribute('width')==='192'&&$('alchemyLiquidTint').getAttribute('height')==='192');
        for(let frame=0;frame<8;frame++){
            const rendered=await snapshot(outer,frame);context.clearRect(0,0,192,192);context.drawImage(baselineImage,0,0);context.drawImage(rendered,0,0);
            const pixels=context.getImageData(78,78,45,15).data;let filled=0;
            for(let pixel=0;pixel<pixels.length;pixel+=4)if(Math.max(pixels[pixel],pixels[pixel+1],pixels[pixel+2])>65)filled++;
            check('mixed frame '+frame+' keeps the liquid surface filled',filled>45*15*.9);
        }
        Alchemy.cancel(state);Alchemy.brewBatch(state,preview==='red'?'emberheart':preview==='mixed'?'twilight':'moonveil',2);render();
        if(previewFrame!==null&&!reduced){const animation=sheet.getAnimations()[0];animation.pause();animation.currentTime=Number(previewFrame)*125+1;}
        check('no horizontal overflow',document.documentElement.scrollWidth<=innerWidth);
        check('no browser errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
    $('alchemyScene').scrollIntoView({block:'center'});
}());
