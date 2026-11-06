// Run with: node tests/combat-health-node.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = {Math:Object.create(Math)};
sandbox.Math.random = () => {throw new Error('Health rules must not roll randomness');};
for (const name of ['window','document','performance','localStorage','setTimeout','state','getSkillStat','getGearStat','emitCombatEvent','defeatEnemy','clearPlayerCombatBuffs']) {
    Object.defineProperty(sandbox,name,{get(){throw new Error('Unexpected host dependency: '+name);}});
}
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/combat-health.js'),'utf8'),sandbox);
const health = sandbox.CombatHealth;
const fire = Object.freeze({regenHealthCap:.3,healthDrainPerSecond:.1,damageMultiplier:1});
const checks=[];
function test(label,run){run();checks.push('PASS '+label);}
function close(actual,expected){assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);}

test('maximum health multiplies and rounds the supplied base with a minimum of one',()=>{
    assert.equal(health.getMaxHealth(125,1.2,1.5),225);assert.equal(health.getMaxHealth(100.6,1,1),101);assert.equal(health.getMaxHealth(-1,1,1),1);
});
test('physical damage keeps integer rounding, its minimum and the current Fury bonus',()=>{
    assert.equal(health.getPhysicalDamage(100,1,1,10,.02),120);assert.equal(health.getPhysicalDamage(3,1.5,1,0,.02),5);assert.equal(health.getPhysicalDamage(-100,1,1,0,.02),1);
});
test('spell damage preserves fractions and a zero minimum instead of physical rounding',()=>{
    close(health.getSpellDamage(2.5,1.5,1,10,.02),4.5);assert.equal(health.getSpellDamage(-10,1,1,0,.02),0);close(health.getSpellDamage(.1,1,1,0,.02),.1);
});
test('regeneration combines flat and maximum-health sources before increased regeneration',()=>{
    close(health.getHealthRegeneration(100,1.25,.03,1.5),10.625);close(health.getHealthRegeneration(200,1.25,.03,1.5),18.125);
});
test('regeneration penalties clamp the combined base and multiplier independently',()=>{
    assert.equal(health.getHealthRegeneration(100,-5,.1,1),10);assert.equal(health.getHealthRegeneration(100,-100,0,1),0);assert.equal(health.getHealthRegeneration(100,10,0,-2),0);
});
test('ordinary healing reports actual health gained and never exceeds maximum health',()=>{
    const state={playerHp:98.75};close(health.applyPlayerHealing(state,10,100,1),1.25);assert.equal(state.playerHp,100);assert.equal(health.applyPlayerHealing(state,10,100,1),0);
});
test('fractional healing caps stay exact and do not clamp pre-existing health above the cap',()=>{
    const state={playerHp:27};close(health.applyPlayerHealing(state,10,111,.25),.75);close(state.playerHp,27.75);
    state.playerHp=90;assert.equal(health.applyPlayerHealing(state,100,100,.3),0);assert.equal(state.playerHp,90);
});
test('invalid healing amounts do not mutate actor health',()=>{
    for(const amount of [0,-1,NaN,Infinity,-Infinity]){const state={playerHp:50};assert.equal(health.applyPlayerHealing(state,amount,100,1),0);assert.equal(state.playerHp,50);}
});
test('Righteous Fire below its cap reserves healing before calculating any excess',()=>{
    const state={playerHp:20},before=JSON.stringify(state),balance=health.getRighteousFireRegeneration(state,.1,100,20,fire);
    close(balance.drain,1);close(balance.healing,2);assert.equal(balance.excess,0);assert.equal(JSON.stringify(state),before);
});
test('crossing the Fire cap converts only unused regeneration into burning',()=>{
    const state={playerHp:29.5},balance=health.getRighteousFireRegeneration(state,.1,100,20,fire);
    close(balance.drain,1);close(balance.healing,1.5);close(balance.excess,.5);health.applyPlayerHealing(state,balance.healing-balance.drain,100,.3);assert.equal(state.playerHp,30);
});
test('Fire sustains low health without applying drain before the reserved healing',()=>{
    const state={playerHp:.5},balance=health.getRighteousFireRegeneration(state,.1,100,20,fire);
    health.applyPlayerHealing(state,balance.healing-balance.drain,100,.3);close(state.playerHp,1.5);
});
test('Fire health above the healing cap drains normally instead of being clamped away',()=>{
    const state={playerHp:90,shieldStacks:2},balance=health.getRighteousFireRegeneration(state,1,100,20,fire);
    assert.equal(balance.healing,0);assert.equal(balance.drain,10);assert.equal(balance.excess,20);
    health.applyPlayerDamage(state,balance.drain,'self');assert.equal(state.playerHp,80);assert.equal(state.shieldStacks,2);
});
test('Fire settings and maximum health are supplied explicitly',()=>{
    const settings={regenHealthCap:.5,healthDrainPerSecond:.2},balance=health.getRighteousFireRegeneration({playerHp:100},1,200,60,settings);
    assert.equal(balance.drain,40);assert.equal(balance.healing,40);assert.equal(balance.excess,20);
});
test('invalid damage never consumes a shield or changes a player',()=>{
    for(const damage of [0,-1,NaN,Infinity,-Infinity]){const state={playerHp:10,shieldStacks:2};assert.equal(health.applyPlayerDamage(state,damage,'enemy'),null);assert.equal(state.playerHp,10);assert.equal(state.shieldStacks,2);}
    assert.equal(health.applyPlayerDamage({playerHp:0,shieldStacks:2},1,'enemy'),null);
});
test('an enemy hit consumes exactly one shield without damaging health',()=>{
    const state={playerHp:100,shieldStacks:2},result=health.applyPlayerDamage(state,1000,'enemy');
    assert.equal(result.blocked,true);assert.equal(result.damageDealt,0);assert.equal(result.died,false);assert.equal(state.playerHp,100);assert.equal(state.shieldStacks,1);
});
test('self damage bypasses shields and preserves fractional damage',()=>{
    const state={playerHp:10,shieldStacks:2},result=health.applyPlayerDamage(state,1.25,'self');
    assert.equal(result.blocked,false);close(result.damageDealt,1.25);close(state.playerHp,8.75);assert.equal(state.shieldStacks,2);
});
test('lethal player damage reports actual loss while leaving death orchestration to the host',()=>{
    const state={playerHp:10,shieldStacks:0,combatPaused:false,attackTimer:9,furyStacks:5},result=health.applyPlayerDamage(state,1000,'enemy');
    assert.equal(state.playerHp,0);assert.equal(result.damageDealt,10);assert.equal(result.died,true);assert.equal(state.combatPaused,false);assert.equal(state.attackTimer,9);assert.equal(state.furyStacks,5);
});
test('repeated fractional health costs cannot leave a floating-point sliver alive',()=>{
    const state={playerHp:111,shieldStacks:0};let result;for(let i=0;i<20;i++)result=health.applyPlayerDamage(state,111*.05,'self');assert.equal(state.playerHp,0);assert.equal(result.died,true);
    const survivor={playerHp:1,shieldStacks:0};health.applyPlayerDamage(survivor,1-2e-8,'self');assert.ok(survivor.playerHp>0);
});
test('bow increases add before their zero clamp',()=>{
    close(health.getBowDamageMultiplier(.5,.25),1.75);assert.equal(health.getBowDamageMultiplier(-2,.5),0);close(health.getBowDamageMultiplier(-1.5,1),.5);
});
test('isolation is recalculated from living enemies on each hit',()=>{
    const first={hp:100},second={hp:100},state={monsterStates:[first,second]};
    assert.equal(health.getMonsterDamageTakenMultiplier(state,first,1.5,true),1.5);second.hp=0;close(health.getMonsterDamageTakenMultiplier(state,first,1.5,true),1.95);
    assert.equal(health.getMonsterDamageTakenMultiplier(state,first,1.5,false),1.5);first.hp=0;assert.equal(health.getMonsterDamageTakenMultiplier(state,first,1.5,true),1.5);
});
test('Scorched affects only fire abilities and uses the supplied multiplier',()=>{
    assert.equal(health.getFireDamageTakenMultiplier({scorched:true},true,1.2),1.2);assert.equal(health.getFireDamageTakenMultiplier({scorched:true},false,1.2),1);assert.equal(health.getFireDamageTakenMultiplier({scorched:false},true,2),1);
});
test('monster damage applies the supplied combined modifier exactly once',()=>{
    const monster={hp:100},result=health.applyMonsterDamage(monster,10,1.95*1.2);close(monster.hp,76.6);close(result.damageDealt,23.4);assert.equal(result.died,false);
});
test('monster overkill reports only real health loss and rejects repeat corpse hits',()=>{
    const monster={hp:25,poisonStacks:[{remainingDuration:1}]},result=health.applyMonsterDamage(monster,100,10);
    assert.equal(monster.hp,0);assert.equal(result.damageDealt,25);assert.equal(result.died,true);assert.equal(monster.poisonStacks.length,1);assert.equal(health.applyMonsterDamage(monster,100,1),null);
});
test('monster DOT damage retains its precision without the player death epsilon',()=>{
    const monster={hp:1e-9},result=health.applyMonsterDamage(monster,.5e-9,1);assert.equal(monster.hp,.5e-9);assert.equal(result.died,false);
});
test('invalid or missing monster targets are unchanged',()=>{
    assert.equal(health.applyMonsterDamage(null,10,1),null);for(const damage of [0,-1,NaN,Infinity]){const monster={hp:10};assert.equal(health.applyMonsterDamage(monster,damage,1),null);assert.equal(monster.hp,10);}
});
console.log(checks.join('\n')+'\nHEALTH TESTS PASSED');
