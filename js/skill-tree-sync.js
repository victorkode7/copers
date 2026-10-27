(function () {
    'use strict';
    const clone = value => JSON.parse(JSON.stringify(value));
    function parse(source) {
        if (!source.trim()) return null;
        const match = source.match(/^\s*window\.adventureSkillTree\s*=\s*([\s\S]*?);?\s*$/);
        if (!match) throw new Error('The project file is not a skill tree.');
        const tree = JSON.parse(match[1]);
        if (!Array.isArray(tree.nodes) || !tree.nodes.every(node => node && typeof node.id === 'string' &&
            Array.isArray(node.requires) && node.stats && typeof node.stats === 'object')) {
            throw new Error('The project skill tree has invalid nodes.');
        }
        return tree;
    }
    function merge(tree, source, knownIds = []) {
        const known = new Set(knownIds);
        const present = new Set(tree.nodes.map(node => node.id));
        const excluded = new Set([...(tree.removedNodes || []).map(node => node.id), ...Object.keys(tree.nodeIdAliases || {})]);
        const pending = source.nodes.filter(node => !known.has(node.id) && !present.has(node.id) && !excluded.has(node.id));
        const added = [];
        // Process parents before children, even when the file lists them backwards.
        let progress = true;
        while (progress) {
            progress = false;
            for (let index = 0; index < pending.length;) {
                const node = pending[index];
                if (!node.requires.every(id => present.has(id))) { index++; continue; }
                const next = clone(node);
                // Keep every existing position; put an incoming node in a free cell.
                while (tree.nodes.some(other => other.column === next.column && other.row === next.row)) {
                    next.column = (Number(next.column) || 0) + 1;
                }
                tree.nodes.push(next); present.add(next.id); added.push(next.id);
                pending.splice(index, 1); progress = true;
            }
        }
        return {added, knownIds: [...new Set([...known, ...source.nodes.map(node => node.id)])]};
    }
    window.SkillTreeSync = {parse, merge};
}());
