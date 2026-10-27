(function () {
    'use strict';
    const categories = ['Physical damage', 'Spells & mana', 'Health & regeneration', 'Defence', 'Attack speed & multi-hit', 'Fury', 'Shields', 'Poison', 'Bleed', 'Eruption', 'Rewards', 'Developer'];
    function category(id) {
        if (/^minimum/.test(id)) return 'Developer';
        if (/^(mana|spell)/.test(id)) return 'Spells & mana';
        if (/^health/.test(id)) return 'Health & regeneration';
        if (/^(accuracy|evasion)/.test(id)) return 'Defence';
        if (/^(attackSpeed|multiHit)/.test(id)) return 'Attack speed & multi-hit';
        if (/^maxFury/.test(id)) return 'Fury';
        if (/^maxShields/.test(id)) return 'Shields';
        if (/^poison/.test(id)) return 'Poison';
        if (/^bleed/.test(id)) return 'Bleed';
        if (/^eruption/.test(id)) return 'Eruption';
        if (/^gold/.test(id)) return 'Rewards';
        return 'Physical damage';
    }
    function createFilter(rows, stats, onChange) {
        const panel = document.createElement('div');
        panel.className = 'stat-picker-filters';
        const search = document.createElement('input');
        search.type = 'search'; search.placeholder = 'Search stats…';
        search.setAttribute('aria-label', 'Search bonus stats');
        const groups = document.createElement('select');
        groups.setAttribute('aria-label', 'Bonus stat category');
        groups.add(new Option('All categories', ''));
        categories.filter(group => stats.some(stat => category(stat.id) === group))
            .forEach(group => groups.add(new Option(group, group)));
        const status = document.createElement('small');
        status.className = 'stat-picker-status'; status.setAttribute('role', 'status');
        for (const [text, control] of [['Find a stat', search], ['Category', groups]]) {
            const label = document.createElement('label'); label.append(text, control); panel.append(label);
        }
        panel.append(status); rows.before(panel);
        const matches = stat => {
            const haystack = (stat.label + ' ' + stat.id).toLowerCase();
            return (!groups.value || category(stat.id) === groups.value) &&
                search.value.toLowerCase().trim().split(/\s+/).every(word => haystack.includes(word));
        };
        const filtered = () => stats.filter(matches);
        const update = () => {
            const count = filtered().length;
            status.textContent = count ? count + ' matching stats. Choose a stat below or add a bonus.' : 'No matching stats. Try another search or category.';
        };
        panel.addEventListener('input', event => { event.stopPropagation(); update(); onChange(); });
        panel.addEventListener('change', event => { event.stopPropagation(); update(); onChange(); });
        update();
        return {
            filtered,
            populate(select, available, selected) {
                select.replaceChildren();
                const matching = available.filter(matches);
                const current = available.find(stat => stat.id === selected);
                if (current && !matching.includes(current)) {
                    const group = document.createElement('optgroup'); group.label = 'Current selection';
                    group.append(new Option(current.label, current.id)); select.append(group);
                }
                for (const name of categories) {
                    const entries = matching.filter(stat => category(stat.id) === name).sort((a, b) => a.label.localeCompare(b.label));
                    if (!entries.length) continue;
                    const group = document.createElement('optgroup'); group.label = name;
                    entries.forEach(stat => group.append(new Option(stat.label, stat.id))); select.append(group);
                }
                select.value = selected;
            }
        };
    }
    window.StatPicker = {createFilter};
}());
