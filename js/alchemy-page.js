(function () {
    'use strict';
    const $ = id => document.getElementById(id), content = AlchemyContent;
    const liquids = new Map(), materials = new Map(), potions = new Map(), choices = new Map();
    const selectedLiquids = new Set();
    let selectedMaterial = null, batch = '1', message = '', mixtureSignature = '';
    let selectedMaterialCost = null;
    let queueSignature = '';
    let resultDismissed = false;
    const text = (node,value) => {if (node.textContent !== value) node.textContent = value;};
    function element(tag,className,label) {
        const node = document.createElement(tag);node.className = className || '';
        if (label !== undefined) node.textContent = label;
        return node;
    }
    function button(label,run) {
        const node = element('button','',label);node.type = 'button';node.addEventListener('click',run);return node;
    }
    function duration(seconds) {
        if (seconds <= 0) return '0m';
        const whole = Math.ceil(seconds), hours = Math.floor(whole / 3600), minutes = Math.floor(whole % 3600 / 60);
        return hours ? hours + 'h ' + minutes + 'm' : minutes + 'm ' + String(whole % 60).padStart(2,'0') + 's';
    }
    function costText(cost) {
        if (!cost) return 'Maximum level';
        return [cost.gold ? formatAmount(cost.gold) + ' gold' : '',
            ...Object.entries(cost.liquids || {}).map(([id,n]) => n + ' ' + content.liquids[id].name)].filter(Boolean).join(' + ');
    }
    function mutate(action,success) {
        if (SaveCompatibility.protection.blocked || simulatingCombat || combatCatchingUp || !state.alchemy.unlocked) return false;
        const before = {gold:state.gold,materials:state.materials,alchemy:state.alchemy,professions:state.professions};
        state.materials = {...state.materials};state.alchemy = Alchemy.clone(state.alchemy);
        state.professions = Professions.normalize(state.professions);
        try {
            if (!action()) {Object.assign(state,before);return false;}
            localStorage.setItem(saveKey,JSON.stringify(createGameSave()));message = typeof success === 'function' ? success() : success;
        } catch {
            Object.assign(state,before);message = 'Could not save. Ingredients and progress kept.';render();return false;
        }
        window.render();return true;
    }
    function liquidIcon(id) {
        const icon = element('span','alchemy-liquid-icon');icon.style.setProperty('--liquid',content.liquids[id].color);icon.setAttribute('aria-hidden','true');return icon;
    }
    function materialIcon(id) {return Equipment.createIcon(itemData.materialDetails?.[id]);}
    function changeSelection(run) {if(state.alchemy.queue.length)return;run();message = '';render();}
    function toggleLiquid(id) {changeSelection(() => selectedLiquids.has(id) ? selectedLiquids.delete(id) : selectedLiquids.add(id));}
    for (const [index,[id,def]] of Object.entries(content.liquids).entries()) {
        const card = element('article','alchemy-liquid');card.dataset.liquid = id;card.style.setProperty('--liquid',def.color);
        card.dataset.vessel = ['round','pear','angular'][index % 3];
        const container = button('',() => toggleLiquid(id));container.className = 'alchemy-liquid-container';container.dataset.selectLiquid = id;
        container.setAttribute('aria-label',def.name);container.setAttribute('aria-pressed','false');
        const glass = element('span','alchemy-glass'), fill = element('span','alchemy-glass-fill');glass.append(fill);glass.setAttribute('aria-hidden','true');container.append(glass);
        const amount = element('span','alchemy-bottle-amount');amount.setAttribute('aria-hidden','true');container.append(amount);
        const bar = element('progress','alchemy-liquid-meter');bar.setAttribute('aria-label',def.name + ' storage');
        const unlock = button('Unlock',() => mutate(() => Alchemy.upgrade(state,id,'unlock'),def.name + ' unlocked.'));unlock.dataset.upgrade = 'unlock';
        const copy = element('div','alchemy-still-copy'), name = element('h3','',def.name), rate = element('p','alchemy-still-rate');copy.append(name,rate,bar);
        const upgrades = element('div','alchemy-upgrades');upgrades.setAttribute('role','group');upgrades.setAttribute('aria-label',def.name + ' upgrades');
        const actions = {};
        for (const [kind,label] of [['rate','Rate'],['capacity','Storage']]) {
            const action = button(label,() => mutate(() => Alchemy.upgrade(state,id,kind),def.name + ' upgraded.'));
            action.dataset.upgrade = kind;const level = element('small','alchemy-upgrade-level'), cost = element('span','alchemy-upgrade-cost');
            cost.append(liquidIcon(id));const amount = element('span');cost.append(amount);
            action.replaceChildren(element('span','alchemy-upgrade-label',label),level,cost);upgrades.append(action);actions[kind] = {action,level,label,amount};
        }
        copy.append(unlock);card.append(container,copy,upgrades);$('alchemyLiquids').append(card);liquids.set(id,{card,container,fill,amount,bar,rate,unlock,upgrades,actions});
    }
    function recipeIcon(kind,id,amount) {
        const item = element('span','alchemy-recipe-ingredient');item.title = (kind === 'liquids' ? content.liquids[id].name : materialNames[id] || id) + ' × ' + amount;
        item.setAttribute('aria-label',item.title);item.append(kind === 'liquids' ? liquidIcon(id) : materialIcon(id),element('span','','×' + amount));return item;
    }
    for (const [id,recipe] of Object.entries(content.recipes)) {
        const card = element('article','alchemy-potion');card.dataset.potion = id;card.style.setProperty('--liquid',recipe.color);card.hidden = true;
        const header = element('div','alchemy-potion-header'), bottle = element('span','alchemy-bottle');bottle.setAttribute('aria-hidden','true');
        const copy = element('div'), name = button(recipe.name,() => changeSelection(() => {
            selectedLiquids.clear();Object.keys(recipe.liquids).forEach(key => selectedLiquids.add(key));selectedMaterial = Object.keys(recipe.materials)[0];
        }));name.className = 'alchemy-recipe-name';name.dataset.loadRecipe = id;name.title = 'Use this recipe';
        const remaining = element('p','alchemy-potion-time');copy.append(name,remaining);
        const equip = button('Equip',() => mutate(() => Alchemy.equip(state,id),recipe.name + ' equipped.'));equip.dataset.equip = id;header.append(bottle,copy,equip);
        const formula = element('div','alchemy-formula');formula.setAttribute('aria-label',recipe.name + ' recipe');
        for (const kind of ['liquids','materials']) for (const [key,amount] of Object.entries(recipe[kind])) formula.append(recipeIcon(kind,key,amount));
        const yieldText = element('small','alchemy-yield',recipe.brewSeconds + 's brew · +' + duration(recipe.seconds) + ' / success');
        const training = element('small','alchemy-yield');
        card.append(header,formula,yieldText,training);$('alchemyPotions').append(card);potions.set(id,{card,remaining,equip,training});
        const choice = button('',() => {if(mutate(() => Alchemy.equip(state,id),recipe.name + ' equipped.'))$('alchemyPotionPicker').close();});
        choice.dataset.equipPotion = id;choice.hidden = true;$('alchemyPickerChoices').append(choice);choices.set(id,choice);
    }
    function renderMaterials(blocked) {
        if (selectedMaterial && !Alchemy.materialUnlocked(state,selectedMaterial)) selectedMaterial = null;
        const ids = Object.keys(materialNames).filter(id => Alchemy.materialUnlocked(state,id) && (state.materials[id] > 0 || id === selectedMaterial)), active = new Set(ids);
        for (const [id,node] of materials) if (!active.has(id)) {node.remove();materials.delete(id);}
        for (const id of ids) {
            let node = materials.get(id);
            if (!node) {
                node = button('',() => changeSelection(() => {selectedMaterial = selectedMaterial === id ? null : id;}));
                node.className = 'alchemy-material';node.dataset.selectMaterial = id;node.append(materialIcon(id));
                node.title = materialNames[id];node.setAttribute('aria-label',materialNames[id]);materials.set(id,node);$('alchemyMaterials').append(node);
            }
            node.disabled = blocked || !(state.materials[id] > 0);node.setAttribute('aria-pressed',String(selectedMaterial === id));
        }
    }
    function renderMixture() {
        const brewing = state.alchemy.queue.length > 0;
        const signature = JSON.stringify([[...selectedLiquids],selectedMaterial,brewing]);
        if (signature === mixtureSignature) return;mixtureSignature = signature;
        const colors = [...selectedLiquids].map(id => content.liquids[id].color.slice(1).match(/../g).map(channel => parseInt(channel,16)));
        $('alchemyBrewTint').hidden = !colors.length;
        $('alchemyScene').setAttribute('aria-label',colors.length ? 'Cauldron containing ' + [...selectedLiquids].map(id => content.liquids[id].name).join(' and ') : 'Empty cauldron in the apothecary');
        if (colors.length) {
            const mixed = selectedLiquids.size > 1;
            const mixture = mixed && Object.values(content.recipes).find(recipe => Object.keys(recipe.liquids).length === selectedLiquids.size && Object.keys(recipe.liquids).every(id => selectedLiquids.has(id)));
            const channels = mixture ? mixture.color.slice(1).match(/../g).map(channel => parseInt(channel,16)) : [0,1,2].map(index => Math.round(colors.reduce((sum,color) => sum + color[index],0) / colors.length));
            $('alchemyScene').style.setProperty('--brew-color','rgb(' + channels.join(', ') + ')');
            $('alchemyLiquidSheet').setAttribute('href',selectedLiquids.has('emberOil') && !mixed ? 'assets/alchemy/cauldron-red-liquid-4x2.png' : 'assets/alchemy/cauldron-blue-liquid-4x2.png');
            const [r,g,b] = channels.map(channel => channel / 255);
            $('alchemyLiquidLayer').setAttribute('filter',mixed ? 'url(#alchemyLiquidTint)' : 'none');
            // Preserve the hand-drawn blue/red palettes. Mixed recipes tint the
            // blue sheet using its blue-channel shading while preserving alpha.
            $('alchemyLiquidColor').setAttribute('values',(mixed ? [
                0,0,r * 1.15,0,r * .05,
                0,0,g * 1.15,0,g * .05,
                0,0,b * 1.15,0,b * .05,
                0,0,0,1,0
            ] : [1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0]).join(' '));
        } else $('alchemyScene').style.removeProperty('--brew-color');
        $('alchemySelectedMaterials').replaceChildren();$('alchemySelectedMaterials').hidden = !selectedMaterial || brewing;
        selectedMaterialCost = null;
        if (selectedMaterial) {
            const node = button('',() => changeSelection(() => {selectedMaterial = null;}));
            selectedMaterialCost = element('span','alchemy-material-cost');selectedMaterialCost.setAttribute('aria-hidden','true');
            selectedMaterialCost.append(element('span','alchemy-material-required'),element('small','alchemy-material-owned'));
            node.append(materialIcon(selectedMaterial),selectedMaterialCost);$('alchemySelectedMaterials').append(node);
        }
    }
    function renderMaterialCost(recipeId,amount) {
        if (!selectedMaterialCost) return;
        const total = recipeId && Number.isSafeInteger(amount) && amount >= 0 ? content.recipes[recipeId].materials[selectedMaterial] * amount : null;
        const knownCost = Number.isSafeInteger(total), label = knownCost ? formatAmount(total) : '?';
        const owned = state.materials[selectedMaterial] || 0, ownedLabel = formatAmount(owned);
        const showOwned = batch === 'custom';
        text(selectedMaterialCost.firstElementChild,label);text(selectedMaterialCost.lastElementChild,showOwned ? '/' + ownedLabel : '');
        selectedMaterialCost.lastElementChild.hidden = !showOwned;
        const enough = knownCost && total <= owned;
        selectedMaterialCost.classList.toggle('is-missing',knownCost && !enough);
        const node = selectedMaterialCost.parentElement;
        node.title = materialNames[selectedMaterial] + ' · ' + (knownCost ? 'Cost: ' + label : 'Unknown cost') + ' · Owned: ' + ownedLabel;
        node.setAttribute('aria-label','Remove ' + materialNames[selectedMaterial] + '. ' + (knownCost ? 'Cost: ' + label : 'Cost unknown') + '. Owned: ' + ownedLabel);
    }
    const selectedRecipe = () => Alchemy.matchingRecipe([...selectedLiquids],selectedMaterial);
    function batchAmount(id) {return batch === 'max' ? id ? Alchemy.maxBrewAmount(state,id) : 1 : batch === 'custom' ? $('alchemyCustomAmount').valueAsNumber : Number(batch);}
    function renderCombatSlot() {
        const data = state.alchemy;$('combatPotion').hidden = !data.unlocked;
        if (!data.unlocked) return;
        const id = data.equipped, recipe = content.recipes[id];
        text($('combatPotionSlot'),recipe ? recipe.name + ' · ' + duration(data.potions[id]) : '+ Equip potion');
        $('combatPotionSlot').title = recipe ? Alchemy.fighting(state) ? 'Potion active' : 'Potion paused' : 'Choose a potion';
    }
    function renderQueue() {
        const data = state.alchemy, active = data.queue[0], list = $('alchemyQueueList');
        text($('alchemyQueueEmpty'),active ? '' : 'Queue empty');
        const totalSeconds = data.queue.reduce((sum,job) => sum + job.remaining * content.recipes[job.id].brewSeconds - job.work / 1000000,0);
        text($('alchemyQueueTime'),active ? active.paid ? duration(totalSeconds) : 'Waiting for ingredients' : '');
        $('alchemyQueueProgress').hidden = !active?.paid;
        if (active) {
            const recipe = content.recipes[active.id];
            $('alchemyQueueProgress').value = active.work / (recipe.brewSeconds * 1000000);
            $('alchemyQueueProgress').style.setProperty('--brew-progress-color',recipe.color);
        }
        const signature = JSON.stringify([data.queue.map(job => [job.id,job.remaining,Math.ceil(content.recipes[job.id].brewSeconds - job.work / 1000000),job.paid]),data.discovered]);
        if (signature !== queueSignature) {
            queueSignature = signature;list.replaceChildren();
            for (const [index,job] of data.queue.entries()) {
                const name = data.discovered.includes(job.id) ? content.recipes[job.id].name : 'Unknown mixture';
                const item = element('li','',name + ' × ' + job.remaining + (index === 0 && job.paid ? ' · ' + Math.ceil(content.recipes[job.id].brewSeconds - job.work / 1000000) + 's' : ''));
                list.append(item);
            }
        }
        const result = resultDismissed ? null : active || data.lastBrew;
        text($('alchemyQueueResult'),result ? result.succeeded + ' brewed · ' + result.failed + ' failed · +' + xpLabel(result.xp) + ' XP' : '');
    }
    function render() {
        const data = state.alchemy, open = state.currentView === 'alchemy', blocked = SaveCompatibility.protection.blocked || simulatingCombat || combatCatchingUp;
        if (data.queue.length) resultDismissed = false;
        else if (!open) resultDismissed = true;
        $('alchemyNavItem').hidden = !data.unlocked;$('alchemyButton').setAttribute('aria-pressed',String(open));renderCombatSlot();
        if (!data.unlocked) {if($('alchemyPotionPicker').open)$('alchemyPotionPicker').close();return;}
        if (open) {
            const brewing = data.queue.length > 0, active = data.queue[0];
            $('alchemyScene').classList.toggle('is-brewing',Boolean(active?.paid));
            if (active) {
                selectedLiquids.clear();Object.keys(content.recipes[active.id].liquids).forEach(id => selectedLiquids.add(id));
                selectedMaterial = Object.keys(content.recipes[active.id].materials)[0];
            }
            for (const id of ['alchemyBrewHeading','alchemyBrewInfo','alchemyBatch','alchemyBrew']) $(id).hidden = brewing;
            $('alchemyCancel').hidden = !brewing;$('alchemyCancel').disabled = blocked;
            renderQueue();
            const level = Professions.progress(state.professions,'alchemy');
            text($('alchemyLevel'),'Level ' + level.level);
            const fractionalXp = state.professions.alchemyXpRemainder || 0;
            text($('alchemyLevelXp'),level.capped ? 'Maximum level' : xpLabel(level.earned + fractionalXp) + ' / ' + level.required.toLocaleString() + ' XP to next level');
            $('alchemyLevelProgress').value = level.capped ? 1 : (level.earned + fractionalXp) / level.required;
            $('alchemyLevelProgress').title = level.level >= content.progression.softCapLevel ? 'Training slows sharply from level 10. Higher-level recipes grant more XP.' : 'Successful brews grant Alchemy XP. Outgrown recipes grant less XP.';
            for (const [id,view] of liquids) {
                const liquid = data.liquids[id], limit = Alchemy.capacity(data,id);
                const infinite = liquid.unlocked && Alchemy.infiniteLiquids(state);
                if (!liquid.unlocked) selectedLiquids.delete(id);
                view.card.classList.toggle('is-locked',!liquid.unlocked);
                view.container.disabled = blocked || brewing || !liquid.unlocked;view.container.setAttribute('aria-pressed',String(selectedLiquids.has(id)));
                view.fill.style.height = (infinite ? 100 : liquid.amount > 0 ? Math.max(8,liquid.amount / limit * 100) : 0) + '%';
                view.container.title = content.liquids[id].name + ' · ' + (infinite ? 'Infinite (Developer mode)' : formatAmount(liquid.amount) + '/' + limit + ' · ' + Alchemy.perHour(data,id) + '/h');
                view.container.setAttribute('aria-label',view.container.title);
                text(view.amount,(infinite ? '∞' : formatAmount(liquid.amount)) + '/' + formatAmount(limit));
                view.bar.hidden = !liquid.unlocked;view.bar.max = limit;view.bar.value = infinite ? limit : liquid.amount;view.bar.title = infinite ? 'Infinite (Developer mode)' : formatAmount(liquid.amount) + ' / ' + limit;
                text(view.rate,!liquid.unlocked ? 'Sealed still' : infinite ? 'Infinite · Dev' : Alchemy.perHour(data,id) + ' / h');
                view.unlock.hidden = liquid.unlocked;view.upgrades.hidden = !liquid.unlocked;
                const cost = Alchemy.upgradeCost(data,id,'unlock');view.unlock.title = costText(cost);view.unlock.disabled = blocked || !Alchemy.affordable(state,cost);
                for (const [kind,action] of Object.entries(view.actions)) {
                    const price = Alchemy.upgradeCost(data,id,kind), level = liquid[kind === 'rate' ? 'rateLevel' : 'capacityLevel'];
                    text(action.level,'Lv ' + level);action.action.disabled = blocked || !Alchemy.affordable(state,price);
                    text(action.amount,price ? String(price.liquids?.[id] || 0) : 'Max');
                    const benefit = kind === 'rate' ? '+25% base production' : '+' + content.liquids[id].capacity + ' capacity';
                    action.action.title = action.label + ' · ' + benefit + ' · ' + costText(price);
                    action.action.setAttribute('aria-label',content.liquids[id].name + ' ' + action.label + ', level ' + level + '. ' + benefit + '. ' + costText(price));
                }
            }
            renderMaterials(blocked || brewing);renderMixture();
            const id = selectedRecipe(), known = id && data.discovered.includes(id), amount = batchAmount(id);
            renderMaterialCost(id,amount);
            text($('alchemyBrewHeading'),known ? content.recipes[id].name : selectedLiquids.size && selectedMaterial ? 'Unknown mixture' : 'Choose ingredients');
            const available = id && Alchemy.recipeUnlocked(state,id);
            text($('alchemyBrewInfo'),!id ? '' : !available ? 'Requires level ' + content.recipes[id].level : content.recipes[id].brewSeconds + 's · ' + (known ? Math.round(Alchemy.successChance(state,id) * 100) + '% success · ' + xpLabel(Alchemy.xpPerBrew(state,id)) + ' XP' : 'Guaranteed discovery'));
            $('alchemyBrew').disabled = blocked || !selectedLiquids.size || !selectedMaterial || !Number.isSafeInteger(amount) || amount <= 0 || (id && (!available || amount > Alchemy.maxBrewAmount(state,id))) || amount > content.maximumBrewBatch;
            text($('alchemyBrew'),(id ? 'Queue brew' : 'Combine') + (Number.isSafeInteger(amount) && amount > 0 ? ' ×' + amount : ''));
            for (const [key,view] of potions) {
                view.card.hidden = !data.discovered.includes(key);
                view.card.querySelector('[data-load-recipe]').disabled = blocked || brewing;
                text(view.remaining,duration(data.potions[key]) + ' remaining');text(view.equip,key === data.equipped ? 'Equipped' : 'Equip');
                text(view.training,Alchemy.recipeUnlocked(state,key) ? Math.round(Alchemy.successChance(state,key) * 100) + '% · ' + xpLabel(Alchemy.xpPerBrew(state,key)) + ' XP' : 'Level ' + content.recipes[key].level);
                view.equip.disabled = blocked || data.potions[key] <= 0 || key === data.equipped;view.card.classList.toggle('is-equipped',key === data.equipped);
            }
            $('alchemyEmpty').hidden = data.discovered.length > 0;
            text($('alchemyEquipped'),data.equipped ? content.recipes[data.equipped].name + ' · ' + duration(data.potions[data.equipped]) : '+ Choose a potion');
        }
        if ($('alchemyPotionPicker').open) {
            for (const [id,choice] of choices) {
                choice.hidden = !data.discovered.includes(id) && data.potions[id] <= 0;
                text(choice,content.recipes[id].name + ' · ' + duration(data.potions[id]) + (id === data.equipped ? ' · Equipped' : ''));
                choice.disabled = blocked || data.potions[id] <= 0 || id === data.equipped;
            }
            $('alchemyUnequip').disabled = blocked || !data.equipped;
        }
        text($('alchemyStatus'),message);text($('alchemyPickerStatus'),message);
    }
    function picker() {if(!state.alchemy.unlocked || SaveCompatibility.protection.blocked || combatCatchingUp)return;message='';$('alchemyPotionPicker').showModal();render();}
    function xpLabel(value) {return value === 0 ? '0' : value < .01 ? value.toExponential(2) : value.toLocaleString(undefined,{maximumFractionDigits:2});}
    $('alchemyButton').addEventListener('click',() => {
        if (!state.alchemy.unlocked || SaveCompatibility.protection.blocked || combatCatchingUp) return;
        state.currentView = 'alchemy';state.isInTown = true;message = '';window.render();saveGame();
    });
    $('alchemyBatch').querySelectorAll('[data-batch]').forEach(node => node.addEventListener('click',() => {
        batch = node.dataset.batch;$('alchemyBatch').querySelectorAll('[data-batch]').forEach(item => item.setAttribute('aria-pressed',String(item === node)));
        $('alchemyCustomAmount').hidden = batch !== 'custom';if(batch === 'custom')$('alchemyCustomAmount').focus();render();
    }));
    $('alchemyCustomAmount').addEventListener('input',render);
    $('alchemyCancel').addEventListener('click',() => mutate(() => Alchemy.cancel(state),''));
    $('alchemyBrew').addEventListener('click',() => {
        if (SaveCompatibility.protection.blocked || simulatingCombat || combatCatchingUp || !state.alchemy.unlocked) return;
        const id = selectedRecipe(), amount = batchAmount(id);
        if (!selectedLiquids.size || !selectedMaterial || !Number.isSafeInteger(amount) || amount <= 0) return;
        if (!id) {message = 'No recipe found.';render();return;}
        if (!Alchemy.recipeUnlocked(state,id)) {message = 'Requires Alchemy level ' + content.recipes[id].level + '.';render();return;}
        if (amount > Alchemy.maxBrewAmount(state,id)) {message = 'Not enough ingredients or batch exceeds ' + content.maximumBrewBatch.toLocaleString() + ' attempts.';render();return;}
        mutate(() => Alchemy.brewBatch(state,id,amount),'');
    });
    $('alchemyEquipped').addEventListener('click',picker);$('combatPotionSlot').addEventListener('click',picker);
    $('alchemyPickerClose').addEventListener('click',() => $('alchemyPotionPicker').close());
    $('alchemyUnequip').addEventListener('click',() => {if(mutate(() => Alchemy.equip(state,null),'Potion unequipped.'))$('alchemyPotionPicker').close();});
    window.AlchemyPage = Object.freeze({render,renderCombatSlot,duration});render();
}());
