$(document).ready(function(){ //Whenever the page is fully loaded, do whatever inside.
let lastUpdateTime = Date.now();
loadGame();
Update.updateUpgrades();
Unlock.updateUnlocks();
Update.updateEquipmentStats();
    readoutElement1 =                   document.getElementById("readout1");
    readoutElement2 =                   document.getElementById("readout2");
    readoutElement3 =                   document.getElementById("readout3");
    readoutElement4 =                   document.getElementById("readout4");
    readoutElement5 =                   document.getElementById("readout5");
milestoneDisplayCheck();
Unlock.updateUnlockDisplay();
//Fasts looping functions
setInterval(function(){
    const now = Date.now();
    const deltaSeconds = (now - lastUpdateTime) / 1000; // convert ms to seconds
    lastUpdateTime = now;
    updateBuyButtons();
    updateProduction();
    milestoneCheck();
    Inventory.updateInventory();
    Update.updateEquipmentDisplay();
    autoChop('willow', deltaSeconds);
    autoChop('oak', deltaSeconds);
    autoMine('stone', deltaSeconds);
    var TransportRate = 0;
    TransportRate += calc.calculateGrowth('caravan') * deltaSeconds;
    transportMarket('logs', 'oak', TransportRate);
    transportMarket('logs', 'willow', TransportRate);
    transportMarket('ores', 'stone', TransportRate);
}, 10)

setInterval(function(){

    saveGame();
    
/*
    autoChop('willow');
    autoChop('oak');
    autoMine('stone');
    */

}, 1000)

function autoChop(resource, deltaSeconds){
    const rate = calc.autoHarvestCalculation('autoChopper', 'autoChopperMult'); // logs/sec
    if (rate > 0 && (upgrades.autoChopper.Tier > 0)){
        const amountProduced = rate * deltaSeconds;
        inventory.logs[resource] += amountProduced;
    }
}

function autoMine(resource, deltaSeconds){
    const rate = calc.autoHarvestCalculation('autoMiner', 'autoMinerMult'); // ores/sec
    if (rate > 0 && (upgrades.autoMiner.Tier > 0)){
        const amountProduced = rate * deltaSeconds;
        inventory.ores[resource] += amountProduced;
    }
}
$("#resetButton").click(function(){
    resetButton();
})

$("#chopoak").click(function(){
    var newlogs = logsPlus * playerStats.Skilling.woodcuttingSpeed;
    inventory.logs.oak += newlogs;
    Inventory.updateInventory();
    console.log(`Chopped ${newlogs} logs!`);
})
$("#chopwillow").click(function(){
    var newlogs = logsPlus * playerStats.Skilling.woodcuttingSpeed;
    inventory.logs.willow += newlogs;
    Inventory.updateInventory();
    console.log(`Chopped ${newlogs} logs!`);
})
$("#sellLogsOak").click(function(){
    sell('logs');
})
$("#sellOresStone").click(function(){
    sell('ores', 'stone', prices.ores.stone);
})
$("#sellAll").click(function(){
    sell();
})
$("#transport").click(function(){
    toggleTransport();
})
$("#transportLogs").click(function(){
    toggleTransport('logs');
})
$("#transportOres").click(function(){
    toggleTransport('ores');
})
$("#buyAutoChopper").click(function(){
    buy(upgrades,'autoChopper');
})
$("#buyAutoChopperMult").click(function(){
    buy(upgrades,'autoChopperMult', 1);
})
$("#buyAutoMiner").click(function(){
    buy(upgrades,'autoMiner', 1);
})
$("#buyAutoMinerMult").click(function(){
    buy(upgrades,'autoMinerMult', 1);
})
$("#buyCaravan1").click(function(){
    buy(upgrades,'caravan', 1);
})
$("#buyMineshaft").click(function(){
    buy(unlocks,'mineshaft');
})
$("#buyStoneAxe").click(function(){
    buy(unlocks,'stoneAxe');
})
$("#buyIronAxe").click(function(){
    buy(unlocks,'ironAxe');
})
$("#equipstoneAxe").click(function(){
    equipItem('stoneAxe');
})
$("#equipironAxe").click(function(){
    equipItem('ironAxe');
})

function updateProduction(){
    if (upgrades.autoChopper.Tier>0){
        $("#logproduction").html("Currently producing: " + Number(calc.autoHarvestCalculation('autoChopper', 'autoChopperMult').toFixed(2)) + " logs/s")}
    if (upgrades.autoMiner.Tier>0){
        $("#oreproduction").html("Currently producing: " + Number(calc.autoHarvestCalculation('autoMiner', 'autoMinerMult').toFixed(2)) + " ore/s")}
}

function sell(category, item, price, amount) {
    let soldAny = false; // Track if any sale has occurred

    // If no category is specified, loop through all categories
    if (category == null) {
        for (const cat in market) {
            // Call the sell function for each category
            sell(cat, item, undefined, amount);
        }
        return;
    }

    // Check if the specified category exists
    if (!market[category]) return;

    // If item is null, sell all resources in the category
    if (item == null) {
        for (const resourceName in market[category]) {
            const resourceAmount = market[category][resourceName];
            const resourcePrice = prices[category][resourceName];

            if (amount == null || amount <= 0) {
                if (resourceAmount > 0) {
                    const totalValue = Math.round(resourceAmount * resourcePrice);
                    inventory.money += totalValue;
                    totalSold[category][resourceName] += resourceAmount;
                    market[category][resourceName] -= resourceAmount;
                    displayMessage(`Sold all ${resourceName} for $${totalValue}`);
                    soldAny = true;
                }
            } else if (resourceAmount >= amount && amount > 0) {
                const totalValue = Math.round(amount * resourcePrice);
                inventory.money += totalValue;
                totalSold[category][resourceName] += amount;
                market[category][resourceName] -= amount;
                displayMessage(`Sold ${amount} ${resourceName} for $${totalValue}`);
                soldAny = true;
            } else {
                // Not enough resources, do nothing
            }
        }
    } else {
        // Selling a specific item
                // If amount is undefined or null, set it to the total available amount
        if (amount == null) {
            amount = Math.round(market[category][item]);
        }
        if (market[category][item] >= amount && amount > 0) {
            const totalValue = Math.round(amount * prices[category][item]);
            inventory.money += totalValue;
            totalSold[category][item] += amount;
            market[category][item] -= amount;
            displayMessage(`Sold ${amount} ${item} for $${totalValue}`);
            soldAny = true;
        }
    }
}



function transportMarket(category, item, rate){
    var marketitem = market[category][item];
    var inventoryitem = inventory[category][item];
    var marketTotal = marketitem+rate;
    var remainingMarketCapacity = marketCap-marketitem;

    if(upgrades.caravan.Tier<1 || inventoryitem<=0){
        return;
    }
    if (TransportToggles[category] && TransportToggles[category].isTransportPaused) {
        return;
    }
        if(marketTotal<=marketCap){
            if(inventoryitem<rate){
                market[category][item] += inventoryitem;
                inventory[category][item] -= inventoryitem;
            }else{
            market[category][item] += rate;
            inventory[category][item] -= rate;
            }
        }else if(market[category][item]<marketCap && remainingMarketCapacity<=inventory[category][item]){
            market[category][item] += remainingMarketCapacity;
            inventory[category][item] -= remainingMarketCapacity;
        }
}

function toggleTransport(resource){
    if(resource){
        TransportToggles[resource] = TransportToggles[resource] || { isTransportPaused:false }; //if toggle resource is not unid or false"truthy", then assign itself(no change). if not then it will change to false

        TransportToggles[resource].isTransportPaused = !TransportToggles[resource].isTransportPaused;
        console.log(`Transport for ${resource} ` + (TransportToggles[resource].isTransportPaused ? "paused" : "resumed"));
    }else{
        isTransportPaused = !isTransportPaused;     
        //Check if any are paused
        const anyPaused = Object.values(TransportToggles).some(toggle => toggle.isTransportPaused)
        //Toggle all paused to reverse
        const newState = !anyPaused;
        
        Object.keys(TransportToggles).forEach(function(key) {
            TransportToggles[key].isTransportPaused = newState;
        })
        console.log("All Transport " + (newState ? "paused" : "resumed"));
    }
}

function equipItem(Equipment){
    //Check if the equipment is unlocked
    if (!playerItems.equipment[Equipment]) {
        console.log(`you don't own a ${Equipment}`);
        return;
    }
    if (!unlocks[Equipment] || !unlocks[Equipment].isUnlocked){
        console.log(`You haven't unlocked ${Equipment} yet!`)
        return;
    }
    const newitem = playerItems.equipment[Equipment];
    
    if (newitem.equipSlot){//Check if item has equipslot
        //If there's already an item equipped in this slot, unequip it
        for (let key in playerItems.equipped) {
            const equippedItem = playerItems.equipped[key];
            if (equippedItem && equippedItem.equipSlot === newitem.equipSlot){
                //Remove the existing item
                delete playerItems.equipped[key];
                console.log(`Unequipped previous item in slot ${newitem.equipSlot}`);
                break;
            }
        }
        //Equip item with itemslot
        playerItems.equipped[Equipment] = newitem;
        console.log(`${Equipment} equipped in slot ${newitem.equipSlot}`);
        displayMessage(`${calc.capitalizeFirstLetter(Equipment)} equipped in slot: ${newitem.equipSlot}!`);
    } else {
        //if item has no itemslot
        playerItems.equipped[Equipment] = newitem;
        console.log(`${Equipment} equipped, no item slot`);
    }
    //savedata
    savePlayerItems();
    Update.updateEquipmentStats();
}



function savePlayerItems() {
    localStorage.setItem('playerItems', JSON.stringify(playerItems));
}


function getUpgradeCost(baseCost, multiplier, level) {
  return baseCost * Math.pow(multiplier, level);
}

function buy(BuyType, BuyName, BuyAmount=1){
    if (!BuyType){
        console.log("It couldn't find the BuyType you're trying to buy (buy/unlock)");
        return;
    }
    const purchase = BuyType[BuyName];
    if(BuyType === unlocks){
        if(!purchase){
            console.log("Could not find the unlock.");
            return;
        }
        if(purchase.isUnlocked){
            console.log("Unlock is unlocked already.");
            return;
        }
    }else if (BuyType === upgrades){
        if(!purchase){
            console.log("Could not find the Upgrade.");
            return;
        }
    }
    // Check resources dynamically
    let totalCosts = {}; // To store total costs for each resource
    let canAfford = true;

    for (let resource in purchase.costs) {
        const costAmount = purchase.costs[resource] * BuyAmount;
        const resourceRef = Unlock.findParent(inventory, resource);
        if (purchase.costs[resource] === money) {
            // Handle money separately
            let totalPrice = 0;
            let currentPrice = purchase.costs.money;
            let currentTier = purchase.Tier || 1;

            for (let i = 0; i < BuyAmount; i++) {
                if (currentTier + 1 > purchase.MaxTier && BuyType === unlocks) {
                    console.log("Reached max tier");
                    break;
                }
                totalPrice += currentPrice;
                currentTier++;
                currentPrice = getUpgradeCost(currentPrice, purchase.PriceMult, currentTier);
            }
            totalCosts.money = totalPrice;

            if (inventory.money < totalPrice) {
                console.log("Not enough money for upgrade!");
                canAfford = false;
                break; // Exit early if can't afford
            }
        } else {
            // Handle other resources
            if (
                !resourceRef ||
                resourceRef.parent[resource] === undefined ||
                typeof resourceRef.parent[resource] !== 'number' ||
                resourceRef.parent[resource] < costAmount
            ) {
                console.log(`Not enough ${resource}`);
                canAfford = false;
                break; // Exit early
            }
            totalCosts[resource] = costAmount;
        }
    }

    if (!canAfford) {
        // Exit if not enough resources
        return;
    }

    // Deduct resources and money now
    if (totalCosts.money !== undefined) {
        inventory.money -= Math.round(totalCosts.money);
    }
    for (let resource in totalCosts) {
        if (resource !== 'money') {
            const resourceRef = Unlock.findParent(inventory, resource);
            if (resourceRef && typeof resourceRef.parent[resource] === 'number') {
                const amount = totalCosts[resource];
                resourceRef.parent[resource] -= amount;
            }
        }
    }

    // Proceed with the upgrade/unlock
    if (BuyType === unlocks) {
        // Mark as unlocked
        purchase.isUnlocked = true;
        Unlock.updateUnlocks();
        Unlock.updateUnlockDisplay();
        if (purchase.type === 'tool') {
            playerItems.equipment[BuyName] = {
                name: BuyName,
                ...purchase.properties,
                equipSlot: purchase.equipSlot
            };
            console.log(`${BuyName} added to your equipment!`);
        }
    }

    // Handle upgrade tier
    purchase.Tier = (purchase.Tier) + BuyAmount;
    purchase.costs.money = Math.round(getUpgradeCost(purchase.costs.money, purchase.PriceMult, purchase.Tier));
    console.log(`Purchased: ${BuyName}, new tier: ${purchase.Tier}`);

    // Update UI
    Update.updateUpgrades();
}


function canBuy(BuyType, BuyName, BuyAmount=1) {
    if (!BuyType) {
        console.log("Invalid BuyType");
        return false;
    }
    const purchase = BuyType[BuyName];
    if (!purchase) {
        console.log("Item not found in purchasable list");
        return false;
    }
    // Check if resource costs are affordable
    for (let resource in purchase.costs) {
        const costAmount = purchase.costs[resource] * BuyAmount;
        const resourceRef = Unlock.findParent(inventory, resource);
        if (resource === 'money') {
            // Handle money separately
            let totalPrice = 0;
            let currentPrice = purchase.costs.money;
            let currentTier = purchase.Tier || 1;

            for (let i = 0; i < BuyAmount; i++) {
                if (currentTier + 1 > purchase.MaxTier && BuyType === unlocks) {
                    return false; // Max tier reached
                }
                totalPrice += currentPrice;
                currentTier++;
                currentPrice = getUpgradeCost(currentPrice, purchase.PriceMult, currentTier);
            }
            if (inventory.money < totalPrice) {
                return false; // Not enough money
            }
        } else {
            // Check other resources
            if (
                !resourceRef ||
                resourceRef.parent[resource] === undefined ||
                typeof resourceRef.parent[resource] !== 'number' ||
                resourceRef.parent[resource] < costAmount
            ) {
                return false; // Not enough resources
            }
        }
    }

    // All resource checks passed
    return true;
}

function updateBuyButtons() {
    const buyButtons = document.querySelectorAll('.buy-button');
    buyButtons.forEach(btn => {
        const buyName = btn.dataset.buyName;
        const buyType = btn.dataset.buyType; // e.g., 'upgrade' or 'unlock'
        let canPurchase = false;

        if (buyType === 'upgrade') {
            canPurchase = canBuy(upgrades, buyName);
        } else if (buyType === 'unlock') {
            canPurchase = canBuy(unlocks, buyName);
        }

        if (canPurchase) {
            btn.classList.add('active');
            btn.disabled = false;
        } else {
            btn.classList.remove('active');
            btn.disabled = true;
        }
    });
}

function displayMessage(msg, type = 'normal') {
    // Shift content and styles down the chain
    readoutElement5.innerHTML = readoutElement4.innerHTML;
    readoutElement5.style.cssText = readoutElement4.style.cssText;

    readoutElement4.innerHTML = readoutElement3.innerHTML;
    readoutElement4.style.cssText = readoutElement3.style.cssText;

    readoutElement3.innerHTML = readoutElement2.innerHTML;
    readoutElement3.style.cssText = readoutElement2.style.cssText;

    readoutElement2.innerHTML = readoutElement1.innerHTML;
    readoutElement2.style.cssText = readoutElement1.style.cssText;

    // Set the newest message
    readoutElement1.innerHTML = msg;

    // Define colors for different message types
    const colors = {
        'normal': '',
        'important': 'red',
        'warning': 'orange',
        'info': 'lightblue',
        // Add more types and colors as needed
    };

    // Set style for the newest message based on type
    if (colors.hasOwnProperty(type)) {
        readoutElement1.style.color = colors[type];
    } else {
        readoutElement1.style.color = '';
    }
}


function Display(displayitem, state){
    const element = document.getElementById(displayitem);   
    const buttons = element.querySelectorAll('button');
    if(state == true){
        element.style.display = "block";
        buttons.forEach(button => button.disabled = !state);
    }else{
        element.style.display = "none";
        buttons.forEach(button => button.disabled = !state);
    }
}
//Display('autoMiner', true);

function milestoneDisplayCheck(){
    if(moneyFlag >= 1){
        Display('caravan', true);
        Display('stoneAxe', true);
    }
    if(logsFlag >= 1){
        Display('autoChopper', true);
    }
    if(axesFlag >= 1){
        Display('ironAxe', true);
    }
}
function milestoneCheck(){
    if(inventory.money >=100 && moneyFlag < 1){
        Display('caravan', true);
        Display('stoneAxe', true);
        console.log("moneyflag 1 reached. caravan and stone axe unlocked"); 
        displayMessage("Milestone reached: $100 earned! Access to Caravan and Stone Axe Upgrades!", "info");
        moneyFlag++;
    }   
    if(totalSold.logs.oak >=500 && logsFlag < 1){
        Display('autoChopper', true);
        console.log("logsflag 1 reached. autochopper unlocked"); 
        displayMessage("Milestone reached: 500 oak logs sold! Auto Chopper unlocked!", 'info');
        logsFlag++;
    }
    if(unlocks.stoneAxe.isUnlocked && axesFlag < 1){
        Display('ironAxe', true);
        console.log("axesflag 1 reached. ironaxe unlocked"); 
        displayMessage("Milestone reached: Stone Axe unlocked! Iron Axe is now available for purchase!", 'important');
        axesFlag++;
    }
}

function saveGame() {
    var saveData = {
        moneyFlag: moneyFlag,
        logsFlag: logsFlag,
        axesFlag: axesFlag,
        totalSold: totalSold,
        inventory: inventory,
        market: market,
        playerStats: playerStats,
        playerItems: playerItems,
        unlocks: unlocks,  
        upgrades: upgrades
    };
    localStorage.setItem('saveGame', JSON.stringify(saveData));
    console.log("Game Saved!");
}

function loadGame(){
    var loadGame = JSON.parse(localStorage.getItem('saveGame'));
    if (loadGame){
        moneyFlag = loadGame.moneyFlag || 0;
        logsFlag = loadGame.logsFlag || 0;
        axesFlag = loadGame.axesFlag || 0;
        totalSold = loadGame.totalSold || 0;
        inventory = loadGame.inventory || 0;
        market = loadGame.market || 0;
        playerStats = loadGame.playerStats;
        playerItems = loadGame.playerItems;
        unlocks = loadGame.unlocks;
        upgrades = loadGame.upgrades;
        console.log("Game Loaded!");
    }
}
   
function reset(){
    localStorage.removeItem('saveGame');
    console.log("Game Reset!");
}


})


