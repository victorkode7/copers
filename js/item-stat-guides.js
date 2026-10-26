(function() {
    'use strict';
    const definitions = {
        mana:{affects:'Maximum mana available for attack-triggered spells.',formula:'Maximum mana = (flat skill mana + flat equipment mana) × skill multipliers × equipment multipliers',notes:'Starts at 0. The first mana reserve starts full. Mana is shared by all spells and persists through saves and map changes.',example:100},
        spellDamage:{affects:'Damage dealt by spells, independently of physical attack damage.',formula:'Spell damage = (flat skill spell damage + flat equipment spell damage) × skill multipliers × equipment multipliers × Fury damage bonus',notes:'Starts at 0. Spell hits build Fury. AOE spells cannot apply Bleed or trigger attack skills.',example:10},
        manaRegen:{affects:'Mana restored each second while alive, including offline combat.',formula:'Mana/s = (flat regeneration + maximum mana × maximum-mana regeneration rate) × max(0, 1 + increased regeneration)',notes:'Starts at 0 and stops at maximum mana. Does not revive the character.',example:10},
        manaRegenIncrease:{affects:'All mana regeneration, including regeneration based on maximum mana.',formula:'Mana/s = (flat regeneration + maximum mana × maximum-mana regeneration rate) × max(0, 1 + increased regeneration)',notes:'Increased regeneration adds together. It does not generate mana regeneration on its own.',example:.25},
        manaRegenPercent:{affects:'Mana regeneration based on maximum mana.',formula:'Mana/s = (flat regeneration + maximum mana × maximum-mana regeneration rate) × max(0, 1 + increased regeneration)',notes:'At 5% per second, 100 maximum mana adds 5 mana/s before increased regeneration.',example:.05},
        damage: {
            affects: 'Physical damage dealt by each successful hit.',
            formula: 'Damage = (2 + Strength × 2 + flat item bonuses + flat skill bonuses) × item multipliers × skill multipliers',
            notes: 'Rounded to a whole number, with a minimum of 1 damage.', example: 5
        },
        health: {
            affects: 'The character’s maximum health.',
            formula: 'Maximum health = (100 + flat item bonuses + flat skill bonuses) × item multipliers × skill multipliers',
            notes: 'Rounded to a whole number, with a minimum of 1. Increasing maximum health through equipment does not heal the character.', example: 50
        },
        healthRegen: {
            affects: 'A flat amount of health restored each second while the character is alive.',
            formula: 'HP/s = (flat regeneration + maximum health × maximum-health regeneration rate) × max(0, 1 + increased regeneration)',
            notes: 'Starts at 0 HP/s. Regeneration also works during background and offline progress, stops at maximum health, and does not revive the character.', example: 1
        },
        healthRegenIncrease: {
            affects: 'All health regeneration, including flat HP/s and regeneration based on maximum health.',
            formula: 'HP/s = (flat regeneration + maximum health × maximum-health regeneration rate) × max(0, 1 + increased regeneration)',
            notes: 'Increased regeneration from items and skill nodes adds together. Two +50% bonuses give +100% total. It does not generate regeneration on its own.', example: .5
        },
        healthRegenPercent: {
            affects: 'Health restored each second based on maximum health.',
            formula: 'HP/s = (flat regeneration + maximum health × maximum-health regeneration rate) × max(0, 1 + increased regeneration)',
            notes: 'At 1% maximum health per second, 100 maximum HP gives 1 HP/s and 1000 maximum HP gives 10 HP/s. Add this to flat regeneration, then apply increased regeneration.', example: .01
        },
        maxFury: {
            affects: 'The character’s maximum Fury capacity.',
            formula: 'Maximum fury = (base maximum fury + flat item bonuses + flat skill bonuses) × item multipliers × skill multipliers',
            notes: 'Rounded to a whole number, with a minimum of 0. Each successful non-DOT hit grants one Fury stack and adds 0.1 seconds to its shared timer. Each stack grants 2% damage. Ten stacks allow up to 1 second. When the timer runs out, lose one stack every 0.5 seconds until another hit adds time.', example: 10
        },
        maxShields: {
            affects: 'How many one-hit shields the character can hold with Shield Generator or Resonant Guard.',
            formula: 'Maximum shields = (10 + flat item bonuses + flat skill bonuses) × item multipliers × skill multipliers',
            notes: 'Rounded to a whole number, with a minimum of 0. Shield Generator grants one shield per kill. Resonant Guard grants one shield per Shockwave Slash activation, including single-enemy fights. Each shield blocks one enemy hit, regardless of damage. Self-damage and health drain bypass shields. Capacity bonuses alone do not generate shields.', example: 3
        },
        accuracy: {
            affects: 'The chance for your attacks to hit an enemy.',
            formula: 'Accuracy = (100 + flat item bonuses + flat skill bonuses) × item multipliers × skill multipliers',
            notes: 'Hit chance (%) = Accuracy − enemy evasion, limited to 5–95%. Extra accuracy cannot raise hit chance above 95%.', example: 10
        },
        evasion: {
            affects: 'How often enemies miss the character.',
            formula: 'Evasion = (25 + Evasion upgrade × 5 + flat item bonuses + flat skill bonuses) × item multipliers × skill multipliers',
            notes: 'Enemy hit chance (%) = enemy accuracy − Evasion, normally limited to 5–95%. Evasion is rounded and cannot be negative.', example: 10
        },
        multiHit: {
            affects: 'The number of living enemies targeted by each attack or Void Bolt cast.',
            formula: 'Multi-hit = (1 + flat item bonuses + flat skill bonuses) × item multipliers × skill multipliers',
            notes: 'Minimum 1; rounded to two decimals. A final value of 1.25 hits one target and has a 25% chance to target a second. It cannot hit more enemies than are alive. Extra Void Bolt targets grant their own charges without increasing the 5 mana cast cost.', example: 1
        },
        bleedDamage: {
            affects: 'Damage each Bleed application contributes to the shared DOT, based on the basic attack, multihit, or single-target ability hit that triggered it.',
            formula: 'Bleed damage added per tick = (triggering hit damage × hit ratio + flat item bonuses + flat skill bonuses) × item multipliers × skill multipliers',
            notes: 'A 100-damage hit adds 10 base damage per stack per tick, or 50 with Deep Wounds. Bleederer adds two stacks per successful chance roll, each contributing its own damage and one second of duration. Deep Wounds keeps the three strongest stacks; further applications still extend the shared timer. Fractional damage is retained. Hit values are preserved while Bleed bonuses and multipliers apply to the combined DOT. The shared timer caps at five seconds and all stacks expire together. DOT ticks cannot apply Bleed or build Fury.', example: 1
        },
        bleedChance: {
            affects: 'The chance to apply Bleed after a successful basic attack, multihit, or ability hit tagged Single target. Hits tagged AOE and DOT ticks cannot apply Bleed.',
            formula: 'Bleed chance = (item chance bonuses + skill chance bonuses) × item multipliers × skill multipliers',
            notes: 'Limited to 0–100%. Each successful roll adds one stack, or two with Bleederer, and one second per stack without resetting the tick timer. Deep Wounds limits active stacks to three. Chance multipliers need an existing chance.', example: .25
        },
        bleedTickRate: {
            affects: 'How frequently all Bleed stacks deal damage together.',
            formula: 'Tick interval (seconds) = 1 ÷ max(0.1, (1 + item rate bonuses + skill rate bonuses) × item multipliers × skill multipliers)',
            notes: 'Affects tick speed, not the shared duration or time added by an application. Starts at one tick per second.', example: .5
        },
        poisonDamage: {
            affects: 'Damage dealt by each poison stack on each tick.',
            formula: 'Poison damage per tick = (1 + flat item bonuses + flat skill bonuses) × item multipliers × skill multipliers',
            notes: 'Rounded to a whole number, with a minimum of 1. This bonus does not grant a chance to apply poison by itself.', example: 5
        },
        poisonTickRate: {
            affects: 'How frequently poison stacks deal damage.',
            formula: 'Tick interval (seconds) = 1 ÷ max(0.1, (1 + item rate bonuses + skill rate bonuses) × item multipliers × skill multipliers)',
            notes: 'Faster ticks mean a shorter interval. A rate of 1.5 gives one tick about every 0.667 seconds. This changes tick speed, not damage per tick.', example: 0.5
        },
        goldBonus: {
            affects: 'Gold awarded for defeating enemies.',
            formula: 'Gold = rolled map gold × (1 + item gold bonuses + skill gold bonuses) × item multipliers × skill multipliers',
            notes: 'The gold reward is rounded down and cannot be negative.', example: 0.5
        },
        poisonChance: {
            affects: 'The chance to apply a poison stack on each successful attack or direct ability hit, including single-target and AOE abilities. DOT ticks cannot apply poison.',
            formula: 'Poison chance = (item chance bonuses + skill chance bonuses) × item multipliers × skill multipliers',
            notes: 'The final chance is limited to 0–100%. Chance multipliers need an existing chance: multiplying 0% still gives 0%.', example: 0.05
        },
        attackSpeed: {
            affects: 'How often the character attacks.',
            formula: 'Attack interval (seconds) = (1.2 × 0.92^Haste upgrade) ÷ (item speed multipliers × skill speed multipliers × max(0.01, 1 + skill speed bonuses))',
            notes: 'A multiplier above 1 makes attacks faster. At 1.5, a 1.2-second interval becomes 0.8 seconds. The normal minimum interval is 0.25 seconds.', example: 1.5
        }
    };

    function get(key) {
        const rule = Equipment.stats[key];
        if (!rule) return null;
        if (rule.mode === 'min') {
            const interval = key === 'minimumAttackInterval';
            return {
                affects: interval ? 'The fastest attack interval allowed while this developer item is equipped.' : 'The lowest enemy hit chance allowed while this developer item is equipped.',
                input: interval ? 'Enter seconds directly: 0.001 means one millisecond. Allowed range: 0.001–0.25.' : 'Enter a percentage directly: 0 means 0%, and 5 means 5%. Allowed range: 0–5.',
                formula: interval ? 'Final attack interval = max(calculated attack interval, lowest equipped interval limit)' : 'Enemy hit chance (%) = max(lowest equipped chance limit, min(95, enemy accuracy − Evasion))',
                example: interval ? '0.001 lowers the usual 0.25-second floor. It does not increase attack speed by itself.' : '0 allows enemy hit chance to reach 0% when evasion is high enough; it does not force all enemies to miss.',
                notes: 'Developer only. If several items set this limit, the lowest value is used.'
            };
        }
        const stem = key === 'attackSpeedMultiplier' ? 'attackSpeed' : key === 'goldBonusMultiplier' ? 'goldBonus' : key.replace(/Multiplier$/, '');
        const definition = definitions[stem];
        if (!definition) return null;
        const multiplier = rule.mode === 'multiply';
        const percent = rule.display.type === 'percent';
        const value = multiplier ? 1.5 : definition.example;
        let example = 'Enter ' + value + ' → ' + Equipment.describe({stats: {[key]: value}}) + '.';
        if (key === 'poisonChance') example += ' Added to an existing 10% chance, 0.05 gives 15% before multipliers.';
        if (key === 'poisonChanceMultiplier') example += ' An existing 10% chance becomes 15%, not 60%.';
        return {
            affects: definition.affects,
            input: multiplier ? 'Value = 1 + desired bonus (%) ÷ 100. Use 1 for no change, 1.5 for +50%, or 0.9 for −10%. Values must be greater than zero.'
                : percent ? 'Value = desired bonus (%) ÷ 100. Use 0.05 for +5%, or 0.5 for +50%. Use 0 for no bonus.'
                : 'Value = the flat amount to add. Use ' + definition.example + ' for +' + definition.example + ', or 0 for no bonus.',
            formula: definition.formula,
            example,
            notes: (multiplier ? 'Multipliers multiply together: 1.5 × 1.5 = 2.25 (+125%), not +100%. '
                : /^(?:health|mana)Regen/.test(key) ? '' : 'Flat bonuses add together before multipliers are applied. ') + definition.notes
        };
    }
    window.ItemStatGuides = {get};
})();
