(function () {
    'use strict';
    const format='copers-skill-build', $=id=>document.getElementById(id);
    const count=ranks=>Object.values(ranks).reduce((sum,rank)=>sum+rank,0);
    const presetKey='idleAdventureSkillBuildPresets';
    let preview=null,editing=null,selectedPreset=0,renamingPreset=false;
    let presets=Array.from({length:4},(_,index)=>({name:'Preset '+(index+1),build:null}));
    try {
        const saved=JSON.parse(localStorage.getItem(presetKey)||'null');
        if(saved?.version===1&&Array.isArray(saved.slots))presets=presets.map((slot,index)=>{
            const incoming=saved.slots[index];
            return incoming&&typeof incoming.name==='string'?{name:incoming.name.slice(0,60),build:incoming.build||null}:slot;
        });
    } catch { /* Keep four empty slots if browser storage is unavailable. */ }
    function persistPresets() {localStorage.setItem(presetKey,JSON.stringify({version:1,slots:presets}));}
    function renderPresets() {
        $('skillPresetSlot').replaceChildren(...presets.map((slot,index)=>new Option((index+1)+'. '+(slot.name||'Preset '+(index+1))+(slot.build?'':' (empty)'),String(index))));
        $('skillPresetSlot').value=String(selectedPreset);$('skillPresetName').value=presets[selectedPreset].name;
        $('loadSkillPreset').disabled=!presets[selectedPreset].build;
    }
    function setRenaming(active) {
        renamingPreset=active;
        $('skillPresetSlot').hidden=active;$('skillPresetName').hidden=!active;
        const button=$('renameSkillPreset');button.classList.toggle('is-renaming',active);
        button.setAttribute('aria-expanded',String(active));
        button.setAttribute('aria-label',active?'Save preset name':'Rename selected preset');
        button.title=active?'Save preset name (Enter); Escape cancels':'Rename selected preset';
    }
    function finishRename(cancel=false) {
        if(!renamingPreset)return true;
        const slot=presets[selectedPreset],previous=slot.name;
        if(!cancel) {
            slot.name=$('skillPresetName').value.trim().slice(0,60)||'Preset '+(selectedPreset+1);
            if(slot.build)slot.build.name=slot.name;
            try{persistPresets();}catch(error){slot.name=previous;if(slot.build)slot.build.name=previous;$('skillBuildStatus').textContent='Could not save preset name: '+error.message;return false;}
        }
        setRenaming(false);renderPresets();return true;
    }
    function validate(data) {
        if (!data || data.format!==format || data.version!==1 || !data.skillRanks || typeof data.skillRanks!=='object' || Array.isArray(data.skillRanks)) throw new Error('Choose a Copers skill build JSON file.');
        const ranks=Object.create(null);
        for (const [rawId,rank] of Object.entries(data.skillRanks)) {
            const id=resolveSkillNodeId(rawId),node=skillNodeById[id];
            if (!Object.hasOwn(skillNodeById,id) || node.start) throw new Error('Unknown or unavailable skill: '+rawId+'.');
            if (!Number.isSafeInteger(rank) || rank<1 || rank>node.maxRank) throw new Error('Invalid rank for '+node.name+'.');
            if (Object.hasOwn(ranks,id)) throw new Error('Duplicate skill: '+node.name+'.');
            ranks[id]=rank;
        }
        const connected=new Set(skillNodes.filter(node=>node.start).map(node=>node.id)),queue=[...connected];
        for(let index=0;index<queue.length;index++) for(const id of skillNodeConnections[queue[index]]) {
            if (!connected.has(id) && ranks[id]) {connected.add(id);queue.push(id);}
        }
        for(const id of Object.keys(ranks)) if(!connected.has(id)) throw new Error(skillNodeById[id].name+' is disconnected from the starting node.');
        return {format,version:1,name:typeof data.name==='string'?data.name.slice(0,120):'Shared build',description:typeof data.description==='string'?data.description.slice(0,4000):'',skillRanks:{...ranks},points:count(ranks),allocationOrder:Array.isArray(data.allocationOrder)?data.allocationOrder.filter(id=>ranks[id]):undefined};
    }
    const budget=()=>state.skillPoints+count(state.skillRanks);
    function showPreview(data) {
        preview=validate(data);
        $('skillBuildTitle').textContent=preview.name;
        $('skillBuildSummary').textContent=preview.points+' skill points required · '+budget()+' total points available.';
        $('skillBuildDescription').textContent=preview.description;
        $('skillBuildNodes').replaceChildren(...Object.entries(preview.skillRanks).map(([id,rank])=>{
            const entry=document.createElement('li');entry.textContent=skillNodeById[id].name+(rank>1?' ×'+rank:'')+' — '+SkillDescriptions.describe(skillNodeById[id]);return entry;
        }));
        const excess=preview.points-budget();
        $('applySkillBuild').disabled=SaveCompatibility.protection.blocked;
        $('applySkillBuild').textContent=excess>0?'Edit to fit points':'Apply build';
        $('skillBuildError').textContent=SaveCompatibility.protection.blocked?'Load a valid profile before applying a build.':excess>0?'You do not have enough points. This opens an editable selection: remove '+excess+' skill points before applying. Your active build stays unchanged.':'';
        if(!$('skillBuildDialog').open)$('skillBuildDialog').showModal();
        return preview;
    }
    function applyPreview() {
        if(!preview)return;
        const next=validate(preview),total=budget();
        if(SaveCompatibility.protection.blocked)throw new Error('Load a valid profile before applying a build.');
        if(next.points>total)return beginEditing(next);
        return commitBuild(next,total);
    }
    function commitBuild(next,total=budget()) {
        if(SaveCompatibility.protection.blocked||next.points>total)throw new Error('You do not have enough available skill points to apply this build.');
        SaveCompatibility.backup(JSON.stringify(createGameSave()),'Before skill build import');
        state.skillRanks={...next.skillRanks};state.skillPoints=total-next.points;
        pendingSkillRanks={};refundMode=false;combatStatCache=null;combatPoisonForecasts=null;
        clearPlayerCombatBuffs();state.pendingEruptions=[];state.pendingVoidMissiles=[];
        state.monsterStates.forEach(clearElementalDebuffs);
        state.playerHp=Math.min(state.playerHp,getPlayerMaxHealth());normalizePlayerMana();
        $('skillBuildDialog').close();preview=null;editing=null;render();saveGame();
        $('skillBuildStatus').textContent='Applied '+next.name+' ('+next.points+' points). Previous profile saved in Backups.';
        return next;
    }
    function beginEditing(data) {
        if(SaveCompatibility.protection.blocked)throw new Error('Load a valid profile before editing a build.');
        editing=validate(data);preview=null;pendingSkillRanks={};refundMode=false;
        $('skillBuildDialog').close();state.currentView='upgrades';state.isInTown=true;render();
        centerSkillTreeOnOrigin(skillTreeNeedsInitialFraming);skillTreeNeedsInitialFraming=false;
        $('skillBuildStatus').textContent='Editing '+editing.name+'. Click selected nodes to remove them; disconnected branches are removed too. Apply when ready, or Cancel edit to keep your active build.';
        return editing;
    }
    function updateEditingUi() {
        const warning=$('skillBuildBudgetWarning');if(!warning)return;
        warning.hidden=!editing;
        if(!editing){warning.textContent='';return;}
        const selected=count(editing.skillRanks),total=budget(),excess=selected-total;
        $('skillPointsDisplay').textContent='Available points: '+Math.max(0,total-selected)+' · Selected: '+selected+' / '+total;
        warning.classList.toggle('is-over-budget',excess>0);
        warning.textContent=excess>0?'Remove '+excess+' '+(Object.values(editing.skillRanks).every(rank=>rank===1)?(excess===1?'node':'nodes'):(excess===1?'skill point':'skill points'))+' to use this build.':'Build fits your points. Apply to use it.';
        $('confirmSkillSelection').hidden=false;$('confirmSkillSelection').textContent='Apply build';
        $('confirmSkillSelection').disabled=excess>0||SaveCompatibility.protection.blocked;
        $('clearSkillSelection').hidden=false;$('clearSkillSelection').textContent='Cancel edit';
        $('resetSkillTree').disabled=selected===0;
    }
    function cancelEditing(repaint=true) {editing=null;if(repaint){renderUpgrades();$('skillBuildStatus').textContent='Build edit cancelled. Your active skills are unchanged.';}}
    function editNode(id) {
        if(!editing||skillNodeById[id]?.start)return;
        const ranks=editing.skillRanks;
        if(ranks[id]) {
            ranks[id]--;if(!ranks[id])delete ranks[id];
            const connected=new Set(skillNodes.filter(node=>node.start).map(node=>node.id)),queue=[...connected];
            for(let index=0;index<queue.length;index++)for(const next of skillNodeConnections[queue[index]])if(ranks[next]&&!connected.has(next)){connected.add(next);queue.push(next);}
            Object.keys(ranks).forEach(key=>{if(!connected.has(key))delete ranks[key];});
        } else if(skillNodeRequirementsMet(skillNodeById[id],key=>skillNodeById[key]?.start||ranks[key]>0))ranks[id]=1;
        renderUpgrades();
    }
    function applyEditing() {
        if(!editing)return;
        try{return commitBuild(validate(editing));}catch(error){$('skillBuildStatus').textContent=error.message;updateEditingUi();}
    }
    function savePreset() {
        if(!finishRename())return;
        const name=presets[selectedPreset].name.trim()||'Preset '+(selectedPreset+1);
        const ranks=editing?editing.skillRanks:Object.fromEntries(Object.entries(getPlannedSkillRanks()).filter(([,rank])=>rank>0));
        const build=validate({format,version:1,name,description:'Saved preset.',skillRanks:ranks});
        const previous=presets[selectedPreset];presets[selectedPreset]={name,build};
        try{persistPresets();}catch(error){presets[selectedPreset]=previous;throw error;}
        renderPresets();$('skillBuildStatus').textContent='Saved '+name+' ('+build.points+' points). No skill points were spent.';
    }
    function exportCurrent() {
        const ranks=editing?editing.skillRanks:state.skillRanks;
        const data={format,version:1,name:editing?editing.name:'My '+count(ranks)+' point build',description:editing?'Exported build plan.':'Exported skill allocation.',skillRanks:{...ranks}};
        const source=JSON.stringify(data,null,2)+'\n',url=URL.createObjectURL(new Blob([source],{type:'application/json'}));
        const link=document.createElement('a');link.href=url;link.download='copers-build-'+count(ranks)+'sp.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
        $('skillBuildStatus').textContent=editing?'Exported the build you are editing.':'Exported your confirmed skill allocation. Pending points are not included.';return data;
    }
    $('importSkillBuildFile').addEventListener('change',async event=>{
        const file=event.target.files[0];event.target.value='';if(!file)return;
        try {if(file.size>1000000)throw new Error('Build files must be smaller than 1 MB.');showPreview(JSON.parse(await file.text()));}
        catch(error){$('skillBuildStatus').textContent='Could not import build: '+error.message;}
    });
    $('applySkillBuild').addEventListener('click',()=>{try{applyPreview();}catch(error){$('skillBuildError').textContent=error.message;}});
    $('cancelSkillBuild').addEventListener('click',()=>{$('skillBuildDialog').close();preview=null;});
    $('importSkillBuild').addEventListener('click',()=>$('importSkillBuildFile').click());
    $('exportSkillBuild').addEventListener('click',exportCurrent);
    $('skillPresetSlot').addEventListener('change',event=>{selectedPreset=Number(event.target.value);renderPresets();});
    $('renameSkillPreset').addEventListener('click',()=>{
        if(renamingPreset){finishRename();return;}
        $('skillPresetName').value=presets[selectedPreset].name;setRenaming(true);
        $('skillPresetName').focus();$('skillPresetName').select();
    });
    $('skillPresetName').addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key==='Escape') {
            event.preventDefault();event.stopPropagation();
            if(finishRename(event.key==='Escape'))$('renameSkillPreset').focus();
        }
    });
    $('skillPresetName').addEventListener('blur',event=>{if(event.relatedTarget!==$('renameSkillPreset'))finishRename();});
    $('saveSkillPreset').addEventListener('click',()=>{try{savePreset();}catch(error){$('skillBuildStatus').textContent='Could not save preset: '+error.message;}});
    $('loadSkillPreset').addEventListener('click',()=>{try{const slot=presets[selectedPreset];if(slot.build)showPreview({...slot.build,name:slot.name});}catch(error){$('skillBuildStatus').textContent='Could not load preset: '+error.message;}});
    window.SkillBuilds={validate,showPreview,applyPreview,exportCurrent,beginEditing,editNode,applyEditing,cancelEditing,
        isEditing:()=>Boolean(editing),getEditingRanks:()=>editing?{...editing.skillRanks}:{},updateEditingUi,
        clearEditing:()=>{if(editing){editing.skillRanks={};renderUpgrades();}},savePreset,
        openImport:()=>$('importSkillBuildFile').click()};
    renderPresets();
}());
