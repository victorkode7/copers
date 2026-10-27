(async function () {
    const checks=[],check=(name,ok)=>{checks.push((ok?'PASS ':'FAIL ')+name);if(!ok)throw new Error(name);};
    const files=['shielded-vanguard-60.json','righteous-bulwark-60.json','crimson-arrows-60.json','venom-volley-60.json','elemental-warden-60.json','shielded-vanguard-starter-30.json'];
    try {
        state.level=60;state.skillPoints=60;state.skillRanks={};state.currentView='upgrades';state.playerHp=100;state.combatPaused=false;render();
        for(const file of files) {
            const request=new XMLHttpRequest();request.open('GET',new URL('builds/'+file,location.href),false);request.send();
            const data=JSON.parse(request.responseText),validated=SkillBuilds.validate(data);
            if(file==='shielded-vanguard-60.json')check('Vanguard spends its spare point on an active arrow skill',!data.skillRanks.deepWounds&&data.skillRanks.forkingArrow===1);
            if(file==='crimson-arrows-60.json')check('Crimson Arrows uses Singled Off instead of an inactive poison upgrade',!data.skillRanks.poisonExecute&&data.skillRanks.singledOff===1);
            check(file+' uses at most 60 real skill points',validated.points===data.points&&validated.points<=60);
            const ranks={};
            for(const id of data.allocationOrder) {
                check(file+' has a reachable next allocation '+id,skillNodeRequirementsMet(skillNodeById[id],key=>skillNodeById[key].start||ranks[key]>0));
                ranks[id]=(ranks[id]||0)+1;
            }
            check(file+' allocation order matches its complete configuration',JSON.stringify(ranks)===JSON.stringify(data.skillRanks));
            const input=document.getElementById('importSkillBuildFile'),transfer=new DataTransfer();
            transfer.items.add(new File([request.responseText],file,{type:'application/json'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
            for(let wait=0;wait<80&&!document.getElementById('skillBuildDialog').open;wait++)await new Promise(resolve=>setTimeout(resolve,10));
            check(file+' opens through the real import control',document.getElementById('skillBuildDialog').open&&!document.getElementById('applySkillBuild').disabled);
            document.getElementById('applySkillBuild').click();
            check(file+' applies and remains save-compatible',JSON.stringify(state.skillRanks)===JSON.stringify(data.skillRanks)&&Boolean(parseGameSave(JSON.stringify(createGameSave()))));
        }
        check('no runtime errors',!window.smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    const pre=document.createElement('pre');pre.id='smoke-results';pre.textContent=checks.join('\n');document.body.append(pre);
}());
