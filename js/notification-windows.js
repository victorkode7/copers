(function () {
    'use strict';
    const stack = document.createElement('section');
    stack.id = 'gameNotificationStack';stack.setAttribute('aria-label','Notifications');
    document.body.append(stack);
    const tutorials = document.getElementById('tutorialNotifications');stack.append(tutorials);
    ['profileStatus','offlinePlayStatus','combatCatchupNotice'].forEach(id => {
        const notice = document.getElementById(id);
        notice.classList.add('notification-window');notice.tabIndex=0;
        notice.title='Click to dismiss';
        const dismiss = () => {notice.hidden=true;};
        notice.addEventListener('click',dismiss);
        notice.addEventListener('keydown',event=>{
            if(event.key==='Enter'||event.key===' '){event.preventDefault();dismiss();}
        });
        stack.append(notice);
    });
    const position = () => {
        const combat = document.querySelector('.combat-panel'),rect = combat.getBoundingClientRect();
        const visible = combat.getClientRects().length && rect.height > 0;
        const center = visible ? rect.left+rect.width/2 : innerWidth/2;
        const half = Math.min(170,(innerWidth-32)/2);
        const top = visible ? Math.max(24,Math.min(innerHeight-170,rect.top+24)) : Math.max(24,innerHeight*.25);
        stack.style.left=Math.max(half+16,Math.min(innerWidth-half-16,center))+'px';
        stack.style.top=top+'px';stack.style.maxHeight=Math.max(100,innerHeight-top-16)+'px';
    };
    let frame;
    const schedule = () => {if(frame==null)frame=requestAnimationFrame(()=>{frame=null;position();});};
    addEventListener('resize',schedule);addEventListener('scroll',schedule,true);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.querySelector('.combat-panel'));
    // Page changes can hide combat without a resize event on the viewport.
    const viewObserver = new MutationObserver(schedule);
    document.querySelectorAll('.page-view,.combat-panel').forEach(view=>viewObserver.observe(view,{attributes:true,attributeFilter:['hidden']}));
    function showLevelUp(banner) {
        stack.querySelector('.level-up-announcement')?.remove();
        banner.classList.add('notification-window');banner.tabIndex=0;banner.title='Click to dismiss';
        banner.addEventListener('click',()=>banner.remove());
        banner.addEventListener('keydown',event=>{
            if(event.key==='Enter'||event.key===' '){event.preventDefault();banner.remove();}
        });
        stack.append(banner);position();
    }
    window.GameNotifications={showLevelUp,position};position();
}());
