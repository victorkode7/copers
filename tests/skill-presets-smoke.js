(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);},$=id=>document.getElementById(id);
    const data=ranks=>({format:'copers-skill-build',version:1,name:'Preset test',skillRanks:ranks});
    const choose=index=>{$('skillPresetSlot').value=String(index);$('skillPresetSlot').dispatchEvent(new Event('change',{bubbles:true}));};
    const rename=name=>{$('renameSkillPreset').click();$('skillPresetName').value=name;$('skillPresetName').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));};
    const click=id=>document.querySelector('[data-skill-node="'+id+'"]').click();
    try {
        const resumed=JSON.parse(sessionStorage.getItem('skillPresetSmokeReload')||'null');
        if(resumed) {
            checks.push(...resumed);sessionStorage.removeItem('skillPresetSmokeReload');
            check('all four slot names and saved trees survive a real reload',$('skillPresetSlot').options.length===4&&$('skillPresetSlot').options[0].textContent.includes('Future tank')&&$('skillPresetSlot').options[1].textContent.includes('Starter'));
            choose(0);$('loadSkillPreset').click();check('saved over-budget tree loads after reopening the game',$('skillBuildTitle').textContent==='Future tank'&&$('applySkillBuild').textContent==='Edit to fit points');
            $('cancelSkillBuild').click();check('no runtime errors after reload',!window.smokeErrors.length);checks.push('SMOKE PASSED');
            const pre=document.createElement('pre');pre.id='smoke-results';pre.textContent=checks.join('\n');document.body.append(pre);return;
        }
        state.currentView='upgrades';state.skillRanks={};state.skillPoints=1;state.level=1;pendingSkillRanks={};render();
        check('four presets start empty',$('skillPresetSlot').options.length===4&&[...$('skillPresetSlot').options].every(option=>option.textContent.includes('(empty)'))&&$('loadSkillPreset').disabled);
        check('renaming uses a pencil without a permanent second field',$('skillPresetName').hidden&&!$('skillPresetSlot').hidden&&Boolean($('renameSkillPreset').querySelector('svg')));
        $('renameSkillPreset').click();check('pencil edits the selected name in the selector space',$('skillPresetSlot').hidden&&!$('skillPresetName').hidden&&document.activeElement===$('skillPresetName'));
        $('skillPresetName').value='Discard this';$('skillPresetName').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
        check('Escape cancels an inline rename',$('skillPresetName').hidden&&$('skillPresetSlot').selectedOptions[0].textContent.includes('Preset 1'));
        $('renameSkillPreset').click();$('skillPresetName').value='Temporary name';$('renameSkillPreset').click();
        check('the checkmark saves a rename without saving a build',$('skillPresetName').hidden&&$('skillPresetSlot').selectedOptions[0].textContent.includes('Temporary name (empty)')&&$('loadSkillPreset').disabled);
        $('renameSkillPreset').click();$('skillPresetName').value='Preset 1';$('skillPresetName').dispatchEvent(new FocusEvent('blur',{relatedTarget:$('saveSkillPreset')}));
        check('leaving the inline name commits it and restores the selector',$('skillPresetName').hidden&&!$('skillPresetSlot').hidden&&$('skillPresetSlot').selectedOptions[0].textContent.includes('Preset 1 (empty)'));
        const viewport=elements.upgrades.querySelector('.skill-tree-viewport'),bar=viewport.querySelector('.skill-points-bar');
        check('presets sit beside import and export below the tree',document.querySelector('.skill-build-file-controls').contains($('skillPresetControls'))&&!viewport.contains($('skillPresetControls'))&&!bar.contains($('skillPointsDisplay')));
        check('file controls sit below the tree',!viewport.contains($('importSkillBuild'))&&$('importSkillBuild').getBoundingClientRect().top>=viewport.getBoundingClientRect().bottom);
        const overlay=$('skillTreePointOverlay');
        check('available points are a transparent overlay beneath the control bar',overlay.contains($('skillPointsDisplay'))&&getComputedStyle(overlay).backgroundColor==='rgba(0, 0, 0, 0)'&&parseFloat(getComputedStyle(overlay).borderTopWidth)===0);
        $('renameSkillPreset').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0}));
        check('preset controls do not start dragging the tree',!skillTreePanning);
        const big={healthNode:1,healthNode2:1,healthNode6:1};
        SkillBuilds.showPreview(data(big));$('applySkillBuild').click();
        check('unaffordable imports select all nodes in edit mode with a red deficit',SkillBuilds.isEditing()&&Object.keys(SkillBuilds.getEditingRanks()).length===3&&$('skillBuildBudgetWarning').textContent==='Remove 2 nodes to use this build.'&&$('skillBuildBudgetWarning').classList.contains('is-over-budget')&&Object.keys(state.skillRanks).length===0&&state.skillPoints===1);
        const snapshot=JSON.stringify(createGameSave());
        rename('Future tank');$('saveSkillPreset').click();
        const saved=JSON.parse(localStorage.getItem('idleAdventureSkillBuildPresets'));
        check('saving an over-budget named preset spends no points and changes no gameplay',saved.slots[0].name==='Future tank'&&Object.keys(saved.slots[0].build.skillRanks).length===3&&JSON.stringify(createGameSave())===snapshot);
        click('healthNode6');check('removing a selected node updates the deficit',$('skillBuildBudgetWarning').textContent==='Remove 1 node to use this build.'&&$('confirmSkillSelection').disabled);
        click('healthNode2');check('a plan that fits enables applying without committing early',!$('confirmSkillSelection').disabled&&!$('skillBuildBudgetWarning').classList.contains('is-over-budget')&&Object.keys(state.skillRanks).length===0);
        $('confirmSkillSelection').click();check('applying spends only earned points and preserves the budget',!SkillBuilds.isEditing()&&state.skillRanks.healthNode===1&&state.skillPoints===0&&state.level===1);
        choose(1);rename('Starter');$('saveSkillPreset').click();
        check('a second named slot is independent of the first',JSON.parse(localStorage.getItem('idleAdventureSkillBuildPresets')).slots[0].name==='Future tank'&&JSON.parse(localStorage.getItem('idleAdventureSkillBuildPresets')).slots[1].build.skillRanks.healthNode===1&&state.skillPoints===0);
        choose(0);$('loadSkillPreset').click();
        check('loading an expensive preset warns and preserves active skills',$('skillBuildDialog').open&&$('skillBuildTitle').textContent==='Future tank'&&$('applySkillBuild').textContent==='Edit to fit points'&&state.skillRanks.healthNode===1);
        $('applySkillBuild').click();click('healthNode');
        check('removing a bridge removes its disconnected branch',Object.keys(SkillBuilds.getEditingRanks()).length===0&&state.skillRanks.healthNode===1);
        $('clearSkillSelection').click();check('cancel edit keeps the active tree and points',!SkillBuilds.isEditing()&&state.skillRanks.healthNode===1&&state.skillPoints===0);
        choose(1);$('loadSkillPreset').click();$('applySkillBuild').click();
        check('reloading an affordable preset never spends points twice',state.skillRanks.healthNode===1&&state.skillPoints===0&&state.level===1);
        for(const index of [2,3]){choose(index);check('unused preset stays empty and unallocated',$('loadSkillPreset').disabled);}
        check('saved names and trees persist in browser storage',JSON.parse(localStorage.getItem('idleAdventureSkillBuildPresets')).slots[0].build.points===3&&JSON.parse(localStorage.getItem('idleAdventureSkillBuildPresets')).slots[1].name==='Starter');
        check('no runtime errors',!window.smokeErrors.length);
        sessionStorage.setItem('skillPresetSmokeReload',JSON.stringify(checks));location.reload();return;
    }catch(error){checks.push('ERROR '+error.stack);}
    const pre=document.createElement('pre');pre.id='smoke-results';pre.textContent=checks.join('\n');document.body.append(pre);
}());
