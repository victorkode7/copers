(function () {
    const checks = [];
    const priorRandom = Math.random;
    function check(label, condition) {
        checks.push((condition ? 'PASS ' : 'FAIL ') + label);
        if (!condition) throw new Error(label);
    }
    function fresh(ranks = {poisonExecute: 1, snakeBite: 1}) {
        state.skillRanks = ranks;
        state.gear = createEmptyGear();
        state.experience = 0; state.level = 100;
        resetMonsterStates(currentMap());
        render();
        return state.monsterStates[0];
    }
    function stack(ticks) {
        const interval = getPoisonTickInterval();
        return {remainingDuration: ticks * interval, timeUntilTick: interval};
    }
    try {
        Math.random = () => 0;
        let monster = fresh({snakeBite: 1});
        monster.hp = 5;
        tryApplyPoison(monster);
        check('without the node lethal poison still waits for ticks', monster.hp === 5 && getRemainingPoisonDamage(monster) === 5);

        monster = fresh(); monster.hp = 6;
        tryApplyPoison(monster);
        check('one nonlethal stack does not execute', monster.hp === 6 && getRemainingPoisonDamage(monster) === 5);
        monster = fresh(); monster.hp = 5;
        const kills = state.kills[currentMap().id], gold = state.gold;
        tryApplyPoison(monster);
        check('a newly applied lethal stack executes immediately at equality', monster.hp === 0);
        check('execute grants normal rewards and starts respawn', state.kills[currentMap().id] === kills + 1 && state.gold > gold && state.experience > 0 && monster.respawnRemaining > 0 && monster.poisonStacks.length === 0);
        tickMonsterPoison(monster, 0.1); tryApplyPoison(monster); tryExecutePoison(monster);
        check('executed enemies cannot grant duplicate rewards', state.kills[currentMap().id] === kills + 1);

        monster = fresh(); monster.hp = 10;
        tryApplyPoison(monster);
        check('the first of two required stacks leaves the target alive', monster.hp === 10);
        tryApplyPoison(monster);
        check('all stacks combine to execute on the second application', monster.hp === 0);

        monster = fresh(); monster.hp = 5;
        monster.poisonStacks = [stack(2), stack(2)];
        check('aged stacks count only remaining ticks', getRemainingPoisonDamage(monster) === 4 && !tryExecutePoison(monster));
        check('physical damage can bring existing poison into execute range', applyDamageToMonster(monster, 1, 'physical') && monster.hp === 0);

        monster = fresh(); monster.hp = 1;
        monster.poisonStacks = [{remainingDuration: 0.1, timeUntilTick: 0.2}];
        check('stacks that expire before their next tick cannot execute', getRemainingPoisonDamage(monster) === 0 && !tryExecutePoison(monster));

        monster = fresh(); monster.hp = 3; monster.poisonStacks = [stack(3)];
        check('existing lethal poison executes on the next update', tickMonsterPoison(monster, 0.1) && monster.hp === 0);
        monster = fresh({poisonExecute: 1, snakeBite: 1, poisonDMG_2: 1, basicallySnake: 1});
        monster.poisonStacks = [stack(3), stack(2)];
        const forecast = getRemainingPoisonDamage(monster);
        monster.hp = forecast;
        check('damage and tick-speed bonuses share the health bar forecast', forecast === getPoisonDamage() * 5 && tryExecutePoison(monster) && monster.hp === 0);
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    Math.random = priorRandom;
    const report = document.createElement('pre'); report.id = 'smoke-results';
    report.textContent = checks.join('\n'); document.body.append(report);
}());
