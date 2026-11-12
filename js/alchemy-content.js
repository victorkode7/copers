// Alchemy balance is independent of Town productivity and production resources.
(function (root) {
    'use strict';
    root.AlchemyContent = {
        version: 1,
        unlockWorld: 'tideglassCoast',
        potionSlots: 1,
        maximumUpgradeLevel: 10,
        maximumBrewBatch: 10000,
        maximumQueueEntries: 20,
        progression: {softCapLevel: 10,softCapMultiplier: .001,softCapDecay: .1,outgrownMultiplier: .85},
        liquids: {
            moonwater: {name: 'Moonwater',color: '#9cceff',perHour: 120,capacity: 120,initiallyUnlocked: true,
                description: 'A cool, luminous essence gathered one drop at a time.'},
            emberOil: {name: 'Ember Oil',color: '#ffac62',perHour: 60,capacity: 120,initiallyUnlocked: false,
                unlockCost: {liquids: {moonwater: 10}},
                description: 'A warm amber oil with tiny embers suspended inside.'}
        },
        recipes: {
            moonveil: {name: 'Moonveil',brewSeconds: 10,level: 1,xp: 10,successChance: .7,successPerLevel: .05,color: '#9cceff',seconds: 600,liquids: {moonwater: 5},materials: {gel: 3}},
            emberheart: {name: 'Emberheart',brewSeconds: 20,level: 3,xp: 25,successChance: .6,successPerLevel: .05,color: '#ffac62',seconds: 600,liquids: {emberOil: 5},materials: {fang: 3}},
            twilight: {name: 'Twilight',brewSeconds: 30,level: 6,xp: 60,successChance: .5,successPerLevel: .05,color: '#c3a2ef',seconds: 900,liquids: {moonwater: 3,emberOil: 3},materials: {crystal: 1}}
        }
    };
}(globalThis));
