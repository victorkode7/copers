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
            "requiresMode": "any",
            "start": false,
            "sprite": ""
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
            "requiresMode": "any",
            "start": false,
            "sprite": ""
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
            "requiresMode": "any",
            "start": false,
            "sprite": ""
        },
        {
            "id": "poisonDMG_2",
            "name": "Poison damage 2",
            "icon": "✦",
            "effect": "Add +1 base poison damage",
            "requires": [
                "poisonDMG_3"
            ],
            "requiresMode": "any",
            "column": 8,
            "row": 2,
            "maxRank": 1,
            "stats": {
                "poisonDamage": 1
            },
            "size": 1,
            "start": false,
            "type": "attackSpeed",
            "sprite": ""
        },
        {
            "id": "poisonDMG_3",
            "name": "Poison damage 3",
            "icon": "✦",
            "effect": "Add +1 base poison damage",
            "requires": [
                "snakeBite"
            ],
            "requiresMode": "any",
            "column": 7,
            "row": 2,
            "maxRank": 1,
            "stats": {
                "poisonDamage": 1
            },
            "size": 1,
            "start": false,
            "type": "attackSpeed",
            "sprite": ""
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
            "requiresMode": "any",
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
        },
        {
            "id": "poisonExecute",
            "name": "poisonExecute",
            "icon": "✦",
            "effect": "Poison damage now executes!",
            "requires": [
                "bigAttackSpeed_4"
            ],
            "requiresMode": "all",
            "column": 9,
            "row": -1,
            "maxRank": 1,
            "stats": {
                "poisonTickRateMultiplier": 1.1
            },
            "size": 1.5,
            "start": false,
            "sprite": "assets/skills/poisonExecute-9a38ed77.png",
            "type": "attackSpeed"
        },
        {
            "id": "bloomingFlower",
            "name": "Blooming flower",
            "icon": "✦",
            "effect": "On death, enemies transfer all remaining poison stacks to a random living enemy, preserving their remaining duration.",
            "requires": [
                "bigAttackSpeed_3"
            ],
            "requiresMode": "all",
            "column": 9,
            "row": -2,
            "maxRank": 1,
            "stats": {},
            "size": 1.5,
            "start": false,
            "sprite": "assets/skills/bloomingFlower-a11a5059.png",
            "type": "attackSpeed"
        },
        {
            "id": "piercingArrow",
            "name": "Piercing arrow",
            "icon": "✦",
            "effect": "30% chance per attack to fire a piercing arrow through your target's row, dealing 200% of your normal physical hit damage.",
            "requires": [
                "accuracyNode2"
            ],
            "requiresMode": "all",
            "column": 6,
            "row": 5,
            "maxRank": 1,
            "stats": {
                "damage": 1
            },
            "size": 1.25,
            "start": false,
            "sprite": "assets/skills/piercingArrow-2c69979f.png",
            "type": "accuracy"
        },
        {
            "id": "forkingArrow",
            "name": "forkingArrow",
            "icon": "✦",
            "effect": "10% chance to fire an extra arrow from a random side. All ability arrows chain diagonally forward, hitting each enemy once.",
            "requires": [
                "accuracyNode2"
            ],
            "requiresMode": "all",
            "column": 5,
            "row": 6,
            "maxRank": 1,
            "stats": {
                "damage": 1
            },
            "size": 1.25,
            "start": false,
            "sprite": "assets/skills/piercingArrow_copy-e21dedd1.png",
            "type": "accuracy"
        },
        {
            "id": "multiShot",
            "name": "Multishot",
            "icon": "✦",
            "effect": "Every attack fires an additional arrow at a random enemy. Can trigger skill effects!",
            "requires": [
                "accuracyNode2"
            ],
            "requiresMode": "all",
            "column": 6,
            "row": 6,
            "maxRank": 1,
            "stats": {
                "damage": 1
            },
            "size": 1.25,
            "start": false,
            "sprite": "assets/skills/piercingArrow_copy_copy-efdf2623.png",
            "type": "accuracy"
        },
        {
            "id": "freezingArrows",
            "name": "Freezing arrows",
            "icon": "✦",
            "effect": "Ability arrows freeze enemies for 9 seconds, adding 3 seconds between their attacks. Further arrow hits refresh the duration.",
            "requires": [
                "piercingArrow"
            ],
            "requiresMode": "all",
            "column": 7,
            "row": 5,
            "maxRank": 1,
            "stats": {
                "damage": 1
            },
            "size": 1,
            "start": false,
            "sprite": ""
        }
    ],
    "statSchemaVersion": 2
};
