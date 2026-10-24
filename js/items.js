window.adventureItems = {
    "schemaVersion": 2,
    "slots": [
        {
            "id": "weapon",
            "name": "Weapon",
            "icon": "⚔"
        },
        {
            "id": "helmet",
            "name": "Helmet",
            "icon": "⛑"
        },
        {
            "id": "chest",
            "name": "Chest",
            "icon": "⛨"
        },
        {
            "id": "legs",
            "name": "Legs",
            "icon": "▥"
        },
        {
            "id": "boots",
            "name": "Boots",
            "icon": "◒"
        },
        {
            "id": "cape",
            "name": "Cape",
            "icon": "▱"
        },
        {
            "id": "ring",
            "name": "Ring",
            "icon": "◌"
        },
        {
            "id": "necklace",
            "name": "Necklace",
            "icon": "◈"
        }
    ],
    "materials": {
        "hide": "Wolf Fur",
        "fang": "Sharp Fang",
        "gel": "Slime",
        "ore": "Ember Ore",
        "crystal": "Glow Crystal",
        "singedMane": "Spicy snakeskin",
        "pearl": "Sea Pearl",
        "material_0e547cc411cb91fce7c30162": "Tusk",
        "material_1b4e649727a05b3ad2ec7f8a": "Honeycomb",
        "material_630e87734f9c2d4f706637f4": "Shark fin",
        "material_5f1658126246b7b3a5ede35d": "Turtle Shell",
        "material_062b4fbe63e85e9a00f80a92": "Carrot",
        "material_84c44258b76b2d4efca9f050": "Shiny pebble",
        "material_c5b9f767dd84fce3cc950ab7": "Ice shavings",
        "material_b1c43d6c0bc463c355442072": "Wheel",
        "material_09adb7d7fc1d647bac41b75d": "Ice cream",
        "material_9dcedc16887f1776d1611c8d": "Snowflake",
        "material_985927188da978e5f7fa3e5c": "Prismatic crystal",
        "material_b6b0c78bdb1d374fbf5b4a1c": "Eye"
    },
    "items": [
        {
            "id": "testItem1",
            "name": "TestItem1",
            "slot": "weapon",
            "description": "Just a test item to check if this shit works",
            "rarity": "epic",
            "sprite": "assets/items/testItem1-37bb6b11.png",
            "stats": {
                "health": 50,
                "damage": 5
            },
            "recipe": {
                "materials": {
                    "gel": 10,
                    "hide": 10
                }
            }
        },
        {
            "id": "emberforgedBlade",
            "name": "Emberforged Blade",
            "slot": "weapon",
            "description": "Forged from cavern finds.",
            "rarity": "rare",
            "sprite": "assets/items/emberforgedBlade-50944b24.png",
            "stats": {
                "damage": 10,
                "attackSpeedMultiplier": 1.1
            },
            "recipe": {
                "materials": {
                    "ore": 14,
                    "crystal": 4
                }
            }
        },
        {
            "id": "wolfFangHelm",
            "name": "Wolf Helmet",
            "slot": "helmet",
            "description": "A wolf died for your fashion.. How do you feel?",
            "rarity": "common",
            "sprite": "assets/items/Wolf-Fang-Helm-7b1d28ad.png",
            "stats": {
                "evasion": 10
            },
            "recipe": {
                "materials": {
                    "hide": 8
                }
            }
        },
        {
            "id": "slimeboundCoat",
            "name": "John's Coat",
            "slot": "chest",
            "description": "A sturdy coat stitched from Wolf Fur.",
            "rarity": "common",
            "sprite": "assets/items/slimeboundCoat-b5f6ea93.png",
            "stats": {
                "evasion": 10,
                "goldBonus": 0.2
            },
            "recipe": {
                "materials": {
                    "hide": 12
                }
            }
        },
        {
            "id": "woodlandGreaves",
            "name": "Woodland Greaves",
            "slot": "legs",
            "description": "Light leg armor made for moving through the forest.",
            "rarity": "common",
            "sprite": "assets/items/woodlandGreaves-ddaf5be3.png",
            "stats": {
                "evasion": 5
            },
            "recipe": {
                "materials": {
                    "hide": 10
                }
            }
        },
        {
            "id": "blobhopperBoots",
            "name": "Blobhopper Boots",
            "slot": "boots",
            "description": "Springy boots shaped from resilient slime.",
            "rarity": "common",
            "sprite": "assets/items/blobhopperBoots-ed0b213e.png",
            "stats": {
                "evasion": 3,
                "attackSpeedMultiplier": 1.05
            },
            "recipe": {
                "materials": {
                    "gel": 20
                }
            }
        },
        {
            "id": "cinderstepBoots",
            "name": "Cinderstep Boots",
            "slot": "boots",
            "description": "Guaranteed to set your carpet on fire.",
            "rarity": "common",
            "sprite": "assets/items/Cinderstep-Boots-fd3af7bb.png",
            "stats": {
                "evasion": 5,
                "attackSpeedMultiplier": 1.087
            },
            "recipe": {
                "materials": {
                    "singedMane": 50
                }
            }
        },
        {
            "id": "wardensCape",
            "name": "Forest cape",
            "slot": "cape",
            "description": "A bright cape woven with cavern crystals.",
            "rarity": "common",
            "sprite": "assets/items/Forest-cape-de523e7a.png",
            "stats": {
                "evasion": 15,
                "goldBonus": 0.1
            },
            "recipe": {
                "materials": {
                    "hide": 30
                }
            }
        },
        {
            "id": "pearlSignet",
            "name": "Pearl Signet",
            "slot": "ring",
            "description": "A sea-polished ring set with a luminous pearl.",
            "rarity": "common",
            "sprite": "",
            "stats": {
                "damage": 4
            },
            "recipe": {
                "materials": {
                    "pearl": 8,
                    "fang": 6
                }
            }
        },
        {
            "id": "slimyNecklace",
            "name": "Slimy Necklace",
            "slot": "necklace",
            "rarity": "unique",
            "description": "",
            "sprite": "assets/items/Slimy-Necklace-33b2b95e.png",
            "stats": {
                "damage": 3,
                "attackSpeedMultiplier": 1.11
            },
            "recipe": null
        },
        {
            "id": "adminRing",
            "name": "Admin Ring",
            "slot": "ring",
            "rarity": "unique",
            "description": "Developer equipment.",
            "sprite": "",
            "developerOnly": true,
            "stats": {
                "damage": 999999,
                "accuracy": 9999999,
                "evasionMultiplier": 100000.99,
                "minimumAttackInterval": 0.001,
                "minimumEnemyHitChance": 0,
                "attackSpeedMultiplier": 100.99
            },
            "recipe": null
        },
        {
            "id": "voidSword",
            "name": "Voidborne",
            "slot": "weapon",
            "description": "You will go insane just holding it.",
            "rarity": "epic",
            "sprite": "assets/items/voidSword-0b77f697.png",
            "stats": {
                "damage": 20,
                "attackSpeedMultiplier": 1.1,
                "multiHit": 0.25
            },
            "recipe": {
                "materials": {
                    "pearl": 50
                }
            }
        },
        {
            "id": "item_32f8d6243a56da0629cfe58751247a8e",
            "name": "Warden's cape",
            "slot": "cape",
            "rarity": "rare",
            "description": "A cape once worn by a long forgotten warden.",
            "sprite": "assets/items/Warden-s-cape-a21b83ca.png",
            "stats": {
                "healthMultiplier": 1.25,
                "damageMultiplier": 1.1,
                "evasionMultiplier": 1.15
            },
            "recipe": null
        },
        {
            "id": "item_7de91942c4c910a1b4d94c688aad4235",
            "name": "Long spear",
            "slot": "weapon",
            "rarity": "common",
            "description": "Greatest invention since... fire?",
            "sprite": "assets/items/Long-spear-b79182a1.png",
            "stats": {
                "damage": 3,
                "attackSpeedMultiplier": 1.05
            },
            "recipe": {
                "materials": {
                    "fang": 15
                }
            }
        },
        {
            "id": "item_770c1a31a80d92a991e2655fb5a8a2e5",
            "name": "Wolf necklace",
            "slot": "necklace",
            "rarity": "common",
            "description": "Arent you missing a few teeth?",
            "sprite": "assets/items/Wolf-necklace-283fc294.png",
            "stats": {
                "evasionMultiplier": 1.2,
                "evasion": 10
            },
            "recipe": {
                "materials": {
                    "fang": 7,
                    "hide": 1
                }
            }
        },
        {
            "id": "item_b40111dcd0f7ca8b7d155f7e43a3cdc3",
            "name": "Geobreaker",
            "slot": "weapon",
            "rarity": "unique",
            "description": "Great for slaying monsters, even better for tilling your garden. Warranty void if used on soft dirt.",
            "sprite": "assets/items/Geobreaker-70b1ec4b.png",
            "stats": {
                "damage": 15,
                "attackSpeedMultiplier": 1.1,
                "accuracy": 10
            },
            "recipe": null
        }
    ],
    "materialDetails": {
        "fang": {
            "description": "It served the spider well for biting heroes. Now you can attach it to a stick and bite the spider back! The circle of life is truly beautiful.",
            "sprite": "assets/materials/fang-749dada7.png"
        },
        "gel": {
            "description": "",
            "sprite": "assets/materials/gel-96107919.png"
        },
        "material_0e547cc411cb91fce7c30162": {
            "description": "Originally used for impaling adventuring parties and clearing stubborn acorns from between molars. Needs a good wash before crafting",
            "sprite": "assets/materials/material_0e547cc411cb91fce7c30162-325c8098.png"
        },
        "hide": {
            "description": "Thick, bristled pelt stripped from a forest predator",
            "sprite": "assets/materials/hide-d8305144.png"
        },
        "singedMane": {
            "description": "",
            "sprite": "assets/materials/singedMane-aa007467.png"
        },
        "material_1b4e649727a05b3ad2ec7f8a": {
            "description": "Worth every mile of running for your life.",
            "sprite": "assets/materials/material_1b4e649727a05b3ad2ec7f8a-d2336d06.png"
        },
        "crystal": {
            "description": "",
            "sprite": "assets/materials/crystal-35b35dec.png"
        },
        "material_630e87734f9c2d4f706637f4": {
            "description": "",
            "sprite": "assets/materials/material_630e87734f9c2d4f706637f4-fc77876d.png"
        },
        "material_5f1658126246b7b3a5ede35d": {
            "description": "",
            "sprite": "assets/materials/material_5f1658126246b7b3a5ede35d-091337b8.png"
        },
        "material_062b4fbe63e85e9a00f80a92": {
            "description": "How'd this get here?",
            "sprite": "assets/materials/material_062b4fbe63e85e9a00f80a92-2154a9ea.png"
        },
        "material_84c44258b76b2d4efca9f050": {
            "description": "The penguin really valued this? Well it's mine now!",
            "sprite": "assets/materials/material_84c44258b76b2d4efca9f050-14a58fd0.png"
        },
        "material_c5b9f767dd84fce3cc950ab7": {
            "description": "",
            "sprite": "assets/materials/material_c5b9f767dd84fce3cc950ab7-db7aa144.png"
        },
        "material_b1c43d6c0bc463c355442072": {
            "description": "",
            "sprite": "assets/materials/material_b1c43d6c0bc463c355442072-9c60a3a0.png"
        },
        "material_09adb7d7fc1d647bac41b75d": {
            "description": "",
            "sprite": "assets/materials/material_09adb7d7fc1d647bac41b75d-f0625b60.png"
        },
        "material_9dcedc16887f1776d1611c8d": {
            "description": "",
            "sprite": "assets/materials/material_9dcedc16887f1776d1611c8d-12efa985.png"
        },
        "material_985927188da978e5f7fa3e5c": {
            "description": "",
            "sprite": "assets/materials/material_985927188da978e5f7fa3e5c-ea554823.png"
        },
        "material_b6b0c78bdb1d374fbf5b4a1c": {
            "description": "",
            "sprite": "assets/materials/material_b6b0c78bdb1d374fbf5b4a1c-fe7234d3.png"
        }
    }
};
