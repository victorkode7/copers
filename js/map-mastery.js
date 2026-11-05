(function () {
    'use strict';
    const $=id=>document.getElementById(id);
    const unlocked=map=>TownProgression.masteryUnlocked(state,worldData.findIndex(world=>world.mapIds.includes(map.id)));
    let opened=false, selected='root', signature='', message='', wasAccessible=unlocked(currentMap()), unlockCalloutTimer;
    let renderedSelection=null,hold=null,ignoreGestureClick=false;
    const holdDuration=600,treeElement=$('mapMasteryTree');
    function cancelHold(){
        if(!hold)return;clearTimeout(hold.timer);hold.node.classList.remove('is-refunding');hold=null;
    }
    function gestureNode(event){
        const node=event.target.closest?.('button[data-mastery-node]');return node&&treeElement.contains(node)?node:null;
    }
    treeElement.addEventListener('dblclick',event=>{
        const node=gestureNode(event);if(!node||node.classList.contains('is-root')||ignoreGestureClick)return;
        event.preventDefault();cancelHold();selected=node.dataset.masteryNode;learn(selected);render();
    });
    treeElement.addEventListener('pointerdown',event=>{
        cancelHold();ignoreGestureClick=false;
        const node=gestureNode(event);
        if(!node||event.button!==0||!event.isPrimary||!opened||state.currentView!=='map'||SaveCompatibility.protection.blocked)return;
        const map=currentMap(),id=node.dataset.masteryNode;
        const reset=MasterySystem.tree(worldContent,map).nodes.some(entry=>entry.id===id&&entry.start),record=MasterySystem.record(state,map,worldContent);
        if(reset?record.nodes.length===0:!record.nodes.includes(id))return;
        const pending={node,id,reset,mapId:map.id,pointerId:event.pointerId,x:event.clientX,y:event.clientY};hold=pending;
        node.classList.add('is-refunding');
        pending.timer=setTimeout(()=>{
            if(hold!==pending)return;
            cancelHold();
            if(!opened||state.currentView!=='map'||state.selectedMap!==pending.mapId||!node.isConnected)return;
            ignoreGestureClick=true;
            if(pending.reset)refundAll();else{selected=id;refund(id);}
            render();
        },holdDuration);
    });
    addEventListener('pointermove',event=>{
        if(hold&&event.pointerId===hold.pointerId&&Math.hypot(event.clientX-hold.x,event.clientY-hold.y)>8)cancelHold();
    });
    treeElement.addEventListener('pointerout',event=>{if(hold&&event.pointerId===hold.pointerId&&!hold.node.contains(event.relatedTarget))cancelHold();});
    for(const type of ['pointerup','pointercancel'])addEventListener(type,event=>{if(hold&&event.pointerId===hold.pointerId)cancelHold();});
    treeElement.addEventListener('click',event=>{if(ignoreGestureClick&&event.detail){event.preventDefault();event.stopImmediatePropagation();}},true);
    treeElement.addEventListener('contextmenu',event=>{if(gestureNode(event))event.preventDefault();});
    addEventListener('blur',cancelHold);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelHold();});
    function clearUnlockCallout(button=$('openMapMastery')) {
        clearTimeout(unlockCalloutTimer);unlockCalloutTimer=null;button.classList.remove('is-newly-unlocked');
    }
    function award(map) {
        if(!unlocked(map))return false;
        const earned=MasterySystem.milestone(map,state.kills[map.id]||0,0,worldContent).earned, previous=state.mapMastery?.[map.id];
        if(earned<=(previous?.earned||0))return false;
        state.mapMastery={...state.mapMastery,[map.id]:{earned,nodes:[...(previous?.nodes||[])]}};return true;
    }
    function transact(nodes) {
        if(SaveCompatibility.protection.blocked||simulatingCombat||!unlocked(currentMap()))return false;
        const map=currentMap(), current=MasterySystem.record(state,map,worldContent), previousDefinitions=monsterDefinitions(map),before={mastery:state.mapMastery,monsters:state.monsterStates,hp:state.playerHp,mana:state.playerMana,capacity:state.manaCapacity,eruptions:state.pendingEruptions,missiles:state.pendingVoidMissiles,reaps:state.pendingReapAttacks,target:state.targetMonsterId};
        state.mapMastery={...state.mapMastery,[map.id]:{earned:current.earned,nodes}};
        invalidateSkillBonusCache();if(combatStatCache)combatStatCache.clear();
        try {
            MasterySystem.assertProfile(state.mapMastery);
            refreshMasteryMonsters(previousDefinitions);
            state.playerHp=Math.min(state.playerHp,getPlayerMaxHealth());state.playerMana=Math.min(state.playerMana,getPlayerMaxMana());state.manaCapacity=getPlayerMaxMana();
            localStorage.setItem(saveKey,JSON.stringify(createGameSave()));
        } catch(error) {
            state.mapMastery=before.mastery;state.playerHp=before.hp;state.playerMana=before.mana;state.manaCapacity=before.capacity;
            state.monsterStates=before.monsters;state.pendingEruptions=before.eruptions;state.pendingVoidMissiles=before.missiles;state.pendingReapAttacks=before.reaps;state.targetMonsterId=before.target;syncLegacyEnemyState();
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
    function refundAll(){
        if(!MasterySystem.record(state,currentMap(),worldContent).nodes.length)return false;
        return transact([]);
    }
    function close(repaint=true) {cancelHold();ignoreGestureClick=false;opened=false;signature='';message='';if(repaint){window.render();$('openMapMastery').focus({preventScroll:true});}}
    function open() {if(!unlocked(currentMap()))return false;cancelHold();ignoreGestureClick=false;clearUnlockCallout();opened=true;selected=MasterySystem.tree(worldContent,currentMap()).nodes.find(node=>!node.start)?.id||null;signature='';message='';window.render();$('mapMasteryTitle').focus({preventScroll:true});}
    function render() {
        const map=currentMap(), record=MasterySystem.record(state,map,worldContent),available=MasterySystem.available(state,map,worldContent),tree=MasterySystem.tree(worldContent,map);
        const complete=tree.nodes.every(node=>node.start||record.nodes.includes(node.id));
        const button=$('openMapMastery');updateCombatText(button,complete?'Mastery ✓':'Mastery'+(available>0?' ('+available+')':''));button.classList.toggle('has-points',available>0&&!complete);
        const accessible=unlocked(map);
        if(accessible&&!wasAccessible) {
            clearUnlockCallout(button);button.classList.add('is-newly-unlocked');
            unlockCalloutTimer=setTimeout(()=>{button.classList.remove('is-newly-unlocked');unlockCalloutTimer=null;},3800);
        } else if(!accessible)clearUnlockCallout(button);
        wasAccessible=accessible;
        button.hidden=!accessible;button.disabled=!accessible;
        const worldIndex=worldData.findIndex(world=>world.mapIds.includes(map.id));
        button.title=accessible?'Monster mastery':worldIndex===0?'Build the Menagerie after reaching Town Hall T2 to unlock mastery.':worldIndex===1?'Prestige the Menagerie to unlock World 2 mastery.':'Mastery is not yet available for this world.';
        if(!accessible)opened=false;
        button.setAttribute('aria-expanded',String(opened));$('mapMasteryPanel').hidden=!opened;elements.combatPanel.hidden=opened;
        if(!opened||state.currentView!=='map'){cancelHold();return;}
        const kills=state.kills[map.id]||0,next=MasterySystem.milestone(map,kills,record.earned,worldContent);
        updateCombatText($('mapMasteryTitle'),map.name+' Mastery');updateCombatText($('mapMasteryPoints'),'Available mastery points: '+available+' · Earned: '+record.earned+' · Spent: '+record.nodes.length);
        updateCombatText($('mapMasteryMilestone'),(next.next===null?'All mastery milestones reached':'Next +2 points at '+next.next.toLocaleString('en-US')+' kills')+' · '+kills.toLocaleString('en-US')+' total kills');
        $('mapMasteryProgress').max=next.step;$('mapMasteryProgress').value=next.next===null?1:Math.max(0,kills-next.previous);
        $('mapMasteryProgress').setAttribute('aria-label','Kills toward the next two mastery points');
        const key=JSON.stringify([map.id,map.name,tree,record,SaveCompatibility.protection.blocked,message]);if(key===signature&&renderedSelection===selected)return;
        if(!tree.nodes.some(node=>node.id===selected&&!node.start))selected=tree.nodes.find(node=>!node.start)?.id||null;
        const active=MasterySystem.activeNodes(tree,record.nodes);
        if(key!==signature){
            cancelHold();signature=key;
            MasteryTree.render(treeElement,tree,{active,selected,passiveStart:true,refundStart:refundAll,available:node=>available>0&&MasterySystem.canLearn(tree,record.nodes,node.id),select:id=>{selected=id;render();}});
        }
        // Selection must preserve node elements so the browser can deliver the
        // second click and dblclick to the same button.
        treeElement.querySelectorAll('button[data-mastery-node]').forEach(button=>{
            if(button.classList.contains('is-root'))return;
            const chosen=button.dataset.masteryNode===selected;button.classList.toggle('is-selected',chosen);button.setAttribute('aria-pressed',String(chosen));
        });renderedSelection=selected;
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
    $('learnMasteryNode').addEventListener('click',()=>learn());$('refundMasteryNode').addEventListener('click',()=>refund());$('resetMapMastery').addEventListener('click',refundAll);
    window.MapMastery={award,open,close,render,learn,refund,isOpen:()=>opened};
    render();
}());
