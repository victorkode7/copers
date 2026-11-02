(async function () {
    const preview=new URL(document.currentScript.src).searchParams.has('preview');
    const checks=[],$=id=>document.getElementById(id),check=(name,ok)=>{checks.push((ok?'PASS ':'FAIL ')+name);if(!ok)throw new Error(name);};
    const draft=()=>JSON.parse(localStorage.getItem('idleAdventureWorldEditorDraft'))||window.adventureWorld;
    const editor=()=>document.querySelector('.mastery-editor');
    const choose=id=>editor().querySelector('[data-mastery-node="'+id+'"]').click();
    const click=text=>[...editor().querySelectorAll('button')].find(button=>button.textContent===text).click();
    const input=(node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));};
    const group=title=>[...editor().querySelectorAll('.mastery-editor-bonuses')].find(section=>section.querySelector('h3').textContent===title);
    const currentMap=()=>draft().maps.find(map=>map.id===$('entryId').value);
    try {
        const world=window.adventureWorld.worlds[0],mapId=$('entryId').value;
        editor().open=true;
        check('each map exposes a mastery editor with the requested layout',editor().querySelectorAll('[data-mastery-node]').length===14&&editor().querySelector('fieldset').disabled);
        check('ordinary maps initially inherit a world preset',!currentMap().masteryTree&&editor().textContent.includes('regular preset'));
        click('Edit world regular preset');choose('wealth1');
        input(group('Bonuses').querySelector('input[type=number]'),'.5');
        let data=draft(),tree=data.worlds[0].masteryPresets.regular;
        check('editing the world preset saves shared bonuses',tree.nodes.find(node=>node.id==='wealth1').stats.goldBonus===.5&&!currentMap().masteryTree);
        const other=data.maps.find(map=>map.id!==mapId&&data.worlds[0].mapIds.includes(map.id)&&map.id!==data.worlds[0].mapIds.at(-1));
        check('other regular maps inherit the edited preset',MasterySystem.tree(data,other).nodes.find(node=>node.id==='wealth1').stats.goldBonus===.5);
        check('other worlds and boss presets remain independent',MasterySystem.preset(data,data.worlds[1],'regular').nodes.find(node=>node.id==='wealth1').stats.goldBonus===.1&&MasterySystem.preset(data,data.worlds[0],'boss').nodes.find(node=>node.id==='wealth1').stats.goldBonus!==.5);
        click('Customize for this map');choose('wealth1');
        input(group('Bonuses').querySelector('input[type=number]'),'.8');
        input(group('Trade-offs').querySelector('input[type=number]'),'10');
        data=draft();tree=currentMap().masteryTree;
        check('a map can customize positive and negative modifiers separately',tree.nodes.find(node=>node.id==='wealth1').stats.goldBonus===.8&&tree.nodes.find(node=>node.id==='wealth1').penalties.monsterHealthMultiplier===10);
        check('custom map edits do not alter the shared preset',data.worlds[0].masteryPresets.regular.nodes.find(node=>node.id==='wealth1').stats.goldBonus===.5&&data.worlds[0].masteryPresets.regular.nodes.find(node=>node.id==='wealth1').penalties.monsterHealthMultiplier===1.25);
        input(editor().querySelector('[aria-label="Mastery node name"]'),'Very Greedy');
        check('node names update the tree preview without losing bonus edits',editor().querySelector('[data-mastery-node="wealth1"]').textContent.includes('Very Greedy')&&currentMap().masteryTree.nodes.find(node=>node.id==='wealth1').stats.goldBonus===.8);
        const tradeSelect=group('Trade-offs').querySelector('select[aria-label="Trade-offs stat"]');
        check('trade-off choices include population, respawn, drop rates and enemy damage', ['monsterCountBonus','monsterRespawnMultiplier','dropRateMultiplier','monsterDamageMultiplier','monsterAccuracyMultiplier'].every(id=>[...tradeSelect.options].some(option=>option.value===id)));
        input(group('Trade-offs').querySelector('input[type=number]'),'0');
        check('invalid mastery multipliers are caught by content validation',MasterySystem.validateContent(draft()).some(error=>error.includes('mastery bonus or trade-off')));
        input(group('Trade-offs').querySelector('input[type=number]'),'10');
        click('Use world preset');
        check('removing a map override returns to its world preset',!currentMap().masteryTree&&editor().querySelector('fieldset').disabled);
        $('undo').click();editor().open=true;
        check('undo restores the map-specific tree and its penalties',currentMap().masteryTree.nodes.find(node=>node.id==='wealth1').penalties.monsterHealthMultiplier===10);
        click('Use world preset');
        const type=editor().querySelector('[aria-label="Mastery encounter type"]');type.value='boss';type.dispatchEvent(new Event('change'));
        check('a map can explicitly use its world boss preset',currentMap().masteryType==='boss'&&editor().textContent.includes('boss preset')&&MasterySystem.tree(draft(),currentMap()).nodes.find(node=>node.id==='capstone').name==='Challenge the Throne');
        document.querySelector('[data-kind="worlds"]').click();editor().open=true;
        const preset=editor().querySelector('[aria-label="Mastery preset to edit"]');preset.value='boss';preset.dispatchEvent(new Event('change'));choose('wealth1');
        input(group('Bonuses').querySelector('input[type=number]'),'.9');
        check('world inspectors expose separate boss and regular preset editors',draft().worlds[0].masteryPresets.boss.nodes.find(node=>node.id==='wealth1').stats.goldBonus===.9&&draft().worlds[0].masteryPresets.regular.nodes.find(node=>node.id==='wealth1').stats.goldBonus===.5);
        let blob;const createUrl=URL.createObjectURL,anchorClick=HTMLAnchorElement.prototype.click;
        try{URL.createObjectURL=value=>{blob=value;return 'blob:mastery-test';};HTMLAnchorElement.prototype.click=()=>{};$('exportJson').click();}
        finally{URL.createObjectURL=createUrl;HTMLAnchorElement.prototype.click=anchorClick;}
        const exported=JSON.parse(await blob.text());
        check('JSON exports preserve mastery presets and map encounter types',exported.worlds[0].masteryPresets.boss.nodes.find(node=>node.id==='wealth1').stats.goldBonus===.9&&exported.maps.find(map=>map.id===mapId).masteryType==='boss'&&!MasterySystem.validateContent(exported).length);
        check('mastery editing fits the viewport',document.documentElement.scrollWidth<=innerWidth);
        if(preview)editor().scrollIntoView({block:'start'});
        check('no editor runtime errors',!window.smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
