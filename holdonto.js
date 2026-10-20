/*
//Old buy function

function buyUpgrade(upgradeName, upgradeAmount){
    var upgrade = upgrades[upgradeName];

    // Calculate total price for the upgradeAmount tiers
    let totalPrice = 0;
    let currentPrice = upgrade.Price;
    let currentTier = upgrade.Tier;

    for (let i = 0; i < upgradeAmount; i++) {
    // Check if current tier can be upgraded
    if (currentTier + 1 > upgrade.MaxTier) {
        console.log("Reached max tier");
        break;
    }
    
    totalPrice+= currentPrice;
    currentTier++;
    currentPrice = getUpgradeCost(currentPrice, upgrade.PriceMult, currentTier);

}
    if (inventory.money>=totalPrice && upgrade.Tier + upgradeAmount <= upgrade.MaxTier){
        upgrade.Tier += upgradeAmount;
        inventory.money -= Math.round(totalPrice);
        upgrade.Price = Math.round(currentPrice);
        console.log("Purchased upgrade: " + upgradeName + " Upgrade tier: " + upgrade.Tier + " Upgrade cost: " + totalPrice);
        Update.updateUpgrades();
    }else{
        console.log("Cannot afford upgrade / Max tier")
    }
}

//old buyUnlock

function buyUnlock(type, unlockName) {
    var unlock = type[unlockName];
    if (!unlock) {
        console.log("Unlock not found.");
        return;
    }
    if (unlock.isUnlocked) {
        console.log("Unlock already purchased!");
        return;
    }

    // Check resources dynamically
    for (let resource in unlock.costs) {
        const resourceRef = this.findResourceParent(inventory, resource);
        if (
            !resourceRef ||
            resourceRef.parent[resourceRef.key] === undefined ||
            typeof resourceRef.parent[resourceRef.key] !== 'number' ||
            resourceRef.parent[resourceRef.key] < unlock.costs[resource]
        ) {
            console.log(`Not enough ${resource}`);
            return;
        }
    }

    // Deduct resources dynamically
    for (let resource in unlock.costs) {
        const resourceRef = this.findResourceParent(inventory, resource);
        if (resourceRef && typeof resourceRef.parent[resourceRef.key] === 'number') {
            resourceRef.parent[resourceRef.key] -= unlock.costs[resource];
        } else {
            console.log(`Resource ${resource} not found or invalid`);
        }
    }

    // Mark as unlocked
    unlock.isUnlocked = true;
    this.updateUnlocks();
    this.updateUnlockDisplay();
    if (unlock.type === 'tool') {
        playerItems.equipment[unlockName] = {
            name: unlockName,
            ...unlock.properties,
            equipSlot: unlock.equipSlot
        };
        console.log(`${unlockName} added to your equipment!`);
    }
}

*/

/* thingy that creates divs for unlocks/upgrades dynamically 
function makeDiv(){
    Object.keys(isHidden).forEach(function(key){
        //Get parent container element by ID
        const parentContainer = document.getElementById(key);
        if(parentContainer) {
            //Loop through each item in the array
            isHidden[key].forEach(function(item){
                //Create new div element
                const newElement = document.createElement("div");
                newElement.id = item;
                parentContainer.appendChild(newElement); 

                const newElement2 = document.createElement("span");
                newElement2.id = "Name";
                newElement2.innerHTML = calc.capitalizeFirstLetter(item);
                newElement.appendChild(newElement2);

                const newElement3 = document.createElement("span");
                newElement3.id = "Mult";
                newElement.appendChild(newElement3);

                const newElement4 = document.createElement("div");
                newElement.appendChild(newElement4);

                const newElement5 = document.createElement("div");
                newElement5.id = "Tier";
                newElement4.appendChild(newElement5);

                const newElement6 = document.createElement("div");
                newElement6.id = "Price";
                newElement4.appendChild(newElement6);

                const newElement7 = document.createElement("div");
                newElement7.id = "ResourceCost";
                newElement4.appendChild(newElement7);

                const newButton = document.createElement("button");
                newButton.id = "buy" + item;
                newButton.className = "button";
                newButton.innerHTML = "Purchase";
                newElement4.appendChild(newButton);
        });
        }else{
        }
});
}
*/