// Spells share the same fixed combat steps as attacks and offline progress.
const spellSettings = Object.freeze({
    voidBolt:{manaCost:5}, voidVolley:{manaCost:10,charges:5,missiles:10},
    voidVortex:{manaCost:20,damageMultiplier:.75,chargesPerHit:2,doubleChance:.33}
});
const voidMissileTiming = Object.freeze({flight:.4,stagger:.05,redirect:.2,windup:.2});
// These Bezier controls make distance grow as time squared. SVG heads and CSS
// trails share the same acceleration, while their contact deadline stays fixed.
const voidMissileEasing = Object.freeze([1/3,0,2/3,1/3]);
// Transient IDs bridge simulation events and presentation without putting DOM
// handles or IDs into missiles/saves. Timelines contain simulation data only.
let voidMissilePresentationIds = new WeakMap();
let nextVoidMissilePresentationId = 1;
let voidMissilePresentationEpoch = 0;
const voidMissileTimelines = new Map();
const voidMissileVisuals = new Map();

function trackVoidMissile(missile, schedule) {
    if (!missile) return undefined;
    let id = voidMissilePresentationIds.get(missile);
    if (id === undefined) {
        id = nextVoidMissilePresentationId++;
        voidMissilePresentationIds.set(missile, id);
        voidMissileTimelines.set(id, {remaining:missile.remaining ?? schedule.arrival, status:'flying'});
    }
    return id;
}

function advanceVoidMissilePresentation(hit) {
    const timeline=voidMissileTimelines.get(voidMissilePresentationIds.get(hit));
    if(timeline)timeline.remaining=hit.remaining;
}

function cancelVoidMissilePresentation(hit) {
    const missileId=voidMissilePresentationIds.get(hit);
    const timeline=voidMissileTimelines.get(missileId);
    if(timeline)timeline.status='cancelled';
    emitCombatEvent('voidMissileCancelled', {mapId:state.selectedMap,epoch:voidMissilePresentationEpoch,missileId});
}

function getVoidMissileVisual(missile) {
    return voidMissileVisuals.get(voidMissilePresentationIds.get(missile));
}

function resetVoidMissilePresentation() {
    voidMissilePresentationEpoch++;
    voidMissilePresentationIds = new WeakMap();
    voidMissileTimelines.clear();
    emitCombatEvent('voidVolleyReset', {epoch:voidMissilePresentationEpoch});
}

function presentVoidVolleyReset() {
    window.CombatWebGL?.clear();
    voidMissileVisuals.forEach(visual => {visual.cancelled=true;visual.circle?.remove();});
    voidMissileVisuals.clear();
    elements.combatPanel.querySelectorAll('.spell-void-volley,.void-volley-player-glow').forEach(element=>element.remove());
}

// Call after presenting or discarding an entire batch: launch events still need
// the final remaining time/status when a missile also resolves in that batch.
function pruneVoidMissilePresentations() {
    // A reset can occur during an unpresented/offline step.
    for (const [id,visual] of voidMissileVisuals) {
        if (voidMissileTimelines.has(id)) continue;
        visual.cancelled=true;visual.circle?.remove();voidMissileVisuals.delete(id);
    }
    for (const [id,timeline] of voidMissileTimelines) {
        if (timeline.status === 'flying') continue;
        const visual = voidMissileVisuals.get(id);
        if (timeline.status === 'cancelled' && visual) {visual.cancelled=true;visual.circle?.remove();}
        voidMissileVisuals.delete(id);
        voidMissileTimelines.delete(id);
    }
}

function getVoidMissileSchedule(index,visualDelay=0,flight=voidMissileTiming.flight) {
    return combatAbilities.getVoidMissileSchedule(index, visualDelay, flight);
}

function getPlayerMaxMana() {
    return cachedCombatStat('getPlayerMaxMana', () => Math.max(0,Math.round(
        (getSkillStat('mana') + getGearStat('mana')) * getSkillMultiplier('manaMultiplier') * getGearStat('manaMultiplier'))));
}

