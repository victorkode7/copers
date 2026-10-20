var Inventory = {
updateInventory(){
    $("#money").html("Money: $"+ calc.compactNumber(Math.round(inventory.money)));
    $("#TransportToggleAll").html("Status: " + (isTransportPaused ? "Paused" : calc.calculateGrowth('caravan')+ "/s"));
    $("#TransportToggleLogs").html((TransportToggles.logs.isTransportPaused ? "Paused" : "Transporting"));
    $("#TransportToggleOres").html((TransportToggles.ores.isTransportPaused ? "Paused" : "Transporting"));

    //$("#sales").html("Sales: " + totalSellRate + "/s")
    /*
    $("#resourceList1").html("oak: " + Math.round(inventory.logs.oak));
    $("#resourceList2").html("willow: " + Math.round(inventory.logs.willow));
    $("#resourceList3").html("stone: " + Math.round(inventory.ores.stone));
*/

    for (const [type, resourceNames] of Object.entries(market)) {
        Object.keys(resourceNames).forEach((name) => {
            const value = Math.round(market[type][name]);
            // Generate the element ID dynamically, for example: resourceLogsOak
            const elementIdXD = `#marketName${calc.capitalizeFirstLetter(type)}${calc.capitalizeFirstLetter(name)}`;
            const elementIdXD2 = `#marketAmount${calc.capitalizeFirstLetter(type)}${calc.capitalizeFirstLetter(name)}`;
            
            $(elementIdXD).html(`${calc.capitalizeFirstLetter(name)}`);
            $(elementIdXD2).html(`${value} / ${calc.compactNumber(marketCap)}`);
        });
    }


        // Resources to update dynamically
    // Loop through each resource type
    for (const [type, resourceNames] of Object.entries(inventory)) {
        Object.keys(resourceNames).forEach((name) => {
            const value = Math.round(inventory[type][name]);
            // Generate the element ID dynamically, for example: resourceLogsOak
            const elementId = `#resource${calc.capitalizeFirstLetter(type)}${calc.capitalizeFirstLetter(name)}`;
            const elementId2 = `#resourceAmount${calc.capitalizeFirstLetter(type)}${calc.capitalizeFirstLetter(name)}`;
            
            $(elementId).html(`${calc.capitalizeFirstLetter(name)}`);
            $(elementId2).html(`${value}`);
        });
    }
},
}