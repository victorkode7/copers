(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const clone=value=>JSON.parse(JSON.stringify(value)),$=id=>document.getElementById(id),settle=()=>new Promise(resolve=>setTimeout(resolve,5));
    try {
        const legacy=clone(window.adventureSkillTree);legacy.spellSchemaVersion=1;
        const mana=legacy.nodes.find(node=>node.id==='baseMana1'),storm=legacy.nodes.find(node=>node.id==='voidBolt'),volley=legacy.nodes.find(node=>node.id==='voidVolley');
        mana.stats={};mana.customDescription=true;mana.effect='+100 Maximum mana';mana.column=-12;mana.row=17;mana.sprite='tests/fixtures/equipment-sprite.svg';
        storm.id='thunderstorm';storm.name='Thunderstorm';storm.effect='Summon lightning that chains through Wet enemies.';
        volley.id='saltWaterBolt';volley.name='Saltwater Bolt';volley.effect='Inflict Wet for 10s.';
        legacy.nodes.forEach(node=>{node.requires=node.requires.map(id=>id==='voidBolt'?'thunderstorm':id==='voidVolley'?'saltWaterBolt':id);});
        const normalized=SkillDescriptions.normalize(SkillStatCompat.normalize(legacy));
        check('unfinished mana nodes in old editor drafts gain working stats',normalized.nodes.find(node=>node.id==='baseMana1').stats.mana===100&&!mana.customDescription&&mana.effect==='+100 maximum mana');
        check('draft migration preserves positions, artwork and connections',mana.column===-12&&mana.row===17&&mana.sprite==='tests/fixtures/equipment-sprite.svg'&&normalized.nodes.find(node=>node.id==='voidVolley').requires.includes('voidBolt'));
        check('old spells in editor drafts become Void Bolt and Void Volley',storm.id==='voidBolt'&&volley.id==='voidVolley'&&storm.effect.includes('5 mana')&&volley.effect.includes('10 missiles')&&!storm.effect.includes('Wet'));
        check('replacement targeting tags are migrated',storm.abilityTargeting==='singleTarget'&&volley.abilityTargeting==='aoe');
        check('normalization is idempotent',JSON.stringify(SkillDescriptions.normalize(SkillStatCompat.normalize(clone(normalized))))===JSON.stringify(normalized));
        mana.name='My mana';mana.stats.mana=240;mana.effect='My custom reserve';mana.customDescription=true;
        const edited=SkillDescriptions.normalize(SkillStatCompat.normalize(clone(normalized))).nodes.find(node=>node.id==='baseMana1');
        check('later custom node names, stats and descriptions remain editable',edited.name==='My mana'&&edited.stats.mana===240&&edited.effect==='My custom reserve');
        document.querySelector('#nodeList [data-node-id="baseMana1"]').click();await settle();
        const row=document.querySelector('.stat-bonus-row'),stat=row.querySelector('[aria-label="Bonus stat"]'),value=row.querySelector('input');
        check('mana stat controls and the mana node color are available',stat.value==='mana'&&value.value==='100'&&$('nodeType').value==='mana'&&document.querySelector('.graph-node[data-node-id="baseMana1"]').classList.contains('type-mana'));
        check('all mana and spell stats are selectable', ['mana','spellDamage','manaRegen','manaRegenIncrease','manaRegenPercent'].every(id=>Array.from(stat.options).some(option=>option.value===id)));
        value.value='140';value.dispatchEvent(new Event('input',{bubbles:true}));await settle();
        const draft=JSON.parse(localStorage.getItem('idleAdventureSkillEditorDraft'));
        check('editing mana updates the saved stat and automatic description',draft.tree.nodes.find(node=>node.id==='baseMana1').stats.mana===140&&$('nodeEffect').value==='+140 maximum mana');
        check('new spell nodes avoid structure errors for missing stat bonuses',!$('validationList').textContent.includes('Void Bolt: no stat bonus')&&!$('validationList').textContent.includes('Void Volley: no stat bonus'));
        check('no runtime errors: '+window.smokeErrors.join('; '),!window.smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