function getProfileMaxMana(profile) {
    // Parsing must not replace live state just to calculate an old profile's
    // initial pool. Returning a concrete default also triggers its exact backup.
    const equipment=Object.values(profile.gear).filter(id=>ownsItem(id,profile)).map(id=>ItemCrafting.effective(itemById[id],profile));
    const skillMultiplier=Object.entries(profile.skillRanks).reduce((total,[id,rank])=>
        total*Math.pow(skillNodeById[id]?.stats.manaMultiplier||1,rank),1);
    const map=mapData.find(map=>map.id===profile.selectedMap)||mapData[0];
    return Math.max(0,Math.round((getSkillStatFromRanks('mana',profile.skillRanks)+Equipment.aggregate(equipment,'mana')+MasterySystem.bonus(worldContent,map,profile,'mana'))*
        skillMultiplier*Equipment.aggregate(equipment,'manaMultiplier')*MasterySystem.bonus(worldContent,map,profile,'manaMultiplier')));
}

function getPlayerManaRegen() {
    return cachedCombatStat('getPlayerManaRegen', () => Math.max(0,
        getSkillStat('manaRegen') + getGearStat('manaRegen') + getPlayerMaxMana() *
        (getSkillStat('manaRegenPercent') + getGearStat('manaRegenPercent'))) * Math.max(0,
        1 + getSkillStat('manaRegenIncrease') + getGearStat('manaRegenIncrease')) * (Alchemy.effects(state).manaRegenMultiplier || 1));
}

function getSpellDamage() {
    return CombatHealth.getSpellDamage(getSkillStat('spellDamage') + getGearStat('spellDamage'),
        getSkillMultiplier('spellDamageMultiplier'), getGearStat('spellDamageMultiplier'), state.furyStacks, furyDamagePerStack);
}

function normalizePlayerMana() {
    return combatAbilities.normalizePlayerMana();
}

function normalizeVoidCharges() {
    return combatAbilities.normalizeVoidCharges();
}

function castVoidVolley(visualDelay=0) {
    return combatAbilities.castVoidVolley(visualDelay);
}

function tickPendingVoidMissiles(elapsed) {
    return combatAbilities.tickPendingVoidMissiles(elapsed);
}

function castVoidBolt() {
    return combatAbilities.castVoidBolt();
}

function castVoidVortex() {
    return combatAbilities.castVoidVortex();
}

// Cosmetic phase and lifetimes deliberately stay independent of combat RNG.
const voidVortexVisuals=new Set();
let voidVortexVisualSequence=0;
const voidVortexMotion=matchMedia('(prefers-reduced-motion: reduce)');
function clearVoidVortexVisuals() {
    for (const visual of [...voidVortexVisuals]) visual.remove();
}
function syncVoidVortexVisuals() {
    for (const visual of [...voidVortexVisuals]) {
        if (!isCombatView() || visual.mapId!==state.selectedMap || !combatEffectEnabled('abilities')) visual.remove();
    }
}
addEventListener('combat-webgl-clear',clearVoidVortexVisuals);
addEventListener('combat-settings-change',clearVoidVortexVisuals);
addEventListener('resize',clearVoidVortexVisuals);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearVoidVortexVisuals();});
voidVortexMotion.addEventListener('change',clearVoidVortexVisuals);

