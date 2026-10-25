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
            "requiresMode": "all",
            "customDescription": true
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
            "type": "damage",
            "customDescription": false
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
            "type": "damage",
            "customDescription": true
        },
        {
            "id": "fleetFooted",
            "name": "Fleet-Footed",
            "icon": "➤",
            "effect": "+0.5% attack speed per character level",
            "requires": [],
            "column": 4,
            "row": 0,
            "maxRank": 1,
            "stats": {
                "attackSpeedPerLevel": 0.005
            },
            "customDescription": false
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
            "requiresMode": "all",
            "customDescription": false
        },
        {
            "id": "untouchable",
            "name": "Untouchable",
            "icon": "◈",
            "effect": "+50% evasion",
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
            "requiresMode": "all",
            "customDescription": false
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
            "maxRank": 1,
            "customDescription": false
        },
        {
            "id": "healthNode2",
            "name": "Health",
            "icon": "♥",
            "effect": "+20% maximum health",
            "type": "health",
            "stats": {
                "healthMultiplier": 1.2
            },
            "size": 1,
            "column": 1,
            "row": 5,
            "maxRank": 1,
            "requires": [
                "healthNode"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": ""
        },
        {
            "id": "damageNode",
            "name": "Damage",
            "icon": "⚔",
            "effect": "+2 damage",
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
            "size": 1,
            "customDescription": false
        },
        {
            "id": "damageNode2",
            "name": "Damage",
            "icon": "⚔",
            "effect": "+10% damage",
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
            "start": false,
            "customDescription": false
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
            "size": 1,
            "customDescription": false
        },
        {
            "id": "accuracyNode2",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+20 accuracy",
            "type": "accuracy",
            "stats": {
                "accuracy": 20
            },
            "size": 1,
            "column": 6,
            "row": 6,
            "maxRank": 1,
            "requires": [
                "accuracyNode"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": ""
        },
        {
            "id": "attackSpeedNode",
            "name": "Attack Speed",
            "icon": "⚡",
            "effect": "+5% attack speed",
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
            "size": 1,
            "customDescription": false
        },
        {
            "id": "attackSpeedNode2",
            "name": "Attack Speed",
            "icon": "⚡",
            "effect": "+5% attack speed",
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
            "start": false,
            "customDescription": false
        },
        {
            "id": "multiHit1",
            "name": "Multi hitterrrr",
            "icon": "✦",
            "effect": "+0.25 multi-hit",
            "requires": [
                "healthNode3"
            ],
            "requiresMode": "all",
            "column": 5,
            "row": 8,
            "maxRank": 1,
            "stats": {
                "multiHit": 0.25
            },
            "size": 1.25,
            "start": false,
            "type": "accuracy",
            "customDescription": false
        },
        {
            "id": "snakeBite",
            "name": "Snake bite!",
            "icon": "✦",
            "effect": "+10% poison chance",
            "requires": [
                "attackSpeedNode2"
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
            "customDescription": false
        },
        {
            "id": "bigAttackSpeed_1",
            "name": "MORE SPEED",
            "icon": "⚡",
            "effect": "+10% attack speed",
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
            "start": false,
            "customDescription": false
        },
        {
            "id": "bigAttackSpeed_3",
            "name": "LESS.. NO MORE!",
            "icon": "⚡",
            "effect": "+10% attack speed",
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
            "sprite": "",
            "customDescription": false
        },
        {
            "id": "bigAttackSpeed_4",
            "name": "EVEN MORE SUPER SPEED",
            "icon": "⚡",
            "effect": "+30% attack speed",
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
            "sprite": "",
            "customDescription": false
        },
        {
            "id": "bigAttackSpeed_2",
            "name": "TOO MUCH SPEED",
            "icon": "⚡",
            "effect": "+50% attack speed",
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
            "sprite": "",
            "customDescription": false
        },
        {
            "id": "poisonDMG_3",
            "name": "Poison damage 3",
            "icon": "✦",
            "effect": "+1 poison damage",
            "requires": [
                "snakeBite"
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
            "sprite": "",
            "customDescription": false
        },
        {
            "id": "basicallySnake",
            "name": "Basically a snake",
            "icon": "✦",
            "effect": "+50% poison chance\n+25% poison tick speed",
            "requires": [
                "poisonDMG_3",
                "snakeBite_2"
            ],
            "requiresMode": "any",
            "column": 9,
            "row": 1,
            "maxRank": 1,
            "stats": {
                "poisonChance": 0.5,
                "poisonTickRate": 0.25
            },
            "size": 1.5,
            "start": false,
            "type": "attackSpeed",
            "sprite": "assets/skills/basicallySnake-22cb942c.png",
            "customDescription": false
        },
        {
            "id": "multiHit1_copy",
            "name": "Multi hitterrrr Copy",
            "icon": "✦",
            "effect": "+0.25 multi-hit",
            "requires": [
                "multiHit1"
            ],
            "requiresMode": "all",
            "column": 6,
            "row": 9,
            "maxRank": 1,
            "stats": {
                "multiHit": 0.25
            },
            "size": 1.25,
            "start": false,
            "type": "accuracy",
            "customDescription": false
        },
        {
            "id": "snakeBite_2",
            "name": "Snake bite! 2",
            "icon": "✦",
            "effect": "+10% poison chance",
            "requires": [
                "snakeBite"
            ],
            "requiresMode": "any",
            "column": 8,
            "row": 0,
            "maxRank": 1,
            "stats": {
                "poisonChance": 0.1
            },
            "size": 1,
            "start": false,
            "type": "attackSpeed",
            "sprite": "assets/skills/snakeBite_2-c37d999a.png",
            "customDescription": false
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
            "type": "attackSpeed",
            "customDescription": true
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
            "type": "attackSpeed",
            "customDescription": true
        },
        {
            "id": "piercingArrow",
            "name": "Piercing arrow",
            "icon": "✦",
            "effect": "30% chance to fire an arrow dealing 200% base physical damage to the row of enemies where you target is.",
            "requires": [
                "accuracyNode4"
            ],
            "requiresMode": "all",
            "column": 12,
            "row": 6,
            "maxRank": 1,
            "stats": {
                "damage": 1
            },
            "size": 1.25,
            "start": false,
            "sprite": "assets/skills/piercingArrow-326f0945.png",
            "type": "accuracy",
            "customDescription": true
        },
        {
            "id": "forkingArrow",
            "name": "forkingArrow",
            "icon": "✦",
            "effect": "10% chance to shoot an arrow from a random direction. This and all subsuquent arrows can fork to an adjacent enemies.",
            "requires": [
                "attackSpeedNode6",
                "accuracyNode10"
            ],
            "requiresMode": "all",
            "column": 7,
            "row": 13,
            "maxRank": 1,
            "stats": {
                "damage": 1
            },
            "size": 1.25,
            "start": false,
            "sprite": "assets/skills/forkingArrow-bb264a82.png",
            "type": "accuracy",
            "customDescription": true
        },
        {
            "id": "multiShot",
            "name": "Multishot",
            "icon": "✦",
            "effect": "Every attack fires an additional arrow at a random enemy. Can trigger skill effects!",
            "requires": [
                "damageNode6"
            ],
            "requiresMode": "all",
            "column": 14,
            "row": 10,
            "maxRank": 1,
            "stats": {
                "damage": 1
            },
            "size": 1.25,
            "start": false,
            "sprite": "assets/skills/piercingArrow_copy_copy-efdf2623.png",
            "type": "accuracy",
            "customDescription": true
        },
        {
            "id": "freezingArrows",
            "name": "Freezing arrows",
            "icon": "✦",
            "effect": "Arrows from abilities freeze enemies, increasing their attack timer by 3s for 9s.",
            "requires": [
                "attackSpeedNode5",
                "attackSpeedNode5_copy"
            ],
            "requiresMode": "all",
            "column": 14,
            "row": 6,
            "maxRank": 1,
            "stats": {
                "damage": 1
            },
            "size": 1,
            "start": false,
            "sprite": "assets/skills/freezingArrows-0f78c989.png",
            "type": "accuracy",
            "customDescription": true
        },
        {
            "id": "attackSpeedNode3",
            "name": "Attack Speed Path Node",
            "icon": "⚡",
            "effect": "+10% attack speed",
            "type": "attackSpeed",
            "stats": {
                "attackSpeedMultiplier": 1.1
            },
            "maxRank": 1,
            "start": false,
            "requires": [
                "accuracyNode2"
            ],
            "requiresMode": "all",
            "column": 8,
            "row": 6,
            "sprite": "",
            "size": 1,
            "customDescription": false
        },
        {
            "id": "damageNode3",
            "name": "Damage Path Node",
            "icon": "⚔",
            "effect": "+5% damage",
            "type": "damage",
            "stats": {
                "damageMultiplier": 1.05
            },
            "maxRank": 1,
            "start": false,
            "requires": [
                "damageNode4"
            ],
            "requiresMode": "all",
            "column": 10,
            "row": 10,
            "sprite": "",
            "size": 1,
            "customDescription": false
        },
        {
            "id": "damageNode4",
            "name": "Damage Path Node",
            "icon": "⚔",
            "effect": "+5% damage",
            "type": "damage",
            "stats": {
                "damageMultiplier": 1.05
            },
            "maxRank": 1,
            "start": false,
            "requires": [
                "accuracyNode2"
            ],
            "requiresMode": "all",
            "column": 8,
            "row": 8,
            "sprite": "",
            "size": 1,
            "customDescription": false
        },
        {
            "id": "accuracyNode3",
            "name": "Accuracy Path Node",
            "icon": "◎",
            "effect": "+10% accuracy",
            "type": "accuracy",
            "stats": {
                "accuracyMultiplier": 1.1
            },
            "maxRank": 1,
            "start": false,
            "requires": [
                "accuracyNode2",
                "multiHit1_copy"
            ],
            "requiresMode": "all",
            "column": 6,
            "row": 8,
            "customDescription": false,
            "sprite": "",
            "size": 1
        },
        {
            "id": "healthNode3",
            "name": "Health Path Node",
            "icon": "♥",
            "effect": "+10 maximum health",
            "type": "health",
            "stats": {
                "health": 10
            },
            "maxRank": 1,
            "start": false,
            "requires": [
                "accuracyNode2"
            ],
            "requiresMode": "all",
            "column": 5,
            "row": 7,
            "customDescription": false
        },
        {
            "id": "attackSpeedNode5",
            "name": "Attack Speed",
            "icon": "⚡",
            "effect": "+3 damage\n+5% attack speed",
            "type": "attackSpeed",
            "stats": {
                "damage": 3,
                "attackSpeedMultiplier": 1.05
            },
            "size": 1,
            "column": 13,
            "row": 5,
            "maxRank": 1,
            "requires": [
                "piercingArrow"
            ],
            "requiresMode": "all",
            "start": false,
            "sprite": "",
            "customDescription": false
        },
        {
            "id": "attackSpeedNode5_copy",
            "name": "Attack Speed Copy",
            "icon": "⚡",
            "effect": "+3 damage\n+5% attack speed",
            "type": "attackSpeed",
            "stats": {
                "damage": 3,
                "attackSpeedMultiplier": 1.05
            },
            "size": 1,
            "column": 13,
            "row": 7,
            "maxRank": 1,
            "requires": [
                "piercingArrow",
                "damageNode6"
            ],
            "requiresMode": "all",
            "start": false,
            "sprite": "",
            "customDescription": false
        },
        {
            "id": "accuracyNode4",
            "name": "Accuracy Path Node",
            "icon": "◎",
            "effect": "+10 accuracy",
            "type": "accuracy",
            "stats": {
                "accuracy": 10
            },
            "maxRank": 1,
            "start": false,
            "requires": [
                "attackSpeedNode3"
            ],
            "requiresMode": "all",
            "column": 11,
            "row": 6,
            "sprite": "",
            "size": 1,
            "customDescription": false
        },
        {
            "id": "accuracyNode5",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+10 accuracy",
            "type": "accuracy",
            "stats": {
                "accuracy": 10
            },
            "size": 1,
            "column": 11,
            "row": 4,
            "maxRank": 1,
            "requires": [
                "accuracyNode4"
            ],
            "requiresMode": "all",
            "start": false,
            "sprite": "",
            "customDescription": false
        },
        {
            "id": "accuracyNode6",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+15% accuracy\n+15% evasion",
            "type": "accuracy",
            "stats": {
                "accuracyMultiplier": 1.15,
                "evasionMultiplier": 1.15
            },
            "size": 1,
            "column": 12,
            "row": 3,
            "maxRank": 1,
            "requires": [
                "accuracyNode5"
            ],
            "requiresMode": "all",
            "start": false,
            "sprite": "",
            "customDescription": false
        },
        {
            "id": "accuracyNode7",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+5 accuracy",
            "type": "accuracy",
            "stats": {
                "accuracy": 5
            },
            "size": 1,
            "column": 11,
            "row": 2,
            "maxRank": 1,
            "requires": [
                "accuracyNode6",
                "damageNode5"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false
        },
        {
            "id": "accuracyNode8",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+1.15 accuracy\n+15% evasion",
            "type": "accuracy",
            "stats": {
                "accuracy": 1.15,
                "evasionMultiplier": 1.15
            },
            "size": 1,
            "column": 10,
            "row": 3,
            "maxRank": 1,
            "requires": [
                "accuracyNode5",
                "accuracyNode7"
            ],
            "requiresMode": "all",
            "start": false,
            "sprite": "",
            "customDescription": false
        },
        {
            "id": "damageNode5",
            "name": "Damage",
            "icon": "⚔",
            "effect": "+3 damage",
            "type": "damage",
            "stats": {
                "damage": 3
            },
            "size": 1,
            "column": 11,
            "row": 1,
            "maxRank": 1,
            "requires": [
                "basicallySnake"
            ],
            "requiresMode": "all",
            "start": false,
            "sprite": "",
            "customDescription": false
        },
        {
            "id": "damageNode6",
            "name": "Damage",
            "icon": "⚔",
            "effect": "+15% damage",
            "type": "damage",
            "stats": {
                "damageMultiplier": 1.15
            },
            "size": 1,
            "column": 13,
            "row": 10,
            "maxRank": 1,
            "requires": [
                "damageNode3"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": ""
        },
        {
            "id": "attackSpeedNode4",
            "name": "Attack Speed",
            "icon": "⚡",
            "effect": "+1.01% attack speed",
            "type": "attackSpeed",
            "stats": {
                "attackSpeedMultiplier": 1.0101010101010102
            },
            "size": 1,
            "column": 8,
            "row": 11,
            "maxRank": 1,
            "requires": [
                "damageNode3"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false
        },
        {
            "id": "attackSpeedNode6",
            "name": "Attack Speed",
            "icon": "⚡",
            "effect": "+1.01% attack speed",
            "type": "attackSpeed",
            "stats": {
                "attackSpeedMultiplier": 1.0101010101010102
            },
            "size": 1,
            "column": 7,
            "row": 12,
            "maxRank": 1,
            "requires": [
                "attackSpeedNode4"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false
        },
        {
            "id": "accuracyNode9",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+5% accuracy",
            "type": "accuracy",
            "stats": {
                "accuracyMultiplier": 1.05
            },
            "size": 1,
            "column": 9,
            "row": 12,
            "maxRank": 1,
            "requires": [
                "damageNode3"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": ""
        },
        {
            "id": "accuracyNode10",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+10% accuracy",
            "type": "accuracy",
            "stats": {
                "accuracyMultiplier": 1.1
            },
            "size": 1,
            "column": 8,
            "row": 13,
            "maxRank": 1,
            "requires": [
                "accuracyNode9"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": ""
        },
        {
            "id": "volcanicEruption",
            "name": "Volcanic Eruption",
            "icon": "✦",
            "effect": "Every attack erupts the ground beneath the target, hitting it and enemies directly above, below, left, and right. You are hit as well, losing 5% health.",
            "requires": [
                "damageNode2"
            ],
            "requiresMode": "all",
            "column": 0,
            "row": 0,
            "maxRank": 1,
            "stats": {
                "damage": 1
            },
            "size": 1,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "type": "damage"
        },
        {
            "id": "eruptionChain",
            "name": "Eruption chain",
            "icon": "✦",
            "effect": "+1 maximum eruption chains",
            "requires": [
                "damageNode2"
            ],
            "requiresMode": "all",
            "column": 1,
            "row": 0,
            "maxRank": 1,
            "stats": {
                "eruptionChains": 1
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "type": "damage"
        },
        {
            "id": "maxFury",
            "name": "Fury",
            "icon": "✦",
            "effect": "+1 maximum fury",
            "requires": [
                "healthNode2"
            ],
            "requiresMode": "all",
            "column": 1,
            "row": 6,
            "maxRank": 1,
            "stats": {
                "maxFury": 1
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": ""
        },
        {
            "id": "eruptionChain_copy",
            "name": "Eruption chain Copy",
            "icon": "✦",
            "effect": "+1 maximum eruption chains",
            "requires": [
                "damageNode2"
            ],
            "requiresMode": "all",
            "column": 1,
            "row": -1,
            "maxRank": 1,
            "stats": {
                "eruptionChains": 1
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "type": "damage"
        },
        {
            "id": "eruptionChain_copy2",
            "name": "Eruption chain Copy",
            "icon": "✦",
            "effect": "+1 maximum eruption chains",
            "requires": [
                "eruptionChain"
            ],
            "requiresMode": "all",
            "column": 2,
            "row": 0,
            "maxRank": 1,
            "stats": {
                "eruptionChains": 1
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "type": "damage"
        }
    ],
    "statSchemaVersion": 2,
    "furySchemaVersion": 1,
    "eruptionChainSchemaVersion": 1
};
