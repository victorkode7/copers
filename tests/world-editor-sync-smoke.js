(function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const clone=value=>JSON.parse(JSON.stringify(value)),$=id=>document.getElementById(id);
    const draftKey='idleAdventureWorldEditorDraft',baselineKey='idleAdventureWorldEditorProjectText',phaseKey='worldEditorSyncSmoke';
    try {
        const phase=JSON.parse(sessionStorage.getItem(phaseKey)||'null');
        if(!phase) {
            const base={maps:[{id:'sample',name:'Old map',description:'Old description',goal:1}]};
            const edited=clone(base);edited.maps[0].description='My custom description';edited.maps[0].goal=777;
            const incoming=clone(base);incoming.maps[0].name='New project name';incoming.maps[0].description='New project description';
            WorldEditorSync.mergeMapText(edited,incoming,WorldEditorSync.snapshot(base));
            check('project names refresh while edited descriptions and gameplay values stay intact',edited.maps[0].name==='New project name'&&edited.maps[0].description==='My custom description'&&edited.maps[0].goal===777);
            check('merging unchanged project text is idempotent',WorldEditorSync.mergeMapText(edited,incoming,WorldEditorSync.snapshot(incoming)).length===0);
            const legacy=clone(window.adventureWorld),ids=legacy.worlds[1].mapIds;
            ids.forEach((id,index)=>{const map=legacy.maps.find(entry=>entry.id===id);map.name=String(index+1);map.description='';});
            const custom=legacy.maps.find(map=>map.id===ids[2]);custom.name='My Snowman Arena';custom.description='My custom snowman joke.';
            const first=legacy.maps.find(map=>map.id===ids[0]);first.goal=777;first.background.dim=.42;
            legacy.monsters[0].health+=123;
            localStorage.setItem(draftKey,JSON.stringify(legacy));localStorage.removeItem(baselineKey);
            $('mapWorld').value=legacy.worlds[1].id;$('mapWorld').dispatchEvent(new Event('change',{bubbles:true}));
            sessionStorage.setItem(phaseKey,JSON.stringify({checks,ids,health:legacy.monsters[0].health}));location.reload();return;
        }
        checks.push(...phase.checks);sessionStorage.removeItem(phaseKey);
        const restored=JSON.parse(localStorage.getItem(draftKey));
        check('old numbered map names update automatically on reload',phase.ids.every((id,index)=>restored.maps.find(map=>map.id===id).name===(index===2?'My Snowman Arena':window.adventureWorld.maps.find(map=>map.id===id).name)));
        check('empty legacy descriptions gain the current project text',phase.ids.every((id,index)=>restored.maps.find(map=>map.id===id).description===(index===2?'My custom snowman joke.':window.adventureWorld.maps.find(map=>map.id===id).description)));
        const first=restored.maps.find(map=>map.id===phase.ids[0]);
        check('draft monster stats, kill goals and background settings are preserved',first.goal===777&&first.background.dim===.42&&restored.monsters[0].health===phase.health);
        check('the editor list and selected map form show the new names',$('entryName').value===first.name&&$('entryList').querySelector('[data-entry-id="'+first.id+'"] strong').textContent===first.name&&$('mapDescription').value===first.description);
        check('source text baseline is stored for later project changes',JSON.parse(localStorage.getItem(baselineKey))[first.id].name===first.name);
        const guano=clone(window.adventureWorld),map=guano.maps.find(entry=>entry.name==='Guano Gorge');
        map.description='A narrow ice bridge beneath a very large bat colony. The snow here is not always snow. Keep your mouth closed.';
        WorldEditorSync.mergeMapText(guano,window.adventureWorld);
        check('previous published Guano descriptions update to the chosen version',map.description===window.adventureWorld.maps.find(entry=>entry.id===map.id).description);
        let invalid=false;try{WorldEditorSync.parse('window.adventureWorld = {}; alert(1);');}catch{invalid=true;}
        check('project text is parsed without executing arbitrary JavaScript',invalid);
        check('no runtime errors',!window.smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    const pre=document.createElement('pre');pre.id='smoke-results';pre.textContent=checks.join('\n');document.body.append(pre);
}());