function createVoidVortexPlan(targetIds,delay) {
    const frame=getCombatEffectBounds(elements.combatPanel);
    if (!frame.width || !frame.height) return null;
    const targets=[...new Set(targetIds)].map(id=>{
        const card=getCombatEffectCard(id);if(!card)return null;
        const mark=card.querySelector('.enemy-mark'),rect=getCombatEffectBounds(mark||card);
        if(!rect.width||!rect.height)return null;
        return {id,x:rect.left+rect.width/2-frame.left,y:rect.top+rect.height/2-frame.top,
            radius:Math.max(12,Math.min(30,rect.width*.32,rect.height*.32))};
    }).filter(Boolean);
    if(!targets.length)return null;
    const phase=(voidVortexVisualSequence++%8)*Math.PI/4;
    const left=Math.min(...targets.map(t=>t.x-t.radius)),right=Math.max(...targets.map(t=>t.x+t.radius));
    const top=Math.min(...targets.map(t=>t.y-t.radius)),bottom=Math.max(...targets.map(t=>t.y+t.radius));
    const cx=(left+right)/2,cy=(top+bottom)/2,rx=(right-left)/2+10,ry=Math.min(26,(bottom-top)/2+6);
    const paths=[];
    // The group spiral follows the actual sprite bounds, never the health bars
    // or the whole card. Stroke widths stay fixed even across a wide row.
    for(let arm=0;arm<2;arm++) {
        const points=[];
        for(let step=0;step<=40;step++) {
            const t=step/40,angle=phase+arm*Math.PI+t*Math.PI*2.1,shrink=1-t*.86;
            points.push({x:cx+Math.cos(angle)*rx*shrink,y:cy+Math.sin(angle)*ry*shrink});
        }
        paths.push({points,local:false});
    }
    // Small curls retain the recognizable spiral silhouette even when the
    // connecting sweep spans a long row or targets have irregular spacing.
    targets.forEach((target,index)=>{
        for(let arm=0;arm<2;arm++) {
            const points=[];
            for(let step=0;step<=28;step++) {
                const t=step/28,angle=phase+index*.7+arm*Math.PI+t*Math.PI*2.4;
                const radius=(target.radius+4)*(1-t*.84);
                points.push({x:target.x+Math.cos(angle)*radius,y:target.y+Math.sin(angle)*radius});
            }
            paths.push({points,local:true});
        }
    });
    return {frame,targets,paths,delay:Math.max(0,Math.min(180,delay)),duration:560,impactDuration:220,
        echo:delay>0,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
}

function renderVoidVortexSvg(plan) {
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('spell-effect','spell-void-vortex');
    svg.dataset.spell='voidVortex';svg.dataset.echo=String(plan.echo);svg.setAttribute('aria-hidden','true');
    elements.combatPanel.append(svg);
    const frame=getCombatOverlayBounds(svg);
    svg.setAttribute('viewBox',[frame.left-plan.frame.left,frame.top-plan.frame.top,frame.width,frame.height].join(' '));
    const add=(tag,attributes)=>{
        const node=document.createElementNS(svg.namespaceURI,tag);
        for(const [key,value] of Object.entries(attributes))node.setAttribute(key,value);
        svg.append(node);return node;
    };
    if(!plan.reduced)for(const {points,local} of plan.paths) {
        const d=points.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2)).join(' ');
        for(const layer of ['shadow','edge']) {
            const path=add('path',{d,pathLength:1,class:'vortex-stream vortex-stream-'+layer+(local?' vortex-curl':' vortex-link')});
            path.style.animationDuration=plan.duration+'ms';path.style.animationDelay=plan.delay+'ms';
        }
    }
    for(const target of plan.targets) {
        const ring=add('circle',{cx:target.x,cy:target.y,r:target.radius*(plan.echo?.75:1),
            class:'vortex-contact','data-target-id':target.id});
        ring.style.animationDuration=plan.impactDuration+'ms';
        // Echo damage is already synchronous in combat. Contact has no visual
        // delay; only the swirling aftermath is staggered by the existing delay.
        add('polygon',{points:`${target.x},${target.y-6} ${target.x+6},${target.y} ${target.x},${target.y+6} ${target.x-6},${target.y}`,
            class:'vortex-contact-core'});
    }
    return {remove:()=>svg.remove()};
}

function showVoidVortex(targetIds,visualDelay=0) {
    if(combatEffects===null || !targetIds.length)return;
    emitCombatEvent('voidVortexCast', {mapId:state.selectedMap,targetIds:[...targetIds],visualDelay});
}

