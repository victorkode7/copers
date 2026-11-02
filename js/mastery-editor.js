(function () {
    'use strict';
    const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
    function create(data,world,map,changed) {
        const container=el('details','mastery-editor'),heading=el('summary',null,map?'Monster mastery':'World mastery presets');
        let selected='root',scope=map?'map':'world',type=map?MasterySystem.kind(data,map):'regular';
        const hasTree=value=>value&&Array.isArray(value.nodes)&&value.nodes.length&&value.nodes.every(node=>node&&Array.isArray(node.requires)&&node.stats&&typeof node.stats==='object');
        const currentTree=()=>{
            const value=scope==='world'?MasterySystem.preset(data,world,type):MasterySystem.tree(data,map);
            return hasTree(value)?value:MasterySystem.defaultTree(world,data.worlds.indexOf(world),type==='boss');
        };
        function writable() {
            if(scope==='world') {
                if(!world.masteryPresets||typeof world.masteryPresets!=='object'||Array.isArray(world.masteryPresets))world.masteryPresets={};
                if(!hasTree(world.masteryPresets[type]))world.masteryPresets[type]=MasterySystem.clone(currentTree());
                return world.masteryPresets[type];
            }
            if(!hasTree(map.masteryTree))map.masteryTree=MasterySystem.clone(currentTree());
            return map.masteryTree;
        }
        const editable=()=>scope==='world'||Boolean(map?.masteryTree);
        const graph=el('div'),controls=el('div','mastery-editor-controls'),body=el('div'),source=el('p','hint');
        const action=(text,run)=>{const button=el('button',null,text);button.type='button';button.addEventListener('click',run);return button;};
        const field=(label,value,update,options={})=>{
            const wrapper=el('label',null,label),input=el(options.multiline?'textarea':'input');
            if(!options.multiline)input.type=options.number?'number':'text';else input.rows=2;
            input.value=Number.isNaN(value)?'':value??'';input.setAttribute('aria-label',label);
            if(options.number)input.step='any';
            input.addEventListener('input',()=>{update(options.number?input.valueAsNumber:input.value);changed();drawGraph();});wrapper.append(input);return wrapper;
        };
        const nodeUpdate=(property,value)=>{const tree=writable(),node=tree.nodes.find(node=>node.id===selected);node[property]=value;};
        function drawGraph() {
            const tree=currentTree();
            MasteryTree.render(graph,tree,{selected,active:new Set(['root']),select:id=>{selected=id;drawGraph();drawNode();}});
        }
        function bonusEditor(node,property,title) {
            const values=()=>currentTree().nodes.find(entry=>entry.id===selected)?.[property]||{};
            const panel=el('section','mastery-editor-bonuses'),top=el('div','section-heading');top.append(el('h3',null,title));
            const add=action('+ Stat',()=>{
                const next=filter.filtered().find(stat=>!Object.hasOwn(values(),stat.id));if(!next)return;
                const target=writable().nodes.find(entry=>entry.id===selected);target[property] ||= {};
                target[property][next.id]=MasterySystem.stats[next.id].mode==='multiply'?1.1:1;changed();drawGraph();drawNode();
            });top.append(add);panel.append(top);
            const rows=el('div');panel.append(rows);
            const eligible=Object.entries(MasterySystem.stats).filter(([,rule])=>!rule.developer).map(([id,rule])=>({id,label:rule.label}));
            const filter=StatPicker.createFilter(rows,eligible,renderRows);
            function renderRows() {
                rows.replaceChildren();
                Object.entries(values()).forEach(([stat,value])=>{
                    const row=el('div','mastery-editor-stat'),select=el('select');select.setAttribute('aria-label',title+' stat');
                    filter.populate(select,eligible.filter(entry=>entry.id===stat||!Object.hasOwn(values(),entry.id)),stat);
                    select.addEventListener('change',()=>{
                        const target=writable().nodes.find(entry=>entry.id===selected);const amount=target[property][stat];delete target[property][stat];
                        target[property][select.value]=MasterySystem.stats[select.value].mode==='multiply'?1.1:Number.isFinite(amount)?amount:1;
                        changed();drawGraph();drawNode();
                    });
                    const label=el('label',null,'Stat');label.append(select);
                    const amount=field('Value',value,next=>{writable().nodes.find(entry=>entry.id===selected)[property][stat]=next;},{number:true});
                    const remove=action('×',()=>{delete writable().nodes.find(entry=>entry.id===selected)[property][stat];changed();drawGraph();drawNode();});remove.setAttribute('aria-label','Remove '+title.toLowerCase()+' stat');
                    row.append(label,amount,remove);rows.append(row);
                });
                add.disabled=!filter.filtered().some(stat=>!Object.hasOwn(values(),stat.id));
            }
            renderRows();return panel;
        }
        function drawNode() {
            body.replaceChildren();const tree=currentTree(),node=tree.nodes.find(node=>node.id===selected)||tree.nodes[0];selected=node.id;
            const fields=el('fieldset');fields.disabled=!editable();fields.style.border='0';fields.style.padding='0';fields.style.minWidth='0';
            fields.append(field('Tree name',tree.name,value=>{writable().name=value;}),el('h3',null,node.start?'Starting node':node.id==='capstone'?'Capstone':'Selected mastery node'));
            fields.append(field('Mastery node name',node.name,value=>nodeUpdate('name',value)),field('Mastery node icon',node.icon,value=>nodeUpdate('icon',value)),field('Mastery description',node.description,value=>nodeUpdate('description',value),{multiline:true}));
            fields.append(bonusEditor(node,'stats','Bonuses'),bonusEditor(node,'penalties','Trade-offs'));
            const hints=el('p','hint','Percentage bonuses use fractions: 0.2 = +20% gold. Multipliers use 1 as neutral: 0.8 respawn time is 20% faster; 10 enemy HP means 10× health. Bonuses and trade-offs both apply on this map.');fields.append(hints);
            const advanced=el('details'),summary=el('summary',null,'Connections & position');advanced.append(summary);
            advanced.append(field('Column',node.column,value=>nodeUpdate('column',value),{number:true}),field('Row',node.row,value=>nodeUpdate('row',value),{number:true}));
            if(!node.start) {
                const requirement=el('label',null,'Prerequisite nodes'),choices=el('select');choices.multiple=true;choices.size=4;choices.setAttribute('aria-label','Mastery prerequisite nodes');
                tree.nodes.filter(entry=>entry.id!==node.id).forEach(entry=>{const option=new Option(entry.name,entry.id);option.selected=node.requires.includes(entry.id);choices.add(option);});
                choices.addEventListener('change',()=>{nodeUpdate('requires',[...choices.selectedOptions].map(option=>option.value));changed();drawGraph();});requirement.append(choices);advanced.append(requirement);
                const mode=el('label',null,'Required connections'),select=el('select');select.add(new Option('All selected prerequisites','all'));select.add(new Option('Any selected prerequisite','any'));select.value=node.requiresMode;
                select.addEventListener('change',()=>{nodeUpdate('requiresMode',select.value);changed();drawGraph();});mode.append(select);advanced.append(mode);
            }
            advanced.append(el('p','hint','Permanent node ID: '+node.id+'. Keep IDs stable to retain player allocations.'));fields.append(advanced);body.append(fields);
        }
        function render() {
            container.replaceChildren(heading);controls.replaceChildren();
            if(map) {
                const kind=el('label',null,'Mastery encounter type'),select=el('select');
                select.setAttribute('aria-label','Mastery encounter type');
                [['auto','Automatic (last map is the boss)'],['regular','Regular map'],['boss','Boss map']].forEach(([id,name])=>select.add(new Option(name,id)));select.value=map.masteryType||'auto';
                select.addEventListener('change',()=>{map.masteryType=select.value;type=MasterySystem.kind(data,map);changed();selected='root';render();});kind.append(select);container.append(kind);
                const custom=action(map.masteryTree?'Edit this map’s custom tree':'Customize for this map',()=>{if(!map.masteryTree)map.masteryTree=MasterySystem.clone(MasterySystem.tree(data,map));scope='map';selected='root';changed();render();});
                controls.append(custom,action('Edit world '+type+' preset',()=>{scope='world';selected='root';render();}));
                if(map.masteryTree)controls.append(action('Use world preset',()=>{delete map.masteryTree;scope='map';selected='root';changed();render();}));
            } else {
                const label=el('label',null,'Preset to edit'),select=el('select');select.add(new Option('Regular monster maps','regular'));select.add(new Option('Boss maps','boss'));select.value=type;
                select.setAttribute('aria-label','Mastery preset to edit');
                select.addEventListener('change',()=>{type=select.value;selected='root';render();});label.append(select);container.append(label);
            }
            if(scope==='world')controls.append(action('Restore default '+type+' tree',()=>{if(world.masteryPresets&&typeof world.masteryPresets==='object')delete world.masteryPresets[type];else delete world.masteryPresets;selected='root';changed();render();}));
            source.textContent=scope==='world'?'Editing '+world.name+'’s shared '+type+' preset. Every matching map without a custom tree inherits these changes.':map.masteryTree?'This map has its own mastery tree.':'Uses '+world.name+'’s '+type+' preset. Customize this map or edit the shared world preset to change nodes.';
            container.append(source,controls,el('p','hint','Earn 2 map mastery points at 10×, 100×, 1,000×… the map’s kill requirement. The starting node is free; each other node costs 1 point.'),graph,body);drawGraph();drawNode();
        }
        render();return container;
    }
    window.MasteryEditor={forMap:(data,map,changed)=>create(data,data.worlds.find(world=>world.mapIds.includes(map.id))||data.worlds[0],map,changed),forWorld:(data,world,changed)=>create(data,world,null,changed)};
}());
