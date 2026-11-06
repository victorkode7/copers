// Run with: node tests/combat-abilities-node.cjs
// A minimal host supplies stats, health resolution, events and kill callbacks;
// the production ability rules themselves run without the browser or game.js.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sandbox={Math:Object.create(Math)};
sandbox.Math.random=()=>{throw new Error('Use the injected ability RNG');};
for(const name of ['window','document','performance','localStorage','setTimeout','state','getSkillNodeRank','Equipment','combatEffects','combatPoisonForecasts','voidMissileTimelines'])Object.defineProperty(sandbox,name,{get(){throw new Error('Unexpected host dependency: '+name);}});
for(const file of ['combat-health.js','combat-abilities.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),sandbox);
const health=sandbox.CombatHealth,checks=[];
function test(label,run){run();checks.push('PASS '+label);}
function close(actual,expected){assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);}
function json(value){return JSON.parse(JSON.stringify(value));}

function world({count=9,columns=3,hp=100,ranks={},stats={},random=()=>0}={}){
    const state={skillRanks:{...ranks},monsterStates:Array.from({length:count},(_,i)=>({id:'m'+i,hp,freezeRemaining:0,poisonStacks:[],bleed:null})),monsterColumns:columns,targetMonsterId:'m0',playerHp:100,playerMana:100,manaCapacity:100,voidCharges:0,shieldStacks:0,combatPaused:false,pendingEruptions:[],pendingVoidMissiles:[],kills:0,gold:0};
    const settings={
        arrowSkillSettings:{piercingChance:.3,forkingChance:.1,freezeDuration:9,freezeDelay:3},arrowTravelDirections:[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}],arrowImpactPause:90,
        eruptionSkillSettings:{damageMultiplier:1,healthCost:.05,chainDelay:1000,trailDuration:2000},
        spellSettings:{voidBolt:{manaCost:5},voidVolley:{manaCost:10,charges:5,missiles:10},voidVortex:{manaCost:20,damageMultiplier:.75,chargesPerHit:2,doubleChance:.33}},
        voidMissileTiming:{flight:.4,stagger:.05,redirect:.2,windup:.2},gameTickSeconds:.1,
        elementalSkillSettings:{manaCost:5,duration:10,tickSeconds:1,explosionStacks:10,explosionMultiplier:5,scorchedMultiplier:1.2},
        elementalBrands:[{id:'rimeBrand',upgrade:'glacialRupture',element:'cold'},{id:'emberBrand',upgrade:'cinderRupture',element:'fire'}],
        bleedDamageType:{hitDamageRatio:.1,secondsPerApplication:1,maximumDuration:5,tickIntervalSeconds:1},deepWoundsSettings:{hitDamageRatio:.5,maximumStacks:3},
        poisonDamageType:{baseDamage:1,durationSeconds:5,tickIntervalSeconds:1},shieldSlamDamagePerStack:1
    };
    const events=[],hits=[],forecast=new WeakMap();let rolls=0,engine;
    const emit=(type,details={})=>events.push(json({type,...details}));
    const value=(name,fallback)=>stats[name]??fallback;
    const rules={
        activeMonster:()=>state.monsterStates.find(m=>m.id===state.targetMonsterId&&m.hp>0)||null,
        getSkillNodeRank:id=>state.skillRanks[id]||0,getSkillStat:stat=>value(stat,0),getMultiHit:()=>value('multiHit',1),getPlayerAccuracy:()=>100,getHitChance:()=>value('hitChance',100),
        monsterDefinition:()=>({attackInterval:1,evasion:0}),getDamage:()=>value('damage',10),getSpellDamage:()=>value('spellDamage',12),
        getPlayerMaxHealth:()=>100,getPlayerMaxMana:()=>value('mana',100),getPlayerManaRegen:()=>value('manaRegen',0),getPlayerMaxShields:()=>value('maxShields',10),
        hasShieldGeneration:()=>Boolean(state.skillRanks.shieldGenerator||state.skillRanks.resonantGuard),getMonsterDamageTakenMultiplier:()=>value('vulnerability',1),
        getArrowFlightTime:(kind,sourceId)=>kind==='piercingArrow'?160:sourceId?200:300,
        getBleedChance:()=>value('bleedChance',0),hasDeepWounds:()=>Boolean(state.skillRanks.deepWounds),
        getBleedHitDamageRatio:()=>state.skillRanks.deepWounds?.5:.1,getBleedMaximumStacks:()=>state.skillRanks.deepWounds?3:Number.MAX_SAFE_INTEGER,
        getBleedStacksPerApplication:()=>state.skillRanks.bleederer?2:1,getBleedTickInterval:()=>value('bleedInterval',1),getBleedTickDamage:bleed=>bleed.baseDamagePerTick??bleed.stacks,
        getPoisonChance:()=>value('poisonChance',0),getPoisonDamage:()=>value('poisonDamage',1),getPoisonTickInterval:()=>value('poisonInterval',1),
        getPoisonForecast:m=>forecast.get(m),setPoisonForecast:(m,data)=>forecast.set(m,data),getShockwaveSettings:()=>value('shockwave',{chance:.25,triggers:1}),
        hasFireOfTheRighteous:()=>Boolean(state.skillRanks.righteousFire),getPlayerHealthRegen:()=>value('healthRegen',0),
        getRighteousFireSettings:()=>({regenHealthCap:.3,healthDrainPerSecond:.1,damageMultiplier:1}),
        getRighteousFireRegeneration:elapsed=>health.getRighteousFireRegeneration(state,elapsed,100,rules.getPlayerHealthRegen(),rules.getRighteousFireSettings()),
        applyPlayerHealing:amount=>health.applyPlayerHealing(state,amount,100,rules.hasFireOfTheRighteous()?.3:1),
        applyDamageToPlayer(damage,source){const result=health.applyPlayerDamage(state,damage,source);if(result?.died){state.combatPaused=true;state.shieldStacks=0;state.voidCharges=0;}return result;},
        applyDamageToMonster(monster,damage,type,ability){
            const result=health.applyMonsterDamage(monster,damage,value('vulnerability',1));if(!result)return false;
            hits.push({id:monster.id,damage:result.damageDealt,type,ability});
            if(result.died){
                const stacks=monster.poisonStacks.filter(stack=>stack.remainingDuration>0).map(stack=>({...stack}));monster.poisonStacks=[];monster.bleed=null;state.kills++;state.gold++;
                if(state.targetMonsterId===monster.id)state.targetMonsterId=state.monsterStates.find(m=>m.hp>0)?.id||null;
                engine.transferPoisonOnDeath(monster,stacks);engine.gainShieldFromKill();
            }
            return result.died;
        },
        emitCombatEvent:emit,showCombatArrow:(sourceId,targetId,kind,direction,visual)=>emit('arrow',{sourceId,targetId,kind,direction,visual}),
        showElementalBurst:(ids,element,explosion)=>emit('elemental',{ids,element,explosion}),showEruptionChain:(sourceId,targetId,delay)=>emit('chain',{sourceId,targetId,delay}),
        showMonsterHitBadge:(id,label)=>emit('hitBadge',{id,label}),showMonsterProc:(id,label)=>emit('proc',{id,label}),showPoisonStackProc:m=>emit('poisonStacks',{id:m.id}),
        showPoisonTransfer:(sourceId,targetId)=>emit('transfer',{sourceId,targetId}),showShieldSlamWave:ids=>emit('slam',{ids}),showSpellCast:(kind,hits,delay)=>emit('spell',{kind,hits,delay}),
        showVoidMissileImpact:(id,missile)=>emit('missileImpact',{id,remaining:missile.remaining}),showVoidVolleyBuffProc:()=>emit('volleyBuff'),showVoidVortex:(ids,delay)=>emit('vortex',{ids,delay}),
        showVolcanicEruption:(id,ids)=>emit('eruption',{id,ids}),flashShockwaveCard:id=>emit('shake',{id}),flashShockwaveHealthBar:id=>emit('flash',{id}),
        advanceVoidMissile:()=>{},cancelVoidMissile:hit=>emit('cancel',{id:hit.targetId}),showRighteousFireHit:targets=>emit('fire',{ids:targets.map(m=>m.id)})
    };
    engine=sandbox.CombatAbilities.create({state,rules,settings,random(){rolls++;return random();}});
    return{engine,state,rules,settings,stats,events,hits,get rolls(){return rolls;}};
}

