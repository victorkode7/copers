(function() {
    'use strict';
    const draftKey = 'idleAdventureItemEditorDraft';
    const viewKey = 'idleAdventureItemEditorView';
    const clone = value => JSON.parse(JSON.stringify(value));
    let data = Equipment.normalizeData(clone(window.adventureItems));
    const projectItems = clone(data), previousDraftKey = 'idleAdventureItemEditorPreviousDraft';
    let selectedIndex = data.items.length ? 0 : -1;
    let snapshotSelection = selectedIndex;
    let history = [];
    let snapshot = JSON.stringify(data);
    const $ = id => document.getElementById(id);
    const current = () => data.items[selectedIndex];
    const assets = new Map();
    const spritePaths = () => [...data.items.map(item => item.sprite), ...Object.values(data.materialDetails || {}).map(material => material.sprite)].filter(Equipment.safeSprite);
    let imageDatabase;
    let quickSave = null;
    const craftingEditor = ItemCraftingEditor.create({current, data: () => data, changed});

    function openImageDatabase() {
        if (!imageDatabase) imageDatabase = new Promise((resolve, reject) => {
            const request = indexedDB.open('idleAdventureItemSprites', 1);
            request.onupgradeneeded = () => request.result.createObjectStore('sprites');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        return imageDatabase;
    }
    async function spriteStorage(mode, path, blob) {
        const db = await openImageDatabase();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('sprites', mode);
            const store = transaction.objectStore('sprites');
            const request = mode === 'readwrite' ? store.put(blob, path) : store.get(path);
            transaction.oncomplete = () => resolve(request.result);
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
    }
    function rememberAsset(path, blob) {
        if (assets.has(path)) URL.revokeObjectURL(assets.get(path).url);
        assets.set(path, {blob, url: URL.createObjectURL(blob)});
    }
    async function loadDraftSprites() {
        await Promise.all([...new Set(spritePaths())].map(async path => {
            if (assets.has(path)) return;
            try {
                const blob = await spriteStorage('readonly', path);
                if (blob) rememberAsset(path, blob);
            } catch { /* Existing files can still load directly from their paths. */ }
        }));
        renderList(); renderPreview();
    }
    function iconFor(item) {
        const asset = assets.get(item.sprite);
        const fallback = data.slots.find(slot => slot.id === item.slot)?.icon;
        if (!asset) return Equipment.createIcon(item, fallback);
        const icon = document.createElement('span'); icon.className = 'item-sprite'; icon.setAttribute('aria-hidden', 'true');
        const image = document.createElement('img'); image.alt = ''; image.src = asset.url;
        icon.append(image); return icon;
    }

    function status(message) { $('status').textContent = message; }
    function saveView() {
        try {
            localStorage.setItem(viewKey, JSON.stringify({selectedIndex, search: $('search').value, slot: $('filterSlot').value, editorPage:craftingEditor.page()}));
        } catch { /* Data saving reports storage errors separately. */ }
    }
    function option(value, label) {
        const node = document.createElement('option');
        node.value = value;
        node.textContent = label;
        return node;
    }
    function newItemId() {
        let result;
        do {
            const bytes = crypto.getRandomValues(new Uint8Array(16));
            result = 'item_' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
        } while (data.items.some(item => item.id === result));
        return result;
    }
    function filenameStem(name) {
        const stem = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'item';
        return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem) ? 'item-' + stem : stem;
    }
    function draftAvailable() {
        try { return Boolean(localStorage.getItem(draftKey)); } catch { return false; }
    }
    function changed() {
        const next = JSON.stringify(data);
        if (next !== snapshot) {
            history.push({ data: snapshot, selectedIndex: snapshotSelection });
            if (history.length > 100) history.shift();
            snapshot = next;
            snapshotSelection = selectedIndex;
            try {
                localStorage.setItem(draftKey, next);
                status('Draft saved in this browser. Quick save to test changes, or use the game package for new images.');
            } catch {
                status('Browser draft storage is unavailable or full. Export JSON to keep your changes.');
            }
        }
        $('undo').disabled = !history.length;
        $('restoreDraft').disabled = !draftAvailable();
        renderList();
        renderPreview();
        renderValidation();
    }
    function populateSlots() {
        const previous = $('filterSlot').value;
        $('filterSlot').replaceChildren(option('', 'All slots'), ...data.slots.map(slot => option(slot.id, slot.name)));
        $('filterSlot').value = previous;
        $('itemSlot').replaceChildren(...data.slots.map(slot => option(slot.id, slot.name)));
    }
    function renderList() {
        $('itemCount').textContent = '(' + data.items.length + ')';
        $('itemList').replaceChildren();
        const query = $('search').value.trim().toLowerCase();
        data.items.forEach((item, index) => {
            if ($('filterSlot').value && item.slot !== $('filterSlot').value) return;
            if (query && ![item.name, item.id, item.slot].join(' ').toLowerCase().includes(query)) return;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'item-entry';
            button.setAttribute('aria-pressed', String(index === selectedIndex));
            const copy = document.createElement('span');
            const name = document.createElement('strong');
            name.textContent = item.name || 'Unnamed item';
            const detail = document.createElement('small');
            detail.textContent = item.slot + (item.developerOnly ? ' · Developer' : ' · ' + item.rarity);
        if (item.tier) detail.textContent += ' · Tier ' + item.tier;
            copy.append(name, detail);
            button.append(iconFor(item), copy);
            button.addEventListener('click', () => { selectedIndex = index; snapshotSelection = index; render(); });
            $('itemList').append(button);
        });
        if (!$('itemList').children.length) {
            const empty = document.createElement('p');
            empty.textContent = 'No matching items.';
            $('itemList').append(empty);
        }
    }
    function rowControl(label, control) {
        const wrapper = document.createElement('label');
        const text = document.createElement('span');
        text.textContent = label;
        wrapper.append(text, control);
        return wrapper;
    }
    function row(leftLabel, select, rightLabel, input, remove) {
        const node = document.createElement('div');
        node.className = 'data-row';
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = '×';
        button.setAttribute('aria-label', 'Remove ' + leftLabel.toLowerCase());
        button.addEventListener('click', () => { remove(); changed(); renderRows(); });
        node.append(rowControl(leftLabel, select), rowControl(rightLabel, input), button);
        return node;
    }
    function numeric(value, min, step = 'any') {
        const input = document.createElement('input');
        input.type = 'number';
        input.step = step;
        if (min !== undefined) input.min = min;
        input.value = value ?? '';
        return input;
    }
    function statGuide(key, input) {
        const help = ItemStatGuides.get(key);
        if (!help) return null;
        const details = document.createElement('details');
        details.className = 'stat-guide';
        const summary = document.createElement('summary');
        const update = () => { summary.textContent = 'Value guide · ' + Equipment.describe({stats: {[key]: input.valueAsNumber}}); };
        update();
        input.addEventListener('change', update);
        details.append(summary);
        for (const [label, text] of [['Affects', help.affects], ['How to enter the value', help.input], ['Game formula', help.formula], ['Example', help.example], ['How it combines', help.notes]]) {
            const paragraph = document.createElement('p');
            const heading = document.createElement('strong');
            heading.textContent = label + ': ';
            paragraph.append(heading, document.createTextNode(text));
            details.append(paragraph);
        }
        return details;
    }
    const statDefinitions = Object.entries(Equipment.stats).map(([id, rule]) => ({id, label: rule.label}));
    const bonusFilter = StatPicker.createFilter($('statRows'), statDefinitions, renderRows);
    function availableStat(id) {
        const rule = Equipment.stats[id];
        return !Object.hasOwn(current().stats, id) && (!rule.developer || current().developerOnly);
    }
    function renderRows() {
        const item = current();
        if (!item) return;
        $('statRows').replaceChildren();
        Equipment.orderedStats(item).forEach(([key, value]) => {
            const select = document.createElement('select');
            bonusFilter.populate(select, statDefinitions.filter(stat => stat.id === key || availableStat(stat.id)), key);
            const rule = Equipment.stats[key];
            const input = numeric(value, rule?.min);
            if (rule?.max !== undefined) input.max = rule.max;
            select.addEventListener('change', () => {
                delete item.stats[key];
                item.stats[select.value] = Equipment.stats[select.value].default;
                changed(); renderRows();
            });
            input.addEventListener('change', () => { item.stats[key] = input.valueAsNumber; changed(); });
            const entry = document.createElement('div');
            entry.className = 'stat-entry';
            entry.append(row('Stat', select, 'Value', input, () => delete item.stats[key]));
            const guide = statGuide(key, input);
            if (guide) entry.append(guide);
            $('statRows').append(entry);
        });
        $('recipeFields').hidden = !item.recipe;
        $('materialRows').replaceChildren();
        Object.entries(item.recipe?.materials || {}).forEach(([key, value]) => {
            const select = document.createElement('select');
            for (const [id, name] of Object.entries(data.materials)) {
                if (id === key || !Object.hasOwn(item.recipe.materials, id)) select.append(option(id, name));
            }
            select.value = key;
            const input = numeric(value, 1, 1);
            select.addEventListener('change', () => {
                const amount = item.recipe.materials[key];
                delete item.recipe.materials[key]; item.recipe.materials[select.value] = amount;
                changed(); renderRows();
            });
            input.addEventListener('change', () => { item.recipe.materials[key] = input.valueAsNumber; changed(); });
            $('materialRows').append(row('Material', select, 'Quantity', input, () => delete item.recipe.materials[key]));
        });
        $('addMaterial').disabled = !Object.keys(data.materials).some(id => !Object.hasOwn(item.recipe?.materials || {}, id));
        $('addStat').disabled = !bonusFilter.filtered().some(stat => availableStat(stat.id));
    }
    function renderForm() {
        const item = current();
        $('itemForm').hidden = !item;
        $('emptyEditor').hidden = Boolean(item);
        if (!item) return;
        for (const [field, key] of Object.entries({itemName: 'name', itemId: 'id', itemSlot: 'slot', itemRarity: 'rarity', itemDescription: 'description', itemSprite: 'sprite'})) $(field).value = item[key] || '';
        $('itemDeveloper').checked = item.developerOnly === true;
        $('craftable').checked = Boolean(item.recipe);
        renderRows();
        craftingEditor.render();
    }
    function renderPreview() {
        $('preview').replaceChildren();
        const item = current();
        if (!item) return;
        const name = document.createElement('h3');
        name.textContent = item.name || 'Unnamed item';
        const meta = document.createElement('p');
        meta.textContent = item.rarity + ' · ' + item.slot + (item.developerOnly ? ' · Developer only' : '');
        if (item.tier) meta.textContent += ' · Tier ' + item.tier;
        const description = document.createElement('p');
        description.textContent = item.description;
        const stats = document.createElement('pre');
        stats.textContent = Equipment.describe(item);
        if (item.crafting) {
            const count = Number.isSafeInteger(item.crafting.slots) && item.crafting.slots > 0 ? Math.min(item.crafting.slots, Object.keys(Equipment.stats).length) : 0;
            stats.textContent += '\n' + Array.from({length:count}, () => '◇ Crafted stat').join('\n');
        }
        $('preview').append(iconFor(item), name, meta, stats, description);
        if (item.recipe) {
            const recipe = document.createElement('p');
            recipe.className = 'recipe-preview';
            recipe.textContent = 'Recipe: ' + Object.entries(item.recipe.materials).map(([id, amount]) => amount + ' ' + data.materials[id]).join(', ');
            $('preview').append(recipe);
        }
    }
    function renderValidation() {
        const errors = Equipment.validate(data);
        for (const [summary,list] of [['validationSummary','validation'],['tierValidationSummary','tierValidation']]) {
            $(summary).textContent = errors.length ? errors.length + ' issue(s) to fix before exporting.' : 'All equipment data is valid.';
            $(list).replaceChildren(...errors.map(message => {
                const entry = document.createElement('li'); entry.textContent = message; return entry;
            }));
        }
        $('exportGame').disabled = errors.length > 0;
        quickSave?.refresh(errors);
        return errors;
    }
    function render() { renderList(); renderForm(); renderPreview(); renderValidation(); }
    function download(name, content, type) {
        const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
        const link = document.createElement('a'); link.href = url; link.download = name;
        document.body.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    $('itemForm').addEventListener('submit', event => event.preventDefault());
    for (const [field, key] of Object.entries({itemName: 'name', itemSlot: 'slot', itemRarity: 'rarity', itemDescription: 'description', itemSprite: 'sprite'})) {
        $(field).addEventListener('change', () => { if (current()) { current()[key] = $(field).value.trim(); changed(); } });
    }
    $('itemDeveloper').addEventListener('change', () => { current().developerOnly = $('itemDeveloper').checked; changed(); renderRows(); });
    $('importSprite').addEventListener('change', async event => {
        const file = event.target.files[0];
        const item = current();
        if (!file || !item) return;
        try {
            const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[file.type];
            if (!extension) throw new Error('Choose a PNG, JPEG, WebP, or GIF image.');
            const previewUrl = URL.createObjectURL(file);
            try {
                const image = new Image(); image.src = previewUrl; await image.decode();
            } finally { URL.revokeObjectURL(previewUrl); }
            const bytes = new Uint8Array(await file.arrayBuffer());
            const hash = ItemPackage.crc32(bytes).toString(16).padStart(8, '0');
            const stem = filenameStem(item.name);
            const path = 'assets/items/' + stem + '-' + hash + '.' + extension;
            rememberAsset(path, file);
            item.sprite = path;
            changed(); renderForm();
            status('Sprite imported. The game package will include this image in ' + path + '.');
            try {
                await spriteStorage('readwrite', path, file);
            } catch {
                status('Sprite imported for this session. Browser image storage is unavailable; export the ZIP before closing.');
            }
        } catch (error) { status('Could not import sprite: ' + error.message); }
        event.target.value = '';
    });
    $('craftable').addEventListener('change', () => {
        current().recipe = $('craftable').checked ? { materials: { [Object.keys(data.materials)[0]]: 1 } } : null;
        changed(); renderRows();
    });
    $('search').addEventListener('input', renderList);
    $('filterSlot').addEventListener('change', renderList);
    $('addItem').addEventListener('click', () => {
        const equipmentType = (data.equipmentTypes || []).find(type => type.id === 'melee')?.id || data.equipmentTypes?.[0]?.id;
        const tier = (data.craftingPresets || []).filter(preset => preset.equipmentType === equipmentType).sort((a,b) => a.tier-b.tier)[0]?.tier;
        data.items.push({ id: newItemId(), name: 'New Item', slot: data.slots[0].id, rarity: 'common', description: '', sprite: '', stats: {}, recipe: null,
            ...(equipmentType && tier ? {equipmentType,tier} : {}) });
        selectedIndex = data.items.length - 1;
        $('search').value = ''; $('filterSlot').value = '';
        changed(); renderForm();
    });
    $('duplicateItem').addEventListener('click', () => {
        const item = clone(current()); item.id = newItemId(); item.name += ' Copy';
        data.items.push(item); selectedIndex = data.items.length - 1;
        $('search').value = ''; $('filterSlot').value = '';
        changed(); renderForm();
    });
    $('deleteItem').addEventListener('click', () => {
        data.items.splice(selectedIndex, 1); selectedIndex = Math.min(selectedIndex, data.items.length - 1);
        changed(); renderForm(); status('Item deleted from this draft. Undo is available.');
    });
    $('addStat').addEventListener('click', () => {
        const match = bonusFilter.filtered().find(stat => availableStat(stat.id));
        const entry = match && [match.id, Equipment.stats[match.id]];
        if (!entry) return;
        current().stats[entry[0]] = entry[1].default; changed(); renderRows();
    });
    $('addMaterial').addEventListener('click', () => {
        const id = Object.keys(data.materials).find(id => !Object.hasOwn(current().recipe.materials, id));
        if (!id) return;
        current().recipe.materials[id] = 1; changed(); renderRows();
    });
    $('undo').addEventListener('click', () => {
        const previous = history.pop(); if (!previous) return;
        data = JSON.parse(previous.data); snapshot = previous.data;
        selectedIndex = Math.min(previous.selectedIndex, data.items.length - 1);
        snapshotSelection = selectedIndex;
        try { localStorage.setItem(draftKey, snapshot); } catch { /* Export remains available. */ }
        $('undo').disabled = !history.length;
        populateSlots(); render(); status('Last item edit undone. Export to update the game.');
    });
    function replaceData(next, draft = false) {
        if (next && typeof next === 'object' && !Array.isArray(next)) {
            if (next.equipmentTypes === undefined) next.equipmentTypes = clone(projectItems.equipmentTypes || []);
            if (next.craftingPresets === undefined) next.craftingPresets = clone(projectItems.craftingPresets || []);
        }
        next = Equipment.normalizeData(next);
        const errors = Equipment.validate(next);
        const object = value => value && typeof value === 'object' && !Array.isArray(value);
        // A local work-in-progress draft may contain unfinished values or duplicate IDs.
        const editableDraft = draft && object(next) && next.schemaVersion === 2 &&
            Array.isArray(next.slots) && next.slots.length > 0 &&
            next.slots.every(slot => object(slot) && typeof slot.id === 'string' && typeof slot.name === 'string') &&
            object(next.materials) && Array.isArray(next.items) && next.items.every(item =>
                object(item) && ['id', 'name', 'slot', 'rarity', 'description', 'sprite'].every(key => typeof item[key] === 'string') &&
                object(item.stats) && (item.recipe === null || object(item.recipe) && object(item.recipe.materials)));
        if (errors.length && !editableDraft) throw new Error(errors.slice(0, 3).join(' '));
        data = next; selectedIndex = data.items.length ? 0 : -1;
        changed(); populateSlots(); render();
    }
    $('restoreDraft').addEventListener('click', async () => {
        try { replaceData(JSON.parse(localStorage.getItem(draftKey)), true); await loadDraftSprites(); status('Local draft restored. Export to apply it to the game.'); }
        catch (error) { status('Could not restore draft: ' + error.message); }
    });
    $('loadProjectItems').addEventListener('click', async () => {
        try {
            localStorage.setItem(previousDraftKey, JSON.stringify(data));
            $('restorePreviousItems').hidden = false;
            $('search').value = ''; $('filterSlot').value = '';
            replaceData(clone(projectItems)); await loadDraftSprites();
            status('Loaded current project items. Your previous editor draft is backed up; Restore previous draft brings it back.');
        } catch (error) { status('Could not load project items: ' + error.message); }
    });
    $('restorePreviousItems').addEventListener('click', async () => {
        try { replaceData(JSON.parse(localStorage.getItem(previousDraftKey)), true); await loadDraftSprites(); status('Previous editor draft restored.'); }
        catch (error) { status('Could not restore previous draft: ' + error.message); }
    });
    $('importJson').addEventListener('change', async event => {
        const file = event.target.files[0]; if (!file) return;
        try { replaceData(JSON.parse(await file.text())); await loadDraftSprites(); status('JSON imported. Review and export the game package when ready.'); }
        catch (error) { status('Could not import JSON: ' + error.message); }
        event.target.value = '';
    });
    $('chooseJson').addEventListener('click', () => $('importJson').click());
    // Save text and numerical edits while typing, including before a page switch.
    $('itemForm').addEventListener('input', event => {
        if (event.target.matches('textarea, input:not([type=file]):not([type=checkbox])')) {
            event.target.dispatchEvent(new Event('change', {bubbles: true}));
        }
    });
    ['input', 'change', 'click'].forEach(type => document.addEventListener(type, () => queueMicrotask(saveView)));
    window.addEventListener('pagehide', saveView);
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveView(); });
    $('exportJson').addEventListener('click', () => {
        download('items.json', JSON.stringify(data, null, 4) + '\n', 'application/json');
        status('JSON downloaded for backup or editor import.');
    });
    $('exportGame').addEventListener('click', async () => {
        if (renderValidation().length) return;
        const filename = (current() ? filenameStem(current().name) : 'items') + '.zip';
        try {
            const source = 'window.adventureItems = ' + JSON.stringify(data, null, 4) + ';\n';
            const entries = [{name: 'js/items.js', bytes: new TextEncoder().encode(source)}];
            for (const path of new Set(spritePaths())) {
                const asset = assets.get(path);
                if (asset) entries.push({name: path, bytes: new Uint8Array(await asset.blob.arrayBuffer())});
            }
            download(filename, ItemPackage.zip(entries), 'application/zip');
            status('Downloaded ' + filename + '. Extract into the project folder, replace the files, then reload the game.');
        } catch (error) { status('Could not export package: ' + error.message); }
    });
    try {
        const draft = localStorage.getItem(draftKey);
        const view = JSON.parse(localStorage.getItem(viewKey) || 'null');
        if (draft) {
            replaceData(JSON.parse(draft), true);
            history = [];
            $('undo').disabled = true;
            status('Resumed your local draft. Quick save or apply the game package to test changes.');
        }
        if (view) {
            if (Number.isInteger(view.selectedIndex) && data.items[view.selectedIndex]) selectedIndex = view.selectedIndex;
            snapshotSelection = selectedIndex;
            populateSlots();
            if (typeof view.search === 'string') $('search').value = view.search;
            if (data.slots.some(slot => slot.id === view.slot)) $('filterSlot').value = view.slot;
            craftingEditor.setPage(view.editorPage);
        }
    } catch (error) { status('Could not resume the saved draft: ' + error.message); }
    $('restoreDraft').disabled = !draftAvailable();
    try { $('restorePreviousItems').hidden = !localStorage.getItem(previousDraftKey); } catch { /* Export remains available. */ }
    if (projectItems.items.some(project => project.crafting && !data.items.find(item => item.id === project.id)?.crafting))
        status('Your browser draft is missing project reroll settings. Use Load project items to get the current equipment and keep a backup of your draft.');
    populateSlots(); render();
    quickSave = EditorQuickSave.create({
        key: 'items', filename: 'items.js',
        getPaths: spritePaths,
        getSource: () => 'window.adventureItems = ' + JSON.stringify(data, null, 4) + ';\n',
        validate: () => Equipment.validate(data), status,
        download: (name, source) => download(name, source, 'text/javascript')
    });
    loadDraftSprites();
})();
