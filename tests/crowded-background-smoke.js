(async function () {
    const checks = [];
    function check(label, condition) { checks.push((condition ? 'PASS ' : 'FAIL ') + label); if (!condition) throw new Error(label); }
    try {
        const world = worldData[1], map = mapsForWorld(world.id)[8];
        state.selectedWorld = world.id; state.selectedMap = map.id; state.currentView = 'map';
        resetMonsterStates(map); render();
        const count = monsterDefinitions(map).length;
        check('World 2 map 9 keeps every monster card', elements.enemyRoster.children.length === count && count >= 20);
        const panelHeight = elements.combatPanel.offsetHeight;
        check('all enemies fit without an internal scrollbar', elements.enemyRoster.scrollHeight <= elements.enemyRoster.clientHeight + 1 && getComputedStyle(elements.enemyRoster).overflowY === 'visible');
        const background = elements.combatPanel.querySelector('.combat-background-art');
        await background.decode();
        check('the map retains its chosen background artwork', background.getAttribute('src') === WorldContent.background(worldContent, map).sprite);
        const scene = background.getBoundingClientRect();
        check('combat scenery appears once at its natural aspect ratio', elements.combatPanel.querySelectorAll('.combat-background-art').length === 1 && elements.combatPanel.style.backgroundImage === 'none' && Math.abs(scene.width / scene.height - background.naturalWidth / background.naturalHeight) < 0.01);
        check('artwork fades into the map color without blocking controls', getComputedStyle(background).maskImage.includes('linear-gradient') && getComputedStyle(background).pointerEvents === 'none');
        const width = elements.combatPanel.clientWidth;
        const spawn = map.spawns[0]; spawn.count += 30;
        resetMonsterStates(map); render();
        const newScene = background.getBoundingClientRect();
        check('adding more monsters grows the list without changing artwork scale', elements.combatPanel.offsetHeight > panelHeight && elements.combatPanel.clientWidth === width && elements.combatPanel.querySelector('.combat-background-art') === background && newScene.width === scene.width && newScene.height === scene.height);
        const finalCard = elements.enemyRoster.lastElementChild.getBoundingClientRect(), viewport = elements.enemyRoster.getBoundingClientRect();
        check('the final monster is part of the full list without clipping', finalCard.bottom <= viewport.bottom + 1 && finalCard.bottom > viewport.top && elements.enemyRoster.scrollHeight <= elements.enemyRoster.clientHeight + 1);
        showPoisonTransfer(state.monsterStates[0].id, state.monsterStates.at(-1).id);
        const effect = elements.combatPanel.querySelector('.poison-transfer');
        check('poison transfer effects can connect enemies across the full list', Boolean(effect?.querySelector('line')));
        const preview = document.createElement('div');
        WorldContent.applyBackground(preview, WorldContent.background(worldContent, map));
        check('map buttons and editor previews keep their normal cover setting', preview.style.backgroundSize === 'auto, cover' && preview.style.backgroundRepeat === 'no-repeat');
        const testPanel = document.createElement('div'); testPanel.className = 'combat-panel';
        WorldContent.applyBackground(testPanel, WorldContent.background(worldContent, map));
        WorldContent.applyBackground(testPanel, {sprite: 'assets/ui/brick128.png', fit: 'tile', color: '#172632', tileSize: 128, dim: 0.5});
        check('switching to a tiled background removes the previous scenery', !testPanel.querySelector('.combat-background-art') && testPanel.style.backgroundRepeat === 'no-repeat, repeat');
        WorldContent.applyBackground(testPanel, null);
        check('clearing a background removes its image and color', !testPanel.querySelector('img') && !testPanel.style.backgroundImage && !testPanel.style.backgroundColor);
        check('no runtime errors', !window.smokeErrors.length); checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    const report = document.createElement('pre'); report.id = 'smoke-results'; report.textContent = checks.join('\n'); document.body.append(report);
}());
