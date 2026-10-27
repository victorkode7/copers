(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const $=id=>document.getElementById(id),clone=value=>JSON.parse(JSON.stringify(value));
    const root=skillNodes.find(node=>node.start).id;
    const pathTo=target=>{
        const paths=[[root]],seen=new Set([root]);
        for(let i=0;i<paths.length;i++){
            const path=paths[i],id=path[path.length-1];if(id===target)return path.slice(1);
            for(const next of skillNodeConnections[id])if(!seen.has(next)){seen.add(next);paths.push([...path,next]);}
        }
        throw new Error('Missing path to '+target);
    };
    const data=ranks=>({format:'copers-skill-build',version:1,name:'Shared test build',description:'Skills only.',skillRanks:ranks});
    try {
        state.currentView='upgrades';state.skillRanks={};state.level=60;state.skillPoints=60;state.playerHp=100;state.combatPaused=false;pendingSkillRanks={};render();
        check('skill tree exposes import and export controls',Boolean($('importSkillBuild')&&$('exportSkillBuild')));
        const ranks=Object.fromEntries(pathTo('gatheringPower').map(id=>[id,1]));
        const before=JSON.stringify(state.skillRanks);SkillBuilds.showPreview(data(ranks));
        check('import previews the point cost without changing skills',$('skillBuildDialog').open&&$('skillBuildSummary').textContent.includes(Object.keys(ranks).length+' skill points')&&JSON.stringify(state.skillRanks)===before);
        $('cancelSkillBuild').click();check('cancel preserves the current allocation',JSON.stringify(state.skillRanks)===before&&!$('skillBuildDialog').open);
        const gear=JSON.stringify(state.gear),gold=state.gold,kills=JSON.stringify(state.kills),level=state.level;
        const prior=clone(createGameSave());SkillBuilds.showPreview(data(ranks));SkillBuilds.applyPreview();
        check('applying replaces skills and conserves earned points',JSON.stringify(state.skillRanks)===JSON.stringify(ranks)&&state.skillPoints===60-Object.keys(ranks).length&&state.level===level);
        check('build import preserves gear, gold and kill progress',JSON.stringify(state.gear)===gear&&state.gold===gold&&JSON.stringify(state.kills)===kills);
        check('original progress is backed up before a respec',SaveCompatibility.backups().some(entry=>{try{return JSON.parse(entry.raw).skillPoints===prior.skillPoints;}catch{return false;}}));
        check('the imported allocation remains a valid profile',Boolean(parseGameSave(JSON.stringify(createGameSave()))));
        const download=HTMLAnchorElement.prototype.click;let downloaded='';HTMLAnchorElement.prototype.click=function(){downloaded=this.download;};
        pendingSkillRanks={damageNode:1};const exported=SkillBuilds.exportCurrent();HTMLAnchorElement.prototype.click=download;
        check('export shares only confirmed ranks in a standalone JSON file',downloaded.endsWith('.json')&&JSON.stringify(exported.skillRanks)===JSON.stringify(ranks)&&!Object.hasOwn(exported,'gear')&&!Object.hasOwn(exported,'gold')&&SkillBuilds.validate(exported).points===Object.keys(ranks).length);
        const snapshot=JSON.stringify(state.skillRanks);
        for(const invalid of [{...data(ranks),format:'profile'},data({notASkill:1}),data({[Object.keys(ranks)[0]]:-1}),data({[Object.keys(ranks)[0]]:999}),data({gatheringPower:1})]){
            let rejected=false;try{SkillBuilds.showPreview(invalid);}catch{rejected=true;}check('invalid or disconnected build leaves skills untouched',rejected&&JSON.stringify(state.skillRanks)===snapshot);
        }
        state.skillRanks={};state.skillPoints=1;state.level=1;SkillBuilds.showPreview(data(ranks));
        check('an expensive build warns before opening the editor',!$('applySkillBuild').disabled&&$('applySkillBuild').textContent==='Edit to fit points'&&$('skillBuildError').textContent.includes('not have enough points'));
        SkillBuilds.applyPreview();
        check('over-budget imports become selected plans without granting points',SkillBuilds.isEditing()&&state.skillPoints===1&&Object.keys(state.skillRanks).length===0&&$('confirmSkillSelection').disabled&&$('skillBuildBudgetWarning').textContent.includes('Remove '));
        SkillBuilds.cancelEditing();check('no runtime errors',!window.smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    const pre=document.createElement('pre');pre.id='smoke-results';pre.textContent=checks.join('\n');document.body.append(pre);
}());
