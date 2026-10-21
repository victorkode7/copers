(function() {
    'use strict';
    const definitions = {
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
            affects: 'The number of living enemies targeted by each attack.',
            formula: 'Multi-hit = (1 + flat item bonuses + flat skill bonuses) × item multipliers × skill multipliers',
            notes: 'Minimum 1; rounded to two decimals. A final value of 1.25 hits one target and has a 25% chance to target a second. It cannot hit more enemies than are alive.', example: 1
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
            affects: 'The chance to apply a poison stack after a successful hit.',
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
                : 'Flat bonuses add together before multipliers are applied. ') + definition.notes
        };
    }
    window.ItemStatGuides = {get};
})();
