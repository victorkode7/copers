// Run with: node tests/alchemy-node.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const sandbox={};
for(const key of ['document','window','performance','localStorage','setTimeout'])Object.defineProperty(sandbox,key,{get(){throw new Error('Unexpected browser dependency: '+key);}});
for(const file of ['professions.js','alchemy-content.js','alchemy.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),sandbox);
const A=sandbox.Alchemy,C=sandbox.AlchemyContent,checks=[];
const json=value=>JSON.parse(JSON.stringify(value));
const test=(name,run)=>{run();checks.push('PASS '+name);};
// Legacy production/cost checks use a trained alchemist with guaranteed success.
function profile(unlocked=true){const p={professions:sandbox.Professions.defaults(),alchemy:A.defaults(),gold:1000000,materials:{gel:100,fang:100,crystal:100},currentView:'map',combatPaused:false,playerHp:100,monsterStates:[{hp:100}]};p.professions.xp.alchemy=sandbox.Professions.xpForLevel(20);if(unlocked)A.unlock(p);return p;}
test('new and legacy profiles start locked with Moonwater, a closed Ember still and one slot',()=>{
    const d=A.normalize();assert.equal(d.unlocked,false);assert.equal(d.liquids.moonwater.unlocked,true);assert.equal(d.liquids.emberOil.unlocked,false);assert.equal(d.equipped,null);assert.equal(C.potionSlots,1);
});
test('unlock requires access to W3 through progression or an existing world unlock',()=>{
    const content={worlds:[{id:'w1',mapIds:['b1']},{id:'w2',mapIds:['b2']},{id:C.unlockWorld,mapIds:['b3']}],maps:[{id:'b2',goal:1}]};
    assert.equal(A.canUnlock({kills:{b2:0}},content),false);assert.equal(A.canUnlock({kills:{b2:1}},content),true);assert.equal(A.canUnlock({unlockedWorldIds:[C.unlockWorld]},content),true);
});
test('locked Alchemy cannot produce, brew, upgrade or equip',()=>{
    const p=profile(false),before=json(p);A.tick(p,100000);assert.equal(A.brew(p,'moonveil'),false);assert.equal(A.upgrade(p,'moonwater','rate'),false);assert.equal(A.equip(p,'moonveil'),false);assert.deepEqual(json(p),before);
});
test('passive production retains partial work and runs while dead, in town and offline',()=>{
    const p=profile();p.currentView='town';p.playerHp=0;p.combatPaused=true;A.tick(p,29.9);assert.equal(p.alchemy.liquids.moonwater.amount,0);A.tick(p,.1);assert.equal(p.alchemy.liquids.moonwater.amount,1);assert.equal(p.alchemy.liquids.emberOil.amount,0);
});
test('bulk production equals fixed steps, including upgraded rates and restored partial work',()=>{
    for(const level of [0,1,7,10]){
        const p=profile();p.alchemy.liquids.moonwater.rateLevel=level;A.tick(p,2.3);const other=json(p);
        for(let i=0;i<1800;i++)A.tick(p,.1);A.tick(other,180);
        assert.deepEqual(json(p.alchemy),other.alchemy);
        const restored=profile();restored.alchemy=A.normalize(json(p.alchemy));A.tick(p,.1);A.tick(restored,.1);assert.deepEqual(json(p.alchemy),json(restored.alchemy));
    }
});
test('full storage discards surplus work and never banks production after spending',()=>{
    const p=profile();A.tick(p,100000);const liquid=p.alchemy.liquids.moonwater;assert.equal(liquid.amount,120);assert.equal(liquid.work,0);A.brew(p,'moonveil');A.tick(p,.1);assert.equal(liquid.amount,115);
});
test('opening the Ember still and upgrading production spend only Alchemy costs',()=>{
    const p=profile();p.alchemy.liquids.moonwater.amount=30;p.townProgress={resources:{wood:999},buildings:{townHall:{tier:100,level:10}}};
    const town=json(p.townProgress);assert.equal(A.upgrade(p,'emberOil','unlock'),true);assert.equal(p.gold,1000000);assert.equal(p.alchemy.liquids.moonwater.amount,20);
    assert.equal(A.upgrade(p,'moonwater','rate'),true);assert.equal(A.perHour(p.alchemy,'moonwater'),150);assert.equal(p.alchemy.liquids.moonwater.amount,10);
    assert.equal(A.upgrade(p,'moonwater','capacity'),true);assert.equal(A.capacity(p.alchemy,'moonwater'),240);assert.deepEqual(p.townProgress,town);assert.equal(p.gold,1000000);
    A.tick(p,60);assert.equal(p.alchemy.liquids.emberOil.amount,1);
});
test('liquid unlocks and upgrades are affordable at zero gold',()=>{
    const p=profile();p.gold=0;p.alchemy.liquids.moonwater.amount=30;
    for(const [id,kind]of [['emberOil','unlock'],['moonwater','rate'],['moonwater','capacity']]){
        assert.equal(Object.hasOwn(A.upgradeCost(p.alchemy,id,kind),'gold'),false);assert.equal(A.upgrade(p,id,kind),true);assert.equal(p.gold,0);
    }
    assert.equal(p.alchemy.liquids.moonwater.amount,0);
});
test('upgrade caps, unknown IDs and insufficient liquids cannot mutate progress',()=>{
    const p=profile();p.alchemy.liquids.moonwater.rateLevel=10;const before=json(p);
    for(const [id,kind]of [['moonwater','rate'],['missing','rate'],['constructor','rate'],['moonwater','missing']])assert.equal(A.upgrade(p,id,kind),false);
    assert.deepEqual(json(p),before);p.gold=0;assert.equal(A.upgrade(p,'moonwater','capacity'),false);
});
test('all three recipes atomically spend their different ingredients and add duration',()=>{
    for(const [id,recipe]of Object.entries(C.recipes)){
        const p=profile();p.alchemy.liquids.moonwater.amount=100;p.alchemy.liquids.emberOil.unlocked=true;p.alchemy.liquids.emberOil.amount=100;
        assert.equal(A.brew(p,id,2),true);assert.equal(A.brew(p,id),false);assert.equal(p.alchemy.potions[id],0);
        for(const [key,cost]of Object.entries(recipe.liquids))assert.equal(p.alchemy.liquids[key].amount,100-cost);
        for(const [key,cost]of Object.entries(recipe.materials))assert.equal(p.materials[key],100-cost);
        assert.equal(p.gold,1000000);
        A.tick(p,recipe.brewSeconds*2);assert.equal(p.alchemy.potions[id],recipe.seconds*2);
        for(const [key,cost]of Object.entries(recipe.materials))assert.equal(p.materials[key],100-2*cost);
    }
    const p=profile();p.alchemy.liquids.moonwater.amount=5;p.materials.gel=2;const before=json(p);assert.equal(A.brew(p,'moonveil'),false);assert.deepEqual(json(p),before);
});
test('discoveries match exact ingredient sets and only successful brewing records them',()=>{
    assert.equal(A.matchingRecipe(['moonwater'],'gel'),'moonveil');assert.equal(A.matchingRecipe(['emberOil'],'fang'),'emberheart');
    assert.equal(A.matchingRecipe(['emberOil','moonwater'],'crystal'),'twilight');
    for(const [liquids,material]of [[['moonwater'],'fang'],[['moonwater','emberOil'],'gel'],[['moonwater','moonwater'],'gel'],[['missing'],'gel'],[[], 'gel'],[['moonwater'],null]])assert.equal(A.matchingRecipe(liquids,material),null);
    const p=profile();p.alchemy.liquids.moonwater.amount=10;assert.equal(A.combine(p,['moonwater'],'fang'),null);assert.equal(p.alchemy.discovered.length,0);
    assert.equal(A.combine(p,['moonwater'],'gel',2),'moonveil');assert.equal(A.combine(p,['moonwater'],'gel'),null);assert.equal(p.alchemy.discovered.length,0);A.tick(p,20);assert.equal(p.alchemy.discovered.join(','),'moonveil');
});
test('batch brewing validates counts, spends exactly once and finds the true maximum',()=>{
    const p=profile();p.alchemy.liquids.moonwater.amount=120;assert.equal(A.maxBrewAmount(p,'moonveil'),24);
    assert.equal(A.brew(p,'moonveil',10),true);assert.equal(p.alchemy.liquids.moonwater.amount,115);assert.equal(p.materials.gel,97);assert.equal(p.alchemy.potions.moonveil,0);
    const before=json(p);for(const count of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'2',25])assert.equal(A.brew(p,'moonveil',count),false);assert.deepEqual(json(p),before);
    A.tick(p,100);assert.equal(p.alchemy.potions.moonveil,6000);assert.equal(p.materials.gel,70);
    p.materials.gel=7;assert.equal(A.maxBrewAmount(p,'moonveil'),2);
    assert.equal(A.brew(p,'moonveil',2),true);assert.equal(p.materials.gel,4);
    A.tick(p,20);assert.equal(p.materials.gel,1);assert.equal(A.maxBrewAmount(p,'moonveil'),0);
    assert.equal(A.maxBrewAmount(p,'missing'),0);assert.equal(A.maxBrewAmount(profile(false),'moonveil'),0);
    assert.equal(p.alchemy.potions.moonveil,7200);assert.equal(p.alchemy.queue.length,0);
});
test('discovery migration retains older potion reserves and rejects malformed discoveries',()=>{
    const p=profile();p.alchemy.potions.emberheart=60;const old=json(p.alchemy);delete old.discovered;
    assert.equal(A.normalize(old).discovered.join(','),'emberheart');assert.equal(Object.hasOwn(old,'discovered'),false);
    for(const discovered of [null,'moonveil',['missing'],['moonveil','moonveil'],[['moonveil']]])assert.throws(()=>A.normalize({...p.alchemy,discovered}));
    p.alchemy.potions.moonveil=Number.MAX_SAFE_INTEGER-500;assert.equal(A.maxBrewAmount(p,'moonveil'),0);
});
test('one equipped potion drains during combat in every menu and preserves time on swapping',()=>{
    const p=profile();p.alchemy.potions.moonveil=60;p.alchemy.potions.emberheart=30;assert.equal(A.equip(p,'moonveil'),true);A.tick(p,5);assert.equal(p.alchemy.potions.moonveil,55);
    assert.equal(A.equip(p,'emberheart'),true);A.tick(p,3);assert.equal(p.alchemy.potions.moonveil,55);assert.equal(p.alchemy.potions.emberheart,27);
    for(const currentView of ['map','alchemy','townPage','town','inventory','upgrades']){
        const active=json(p);active.currentView=currentView;active.isInTown=currentView!=='map';A.tick(active,1);assert.equal(active.alchemy.potions.emberheart,26,currentView);
    }
    for(const changes of [{playerHp:0},{combatPaused:true},{monsterStates:[{hp:0}]}]){
        const paused={...p,...changes};A.tick(paused,1);assert.equal(p.alchemy.potions.emberheart,27);
    }
    A.equip(p,null);A.tick(p,5);assert.equal(p.alchemy.potions.emberheart,27);assert.equal(A.equip(p,'twilight'),false);assert.equal(A.equip(p,'missing'),false);
});
test('duration expires exactly, clears the slot and agrees across bulk and fixed steps',()=>{
    for(const currentView of ['map','alchemy','townPage','town','inventory','upgrades']){
        const p=profile();p.currentView=currentView;p.alchemy.potions.moonveil=1;A.equip(p,'moonveil');const other=json(p);
        for(let i=0;i<10;i++)A.tick(p,.1);A.tick(other,1);assert.deepEqual(json(p.alchemy),other.alchemy);assert.equal(p.alchemy.potions.moonveil,0);assert.equal(p.alchemy.equipped,null);
    }
});
test('save normalization rejects malformed progress without editing the source',()=>{
    const p=profile();p.alchemy.potions.moonveil=123.4;A.equip(p,'moonveil');const saved=json(p.alchemy);assert.deepEqual(json(A.normalize(saved)),saved);
    for(const mutate of [d=>d.version=99,d=>d.unlocked='yes',d=>d.liquids.moonwater.amount=-1,d=>d.liquids.moonwater.work=Infinity,d=>d.liquids.moonwater.rateLevel=11,d=>d.liquids.emberOil.amount=1,d=>d.equipped='missing',d=>d.potions.moonveil=-1,d=>d.potions.twilight=null,d=>delete d.liquids.moonwater,d=>d.equipped=['moonveil']]){
        const bad=json(saved);mutate(bad);assert.throws(()=>A.normalize(bad));
    }
    assert.deepEqual(saved,json(p.alchemy));assert.throws(()=>A.normalize(null));
});
test('optional infinite liquids keep material costs, locked stills and finite saves intact',()=>{
    const p=profile();p.materials.gel=9;p.developerTravelEnabled=true;p.developerAlchemyInfiniteLiquids=true;
    assert.equal(A.infiniteLiquids(p),false);assert.equal(A.maxBrewAmount(p,'moonveil'),0);
    let enabled=true;sandbox.DeveloperTools={allows:(capability,actor)=>capability==='alchemyLiquids'&&enabled&&actor.developerTravelEnabled};
    assert.equal(A.infiniteLiquids(p),true);assert.equal(A.maxBrewAmount(p,'moonveil'),3);assert.equal(A.maxBrewAmount(p,'emberheart'),0);
    assert.equal(A.brew(p,'moonveil',3),true);assert.equal(p.materials.gel,6);assert.equal(p.alchemy.liquids.moonwater.amount,0);assert.equal(A.maxBrewAmount(p,'moonveil'),0);
    assert.equal(json(A.normalize(p.alchemy)).potions.moonveil,0);assert.equal(p.alchemy.queue[0].remaining,3);
    A.tick(p,30);assert.equal(p.alchemy.potions.moonveil,1800);assert.equal(p.materials.gel,0);
    p.materials.gel=3;enabled=false;assert.equal(A.maxBrewAmount(p,'moonveil'),0);assert.equal(A.brew(p,'moonveil'),false);
    delete sandbox.DeveloperTools;assert.equal(A.infiniteLiquids(p),false);
});
console.log(checks.join('\n')+'\nALCHEMY TESTS PASSED');
