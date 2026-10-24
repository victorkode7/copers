(function () {
    const checks = [], priorRandom = Math.random;
    const near = (a, b) => Math.abs(a - b) < 1e-6;
    function check(label, condition) {
        checks.push((condition ? 'PASS ' : 'FAIL ') + label);
        if (!condition) throw new Error(label);
    }
    function fresh(ranks = {bloomingFlower: 1}) {
        state.skillRanks = ranks; state.gear = createEmptyGear();
        state.currentView = 'map';
        const map = currentMap(), monsterId = worldContent.monsters[0].id;
        map.spawns = ['flowerA', 'flowerB', 'flowerC'].map(id =>
            ({id, monsterId, count: 1, overrides: {health: 100}}));
        resetMonsterStates(map); render();
        return state.monsterStates;
    }
    const stack = (duration = 4, nextTick = 0.5) => ({remainingDuration: duration, timeUntilTick: nextTick});
    try {
        Math.random = () => 0;
        let [source, target, other] = fresh({});
        source.poisonStacks = [stack()]; applyDamageToMonster(source, 100);
        check('without the skill poison does not transfer', target.poisonStacks.length === 0 && other.poisonStacks.length === 0);

        [source, target, other] = fresh();
        const original = stack(3, 0.4);
        source.poisonStacks = [original, stack(2, 0.7)];
        target.poisonStacks = [stack(1, 0.2)];
        applyDamageToMonster(source, 100);
        check('physical kills move all stacks to one living enemy', source.poisonStacks.length === 0 && target.poisonStacks.length === 3 && other.poisonStacks.length === 0);
        check('transferred stacks preserve lifetime and tick timing', target.poisonStacks[1] !== original && near(target.poisonStacks[1].remainingDuration, 3) && near(target.poisonStacks[1].timeUntilTick, 0.4));
        check('stack indicator includes existing and transferred stacks', document.querySelector('[data-monster-id="flowerB"] [data-enemy-dot-count]').textContent === '3x');
        const transfer = elements.combatPanel.querySelector('.poison-transfer[data-source-id="flowerA"][data-target-id="flowerB"]');
        const line = transfer?.querySelector('line');
        check('poison transfer draws a green line to the recipient without blocking clicks',
            Boolean(line) && getComputedStyle(line).stroke === 'rgb(118, 255, 118)' && getComputedStyle(transfer).pointerEvents === 'none');
        const frame = transfer.getBoundingClientRect();
        const mark = document.querySelector('[data-monster-id="flowerB"] .enemy-mark').getBoundingClientRect();
        check('transfer line ends at the receiving monster sprite', near(Number(line.getAttribute('x2')), mark.left + mark.width / 2 - frame.left) && near(Number(line.getAttribute('y2')), mark.top + mark.height / 2 - frame.top));
        line.dispatchEvent(new AnimationEvent('animationend', {bubbles: true, animationName: 'poison-transfer-draw'}));
        check('line remains visible after drawing finishes', transfer.isConnected);
        transfer.dispatchEvent(new AnimationEvent('animationend', {animationName: 'poison-transfer-fade'}));
        check('transfer line is removed after fading', !transfer.isConnected);

        [source, target, other] = fresh();
        target.hp = 0; target.respawnRemaining = 2;
        source.poisonStacks = [stack()]; applyDamageToMonster(source, 100);
        check('respawning enemies are excluded from transfer targets', target.poisonStacks.length === 0 && other.poisonStacks.length === 1);

        [source, target, other] = fresh();
        source.hp = 1; source.poisonStacks = [stack(5, 0.1), stack(3, 0.3)];
        tickMonsterPoison(source, 0.1);
        check('poison kills transfer all stacks with updated clocks', source.hp === 0 && target.poisonStacks.length === 2 && near(target.poisonStacks[0].remainingDuration, 4.9) && near(target.poisonStacks[0].timeUntilTick, 1) && near(target.poisonStacks[1].remainingDuration, 2.9) && near(target.poisonStacks[1].timeUntilTick, 0.2));
        const hp = target.hp; tickMonsterPoison(target, 0);
        check('the killing poison tick is not repeated on the recipient', target.hp === hp);

        [source, target, other] = fresh();
        source.hp = 1; source.poisonStacks = [stack(0.1, 0.1)];
        tickMonsterPoison(source, 0.1);
        check('fully expired poison is not transferred', source.hp === 0 && target.poisonStacks.length === 0 && other.poisonStacks.length === 0);

        [source, target, other] = fresh();
        target.hp = 1;
        source.poisonStacks = [stack(4, 0.5)];
        applyDamageToMonster(source, 100);
        check('Blooming Flower alone never executes even with lethal transferred poison', target.hp === 1 && target.poisonStacks.length === 1);

        [source, target, other] = fresh({bloomingFlower: 1, poisonExecute: 1});
        source.hp = target.hp = other.hp = 3;
        const interval = getPoisonTickInterval();
        source.poisonStacks = [stack(interval * 3, interval)];
        const kills = state.kills[currentMap().id];
        tryExecutePoison(source);
        check('spreading does not immediately execute the recipient', source.hp === 0 && target.hp === 3 && other.hp === 3 && target.poisonStacks.length === 1);
        tickMonsterPoison(target, 0.1);
        check('Poison Execute separately checks transferred poison during its update', target.hp === 0 && other.hp === 3 && other.poisonStacks.length === 1);
        tickMonsterPoison(other, 0.1);
        check('execute kills award each reward once and stop without living targets', state.kills[currentMap().id] === kills + 3 && state.monsterStates.every(monster => monster.respawnRemaining > 0 && monster.poisonStacks.length === 0));
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    Math.random = priorRandom;
    const report = document.createElement('pre'); report.id = 'smoke-results';
    report.textContent = checks.join('\n'); document.body.append(report);
}());
