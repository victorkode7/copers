(function () {
    const checks = [];
    function check(label, condition) {
        checks.push((condition ? 'PASS ' : 'FAIL ') + label);
        if (!condition) throw new Error(label);
    }
    const allocated = ranks => id => Boolean(skillNodeById[id]?.start || ranks[id] > 0);
    function pathTo(target, blocked = new Set()) {
        const queue = skillNodes.filter(node => node.start).map(node => [node.id]);
        const seen = new Set(queue.flat());
        for (let index = 0; index < queue.length; index++) {
            const path = queue[index], last = path[path.length - 1];
            if (last === target) return path;
            skillNodeConnections[last].forEach(id => {
                if (seen.has(id) || blocked.has(id)) return;
                seen.add(id); queue.push([...path, id]);
            });
        }
        throw new Error('No path to ' + target);
    }
    const clickNode = id => document.querySelector('[data-skill-node="' + id + '"]').click();
    try {
        const reverseTarget=skillNodeById.poisonDMG_2?'poisonDMG_2':'poisonDMG_3';
        const blocked=new Set([reverseTarget,...[...skillNodeConnections[reverseTarget]].filter(id=>id!=='basicallySnake')]);
        const path = pathTo('basicallySnake', blocked);
        const ranks = Object.fromEntries(path.filter(id => !skillNodeById[id].start).map(id => [id, 1]));
        state.skillRanks = ranks; pendingSkillRanks = {};
        state.skillPoints = 5; state.level = Object.keys(ranks).length + 5;
        state.currentView = 'upgrades'; render();
        check('Poison Damage unlocks backwards from Basically a Snake',
            skillNodeIsAvailable(skillNodeById[reverseTarget]));
        clickNode(reverseTarget);
        check('clicking the reverse connection queues a point', pendingSkillRanks[reverseTarget] === 1);
        document.querySelector('#confirmSkillSelection').click();
        check('confirming purchases Poison Damage', state.skillRanks[reverseTarget] === 1 && state.skillPoints === 4);
        saveGame();
        check('reverse-path purchases survive save and load', loadGame() && state.skillRanks[reverseTarget] === 1);
        check('refunding the only bridge to Poison Damage 2 is blocked', !canRefundSkillRank('basicallySnake'));
        check('refunding a leaf is allowed', canRefundSkillRank(reverseTarget));
        state.skillRanks = {}; pendingSkillRanks = {...ranks, [reverseTarget]: 1};
        check('deselecting a pending bridge is blocked', !canDeselectPendingSkillNode('basicallySnake'));
        check('deselecting a pending leaf is allowed', canDeselectPendingSkillNode(reverseTarget));
        const isolated = {[reverseTarget]:1,basicallySnake:1};
        check('a disconnected group cannot unlock or support its own nodes',
            !skillNodeRequirementsMet(skillNodeById[reverseTarget], allocated(isolated)) &&
            !skillNodeRequirementsMet(skillNodeById.basicallySnake, allocated(isolated)));
        check('a node touching the center needs no purchased prerequisites',
            [...skillNodeConnections.origin].every(id => skillNodeRequirementsMet(skillNodeById[id], allocated({}))));
        const allRanks = Object.fromEntries(skillNodes.filter(node => !node.start).map(node => [node.id, 1]));
        state.skillRanks = allRanks; pendingSkillRanks = {};
        check('an alternate purchased route allows refunding Basically a Snake', canRefundSkillRank('basicallySnake'));
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre');
    report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
