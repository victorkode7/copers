(function () {
    'use strict';
    function render(container,tree,options={}) {
        container.replaceChildren();container.classList.add('mastery-tree');
        const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 600 720');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
        const coordinate=value=>Math.max(-20,Math.min(20,Number.isFinite(value)?value:0));
        const columns=tree.nodes.map(node=>coordinate(node.column)),rows=tree.nodes.map(node=>coordinate(node.row));
        const minX=Math.min(...columns,-1),maxX=Math.max(...columns,1),minY=Math.min(...rows,0),maxY=Math.max(...rows,5);
        const position=node=>({x:75+(coordinate(node.column)-minX)/Math.max(1,maxX-minX)*450,y:65+(coordinate(node.row)-minY)/Math.max(1,maxY-minY)*580});
        const active=options.active||new Set(['root']),byId=new Map(tree.nodes.map(node=>[node.id,node]));
        tree.nodes.forEach(node=>node.requires.forEach(id=>{
            const source=byId.get(id);if(!source)return;const from=position(source),to=position(node),line=document.createElementNS(ns,'line');
            Object.entries({x1:from.x,y1:from.y,x2:to.x,y2:to.y}).forEach(([key,value])=>line.setAttribute(key,value));
            line.classList.add('mastery-link');if(active.has(node.id)&&active.has(id))line.classList.add('is-active');svg.append(line);
        }));container.append(svg);
        tree.nodes.forEach(node=>{
            const passive=node.start&&options.passiveStart;
            const refundStart=passive&&options.refundStart;
            const button=document.createElement(passive&&!refundStart?'span':'button'),point=position(node);if(!passive||refundStart)button.type='button';button.className='mastery-node';button.dataset.masteryNode=node.id;
            button.style.left=point.x/6+'%';button.style.top=point.y/7.2+'%';
            if(node.start)button.classList.add('is-root');if(node.size>1)button.classList.add('is-capstone');
            if(active.has(node.id))button.classList.add('is-allocated');if(options.available?.(node))button.classList.add('is-available');
            const icon=document.createElement('span');icon.className='mastery-node-icon';icon.textContent=node.icon;
            if(passive){
                if(refundStart){
                    button.title='Hold for 0.6 seconds to refund all mastery points on this map.';
                    button.setAttribute('aria-label','Starting node. Hold to refund all mastery points on this map.');
                    button.addEventListener('click',event=>{if(event.detail===0)options.refundStart();});
                }else{button.classList.add('is-passive');button.setAttribute('aria-hidden','true');}
                button.append(icon);container.append(button);return;
            }
            button.classList.toggle('is-selected',options.selected===node.id);button.setAttribute('aria-pressed',String(options.selected===node.id));
            const name=document.createElement('span');name.className='mastery-node-name';name.textContent=node.name;
            const description=node.start?'Free starting node':'Bonuses:\n'+MasterySystem.describeStats(node.stats)+'\nTrade-offs:\n'+MasterySystem.describeStats(node.penalties);button.title=node.name+'\n'+node.description+'\n'+description;
            button.setAttribute('aria-label',node.name+'. '+(node.start?'Starting node.':active.has(node.id)?'Learned.':'Costs 1 mastery point.')+' '+description);
            button.append(icon,name);button.addEventListener('click',()=>options.select?.(node.id));container.append(button);
        });
    }
    window.MasteryTree={render};
}());
