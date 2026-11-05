(async function(){
    const checks=[],wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const $=id=>document.getElementById(id);
    try {
        await document.fonts.ready;clearOfflineRecap();state.combatPaused=true;state.currentView='map';state.isInTown=false;
        state.tutorials=createTutorialState();state.tutorials.firstSkillPointPending=true;render();
        const stack=$('gameNotificationStack'),tip=elements.tutorialNotifications.firstElementChild;
        check('all global notice sources share the notification stack',['tutorialNotifications','profileStatus','offlinePlayStatus','combatCatchupNotice'].every(id=>stack.contains($(id))));
        check('tip is a quiet notification window',getComputedStyle(tip).boxShadow==='none'&&getComputedStyle(tip).animationName==='none');
        triggerLevelUpEffect({level:state.level,skillPoints:1});await wait(100);
        let banner=stack.querySelector('.level-up-announcement');
        check('level up appears below pending notification',banner.getBoundingClientRect().top>=tip.getBoundingClientRect().bottom);
        const combat=elements.combatPanel.getBoundingClientRect();
        check('notifications use the former level-up position',Math.abs(stack.getBoundingClientRect().top-Math.max(24,Math.min(innerHeight-170,combat.top+24)))<1);
        await wait(8500);
        check('tip and level up persist past animation and old toast timers',tip.isConnected&&banner.isConnected);
        tip.querySelector('p').click();
        check('clicking the message closes and saves the tip',!tip.isConnected&&state.tutorials.firstSkillPointDismissed&&JSON.parse(localStorage.getItem(saveKey)).tutorials.firstSkillPointDismissed);
        state.tutorials.firstSkillPointDismissed=false;render();
        check('pending condition can display a tip',!!elements.tutorialNotifications.firstElementChild);
        state.tutorials.firstSkillPointPending=false;render();
        check('meeting the underlying condition removes the tip',elements.tutorialNotifications.children.length===0);
        banner.click();check('level up closes on click',!banner.isConnected);
        for(const id of ['profileStatus','offlinePlayStatus','combatCatchupNotice']){
            const notice=$(id);notice.textContent='Test notification';notice.hidden=false;
            check(id+' is styled as a quiet window',getComputedStyle(notice).position==='relative'&&getComputedStyle(notice).boxShadow==='none');
            notice.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
            check(id+' supports keyboard dismissal',notice.hidden);
        }
        check('stack fits the viewport',document.documentElement.scrollWidth<=innerWidth);
        check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
