(function () {
    'use strict';
    let active=null, hovered=null, focused=null, text='', panel=null, frame=0;
    // Observe only the visible hint and its anchor; no polling or page-wide observer.
    const observer=new ResizeObserver(schedulePosition);
    function close() {
        if(active){active.title=text;const ids=(active.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&id!=='liveGameTooltip');
            if(ids.length)active.setAttribute('aria-describedby',ids.join(' '));else active.removeAttribute('aria-describedby');}
        active=null;text='';observer.disconnect();cancelAnimationFrame(frame);frame=0;
        if(panel)panel.hidden=true;
        document.removeEventListener('scroll',schedulePosition,true);window.removeEventListener('resize',schedulePosition);
    }
    function position() {
        frame=0;if(!active)return;
        if(!active.isConnected||active.closest('[hidden]')){hovered=focused=null;close();return;}
        const bounds=active.getBoundingClientRect();
        if(!bounds.width||!bounds.height||bounds.bottom<0||bounds.top>innerHeight){hovered=focused=null;close();return;}
        const width=panel.offsetWidth,height=panel.offsetHeight;
        panel.style.left=Math.max(8,Math.min(innerWidth-width-8,bounds.left+(bounds.width-width)/2))+'px';
        const above=bounds.top-height-8;
        panel.style.top=Math.max(8,Math.min(innerHeight-height-8,above>=8?above:bounds.bottom+8))+'px';
    }
    function schedulePosition(){if(active&&!frame)frame=requestAnimationFrame(position);}
    function show(target) {
        if(active===target)return;close();
        if(!target?.title||!target.isConnected||target.closest('[hidden]'))return;
        active=target;text=target.title;target.removeAttribute('title');
        if(!panel){panel=document.createElement('div');panel.id='liveGameTooltip';panel.className='live-game-tooltip';panel.setAttribute('role','tooltip');document.body.append(panel);}
        panel.textContent=text;panel.hidden=false;
        const ids=new Set((target.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean));ids.add(panel.id);target.setAttribute('aria-describedby',[...ids].join(' '));
        observer.observe(target);observer.observe(panel);
        const region=target.closest('.combat-panel,.page-view');if(region)observer.observe(region);
        document.addEventListener('scroll',schedulePosition,{capture:true,passive:true});window.addEventListener('resize',schedulePosition,{passive:true});
        position();
    }
    function setTitle(element,value) {
        // Updating native title text dismisses browser tooltips. Keep the active
        // description in our existing panel and restore the title when it closes.
        if(!element.hasAttribute('data-live-tooltip'))element.setAttribute('data-live-tooltip','');
        if(active===element){if(text!==value){text=value;panel.textContent=value;}if(!value){hovered=focused=null;close();}return;}
        if(element.getAttribute('title')!==value)element.setAttribute('title',value);
    }
    function refresh(){if(active&&(!active.isConnected||active.closest('[hidden]'))){hovered=focused=null;close();}}
    const target=event=>event.target.closest?.('[data-live-tooltip]');
    document.addEventListener('pointerover',event=>{if(event.pointerType==='touch')return;const next=target(event);if(next&&next!==hovered){hovered=next;show(next);}});
    document.addEventListener('pointerout',event=>{if(hovered&&hovered.contains(event.target)&&!hovered.contains(event.relatedTarget)){hovered=null;show(focused);}});
    document.addEventListener('focusin',event=>{focused=target(event)||null;show(hovered||focused);});
    document.addEventListener('focusout',event=>{if(focused?.contains(event.target)){focused=null;show(hovered);}});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){hovered=focused=null;close();}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){hovered=focused=null;close();}});
    window.addEventListener('pagehide',()=>{hovered=focused=null;close();});
    window.LiveTooltips={setTitle,refresh};
}());
