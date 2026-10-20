var Unlock = {
updateUnlocks() {
    Object.keys(unlocks).forEach(function(key) {
        const unlock = unlocks[key];

        // Check if costs exist before accessing
        if (unlock.costs && unlock.costs.money !== undefined) {
            $("#" + key + " #Price").html("Price: $" + unlock.costs.money);
        } else {
            $("#" + key + " #Price").html("Price: N/A");
        }

        $("#" + key + " #Unlocked").html("Unlocked: " + unlock.isUnlocked);

        // Prepare a string to hold resource costs
        let resourceText = "";

        // Loop through each resource cost in unlocks[key].costs
        if (unlock.costs) {
            Object.keys(unlock.costs).forEach(function(resourceKey) {
                if (resourceKey === 'money') return; // Skip money if you don't want to display it

                const resource = unlock.costs[resourceKey];
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



findParent(obj, Name) {
    for (let key in obj) {
        if (key === Name) {
            return { parent: obj, key: key };
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            const result = this.findParent(obj[key], Name);
            if (result) {
                return result;
            }
        }
    }
    return null;
},

updateUnlockDisplay(){
    Object.keys(unlocks).forEach(function(key) {
        if (unlocks[key].isUnlocked){
            $(`#${key}`).hide();
        }
    })
}
}