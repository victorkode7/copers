(async function(){
    const checks=[],check=(name,ok)=>{checks.push((ok?'PASS ':'FAIL ')+name);if(!ok)throw new Error(name);};
    const originalZoom=skillTreeZoom,node=skillNodes.find(node=>node.type==='accuracy'&&!node.start),originalSize=node.size;
    async function inspectNode(definition){
        const button=document.querySelector('[data-skill-node="'+definition.id+'"]'),svg=document.querySelector('.skill-tree-links');
        const line=[...svg.querySelectorAll('line')].find(link=>link.dataset.skillNodeSource===definition.id||link.dataset.skillNodeLink===definition.id);
        const source=line.dataset.skillNodeSource===definition.id;
        const x=Number(line.getAttribute(source?'x1':'x2')),y=Number(line.getAttribute(source?'y1':'y2'));
        const otherX=Number(line.getAttribute(source?'x2':'x1')),otherY=Number(line.getAttribute(source?'y2':'y1'));
        const length=Math.hypot(otherX-x,otherY-y),dx=(otherX-x)/length,dy=(otherY-y)/length,radius=parseFloat(button.style.width)/2;
        const copy=svg.cloneNode(true);copy.setAttribute('width','160');copy.setAttribute('height','160');copy.setAttribute('viewBox',[x-80,y-80,160,160].join(' '));
        for(const segment of copy.querySelectorAll('line'))segment.setAttribute('style','stroke:white;stroke-width:3;fill:none');
        const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}));
        try{
            const image=new Image();image.src=url;await image.decode();
            const canvas=document.createElement('canvas');canvas.width=canvas.height=160;
            const context=canvas.getContext('2d');context.drawImage(image,0,0);
            const alphaAt=distance=>{
                const px=Math.round(80+dx*distance),py=Math.round(80+dy*distance);
                return [...context.getImageData(px-1,py-1,3,3).data].filter((_,index)=>index%4===3);
            };
            check(definition.id+' has no connector pixels through its center at zoom '+skillTreeZoom,alphaAt(0).every(alpha=>alpha===0));
            check(definition.id+' keeps connector pixels outside its whole node at zoom '+skillTreeZoom,alphaAt(radius-4).every(alpha=>alpha===0)&&alphaAt(radius+10).some(alpha=>alpha>0));
        }finally{URL.revokeObjectURL(url);}
    }
    try{
        await document.fonts.ready;state.combatPaused=true;resetCombatClock();state.currentView='upgrades';state.isInTown=false;render();
        const viewport=document.querySelector('.skill-tree-viewport'),board=document.querySelector('.skill-tree-board'),root=skillNodes.find(entry=>entry.start);
        for(const zoom of [1,.5,1.5]){
            skillTreeZoom=zoom;node.size=1.5;renderUpgrades();updateSkillTreeTransform(viewport,board,true);
            await inspectNode(root);await inspectNode(node);
        }
        check('connector geometry still follows real prerequisites',board.querySelectorAll('.skill-tree-link').length===skillNodes.reduce((sum,entry)=>sum+entry.requires.length,0));
        check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    finally{skillTreeZoom=originalZoom;node.size=originalSize;renderUpgrades();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
