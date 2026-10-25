window.adventureWorld = {
    "schemaVersion": 1,
    "worlds": [
        {
            "id": "verdantReach",
            "name": "Verdant Reach",
            "mapIds": [
                "greenfields",
                "map_378ad1dc8c08cecd68eb7eb4",
                "map_fa478ae5886a14840b39eeb1",
                "whisperingWoods",
                "emberCaverns",
                "cinderPaddock",
                "verdantWarden"
            ],
            "background": {
                "sprite": "assets/backgrounds/Forest_day-39193e46.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.55,
                "tileSize": 256
            }
        },
        {
            "id": "world_c791ede123810fd894db2294",
            "name": "Slippery Slopes",
            "mapIds": [
                "map_048c8ea9df2da62fe1bd3073",
                "map_f68402eddd52365a5ddd71d0",
                "map_05b027e04704b6f33d4da8ee",
                "map_d36b331dd838d14d34bb0365",
                "map_63d7d9b7d7889514e0171a58",
                "map_d2d78cfa833108d1f3031f26",
                "map_4c4be6ec759af00dc8f2ab5f",
                "map_677bad2999da2215a99e5ef9",
                "map_251364409b26827581f151b0",
                "map_ec2f730a5baeceee738b2f15"
            ],
            "background": {
                "sprite": "assets/backgrounds/ice1-e5dfc877.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.55,
                "tileSize": 256
            }
        },
        {
            "id": "tideglassCoast",
            "name": "Tideglass Coast",
            "mapIds": [
                "salmen",
                "brineAndPunishment"
            ],
            "background": {
                "sprite": "assets/backgrounds/water-7f1f6cde.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.55,
                "tileSize": 256
            }
        }
    ],
    "maps": [
        {
            "id": "greenfields",
            "name": "Greenfields",
            "description": "The tutorial grass. Easy to walk on, even easier to bully the local wildlife.",
            "goal": 10,
            "background": {
                "sprite": "assets/backgrounds/grassfield-c5fdd1dc.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.55,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "main",
                    "monsterId": "greenfieldsMonster",
                    "count": 1,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "whisperingWoods",
            "name": "Whispering Woods",
            "description": "A dark, moody forest where idle heroes come to leave their PCs running overnight.",
            "goal": 100,
            "background": {
                "sprite": "assets/backgrounds/Forest_cave-0929bfa4.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.55,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "whisperingWoods-copy-1",
                    "monsterId": "whisperingWoodsMonster",
                    "count": 1,
                    "overrides": {}
                },
                {
                    "id": "whisperingWoods-copy-2",
                    "monsterId": "whisperingWoodsMonster",
                    "count": 1,
                    "overrides": {
                        "respawnSeconds": 8
                    }
                }
            ]
        },
        {
            "id": "emberCaverns",
            "name": "Gloom Caverns",
            "description": "Echoes, shadows, and monsters who desperately need some Vitamin D.",
            "goal": 175,
            "background": {
                "sprite": "assets/backgrounds/cave-e39c203c.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.55,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "emberCaverns-copy-1",
                    "monsterId": "emberCavernsMonster",
                    "count": 1,
                    "overrides": {}
                },
                {
                    "id": "emberCaverns-copy-2",
                    "monsterId": "emberCavernsMonster",
                    "count": 1,
                    "overrides": {}
                },
                {
                    "id": "emberCaverns-copy-3",
                    "monsterId": "emberCavernsMonster",
                    "count": 1,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "cinderPaddock",
            "name": "Cinder Paddock",
            "description": "A spicy petting zoo that completely ignores fire safety regulations.",
            "goal": 250,
            "background": {
                "sprite": "assets/backgrounds/cave_lava-f34c96d5.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.55,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "cinderPaddock-copy-1",
                    "monsterId": "cinderPaddockMonster",
                    "count": 1,
                    "overrides": {}
                },
                {
                    "id": "cinderPaddock-copy-2",
                    "monsterId": "cinderPaddockMonster",
                    "count": 1,
                    "overrides": {}
                },
                {
                    "id": "cinderPaddock-copy-3",
                    "monsterId": "cinderPaddockMonster",
                    "count": 1,
                    "overrides": {}
                },
                {
                    "id": "cinderPaddock-copy-4",
                    "monsterId": "cinderPaddockMonster",
                    "count": 1,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "verdantWarden",
            "name": "Verdant Warden",
            "description": "Why do I hear Latin chanting and heavy electric guitars?",
            "goal": 1,
            "background": {
                "sprite": "assets/backgrounds/grove-87cef883.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.55,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "main",
                    "monsterId": "verdantWardenMonster",
                    "count": 1,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "salmen",
            "name": "Salmen village",
            "description": "A bright shoreline patrolled by salmon-folk and rich with hidden pearls.",
            "goal": 7000,
            "background": {
                "sprite": "assets/backgrounds/water_1-be737152.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.55,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "salmen-copy-1",
                    "monsterId": "salmenMonster",
                    "count": 7,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "brineAndPunishment",
            "name": "Brine & Punishment",
            "description": "A stormy reef where a flatfish champion guards the deeper coast.",
            "goal": 1,
            "background": null,
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "main",
                    "monsterId": "brineAndPunishmentMonster",
                    "count": 1,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "map_378ad1dc8c08cecd68eb7eb4",
            "name": "Sunspire Meadow",
            "description": "10/10 sunbeams, 0/10 sunscreen. Welcome to sunburn paradise.",
            "goal": 25,
            "background": {
                "sprite": "assets/backgrounds/sunny-4a1f0145.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.55,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "spawn_6167104bee9eedcbe8531cc9",
                    "monsterId": "monster_cd6e15f064cf236369f8c415",
                    "count": 2,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "map_fa478ae5886a14840b39eeb1",
            "name": "Oinkwood border",
            "description": "Mind the mud, watch for tusks, and duck when you hear squealing.",
            "goal": 50,
            "background": {
                "sprite": "assets/backgrounds/tallgrass-c587d4bc.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.55,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "spawn_b8da630f834af6945336478b",
                    "monsterId": "monster_eafa130d278dd6781312c386",
                    "count": 3,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "map_048c8ea9df2da62fe1bd3073",
            "name": "1",
            "description": "",
            "goal": 300,
            "background": {
                "sprite": "assets/backgrounds/ice1-e5dfc877.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.15,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "spawn_0700b0c1ab6c43b99edec605",
                    "monsterId": "monster_2b106413992cce9313c20ce7",
                    "count": 5,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "map_f68402eddd52365a5ddd71d0",
            "name": "2",
            "description": "",
            "goal": 500,
            "background": {
                "sprite": "assets/backgrounds/ice2-4e6817e5.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.2,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "spawn_c695523b0c625c03756c57a7",
                    "monsterId": "monster_37c07d183899f5c7036ac09f",
                    "count": 6,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "map_05b027e04704b6f33d4da8ee",
            "name": "3",
            "description": "",
            "goal": 800,
            "background": {
                "sprite": "assets/backgrounds/ice3-cb7470c1.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.15,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "spawn_d561c1318938c07fc85623dc",
                    "monsterId": "monster_a4ff3e8e7127d10b1532501d",
                    "count": 4,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "map_d36b331dd838d14d34bb0365",
            "name": "4",
            "description": "",
            "goal": 1200,
            "background": {
                "sprite": "assets/backgrounds/ice4-ff191571.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.3,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "spawn_7a14b40663f82bb55c0d1a88",
                    "monsterId": "monster_6352a14e888ed3fba2f151cd",
                    "count": 6,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "map_63d7d9b7d7889514e0171a58",
            "name": "5",
            "description": "",
            "goal": 1800,
            "background": {
                "sprite": "assets/backgrounds/ice5-d3a68e93.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.3,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "spawn_366c0556b8f4e2bd9d42ecd1",
                    "monsterId": "monster_ed1a656d3be2e7df0597f4f8",
                    "count": 8,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "map_d2d78cfa833108d1f3031f26",
            "name": "6",
            "description": "",
            "goal": 2500,
            "background": {
                "sprite": "assets/backgrounds/ice6-a5ce48ae.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.3,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "spawn_3056373948be890872138d8d",
                    "monsterId": "monster_2b10a0e61bd5ebd4e8050372",
                    "count": 5,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "map_4c4be6ec759af00dc8f2ab5f",
            "name": "7",
            "description": "",
            "goal": 4500,
            "background": {
                "sprite": "assets/backgrounds/ice7-8888abbc.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.2,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "spawn_8053408aa34409e7a609cc62",
                    "monsterId": "monster_70bf3d6d118e73ac85dee0cd",
                    "count": 10,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "map_677bad2999da2215a99e5ef9",
            "name": "8",
            "description": "",
            "goal": 5000,
            "background": {
                "sprite": "assets/backgrounds/ice8-8ad248e0.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.2,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "spawn_c97a4676b344557385f4e97b",
                    "monsterId": "monster_3092b7b9b1bd23e7e2ad2b39",
                    "count": 5,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "map_251364409b26827581f151b0",
            "name": "9",
            "description": "",
            "goal": 12000,
            "background": {
                "sprite": "assets/backgrounds/ice9-6473629d.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.1,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "spawn_7febce5ed2e4d886cc363ea2",
                    "monsterId": "monster_365f8e73c6121c5189836468",
                    "count": 50,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "map_ec2f730a5baeceee738b2f15",
            "name": "10",
            "description": "",
            "goal": 1,
            "background": {
                "sprite": "assets/backgrounds/ice10-01e88d4d.png",
                "color": "#172632",
                "fit": "cover",
                "dim": 0.1,
                "tileSize": 256
            },
            "drops": [],
            "itemDrops": [],
            "spawns": [
                {
                    "id": "spawn_3fdc0876e947f24592e13104",
                    "monsterId": "monster_f53770c6f3cb487158c3604f",
                    "count": 1,
                    "overrides": {}
                }
            ]
        }
    ],
    "monsters": [
        {
            "id": "greenfieldsMonster",
            "name": "Blob",
            "sprite": "assets/monsters/sprite-fusion-pixel-art-generator-32x32-c37d999a.png",
            "health": 18,
            "respawnSeconds": 4,
            "accuracy": 55,
            "evasion": 3,
            "attackDamage": 3,
            "attackInterval": 2.5,
            "gold": [
                4,
                7
            ],
            "experience": 10,
            "drops": [
                {
                    "id": "gel",
                    "amount": [
                        1,
                        2
                    ],
                    "chance": 1
                }
            ],
            "itemDrops": [
                {
                    "id": "slimyNecklace",
                    "chance": 0.001
                }
            ]
        },
        {
            "health": 24,
            "accuracy": 58,
            "evasion": 5,
            "attackDamage": 3,
            "attackInterval": 2.4,
            "respawnSeconds": 5,
            "experience": 12,
            "gold": [
                6,
                10
            ],
            "drops": [
                {
                    "id": "material_1b4e649727a05b3ad2ec7f8a",
                    "chance": 1,
                    "amount": [
                        1,
                        1
                    ]
                }
            ],
            "itemDrops": [],
            "sprite": "assets/monsters/bee-b2f684ce.png",
            "id": "monster_cd6e15f064cf236369f8c415",
            "name": "Bee"
        },
        {
            "health": 36,
            "accuracy": 62,
            "evasion": 8,
            "attackDamage": 5,
            "attackInterval": 2.8,
            "respawnSeconds": 5,
            "experience": 16,
            "gold": [
                9,
                14
            ],
            "drops": [
                {
                    "id": "material_0e547cc411cb91fce7c30162",
                    "chance": 1,
                    "amount": [
                        1,
                        1
                    ]
                }
            ],
            "itemDrops": [
                {
                    "id": "slimyNecklace",
                    "chance": 1
                }
            ],
            "sprite": "assets/monsters/boar-1620e233.png",
            "id": "monster_eafa130d278dd6781312c386",
            "name": "Boar"
        },
        {
            "id": "whisperingWoodsMonster",
            "name": "Wolf",
            "sprite": "assets/monsters/gen-c1c4a79f-f5f2-49f1-989f-8bdc0d87d728-f2401c93.png",
            "health": 52,
            "respawnSeconds": 5,
            "accuracy": 70,
            "evasion": 12,
            "attackDamage": 5,
            "attackInterval": 2.4,
            "gold": [
                12,
                18
            ],
            "experience": 20,
            "drops": [
                {
                    "id": "hide",
                    "amount": [
                        1,
                        2
                    ],
                    "chance": 1
                }
            ],
            "itemDrops": []
        },
        {
            "id": "emberCavernsMonster",
            "name": "Cave Stalker",
            "sprite": "assets/monsters/gen-23db66a5-cac1-4654-941a-c49dfd5a2ff3-22cb942c.png",
            "health": 75,
            "respawnSeconds": 5,
            "accuracy": 80,
            "evasion": 14,
            "attackDamage": 6,
            "attackInterval": 2.5,
            "gold": [
                24,
                34
            ],
            "experience": 26,
            "drops": [
                {
                    "id": "fang",
                    "amount": [
                        1,
                        2
                    ],
                    "chance": 1
                }
            ],
            "itemDrops": []
        },
        {
            "id": "cinderPaddockMonster",
            "name": "Cindersnake",
            "sprite": "assets/monsters/lavasnake_96px-a53213be.png",
            "health": 110,
            "respawnSeconds": 5,
            "accuracy": 85,
            "evasion": 18,
            "attackDamage": 7,
            "attackInterval": 2.4,
            "gold": [
                36,
                50
            ],
            "experience": 34,
            "drops": [
                {
                    "id": "singedMane",
                    "amount": [
                        1,
                        1
                    ],
                    "chance": 0.35
                }
            ],
            "itemDrops": []
        },
        {
            "id": "verdantWardenMonster",
            "name": "Grove Guardian",
            "sprite": "assets/monsters/grove_guardian-ae288fe1.png",
            "health": 1800,
            "respawnSeconds": 15,
            "accuracy": 125,
            "evasion": 22,
            "attackDamage": 24,
            "attackInterval": 2.5,
            "gold": [
                250,
                350
            ],
            "experience": 300,
            "drops": [
                {
                    "id": "crystal",
                    "amount": [
                        2,
                        3
                    ],
                    "chance": 1
                }
            ],
            "itemDrops": [
                {
                    "id": "item_b40111dcd0f7ca8b7d155f7e43a3cdc3",
                    "chance": 0.01
                }
            ]
        },
        {
            "health": 200,
            "accuracy": 105,
            "evasion": 20,
            "attackDamage": 10,
            "attackInterval": 3,
            "respawnSeconds": 5,
            "experience": 40,
            "gold": [
                50,
                70
            ],
            "drops": [
                {
                    "id": "material_630e87734f9c2d4f706637f4",
                    "chance": 1,
                    "amount": [
                        1,
                        3
                    ]
                }
            ],
            "itemDrops": [],
            "sprite": "assets/monsters/shyshark-fe7ec85c.png",
            "id": "monster_2b106413992cce9313c20ce7",
            "name": "Shy shark"
        },
        {
            "health": 260,
            "accuracy": 110,
            "evasion": 21,
            "attackDamage": 12,
            "attackInterval": 3.2,
            "respawnSeconds": 5,
            "experience": 45,
            "gold": [
                60,
                80
            ],
            "drops": [
                {
                    "id": "material_5f1658126246b7b3a5ede35d",
                    "chance": 1,
                    "amount": [
                        2,
                        4
                    ]
                }
            ],
            "itemDrops": [],
            "sprite": "assets/monsters/warturtle-53f1878e.png",
            "id": "monster_37c07d183899f5c7036ac09f",
            "name": "Warturtle"
        },
        {
            "health": 340,
            "accuracy": 115,
            "evasion": 22,
            "attackDamage": 15,
            "attackInterval": 2.8,
            "respawnSeconds": 5,
            "experience": 50,
            "gold": [
                70,
                95
            ],
            "drops": [
                {
                    "id": "material_062b4fbe63e85e9a00f80a92",
                    "chance": 1,
                    "amount": [
                        1,
                        1
                    ]
                }
            ],
            "itemDrops": [],
            "sprite": "assets/monsters/snowman-b8807e5c.png",
            "id": "monster_a4ff3e8e7127d10b1532501d",
            "name": "Snowman"
        },
        {
            "health": 430,
            "accuracy": 120,
            "evasion": 23,
            "attackDamage": 17,
            "attackInterval": 3,
            "respawnSeconds": 5,
            "experience": 55,
            "gold": [
                80,
                110
            ],
            "drops": [
                {
                    "id": "material_84c44258b76b2d4efca9f050",
                    "chance": 0.5,
                    "amount": [
                        1,
                        1
                    ]
                }
            ],
            "itemDrops": [],
            "sprite": "assets/monsters/big-penguin-3e7b66e8.png",
            "id": "monster_6352a14e888ed3fba2f151cd",
            "name": "Penguin"
        },
        {
            "health": 540,
            "accuracy": 125,
            "evasion": 24,
            "attackDamage": 20,
            "attackInterval": 3.2,
            "respawnSeconds": 5,
            "experience": 60,
            "gold": [
                95,
                125
            ],
            "drops": [
                {
                    "id": "material_c5b9f767dd84fce3cc950ab7",
                    "chance": 1,
                    "amount": [
                        1,
                        3
                    ]
                }
            ],
            "itemDrops": [],
            "sprite": "assets/monsters/icecube-b46d62a8.png",
            "id": "monster_ed1a656d3be2e7df0597f4f8",
            "name": "Ice cube"
        },
        {
            "health": 670,
            "accuracy": 130,
            "evasion": 25,
            "attackDamage": 25,
            "attackInterval": 2.8,
            "respawnSeconds": 5,
            "experience": 65,
            "gold": [
                110,
                145
            ],
            "drops": [
                {
                    "id": "material_b1c43d6c0bc463c355442072",
                    "chance": 1,
                    "amount": [
                        1,
                        1
                    ]
                }
            ],
            "itemDrops": [],
            "sprite": "assets/monsters/polarbear-306b12ef.png",
            "id": "monster_2b10a0e61bd5ebd4e8050372",
            "name": "Polarbear"
        },
        {
            "health": 820,
            "accuracy": 135,
            "evasion": 26,
            "attackDamage": 16,
            "attackInterval": 3,
            "respawnSeconds": 5,
            "experience": 70,
            "gold": [
                125,
                165
            ],
            "drops": [
                {
                    "id": "material_09adb7d7fc1d647bac41b75d",
                    "chance": 1,
                    "amount": [
                        1,
                        3
                    ]
                }
            ],
            "itemDrops": [],
            "sprite": "assets/monsters/tricolorbat-32d6e920.png",
            "id": "monster_70bf3d6d118e73ac85dee0cd",
            "name": "Tri-color Bat"
        },
        {
            "health": 1000,
            "accuracy": 140,
            "evasion": 28,
            "attackDamage": 32,
            "attackInterval": 2.8,
            "respawnSeconds": 5,
            "experience": 75,
            "gold": [
                145,
                190
            ],
            "drops": [
                {
                    "id": "material_9dcedc16887f1776d1611c8d",
                    "chance": 1,
                    "amount": [
                        1,
                        3
                    ]
                }
            ],
            "itemDrops": [],
            "sprite": "assets/monsters/snowflake-bb1a2ed1.png",
            "id": "monster_3092b7b9b1bd23e7e2ad2b39",
            "name": "Snowflake"
        },
        {
            "health": 1200,
            "accuracy": 145,
            "evasion": 30,
            "attackDamage": 12,
            "attackInterval": 3.5,
            "respawnSeconds": 5,
            "experience": 80,
            "gold": [
                165,
                215
            ],
            "drops": [
                {
                    "id": "material_b6b0c78bdb1d374fbf5b4a1c",
                    "chance": 1,
                    "amount": [
                        1,
                        1
                    ]
                }
            ],
            "itemDrops": [],
            "sprite": "assets/monsters/notapokemon-f90ba127.png",
            "id": "monster_365f8e73c6121c5189836468",
            "name": "Eyecicle"
        },
        {
            "health": 15000,
            "accuracy": 210,
            "evasion": 35,
            "attackDamage": 48,
            "attackInterval": 3.2,
            "respawnSeconds": 20,
            "experience": 2000,
            "gold": [
                1800,
                2400
            ],
            "drops": [
                {
                    "id": "material_985927188da978e5f7fa3e5c",
                    "chance": 1,
                    "amount": [
                        1,
                        1
                    ]
                }
            ],
            "itemDrops": [
                {
                    "id": "item_3db2de48cb30c07c6cbcf61a90f3b8e4",
                    "chance": 0.002
                }
            ],
            "sprite": "assets/monsters/iceboss3-b95fcecc.png",
            "id": "monster_f53770c6f3cb487158c3604f",
            "name": "Kevin the Frost Lord"
        },
        {
            "id": "salmenMonster",
            "name": "Salmen",
            "sprite": "assets/monsters/seaman-7e70e357.png",
            "health": 1600,
            "respawnSeconds": 5,
            "accuracy": 155,
            "evasion": 32,
            "attackDamage": 38,
            "attackInterval": 3,
            "gold": [
                210,
                280
            ],
            "experience": 100,
            "drops": [
                {
                    "id": "pearl",
                    "amount": [
                        1,
                        2
                    ],
                    "chance": 1
                }
            ],
            "itemDrops": []
        },
        {
            "id": "brineAndPunishmentMonster",
            "name": "The Plaice-holder",
            "sprite": "assets/monsters/big_whale-d850b321.png",
            "health": 24000,
            "respawnSeconds": 25,
            "accuracy": 245,
            "evasion": 40,
            "attackDamage": 90,
            "attackInterval": 3,
            "gold": [
                3000,
                4000
            ],
            "experience": 4000,
            "drops": [
                {
                    "id": "pearl",
                    "amount": [
                        2,
                        3
                    ],
                    "chance": 1
                }
            ],
            "itemDrops": []
        }
    ],
    "assets": [
        {
            "name": "Brick texture",
            "path": "assets/ui/brick128.png",
            "kind": "background"
        },
        {
            "name": "Skill tree artwork",
            "path": "assets/skilltree-background.png",
            "kind": "background"
        },
        {
            "name": "Forest_day",
            "path": "assets/backgrounds/Forest_day-39193e46.png",
            "kind": "background"
        },
        {
            "name": "Forest_cave",
            "path": "assets/backgrounds/Forest_cave-0929bfa4.png",
            "kind": "background"
        },
        {
            "name": "cave",
            "path": "assets/backgrounds/cave-e39c203c.png",
            "kind": "background"
        },
        {
            "name": "cave_lava",
            "path": "assets/backgrounds/cave_lava-f34c96d5.png",
            "kind": "background"
        },
        {
            "name": "grove",
            "path": "assets/backgrounds/grove-87cef883.png",
            "kind": "background"
        },
        {
            "name": "sprite-fusion-pixel-art-generator-32x32",
            "path": "assets/monsters/sprite-fusion-pixel-art-generator-32x32-c37d999a.png",
            "kind": "monster"
        },
        {
            "name": "gen-23db66a5-cac1-4654-941a-c49dfd5a2ff3",
            "path": "assets/monsters/gen-23db66a5-cac1-4654-941a-c49dfd5a2ff3-22cb942c.png",
            "kind": "monster"
        },
        {
            "name": "gen-c1c4a79f-f5f2-49f1-989f-8bdc0d87d728",
            "path": "assets/monsters/gen-c1c4a79f-f5f2-49f1-989f-8bdc0d87d728-f2401c93.png",
            "kind": "monster"
        },
        {
            "name": "pixel-art-forest-guardian-monster-cdef",
            "path": "assets/monsters/pixel-art-forest-guardian-monster-cdef-4900b64e.png",
            "kind": "monster"
        },
        {
            "name": "big_whale",
            "path": "assets/monsters/big_whale-d850b321.png",
            "kind": "monster"
        },
        {
            "name": "water_1",
            "path": "assets/backgrounds/water_1-be737152.png",
            "kind": "background"
        },
        {
            "name": "water",
            "path": "assets/backgrounds/water-7f1f6cde.png",
            "kind": "background"
        },
        {
            "name": "seaman",
            "path": "assets/monsters/seaman-7e70e357.png",
            "kind": "monster"
        },
        {
            "name": "lavasnake_96px",
            "path": "assets/monsters/lavasnake_96px-a53213be.png",
            "kind": "monster"
        },
        {
            "name": "sunny",
            "path": "assets/backgrounds/sunny-4a1f0145.png",
            "kind": "background"
        },
        {
            "name": "grassfield",
            "path": "assets/backgrounds/grassfield-0f387cf2.png",
            "kind": "background"
        },
        {
            "name": "grassfield",
            "path": "assets/backgrounds/grassfield-c5fdd1dc.png",
            "kind": "background"
        },
        {
            "name": "bee",
            "path": "assets/monsters/bee-b2f684ce.png",
            "kind": "monster"
        },
        {
            "name": "boar",
            "path": "assets/monsters/boar-1620e233.png",
            "kind": "monster"
        },
        {
            "name": "tallgrass",
            "path": "assets/backgrounds/tallgrass-c587d4bc.png",
            "kind": "background"
        },
        {
            "name": "grove_guardian",
            "path": "assets/monsters/grove_guardian-ae288fe1.png",
            "kind": "monster"
        },
        {
            "name": "ice1",
            "path": "assets/backgrounds/ice1-e5dfc877.png",
            "kind": "background"
        },
        {
            "name": "ice2",
            "path": "assets/backgrounds/ice2-4e6817e5.png",
            "kind": "background"
        },
        {
            "name": "ice3",
            "path": "assets/backgrounds/ice3-cb7470c1.png",
            "kind": "background"
        },
        {
            "name": "ice4",
            "path": "assets/backgrounds/ice4-ff191571.png",
            "kind": "background"
        },
        {
            "name": "ice5",
            "path": "assets/backgrounds/ice5-d3a68e93.png",
            "kind": "background"
        },
        {
            "name": "ice6",
            "path": "assets/backgrounds/ice6-a5ce48ae.png",
            "kind": "background"
        },
        {
            "name": "ice7",
            "path": "assets/backgrounds/ice7-8888abbc.png",
            "kind": "background"
        },
        {
            "name": "ice8",
            "path": "assets/backgrounds/ice8-8ad248e0.png",
            "kind": "background"
        },
        {
            "name": "ice9",
            "path": "assets/backgrounds/ice9-6473629d.png",
            "kind": "background"
        },
        {
            "name": "ice10",
            "path": "assets/backgrounds/ice10-01e88d4d.png",
            "kind": "background"
        },
        {
            "name": "shyshark",
            "path": "assets/monsters/shyshark-fe7ec85c.png",
            "kind": "monster"
        },
        {
            "name": "warturtle",
            "path": "assets/monsters/warturtle-53f1878e.png",
            "kind": "monster"
        },
        {
            "name": "snowman",
            "path": "assets/monsters/snowman-b8807e5c.png",
            "kind": "monster"
        },
        {
            "name": "big penguin",
            "path": "assets/monsters/big-penguin-3e7b66e8.png",
            "kind": "monster"
        },
        {
            "name": "icecube",
            "path": "assets/monsters/icecube-b46d62a8.png",
            "kind": "monster"
        },
        {
            "name": "polarbear",
            "path": "assets/monsters/polarbear-306b12ef.png",
            "kind": "monster"
        },
        {
            "name": "tricolorbat",
            "path": "assets/monsters/tricolorbat-32d6e920.png",
            "kind": "monster"
        },
        {
            "name": "snowflake",
            "path": "assets/monsters/snowflake-bb1a2ed1.png",
            "kind": "monster"
        },
        {
            "name": "notapokemon",
            "path": "assets/monsters/notapokemon-f90ba127.png",
            "kind": "monster"
        },
        {
            "name": "iceboss1",
            "path": "assets/monsters/iceboss1-df2aa816.png",
            "kind": "monster"
        },
        {
            "name": "iceboss3",
            "path": "assets/monsters/iceboss3-b95fcecc.png",
            "kind": "monster"
        }
    ]
};
