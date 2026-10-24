(function () {
    const checks = [];
    const editor = Boolean(document.querySelector('#graphStage'));
    const near = (a, b) => Math.abs(a - b) < 0.15;
    function check(label, condition) {
        checks.push((condition ? 'PASS ' : 'FAIL ') + label);
        if (!condition) throw new Error(label);
    }
    const selector = id => editor ? '.graph-node[data-node-id="' + id + '"]' : '[data-skill-node="' + id + '"]';
    function center(id) {
        const rect = document.querySelector(selector(id)).getBoundingClientRect();
        return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
    }
    function verifyLines() {
        const lines = document.querySelectorAll(editor ? '.graph-edge' : '.skill-tree-link');
        return [...lines].every(line => {
            const source = center(editor ? line.dataset.sourceId : line.dataset.skillNodeSource);
            const target = center(editor ? line.dataset.targetId : line.dataset.skillNodeLink);
            const matrix = line.getScreenCTM();
            const start = new DOMPoint(+line.getAttribute('x1'), +line.getAttribute('y1')).matrixTransform(matrix);
            const end = new DOMPoint(+line.getAttribute('x2'), +line.getAttribute('y2')).matrixTransform(matrix);
            const dx = target.x - source.x, dy = target.y - source.y;
            const length = Math.hypot(dx, dy);
            if (!length) return true;
            const onAxis = point => Math.abs(dx * (point.y - source.y) - dy * (point.x - source.x)) / length < 0.15;
            return onAxis(start) && onAxis(end) &&
                (!near(source.x, target.x) || near(start.x, end.x)) &&
                (!near(source.y, target.y) || near(start.y, end.y));
        });
    }
    function input(id, value) {
        const field = document.getElementById(id); field.value = value;
        field.dispatchEvent(new Event('input', {bubbles: true}));
        field.dispatchEvent(new Event('change', {bubbles: true}));
    }
    try {
        if (!editor) { state.currentView = 'upgrades'; render(); }
        for (const mode of editor ? ['player', 'detailed'] : ['game']) {
            if (editor) document.querySelector('[data-view-mode="' + mode + '"]').click();
            for (const id of ['origin', 'poisonDMG_2', 'poisonDMG_3']) {
                if (editor) document.querySelector('#nodeList [data-node-id="' + id + '"]').click();
                const before = center(id);
                for (const size of [1, 1.25, 1.5]) {
                    if (editor) input('nodeSize', String(size));
                    else { skillNodeById[id].size = size; renderUpgrades(); }
                    const after = center(id);
                    check(mode + ' ' + id + ' size ' + size + ' keeps its grid center', near(before.x, after.x) && near(before.y, after.y));
                    check(mode + ' ' + id + ' size ' + size + ' keeps all lines aligned', verifyLines());
                }
            }
            if (editor) {
                const card = document.querySelector(selector('poisonDMG_3'));
                const before = center('poisonDMG_3');
                const column = Number(document.getElementById('nodeColumn').value);
                const row = Number(document.getElementById('nodeRow').value);
                const scale = card.getBoundingClientRect().width / card.offsetWidth;
                card.setPointerCapture = () => {};
                const pointer = (type, x, y) => card.dispatchEvent(new PointerEvent(type,
                    {bubbles: true, button: 0, pointerId: 1, clientX: x, clientY: y}));
                pointer('pointerdown', before.x, before.y);
                pointer('pointermove', before.x + 190 * scale, before.y + 160 * scale);
                pointer('pointerup', before.x + 190 * scale, before.y + 160 * scale);
                check(mode + ' enlarged node drags exactly one grid cell',
                    Number(document.getElementById('nodeColumn').value) === column + 1 &&
                    Number(document.getElementById('nodeRow').value) === row + 1);
                check(mode + ' lines stay centered after dragging', verifyLines());
            } else {
                for (const zoom of [0.5, 1.7]) {
                    skillTreeZoom = zoom; renderUpgrades();
                    check('game lines stay centered at zoom ' + zoom, verifyLines());
                }
            }
        }
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre'); report.id = 'smoke-results';
    report.textContent = checks.join('\n'); document.body.append(report);
}());