function presentVoidVortexCast({targetIds,visualDelay}) {
    if(!combatEffectEnabled('abilities'))return;
    const validIds=targetIds.filter(id=>getCombatEffectMonster(id) && getCombatEffectCard(id));
    if(!validIds.length)return;
    const plan=createVoidVortexPlan(validIds,visualDelay);if(!plan)return;
    syncVoidVortexVisuals();
    // Keep presentation bounded during fast attacks and overlapping echoes.
    while(voidVortexVisuals.size>=4)voidVortexVisuals.values().next().value.remove();
    const drawing=window.CombatWebGLEffects?.vortex(plan)||renderVoidVortexSvg(plan);
    const visual={mapId:state.selectedMap,remove(){clearTimeout(visual.timer);drawing.remove();voidVortexVisuals.delete(visual);}};
    voidVortexVisuals.add(visual);
    visual.timer=setTimeout(()=>visual.remove(),plan.reduced?plan.impactDuration:plan.duration+plan.delay+20);
}

function tickPlayerMana(elapsed) {
    return combatAbilities.tickPlayerMana(elapsed);
}

function triggerAttackSpells() {
    return combatAbilities.triggerAttackSpells();
}

function renderPlayerMana() {
    const maximum=normalizePlayerMana(),panel=document.getElementById('playerMana');
    updateCombatHidden(panel,maximum<=0);
    updateCombatText(document.getElementById('playerManaText'),Math.floor(state.playerMana+1e-8)+' / '+maximum+' Mana');
    const track=document.getElementById('playerManaTrack');
    document.getElementById('playerManaBar').style.width=(maximum?state.playerMana/maximum*100:0)+'%';
    updateCombatAttribute(track,'aria-valuemax',maximum);
    updateCombatAttribute(track,'aria-valuenow',Math.floor(state.playerMana));
    const costs=[];
    // Allocated abilities cast automatically; omit costs from unused skill branches.
    for(const brand of elementalBrands)if(getSkillNodeRank(brand.id)>0)
        costs.push(brand.name+': '+elementalSkillSettings.manaCost+' mana per cast.');
    for(const [id,settings]of Object.entries(spellSettings))if(getSkillNodeRank(id)>0){
        const cost=id==='voidVolley'?settings.charges+' charges and '+settings.manaCost+' mana.':settings.manaCost+' mana per cast.';
        costs.push(skillNodeById[id].name+': '+cost);
    }
    updateCombatAttribute(panel,'title',[combatStatFormatter.format(getPlayerManaRegen())+' mana/s.',...costs].join(' '));
}

function getVoidVolleyCurve(start,target,index,count,noise,frame) {
    const dx=target.x-start.x,dy=target.y-start.y,distance=Math.max(1,Math.hypot(dx,dy));
    const forward={x:dx/distance,y:dy/distance},sideways={x:-forward.y,y:forward.x};
    const fan=(index-(count-1)/2)/Math.max(1,(count-1)/2);
    const side=Math.sign(fan)||(noise[index*4]%2?1:-1);
    const jitter=(offset,amount)=>(noise[index*4+offset]/4294967296-.5)*amount;
    const bend=side*(Math.min(180,Math.max(70,distance*.45))*(.85+Math.abs(fan)*.25));
    // Launch sideways into a broad hook, then bring the second control point
    // close to the aim line so the final approach turns toward the target.
    const opening={
        x:Math.max(12,Math.min(frame.width-12,start.x+dx*.05+sideways.x*bend+jitter(0,30))),
        y:Math.max(12,Math.min(frame.height-12,start.y+dy*.05+sideways.y*bend+jitter(1,30)))
    };
    const approach={x:target.x-dx*.35+sideways.x*bend*.06+jitter(2,14),
        y:target.y-dy*.35+sideways.y*bend*.06+jitter(3,14)};
    return 'C'+opening.x+' '+opening.y+' '+approach.x+' '+approach.y+' ';
}

function showVoidVolleyPlayerGlow(holdSeconds,windupSeconds=0) {
    emitCombatEvent('voidVolleyPlayerGlow', {mapId:state.selectedMap,epoch:voidMissilePresentationEpoch,holdSeconds,windupSeconds});
}

