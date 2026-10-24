(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const clone = value => JSON.parse(JSON.stringify(value));
    const draftKey = 'idleAdventureItemEditorDraft', viewKey = 'idleAdventureMaterialEditorView';
    let data = Equipment.normalizeData(clone(window.adventureItems));
    let selectedId = Object.keys(data.materials)[0], history = [], snapshot, database, quickSave;
    let snapshotSelection = selectedId;
    const assets = new Map();
    const details = id => data.materialDetails?.[id] || {};
    const paths = () => [...data.items.map(item => item.sprite), ...Object.values(data.materialDetails || {}).map(material => material.sprite)].filter(Boolean);
    const status = message => { $('status').textContent = message; };
    function node(tag, text) { const result = document.createElement(tag); if (text !== undefined) result.textContent = text; return result; }
    function saveView() {
        try { localStorage.setItem(viewKey, JSON.stringify({selectedId, search: $('search').value})); } catch { /* Exports remain available. */ }
    }
    function store(mode, path, blob) {
        database ||= new Promise((resolve, reject) => {
            const request = indexedDB.open('idleAdventureItemSprites', 1);
            request.onupgradeneeded = () => request.result.createObjectStore('sprites');
            request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
        });
        return database.then(db => new Promise((resolve, reject) => {
            const transaction = db.transaction('sprites', mode), storage = transaction.objectStore('sprites');
            const request = mode === 'readwrite' ? storage.put(blob, path) : storage.get(path);
            transaction.oncomplete = () => resolve(request.result);
            transaction.onerror = transaction.onabort = () => reject(transaction.error);
        }));
    }
    function remember(path, blob) {
        if (assets.has(path)) URL.revokeObjectURL(assets.get(path).url);
        assets.set(path, {blob, url: URL.createObjectURL(blob)});
    }
    async function restoreSprites() {
        await Promise.all([...new Set(paths())].map(async path => {
            if (assets.has(path)) return;
            try { const blob = await store('readonly', path); if (blob) remember(path, blob); } catch { /* Project paths still work. */ }
        }));
        renderList(); renderPreview();
    }
    function icon(id) {
        const material = details(id);
        const asset = assets.get(material.sprite);
        const result = Equipment.createIcon(asset ? {sprite: ''} : material, '◇');
        if (asset) { const image = node('img'); image.alt = ''; image.src = asset.url; result.replaceChildren(image); }
        return result;
    }
    function references(id) {
        const recipes = data.items.filter(item => Object.hasOwn(item.recipe?.materials || {}, id));
        const drops = [];
        let world = window.adventureWorld;
        try {
            const draft = JSON.parse(localStorage.getItem('idleAdventureWorldEditorDraft'));
            if (draft && Array.isArray(draft.maps) && Array.isArray(draft.monsters) && [...draft.maps, ...draft.monsters].every(entry => entry && typeof entry === 'object')) world = draft;
        } catch { /* Use the project drop catalogue. */ }
        for (const [kind, entries] of [['Map', world.maps], ['Monster', world.monsters]]) {
            entries.forEach(entry => {
                if ((entry.drops || []).some(drop => drop.id === id)) drops.push(kind + ': ' + entry.name);
                (entry.spawns || []).forEach(spawn => {
                    if ((spawn.overrides?.drops || []).some(drop => drop.id === id)) drops.push('Map: ' + entry.name + ' (spawn override)');
                });
            });
        }
        return {recipes, drops};
    }
    function renderValidation() {
        const errors = Equipment.validate(data);
        $('validationSummary').textContent = errors.length ? errors.length + ' issue(s) to fix' : 'Materials look good.';
        $('validation').replaceChildren(...errors.map(error => node('li', error)));
        $('exportJson').disabled = $('exportGame').disabled = errors.length > 0;
        quickSave?.refresh(); return errors;
    }
    function renderList() {
        const query = $('search').value.trim().toLowerCase();
        $('materialCount').textContent = '(' + Object.keys(data.materials).length + ')';
        $('materialList').replaceChildren();
        Object.entries(data.materials).filter(([id, name]) => (name + ' ' + (details(id).description || '')).toLowerCase().includes(query)).forEach(([id, name]) => {
            const button = node('button'); button.type = 'button'; button.className = 'item-entry'; button.dataset.materialId = id;
            button.setAttribute('aria-pressed', String(id === selectedId));
            const copy = node('span'); copy.append(node('strong', name || 'Unnamed material'), node('small', id));
            button.append(icon(id), copy); button.addEventListener('click', () => { selectedId = id; snapshotSelection = id; render(); saveView(); });
            $('materialList').append(button);
        });
        if (!$('materialList').children.length) $('materialList').append(node('p', 'No matches.'));
    }
    function renderPreview() {
        $('preview').replaceChildren();
        if (!Object.hasOwn(data.materials, selectedId)) return;
        $('preview').append(icon(selectedId), node('h3', data.materials[selectedId]), node('p', details(selectedId).description || 'Crafting material'));
    }
    function render() {
        renderList(); renderPreview(); renderValidation();
        const exists = Object.hasOwn(data.materials, selectedId);
        $('emptyEditor').hidden = exists; $('materialForm').hidden = !exists;
        $('undo').disabled = !history.length;
        $('materialSources').replaceChildren(); $('materialRecipes').replaceChildren();
        if (!exists) return;
        $('materialId').value = selectedId; $('materialName').value = data.materials[selectedId];
        $('materialDescription').value = details(selectedId).description || '';
        $('materialSprite').value = details(selectedId).sprite || ''; $('importSprite').value = '';
        const refs = references(selectedId);
        $('materialSources').append(...(refs.drops.length ? refs.drops : ['No drop sources assigned.']).map(text => node('li', text)));
        $('materialRecipes').append(...(refs.recipes.length ? refs.recipes.map(item => item.name + ' — ' + item.recipe.materials[selectedId] + ' required') : ['No recipes use this material.']).map(text => node('li', text)));
    }
    function changed(message) {
        const next = JSON.stringify(data);
        if (next !== snapshot) {
            history.push({data: snapshot, selectedId: snapshotSelection}); if (history.length > 100) history.shift(); snapshot = next; snapshotSelection = selectedId;
        }
        try { localStorage.setItem(draftKey, next); status(message || 'Draft saved. Quick save or download the game package to apply changes.'); }
        catch { status('Browser storage is unavailable. Export your work to keep it.'); }
        $('restoreDraft').disabled = false; $('undo').disabled = !history.length;
        saveView(); renderList(); renderPreview(); renderValidation();
    }
    function newId() { return 'material_' + [...crypto.getRandomValues(new Uint8Array(12))].map(byte => byte.toString(16).padStart(2, '0')).join(''); }
    function download(name, value, type) {
        const blob = value instanceof Blob ? value : new Blob([value], {type});
        const link = node('a'); link.download = name; link.href = URL.createObjectURL(blob); link.click();
        window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }
    const source = () => 'window.adventureItems = ' + JSON.stringify(data, null, 4) + ';\n';
    function replaceData(next, draft = false) {
        next = Equipment.normalizeData(next);
        const errors = Equipment.validate(next);
        const editable = next && next.materials && typeof next.materials === 'object' && !Array.isArray(next.materials) &&
            Object.values(next.materials).every(name => typeof name === 'string') && Array.isArray(next.items) && Array.isArray(next.slots) &&
            next.items.every(item => item && typeof item === 'object') &&
            (next.materialDetails === undefined || next.materialDetails && typeof next.materialDetails === 'object' && !Array.isArray(next.materialDetails) &&
                Object.values(next.materialDetails).every(material => material && typeof material === 'object' && !Array.isArray(material)));
        if (!editable || (errors.length && !draft)) throw new Error(errors.slice(0, 3).join(' ') || 'Invalid item catalogue.');
        data = next; if (!Object.hasOwn(data.materials, selectedId)) selectedId = Object.keys(data.materials)[0];
        changed(); render(); restoreSprites();
    }
    $('materialForm').addEventListener('submit', event => event.preventDefault());
    for (const [field, key] of [['materialName', 'name'], ['materialDescription', 'description'], ['materialSprite', 'sprite']]) {
        $(field).addEventListener('input', () => {
            if (key === 'name') data.materials[selectedId] = $(field).value;
            else { data.materialDetails ||= {}; data.materialDetails[selectedId] ||= {description: '', sprite: ''}; data.materialDetails[selectedId][key] = $(field).value; }
            changed();
        });
    }
    $('search').addEventListener('input', () => { renderList(); saveView(); });
    $('addMaterial').addEventListener('click', () => {
        selectedId = newId(); data.materials[selectedId] = 'New Material'; $('search').value = ''; changed(); render();
    });
    $('duplicateMaterial').addEventListener('click', () => {
        const original = selectedId; if (!Object.hasOwn(data.materials, original)) return;
        selectedId = newId(); data.materials[selectedId] = data.materials[original] + ' Copy';
        if (data.materialDetails?.[original]) data.materialDetails[selectedId] = clone(details(original));
        $('search').value = ''; changed(); render();
    });
    $('deleteMaterial').addEventListener('click', () => {
        const refs = references(selectedId);
        if (refs.recipes.length || refs.drops.length) { status('Remove this material from recipes and drops before deleting it.'); return; }
        delete data.materials[selectedId]; if (data.materialDetails) delete data.materialDetails[selectedId];
        selectedId = Object.keys(data.materials)[0]; changed('Material deleted. Undo is available.'); render();
    });
    $('undo').addEventListener('click', () => {
        const previous = history.pop(); if (!previous) return;
        data = JSON.parse(previous.data); selectedId = previous.selectedId;
        if (!Object.hasOwn(data.materials, selectedId)) selectedId = Object.keys(data.materials)[0];
        snapshot = JSON.stringify(data); snapshotSelection = selectedId;
        try { localStorage.setItem(draftKey, snapshot); } catch { /* Export remains available. */ }
        render(); saveView(); status('Last edit undone.');
    });
    $('importSprite').addEventListener('change', async event => {
        const file = event.target.files[0], id = selectedId; if (!file) return;
        try {
            const extension = {'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif'}[file.type];
            if (!extension) throw new Error('Choose a PNG, JPEG, WebP, or GIF.');
            const temporary = URL.createObjectURL(file);
            try { const image = new Image(); image.src = temporary; await image.decode(); } finally { URL.revokeObjectURL(temporary); }
            if (!Object.hasOwn(data.materials, id)) return;
            const bytes = new Uint8Array(await file.arrayBuffer());
            const path = 'assets/materials/' + id + '-' + ItemPackage.crc32(bytes).toString(16).padStart(8, '0') + '.' + extension;
            remember(path, file);
            let persisted = true; try { await store('readwrite', path, file); } catch { persisted = false; }
            data.materialDetails ||= {}; data.materialDetails[id] ||= {description: '', sprite: ''}; data.materialDetails[id].sprite = path;
            changed(persisted ? 'Sprite imported. Download the game package to install it.' : 'Sprite imported for this session. Download the game package to keep it.'); render();
        } catch (error) { status('Could not import sprite: ' + error.message); }
        event.target.value = '';
    });
    $('chooseJson').addEventListener('click', () => $('importJson').click());
    $('importJson').addEventListener('change', async event => {
        const file = event.target.files[0]; if (!file) return;
        try { replaceData(JSON.parse(await file.text())); status('Item and material catalogue imported.'); }
        catch (error) { status('Could not import JSON: ' + error.message); }
        event.target.value = '';
    });
    $('restoreDraft').addEventListener('click', () => {
        try { replaceData(JSON.parse(localStorage.getItem(draftKey)), true); } catch (error) { status('Could not restore draft: ' + error.message); }
    });
    $('exportJson').addEventListener('click', () => { if (!renderValidation().length) download('items.json', JSON.stringify(data, null, 4) + '\n', 'application/json'); });
    $('exportGame').addEventListener('click', async () => {
        if (renderValidation().length) return;
        try {
            const catalogue = source(), spritePaths = [...new Set(paths())]; await restoreSprites();
            const entries = [{name: 'js/items.js', bytes: new TextEncoder().encode(catalogue)}];
            for (const path of spritePaths) { const asset = assets.get(path); if (asset) entries.push({name: path, bytes: new Uint8Array(await asset.blob.arrayBuffer())}); }
            download('materials.zip', ItemPackage.zip(entries), 'application/zip'); status('Game package downloaded. Extract into the project folder, then reload the game.');
        } catch (error) { status('Could not export package: ' + error.message); }
    });
    snapshot = JSON.stringify(data);
    try {
        const view = JSON.parse(localStorage.getItem(viewKey) || 'null');
        const draft = localStorage.getItem(draftKey); if (draft) { replaceData(JSON.parse(draft), true); history = []; }
        if (view && Object.hasOwn(data.materials, view.selectedId)) selectedId = view.selectedId;
        if (typeof view?.search === 'string') $('search').value = view.search;
    } catch { status('Could not resume the draft. Project materials are available.'); }
    try { $('restoreDraft').disabled = !localStorage.getItem(draftKey); } catch { $('restoreDraft').disabled = true; }
    snapshotSelection = selectedId;
    quickSave = EditorQuickSave.create({key: 'items', filename: 'items.js', getPaths: paths, getSource: source,
        validate: () => Equipment.validate(data), status, download: (name, text) => download(name, text, 'text/javascript')});
    window.addEventListener('pagehide', saveView);
    render(); restoreSprites();
}());
