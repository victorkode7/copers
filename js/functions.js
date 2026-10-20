var Update = {
updateUpgrades() {
    Object.keys(upgrades).forEach(function(key) {
        const upgrade = upgrades[key];
        const tier = upgrade.Tier;

        const currentGrowth = calc.calculateGrowth(key);
        var nextGrowth = calc.calculateGrowth(key, 1);

        // Determine effect type
        const upgradeType = upgrade.upgradeType || 'add'; // default to additive

        let effectText = "";
        //if (tier>0){
        if (upgradeType === 'mult') {
            effectText = `${currentGrowth}x`;
            nextGrowth = `Next: ${nextGrowth}x`
        } else {
            // assume additive if not multiplicative
            effectText = `+${currentGrowth}/s`;
            nextGrowth = `Total: ${upgrade.baseValue * tier}/s`;
        }
        $("#" + key + " #Mult").html(effectText + " " +  nextGrowth);
        $("#" + key + " #Tier").html("Tier: " + tier);

        // Check if costs exist before accessing
        if (upgrade.costs && upgrade.costs.money !== undefined) {
            $("#" + key + " #Price").html("Price: $" + upgrade.costs.money);
        } else {
            $("#" + key + " #Price").html("Price: N/A");
        }

        // Prepare a string to hold resource costs
        let resourceText = "";

        // Loop through each resource cost in unlocks[key].costs
        if (upgrade.costs) {
            Object.keys(upgrade.costs).forEach(function(resourceKey) {
                if (resourceKey === 'money') return; // Skip money if you don't want to display it

                const resource = upgrade.costs[resourceKey];
                if (typeof resource === 'number') {
                    resourceText += resourceKey + ": " + resource + "<br>";
                }
            });
        } else {
            resourceText = "Resources required: N/A";
        }

        // Update the DOM element - assuming you want to show all resources
        $("#" + key + " #ResourceCost").html(resourceText);
    });
},


updateEquipmentStats(){
    //Default woodcutting speed
    let speed = playerStats.Skilling.woodcuttingSpeed;
    //Find Equipped Axe
    for(let key in playerItems.equipped){
        const item = playerItems.equipped[key];
        if (item && item.equipSlot === 'axe'){
            if(item.choppingSpeed) {
                speed = item.choppingSpeed;
            }
            break;
        }
    }
    playerStats.Skilling.woodcuttingSpeed = speed;
    console.log(`Woodcutting speed updated to: ${speed}`);
},
updateEquipmentDisplay(){
    Object.keys(playerItems.equipment).forEach(function(key) {
        if(playerItems.equipped[key]){
            $('#equip' + [key]).hide();
            $("#slot" + playerItems.equipment[key].equipSlot).html(`${key}`);
            return;
        }
        $('#equip' + [key]).show();
        $('#equip' + [key]).html(`${[key]}`);
    })
}
};

var calc = {
autoHarvestCalculation(flatObj, multObj){
    let autoGrowth = upgrades[flatObj].baseValue * upgrades[flatObj].Tier;

    // Calculate the multiplier upgrade effect
    let speedMultiplier = 1;
    const multiplierUpgrade = upgrades[multObj];
    if (upgrades[multObj] && upgrades[multObj].Tier > 0) {
        speedMultiplier = this.calculateGrowth([multObj]);
    }

    // Apply the multiplier
    autoGrowth *= speedMultiplier;

    return autoGrowth;
},
    // Function to calculate exponential growth based on upgrade name
calculateGrowth(upgradeName, tierOffset) { 
    const upgrade = upgrades[upgradeName];
    if (!upgrade) {
    throw new Error(`Upgrade '${upgradeName}' not found`);
    }
    // Use targetTier if provided, otherwise default to current Tier
    const tierToCalculate = (typeof tierOffset === 'number') ? upgrade.Tier + tierOffset : upgrade.Tier;

    const result = upgrade.baseValue * Math.pow(upgrade.Mult, tierToCalculate);  
    // Limit to 2 decimal places and ensure output is a number
    return Number(result.toFixed(2));
},
capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
},
compactNumber(number) {
  const formatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short"
  });
  return formatter.format(number);
}
}
