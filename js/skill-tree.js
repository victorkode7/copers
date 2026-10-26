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
            "size": 1.5,
            "start": false,
            "requiresMode": "all",
            "type": "damage",
            "customDescription": true,
            "sprite": "",
            "abilityTargeting": "aoe"
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
            "effect": "+25% evasion",
            "requires": [
                "thickHide"
            ],
            "column": 2,
            "row": 6,
            "maxRank": 1,
            "stats": {
                "evasionMultiplier": 1.25
            },
            "size": 1,
            "start": false,
            "requiresMode": "all",
            "customDescription": false,
            "sprite": ""
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
            "effect": "+10% maximum health",
            "type": "health",
            "stats": {
                "healthMultiplier": 1.1
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
            "customDescription": true,
            "abilityTargeting": "aoe"
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
            "customDescription": true,
            "abilityTargeting": "aoe"
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
            "customDescription": true,
            "abilityTargeting": "singleTarget"
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
            "effect": "Every attack erupts the ground beneath the target, hitting all adjacent enemies. You are hit as well, losing 5% health.",
            "requires": [
                "damageNode7"
            ],
            "requiresMode": "all",
            "column": -3,
            "row": -3,
            "maxRank": 1,
            "stats": {
                "damage": 1
            },
            "size": 1.5,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "type": "damage",
            "abilityTargeting": "aoe"
        },
        {
            "id": "eruptionChain",
            "name": "Eruption chain",
            "icon": "✦",
            "effect": "+1 maximum eruption chains",
            "requires": [
                "volcanicEruption"
            ],
            "requiresMode": "all",
            "column": -2,
            "row": -4,
            "maxRank": 1,
            "stats": {
                "eruptionChains": 1
            },
            "size": 1.25,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "type": "damage"
        },
        {
            "id": "maxFury",
            "name": "Fury",
            "icon": "✦",
            "effect": "+10 maximum fury",
            "requires": [
                "healthNode2"
            ],
            "requiresMode": "all",
            "column": 1,
            "row": 8,
            "maxRank": 1,
            "stats": {
                "maxFury": 10
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
                "eruptionChain"
            ],
            "requiresMode": "all",
            "column": -2,
            "row": -5,
            "maxRank": 1,
            "stats": {
                "eruptionChains": 1
            },
            "size": 1.25,
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
            "column": -1,
            "row": -4,
            "maxRank": 1,
            "stats": {
                "eruptionChains": 1
            },
            "size": 1.25,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "type": "damage"
        },
        {
            "id": "healthNode4",
            "name": "Health",
            "icon": "♥",
            "effect": "+10 flat health regeneration per second",
            "type": "health",
            "stats": {
                "healthRegen": 10
            },
            "size": 1,
            "column": -1,
            "row": 4,
            "maxRank": 1,
            "requires": [
                "healthNode5"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": ""
        },
        {
            "id": "righteousFire",
            "name": "Fire of the Righteous",
            "icon": "🔥",
            "effect": "Regeneration heals only up to 30% of maximum HP.\nDrain 10% of maximum HP per second.\nDeal unused regeneration as burning damage, split evenly among all living enemies.",
            "requires": [
                "healthNode4",
                "healthNode5_copy"
            ],
            "requiresMode": "all",
            "column": -2,
            "row": 5,
            "maxRank": 1,
            "stats": {},
            "size": 1.5,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "abilityTargeting": "aoe"
        },
        {
            "id": "healthNode5",
            "name": "Health",
            "icon": "♥",
            "effect": "+15% maximum health regenerated per second",
            "type": "health",
            "stats": {
                "healthRegenPercent": 0.15
            },
            "size": 1,
            "column": 0,
            "row": 5,
            "maxRank": 1,
            "requires": [
                "healthNode2"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": ""
        },
        {
            "id": "healthNode5_copy",
            "name": "Health Copy",
            "icon": "♥",
            "effect": "+15% maximum health regenerated per second",
            "type": "health",
            "stats": {
                "healthRegenPercent": 0.15
            },
            "size": 1,
            "column": -1,
            "row": 5,
            "maxRank": 1,
            "requires": [
                "healthNode5"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": ""
        },
        {
            "id": "shieldGenerator",
            "name": "Shield generator",
            "icon": "✦",
            "effect": "Kills give the player a shield that protects the player from one hit",
            "requires": [
                "healthNode2",
                "shieldSlam"
            ],
            "requiresMode": "all",
            "column": -1,
            "row": 7,
            "maxRank": 1,
            "stats": {},
            "size": 1.5,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "type": "health"
        },
        {
            "id": "shieldSlam",
            "name": "Shield slam",
            "icon": "✦",
            "effect": "At maximum shields, consume half your shields. Deal 100% of your physical damage per shield consumed to the target.",
            "requires": [],
            "requiresMode": "all",
            "column": -3,
            "row": 7,
            "maxRank": 1,
            "stats": {},
            "size": 1.25,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "type": "health",
            "abilityTargeting": "singleTarget"
        },
        {
            "id": "addedShields",
            "name": "Added shields",
            "icon": "✦",
            "effect": "+2 maximum shields\n+5 damage",
            "requires": [
                "shieldSlam"
            ],
            "requiresMode": "all",
            "column": -4,
            "row": 8,
            "maxRank": 1,
            "stats": {
                "maxShields": 2,
                "damage": 5
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "type": "health"
        },
        {
            "id": "overflowingSlam",
            "name": "Overflowing Slam",
            "icon": "🛡",
            "effect": "Shield Slam carries excess physical damage from a kill into the next living enemy. Continues until the damage is spent.",
            "requires": [
                "addedShields_copy"
            ],
            "requiresMode": "all",
            "column": -5,
            "row": 5,
            "maxRank": 1,
            "stats": {},
            "size": 1.25,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "type": "damage",
            "abilityTargeting": "aoe"
        },
        {
            "id": "resonantGuard",
            "name": "Resonant Guard",
            "icon": "🛡",
            "effect": "Each Shockwave Slash activation grants 1 shield, up to your maximum (10 by default). Works even against a single enemy.",
            "requires": [
                "addedShields"
            ],
            "requiresMode": "all",
            "column": -5,
            "row": 9,
            "maxRank": 1,
            "stats": {},
            "size": 1.25,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "type": "health"
        },
        {
            "id": "addedShields_copy",
            "name": "Added shields Copy",
            "icon": "✦",
            "effect": "+2 maximum shields\n+5 damage",
            "requires": [
                "shieldSlam"
            ],
            "requiresMode": "all",
            "column": -4,
            "row": 6,
            "maxRank": 1,
            "stats": {
                "maxShields": 2,
                "damage": 5
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "type": "health"
        },
        {
            "id": "damageNode7",
            "name": "Damage Path Node",
            "icon": "⚔",
            "effect": "+10% damage",
            "type": "damage",
            "stats": {
                "damageMultiplier": 1.1
            },
            "maxRank": 1,
            "start": false,
            "requires": [
                "damageNode2"
            ],
            "requiresMode": "all",
            "customDescription": false,
            "column": -1,
            "row": -1,
            "sprite": "",
            "size": 1
        },
        {
            "id": "addedShields_copy2",
            "name": "Added shields Copy",
            "icon": "✦",
            "effect": "+5 maximum health\n+25% maximum health",
            "requires": [
                "resonantGuard"
            ],
            "requiresMode": "all",
            "column": -6,
            "row": 8,
            "maxRank": 1,
            "stats": {
                "health": 5,
                "healthMultiplier": 1.25
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "type": "health"
        },
        {
            "id": "addedShields_copy2_copy",
            "name": "Added shields Copy Copy",
            "icon": "✦",
            "effect": "+2 maximum shields\n+25% evasion",
            "requires": [
                "overflowingSlam"
            ],
            "requiresMode": "all",
            "column": -6,
            "row": 6,
            "maxRank": 1,
            "stats": {
                "evasionMultiplier": 1.25,
                "maxShields": 2
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "type": "health"
        },
        {
            "id": "singledOff",
            "name": "Singled off",
            "icon": "✦",
            "effect": "Enemies become vulnerable. taking 30% more damage when they are alone.",
            "requires": [
                "volcanicEruption"
            ],
            "requiresMode": "all",
            "column": -5,
            "row": -1,
            "maxRank": 1,
            "stats": {
                "damage": 1
            },
            "size": 1.25,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "type": "accuracy"
        },
        {
            "id": "bleed",
            "name": "Bleed",
            "icon": "🩸",
            "effect": "25% on hit: 10% hit damage/s.\nSingle target. +1s (max 5s).",
            "requires": [
                "singledOff"
            ],
            "requiresMode": "all",
            "column": -6,
            "row": -2,
            "maxRank": 1,
            "stats": {
                "bleedChance": 0.25
            },
            "size": 1.25,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "type": "damage"
        },
        {
            "id": "bleed_copy",
            "name": "Bleed Copy",
            "icon": "🩸",
            "effect": "25% on hit: 10% hit damage/s.\nSingle target. +1s (max 5s).",
            "requires": [
                "singledOff"
            ],
            "requiresMode": "all",
            "column": -6,
            "row": 0,
            "maxRank": 1,
            "stats": {
                "bleedChance": 0.25
            },
            "size": 1.25,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "type": "health",
            "abilityTargeting": null
        },
        {
            "id": "bleed_copy_copy",
            "name": "Bleed Copy Copy",
            "icon": "🩸",
            "effect": "+100% bleed damage",
            "requires": [
                "singledOff"
            ],
            "requiresMode": "all",
            "column": -5,
            "row": 0,
            "maxRank": 1,
            "stats": {
                "bleedDamageMultiplier": 2
            },
            "size": 1.25,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "type": "health",
            "abilityTargeting": null
        }
    ],
    "statSchemaVersion": 2,
    "furySchemaVersion": 1,
    "eruptionChainSchemaVersion": 1,
    "shieldSchemaVersion": 1,
    "righteousFireSchemaVersion": 1,
    "shieldExpansionSchemaVersion": 1,
    "bleedSchemaVersion": 1
};
