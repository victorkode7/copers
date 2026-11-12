(function(){
    'use strict';
    const clone=value=>JSON.parse(JSON.stringify(value)),record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
    const safeId=id=>typeof id==='string'&&/^[A-Za-z][A-Za-z0-9_-]*$/.test(id)&&!['constructor','prototype','__proto__'].includes(id);
    const definition=(id,tier=0)=>TownContent.buildings[id]?{...TownContent.buildings[id],...TownContent.buildings[id].tiers?.[tier]}:null;
    const maxLevel=(id,tier=0)=>definition(id,tier)?.maxLevel||10;
    const defaults=()=>{
        const buildings=Object.fromEntries(Object.entries(TownContent.buildings).filter(([,def])=>def.alwaysOwned).map(([id])=>[id,{tier:0,level:1}]));
        const resources=Object.fromEntries(Object.keys(buildings).flatMap(id=>(definition(id).unlockResources||[]).map(material=>[material,0])));
        return {version:1,buildings,resources};
    };
    function normalize(value,legacyUnlocks){
        if(legacyUnlocks!==undefined&&(!Array.isArray(legacyUnlocks)||legacyUnlocks.some(id=>!safeId(id))||new Set(legacyUnlocks).size!==legacyUnlocks.length))throw new Error('Invalid town building unlocks in profile.');
        const progress=value===undefined?defaults():clone(value);
        if(!record(progress)||progress.version!==1||!record(progress.buildings)||!record(progress.resources))throw new Error('Invalid Town progression in profile.');
        if(progress.killFractions!==undefined&&(!record(progress.killFractions)||Object.entries(progress.killFractions).some(([id,value])=>!safeId(id)||![0,.25,.5,.75].includes(value))))throw new Error('Invalid Town kill credit in profile.');
        for(const [id,data]of Object.entries(progress.buildings))if(!safeId(id)||!record(data)||!Number.isSafeInteger(data.tier)||data.tier<0||!Number.isSafeInteger(data.level)||data.level<1||TownContent.buildings[id]&&data.level>maxLevel(id,data.tier))throw new Error('Invalid Town building level in profile.');
        for(const data of Object.values(progress.buildings))if(data.production!==undefined){const p=data.production;if(!record(p)||!Number.isFinite(p.fraction)||p.fraction<0||p.fraction>=1||!Number.isFinite(p.phase)||p.phase<0||p.phase>=1||!Number.isSafeInteger(p.total)||p.total<0)throw new Error('Invalid Town production in profile.');}
        for(const [id,amount]of Object.entries(progress.resources))if(!safeId(id)||!Number.isFinite(amount)||amount<0||amount>Number.MAX_SAFE_INTEGER)throw new Error('Invalid Town materials in profile.');
        for(const id of legacyUnlocks||[])if(!progress.buildings[id])progress.buildings[id]={tier:0,level:1};
        for(const [id,def]of Object.entries(TownContent.buildings))if(def.alwaysOwned&&!progress.buildings[id])progress.buildings[id]={tier:0,level:1};
        for(const [id,data]of Object.entries(progress.buildings))for(const material of definition(id,data.tier)?.unlockResources||[])if(!Object.hasOwn(progress.resources,material))progress.resources[material]=0;
        return progress;
    }
    function cost(kind,id,data){
        const def=definition(id,data?.tier||0),spec=def?.[kind+'Cost'];
        const raw=spec===undefined&&kind==='purchase'&&Number.isSafeInteger(def?.initialGold)&&def.initialGold>=0?{gold:def.initialGold}:typeof spec==='function'?spec({...data}):spec;
        if(raw==null)return null;
        if(!record(raw))throw new Error('Invalid Town material cost.');
        const result={...raw};
        if(Object.entries(result).some(([id,amount])=>!safeId(id)||!Number.isFinite(amount)||amount<0||amount>Number.MAX_SAFE_INTEGER))throw new Error('Invalid Town material cost.');
        const materialScale=(def.materialPrestigeMultiplier||1)**(data?.tier||0);
        for(const [material,amount]of Object.entries(result))if(material!=='gold'&&amount>0)result[material]=Math.min(Number.MAX_SAFE_INTEGER,amount*materialScale);
        if(!(result.gold>0))return result;
        const levelGrowth=kind==='upgrade'?(def.goldLevelGrowth||1)**Math.max(0,(data?.level||1)-1):1;
        const rounding=def.goldRounding||1;
        const levelGold=Math.min(Number.MAX_SAFE_INTEGER,Math.max(rounding,Math.round(result.gold*levelGrowth/rounding)*rounding));
        return {...result,gold:Math.min(Number.MAX_SAFE_INTEGER,levelGold*(def.goldPrestigeMultiplier||1)**(data?.tier||0))};
    }
    function requirements(profile,kind,id){
        const data=profile.townProgress.buildings[id],def=definition(id,data?.tier||0);
        const spec=def?.[kind+'Requires']||(kind==='purchase'?def?.requires:null);
        return (typeof spec==='function'?spec({...data}):spec)||{};
    }
    function available(profile,kind,id){
        const def=definition(id,profile.townProgress.buildings[id]?.tier||0);if(!def)return false;
        if(kind==='purchase'&&def.purchaseAvailable&&!def.purchaseAvailable(profile))return false;
        const required=requirements(profile,kind,id);
        return Object.entries(required).every(([building,minimum])=>{const data=profile.townProgress.buildings[building];return data&&(data.tier>minimum.tier||data.tier===minimum.tier&&data.level>=(minimum.level||1));});
    }
    function can(profile,kind,id){
        const def=definition(id,profile.townProgress.buildings[id]?.tier||0),data=profile.townProgress.buildings[id];if(!def)return false;
        if(!available(profile,kind,id))return false;
        if(kind==='purchase'){const required=cost('purchase',id);return !data&&required!==null&&GameResources.canSpend(profile,required,profile.townProgress.resources);}
        if(!data||kind==='upgrade'&&data.level>=maxLevel(id,data.tier)||kind==='prestige'&&(data.level!==maxLevel(id,data.tier)||data.tier===Number.MAX_SAFE_INTEGER)||!['upgrade','prestige'].includes(kind))return false;
        const required=cost(kind,id,data);return required!==null&&GameResources.canSpend(profile,required,profile.townProgress.resources);
    }
    function apply(profile,kind,id){
        if(!can(profile,kind,id))return false;
        if(kind==='purchase'){GameResources.spend(profile,cost('purchase',id),profile.townProgress.resources);profile.townProgress.buildings[id]={tier:0,level:1};definition(id).onPurchase?.(profile);}
        else{
            const data=profile.townProgress.buildings[id];
            GameResources.spend(profile,cost(kind,id,data),profile.townProgress.resources);
            if(kind==='upgrade')data.level++;else{data.tier++;data.level=1;}
        }
        profile.townProgress=normalize(profile.townProgress);return true;
    }
    function productivityBonus(data){
        if(!data)return 0;
        const perUpgrade=definition('townHall',data.tier)?.effects?.productivityPerUpgrade||0;
        const upgrades=data.tier*(maxLevel('townHall',0)-1)+data.level-1;
        return Math.min(Number.MAX_SAFE_INTEGER,Math.round(upgrades*perUpgrade*100));
    }
    const productivity=profile=>1+productivityBonus(profile?.townProgress.buildings.townHall)/100;
    // Balance content uses hourly rates; normalize once for the seconds-based
    // simulation and retain compatibility with existing perSecond definitions.
    // Supplying a profile applies Town Hall productivity to the base building rate.
    function production(id,data,profile){
        if(!data)return null;
        const spec=definition(id,data.tier)?.production;
        const result=typeof spec==='function'?spec({...data}):spec;
        if(!result)return null;
        const {perHour,...normalized}=result;
        const perSecond=perHour===undefined?result.perSecond:perHour/3600;
        if(perHour!==undefined&&!Number.isFinite(perHour)||!safeId(result.resource)||!Number.isFinite(perSecond)||perSecond<=0||perSecond>Number.MAX_SAFE_INTEGER||result.inputs&&(!record(result.inputs)||!Object.entries(result.inputs).every(([id,amount])=>safeId(id)&&Number.isFinite(amount)&&amount>0)))return null;
        return {...normalized,perSecond:Math.min(Number.MAX_SAFE_INTEGER,perSecond*(profile?productivity(profile):1))};
    }
    function storage(id,data){
        if(!data)return null;
        const spec=definition(id,data.tier)?.storageCapacity;
        const result=typeof spec==='function'?spec({...data}):spec;
        return record(result)&&Object.values(result).every(amount=>Number.isSafeInteger(amount)&&amount>0)?result:null;
    }
    function capacity(profile,resource){
        let limit=TownContent.resources[resource]?.capacity??Number.MAX_SAFE_INTEGER;
        // Storage definitions set total capacities; use the strongest owned
        // facility for each resource. Stock above a new limit is never deleted.
        for(const [id,data]of Object.entries(profile.townProgress.buildings)){
            const amount=storage(id,data)?.[resource];
            if(amount!==undefined)limit=Math.max(limit,amount);
        }
        return Math.min(Number.MAX_SAFE_INTEGER,limit);
    }
    // One arithmetic update per producer, regardless of how many logs it makes.
    // Fractions and visual batch phase survive saves and offline catch-up.
    function tick(profile,seconds){
        if(!Number.isFinite(seconds)||seconds<=0)return;
        const progress=profile.townProgress;
        // Sources run before converters, regardless of profile key order.
        const producers=Object.entries(progress.buildings).map(([id,data])=>({data,spec:production(id,data,profile)})).filter(({spec})=>spec);
        producers.sort((a,b)=>Boolean(a.spec.inputs)-Boolean(b.spec.inputs));
        for(const {data,spec}of producers){
            const p=data.production||(data.production={fraction:0,phase:0,total:0});
            const stored=progress.resources[spec.resource]||0,limit=capacity(profile,spec.resource);
            const room=Math.max(0,Math.floor(limit-stored));
            // Full outputs pause before spending converter inputs. Time spent
            // full does not bank work for an instant refill after spending.
            if(!room){p.fraction=0;p.phase=0;continue;}
            const inputLimit=spec.inputs?Math.min(...Object.entries(spec.inputs).map(([id,cost])=>(progress.resources[id]||0)/cost)):Number.MAX_SAFE_INTEGER;
            const amount=Math.min(room,inputLimit,p.fraction+seconds*spec.perSecond);
            const logs=Math.floor(amount+1e-9);
            p.fraction=Math.max(0,amount-logs);
            if(spec.inputs)for(const [id,cost]of Object.entries(spec.inputs))progress.resources[id]=Math.max(0,(progress.resources[id]||0)-logs*cost);
            p.phase=spec.inputs&&inputLimit<1?p.fraction:(p.phase+seconds/Math.max(.5,1/spec.perSecond))%1;
            if(p.phase>1-1e-9)p.phase=0;
            p.total=Math.min(Number.MAX_SAFE_INTEGER,p.total+logs);
            progress.resources[spec.resource]=Math.min(limit,stored+logs);
            if(progress.resources[spec.resource]>=limit){p.fraction=0;p.phase=0;}
        }
    }
    const hasConverters=profile=>Object.entries(profile.townProgress.buildings).some(([id,data])=>production(id,data)?.inputs);
    function masteryUnlocked(profile,worldIndex){
        const data=profile.townProgress?.buildings.menagerie;
        return Boolean(data&&worldIndex>=0&&worldIndex<2&&worldIndex<=data.tier);
    }
    function killCountMultiplier(profile,worldIndex){
        if(!masteryUnlocked(profile,worldIndex))return 1;
        const data=profile.townProgress.buildings.menagerie;
        return worldIndex<data.tier?10:TownContent.buildings.menagerie.killCountMultipliers[data.level-1];
    }
    function killCredit(profile,mapId,worldIndex){
        const fractions=profile.townProgress.killFractions;
        const credit=killCountMultiplier(profile,worldIndex)+(fractions?.[mapId]||0);
        const whole=Math.floor(credit),fraction=credit-whole;
        if(fraction||fractions?.[mapId]){
            profile.townProgress.killFractions||={};
            profile.townProgress.killFractions[mapId]=fraction;
        }
        return whole;
    }
    window.TownProgression={defaults,normalize,clone,definition,maxLevel,cost,can,apply,requirements,available,production,productivity,productivityBonus,storage,capacity,tick,hasConverters,masteryUnlocked,killCountMultiplier,killCredit};
}());
