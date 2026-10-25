(async function () {
    const checks = [];
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const $ = id => document.getElementById(id);
    const editor = Boolean($('nodeForm'));
    const settle = () => new Promise(resolve => setTimeout(resolve, 0));
    const input = (element, value) => { element.value = value; element.dispatchEvent(new Event('input', {bubbles:true})); };
    const uniqueIds = ['shockwaveSlash','poisonExecute','bloomingFlower','piercingArrow','forkingArrow','multiShot','freezingArrows','volcanicEruption'];
    const speedNode = window.adventureSkillTree.nodes.find(node=>node.id==='quickHands') || window.adventureSkillTree.nodes.find(node=>Math.abs((node.stats?.attackSpeedMultiplier||0)-1/.99)<1e-10);
    const hasLongPercentage = value => /\d+\.\d{3,}%/.test(value);
    try {
        const sample = {id:'ordinary', effect:'Outdated hand-written description', stats:{health:12,healthMultiplier:1.123456,damage:2.5,attackSpeedPerLevel:.005,poisonChance:.123456,poisonTickRateMultiplier:1.25,goldBonus:.100001}};
        const originalStats = JSON.stringify(sample.stats);
        const description = SkillDescriptions.describe(sample);
        check('ordinary descriptions come from flat bonuses, percentages, multipliers, and level scaling', description === '+12 maximum health\n+12.35% maximum health\n+2.5 damage\n+0.5% attack speed per character level\n+12.35% poison chance\n+25% poison tick speed\n+10% gold gained');
        check('description formatting never changes stat precision', JSON.stringify(sample.stats)===originalStats && !hasLongPercentage(description));
        check('penalties and neutral multipliers format correctly', SkillDescriptions.describe({customDescription:false,stats:{damageMultiplier:.87554,healthMultiplier:1}})==='-12.45% damage');
        check('a custom unique effect overrides automatic stat text', SkillDescriptions.describe({id:'piercingArrow',effect:'Keep this unique arrow effect.',stats:{damage:1}})==='Keep this unique arrow effect.');
        check('new unique effects can explicitly keep custom descriptions alongside stat bonuses', SkillDescriptions.describe({customDescription:true,effect:'A new unique mechanic.',stats:{health:20}})==='A new unique mechanic.');
        const legacy={nodes:[{id:'plain',effect:'Wrong text',stats:{accuracy:7}},{id:'piercingArrow',effect:'Unique text',stats:{damage:1}},{id:'storyNode',effect:'A unique mechanic without stat bonuses.',stats:{}}]};
        SkillDescriptions.normalize(legacy);
        check('older content gains automatic descriptions while unique text survives', legacy.nodes[0].effect==='+7 accuracy' && legacy.nodes[0].customDescription===false && legacy.nodes[1].customDescription===true && legacy.nodes[2].effect==='A unique mechanic without stat bonuses.');
        const copied=JSON.parse(JSON.stringify(legacy.nodes[1]));copied.id='aDifferentId';
        check('copied or renamed unique nodes retain their custom description', SkillDescriptions.describe(copied)==='Unique text');

        if (editor) {
            const choose = id => $('nodeList').querySelector('[data-node-id="'+id+'"]').click();
            const savedNode = id => JSON.parse(localStorage.getItem('idleAdventureSkillEditorDraft')).tree.nodes.find(node=>node.id===id);
            const cardText = id => $('graphNodes').querySelector('[data-node-id="'+id+'"] .graph-node-effect').textContent;
            for (const id of uniqueIds) {
                choose(id);
                const original=window.adventureSkillTree.nodes.find(node=>node.id===id);
                check(id+' keeps its existing editable unique description', $('nodeCustomDescription').checked && !$('nodeEffect').readOnly && $('nodeEffect').value===original.effect);
            }
            choose('eruptionChain');
            check('chain nodes expose an additive maximum-chain bonus', $('statBonusRows').querySelector('select').value==='eruptionChains'&&$('statBonusRows').querySelectorAll('select')[1].disabled&&!$('nodeCustomDescription').checked&&$('nodeEffect').value==='+1 maximum eruption chains');
            input($('statBonusRows').querySelector('input'),'2');await settle();
            check('editing the chain bonus updates its saved stat and automatic description',savedNode('eruptionChain').stats.eruptionChains===2&&$('nodeEffect').value==='+2 maximum eruption chains'&&$('statsError').hidden);
            $('duplicateNode').click();await settle();
            check('duplicating a chain node preserves its additive bonus',savedNode($('nodeId').value).stats.eruptionChains===2);
            choose(speedNode.id);
            check('ordinary editor descriptions are generated and read-only', !$('nodeCustomDescription').checked && $('nodeEffect').readOnly && $('nodeEffect').value==='+1.01% attack speed');
            choose('healthNode');
            input($('statBonusRows').querySelector('input'),'25.12345');await settle();
            check('editing a stat updates the inspector, card, and stored description without rounding the stat', $('nodeEffect').value==='+25.12 maximum health' && cardText('healthNode')==='+25.12 maximum health' && savedNode('healthNode').stats.health===25.12345 && savedNode('healthNode').effect==='+25.12 maximum health');
            $('addStatBonus').click();
            const row=$('statBonusRows').lastElementChild, selects=row.querySelectorAll('select');
            selects[0].value='poisonChance';selects[0].dispatchEvent(new Event('change',{bubbles:true}));
            input(row.querySelector('input'),'.1234567');await settle();
            check('multiple bonuses produce separate description lines with at most two percentage decimals', $('nodeEffect').value==='+25.12 maximum health\n+12.35% poison chance' && cardText('healthNode')===$('nodeEffect').value);
            input($('nodeSearch'),'12.35% poison chance');
            check('node search includes the generated effects', Boolean($('nodeList').querySelector('[data-node-id="healthNode"]')));
            input($('nodeSearch'),'');
            row.querySelector('button').click();await settle();
            check('removing a bonus immediately updates the generated description', $('nodeEffect').value==='+25.12 maximum health' && !Object.hasOwn(savedNode('healthNode').stats,'poisonChance'));
            $('nodeCustomDescription').checked=true;$('nodeCustomDescription').dispatchEvent(new Event('change',{bubbles:true}));
            input($('nodeEffect'),'A custom effect with ');
            check('editing custom descriptions preserves spaces while typing', $('nodeEffect').value==='A custom effect with ');
            input($('nodeEffect'),'A custom effect with a stat bonus.');
            input($('statBonusRows').querySelector('input'),'50');await settle();
            check('stat edits preserve custom unique-effect text', $('nodeEffect').value==='A custom effect with a stat bonus.' && cardText('healthNode')===$('nodeEffect').value && savedNode('healthNode').stats.health===50);
            $('nodeCustomDescription').checked=false;$('nodeCustomDescription').dispatchEvent(new Event('change',{bubbles:true}));await settle();
            check('switching back to automatic mode reflects the current bonuses', $('nodeEffect').readOnly && $('nodeEffect').value==='+50 maximum health');
            $('undoEdit').click();await settle();
            check('undo restores custom-description mode and its text', $('nodeCustomDescription').checked && $('nodeEffect').value==='A custom effect with a stat bonus.');
            choose('forkingArrow');$('duplicateNode').click();await settle();
            check('duplicating a unique skill preserves its custom description mode', $('nodeCustomDescription').checked && $('nodeEffect').value===window.adventureSkillTree.nodes.find(node=>node.id==='forkingArrow').effect);
            const blobs=new Map(), originalUrl=URL.createObjectURL, originalClick=HTMLAnchorElement.prototype.click;
            let exported;
            try {
                URL.createObjectURL=blob=>{const url=originalUrl.call(URL,blob);blobs.set(url,blob);return url;};
                HTMLAnchorElement.prototype.click=function(){exported=blobs.get(this.href);};
                $('exportJson').click();const data=JSON.parse(await exported.text());
                check('exports preserve both custom descriptions and generated ordinary effects', data.nodes.find(node=>node.id===speedNode.id).effect==='+1.01% attack speed' && data.nodes.find(node=>node.id==='healthNode').customDescription===true && data.nodes.find(node=>node.id==='healthNode').effect==='A custom effect with a stat bonus.');
            } finally {URL.createObjectURL=originalUrl;HTMLAnchorElement.prototype.click=originalClick;}
        } else {
            state.currentView='upgrades';render();
            const showTooltip = id => {
                const button=document.querySelector('[data-skill-node="'+id+'"]');
                button.dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));
                return $('skillNodeTooltip').querySelector('span').textContent;
            };
            check('game tooltips show generated ordinary bonuses', showTooltip(speedNode.id)==='+1.01% attack speed');
            check('multi-stat tooltips list all bonuses', showTooltip('basicallySnake')==='+50% poison chance\n+25% poison tick speed');
            for(const id of uniqueIds) check(id+' retains its unique game tooltip', showTooltip(id)===skillNodeById[id].effect);
            const node=skillNodeById.mightyBlows;
            node.stats={damage:2.345678,poisonChance:.123456789};node.effect='Stale description';renderUpgrades();
            check('tooltips, node text, and accessible labels all use current bonuses', showTooltip(node.id)==='+2.35 damage\n+12.35% poison chance' && document.querySelector('[data-skill-node="'+node.id+'"] .skill-node-effect').textContent===SkillDescriptions.describe(node) && document.querySelector('[data-skill-node="'+node.id+'"]').getAttribute('aria-label').includes('+12.35% poison chance'));
            check('game description generation keeps combat stats at full precision', node.stats.damage===2.345678 && node.stats.poisonChance===.123456789);
        }
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch(error) {checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
