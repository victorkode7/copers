(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const clone = WorldContent.clone;
    const draftKey = 'idleAdventureWorldEditorDraft';
    const viewKey = 'idleAdventureWorldEditorView';
    let data = clone(window.adventureWorld);
    let selection = {kind: 'maps', id: data.maps[0].id};
    let history = [], snapshot, snapshotSelection;
    let assetChoice = null;
    let libraryKind = 'background';
    let openDetails = new Set();
    let quickSave = null;
    const items = window.adventureItems;
    const labels = {worlds: 'Worlds', maps: 'Maps', monsters: 'Monsters'};
    const current = () => data[selection.kind].find(entry => entry.id === selection.id);
    const worldFor = map => data.worlds.find(world => world.mapIds.includes(map.id));
    const status = message => { $('status').textContent = message; };
    function id(prefix) { return prefix + '_' + Array.from(crypto.getRandomValues(new Uint8Array(12)), byte => byte.toString(16).padStart(2, '0')).join(''); }
    function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }
    function button(text, action, className) {
        const node = element('button', className, text); node.type = 'button';
        node.addEventListener('click', action); return node;
    }
    function hint(text) { return element('p', 'hint', text); }
    function saveView() {
        try { localStorage.setItem(viewKey, JSON.stringify({selection, search: $('search').value, details: [...openDetails]})); } catch { /* Export remains available. */ }
    }
    function allPaths() {
        return [...data.assets.map(asset => asset.path), ...data.monsters.map(monster => monster.sprite), ...data.worlds.map(world => world.background?.sprite), ...data.maps.flatMap(map => [map.background?.sprite, ...map.spawns.map(spawn => spawn.overrides.sprite)])].filter(Boolean);
    }
    async function restoreImages() {
        await WorldAssets.restore(allPaths());
        document.querySelectorAll('img[data-asset-path]').forEach(image => { image.src = WorldAssets.source(image.dataset.assetPath); });
        renderList(); renderPreview();
    }
    function commit(message) {
        const next = JSON.stringify(data);
        if (next !== snapshot) {
            history.push({data: snapshot, selection: snapshotSelection});
            if (history.length > 100) history.shift();
            snapshot = next; snapshotSelection = {...selection};
            try { localStorage.setItem(draftKey, next); status(message || 'Draft saved in this browser. Quick save to test changes, or use the game package for new images.'); }
            catch { status('Browser storage is full or unavailable. Export JSON and the game package to keep your work.'); }
        }
        $('undo').disabled = !history.length; $('restoreDraft').disabled = !hasDraft();
        saveView(); renderList(); renderPreview(); renderValidation();
    }
    function hasDraft() { try { return Boolean(localStorage.getItem(draftKey)); } catch { return false; } }
    function field(label, value, update, options = {}) {
        const wrapper = element('label', null, label);
        const input = element(options.multiline ? 'textarea' : 'input');
        if (!options.multiline) input.type = options.type || 'text';
        else input.rows = 3;
        input.value = value ?? '';
        if (options.id) input.id = options.id;
        if (options.placeholder) input.placeholder = options.placeholder;
        if (options.type === 'number') { input.min = options.min ?? 0; input.step = options.step ?? 'any'; }
        input.addEventListener('input', () => {
            update(options.type === 'number' ? (Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : null) : input.value);
            commit();
        });
        wrapper.append(input); return wrapper;
    }
    function select(label, value, choices, update, nodeId) {
        const wrapper = element('label', null, label), input = element('select');
        if (nodeId) input.id = nodeId;
        choices.forEach(([key, name]) => { const option = element('option', null, name); option.value = key; input.append(option); });
        input.value = value;
        input.addEventListener('change', () => { update(input.value); commit(); renderForm(); });
        wrapper.append(input); return wrapper;
    }
    function section(title) { const node = element('section', 'form-section'); node.append(element('h2', null, title)); return node; }
    function ordered(kind = selection.kind) {
        if (kind === 'maps') return data.worlds.flatMap(world => world.mapIds.map(id => data.maps.find(map => map.id === id)).filter(Boolean));
        return data[kind];
    }
    function renderList() {
        $('catalogueHeading').textContent = labels[selection.kind] + ' (' + data[selection.kind].length + ')';
        $('catalogueTabs').querySelectorAll('button').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.kind === selection.kind)));
        const query = $('search').value.toLowerCase().trim();
        $('entryList').replaceChildren();
        ordered().filter(entry => entry.name.toLowerCase().includes(query)).forEach(entry => {
            const node = button('', () => { selection.id = entry.id; snapshotSelection = {...selection}; render(); saveView(); }, 'item-entry');
            node.dataset.entryId = entry.id;
            node.setAttribute('aria-pressed', String(selection.id === entry.id));
            const copy = element('span'); copy.append(element('strong', null, entry.name || 'Unnamed entry'));
            const detail = selection.kind === 'maps' ? worldFor(entry)?.name : selection.kind === 'worlds' ? entry.mapIds.length + ' maps' : data.maps.filter(map => map.spawns.some(spawn => spawn.monsterId === entry.id)).length + ' maps';
            copy.append(element('small', null, detail || 'Unassigned')); node.append(copy); $('entryList').append(node);
        });
        if (!$('entryList').children.length) $('entryList').append(element('p', null, 'No matches.'));
        const sequence = orderSequence(), index = sequence.indexOf(selection.id);
        $('moveUp').disabled = index <= 0; $('moveDown').disabled = index < 0 || index === sequence.length - 1;
    }
    function orderSequence() {
        const entry = current();
        return selection.kind === 'maps' ? worldFor(entry)?.mapIds || [] : data[selection.kind].map(entry => entry.id);
    }
    function imageChoice(target, key, kind) {
        const wrapper = element('div', 'image-choice');
        if (WorldContent.safePath(target[key])) {
            const image = element('img'); image.alt = ''; image.dataset.assetPath = target[key]; image.src = WorldAssets.source(target[key]); wrapper.append(image);
        }
        const copy = element('div');
        const toolbar = element('div', 'toolbar');
        toolbar.append(button(target[key] ? 'Change image' : 'Choose image', () => openAssets(kind, asset => { target[key] = asset.path; commit(); renderForm(); })));
        if (target[key]) toolbar.append(button('Clear', () => { target[key] = ''; commit(); renderForm(); }));
        copy.append(toolbar, element('small', null, target[key] || 'No image assigned')); wrapper.append(copy); return wrapper;
    }
    function backgrounds(entry, isMap) {
        const node = section('Background');
        const choices = isMap ? [['inherit', 'Use world background'], ['custom', 'Map-specific background']] : [['inherit', 'Use game default'], ['custom', 'World background']];
        node.append(select('Background source', entry.background ? 'custom' : 'inherit', choices, value => {
            entry.background = value === 'custom' ? {sprite: '', color: '#172632', fit: 'cover', dim: 0.55, tileSize: 256} : null;
        }, 'backgroundMode'));
        if (entry.background) {
            const background = entry.background;
            node.append(imageChoice(background, 'sprite', 'background'));
            const grid = element('div', 'field-grid');
            grid.append(select('Image layout', background.fit, [['cover', 'Fill area'], ['contain', 'Show whole image'], ['tile', 'Repeat as tiles']], value => { background.fit = value; }, 'backgroundFit'));
            grid.append(field('Surrounding color', background.color, value => { background.color = value; }, {type: 'color', id: 'backgroundColor'}));
            grid.append(field('Darkening (%)', Math.round(background.dim * 100), value => { background.dim = value === null ? null : value / 100; }, {type: 'number', min: 0, step: 1, id: 'backgroundDim'}));
            if (background.fit === 'tile') grid.append(field('Tile display size (px)', background.tileSize, value => { background.tileSize = value; }, {type: 'number', min: 16, step: 1, id: 'backgroundTileSize'}));
            node.append(grid, hint('Darkening ranges from 0% to 90% and keeps combat text readable. Images use crisp pixel scaling.'));
        } else if (isMap) node.append(hint('This map follows its world background. Changes to that world apply here automatically.'));
        return node;
    }
    const statLabels = {health: 'Maximum health', accuracy: 'Accuracy', evasion: 'Evasion', attackDamage: 'Damage per attack', attackInterval: 'Attack interval (seconds)', respawnSeconds: 'Respawn time (seconds)', experience: 'Experience per defeat'};
    function stats(target, defaults, prefix, overrides = false) {
        const grid = element('div', 'field-grid');
        WorldContent.statFields.forEach(key => {
            const positive = ['health', 'attackInterval', 'respawnSeconds'].includes(key);
            grid.append(field(statLabels[key] + (overrides ? ' override' : ''), target[key], value => {
                if (overrides && value === null) delete target[key]; else target[key] = value;
            }, {type: 'number', min: positive ? 0.001 : 0, step: ['health', 'experience'].includes(key) ? 1 : 'any', id: prefix + '-' + key, placeholder: overrides ? 'Inherit: ' + defaults[key] : ''}));
        });
        for (let index = 0; index < 2; index++) grid.append(field(index ? 'Maximum gold' : 'Minimum gold', target.gold?.[index], value => {
            if (overrides && value === null) { delete target.gold; renderForm(); }
            else { target.gold ||= [...defaults.gold]; target.gold[index] = value; }
        }, {type: 'number', step: 1, id: prefix + '-gold-' + index, placeholder: overrides ? 'Inherit: ' + defaults.gold[index] : ''}));
        return grid;
    }
    function drops(target, kind, title) {
        const node = section(title);
        node.dataset.dropKind = kind;
        const choices = kind === 'drops' ? Object.entries(items.materials) : items.items.filter(item => !item.developerOnly).map(item => [item.id, item.name]);
        const list = target[kind] || [];
        list.forEach((drop, index) => {
            const row = element('div', 'drop-row' + (kind === 'itemDrops' ? ' equipment-drop' : ''));
            const available = choices.filter(([id]) => id === drop.id || !list.some(other => other.id === id));
            if (!available.some(([id]) => id === drop.id)) available.unshift([drop.id, 'Missing reference: ' + drop.id]);
            row.append(select(kind === 'drops' ? 'Material' : 'Equipment', drop.id, available, value => { drop.id = value; }));
            const chance = field('Chance (%)', Number.isFinite(drop.chance) ? Number((drop.chance * 100).toPrecision(12)) : null, value => { drop.chance = value === null ? null : value / 100; odds.textContent = oddsText(drop.chance); }, {type: 'number', min: 0});
            chance.querySelector('input').max = 100;
            const odds = element('small', 'drop-odds', oddsText(drop.chance)); chance.append(odds); row.append(chance);
            if (kind === 'drops') [0, 1].forEach(i => row.append(field(i ? 'Max' : 'Min', drop.amount[i], value => { drop.amount[i] = value; }, {type: 'number', min: 1, step: 1})));
            const remove = button('×', () => { list.splice(index, 1); commit(); renderForm(); }); remove.setAttribute('aria-label', 'Remove drop'); row.append(remove); node.append(row);
        });
        const available = choices.filter(([id]) => !list.some(drop => drop.id === id));
        const add = button(kind === 'drops' ? '+ Material drop' : '+ Equipment drop', () => {
            target[kind] ||= [];
            target[kind].push({id: available[0][0], chance: 1, ...(kind === 'drops' ? {amount: [1, 1]} : {})});
            commit(); renderForm();
        });
        add.disabled = !available.length; node.append(add);
        if (!list.length) node.append(hint('No drops in this table.'));
        return node;
    }
    function oddsText(chance) {
        if (!Number.isFinite(chance) || chance < 0 || chance > 1) return 'Enter 0–100%';
        if (chance === 0) return 'Never drops';
        return chance === 1 ? 'Every defeat' : 'About 1 in ' + (1 / chance).toLocaleString('en-US', {maximumFractionDigits: 2});
    }
    function spawns(map) {
        const node = section('Monsters on this map');
        node.append(hint('Use one monster type for a simple area, or add more. Copies fight at the same time. Overrides affect only this placement.'));
        map.spawns.forEach((spawn, index) => {
            const monster = data.monsters.find(monster => monster.id === spawn.monsterId);
            const row = element('div', 'spawn-entry'); row.dataset.spawnId = spawn.id;
            const grid = element('div', 'field-grid');
            grid.append(select('Monster', spawn.monsterId, data.monsters.map(monster => [monster.id, monster.name]), value => { spawn.monsterId = value; }, 'spawn-' + index + '-monster'));
            grid.append(field('Copies', spawn.count, value => { spawn.count = value; }, {type: 'number', min: 1, step: 1, id: 'spawn-' + index + '-count'}));
            row.append(grid);
            row.append(button('Edit monster definition', () => { selection = {kind: 'monsters', id: spawn.monsterId}; snapshotSelection = {...selection}; render(); saveView(); }));
            row.append(button('Remove placement', () => { map.spawns.splice(index, 1); commit(); renderForm(); }, 'danger'));
            const advanced = element('details'); advanced.append(element('summary', null, 'Placement overrides' + (Object.keys(spawn.overrides).length ? ' · active' : '')));
            if (monster) {
                advanced.append(hint('Leave a value blank to use the monster definition. Gold minimum and maximum override together.'), stats(spawn.overrides, monster, 'override-' + index, true));
                const name = field('Display name override', spawn.overrides.name || '', value => { if (value) spawn.overrides.name = value; else delete spawn.overrides.name; }); advanced.append(name);
                for (const kind of ['drops', 'itemDrops']) advanced.append(select(kind === 'drops' ? 'Material drops' : 'Equipment drops', spawn.overrides[kind] === undefined ? 'inherit' : 'override', [['inherit', 'Use monster drops'], ['override', 'Override this placement']], value => { if (value === 'inherit') delete spawn.overrides[kind]; else spawn.overrides[kind] = clone(monster[kind] || []); }));
                if (spawn.overrides.drops !== undefined) advanced.append(drops(spawn.overrides, 'drops', 'Placement material drops'));
                if (spawn.overrides.itemDrops !== undefined) advanced.append(drops(spawn.overrides, 'itemDrops', 'Placement equipment drops'));
                advanced.append(button('Reset all overrides', () => { spawn.overrides = {}; commit(); renderForm(); }));
            }
            advanced.dataset.detailKey = map.id + '-' + spawn.id + '-overrides';
            row.append(advanced); node.append(row);
        });
        const add = button('+ Monster placement', () => { map.spawns.push({id: id('spawn'), monsterId: data.monsters[0].id, count: 1, overrides: {}}); commit(); renderForm(); });
        add.id = 'addSpawn'; node.append(add); return node;
    }
    function renderForm() {
        const entry = current();
        $('entryForm').replaceChildren();
        if (!entry) { $('entryForm').append(hint('Add an entry to begin.')); return; }
        $('inspectorHeading').textContent = selection.kind === 'monsters' ? 'Monster details' : selection.kind === 'worlds' ? 'World details' : 'Map details';
        $('entryForm').append(field('Name', entry.name, value => { entry.name = value; }, {id: 'entryName'}));
        if (selection.kind === 'monsters') {
            $('entryForm').append(imageChoice(entry, 'sprite', 'monster'), stats(entry, WorldContent.defaults, 'monster'), hint('Accuracy and evasion use the same combat rules as the game. Attack interval is the time between attacks; lower values attack faster.'), drops(entry, 'drops', 'Material drops'), drops(entry, 'itemDrops', 'Equipment drops'));
            const used = data.maps.filter(map => map.spawns.some(spawn => spawn.monsterId === entry.id));
            $('entryForm').append(hint('Used on: ' + (used.map(map => map.name).join(', ') || 'No maps yet') + '. Editing this definition affects those maps unless a placement overrides the value.'));
        } else if (selection.kind === 'maps') {
            const world = worldFor(entry);
            $('entryForm').append(select('World', world?.id || '', data.worlds.map(world => [world.id, world.name]), value => {
                if (world?.id === value) return;
                if (world && world.mapIds.length === 1) { status('Keep at least one map in each world. Add another map before moving this one.'); return; }
                if (world) world.mapIds.splice(world.mapIds.indexOf(entry.id), 1);
                data.worlds.find(world => world.id === value).mapIds.push(entry.id);
            }, 'mapWorld'));
            $('entryForm').append(field('Description', entry.description, value => { entry.description = value; }, {id: 'mapDescription', multiline: true}));
            $('entryForm').append(field('Kills required to clear this map', entry.goal, value => { entry.goal = value; }, {type: 'number', min: 0, step: 1, id: 'mapGoal'}), hint('Clearing a map unlocks the next one in its world. Clearing the final map unlocks the next world. Use the arrow buttons to change order.'), backgrounds(entry, true), spawns(entry));
            const area = element('details', 'form-section'); area.dataset.detailKey = entry.id + '-area-drops'; area.append(element('summary', null, 'Additional area drops'), hint('These roll on every defeat here, in addition to each monster’s drops.'), drops(entry, 'drops', 'Area material drops'), drops(entry, 'itemDrops', 'Area equipment drops')); $('entryForm').append(area);
        } else {
            $('entryForm').append(backgrounds(entry, false));
            const maps = section('Map progression');
            entry.mapIds.forEach((id, index) => { const map = data.maps.find(map => map.id === id); if (map) maps.append(button((index + 1) + '. ' + map.name, () => { selection = {kind: 'maps', id}; snapshotSelection = {...selection}; render(); saveView(); })); });
            maps.append(hint('Select a map to edit it. World order controls which world unlocks next.')); $('entryForm').append(maps);
        }
        const advanced = element('details', 'form-section'); advanced.dataset.detailKey = entry.id + '-advanced'; advanced.append(element('summary', null, 'Advanced settings'));
        const label = element('label', null, 'Permanent internal ID'), internal = element('input'); internal.id = 'entryId'; internal.value = entry.id; internal.readOnly = true; label.append(internal);
        advanced.append(label, hint('Names can change freely. This key stays fixed so existing progress and references remain intact.')); $('entryForm').append(advanced);
        $('entryForm').querySelectorAll('details[data-detail-key]').forEach(details => {
            details.open = openDetails.has(details.dataset.detailKey);
            details.addEventListener('toggle', () => {
                if (!details.isConnected) return;
                if (details.open) openDetails.add(details.dataset.detailKey); else openDetails.delete(details.dataset.detailKey);
                saveView();
            });
        });
    }
    function renderPreview() {
        const entry = current(); $('preview').replaceChildren(); if (!entry) return;
        const map = selection.kind === 'maps' ? entry : selection.kind === 'worlds' ? data.maps.find(map => map.id === entry.mapIds[0]) : null;
        const background = map ? WorldContent.background(data, map) : null;
        const scene = element('div', 'background-preview');
        WorldContent.applyBackground(scene, background, WorldAssets.source);
        scene.append(element('strong', null, entry.name || 'Unnamed entry'));
        if (map) scene.append(element('p', 'preview-note', map.description));
        const monsters = map ? WorldContent.definitions(data, map) : [entry];
        const cards = element('div', 'preview-monsters');
        monsters.slice(0, 4).forEach(monster => {
            const card = element('div', 'preview-monster');
            if (WorldContent.safePath(monster.sprite)) { const image = element('img'); image.alt = ''; image.src = WorldAssets.source(monster.sprite); card.append(image); }
            card.append(element('strong', null, monster.name || 'Unnamed monster'), element('p', null, monster.health + ' HP · ' + monster.attackDamage + ' damage'), element('p', null, monster.attackInterval + 's attack · ' + monster.respawnSeconds + 's respawn'), element('p', null, (monster.gold || []).join('–') + ' gold · ' + monster.experience + ' XP'));
            cards.append(card);
        });
        scene.append(cards); $('preview').append(scene);
        if (monsters.length > 4) $('preview').append(element('p', 'preview-note', monsters.length + ' monsters total; showing the first four.'));
        if (map) $('preview').append(element('p', 'preview-note', 'Clear goal: ' + map.goal + ' kills. ' + (map.background ? 'Map-specific background.' : 'Background inherited from world.')));
        const list = element('ul', 'preview-loot');
        const lootMonster = monsters[0];
        if (lootMonster) {
            const materials = [...(map?.drops || []), ...(lootMonster.drops || [])], equipment = [...(map?.itemDrops || []), ...(lootMonster.itemDrops || [])];
            materials.forEach(drop => list.append(element('li', null, (items.materials[drop.id] || 'Missing material') + ' ×' + drop.amount.join('–') + ' · ' + WorldContent.chanceText(drop.chance))));
            equipment.forEach(drop => list.append(element('li', null, (items.items.find(item => item.id === drop.id)?.name || 'Missing equipment') + ' · ' + WorldContent.chanceText(drop.chance))));
        }
        $('preview').append(element('p', 'preview-note', 'Drop preview for the first monster. Each entry rolls independently.'), list);
    }
    function renderValidation() {
        const errors = WorldContent.validate(data, items);
        $('validationSummary').textContent = errors.length ? errors.length + ' issue(s) to fix before exporting.' : 'All world content is valid.';
        $('validation').replaceChildren(...errors.map(message => element('li', null, message)));
        $('exportGame').disabled = Boolean(errors.length);
        quickSave?.refresh(errors);
        return errors;
    }
    function render() { renderList(); renderForm(); renderPreview(); renderValidation(); }
    function newMap(world, name = 'New Map') {
        const map = {id: id('map'), name, description: '', goal: 10, background: null, drops: [], itemDrops: [], spawns: [{id: id('spawn'), monsterId: data.monsters[0].id, count: 1, overrides: {}}]};
        data.maps.push(map); world.mapIds.push(map.id); return map;
    }
    $('addEntry').addEventListener('click', () => {
        let entry;
        if (selection.kind === 'monsters') { entry = {...clone(WorldContent.defaults), id: id('monster'), name: 'New Monster'}; data.monsters.push(entry); }
        else if (selection.kind === 'worlds') { entry = {id: id('world'), name: 'New World', mapIds: [], background: null}; data.worlds.push(entry); newMap(entry); }
        else entry = newMap(worldFor(current()) || data.worlds[0]);
        selection.id = entry.id; $('search').value = ''; commit(); renderForm();
    });
    $('duplicateEntry').addEventListener('click', () => {
        const original = current(); if (!original) return;
        const copy = clone(original); copy.id = id(selection.kind.slice(0, -1)); copy.name += ' Copy';
        if (selection.kind === 'maps') { copy.spawns.forEach(spawn => { spawn.id = id('spawn'); }); worldFor(original).mapIds.splice(worldFor(original).mapIds.indexOf(original.id) + 1, 0, copy.id); }
        if (selection.kind === 'worlds') copy.mapIds = original.mapIds.map(mapId => {
            const map = clone(data.maps.find(map => map.id === mapId)); map.id = id('map'); map.name += ' Copy'; map.spawns.forEach(spawn => { spawn.id = id('spawn'); }); data.maps.push(map); return map.id;
        });
        data[selection.kind].push(copy); selection.id = copy.id; $('search').value = ''; commit(); renderForm();
    });
    $('deleteEntry').addEventListener('click', () => {
        const entry = current(); if (!entry) return;
        if (data[selection.kind].length === 1) { status('Keep at least one ' + selection.kind.slice(0, -1) + '.'); return; }
        if (selection.kind === 'monsters') {
            const maps = data.maps.filter(map => map.spawns.some(spawn => spawn.monsterId === entry.id));
            if (maps.length) { status('Replace this monster on these maps before deleting it: ' + maps.map(map => map.name).join(', ') + '.'); return; }
        }
        if (selection.kind === 'maps') {
            const world = worldFor(entry);
            if (world.mapIds.length === 1) { status('Keep at least one map in each world. Delete the world to remove it with its maps.'); return; }
            world.mapIds.splice(world.mapIds.indexOf(entry.id), 1);
        }
        if (selection.kind === 'worlds') data.maps = data.maps.filter(map => !entry.mapIds.includes(map.id));
        data[selection.kind].splice(data[selection.kind].indexOf(entry), 1);
        selection.id = data[selection.kind][0].id; commit('Entry deleted from this draft. Undo is available.'); renderForm();
    });
    function move(delta) {
        const sequence = orderSequence(), index = sequence.indexOf(selection.id), next = index + delta;
        if (index < 0 || next < 0 || next >= sequence.length) return;
        [sequence[index], sequence[next]] = [sequence[next], sequence[index]];
        if (selection.kind !== 'maps') data[selection.kind].sort((a, b) => sequence.indexOf(a.id) - sequence.indexOf(b.id));
        commit(); renderForm();
    }
    $('moveUp').addEventListener('click', () => move(-1)); $('moveDown').addEventListener('click', () => move(1));
    $('catalogueTabs').addEventListener('click', event => {
        const tab = event.target.closest('[data-kind]'); if (!tab) return;
        selection = {kind: tab.dataset.kind, id: data[tab.dataset.kind][0].id}; snapshotSelection = {...selection}; $('search').value = ''; render(); saveView();
    });
    $('search').addEventListener('input', () => { renderList(); saveView(); });
    $('entryForm').addEventListener('submit', event => event.preventDefault());
    $('undo').addEventListener('click', () => {
        const previous = history.pop(); if (!previous) return;
        data = JSON.parse(previous.data); selection = previous.selection; snapshot = previous.data; snapshotSelection = {...selection};
        try { localStorage.setItem(draftKey, snapshot); } catch { /* Export remains available. */ }
        $('undo').disabled = !history.length; render(); saveView(); status('Last content edit undone.');
    });
    function library() {
        const records = new Map(data.assets.filter(asset => asset.kind === libraryKind).map(asset => [asset.path, asset]));
        if (libraryKind === 'monster') data.monsters.forEach(monster => { if (monster.sprite && !records.has(monster.sprite)) records.set(monster.sprite, {name: monster.name, path: monster.sprite, kind: 'monster'}); });
        else [...data.worlds, ...data.maps].forEach(entry => { if (entry.background?.sprite && !records.has(entry.background.sprite)) records.set(entry.background.sprite, {name: entry.name, path: entry.background.sprite, kind: 'background'}); });
        return [...records.values()];
    }
    function renderLibrary() {
        const query = $('assetSearch').value.trim().toLowerCase(); $('assetLibrary').replaceChildren();
        library().filter(asset => asset.name.toLowerCase().includes(query)).forEach(asset => {
            const node = button('', () => useAsset(asset)); const image = element('img'); image.src = WorldAssets.source(asset.path); image.alt = ''; node.append(image, element('span', null, asset.name)); $('assetLibrary').append(node);
        });
        if (!$('assetLibrary').children.length) $('assetLibrary').append(hint('No matching images yet. Import one or enter an existing project path.'));
    }
    function openAssets(kind, choose) {
        assetChoice = choose; libraryKind = kind; $('assetSearch').value = ''; $('assetPath').value = ''; $('assetStatus').textContent = ''; $('assetHeading').textContent = kind === 'monster' ? 'Choose monster sprite' : 'Choose area background'; renderLibrary(); $('assetDialog').showModal();
    }
    function useAsset(asset) {
        if (!data.assets.some(entry => entry.path === asset.path && entry.kind === asset.kind)) data.assets.push({name: asset.name, path: asset.path, kind: asset.kind});
        assetChoice?.(asset); $('assetDialog').close(); assetChoice = null;
    }
    $('assetSearch').addEventListener('input', renderLibrary);
    $('closeAssets').addEventListener('click', () => { $('assetDialog').close(); assetChoice = null; });
    $('assetDialog').addEventListener('cancel', () => { assetChoice = null; });
    $('useAssetPath').addEventListener('click', () => {
        const path = $('assetPath').value.trim();
        if (!WorldContent.safePath(path)) { $('assetStatus').textContent = 'Use a local PNG, JPEG, WebP, GIF, or SVG image path.'; return; }
        useAsset({name: path.split('/').pop().replace(/\.[^.]+$/, ''), path, kind: libraryKind});
    });
    $('importAsset').addEventListener('change', async event => {
        const file = event.target.files[0]; if (!file || !assetChoice) return;
        // Keep the target fixed while image decoding/storage completes.
        const choose = assetChoice, kind = libraryKind;
        try {
            const asset = await WorldAssets.importImage(file, kind);
            if (!data.assets.some(entry => entry.path === asset.path && entry.kind === kind)) data.assets.push({name: asset.name, path: asset.path, kind});
            if (assetChoice === choose) { choose(asset); $('assetDialog').close(); assetChoice = null; }
            else commit();
            if (!asset.persisted) status('Image imported for this session. Export the ZIP before leaving because browser image storage is unavailable.');
        } catch (error) { $('assetStatus').textContent = 'Could not import image: ' + error.message; }
        event.target.value = '';
    });
    function replaceData(next, draft = false) {
        const errors = WorldContent.validate(next, items);
        if (errors.length && !(draft && editableDraft(next))) throw new Error(errors.slice(0, 3).join(' '));
        data = next; selection = {kind: 'maps', id: data.maps[0].id}; commit(); render();
    }
    function editableDraft(next) {
        const object = value => value && typeof value === 'object' && !Array.isArray(value);
        const entry = value => object(value) && typeof value.id === 'string' && typeof value.name === 'string';
        const drops = value => value === undefined || Array.isArray(value) && value.every(drop => object(drop) && typeof drop.id === 'string' && (drop.amount === undefined || Array.isArray(drop.amount) && drop.amount.length === 2));
        return object(next) && next.schemaVersion === 1 && ['worlds', 'maps', 'monsters', 'assets'].every(key => Array.isArray(next[key])) && next.worlds.length && next.maps.length && next.monsters.length &&
            next.worlds.every(world => entry(world) && Array.isArray(world.mapIds) && world.mapIds.every(id => typeof id === 'string')) &&
            next.maps.every(map => entry(map) && typeof map.description === 'string' && drops(map.drops) && drops(map.itemDrops) && Array.isArray(map.spawns) && map.spawns.every(spawn => object(spawn) && typeof spawn.id === 'string' && typeof spawn.monsterId === 'string' && object(spawn.overrides) && drops(spawn.overrides.drops) && drops(spawn.overrides.itemDrops))) &&
            next.monsters.every(monster => entry(monster) && Array.isArray(monster.gold) && monster.gold.length === 2 && typeof monster.sprite === 'string' && drops(monster.drops) && drops(monster.itemDrops)) &&
            next.assets.every(asset => object(asset) && typeof asset.name === 'string' && typeof asset.path === 'string');
    }
    $('restoreDraft').addEventListener('click', async () => {
        try { replaceData(JSON.parse(localStorage.getItem(draftKey)), true); await restoreImages(); status('Local draft restored.'); }
        catch (error) { status('Could not restore draft: ' + error.message); }
    });
    $('chooseJson').addEventListener('click', () => $('importJson').click());
    $('importJson').addEventListener('change', async event => {
        const file = event.target.files[0]; if (!file) return;
        try { replaceData(JSON.parse(await file.text())); await restoreImages(); status('JSON imported. Quick save or apply the game package to test changes.'); }
        catch (error) { status('Could not import JSON: ' + error.message); }
        event.target.value = '';
    });
    function download(name, blob) {
        const url = URL.createObjectURL(blob), link = element('a'); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    $('exportJson').addEventListener('click', () => { download('world-content.json', new Blob([JSON.stringify(data, null, 4) + '\n'], {type: 'application/json'})); status('JSON downloaded. Keep the game ZIP for imported images.'); });
    $('exportGame').addEventListener('click', async () => {
        if (renderValidation().length) return;
        const exported = clone(data), filename = WorldAssets.stem(current()?.name || 'world-content') + '-world-content.zip';
        $('exportGame').disabled = true;
        try {
            const paths = allPaths();
            const entries = [{name: 'js/world-content.js', bytes: new TextEncoder().encode('window.adventureWorld = ' + JSON.stringify(exported, null, 4) + ';\n')}, ...await WorldAssets.packageEntries(paths)];
            download(filename, ItemPackage.zip(entries)); status('Downloaded ' + filename + '. Extract into the project folder. Existing images referenced by path stay in your project.');
        } catch (error) { status('Could not export package: ' + error.message); }
        finally { renderValidation(); }
    });
    try {
        const draft = localStorage.getItem(draftKey);
        if (draft) {
            const restored = JSON.parse(draft);
            if (!editableDraft(restored)) throw new Error('Invalid draft structure.');
            data = restored; status('Resumed your local world-editor draft. Quick save or apply the game package to test changes.');
        }
        const view = JSON.parse(localStorage.getItem(viewKey) || 'null');
        if (view && Object.hasOwn(labels, view.selection?.kind) && data[view.selection.kind].some(entry => entry.id === view.selection.id)) selection = view.selection;
        if (typeof view?.search === 'string') $('search').value = view.search;
        if (Array.isArray(view?.details)) openDetails = new Set(view.details.filter(key => typeof key === 'string'));
    } catch { status('Could not resume browser storage. The project content is available.'); }
    // Seed reusable existing backgrounds without assigning them to any area.
    for (const asset of [{name: 'Brick texture', path: 'assets/ui/brick128.png', kind: 'background'}, {name: 'Skill tree artwork', path: 'assets/skilltree-background.png', kind: 'background'}]) {
        if (!data.assets.some(entry => entry.path === asset.path)) data.assets.push(asset);
    }
    if (!current()) selection = {kind: 'maps', id: data.maps[0].id};
    snapshot = JSON.stringify(data); snapshotSelection = {...selection};
    $('restoreDraft').disabled = !hasDraft(); window.addEventListener('pagehide', saveView);
    quickSave = EditorQuickSave.create({
        key: 'world-content', filename: 'world-content.js',
        getPaths: () => allPaths().filter(WorldContent.safePath),
        getSource: () => 'window.adventureWorld = ' + JSON.stringify(data, null, 4) + ';\n',
        validate: () => WorldContent.validate(data, items), status,
        download: (name, source) => download(name, new Blob([source], {type: 'text/javascript'}))
    });
    render(); restoreImages();
}());
