(async function () {
    const checks=[],wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const targets=[elements.experienceBar,elements.experienceTrack,elements.level];
    const active=()=>targets.every(element=>element.classList.contains('level-up-active'));
    const clean=()=>targets.every(element=>!element.classList.contains('level-up-active'));
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const preview=new URL(document.currentScript.src).searchParams.has('preview');
    const previousEffects=combatEffects,originalAudio=window.AudioContext;
    let audioCreated=0;
    window.AudioContext=class {constructor(){audioCreated++;}};
    try {
        await document.fonts.ready;
        clearOfflineRecap();state.currentView='map';state.isInTown=false;state.combatPaused=true;
        state.mapListExpanded=true;state.mapSelectorLocked=true;state.level=0;state.experience=0;state.experienceRemainder=0;
        state.selectedMap=worldData[0].mapIds[0];render();
        combatEffects=null;awardExperience(experienceForNextLevel(0));
        check('offline gains do not start visual effects',state.level===1&&clean());
        combatEffects=[];awardExperience(experienceForNextLevel(1));render();
        check('live gains queue one celebration',combatEffects.length===1&&clean());
        presentCombatEvent(combatEffects[0]);combatEffects=previousEffects;
        check('announcement shows earned level and skill point',document.querySelector('.level-up-subtitle').textContent==='Level 2'&&document.querySelector('.level-up-reward').textContent==='+1 Skill Point');
        check('XP and level label remain active',active());
        check('traveling light and player-frame surge are removed',!document.querySelector('.level-up-border,.level-up-power-surge'));
        const layer=document.querySelector('.level-up-celebration'),surges=[...layer.querySelectorAll('.level-up-container-surge')];
        check('two input-transparent container surges replace the traveling border',surges.length===2&&getComputedStyle(layer).pointerEvents==='none');
        [elements.mapPanel,elements.combatPanel].forEach((panel,index)=>{
            const bounds=panel.getBoundingClientRect(),surge=surges[index];
            check('surge '+index+' matches its container',Math.abs(parseFloat(surge.style.left)-bounds.left)<.5&&Math.abs(parseFloat(surge.style.top)-bounds.top)<.5&&Math.abs(parseFloat(surge.style.width)-bounds.width)<.5&&surge.style.borderRadius===getComputedStyle(panel).borderTopLeftRadius);
        });
        check('expanding rings respect reduced motion',reduced?getComputedStyle(surges[0]).display==='none':getComputedStyle(surges[0],'::before').animationName==='level-up-container-ring');
        check('particle bursts respect reduced motion',layer.querySelectorAll('.level-up-particle').length===(reduced?0:42));
        check('zero XP still shows its celebration ribbon',state.experience===0&&elements.experienceBar.style.width==='0%'&&getComputedStyle(elements.experienceTrack,'::before').content==='""');
        window.dispatchEvent(new Event('pointerdown'));window.dispatchEvent(new Event('keydown'));
        triggerLevelUpEffect();
        check('rapid levels replace all previous overlays',!layer.isConnected&&document.querySelectorAll('.level-up-celebration').length===1);
        check('level-up sound and its settings control are removed',audioCreated===0&&!document.querySelector('[data-effect-setting="sound"]'));
        check('no skill point is invented',document.querySelector('.level-up-reward').hidden);
        const surge=document.querySelector('.level-up-container-surge'),oldWidth=surge.style.width;
        elements.mapPanel.style.width='85%';dispatchEvent(new Event('resize'));await wait(120);
        check('container rings follow resize',surge.style.width!==oldWidth);
        elements.mapPanel.style.width='';dispatchEvent(new Event('resize'));await wait(100);
        elements.experienceBar.dispatchEvent(new AnimationEvent('animationend',{bubbles:true,animationName:'level-up-shine'}));
        check('shine completion does not end the celebration',active());
        await wait(3500);
        check('container effects clean up while the notification stays',!document.querySelector('.level-up-celebration')&&!!document.querySelector('.level-up-announcement')&&active());
        await wait(4700);
        check('all active classes clean up automatically',clean()&&!triggerLevelUpEffect.cleanup);
        check('level-up notification persists until clicked',!!document.querySelector('.level-up-announcement'));
        document.querySelector('.level-up-announcement').click();
        check('clicking the level-up window closes it',!document.querySelector('.level-up-announcement'));
        DeveloperTools.setMode(true);document.getElementById('increaseLevelButton').click();check('developer level button celebrates',active());triggerLevelUpEffect.cleanup();
        state.experience=10;render();const width=elements.experienceBar.style.width;triggerLevelUpEffect();
        check('partial XP progress is preserved',state.experience===10&&elements.experienceBar.style.width===width);
        triggerLevelUpEffect.cleanup();check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
        if(preview){triggerLevelUpEffect();await wait(200);}
    }catch(error){checks.push('ERROR '+error.stack);}finally{combatEffects=previousEffects;window.AudioContext=originalAudio;}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
