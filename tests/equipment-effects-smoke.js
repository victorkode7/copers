(async function () {
    const checks = [];
    const check = (label, condition) => {
        checks.push((condition ? 'PASS ' : 'FAIL ') + label);
        if (!condition) throw new Error(label);
    };
    const holder = document.createElement('div');
    holder.className = 'equipment-slot';
    holder.dataset.rarity = 'rare';
    document.body.append(holder);
    try {
        // An origin-clean, transparent sprite makes color sampling deterministic.
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 32;
        const context = canvas.getContext('2d');
        context.fillStyle = '#e04060'; context.fillRect(8, 8, 8, 16);
        context.fillStyle = '#4080e0'; context.fillRect(16, 8, 8, 16);
        const icon = document.createElement('span');
        icon.className = 'item-sprite equipment-slot-icon';
        const image = new Image();
        const loaded = new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
        image.src = canvas.toDataURL();
        icon.append(image); holder.append(icon);
        EquipmentEffects.apply(icon);
        await loaded;
        await new Promise(resolve => setTimeout(resolve, 0));
        check('transparent sprites receive their aura', icon.classList.contains('has-equipment-aura'));
        check('sprite colors are sampled for the background', icon.style.getPropertyValue('--sprite-aura-primary').includes('224') && icon.style.getPropertyValue('--sprite-aura-secondary').includes('128'));
        check('sprite silhouette has a glow', getComputedStyle(image).filter.includes('drop-shadow'));
        check('aura stays behind crisp 64px artwork', image.getBoundingClientRect().width === 64 && image.getBoundingClientRect().height === 64 && getComputedStyle(image).imageRendering === 'pixelated');
        const auraAnimation = getComputedStyle(icon, '::before').animationName;
        const expectedAnimation = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'equipment-aura-breathe';
        check('background respects motion preferences and keeps artwork still', auraAnimation === expectedAnimation && getComputedStyle(image).animationName === 'none');
        const placeholder = Equipment.createIcon(null, '◇');
        EquipmentEffects.apply(placeholder);
        check('empty slots keep their placeholders', !placeholder.classList.contains('has-equipment-aura') && placeholder.textContent === '◇');
        EquipmentEffects.enabled = false;
        const disabledIcon = icon.cloneNode(true);
        disabledIcon.classList.remove('has-equipment-aura');
        EquipmentEffects.apply(disabledIcon);
        check('experiment can be disabled', !disabledIcon.classList.contains('has-equipment-aura'));
        EquipmentEffects.enabled = true;
        check('no runtime errors', !window.smokeErrors.length);
        checks.push('SMOKE PASSED');
    } catch (error) { checks.push('ERROR ' + error.stack); }
    holder.remove();
    const report = document.createElement('pre');
    report.id = 'smoke-results'; report.textContent = checks.join('\n');
    document.body.append(report);
}());