test('formation targeting uses only saved grid coordinates and skips dead or visited targets',()=>{
    const w=world(),m=w.state.monsterStates;assert.deepEqual(json(w.engine.getMonsterGridPosition(m[4])),{row:1,column:1});
    assert.deepEqual(w.engine.getEruptionTargets(m[4]).map(m=>m.id).join(','),'m1,m3,m4,m5,m7');
    assert.equal(w.engine.getArrowRowTargets(m[4]).map(m=>m.id).join(','),'m3,m4,m5');
    assert.equal(w.engine.getForwardDiagonalArrowTargets(m[4],new Set(['m8']),{x:1,y:0}).map(m=>m.id).join(','),'m2');
});
test('fractional multi-hit targeting preserves its single random roll even at integer counts',()=>{
    const w=world({stats:{multiHit:2.5},random:()=>.49});assert.equal(w.engine.getPlayerAttackTargets().length,3);assert.equal(w.rolls,1);
    w.stats.multiHit=2;assert.equal(w.engine.getPlayerAttackTargets().length,2);assert.equal(w.rolls,2);
    w.state.targetMonsterId=null;assert.equal(w.engine.getPlayerAttackTargets().length,0);assert.equal(w.rolls,2);
});
test('Multishot freezes its hit without recursively generating more Multishots or phantom arrows',()=>{
    const w=world({ranks:{multiShot:1,freezingArrows:1}});w.engine.shootAbilityArrow([w.state.monsterStates[0]],10,'multiShot');
    assert.equal(w.hits.length,1);assert.equal(w.state.monsterStates[0].freezeRemaining,9);assert.equal(w.events.filter(e=>e.type==='arrow').length,0);
});
test('piercing reserves its row and fork chains retain forward travel and visual timing',()=>{
    const w=world({ranks:{forkingArrow:1,freezingArrows:1}});w.engine.shootAbilityArrow(w.state.monsterStates.slice(3,6),10,'piercingArrow');
    assert.equal(w.hits.map(hit=>hit.id).join(','),'m3,m4,m5,m1,m2');assert.equal(new Set(w.hits.map(hit=>hit.id)).size,w.hits.length);
    assert.equal(w.events.filter(e=>e.type==='arrow'&&e.kind==='piercingArrow').length,1);
    assert.ok(w.events.filter(e=>e.type==='arrow'&&e.sourceId).every(e=>e.visual.delay===250));
});
test('an eruption pays health once and snapshots its additive chain budget',()=>{
    const w=world({hp:1000,ranks:{volcanicEruption:1},stats:{eruptionChains:2}});w.engine.triggerVolcanicEruption(w.state.monsterStates[4],10);
    assert.equal(w.hits.length,5);assert.equal(w.state.playerHp,95);assert.equal(w.state.pendingEruptions[0].chainsRemaining,1);
    w.engine.tickPendingEruptions(.9);assert.equal(w.events.filter(e=>e.type==='eruption').length,1);
    w.engine.tickPendingEruptions(1.1);assert.equal(w.events.filter(e=>e.type==='eruption').length,3);assert.equal(w.state.pendingEruptions.length,0);assert.equal(w.state.playerHp,95);
});
test('a destination killed en route still erupts under its neighbors after player death',()=>{
    const w=world({ranks:{volcanicEruption:1},stats:{eruptionChains:1},random:()=>.999});w.engine.triggerVolcanicEruption(w.state.monsterStates[0],1);
    w.state.monsterStates[8].hp=0;w.state.playerHp=0;w.state.combatPaused=true;w.engine.tickPendingEruptions(1);
    assert.equal(w.hits.slice(-2).map(hit=>hit.id).join(','),'m5,m7');assert.equal(w.events.filter(e=>e.type==='eruption').at(-1).id,'m8');
});
test('long elapsed steps resolve each chained eruption without losing travel time',()=>{
    const w=world({hp:1000,ranks:{volcanicEruption:1},stats:{eruptionChains:3}});w.engine.triggerVolcanicEruption(w.state.monsterStates[0],1);w.engine.tickPendingEruptions(3.5);
    assert.equal(w.events.filter(e=>e.type==='eruption').length,4);assert.equal(w.state.pendingEruptions.length,0);assert.equal(w.state.playerHp,95);
});
test('mana unlock fills once, capacity changes do not refill, and charge caps follow learned spells',()=>{
    const w=world();w.state.manaCapacity=0;w.state.playerMana=0;w.engine.normalizePlayerMana();assert.equal(w.state.playerMana,100);
    w.stats.mana=200;w.state.playerMana=40;w.engine.normalizePlayerMana();assert.equal(w.state.playerMana,40);assert.equal(w.state.manaCapacity,200);
    w.state.voidCharges=9;w.engine.normalizeVoidCharges();assert.equal(w.state.voidCharges,0);w.state.skillRanks.voidVortex=1;w.state.voidCharges=9;w.engine.normalizeVoidCharges();assert.equal(w.state.voidCharges,5);
});
test('Void Bolt spends five mana and immediately damages its selected multi-hit targets',()=>{
    const w=world({ranks:{voidBolt:1},stats:{multiHit:2}});assert.equal(w.engine.castVoidBolt(),true);
    assert.equal(w.state.playerMana,95);assert.equal(w.state.voidCharges,2);assert.equal(w.hits.map(h=>h.id).join(','),'m0,m1');assert.equal(w.state.pendingVoidMissiles.length,0);
});
test('Volley spends five charges and ten mana while all ten missiles wait for their own deadlines',()=>{
    const w=world({hp:1000,ranks:{voidBolt:1,voidVolley:1}});w.state.voidCharges=5;assert.equal(w.engine.castVoidVolley(),true);
    assert.equal(w.state.playerMana,90);assert.equal(w.state.voidCharges,0);assert.equal(w.state.pendingVoidMissiles.length,10);assert.equal(w.hits.length,0);
    close(w.state.pendingVoidMissiles[0].remaining,.6);close(w.state.pendingVoidMissiles.at(-1).remaining,1.1);
    w.engine.tickPendingVoidMissiles(.59);assert.equal(w.hits.length,0);w.engine.tickPendingVoidMissiles(.01);assert.equal(w.hits.length,1);
    w.engine.tickPendingVoidMissiles(1);assert.equal(w.hits.length,10);assert.equal(w.state.pendingVoidMissiles.length,0);assert.equal(w.state.monsterStates[0].hp,880);
});
test('a redirected missile cancels its old impact and adds a fresh two-tenths travel interval',()=>{
    const w=world({count:3});w.state.monsterStates[0].hp=0;w.state.pendingVoidMissiles=[{targetId:'m0',damage:5,remaining:.1}];
    w.engine.tickPendingVoidMissiles(.1);assert.equal(w.hits.length,0);assert.equal(w.events.filter(e=>e.type==='cancel').length,1);close(w.state.pendingVoidMissiles[0].remaining,.2);
    w.engine.tickPendingVoidMissiles(.19);assert.equal(w.hits.length,0);w.engine.tickPendingVoidMissiles(.01);assert.equal(w.hits[0].id,'m1');assert.equal(w.hits[0].damage,5);
});
test('a long missile step can handle repeated redirects when a replacement dies during flight',()=>{
    const w=world({count:3});w.state.monsterStates[0].hp=0;w.state.monsterStates[1].hp=1;
    w.state.pendingVoidMissiles=[{targetId:'m0',damage:5,remaining:.1},{targetId:'m1',damage:5,remaining:.2}];w.engine.tickPendingVoidMissiles(.5);
    assert.equal(w.events.filter(e=>e.type==='cancel').length,2);assert.equal(w.state.monsterStates[2].hp,95);assert.equal(w.state.pendingVoidMissiles.length,0);
});
test('Echoing Void rolls once and repeats the original row for one mana payment',()=>{
    const w=world({ranks:{voidVortex:1,echoingVoid:1}});w.state.monsterStates[0].hp=1;assert.equal(w.engine.castVoidVortex(),true);
    assert.equal(w.state.playerMana,80);assert.equal(w.rolls,1);assert.equal(w.hits.length,5);assert.equal(w.state.monsterStates[1].hp,82);assert.equal(w.state.monsterStates[3].hp,100);
    assert.equal(w.events.filter(e=>e.type==='vortex').map(e=>e.delay).join(','),'0,180');
    const boundary=world({ranks:{voidVortex:1,echoingVoid:1},random:()=>.33});boundary.engine.castVoidVortex();assert.equal(boundary.events.filter(e=>e.type==='vortex').length,1);
});
test('Vortex charges can release a separately paid Volley without immediate missile damage',()=>{
    const w=world({ranks:{voidVortex:1,voidVolley:1}});w.engine.castVoidVortex();assert.equal(w.state.playerMana,70);assert.equal(w.state.pendingVoidMissiles.length,10);assert.equal(w.state.voidCharges,0);assert.equal(w.hits.length,3);
});
test('cold and fire brands expire on their tenth tick after orthogonal explosions and debuffs',()=>{
    const w=world({hp:1000,ranks:{rimeBrand:1,glacialRupture:1,emberBrand:1,cinderRupture:1}});w.state.targetMonsterId='m4';w.engine.castElementalBrand('rimeBrand');w.engine.castElementalBrand('emberBrand');
    assert.equal(w.state.playerMana,90);w.engine.tickElementalBrands(w.state.monsterStates[4],9);assert.equal(w.events.filter(e=>e.type==='elemental'&&e.explosion).length,0);
    w.engine.tickElementalBrands(w.state.monsterStates[4],1);assert.equal(w.state.monsterStates[4].hp,760);
    for(const index of [1,3,5,7]){assert.equal(w.state.monsterStates[index].hp,880);assert.equal(w.state.monsterStates[index].freezeRemaining,9);assert.equal(w.state.monsterStates[index].scorched,true);}
    assert.equal(w.state.monsterStates[4].rimeBrand,null);assert.equal(w.state.monsterStates[4].emberBrand,null);
});
test('a brand cannot tick beyond its duration and an unlearned brand is removed',()=>{
    const w=world({hp:1000,ranks:{rimeBrand:1}});w.engine.castElementalBrand('rimeBrand');w.engine.tickElementalBrands(w.state.monsterStates[0],60);assert.equal(w.state.monsterStates[0].hp,880);
    w.engine.castElementalBrand('rimeBrand');w.state.skillRanks={};w.engine.tickElementalBrands(w.state.monsterStates[0],1);assert.equal(w.state.monsterStates[0].rimeBrand,null);assert.equal(w.state.monsterStates[0].hp,880);
});
test('poison death transfer carries advanced clocks without replaying the killing tick',()=>{
    const w=world({count:3,ranks:{bloomingFlower:1},stats:{poisonDamage:2}});w.state.monsterStates[0].hp=1;
    const original={remainingDuration:3,timeUntilTick:.1};w.state.monsterStates[0].poisonStacks=[original];w.engine.tickMonsterPoison(w.state.monsterStates[0],.1);
    const transferred=w.state.monsterStates[1].poisonStacks[0];assert.notEqual(transferred,original);close(transferred.remainingDuration,2.9);close(transferred.timeUntilTick,1);assert.equal(w.state.monsterStates[1].hp,100);
});
test('Poison Execute checks each transferred recipient separately and awards each kill once',()=>{
    const w=world({count:3,hp:3,ranks:{bloomingFlower:1,poisonExecute:1},stats:{poisonChance:1}});w.engine.tryApplyPoison(w.state.monsterStates[0]);
    assert.equal(w.state.kills,1);assert.equal(w.state.monsterStates[1].hp,3);w.engine.tickMonsterPoison(w.state.monsterStates[1],.1);assert.equal(w.state.kills,2);
    w.engine.tickMonsterPoison(w.state.monsterStates[2],.1);assert.equal(w.state.kills,3);assert.ok(w.state.monsterStates.every(m=>m.hp===0&&m.poisonStacks.length===0));
});
test('Deep Wounds retains the strongest contributions while doubled applications respect its cap',()=>{
    const w=world({hp:10000,ranks:{deepWounds:1,bleederer:1},stats:{bleedChance:1}}),m=w.state.monsterStates[0];
    w.engine.tryApplyBleed(m,10);w.engine.tryApplyBleed(m,40);assert.equal(m.bleed.stacks,3);assert.equal(m.bleed.baseDamagePerTick,45);
    w.engine.tryApplyBleed(m,100);assert.equal(m.bleed.baseDamagePerTick,120);assert.equal(m.bleed.remainingDuration,5);w.engine.tickMonsterBleed(m,5);
    assert.equal(m.hp,9400);assert.equal(m.bleed,null);
});
test('each Shockwave activation refreshes living targets and grants exactly one Resonant Guard shield',()=>{
    const w=world({count:3,ranks:{shockwaveSlash:1,resonantGuard:1},stats:{shockwave:{chance:1,triggers:2}}});w.state.monsterStates[1].hp=2;
    w.engine.triggerShockwaveSlash(w.state.monsterStates[0],10);assert.equal(w.state.kills,1);close(w.state.monsterStates[2].hp,93.4);assert.equal(w.state.shieldStacks,2);assert.equal(w.rolls,1);
    const boss=world({count:1,ranks:{shockwaveSlash:1,resonantGuard:1},stats:{shockwave:{chance:1,triggers:2}}});boss.engine.triggerShockwaveSlash(boss.state.monsterStates[0],10);assert.equal(boss.state.shieldStacks,2);
});
test('Shield Slam preserves its overflow budget and guards shield gains caused by its own kills',()=>{
    const w=world({count:3,ranks:{shieldGenerator:1,shieldSlam:1,overflowingSlam:1}});w.state.monsterStates[0].hp=5;w.state.monsterStates[1].hp=10;w.state.shieldStacks=10;w.engine.tryShieldSlam();
    assert.equal(w.state.monsterStates[2].hp,65);assert.equal(w.state.shieldStacks,7);assert.equal(w.state.kills,2);assert.equal(w.engine.resolvingShieldSlam,false);
    assert.equal(w.events.find(e=>e.type==='slam').ids.join(','),'m0,m1,m2');
});
test('one-shield capacities resolve large kill chains without recursion or duplicate rewards',()=>{
    const w=world({count:100,hp:1,ranks:{shieldGenerator:1,shieldSlam:1,overflowingSlam:1},stats:{maxShields:1,damage:1}});w.state.shieldStacks=1;w.engine.tryShieldSlam();
    assert.equal(w.state.kills,100);assert.equal(w.state.gold,100);assert.equal(w.state.shieldStacks,1);assert.equal(w.engine.resolvingShieldSlam,false);
});
test('a failing slam releases its instance guard and does not lock another engine',()=>{
    const first=world({ranks:{shieldGenerator:1,shieldSlam:1}}),second=world({ranks:{shieldGenerator:1,shieldSlam:1}});first.state.shieldStacks=10;second.state.shieldStacks=10;
    const damage=first.rules.applyDamageToMonster;first.rules.applyDamageToMonster=()=>{second.engine.tryShieldSlam();throw new Error('expected failure');};
    assert.throws(()=>first.engine.tryShieldSlam(),/expected failure/);assert.equal(first.engine.resolvingShieldSlam,false);assert.equal(second.state.shieldStacks,5);
    first.rules.applyDamageToMonster=damage;first.state.shieldStacks=10;first.engine.tryShieldSlam();assert.equal(first.state.shieldStacks,5);
});
test('Righteous Fire reserves healing and snapshots its split before awarding lethal hits',()=>{
    const w=world({count:3,ranks:{righteousFire:1},stats:{healthRegen:20}});w.state.playerHp=30;w.state.monsterStates[0].hp=1;w.engine.tickPlayerRegeneration(1);
    assert.equal(w.state.playerHp,30);close(w.state.monsterStates[1].hp,100-10/3);close(w.state.monsterStates[2].hp,100-10/3);assert.equal(w.state.kills,1);assert.equal(w.events.at(-1).ids.length,3);
});
console.log(checks.join('\n')+'\nABILITY TESTS PASSED');
