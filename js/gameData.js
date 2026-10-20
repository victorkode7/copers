
var logsPlus = 1;
var logsSellRate = 2;
var baseRate = 1;
var isTransportPaused = false;
var TransportRate = 0;
var TransportToggles = {
    logs: {
        isTransportPaused: false
    },
    ores: {
        isTransportPaused: false
    },
}

var unlocks = {
    mineshaft: {
        isUnlocked:false,
        costs: {
            money: 1000,
            oak: 1000, 
        }
    },
    stoneAxe: {
        isUnlocked:false,
        type:'tool',
        equipSlot: 'axe',
        costs: {
            money: 100,
            oak:100
        },
        properties: {
            choppingSpeed: 2
        }
    },
        ironAxe: {
        isUnlocked:false,
        type:'tool',
        equipSlot: 'axe',
        costs: {
            money: 500,
            oak: 500
        },
        properties: {
            choppingSpeed: 5
        }
    }
}
var upgrades = {
    autoChopper: {
        upgradeType:'add',
        baseValue:1,
        Mult:1,
        Tier: 0,
        MaxTier: 20,
        PriceMult:1.2,
        costs:{
            money:50,
        }
    },
    autoChopperMult: {
        upgradeType:'mult',
        baseValue:1,
        Mult:1.5,
        Tier: 0,
        MaxTier: 20,
        PriceMult:1.3,
        costs:{
            money:500,
        }
    },
    autoMiner: {
        upgradeType:'add',
        baseValue:1,
        Mult:1,
        Tier: 0,
        MaxTier: 20,
        PriceMult:1.2,
        costs:{
            money:50,
        }
    },
    autoMinerMult: {
        upgradeType:'mult',
        baseValue:1,
        Mult:1.5,
        Tier: 0,
        MaxTier: 20,
        PriceMult:1.3,
        costs:{
            money:500,
        },
        
    },
    caravan: {
        upgradeType:'mult',
        baseValue:2,
        Mult:1.5,
        Tier: 1,
        MaxTier: 20,
        PriceMult:1.1,
        costs:{
            money:100
        }
    },
}