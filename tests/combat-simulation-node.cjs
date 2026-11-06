// Run with: node tests/combat-simulation-node.cjs
// Only the extracted orchestration is tested here. Browser integration tests
// verify the full existing gameplay rules against their committed baselines.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sandbox = {Math:Object.create(Math)};
sandbox.Math.random = () => {throw new Error('Use the injected combat RNG');};
for (const name of ['window','document','performance','localStorage','setTimeout','setInterval','requestAnimationFrame']) {
    Object.defineProperty(sandbox,name,{get(){throw new Error('Unexpected browser dependency: '+name);}});
}
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/combat-simulation.js'),'utf8'),sandbox);
const {create} = sandbox.CombatSimulation;
const checks=[];
function test(label,run){run();checks.push('PASS '+label);}
function close(actual,expected){assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);}

function encounter({paused=false,enemyTimer=.9,playerTimer=.9,hitChance=100,enemyHitChance=100,roll=0,freezeDelay=3,poisonDamage=0}={}) {
    const map={id:'test'};
    const monster={id:'mob',hp:100,attackTimer:enemyTimer,freezeRemaining:0,respawnRemaining:0,bleed:null};
    const state={kills:{test:0},monsterStates:[monster],targetMonsterId:monster.id,playerHp:paused?0:100,combatPaused:paused,attackTimer:playerTimer};
    const calls=[],events=[];let rolls=0;
    const rules={
        tickTown(profile,elapsed){assert.equal(profile,state);profile.townSeconds=(profile.townSeconds||0)+elapsed;calls.push('town');},
        currentMap:()=>map,tickFury(){calls.push('fury');},tickGatheringPower(){calls.push('power');},normalizeShields(){calls.push('shields');},
        tickPlayerRegeneration(){calls.push('regen');},
        ensureLiveMonsterTarget(){if(!rules.activeMonster())state.targetMonsterId=state.monsterStates.find(target=>target.hp>0)?.id||null;},
        activeMonster:()=>state.monsterStates.find(target=>target.id===state.targetMonsterId&&target.hp>0)||null,
        monsterDefinition:()=>({health:100,attackInterval:1,attackDamage:1,evasion:0}),
        clearElementalDebuffs(target){target.rimeBrand=null;target.emberBrand=null;target.scorched=false;},
        tickPendingEruptions(){calls.push('eruptions');},tickPendingVoidMissiles(){calls.push('missiles');},tryShieldSlam(){calls.push('slam');},tickPlayerMana(){calls.push('mana');},
        tickMonsterPoison(target){calls.push('poison');target.hp-=poisonDamage;},tickMonsterBleed(){calls.push('bleed');},tickElementalBrands(){calls.push('brands');},
        syncLegacyEnemyState(){state.enemyHp=state.monsterStates[0].hp;},getEnemyHitChance:()=>enemyHitChance,
        applyDamageToPlayer(damage){calls.push('enemyHit');state.playerHp=Math.max(0,state.playerHp-damage);if(!state.playerHp){state.combatPaused=true;state.attackTimer=0;}},
        emitCombatEvent(type,details){events.push({type,...details});},getAttackSpeed:()=>1,getDamage:()=>10,getPlayerAttackTargets:()=>state.monsterStates.filter(target=>target.hp>0),
        getHitChance:()=>hitChance,getPlayerAccuracy:()=>100,showMonsterHitBadge(id){calls.push('multiHit:'+id);},
        applyDamageToMonster(target,damage){calls.push('playerHit');target.hp=Math.max(0,target.hp-damage);if(!target.hp){state.kills.test++;target.respawnRemaining=.5;rules.ensureLiveMonsterTarget();}},
        tryApplyBleed(){calls.push('bleedHit');},tryApplyPoison(){calls.push('poisonHit');},triggerShockwaveSlash(){calls.push('shockwave');},
        triggerVolcanicEruption(){calls.push('eruptionHit');},triggerAttackArrowSkills(){calls.push('arrows');},triggerAttackSpells(){calls.push('spells');}
    };
    const simulation=create({state,rules,freezeDelay,random(){rolls++;return roll;}});
    return{simulation,state,monster,rules,calls,events,get rolls(){return rolls;}};
}

