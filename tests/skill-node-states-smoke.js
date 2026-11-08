(async function(){
    const checks=[],check=(name,ok)=>{checks.push((ok?'PASS ':'FAIL ')+name);if(!ok)throw new Error(name);};
    const root=skillNodes.find(node=>node.start).id;
    function pathTo(target){
        const paths=[[root]],seen=new Set([root]);
        for(let i=0;i<paths.length;i++){
            const path=paths[i],id=path.at(-1);if(id===target)return path.slice(1,-1);
            for(const next of skillNodeConnections[id])if(!seen.has(next)){seen.add(next);paths.push([...path,next]);}
        }
        throw new Error('No path to '+target);
    }
    try{
        await document.fonts.ready;
        // Compare steady-state hues instead of sampling a border transition mid-frame.
        const steady=document.createElement('style');steady.textContent='.skill-node{transition:none!important}';document.head.append(steady);
        state.combatPaused=true;resetCombatClock();state.currentView='upgrades';state.isInTown=false;
        state.defeatedBossWorldIds=worldData.map(world=>world.id);state.level=60;state.experience=0;state.tutorials=createTutorialState();
        for(const type of ['accuracy','damage','health','attackSpeed','mana']){
            const node=skillNodes.find(node=>node.type===type&&!node.start);
            const path=pathTo(node.id);state.skillRanks=Object.fromEntries(path.map(id=>[id,1]));state.skillPoints=60-path.length;
            pendingSkillRanks={};combatStatCache=null;invalidateSkillBonusCache();render();
            let button=document.querySelector('[data-skill-node="'+node.id+'"]');
            check(type+' becomes available through its real prerequisites',button.classList.contains('is-available')&&!button.classList.contains('is-allocated'));
            const available=getComputedStyle(button),background=available.backgroundImage,border=available.borderColor;
            const probe=button.cloneNode(true);probe.style.display='none';probe.classList.remove('is-available');probe.classList.add('is-locked');button.parentElement.append(probe);
            const native=getComputedStyle(probe);
            check(type+' keeps its native node colors when available',background===native.backgroundImage&&border===native.borderColor);
            check(type+' uses a quiet dashed border without a glow or pulse',available.borderStyle==='dashed'&&available.boxShadow==='none'&&available.animationName==='none');
            probe.remove();button.click();
            button=document.querySelector('[data-skill-node="'+node.id+'"]');
            check(type+' preserves its stat color while allocation is pending',button.classList.contains('is-pending')&&getComputedStyle(button).backgroundImage===background);
            document.getElementById('confirmSkillSelection').click();
            button=document.querySelector('[data-skill-node="'+node.id+'"]');
            const allocated=getComputedStyle(button);
            check(type+' confirms normally and has a distinct solid allocated ring',state.skillRanks[node.id]===1&&button.classList.contains('is-allocated')&&allocated.borderStyle==='solid'&&allocated.backgroundImage===background&&allocated.boxShadow!=='none');
        }
        check('the removed loot window is absent',!document.querySelector('.loot-panel')&&!document.getElementById('lootLog'));
        check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
