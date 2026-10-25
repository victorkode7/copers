(async function () {
    const checks=[];
    const check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const $=id=>document.getElementById(id);
    const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
    const input=(element,value)=>{element.value=value;element.dispatchEvent(new Event('input',{bubbles:true}));};
    const change=(element,value)=>{element.value=value;element.dispatchEvent(new Event('change',{bubbles:true}));};
    async function exportData(button) {
        const originalUrl=URL.createObjectURL, originalClick=HTMLAnchorElement.prototype.click, blobs=new Map();let download;
        try {
            URL.createObjectURL=blob=>{const url=originalUrl.call(URL,blob);blobs.set(url,blob);return url;};
            HTMLAnchorElement.prototype.click=function(){download=blobs.get(this.href);};
            button.click();return JSON.parse(await download.text());
        } finally {URL.createObjectURL=originalUrl;HTMLAnchorElement.prototype.click=originalClick;}
    }
    try {
        if(typeof SkillStatCompat!=='undefined') {
            const legacy={statSchemaVersion:2,nodes:[{id:'maxFury',stats:{damage:1}},{id:'ordinaryDamage',stats:{damage:1}}]};
            SkillStatCompat.normalize(legacy);
            check('older editor drafts migrate only the Fury placeholder to its new stat',legacy.nodes[0].stats.maxFury===1&&!Object.hasOwn(legacy.nodes[0].stats,'damage')&&legacy.nodes[1].stats.damage===1);
            legacy.nodes[0].stats={damage:1};SkillStatCompat.normalize(legacy);
            check('the one-time migration preserves later intentional node edits',legacy.nodes[0].stats.damage===1&&!Object.hasOwn(legacy.nodes[0].stats,'maxFury'));
        }
        if($('nodeForm')) {
            $('nodeList').querySelector('[data-node-id="maxFury"]').click();
            check('Fury grants one Maximum Fury instead of placeholder damage', $('nodeEffect').value==='+1 maximum fury'&&$('statBonusRows').querySelector('select').value==='maxFury');
            input($('statBonusRows').querySelector('input'),'12');await settle();
            check('flat Maximum Fury bonuses update the node description', $('nodeEffect').value==='+12 maximum fury');
            $('addStatBonus').click();const row=$('statBonusRows').lastElementChild,selects=row.querySelectorAll('select');
            selects[0].value='maxFury';selects[1].value='multiplier';row.querySelector('input').value='1.5';
            row.querySelector('input').dispatchEvent(new Event('input',{bubbles:true}));await settle();
            check('skill nodes support both flat and multiplicative Maximum Fury bonuses', $('nodeEffect').value==='+12 maximum fury\n+50% maximum fury'&&$('statsError').hidden);
            const exported=await exportData($('exportJson')),node=exported.nodes.find(node=>node.id==='maxFury');
            check('skill exports retain editable Fury bonuses at full precision',node.stats.maxFury===12&&node.stats.maxFuryMultiplier===1.5&&node.customDescription===false);
            check('Maximum Fury is accepted by skill validation',!$('validationList').textContent.includes('unsupported stat "maxFury'));
        } else if($('itemForm')) {
            $('addItem').click();$('addStat').click();change($('statRows').querySelector('select'),'maxFury');
            change($('statRows').querySelector('input'),'10');
            check('the item editor offers flat Maximum Fury and previews its value', $('preview').textContent.includes('+10 Maximum fury'));
            check('the Fury value guide explains future capacity without activating a resource', $('statRows').querySelector('.stat-guide').textContent.includes('Reserved for future Fury mechanics'));
            $('addStat').click();let row=$('statRows').lastElementChild;change(row.querySelector('select'),'maxFuryMultiplier');
            row=$('statRows').lastElementChild;change(row.querySelector('input'),'1.5');
            check('items also support Maximum Fury multipliers', $('preview').textContent.includes('+50% Maximum fury'));
            check('every Fury item stat has a value guide',ItemStatGuides.get('maxFury')&&ItemStatGuides.get('maxFuryMultiplier'));
            const exported=await exportData($('exportJson')),item=exported.items.find(item=>item.id===$('itemId').value);
            check('item exports preserve the configured Fury stats',item.stats.maxFury===10&&item.stats.maxFuryMultiplier===1.5&&Equipment.validate(exported).length===0);
        } else {
            state.skillRanks={};pendingSkillRanks={};state.level=0;state.skillPoints=0;state.experience=0;
            state.gear=createEmptyGear();state.ownedItemIds=[];state.crafted=[];state.upgrades={strength:0,haste:0,evasion:0};
            check('Maximum Fury starts at zero without granting a combat bonus',getPlayerMaxFury()===0&&getDamage()===2);
            state.skillRanks={maxFury:1};state.level=1;render();
            check('the Fury node grants one capacity and shows it in the build panel',getPlayerMaxFury()===1&&elements.maxFury.textContent==='1'&&getDamage()===2);
            const originalFury={...skillNodeById.maxFury.stats},originalHealth={...skillNodeById.healthNode.stats},originalItem={...itemById.testAmulet.stats};
            try {
                skillNodeById.maxFury.stats={maxFury:1,maxFuryMultiplier:2};
                skillNodeById.healthNode.stats={...originalHealth,maxFury:9};
                itemById.testAmulet.stats={maxFury:5,maxFuryMultiplier:1.5};
                state.skillRanks={maxFury:1,healthNode:1};state.level=2;state.ownedItemIds=['testAmulet'];state.gear.necklace='testAmulet';render();
                check('node and item capacity bonuses add before their multipliers',getPlayerMaxFury()===45&&elements.maxFury.textContent==='45');
                check('Fury gear has readable tooltips and comparison values',Equipment.describe(itemById.testAmulet)==='+5 Maximum fury\n+50% Maximum fury'&&Equipment.compare(itemById.testAmulet,null).every(line=>line.status==='new'));
                check('Maximum Fury changes do not grant damage or activate Fury spending',getDamage()===2);
                const pathTo=id=>{
                    const queue=skillNodes.filter(node=>node.start).map(node=>[node.id]),seen=new Set(queue.flat());
                    for(let index=0;index<queue.length;index++){
                        const path=queue[index],last=path.at(-1);if(last===id)return path;
                        skillNodeConnections[last].forEach(next=>{if(!seen.has(next)){seen.add(next);queue.push([...path,next]);}});
                    }
                    throw new Error('No path to '+id);
                };
                const ids=new Set([...pathTo('maxFury'),...pathTo('healthNode')]);
                state.skillRanks=Object.fromEntries([...ids].filter(id=>!skillNodeById[id].start).map(id=>[id,1]));
                state.level=Object.keys(state.skillRanks).length;state.skillPoints=0;state.experience=0;state.playerHp=getPlayerMaxHealth();
                const expected=getPlayerMaxFury();saveGame();
                check('Fury bonuses recompute correctly after saving and loading',loadGame()&&getPlayerMaxFury()===expected&&state.gear.necklace==='testAmulet');
                state.gear=createEmptyGear();state.skillRanks={maxFury:1};skillNodeById.maxFury.stats={maxFury:-5};
                check('penalties cannot reduce maximum capacity below zero',getPlayerMaxFury()===0);
                const invalid=WorldContent.clone(itemData);invalid.items.find(item=>item.id==='testAmulet').stats.maxFuryMultiplier=0;
                check('invalid Fury multipliers are rejected by the normal item validator',Equipment.validate(invalid).some(error=>error.includes('maxFuryMultiplier')));
            } finally {skillNodeById.maxFury.stats=originalFury;skillNodeById.healthNode.stats=originalHealth;itemById.testAmulet.stats=originalItem;}
        }
        check('no runtime errors: '+window.smokeErrors.join('; '),!window.smokeErrors.length);checks.push('SMOKE PASSED');
    } catch(error){checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