test('the combat module loads and runs without browser globals or global randomness',()=>{
    const battle=encounter(),result=battle.simulation.step(.1);
    assert.equal(battle.state.playerHp,99);assert.equal(battle.monster.hp,90);assert.equal(battle.rolls,2);assert.equal(result.needsRender,false);
    assert.ok(battle.calls.indexOf('enemyHit')<battle.calls.indexOf('playerHit'));
    assert.ok(battle.calls.indexOf('missiles')<battle.calls.indexOf('poison'));
    close(battle.state.townSeconds,.1);
});
test('partial freezing slows enemy progress without banking attacks after thaw',()=>{
    const battle=encounter({playerTimer:-10});battle.monster.freezeRemaining=.05;battle.simulation.step(.1);
    close(battle.monster.attackTimer,.9625);assert.equal(battle.monster.freezeRemaining,0);assert.equal(battle.rolls,0);
    battle.simulation.step(.1);assert.equal(battle.state.playerHp,99);assert.equal(battle.rolls,1);close(battle.monster.attackTimer,.0625);
    const slower=encounter({playerTimer:-10,freezeDelay:7});slower.monster.freezeRemaining=.05;slower.simulation.step(.1);close(slower.monster.attackTimer,.95625);
});
test('respawning restores monster state and starts a fresh player attack interval',()=>{
    const battle=encounter();battle.monster.hp=0;battle.monster.respawnRemaining=.1;battle.monster.bleed={stacks:1};battle.monster.rimeBrand={stacks:3};
    const result=battle.simulation.step(.1);
    assert.equal(result.needsRender,true);assert.equal(battle.monster.hp,100);assert.equal(battle.monster.bleed,null);assert.equal(battle.monster.rimeBrand,null);
    assert.equal(battle.state.targetMonsterId,battle.monster.id);close(battle.state.attackTimer,.1);assert.equal(battle.rolls,0);
});
test('paused combat continues pending abilities and DOTs without enemy or player attacks',()=>{
    const battle=encounter({paused:true,poisonDamage:2});const result=battle.simulation.step(.1);
    assert.equal(battle.monster.hp,98);assert.equal(battle.state.playerHp,0);assert.equal(battle.rolls,0);assert.equal(result.needsRender,false);
    for(const name of ['eruptions','missiles','poison','bleed','brands'])assert.ok(battle.calls.includes(name));
    assert.ok(!battle.calls.includes('playerHit'));assert.ok(!battle.calls.includes('enemyHit'));
});
test('an enemy killing the player prevents the ready player attack in the same step',()=>{
    const battle=encounter();battle.state.playerHp=1;const result=battle.simulation.step(.1);
    assert.equal(battle.state.playerHp,0);assert.equal(battle.state.combatPaused,true);assert.equal(battle.monster.hp,100);assert.equal(battle.rolls,1);assert.equal(result.needsRender,true);
});
test('a missed primary attack still triggers its paid eruption and attack abilities',()=>{
    const battle=encounter({enemyTimer:-10,hitChance:0,roll:.99});battle.simulation.step(.1);
    assert.equal(battle.monster.hp,100);assert.equal(battle.events[0].type,'monsterDodged');assert.equal(battle.events[0].monsterId,battle.monster.id);
    for(const name of ['eruptionHit','arrows','spells'])assert.ok(battle.calls.includes(name));
    for(const name of ['playerHit','bleedHit','poisonHit','shockwave'])assert.ok(!battle.calls.includes(name));
});
test('kill-driven changes request a render and do not duplicate the awarded kill',()=>{
    const battle=encounter({enemyTimer:-10});battle.monster.hp=5;
    assert.equal(battle.simulation.step(.1).needsRender,true);assert.equal(battle.state.kills.test,1);
    battle.simulation.step(.1);assert.equal(battle.state.kills.test,1);
});
test('separate simulations keep their own state, rules and random sources',()=>{
    const first=encounter(),second=encounter({roll:.99,hitChance:0,enemyHitChance:0});
    first.simulation.step(.1);assert.equal(second.monster.hp,100);assert.equal(second.state.townSeconds,undefined);
    second.simulation.step(.1);assert.equal(first.monster.hp,90);assert.equal(second.monster.hp,100);assert.equal(second.state.playerHp,100);
    assert.equal(second.events[0].type,'playerDodged');assert.equal(second.events[1].type,'monsterDodged');
});
console.log(checks.join('\n')+'\nNODE TESTS PASSED');
