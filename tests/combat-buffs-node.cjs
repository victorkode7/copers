// Run with: node tests/combat-buffs-node.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = {Math:Object.create(Math)};
sandbox.Math.random = () => {throw new Error('Buff rules must not roll randomness');};
for (const name of ['window','document','performance','localStorage','setTimeout','setInterval','state','getPlayerMaxFury','getSkillNodeRank','furySecondsPerStack','gatheringPowerSettings']) {
    Object.defineProperty(sandbox,name,{get(){throw new Error('Unexpected external dependency: '+name);}});
}
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/combat-buffs.js'),'utf8'),sandbox);
const buffs = sandbox.CombatBuffs;
const fury = Object.freeze({secondsPerStack:.1,decaySeconds:.5});
const power = Object.freeze({maxStacks:50,damagePerStack:.02,resetSeconds:1});
const checks=[];
function test(label,run){run();checks.push('PASS '+label);}
function close(actual,expected){assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);}
function fresh(){return{playerHp:100,combatPaused:false,monsterStates:[{hp:100}],furyStacks:0,furyRemaining:0,furyDecaying:false,gatheringPower:{stacks:0,progress:0,remaining:0}};}
function hits(state,count=10,maximum=10,settings=fury){for(let i=0;i<count;i++)buffs.gainFuryFromHit(state,maximum,settings);}

