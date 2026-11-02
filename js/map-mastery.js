(function () {
    'use strict';
    const $=id=>document.getElementById(id);
    let opened=false, selected='root', signature='', message='';
    const unlocked=map=>TownProgression.masteryUnlocked(state,worldData.findIndex(world=>world.mapIds.includes(map.id)));
    function award(map) {
        if(!unlocked(map))return false;
        const earned=MasterySystem.milestone(map,state.kills[map.id]||0,0,worldContent).earned, previous=state.mapMastery?.[map.id];
        if(earned<=(previous?.earned||0))return false;
        state.mapMastery={...state.mapMastery,[map.id]:{earned,nodes:[...(previous?.nodes||[])]}};return true;
    }
    function transact(nodes) {
        if(SaveCompatibility.protection.blocked||simulatingCombat||!unlocked(currentMap()))return false;
        const map=currentMap(), current=MasterySystem.record(state,map,worldContent), previousDefinitions=monsterDefinitions(map),before={mastery:state.mapMastery,monsters:state.monsterStates,hp:state.playerHp,mana:state.playerMana,capacity:state.manaCapacity,eruptions:state.pendingEruptions,missiles:state.pendingVoidMissiles,target:state.targetMonsterId};
        state.mapMastery={...state.mapMastery,[map.id]:{earned:current.earned,nodes}};
        invalidateSkillBonusCache();if(combatStatCache)combatStatCache.clear();
        try {
            MasterySystem.assertProfile(state.mapMastery);
            refreshMasteryMonsters(previousDefinitions);
            state.playerHp=Math.min(state.playerHp,getPlayerMaxHealth());state.playerMana=Math.min(state.playerMana,getPlayerMaxMana());state.manaCapacity=getPlayerMaxMana();
            localStorage.setItem(saveKey,JSON.stringify(createGameSave()));
        } catch(error) {
            state.mapMastery=before.mastery;state.playerHp=before.hp;state.playerMana=before.mana;state.manaCapacity=before.capacity;
            state.monsterStates=before.monsters;state.pendingEruptions=before.eruptions;state.pendingVoidMissiles=before.missiles;state.targetMonsterId=before.target;syncLegacyEnemyState();
            invalidateSkillBonusCache();if(combatStatCache)combatStatCache.clear();message='Could not save mastery. Your points and previous choices were kept.';signature='';render();return false;
        }
        signature='';window.render();return true;
    }
    function learn(id=selected) {
        const map=currentMap(), tree=MasterySystem.tree(worldContent,map), record=MasterySystem.record(state,map,worldContent);
        if(MasterySystem.available(state,map,worldContent)<1||!MasterySystem.canLearn(tree,record.nodes,id))return false;
        return transact([...record.nodes,id]);
    }
    function refund(id=selected) {
        const map=currentMap(),tree=MasterySystem.tree(worldContent,map),record=MasterySystem.record(state,map,worldContent);
        if(!record.nodes.includes(id))return false;
        const remaining=record.nodes.filter(node=>node!==id),active=MasterySystem.activeNodes(tree,remaining),known=new Set(tree.nodes.map(node=>node.id));
        return transact(remaining.filter(node=>!known.has(node)||active.has(node)));
    }
    function close(repaint=true) {opened=false;signature='';message='';if(repaint){window.render();$('openMapMastery').focus({preventScroll:true});}}
    function open() {if(!unlocked(currentMap()))return false;opened=true;selected=MasterySystem.tree(worldContent,currentMap()).nodes.find(node=>!node.start)?.id||null;signature='';message='';window.render();$('mapMasteryTitle').focus({preventScroll:true});}
    function render() {
        const map=currentMap(), record=MasterySystem.record(state,map,worldContent),available=MasterySystem.available(state,map,worldContent),tree=MasterySystem.tree(worldContent,map);
        const complete=tree.nodes.every(node=>node.start||record.nodes.includes(node.id));
        const button=$('openMapMastery');updateCombatText(button,complete?'Mastery ✓':'Mastery'+(available>0?' ('+available+')':''));button.classList.toggle('has-points',available>0&&!complete);
        const accessible=unlocked(map);button.hidden=!accessible;button.disabled=!accessible;
        const worldIndex=worldData.findIndex(world=>world.mapIds.includes(map.id));
        button.title=accessible?'Monster mastery':worldIndex===0?'Build the Menagerie after reaching Town Hall T2 to unlock mastery.':worldIndex===1?'Prestige the Menagerie to unlock World 2 mastery.':'Mastery is not yet available for this world.';
        if(!accessible)opened=false;
        button.setAttribute('aria-expanded',String(opened));$('mapMasteryPanel').hidden=!opened;elements.combatPanel.hidden=opened;
        if(!opened||state.currentView!=='map')return;
        const kills=state.kills[map.id]||0,next=MasterySystem.milestone(map,kills,record.earned,worldContent);
        updateCombatText($('masteryCombatStatus'),state.playerHp<=0?'You were defeated. Return to combat to revive.':state.combatPaused?'Combat is paused. Return to combat to resume.':'Combat continues while you view mastery.');
        updateCombatText($('mapMasteryTitle'),map.name+' Mastery');updateCombatText($('mapMasteryPoints'),'Available mastery points: '+available+' · Earned: '+record.earned+' · Spent: '+record.nodes.length);
        updateCombatText($('mapMasteryMilestone'),(next.next===null?'All mastery milestones reached':'Next +2 points at '+next.next.toLocaleString('en-US')+' kills')+' · '+kills.toLocaleString('en-US')+' total kills');
        $('mapMasteryProgress').max=next.step;$('mapMasteryProgress').value=next.next===null?1:Math.max(0,kills-next.previous);
        $('mapMasteryProgress').setAttribute('aria-label','Kills toward the next two mastery points');
        const key=JSON.stringify([map.id,map.name,tree,record,selected,SaveCompatibility.protection.blocked,message]);if(key===signature)return;signature=key;
        if(!tree.nodes.some(node=>node.id===selected&&!node.start))selected=tree.nodes.find(node=>!node.start)?.id||null;
        const active=MasterySystem.activeNodes(tree,record.nodes);
        MasteryTree.render($('mapMasteryTree'),tree,{active,selected,passiveStart:true,available:node=>available>0&&MasterySystem.canLearn(tree,record.nodes,node.id),select:id=>{selected=id;signature='';render();}});
        const node=tree.nodes.find(node=>node.id===selected&&!node.start);
        $('masterySelectedName').closest('.mastery-node-details').hidden=!node;if(!node)return;
        $('masterySelectedName').textContent=node.name;$('masterySelectedDescription').textContent=node.description;
        $('masterySelectedBonuses').replaceChildren(...MasterySystem.describeStats(node.stats).split('\n').map(text=>Object.assign(document.createElement('li'),{textContent:text})));
        $('masterySelectedPenalties').replaceChildren(...MasterySystem.describeStats(node.penalties).split('\n').map(text=>Object.assign(document.createElement('li'),{textContent:text})));
        $('learnMasteryNode').hidden=Boolean(node.start)||record.nodes.includes(selected);
        $('learnMasteryNode').disabled=available<1||!MasterySystem.canLearn(tree,record.nodes,selected)||SaveCompatibility.protection.blocked;
        $('refundMasteryNode').hidden=!record.nodes.includes(selected);$('resetMapMastery').disabled=!record.nodes.length||SaveCompatibility.protection.blocked;
        $('masteryNodeStatus').textContent=message||(node.start?'Free starting node. Each other node costs 1 mastery point.':record.nodes.includes(selected)?'Learned. Refund this node to also refund nodes that depend on it.':MasterySystem.canLearn(tree,record.nodes,selected)?available>0?'Ready to learn for 1 mastery point.':'Earn more kills on this map to gain mastery points.':'Learn the connected nodes below this one first.');
    }
    $('openMapMastery').addEventListener('click',open);$('closeMapMastery').addEventListener('click',()=>close());
    $('learnMasteryNode').addEventListener('click',()=>learn());$('refundMasteryNode').addEventListener('click',()=>refund());$('resetMapMastery').addEventListener('click',()=>transact([]));
    window.MapMastery={award,open,close,render,learn,refund,isOpen:()=>opened};
    render();
}());
