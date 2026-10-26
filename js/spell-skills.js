// Spells share the same fixed combat steps as attacks and offline progress.
const spellSettings = Object.freeze({
    voidBolt:{manaCost:5}, voidVolley:{manaCost:10,charges:5,missiles:10}
});
const voidMissileTiming = Object.freeze({flight:.4,stagger:.05,redirect:.2,windup:.2});
// These Bezier controls make distance grow as time squared. SVG heads and CSS
// trails share the same acceleration, while their contact deadline stays fixed.
const voidMissileEasing = Object.freeze([1/3,0,2/3,1/3]);
// Visual handles stay outside saves and combat randomness. Each impact ring is
// scheduled beside its projectile so a late combat callback cannot delay it.
const voidMissileVisuals = new WeakMap();

function getVoidMissileSchedule(index,visualDelay=0,flight=voidMissileTiming.flight) {
    const delay=visualDelay/1000+index*voidMissileTiming.stagger;
    // Impacts are resolved on fixed combat steps. Stretch individual flights by
    // at most one step so the visible arrival shares the actual damage deadline.
    const arrival=Math.ceil((delay+flight-1e-8)/gameTickSeconds)*gameTickSeconds;
    return {delay,flight:arrival-delay,arrival};
}

function getPlayerMaxMana() {
    return cachedCombatStat('getPlayerMaxMana', () => Math.max(0,Math.round(
        (getSkillStat('mana') + getGearStat('mana')) * getSkillMultiplier('manaMultiplier') * getGearStat('manaMultiplier'))));
}

function getProfileMaxMana(profile) {
    // Parsing must not replace live state just to calculate an old profile's
    // initial pool. Returning a concrete default also triggers its exact backup.
    const equipment=Object.values(profile.gear).filter(id=>ownsItem(id,profile)).map(id=>itemById[id]);
    const skillMultiplier=Object.entries(profile.skillRanks).reduce((total,[id,rank])=>
        total*Math.pow(skillNodeById[id]?.stats.manaMultiplier||1,rank),1);
    return Math.max(0,Math.round((getSkillStatFromRanks('mana',profile.skillRanks)+Equipment.aggregate(equipment,'mana'))*
        skillMultiplier*Equipment.aggregate(equipment,'manaMultiplier')));
}

function getPlayerManaRegen() {
    return cachedCombatStat('getPlayerManaRegen', () => Math.max(0,
        getSkillStat('manaRegen') + getGearStat('manaRegen') + getPlayerMaxMana() *
        (getSkillStat('manaRegenPercent') + getGearStat('manaRegenPercent'))) * Math.max(0,
        1 + getSkillStat('manaRegenIncrease') + getGearStat('manaRegenIncrease')));
}

function getSpellDamage() {
    return Math.max(0,
        (getSkillStat('spellDamage') + getGearStat('spellDamage')) *
        getSkillMultiplier('spellDamageMultiplier') * getGearStat('spellDamageMultiplier') * (1+state.furyStacks*furyDamagePerStack));
}

function normalizePlayerMana() {
    const maximum=getPlayerMaxMana();
    // Unlocking the first reserve grants a full pool; subsequent capacity
    // increases and swapping equipment cannot repeatedly refill an existing pool.
    if (!state.manaCapacity && maximum > 0) state.playerMana=maximum;
    state.manaCapacity=maximum;
    state.playerMana=Math.max(0,Math.min(maximum,Number.isFinite(state.playerMana)?state.playerMana:0));
    return maximum;
}

function normalizeVoidCharges() {
    state.voidCharges=getSkillNodeRank('voidBolt')>0
        ? Math.max(0,Math.min(spellSettings.voidVolley.charges,state.voidCharges||0)) : 0;
}