function presentVoidVolleyPlayerGlow({holdSeconds,windupSeconds}) {
    if (!combatEffectEnabled('glows') || !combatEffectEnabled('abilities')) return;
    if(holdSeconds<=0 || state.playerHp<=0)return;
    if(window.CombatWebGLEffects?.glow(holdSeconds,windupSeconds))return;
    const panel=elements.playerHealthPanel,now=performance.now();
    let glow=panel.querySelector('.void-volley-player-glow');
    const until=Math.max(Number(glow?.dataset.releaseAt)||0,now+holdSeconds*1000);
    // Overlapping volleys share one glow; an earlier cast cannot end a later one.
    // A new charge-up must not dim the plate while an earlier volley is firing.
    const launchAt=Math.min(Number(glow?.dataset.launchAt)||Infinity,now+Math.max(0,windupSeconds)*1000);
    if(glow&&Number(glow.dataset.releaseAt)===until&&Number(glow.dataset.launchAt)===launchAt)return;
    const holdMilliseconds=until-now;
    if(!glow){
        glow=document.createElement('span');glow.className='void-volley-player-glow';
        glow.setAttribute('aria-hidden','true');panel.append(glow);
        glow.addEventListener('animationend',event=>{
            if(event.target===glow&&performance.now()>=Number(glow.dataset.releaseAt))glow.remove();
        });
    }
    glow.dataset.releaseAt=until;
    glow.dataset.launchAt=launchAt;
    glow.style.setProperty('--void-volley-glow-hold',holdMilliseconds+'ms');
    glow.style.setProperty('--void-volley-glow-windup',Math.max(0,launchAt-now)+'ms');
    restartCombatAnimation(glow,'is-releasing');
    window.setTimeout(()=>{
        if(Number(glow.dataset.releaseAt)===until)glow.remove();
    },holdMilliseconds+200);
}

function showSpellCast(kind,hits,visualDelay=0) {
    if (kind==='voidBolt') {
        if (combatEffects===null || !hits.length) return;
        emitCombatEvent('voidBoltCast', {
            mapId:state.selectedMap, visualDelay,
            hits:hits.map((hit,index)=>({
                targetId:hit.targetId, sourceId:hit.sourceId,
                schedule:getVoidMissileSchedule(index,visualDelay,hit.flight??voidMissileTiming.flight)
            })),
            lifetime:visualDelay+1000+hits.length*voidMissileTiming.stagger*1000
        });
        return;
    }
    if (combatEffects===null || !hits.length) return;
    emitCombatEvent('voidVolleyCast', {
        mapId:state.selectedMap,epoch:voidMissilePresentationEpoch,visualDelay,
        hits:hits.map((hit,index)=>{
            const schedule=getVoidMissileSchedule(index,visualDelay,hit.flight??voidMissileTiming.flight);
            return {targetId:hit.targetId,sourceId:hit.sourceId,schedule,
                missileId:trackVoidMissile(hit.missile,schedule)};
        }),
        lifetime:visualDelay+1000+hits.length*voidMissileTiming.stagger*1000
    });
}

function presentVoidVolleyCast({mapId,epoch,hits,visualDelay,lifetime}) {
    if(epoch!==voidMissilePresentationEpoch || !combatEffectEnabled('projectiles'))return;
    const visuals=hits.map(hit=>{
        const timeline=voidMissileTimelines.get(hit.missileId);
        if(timeline?.status==='cancelled' || !getCombatEffectMonster(hit.targetId) || !getCombatEffectCard(hit.targetId) ||
            hit.sourceId && (!getCombatEffectMonster(hit.sourceId) || !getCombatEffectCard(hit.sourceId)))return {cancelled:true};
        const visual={circle:null,cancelled:false};
        if(hit.missileId!==undefined)voidMissileVisuals.set(hit.missileId,visual);
        return visual;
    });
    if(visuals.every(visual=>visual.cancelled))return;
    const agedHits=hits.map(hit=>({...hit,remaining:voidMissileTimelines.get(hit.missileId)?.remaining??hit.schedule.arrival}));
    presentSpellCast('voidVolley',agedHits,visualDelay,visuals,mapId,lifetime);
}

