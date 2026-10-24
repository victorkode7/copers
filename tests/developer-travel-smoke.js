(function () {
    const checks = [];
    const toggle = document.querySelector('#developerTravel');
    function check(label, condition) { checks.push((condition ? 'PASS ' : 'FAIL ') + label); if (!condition) throw new Error(label); }
    function setEnabled(enabled) { toggle.checked = enabled; toggle.dispatchEvent(new Event('change', {bubbles: true})); }
    try {
        state.kills = Object.fromEntries(mapData.map(map => [map.id, 0]));
        state.currentView = 'map'; render();
        const kills = JSON.stringify(state.kills);
        check('normal progression starts with later maps and worlds locked', !mapIsUnlocked(mapsForWorld(worldData[0].id), 1) && !worldIsUnlocked(1));
        setEnabled(true);
        check('developer travel reveals all worlds', !elements.worldPanel.hidden && [...elements.worldList.children].every(button => !button.disabled));
        check('enabling developer travel expands the map list', state.mapListExpanded);
        for (const world of worldData) {
            elements.worldList.querySelector('[data-world="' + world.id + '"]').click();
            check('all maps are selectable in ' + world.name, [...elements.mapList.children].every(button => !button.disabled));
            for (const map of mapsForWorld(world.id)) {
                elements.mapList.querySelector('[data-map="' + map.id + '"]').click();
                check('can travel to ' + map.name, state.selectedWorld === world.id && state.selectedMap === map.id);
            }
        }
        const destination = state.selectedMap;
        saveGame(); state.developerTravelEnabled = false;
        check('developer travel and the selected destination survive loading', loadGame() && state.developerTravelEnabled && state.selectedMap === destination);
        setEnabled(false);
        const worlds = worldData.findIndex(world => world.id === state.selectedWorld);
        const maps = mapsForWorld(state.selectedWorld), index = maps.findIndex(map => map.id === state.selectedMap);
        check('disabling travel restores requirements and returns to an earned destination', !worldIsUnlocked(1) && !mapIsUnlocked(mapsForWorld(worldData[0].id), 1) && worldIsUnlocked(worlds) && mapIsUnlocked(maps, index));
        check('bypassing requirements never changes kill counts', JSON.stringify(state.kills) === kills);
        saveGame();
        const legacy = JSON.parse(localStorage.getItem(saveKey)); delete legacy.developerTravelEnabled;
        localStorage.setItem(saveKey, JSON.stringify(legacy));
        check('older saves default the new option to off', loadGame() && !state.developerTravelEnabled);
        check('no runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