function castVoidVolley(visualDelay=0) {
    normalizeVoidCharges();
    if (getSkillNodeRank('voidVolley')<=0 || state.voidCharges<spellSettings.voidVolley.charges ||
        state.combatPaused || state.playerHp<=0 ||
        state.playerMana+1e-8<spellSettings.voidVolley.manaCost || !state.monsterStates.some(monster=>monster.hp>0)) return false;
    const damage=getSpellDamage();if(damage<=0)return false;
    // Every volley gets a short charge-up, including a ready volley released
    // directly by mana regeneration. Damage keeps the same projectile deadline.
    visualDelay=Math.max(visualDelay,voidMissileTiming.windup*1000);
    state.playerMana=Math.max(0,state.playerMana-spellSettings.voidVolley.manaCost);
    state.voidCharges-=spellSettings.voidVolley.charges;
    showVoidVolleyBuffProc();
    const hits=[];
    for(let missile=0;missile<spellSettings.voidVolley.missiles;missile++){
        const living=state.monsterStates.filter(monster=>monster.hp>0);
        if(!living.length)break;
        const target=living[Math.floor(Math.random()*living.length)];
        const pending={targetId:target.id,damage,
            remaining:getVoidMissileSchedule(missile,visualDelay).arrival};
        hits.push({targetId:target.id,missile:pending});
        state.pendingVoidMissiles.push(pending);
    }
    showSpellCast('voidVolley',hits,visualDelay);
    return true;
}

function tickPendingVoidMissiles(elapsed) {
    // Resolve arrivals in time order, including redirects inside a long step.
    // Simulation owns damage; CSS/SMIL events never award hits or rewards.
    let remaining=elapsed;
    while(state.pendingVoidMissiles.length){
        const next=Math.min(...state.pendingVoidMissiles.map(hit=>hit.remaining));
        const step=Math.min(remaining,next);
        state.pendingVoidMissiles.forEach(hit=>{hit.remaining=Math.max(0,hit.remaining-step);});
        remaining-=step;
        const arrived=state.pendingVoidMissiles.filter(hit=>hit.remaining<1e-8);
        if(!arrived.length)break;
        state.pendingVoidMissiles=state.pendingVoidMissiles.filter(hit=>hit.remaining>=1e-8);
        for(const hit of arrived){
            const target=state.monsterStates.find(monster=>monster.id===hit.targetId && monster.hp>0);
            if(target){
                applyDamageToMonster(target,hit.damage,'spell','voidVolley');
                showVoidMissileImpact(target.id,hit);
            }else{
                const visual=voidMissileVisuals.get(hit);
                if(visual){visual.cancelled=true;presentCombatEffect(()=>visual.circle?.remove());voidMissileVisuals.delete(hit);}
                const living=state.monsterStates.filter(monster=>monster.hp>0);
                if(!living.length)continue;
                // A target can die during flight. Turn toward another living
                // enemy and give that visible redirect its own travel time.
                const replacement=living[Math.floor(Math.random()*living.length)];
                const redirected={...hit,targetId:replacement.id,remaining:voidMissileTiming.redirect};
                state.pendingVoidMissiles.push(redirected);
                showSpellCast('voidVolley',[{targetId:replacement.id,sourceId:hit.targetId,flight:voidMissileTiming.redirect,missile:redirected}]);
            }
        }
        if(remaining<1e-8)break;
    }
}