test('Fury gains use only supplied state and capacity, including zero capacity',()=>{
    const state=fresh();hits(state,1,0);assert.equal(state.furyStacks,0);assert.equal(state.furyRemaining,0);
    hits(state,1);assert.equal(state.furyStacks,1);close(state.furyRemaining,.1);
    hits(state,20);assert.equal(state.furyStacks,10);close(state.furyRemaining,1);
});
test('hits at the stack cap add one increment instead of refreshing the shared timer',()=>{
    const state=fresh();hits(state);buffs.tickFury(state,.8,10,fury);hits(state,1);
    assert.equal(state.furyStacks,10);close(state.furyRemaining,.3);
});
test('capacity reductions clamp stacks and active time without granting capacity increases',()=>{
    const state=fresh();hits(state);buffs.normalizeFury(state,3,fury);assert.equal(state.furyStacks,3);close(state.furyRemaining,.3);
    buffs.normalizeFury(state,30,fury);assert.equal(state.furyStacks,3);close(state.furyRemaining,.3);
    buffs.normalizeFury(state,0,fury);assert.equal(state.furyStacks,0);assert.equal(state.furyRemaining,0);assert.equal(state.furyDecaying,false);
});
test('Fury expiry begins half-second decay at the exact shared-timer boundary',()=>{
    const state=fresh();hits(state);buffs.tickFury(state,.9,10,fury);assert.equal(state.furyStacks,10);close(state.furyRemaining,.1);
    buffs.tickFury(state,.1,10,fury);assert.equal(state.furyStacks,9);close(state.furyRemaining,.5);assert.equal(state.furyDecaying,true);
    buffs.tickFury(state,.5,10,fury);assert.equal(state.furyStacks,8);close(state.furyRemaining,.5);
});
test('the last decaying stack keeps its full loss interval through normalization',()=>{
    const state=fresh();hits(state,2,2);buffs.tickFury(state,.2,2,fury);assert.equal(state.furyStacks,1);close(state.furyRemaining,.5);
    buffs.normalizeFury(state,2,fury);close(state.furyRemaining,.5);
    buffs.tickFury(state,.4,2,fury);assert.equal(state.furyStacks,1);close(state.furyRemaining,.1);
    buffs.tickFury(state,.1,2,fury);assert.equal(state.furyStacks,0);assert.equal(state.furyRemaining,0);
});
test('a hit during decay restores stack growth and the normal duration cap',()=>{
    const state=fresh();hits(state,2,2);buffs.tickFury(state,.2,2,fury);hits(state,1,2);
    assert.equal(state.furyStacks,2);assert.equal(state.furyDecaying,false);close(state.furyRemaining,.2);
});
test('long Fury steps preserve the same overshoot as fixed combat ticks',()=>{
    const long=fresh(),fixed=fresh();hits(long);hits(fixed);buffs.tickFury(long,1.8,10,fury);
    for(let i=0;i<18;i++)buffs.tickFury(fixed,.1,10,fury);
    assert.equal(long.furyStacks,fixed.furyStacks);assert.equal(long.furyDecaying,fixed.furyDecaying);close(long.furyRemaining,fixed.furyRemaining);
    buffs.tickFury(long,100,10,fury);assert.equal(long.furyStacks,0);assert.equal(long.furyRemaining,0);assert.equal(long.furyDecaying,false);
});
test('paused and dead actors cannot gain Fury, while paused timers still decay',()=>{
    const state=fresh();hits(state);state.combatPaused=true;const before=JSON.stringify(state);hits(state,1);assert.equal(JSON.stringify(state),before);
    buffs.tickFury(state,1,10,fury);assert.equal(state.furyStacks,9);state.combatPaused=false;state.playerHp=0;
    const dead=JSON.stringify(state);hits(state,1);assert.equal(JSON.stringify(state),dead);
});
test('Fury timing settings are explicit instead of captured from the game',()=>{
    const state=fresh(),custom=Object.freeze({secondsPerStack:.25,decaySeconds:.75});hits(state,4,4,custom);close(state.furyRemaining,1);
    buffs.tickFury(state,1,4,custom);assert.equal(state.furyStacks,3);close(state.furyRemaining,.75);
    buffs.tickFury(state,.75,4,custom);assert.equal(state.furyStacks,2);close(state.furyRemaining,.75);
});
test('Gathering Power tracks partial seconds and grants stacks at exact boundaries',()=>{
    const state=fresh();buffs.tickGatheringPower(state,.9,true,power);assert.equal(state.gatheringPower.stacks,0);close(state.gatheringPower.progress,.9);
    buffs.tickGatheringPower(state,.1,true,power);assert.equal(state.gatheringPower.stacks,1);close(state.gatheringPower.progress,0);close(state.gatheringPower.remaining,1);
});
test('Gathering Power caps at fifty stacks and its multiplier remains read-only',()=>{
    const state=fresh();buffs.tickGatheringPower(state,100,true,power);assert.equal(state.gatheringPower.stacks,50);
    const before=JSON.stringify(state);assert.equal(buffs.getGatheringPowerMultiplier(state,true,power),2);assert.equal(buffs.getGatheringPowerMultiplier(state,false,power),1);assert.equal(JSON.stringify(state),before);
});
test('pausing retains stacks through the grace period and expires them together',()=>{
    const state=fresh();buffs.tickGatheringPower(state,10,true,power);state.combatPaused=true;
    buffs.tickGatheringPower(state,.9,true,power);assert.equal(state.gatheringPower.stacks,10);close(state.gatheringPower.remaining,.1);
    buffs.tickGatheringPower(state,.1,true,power);assert.equal(state.gatheringPower.stacks,0);assert.equal(state.gatheringPower.progress,0);assert.equal(state.gatheringPower.remaining,0);
});
test('waiting for respawns discards partial progress and lets the grace period expire',()=>{
    const state=fresh();buffs.tickGatheringPower(state,2.7,true,power);state.monsterStates[0].hp=0;
    buffs.tickGatheringPower(state,.5,true,power);assert.equal(state.gatheringPower.stacks,2);assert.equal(state.gatheringPower.progress,0);
    buffs.tickGatheringPower(state,.5,true,power);assert.equal(state.gatheringPower.stacks,0);
});
test('resuming combat during grace keeps stacks without banking inactive progress',()=>{
    const state=fresh();buffs.tickGatheringPower(state,2.7,true,power);state.combatPaused=true;buffs.tickGatheringPower(state,.5,true,power);
    state.combatPaused=false;buffs.tickGatheringPower(state,.5,true,power);assert.equal(state.gatheringPower.stacks,2);close(state.gatheringPower.progress,.5);close(state.gatheringPower.remaining,1);
});
test('Gathering Power clears immediately when the skill is removed or the actor dies',()=>{
    const state=fresh();buffs.tickGatheringPower(state,10,true,power);buffs.tickGatheringPower(state,0,false,power);assert.equal(state.gatheringPower.stacks,0);
    buffs.tickGatheringPower(state,10,true,power);state.playerHp=0;buffs.tickGatheringPower(state,0,true,power);assert.equal(state.gatheringPower.stacks,0);assert.equal(state.gatheringPower.remaining,0);
});
test('Gathering Power obeys supplied caps, damage and grace-period settings',()=>{
    const state=fresh(),custom=Object.freeze({maxStacks:3,damagePerStack:.1,resetSeconds:2});buffs.tickGatheringPower(state,10,true,custom);
    assert.equal(state.gatheringPower.stacks,3);close(buffs.getGatheringPowerMultiplier(state,true,custom),1.3);state.combatPaused=true;
    buffs.tickGatheringPower(state,1.5,true,custom);assert.equal(state.gatheringPower.stacks,3);buffs.tickGatheringPower(state,.5,true,custom);assert.equal(state.gatheringPower.stacks,0);
});
test('missing Gathering Power state initializes safely and oversized state is clamped',()=>{
    const state=fresh();delete state.gatheringPower;assert.equal(buffs.getGatheringPowerMultiplier(state,true,power),1);buffs.tickGatheringPower(state,1,true,power);assert.equal(state.gatheringPower.stacks,1);
    state.gatheringPower={stacks:70,remaining:2,progress:0};state.combatPaused=true;buffs.tickGatheringPower(state,0,true,power);
    assert.equal(state.gatheringPower.stacks,50);assert.equal(state.gatheringPower.remaining,1);
});
test('long Gathering Power steps match regular ticks for gains and expiry',()=>{
    const long=fresh(),fixed=fresh();buffs.tickGatheringPower(long,4.4,true,power);
    for(let i=0;i<44;i++)buffs.tickGatheringPower(fixed,.1,true,power);
    assert.equal(long.gatheringPower.stacks,fixed.gatheringPower.stacks);close(long.gatheringPower.progress,fixed.gatheringPower.progress);
    long.combatPaused=true;fixed.combatPaused=true;buffs.tickGatheringPower(long,1,true,power);
    for(let i=0;i<10;i++)buffs.tickGatheringPower(fixed,.1,true,power);
    assert.equal(JSON.stringify(long.gatheringPower),JSON.stringify(fixed.gatheringPower));
});
test('clearing buffs changes only their own fields on the supplied actor',()=>{
    const first=fresh(),second=fresh();first.unrelated='keep';hits(first);buffs.tickGatheringPower(first,5,true,power);
    const untouched=JSON.stringify(second);buffs.clearFury(first);buffs.clearGatheringPower(first);
    assert.equal(first.furyStacks,0);assert.equal(first.gatheringPower.stacks,0);assert.equal(first.unrelated,'keep');assert.equal(JSON.stringify(second),untouched);
});
console.log(checks.join('\n')+'\nBUFF TESTS PASSED');
