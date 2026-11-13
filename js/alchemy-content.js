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
            emberOil: {name: 'Ember Oil',color: '#ffac62',perHour: 60,capacity: 120,initiallyUnlocked: false,unlockLevel: 10,
                unlockCost: {liquids: {moonwater: 10}},
                description: 'A warm amber oil with tiny embers suspended inside.'}
        },
        recipes: {
            moonveil: {name: 'Moonveil',brewSeconds: 10,level: 1,xp: 10,successChance: .7,successPerLevel: .05,color: '#9cceff',seconds: 600,liquids: {moonwater: 5},materials: {gel: 3}},
            emberheart: {name: 'Emberheart',brewSeconds: 20,level: 3,xp: 25,successChance: .6,successPerLevel: .05,color: '#ffac62',seconds: 600,liquids: {moonwater: 5},materials: {material_0e547cc411cb91fce7c30162: 3}},
            twilight: {name: 'Twilight',brewSeconds: 30,level: 5,xp: 45,successChance: .5,successPerLevel: .05,color: '#c3a2ef',seconds: 900,liquids: {moonwater: 7},materials: {hide: 3}}
        }
    };
    Object.assign(root.AlchemyContent.recipes.moonveil, {
        description: 'Regenerate 0.2% of maximum life per second. +30% total health regeneration.',
        effects: {healthRegenPercent: .002,healthRegenMultiplier: 1.3}
    });
    Object.assign(root.AlchemyContent.recipes.emberheart, {
        description: '+30% total mana regeneration.', effects: {manaRegenMultiplier: 1.3}
    });
    Object.assign(root.AlchemyContent.recipes.twilight, {
        description: '+30% defences from equipment: maximum health, health regeneration, evasion and maximum shields.',
        effects: {equipmentDefenceMultiplier: 1.3}
    });
    Object.assign(root.AlchemyContent.recipes, {
        gildedDraught: {name:'Gilded Draught',brewSeconds:20,level:3,xp:25,successChance:.6,successPerLevel:.05,color:'#f1cd68',seconds:600,
            liquids:{moonwater:5},materials:{material_1b4e649727a05b3ad2ec7f8a:3},description:'+25% gold gained.',effects:{goldMultiplier:1.25}},
        moonspring: {name:'Moonspring',brewSeconds:20,level:10,xp:120,successChance:.6,successPerLevel:.05,color:'#9cceff',seconds:600,
            liquids:{emberOil:5},materials:{material_985927188da978e5f7fa3e5c:1},description:'Gain 1 Moonwater per monster killed, up to storage capacity.',effects:{liquidsOnKill:{moonwater:1}}},
        emberwell: {name:'Emberwell',brewSeconds:25,level:10,xp:100,successChance:.55,successPerLevel:.05,color:'#ffac62',seconds:600,
            liquids:{moonwater:5},materials:{material_9dcedc16887f1776d1611c8d:3},description:'Gain 1 Ember Oil per monster killed, up to storage capacity. Requires Ember Oil to be unlocked.',effects:{liquidsOnKill:{emberOil:1}}},
        lifebloom: {name:'Lifebloom',brewSeconds:30,level:7,xp:75,successChance:.5,successPerLevel:.05,color:'#e57d9d',seconds:600,
            liquids:{moonwater:8},materials:{crystal:1},description:'Instantly recover 1% of maximum life per monster killed.',effects:{lifeOnKill:.01}}
    });
}(globalThis));
