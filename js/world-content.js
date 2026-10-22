window.adventureWorld = {
    "schemaVersion": 1,
    "worlds": [
        {
            "id": "verdantReach",
            "name": "Verdant Reach",
            "mapIds": [
                "greenfields",
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
            "description": "A quiet stretch of grassland where playful blobs are easy to find.",
            "goal": 10,
            "background": null,
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
            "description": "A shadowy forest where wolves roam beneath the whispering branches.",
            "goal": 10,
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
            "name": "Ember Caverns",
            "description": "A hot cavern where rare ore and glowing crystals can be found.",
            "goal": 10,
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
            "description": "A soot-covered covered cave deep underground. It's hot!",
            "goal": 10,
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
            "description": "The protector of the forests' home.",
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
            "goal": 100,
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
                    "count": 1,
                    "overrides": {}
                },
                {
                    "id": "salmen-copy-2",
                    "monsterId": "salmenMonster",
                    "count": 1,
                    "overrides": {}
                },
                {
                    "id": "salmen-copy-3",
                    "monsterId": "salmenMonster",
                    "count": 1,
                    "overrides": {}
                },
                {
                    "id": "salmen-copy-4",
                    "monsterId": "salmenMonster",
                    "count": 1,
                    "overrides": {}
                },
                {
                    "id": "salmen-copy-5",
                    "monsterId": "salmenMonster",
                    "count": 1,
                    "overrides": {}
                },
                {
                    "id": "salmen-copy-6",
                    "monsterId": "salmenMonster",
                    "count": 1,
                    "overrides": {}
                },
                {
                    "id": "salmen-copy-7",
                    "monsterId": "salmenMonster",
                    "count": 1,
                    "overrides": {}
                },
                {
                    "id": "salmen-copy-8",
                    "monsterId": "salmenMonster",
                    "count": 1,
                    "overrides": {}
                },
                {
                    "id": "salmen-copy-9",
                    "monsterId": "salmenMonster",
                    "count": 1,
                    "overrides": {}
                }
            ]
        },
        {
            "id": "brineAndPunishment",
            "name": "Brine & Punishment",
            "description": "A stormy reef where a flatfish champion guards the deeper coast.",
            "goal": 1250,
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
        }
    ],
    "monsters": [
        {
            "id": "greenfieldsMonster",
            "name": "Blob",
            "sprite": "assets/monsters/sprite-fusion-pixel-art-generator-32x32-c37d999a.png",
            "health": 12,
            "respawnSeconds": 4,
            "accuracy": 55,
            "evasion": 10,
            "attackDamage": 5,
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
            "id": "whisperingWoodsMonster",
            "name": "Wolf",
            "sprite": "assets/monsters/gen-c1c4a79f-f5f2-49f1-989f-8bdc0d87d728-f2401c93.png",
            "health": 42,
            "respawnSeconds": 5,
            "accuracy": 65,
            "evasion": 15,
            "attackDamage": 8,
            "attackInterval": 2.3,
            "gold": [
                12,
                18
            ],
            "experience": 10,
            "drops": [
                {
                    "id": "hide",
                    "amount": [
                        1,
                        2
                    ],
                    "chance": 1
                },
                {
                    "id": "fang",
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
            "id": "emberCavernsMonster",
            "name": "Cave Stalker",
            "sprite": "assets/monsters/gen-23db66a5-cac1-4654-941a-c49dfd5a2ff3-22cb942c.png",
            "health": 80,
            "respawnSeconds": 5,
            "accuracy": 75,
            "evasion": 20,
            "attackDamage": 4,
            "attackInterval": 1.5,
            "gold": [
                30,
                45
            ],
            "experience": 12,
            "drops": [
                {
                    "id": "ore",
                    "amount": [
                        1,
                        2
                    ],
                    "chance": 1
                },
                {
                    "id": "crystal",
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
            "id": "cinderPaddockMonster",
            "name": "Cindercorn",
            "sprite": "assets/monsters/sprite-fusion-pixel-art-generator-32x32-c37d999a.png",
            "health": 100,
            "respawnSeconds": 5,
            "accuracy": 50,
            "evasion": 35,
            "attackDamage": 4,
            "attackInterval": 1,
            "gold": [
                42,
                58
            ],
            "experience": 20,
            "drops": [
                {
                    "id": "cinderHoof",
                    "amount": [
                        1,
                        2
                    ],
                    "chance": 1
                },
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
            "sprite": "assets/monsters/pixel-art-forest-guardian-monster-cdef-4900b64e.png",
            "health": 5000,
            "respawnSeconds": 15,
            "accuracy": 100,
            "evasion": 50,
            "attackDamage": 10,
            "attackInterval": 2.5,
            "gold": [
                75,
                100
            ],
            "experience": 100,
            "drops": [
                {
                    "id": "crystal",
                    "amount": [
                        2,
                        3
                    ],
                    "chance": 1
                },
                {
                    "id": "fang",
                    "amount": [
                        1,
                        2
                    ],
                    "chance": 0.5
                }
            ],
            "itemDrops": []
        },
        {
            "id": "salmenMonster",
            "name": "Salmen",
            "sprite": "assets/monsters/big_whale-d850b321.png",
            "health": 300,
            "respawnSeconds": 4,
            "accuracy": 78,
            "evasion": 20,
            "attackDamage": 14,
            "attackInterval": 2.2,
            "gold": [
                45,
                65
            ],
            "experience": 30,
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
            "sprite": "",
            "health": 750,
            "respawnSeconds": 9,
            "accuracy": 82,
            "evasion": 25,
            "attackDamage": 18,
            "attackInterval": 2,
            "gold": [
                75,
                100
            ],
            "experience": 40,
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
        }
    ]
};
