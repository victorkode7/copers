(async function() {
    const saved = location.hash ? JSON.parse(decodeURIComponent(location.hash.slice(1))) : {checks: [], reloaded: false};
    const checks = saved.checks;
    const $ = id => document.getElementById(id);
    function check(label, condition) { checks.push((condition ? 'PASS ' : 'FAIL ') + label); if (!condition) throw new Error(label); }
    function input(id, value) { $(id).value = value; $(id).dispatchEvent(new Event('input', {bubbles: true})); }
    async function until(predicate) {
        for (let i = 0; i < 150; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 25)); }
        throw new Error('Timed out waiting for skill sprite: ' + $('toast').textContent);
    }
    const blobs = new Map(), downloads = [];
    const originalUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = originalUrl(blob); blobs.set(url, blob); return url; };
    HTMLAnchorElement.prototype.click = function() { downloads.push({name: this.download, blob: blobs.get(this.href)}); };
    async function exportArchive() {
        $('exportJs').click(); await until(() => downloads.some(file => file.name === 'quickHands.zip'));
        const archive = downloads.find(file => file.name === 'quickHands.zip');
        const bytes = new Uint8Array(await archive.blob.arrayBuffer());
        const view = new DataView(bytes.buffer); const files = []; let offset = 0;
        while (view.getUint32(offset, true) === 0x04034b50) {
            const length = view.getUint32(offset + 18, true), nameLength = view.getUint16(offset + 26, true);
            const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + nameLength));
            const contents = bytes.slice(offset + 30 + nameLength, offset + 30 + nameLength + length);
            check('skill ZIP CRC matches ' + name, ItemPackage.crc32(contents) === view.getUint32(offset + 14, true));
            files.push({name, contents}); offset += 30 + nameLength + length;
        }
        check('skill ZIP contains full tree and imported sprite', files.length === 2 && files[0].name === 'js/skill-tree.js' && files[1].name === $('nodeSprite').value);
        const source = new TextDecoder().decode(files[0].contents);
        const tree = JSON.parse(source.slice(source.indexOf('=') + 1).trim().replace(/;$/, ''));
        check('export retains every node and sprite path', tree.nodes.length === window.adventureSkillTree.nodes.length && tree.nodes.find(node => node.id === 'quickHands').sprite === $('nodeSprite').value);
        const encoded = document.createElement('pre'); encoded.id = 'archive-results'; encoded.hidden = true;
        encoded.textContent = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join('')); document.body.append(encoded);
    }
    try {
        if (!saved.reloaded) {
            document.querySelector('[data-node-id="quickHands"]').click();
            check('existing skills retain fallback symbols', !$('nodeSpritePreview').querySelector('img'));
            input('nodeSprite', 'tests/fixtures/equipment-sprite.svg');
            check('manual sprite paths render on editor canvas and list', document.querySelector('[data-node-id="quickHands"] img') && document.querySelector('.graph-node[data-node-id="quickHands"] img'));
            document.querySelector('[data-view-mode="player"]').click();
            for (const size of [1, 1.25, 1.5]) {
                input('nodeSize', String(size));
                const card = document.querySelector('.graph-node[data-node-id="quickHands"]');
                const image = card.querySelector('img'), icon = card.querySelector('.graph-node-icon');
                const frame = getComputedStyle(card), picture = getComputedStyle(image), clip = getComputedStyle(icon);
                const diameter = parseFloat(frame.width) - parseFloat(frame.borderLeftWidth) - parseFloat(frame.borderRightWidth);
                check('player preview sprite fills circular node at size ' + size, Math.abs(parseFloat(picture.width) - diameter) < 0.01 && Math.abs(parseFloat(picture.height) - diameter) < 0.01 && picture.objectFit === 'cover' && clip.borderRadius === '50%' && clip.overflow === 'hidden');
            }
            input('nodeSize', '1');
            document.querySelector('[data-node-id="origin"]').click();
            for (const mode of ['player', 'detailed']) {
                document.querySelector('[data-view-mode="' + mode + '"]').click();
                for (const size of [1, 1.25, 1.5]) {
                    input('nodeSize', String(size));
                    const root = document.querySelector('.graph-node[data-node-id="origin"]').getBoundingClientRect();
                    const stage = $('graphStage'), frame = stage.getBoundingClientRect();
                    const scale = frame.width / stage.offsetWidth;
                    const x = frame.left + parseFloat(stage.style.getPropertyValue('--skill-tree-background-x')) * scale;
                    const y = frame.top + parseFloat(stage.style.getPropertyValue('--skill-tree-background-y')) * scale;
                    check('editor background centers on starting node in ' + mode + ' view at size ' + size, Math.abs(x - root.left - root.width / 2) < 0.1 && Math.abs(y - root.top - root.height / 2) < 0.1);
                }
            }
            input('nodeSize', '1');
            document.querySelector('[data-node-id="quickHands"]').click();
            document.querySelector('[data-view-mode="detailed"]').click();
            input('nodeSprite', '');
            check('clearing sprite restores fallback symbol', !$('nodeSpritePreview').querySelector('img') && $('nodeSpritePreview').textContent === $('nodeIcon').value);
            const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='), c => c.charCodeAt(0));
            const transfer = new DataTransfer(); transfer.items.add(new File([png], 'skill.png', {type: 'image/png'}));
            $('nodeSpriteFile').files = transfer.files; $('nodeSpriteFile').dispatchEvent(new Event('change'));
            await until(() => $('toast').textContent.startsWith('Sprite imported.'));
            check('skill import creates separate asset path', /^assets\/skills\/quickHands-[a-f0-9]+\.png$/.test($('nodeSprite').value));
            check('import previews without extracting files', $('nodeSpritePreview').querySelector('img')?.src.startsWith('blob:'));
            check('preview uses crisp 64px scaling', getComputedStyle($('nodeSpritePreview').querySelector('img')).width === '64px' && getComputedStyle($('nodeSpritePreview').querySelector('img')).imageRendering === 'pixelated');
            $('exportJson').click(); const json = JSON.parse(await downloads.at(-1).blob.text());
            check('skill JSON includes paths without embedded images', json.nodes.find(node => node.id === 'quickHands').sprite === $('nodeSprite').value && !JSON.stringify(json).includes('data:image'));
            await exportArchive();
            await Promise.resolve();
            check('draft excludes file input values', !Object.hasOwn(JSON.parse(localStorage.getItem('idleAdventureSkillEditorDraft')).inspector.fields, 'nodeSpriteFile'));
            location.hash = encodeURIComponent(JSON.stringify({checks, reloaded: true})); location.reload(); return;
        }
        check('skill selection and sprite path resume after reload', $('nodeId').value === 'quickHands' && $('nodeSprite').value.startsWith('assets/skills/'));
        await until(() => $('nodeSpritePreview').querySelector('img')?.src.startsWith('blob:'));
        check('imported skill sprite survives reload', $('nodeSpritePreview').querySelector('img').src.startsWith('blob:'));
        await exportArchive();
        const fallback = SkillSprites.icon({icon: '★', sprite: 'assets/skills/missing.png'}, 'test-fallback'); document.body.append(fallback);
        await until(() => !fallback.querySelector('img'));
        check('missing skill image falls back to symbol', fallback.textContent === '★');
        check('unsafe sprite paths are rejected', !SkillSprites.safePath('javascript:alert(1)') && !SkillSprites.safePath('https://example.com/icon.png'));
        check('no skill sprite runtime errors', !window.smokeErrors.length);
    } catch (error) { checks.push('ERROR ' + error.message + '\n' + error.stack); }
    const output = document.createElement('pre'); output.id = 'smoke-results';
    output.textContent = checks.join('\n') + '\n' + (checks.some(line => /^(FAIL|ERROR)/.test(line)) ? 'SMOKE FAILED' : 'SMOKE PASSED'); document.body.append(output);
})();
