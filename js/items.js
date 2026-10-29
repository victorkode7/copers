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
                    "material_0e547cc411cb91fce7c30162": 100,
                    "material_1b4e649727a05b3ad2ec7f8a": 50
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
                "evasion": 10,
                "health": 15,
                "damageMultiplier": 1.05
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
                "goldBonus": 0.2,
                "health": 25
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
                "evasion": 10,
                "health": 20
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
                "evasion": 10,
                "attackSpeedMultiplier": 1.05,
                "health": 10
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
                "evasion": 15,
                "attackSpeedMultiplier": 1.087,
                "health": 25
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
            "description": "The ring to rule them all!\nDeveloper equipment.",
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
                    "fang": 150,
                    "singedMane": 100
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
                "damage": 21,
                "attackSpeedMultiplier": 1.21,
                "accuracy": 21
            },
            "recipe": null
        },
        {
            "id": "item_8277f5eaf415ffef74d60716b2586e0a",
            "name": "Eye sceptre",
            "slot": "weapon",
            "rarity": "epic",
            "description": "",
            "sprite": "assets/items/Eye-sceptre-f423cca6.png",
            "stats": {
                "poisonChance": 0.1,
                "poisonDamage": 2,
                "poisonDamageMultiplier": 2,
                "attackSpeedMultiplier": 1.25
            },
            "recipe": {
                "materials": {
                    "material_b6b0c78bdb1d374fbf5b4a1c": 500
                }
            }
        },
        {
            "id": "item_16605286e928a4751a742b1ca4487ff1",
            "name": "Big ass hammer",
            "slot": "weapon",
            "rarity": "epic",
            "description": "",
            "sprite": "assets/items/Big-ass-hammer-07a7d53d.png",
            "stats": {
                "damage": 25,
                "damageMultiplier": 1.5,
                "attackSpeedMultiplier": 1.1
            },
            "recipe": {
                "materials": {
                    "material_985927188da978e5f7fa3e5c": 20
                }
            }
        },
        {
            "id": "item_de7e0157494ced343b07598988202332",
            "name": "Shark bow",
            "slot": "weapon",
            "rarity": "epic",
            "description": "",
            "sprite": "assets/items/Shark-bow-1e255237.png",
            "stats": {
                "multiHit": 0.5,
                "attackSpeedMultiplier": 1.25,
                "damageMultiplier": 1.33,
                "damage": 15
            },
            "recipe": {
                "materials": {
                    "material_630e87734f9c2d4f706637f4": 300,
                    "singedMane": 1
                }
            }
        },
        {
            "id": "item_f4fd3037b690a28fd3a2f9ff839aea40",
            "name": "Turtle Shield",
            "slot": "weapon",
            "rarity": "epic",
            "description": "",
            "sprite": "assets/items/Turtle-Shield-0887bf06.png",
            "stats": {
                "healthMultiplier": 2.5,
                "health": 75
            },
            "recipe": {
                "materials": {
                    "material_5f1658126246b7b3a5ede35d": 100,
                    "material_0e547cc411cb91fce7c30162": 25
                }
            }
        },
        {
            "id": "item_b24a60dcdf0ccb4d46bd76d25fe323b9",
            "name": "Ice helmet",
            "slot": "helmet",
            "rarity": "rare",
            "description": "",
            "sprite": "assets/items/Ice-helmet-d34a7251.png",
            "stats": {
                "evasion": 30,
                "health": 40,
                "damageMultiplier": 1.1
            },
            "recipe": {
                "materials": {
                    "material_5f1658126246b7b3a5ede35d": 200,
                    "material_985927188da978e5f7fa3e5c": 1,
                    "hide": 50
                }
            }
        },
        {
            "id": "item_472d75d45fc8629486e7b792509955eb",
            "name": "Ice body",
            "slot": "chest",
            "rarity": "common",
            "description": "",
            "sprite": "assets/items/Ice-body-73d507ba.png",
            "stats": {
                "health": 80,
                "evasion": 30,
                "healthRegenIncrease": 0.5
            },
            "recipe": {
                "materials": {
                    "material_5f1658126246b7b3a5ede35d": 300,
                    "material_985927188da978e5f7fa3e5c": 1,
                    "material_84c44258b76b2d4efca9f050": 50
                }
            }
        },
        {
            "id": "item_2d985f476d15b709bf5a6b397e017227",
            "name": "Ice legs",
            "slot": "legs",
            "rarity": "common",
            "description": "",
            "sprite": "assets/items/Ice-legs-293632e6.png",
            "stats": {
                "health": 75,
                "evasion": 30,
                "goldBonusMultiplier": 1.25
            },
            "recipe": {
                "materials": {
                    "material_985927188da978e5f7fa3e5c": 1,
                    "material_5f1658126246b7b3a5ede35d": 250,
                    "material_630e87734f9c2d4f706637f4": 50
                }
            }
        },
        {
            "id": "item_8559f22b5b4893dc7543f99f87560115",
            "name": "Wizard Cloak",
            "slot": "cape",
            "rarity": "rare",
            "description": "Does not make you invisible.",
            "sprite": "assets/items/Wizard-Cloak-7b30a46d.png",
            "stats": {
                "evasion": 33,
                "spellDamageMultiplier": 1.33,
                "mana": 40
            },
            "recipe": {
                "materials": {
                    "material_9dcedc16887f1776d1611c8d": 1000
                }
            }
        },
        {
            "id": "item_3db2de48cb30c07c6cbcf61a90f3b8e4",
            "name": "Blood cloak",
            "slot": "cape",
            "rarity": "unique",
            "description": "Looks sick",
            "sprite": "assets/items/Blood-cloak-14bcfbfd.png",
            "stats": {
                "healthMultiplier": 1.2,
                "damageMultiplier": 1.25,
                "health": 40
            },
            "recipe": null
        },
        {
            "id": "item_9e83e3705d8ed822691e528bb795a64c",
            "name": "testing ring",
            "slot": "ring",
            "rarity": "unique",
            "description": "Test \"regular w2 stats\"\nDeveloper equipment.",
            "sprite": "",
            "developerOnly": true,
            "stats": {
                "accuracy": 50,
                "damage": 60,
                "attackSpeedMultiplier": 1.25,
                "evasion": 120
            },
            "recipe": null
        },
        {
            "id": "item_8b41545b9cb73491f80051684955b8fd",
            "name": "Wand",
            "slot": "weapon",
            "rarity": "uncommon",
            "description": "",
            "sprite": "",
            "stats": {
                "spellDamage": 25,
                "manaRegenPercent": 0.1,
                "attackSpeedMultiplier": 1.15
            },
            "recipe": {
                "materials": {
                    "material_0e547cc411cb91fce7c30162": 100,
                    "singedMane": 50,
                    "material_1b4e649727a05b3ad2ec7f8a": 30
                }
            }
        },
        {
            "id": "item_e1349b5585a77f308513c104a2784bc4",
            "name": "Wand 2",
            "slot": "weapon",
            "rarity": "rare",
            "description": "",
            "sprite": "assets/items/Wand-2-9f5de946.png",
            "stats": {
                "spellDamage": 50,
                "manaRegenPercent": 0.1,
                "attackSpeedMultiplier": 1.25,
                "mana": 50
            },
            "recipe": {
                "materials": {
                    "material_c5b9f767dd84fce3cc950ab7": 500,
                    "material_b1c43d6c0bc463c355442072": 500
                }
            }
        },
        {
            "id": "item_e91b080d7b16940cdaba7f969645233f",
            "name": "Rapier",
            "slot": "weapon",
            "rarity": "rare",
            "description": "",
            "sprite": "assets/items/Rapier-ffc29742.png",
            "stats": {
                "attackSpeedMultiplier": 1.35,
                "damage": 30,
                "accuracyMultiplier": 1.4
            },
            "recipe": null
        },
        {
            "id": "item_a80b80da8b5f4c99a7227ab8ac2d40d1",
            "name": "Void scythe",
            "slot": "weapon",
            "rarity": "unique",
            "description": "",
            "sprite": "assets/items/Void-scythe-a96f149c.gif",
            "stats": {
                "damage": 75,
                "bleedChance": 0.2,
                "attackSpeedMultiplier": 1.25
            },
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_f3148bfadc1f22b67cde0f8d84c0e985",
            "name": "Fish bow",
            "slot": "weapon",
            "rarity": "rare",
            "description": "",
            "sprite": "assets/items/Fish-bow-c57f16bf.png",
            "stats": {
                "damage": 40,
                "poisonDamage": 2,
                "attackSpeedMultiplier": 1.25
            },
            "recipe": null
        },
        {
            "id": "item_15e51873410395e752d1b40ac749de62",
            "name": "Water helmet",
            "slot": "helmet",
            "rarity": "rare",
            "description": "",
            "sprite": "assets/items/Water-helmet-e2d9ee55.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_db9cd77eee84bb40c509ddaaeb73eb71",
            "name": "Water body",
            "slot": "chest",
            "rarity": "rare",
            "description": "",
            "sprite": "assets/items/Water-body-9ede33bc.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_691dfe98e4e3f396822433d84f55bcba",
            "name": "Water legs",
            "slot": "legs",
            "rarity": "rare",
            "description": "",
            "sprite": "assets/items/Water-legs-78f6669e.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_95b7c0c573c9566b2a8ea54ee050b1a2",
            "name": "Water boots",
            "slot": "boots",
            "rarity": "rare",
            "description": "",
            "sprite": "assets/items/Water-boots-7e3c5326.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_089f23985e6b57e087f4a61b5d7f1c83",
            "name": "Dagger",
            "slot": "weapon",
            "rarity": "uncommon",
            "description": "",
            "sprite": "assets/items/Dagger-8e4f5f58.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_f415dc5cd21123b51d1aa1b2b9c7f601",
            "name": "blade",
            "slot": "weapon",
            "rarity": "rare",
            "description": "",
            "sprite": "assets/items/New-Item-f0c349ca.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_be75f1f385eca9058cc20dcd497792e2",
            "name": "Royal bow",
            "slot": "weapon",
            "rarity": "unique",
            "description": "",
            "sprite": "assets/items/Royal-bow-c71b3219.png",
            "stats": {
                "bowDamageIncrease": 1.5,
                "damage": 50,
                "attackSpeedMultiplier": 1.3
            },
            "recipe": null
        },
        {
            "id": "item_1247d32afc0b9a9a0d0fddb5c50b6036",
            "name": "Big 2h sword",
            "slot": "weapon",
            "rarity": "epic",
            "description": "",
            "sprite": "assets/items/Big-2h-sword-aad3be23.png",
            "stats": {
                "damage": 100,
                "damageMultiplier": 1.2,
                "bleedDamageMultiplier": 2
            },
            "recipe": null
        },
        {
            "id": "item_f283ab664af9a3ff38efeedcc101d96a",
            "name": "Blue blade",
            "slot": "weapon",
            "rarity": "epic",
            "description": "",
            "sprite": "assets/items/Blue-blade-27552131.png",
            "stats": {},
            "recipe": null
        },
        {
            "id": "item_5b59966746357d75124c63bd5bd4f3f2",
            "name": "Chrono axe",
            "slot": "weapon",
            "rarity": "unique",
            "description": "",
            "sprite": "assets/items/New-Item-55f516bd.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_57237205641fec65162663889f13760e",
            "name": "Fire sword",
            "slot": "weapon",
            "rarity": "unique",
            "description": "",
            "sprite": "assets/items/New-Item-564c122d.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_d765a373cb3e735cb11d1bce094c6284",
            "name": "Ice dagger",
            "slot": "weapon",
            "rarity": "uncommon",
            "description": "",
            "sprite": "assets/items/New-Item-3d7212be.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_caa7ccc47f3c86fe4c53d30e9b9b39f5",
            "name": "Water dagger",
            "slot": "weapon",
            "rarity": "uncommon",
            "description": "",
            "sprite": "assets/items/New-Item-fa43e218.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_feda891c227ed62c299aad89e5d1c1c9",
            "name": "Opal bow",
            "slot": "weapon",
            "rarity": "uncommon",
            "description": "",
            "sprite": "assets/items/New-Item-d29a20a3.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_aab8ba90e95bfa3410799164181eb5bf",
            "name": "Vagabond bow",
            "slot": "weapon",
            "rarity": "rare",
            "description": "",
            "sprite": "assets/items/New-Item-7c14d5ca.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_d6dda8bac1a8a0cee94366df2dfb2604",
            "name": "Divine bow",
            "slot": "weapon",
            "rarity": "rare",
            "description": "",
            "sprite": "assets/items/Water-bow-eda1edbb.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_325c050aaded9a8cea45112a4b3dba11",
            "name": "Blood staff",
            "slot": "weapon",
            "rarity": "epic",
            "description": "",
            "sprite": "assets/items/New-Item-d0d06c6c.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_c8cf232fa1bd4457bc5599350335c23d",
            "name": "Chrono staff",
            "slot": "weapon",
            "rarity": "uncommon",
            "description": "",
            "sprite": "assets/items/New-Item-1b19a419.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_db78657b0bb8086df01f672b94d99fdd",
            "name": "Water staff",
            "slot": "weapon",
            "rarity": "uncommon",
            "description": "",
            "sprite": "assets/items/New-Item-fb35ab43.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_265c9788957ffffeef0b07bf5a010cd8",
            "name": "Magma shield",
            "slot": "weapon",
            "rarity": "rare",
            "description": "",
            "sprite": "assets/items/Magma-shield-5a1657f1.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
        },
        {
            "id": "item_5a79c5d5bec1be1684bcac39d09f5528",
            "name": "Purple flame",
            "slot": "weapon",
            "rarity": "unique",
            "description": "leeching flame",
            "sprite": "assets/items/Purple-flame-shield-05961094.png",
            "stats": {},
            "recipe": {
                "materials": {
                    "hide": 1
                }
            }
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
