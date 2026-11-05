(async function(){
    const checks=[],random=Math.random;
    const check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    try{
        await document.fonts.ready;const sprite=await ReapSprite.ready;clearOfflineRecap();
        state.combatPaused=true;state.currentView='upgrades';state.isInTown=false;
        state.level=2;state.skillPoints=2;state.skillRanks={};state.experience=0;state.experienceRemainder=0;state.tutorials=createTutorialState();pendingSkillRanks={};render();
        const echo=skillNodes.find(node=>node.id==='reapingEcho');
        check('Reaping Echo is connected directly to Reap',echo.requires.length===1&&echo.requires[0]==='reapPreview'&&skillNodeConnections.reapPreview.has(echo.id));
        document.querySelector('[data-skill-node="reapPreview"]').click();document.getElementById('confirmSkillSelection').click();
        document.querySelector('[data-skill-node="reapingEcho"]').click();document.getElementById('confirmSkillSelection').click();
        check('both nodes allocate through the normal skill UI',getSkillNodeRank('reapPreview')===1&&getSkillNodeRank('reapingEcho')===1&&state.skillPoints===0);
        check('the new node survives save parsing',parseGameSave(JSON.stringify(createGameSave())).skillRanks.reapingEcho===1);
        const map=currentMap();
        function fresh(withEcho=true){
            ReapSprite.clear();state.level=2;state.skillPoints=0;state.experience=0;state.experienceRemainder=0;
            state.skillRanks=withEcho?{reapPreview:1,reapingEcho:1}:{reapPreview:1};state.gear=createEmptyGear();state.upgrades={strength:0,haste:0,evasion:0};state.tutorials=createTutorialState();
            state.currentView='map';state.isInTown=false;state.combatPaused=false;state.playerHp=100;combatStatCache=null;invalidateSkillBonusCache();
            map.spawns=[{id:'echoTarget',monsterId:worldContent.monsters[0].id,count:25,overrides:{health:10000,attackDamage:0,attackInterval:1000,evasion:0,gold:[0,0],experience:0,drops:[],itemDrops:[],respawnSeconds:100}}];
            resetMonsterStates(map);state.targetMonsterId=state.monsterStates[12].id;render();state.monsterColumns=5;state.attackTimer=0;Math.random=()=>0;
            return state.monsterStates;
        }
        function step(count=1,visual=false){for(let i=0;i<count;i++){const result=simulateCombatStep(.1,visual);if(visual)flushCombatEffects(result.effects);}}
        let monsters=fresh(),damage=getDamage(),origin=monsters[12].id;
        monsters[7].hp=1;monsters[2].hp=3*damage;queueReapAttack(origin);
        step();check('Reap still waits before applying damage',monsters[12].hp===10000&&monsters[7].hp===1);
        step(1,true);
        check('the primary receives 100% and adjacent enemies receive 300%',monsters[12].hp===10000-damage&&monsters[13].hp===10000-3*damage&&monsters[8].hp===10000-3*damage);
        check('an adjacent Reap kill queues exactly one echo at that corpse',state.pendingReapAttacks.length===1&&state.pendingReapAttacks[0].originId===monsters[7].id&&state.pendingReapAttacks[0].fromKill&&state.pendingReapAttacks[0].arrowTargetId===null&&monsters[7].hp===0);
        check('echo targeting keeps the corpse as origin and selects its living neighbors',state.pendingReapAttacks[0].targetIds[0]===monsters[7].id&&state.pendingReapAttacks[0].targetIds.includes(monsters[2].id));
        check('the new visual is anchored to the slain card',Array.from(sprite.active).some(cast=>cast.target()?.dataset.monsterId===monsters[7].id));
        step();check('an echo has its own delayed hit window',monsters[2].hp===3*damage);
        const saved=parseGameSave(JSON.stringify(createGameSave()));applyGameSave(saved);monsters=state.monsterStates;
        check('a pending corpse-origin echo survives save and load',state.pendingReapAttacks.length===1&&state.pendingReapAttacks[0].fromKill&&state.pendingReapAttacks[0].originId===monsters[7].id);
        step();check('an echo hits new adjacent targets for 300% without hitting its corpse',monsters[2].hp===0&&monsters[3].hp===10000-3*damage&&monsters[7].hp===0);
        check('kills from an echo generate the next Reap',state.pendingReapAttacks.length===1&&state.pendingReapAttacks[0].originId===monsters[2].id);
        step(2);check('a chain ends naturally when its hits cause no further kills',state.pendingReapAttacks.length===0);
        check('physical Reap damage has its own damage-meter entry',getDamageBreakdown().rows.some(row=>row.source==='reapPreview'&&row.damage>0));

        monsters=fresh();origin=monsters[12].id;const plan=ReapTargeting.select(monsters,origin,5);
        plan.targetIds.slice(1).forEach(id=>{monsters.find(monster=>monster.id===id).hp=1;});queueReapAttack(origin);step(2);
        check('each simultaneous Reap kill spawns one distinct echo',state.pendingReapAttacks.length===3&&new Set(state.pendingReapAttacks.map(attack=>attack.originId)).size===3);
        monsters=fresh();monsters[12].hp=1;queueReapAttack(monsters[12].id);step(2);
        check('a primary-target Reap kill also spawns an echo',state.pendingReapAttacks.length===1&&state.pendingReapAttacks[0].originId===monsters[12].id);
        monsters=fresh(false);monsters[12].hp=1;queueReapAttack(monsters[12].id);step(2);
        check('kills cannot echo without allocating the new node',state.pendingReapAttacks.length===0);
        monsters=fresh();monsters[12].hp=1;applyDamageToMonster(monsters[12],10,'physical','shockwaveSlash');
        check('kills by other abilities cannot generate Reap echoes',state.pendingReapAttacks.length===0);
        monsters=fresh();applyDamageToMonster(monsters[12],1,'physical','reapPreview');applyDamageToMonster(monsters[12],10000,'poison','poisonExecute');
        check('a later poison execution is not misattributed to the previous Reap',state.pendingReapAttacks.length===0);
        monsters=fresh();Math.random=()=>.999;queueReapAttack(monsters[12].id);step(2);
        check('missed Reaps deal no damage and cannot generate echoes',monsters.every(monster=>monster.hp===10000)&&state.pendingReapAttacks.length===0);

        monsters=fresh();combatCatchingUp=false;updateCombatFormation();origin=monsters[state.monsterColumns+1].id;
        ReapSprite.show(origin);const fullSize=Array.from(sprite.active).at(-1).size;ReapSprite.clear();
        monsters.forEach(monster=>{if(monster.id!==origin){monster.hp=0;monster.respawnRemaining=100;}});
        ReapSprite.show(origin);const solo=Array.from(sprite.active).at(-1);
        check('one living target retains the full formation-sized sweep',Math.abs(solo.size-fullSize)<.05);
        const primary=getCombatEffectCard(origin).getBoundingClientRect();
        check('an isolated slot still gets a full-sized Reap',ReapSprite.layout(primary,[]).size>Math.max(primary.width,primary.height)*3);

        dispatchEvent(new Event('resize'));const sizes=[];
        for(const count of [1,4,2,3,8,16,1]){
            map.spawns[0].count=count;resetMonsterStates(map);render();
            ReapSprite.clear();ReapSprite.show(state.monsterStates[0].id);sizes.push(Array.from(sprite.active).at(-1).size);
            check('size measurement preserves the '+count+'-enemy encounter',elements.enemyRoster.children.length===count&&!document.querySelector('[data-reap-reference]'));
        }
        check('Reap has the same size with one, two, three, four, eight and sixteen enemies',sizes.every(size=>Math.abs(size-sizes[0])<.01));

        function chain(visual){const targets=fresh();targets[7].hp=1;targets[2].hp=3*getDamage();queueReapAttack(targets[12].id);step(6,visual);return JSON.stringify([targets.map(monster=>monster.hp),state.pendingReapAttacks]);}
        const offline=chain(false);check('foreground and offline chains produce identical damage and queues',chain(true)===offline);
        resetMonsterStates(map);check('changing encounters clears pending Reap chains',state.pendingReapAttacks.length===0);
        state.combatPaused=true;ReapSprite.clear();check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');
    }catch(error){checks.push('ERROR '+error.stack);}finally{Math.random=random;}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
