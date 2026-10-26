const damageBreakdownMeter = {mapId:null, sources:new Map(), revision:0};
const damageBreakdownStyles = Object.freeze({
    attacks:['Attacks', '#88c7df'], poison:['Poison', '#73d892'], bleed:['Bleed', '#ef8090'],
    poisonExecute:['Poison Execute', '#b6e769'], righteousFire:['Fire of the Righteous', '#ff9459'],
    burning:['Burning', '#ff9459'], shieldSlam:['Shield Slam', '#b3e9ff'],
    overflowingSlam:['Overflowing Slam', '#e6ca86'], shockwaveSlash:['Shockwave Slash', '#67d7c6'],
    volcanicEruption:['Volcanic Eruption', '#eea04f'], piercingArrow:['Piercing Arrow', '#e8efff'],
    forkingArrow:['Forking Arrow', '#88b5ff'], multiShot:['Multishot', '#c2a5ee'],
    voidBolt:['Void Bolt','#b99aff'],voidVolley:['Void Volley','#e49aff']
});
const damageBreakdownViews = new Map();
let renderedDamageBreakdownRevision = -1;

function resetDamageBreakdown(mapId) {
    damageBreakdownMeter.mapId = mapId;
    damageBreakdownMeter.sources.clear();
    damageBreakdownMeter.revision++;
}

function recordMonsterDamage(amount, damageType, abilityId) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (damageBreakdownMeter.mapId !== state.selectedMap) resetDamageBreakdown(state.selectedMap);
    const source = damageType === 'poison' ? (abilityId === 'poisonExecute' ? 'poisonExecute' : 'poison')
        : damageType === 'bleed' ? 'bleed'
        : damageType === 'dot' ? (abilityId || 'burning') : (abilityId || 'attacks');
    damageBreakdownMeter.sources.set(source, (damageBreakdownMeter.sources.get(source) || 0) + amount);
    damageBreakdownMeter.revision++;
}

function getDamageBreakdown() {
    const rows = Array.from(damageBreakdownMeter.sources, ([source, damage]) => ({source, damage}));
    const total = rows.reduce((sum, row) => sum + row.damage, 0);
    rows.sort((a,b) => b.damage - a.damage || a.source.localeCompare(b.source));
    // Distribute hundredths of a percent so displayed shares add up to 100%.
    let remaining = 10000;
    rows.forEach(row => {
        row.share = row.damage / total;
        row.units = Math.floor(row.share * 10000);
        row.remainder = row.share * 10000 - row.units;
        remaining -= row.units;
    });
    const byRemainder = [...rows].sort((a,b) => b.remainder - a.remainder);
    for (let index = 0; index < remaining && byRemainder.length; index++) byRemainder[index % byRemainder.length].units++;
    return {total, rows};
}

function renderDamageBreakdown() {
    if (renderedDamageBreakdownRevision === damageBreakdownMeter.revision) return;
    renderedDamageBreakdownRevision = damageBreakdownMeter.revision;
    const {total, rows} = getDamageBreakdown();
    const list = document.getElementById('damageBreakdownList');
    const totalLabel = document.getElementById('damageBreakdownTotal');
    updateCombatText(totalLabel, formatBuffAmount(total) + ' damage');
    updateCombatAttribute(totalLabel, 'title', combatStatFormatter.format(total) + ' total damage dealt');
    updateCombatText(document.getElementById('damageBreakdownMap'), currentMap().name + ' · this session');
    document.getElementById('resetDamageBreakdown').disabled = !rows.length;
    updateCombatHidden(document.getElementById('damageBreakdownEmpty'), rows.length > 0);
    const active = new Set(rows.map(row => row.source));
    for (const [source, view] of damageBreakdownViews) {
        if (!active.has(source)) { view.element.remove(); damageBreakdownViews.delete(source); }
    }
    rows.forEach((row,index) => {
        let view = damageBreakdownViews.get(row.source);
        if (!view) {
            const element = document.createElement('li');
            element.dataset.damageSource = row.source;
            const heading = document.createElement('div'); heading.className = 'damage-source-heading';
            const label = document.createElement('span');
            const percentage = document.createElement('strong'); percentage.className = 'damage-source-percentage';
            heading.append(label, percentage);
            const track = document.createElement('div'); track.className = 'damage-source-track';track.setAttribute('aria-hidden','true');
            const fill = document.createElement('div'); fill.className = 'damage-source-fill';track.append(fill);
            element.append(heading, track);
            view = {element, label, percentage, fill};damageBreakdownViews.set(row.source,view);
        }
        const style = Object.hasOwn(damageBreakdownStyles, row.source)
            ? damageBreakdownStyles[row.source] : [row.source, '#a9bac8'];
        const label = row.source === 'attacks' || row.source === 'poison' || row.source === 'bleed'
            ? style[0] : skillNodeDefinition(row.source)?.name || style[0];
        const percentage = row.units ? combatStatFormatter.format(row.units / 100) + '%' : '<0.01%';
        updateCombatText(view.label, label);
        updateCombatText(view.percentage, percentage);
        updateCombatAttribute(view.element, 'title', label + ': ' + combatStatFormatter.format(row.damage) + ' damage' +
            (row.source === 'attacks' ? ' (basic attacks and multihits)' : ''));
        view.element.style.setProperty('--damage-source-color', style[1]);
        view.fill.style.width = (row.share * 100) + '%';
        if (list.children[index] !== view.element) list.insertBefore(view.element,list.children[index] || null);
    });
}

document.getElementById('resetDamageBreakdown').addEventListener('click', () => {
    resetDamageBreakdown(state.selectedMap);
    renderDamageBreakdown();
});
