(function () {
    const checks = [], check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const node = (id, requires = [], column = 0) => ({id, requires, column, row:0, stats:{damage:1}});
    try {
        const draft = {nodes:[{...node('parent'), name:'My edits', stats:{damage:99}}], removedNodes:[{id:'deleted'}], nodeIdAliases:{renamed:'parent'}};
        const incoming = {nodes:[node('child',['newParent']),node('parent'),node('newParent',['parent']),node('deleted'),node('renamed'),node('orphan',['deleted'])]};
        const result = SkillTreeSync.merge(draft, incoming, ['parent']);
        check('new branches merge in dependency order', result.added.join(',') === 'newParent,child');
        check('existing stats and names stay untouched', draft.nodes[0].name === 'My edits' && draft.nodes[0].stats.damage === 99);
        check('new nodes avoid occupied cells without moving existing nodes', draft.nodes.map(entry => entry.column).join(',') === '0,1,2');
        check('deleted nodes, renamed IDs and broken branches stay absent', !draft.nodes.some(entry => ['deleted','renamed','orphan'].includes(entry.id)));
        check('source updates are idempotent', SkillTreeSync.merge(draft, incoming, result.knownIds).added.length === 0);
        const old = {nodes:[node('parent')]};
        check('legacy drafts receive missing project nodes', SkillTreeSync.merge(old,{nodes:[node('parent'),node('newNode',['parent'])]}).added[0] === 'newNode');
        const omitted = {nodes:[node('parent')]};
        check('previously seen missing nodes are not resurrected', SkillTreeSync.merge(omitted,{nodes:[node('parent'),node('knownMissing',['parent'])]},['parent','knownMissing']).added.length === 0);
        check('project source parses as JSON without executing JavaScript', SkillTreeSync.parse('window.adventureSkillTree = ' + JSON.stringify(incoming) + ';\n').nodes.length === incoming.nodes.length);
        let invalid = false; try { SkillTreeSync.parse('window.adventureSkillTree = {}; alert(1);'); } catch { invalid = true; }
        check('invalid project source is rejected', invalid);
        check('empty new test files have no updates', SkillTreeSync.parse('') === null);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
