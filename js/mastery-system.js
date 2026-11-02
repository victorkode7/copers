(function () {
    'use strict';
    const clone = value => JSON.parse(JSON.stringify(value));
    const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const idPattern = /^[A-Za-z_][A-Za-z0-9_-]*$/;
    const defaults = new WeakMap(), bonusCache = new WeakMap(), emptyNodes = [];
    const stats = {...Equipment.stats,
        monsterHealthMultiplier:{label:'Enemy maximum HP multiplier',mode:'multiply',default:1,min:.01,max:100,display:{label:'Enemy maximum HP',type:'multiplier'}},
        monsterDamageMultiplier:{label:'Enemy damage multiplier',mode:'multiply',default:1,min:.01,max:100,display:{label:'Enemy damage',type:'multiplier'}},
        monsterAccuracyMultiplier:{label:'Enemy accuracy multiplier',mode:'multiply',default:1,min:.01,max:100,display:{label:'Enemy accuracy',type:'multiplier'}},
        monsterRespawnMultiplier:{label:'Enemy respawn time multiplier',mode:'multiply',default:1,min:.05,max:100,display:{label:'Enemy respawn time',type:'multiplier'}},
        monsterCountBonus:{label:'Additional monsters',mode:'add',default:0,min:-99,max:99,integer:true,display:{label:'Monsters',type:'flat'}},
        dropRateMultiplier:{label:'Loot-table drop chance multiplier',mode:'multiply',default:1,min:.01,max:100,display:{label:'Loot-table drop chances',type:'multiplier'}}
    };
    function describeStats(values) {
        const lines=[];
        for(const [stat,value] of Object.entries(values||{})) {
            const rule=stats[stat];if(!rule)continue;
            if(!Number.isFinite(value)){lines.push(rule.label+': enter a valid number');continue;}
            if(rule.display.type==='multiplier')lines.push(rule.display.label+' ×'+Number(value.toFixed(4)).toLocaleString('en-US'));
            else if(!Equipment.stats[stat])lines.push((value>=0?'+':'')+value+' '+rule.display.label);
            else lines.push(Equipment.describe({stats:{[stat]:value}}));
        }
        return lines.join('\n')||'None';
    }
    function defaultTree(world, index = 0, boss = false) {
        const key = world.name + ':' + index + ':' + boss;
        let cache = defaults.get(world); if (!cache) { cache = new Map(); defaults.set(world,cache); }
        if (cache.has(key)) return cache.get(key);
        const names = boss ? [['Trophy Hunter','Royal Bounty','Riches of Victory','Claim the Hoard'],['Impatient Challenger','Rival Returns','Endless Duel','Summon the Sovereign'],['Rare Finds','Spoils of War','Crown Jewels','Legendary Spoils']]
            : [['Loose Purses','Golden Trail','Prosperous Hunting','Gilded Grounds'],['Restless Prey','Growing Population','Quick Return','Swarming Grounds'],['Scavenger','Treasure Seeker','Fortune Favors','Bountiful Hunting']];
        const nodes = [{id:'root',name:'Begin Mastery',description:'Master this map to earn points. Bonuses apply only on this map.',icon:'◆',column:0,row:5,start:true,requires:[],requiresMode:'all',stats:{}}];
        ['wealth','population','drops'].forEach((branch,column) => {
            for(let depth=1; depth<=4; depth++) {
                let bonuses;
                if(branch==='wealth') bonuses = {goldBonus:Number(([.1,.15,.25,.5][depth-1]*(boss?1.5:1)).toFixed(4))};
                else if(branch==='population') bonuses = boss ? {monsterRespawnMultiplier:[.9,.9,.85,.8][depth-1]} : depth===1?{monsterRespawnMultiplier:.9}:depth===2?{monsterCountBonus:1}:depth===3?{monsterRespawnMultiplier:.8}:{monsterCountBonus:2};
                else bonuses = {dropRateMultiplier:[1.1,1.15,1.2,1.5][depth-1]};
                const penalties=depth===1?{monsterHealthMultiplier:1.25}:depth===2?{monsterDamageMultiplier:1.25}:depth===3?{monsterAccuracyMultiplier:1.5}:{monsterHealthMultiplier:1.5};
                nodes.push({id:branch+depth,name:names[column][depth-1],description:'Improve farming rewards in exchange for a tougher encounter on this map.',icon:['◈','↻','✦'][column],column:column-1,row:5-depth,requires:[depth===1?'root':branch+(depth-1)],requiresMode:'all',stats:bonuses,penalties});
            }
        });
        nodes.push({id:'capstone',name:boss?'Challenge the Throne':'Monster Overlord',description:'Complete any branch to unlock a much harder, more rewarding version of this map.',icon:boss?'♛':'★',column:0,row:0,size:1.4,requires:['wealth4','population4','drops4'],requiresMode:'any',stats:{goldBonus:boss?1.5:1,dropRateMultiplier:2,monsterRespawnMultiplier:.75,...(boss?{}:{monsterCountBonus:2})},penalties:{monsterHealthMultiplier:10,monsterDamageMultiplier:10,monsterAccuracyMultiplier:10}});
        const tree = {name:world.name+(boss?' — Boss Mastery':' — Monster Mastery'),nodes}; cache.set(key,tree); return tree;
    }
    function kind(data,map) {
        if (map.masteryType==='boss' || map.masteryType==='regular') return map.masteryType;
        const world = data.worlds.find(world=>world.mapIds.includes(map.id));
        return world?.mapIds.at(-1)===map.id ? 'boss' : 'regular';
    }
    function preset(data,world,type) {
        return world.masteryPresets?.[type] || defaultTree(world,data.worlds.indexOf(world),type==='boss');
    }
    function tree(data,map) {
        const world = data.worlds.find(world=>world.mapIds.includes(map.id)) || data.worlds[0];
        const type=map.masteryType==='boss'||map.masteryType==='regular'?map.masteryType:world.mapIds.at(-1)===map.id?'boss':'regular';
        return map.masteryTree || preset(data,world,type);
    }
    function milestone(map,kills,earned=0,data=window.adventureWorld) {
        // Bosses count actual kills. Fivefold lower thresholds partially offset
        // the removed Menagerie bonus without replacing the full 10x boost.
        const firstGoalMultiple=kind(data,map)==='boss'?2:10;
        let next=Math.max(1,map.goal)*firstGoalMultiple,previous=0,completed=0;
        while(Number.isSafeInteger(next)&&kills>=next){completed++;previous=next;next*=10;}
        while(Number.isSafeInteger(next)&&completed<Math.floor(earned/2)){completed++;previous=next;next*=10;}
        if(!Number.isSafeInteger(next))next=null;
        return {earned:completed*2,next,previous,step:next===null?1:next-previous,completed};
    }
    const selection=(profile,map)=>TownProgression.masteryUnlocked(profile,worldData.findIndex(world=>world.mapIds.includes(map.id)))?profile.mapMastery?.[map.id]?.nodes || emptyNodes:emptyNodes;
    function record(profile,map,data=window.adventureWorld) {
        const saved = profile.mapMastery?.[map.id];
        return {earned:Math.max(saved?.earned || 0,milestone(map,profile.kills?.[map.id] || 0,0,data).earned),nodes:saved?.nodes || emptyNodes};
    }
    const available = (profile,map,data) => { const current=record(profile,map,data); return current.earned-current.nodes.length; };
    function activeNodes(masterTree,selected) {
        const chosen = new Set(selected), active = new Set(masterTree.nodes.filter(node=>node.start).map(node=>node.id));
        let changed=true;
        while(changed) {
            changed=false;
            for(const node of masterTree.nodes) {
                if(active.has(node.id)||!chosen.has(node.id))continue;
                const ready=node.requiresMode==='any'?node.requires.some(id=>active.has(id)):node.requires.every(id=>active.has(id));
                if(ready){active.add(node.id);changed=true;}
            }
        }
        return active;
    }
    function canLearn(masterTree,selected,id) {
        const node=masterTree.nodes.find(node=>node.id===id); if(!node||node.start||selected.includes(id))return false;
        const active=activeNodes(masterTree,selected);
        return node.requiresMode==='any'?node.requires.some(id=>active.has(id)):node.requires.every(id=>active.has(id));
    }
    function bonus(data,map,profile,stat) {
        const rule=stats[stat];if(!rule)return 0;
        if(!TownProgression.masteryUnlocked(profile,data.worlds.findIndex(world=>world.mapIds.includes(map.id))))return rule.default;
        const masterTree=tree(data,map), selected=selection(profile,map);
        let cache=bonusCache.get(masterTree);if(!cache){cache=new WeakMap();bonusCache.set(masterTree,cache);}
        let values=cache.get(selected);
        if(!values){
            const active=activeNodes(masterTree,selected);values={};
            masterTree.nodes.filter(node=>active.has(node.id)).forEach(node=>[node.stats,node.penalties||{}].forEach(group=>Object.entries(group).forEach(([key,value])=>{
                const definition=stats[key];if(!definition||definition.developer)return;
                values[key]=definition.mode==='multiply'?(values[key]??1)*value:(values[key]??0)+value;
            })));cache.set(selected,values);
        }
        return values[stat]??rule.default;
    }
    function assertProfile(value) {
        if(value===undefined)return;
        if(!object(value))throw new Error('Invalid map mastery progress.');
        for(const [id,entry] of Object.entries(value)) {
            if(!idPattern.test(id)||['__proto__','constructor','prototype'].includes(id)||!object(entry)||!Number.isSafeInteger(entry.earned)||entry.earned<0||!Array.isArray(entry.nodes)||entry.nodes.length>entry.earned||entry.nodes.some(node=>typeof node!=='string'||!idPattern.test(node)||['__proto__','constructor','prototype','root'].includes(node))||new Set(entry.nodes).size!==entry.nodes.length)throw new Error('Invalid map mastery allocation.');
        }
    }
    function normalizeProfile(profile,data) {
        profile.mapMastery ||= {};
        data.maps.forEach(map=>{
            const current=record(profile,map,data);
            if(current.earned||profile.mapMastery[map.id])profile.mapMastery[map.id]={earned:current.earned,nodes:[...current.nodes]};
        });
    }
    function validateTree(value,label) {
        const errors=[], fail=message=>errors.push(label+': '+message);
        if(!object(value)||typeof value.name!=='string'||!value.name.trim()||!Array.isArray(value.nodes)||!value.nodes.length||value.nodes.length>100){fail('invalid mastery tree.');return errors;}
        const ids=new Set();
        value.nodes.forEach(node=>{
            if(!object(node)||!idPattern.test(node.id)||['__proto__','constructor','prototype'].includes(node.id)||ids.has(node.id)){fail('invalid or duplicate mastery node.');return;}
            ids.add(node.id);
            if(typeof node.name!=='string'||!node.name.trim()||typeof node.description!=='string'||typeof node.icon!=='string'||!Number.isFinite(node.column)||Math.abs(node.column)>20||!Number.isFinite(node.row)||Math.abs(node.row)>20||!Array.isArray(node.requires)||!['all','any'].includes(node.requiresMode)||!object(node.stats))fail('invalid mastery node '+node.id+'.');
            if(node.penalties!==undefined&&!object(node.penalties))fail('invalid mastery trade-offs.');
            [node.stats,node.penalties||{}].filter(object).forEach(group=>Object.entries(group).forEach(([stat,amount])=>{
                const rule=stats[stat];
                if(!rule||rule.developer||!Number.isFinite(amount)||amount<(rule.min??-Infinity)||amount>(rule.max??Infinity)||rule.mode==='multiply'&&amount<=0||rule.integer&&!Number.isInteger(amount))fail('invalid mastery bonus or trade-off '+stat+'.');
            }));
        });
        const roots=value.nodes.filter(node=>node?.start);
        if(roots.length!==1||roots[0].id!=='root'||roots[0].requires?.length)fail('keep one free starting node named root.');
        value.nodes.forEach(node=>{if(Array.isArray(node?.requires)&&(!node.start&&!node.requires.length||node.requires.some(id=>!ids.has(id)||id===node.id)))fail('invalid mastery connections.');});
        if(!errors.length){
            const visited=new Set(), visiting=new Set(), byId=new Map(value.nodes.map(node=>[node.id,node]));
            const visit=id=>{if(visiting.has(id))return false;if(visited.has(id))return true;visiting.add(id);if(!byId.get(id).requires.every(visit))return false;visiting.delete(id);visited.add(id);return true;};
            if(!value.nodes.every(node=>visit(node.id)))fail('mastery connections contain a cycle.');
        }
        return errors;
    }
    function validateContent(data) {
        const errors=[];
        data.worlds.forEach(world=>{
            if(world.masteryPresets!==undefined&&!object(world.masteryPresets)){errors.push(world.name+': invalid mastery presets.');return;}
            for(const type of ['regular','boss'])if(world.masteryPresets?.[type]!==undefined)errors.push(...validateTree(world.masteryPresets[type],world.name+' '+type+' mastery'));
        });
        data.maps.forEach(map=>{
            if(map.masteryType!==undefined&&!['auto','regular','boss'].includes(map.masteryType))errors.push(map.name+': invalid mastery encounter type.');
            if(map.masteryTree!==undefined)errors.push(...validateTree(map.masteryTree,map.name+' mastery'));
        });return errors;
    }
    window.MasterySystem={clone,stats,describeStats,defaultTree,kind,preset,tree,milestone,selection,record,available,activeNodes,canLearn,bonus,assertProfile,normalizeProfile,validateTree,validateContent};
}());
