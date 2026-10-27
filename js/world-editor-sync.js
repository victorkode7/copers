(function () {
    'use strict';
    const oldGuanoDescriptions=new Set([
        'A narrow bridge over a bottomless drop. The bats call it home; your travel insurance calls it an exclusion.',
        'A narrow ice bridge beneath a very large bat colony. The snow here is not always snow. Keep your mouth closed.'
    ]);
    function snapshot(project) {
        return Object.fromEntries(project.maps.map(map=>[map.id,{name:map.name,description:map.description}]));
    }
    function mergeMapText(draft,project,previous=null) {
        const maps=new Map(draft.maps.map(map=>[map.id,map])),changed=[];
        for(const source of project.maps) {
            const map=maps.get(source.id);if(!map)continue;
            for(const field of ['name','description']) {
                if(typeof source[field]!=='string'||map[field]===source[field])continue;
                const base=previous?.[source.id],tracked=base&&Object.hasOwn(base,field);
                const legacy=field==='name' ? !map.name.trim()||/^\d+$/.test(map.name) :
                    !map.description||source.id==='map_4c4be6ec759af00dc8f2ab5f'&&oldGuanoDescriptions.has(map.description);
                if(tracked ? map[field]===base[field] : legacy) {
                    changed.push({id:map.id,field,value:source[field]});map[field]=source[field];
                }
            }
        }
        return changed;
    }
    function parse(source) {
        if(!source.trim())return null;
        const match=source.match(/^\s*window\.adventureWorld\s*=\s*([\s\S]*?);?\s*$/);
        if(!match)throw new Error('Choose the project world-content.js file.');
        const project=JSON.parse(match[1]);
        if(!Array.isArray(project.maps)||!project.maps.every(map=>map&&typeof map.id==='string'&&typeof map.name==='string'&&typeof map.description==='string'))throw new Error('The project file has invalid map names or descriptions.');
        return project;
    }
    window.WorldEditorSync={snapshot,mergeMapText,parse};
}());
