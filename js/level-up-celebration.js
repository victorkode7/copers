(function () {
    'use strict';
    addEventListener('combat-settings-change', () => {

        if (window.CombatSettings?.enabled('glows') === false) window.triggerLevelUpEffect?.cleanup?.();
    });
    function show({level,skillPoints,reduced}) {
        const layer = document.createElement('div');
        layer.className = 'level-up-celebration' + (reduced ? ' is-reduced' : '');
        const banner = document.createElement('div');banner.className = 'level-up-announcement';
        banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');banner.setAttribute('aria-atomic','true');
        const title = document.createElement('strong');title.className = 'level-up-title';title.textContent = 'LEVEL UP!';
        const subtitle = document.createElement('span');subtitle.className = 'level-up-subtitle';subtitle.textContent = 'Level ' + level;
        const reward = document.createElement('span');reward.className = 'level-up-reward';
        reward.textContent = skillPoints > 0 ? '+' + skillPoints + ' Skill Point' + (skillPoints === 1 ? '' : 's') : '';
        reward.hidden = skillPoints <= 0;banner.append(title,subtitle,reward);
        GameNotifications.showLevelUp(banner);
        const burst = document.createElement('div');burst.className = 'level-up-xp-burst';layer.append(burst);
        const panels = [document.querySelector('.map-panel'),document.querySelector('.combat-panel')];
        const surges = panels.map(() => {
            const surge = document.createElement('div');surge.className = 'level-up-container-surge';
            surge.setAttribute('aria-hidden','true');layer.append(surge);return surge;
        });
        const particle = (parent,index,count,upward) => {
            const spark = document.createElement('i'),angle = index/count*Math.PI*2;
            spark.className = 'level-up-particle';
            spark.style.setProperty('--dx', (upward ? Math.cos(angle)*70 : Math.cos(angle)*130) + 'px');
            spark.style.setProperty('--dy', (upward ? -55-index%5*18 : Math.sin(angle)*65) + 'px');
            spark.style.setProperty('--delay', (index%4*35) + 'ms');
            parent.append(spark);
        };
        if (!reduced) {
            for (let i=0;i<18;i++) particle(burst,i,18,false);
            surges.forEach(surge => {
                for (let i=0;i<12;i++) {
                    particle(surge,i,12,true);
                    surge.lastElementChild.style.left = (5+i/12*90) + '%';
                }
            });
        }
        document.body.append(layer);
        const update = () => {
            const xp = document.getElementById('experienceTrack').getBoundingClientRect();
            GameNotifications.position();
            burst.style.left = xp.left+xp.width/2 + 'px';burst.style.top = xp.top+xp.height/2 + 'px';
            surges.forEach((surge,index) => {
                const panel = panels[index],bounds = panel.getBoundingClientRect();
                surge.hidden = !panel.getClientRects().length || bounds.height <= 0;
                Object.assign(surge.style,{left:bounds.left+'px',top:bounds.top+'px',width:bounds.width+'px',height:bounds.height+'px',borderRadius:getComputedStyle(panel).borderTopLeftRadius});
            });
        };
        let resizeFrame;
        const scheduleUpdate = () => { if (resizeFrame == null) resizeFrame = requestAnimationFrame(() => {resizeFrame=null;update();}); };
        const observer = new ResizeObserver(scheduleUpdate);
        panels.forEach(panel=>observer.observe(panel));
        addEventListener('resize',scheduleUpdate);addEventListener('scroll',scheduleUpdate,true);
        const clear = () => {
            clearTimeout(removeTimer);cancelAnimationFrame(resizeFrame);observer.disconnect();layer.remove();
            removeEventListener('resize',scheduleUpdate);removeEventListener('scroll',scheduleUpdate,true);
        };
        update();
        const removeTimer = setTimeout(clear,3400);
        return {update,clear};
    }
    window.LevelUpCelebration = {show};
}());
