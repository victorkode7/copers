(async function () {
    const checks=[],check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const $=id=>document.getElementById(id),near=(a,b)=>Math.abs(a-b)<1e-6,settle=()=>new Promise(resolve=>setTimeout(resolve,0));
    try {
        const legacy={nodes:[{id:'shieldSlam',stats:{}},{id:'multiShot',stats:{},abilityTargeting:'aoe'},{id:'volcanicEruption',stats:{},abilityTargeting:null},{id:'ordinary',stats:{health:1}},{id:'newAbility',stats:{},abilityTargeting:'singleTarget'}]};
        SkillDescriptions.normalize(legacy);
        check('older abilities receive default tags without tagging ordinary stat nodes',legacy.nodes[0].abilityTargeting==='singleTarget'&&!Object.hasOwn(legacy.nodes[3],'abilityTargeting'));
        check('normalization preserves customized tags and intentional removals',legacy.nodes[1].abilityTargeting==='aoe'&&legacy.nodes[2].abilityTargeting===null);
        check('new abilities can carry a tag independently of their identifier',SkillDescriptions.abilityTagLabel(legacy.nodes[4])==='Single target');
        check('invalid or missing tags cannot grant single-target eligibility',SkillDescriptions.getAbilityTargeting({id:'newAbility',abilityTargeting:'invalid'})===null&&SkillDescriptions.getAbilityTargeting({id:'ordinary'})===null);
        if ($('nodeForm')) {
            const choose=id=>$('nodeList').querySelector('[data-node-id="'+id+'"]').click();
            const change=value=>{const control=$('nodeAbilityTargeting');control.value=value;control.dispatchEvent(new Event('change',{bubbles:true}));};
            const saved=()=>JSON.parse(localStorage.getItem('idleAdventureSkillEditorDraft')).tree;
            choose('multiShot');check('the editor shows the default Single target tag',$('nodeAbilityTargeting').value==='singleTarget');
            change('aoe');await settle();choose('shieldSlam');choose('multiShot');
            check('tag edits save and survive switching selected nodes',$('nodeAbilityTargeting').value==='aoe'&&saved().nodes.find(node=>node.id==='multiShot').abilityTargeting==='aoe');
            check('the list and graph hover text show the ability tag',$('nodeList').querySelector('[data-node-id="multiShot"]').textContent.includes('AOE')&&$('graphNodes').querySelector('[data-node-id="multiShot"]').title.includes('AOE'));
            const originalUrl=URL.createObjectURL,originalClick=HTMLAnchorElement.prototype.click,blobs=new Map();let download;
            try {
                URL.createObjectURL=blob=>{const url=originalUrl.call(URL,blob);blobs.set(url,blob);return url;};
                HTMLAnchorElement.prototype.click=function(){download=blobs.get(this.href);};
                $('exportJson').click();const data=JSON.parse(await download.text());
                check('exported trees retain the ability targeting tag',data.nodes.find(node=>node.id==='multiShot').abilityTargeting==='aoe');
            } finally {URL.createObjectURL=originalUrl;HTMLAnchorElement.prototype.click=originalClick;}
            $('duplicateNode').click();await settle();
            check('duplicating an ability keeps its tag',$('nodeAbilityTargeting').value==='aoe'&&saved().nodes.find(node=>node.id===$('nodeId').value).abilityTargeting==='aoe');
            choose('multiShot');change('');await settle();
            const untagged=SkillDescriptions.normalize(saved()).nodes.find(node=>node.id==='multiShot');
            check('removing a tag stays removed when the draft is normalized',untagged.abilityTargeting===null&&SkillDescriptions.abilityTagLabel(untagged)==='');
            change('singleTarget');await settle();$('undoEdit').click();await settle();
            check('undo restores the previous tag state',$('nodeAbilityTargeting').value==='');
        } else {
            const originalRandom=Math.random,originalStats=itemById.testAmulet.stats,map=currentMap();
            const defaults={multiShot:'singleTarget',shieldSlam:'singleTarget',overflowingSlam:'aoe',shockwaveSlash:'aoe',piercingArrow:'aoe',forkingArrow:'aoe',volcanicEruption:'aoe',righteousFire:'aoe'};
            const originalTags=new Map(Object.keys(defaults).filter(id=>skillNodeById[id]).map(id=>[id,{present:Object.hasOwn(skillNodeById[id],'abilityTargeting'),value:skillNodeById[id].abilityTargeting}]));
            function fresh(ranks={},count=4) {
                combatStatCache=null;clearFury();state.shieldStacks=0;state.skillRanks={...ranks};pendingSkillRanks={};
                state.level=Object.keys(ranks).length;state.experience=0;state.skillPoints=0;state.upgrades={strength:0,haste:0,evasion:0};
                state.gear=createEmptyGear();state.gear.necklace='testAmulet';state.ownedItemIds=['testAmulet'];state.crafted=[];itemById.testAmulet.stats={bleedChance:1};
                state.kills=Object.fromEntries(mapData.map(entry=>[entry.id,0]));state.materials=Object.fromEntries(Object.keys(materialNames).map(id=>[id,0]));state.gold=0;state.lootLog=[];state.lastLoot=null;state.tutorials=createTutorialState();
                state.selectedMap=map.id;state.selectedWorld=worldForMap(map.id).id;state.currentView='map';state.isInTown=false;state.playerHp=100;state.combatPaused=false;state.attackTimer=0;
                map.drops=[];map.itemDrops=[];map.spawns=[{id:'tagMob',monsterId:worldContent.monsters[0].id,count,overrides:{health:1000,attackDamage:0,attackInterval:1000,accuracy:100,evasion:0,respawnSeconds:2,gold:[1,1],experience:0,drops:[],itemDrops:[]}}];
                for(const [id,tag] of Object.entries(defaults))if(skillNodeById[id])skillNodeById[id].abilityTargeting=tag;
                resetMonsterStates(map);state.monsterColumns=2;resetCombatClock();clearOfflineRecap();Math.random=()=>0;return state.monsterStates;
            }
            try {
                let [a]=fresh();shootAbilityArrow([a],100,'multiShot');
                check('single-target Multishot inflicts hit-based Bleed',a.hp===900&&a.bleed?.stacks===1&&near(a.bleed.baseDamagePerTick,10));
                [a]=fresh();skillNodeById.multiShot.abilityTargeting='aoe';shootAbilityArrow([a],100,'multiShot');
                check('changing Multishot to AOE disables its Bleed applications',a.hp===900&&!a.bleed);
                [a]=fresh();skillNodeById.multiShot.abilityTargeting=null;shootAbilityArrow([a],100,'multiShot');
                check('an explicitly untagged ability cannot apply Bleed',!a.bleed);
                [a]=fresh({volcanicEruption:1},1);triggerVolcanicEruption(a,10);
                check('an AOE ability stays AOE when only one enemy is alive',a.hp===990&&!a.bleed);
                [a]=fresh({volcanicEruption:1});skillNodeById.volcanicEruption.abilityTargeting='singleTarget';triggerVolcanicEruption(a,10);
                check('combat reads edited ability tags rather than a hardcoded Bleed allowlist',state.monsterStates.filter(monster=>monster.hp<1000).every(monster=>monster.bleed?.stacks===1));
                [a]=fresh({forkingArrow:1});shootAbilityArrow([a],10,'multiShot');
                check('a Multishot fork uses the fork tag rather than inheriting the original projectile tag',a.bleed?.stacks===1&&state.monsterStates.slice(1).some(monster=>monster.hp<1000)&&state.monsterStates.slice(1).every(monster=>!monster.bleed));
                [a]=fresh({shieldGenerator:1,shieldSlam:1});state.shieldStacks=10;tryShieldSlam();
                check('the single-target Shield Slam impact can inflict Bleed',a.hp===990&&a.bleed?.stacks===1&&near(a.bleed.baseDamagePerTick,1));
                let b;[a,b]=fresh({shieldGenerator:1,shieldSlam:1,overflowingSlam:1});a.hp=1;state.shieldStacks=10;tryShieldSlam();
                check('overflow damage uses its AOE tag and cannot apply Bleed to the next enemy',a.hp===0&&b.hp===991&&!b.bleed);
                [a,b]=fresh({shieldGenerator:1,shieldSlam:1,overflowingSlam:1});skillNodeById.overflowingSlam.abilityTargeting='singleTarget';a.hp=1;state.shieldStacks=10;tryShieldSlam();
                check('editing the overflow tag also changes its Bleed eligibility',b.bleed?.stacks===1&&near(b.bleed.baseDamagePerTick,.9));
                [a]=fresh();applyDamageToMonster(a,10,'physical','unknownAbility');
                check('an unknown ability cannot gain Bleed eligibility',!a.bleed);
                [a]=fresh();Math.random=()=>{throw new Error('DOT rolled Bleed from a single-target tag');};
                for(const type of ['bleed','poison','dot'])applyDamageToMonster(a,1,type,'multiShot');
                check('DOT ticks cannot proc Bleed even with a single-target source tag',!a.bleed&&a.hp===997);
                [a]=fresh();Math.random=()=>.999;shootAbilityArrow([a],10,'multiShot');
                check('missed single-target ability hits never roll Bleed',a.hp===1000&&!a.bleed);
                [a]=fresh();state.currentView='upgrades';render();
                const hover=id=>document.querySelector('[data-skill-node="'+id+'"]').dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));
                hover('multiShot');const badge=$('skillNodeTooltip').querySelector('.ability-tag');
                check('single-target tags appear separately from the skill description',!badge.hidden&&badge.textContent==='Single target'&&badge.dataset.targeting==='singleTarget');
                hover('volcanicEruption');check('AOE abilities display their AOE badge',!badge.hidden&&badge.textContent==='AOE');
                hover('healthNode');check('ordinary stat nodes do not show ability badges',badge.hidden);
                function run(effects){fresh({multiShot:1,shockwaveSlash:1,shieldGenerator:1,shieldSlam:1},8);itemById.testAmulet.stats.attackSpeedMultiplier=4;let seed=4356;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};for(let index=0;index<300;index++)simulateCombatStep(.1,effects);return JSON.stringify({monsters:state.monsterStates,kills:state.kills,gold:state.gold,shields:state.shieldStacks,hp:state.playerHp});}
                check('tag-based ability Bleed is identical in foreground and offline simulation',run(true)===run(false));
            } finally {
                Math.random=originalRandom;itemById.testAmulet.stats=originalStats;combatStatCache=null;resetCombatClock();clearOfflineRecap();
                for(const [id,tag] of originalTags){if(tag.present)skillNodeById[id].abilityTargeting=tag.value;else delete skillNodeById[id].abilityTargeting;}
            }
        }
        check('no runtime errors: '+window.smokeErrors.join('; '),!window.smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