function presentVoidMissileCancelled({epoch,missileId}) {
    if(epoch!==voidMissilePresentationEpoch)return;
    const visual=voidMissileVisuals.get(missileId);
    if(visual){visual.cancelled=true;visual.circle?.remove();voidMissileVisuals.delete(missileId);}
}

function presentVoidBoltCast({mapId,hits,visualDelay,lifetime}) {
    if (!combatEffectEnabled('projectiles')) return;
    const visuals=hits.map(hit=>!getCombatEffectMonster(hit.targetId) || !getCombatEffectCard(hit.targetId) ||
        hit.sourceId && (!getCombatEffectMonster(hit.sourceId) || !getCombatEffectCard(hit.sourceId)) ? {cancelled:true} : null);
    if (visuals.every(visual=>visual?.cancelled)) return;
    presentSpellCast('voidBolt',hits,visualDelay,visuals,mapId,lifetime);
}

function presentSpellCast(kind,hits,visualDelay,visuals,mapId,lifetime=visualDelay+1000+hits.length*voidMissileTiming.stagger*1000) {
    if (!isCombatView() || state.selectedMap!==mapId || !hits.length) return;
    if(window.CombatWebGLEffects?.spells(kind,hits,visualDelay,visuals))return;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('spell-effect',kind==='voidVolley'?'spell-void-volley':'spell-void-bolt');svg.setAttribute('aria-hidden','true');
    svg.dataset.spell=kind;
    elements.combatPanel.append(svg);
    const frame=getCombatOverlayBounds(svg);
    if (!frame.width || !frame.height) {svg.remove();return;}
    svg.setAttribute('viewBox','0 0 '+frame.width+' '+frame.height);
    const centers=new Map();
    const center=id=>{
        if (centers.has(id)) return centers.get(id);
        const card=getCombatEffectCard(id);if (!card)return null;
        const bounds=getCombatEffectBounds(card),point={x:bounds.left+bounds.width/2-frame.left,y:bounds.top+bounds.height/2-frame.top};
        centers.set(id,point);return point;
    };
    const player=getCombatEffectBounds(elements.playerHealthPanel);
    const origin={x:player.left+player.width/2-frame.left,y:player.bottom-frame.top};
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Cosmetic randomness must not advance the combat RNG, including offline.
    const noise=kind==='voidVolley'?crypto.getRandomValues(new Uint32Array(hits.length*4)):null;
    let sourceGlowHold=0;
    let sourceGlowWindup=Infinity;
    hits.forEach((hit,index)=>{
        if(visuals[index]?.cancelled)return;
        const point=center(hit.targetId);if(!point)return;
        const start=hit.sourceId?(center(hit.sourceId)||origin):origin;
        const schedule=hit.schedule||getVoidMissileSchedule(index,visualDelay,hit.flight??voidMissileTiming.flight);
        // Batched effects can be presented after simulation has advanced.
        // Start partway through that same flight instead of replaying it.
        const age=Math.max(0,schedule.arrival-(hit.remaining??schedule.arrival));
        const flight=schedule.flight,delay=(schedule.delay-age)*1000;
        const contactDelay=Math.max(0,schedule.arrival-age)*1000;
        if(kind==='voidVolley'&&!hit.sourceId){
            // Keep the emitter lit through the last launch and the slow
            // opening tail leaving the plate. Reduced motion flashes at contact.
            sourceGlowHold=Math.max(sourceGlowHold,reducedMotion?contactDelay/1000+.18:
                schedule.delay-age+flight*.4);
            sourceGlowWindup=Math.min(sourceGlowWindup,Math.max(0,reducedMotion?contactDelay/1000:delay/1000));
        }
        const fan=kind==='voidVolley'?(index-(hits.length-1)/2)*21:(index-(hits.length-1)/2)*12;
        const control={x:(start.x+point.x)/2+fan,y:Math.max(0,(start.y+point.y)/2-Math.abs(fan)*.65-30)};
        const path=document.createElementNS(svg.namespaceURI,'path');
        const curve=noise
            ? getVoidVolleyCurve(start,point,index,hits.length,noise,frame)
            : 'Q'+control.x+' '+control.y+' ';
        path.setAttribute('d','M'+start.x+' '+start.y+' '+curve+point.x+' '+point.y);
        path.setAttribute('pathLength','1');path.dataset.targetId=hit.targetId;
        // A reduced-motion line shows the whole route. Flash it at contact,
        // rather than making it look as though the missile arrived at launch.
        path.style.animationDelay=(reducedMotion?contactDelay:delay)+'ms';
        if(!reducedMotion){
            path.style.animationDuration=flight+'s';
            if(kind==='voidVolley')path.style.animationTimingFunction='cubic-bezier('+voidMissileEasing.join(',')+')';
        }
        svg.append(path);
        const missile=document.createElementNS(svg.namespaceURI,'circle');
        missile.classList.add('void-missile');missile.setAttribute('r',kind==='voidVolley'?3.5:4.5);
        missile.style.animationDelay=delay+'ms';missile.style.animationDuration=flight+'s';
        const motion=document.createElementNS(svg.namespaceURI,'animateMotion');
        motion.setAttribute('path',path.getAttribute('d'));motion.setAttribute('dur',flight+'s');motion.setAttribute('calcMode','paced');motion.setAttribute('begin','indefinite');motion.setAttribute('fill','freeze');
        if(kind==='voidVolley'){
            motion.setAttribute('calcMode','spline');motion.setAttribute('keyTimes','0;1');
            motion.setAttribute('keyPoints','0;1');motion.setAttribute('keySplines',voidMissileEasing.join(' '));
        }
        missile.append(motion);svg.append(missile);motion.beginElementAt(delay/1000);
        const circle=document.createElementNS(svg.namespaceURI,'circle');
        circle.classList.add('void-impact');
        circle.setAttribute('cx',point.x);circle.setAttribute('cy',point.y);circle.setAttribute('r',kind==='voidVolley'?18:14);
        circle.style.animationDelay=contactDelay+'ms';svg.append(circle);
        if(visuals[index])visuals[index].circle=circle;
    });
    if(sourceGlowHold>0)presentVoidVolleyPlayerGlow({holdSeconds:sourceGlowHold,windupSeconds:sourceGlowWindup});
    window.setTimeout(()=>svg.remove(),lifetime);
}

