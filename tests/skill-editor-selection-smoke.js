(async function () {
    const resumed = location.hash ? JSON.parse(decodeURIComponent(location.hash.slice(1))) : null;
    const checks = resumed?.checks || [];
    const $ = id => document.getElementById(id);
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const settle = () => new Promise(resolve => setTimeout(resolve, 0));
    const draft = () => JSON.parse(localStorage.getItem('idleAdventureSkillEditorDraft'));
    const nodes = () => draft().tree.nodes;
    const card = id => $('graphNodes').querySelector('[data-node-id="' + id + '"]');
    const selection = () => [...$('graphNodes').querySelectorAll('[aria-pressed=true]')].map(node => node.dataset.nodeId).sort();
    const selected = ids => JSON.stringify(selection()) === JSON.stringify([...ids].sort());
    const near = (a, b) => Math.abs(a - b) < .15;
    const center = id => { const rect = card(id).getBoundingClientRect(); return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2}; };
    function choose(id, modifiers = {}) {
        const node = card(id), point = center(id);
        node.setPointerCapture = () => {};
        for (const type of ['pointerdown', 'pointerup']) node.dispatchEvent(new PointerEvent(type,
            {bubbles: true, cancelable: true, button: 0, pointerId: 1, clientX: point.x, clientY: point.y, ...modifiers}));
    }
    function linesAligned() {
        return [...$('graphEdges').querySelectorAll('.graph-edge')].every(line => {
            const from = center(line.dataset.sourceId), to = center(line.dataset.targetId);
            const matrix = line.getScreenCTM();
            const start = new DOMPoint(+line.getAttribute('x1'), +line.getAttribute('y1')).matrixTransform(matrix);
            const end = new DOMPoint(+line.getAttribute('x2'), +line.getAttribute('y2')).matrixTransform(matrix);
            const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy);
            return !length || [start, end].every(point => Math.abs(dx * (point.y - from.y) - dy * (point.x - from.x)) / length < .15);
        });
    }
    function beginMove(id, columns, rows) {
        const node = card(id), from = center(id), scale = node.getBoundingClientRect().width / node.offsetWidth;
        node.setPointerCapture = () => {};
        const pointer = type => node.dispatchEvent(new PointerEvent(type, {bubbles: true, cancelable: true,
            button: 0, pointerId: 2, clientX: from.x + (type === 'pointerdown' ? 0 : columns * 190 * scale),
            clientY: from.y + (type === 'pointerdown' ? 0 : rows * 160 * scale)}));
        pointer('pointerdown'); pointer('pointermove');
        return pointer;
    }
    function clipboard(type, transfer) {
        const event = new ClipboardEvent(type, {bubbles: true, cancelable: true, clipboardData: transfer});
        (document.activeElement || document.body).dispatchEvent(event);
        return event;
    }
    try {
        if (resumed) {
            check('group selection and its primary node resume after reloading', selected(resumed.ids) && $('nodeId').value === resumed.primary);
            check('Shift-click resumes the saved selection anchor', draft().selectionAnchorId === resumed.anchor);
            check('edited group data survives reloading', JSON.stringify(nodes()) === resumed.tree);
        } else {
            const fixture = {statSchemaVersion: 2, experienceBase: 50, experiencePerLevel: 10, nodes: [
                {id:'origin', column:0, row:0, start:true, requires:[], stats:{}, size:1},
                {id:'a', column:2, row:2, requires:['origin'], stats:{damage:2}, size:1},
                {id:'b', column:3, row:2, requires:['a'], stats:{health:7}, size:1.5},
                {id:'c', column:2, row:3, requires:['a'], stats:{poisonChance:.123456}, size:1.25},
                {id:'d', column:3, row:3, requires:['b','c'], stats:{accuracy:3}, size:1},
                {id:'outside', column:6, row:2, requires:['d'], stats:{evasion:4}, size:1},
                {id:'diagonal', column:1, row:1, requires:['origin'], stats:{damage:1}, size:1}
            ].map(node => ({name:node.id.toUpperCase(), effect:'Selection fixture', icon:'*', sprite:'', maxRank:node.start ? 0 : 1, requiresMode:'all', ...node}))};
            const imported = new DataTransfer();
            imported.items.add(new File([JSON.stringify(fixture)], 'selection.json', {type:'application/json'}));
            $('importFile').files = imported.files; $('importFile').dispatchEvent(new Event('change'));
            for (let attempt = 0; !card('a') && attempt < 100; attempt++) await settle();
            check('controlled tree imports successfully', Boolean(card('a')));
            choose('a'); choose('d', {shiftKey:true});
            check('Shift-click selects every node inside the two grid corners', selected(['a','b','c','d']));
            check('sidebar and group controls reflect all selected nodes', $('nodeList').querySelectorAll('[aria-selected=true]').length === 4 && $('selectionSummary').textContent === '4 selected' && !$('groupSelectionNote').hidden);
            choose('b', {shiftKey:true});
            check('extending a range retains its original anchor', selected(['a','b']));
            choose('d'); choose('a', {shiftKey:true});
            check('rectangle selection works in the reverse direction', selected(['a','b','c','d']));
            choose('outside', {ctrlKey:true});
            check('Ctrl-click adds an individual node', selected(['a','b','c','d','outside']));
            choose('outside', {ctrlKey:true});
            check('Ctrl-click removes an individual node', selected(['a','b','c','d']));

            for (const [mode, zoom] of [['detailed',50], ['player',125]]) {
                document.querySelector('[data-view-mode="'+mode+'"]').click();
                $('zoomRange').value=zoom; $('zoomRange').dispatchEvent(new Event('input'));
                choose('a'); choose('d', {shiftKey:true});
                const before = nodes(), original = new Map(before.map(node=>[node.id,node]));
                const move = beginMove('b', 2, -1);
                check(mode+': connection lines remain aligned during a group drag', linesAligned());
                move('pointerup'); await settle();
                check(mode+': every selected node moves by the same snapped grid offset', nodes().every(node=>
                    node.column===original.get(node.id).column+(['a','b','c','d'].includes(node.id)?2:0) &&
                    node.row===original.get(node.id).row+(['a','b','c','d'].includes(node.id)?-1:0)) && selected(['a','b','c','d']));
                check(mode+': lines remain aligned after dropping mixed-size nodes', linesAligned());
                $('undoEdit').click(); await settle();
                check(mode+': one undo restores the whole group move', JSON.stringify(nodes())===JSON.stringify(before));
            }
            const originalTree = JSON.stringify(nodes()), originBefore=center('origin');
            let move = beginMove('b', -6, -5);
            check('lines remain aligned while moving past negative grid coordinates', linesAligned());
            move('pointerup'); await settle();
            const originAfter=center('origin');
            check('crossing the grid origin keeps unselected nodes in place on screen', near(originBefore.x,originAfter.x) && near(originBefore.y,originAfter.y));
            $('undoEdit').click(); await settle();
            check('undoing a move across the origin keeps the view stable', near(originBefore.x,center('origin').x) && near(originBefore.y,center('origin').y));
            move=beginMove('b',1,1); move('pointercancel'); await settle();
            check('cancelling a drag restores positions and connection lines', JSON.stringify(nodes())===originalTree && linesAligned());
            beginMove('b',1,1);
            document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})); await settle();
            check('Escape cancels a group drag without changing the tree', JSON.stringify(nodes())===originalTree);

            choose('a'); choose('d',{shiftKey:true});
            const transfer=new DataTransfer();
            const copy=clipboard('copy',transfer), data=JSON.parse(transfer.getData('text/plain'));
            check('native copy captures the selected group and its node properties', copy.defaultPrevented && data.nodes.length===4 && data.nodes.find(node=>node.id==='b').size===1.5 && data.nodes.find(node=>node.id==='c').stats.poisonChance===.123456);
            $('nodeName').focus();
            check('copying text in inspector fields keeps normal browser behavior', !clipboard('copy',new DataTransfer()).defaultPrevented);
            check('pasting inside text fields does not paste nodes', !clipboard('paste',transfer).defaultPrevented && nodes().length===7);
            $('graphViewport').focus();
            $('connectToggle').click();
            check('native paste accepts copied nodes outside text fields', clipboard('paste',transfer).defaultPrevented); await settle();
            check('pasting exits connection mode so the new group is ready to drag', $('connectToggle').getAttribute('aria-pressed')==='false' && getComputedStyle($('connectHint')).display==='none');
            let copies=nodes().filter(node=>selection().includes(node.id));
            const ids=new Set(copies.map(node=>node.id));
            check('pasted groups have unique IDs and preserve internal connections', copies.length===4 && ids.size===4 && copies.every(node=>node.requires.every(id=>ids.has(id))) && copies.find(node=>node.id==='d_copy').requires.length===2);
            check('pasted groups preserve relative positions, sizes, and stats', copies.every(node=>{
                const source=data.nodes.find(entry=>node.id===entry.id+'_copy');
                return source && node.column-source.column===copies[0].column-data.nodes[0].column && node.row-source.row===copies[0].row-data.nodes[0].row && node.size===source.size && JSON.stringify(node.stats)===JSON.stringify(source.stats);
            }));
            check('paste leaves the original group unchanged and avoids occupied grid cells', JSON.stringify(nodes().slice(0,7))===originalTree && copies.every(node=>!nodes().slice(0,7).some(other=>node.column===other.column && node.row===other.row)));
            const pastedTree=JSON.stringify(nodes());
            clipboard('paste',transfer); await settle();
            check('repeated paste creates another selected group with unique IDs', nodes().length===15 && new Set(nodes().map(node=>node.id)).size===15 && selection().length===4);
            $('undoEdit').click(); await settle();
            check('one undo removes an entire pasted group', JSON.stringify(nodes())===pastedTree);
            choose('a'); choose('d',{shiftKey:true});
            const originalCopyCommand=document.execCommand;
            const buttonClipboard=new DataTransfer();
            document.execCommand=command => command==='copy' && clipboard('copy',buttonClipboard).defaultPrevented;
            $('copyNodes').click();
            check('the Copy button uses the native clipboard path for Ctrl+V compatibility', JSON.parse(buttonClipboard.getData('text/plain')).nodes.length===4);
            $('pasteNodes').click(); await settle();
            check('Copy and Paste buttons support the same group operation', nodes().length===15 && selection().length===4);
            $('undoEdit').click(); await settle();
            choose('origin'); choose('d',{shiftKey:true});
            $('copyNodes').click(); $('pasteNodes').click(); await settle();
            check('copying the center never creates a second starting node', nodes().filter(node=>node.start).length===1 && nodes().filter(node=>selection().includes(node.id)).every(node=>node.maxRank===1));
            document.execCommand=originalCopyCommand;
            $('undoEdit').click(); await settle();

            choose('a'); choose('d',{shiftKey:true});
            const beforeDelete=JSON.stringify(nodes());
            document.dispatchEvent(new KeyboardEvent('keydown',{key:'Delete',bubbles:true,cancelable:true})); await settle();
            check('Delete removes the selected group and cleans up external connections', nodes().length===7 && nodes().find(node=>node.id==='outside').requires.length===0);
            $('undoEdit').click(); await settle();
            check('one undo restores a deleted group and all of its connections', JSON.stringify(nodes())===beforeDelete);
            choose('a'); choose('d',{shiftKey:true});
            $('nodeId').value='renamedD'; $('nodeId').dispatchEvent(new Event('input',{bubbles:true})); await settle();
            check('renaming the primary node retains the rest of the group selection', selected(['a','b','c','renamedD']) && nodes().find(node=>node.id==='outside').requires.includes('renamedD'));
            const saved=draft();
            location.hash=encodeURIComponent(JSON.stringify({checks,ids:selection(),primary:saved.selectedId,anchor:saved.selectionAnchorId,tree:JSON.stringify(nodes())}));
            location.reload(); return;
        }
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch(error) { checks.push('ERROR '+error.stack); }
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
