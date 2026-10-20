(function() {
    'use strict';

    const statNames = [
        'damage',
        'evasion',
        'goldBonus', 'goldBonusMultiplier', 'attackSpeedMultiplier', 'attackSpeedRateMultiplier', 'attackSpeedBonus', 'attackSpeedPerLevel', 'health', 'healthMultiplier', 'accuracy', 'accuracyMultiplier', 'damageMultiplier', 'evasionMultiplier', 'multiHit', 'multiHitMultiplier',
        'poisonChance', 'poisonChanceMultiplier', 'poisonDamage', 'poisonDamageMultiplier',
        'poisonTickRate', 'poisonTickRateMultiplier'
    ];
    const baseNodeTemplates = {
        health: {
            id: 'healthNode',
            name: 'Health',
            icon: '♥',
            effect: '+10 maximum health',
            type: 'health',
            stats: { health: 10 }
        },
        attackSpeed: {
            id: 'attackSpeedNode',
            name: 'Attack Speed',
            icon: '⚡',
            effect: 'Attack 1% faster',
            type: 'attackSpeed',
            stats: { attackSpeedMultiplier: 0.99 }
        },
        accuracy: {
            id: 'accuracyNode',
            name: 'Accuracy',
            icon: '◎',
            effect: '+5 accuracy',
            type: 'accuracy',
            stats: { accuracy: 5 }
        },
        damage: {
            id: 'damageNode',
            name: 'Damage',
            icon: '⚔',
            effect: '+1 damage',
            type: 'damage',
            stats: { damage: 1 }
        }
    };
    const nodeTypes = ['health', 'attackSpeed', 'accuracy', 'damage'];
    const bonusStats = [
        { id: 'damage', label: 'Damage', additive: 'damage', multiplier: 'damageMultiplier' },
        { id: 'health', label: 'Maximum health', additive: 'health', multiplier: 'healthMultiplier' },
        { id: 'accuracy', label: 'Accuracy', additive: 'accuracy', multiplier: 'accuracyMultiplier' },
        { id: 'evasion', label: 'Evasion', additive: 'evasion', multiplier: 'evasionMultiplier' },
        { id: 'multiHit', label: 'Multi-hit', additive: 'multiHit', multiplier: 'multiHitMultiplier' },
        { id: 'poisonChance', label: 'Poison chance', additive: 'poisonChance', multiplier: 'poisonChanceMultiplier' },
        { id: 'poisonDamage', label: 'Poison damage', additive: 'poisonDamage', multiplier: 'poisonDamageMultiplier' },
        { id: 'poisonTickRate', label: 'Poison tick rate', additive: 'poisonTickRate', multiplier: 'poisonTickRateMultiplier' },
        { id: 'goldBonus', label: 'Gold from battles', additive: 'goldBonus', multiplier: 'goldBonusMultiplier' },
        { id: 'attackSpeed', label: 'Attack speed', additive: 'attackSpeedBonus', multiplier: 'attackSpeedRateMultiplier' }
    ];
    const structuredStatKeys = new Set(bonusStats.flatMap(stat => [stat.additive, stat.multiplier]));
    structuredStatKeys.add('attackSpeedMultiplier');
    const nodeSizes = [1, 1.25, 1.5];
    const originalTree = JSON.parse(JSON.stringify(window.gameThreeSkillTree));
    let tree = JSON.parse(JSON.stringify(originalTree));
    let selectedId = tree.nodes[0] ? tree.nodes[0].id : null;
    let zoom = 0.85;
    let graphViewMode = 'detailed';
    let toastTimer = 0;
    let undoHistory = [];
    let historySnapshot = JSON.stringify(tree);
    let connectMode = false;
    let connectSourceId = null;
    let selectedConnection = null;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;

    const elements = {
        nodeCount: document.querySelector('#nodeCount'),
        nodeList: document.querySelector('#nodeList'),
        nodeSearch: document.querySelector('#nodeSearch'),
        graphViewport: document.querySelector('#graphViewport'),
        graphStage: document.querySelector('#graphStage'),
        graphEdges: document.querySelector('#graphEdges'),
        graphNodes: document.querySelector('#graphNodes'),
        graphViewToggle: document.querySelector('#graphViewToggle'),
        graphHint: document.querySelector('#graphHint'),
        zoomRange: document.querySelector('#zoomRange'),
        zoomValue: document.querySelector('#zoomValue'),
        validationCount: document.querySelector('#validationCount'),
        validationStatus: document.querySelector('#validationStatus'),
        validationList: document.querySelector('#validationList'),
        emptyInspector: document.querySelector('#emptyInspector'),
        nodeForm: document.querySelector('#nodeForm'),
        nodeId: document.querySelector('#nodeId'),
        nodeName: document.querySelector('#nodeName'),
        nodeIcon: document.querySelector('#nodeIcon'),
        nodeEffect: document.querySelector('#nodeEffect'),
        nodeSize: document.querySelector('#nodeSize'),
        nodeType: document.querySelector('#nodeType'),
        nodeMaxRank: document.querySelector('#nodeMaxRank'),
        nodeColumn: document.querySelector('#nodeColumn'),
        nodeRow: document.querySelector('#nodeRow'),
        nodeStart: document.querySelector('#nodeStart'),
        nodeRequires: document.querySelector('#nodeRequires'),
        nodeRequiresMode: document.querySelector('#nodeRequiresMode'),
        nodeStats: document.querySelector('#nodeStats'),
        statBonusRows: document.querySelector('#statBonusRows'),
        addStatBonus: document.querySelector('#addStatBonus'),
        statsError: document.querySelector('#statsError'),
        nodeDepth: document.querySelector('#nodeDepth'),
        deleteNode: document.querySelector('#deleteNode'),
        experienceBase: document.querySelector('#experienceBase'),
        experiencePerLevel: document.querySelector('#experiencePerLevel'),
        skillPointBudget: document.querySelector('#skillPointBudget'),
        toast: document.querySelector('#toast'),
        saveStatus: document.querySelector('#saveStatus'),
        undoButton: document.querySelector('#undoEdit'),
        connectToggle: document.querySelector('#connectToggle'),
        connectHint: document.querySelector('#connectHint'),
        insertBetween: document.querySelector('#insertBetween'),
        insertNodeDialog: document.querySelector('#insertNodeDialog'),
        insertNodeForm: document.querySelector('#insertNodeForm'),
        insertNodeChoice: document.querySelector('#insertNodeChoice'),
        insertNodePath: document.querySelector('#insertNodePath'),
        cancelInsert: document.querySelector('#cancelInsert')
    };

    function selectedNode() {
        return tree.nodes.find(node => node.id === selectedId) || null;
    }

    function nodeSize(node) {
        return nodeSizes.includes(Number(node.size)) ? Number(node.size) : 1;
    }

    function uniqueId(base) {
        const normalized = String(base || 'newNode')
            .replace(/[^A-Za-z0-9_]/g, '')
            .replace(/^[^A-Za-z_]+/, '') || 'newNode';
        let id = normalized;
        let suffix = 2;
        while (tree.nodes.some(node => node.id === id)) {
            id = normalized + suffix++;
        }
        return id;
    }

    function showToast(message) {
        elements.toast.textContent = message;
        elements.toast.hidden = false;
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function() {
            elements.toast.hidden = true;
        }, 3000);
    }

    function updateUndoButton() {
        elements.undoButton.disabled = undoHistory.length === 0;
    }

    function markChanged() {
        const snapshot = JSON.stringify(tree);
        if (snapshot !== historySnapshot) {
            undoHistory.push(historySnapshot);
            if (undoHistory.length > 100) undoHistory.shift();
            historySnapshot = snapshot;
        }
        updateUndoButton();
        elements.saveStatus.textContent = 'Unsaved editor changes - export to update the game';
        elements.saveStatus.previousElementSibling.style.background = '#f2c77b';
    }

    function undoTreeEdit() {
        if (!undoHistory.length) return;
        tree = JSON.parse(undoHistory.pop());
        historySnapshot = JSON.stringify(tree);
        if (!tree.nodes.some(node => node.id === selectedId)) selectedId = tree.nodes[0] ? tree.nodes[0].id : null;
        selectedConnection = null;
        connectSourceId = null;
        updateUndoButton();
        render();
    }
    function setZoom(value, anchorX, anchorY) {
        const nextZoom = Math.max(0.1, Math.min(2, value));
        if (nextZoom !== zoom && anchorX !== undefined) {
            const rect = elements.graphViewport.getBoundingClientRect();
            const cursorX = anchorX - rect.left;
            const cursorY = anchorY - rect.top;
            const boardX = (cursorX - panX) / zoom;
            const boardY = (cursorY - panY) / zoom;
            panX = cursorX - boardX * nextZoom;
            panY = cursorY - boardY * nextZoom;
        }
        zoom = nextZoom;
        elements.zoomRange.value = String(Math.round(zoom * 100));
        elements.zoomValue.value = Math.round(zoom * 100) + '%';
        elements.graphStage.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoom + ')';
        elements.graphStage.style.width = graphSize().width + 'px';
        elements.graphStage.style.height = graphSize().height + 'px';
        elements.insertBetween.disabled = !selectedConnection;
        elements.graphViewport.style.backgroundSize = (190 * zoom) + 'px ' + (160 * zoom) + 'px';
        const dotOffset = graphViewMode === 'player' ? 36 * zoom : 0;
        elements.graphViewport.style.backgroundPosition = (panX + dotOffset) + 'px ' + (panY + dotOffset) + 'px';
    }
    function graphSize() {
        const columns = tree.nodes.map(node => Number(node.column) || 0);
        const rows = tree.nodes.map(node => Number(node.row) || 0);
        const minColumn = Math.min(1, ...columns);
        const maxColumn = Math.max(5, ...columns);
        const minRow = Math.min(1, ...rows);
        const maxRow = Math.max(5, ...rows);
        return {
            width: (maxColumn - minColumn + 3) * 190,
            height: (maxRow - minRow + 3) * 160
        };
    }

    function graphNodeDimensions(node) {
        const scale = nodeSize(node);
        return graphViewMode === 'player'
            ? { width: 72 * scale, height: 72 * scale }
            : { width: 166 + (scale - 1) * 20, height: 88 + (scale - 1) * 16 };
    }

    function renderGraph() {
        const size = graphSize();
        const unscaledWidth = size.width;
        const unscaledHeight = size.height;
        const minColumn = Math.min(1, ...tree.nodes.map(node => Number(node.column) || 0));
        const minRow = Math.min(1, ...tree.nodes.map(node => Number(node.row) || 0));
        elements.graphStage.style.width = unscaledWidth + 'px';
        elements.graphStage.style.height = unscaledHeight + 'px';
        elements.graphStage.style.transform = 'translate(' + panX + 'px, ' + panY + 'px) scale(' + zoom + ')';
        elements.graphEdges.setAttribute('width', String(unscaledWidth));
        elements.graphEdges.setAttribute('height', String(unscaledHeight));
        elements.graphEdges.setAttribute('viewBox', '0 0 ' + unscaledWidth + ' ' + unscaledHeight);
        elements.graphNodes.style.width = unscaledWidth + 'px';
        elements.graphNodes.style.height = unscaledHeight + 'px';
        elements.graphEdges.innerHTML = '';
        elements.graphNodes.innerHTML = '';
        elements.graphNodes.classList.toggle('player-preview', graphViewMode === 'player');
        elements.graphViewToggle.querySelectorAll('[data-view-mode]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.viewMode === graphViewMode));
        });

        const nodeElements = new Map();
        tree.nodes.forEach(node => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'graph-node' + (node.start ? ' is-start' : '') + (node.id === connectSourceId ? ' is-connect-source' : '');
            if (nodeTypes.includes(node.type)) card.classList.add('type-' + node.type);
            card.dataset.nodeId = node.id;
            card.setAttribute('aria-pressed', String(node.id === selectedId && !selectedConnection));
            card.setAttribute('aria-label',
                (node.name || node.id || '(unnamed)') + '. ' + (node.effect || ''));
            card.style.left = ((Number(node.column) - minColumn + 1) * 190) + 'px';
            card.style.top = ((Number(node.row) - minRow + 1) * 160) + 'px';
            const dimensions = graphNodeDimensions(node);
            card.style.width = dimensions.width + 'px';
            card.style.height = dimensions.height + 'px';
            card.style.minHeight = dimensions.height + 'px';

            const icon = document.createElement('span');
            icon.className = 'graph-node-icon';
            icon.textContent = node.icon || '✦';
            const name = document.createElement('strong');
            name.textContent = node.name || node.id || '(unnamed)';
            const effect = document.createElement('span');
            effect.className = 'graph-node-effect';
            effect.textContent = node.effect || '';
            const rank = document.createElement('span');
            rank.className = 'graph-node-rank';
            rank.textContent = node.start ? 'START' : 'ONE-TIME';
            card.append(icon, name, effect, rank);
            if (graphViewMode === 'player') {
                card.title = (node.name || node.id || '(unnamed)') + ' — ' + (node.effect || '');
            }
            elements.graphNodes.appendChild(card);
            nodeElements.set(node.id, card);
        });

        tree.nodes.forEach(node => {
            const target = nodeElements.get(node.id);
            if (!target) return;
            (Array.isArray(node.requires) ? node.requires : []).forEach(requiredId => {
                const sourceNode = tree.nodes.find(entry => entry.id === requiredId);
                if (!sourceNode) return;
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.classList.add('graph-edge');
                if (node.requiresMode === 'any') line.classList.add('edge-any');
                if (node.id === selectedId || requiredId === selectedId) line.classList.add('edge-active');
                if (selectedConnection && selectedConnection.from === requiredId && selectedConnection.to === node.id) line.classList.add('edge-selected');
                line.dataset.sourceId = requiredId;
                line.dataset.targetId = node.id;
                const sourceSize = nodeSize(sourceNode);
                const targetSize = nodeSize(node);
                const sourceDimensions = graphNodeDimensions(sourceNode);
                const targetDimensions = graphNodeDimensions(node);
                const sourceWidth = sourceDimensions.width;
                const sourceHeight = sourceDimensions.height;
                const targetWidth = targetDimensions.width;
                const targetHeight = targetDimensions.height;
                const sourceX = (Number(sourceNode.column) - minColumn + 1) * 190 + sourceWidth / 2;
                const sourceY = (Number(sourceNode.row) - minRow + 1) * 160 + sourceHeight / 2;
                const targetX = (Number(node.column) - minColumn + 1) * 190 + targetWidth / 2;
                const targetY = (Number(node.row) - minRow + 1) * 160 + targetHeight / 2;
                const deltaX = targetX - sourceX;
                const deltaY = targetY - sourceY;
                const distance = Math.hypot(deltaX, deltaY);
                const edgeScale = (width, height, size) => {
                    if (distance === 0) return 0;
                    if (graphViewMode === 'player') return (36 * size) / distance;
                    return Math.min(
                        deltaX === 0 ? Infinity : width / 2 / Math.abs(deltaX),
                        deltaY === 0 ? Infinity : height / 2 / Math.abs(deltaY)
                    );
                };
                line.setAttribute('x1', String(sourceX + deltaX * edgeScale(sourceWidth, sourceHeight, sourceSize)));
                line.setAttribute('y1', String(sourceY + deltaY * edgeScale(sourceWidth, sourceHeight, sourceSize)));
                line.setAttribute('x2', String(targetX - deltaX * edgeScale(targetWidth, targetHeight, targetSize)));
                line.setAttribute('y2', String(targetY - deltaY * edgeScale(targetWidth, targetHeight, targetSize)));
                const hitLine = line.cloneNode(false);
                hitLine.classList.remove('graph-edge');
                hitLine.classList.add('graph-edge-hit');
                elements.graphEdges.appendChild(hitLine);
                elements.graphEdges.appendChild(line);
            });
        });
        elements.insertBetween.disabled = !selectedConnection;
        elements.graphViewport.style.backgroundSize = (190 * zoom) + 'px ' + (160 * zoom) + 'px';
        const dotOffset = graphViewMode === 'player' ? 36 * zoom : 0;
        elements.graphViewport.style.backgroundPosition = (panX + dotOffset) + 'px ' + (panY + dotOffset) + 'px';
        setZoom(zoom);
    }

    function renderNodeList() {
        const query = elements.nodeSearch.value.trim().toLowerCase();
        elements.nodeList.innerHTML = '';
        const visibleNodes = tree.nodes.filter(node =>
            !query || [node.name, node.id, node.effect].some(value =>
                String(value || '').toLowerCase().includes(query)));
        visibleNodes.forEach(node => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'node-list-item';
            button.setAttribute('role', 'option');
            button.setAttribute('aria-selected', String(node.id === selectedId));
            button.dataset.nodeId = node.id;
            const icon = document.createElement('span');
            icon.className = 'list-icon';
            icon.textContent = node.icon || '✦';
            const copy = document.createElement('span');
            copy.className = 'node-list-copy';
            const name = document.createElement('span');
            name.className = 'node-list-name';
            name.textContent = node.name || node.id || '(unnamed)';
            const meta = document.createElement('span');
            meta.className = 'node-list-meta';
            meta.textContent = node.start ? 'Starting point' :
                (node.requires || []).length + ' prerequisite' + ((node.requires || []).length === 1 ? '' : 's');
            copy.append(name, meta);
            button.append(icon, copy);
            elements.nodeList.appendChild(button);
        });
        elements.nodeCount.textContent = String(tree.nodes.length);
    }

    function splitNodeStats(stats) {
        const source = stats && typeof stats === 'object' && !Array.isArray(stats) ? stats : {};
        const rows = [];
        bonusStats.forEach(stat => {
            const additiveValue = source[stat.additive];
            if (Number.isFinite(additiveValue)) rows.push({ stat: stat.id, mode: 'additive', value: additiveValue });
            let multiplierValue = stat.multiplier ? source[stat.multiplier] : undefined;
            if (stat.id === 'attackSpeed' && !Number.isFinite(multiplierValue) && Number.isFinite(source.attackSpeedMultiplier)) multiplierValue = 1 / source.attackSpeedMultiplier;
            if (stat.multiplier && Number.isFinite(multiplierValue) && multiplierValue !== 1) rows.push({ stat: stat.id, mode: 'multiplier', value: multiplierValue });
        });
        const advanced = Object.fromEntries(Object.entries(source).filter(([key]) => !structuredStatKeys.has(key)));
        return { rows, advanced };
    }

    function addStatBonusRow(bonus = { stat: 'damage', mode: 'additive', value: 1 }) {
        const row = document.createElement('div');
        row.className = 'stat-bonus-row';
        const statSelect = document.createElement('select');
        statSelect.setAttribute('aria-label', 'Bonus stat');
        bonusStats.forEach(stat => {
            const option = document.createElement('option');
            option.value = stat.id;
            option.textContent = stat.label;
            statSelect.appendChild(option);
        });
        statSelect.value = bonus.stat;
        const modeSelect = document.createElement('select');
        modeSelect.setAttribute('aria-label', 'Bonus type');
        [['additive', 'Additive'], ['multiplier', 'Multiplier']].forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            modeSelect.appendChild(option);
        });
        modeSelect.value = bonus.mode;
        const amount = document.createElement('input');
        amount.type = 'number';
        amount.step = 'any';
        amount.value = String(bonus.value);
        amount.setAttribute('aria-label', 'Bonus amount');
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'icon-button danger-button';
        remove.textContent = '×';
        remove.setAttribute('aria-label', 'Remove stat bonus');
        remove.addEventListener('click', () => row.remove());
        row.append(statSelect, modeSelect, amount, remove);
        elements.statBonusRows.appendChild(row);
    }

    function readNodeStats() {
        const stats = {};
        for (const row of elements.statBonusRows.querySelectorAll('.stat-bonus-row')) {
            const [statSelect, modeSelect, amountInput] = row.querySelectorAll('select, input');
            const stat = bonusStats.find(entry => entry.id === statSelect.value);
            const value = Number(amountInput.value);
            if (!stat || !Number.isFinite(value)) throw new Error('Each stat bonus needs a valid number.');
            const key = modeSelect.value === 'multiplier' ? stat.multiplier : stat.additive;
            if (modeSelect.value === 'multiplier' && value <= 0) throw new Error('Multipliers must be greater than zero.');
            if (key === 'attackSpeedBonus' && value <= -1) throw new Error('Additive attack speed must be greater than -1.');
            if (Object.prototype.hasOwnProperty.call(stats, key)) throw new Error('Remove duplicate bonuses for the same stat and type.');
            stats[key] = value;
        }
        let advanced;
        try { advanced = JSON.parse(elements.nodeStats.value || '{}'); }
        catch (error) { throw new Error('Advanced stats must be valid JSON: ' + error.message); }
        if (!advanced || typeof advanced !== 'object' || Array.isArray(advanced)) throw new Error('Advanced stats must be a JSON object.');
        Object.entries(advanced).forEach(([key, value]) => {
            if (structuredStatKeys.has(key)) throw new Error('Edit ' + key + ' in the Stat bonuses section above.');
            if (Object.prototype.hasOwnProperty.call(stats, key)) throw new Error('Duplicate stat "' + key + '".');
            stats[key] = value;
        });
        return stats;
    }
    function renderInspector() {
        const node = selectedNode();
        elements.emptyInspector.hidden = Boolean(node);
        elements.nodeForm.hidden = !node;
        elements.deleteNode.disabled = !node;
        if (!node) return;

        elements.nodeId.value = node.id || '';
        elements.nodeName.value = node.name || '';
        elements.nodeIcon.value = node.icon || '';
        elements.nodeEffect.value = node.effect || '';
        elements.nodeSize.value = String(nodeSize(node));
        elements.nodeType.value = nodeTypes.includes(node.type) ? node.type : '';
        elements.nodeMaxRank.value = node.start ? '0' : '1';
        elements.nodeMaxRank.disabled = true;
        elements.nodeColumn.value = String(node.column ?? 1);
        elements.nodeRow.value = String(node.row ?? 1);
        elements.nodeStart.checked = node.start === true;
        elements.nodeRequiresMode.value = node.requiresMode === 'any' ? 'any' : 'all';
        const splitStats = splitNodeStats(node.stats);
        elements.statBonusRows.innerHTML = '';
        splitStats.rows.forEach(addStatBonusRow);
        elements.nodeStats.value = JSON.stringify(splitStats.advanced, null, 2);
        elements.statsError.hidden = true;

        elements.nodeRequires.innerHTML = '';
        tree.nodes.filter(other => other.id !== node.id).forEach(other => {
            const option = document.createElement('option');
            option.value = other.id;
            option.textContent = (other.start ? '✦ ' : '') + (other.name || other.id);
            option.selected = Array.isArray(node.requires) && node.requires.includes(other.id);
            elements.nodeRequires.appendChild(option);
        });
        const depth = nodeDepth(node.id, new Map(), new Set());
        const budget = Math.max(0, Number(elements.skillPointBudget ? elements.skillPointBudget.value : 10) || 0);
        elements.nodeDepth.textContent = depth === Infinity
            ? 'Not reachable from the starting node. Add a valid prerequisite path.'
            : node.start
                ? 'Starting point · 0 prerequisite points.'
                : 'Prerequisite chain depth: ' + depth +
                    ' · planning budget: ' + budget + ' points. Depth is not total cost; parallel required branches add investment.';
    }

    function nodeDepth(id, memo, visiting) {
        if (memo.has(id)) return memo.get(id);
        const node = tree.nodes.find(entry => entry.id === id);
        if (!node) return Infinity;
        if (node.start) return 0;
        if (visiting.has(id)) return Infinity;
        visiting.add(id);
        const depths = (Array.isArray(node.requires) ? node.requires : [])
            .map(requiredId => nodeDepth(requiredId, memo, visiting));
        visiting.delete(id);
        if (depths.length === 0 || depths.every(depth => depth === Infinity)) return Infinity;
        const finiteDepths = depths.filter(depth => depth !== Infinity);
        const prerequisiteDepth = node.requiresMode === 'any'
            ? Math.min(...finiteDepths)
            : depths.length === finiteDepths.length
                ? Math.max(...finiteDepths)
                : Infinity;
        const result = prerequisiteDepth === Infinity ? Infinity : prerequisiteDepth + 1;
        memo.set(id, result);
        return result;
    }

    function validateTree() {
        const issues = [];
        const idCounts = new Map();
        tree.nodes.forEach(node => idCounts.set(node.id, (idCounts.get(node.id) || 0) + 1));
        const starts = tree.nodes.filter(node => node.start === true);
        if (starts.length !== 1) {
            issues.push({ type: 'error', message: 'Use exactly one starting node; found ' + starts.length + '.' });
        }

        tree.nodes.forEach(node => {
            const label = node.name || node.id || '(unnamed node)';
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(node.id || ''))) {
                issues.push({ type: 'error', message: label + ': identifier must use letters, numbers, and underscores, and start with a letter or underscore.' });
            }
            if ((idCounts.get(node.id) || 0) > 1) {
                issues.push({ type: 'error', message: label + ': duplicate identifier "' + node.id + '".' });
            }
            if (!String(node.name || '').trim()) issues.push({ type: 'error', message: label + ': display name is required.' });
            if (!String(node.effect || '').trim()) issues.push({ type: 'warning', message: label + ': add effect text so players understand the benefit.' });
            if (!Number.isInteger(node.column) || !Number.isInteger(node.row)) {
                issues.push({ type: 'error', message: label + ': row and column must be whole numbers.' });
            }
            if (!Number.isInteger(node.maxRank) || node.maxRank !== (node.start ? 0 : 1)) {
                issues.push({ type: 'error', message: label + ': starting nodes use rank 0 and other nodes can only be selected once.' });
            }
            if (node.requiresMode !== undefined && !['all', 'any'].includes(node.requiresMode)) {
                issues.push({ type: 'error', message: label + ': prerequisite mode must be all or any.' });
            }
            if (node.size !== undefined && !nodeSizes.includes(Number(node.size))) {
                issues.push({ type: 'error', message: label + ': size must be 1, 1.25, or 1.5.' });
            }
            if (node.type !== undefined && node.type !== null && !nodeTypes.includes(node.type)) {
                issues.push({ type: 'error', message: label + ': base node color must be health, attackSpeed, accuracy, or damage.' });
            }
            if (!Array.isArray(node.requires)) {
                issues.push({ type: 'error', message: label + ': prerequisites must be a list.' });
            } else {
                if (new Set(node.requires).size !== node.requires.length) {
                    issues.push({ type: 'error', message: label + ': a prerequisite is selected more than once.' });
                }
                node.requires.forEach(requiredId => {
                    if (requiredId === node.id) issues.push({ type: 'error', message: label + ': a node cannot require itself.' });
                    else if (!tree.nodes.some(other => other.id === requiredId)) {
                        issues.push({ type: 'error', message: label + ': missing prerequisite "' + requiredId + '".' });
                    }
                });
            }
            if (node.start && Array.isArray(node.requires) && node.requires.length) {
                issues.push({ type: 'error', message: label + ': the starting node cannot have prerequisites.' });
            }
            if (!node.start && Array.isArray(node.requires) && node.requires.length === 0) {
                issues.push({ type: 'warning', message: label + ': no prerequisites makes this an independent root.' });
            }
            if (!node.stats || typeof node.stats !== 'object' || Array.isArray(node.stats)) {
                issues.push({ type: 'error', message: label + ': stats must be an object.' });
            } else {
                Object.entries(node.stats).forEach(([stat, value]) => {
                    if (!statNames.includes(stat)) {
                        issues.push({ type: 'error', message: label + ': unsupported stat "' + stat + '".' });
                    } else if (!Number.isFinite(value)) {
                        issues.push({ type: 'error', message: label + ': "' + stat + '" must be a finite number.' });
                    } else if (stat === 'attackSpeedBonus' && value <= -1) {
                        issues.push({ type: 'error', message: label + ': additive attack speed must be greater than -1.' });
                    } else if (stat.toLowerCase().includes('multiplier') && value <= 0) {
                        issues.push({ type: 'error', message: label + ': multiplier values must be greater than zero.' });
                    }
                });
                if (!node.start && !Object.keys(node.stats).length) {
                    issues.push({ type: 'warning', message: label + ': this filler node has no stat bonus.' });
                }
            }
        });

        const visiting = new Set();
        const visited = new Set();
        function visit(id) {
            if (visiting.has(id)) {
                issues.push({ type: 'error', message: 'Prerequisite cycle detected at "' + id + '".' });
                return;
            }
            if (visited.has(id)) return;
            visiting.add(id);
            const node = tree.nodes.find(entry => entry.id === id);
            if (node && Array.isArray(node.requires)) node.requires.forEach(visit);
            visiting.delete(id);
            visited.add(id);
        }
        tree.nodes.forEach(node => visit(node.id));

        if (starts.length === 1) {
            const reachable = new Set(starts.map(node => node.id));
            let changed = true;
            while (changed) {
                changed = false;
                tree.nodes.forEach(node => {
                    if (reachable.has(node.id) || !Array.isArray(node.requires) || !node.requires.length) return;
                    const eligible = node.requiresMode === 'any'
                        ? node.requires.some(id => reachable.has(id))
                        : node.requires.every(id => reachable.has(id));
                    if (eligible) {
                        reachable.add(node.id);
                        changed = true;
                    }
                });
            }
            tree.nodes.filter(node => !reachable.has(node.id)).forEach(node =>
                issues.push({ type: 'warning', message: (node.name || node.id) + ': unreachable from the starting node.' }));
        }

        const positionCounts = new Map();
        tree.nodes.forEach(node => {
            const key = node.column + ':' + node.row;
            positionCounts.set(key, (positionCounts.get(key) || 0) + 1);
        });
        positionCounts.forEach((count, position) => {
            if (count > 1) issues.push({ type: 'warning', message: count + ' nodes overlap at grid position ' + position + '.' });
        });

        [tree.experienceBase, tree.experiencePerLevel].forEach((value, index) => {
            if (!Number.isInteger(value) || value < (index === 0 ? 1 : 0)) {
                issues.push({ type: 'error', message: index === 0
                    ? 'XP to level 2 must be a positive whole number.'
                    : 'XP increase per level must be a nonnegative whole number.' });
            }
        });
        return issues;
    }

    function renderValidation() {
        const issues = validateTree();
        elements.validationList.innerHTML = '';
        elements.validationCount.textContent = String(issues.length);
        const errors = issues.filter(issue => issue.type === 'error').length;
        elements.validationStatus.textContent = errors ? errors + ' error' + (errors === 1 ? '' : 's') :
            issues.length ? 'Review suggestions' : 'Tree looks good';
        elements.validationStatus.classList.toggle('has-errors', errors > 0);
        if (!issues.length) {
            const item = document.createElement('li');
            item.className = 'validation-item';
            item.innerHTML = '<span class="validation-icon">✓</span><span>No structural or data issues found.</span>';
            elements.validationList.appendChild(item);
            return;
        }
        issues.forEach(issue => {
            const item = document.createElement('li');
            item.className = 'validation-item ' + issue.type;
            const icon = document.createElement('span');
            icon.className = 'validation-icon';
            icon.textContent = issue.type === 'error' ? '!' : '•';
            const message = document.createElement('span');
            message.textContent = issue.message;
            item.append(icon, message);
            elements.validationList.appendChild(item);
        });
    }

    function render() {
        renderNodeList();
        renderGraph();
        renderInspector();
        renderValidation();
    }

    function renderEditedTree() {
        // Keep the inspector controls in place while reflecting edits on the map.
        renderNodeList();
        renderGraph();
        renderValidation();
        const node = selectedNode();
        if (node) {
            const depth = nodeDepth(node.id, new Map(), new Set());
            const budget = Math.max(0, Number(elements.skillPointBudget ? elements.skillPointBudget.value : 10) || 0);
            elements.nodeDepth.textContent = depth === Infinity
                ? 'Not reachable from the starting node. Add a valid prerequisite path.'
                : node.start ? 'Starting point · 0 prerequisite points.'
                    : 'Prerequisite chain depth: ' + depth + ' · planning budget: ' + budget + ' points. Depth is not total cost; parallel required branches add investment.';
        }
    }

    function selectNode(id) {
        if (!tree.nodes.some(node => node.id === id)) return;
        selectedId = id;
        selectedConnection = null;
        render();
    }

    function applyInspector(event, live = false) {
        if (event) event.preventDefault();
        const node = selectedNode();
        if (!node) return;
        const newId = elements.nodeId.value.trim();
        if (tree.nodes.some(other => other !== node && other.id === newId)) {
            showToast('That identifier is already in use.');
            elements.nodeId.focus();
            return;
        }
        let stats;
        try {
            stats = readNodeStats();
        } catch (error) {
            if (live) return;
            elements.statsError.textContent = error.message;
            elements.statsError.hidden = false;
            return;
        }
        const oldId = node.id;
        if (!newId) return;
        const requires = Array.from(elements.nodeRequires.selectedOptions).map(option => option.value);
        node.id = newId;
        node.name = elements.nodeName.value.trim();
        node.icon = elements.nodeIcon.value.trim();
        node.effect = elements.nodeEffect.value.trim();
        node.size = Number(elements.nodeSize.value);
        if (elements.nodeType.value) node.type = elements.nodeType.value;
        else delete node.type;
        node.maxRank = elements.nodeStart.checked ? 0 : 1;
        node.column = Number(elements.nodeColumn.value);
        node.row = Number(elements.nodeRow.value);
        node.start = elements.nodeStart.checked;
        node.requires = node.start ? [] : requires;
        node.requiresMode = elements.nodeRequiresMode.value;
        node.stats = stats;
        if (oldId !== newId) {
            tree.nodes.forEach(other => {
                other.requires = (other.requires || []).map(id => id === oldId ? newId : id);
            });
            if (selectedId === oldId) selectedId = newId;
        }
        markChanged();
        if (live) renderEditedTree();
        else render();
    }

    function addNode(template, baseType) {
        const baseTemplate = baseType ? baseNodeTemplates[baseType] : null;
        const id = uniqueId(baseTemplate ? baseTemplate.id : template ? template.id + '_copy' : 'newNode');
        const node = baseTemplate
            ? JSON.parse(JSON.stringify(baseTemplate))
            : template
                ? JSON.parse(JSON.stringify(template))
            : {
                id,
                name: 'New Skill',
                icon: '✦',
                effect: 'A modest one-time bonus',
                requires: selectedId ? [selectedId] : [],
                requiresMode: 'all',
                column: 3,
                row: 3,
                maxRank: 1,
                stats: { damage: 1 }
            };
        node.id = id;
        node.name = baseTemplate ? baseTemplate.name : template ? template.name + ' Copy' : node.name;
        node.size = baseTemplate ? 1 : template ? nodeSize(template) : 1;
        if (baseTemplate) {
            const parent = selectedNode() || tree.nodes.find(entry => entry.start);
            node.column = Math.max(1, Number(parent ? parent.column : 2) || 2) + 1;
            node.row = Math.max(1, Number(parent ? parent.row : 1) || 1);
            while (tree.nodes.some(entry => entry.column === node.column && entry.row === node.row)) {
                node.row++;
            }
            node.maxRank = 1;
            node.requires = parent ? [parent.id] : [];
            node.requiresMode = 'all';
        } else {
            node.column = (Number(template ? template.column : 3) || 3) + 1;
            node.row = Number(template ? template.row : 3) || 3;
        }
        node.start = false;
        if (!baseTemplate) {
            node.requires = template ? [...(template.requires || [])] : (selectedId ? [selectedId] : []);
            node.requiresMode = node.requiresMode === 'any' ? 'any' : 'all';
        }
        if (!Number.isInteger(node.maxRank) || node.maxRank < 1) node.maxRank = 1;
        tree.nodes.push(node);
        selectedId = id;
        markChanged();
        render();
    }

    function removeNode(skipConfirm = false) {
        const node = selectedNode();
        if (!node) return;
        if (!skipConfirm && !window.confirm('Delete "' + (node.name || node.id) + '"? Its prerequisite links will be removed from other nodes.')) return;
        tree.nodes = tree.nodes.filter(entry => entry !== node);
        tree.nodes.forEach(other => {
            other.requires = (other.requires || []).filter(id => id !== node.id);
        });
        selectedId = tree.nodes[0] ? tree.nodes[0].id : null;
        markChanged();
        render();
    }

    function download(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(function() {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    function exportJson() {
        download('3-skill-tree.json', JSON.stringify(tree, null, 4) + '\n', 'application/json');
        showToast('Skill tree JSON exported.');
    }

    function exportJs() {
        const issues = validateTree();
        const errors = issues.filter(issue => issue.type === 'error');
        if (errors.length && !window.confirm(
            'The tree has ' + errors.length + ' validation error' +
            (errors.length === 1 ? '' : 's') + '. Export anyway?'
        )) return;
        const source = 'window.gameThreeSkillTree = ' + JSON.stringify(tree, null, 4) + ';\n';
        download('3-skill-tree.js', source, 'text/javascript');
        elements.saveStatus.textContent = 'Exported · replace js/3-skill-tree.js with the downloaded file';
        elements.saveStatus.previousElementSibling.style.background = 'var(--green)';
        showToast('Downloaded 3-skill-tree.js. Replace the existing file in the js folder.');
    }

    async function importJson(file) {
        if (!file) return;
        try {
            const imported = JSON.parse(await file.text());
            if (!imported || typeof imported !== 'object' || !Array.isArray(imported.nodes)) {
                throw new Error('The JSON must contain a nodes array.');
            }
            tree = {
                experienceBase: imported.experienceBase,
                experiencePerLevel: imported.experiencePerLevel,
                nodes: imported.nodes.map(node => ({
                    ...node,
                    maxRank: node.start ? 0 : 1,
                    requiresMode: node.requiresMode === 'any' ? 'any' : 'all'
                }))
            };
            selectedId = tree.nodes[0] ? tree.nodes[0].id : null;
            if (elements.experienceBase) elements.experienceBase.value = String(tree.experienceBase ?? '');
            if (elements.experiencePerLevel) elements.experiencePerLevel.value = String(tree.experiencePerLevel ?? '');
            markChanged();
            render();
            showToast('Imported tree. Check validation before exporting.');
        } catch (error) {
            showToast('Could not import JSON: ' + error.message);
        }
    }

    function resetTree() {
        if (!window.confirm('Discard editor changes and reload the default skill tree?')) return;
        tree = JSON.parse(JSON.stringify(originalTree));
        selectedId = tree.nodes[0] ? tree.nodes[0].id : null;
        if (elements.experienceBase) elements.experienceBase.value = String(tree.experienceBase);
        if (elements.experiencePerLevel) elements.experiencePerLevel.value = String(tree.experiencePerLevel);
        if (elements.skillPointBudget) elements.skillPointBudget.value = '10';
        elements.saveStatus.textContent = 'Changes are local until exported';
        elements.saveStatus.previousElementSibling.style.background = 'var(--amber)';
        render();
        showToast('Default tree restored in the editor.');
    }

    function openInsertNodeDialog() {
        if (!selectedConnection) return;
        const from = tree.nodes.find(node => node.id === selectedConnection.from);
        const to = tree.nodes.find(node => node.id === selectedConnection.to);
        if (!from || !to) return;
        elements.insertNodeChoice.innerHTML = '';
        Object.entries(baseNodeTemplates).forEach(([type, node]) => {
            const option = document.createElement('option');
            option.value = 'preset:' + type;
            option.textContent = node.name + ' preset';
            elements.insertNodeChoice.appendChild(option);
        });
        tree.nodes.filter(node => !node.start && node.id !== from.id && node.id !== to.id).forEach(node => {
            const option = document.createElement('option');
            option.value = 'existing:' + node.id;
            option.textContent = (node.name || node.id) + ' (existing)';
            elements.insertNodeChoice.appendChild(option);
        });
        elements.insertNodePath.textContent = 'Insert a node between ' + from.name + ' and ' + to.name + '. The new path will be ' + from.name + ' → node → ' + to.name + '.';
        elements.insertNodeDialog.showModal();
    }

    function insertNodeBetweenSelected(choice) {
        if (!selectedConnection) return false;
        const from = tree.nodes.find(node => node.id === selectedConnection.from);
        const to = tree.nodes.find(node => node.id === selectedConnection.to);
        if (!from || !to) return false;
        const [kind, value] = String(choice || '').split(':');
        let inserted;
        if (kind === 'preset' && baseNodeTemplates[value]) {
            inserted = JSON.parse(JSON.stringify(baseNodeTemplates[value]));
            inserted.id = uniqueId(inserted.id);
            inserted.name = inserted.name + ' Path Node';
            inserted.maxRank = 1;
            inserted.start = false;
            inserted.requires = [from.id];
            inserted.requiresMode = 'all';
            inserted.column = Math.round(((Number(from.column) || 0) + (Number(to.column) || 0)) / 2);
            inserted.row = Math.round(((Number(from.row) || 0) + (Number(to.row) || 0)) / 2);
            while (tree.nodes.some(node => node.column === inserted.column && node.row === inserted.row)) inserted.row++;
            tree.nodes.push(inserted);
        } else if (kind === 'existing') {
            inserted = tree.nodes.find(node => node.id === value);
            if (!inserted || inserted === from || inserted === to) return false;
            inserted.column = Math.round(((Number(from.column) || 0) + (Number(to.column) || 0)) / 2);
            inserted.row = Math.round(((Number(from.row) || 0) + (Number(to.row) || 0)) / 2);
            while (tree.nodes.some(node => node !== inserted && node.column === inserted.column && node.row === inserted.row)) inserted.row++;
            inserted.requires = [...new Set([...(inserted.requires || []), from.id])];
        } else {
            return false;
        }
        to.requires = [...new Set((to.requires || []).filter(id => id !== from.id).concat(inserted.id))];
        selectedId = inserted.id;
        selectedConnection = null;
        elements.insertBetween.disabled = true;
        markChanged();
        render();
        showToast('Inserted ' + inserted.name + ' into the selected path.');
        return true;
    }

    function handleGraphNodeClick(id) {
        if (!connectMode) {
            selectNode(id);
            return;
        }
        if (!connectSourceId) {
            connectSourceId = id;
            selectedId = id;
            render();
            return;
        }
        if (connectSourceId === id) return;
        const target = tree.nodes.find(node => node.id === id);
        if (!target) return;
        target.requires = [...new Set([...(target.requires || []), connectSourceId])];
        target.requiresMode = target.requiresMode === 'any' ? 'any' : 'all';
        connectSourceId = null;
        selectedId = id;
        markChanged();
        render();
    }
    function beginDrag(event) {
        const card = event.target.closest('[data-node-id]');
        if (!card || event.button !== 0) return;
        const node = tree.nodes.find(entry => entry.id === card.dataset.nodeId);
        if (!node) return;
        if (event.target.closest('button') !== card) return;
        const startX = event.clientX;
        const startY = event.clientY;
        if (connectMode) { handleGraphNodeClick(node.id); return; }
        const minColumn = Math.min(1, ...tree.nodes.map(entry => Number(entry.column) || 0));
        const minRow = Math.min(1, ...tree.nodes.map(entry => Number(entry.row) || 0));
        const originalLeft = (Number(node.column) - minColumn + 1) * 190;
        const originalTop = (Number(node.row) - minRow + 1) * 160;
        let dragged = false;
        card.setPointerCapture(event.pointerId);
        function move(moveEvent) {
            const deltaX = (moveEvent.clientX - startX) / zoom;
            const deltaY = (moveEvent.clientY - startY) / zoom;
            if (!dragged && Math.abs(deltaX) + Math.abs(deltaY) < 5) return;
            dragged = true;
            card.style.left = originalLeft + deltaX + 'px';
            card.style.top = originalTop + deltaY + 'px';
        }
        function end(endEvent) {
            card.removeEventListener('pointermove', move);
            card.removeEventListener('pointerup', end);
            card.removeEventListener('pointercancel', end);
            if (!dragged) {
                handleGraphNodeClick(node.id);
                return;
            }
            node.column = minColumn - 1 + Math.round((originalLeft +
                (endEvent.clientX - startX) / zoom) / 190);
            node.row = minRow - 1 + Math.round((originalTop +
                (endEvent.clientY - startY) / zoom) / 160);
            selectedId = node.id;
            markChanged();
            render();
        }
        card.addEventListener('pointermove', move);
        card.addEventListener('pointerup', end);
        card.addEventListener('pointercancel', end);
    }

    elements.nodeList.addEventListener('click', event => {
        const button = event.target.closest('[data-node-id]');
        if (button) selectNode(button.dataset.nodeId);
    });
    elements.graphNodes.addEventListener('pointerdown', beginDrag);
    elements.graphViewToggle.addEventListener('click', event => {
        const button = event.target.closest('[data-view-mode]');
        if (!button || button.dataset.viewMode === graphViewMode) return;
        graphViewMode = button.dataset.viewMode;
        renderGraph();
    });
    elements.nodeSearch.addEventListener('input', renderNodeList);
    elements.nodeForm.addEventListener('submit', applyInspector);
    elements.nodeForm.addEventListener('input', event => {
        if (event.target.matches('input, select, textarea')) applyInspector(null, true);
    });
    elements.nodeForm.addEventListener('change', event => {
        if (event.target.matches('input, select, textarea')) applyInspector(null, true);
    });
    elements.addStatBonus.addEventListener('click', () => addStatBonusRow());
    elements.deleteNode.addEventListener('click', removeNode);
    document.querySelector('#addNode').addEventListener('click', () => addNode(null));
    document.querySelectorAll('[data-base-node]').forEach(button => {
        button.addEventListener('click', () => addNode(null, button.dataset.baseNode));
    });
    document.querySelector('#duplicateNode').addEventListener('click', () => {
        const node = selectedNode();
        if (node) addNode(node);
    });
    document.querySelector('#exportJson').addEventListener('click', exportJson);
    document.querySelector('#exportJs').addEventListener('click', exportJs);
    document.querySelector('#importFile').addEventListener('change', event => {
        importJson(event.target.files[0]);
        event.target.value = '';
    });
    document.querySelector('#fitTree').addEventListener('click', () => {
        const size = graphSize();
        const availableWidth = elements.graphViewport.clientWidth - 30;
        const availableHeight = elements.graphViewport.clientHeight - 30;
        panX = 0; panY = 0;
        setZoom(Math.min(2, availableWidth / size.width, availableHeight / size.height));
        elements.graphViewport.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
    elements.zoomRange.addEventListener('input', event => setZoom(Number(event.target.value) / 100));
    elements.graphEdges.addEventListener('click', event => {
        const line = event.target.closest('.graph-edge-hit');
        if (!line) return;
        selectedConnection = { from: line.dataset.sourceId, to: line.dataset.targetId };
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        renderGraph();
    });
    elements.connectToggle.addEventListener('click', () => {
        connectMode = !connectMode;
        connectSourceId = null;
        elements.connectToggle.classList.toggle('is-active', connectMode);
        elements.connectToggle.setAttribute('aria-pressed', String(connectMode));
        elements.connectHint.hidden = !connectMode;
        renderGraph();
    });
    elements.insertBetween.addEventListener('click', openInsertNodeDialog);
    elements.insertNodeForm.addEventListener('submit', event => {
        event.preventDefault();
        if (insertNodeBetweenSelected(elements.insertNodeChoice.value)) elements.insertNodeDialog.close();
    });
    elements.cancelInsert.addEventListener('click', () => elements.insertNodeDialog.close());
    elements.undoButton.addEventListener('click', undoTreeEdit);
    elements.graphViewport.addEventListener('pointerdown', event => {
        if (event.button !== 0 || event.target.closest('[data-node-id], .graph-edge-hit')) return;
        isPanning = true; panStartX = event.clientX; panStartY = event.clientY;
        elements.graphViewport.classList.add('is-panning');
    });
    window.addEventListener('pointermove', event => {
        if (!isPanning) return;
        panX += event.clientX - panStartX; panY += event.clientY - panStartY;
        panStartX = event.clientX; panStartY = event.clientY; setZoom(zoom);
    });
    window.addEventListener('pointerup', () => {
        isPanning = false; elements.graphViewport.classList.remove('is-panning');
    });
    elements.graphViewport.addEventListener('wheel', event => {
        event.preventDefault();
        setZoom(zoom * Math.exp(-event.deltaY * 0.001), event.clientX, event.clientY);
    }, { passive: false });
    elements.nodeStart.addEventListener('change', () => {
        if (elements.nodeStart.checked) {
            elements.nodeRequires.querySelectorAll('option').forEach(option => {
                option.selected = false;
            });
        }
    });
    if (elements.experienceBase) elements.experienceBase.addEventListener('change', () => {
        tree.experienceBase = Number(elements.experienceBase.value);
        markChanged();
        renderValidation();
    });
    if (elements.experiencePerLevel) elements.experiencePerLevel.addEventListener('change', () => {
        tree.experiencePerLevel = Number(elements.experiencePerLevel.value);
        markChanged();
        renderValidation();
    });
    if (elements.skillPointBudget) elements.skillPointBudget.addEventListener('input', renderInspector);
    document.addEventListener('keydown', event => {
        const active = document.activeElement;
        const isEditingText = active instanceof Element && active.closest('input, textarea, select, [contenteditable=true]');
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !isEditingText) { event.preventDefault(); undoTreeEdit(); }
        if (event.key === 'Escape' && connectMode) { connectMode = false; connectSourceId = null; elements.connectToggle.classList.remove('is-active'); elements.connectToggle.setAttribute('aria-pressed', 'false'); elements.connectHint.hidden = true; renderGraph(); }
        if ((event.key === 'Delete' || event.key === 'Backspace') &&
            (!isEditingText || selectedConnection) &&
            !(active instanceof Element && active.matches('input, textarea, select, [contenteditable=true]') && !selectedConnection)) {
            if (selectedConnection) {
                const targetNode = tree.nodes.find(node => node.id === selectedConnection.to);
                if (!targetNode) return;
                event.preventDefault();
                targetNode.requires = (targetNode.requires || []).filter(id => id !== selectedConnection.from);
                selectedConnection = null;
                markChanged();
                render();
            } else if (selectedNode()) {
                event.preventDefault();
                removeNode(true);
            }
        }
    });
    window.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            exportJs();
        }
    });

    if (elements.experienceBase) elements.experienceBase.value = String(tree.experienceBase);
    if (elements.experiencePerLevel) elements.experiencePerLevel.value = String(tree.experiencePerLevel);
    render();
    setZoom(zoom);

    // The editor can be opened in a background tab or a file preview that
    // delays its first paint. Repaint when that page becomes visible.
    window.addEventListener('pageshow', render);
    window.addEventListener('focus', render);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) render();
    });
    window.setTimeout(render, 100);

    // Some embedded/file previews lay out the canvas after scripts run. Redraw
    // once the viewport has a real size so the initial node layer is painted.
    if (typeof ResizeObserver === 'function') {
        let initialViewportPainted = false;
        const viewportObserver = new ResizeObserver(entries => {
            if (initialViewportPainted) return;
            const rect = entries[0] && entries[0].contentRect;
            if (!rect || rect.width === 0 || rect.height === 0) return;
            initialViewportPainted = true;
            viewportObserver.disconnect();
            render();
            setZoom(zoom);
        });
        viewportObserver.observe(elements.graphViewport);
    }
}());
