(async function () {
    const checks = [];
    const check = (label, ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + label); if (!ok) throw new Error(label); };
    const clone = value => JSON.parse(JSON.stringify(value));
    const fileInput = document.getElementById('importProfileFile');
    const status = document.getElementById('profileStatus');
    const importButton = document.getElementById('importProfile');
    const exportButton = document.getElementById('exportProfile');
    const settle = () => new Promise(resolve => setTimeout(resolve, 5));
    async function importFile(text, name = 'backup.json') {
        const files = new DataTransfer();
        files.items.add(new File([text], name, {type: 'application/json'}));
        fileInput.files = files.files;
        fileInput.dispatchEvent(new Event('change'));
        for (let attempt = 0; importButton.disabled && attempt < 500; attempt++) await settle();
        if (importButton.disabled) throw new Error('Import did not finish.');
    }
    const wrap = save => JSON.stringify({format: 'idle-adventure-profile', version: 1, save});
    const deadline = setTimeout(() => {
        const report = document.createElement('pre'); report.id = 'smoke-results';
        report.textContent = checks.join('\n') + '\nERROR test timed out; phase=' + document.body.dataset.profileTestPhase + '; errors=' + window.smokeErrors.join(', ');
        document.body.append(report);
    }, 12000);
    try {
        document.body.dataset.profileTestPhase = 'fonts';
        await document.fonts.ready;
        document.body.dataset.profileTestPhase = 'export';
        const group = document.getElementById('resetGame').parentElement;
        check('export and import sit next to Reset Game', group.contains(exportButton) && group.contains(importButton));
        const buttonBounds = [...document.querySelectorAll('.navbar button')].map(button => button.getBoundingClientRect());
        check('navigation controls fit without overlapping at this viewport size', buttonBounds.every((bounds, i) =>
            bounds.left >= 0 && bounds.right <= document.documentElement.clientWidth && buttonBounds.every((other, j) =>
                i === j || bounds.right <= other.left + 1 || other.right <= bounds.left + 1 || bounds.bottom <= other.top + 1 || other.bottom <= bounds.top + 1)));

        state.gold = 12345;
        state.kills = Object.fromEntries(mapData.map(map => [map.id, map.goal + 3]));
        state.materials.gel = 321;
        state.materials.hide = 54;
        state.level = 4; state.experience = 42; state.skillPoints = 3;
        const skill = skillNodes.find(node => !node.start && skillNodeRequirementsMet(node, id => skillNodeById[id].start));
        state.skillRanks = {[skill.id]: 1};
        state.upgrades = {strength: 2, haste: 1, evasion: 3};
        state.ownedItemIds = ['testAmulet', 'testDropHelm'];
        state.crafted = ['testAmulet'];
        state.gear = {...createEmptyGear(), necklace: 'testAmulet', helmet: 'testDropHelm'};
        state.selectedWorld = worldData[1].id;
        state.selectedMap = worldData[1].mapIds[1];
        state.lastMapByWorld[state.selectedWorld] = state.selectedMap;
        state.currentView = 'inventory'; state.isInTown = true;
        resetMonsterStates(currentMap());
        state.monsterStates[0].hp -= 1;
        state.monsterStates[0].attackTimer = .35;
        syncLegacyEnemyState();
        state.playerHp = 0; state.combatPaused = true; state.attackTimer = .37;
        state.lootLog = ['A previous drop']; state.lastDrop = 'A previous drop';
        state.developerItemsEnabled = true;
        resetCombatClock();
        render();
        const expected = clone(createGameSave());

        const originalCreate = URL.createObjectURL, originalClick = HTMLAnchorElement.prototype.click;
        let downloadedBlob, downloadedName;
        try {
            URL.createObjectURL = blob => { downloadedBlob = blob; return 'blob:profile-smoke'; };
            HTMLAnchorElement.prototype.click = function () { downloadedName = this.download; };
            // The exported file must use live progress even when browser storage is stale.
            localStorage.setItem(saveKey, '{}');
            exportButton.click();
        } finally {
            URL.createObjectURL = originalCreate;
            HTMLAnchorElement.prototype.click = originalClick;
        }
        const backupText = await downloadedBlob.text(), backup = JSON.parse(backupText);
        check('export downloads a dated JSON backup of current progress', /^idle-adventure-profile-.*\.json$/.test(downloadedName) &&
            downloadedBlob.type === 'application/json' && backup.format === 'idle-adventure-profile' && backup.version === 1 &&
            Number.isFinite(Date.parse(backup.exportedAt)) && backup.save.gold === expected.gold && backup.save.materials.gel === 321);

        state.gold = 1; state.materials.gel = 0; state.level = 0; state.skillPoints = 0; state.skillRanks = {};
        state.ownedItemIds = []; state.gear = createEmptyGear(); state.selectedMap = mapData[0].id;
        state.currentView = 'town'; state.developerItemsEnabled = false;
        pendingSkillRanks = {[skill.id]: 1}; refundMode = true;
        document.body.dataset.profileTestPhase = 'import';
        await importFile(backupText);
        check('import restores gold, materials, level, experience, upgrades and skills', state.gold === expected.gold &&
            state.materials.gel === 321 && state.materials.hide === 54 && state.level === 4 && state.experience === 42 &&
            state.skillPoints === 3 && JSON.stringify(state.skillRanks) === JSON.stringify(expected.skillRanks) &&
            JSON.stringify(state.upgrades) === JSON.stringify(expected.upgrades));
        check('import restores equipment, inventory, map unlocks and selected destination', state.gear.necklace === 'testAmulet' &&
            state.gear.helmet === 'testDropHelm' && state.ownedItemIds.length === 2 && state.crafted.includes('testAmulet') &&
            state.selectedWorld === expected.selectedWorld && state.selectedMap === expected.selectedMap &&
            JSON.stringify(state.kills) === JSON.stringify(expected.kills) && worldIsUnlocked(1));
        check('combat timers, health, monster health, loot and tutorials survive', state.playerHp === 0 && state.combatPaused &&
            state.attackTimer === .37 && state.monsterStates[0].hp === expected.monsterStates[0].hp &&
            state.monsterStates[0].attackTimer === .35 && state.lootLog[0] === 'A previous drop' &&
            JSON.stringify(state.tutorials) === JSON.stringify(expected.tutorials));
        check('restored UI and developer options update immediately and uncommitted skills clear', state.currentView === 'inventory' &&
            !elements.inventoryView.hidden && elements.gold.textContent === '12,345' && !Object.keys(pendingSkillRanks).length &&
            !refundMode && document.getElementById('developerItems').checked && !status.classList.contains('is-error'));
        check('the imported profile is saved and reloads through the normal loader', JSON.parse(localStorage.getItem(saveKey)).gold === expected.gold &&
            loadGame() && state.gold === expected.gold && state.gear.necklace === 'testAmulet');

        const unchangedState = JSON.stringify(state), unchangedSave = localStorage.getItem(saveKey);
        document.body.dataset.profileTestPhase = 'invalid files';
        const invalid = [
            'not json', 'null', '[]', '42', '{"version":3}', JSON.stringify(window.adventureWorld),
            wrap({...clone(expected), gold: -1}), wrap({...clone(expected), materials: {...expected.materials, gel: -1}}),
            wrap({...clone(expected), level: 1e100}), wrap({...clone(expected), experience: -1}),
            wrap({...clone(expected), skillPoints: 0}), wrap({...clone(expected), monsterStates: [{id: 'bad', hp: -1}]}),
            wrap({...clone(expected), version: 99}), JSON.stringify({format: 'idle-adventure-profile', version: 99, save: expected})
        ];
        for (const text of invalid) {
            await importFile(text);
            check('invalid backup rejected without changing state or save (' + invalid.indexOf(text) + ')',
                status.classList.contains('is-error') && status.textContent.includes('kept') &&
                JSON.stringify(state) === unchangedState && localStorage.getItem(saveKey) === unchangedSave);
        }
        const originalSetItem = Storage.prototype.setItem;
        try {
            Storage.prototype.setItem = function () { throw new DOMException('Blocked', 'QuotaExceededError'); };
            await importFile(wrap({...clone(expected), gold: 98765}));
            check('storage failures preserve the running game and saved progress', JSON.stringify(state) === unchangedState &&
                localStorage.getItem(saveKey) === unchangedSave && status.textContent.includes('could not store'));
        } finally { Storage.prototype.setItem = originalSetItem; }
        fileInput.dispatchEvent(new Event('change'));
        check('cancelled selection is harmless and the picker is cleared', fileInput.value === '' && !importButton.disabled &&
            JSON.stringify(state) === unchangedState && localStorage.getItem(saveKey) === unchangedSave);
        await importFile(backupText);
        state.gold = 1;
        await importFile(backupText);
        check('the same backup can be imported repeatedly', state.gold === expected.gold && !status.classList.contains('is-error'));

        const legacy = clone(expected);
        document.body.dataset.profileTestPhase = 'legacy';
        legacy.version = 2; legacy.uniqueItems = {testDropHelm: true}; delete legacy.ownedItemIds;
        legacy.gear.armor = legacy.gear.chest; delete legacy.gear.chest;
        delete legacy.developerItemsEnabled; delete legacy.developerTravelEnabled; delete legacy.tutorials;
        await importFile('\uFEFF' + JSON.stringify(legacy));
        check('raw legacy saves migrate, including equipment slots and unique ownership', !status.classList.contains('is-error') &&
            state.ownedItemIds.includes('testDropHelm') && state.gear.helmet === 'testDropHelm' && Object.hasOwn(state.gear, 'chest') &&
            !Object.hasOwn(state.gear, 'armor') && JSON.parse(localStorage.getItem(saveKey)).version === SaveCompatibility.version);
        const versionOne = clone(legacy); versionOne.version = 1; versionOne.level++;
        await importFile(JSON.stringify(versionOne));
        check('version one backups preserve the migrated level and skill points', state.level === expected.level &&
            state.skillPoints === expected.skillPoints && !status.classList.contains('is-error'));

        const noTarget = clone(expected); noTarget.targetMonsterId = null;
        await importFile(wrap(noTarget));
        check('backups with no current monster target are valid', !status.classList.contains('is-error') && Boolean(state.targetMonsterId));
        const changedContent = clone(expected); changedContent.selectedMap = 'removed-map';
        await importFile(wrap(changedContent));
        check('removed maps fall back safely while retaining progress', !status.classList.contains('is-error') &&
            mapData.some(map => map.id === state.selectedMap) && state.gold === expected.gold);

        const before = captureOfflineRecapProgress();
        document.body.dataset.profileTestPhase = 'offline catch-up';
        const absent = clone(expected); absent.lastSimulatedAt = Date.now() - 10000;
        await importFile(wrap(absent));
        for (let attempt = 0; pendingCombatSeconds >= gameTickSeconds && attempt < 200; attempt++) await settle();
        check('restoring an older backup uses normal offline catch-up and recap', pendingCombatSeconds < gameTickSeconds &&
            document.getElementById('offlineRecap').open && offlineRecapReport.elapsedSeconds >= 10 && state.gold === before.gold);
        dismissOfflineRecap();
        check('imports finish with controls available and no runtime errors', !document.querySelector('main').inert &&
            !importButton.disabled && !exportButton.disabled && !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    clearTimeout(deadline);
    clearOfflineRecap(); resetCombatClock();
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
