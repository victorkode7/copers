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
            "effect": "+1 physical damage",
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
            "id": "thickHide",
            "name": "Thick Hide",
            "icon": "⬟",
            "effect": "+25 evasion",
            "requires": [
                "healthNode2"
            ],
            "column": 1,
            "row": 6,
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
            "column": 1,
            "row": 7,
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
            "effect": "+5% maximum health",
            "type": "health",
            "stats": {
                "healthMultiplier": 1.05
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
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "damageNode",
            "name": "Damage",
            "icon": "⚔",
            "effect": "+2 physical damage",
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
            "effect": "+5% physical damage",
            "type": "damage",
            "stats": {
                "damageMultiplier": 1.05
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
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
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
                "healthNode3",
                "evasiveVitality"
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
            "column": 14,
            "row": 3,
            "maxRank": 1,
            "requires": [
                "accuracyNode6"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false
        },
        {
            "id": "accuracyBoost",
            "name": "LESS.. NO MORE!",
            "icon": "⚡",
            "effect": "+10% accuracy",
            "type": "accuracy",
            "stats": {
                "accuracyMultiplier": 1.1
            },
            "size": 1,
            "column": 15,
            "row": 2,
            "maxRank": 1,
            "requires": [
                "bigAttackSpeed_1"
            ],
            "requiresMode": "any",
            "start": false,
            "sprite": "",
            "customDescription": false,
            "abilityTargeting": null
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
            "id": "multiHit2",
            "name": "Multi hitterrrr",
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
                "healthNode9"
            ],
            "requiresMode": "all",
            "column": 16,
            "row": 3,
            "maxRank": 1,
            "stats": {
                "poisonTickRateMultiplier": 1.1
            },
            "size": 1.5,
            "start": false,
            "sprite": "assets/skills/poisonExecute-9a38ed77.png",
            "type": "attackSpeed",
            "customDescription": true,
            "abilityTargeting": null
        },
        {
            "id": "bloomingFlower",
            "name": "Blooming flower",
            "icon": "✦",
            "effect": "On death, enemies transfer all remaining poison stacks to a random living enemy, preserving their remaining duration.",
            "requires": [
                "accuracyBoost"
            ],
            "requiresMode": "all",
            "column": 16,
            "row": 2,
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
                "arrowSpeed2"
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
            "effect": "+5% physical damage",
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
            "effect": "+5% physical damage",
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
                "multiHit2"
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
            "effect": "+3 physical damage\n+5% attack speed",
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
            "id": "arrowSpeed2",
            "name": "Attack Speed",
            "icon": "⚡",
            "effect": "+3 physical damage\n+5% attack speed",
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
            "effect": "+15% accuracy\n+15% evasion",
            "type": "accuracy",
            "stats": {
                "accuracyMultiplier": 1.15,
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
            "customDescription": false,
            "abilityTargeting": null
        },
        {
            "id": "damageNode5",
            "name": "Damage",
            "icon": "⚔",
            "effect": "+3 physical damage",
            "type": "damage",
            "stats": {
                "damage": 3
            },
            "size": 1,
            "column": 11,
            "row": 1,
            "maxRank": 1,
            "requires": [
                "basicallySnake",
                "attackSpeedNode10"
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
            "effect": "+15% physical damage",
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
            "effect": "+5% attack speed",
            "type": "attackSpeed",
            "stats": {
                "attackSpeedMultiplier": 1.05
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
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "attackSpeedNode6",
            "name": "Attack Speed",
            "icon": "⚡",
            "effect": "+10% attack speed",
            "type": "attackSpeed",
            "stats": {
                "attackSpeedMultiplier": 1.1
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
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
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
                "accuracyNode14"
            ],
            "requiresMode": "all",
            "column": 0,
            "row": -6,
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
            "column": 0,
            "row": -7,
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
                "heavyBlows"
            ],
            "requiresMode": "all",
            "column": -2,
            "row": 6,
            "maxRank": 1,
            "stats": {
                "maxFury": 10
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "type": "health",
            "abilityTargeting": null
        },
        {
            "id": "eruptionChain2",
            "name": "Eruption chain",
            "icon": "✦",
            "effect": "+1 maximum eruption chains",
            "requires": [
                "eruptionChain"
            ],
            "requiresMode": "all",
            "column": 0,
            "row": -8,
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
            "id": "eruptionChain3",
            "name": "Eruption chain",
            "icon": "✦",
            "effect": "+1 maximum eruption chains",
            "requires": [
                "eruptionChain"
            ],
            "requiresMode": "all",
            "column": 1,
            "row": -7,
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
            "id": "flatHealthRegen",
            "name": "Health Regeneration",
            "icon": "♥",
            "effect": "+10 flat health regeneration per second",
            "type": "health",
            "stats": {
                "healthRegen": 10
            },
            "size": 1,
            "column": -4,
            "row": 3,
            "maxRank": 1,
            "requires": [
                "righteousFire"
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
                "healthNode7"
            ],
            "requiresMode": "all",
            "column": -3,
            "row": 3,
            "maxRank": 1,
            "stats": {},
            "size": 1.5,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "abilityTargeting": "aoe"
        },
        {
            "id": "maxHealthRegen",
            "name": "Maximum Health Regeneration",
            "icon": "♥",
            "effect": "+10% maximum health regenerated per second",
            "type": "health",
            "stats": {
                "healthRegenPercent": 0.1
            },
            "size": 1,
            "column": -4,
            "row": 2,
            "maxRank": 1,
            "requires": [
                "flatHealthRegen"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "shieldGenerator",
            "name": "Shield generator",
            "icon": "✦",
            "effect": "Kills give the player a shield that protects the player from one hit",
            "requires": [
                "shieldSlam",
                "heavyBlows"
            ],
            "requiresMode": "all",
            "column": -4,
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
            "column": -6,
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
            "effect": "+2 maximum shields\n+5 physical damage",
            "requires": [
                "shieldSlam"
            ],
            "requiresMode": "all",
            "column": -7,
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
                "addedShields2"
            ],
            "requiresMode": "all",
            "column": -8,
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
            "column": -8,
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
            "id": "addedShields2",
            "name": "Added shields",
            "icon": "✦",
            "effect": "+2 maximum shields\n+5 physical damage",
            "requires": [
                "shieldSlam"
            ],
            "requiresMode": "all",
            "column": -7,
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
            "effect": "+10% physical damage",
            "type": "damage",
            "stats": {
                "damageMultiplier": 1.1
            },
            "maxRank": 1,
            "start": false,
            "requires": [
                "damageNode9"
            ],
            "requiresMode": "all",
            "customDescription": false,
            "column": -1,
            "row": -1,
            "sprite": "",
            "size": 1
        },
        {
            "id": "reinforcedVitality",
            "name": "Reinforced Vitality",
            "icon": "✦",
            "effect": "+5 maximum health\n+25% maximum health",
            "requires": [
                "resonantGuard"
            ],
            "requiresMode": "all",
            "column": -9,
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
            "id": "evasiveBulwark",
            "name": "Evasive Bulwark",
            "icon": "✦",
            "effect": "+2 maximum shields\n+25% evasion",
            "requires": [
                "overflowingSlam",
                "deepWounds"
            ],
            "requiresMode": "all",
            "column": -9,
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
            "effect": "The last living enemy takes 30% more damage.",
            "requires": [
                "accuracyNode12"
            ],
            "requiresMode": "all",
            "column": -8,
            "row": 0,
            "maxRank": 1,
            "stats": {},
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
            "effect": "10% on hit: 10% hit damage/s.\nSingle target. +1s (max 5s).",
            "requires": [
                "bleedChance2",
                "bleedDamage"
            ],
            "requiresMode": "all",
            "column": -8,
            "row": -2,
            "maxRank": 1,
            "stats": {
                "bleedChance": 0.1
            },
            "size": 1.25,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "type": "damage",
            "abilityTargeting": null
        },
        {
            "id": "bleedDamage",
            "name": "Bleed Damage",
            "icon": "🩸",
            "effect": "+100% bleed damage",
            "requires": [
                "quickBleeding"
            ],
            "requiresMode": "all",
            "column": -7,
            "row": -3,
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
        },
        {
            "id": "maxHealthRegen3",
            "name": "Maximum Health Regeneration",
            "icon": "♥",
            "effect": "+10% maximum health regenerated per second",
            "type": "health",
            "stats": {
                "healthRegenPercent": 0.1
            },
            "size": 1,
            "column": -4,
            "row": 4,
            "maxRank": 1,
            "requires": [
                "flatHealthRegen"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "untouchable2",
            "name": "Untouchable",
            "icon": "◈",
            "effect": "+25% evasion",
            "requires": [
                "thickHide"
            ],
            "column": 2,
            "row": 7,
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
            "id": "evasiveVitality",
            "name": "Untouchable",
            "icon": "◈",
            "effect": "+10% maximum health\n+25% evasion",
            "requires": [
                "untouchable",
                "untouchable2"
            ],
            "column": 2,
            "row": 8,
            "maxRank": 1,
            "stats": {
                "evasionMultiplier": 1.25,
                "healthMultiplier": 1.1
            },
            "size": 1,
            "start": false,
            "requiresMode": "all",
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "greedyPig",
            "name": "Greedy Pig",
            "icon": "✦",
            "effect": "+25% gold gained",
            "requires": [
                "origin"
            ],
            "requiresMode": "all",
            "column": 5,
            "row": 3,
            "maxRank": 1,
            "stats": {
                "goldBonusMultiplier": 1.25
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "deepWounds",
            "name": "Deep Wounds",
            "icon": "🩸",
            "effect": "Bleed: 50% hit damage/s.\nKeeps your 3 strongest stacks.",
            "requires": [
                "healthNode8"
            ],
            "requiresMode": "all",
            "column": -11,
            "row": 4,
            "maxRank": 1,
            "stats": {},
            "size": 1.25,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "type": "damage"
        },
        {
            "id": "healthNode6",
            "name": "Health",
            "icon": "♥",
            "effect": "+5% maximum health",
            "type": "health",
            "stats": {
                "healthMultiplier": 1.05
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
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "healthNode7",
            "name": "Health",
            "icon": "♥",
            "effect": "+10% maximum health\n+25% accuracy",
            "type": "health",
            "stats": {
                "healthMultiplier": 1.1,
                "accuracyMultiplier": 1.25
            },
            "size": 1,
            "column": -1,
            "row": 4,
            "maxRank": 1,
            "requires": [
                "healthNode6",
                "accuracyNode11"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "accuracyNode11",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+10% accuracy",
            "type": "accuracy",
            "stats": {
                "accuracyMultiplier": 1.1
            },
            "size": 1,
            "column": 0,
            "row": 4,
            "maxRank": 1,
            "requires": [
                "healthNode2"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "heavyBlows",
            "name": "Heavy Blows",
            "icon": "✦",
            "effect": "+10 physical damage",
            "requires": [
                "evasiveVitality",
                "healthNode7"
            ],
            "requiresMode": "all",
            "column": -1,
            "row": 7,
            "maxRank": 1,
            "stats": {
                "damage": 10
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "type": "accuracy",
            "abilityTargeting": null
        },
        {
            "id": "maxFury2",
            "name": "Fury",
            "icon": "✦",
            "effect": "+10 maximum fury",
            "requires": [
                "heavyBlows"
            ],
            "requiresMode": "all",
            "column": -2,
            "row": 8,
            "maxRank": 1,
            "stats": {
                "maxFury": 10
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "type": "health",
            "abilityTargeting": null
        },
        {
            "id": "bleedChance2",
            "name": "Bleed Chance",
            "icon": "🩸",
            "effect": "+10% bleed chance",
            "requires": [
                "quickBleeding"
            ],
            "requiresMode": "all",
            "column": -7,
            "row": -1,
            "maxRank": 1,
            "stats": {
                "bleedChance": 0.1
            },
            "size": 1.25,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "type": "health",
            "abilityTargeting": null
        },
        {
            "id": "quickBleeding",
            "name": "Quick Bleeding",
            "icon": "🩸",
            "effect": "+10% attack speed\n+10% bleed chance",
            "requires": [],
            "requiresMode": "all",
            "column": -6,
            "row": -2,
            "maxRank": 1,
            "stats": {
                "bleedChance": 0.1,
                "attackSpeedMultiplier": 1.1
            },
            "size": 1.25,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "type": "health",
            "abilityTargeting": null
        },
        {
            "id": "bleederer",
            "name": "Bleederer",
            "icon": "✦",
            "effect": "Successful Bleed rolls add 2 stacks.\nStill requires Bleed chance.",
            "requires": [],
            "requiresMode": "all",
            "column": -8,
            "row": 2,
            "maxRank": 1,
            "stats": {},
            "size": 1.25,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "type": "health",
            "abilityTargeting": null
        },
        {
            "id": "attackSpeedNode7",
            "name": "Attack Speed",
            "icon": "⚡",
            "effect": "+10% attack speed",
            "type": "attackSpeed",
            "stats": {
                "attackSpeedMultiplier": 1.1
            },
            "size": 1,
            "column": -7,
            "row": 2,
            "maxRank": 1,
            "requires": [
                "bleederer",
                "maxHealthRegen4"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "accuracyNode12",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+15 accuracy",
            "type": "accuracy",
            "stats": {
                "accuracy": 15
            },
            "size": 1,
            "column": -7,
            "row": 0,
            "maxRank": 1,
            "requires": [
                "maxHealthRegen4"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "attackSpeedNode8",
            "name": "Attack Speed",
            "icon": "⚡",
            "effect": "+15% attack speed",
            "type": "attackSpeed",
            "stats": {
                "attackSpeedMultiplier": 1.15
            },
            "size": 1,
            "column": -2,
            "row": 0,
            "maxRank": 1,
            "requires": [
                "damageNode7"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "maxHealthRegen4",
            "name": "Maximum Health Regeneration",
            "icon": "♥",
            "effect": "+2% maximum health regenerated per second",
            "type": "health",
            "stats": {
                "healthRegenPercent": 0.02
            },
            "size": 1,
            "column": -5,
            "row": 1,
            "maxRank": 1,
            "requires": [
                "attackSpeedNode8"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "damageNode8",
            "name": "Damage",
            "icon": "⚔",
            "effect": "+10% physical damage",
            "type": "damage",
            "stats": {
                "damageMultiplier": 1.1
            },
            "size": 1,
            "column": -2,
            "row": -2,
            "maxRank": 1,
            "requires": [
                "damageNode7"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "accuracyNode14",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+20 accuracy",
            "type": "accuracy",
            "stats": {
                "accuracy": 20
            },
            "size": 1,
            "column": 0,
            "row": -4,
            "maxRank": 1,
            "requires": [
                "health"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "healthNode8",
            "name": "Health",
            "icon": "♥",
            "effect": "+10 maximum health",
            "type": "health",
            "stats": {
                "health": 10
            },
            "size": 1,
            "column": -11,
            "row": 1,
            "maxRank": 1,
            "requires": [
                "bleederer",
                "singledOff"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false
        },
        {
            "id": "greedierPig",
            "name": "Greedier pig",
            "icon": "✦",
            "effect": "+50% gold gained",
            "requires": [
                "greedyPig"
            ],
            "requiresMode": "all",
            "column": 6,
            "row": 4,
            "maxRank": 1,
            "stats": {
                "goldBonusMultiplier": 1.5
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "soGreedy",
            "name": "So greedy!",
            "icon": "✦",
            "effect": "+100% gold gained",
            "requires": [
                "greedierPig"
            ],
            "requiresMode": "all",
            "column": 7,
            "row": 5,
            "maxRank": 1,
            "stats": {
                "goldBonusMultiplier": 2
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "thickHide2",
            "name": "Thick Hide",
            "icon": "⬟",
            "effect": "+25 evasion",
            "requires": [
                "damageNode8",
                "quickBleeding",
                "accuracyNode14"
            ],
            "column": -4,
            "row": -2,
            "maxRank": 1,
            "stats": {
                "evasion": 25
            },
            "size": 1,
            "start": false,
            "requiresMode": "all",
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "damageNode9",
            "name": "Damage Path Node",
            "icon": "⚔",
            "effect": "+5% physical damage",
            "type": "damage",
            "stats": {
                "damageMultiplier": 1.05
            },
            "maxRank": 1,
            "start": false,
            "requires": [
                "damageNode2"
            ],
            "requiresMode": "all",
            "customDescription": false,
            "column": 0,
            "row": 0,
            "sprite": "",
            "size": 1,
            "abilityTargeting": null
        },
        {
            "id": "accuracyNode15",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+5 accuracy",
            "type": "accuracy",
            "stats": {
                "accuracy": 5
            },
            "size": 1,
            "column": 5,
            "row": -2,
            "maxRank": 1,
            "requires": [
                "attackSpeedNode2"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false
        },
        {
            "id": "accuracyNode16",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+5 accuracy",
            "type": "accuracy",
            "stats": {
                "accuracy": 5
            },
            "size": 1,
            "column": 5,
            "row": -4,
            "maxRank": 1,
            "requires": [
                "accuracyNode15"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false
        },
        {
            "id": "baseMana1",
            "name": "Mana Reserve",
            "icon": "✦",
            "effect": "+50 maximum mana",
            "requires": [
                "accuracyNode16"
            ],
            "requiresMode": "all",
            "column": 5,
            "row": -8,
            "maxRank": 1,
            "stats": {
                "mana": 50
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null,
            "type": "mana"
        },
        {
            "id": "baseSpellDamage1",
            "name": "Arcane Power",
            "icon": "✦",
            "effect": "+10 spell damage",
            "requires": [
                "untouchable4"
            ],
            "requiresMode": "all",
            "column": 11,
            "row": -5,
            "maxRank": 1,
            "stats": {
                "spellDamage": 10
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null,
            "type": "mana"
        },
        {
            "id": "multiSpellDamage1",
            "name": "Spell Amplification",
            "icon": "✦",
            "effect": "+50% spell damage",
            "requires": [
                "baseSpellDamage1"
            ],
            "requiresMode": "all",
            "column": 12,
            "row": -5,
            "maxRank": 1,
            "stats": {
                "spellDamageMultiplier": 1.5
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null,
            "type": "mana"
        },
        {
            "id": "voidBolt",
            "name": "Void Bolt",
            "icon": "◈",
            "effect": "On attack: 100% spell damage to your target, affected by multihit.\nGain 1 Void Charge per hit. Costs 5 mana per cast.",
            "requires": [
                "expandedReserves"
            ],
            "requiresMode": "all",
            "column": 8,
            "row": -10,
            "maxRank": 1,
            "stats": {},
            "size": 1.5,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "abilityTargeting": "singleTarget",
            "type": "mana"
        },
        {
            "id": "voidVolley",
            "name": "Void Volley",
            "icon": "✺",
            "effect": "At 5 Void Charges, consume them to fire 10 missiles at random enemies.\nEach deals 100% spell damage. Costs 10 mana per volley.",
            "requires": [
                "expandedReserves3"
            ],
            "requiresMode": "all",
            "column": 6,
            "row": -12,
            "maxRank": 1,
            "stats": {},
            "size": 1,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "abilityTargeting": "aoe",
            "type": "mana"
        },
        {
            "id": "baseManaRegen",
            "name": "Mana Regeneration",
            "icon": "✦",
            "effect": "+10 flat mana regeneration per second",
            "requires": [
                "baseMana1"
            ],
            "requiresMode": "all",
            "column": 4,
            "row": -8,
            "maxRank": 1,
            "stats": {
                "manaRegen": 10
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null,
            "type": "mana"
        },
        {
            "id": "multiManaRegen",
            "name": "Flowing Mana",
            "icon": "✦",
            "effect": "+25% increased mana regeneration",
            "requires": [
                "baseManaRegen"
            ],
            "requiresMode": "all",
            "column": 3,
            "row": -7,
            "maxRank": 1,
            "stats": {
                "manaRegenIncrease": 0.25
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null,
            "type": "mana"
        },
        {
            "id": "multMana1",
            "name": "Expanded Reserves",
            "icon": "✦",
            "effect": "+25% maximum mana",
            "requires": [
                "maxManaRegen",
                "multiManaRegen"
            ],
            "requiresMode": "all",
            "column": 2,
            "row": -8,
            "maxRank": 1,
            "stats": {
                "manaMultiplier": 1.25
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null,
            "type": "mana"
        },
        {
            "id": "maxManaRegen",
            "name": "Deep Wells",
            "icon": "✦",
            "effect": "+5% maximum mana regenerated per second",
            "requires": [
                "baseManaRegen"
            ],
            "requiresMode": "all",
            "column": 3,
            "row": -9,
            "maxRank": 1,
            "stats": {
                "manaRegenPercent": 0.05
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null,
            "type": "mana"
        },
        {
            "id": "healthNode9",
            "name": "Health",
            "icon": "♥",
            "effect": "+10% maximum health",
            "type": "health",
            "stats": {
                "healthMultiplier": 1.1
            },
            "size": 1,
            "column": 15,
            "row": 3,
            "maxRank": 1,
            "requires": [
                "bigAttackSpeed_1"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "attackSpeedNode10",
            "name": "Attack Speed Path Node",
            "icon": "⚡",
            "effect": "+30% attack speed",
            "type": "attackSpeed",
            "stats": {
                "attackSpeedMultiplier": 1.3
            },
            "maxRank": 1,
            "start": false,
            "requires": [
                "attackSpeedNode2",
                "untouchable6"
            ],
            "requiresMode": "all",
            "customDescription": false,
            "column": 9,
            "row": -2,
            "sprite": "",
            "size": 1,
            "abilityTargeting": null
        },
        {
            "id": "voidVortex",
            "name": "Void Vortex",
            "icon": "◉",
            "effect": "On attack: deal 75% spell damage to your target's row.\nGain 2 Void Charges per target hit. Costs 20 mana per cast.",
            "requires": [
                "expandedReserves4"
            ],
            "requiresMode": "all",
            "column": 10,
            "row": -12,
            "maxRank": 1,
            "stats": {},
            "size": 1.5,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "abilityTargeting": "aoe",
            "type": "mana"
        },
        {
            "id": "echoingVoid",
            "name": "Echoing Void",
            "icon": "◎",
            "effect": "Void Vortex has a 33% chance to trigger twice.\nThe second trigger costs no mana and generates Void Charges on hit.",
            "requires": [
                "voidVortex"
            ],
            "requiresMode": "all",
            "column": 11,
            "row": -12,
            "maxRank": 1,
            "stats": {},
            "size": 1.25,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "abilityTargeting": null,
            "type": "mana"
        },
        {
            "id": "rimeBrand",
            "name": "Rime Brand",
            "icon": "❄",
            "effect": "On attack: brand an enemy with cold, dealing 100% spell damage per second for 10 seconds.\nDoes not stack. Targets another enemy if already branded. Costs 5 mana.",
            "requires": [
                "expandedReserves2"
            ],
            "requiresMode": "all",
            "column": 12,
            "row": -8,
            "maxRank": 1,
            "stats": {},
            "size": 1.5,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "abilityTargeting": "singleTarget",
            "type": "mana"
        },
        {
            "id": "glacialRupture",
            "name": "Glacial Rupture",
            "icon": "✧",
            "effect": "Rime Brand adds 1 Rime stack per tick. At 10 stacks, consume them and explode.\nDeal 500% spell damage to adjacent enemies and apply Frozen for 9 seconds (+3s attack interval).",
            "requires": [
                "rimeBrand"
            ],
            "requiresMode": "all",
            "column": 13,
            "row": -8,
            "maxRank": 1,
            "stats": {},
            "size": 1.25,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "abilityTargeting": "aoe",
            "type": "mana"
        },
        {
            "id": "gatheringPower",
            "name": "Gathering Power",
            "icon": "✦",
            "effect": "In combat, gain 1 stack each second: +2% damage per stack, with no stack limit.\nAll stacks expire after 2 seconds out of combat, on death, or when changing maps.",
            "requires": [
                "multMana1"
            ],
            "requiresMode": "all",
            "column": 2,
            "row": -10,
            "maxRank": 1,
            "stats": {},
            "size": 1.5,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "abilityTargeting": null,
            "type": "mana"
        },
        {
            "id": "emberBrand",
            "name": "Ember Brand",
            "icon": "♨",
            "effect": "On attack: brand an enemy with fire, dealing 100% spell damage per second for 10 seconds.\nDoes not stack. Targets another enemy if already branded. Costs 5 mana.",
            "requires": [
                "expandedReserves2"
            ],
            "requiresMode": "all",
            "column": 11,
            "row": -7,
            "maxRank": 1,
            "stats": {},
            "size": 1.5,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "abilityTargeting": "singleTarget",
            "type": "mana"
        },
        {
            "id": "cinderRupture",
            "name": "Cinder Rupture",
            "icon": "✹",
            "effect": "Ember Brand adds 1 Cinder stack per tick. At 10 stacks, consume them and explode.\nDeal 500% spell damage to adjacent enemies and apply Scorched: +20% fire ability damage taken until death; does not stack.",
            "requires": [
                "emberBrand"
            ],
            "requiresMode": "all",
            "column": 12,
            "row": -6,
            "maxRank": 1,
            "stats": {},
            "size": 1.25,
            "start": false,
            "customDescription": true,
            "sprite": "",
            "abilityTargeting": "aoe",
            "type": "mana"
        },
        {
            "id": "expandedReserves",
            "name": "Expanded Reserves",
            "icon": "✦",
            "effect": "+25 maximum mana",
            "requires": [
                "baseMana1"
            ],
            "requiresMode": "all",
            "column": 8,
            "row": -8,
            "maxRank": 1,
            "stats": {
                "mana": 25
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null,
            "type": "mana"
        },
        {
            "id": "untouchable3",
            "name": "Untouchable",
            "icon": "◈",
            "effect": "+10% maximum health\n+25% evasion",
            "requires": [
                "expandedReserves"
            ],
            "column": 8,
            "row": -6,
            "maxRank": 1,
            "stats": {
                "evasionMultiplier": 1.25,
                "healthMultiplier": 1.1
            },
            "size": 1,
            "start": false,
            "requiresMode": "all",
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "untouchable4",
            "name": "Untouchable",
            "icon": "◈",
            "effect": "+10% maximum health\n+25% evasion",
            "requires": [
                "untouchable3"
            ],
            "column": 9,
            "row": -5,
            "maxRank": 1,
            "stats": {
                "evasionMultiplier": 1.25,
                "healthMultiplier": 1.1
            },
            "size": 1,
            "start": false,
            "requiresMode": "all",
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "untouchable5",
            "name": "Untouchable",
            "icon": "◈",
            "effect": "+10% maximum health\n+25% evasion",
            "requires": [
                "untouchable3",
                "accuracyNode16"
            ],
            "column": 7,
            "row": -5,
            "maxRank": 1,
            "stats": {
                "evasionMultiplier": 1.25,
                "healthMultiplier": 1.1
            },
            "size": 1,
            "start": false,
            "requiresMode": "all",
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "expandedReserves2",
            "name": "Expanded Reserves",
            "icon": "✦",
            "effect": "+25 maximum mana",
            "requires": [
                "expandedReserves"
            ],
            "requiresMode": "all",
            "column": 10,
            "row": -8,
            "maxRank": 1,
            "stats": {
                "mana": 25
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null,
            "type": "mana"
        },
        {
            "id": "untouchable6",
            "name": "Untouchable",
            "icon": "◈",
            "effect": "+10% maximum health\n+25% evasion",
            "requires": [
                "untouchable4",
                "untouchable5"
            ],
            "column": 8,
            "row": -4,
            "maxRank": 1,
            "stats": {
                "evasionMultiplier": 1.25,
                "healthMultiplier": 1.1
            },
            "size": 1,
            "start": false,
            "requiresMode": "all",
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "health",
            "name": "Health",
            "icon": "♥",
            "effect": "+5% maximum health",
            "type": "health",
            "stats": {
                "healthMultiplier": 1.05
            },
            "size": 1,
            "column": 0,
            "row": -2,
            "maxRank": 1,
            "requires": [
                "damageNode7"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "accuracy",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+20 accuracy",
            "type": "accuracy",
            "stats": {
                "accuracy": 20
            },
            "size": 1,
            "column": 2,
            "row": -5,
            "maxRank": 1,
            "requires": [
                "accuracyNode14",
                "accuracy3"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "accuracy2",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+25% spell damage\n+30% accuracy",
            "type": "accuracy",
            "stats": {
                "spellDamageMultiplier": 1.25,
                "accuracyMultiplier": 1.3
            },
            "size": 1,
            "column": 2,
            "row": -3,
            "maxRank": 1,
            "requires": [
                "accuracyNode14",
                "accuracy4"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "accuracy3",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+25% physical damage\n+30% accuracy",
            "type": "accuracy",
            "stats": {
                "accuracyMultiplier": 1.3,
                "damageMultiplier": 1.25
            },
            "size": 1,
            "column": 3,
            "row": -5,
            "maxRank": 1,
            "requires": [
                "accuracyNode16"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "accuracy4",
            "name": "Accuracy",
            "icon": "◎",
            "effect": "+20 accuracy",
            "type": "accuracy",
            "stats": {
                "accuracy": 20
            },
            "size": 1,
            "column": 3,
            "row": -3,
            "maxRank": 1,
            "requires": [
                "accuracyNode16"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "untouchable7",
            "name": "Untouchable",
            "icon": "◈",
            "effect": "+10% maximum health\n+25% evasion",
            "requires": [
                "bleed",
                "healthNode8"
            ],
            "column": -11,
            "row": -2,
            "maxRank": 1,
            "stats": {
                "evasionMultiplier": 1.25,
                "healthMultiplier": 1.1
            },
            "size": 1,
            "start": false,
            "requiresMode": "all",
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "expandedReserves3",
            "name": "Expanded Reserves+",
            "icon": "✦",
            "effect": "+25 maximum mana\n+10 spell damage",
            "requires": [
                "voidBolt"
            ],
            "requiresMode": "all",
            "column": 7,
            "row": -11,
            "maxRank": 1,
            "stats": {
                "mana": 25,
                "spellDamage": 10
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null,
            "type": "mana"
        },
        {
            "id": "expandedReserves4",
            "name": "Expanded Reserves+",
            "icon": "✦",
            "effect": "+25 maximum mana\n+10 spell damage",
            "requires": [
                "voidBolt"
            ],
            "requiresMode": "all",
            "column": 9,
            "row": -11,
            "maxRank": 1,
            "stats": {
                "mana": 25,
                "spellDamage": 10
            },
            "size": 1,
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null,
            "type": "mana"
        },
        {
            "id": "healthRegeneration2",
            "name": "Health Regeneration",
            "icon": "♥",
            "effect": "+5 flat health regeneration per second",
            "type": "health",
            "stats": {
                "healthRegen": 5
            },
            "size": 1,
            "column": 2,
            "row": 10,
            "maxRank": 1,
            "requires": [
                "evasiveVitality"
            ],
            "requiresMode": "all",
            "start": false,
            "customDescription": false,
            "sprite": "",
            "abilityTargeting": null
        },
        {
            "id": "health2",
            "name": "Health",
            "icon": "♥",
            "effect": "+50 maximum health",
            "type": "health",
            "stats": {
                "health": 50
            },
            "column": 2,
            "row": 11,
            "requires": [
                "healthRegeneration2"
            ],
            "requiresMode": "all",
            "start": false,
            "maxRank": 1,
            "customDescription": false,
            "sprite": "",
            "size": 1.25,
            "abilityTargeting": null
        }
    ],
    "statSchemaVersion": 2,
    "furySchemaVersion": 1,
    "eruptionChainSchemaVersion": 1,
    "shieldSchemaVersion": 1,
    "righteousFireSchemaVersion": 1,
    "shieldExpansionSchemaVersion": 1,
    "bleedSchemaVersion": 1,
    "deepWoundsSchemaVersion": 1,
    "nodeIdSchemaVersion": 1,
    "removedNodes": [
        {
            "id": "bleedChance3",
            "name": "Bleed Chance",
            "reason": "Removed in skill tree editor"
        },
        {
            "id": "bleedChance4",
            "name": "Bleed Chance",
            "reason": "Removed in skill tree editor"
        },
        {
            "id": "damageNode10",
            "name": "Damage",
            "reason": "Removed in skill tree editor"
        },
        {
            "id": "mana2",
            "name": "Mana",
            "reason": "Removed in skill tree editor"
        },
        {
            "id": "spellDamage2",
            "name": "spell damage",
            "reason": "Removed in skill tree editor"
        },
        {
            "id": "skillNode5",
            "name": "New Skill",
            "reason": "Removed in skill tree editor"
        },
        {
            "id": "skillNode11",
            "name": "New Skill",
            "reason": "Removed in skill tree editor"
        },
        {
            "id": "damageBoost",
            "name": "EVEN MORE SUPER SPEED",
            "reason": "Removed in skill tree editor"
        },
        {
            "id": "spellAmplification",
            "name": "Spell Amplification",
            "reason": "Removed in skill tree editor"
        },
        {
            "id": "arcanePower",
            "name": "Arcane Power",
            "reason": "Removed in skill tree editor"
        },
        {
            "id": "accuracyNode13",
            "name": "Accuracy",
            "reason": "Removed in skill tree editor"
        },
        {
            "id": "healthRegeneration",
            "name": "Health Regeneration",
            "reason": "Removed in skill tree editor"
        },
        {
            "id": "skillNode12",
            "name": "New Skill",
            "reason": "Removed in skill tree editor"
        },
        {
            "id": "spellAmplification2",
            "name": "Spell Amplification",
            "reason": "Removed in skill tree editor"
        },
        {
            "id": "maxHealthRegen2",
            "name": "Maximum Health Regeneration",
            "reason": "Removed in skill tree editor"
        }
    ],
    "nodeIdAliases": {
        "skillNode": "baseMana1",
        "m": "baseMana1",
        "ma": "baseMana1",
        "man": "baseMana1",
        "mana": "baseMana1",
        "skillNode2": "baseSpellDamage1",
        "s": "baseSpellDamage1",
        "sp": "baseSpellDamage1",
        "spe": "baseSpellDamage1",
        "spel": "baseSpellDamage1",
        "spell": "baseSpellDamage1",
        "spellD": "baseSpellDamage1",
        "spellDa": "baseSpellDamage1",
        "spellDam": "baseSpellDamage1",
        "spellDama": "baseSpellDamage1",
        "spellDamag": "baseSpellDamage1",
        "spellDamage": "baseSpellDamage1",
        "bspellDamage": "baseSpellDamage1",
        "baspellDamage": "baseSpellDamage1",
        "basspellDamage": "baseSpellDamage1",
        "basespellDamage": "baseSpellDamage1",
        "b": "baseSpellDamage1",
        "ba": "baseSpellDamage1",
        "bas": "baseSpellDamage1",
        "base": "baseSpellDamage1",
        "baseSope": "baseSpellDamage1",
        "baseSop": "baseSpellDamage1",
        "baseSo": "baseSpellDamage1",
        "baseS": "baseSpellDamage1",
        "baseSp": "baseSpellDamage1",
        "baseSpe": "baseSpellDamage1",
        "baseSpel": "baseSpellDamage1",
        "baseSpell": "baseSpellDamage1",
        "baseSpellD": "baseSpellDamage1",
        "baseSpellDa": "baseSpellDamage1",
        "baseSpellDamaga": "baseSpellDamage1",
        "baseSpellDam": "baseSpellDamage1",
        "baseSpellDama": "baseSpellDamage1",
        "baseSpellDamag": "baseSpellDamage1",
        "baseSpellDamage": "baseSpellDamage1",
        "skillNode3": "multiSpellDamage1",
        "spellDamageM": "multiSpellDamage1",
        "spellDamageMu": "multiSpellDamage1",
        "spellDamageMul": "multiSpellDamage1",
        "spellDamageMult": "multiSpellDamage1",
        "spellDamageMulti": "multiSpellDamage1",
        "spellDamageMulti1": "multiSpellDamage1",
        "mu": "multiSpellDamage1",
        "mul": "multiSpellDamage1",
        "mult": "multiSpellDamage1",
        "multi": "multiSpellDamage1",
        "multiS": "multiSpellDamage1",
        "multiSp": "multiSpellDamage1",
        "multiSpe": "multiSpellDamage1",
        "multiSpel": "multiSpellDamage1",
        "multiSpell": "multiSpellDamage1",
        "multiSpellD": "multiSpellDamage1",
        "multiSpellDa": "multiSpellDamage1",
        "multiSpellDam": "multiSpellDamage1",
        "multiSpellDama": "multiSpellDamage1",
        "multiSpellDamag": "multiSpellDamage1",
        "multiSpellDamage": "multiSpellDamage1",
        "skillNode6": "saltWaterBolt",
        "sa": "saltWaterBolt",
        "sal": "saltWaterBolt",
        "salt": "saltWaterBolt",
        "saltW": "saltWaterBolt",
        "saltWa": "saltWaterBolt",
        "saltWat": "saltWaterBolt",
        "saltWate": "saltWaterBolt",
        "saltWater": "saltWaterBolt",
        "saltWaterB": "saltWaterBolt",
        "saltWaterBo": "saltWaterBolt",
        "saltWaterBol": "saltWaterBolt",
        "skillNode7": "baseManaRegen",
        "baseM": "baseManaRegen",
        "baseMa": "baseManaRegen",
        "baseMan": "baseManaRegen",
        "baseMana": "baseManaRegen",
        "baseManaR": "baseManaRegen",
        "baseManaRe": "baseManaRegen",
        "baseManaReg": "baseManaRegen",
        "baseManaRege": "baseManaRegen",
        "skillNode8": "multiManaRegen",
        "M": "multiManaRegen",
        "Mu": "multiManaRegen",
        "Mul": "multiManaRegen",
        "Mult": "multiManaRegen",
        "Multi": "multiManaRegen",
        "multiM": "multiManaRegen",
        "multiMa": "multiManaRegen",
        "multiMan": "multiManaRegen",
        "multiMana": "multiManaRegen",
        "multiManaR": "multiManaRegen",
        "multiManaRe": "multiManaRegen",
        "multiManaReg": "multiManaRegen",
        "multiManaRege": "multiManaRegen",
        "skillNode9": "multMana1",
        "incr": "multMana1",
        "inc": "multMana1",
        "in": "multMana1",
        "i": "multMana1",
        "I": "multMana1",
        "In": "multMana1",
        "Inc": "multMana1",
        "Incr": "multMana1",
        "Incre": "multMana1",
        "Increa": "multMana1",
        "Increas": "multMana1",
        "Increase": "multMana1",
        "multM": "multMana1",
        "multMa": "multMana1",
        "multMan": "multMana1",
        "mana1": "baseMana1",
        "bmana1": "baseMana1",
        "bamana1": "baseMana1",
        "basmana1": "baseMana1",
        "basemana1": "baseMana1",
        "baseana1": "baseMana1",
        "multMana": "multMana1",
        "skillNode10": "maxManaRegen",
        "max": "maxManaRegen",
        "maxM": "maxManaRegen",
        "maxMa": "maxManaRegen",
        "maxMan": "maxManaRegen",
        "maxMana": "maxManaRegen",
        "maxManaR": "maxManaRegen",
        "maxManaRe": "maxManaRegen",
        "maxManaReg": "maxManaRegen",
        "maxManaRege": "maxManaRegen"
    },
    "spellSchemaVersion": 2
};
