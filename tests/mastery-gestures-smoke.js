(async function(){
    const checks=[],$=id=>document.getElementById(id),wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const check=(label,ok)=>{checks.push((ok?'PASS ':'FAIL ')+label);if(!ok)throw new Error(label);};
    const originalWrite=Storage.prototype.setItem,map=currentMap();
    const button=id=>$('mapMasteryTree').querySelector('[data-mastery-node="'+id+'"]');
    const nodes=()=>MasterySystem.record(state,map,worldContent).nodes;
    function pointer(type,node,options={}){
        const rect=node.getBoundingClientRect();node.dispatchEvent(new PointerEvent(type,{bubbles:true,button:0,buttons:type==='pointerup'?0:1,pointerId:1,isPrimary:true,pointerType:'mouse',clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2,...options}));
    }
    function click(node,detail=1){pointer('pointerdown',node);pointer('pointerup',node);node.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail}));}
    function doubleClick(id){click(button(id));const node=button(id);click(node,2);node.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true,detail:2}));}
    try{
        await document.fonts.ready;clearOfflineRecap();state.combatPaused=true;resetCombatClock();
        const world=worldForMap(map.id);world.masteryPresets={regular:MasterySystem.clone(MasterySystem.defaultTree(world,0,false)),boss:MasterySystem.clone(MasterySystem.defaultTree(world,0,true))};delete map.masteryTree;
        state.townProgress=TownProgression.defaults();state.townProgress.buildings.menagerie={tier:0,level:1};
        state.selectedWorld=world.id;state.selectedMap=map.id;state.currentView='map';state.isInTown=false;state.playerHp=100;
        map.goal=10;state.kills[map.id]=10000;state.mapMastery={[map.id]:{earned:6,nodes:[]}};
        resetMonsterStates(map);render();MapMastery.open();
        const first=button('wealth1'),other=button('population1');click(other);
        check('single click selects without spending a point',button('population1').classList.contains('is-selected')&&nodes().length===0);
        check('selection preserves node elements for native double-click recognition',first===button('wealth1')&&other===button('population1'));
        doubleClick('wealth1');
        check('double-click learns exactly one node and saves it',nodes().join()==='wealth1'&&JSON.parse(localStorage.getItem(saveKey)).mapMastery[map.id].nodes.join()==='wealth1');
        doubleClick('wealth1');check('double-clicking an allocated node cannot spend another point',nodes().join()==='wealth1');
        doubleClick('wealth4');check('double-click respects prerequisites',nodes().join()==='wealth1');
        doubleClick('wealth2');pointer('pointerdown',button('wealth1'));
        check('holding an allocated node shows refund feedback',button('wealth1').classList.contains('is-refunding'));
        await wait(650);
        check('a completed hold refunds the node and its dependents',nodes().length===0&&MasterySystem.available(state,map,worldContent)===6);
        pointer('pointerup',button('wealth1'));button('wealth1').dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));button('wealth1').dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true,detail:2}));
        check('release after a refund cannot accidentally learn the node again',nodes().length===0);

        doubleClick('wealth1');let node=button('wealth1');pointer('pointerdown',node);await wait(40);pointer('pointerup',node);await wait(650);
        check('a short press cancels the refund and its feedback',nodes().join()==='wealth1'&&!button('wealth1').classList.contains('is-refunding'));
        node=button('wealth1');pointer('pointerdown',node,{pointerType:'touch'});pointer('pointermove',node,{pointerType:'touch',clientX:node.getBoundingClientRect().right+20});await wait(650);
        check('dragging or scrolling cancels a pending refund',nodes().join()==='wealth1'&&!node.classList.contains('is-refunding'));
        pointer('pointerdown',node);pointer('pointerout',node,{relatedTarget:$('mapMasteryTree')});await wait(650);
        check('leaving the node cancels a pending refund',nodes().join()==='wealth1');
        pointer('pointerdown',node);pointer('pointercancel',node);await wait(650);
        check('pointer cancellation clears the pending refund',nodes().join()==='wealth1'&&!node.classList.contains('is-refunding'));
        pointer('pointerdown',node);MapMastery.close();await wait(650);
        check('closing mastery cancels a pending refund',nodes().join()==='wealth1');MapMastery.open();
        const otherMap=mapData.find(entry=>entry.id!==map.id&&world.mapIds.includes(entry.id));
        pointer('pointerdown',button('wealth1'));state.selectedMap=otherMap.id;MapMastery.render();await wait(650);
        check('changing maps cannot refund the previous map',state.mapMastery[map.id].nodes.join()==='wealth1');state.selectedMap=map.id;render();MapMastery.open();

        Storage.prototype.setItem=function(key,value){if(key===saveKey)throw new Error('Storage full');return originalWrite.call(this,key,value);};
        pointer('pointerdown',button('wealth1'),{pointerType:'touch'});await wait(650);
        check('hold-to-refund preserves points when saving fails',nodes().join()==='wealth1'&&$('masteryNodeStatus').textContent.includes('Could not save mastery'));
        Storage.prototype.setItem=originalWrite;
        click(button('wealth1'));$('refundMasteryNode').click();click(button('wealth1'));$('learnMasteryNode').click();
        check('the existing learn and refund buttons still work',nodes().join()==='wealth1');
        MapMastery.learn('population1');MapMastery.learn('drops1');
        const beforeReset=[...nodes()],otherProgress=JSON.stringify(state.mapMastery[otherMap.id]);
        click(button('root'));doubleClick('root');
        check('clicking or double-clicking the starting node does not reset mastery',nodes().join()===beforeReset.join()&&button('root').tagName==='BUTTON');
        pointer('pointerdown',button('root'));pointer('pointerup',button('root'));await wait(650);
        check('a short starting-node press cancels refund all',nodes().join()===beforeReset.join());
        Storage.prototype.setItem=function(key,value){if(key===saveKey)throw new Error('Storage full');return originalWrite.call(this,key,value);};
        pointer('pointerdown',button('root'));await wait(650);
        check('starting-node refund all rolls back when saving fails',nodes().join()===beforeReset.join());Storage.prototype.setItem=originalWrite;
        pointer('pointerdown',button('root'),{pointerType:'touch'});
        check('holding the starting node shows refund feedback',button('root').classList.contains('is-refunding'));await wait(650);
        check('holding the starting node refunds all branches and saves the available points',nodes().length===0&&MasterySystem.available(state,map,worldContent)===6&&JSON.parse(localStorage.getItem(saveKey)).mapMastery[map.id].nodes.length===0);
        check('starting-node refund all only affects the current map',JSON.stringify(state.mapMastery[otherMap.id])===otherProgress);
        pointer('pointerup',button('root'));pointer('pointerdown',button('root'));
        check('holding an empty starting node does not arm a refund',!button('root').classList.contains('is-refunding'));pointer('pointerup',button('root'));
        check('mastery fits the viewport without instruction text',!$('masteryGestureHint')&&!$('masteryCombatStatus')&&document.documentElement.scrollWidth<=innerWidth);
        check('no runtime errors',!smokeErrors.length);checks.push('SMOKE PASSED');MapMastery.close();
    }catch(error){checks.push('ERROR '+error.stack);}
    finally{Storage.prototype.setItem=originalWrite;MapMastery.close();}
    const report=document.createElement('pre');report.id='smoke-results';report.textContent=checks.join('\n');document.body.append(report);
}());