function castVoidBolt() {
    normalizeVoidCharges();
    if (getSkillNodeRank('voidBolt')<=0 || state.combatPaused || state.playerHp<=0 || getSpellDamage()<=0 ||
        state.playerMana+1e-8<spellSettings.voidBolt.manaCost || !activeMonster()) return false;
    // Reserve mana for a charged volley instead of letting repeated cheap bolts
    // keep its mana forever below the 10 needed to release it.
    if(state.voidCharges>=spellSettings.voidVolley.charges && getSkillNodeRank('voidVolley')>0){
        if(!castVoidVolley() || state.playerMana+1e-8<spellSettings.voidBolt.manaCost || !activeMonster())return false;
    }
    const damage=getSpellDamage();
    const targets=getPlayerAttackTargets();
    if(!targets.length)return false;
    state.playerMana=Math.max(0,state.playerMana-spellSettings.voidBolt.manaCost);
    const hits=[];
    for(const target of targets){
        if(target.hp<=0)continue;
        hits.push({targetId:target.id});
        applyDamageToMonster(target,damage,'spell','voidBolt');
        state.voidCharges=Math.min(spellSettings.voidVolley.charges,state.voidCharges+1);
        castVoidVolley(voidMissileTiming.flight*1000+hits.length*voidMissileTiming.stagger*1000);
    }
    showSpellCast('voidBolt',hits);
    return true;
}

function tickPlayerMana(elapsed) {
    const maximum=normalizePlayerMana();
    normalizeVoidCharges();
    if (maximum<=0 || state.combatPaused || state.playerHp<=0) return;
    state.playerMana=Math.min(maximum,state.playerMana+getPlayerManaRegen()*elapsed);
    // A charged volley waits at five stacks when mana is short or no target
    // is alive, then fires as soon as its requirements are satisfied.
    castVoidVolley();
}

function triggerAttackSpells() {
    // One attempt per primary attack, independent of multihit count. Generated
    // abilities and spells cannot recursively generate more spell casts.
    if (state.combatPaused || state.playerHp<=0 || getPlayerMaxMana()<=0) return;
    normalizePlayerMana();
    castVoidVolley();
    if (getSkillNodeRank('voidBolt')>0) castVoidBolt();
}

function renderPlayerMana() {
    const maximum=normalizePlayerMana(),panel=document.getElementById('playerMana');
    updateCombatHidden(panel,maximum<=0);
    updateCombatText(document.getElementById('playerManaText'),Math.floor(state.playerMana+1e-8)+' / '+maximum+' Mana');
    const track=document.getElementById('playerManaTrack');
    document.getElementById('playerManaBar').style.width=(maximum?state.playerMana/maximum*100:0)+'%';
    updateCombatAttribute(track,'aria-valuemax',maximum);
    updateCombatAttribute(track,'aria-valuenow',Math.floor(state.playerMana));
    panel.title=combatStatFormatter.format(getPlayerManaRegen())+' mana/s. Void Bolt: 5 mana per cast. Void Volley: 5 charges and 10 mana.';
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
    if(holdSeconds<=0)return;
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
    const mapId=state.selectedMap;
    const visuals=hits.map(hit=>{
        if(!hit.missile||combatEffects===null||document.hidden)return null;
        const visual={circle:null,cancelled:false};
        voidMissileVisuals.set(hit.missile,visual);
        return visual;
    });
    presentCombatEffect(() => {
        if (state.currentView!=='map' || state.selectedMap!==mapId || !hits.length) return;
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
            const schedule=getVoidMissileSchedule(index,visualDelay,hit.flight??voidMissileTiming.flight);
            // Batched effects can be presented after simulation has advanced.
            // Start partway through that same flight instead of replaying it.
            const age=Math.max(0,schedule.arrival-(hit.missile?.remaining??schedule.arrival));
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
        if(sourceGlowHold>0)showVoidVolleyPlayerGlow(sourceGlowHold,sourceGlowWindup);
        window.setTimeout(()=>svg.remove(),visualDelay+1000+hits.length*voidMissileTiming.stagger*1000);
    });
}

function showVoidMissileImpact(targetId,missile) {
    // Visible casts already own a ring on the projectile's exact timeline.
    // Saves and casts launched offscreen have no visual handle and use a fallback.
    if(missile&&voidMissileVisuals.has(missile)){voidMissileVisuals.delete(missile);return;}
    const mapId=state.selectedMap;
    presentCombatEffect(()=>{
        if(state.currentView!=='map'||state.selectedMap!==mapId)return;
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
    });
}
