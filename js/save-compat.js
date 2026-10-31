(function () {
    'use strict';
    const version = 4;
    const schemaMigrations = Object.freeze([
        {version:2, description:'Convert the original one-based player level and armor slot.'},
        {version:3, description:'Separate unique equipment ownership from crafting history.'},
        {version:4, description:'Reconcile edited content, refund unsupported skill allocations, preserve unlocks and unavailable equipment.'}
    ]);
    // Append a numbered entry for intentional content changes. Aliases map old
    // IDs to replacements; removals contain {id, reason}. Apply these rules on
    // normal loading AND imports. Remove retired IDs from their catalogues too;
    // never reuse a retired ID for unrelated content.
    // Missing catalogue entries alone are not intentional item removals: retain
    // them in preservedContent and restore them if that content returns.
    const contentMigrations = Object.freeze([
        {
            version:1, description:'Replace historical skill editor Copy IDs without losing allocations.',
            skills:{aliases:{...SkillStatCompat.nodeIdAliases, fireOfTheRighteous:'righteousFire'}, removed:[]},
            items:{aliases:{}, removed:[]}, materials:{aliases:{}, removed:[]},
            maps:{aliases:{}, removed:[]}, worlds:{aliases:{}, removed:[]}
        },
        {
            version:2, description:'Replace Thunderstorm/Thunderbolt with Void Bolt and Saltwater Bolt with Void Volley; retire the Wet debuff.',
            skills:{aliases:{skillNode4:'voidBolt',thunderstorm:'voidBolt',thunderbolt:'voidBolt',thunderBolt:'voidBolt',saltWaterBolt:'voidVolley'},removed:[]},
            removedMonsterFields:['wetRemaining']
        }
    ]);
    const reports = new WeakMap();
    const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const integer = value => Number.isSafeInteger(value) && value >= 0;
    const own = (object,id) => Object.hasOwn(object,id);
    const strings = value => Array.isArray(value) && value.every(id => typeof id === 'string');

    function assertCollections(saved) {
        for (const key of ['kills','materials','upgrades']) {
            if (saved[key] !== undefined && (!record(saved[key]) || !Object.values(saved[key]).every(integer))) throw new Error('Invalid '+key+' in profile.');
        }
        if (saved.skillRanks !== undefined && (!record(saved.skillRanks) || !Object.values(saved.skillRanks).every(rank => integer(rank) && rank > 0))) throw new Error('Invalid skill allocations in profile.');
        for (const key of ['ownedItemIds','crafted','skillNodes','unlockedMapIds','unlockedWorldIds']) {
            if (saved[key] !== undefined && !strings(saved[key])) throw new Error('Invalid '+key+' in profile.');
        }
        if (saved.gear !== undefined && (!record(saved.gear) || !Object.values(saved.gear).every(id => id === null || typeof id === 'string'))) throw new Error('Invalid equipment in profile.');
        if (saved.lastMapByWorld !== undefined && (!record(saved.lastMapByWorld) || !Object.values(saved.lastMapByWorld).every(id => typeof id === 'string'))) throw new Error('Invalid saved map destinations.');
        if (saved.contentMigrationVersion !== undefined && (!integer(saved.contentMigrationVersion) || saved.contentMigrationVersion > contentMigrations.at(-1).version)) throw new Error('This profile needs a newer game version.');
        if (saved.preservedContent !== undefined) {
            const kept = saved.preservedContent;
            if (!record(kept) || !strings(kept.ownedItemIds) || !strings(kept.crafted) || !record(kept.gear) || !Object.values(kept.gear).every(id => typeof id === 'string')) throw new Error('Invalid preserved equipment in profile.');
        }
    }

    function rulesFor(kind, migrations) {
        const aliases = Object.create(null), removed = new Set();
        for (const migration of migrations) {
            Object.assign(aliases, migration[kind]?.aliases || {});
            for (const removal of migration[kind]?.removed || []) {
                if (!removal.id || !removal.reason) throw new Error('Content removals must document an ID and reason.');
                removed.add(removal.id);
            }
        }
        return {aliases,removed};
    }

    function resolve(id, rules, catalogue, keepCurrentId = false) {
        const seen = new Set();
        while (!rules.removed.has(id) && own(rules.aliases,id) && (!keepCurrentId || !own(catalogue,id))) {
            if (seen.has(id)) throw new Error('A content ID migration contains a cycle.');
            seen.add(id); id = rules.aliases[id];
        }
        return rules.removed.has(id) ? null : id;
    }

    function remapCounts(values, rules, catalogue) {
        const mapped = Object.create(null);
        for (const [oldId,value] of Object.entries(values)) {
            const id = resolve(oldId,rules,catalogue);
            if (id === null) continue;
            mapped[id] = (mapped[id] || 0) + value;
            if (!integer(mapped[id])) throw new Error('A migrated quantity is too large.');
        }
        return mapped;
    }

    function unlocks(saved, context) {
        const worlds = new Set(saved.unlockedWorldIds || []), maps = new Set(saved.unlockedMapIds || []);
        // Older profiles did not record unlocks separately. Non-developer travel
        // and remembered destinations prove progress even if kill goals changed.
        if (!saved.developerTravelEnabled) {
            const visited = [saved.selectedMap, ...Object.entries(saved.lastMapByWorld || {}).filter(([worldId,id]) => context.worlds.find(world => world.id === worldId)?.mapIds[0] !== id).map(([,id]) => id)];
            if (saved.selectedWorld) {
                const selected = context.worlds.find(world => world.id === saved.selectedWorld);
                if (selected) visited.push(selected.mapIds[0]);
            }
            for (const id of visited) {
                const worldIndex = context.worlds.findIndex(world => world.mapIds.includes(id));
                if (worldIndex < 0) continue;
                for (let index=0; index<=worldIndex; index++) {
                    const world = context.worlds[index]; worlds.add(world.id);
                    const end = index < worldIndex ? world.mapIds.length : world.mapIds.indexOf(id)+1;
                    world.mapIds.slice(0,end).forEach(mapId => maps.add(mapId));
                }
            }
        }
        context.worlds.forEach((world,index) => {
            const previous = context.worlds[index-1], final = previous && context.maps[previous.mapIds.at(-1)];
            if (index === 0 || final && (saved.kills[final.id] || 0) >= final.goal) worlds.add(world.id);
            if (!worlds.has(world.id)) return;
            world.mapIds.forEach((id,mapIndex) => {
                const prior = context.maps[world.mapIds[mapIndex-1]];
                if (!mapIndex || prior && (saved.kills[prior.id] || 0) >= prior.goal) maps.add(id);
            });
        });
        return {unlockedMapIds:[...maps], unlockedWorldIds:[...worlds]};
    }

    function migrate(saved, context, migrations = contentMigrations) {
        assertCollections(saved);
        for (const [key,value] of Object.entries({furyStacks:0,furyRemaining:0,furyDecaying:false,shieldStacks:0,
            attackTimer:0,monsterColumns:1,pendingEruptions:[],pendingVoidMissiles:[],combatPaused:false,lootLog:[],voidCharges:0})) {
            if (saved[key] === undefined) saved[key] = value;
        }
        if (saved.currentView === undefined) saved.currentView = saved.isInTown === false ? 'map' : 'town';
        const report = {refundedPoints:0, refundedNodes:[], unavailableItems:[], destinationChanged:false};
        const skillRules = rulesFor('skills',migrations), ranks = Object.create(null);
        Object.assign(skillRules.aliases,context.skillAliases || {});
        for (const removal of context.removedSkills || []) {
            if (!removal.id || !removal.reason) throw new Error('Removed skill nodes must document an ID and reason.');
            skillRules.removed.add(removal.id);
        }
        for (const [oldId,rank] of Object.entries(saved.skillRanks)) {
            const id = resolve(oldId,skillRules,context.skills,true);
            if (id === null || !own(context.skills,id) || context.skills[id].start) {
                report.refundedPoints += rank;report.refundedNodes.push(oldId);continue;
            }
            ranks[id] = (ranks[id] || 0) + rank;
        }
        for (const [id,rank] of Object.entries(ranks)) {
            const retained = Math.min(rank,context.skills[id].maxRank);
            report.refundedPoints += rank-retained;
            if (retained) ranks[id] = retained; else {delete ranks[id];report.refundedNodes.push(id);}
        }
        const reachable = new Set(Object.values(context.skills).filter(node => node.start).map(node => node.id)), queue=[...reachable];
        for (let index=0; index<queue.length; index++) for (const id of context.connections[queue[index]] || []) {
            if (reachable.has(id) || !ranks[id]) continue;
            reachable.add(id);queue.push(id);
        }
        for (const [id,rank] of Object.entries(ranks)) if (!reachable.has(id)) {
            report.refundedPoints += rank;report.refundedNodes.push(id);delete ranks[id];
        }
        saved.skillRanks = ranks;saved.skillPoints += report.refundedPoints;

        const itemRules=rulesFor('items',migrations), oldKept=saved.preservedContent || {ownedItemIds:[],crafted:[],gear:{}};
        if (saved.itemCrafts) saved.itemCrafts = Object.fromEntries(Object.entries(saved.itemCrafts).map(([oldId,rolls]) =>
            [resolve(oldId,itemRules,context.items),rolls]).filter(([id]) => id !== null));
        const ids = values => [...new Set(values.map(id => resolve(id,itemRules,context.items)).filter(id => id !== null))];
        const owned=ids([...saved.ownedItemIds,...oldKept.ownedItemIds]), crafted=ids([...saved.crafted,...oldKept.crafted]);
        const kept={ownedItemIds:owned.filter(id => !own(context.items,id)),crafted:[],gear:Object.create(null)};
        saved.ownedItemIds=owned.filter(id => own(context.items,id));
        const ownsCurrent = id => context.items[id] && (context.items[id].developerOnly
            ? saved.developerItemsEnabled === true : saved.ownedItemIds.includes(id));
        saved.crafted=crafted.filter(id => saved.ownedItemIds.includes(id) && context.items[id].recipe);
        kept.crafted=crafted.filter(id => !saved.crafted.includes(id));
        const gear=Object.create(null);
        context.slots.forEach(slot => {gear[slot]=null;});
        for (const [slot,oldId] of [...Object.entries(saved.gear),...Object.entries(oldKept.gear)]) {
            if (oldId === null) continue;
            const id=resolve(oldId,itemRules,context.items);
            if (id === null) continue;
            if (!own(context.items,id) || !context.slots.includes(context.items[id].slot)) {kept.gear[slot]=id;continue;}
            const destination=context.items[id].slot;
            if (ownsCurrent(id) && gear[destination] === null) gear[destination]=id;
        }
        saved.gear=gear;saved.preservedContent=kept;report.unavailableItems=kept.ownedItemIds;
        if (saved.tutorials?.firstGearItemId) {
            const id=resolve(saved.tutorials.firstGearItemId,itemRules,context.items);
            if (!id || !ownsCurrent(id) || context.items[id].slot !== saved.tutorials.firstGearSlot) {
                Object.assign(saved.tutorials,{firstGearPending:false,firstGearItemId:null,firstGearSlot:null,firstGearSlotSelected:false});
            } else saved.tutorials.firstGearItemId=id;
        }
        const mapRules=rulesFor('maps',migrations), worldRules=rulesFor('worlds',migrations);
        saved.kills=remapCounts(saved.kills,mapRules,context.maps);
        saved.materials=remapCounts(saved.materials,rulesFor('materials',migrations),context.materials);
        for (const id of Object.keys(context.maps)) if (!own(saved.kills,id)) saved.kills[id]=0;
        for (const id of Object.keys(context.materials)) if (!own(saved.materials,id)) saved.materials[id]=0;
        saved.selectedMap=resolve(saved.selectedMap,mapRules,context.maps);
        saved.selectedWorld=resolve(saved.selectedWorld,worldRules,context.worldById);
        saved.lastMapByWorld=Object.fromEntries(Object.entries(saved.lastMapByWorld || {}).map(([world,id]) => [resolve(world,worldRules,context.worldById),resolve(id,mapRules,context.maps)]).filter(([world,id]) => world !== null && id !== null));
        saved.unlockedMapIds=(saved.unlockedMapIds || []).map(id => resolve(id,mapRules,context.maps)).filter(id => id !== null);
        saved.unlockedWorldIds=(saved.unlockedWorldIds || []).map(id => resolve(id,worldRules,context.worldById)).filter(id => id !== null);
        Object.assign(saved,unlocks(saved,context));
        if (!own(context.worldById,saved.selectedWorld)) saved.selectedWorld = context.worlds.find(world => world.mapIds.includes(saved.selectedMap))?.id || context.worlds[0].id;
        if (!own(context.maps,saved.selectedMap)) {
            const world=context.worlds.find(world => world.id === saved.selectedWorld && saved.unlockedWorldIds.includes(world.id)) || context.worlds.filter(world => saved.unlockedWorldIds.includes(world.id)).at(-1) || context.worlds[0];
            const remembered=saved.lastMapByWorld[world.id];
            saved.selectedWorld=world.id;
            saved.selectedMap=world.mapIds.includes(remembered) && saved.unlockedMapIds.includes(remembered) ? remembered : world.mapIds.filter(id => saved.unlockedMapIds.includes(id)).at(-1) || world.mapIds[0];
            saved.enemyHp=context.maps[saved.selectedMap].health;saved.enemyRespawnRemaining=0;
            saved.monsterStates=[];saved.pendingEruptions=[];saved.pendingVoidMissiles=[];saved.targetMonsterId=null;saved.attackTimer=0;
            report.destinationChanged=true;
        }
        for (const migration of migrations) for (const field of migration.removedMonsterFields || []) {
            if (Array.isArray(saved.monsterStates)) saved.monsterStates.forEach(monster => {if(record(monster))delete monster[field];});
        }
        saved.version=version;saved.contentMigrationVersion=migrations.at(-1)?.version || 0;
        reports.set(saved,report);return saved;
    }

    const protection={blocked:false,raw:null,error:null};
    const backupPrefix='idleAdventureSave:backup:';
    function backups() {
        const found=[];
        for (let index=0; index<localStorage.length; index++) {
            const key=localStorage.key(index);if(!key?.startsWith(backupPrefix))continue;
            try {const entry=JSON.parse(localStorage.getItem(key));if(typeof entry.raw==='string')found.push({key,...entry});}catch{/* Preserve unreadable backups as well. */}
        }
        return found.sort((a,b)=>b.createdAt-a.createdAt);
    }
    function backup(raw,reason) {
        if (typeof raw !== 'string') return null;
        let hash=2166136261;for(const character of raw)hash=Math.imul(hash^character.charCodeAt(0),16777619);
        const base=backupPrefix+(hash>>>0).toString(16)+'-'+raw.length;
        let key=base,index=2;
        while(localStorage.getItem(key)!==null){
            try{if(JSON.parse(localStorage.getItem(key)).raw===raw)return key;}catch{/* Never overwrite another backup. */}
            key=base+'-'+index++;
        }
        localStorage.setItem(key,JSON.stringify({createdAt:Date.now(),reason,raw}));return key;
    }
    window.SaveCompatibility={version,schemaMigrations,contentMigrations,assertCollections,migrate,unlocks,
        report:saved=>reports.get(saved),protection,backup,backups};
}());
