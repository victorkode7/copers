window.adventureSkillTree = {
    "experienceBase": 100,
    "experiencePerLevel": 100,
    "nodes": [
        {
            "id": "origin",
            "name": "Wayfarer",
            "icon": "✦",
            "effect": "Your journey begins here.",
            "requires": [],
            "column": 3,
            "row": 3,
            "start": true,
            "maxRank": 0,
            "stats": {
                "healthMultiplier": 1
            },
            "size": 1,
            "requiresMode": "all"
        },
        {
            "id": "mightyBlows",
            "name": "Mighty Blows",
            "icon": "⚔",
            "effect": "+1 damage",
            "requires": [
                "damageNode"
            ],
            "column": 1,
            "row": 2,
            "maxRank": 1,
            "stats": {
                "damage": 1
            },
            "size": 1,
            "start": false,
            "requiresMode": "all",
            "type": "damage"
        },
        {
            "id": "shockwaveSlash",
            "name": "Shockwave slash",
            "icon": "✹",
            "effect": "Your attacks have a 25% chance to hit all surrounding enemies for 33% damage!",
            "requires": [
                "mightyBlows"
            ],
            "column": 0,
            "row": 2,
            "maxRank": 1,
            "stats": {},
            "size": 1.25,
            "start": false,
            "requiresMode": "all",
            "type": "damage"
        },
        {
            "id": "quickHands",
            "name": "Quick Hands",
            "icon": "➶",
            "effect": "Attack 1% faster",
            "requires": [
                "attackSpeedNode"
            ],
            "column": 4,
            "row": 1,
            "maxRank": 1,
            "stats": {
                "attackSpeedMultiplier": 1.0101010101010102
            }
        },
        {
            "id": "fleetFooted",
            "name": "Fleet-Footed",
            "icon": "➤",
            "effect": "+0.5% attack speed per character level",
            "requires": [
                "quickHands"
            ],
            "column": 4,
            "row": 0,
            "maxRank": 1,
            "stats": {
                "attackSpeedPerLevel": 0.005
            }
        },
        {
            "id": "thickHide",
            "name": "Thick Hide",
            "icon": "⬟",
            "effect": "+25 evasion",
            "requires": [
                "healthNode"
            ],
            "column": 2,
            "row": 5,
            "maxRank": 1,
            "stats": {
                "evasion": 25
            },
            "size": 1,
            "start": false,
            "requiresMode": "all"
        },
        {
            "id": "untouchable",
            "name": "Untouchable",
            "icon": "◈",
            "effect": "1.5x Evasion",
            "requires": [
                "thickHide"
            ],
            "column": 2,
            "row": 6,
            "maxRank": 1,
            "stats": {
                "evasionMultiplier": 1.5
            },
            "size": 1,
            "start": false,
            "requiresMode": "all"
        },
        {
            "id": "scavenger",
            "name": "Scavenger",
            "icon": "◉",
            "effect": "+10% gold from battles",
            "requires": [
                "accuracyNode"
            ],
            "column": 5,
            "row": 4,
            "maxRank": 1,
            "stats": {
                "goldBonus": 0.1
            }
        },
        {
            "id": "treasureHunter",
            "name": "Treasure Hunter",
            "icon": "❖",
            "effect": "+15% gold from battles",
            "requires": [
                "scavenger"
            ],
            "column": 6,
            "row": 4,
            "maxRank": 1,
            "stats": {
                "goldBonus": 0.15
            }
        },
        {
            "id": "healthNode",
            "name": "Health",
            "icon": "♥",
            "effect": "+10 maximum health",
            "type": "health",
            "stats": {
                "health": 10
            },
            "column": 2,
            "row": 4,
            "requires": [
                "origin"
            ],
            "requiresMode": "all",
            "start": false,
            "maxRank": 1
        },
        {
            "id": "healthNode2",
            "name": "Health",
            "icon": "♥",
            "effect": "+5% increased health",
            "type": "health",
            "stats": {
                "health": 0.05
            },
            "size": 1,
            "column": 1,
            "row": 5,
            "maxRank": 1,
            "requires": [
                "healthNode"
            ],
            "requiresMode": "all",
            "start": false
        },
        {
            "id": "damageNode",
            "name": "Damage",
            "icon": "⚔",
            "effect": "+2 base damage",
            "type": "damage",
            "stats": {
                "damage": 2
            },
            "column": 2,
            "row": 2,
            "requires": [
                "origin"
            ],
            "requiresMode": "all",
            "start": false,
            "maxRank": 1,
            "size": 1
        },
        {
            "id": "damageNode2",
            "name": "Damage",
            "icon": "⚔",
            "effect": "+10% increased damage",
            "type": "damage",
            "stats": {
                "damageMultiplier": 1.1
            },
            "size": 1,
            "column": 1,
            "row": 1,
            "maxRank": 1,
            "requires": [
                "damageNode"
            ],
            "requiresMode": "all",
            "start": false
        },
        {
            "id": "accuracyNode",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+5 accuracy",
            "type": "accuracy",
            "stats": {
                "accuracy": 5
            },
            "column": 4,
            "row": 4,
            "requires": [
                "origin"
            ],
            "requiresMode": "all",
            "start": false,
            "maxRank": 1,
            "size": 1
        },
        {
            "id": "accuracyNode2",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+10% accuracy",
            "type": "accuracy",
            "stats": {
                "accuracyMultiplier": 1.1
            },
            "size": 1,
            "column": 5,
            "row": 5,
            "maxRank": 1,
            "requires": [
                "accuracyNode"
            ],
            "requiresMode": "all",
            "start": false
        },
        {
            "id": "attackSpeedNode",
            "name": "Attack Speed",
            "icon": "⚡",
            "effect": "+5% Attack speed",
            "type": "attackSpeed",
            "stats": {
                "attackSpeedMultiplier": 1.05
            },
            "column": 4,
            "row": 2,
            "requires": [
                "origin"
            ],
            "requiresMode": "all",
            "start": false,
            "maxRank": 1,
            "size": 1
        },
        {
            "id": "attackSpeedNode2",
            "name": "Attack Speed",
            "icon": "⚡",
            "effect": "+5% Attack speed",
            "type": "attackSpeed",
            "stats": {
                "attackSpeedMultiplier": 1.05
            },
            "size": 1,
            "column": 5,
            "row": 1,
            "maxRank": 1,
            "requires": [
                "attackSpeedNode"
            ],
            "requiresMode": "all",
            "start": false
        },
        {
            "id": "multiHit1",
            "name": "Multi hitterrrr",
            "icon": "✦",
            "effect": "+25% Multi-hit",
            "requires": [
                "accuracyNode"
            ],
            "requiresMode": "all",
            "column": 4,
            "row": 5,
            "maxRank": 1,
            "stats": {
                "multiHit": 0.25
            },
            "size": 1.25,
            "start": false,
            "type": "accuracy"
        },
        {
            "id": "snakeBite",
            "name": "Snake bite!",
            "icon": "✦",
            "effect": "+10% chance to poison enemies",
            "requires": [
                "attackSpeedNode2"
            ],
            "requiresMode": "all",
            "column": 6,
            "row": 1,
            "maxRank": 1,
            "stats": {
                "poisonChance": 0.1
            },
            "size": 1,
            "start": false,
            "type": "attackSpeed"
        },
        {
            "id": "bigAttackSpeed_1",
            "name": "MORE SPEED",
            "icon": "⚡",
            "effect": "+10% Attack speed",
            "type": "attackSpeed",
            "stats": {
                "attackSpeedMultiplier": 1.1
            },
            "size": 1.25,
            "column": 7,
            "row": -1,
            "maxRank": 1,
            "requires": [
                "attackSpeedNode2"
            ],
            "requiresMode": "all",
            "start": false
        },
        {
            "id": "bigAttackSpeed_3",
            "name": "LESS.. NO MORE!",
            "icon": "⚡",
            "effect": "+10% Attack speed",
            "type": "attackSpeed",
            "stats": {
                "attackSpeedMultiplier": 1.1
            },
            "size": 1.25,
            "column": 8,
            "row": -2,
            "maxRank": 1,
            "requires": [
                "bigAttackSpeed_1"
            ],
            "requiresMode": "all",
            "start": false
        },
        {
            "id": "bigAttackSpeed_4",
            "name": "EVEN MORE SUPER SPEED",
            "icon": "⚡",
            "effect": "+30% Attack speed",
            "type": "attackSpeed",
            "stats": {
                "attackSpeedMultiplier": 1.3
            },
            "size": 1.25,
            "column": 8,
            "row": -1,
            "maxRank": 1,
            "requires": [
                "bigAttackSpeed_1"
            ],
            "requiresMode": "all",
            "start": false
        },
        {
            "id": "bigAttackSpeed_2",
            "name": "TOO MUCH SPEED",
            "icon": "⚡",
            "effect": "+50% Attack speed",
            "type": "attackSpeed",
            "stats": {
                "attackSpeedMultiplier": 1.5
            },
            "size": 1.25,
            "column": 7,
            "row": -2,
            "maxRank": 1,
            "requires": [
                "bigAttackSpeed_1"
            ],
            "requiresMode": "all",
            "start": false
        },
        {
            "id": "poisonDMG_2",
            "name": "Poison damage 2",
            "icon": "✦",
            "effect": "Add +1 base poison damage",
            "requires": [
                "poisonDMG_3"
            ],
            "requiresMode": "all",
            "column": 8,
            "row": 2,
            "maxRank": 1,
            "stats": {
                "poisonDamage": 1
            },
            "size": 1,
            "start": false,
            "type": "attackSpeed"
        },
        {
            "id": "poisonDMG_3",
            "name": "Poison damage 3",
            "icon": "✦",
            "effect": "Add +1 base poison damage",
            "requires": [
                "snakeBite"
            ],
            "requiresMode": "all",
            "column": 7,
            "row": 2,
            "maxRank": 1,
            "stats": {
                "poisonDamage": 1
            },
            "size": 1,
            "start": false,
            "type": "attackSpeed"
        },
        {
            "id": "basicallySnake",
            "name": "Basically a snake",
            "icon": "✦",
            "effect": "+50% chance to poison, 1.25x faster poison tick rate",
            "requires": [
                "poisonDMG_2",
                "snakeBite_2"
            ],
            "requiresMode": "any",
            "column": 8,
            "row": 1,
            "maxRank": 1,
            "stats": {
                "poisonChance": 0.5,
                "poisonTickRate": 0.25
            },
            "size": 1.25,
            "start": false,
            "type": "attackSpeed",
            "sprite": "assets/skills/basicallySnake-22cb942c.png"
        },
        {
            "id": "multiHit1_copy",
            "name": "Multi hitterrrr Copy",
            "icon": "✦",
            "effect": "+25% Multi-hit",
            "requires": [
                "multiHit1"
            ],
            "requiresMode": "all",
            "column": 4,
            "row": 6,
            "maxRank": 1,
            "stats": {
                "multiHit": 0.25
            },
            "size": 1.25,
            "start": false,
            "type": "accuracy"
        },
        {
            "id": "multiHit1_copy_copy",
            "name": "Multi hitterrrr Copy Copy",
            "icon": "✦",
            "effect": "+25% Multi-hit",
            "requires": [
                "multiHit1_copy"
            ],
            "requiresMode": "all",
            "column": 4,
            "row": 7,
            "maxRank": 1,
            "stats": {
                "multiHit": 0.25
            },
            "size": 1.25,
            "start": false,
            "type": "accuracy"
        },
        {
            "id": "multiHit1_copy_copy_copy",
            "name": "Multi hitterrrr Copy Copy Copy",
            "icon": "✦",
            "effect": "+25% Multi-hit",
            "requires": [
                "multiHit1_copy_copy"
            ],
            "requiresMode": "all",
            "column": 4,
            "row": 8,
            "maxRank": 1,
            "stats": {
                "multiHit": 0.25
            },
            "size": 1.25,
            "start": false,
            "type": "accuracy"
        },
        {
            "id": "snakeBite_2",
            "name": "Snake bite! 2",
            "icon": "✦",
            "effect": "+10% chance to poison enemies",
            "requires": [
                "snakeBite"
            ],
            "requiresMode": "all",
            "column": 7,
            "row": 1,
            "maxRank": 1,
            "stats": {
                "poisonChance": 0.1
            },
            "size": 1,
            "start": false,
            "type": "attackSpeed",
            "sprite": "assets/skills/snakeBite_2-c37d999a.png"
        }
    ],
    "statSchemaVersion": 2
};
