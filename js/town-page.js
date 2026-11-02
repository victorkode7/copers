(function () {
    'use strict';
    const $=id=>document.getElementById(id),resources=new Map(),buildingCards=[];
    const themes=[
        {accent:'#b5d296',page:'#14251a',surface:'24 43 29',border:'#64775a',muted:'#c0cfb0'},
        {accent:'#b3d5eb',page:'#182735',surface:'28 46 63',border:'#708ca2',muted:'#c4d6e3'},
        {accent:'#98d1dc',page:'#102b37',surface:'17 45 58',border:'#4d8799',muted:'#b3d5df'}
    ];
    const accents=themes.map(theme=>theme.accent);
    const compact=new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1});
    const rateFormat=new Intl.NumberFormat('en',{maximumFractionDigits:2});
    const rateAmount=amount=>Math.abs(amount)<10000?rateFormat.format(amount):compact.format(amount);
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const amountText=amount=>amount>0&&amount<1?String(Number(amount.toPrecision(2))):amount<10000?formatAmount(amount):compact.format(amount);
    let selectedWorld=worldData[0].id,backgroundWorld=null,unlockMessage='';
    function buildingArt(index){
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 80');svg.setAttribute('aria-hidden','true');
        const paths=['M18 63V34L50 13L82 34V63ZM11 35L50 8L89 35M42 63V43H58V63M25 40H34V49H25ZM66 40H75V49H66Z','M15 63V32H85V63ZM9 32L25 15H75L91 32M28 63V43H42V63M59 42H73V54H59ZM68 15V7H78V15','M20 63V25H80V63M14 25L50 9L86 25M38 63V42Q50 28 62 42V63M28 31H35M65 31H72','M16 63V31L50 15L84 31V63M10 32L50 10L90 32M28 63V43H42V63M54 44H72V55H54','M19 63V29L50 13L81 29V63M12 30L50 8L88 30M40 63V42H60V63M27 35H33M67 35H73'];
        paths.menagerie='M12 65V29L50 10L88 29V65ZM18 29H82M27 65V29M42 65V29M58 65V29M73 65V29M12 48H88M45 21H55M34 55Q39 43 46 51L53 45L64 56M35 56V63M59 56V63';
        paths.timberDepot='M12 65V29L50 10L88 29V65M7 29H93M21 65V36H79V65M27 60H73M32 51H68M37 42H63M27 57A3 3 0 1 0 27 63A3 3 0 1 0 27 57M32 48A3 3 0 1 0 32 54A3 3 0 1 0 32 48M37 39A3 3 0 1 0 37 45A3 3 0 1 0 37 39';
        paths.smeltery='M14 65V30H64V65M9 30H69M56 30V10H73V65M53 10H76M25 65V47Q39 30 53 47V65M31 61Q25 52 37 43Q35 52 43 54Q49 45 49 57Q51 63 45 65M78 52H94L89 63H76ZM83 45L87 39M85 31L90 25';
        const ground=document.createElementNS(svg.namespaceURI,'path');ground.setAttribute('d','M8 69H92M19 75H81');ground.setAttribute('class','town-art-ground');svg.append(ground);
        const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',index==='mine'?'M9 65L16 34L32 13L60 9L82 31L92 65ZM29 65V43Q29 23 50 23Q71 23 71 43V65M24 65H77M38 65L43 42M62 65L57 42M40 54H60M43 44H57M73 11L89 27M71 16Q83 7 93 20':index==='townHall'?'M15 63V32H85V63ZM8 33L50 13L92 33M50 13V2L69 5L50 10M41 63V42H59V63M25 40H33V49H25ZM67 40H75V49H67Z':index==='lumberOutpost'?'M14 60V32H56V60M8 33L35 13L62 33M28 60V42H43V60M65 45L78 16L91 45ZM69 29L78 7L87 29M78 45V60M58 60H90M61 65H92':index==='sawMill'?'M12 62V29L43 12L74 29V62M7 29H79M24 62V43H40V62M46 52H92M51 62H90M58 52V42L63 44L66 36L71 40L77 34L80 41L88 40L86 47L93 50M24 36H34':paths[index]||paths[0]);svg.append(path);return svg;
    }
    worldData.forEach((world,index)=>{
        const button=document.createElement('button');button.type='button';button.className='town-world-button';button.dataset.world=world.id;button.style.setProperty('--world-accent',accents[index%accents.length]);button.setAttribute('aria-pressed','false');
        WorldContent.applyBackground(button,world.background?{...world.background,fit:'cover',dim:.5}:null);
        const label=document.createElement('span');label.textContent=world.name;button.append(label);button.addEventListener('click',()=>{selectedWorld=world.id;unlockMessage='';render();});$('townWorldList').append(button);
    });
    for(let index=0;index<5;index++){
        const card=document.createElement('article');card.className='town-building-card';
        const number=document.createElement('span');number.className='town-plot-number';number.textContent='PLOT '+String(index+1).padStart(2,'0');number.hidden=true;
        const art=document.createElement('div');art.className='town-building-art';art.append(buildingArt(index));
        const title=document.createElement('h3');title.textContent='Building '+(index+1);
        const level=document.createElement('p');level.className='town-building-level';level.hidden=true;
        const header=document.createElement('div');header.className='town-building-header';
        const identity=document.createElement('div');identity.className='town-building-identity';identity.append(level,title);header.append(art,identity);
        const preview=document.createElement('p');preview.className='town-building-preview';preview.hidden=true;preview.id='townBuildingPreview'+index;
        const status=document.createElement('p');status.hidden=true;status.setAttribute('role','status');
        const actions=document.createElement('div');actions.className='town-building-actions';
        const costs=document.createElement('ul');costs.className='town-building-costs';costs.id='townBuildingCost'+index;costs.hidden=true;costs.setAttribute('aria-label','Cost');
        const unlock=document.createElement('button');unlock.type='button';unlock.className='town-unlock-button';unlock.hidden=true;
        unlock.setAttribute('aria-describedby',preview.id+' '+costs.id);header.append(unlock);actions.append(costs);
        const production=document.createElement('div');production.className='town-production';production.hidden=true;
        const rate=document.createElement('span');rate.className='town-production-rate';rate.hidden=true;
        const bar=document.createElement('div');bar.className='town-production-bar';bar.setAttribute('role','progressbar');bar.setAttribute('aria-label','Production cycle');bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');
        const fill=document.createElement('span');bar.append(fill);production.append(bar);
        const view={card,number,art,title,level,preview,status,unlock,costs,costEntries:[],production,rate,bar,fill,kind:null,total:null,lastPulse:0,phase:0};unlock.addEventListener('click',()=>perform(view.kind,card.dataset.building));
        card.append(number,header,rate,preview,status,actions,production);$('townBuildingGrid').append(card);buildingCards.push(view);
    }
    function perform(kind,id){
        if(state.currentView!=='townPage'||TownContent.buildings[id]?.world!==selectedWorld||SaveCompatibility.protection.blocked||simulatingCombat||!TownProgression.can(state,kind,id))return false;
        const priorGold=state.gold,priorProgress=state.townProgress;
        state.townProgress=TownProgression.clone(priorProgress);
        try{TownProgression.apply(state,kind,id);localStorage.setItem(saveKey,JSON.stringify(createGameSave()));unlockMessage='';}
        catch{state.gold=priorGold;state.townProgress=priorProgress;unlockMessage={id,text:'Could not save. Resources kept.'};window.render();return false;}
        window.render();return true;
    }
    function stopBar(view){view.barAnimation?.cancel();view.barAnimation=null;}
    function resourceText(node,text,materials=TownContent.resources){
        if(node.resourceText===text&&node.resourceMaterials===materials)return;
        node.resourceText=text;node.resourceMaterials=materials;
        const names=Object.values(materials).filter(material=>material.name&&material.icon).sort((a,b)=>b.name.length-a.name.length);
        if(!names.length){updateCombatText(node,text);return;}
        const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        const pattern=new RegExp('\\b('+names.map(material=>escape(material.name)).join('|')+')\\b','gi');
        const fragments=[];let end=0;
        for(const match of text.matchAll(pattern)){
            fragments.push(document.createTextNode(text.slice(end,match.index)));
            const material=names.find(material=>material.name.toLowerCase()===match[0].toLowerCase()),icon=document.createElement('span');
            icon.className='town-inline-resource';icon.textContent=material.icon;icon.style.color=material.color||'';icon.title=material.name;icon.setAttribute('role','img');icon.setAttribute('aria-label',material.name);fragments.push(icon);end=match.index+match[0].length;
        }
        fragments.push(document.createTextNode(text.slice(end)));node.replaceChildren(...fragments);
    }
    function productionText(spec,previous=null){
        const perHour=spec.perSecond*3600;
        const previousPerHour=previous?previous.perSecond*3600:0;
        const amount=value=>(previous&&value>0?'+':'')+rateAmount(value);
        const inputIds=[...new Set([...Object.keys(spec.inputs||{}),...Object.keys(previous?.inputs||{})])];
        const inputs=inputIds.length?inputIds.map(id=>amount((spec.inputs?.[id]||0)*perHour-(previous?.inputs?.[id]||0)*previousPerHour)+' '+(TownContent.resources[id]?.name||id)).join(' + ')+' → ':'';
        return inputs+amount(perHour-previousPerHour)+' '+(TownContent.resources[spec.resource]?.name||spec.resource)+' / h';
    }
    function renderResource(view,id,amount){
        const limit=TownProgression.capacity(state,id),full=amount>=limit;
        updateCombatText(view.amount,amountText(amount));updateCombatText(view.limit,'/ '+amountText(limit));
        view.root.classList.toggle('is-full',full);
    }
    function nextBenefit(id,data,kind){
        const def=TownProgression.definition(id,data?.tier||0);if(!def)return '';
        if(!TownProgression.available(state,kind,id))return 'Requires '+Object.entries(TownProgression.requirements(state,kind,id)).map(([building,minimum])=>(TownContent.buildings[building]?.name||building)+' T'+minimum.tier+' Lv '+(minimum.level||1)).join(', ')+'.';
        const custom=def[kind+'Preview'];
        const text=typeof custom==='function'?custom({...data}):custom;
        const next=kind==='purchase'?{tier:0,level:1}:kind==='upgrade'?{tier:data.tier,level:data.level+1}:{tier:data.tier+1,level:1};
        const spec=TownProgression.production(id,next,state);
        const current=kind==='purchase'?null:TownProgression.production(id,data,state);
        const benefit=text||spec&&productionText(spec,current);
        return benefit?(kind==='purchase'?'On purchase: ':kind==='upgrade'?'Next level: ':'Next tier: ')+benefit:'';
    }
    function renderCosts(view,required,materials=TownContent.resources){
        const signature=JSON.stringify([required,materials]);
        if(view.costSignature!==signature){
            view.costSignature=signature;
            view.costEntries=Object.entries(required).map(([id,amount])=>{
                const node=document.createElement('li'),icon=document.createElement('span'),text=document.createElement('span');
                icon.className='town-cost-icon';icon.setAttribute('aria-hidden','true');icon.textContent=id==='gold'?'●':materials[id]?.icon||'◈';icon.style.color=materials[id]?.color||'';
                const label=formatAmount(amount)+' '+(materials[id]?.name||id);
                text.textContent=formatAmount(amount);node.title=label;node.setAttribute('aria-label',label);node.append(icon,text);return {id,amount,node};
            });
            view.costs.replaceChildren(...view.costEntries.map(entry=>entry.node));
        }
        for(const {id,amount,node}of view.costEntries)node.classList.toggle('is-missing',!GameResources.canSpend(state,{[id]:amount},state.townProgress.resources));
    }
    function render(){
        if(state.currentView!=='townPage'){buildingCards.forEach(view=>{view.total=null;stopBar(view);});return;}
        const world=worldData.find(world=>world.id===selectedWorld)||worldData[0],index=worldData.indexOf(world);
        if(backgroundWorld!==world){
            const page=$('townPageView'),theme=themes[index%themes.length];
            page.style.setProperty('--town-accent',theme.accent);page.style.setProperty('--town-surface-rgb',theme.surface);page.style.setProperty('--town-border',theme.border);page.style.setProperty('--town-muted',theme.muted);
            document.body.style.setProperty('--town-page-background',theme.page);
            WorldContent.applyBackground(page,world.background?{...world.background,fit:'cover',dim:.38}:null);
            backgroundWorld=world;
        }
        updateCombatText($('townBuildingsHeading'),world.name);
        buildingCards.forEach((view,index)=>{
            view.number.hidden=!window.DeveloperTools?.allows('travel',state);
            const key=Object.keys(TownContent.buildings).find(id=>TownContent.buildings[id].world===world.id&&TownContent.buildings[id].plot===index&&(state.townProgress.buildings[id]||TownProgression.available(state,'purchase',id)))||'plot',data=state.townProgress.buildings[key],def=TownProgression.definition(key,data?.tier||0);
            if(view.card.dataset.building!==key){view.total=null;view.card.dataset.building=key;view.art.replaceChildren(buildingArt(def?.icon||index));updateCombatText(view.title,def?.name||'Building '+(index+1));}
            view.card.classList.toggle('is-owned',Boolean(data));view.card.classList.toggle('is-locked',key!=='plot'&&!data);
            view.card.classList.toggle('is-empty',!def);
            view.level.hidden=!data;if(data)updateCombatText(view.level,'T'+data.tier+' · Lv '+data.level+'/'+TownProgression.maxLevel(key,data.tier));
            view.status.hidden=unlockMessage?.id!==key;if(!view.status.hidden)updateCombatText(view.status,unlockMessage.text);
            view.kind=data?(data.level<TownProgression.maxLevel(key,data.tier)?'upgrade':'prestige'):'purchase';
            const cost=TownProgression.cost(view.kind,key,data);
            view.unlock.hidden=!def||cost===null||!data&&!TownProgression.available(state,view.kind,key);
            view.costs.hidden=view.unlock.hidden;
            const benefit=!view.unlock.hidden?nextBenefit(key,data,view.kind):'';
            view.preview.hidden=!benefit;if(benefit)resourceText(view.preview,benefit);
            if(def&&!view.unlock.hidden){renderCosts(view,cost);updateCombatText(view.unlock,view.kind==='purchase'?'Buy':view.kind==='upgrade'?'Upgrade':'Prestige');view.unlock.setAttribute('aria-label',(view.kind==='purchase'?'Buy ':view.kind==='upgrade'?'Upgrade ':'Prestige ')+def.name);view.unlock.disabled=SaveCompatibility.protection.blocked||!TownProgression.can(state,view.kind,key);}
        });
        $('townWorldList').querySelectorAll('button').forEach(button=>updateCombatAttribute(button,'aria-pressed',String(button.dataset.world===world.id)));
        const entries=Object.entries(TownContent.resources).filter(([id])=>Object.hasOwn(state.townProgress.resources,id)).map(([id,resource])=>({id,...resource,amount:state.townProgress.resources[id]}));
        const active=new Set(entries.map(entry=>entry.id));
        for(const [id,view]of resources)if(!active.has(id)){view.root.remove();resources.delete(id);}
        entries.forEach((entry,index)=>{
            let view=resources.get(entry.id);
            if(!view){const root=document.createElement('div');root.className='town-resource';root.dataset.resource=entry.id;
                const icon=entry.sprite?document.createElement('img'):document.createElement('span');icon.className='town-resource-icon';icon.style.color=entry.color||'';if(entry.sprite){icon.src=entry.sprite;icon.alt='';icon.loading='lazy';}else icon.textContent=entry.icon||'◈';
                const label=document.createElement('div'),name=document.createElement('span'),amount=document.createElement('strong'),limit=document.createElement('small');limit.className='town-resource-capacity';name.textContent=entry.name;label.append(name,amount,limit);root.append(icon,label);$('townResourceList').append(root);view={root,amount,limit};resources.set(entry.id,view);}
            renderResource(view,entry.id,entry.amount);
            if($('townResourceList').children[index]!==view.root)$('townResourceList').insertBefore(view.root,$('townResourceList').children[index]||null);
        });
        renderProduction();
    }
    function renderProduction(){
        if(state.currentView!=='townPage'||document.hidden){buildingCards.forEach(stopBar);return;}
        const now=performance.now(),reduced=reducedMotion.matches;
        for(const view of buildingCards){
            const id=view.card.dataset.building,data=state.townProgress.buildings[id],spec=TownProgression.production(id,data,state),storage=TownProgression.storage(id,data);
            if(view.producer!==data){view.producer=data;view.total=null;stopBar(view);view.artAnimation?.cancel();}
            view.production.hidden=!spec;view.rate.hidden=!spec&&!storage&&id!=='townHall'&&!(id==='menagerie'&&data);view.card.classList.toggle('is-producing',Boolean(spec));
            if(!view.unlock.hidden){view.unlock.disabled=SaveCompatibility.protection.blocked||!TownProgression.can(state,view.kind,id);for(const {id,amount,node}of view.costEntries)node.classList.toggle('is-missing',!GameResources.canSpend(state,{[id]:amount},state.townProgress.resources));}
            if(!spec){
                if(id==='townHall')resourceText(view.rate,'+'+formatAmount(TownProgression.productivityBonus(data))+'% Town productivity');
                if(storage)resourceText(view.rate,Object.keys(storage).map(resource=>(TownContent.resources[resource]?.name||resource)+' capacity: '+amountText(TownProgression.capacity(state,resource))).join('\n'));
                if(id==='menagerie'&&data){
                    const world=data.tier+1;
                    resourceText(view.rate,'Unlocked W'+world+' Mastery tree\nW'+world+' mastery: '+TownProgression.killCountMultiplier(state,data.tier)+'x kills (non-boss)');
                }
                view.total=null;stopBar(view);continue;
            }
            const p=data.production||{phase:0,total:0};
            const full=TownProgression.capacity(state,spec.resource)-(state.townProgress.resources[spec.resource]||0)<1;
            resourceText(view.rate,full?'Storage full':productionText(spec));
            view.fill.style.transform='scaleX('+p.phase+')';
            const duration=Math.max(.5,1/spec.perSecond)*1000;
            const starved=spec.inputs&&Object.entries(spec.inputs).some(([id,cost])=>(state.townProgress.resources[id]||0)<cost);
            if(full||reduced||starved||SaveCompatibility.protection.blocked)stopBar(view);
            else{
                // The compositor fills continuously. Never seek the running bar
                // on a game tick: a small speed correction absorbs clock jitter.
                if(view.barDuration!==duration){stopBar(view);view.barDuration=duration;}
                const remainder=combatCatchingUp?0:Math.max(0,Math.min(gameTickMilliseconds,Date.now()-lastSimulatedAt));
                const target=p.phase*duration+remainder;
                if(!view.barAnimation){
                    view.barAnimation=view.fill.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration,iterations:Infinity,easing:'linear'});
                    view.barAnimation.currentTime=target;
                }else{
                    const current=view.barAnimation.currentTime||0;
                    const error=((target-current)%duration+duration*1.5)%duration-duration/2;
                    view.barAnimation.updatePlaybackRate(Math.max(.8,Math.min(1.2,1+error/500)));
                }
            }
            updateCombatAttribute(view.bar,'aria-valuenow',String(Math.floor(p.phase*100)));
            if(view.total===null||p.total<view.total){view.total=p.total;view.lastPulse=now;}
            if(p.total>view.total&&now-view.lastPulse>=500){
                view.total=p.total;view.lastPulse=now;
                view.artAnimation?.cancel();
                if(!reduced){
                    view.artAnimation=view.art.animate([{filter:'brightness(1)'},{filter:'brightness(1.8)',offset:.25},{filter:'brightness(1)'}],{duration:400});
                }
            }
        }
        for(const [id,view]of resources)renderResource(view,id,state.townProgress.resources[id]||0);
    }
    document.addEventListener('visibilitychange',renderProduction);
    reducedMotion.addEventListener('change',renderProduction);
    $('townPageButton').addEventListener('click',()=>{state.currentView='townPage';state.isInTown=true;window.render();saveGame();});
    window.TownPage={render,renderProduction};render();
}());