function showVoidMissileImpact(targetId,missile) {
    const missileId=missile&&voidMissilePresentationIds.get(missile);
    const timeline=voidMissileTimelines.get(missileId);
    if(timeline)timeline.status='arrived';
    emitCombatEvent('voidMissileImpact', {mapId:state.selectedMap,epoch:voidMissilePresentationEpoch,targetId,missileId});
}

function presentVoidMissileImpact({targetId,missileId,epoch}) {
    if(epoch!==voidMissilePresentationEpoch)return;
    const visual=voidMissileVisuals.get(missileId);
    voidMissileVisuals.delete(missileId);
    if (!combatEffectEnabled('abilities')) return;
    // Visible casts already own a ring on the projectile's exact timeline.
    // Saves and casts launched offscreen have no visual handle and use a fallback.
    if(visual?.circle)return;
    if(!getCombatEffectMonster(targetId))return;
    if(window.CombatWebGLEffects?.impact(targetId))return;
    const card=getCombatEffectCard(targetId);if(!card)return;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('spell-effect','spell-void-volley','spell-impact-effect');
    svg.setAttribute('aria-hidden','true');svg.dataset.targetId=targetId;
    elements.combatPanel.append(svg);
    const frame=getCombatOverlayBounds(svg),bounds=getCombatEffectBounds(card);
    svg.setAttribute('viewBox','0 0 '+frame.width+' '+frame.height);
    const circle=document.createElementNS(svg.namespaceURI,'circle');circle.classList.add('void-impact');
    circle.setAttribute('cx',bounds.left+bounds.width/2-frame.left);
    circle.setAttribute('cy',bounds.top+bounds.height/2-frame.top);circle.setAttribute('r',18);svg.append(circle);
    window.setTimeout(()=>svg.remove(),500);
}
