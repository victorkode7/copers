(async function(){
    const checks=[],random=Math.random,originalMultiHit=getMultiHit;
    const check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const preview=new URL(document.currentScript.src).searchParams.has('preview');
    try{
        await document.fonts.ready;const sprite=await ReapSprite.ready;clearOfflineRecap();
        const monsters=Array.from({length:9},(_,index)=>({id:'m'+index,hp:100}));
        const selection=ReapTargeting.select(monsters,'m4',3);
        check('cone always includes the primary and caps at four unique targets',selection.targetIds[0]==='m4'&&selection.targetIds.length===4&&new Set(selection.targetIds).size===4);
        check('secondary targets lie in a cone within range',selection.targetIds.slice(1).every(id=>{
            const index=monsters.findIndex(monster=>monster.id===id),dx=index%3-1,dy=Math.floor(index/3)-1;
            return Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-selection.angle),Math.cos(Math.atan2(dy,dx)-selection.angle)))<=ReapTargeting.halfAngle+1e-8&&Math.hypot(dx,dy)<=ReapTargeting.range;
        }));
        const dead=selection.targetIds[1];monsters.find(monster=>monster.id===dead).hp=0;
        check('dead monsters are excluded',!ReapTargeting.select(monsters,'m4',3).targetIds.includes(dead));
        check('targeting is deterministic without randomness',JSON.stringify(ReapTargeting.select(monsters,'m4',3))===JSON.stringify(ReapTargeting.select(monsters,'m4',3)));
        const far=Array.from({length:10},(_,index)=>({id:'f'+index,hp:index===0||index===9?100:0}));
        check('cone cannot jump across distant empty slots',ReapTargeting.select(far,'f0',1).targetIds.length===1);
        const sameIds=(actual,expected)=>JSON.stringify([...actual].sort())===JSON.stringify([...expected].sort());
        for(const [dx,dy] of [[1,-1],[1,1],[-1,1],[-1,-1]]){
            const grid=Array.from({length:25},(_,index)=>({id:'q'+index,hp:0}));
            const adjacent=[12,12+dy*5,12+dx,12+dy*5+dx];
            adjacent.forEach(index=>{grid[index].hp=100;});grid[12+dy*10+dx*2].hp=100;
            check('quadrant '+dx+','+dy+' hits only its two cardinal neighbors and diagonal',sameIds(ReapTargeting.select(grid,'q12',5).targetIds,adjacent.map(index=>'q'+index)));
            grid[12+dy*5].hp=0;
            check('quadrant '+dx+','+dy+' never replaces a dead neighbor with a distant target',sameIds(ReapTargeting.select(grid,'q12',5).targetIds,adjacent.filter(index=>grid[index].hp>0).map(index=>'q'+index)));
        }
        const row=Array.from({length:5},(_,index)=>({id:'r'+index,hp:100}));
        check('a single row hits only the immediately adjacent enemy',sameIds(ReapTargeting.select(row,'r0',5).targetIds,['r0','r1']));
        const sample=document.createElement('canvas');sample.width=sample.height=1600;const sampleContext=sample.getContext('2d',{willReadFrequently:true});
        for(const [width,height] of [[180,220],[300,140]])for(const [dx,dy] of [[1,-1],[1,1],[-1,1],[-1,-1]]){
            const primary={left:800-width/2,top:800-height/2,width,height};
            const offset=(x,y)=>({...primary,left:primary.left+x*(width+8),top:primary.top+y*(height+8)});
            const diagonal=offset(dx,dy),placement=ReapSprite.layout(primary,[offset(dx,0),offset(0,dy),diagonal],Math.atan2(dy,dx));
            const center={x:diagonal.left+width/2,y:diagonal.top+height/2};
            const contactAt=frame=>{
                sampleContext.clearRect(0,0,1600,1600);
                sprite.drawFrame(sampleContext,frame,placement.pivot.x,placement.pivot.y,placement.size,{facing:placement.facing,bloodAlpha:0});
                const pixels=sampleContext.getImageData(Math.round(center.x)-2,Math.round(center.y)-2,5,5).data;
                return pixels.some((value,index)=>index%4===3&&value>128);
            };
            check('mid-swing blade crosses the '+dx+','+dy+' diagonal center with '+width+'x'+height+' cards',contactAt(6)&&!contactAt(3)&&!contactAt(9));
        }
        const edge=Array.from({length:10},(_,index)=>({id:'e'+index,hp:index===4||index===5?100:0}));
        check('adjacency never wraps across row edges',sameIds(ReapTargeting.select(edge,'e4',5).targetIds,['e4']));
        const map=currentMap();
        function fresh(){
            state.level=1;state.skillPoints=0;state.experience=0;state.experienceRemainder=0;state.skillRanks={reapPreview:1};
            state.gear=createEmptyGear();state.upgrades={strength:0,haste:0,evasion:0};state.tutorials=createTutorialState();
            state.currentView='map';state.isInTown=false;state.combatPaused=false;state.playerHp=100;combatStatCache=null;invalidateSkillBonusCache();
            map.spawns=[{id:'coneTarget',monsterId:worldContent.monsters[0].id,count:9,overrides:{health:10000,attackDamage:0,attackInterval:1000,evasion:0,gold:[0,0],experience:0,drops:[],itemDrops:[]}}];
            resetMonsterStates(map);state.targetMonsterId=state.monsterStates[4].id;render();state.monsterColumns=3;
            state.attackTimer=getAttackSpeed()-.05;Math.random=()=>0;
        }
        fresh();const damage=getDamage();getMultiHit=()=>100;
        simulateCombatStep(.1,false);getMultiHit=originalMultiHit;
        const cast=state.pendingReapAttacks[0],selected=[...cast.targetIds];
        check('Reap ignores excessive multihit and queues only four targets',selected.length===4&&selected[0]===state.targetMonsterId);
        check('damage waits for the peak window',state.monsterStates.every(monster=>monster.hp===10000));
        const saved=parseGameSave(JSON.stringify(createGameSave()));applyGameSave(saved);
        simulateCombatStep(.1,false);simulateCombatStep(.1,false);
        check('Reap deals 100% to the primary and 300% to each chosen neighbor',state.monsterStates.every(monster=>monster.hp===10000-(selected.includes(monster.id)?damage*(monster.id===selected[0]?1:3):0)));
        check('monsters outside the cone stay untouched',state.monsterStates.filter(monster=>!selected.includes(monster.id)).every(monster=>monster.hp===10000));
        const primary=getCombatEffectCard(state.targetMonsterId),rect=primary.getBoundingClientRect();
        const otherRects=selected.slice(1).map(id=>getCombatEffectCard(id).getBoundingClientRect());
        const layout=ReapSprite.layout(rect,otherRects,selection.angle);
        check('visual scales beyond a monster frame',layout.size>Math.max(rect.width,rect.height));
        check('hilt pivot is anchored to the primary target center',layout.pivot.x===rect.left+rect.width/2&&layout.pivot.y===rect.top+rect.height/2);
        check('visual radius reaches all adjacent targets without the old oversized padding',otherRects.every(other=>Math.hypot(other.left+other.width/2-layout.pivot.x,other.top+other.height/2-layout.pivot.y)+Math.min(other.width,other.height)*.12<=layout.size*.44+.1));
        let clock=0,next;const player=new ScytheReapEffect({weaponImage:sprite.weaponImage,bloodImage:sprite.bloodImage,now:()=>clock,requestFrame:cb=>{next=cb;return 1;},cancelFrame:()=>{next=null;}});await player.ready;
        player.play({target:primary,size:layout.size,facing:layout.facing});const pivots=[],originalTranslate=player.context.translate.bind(player.context);
        const weaponFacings=[],originalDraw=player.context.drawImage.bind(player.context);
        player.context.drawImage=(image,...args)=>{if(image===sprite.weaponSprite){const transform=player.context.getTransform();weaponFacings.push(Math.atan2(transform.b,transform.a));}originalDraw(image,...args);};
        player.context.translate=(x,y)=>{pivots.push([x,y]);originalTranslate(x,y);};
        for(const elapsed of [0,120,240,360]){clock=elapsed;const callback=next;next=null;callback();}
        const worldPivots=pivots.filter(([x,y])=>x!==0||y!==0);
        check('every animation layer uses the same grip pivot',worldPivots.length===8&&worldPivots.every(([x,y])=>x===layout.pivot.x&&y===layout.pivot.y));player.clear();
        check('the whole cast keeps one facing without adding an animated spin',weaponFacings.length===4&&weaponFacings.every(angle=>Math.abs(Math.sin(angle-layout.facing))<1e-8));
        ReapSprite.clear();ReapSprite.show(state.targetMonsterId);const visualCast=[...sprite.active][0];
        check('the gameplay trigger preserves the compact size and aimed facing',visualCast&&Math.abs(visualCast.facing-layout.facing)<1e-8&&Math.abs(visualCast.size-layout.size)<1);ReapSprite.clear();
        fresh();for(let i=0;i<5;i++)simulateCombatStep(.1,false);const offline=JSON.stringify(state.monsterStates.map(monster=>monster.hp));
        fresh();for(let i=0;i<5;i++){const step=simulateCombatStep(.1,true);flushCombatEffects(step.effects);}
        check('foreground and offline cone damage agree',JSON.stringify(state.monsterStates.map(monster=>monster.hp))===offline);
        state.combatPaused=true;ReapSprite.clear();check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
        if(preview){
            elements.combatPanel.scrollIntoView({block:'start'});await wait(60);const plan=ReapTargeting.select(state.monsterStates,state.targetMonsterId,state.monsterColumns);
            ReapSprite.show(state.targetMonsterId,plan);const cast=[...sprite.active][0];sprite.now=()=>cast.born+225;sprite.tick();await wait(40);
        }
    }catch(error){checks.push('ERROR '+error.stack);}finally{Math.random=random;getMultiHit=originalMultiHit;}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
