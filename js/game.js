const saveKey = 'idleAdventureSave';
const mapData = [
    {
        id: 'greenfields',
        name: 'Greenfields',
        enemy: 'Blob',
        description: 'A quiet stretch of grassland where playful blobs are easy to find.',
        health: 12,
        respawnSeconds: 4,
        accuracy: 55,
        evasion: 10,
        attackDamage: 5,
        attackInterval: 2.5,
        gold: [4, 7],
        experience: 10,
        goal: 10,
        drops: [{ id: 'gel', amount: [1, 2], chance: 1 }],
        itemDrops: [{ id: 'slimyNecklace', chance: 1 / 1000 }]
    },
    {
        id: 'whisperingWoods',
        name: 'Whispering Woods',
        enemy: 'Wolf',
        monsterCount: 2,
        respawnSeconds: 5,
        monsterOverrides: [{}, { respawnSeconds: 8 }],
        description: 'A shadowy forest where wolves roam beneath the whispering branches.',
        health: 42,
        accuracy: 65,
        evasion: 15,
        attackDamage: 8,
        attackInterval: 2.3,
        gold: [12, 18],
        experience: 10,
        goal: 10,
        drops: [{ id: 'hide', amount: [1, 2], chance: 1 }, { id: 'fang', amount: [1, 1], chance: 0.35 }]
    },
    {
        id: 'emberCaverns',
        name: 'Ember Caverns',
        enemy: 'Cave Stalker',
        monsterCount: 3,
        description: 'A hot cavern where rare ore and glowing crystals can be found.',
        health: 80,
        respawnSeconds: 5,
        accuracy: 75,
        evasion: 20,
        attackDamage: 4,
        attackInterval: 1.5,
        gold: [30, 45],
        experience: 12,
        goal: 10,
        drops: [{ id: 'ore', amount: [1, 2], chance: 1 }, { id: 'crystal', amount: [1, 1], chance: 0.35 }]
    },
    {
        id: 'cinderPaddock',
        name: 'Cinder Paddock',
        enemy: 'Cindercorn',
        monsterCount: 4,
        description: 'A soot-covered pasture where fiery horned beasts leave a trail of sparks.',
        health: 100,
        respawnSeconds: 5,
        accuracy: 50,
        evasion: 35,
        attackDamage: 4,
        attackInterval: 1.0,
        gold: [42, 58],
        experience: 20,
        goal: 10,
        drops: [
            { id: 'cinderHoof', amount: [1, 2], chance: 1 },
            { id: 'singedMane', amount: [1, 1], chance: 0.35 }
        ]
    },
    {
        id: 'verdantWarden',
        name: 'Verdant Warden',
        enemy: 'Grove Guardian',
        description: 'A towering guardian watches the edge of the forest. Defeat it to open the way onward.',
        health: 5000,
        respawnSeconds: 15,
        accuracy: 100,
        evasion: 50,
        attackDamage: 10,
        attackInterval: 2.5,
        gold: [75, 100],
        experience: 100,
        goal: 1,
        drops: [{ id: 'crystal', amount: [2, 3], chance: 1 }, { id: 'fang', amount: [1, 2], chance: 0.5 }]
    },
    {
        id: 'salmen',
        name: 'Salmen village',
        enemy: 'Salmen',
        monsterCount: 9,
        description: 'A bright shoreline patrolled by salmon-folk and rich with hidden pearls.',
        health: 300,
        respawnSeconds: 4,
        accuracy: 78,
        evasion: 20,
        attackDamage: 14,
        attackInterval: 2.2,
        gold: [45, 65],
        experience: 30,
        goal: 100,
        drops: [{ id: 'pearl', amount: [1, 2], chance: 1 }]
    },
    {
        id: 'brineAndPunishment',
        name: 'Brine & Punishment',
        enemy: 'The Plaice-holder',
        description: 'A stormy reef where a flatfish champion guards the deeper coast.',
        health: 750,
        respawnSeconds: 9,
        accuracy: 82,
        evasion: 25,
        attackDamage: 18,
        attackInterval: 2,
        gold: [75, 100],
        experience: 40,
        goal: 1250,
        drops: [{ id: 'pearl', amount: [2, 3], chance: 1 }]
    }
];

const worldData = [
    {
        id: 'verdantReach',
        name: 'Verdant Reach',
        mapIds: ['greenfields', 'whisperingWoods', 'emberCaverns', 'cinderPaddock', 'verdantWarden']
    },
    {
        id: 'tideglassCoast',
        name: 'Tideglass Coast',
        mapIds: ['salmen', 'brineAndPunishment']
    }
];

const itemData = Equipment.normalizeData(window.adventureItems);
const itemErrors = Equipment.validate(itemData);
if (itemErrors.length) throw new Error('Equipment data could not be loaded: ' + itemErrors.join(' '));
const materialNames = itemData.materials;
const itemById = Object.fromEntries(itemData.items.map(item => [item.id, item]));
// Recipes are a view of the catalogue, never a second set of item definitions.
const recipes = itemData.items.filter(item => item.recipe).map(item => ({
    ...item, materials: item.recipe.materials, effect: Equipment.describe(item)
}));
const recipeCategories = {
    weapon: 'weapons', helmet: 'armor', chest: 'armor', legs: 'armor',
    boots: 'armor', cape: 'accessories', ring: 'accessories', necklace: 'accessories'
};
const craftingCategories = [
    { id: 'weapons', title: 'Weapons' },
    { id: 'armor', title: 'Armor' },
    { id: 'accessories', title: 'Accessories' }
].map(category => ({
    ...category,
    recipes: recipes.filter(item => (recipeCategories[item.slot] || 'accessories') === category.id).map(item => item.id)
}));
// Acquisition belongs to map content; ignore missing references after catalogue edits.
mapData.forEach(map => {
    map.itemDrops = (map.itemDrops || []).filter(drop =>
        Object.hasOwn(itemById, drop.id) && !itemById[drop.id].developerOnly);
});

const materialSources = {
    hide: [{ enemy: 'Wolves', location: 'Whispering Woods' }],
    fang: [{ enemy: 'Wolves', location: 'Whispering Woods' }],
    gel: [{ enemy: 'Blobs', location: 'Greenfields' }],
    ore: [{ enemy: 'Cave Stalkers', location: 'Ember Caverns' }],
    crystal: [
        { enemy: 'Cave Stalkers', location: 'Ember Caverns' },
        { enemy: 'Grove Guardians', location: 'Verdant Warden' }
    ],
    cinderHoof: [{ enemy: 'Cindercorns', location: 'Cinder Paddock' }],
    singedMane: [{ enemy: 'Cindercorns', location: 'Cinder Paddock' }],
    pearl: [
        { enemy: 'Salmen', location: 'Salmen village' },
        { enemy: 'The Plaice-holder', location: 'Brine & Punishment' }
    ]
};

const equipmentSlots = itemData.slots;

const gearSlots = equipmentSlots.map(slot => slot.id);
const createEmptyGear = () => Object.fromEntries(gearSlots.map(slot => [slot, null]));
const createTutorialState = () => ({
    firstSkillPointPending: false,
    firstSkillPointDismissed: false,
    firstNextMapPending: false,
    firstNextMapDismissed: false,
    firstMapGoalPending: false,
    firstMapGoalDismissed: false,
    firstGearPrompted: false,
    firstGearPending: false,
    firstGearDismissed: false,
    firstGearSlot: null,
    firstGearItemId: null,
    firstGearSlotSelected: false
});

const legacyUpgradeIds = ['strength', 'haste', 'evasion'];
const skillTreeData = SkillStatCompat.normalize(window.adventureSkillTree);
if (!skillTreeData || !Array.isArray(skillTreeData.nodes)) {
    throw new Error('Idle Adventure skill tree data could not be loaded.');
}
const skillNodes = skillTreeData.nodes;
const skillNodeById = Object.fromEntries(skillNodes.map(node => [node.id, node]));
const experienceForNextLevel = level =>
    level === 0
        ? 50
        : skillTreeData.experienceBase + (level - 1) * skillTreeData.experiencePerLevel;

const basePlayerMaxHealth = 100;
const playerAccuracy = 100;
const basePlayerEvasion = 25;
const baseMultiHit = 1;
const gameTickMilliseconds = 100;
const gameTickSeconds = gameTickMilliseconds / 1000;

let skillTreeZoom = 1;
let skillTreePanX = 0;
let skillTreePanY = 0;
let skillTreeNeedsInitialFraming = true;
const initialSkillTreeZoom = 1.1;
let pendingSkillRanks = {};
let skillTreePanning = false;
let skillTreePanStartX = 0;
let skillTreePanStartY = 0;

const state = {
    gold: 0,
    kills: Object.fromEntries(mapData.map(map => [map.id, 0])),
    materials: Object.fromEntries(Object.keys(materialNames).map(id => [id, 0])),
    upgrades: { strength: 0, haste: 0, evasion: 0 },
    level: 0,
    experience: 0,
    skillPoints: 0,
    skillRanks: {},
    gear: createEmptyGear(),
    ownedItemIds: [],
    developerItemsEnabled: false,
    crafted: [],
    tutorials: createTutorialState(),
    selectedWorld: worldData[0].id,
    lastMapByWorld: Object.fromEntries(worldData.map(world => [world.id, world.mapIds[0]])),
    selectedMap: 'greenfields',
    mapListExpanded: true,
    isInTown: true,
    currentView: 'town',
    enemyHp: 12,
    enemyRespawnRemaining: 0,
    monsterStates: [],
    targetMonsterId: null,
    playerHp: basePlayerMaxHealth,
    combatPaused: false,
    attackTimer: 0,
    lootLog: [],
    lastDrop: 'Defeat enemies to find loot.'
};

const elements = {
    gold: document.querySelector('#goldDisplay'),
    level: document.querySelector('#levelDisplay'),
    experience: document.querySelector('#experienceText'),
    experienceBar: document.querySelector('#experienceBar'),
    experienceTrack: document.querySelector('#experienceTrack'),
    skillPoints: document.querySelector('#skillPointDisplay'),
    increaseLevel: document.querySelector('#increaseLevelButton'),
    damage: document.querySelector('#damageDisplay'),
    multiHit: document.querySelector('#multiHitDisplay'),
    poisonChance: document.querySelector('#poisonChanceDisplay'),
    speed: document.querySelector('#speedDisplay'),
    accuracy: document.querySelector('#accuracyDisplay'),
    evasion: document.querySelector('#evasionDisplay'),
    worldPanel: document.querySelector('.world-panel'),
    worldList: document.querySelector('#worldList'),
    mapList: document.querySelector('#mapList'),
    mapPanel: document.querySelector('.map-panel'),
    mapSelectionHint: document.querySelector('.map-selection-hint'),
    combatPanel: document.querySelector('.combat-panel'),
    mapName: document.querySelector('#currentMapName'),
    mapDescription: document.querySelector('#mapDescription'),
    killProgress: document.querySelector('#killProgress'),
    killProgressLabel: document.querySelector('#killProgressLabel'),
    enemyRoster: document.querySelector('#enemyRoster'),
    mapLootTable: document.querySelector('#mapLootTable'),
    playerHealthBar: document.querySelector('#playerHealthBar'),
    playerHealthDamage: document.querySelector('#playerHealthDamage'),
    playerHealthTrack: document.querySelector('.player-health-track'),
    playerHealthText: document.querySelector('#playerHealthText'),
    resumeCombat: document.querySelector('#resumeCombat'),
    combatStatus: document.querySelector('#combatStatus'),
    combatStatusLabel: document.querySelector('#combatStatusLabel'),
    lastDrop: document.querySelector('#lastDrop'),
    townView: document.querySelector('#townView'),
    upgradesView: document.querySelector('#upgradesView'),
    mapView: document.querySelector('#mapView'),
    inventoryView: document.querySelector('#inventoryView'),
    upgrades: document.querySelector('#upgradeList'),
    crafts: document.querySelector('#craftList'),
    craftingTools: document.querySelector('#craftingTools'),
    craftingSummary: document.querySelector('#craftingSummary'),
    inventory: document.querySelector('#inventoryList'),
    gearInventory: document.querySelector('#gearInventory'),
    gear: document.querySelector('#gearSummary'),
    gearSelectionHeading: document.querySelector('#gearSelectionHeading'),
    gearSelectionHint: document.querySelector('#gearSelectionHint'),
    lootLog: document.querySelector('#lootLog'),
    progressSummary: document.querySelector('#mapProgressSummary'),
    tutorialNotifications: document.querySelector('#tutorialNotifications')
};

let lastTick = performance.now();
let lastSave = Date.now();
let selectedGearSlot = 'weapon';
let selectedCraftCategory = 'all';
let showCraftableRecipesOnly = false;
let showCraftedRecipes = false;
let refundMode = false;
let lastRenderedGearSignature = null;
let recentPlayerDamage = 0;
let damageFadeTimeout = 0;
let recentEnemyDamage = 0;
const dodgeFlashTimeouts = new Map();
const monsterProcTimers = new WeakMap();
const shockwaveHitTimers = new WeakMap();
const shownTutorialNotifications = new Set();
const enemyDamageIndicatorTimers = new WeakMap();
const poisonDamageType = {
    baseDamage: 1,
    durationSeconds: 5,
    tickIntervalSeconds: 1
};

function currentMap() {
    return mapData.find(map => map.id === state.selectedMap) || mapData[0];
}

function monsterDefinitions(map = currentMap()) {
    if (Array.isArray(map.monsters)) return map.monsters;
    const count = Math.max(1, Math.floor(map.monsterCount || 1));
    return Array.from({ length: count }, (_, index) => ({
        id: count === 1 ? 'main' : map.id + '-copy-' + (index + 1),
        name: map.enemy,
        respawnSeconds: map.respawnSeconds || 5,
        ...(map.monsterOverrides && map.monsterOverrides[index])
    }));
}

function createMonsterStates(map, savedStates, legacyHp, legacyRespawn) {
    return monsterDefinitions(map).map((definition, index) => {
        const saved = Array.isArray(savedStates)
            ? savedStates.find(monster => monster.id === definition.id) || savedStates[index]
            : null;
        const hp = saved
            ? Math.max(0, Math.min(map.health, saved.hp))
            : index === 0 && Number.isFinite(legacyHp) ? Math.max(0, Math.min(map.health, legacyHp)) : map.health;
        const respawnRemaining = saved
            ? Math.max(0, Math.min(definition.respawnSeconds, saved.respawnRemaining))
            : index === 0 && hp === 0 ? Math.max(0, Math.min(definition.respawnSeconds, legacyRespawn || 0)) : 0;
        return {
            id: definition.id,
            hp: hp === 0 && respawnRemaining === 0 ? map.health : hp,
            respawnRemaining,
            attackTimer: saved && Number.isFinite(saved.attackTimer) ? Math.max(0, saved.attackTimer) : 0,
            poisonStacks: saved && Array.isArray(saved.poisonStacks)
                ? saved.poisonStacks.filter(stack => stack &&
                    Number.isFinite(stack.remainingDuration) && stack.remainingDuration > 0 &&
                    Number.isFinite(stack.timeUntilTick) && stack.timeUntilTick > 0)
                    .map(stack => ({
                        remainingDuration: stack.remainingDuration,
                        timeUntilTick: stack.timeUntilTick
                    }))
                : []
        };
    });
}

function resetMonsterStates(map = currentMap()) {
    state.monsterStates = createMonsterStates(map);
    state.targetMonsterId = monsterDefinitions(map)[0].id;
    syncLegacyEnemyState();
}

function activeMonster() {
    return state.monsterStates.find(monster => monster.id === state.targetMonsterId && monster.hp > 0) || null;
}

function ensureLiveMonsterTarget() {
    const currentTarget = activeMonster();
    if (currentTarget) return currentTarget;

    const monsters = state.monsterStates;
    if (!monsters.length) {
        state.targetMonsterId = null;
        return null;
    }

    let targetIndex = monsters.findIndex(monster => monster.id === state.targetMonsterId);
    if (targetIndex < 0) targetIndex = monsters.length - 1;
    for (let offset = 1; offset <= monsters.length; offset++) {
        const candidate = monsters[(targetIndex + offset) % monsters.length];
        if (candidate.hp > 0) {
            state.targetMonsterId = candidate.id;
            return candidate;
        }
    }
    return null;
}

function getPlayerAttackTargets() {
    if (!activeMonster()) return [];
    const targetIndex = state.monsterStates.findIndex(monster => monster.id === state.targetMonsterId);
    const orderedMonsters = state.monsterStates.slice(targetIndex).concat(state.monsterStates.slice(0, targetIndex));
    const multiHit = getMultiHit();
    const guaranteedHits = Math.floor(multiHit);
    const extraHit = Math.random() < multiHit - guaranteedHits ? 1 : 0;
    return orderedMonsters.filter(monster => monster.hp > 0).slice(0, guaranteedHits + extraHit);
}

function setInitialMonsterTarget() {
    const monster = state.monsterStates.find(entry => entry.hp > 0) || state.monsterStates[0];
    state.targetMonsterId = monster ? monster.id : null;
}

function selectNextMonsterTarget(defeatedMonster) {
    const monsters = state.monsterStates;
    const defeatedIndex = monsters.findIndex(monster => monster.id === defeatedMonster.id);
    for (let offset = 1; offset < monsters.length; offset++) {
        const candidate = monsters[(defeatedIndex + offset) % monsters.length];
        if (candidate.hp > 0) {
            state.targetMonsterId = candidate.id;
            return;
        }
    }
}

function syncLegacyEnemyState() {
    const primary = state.monsterStates[0];
    if (!primary) return;
    state.enemyHp = primary.hp;
    state.enemyRespawnRemaining = primary.respawnRemaining;
}

function clearEnemyDamageIndicator() {
    recentEnemyDamage = 0;
    elements.enemyRoster.querySelectorAll('.enemy-health-damage, .enemy-health-poison-damage').forEach(indicator => {
        window.clearTimeout(enemyDamageIndicatorTimers.get(indicator));
        indicator.classList.remove('is-visible');
        if (indicator.classList.contains('enemy-health-poison-damage')) {
            indicator.style.left = '0%';
            indicator.style.width = '0%';
        }
    });
}

function flashDodge(track) {
    window.clearTimeout(dodgeFlashTimeouts.get(track));
    track.classList.remove('is-dodging');
    void track.offsetWidth;
    track.classList.add('is-dodging');
    dodgeFlashTimeouts.set(track, window.setTimeout(function() {
        track.classList.remove('is-dodging');
        dodgeFlashTimeouts.delete(track);
    }, 420));
}

function showMonsterProc(monsterId, procName) {
    const card = Array.from(elements.enemyRoster.children)
        .find(entry => entry.dataset.monsterId === monsterId);
    const notice = card && card.querySelector('[data-enemy-proc-notice]');
    if (!notice) return;

    const activeProcs = (notice.dataset.activeProcs || '').split('|').filter(Boolean);
    if (!activeProcs.includes(procName)) activeProcs.push(procName);
    notice.dataset.activeProcs = activeProcs.join('|');
    notice.textContent = activeProcs.join(' · ');
    notice.classList.remove('is-visible');
    void notice.offsetWidth;
    notice.classList.add('is-visible');

    window.clearTimeout(monsterProcTimers.get(notice));
    monsterProcTimers.set(notice, window.setTimeout(function() {
        notice.textContent = '';
        notice.dataset.activeProcs = '';
        notice.classList.remove('is-visible');
        monsterProcTimers.delete(notice);
    }, 1100));
}

function showPoisonStackProc(monster) {
    const card = Array.from(elements.enemyRoster.children)
        .find(entry => entry.dataset.monsterId === monster.id);
    const indicator = card && card.querySelector('[data-enemy-dot-status]');
    if (!indicator) return;
    indicator.hidden = false;
    indicator.querySelector('[data-enemy-dot-count]').textContent = monster.poisonStacks.length + 'x';
    indicator.classList.remove('is-applying');
    void indicator.offsetWidth;
    indicator.classList.add('is-applying');
}

function flashShockwaveHealthBar(monsterId) {
    const card = Array.from(elements.enemyRoster.children)
        .find(entry => entry.dataset.monsterId === monsterId);
    const healthTrack = card && card.querySelector('.health-track');
    if (!healthTrack) return;
    healthTrack.classList.remove('is-shockwave-hit');
    void healthTrack.offsetWidth;
    healthTrack.classList.add('is-shockwave-hit');
}

function showMonsterHitBadge(monsterId, label, isMultiHit = false) {
    const card = Array.from(elements.enemyRoster.children)
        .find(entry => entry.dataset.monsterId === monsterId);
    if (!card) return;
    const notice = card.querySelector('[data-combat-hit-badge]');
    if (notice) {
        notice.hidden = false;
        notice.textContent = label;
        notice.classList.toggle('is-multihit', isMultiHit);
        notice.classList.remove('is-visible');
        void notice.offsetWidth;
        notice.classList.add('is-visible');
        window.clearTimeout(shockwaveHitTimers.get(notice));
        shockwaveHitTimers.set(notice, window.setTimeout(() => {
            notice.classList.remove('is-visible');
            shockwaveHitTimers.delete(notice);
        }, 1500));
    }
}

function flashShockwaveCard(monsterId) {
    const card = Array.from(elements.enemyRoster.children)
        .find(entry => entry.dataset.monsterId === monsterId);
    if (!card) return;
    card.classList.remove('is-shockwave-splashed');
    void card.offsetWidth;
    card.classList.add('is-shockwave-splashed');
}

function nudgePlayerHealthBar() {
    elements.playerHealthTrack.classList.remove('is-damaged');
    void elements.playerHealthTrack.offsetWidth;
    elements.playerHealthTrack.classList.add('is-damaged');
}

function promptForFirstGear(itemId, slot) {
    if (state.tutorials.firstGearPrompted) return;
    state.tutorials.firstGearPrompted = true;
    state.tutorials.firstGearPending = true;
    state.tutorials.firstGearDismissed = false;
    state.tutorials.firstGearSlot = slot;
    state.tutorials.firstGearItemId = itemId;
    state.tutorials.firstGearSlotSelected = false;
}

function getSkillNodeRank(id, ranks = state.skillRanks) {
    return ranks[id] || 0;
}

function getPendingSkillPointCount() {
    return Object.values(pendingSkillRanks).reduce((total, rank) => total + rank, 0);
}

function getPlannedSkillRanks() {
    return Object.fromEntries(skillNodes.map(node => [
        node.id,
        getSkillNodeRank(node.id) + getSkillNodeRank(node.id, pendingSkillRanks)
    ]));
}

function canDeselectPendingSkillNode(nodeId) {
    if (!pendingSkillRanks[nodeId]) return false;
    const plannedRanks = getPlannedSkillRanks();
    plannedRanks[nodeId] = getSkillNodeRank(nodeId);
    const isAllocated = id => Boolean(skillNodeById[id] && skillNodeById[id].start) ||
        (plannedRanks[id] || 0) > 0;
    return skillNodes.every(node =>
        (plannedRanks[node.id] || 0) === 0 || skillNodeRequirementsMet(node, isAllocated));
}

function canRefundSkillRank(nodeId) {
    const rank = getSkillNodeRank(nodeId);
    if (!rank) return false;
    const remainingRanks = { ...state.skillRanks, [nodeId]: rank - 1 };
    if (!remainingRanks[nodeId]) delete remainingRanks[nodeId];
    const isAllocated = id => Boolean(skillNodeById[id] && skillNodeById[id].start) ||
        (remainingRanks[id] || 0) > 0;
    return skillNodes.every(node =>
        (remainingRanks[node.id] || 0) === 0 || skillNodeRequirementsMet(node, isAllocated));
}

function getSkillStatFromRanks(stat, ranks) {
    return Object.entries(ranks).reduce((total, [id, rank]) => {
        const node = skillNodeById[id];
        if (!node || !rank) return total;
        return total + (node.stats[stat] || 0) * rank;
    }, 0);
}

function getSkillStat(stat) {
    return getSkillStatFromRanks(stat, state.skillRanks);
}

function ownsItem(id, source = state) {
    const item = Object.hasOwn(itemById, id) ? itemById[id] : null;
    return Boolean(item && (item.developerOnly
        ? source.developerItemsEnabled === true
        : source.ownedItemIds.includes(id)));
}

function getEquippedItems() {
    return Object.values(state.gear).filter(id => ownsItem(id)).map(id => itemById[id]);
}

function getGearStat(stat) {
    return Equipment.aggregate(getEquippedItems(), stat);
}

function getPlayerMaxHealth() {
    return Math.max(1, Math.round((basePlayerMaxHealth + getSkillStat('health') + getGearStat('health')) *
        getSkillMultiplier('healthMultiplier') * getGearStat('healthMultiplier')));
}

function getSkillMultiplier(stat) {
    return Object.entries(state.skillRanks).reduce((total, [id, rank]) => {
        const node = skillNodeById[id];
        if (!node || !rank) return total;
        if (stat === 'attackSpeedMultiplier' && node.stats.attackSpeedPerLevel) {
            total *= Math.pow(1 + node.stats.attackSpeedPerLevel, state.level * rank);
        }
        return total * Math.pow(node.stats[stat] || 1, rank);
    }, 1);
}

function getDamage() {
    return Math.max(1, Math.round((2 + state.upgrades.strength * 2 + getGearStat('damage') +
        getSkillStat('damage')) * getSkillMultiplier('damageMultiplier') * getGearStat('damageMultiplier')));
}

function getMultiHit() {
    const value = (baseMultiHit + getSkillStat('multiHit') + getGearStat('multiHit')) *
        getSkillMultiplier('multiHitMultiplier') * getGearStat('multiHitMultiplier');
    return Math.max(1, Math.round(value * 100) / 100);
}

function getPlayerAccuracy() {
    return Math.max(0, (playerAccuracy + getSkillStat('accuracy') + getGearStat('accuracy')) *
        getSkillMultiplier('accuracyMultiplier') * getGearStat('accuracyMultiplier'));
}

function getAttackSpeedMultiplier() {
    return getSkillMultiplier('attackSpeedMultiplier') * getGearStat('attackSpeedMultiplier') *
        Math.max(0.01, 1 + getSkillStat('attackSpeedBonus')) / Math.pow(0.92, state.upgrades.haste);
}

function getAttackSpeed() {
    return Math.max(getGearStat('minimumAttackInterval'), 1.2 / getAttackSpeedMultiplier());
}

function getPlayerEvasion() {
    return Math.max(0, Math.round((basePlayerEvasion + state.upgrades.evasion * 5 + getGearStat('evasion') +
        getSkillStat('evasion')) * getSkillMultiplier('evasionMultiplier') * getGearStat('evasionMultiplier')));
}

function getHitChance(accuracy, evasion) {
    return Math.max(5, Math.min(95, accuracy - evasion));
}

function getEnemyHitChance() {
    return Math.max(getGearStat('minimumEnemyHitChance'), Math.min(95, currentMap().accuracy - getPlayerEvasion()));
}

function setAccuracyClass(element, hitChance, isPlayerAttack) {
    const classes = ['accuracy-good', 'accuracy-caution', 'accuracy-warning', 'accuracy-danger'];
    const colorIndex = hitChance >= 81
        ? (isPlayerAttack ? 0 : 3)
        : hitChance >= 51
            ? (isPlayerAttack ? 1 : 2)
            : hitChance >= 21
                ? (isPlayerAttack ? 2 : 1)
                : (isPlayerAttack ? 3 : 0);
    element.classList.remove(...classes);
    element.classList.add(classes[colorIndex]);
}

function getGoldMultiplier() {
    return Math.max(0, (1 + getGearStat('goldBonus') + getSkillStat('goldBonus')) *
        getSkillMultiplier('goldBonusMultiplier') * getGearStat('goldBonusMultiplier'));
}

function skillNodeIsAllocated(id) {
    return Boolean(skillNodeById[id] && skillNodeById[id].start) || getSkillNodeRank(id) > 0;
}

function skillNodeIsAvailable(node) {
    return node.start || (getSkillNodeRank(node.id) < node.maxRank &&
        skillNodeRequirementsMet(node, skillNodeIsAllocated));
}

function skillNodeRequirementsMet(node, isAllocated) {
    if (node.requires.length === 0) return true;
    return node.requiresMode === 'any'
        ? node.requires.some(isAllocated)
        : node.requires.every(isAllocated);
}

function mapsForWorld(worldId) {
    const world = worldData.find(entry => entry.id === worldId);
    return world ? world.mapIds.map(id => mapData.find(map => map.id === id)).filter(Boolean) : [];
}

function worldForMap(mapId) {
    return worldData.find(world => world.mapIds.includes(mapId));
}

function worldIsUnlocked(index) {
    if (index === 0) return true;
    const previousWorld = worldData[index - 1];
    const finalMapId = previousWorld.mapIds[previousWorld.mapIds.length - 1];
    const finalMap = mapData.find(map => map.id === finalMapId);
    if (!finalMap) return false;
    return state.kills[finalMap.id] >= finalMap.goal;
}

function worldSelectorIsUnlocked() {
    return worldData.length > 1 && worldIsUnlocked(1);
}

function mapIsUnlocked(maps, index) {
    if (index === 0) return true;
    return state.kills[maps[index - 1].id] >= maps[index - 1].goal;
}

function nextUnlockedMap() {
    const maps = mapsForWorld(state.selectedWorld);
    const currentIndex = maps.findIndex(map => map.id === state.selectedMap);
    for (let index = currentIndex + 1; index < maps.length; index++) {
        if (mapIsUnlocked(maps, index)) return maps[index];
    }
    return null;
}

function formatAmount(amount) {
    return Math.floor(amount).toLocaleString('en-US');
}

function saveGame() {
    try {
        localStorage.setItem(saveKey, JSON.stringify({
            version: 3,
            gold: state.gold,
            kills: state.kills,
            materials: state.materials,
            upgrades: state.upgrades,
            level: state.level,
            experience: state.experience,
            skillPoints: state.skillPoints,
            skillRanks: state.skillRanks,
            gear: state.gear,
            ownedItemIds: state.ownedItemIds,
            developerItemsEnabled: state.developerItemsEnabled,
            crafted: state.crafted,
            tutorials: state.tutorials,
            selectedWorld: state.selectedWorld,
            lastMapByWorld: state.lastMapByWorld,
            selectedMap: state.selectedMap,
            currentView: state.currentView,
            enemyHp: state.enemyHp,
            enemyRespawnRemaining: state.enemyRespawnRemaining,
            monsterStates: state.monsterStates,
            targetMonsterId: state.targetMonsterId,
            playerHp: state.playerHp,
            combatPaused: state.combatPaused,
            lootLog: state.lootLog.slice(0, 12),
            lastDrop: state.lastDrop
        }));
        lastSave = Date.now();
    } catch (error) {
        console.error('Could not save Idle Adventure progress.', error);
    }
}

function loadGame() {
    try {
        const rawSave = localStorage.getItem(saveKey);
        if (!rawSave) return false;

        const saved = JSON.parse(rawSave);
        if (saved && saved.version === 1) {
            if (Number.isInteger(saved.level) && saved.level >= 1) saved.level--;
            saved.version = 2;
        }
        if (saved && saved.gear && typeof saved.gear === 'object' && !Array.isArray(saved.gear)) {
            if (saved.gear.chest === undefined && saved.gear.armor !== undefined) {
                saved.gear.chest = saved.gear.armor;
            }
            delete saved.gear.armor;
            gearSlots.forEach(slot => {
                if (saved.gear[slot] === undefined) saved.gear[slot] = null;
            });
        }
        if (saved && saved.version === 2 && Array.isArray(saved.crafted)) {
            saved.ownedItemIds = [...new Set([
                ...saved.crafted,
                ...Object.keys(saved.uniqueItems || {}).filter(id => saved.uniqueItems[id] === true)
            ])];
            saved.developerItemsEnabled = false;
            saved.version = 3;
        }
        // Content edits can remove items or change their slots without invalidating all progress.
        if (saved && saved.version === 3 && Array.isArray(saved.ownedItemIds) && Array.isArray(saved.crafted)) {
            saved.ownedItemIds = [...new Set(saved.ownedItemIds.filter(id => typeof id === 'string' && Object.hasOwn(itemById, id)))];
            saved.crafted = [...new Set(saved.crafted.filter(id => saved.ownedItemIds.includes(id) && itemById[id].recipe))];
            if (saved.gear && typeof saved.gear === 'object' && !Array.isArray(saved.gear)) {
                gearSlots.forEach(slot => {
                    const item = itemById[saved.gear[slot]];
                    if (!item || item.slot !== slot || !ownsItem(item.id, saved)) saved.gear[slot] = null;
                });
            }
            if (saved.tutorials && saved.tutorials.firstGearItemId &&
                (!ownsItem(saved.tutorials.firstGearItemId, saved) ||
                itemById[saved.tutorials.firstGearItemId].slot !== saved.tutorials.firstGearSlot)) {
                Object.assign(saved.tutorials, {
                    firstGearPending: false, firstGearItemId: null, firstGearSlot: null,
                    firstGearSlotSelected: false
                });
            }
        }
        if (saved && saved.tutorials === undefined) {
            saved.tutorials = createTutorialState();
            saved.tutorials.firstGearPrompted =
                (Array.isArray(saved.crafted) && saved.crafted.length > 0) ||
                (Array.isArray(saved.ownedItemIds) && saved.ownedItemIds.length > 0) ||
                (saved.gear && Object.values(saved.gear).some(itemId => itemId !== null));
        }
        if (saved && saved.tutorials && saved.tutorials.firstNextMapPending === undefined) {
            saved.tutorials.firstNextMapPending = false;
        }
        if (saved && saved.tutorials) {
            [
                'firstSkillPointDismissed',
                'firstNextMapDismissed',
                'firstMapGoalPending',
                'firstMapGoalDismissed',
                'firstGearDismissed'
            ]
                .forEach(key => {
                    if (saved.tutorials[key] === undefined) saved.tutorials[key] = false;
                });
        }
        if (saved && saved.level === undefined) {
            let migratedExperience = 0;
            const hasValidKillHistory = saved.kills &&
                mapData.every(map => saved.kills[map.id] === undefined ||
                    (Number.isSafeInteger(saved.kills[map.id]) && saved.kills[map.id] >= 0));
            if (hasValidKillHistory) {
                migratedExperience = mapData.reduce((total, map) =>
                    total + (saved.kills[map.id] || 0) * map.experience, 0);
                if (!Number.isSafeInteger(migratedExperience)) migratedExperience = 0;
            }
            let migratedLevel = 0;
            while (migratedExperience >= experienceForNextLevel(migratedLevel)) {
                migratedExperience -= experienceForNextLevel(migratedLevel);
                migratedLevel++;
            }
            saved.level = migratedLevel;
            saved.experience = migratedExperience;
            saved.skillPoints = migratedLevel;
            saved.skillRanks = {};
        }
        if (saved && saved.experience === undefined) saved.experience = 0;
        if (saved && saved.skillPoints === undefined) saved.skillPoints = 0;
        if (saved && Number.isInteger(saved.level) && Number.isInteger(saved.experience) &&
            Number.isInteger(saved.skillPoints)) {
            const previousLevel = saved.level;
            while (saved.experience >= experienceForNextLevel(saved.level)) {
                saved.experience -= experienceForNextLevel(saved.level);
                saved.level++;
                saved.skillPoints++;
            }
            if (previousLevel < 1 && saved.level >= 1 && saved.tutorials) {
                saved.tutorials.firstSkillPointPending = true;
                saved.tutorials.firstSkillPointDismissed = false;
            }
        }
        if (saved && saved.skillRanks === undefined) {
            saved.skillRanks = Array.isArray(saved.skillNodes)
                ? Object.fromEntries(saved.skillNodes.map(id => [id, 1]))
                : {};
        }
        if (saved) delete saved.skillNodes;
        if (saved && saved.skillRanks && typeof saved.skillRanks === 'object' && !Array.isArray(saved.skillRanks)) {
            let refundedRanks = 0;
            Object.entries(saved.skillRanks).forEach(([id, rank]) => {
                if (!skillNodeById[id] || skillNodeById[id].start || !Number.isInteger(rank) || rank <= 1) return;
                refundedRanks += rank - 1;
                saved.skillRanks[id] = 1;
            });
            saved.skillPoints += refundedRanks;
        }
        if (
            saved &&
            saved.upgrades &&
            typeof saved.upgrades === 'object' &&
            !Array.isArray(saved.upgrades) &&
            saved.upgrades.evasion === undefined
        ) {
            saved.upgrades.evasion = 0;
        }
        if (
            saved &&
            saved.kills &&
            typeof saved.kills === 'object' &&
            !Array.isArray(saved.kills)
        ) {
            mapData.forEach(map => {
                if (saved.kills[map.id] === undefined) saved.kills[map.id] = 0;
            });
        }
        if (
            saved &&
            saved.materials &&
            typeof saved.materials === 'object' &&
            !Array.isArray(saved.materials)
        ) {
            Object.keys(materialNames).forEach(id => {
                if (saved.materials[id] === undefined) saved.materials[id] = 0;
            });
            ['cinderHoof', 'singedMane'].forEach(id => {
                if (!Number.isInteger(saved.materials[id]) || saved.materials[id] < 0) {
                    saved.materials[id] = 0;
                }
            });
        }
        if (
            saved === null ||
            saved.version !== 3 ||
            !Number.isFinite(saved.gold) || saved.gold < 0 ||
            !saved.kills || !saved.materials || !saved.upgrades ||
            !saved.gear || typeof saved.gear !== 'object' || Array.isArray(saved.gear) ||
            !Array.isArray(saved.crafted) ||
            !Number.isInteger(saved.level) || saved.level < 0 ||
            !Number.isInteger(saved.experience) || saved.experience < 0 ||
            saved.experience >= experienceForNextLevel(saved.level) ||
            !Number.isInteger(saved.skillPoints) || saved.skillPoints < 0 ||
            !saved.skillRanks || typeof saved.skillRanks !== 'object' || Array.isArray(saved.skillRanks) ||
            !Array.isArray(saved.ownedItemIds) ||
            !saved.ownedItemIds.every(id => typeof id === 'string' && Object.hasOwn(itemById, id)) ||
            typeof saved.developerItemsEnabled !== 'boolean' ||
            !saved.tutorials || typeof saved.tutorials !== 'object' ||
            Array.isArray(saved.tutorials) ||
            typeof saved.tutorials.firstSkillPointPending !== 'boolean' ||
            typeof saved.tutorials.firstSkillPointDismissed !== 'boolean' ||
            typeof saved.tutorials.firstNextMapPending !== 'boolean' ||
            typeof saved.tutorials.firstNextMapDismissed !== 'boolean' ||
            typeof saved.tutorials.firstMapGoalPending !== 'boolean' ||
            typeof saved.tutorials.firstMapGoalDismissed !== 'boolean' ||
            typeof saved.tutorials.firstGearPrompted !== 'boolean' ||
            typeof saved.tutorials.firstGearPending !== 'boolean' ||
            typeof saved.tutorials.firstGearDismissed !== 'boolean' ||
            typeof saved.tutorials.firstGearSlotSelected !== 'boolean' ||
            (saved.tutorials.firstGearSlot !== null &&
                !gearSlots.includes(saved.tutorials.firstGearSlot)) ||
            (saved.tutorials.firstGearItemId !== null &&
                typeof saved.tutorials.firstGearItemId !== 'string') ||
            ((saved.tutorials.firstGearSlot === null) !==
                (saved.tutorials.firstGearItemId === null)) ||
            (!saved.tutorials.firstGearPrompted && saved.tutorials.firstGearSlot !== null) ||
            (saved.tutorials.firstGearPending && (
                !saved.tutorials.firstGearPrompted ||
                saved.tutorials.firstGearSlot === null ||
                !(ownsItem(saved.tutorials.firstGearItemId, saved) &&
                    itemById[saved.tutorials.firstGearItemId].slot === saved.tutorials.firstGearSlot)
            )) ||
            !mapData.some(map => map.id === saved.selectedMap) ||
            (saved.selectedWorld !== undefined && typeof saved.selectedWorld !== 'string') ||
            (saved.lastMapByWorld !== undefined && (
                typeof saved.lastMapByWorld !== 'object' ||
                saved.lastMapByWorld === null ||
                Array.isArray(saved.lastMapByWorld)
            )) ||
            (saved.currentView !== undefined && !['map', 'town', 'upgrades', 'inventory'].includes(saved.currentView)) ||
            !Number.isFinite(saved.enemyHp) || saved.enemyHp < 0 ||
            (saved.enemyHp === 0 && !(Number.isFinite(saved.enemyRespawnRemaining) &&
                saved.enemyRespawnRemaining > 0)) ||
            (saved.enemyRespawnRemaining !== undefined &&
                (!Number.isFinite(saved.enemyRespawnRemaining) || saved.enemyRespawnRemaining < 0 ||
                    saved.enemyRespawnRemaining > 60)) ||
            (saved.monsterStates !== undefined && (!Array.isArray(saved.monsterStates) ||
                !saved.monsterStates.every(monster => monster && typeof monster.id === 'string' &&
                    Number.isFinite(monster.hp) && monster.hp >= 0 &&
                    Number.isFinite(monster.respawnRemaining) && monster.respawnRemaining >= 0 &&
                    monster.respawnRemaining <= 60 &&
                    (monster.attackTimer === undefined ||
                        Number.isFinite(monster.attackTimer) && monster.attackTimer >= 0) &&
                    (monster.poisonStacks === undefined || Array.isArray(monster.poisonStacks) &&
                        monster.poisonStacks.every(stack => stack &&
                            Number.isFinite(stack.remainingDuration) && stack.remainingDuration > 0 &&
                            stack.remainingDuration <= 60 && Number.isFinite(stack.timeUntilTick) &&
                            stack.timeUntilTick > 0 && stack.timeUntilTick <= 10))))) ||
            (saved.targetMonsterId !== undefined && typeof saved.targetMonsterId !== 'string') ||
            (saved.playerHp !== undefined && (!Number.isFinite(saved.playerHp) || saved.playerHp < 0)) ||
            (saved.combatPaused !== undefined && typeof saved.combatPaused !== 'boolean') ||
            (saved.lootLog !== undefined && !Array.isArray(saved.lootLog))
        ) {
            throw new Error('Save data has an invalid format.');
        }

        const nonnegativeInteger = value => Number.isInteger(value) && value >= 0;
        if (
            !mapData.every(map => nonnegativeInteger(saved.kills[map.id])) ||
            !Object.keys(materialNames).every(id => nonnegativeInteger(saved.materials[id])) ||
            !legacyUpgradeIds.every(id => nonnegativeInteger(saved.upgrades[id])) ||
            !saved.crafted.every(id => recipes.some(recipe => recipe.id === id)) ||
            !Object.entries(saved.skillRanks).every(([id, rank]) => {
                const node = skillNodeById[id];
                return node && !node.start && Number.isInteger(rank) && rank > 0 &&
                    rank <= node.maxRank && skillNodeRequirementsMet(node, required => {
                        const requiredNode = skillNodeById[required];
                        return requiredNode.start || saved.skillRanks[required] > 0;
                    });
            }) ||
            saved.skillPoints + Object.values(saved.skillRanks).reduce((total, rank) => total + rank, 0) !==
                saved.level ||
            !gearSlots.every(slot => saved.gear[slot] === null || (
                ownsItem(saved.gear[slot], saved) && itemById[saved.gear[slot]].slot === slot
            ))
        ) {
            throw new Error('Save data has an invalid format.');
        }

        state.gold = saved.gold;
        state.kills = saved.kills;
        state.materials = saved.materials;
        state.upgrades = saved.upgrades;
        state.level = saved.level;
        state.experience = saved.experience;
        state.skillPoints = saved.skillPoints;
        state.skillRanks = saved.skillRanks;
        state.gear = saved.gear;
        state.ownedItemIds = saved.ownedItemIds;
        state.developerItemsEnabled = saved.developerItemsEnabled;
        state.crafted = saved.crafted;
        state.tutorials = saved.tutorials;
        state.selectedMap = saved.selectedMap;
        const savedMapWorld = worldForMap(saved.selectedMap) || worldData[0];
        const savedWorldIndex = worldData.findIndex(world => world.id === saved.selectedWorld);
        const savedMapWorldIndex = worldData.findIndex(world => world.id === savedMapWorld.id);
        const fallbackWorld = savedMapWorldIndex >= 0 && worldIsUnlocked(savedMapWorldIndex)
            ? savedMapWorld
            : worldData.find((world, index) => worldIsUnlocked(index));
        state.selectedWorld = savedWorldIndex >= 0 && worldIsUnlocked(savedWorldIndex)
            ? saved.selectedWorld
            : fallbackWorld.id;
        state.lastMapByWorld = Object.fromEntries(worldData.map(world => {
            const savedMap = saved.lastMapByWorld && saved.lastMapByWorld[world.id];
            const maps = mapsForWorld(world.id);
            const savedMapIndex = maps.findIndex(map => map.id === savedMap);
            const fallbackMap = maps.reduce((fallback, map, index) =>
                mapIsUnlocked(maps, index) ? map : fallback, maps[0]);
            const selectedMap = savedMapIndex >= 0 && mapIsUnlocked(maps, savedMapIndex)
                ? savedMap
                : world.id === savedMapWorld.id &&
                    maps.some((map, index) => map.id === saved.selectedMap && mapIsUnlocked(maps, index))
                    ? saved.selectedMap
                    : fallbackMap.id;
            return [world.id, selectedMap];
        }));
        const selectedWorldMaps = mapsForWorld(state.selectedWorld);
        const selectedMapIndex = selectedWorldMaps.findIndex(map => map.id === state.selectedMap);
        const selectedMapChanged = selectedMapIndex < 0 || !mapIsUnlocked(selectedWorldMaps, selectedMapIndex);
        if (selectedMapChanged) {
            state.selectedMap = state.lastMapByWorld[state.selectedWorld];
        }
        state.lastMapByWorld[state.selectedWorld] = state.selectedMap;
        state.currentView = saved.currentView || (saved.isInTown === false ? 'map' : 'town');
        state.isInTown = state.currentView !== 'map';
        state.monsterStates = selectedMapChanged
            ? createMonsterStates(currentMap())
            : createMonsterStates(currentMap(), saved.monsterStates, saved.enemyHp, saved.enemyRespawnRemaining);
        state.targetMonsterId = !selectedMapChanged && monsterDefinitions(currentMap())
            .some(definition => definition.id === saved.targetMonsterId)
            ? saved.targetMonsterId
            : null;
        if (!state.targetMonsterId) setInitialMonsterTarget();
        syncLegacyEnemyState();
        state.playerHp = saved.playerHp === undefined
            ? getPlayerMaxHealth()
            : Math.min(saved.playerHp, getPlayerMaxHealth());
        state.combatPaused = saved.combatPaused === true || state.playerHp === 0;
        state.lootLog = Array.isArray(saved.lootLog)
            ? saved.lootLog.filter(entry => typeof entry === 'string').slice(0, 12)
            : [];
        state.lastDrop = typeof saved.lastDrop === 'string' ? saved.lastDrop : 'Defeat enemies to find loot.';
        return true;
    } catch (error) {
        console.error('Could not load Idle Adventure progress.', error);
        state.lootLog = [];
        return false;
    }
}

function addLootDrop(gold, found) {
    const drops = ['+' + gold + ' gold'].concat(found);
    state.lootLog.unshift(drops.join(' · '));
    state.lootLog = state.lootLog.slice(0, 12);
}

function renderWorlds() {
    const existingWorldIds = Array.from(elements.worldList.children)
        .map(button => button.dataset.world);
    if (existingWorldIds.length !== worldData.length ||
        worldData.some((world, index) => existingWorldIds[index] !== world.id)) {
        elements.worldList.innerHTML = '';
        worldData.forEach(world => {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.world = world.id;
            const name = document.createElement('strong');
            const status = document.createElement('span');
            button.append(name, status);
            elements.worldList.appendChild(button);
        });
    }

    worldData.forEach((world, index) => {
        const maps = mapsForWorld(world.id);
        const unlocked = worldIsUnlocked(index);
        const completed = maps.filter(map => state.kills[map.id] >= map.goal).length;
        const button = elements.worldList.children[index];
        button.className = 'world-button' + (state.selectedWorld === world.id ? ' selected' : '');
        button.disabled = !unlocked;

        button.querySelector('strong').textContent = world.name;
        if (unlocked) {
            button.querySelector('span').textContent = completed + ' / ' + maps.length + ' maps cleared';
        } else {
            const previousWorld = worldData[index - 1];
            const previousMapId = previousWorld.mapIds[previousWorld.mapIds.length - 1];
            const previousMap = mapData.find(map => map.id === previousMapId);
            button.querySelector('span').textContent = previousMap ? 'Unlock after ' + previousMap.name : 'Locked';
        }
        button.setAttribute('aria-pressed', String(state.selectedWorld === world.id));
    });
}

function renderMaps() {
    const maps = mapsForWorld(state.selectedWorld);
    const selectedWorld = worldData.find(world => world.id === state.selectedWorld);
    document.querySelector('#worldMapsHeading').textContent =
        selectedWorld ? selectedWorld.name + ' Maps' : 'Maps';
    const existingMapIds = Array.from(elements.mapList.children)
        .map(button => button.dataset.map);
    if (existingMapIds.length !== maps.length ||
        maps.some((map, index) => existingMapIds[index] !== map.id)) {
        elements.mapList.innerHTML = '';
        maps.forEach(map => {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.map = map.id;
            button.innerHTML = '<strong></strong><span></span><i class="map-progress-fill" aria-hidden="true"></i>';
            elements.mapList.appendChild(button);
        });
    }

    elements.mapList.classList.toggle('collapsed', !state.mapListExpanded);
    elements.mapList.setAttribute('aria-expanded', String(state.mapListExpanded));
    elements.mapPanel.classList.toggle('is-collapsed', !state.mapListExpanded);
    elements.mapSelectionHint.textContent = state.mapListExpanded
        ? 'Click the current map to browse destinations.'
        : 'Click your current map to change destination.';
    elements.mapSelectionHint.setAttribute('aria-hidden', String(!state.mapListExpanded));
    maps.forEach((map, index) => {
        const unlocked = mapIsUnlocked(maps, index);
        const button = elements.mapList.children[index];
        const progress = state.kills[map.id];
        const completed = progress >= map.goal;
        const progressPercent = Math.min(100, progress / map.goal * 100);
        const tutorialNextMap = nextUnlockedMap();
        button.className = 'map-button ' + (unlocked ? (completed ? 'completed' : 'incomplete') : 'locked') +
            (state.selectedMap === map.id ? ' selected' : '') +
            ((state.tutorials.firstNextMapPending || state.tutorials.firstMapGoalPending) &&
                tutorialNextMap === map ? ' tutorial-highlight' : '');
        button.querySelector('.map-progress-fill').style.width = progressPercent + '%';
        button.disabled = !unlocked;
        button.setAttribute('aria-pressed', String(state.selectedMap === map.id));
        button.setAttribute('aria-label', map.name + '. ' +
            (unlocked ? (completed ? progress + ' kills' : progress + ' / ' + map.goal + ' kills') : 'Unlock after ' + maps[index - 1].goal + ' kills') +
            (state.selectedMap === map.id ? '. Current map. Click to ' +
                (state.mapListExpanded ? 'collapse' : 'show all maps') + '.' : '.'));
        button.querySelector('strong').textContent = map.name;
        button.querySelector('span').textContent =
            unlocked ? (completed ? progress + ' kills' : progress + ' / ' + map.goal + ' kills') :
                'Unlock after ' + maps[index - 1].goal + ' kills';
    });
    elements.progressSummary.textContent =
        maps.filter((map, index) => mapIsUnlocked(maps, index)).length + ' / ' + maps.length + ' maps unlocked';
}

function renderUpgrades() {
    const spentPoints = Object.values(state.skillRanks).reduce((total, rank) => total + rank, 0);
    let board = elements.upgrades.querySelector('.skill-tree-board');

    if (!board) {
        elements.upgrades.innerHTML = '';

        const viewport = document.createElement('div');
        viewport.className = 'skill-tree-viewport';
        board = document.createElement('div');
        board.className = 'skill-tree-board';
        const gridCoordinate = value => {
            const coordinate = Number(value);
            return Number.isFinite(coordinate) ? coordinate : 1;
        };
        const columnOffset = Math.max(0, 1 - Math.min(1, ...skillNodes.map(node => gridCoordinate(node.column))));
        const rowOffset = Math.max(0, 1 - Math.min(1, ...skillNodes.map(node => gridCoordinate(node.row))));
        const gridColumn = node => gridCoordinate(node.column) + columnOffset;
        const gridRow = node => gridCoordinate(node.row) + rowOffset;
        const gridColumnCount = Math.max(5, ...skillNodes.map(node => gridColumn(node)));
        const gridRowCount = Math.max(5, ...skillNodes.map(node => gridRow(node)));
        board.style.width = Math.max(800, gridColumnCount * 160) + 'px';
        board.style.height = Math.max(800, gridRowCount * 160) + 'px';
        board.style.gridTemplateColumns = 'repeat(' + gridColumnCount + ', minmax(0, 1fr))';
        board.style.gridTemplateRows = 'repeat(' + gridRowCount + ', 160px)';
        const startingNode = skillNodes.find(node => node.start);
        if (startingNode) {
            board.style.setProperty('--skill-tree-background-x', ((gridColumn(startingNode) - 0.5) * 160) + 'px');
            board.style.setProperty('--skill-tree-background-y', ((gridRow(startingNode) - 0.5) * 160) + 'px');
        }
        // Keep the existing nodes in place when the coordinates need a positive CSS grid offset.
        skillTreePanX -= columnOffset * 160 * skillTreeZoom;
        skillTreePanY -= rowOffset * 160 * skillTreeZoom;
        const skillPointsBar = document.querySelector('.skill-points-bar');
        if (skillPointsBar) {
            viewport.appendChild(skillPointsBar);
            if (!skillPointsBar.querySelector('#skillPointsTotalDisplay')) {
                const totalDisplay = document.createElement('span');
                totalDisplay.id = 'skillPointsTotalDisplay';
                totalDisplay.className = 'skill-points-total';
                skillPointsBar.prepend(totalDisplay);
            }
            [['confirmSkillSelection', 'Confirm'], ['clearSkillSelection', 'Clear'], ['refundSkillPoints', 'Refund points'], ['resetSkillTree', 'Reset tree']].forEach(([id, label]) => {
                if (skillPointsBar.querySelector('#' + id)) return;
                const button = document.createElement('button');
                button.type = 'button';
                button.id = id;
                button.dataset.skillTreeControl = 'true';
                button.className = 'skill-tree-control';
                button.textContent = label;
                skillPointsBar.appendChild(button);
            });
        }
        const links = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        links.classList.add('skill-tree-links');
        links.setAttribute('viewBox', '0 0 ' + (gridColumnCount * 200) + ' ' + (gridRowCount * 160));
        links.setAttribute('preserveAspectRatio', 'none');
        links.setAttribute('aria-hidden', 'true');

        skillNodes.forEach(node => {
            node.requires.forEach(requiredId => {
                const requiredNode = skillNodeById[requiredId];
                const link = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                link.setAttribute('x1', String((gridColumn(requiredNode) - 0.5) * 200));
                link.setAttribute('y1', String((gridRow(requiredNode) - 0.5) * 160));
                link.setAttribute('x2', String((gridColumn(node) - 0.5) * 200));
                link.setAttribute('y2', String((gridRow(node) - 0.5) * 160));
                link.dataset.skillNodeSource = requiredId;
                link.dataset.skillNodeLink = node.id;
                link.classList.add('skill-tree-link');
                links.appendChild(link);
            });
        });
        board.appendChild(links);

        skillNodes.forEach(node => {
            const button = document.createElement('button');
            button.type = 'button';
            button.style.gridColumn = String(gridColumn(node));
            button.style.gridRow = String(gridRow(node));
            const size = [1, 1.25, 1.5].includes(Number(node.size)) ? Number(node.size) : 1;
            button.style.width = 78 * size + 'px';
            button.style.height = 78 * size + 'px';
            button.dataset.skillNode = node.id;

            const icon = SkillSprites.icon(node, 'skill-node-icon');
            button.appendChild(icon);
            if (!node.start) {
                const name = document.createElement('strong');
                name.className = 'skill-node-name';
                name.textContent = node.name;
                const effect = document.createElement('span');
                effect.className = 'skill-node-effect';
                effect.textContent = node.effect;
                const status = document.createElement('span');
                status.className = 'skill-node-status';
                button.append(name, effect, status);
            }
            board.appendChild(button);
        });
        viewport.appendChild(board);
        const tooltip = document.createElement('div');
        tooltip.id = 'skillNodeTooltip';
        tooltip.className = 'skill-node-tooltip';
        tooltip.setAttribute('role', 'tooltip');
        tooltip.hidden = true;
        tooltip.innerHTML = '<strong></strong><span></span>';
        viewport.appendChild(tooltip);
        elements.upgrades.appendChild(viewport);
    }

    // Apply zoom and pan transform (only if board exists)
    if (board) {
        const viewport = board.parentElement;
        clampSkillTreePan(viewport, board);
        board.style.transform = 'translate(' + skillTreePanX + 'px, ' + skillTreePanY + 'px) scale(' + skillTreeZoom + ')';
    }

    // Update the skill points display bar
    const skillPointsDisplay = document.querySelector('#skillPointsDisplay');
    const pendingPointCount = getPendingSkillPointCount();
    const plannedRanks = getPlannedSkillRanks();
    const committedPoints = Object.values(state.skillRanks).reduce((total, rank) => total + rank, 0);
    const totalPointsDisplay = document.querySelector('#skillPointsTotalDisplay');
    if (totalPointsDisplay) totalPointsDisplay.textContent = 'Total points: ' + (committedPoints + state.skillPoints);
    if (skillPointsDisplay) {
        skillPointsDisplay.textContent = 'Available points: ' + state.skillPoints + ' (' + pendingPointCount + ')';
    }
    const confirmButton = document.querySelector('#confirmSkillSelection');
    const clearButton = document.querySelector('#clearSkillSelection');
    const refundButton = document.querySelector('#refundSkillPoints');
    const resetTreeButton = document.querySelector('#resetSkillTree');
    if (confirmButton) {
        confirmButton.hidden = pendingPointCount === 0;
        confirmButton.disabled = pendingPointCount > state.skillPoints;
        confirmButton.classList.toggle('tutorial-skill-confirm',
            state.tutorials.firstSkillPointPending && pendingPointCount > 0);
    }
    if (clearButton) clearButton.hidden = pendingPointCount === 0;
    if (refundButton) {
        refundButton.classList.toggle('is-active', refundMode);
        refundButton.setAttribute('aria-pressed', String(refundMode));
        refundButton.title = pendingPointCount > 0
            ? 'Confirm or clear pending points before refunding.'
            : refundMode
                ? 'Click allocated nodes to refund points. Dependent nodes must be refunded first.'
                : 'Enter refund mode to refund individual skill points.';
    }
    if (resetTreeButton) resetTreeButton.disabled =
        Object.values(state.skillRanks).every(rank => rank === 0) && pendingPointCount === 0;

    skillNodes.forEach(node => {
        const committedRank = getSkillNodeRank(node.id);
        const rank = plannedRanks[node.id] || 0;
        const allocatedForPlan = id => Boolean(skillNodeById[id] && skillNodeById[id].start) ||
            (plannedRanks[id] || 0) > 0;
        const available = node.start || skillNodeRequirementsMet(node, allocatedForPlan);
        const canAllocate = !node.start && available && rank < node.maxRank && pendingPointCount < state.skillPoints;
        const canDeselect = !node.start && canDeselectPendingSkillNode(node.id);
        const button = board.querySelector('[data-skill-node="' + node.id + '"]');
        const nodeSize = [1, 1.25, 1.5].includes(Number(node.size)) ? Number(node.size) : 1;
        const baseNodeSize = 78 * nodeSize;
        const displayedNodeSize = node.start
            ? Math.min(130, baseNodeSize / Math.max(skillTreeZoom, 0.1))
            : baseNodeSize;
        button.style.width = displayedNodeSize + 'px';
        button.style.height = displayedNodeSize + 'px';
        button.style.minWidth = displayedNodeSize + 'px';
        button.style.minHeight = displayedNodeSize + 'px';
        if (node.start) {
            const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
            button.querySelector('.skill-node-icon').style.fontSize = displayedNodeSize * 1.8 * rootFontSize / 78 + 'px';
        }
        button.className = 'skill-node' +
            (node.start ? ' is-origin is-allocated' : '') +
            (['health', 'attackSpeed', 'accuracy', 'damage'].includes(node.type) ? ' is-base-' + node.type : '') +
            (committedRank > 0 && !node.start ? ' is-allocated' : '') +
            (refundMode && committedRank > 0 ? ' is-refundable' : '') +
            (rank > committedRank && !node.start ? ' is-pending' : '') +
            (!node.start && !available && rank === 0 ? ' is-locked' : '') +
            (canAllocate ? ' is-available' : '') +
            (!node.start && available && pendingPointCount >= state.skillPoints && rank < node.maxRank ? ' needs-point' : '');
        // The origin is interactive only to recenter the skill tree camera.
        button.disabled = !node.start && committedRank === 0 && !canAllocate && !canDeselect;
        const labelParts = [node.name, node.effect];
        if (node.start) {
            labelParts.push('Starting node');
        } else {
            labelParts.push(committedRank > 0 ? (refundMode ? 'Click to refund one point' : 'Already selected') :
                rank > 0 ? 'Selected, pending confirmation' : 'Not selected');
            labelParts.push(canDeselect ? 'Click to deselect' :
                pendingSkillRanks[node.id] ? 'Required by another selected node' :
                    available && pendingPointCount < state.skillPoints && rank < node.maxRank ? 'Click to select' :
                        available && rank < node.maxRank ? 'No unspent skill points available' :
                            rank >= node.maxRank ? 'Already selected' : 'Locked');
        }
        button.setAttribute('aria-label', labelParts
            .map(part => String(part || '').replace(/[.!?]+$/, ''))
            .filter(Boolean)
            .join('. ') + '.');
        button.removeAttribute('title');
        button.setAttribute('aria-describedby', 'skillNodeTooltip');
        const status = button.querySelector('.skill-node-status');
        if (status) {
            status.textContent = rank > 0 ? (committedRank > 0 ? 'SELECTED' : 'PENDING') :
                canAllocate ? 'AVAILABLE' : available ? 'NEED POINT' : 'LOCKED';
        }
    });
    board.querySelectorAll('[data-skill-node-link]').forEach(link => {
        link.classList.toggle('is-active', skillNodeIsAllocated(link.dataset.skillNodeLink));
        link.classList.toggle('is-pending', Boolean(pendingSkillRanks[link.dataset.skillNodeLink]));
        link.classList.toggle('tutorial-skill-link',
            state.tutorials.firstSkillPointPending &&
            state.skillPoints > 0 &&
            pendingPointCount === 0 &&
            link.dataset.skillNodeSource === 'origin');
    });
}

function renderCrafting() {
    elements.crafts.innerHTML = '';
    const canCraftRecipe = recipe => !ownsItem(recipe.id) && (!recipe.developerOnly || state.developerItemsEnabled) && Object.entries(recipe.materials)
        .every(([id, amount]) => state.materials[id] >= amount);
    const craftedCount = recipes.filter(recipe => state.crafted.includes(recipe.id)).length;
    const craftableCount = recipes.filter(recipe => !state.crafted.includes(recipe.id) && canCraftRecipe(recipe)).length;
    elements.craftingSummary.textContent = craftableCount + ' ready to craft · ' + craftedCount + ' of ' + recipes.length + ' crafted';
    elements.craftingTools.querySelectorAll('[data-craft-category]').forEach(button => {
        const selected = button.dataset.craftCategory === selectedCraftCategory;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
    });
    const craftableFilter = elements.craftingTools.querySelector('#craftableOnly');
    craftableFilter.classList.toggle('is-selected', showCraftableRecipesOnly);
    craftableFilter.setAttribute('aria-pressed', String(showCraftableRecipesOnly));
    const showHiddenFilter = elements.craftingTools.querySelector('#showHiddenRecipes');
    showHiddenFilter.classList.toggle('is-selected', showCraftedRecipes);
    showHiddenFilter.setAttribute('aria-pressed', String(showCraftedRecipes));

    let visibleRecipeCount = 0;
    craftingCategories.forEach(categoryGroup => {
        const categoryRecipes = categoryGroup.recipes
            .map(id => recipes.find(recipe => recipe.id === id))
            .filter(recipe => recipe && (!recipe.developerOnly || state.developerItemsEnabled))
            .filter(recipe => selectedCraftCategory === 'all' || (recipeCategories[recipe.slot] || 'accessories') === selectedCraftCategory)
            .filter(recipe => showCraftedRecipes || !state.crafted.includes(recipe.id))
            .filter(recipe => !showCraftableRecipesOnly || (!state.crafted.includes(recipe.id) && canCraftRecipe(recipe)));
        if (!categoryRecipes.length) return;
        visibleRecipeCount += categoryRecipes.length;

        const section = document.createElement('section');
        section.className = 'crafting-category-section';
        section.dataset.craftingCategory = categoryGroup.id;
        const heading = document.createElement('div');
        heading.className = 'crafting-category-heading';
        const title = document.createElement('h3');
        title.textContent = categoryGroup.title;
        const ready = categoryRecipes.filter(recipe => !state.crafted.includes(recipe.id) && canCraftRecipe(recipe)).length;
        const progress = document.createElement('span');
        progress.className = 'crafting-category-progress';
        progress.textContent = ready + ' ready · ' + categoryRecipes.length + ' shown';
        heading.append(title, progress);
        const cards = document.createElement('div');
        cards.className = 'crafting-category-cards';

        categoryRecipes.forEach(recipe => {
            const crafted = state.crafted.includes(recipe.id);
            const canCraft = canCraftRecipe(recipe);
            const category = recipeCategories[recipe.slot] || 'accessories';
            const item = document.createElement('article');
            item.className = 'craft-card' + (crafted ? ' is-crafted' : '') + (canCraft && !crafted ? ' is-craftable' : '');
            item.dataset.category = category;
            item.dataset.rarity = recipe.rarity || 'common';

            const cardHeading = document.createElement('div');
            cardHeading.className = 'craft-card-heading';
            const name = document.createElement('h4');
            name.className = 'craft-card-copy';
            name.textContent = recipe.name;
            const slotTag = document.createElement('span');
            slotTag.className = 'craft-slot-tag';
            slotTag.textContent = recipe.slot;
            cardHeading.append(Equipment.createIcon(recipe, equipmentSlots.find(slot => slot.id === recipe.slot)?.icon), name, slotTag);

            const effect = document.createElement('p');
            effect.className = 'craft-card-effect';
            effect.textContent = recipe.effect;
            const description = document.createElement('p');
            description.className = 'craft-card-description';
            description.textContent = recipe.description;

            const materials = document.createElement('ul');
            materials.className = 'craft-materials';
            Object.entries(recipe.materials).forEach(([id, amount]) => {
                const owned = state.materials[id];
                const requirement = document.createElement('li');
                requirement.className = owned >= amount ? 'has-enough' : 'needs-more';
                const materialLabel = document.createElement('span');
                materialLabel.className = 'craft-material-label';
                const materialName = document.createElement('span');
                materialName.textContent = materialNames[id];
                const sourceWrap = document.createElement('span');
                sourceWrap.className = 'craft-material-info-wrap';
                const sourceInfo = document.createElement('button');
                sourceInfo.type = 'button';
                sourceInfo.className = 'craft-material-info';
                sourceInfo.textContent = 'i';
                const sources = materialSources[id] || [{ enemy: 'Unknown source', location: 'Explore to find' }];
                const accessibleSources = sources.map(source => source.enemy + ' in ' + source.location).join('; ');
                sourceInfo.setAttribute('aria-label', 'Drop source for ' + materialNames[id] + ': Drops from ' + accessibleSources);
                const tooltipId = 'craft-source-' + recipe.id + '-' + id;
                sourceInfo.setAttribute('aria-describedby', tooltipId);
                const tooltip = document.createElement('span');
                tooltip.id = tooltipId;
                tooltip.className = 'craft-material-tooltip';
                tooltip.setAttribute('role', 'tooltip');
                const tooltipHeading = document.createElement('strong');
                tooltipHeading.textContent = 'Drops from:';
                tooltip.appendChild(tooltipHeading);
                sources.forEach(source => {
                    const sourceEntry = document.createElement('span');
                    sourceEntry.className = 'craft-material-tooltip-source';
                    const enemy = document.createElement('span');
                    enemy.textContent = source.enemy;
                    const location = document.createElement('small');
                    location.textContent = source.location;
                    sourceEntry.append(enemy, location);
                    tooltip.appendChild(sourceEntry);
                });
                sourceWrap.append(sourceInfo, tooltip);
                materialLabel.append(materialName, sourceWrap);
                const quantity = document.createElement('strong');
                quantity.textContent = formatAmount(owned) + ' / ' + formatAmount(amount);
                requirement.append(materialLabel, quantity);
                materials.appendChild(requirement);
            });

            const button = document.createElement('button');
            button.className = 'action-button craft-action';
            button.type = 'button';
            button.dataset.craft = recipe.id;
            button.disabled = !canCraft || crafted;
            button.textContent = crafted ? 'Already crafted' : ownsItem(recipe.id) ? 'Already owned' : canCraft ? 'Craft item' : 'Missing materials';

            item.append(cardHeading, effect, description, materials, button);
            cards.appendChild(item);
        });

        section.append(heading, cards);
        elements.crafts.appendChild(section);
    });
    if (!visibleRecipeCount) {
        const empty = document.createElement('p');
        empty.className = 'crafting-empty subtle';
        empty.textContent = showCraftableRecipesOnly
            ? 'Nothing is ready to craft yet. Collect the listed materials or turn off this filter.'
            : !showCraftedRecipes && recipes.some(recipe => state.crafted.includes(recipe.id) &&
                (selectedCraftCategory === 'all' || recipeCategories[recipe.slot] === selectedCraftCategory))
                ? 'All items in this category are crafted. Select Show hidden to view them.'
                : 'No recipes match this category.';
        elements.crafts.appendChild(empty);
    }
}

function renderItemComparison(container, item) {
    const equipped = itemById[state.gear[item.slot]];
    const labels = {new: 'New bonus', better: 'Improvement', equal: 'Equal value', worse: 'Worse value', missing: 'Missing bonus'};
    const lines = Equipment.compare(item, equipped);
    container.classList.add('item-stat-comparison');
    container.replaceChildren();
    lines.forEach(line => {
        const entry = document.createElement('span');
        entry.className = 'item-stat-line stat-' + line.status;
        entry.dataset.stat = line.key;
        entry.dataset.comparison = line.status;
        const label = Equipment.stats[line.key].display.label;
        const value = document.createElement('span');
        value.className = 'item-stat-value';
        const caption = document.createElement('span');
        caption.className = 'item-stat-label';
        if (Equipment.stats[line.key].mode === 'min') {
            caption.textContent = label + ': ';
            value.textContent = line.text.slice(label.length + 2);
            entry.append(caption, value);
        } else {
            value.textContent = line.text.slice(0, -(label.length + 1));
            caption.textContent = label;
            entry.append(value, document.createTextNode(' '), caption);
        }
        if (line.delta) {
            const delta = document.createElement('span');
            delta.className = 'item-stat-delta';
            delta.textContent = ' (' + line.delta + ')';
            entry.append(delta);
        }
        entry.title = labels[line.status] + ' compared with ' + (equipped ? equipped.name : 'an empty slot') + '. ' + line.deltaDescription;
        entry.setAttribute('aria-label', entry.textContent + '. ' + entry.title);
        container.append(entry);
    });
    if (!lines.length) container.textContent = 'No stat bonuses';
}

function renderInventory() {
    const gearSignature = JSON.stringify({
        selectedGearSlot,
        gear: state.gear,
        crafted: state.crafted,
        ownedItemIds: state.ownedItemIds,
        developerItemsEnabled: state.developerItemsEnabled,
        tutorials: {
            firstGearPending: state.tutorials.firstGearPending,
            firstGearSlot: state.tutorials.firstGearSlot,
            firstGearItemId: state.tutorials.firstGearItemId,
            firstGearSlotSelected: state.tutorials.firstGearSlotSelected
        }
    });
    if (gearSignature !== lastRenderedGearSignature) {
    elements.gear.innerHTML = '';
    equipmentSlots.forEach(slot => {
        const equippedItem = itemById[state.gear[slot.id]];
        const entry = document.createElement('button');
        entry.type = 'button';
        entry.className = 'equipment-slot' + (equippedItem ? '' : ' is-empty') +
            (equippedItem && equippedItem.rarity === 'unique' ? ' unique-drop' : '') +
            (selectedGearSlot === slot.id ? ' is-selected' : '') +
            (state.tutorials.firstGearPending &&
                !state.tutorials.firstGearSlotSelected &&
                state.tutorials.firstGearSlot === slot.id ? ' tutorial-highlight' : '');
        entry.dataset.gearSlot = slot.id;
        if (equippedItem) entry.dataset.rarity = equippedItem.rarity || 'common';
        entry.setAttribute('aria-label', slot.name + ': ' + (equippedItem ? equippedItem.name : 'Empty slot') +
            (state.tutorials.firstGearPending && !state.tutorials.firstGearSlotSelected &&
                state.tutorials.firstGearSlot === slot.id ? '. Select this slot to view your new gear.' : ''));
        entry.setAttribute('aria-pressed', String(selectedGearSlot === slot.id));

        const label = document.createElement('span');
        label.className = 'equipment-slot-label';
        label.textContent = slot.name;
        const icon = Equipment.createIcon(equippedItem, slot.icon);
        icon.classList.add('equipment-slot-icon');
        const name = document.createElement('strong');
        name.className = 'equipment-slot-name';
        name.textContent = equippedItem ? equippedItem.name : 'Empty slot';
        name.title = name.textContent;
        entry.append(label, icon, name);
        const wrapper = document.createElement('div');
        wrapper.className = 'equipment-slot-wrap';
        wrapper.append(entry);
        if (equippedItem) {
            const bonus = document.createElement('span');
            bonus.className = 'equipment-slot-bonus';
            bonus.id = 'equipped-stats-' + slot.id;
            bonus.setAttribute('role', 'tooltip');
            bonus.textContent = Equipment.describe(equippedItem);
            entry.setAttribute('aria-describedby', bonus.id);
            wrapper.append(bonus);
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'equipment-unequip';
            remove.dataset.unequipSlot = slot.id;
            remove.textContent = '−';
            remove.title = 'Unequip ' + equippedItem.name;
            remove.setAttribute('aria-label', 'Unequip ' + equippedItem.name + ' from ' + slot.name.toLowerCase() + ' slot');
            wrapper.append(remove);
        }
        elements.gear.append(wrapper);
    });

    const selectedSlot = equipmentSlots.find(slot => slot.id === selectedGearSlot) || equipmentSlots[0];
    elements.gearSelectionHeading.textContent = selectedSlot.name + ' selection';
    const matchingTutorialSlot = state.tutorials.firstGearPending &&
        state.tutorials.firstGearSlot === selectedSlot.id;
    elements.gearSelectionHint.textContent = matchingTutorialSlot
        ? state.tutorials.firstGearSlotSelected
            ? 'Now click Equip on the highlighted item.'
            : 'Click the highlighted ' + selectedSlot.name.toLowerCase() + ' slot on the left to view your new item.'
        : 'Choose an owned ' + selectedSlot.name.toLowerCase() + ' to equip.';
    const legend = document.createElement('span');
    legend.className = 'stat-comparison-legend';
    legend.textContent = 'Compared with your equipped ' + selectedSlot.name.toLowerCase() + ': blue = new · green = better · white = equal · red = worse · faded gray = missing.';
    elements.gearSelectionHint.append(legend);
    elements.gearInventory.innerHTML = '';
    const slotGear = itemData.items.filter(item => item.slot === selectedSlot.id && ownsItem(item.id) && state.gear[item.slot] !== item.id);
    if (slotGear.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'inventory-empty subtle';
        empty.textContent = state.gear[selectedSlot.id]
            ? 'No spare items for this slot. Use the minus button on the equipped slot to return its item to your bag.'
            : 'No ' + selectedSlot.name.toLowerCase() + ' owned yet. Craft equipment or explore for drops.';
        elements.gearInventory.appendChild(empty);
    }
    slotGear.forEach(recipe => {
        const item = document.createElement('div');
        item.className = 'game-item' +
            (state.tutorials.firstGearPending &&
                state.tutorials.firstGearSlotSelected &&
                state.tutorials.firstGearItemId === recipe.id
                ? ' tutorial-highlight-item'
                : '');
        item.dataset.rarity = recipe.rarity || 'common';
        const copy = document.createElement('div');
        copy.className = 'game-item-copy inventory-item-identity';
        const spriteFrame = Equipment.createIcon(recipe, selectedSlot.icon);
        spriteFrame.classList.add('inventory-sprite-frame');
        const identity = document.createElement('div');
        identity.className = 'inventory-item-meta';
        const name = document.createElement('strong');
        name.textContent = recipe.name;
        const rarity = document.createElement('span');
        rarity.className = 'inventory-item-rarity';
        rarity.textContent = item.dataset.rarity.charAt(0).toUpperCase() + item.dataset.rarity.slice(1);
        identity.append(name, rarity);
        const effect = document.createElement('span');
        renderItemComparison(effect, recipe);
        effect.classList.add('game-item-copy', 'inventory-item-stats');
        copy.append(spriteFrame, identity);
        const button = document.createElement('button');
        button.className = 'action-button gear-equip-button';
        if (state.tutorials.firstGearPending &&
            state.tutorials.firstGearSlotSelected &&
            state.tutorials.firstGearItemId === recipe.id) {
            button.classList.add('tutorial-highlight');
        }
        button.type = 'button';
        button.dataset.equip = recipe.id;
        button.textContent = 'Equip';
        button.setAttribute('aria-label', 'Equip ' + recipe.name);
        item.append(copy, effect, button);
        elements.gearInventory.appendChild(item);
    });
        lastRenderedGearSignature = gearSignature;
    }

    elements.inventory.innerHTML = '';
    const ownedMaterials = Object.entries(materialNames).filter(([id]) => state.materials[id] > 0);
    if (ownedMaterials.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'inventory-empty subtle';
        empty.textContent = 'No materials collected yet. Defeat enemies to find some.';
        elements.inventory.appendChild(empty);
    }
    ownedMaterials.forEach(([id, name]) => {
        const entry = document.createElement('div');
        entry.className = 'material-entry';
        entry.innerHTML = '<span>' + name + '</span><strong>' + formatAmount(state.materials[id]) + '</strong>';
        elements.inventory.appendChild(entry);
    });
}

function renderTutorialNotifications() {
    const notifications = [];
    if (state.tutorials.firstSkillPointPending && !state.tutorials.firstSkillPointDismissed) {
        notifications.push({
            id: 'firstSkillPoint',
            message: 'Your first skill point is ready! Visit the Skill Tree and spend it.',
            dismissed: 'firstSkillPointDismissed',
            dismissLabel: 'Dismiss first skill point notification'
        });
    }
    if (state.tutorials.firstNextMapPending && !state.tutorials.firstNextMapDismissed) {
        notifications.push({
            id: 'firstNextMap',
            message: 'Your skill point is spent! Return to your map.',
            dismissed: 'firstNextMapDismissed',
            dismissLabel: 'Dismiss map progress notification'
        });
    }
    if (state.tutorials.firstMapGoalPending && !state.tutorials.firstMapGoalDismissed) {
        notifications.push({
            id: 'firstMapGoal',
            message: 'You reached your first map goal! A new destination is unlocked. Return to your map to explore it.',
            dismissed: 'firstMapGoalDismissed',
            dismissLabel: 'Dismiss first map goal notification'
        });
    }
    if (state.tutorials.firstGearPending && !state.tutorials.firstGearDismissed) {
        const itemName = itemById[state.tutorials.firstGearItemId]?.name || 'Equipment';
        notifications.push({
            id: 'firstGear',
            message: state.tutorials.firstGearSlotSelected
                ? 'Your first gear item, ' + itemName + ', is ready. Click its highlighted Equip button.'
                : 'You got your first gear item: ' + itemName +
                    '. Visit Inventory, select the highlighted slot, then equip the highlighted item.',
            dismissed: 'firstGearDismissed',
            dismissLabel: 'Dismiss first gear notification'
        });
    }

    elements.tutorialNotifications.hidden = notifications.length === 0;
    const activeNotificationIds = new Set(notifications.map(notification => notification.id));
    Array.from(elements.tutorialNotifications.children).forEach(notice => {
        if (!activeNotificationIds.has(notice.dataset.tutorialNotification)) notice.remove();
    });
    notifications.forEach(notification => {
        let notice = Array.from(elements.tutorialNotifications.children)
            .find(child => child.dataset.tutorialNotification === notification.id);
        if (!notice) {
            notice = document.createElement('div');
            notice.className = 'tutorial-notice';
            notice.dataset.tutorialNotification = notification.id;
            if (!shownTutorialNotifications.has(notification.id)) {
                notice.classList.add('tutorial-notice--flash');
                shownTutorialNotifications.add(notification.id);
            }
            const message = document.createElement('p');
            const dismiss = document.createElement('button');
            dismiss.className = 'tutorial-dismiss';
            dismiss.type = 'button';
            notice.append(message, dismiss);
            elements.tutorialNotifications.appendChild(notice);
            if (notice.classList.contains('tutorial-notice--flash')) {
                window.setTimeout(() => {
                    notice.classList.remove('tutorial-notice--flash');
                    notice.classList.add('tutorial-notice--pulse');
                }, 1100);
            }
        }
        notice.setAttribute('role', 'status');
        notice.querySelector('p').textContent = notification.message;
        const dismiss = notice.querySelector('.tutorial-dismiss');
        dismiss.dataset.dismissTutorial = notification.dismissed;
        dismiss.setAttribute('aria-label', notification.dismissLabel);
        dismiss.textContent = '×';
    });
}

function createEnemyCard(definition) {
    const card = document.createElement('article');
    card.className = 'enemy-card';
    card.dataset.monsterId = definition.id;
    const shockwaveNotice = document.createElement('span');
    shockwaveNotice.className = 'combat-hit-badge';
    shockwaveNotice.dataset.combatHitBadge = '';
    shockwaveNotice.textContent = '';
    shockwaveNotice.hidden = true;
    const mark = document.createElement('span');
    mark.className = 'enemy-mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '✦';
    const details = document.createElement('div');
    details.className = 'enemy-details';
    const title = document.createElement('div');
    title.className = 'enemy-title';
    const name = document.createElement('h3');
    name.dataset.enemyName = '';
    const targetLabel = document.createElement('span');
    targetLabel.className = 'enemy-target-label';
    targetLabel.textContent = 'Target';
    const status = document.createElement('div');
    status.className = 'enemy-status';
    status.appendChild(targetLabel);
    const playerAccuracy = document.createElement('p');
    playerAccuracy.className = 'hit-chance';
    playerAccuracy.append('Your accuracy against this enemy: ');
    const playerAccuracyValue = document.createElement('strong');
    playerAccuracyValue.dataset.playerAccuracy = '';
    playerAccuracy.appendChild(playerAccuracyValue);
    const enemyAccuracy = document.createElement('p');
    enemyAccuracy.className = 'hit-chance';
    enemyAccuracy.append('Enemy accuracy against you: ');
    const enemyAccuracyValue = document.createElement('strong');
    enemyAccuracyValue.dataset.enemyAccuracy = '';
    enemyAccuracy.appendChild(enemyAccuracyValue);
    const procNotice = document.createElement('div');
    procNotice.className = 'enemy-proc-notice';
    procNotice.dataset.enemyProcNotice = '';
    procNotice.setAttribute('aria-live', 'off');
    const effectRow = document.createElement('div');
    effectRow.className = 'enemy-effect-row';
    const dotStatus = document.createElement('span');
    dotStatus.className = 'enemy-dot-status';
    dotStatus.dataset.enemyDotStatus = '';
    dotStatus.hidden = true;
    const droplet = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    droplet.setAttribute('viewBox', '0 0 24 24');
    droplet.setAttribute('aria-hidden', 'true');
    const dropletShape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    dropletShape.setAttribute('d', 'M12 2.5C9.3 6.2 5.5 10.2 5.5 14.4a6.5 6.5 0 0 0 13 0C18.5 10.2 14.7 6.2 12 2.5Z');
    droplet.appendChild(dropletShape);
    const dotCount = document.createElement('strong');
    dotCount.dataset.enemyDotCount = '';
    dotStatus.append(droplet, dotCount);
    effectRow.append(procNotice, dotStatus);
    const healthTrack = document.createElement('div');
    healthTrack.className = 'health-track';
    healthTrack.setAttribute('role', 'progressbar');
    healthTrack.setAttribute('aria-label', definition.name + ' health');
    healthTrack.setAttribute('aria-valuemin', '0');
    healthTrack.setAttribute('aria-valuemax', '100');
    const healthBar = document.createElement('div');
    healthBar.className = 'health-fill';
    const damageBar = document.createElement('div');
    damageBar.className = 'enemy-health-damage';
    damageBar.setAttribute('aria-hidden', 'true');
    const poisonDamageBar = document.createElement('div');
    poisonDamageBar.className = 'enemy-health-poison-damage';
    poisonDamageBar.setAttribute('aria-hidden', 'true');
    healthTrack.append(poisonDamageBar, healthBar, damageBar);
    const summary = document.createElement('div');
    summary.className = 'enemy-health-summary';
    const hp = document.createElement('span');
    hp.className = 'enemy-health-value';
    hp.setAttribute('aria-label', 'Enemy health');
    const heart = document.createElement('span');
    heart.setAttribute('aria-hidden', 'true');
    heart.textContent = '♥';
    const hpText = document.createElement('span');
    hpText.className = 'subtle';
    hpText.dataset.enemyHp = '';
    hp.append(heart, hpText);
    const offense = document.createElement('div');
    offense.className = 'enemy-offense';
    const attackInterval = document.createElement('span');
    attackInterval.className = 'enemy-attack-interval';
    attackInterval.setAttribute('aria-label', 'Enemy attack interval');
    attackInterval.title = 'Time between attacks';
    const intervalIcon = document.createElement('span');
    intervalIcon.setAttribute('aria-hidden', 'true');
    intervalIcon.textContent = '⏱';
    const intervalValue = document.createElement('strong');
    intervalValue.dataset.enemyAttackInterval = '';
    attackInterval.append(intervalIcon, intervalValue);
    const damage = document.createElement('span');
    damage.className = 'enemy-damage';
    damage.setAttribute('aria-label', 'Enemy damage per hit');
    const damageIcon = document.createElement('span');
    damageIcon.setAttribute('aria-hidden', 'true');
    damageIcon.textContent = '⚔';
    const damageValue = document.createElement('strong');
    damageValue.dataset.enemyDamage = '';
    damage.append(damageIcon, damageValue);
    offense.append(attackInterval, damage);
    summary.append(hp, offense);
    const respawn = document.createElement('p');
    respawn.className = 'enemy-respawn-status';
    respawn.dataset.enemyRespawn = '';
    respawn.setAttribute('aria-live', 'off');
    status.appendChild(respawn);
    title.append(name, status);
    details.append(title, playerAccuracy, enemyAccuracy, effectRow, healthTrack, summary);
    card.append(mark, details, shockwaveNotice);
    card.addEventListener('animationend', event => {
        if (event.animationName === 'enemy-death-shake') card.classList.remove('is-defeating');
        if (event.animationName === 'poison-stack-proc') event.target.classList.remove('is-applying');
        if (event.animationName === 'shockwave-card-hit') event.target.classList.remove('is-shockwave-splashed');
        if (event.animationName === 'shockwave-health-impact' && event.target.classList.contains('is-shockwave-hit')) {
            event.target.classList.remove('is-shockwave-hit');
        }
    });
    return card;
}

function renderCombat() {
    const map = currentMap();
    const definitions = monsterDefinitions(map);
    const ids = definitions.map(definition => definition.id);
    elements.enemyRoster.classList.toggle('has-multiple', definitions.length > 1);
    elements.enemyRoster.classList.toggle('is-crowded', definitions.length > 3);
    const renderedCards = Array.from(elements.enemyRoster.children)
        .filter(card => card.classList.contains('enemy-card'));
    const renderedIds = renderedCards.map(card => card.dataset.monsterId);
    if (ids.length !== renderedIds.length || ids.some((id, index) => id !== renderedIds[index])) {
        elements.enemyRoster.replaceChildren(...definitions.map(createEnemyCard));
    }
    const target = activeMonster();
    const progress = state.kills[map.id];
    const completed = progress >= map.goal;
    const maxHealth = getPlayerMaxHealth();
    const playerHpPercent = Math.max(0, Math.min(100, state.playerHp / maxHealth * 100));
    elements.mapName.textContent = map.name;
    elements.mapDescription.textContent = map.description;
    elements.killProgress.textContent = completed ? progress + ' kills' : Math.min(progress, map.goal) + ' / ' + map.goal;
    elements.killProgressLabel.hidden = completed;
    elements.mapLootTable.innerHTML = '';
    const lootEntries = [
        { name: 'Gold', amount: map.gold, chance: 1 },
        ...map.drops.map(drop => ({ name: materialNames[drop.id], amount: drop.amount, chance: drop.chance })),
        ...(map.itemDrops || []).map(drop => ({
            name: itemById[drop.id].name,
            amount: [1, 1],
            chanceText: (drop.chance * 100).toLocaleString('en-US', { maximumFractionDigits: 6 }) + '%',
            unique: itemById[drop.id].rarity === 'unique'
        }))
    ];
    lootEntries.forEach(drop => {
        const entry = document.createElement('li');
        if (drop.unique) entry.className = 'unique-drop';
        const amount = document.createElement('span');
        amount.textContent = drop.name;
        const details = document.createElement('strong');
        details.textContent = formatAmount(drop.amount[0]) +
            (drop.amount[0] === drop.amount[1] ? '' : '–' + formatAmount(drop.amount[1])) +
            (drop.chanceText ? ' · ' + drop.chanceText : ' · ' + Math.round(drop.chance * 100) + '%');
        entry.append(amount, details);
        elements.mapLootTable.appendChild(entry);
    });
    const playerHitChance = getHitChance(getPlayerAccuracy(), map.evasion);
    const enemyHitChance = getEnemyHitChance();
    Array.from(elements.enemyRoster.children)
        .filter(card => card.classList.contains('enemy-card'))
        .forEach((card, index) => {
        const definition = definitions[index];
        const monster = state.monsterStates.find(entry => entry.id === definition.id);
        if (!monster) return;
        const hpPercent = Math.max(0, Math.min(100, monster.hp / map.health * 100));
        card.classList.toggle('is-target', Boolean(target && target.id === monster.id));
        card.classList.toggle('is-respawning', monster.hp <= 0);
        card.querySelector('[data-enemy-name]').textContent = definition.name;
        card.querySelector('.enemy-target-label').hidden = !target || target.id !== monster.id;
        const playerAccuracyText = card.querySelector('[data-player-accuracy]');
        const enemyAccuracyText = card.querySelector('[data-enemy-accuracy]');
        playerAccuracyText.textContent = playerHitChance + '%';
        enemyAccuracyText.textContent = enemyHitChance + '%';
        setAccuracyClass(playerAccuracyText, playerHitChance, true);
        setAccuracyClass(enemyAccuracyText, enemyHitChance, false);
        card.querySelector('.health-fill').style.width = hpPercent + '%';
        const healthTrack = card.querySelector('.health-track');
        healthTrack.setAttribute('aria-valuenow', String(Math.round(hpPercent)));
        const poisonIndicator = card.querySelector('.enemy-health-poison-damage');
        const remainingPoisonDamage = Math.min(monster.hp, getRemainingPoisonDamage(monster));
        const poisonPercent = remainingPoisonDamage / map.health * 100;
        poisonIndicator.style.left = Math.max(0, hpPercent - poisonPercent) + '%';
        poisonIndicator.style.width = poisonPercent + '%';
        poisonIndicator.classList.toggle('is-visible', monster.hp > 0 && remainingPoisonDamage > 0);
        poisonIndicator.title = remainingPoisonDamage > 0
            ? 'Poison will deal ' + remainingPoisonDamage + ' more damage'
            : '';
        card.querySelector('[data-enemy-hp]').textContent = Math.ceil(monster.hp) + ' / ' + map.health + ' HP';
        card.querySelector('[data-enemy-attack-interval]').textContent = map.attackInterval.toFixed(1) + 's';
        card.querySelector('[data-enemy-damage]').textContent = String(map.attackDamage);
        const dotStatus = card.querySelector('[data-enemy-dot-status]');
        const poisonStackCount = monster.poisonStacks ? monster.poisonStacks.length : 0;
        dotStatus.hidden = poisonStackCount === 0;
        dotStatus.querySelector('[data-enemy-dot-count]').textContent = poisonStackCount + 'x';
        dotStatus.setAttribute('aria-label', poisonStackCount + ' poison ' +
            (poisonStackCount === 1 ? 'stack' : 'stacks'));
        dotStatus.title = poisonStackCount + ' poison ' + (poisonStackCount === 1 ? 'stack' : 'stacks');
        const respawn = card.querySelector('[data-enemy-respawn]');
        respawn.hidden = monster.respawnRemaining <= 0;
        respawn.textContent = monster.respawnRemaining > 0
            ? 'Respawns in ' + monster.respawnRemaining.toFixed(1) + 's'
            : '';
    });
    elements.playerHealthBar.style.width = playerHpPercent + '%';
    const damagePercent = Math.min(100 - playerHpPercent, recentPlayerDamage / maxHealth * 100);
    elements.playerHealthDamage.style.left = playerHpPercent + '%';
    elements.playerHealthDamage.style.width = damagePercent + '%';
    elements.playerHealthTrack.setAttribute('aria-valuenow', String(Math.round(playerHpPercent)));
    elements.playerHealthText.textContent = Math.ceil(state.playerHp) + ' / ' + maxHealth + ' HP';
    elements.combatStatusLabel.textContent = state.combatPaused ? 'Dead' : target ? 'Auto-battling' : 'Waiting for respawn';
    elements.combatStatus.classList.toggle('combat-dead', state.combatPaused);
    elements.combatStatus.classList.toggle('is-fighting', !state.combatPaused && Boolean(target));
    elements.resumeCombat.hidden = !state.combatPaused || state.currentView !== 'map';
    elements.lastDrop.textContent = state.lastDrop;
    elements.lastDrop.classList.toggle(
        'unique-drop',
        itemData.items.some(item => item.rarity === 'unique' && state.lastDrop.includes(item.name))
    );
}

function render() {
    const speedBonus = Math.round((getAttackSpeedMultiplier() - 1) * 10000) / 100;
    const experienceRequired = experienceForNextLevel(state.level);
    const experiencePercent = Math.min(100, state.experience / experienceRequired * 100);
    elements.gold.textContent = formatAmount(state.gold);
    elements.level.textContent = 'Level ' + state.level;
    elements.experience.textContent = state.experience + ' / ' + experienceRequired + ' XP';
    elements.skillPoints.textContent = state.skillPoints + ' SP';
    elements.experienceBar.style.width = experiencePercent + '%';
    elements.experienceTrack.setAttribute('aria-valuenow', String(state.experience));
    elements.experienceTrack.setAttribute('aria-valuemax', String(experienceRequired));
    elements.experienceTrack.setAttribute('aria-valuetext', state.experience + ' of ' +
        experienceRequired + ' XP to level ' + (state.level + 1));
    elements.damage.textContent = formatAmount(getDamage());
    elements.multiHit.textContent = String(getMultiHit());
    elements.poisonChance.textContent = (getPoisonChance() * 100).toFixed(1).replace(/\.0$/, '') + '%';
    elements.speed.textContent = (speedBonus >= 0 ? '+' : '') + speedBonus + '%';
    elements.accuracy.textContent = formatAmount(getPlayerAccuracy());
    elements.evasion.textContent = String(getPlayerEvasion());
    elements.townView.hidden = state.currentView !== 'town';
    elements.upgradesView.hidden = state.currentView !== 'upgrades';
    elements.mapView.hidden = state.currentView !== 'map';
    elements.inventoryView.hidden = state.currentView !== 'inventory';
    elements.worldPanel.hidden = !worldSelectorIsUnlocked();
    document.querySelector('#mapButton').setAttribute('aria-pressed', String(state.currentView === 'map'));
    document.querySelector('#townButton').setAttribute('aria-pressed', String(state.currentView === 'town'));
    document.querySelector('#upgradesButton').setAttribute('aria-pressed', String(state.currentView === 'upgrades'));
    document.querySelector('#inventoryButton').setAttribute('aria-pressed', String(state.currentView === 'inventory'));
    const skillTreeButton = document.querySelector('#upgradesButton');
    skillTreeButton.classList.toggle('tutorial-attention', state.tutorials.firstSkillPointPending);
    skillTreeButton.setAttribute('aria-label', state.tutorials.firstSkillPointPending
        ? 'Skill Tree: first skill point to spend'
        : 'Skill Tree');
    const mapButton = document.querySelector('#mapButton');
    mapButton.classList.toggle('tutorial-attention', state.tutorials.firstNextMapPending);
    mapButton.setAttribute('aria-label', state.tutorials.firstNextMapPending
        ? 'Map: select the newly unlocked next destination'
        : 'Map');
    const inventoryButton = document.querySelector('#inventoryButton');
    inventoryButton.classList.toggle('tutorial-attention', state.tutorials.firstGearPending);
    inventoryButton.setAttribute('aria-label', state.tutorials.firstGearPending
        ? 'Inventory: new gear to equip'
        : 'Inventory');
    renderWorlds();
    renderMaps();
    renderCombat();
    renderUpgrades();
    renderCrafting();
    renderInventory();
    renderTutorialNotifications();
    elements.lootLog.innerHTML = '';
    if (state.lootLog.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'loot-empty';
        empty.textContent = 'Loot from defeated enemies will appear here.';
        elements.lootLog.appendChild(empty);
    }
    state.lootLog.forEach(message => {
        const entry = document.createElement('li');
        if (itemData.items.some(item => item.rarity === 'unique' && message.includes(item.name))) {
            entry.className = 'unique-drop';
        }
        entry.textContent = message;
        elements.lootLog.appendChild(entry);
    });
}

function rollRange(range) {
    return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
}

function awardExperience(amount) {
    state.experience += amount;
    let levelsGained = 0;
    while (state.experience >= experienceForNextLevel(state.level)) {
        state.experience -= experienceForNextLevel(state.level);
        state.level++;
        state.skillPoints++;
        levelsGained++;
        if (state.level === 1) state.tutorials.firstSkillPointPending = true;
    }
    return levelsGained;
}

function defeatEnemy(monster) {
    const map = currentMap();
    const gold = Math.floor(rollRange(map.gold) * getGoldMultiplier());
    state.gold += gold;
    state.kills[map.id]++;
    if (map.id === mapData[0].id && state.kills[map.id] === map.goal) {
        state.tutorials.firstMapGoalPending = true;
        state.tutorials.firstMapGoalDismissed = false;
    }
    const experienceGained = map.experience;
    awardExperience(experienceGained);
    const found = [];
    map.drops.forEach(drop => {
        if (Math.random() <= drop.chance) {
            const amount = rollRange(drop.amount);
            state.materials[drop.id] += amount;
            found.push(amount + ' ' + materialNames[drop.id]);
        }
    });
    (map.itemDrops || []).forEach(drop => {
        const item = itemById[drop.id];
        if (!item.developerOnly && !ownsItem(item.id) && Math.random() < drop.chance) {
            state.ownedItemIds.push(item.id);
            promptForFirstGear(item.id, item.slot);
            found.push(item.name);
        }
    });
    state.lastDrop = found.length
        ? 'Found ' + found.join(' and ') + '.'
        : 'No materials this time.';
    addLootDrop(gold, found);

    const defeatedCard = Array.from(elements.enemyRoster.children)
        .find(card => card.dataset.monsterId === monster.id);
    if (defeatedCard) {
        defeatedCard.classList.remove('is-defeating');
        void defeatedCard.offsetWidth;
        defeatedCard.classList.add('is-defeating');
    }

    monster.hp = 0;
    monster.poisonStacks = [];
    monster.respawnRemaining = monsterDefinitions(map)
        .find(definition => definition.id === monster.id).respawnSeconds;
    monster.attackTimer = 0;
    selectNextMonsterTarget(monster);
    syncLegacyEnemyState();
    state.attackTimer = 0;
    clearEnemyDamageIndicator();
    saveGame();
}

function applyDamageToMonster(monster, damage, damageType = 'physical') {
    if (!monster || monster.hp <= 0 || !Number.isFinite(damage) || damage <= 0) return false;
    const previousHp = monster.hp;
    monster.hp = Math.max(0, monster.hp - damage);
    syncLegacyEnemyState();
    if (monster.hp <= 0) {
        defeatEnemy(monster);
        return true;
    }

    recentEnemyDamage = previousHp - monster.hp;
    const targetCard = Array.from(elements.enemyRoster.children)
        .find(card => card.dataset.monsterId === monster.id);
    const damageIndicator = damageType === 'physical' && targetCard
        ? targetCard.querySelector('.enemy-health-damage')
        : null;
    if (damageIndicator) {
        const maxHp = currentMap().health;
        const currentHpPercent = Math.max(0, Math.min(100, monster.hp / maxHp * 100));
        const damagePercent = Math.min(100 - currentHpPercent,
            Math.max(recentEnemyDamage / maxHp * 100, 1));
        damageIndicator.style.left = currentHpPercent + '%';
        damageIndicator.style.width = damagePercent + '%';
        damageIndicator.classList.add('is-visible');
        window.clearTimeout(enemyDamageIndicatorTimers.get(damageIndicator));
        enemyDamageIndicatorTimers.set(damageIndicator, window.setTimeout(() => {
            damageIndicator.classList.remove('is-visible');
            enemyDamageIndicatorTimers.delete(damageIndicator);
        }, 250));
    }
    return false;
}

function getPoisonTickInterval() {
    const rate = (1 + getSkillStat('poisonTickRate') + getGearStat('poisonTickRate')) *
        getSkillMultiplier('poisonTickRateMultiplier') * getGearStat('poisonTickRateMultiplier');
    return poisonDamageType.tickIntervalSeconds / Math.max(0.1, rate);
}

function getPoisonDamage() {
    return Math.max(1, Math.round((poisonDamageType.baseDamage + getSkillStat('poisonDamage') + getGearStat('poisonDamage')) *
        getSkillMultiplier('poisonDamageMultiplier') * getGearStat('poisonDamageMultiplier')));
}

function getPoisonChance() {
    return Math.max(0, Math.min(1,
        (getSkillStat('poisonChance') + getGearStat('poisonChance')) *
        getSkillMultiplier('poisonChanceMultiplier') * getGearStat('poisonChanceMultiplier')));
}

function getRemainingPoisonDamage(monster) {
    if (!monster || monster.hp <= 0 || !Array.isArray(monster.poisonStacks)) return 0;
    const tickInterval = getPoisonTickInterval();
    const damagePerTick = getPoisonDamage();
    return monster.poisonStacks.reduce((total, stack) => {
        const firstTickIn = Math.max(0, stack.timeUntilTick);
        if (firstTickIn > stack.remainingDuration + 1e-6) return total;
        const ticksRemaining = 1 + Math.floor(
            (stack.remainingDuration - firstTickIn + 1e-6) / tickInterval
        );
        return total + Math.max(0, ticksRemaining) * damagePerTick;
    }, 0);
}

function tryApplyPoison(monster) {
    const poisonChance = getPoisonChance();
    if (!monster || monster.hp <= 0 || poisonChance <= 0 || Math.random() >= poisonChance) return false;
    if (!Array.isArray(monster.poisonStacks)) monster.poisonStacks = [];
    monster.poisonStacks.push({
        remainingDuration: poisonDamageType.durationSeconds,
        timeUntilTick: getPoisonTickInterval()
    });
    showPoisonStackProc(monster);
    return true;
}

function tickMonsterPoison(monster, elapsed) {
    if (monster.hp <= 0 || !Array.isArray(monster.poisonStacks) || !monster.poisonStacks.length) return false;
    const tickInterval = getPoisonTickInterval();
    const remainingStacks = [];
    for (const stack of monster.poisonStacks) {
        stack.remainingDuration -= elapsed;
        stack.timeUntilTick -= elapsed;
        while (monster.hp > 0 && stack.timeUntilTick <= 0 && stack.remainingDuration >= -1e-6) {
            const damage = getPoisonDamage();
            applyDamageToMonster(monster, damage, 'poison');
            stack.timeUntilTick += tickInterval;
        }
        if (monster.hp > 0 && stack.remainingDuration > 0) remainingStacks.push(stack);
        if (monster.hp <= 0) break;
    }
    monster.poisonStacks = monster.hp > 0 ? remainingStacks : [];
    return monster.hp <= 0;
}

function playerHasShockwaveSlash() {
    return (state.skillRanks.shockwaveSlash || 0) > 0;
}

function triggerShockwaveSlash(hitMonster, hitDamage) {
    if (!playerHasShockwaveSlash() || Math.random() >= 0.25) return;
    const splashDamage = hitDamage * 0.33;
    const splashTargets = state.monsterStates
        .filter(monster => monster.hp > 0 && monster.id !== hitMonster.id);
    if (!splashTargets.length) return;
    splashTargets.forEach(monster => {
        showMonsterProc(monster.id, 'SHOCKWAVE HIT');
        flashShockwaveCard(monster.id);
        flashShockwaveHealthBar(monster.id);
        applyDamageToMonster(monster, splashDamage, 'physical');
        tryApplyPoison(monster);
    });
}

function craftGear(id) {
    const recipe = recipes.find(entry => entry.id === id);
    if (!recipe || ownsItem(id) || state.crafted.includes(id) || (recipe.developerOnly && !state.developerItemsEnabled)) return;
    if (!Object.entries(recipe.materials).every(([material, amount]) => state.materials[material] >= amount)) return;

    Object.entries(recipe.materials).forEach(([material, amount]) => {
        state.materials[material] -= amount;
    });
    state.crafted.push(id);
    if (!state.ownedItemIds.includes(id)) state.ownedItemIds.push(id);
    promptForFirstGear(recipe.id, recipe.slot);
    render();
    saveGame();
}

document.querySelector('#townButton').addEventListener('click', function() {
    state.currentView = 'town';
    state.isInTown = true;
    render();
    saveGame();
});

document.querySelector('#upgradesButton').addEventListener('click', function() {
    state.currentView = 'upgrades';
    state.isInTown = true;
    render();
    centerSkillTreeOnOrigin(skillTreeNeedsInitialFraming);
    skillTreeNeedsInitialFraming = false;
    saveGame();
});

document.querySelector('#mapButton').addEventListener('click', function() {
    state.tutorials.firstNextMapPending = false;
    state.currentView = 'map';
    state.isInTown = false;
    setInitialMonsterTarget();
    state.attackTimer = 0;
    if (state.tutorials.firstNextMapPending) state.mapListExpanded = true;
    render();
    saveGame();
});

document.querySelector('#inventoryButton').addEventListener('click', function() {
    state.currentView = 'inventory';
    state.isInTown = true;
    render();
    saveGame();
});

elements.tutorialNotifications.addEventListener('click', function(event) {
    const button = event.target.closest('[data-dismiss-tutorial]');
    if (!button || !Object.hasOwn(state.tutorials, button.dataset.dismissTutorial)) return;
    state.tutorials[button.dataset.dismissTutorial] = true;
    render();
    saveGame();
});

document.querySelector('#resetGame').addEventListener('click', function() {
    if (!window.confirm('Reset all Idle Adventure progress? This cannot be undone.')) return;
    state.gold = 0;
    state.kills = Object.fromEntries(mapData.map(map => [map.id, 0]));
    state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id, 0]));
    state.upgrades = { strength: 0, haste: 0, evasion: 0 };
    state.level = 0;
    state.experience = 0;
    state.skillPoints = 0;
    state.skillRanks = {};
    state.gear = createEmptyGear();
    state.ownedItemIds = [];
    state.developerItemsEnabled = false;
    document.querySelector('#developerItems').checked = false;
    state.crafted = [];
    state.tutorials = createTutorialState();
    state.selectedWorld = worldData[0].id;
    state.lastMapByWorld = Object.fromEntries(worldData.map(world => [world.id, world.mapIds[0]]));
    state.selectedMap = 'greenfields';
    state.mapListExpanded = true;
    state.isInTown = true;
    state.currentView = 'town';
    skillTreeNeedsInitialFraming = true;
    resetMonsterStates(mapData[0]);
    state.playerHp = getPlayerMaxHealth();
    state.combatPaused = false;
    state.attackTimer = 0;
    state.lootLog = [];
    state.lastDrop = 'Defeat enemies to find loot.';
    render();
    saveGame();
});

elements.worldList.addEventListener('click', function(event) {
    const button = event.target.closest('[data-world]');
    if (!button || button.disabled) return;
    const world = worldData.find(entry => entry.id === button.dataset.world);
    if (!world) return;
    const maps = mapsForWorld(world.id);
    const previousMapId = state.lastMapByWorld[world.id];
    const previousMapIndex = maps.findIndex(map => map.id === previousMapId);
    const selectedMap = previousMapIndex >= 0 && mapIsUnlocked(maps, previousMapIndex)
        ? maps[previousMapIndex]
        : maps.find((map, index) => mapIsUnlocked(maps, index));
    if (!selectedMap) return;

    state.selectedWorld = world.id;
    state.selectedMap = selectedMap.id;
    state.lastMapByWorld[world.id] = selectedMap.id;
    state.mapListExpanded = true;
    resetMonsterStates(selectedMap);
    clearEnemyDamageIndicator();
    state.attackTimer = 0;
    state.isInTown = false;
    state.currentView = 'map';
    state.lastDrop = 'Defeat enemies to find loot.';
    render();
    saveGame();
});

elements.mapList.addEventListener('click', function(event) {
    const button = event.target.closest('[data-map]');
    if (!button || button.disabled) return;
    const selected = mapsForWorld(state.selectedWorld).find(map => map.id === button.dataset.map);
    if (!selected) return;
    if (selected.id === state.selectedMap) {
        state.mapListExpanded = !state.mapListExpanded;
        renderMaps();
        window.scrollTo(0, 0);
        return;
    }
    const tutorialNextMap = state.tutorials.firstNextMapPending || state.tutorials.firstMapGoalPending
        ? nextUnlockedMap()
        : null;
    state.selectedMap = selected.id;
    if (selected === tutorialNextMap) {
        state.tutorials.firstNextMapPending = false;
        if (state.tutorials.firstMapGoalPending) {
            state.tutorials.firstMapGoalPending = false;
            state.tutorials.firstMapGoalDismissed = true;
        }
    }
    state.lastMapByWorld[state.selectedWorld] = selected.id;
    state.mapListExpanded = false;
    resetMonsterStates(selected);
    clearEnemyDamageIndicator();
    state.attackTimer = 0;
    state.isInTown = false;
    state.currentView = 'map';
    state.lastDrop = 'Defeat enemies to find loot.';
    render();
    window.scrollTo(0, 0);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        elements.combatPanel.animate(
            [
                { opacity: 0.72, transform: 'translateY(6px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ],
            { duration: 260, easing: 'ease-out' }
        );
    }
    saveGame();
});

elements.upgrades.addEventListener('click', function(event) {
    const control = event.target.closest('[data-skill-tree-control]');
    if (control) {
        if (control.id === 'clearSkillSelection') {
            pendingSkillRanks = {};
            renderUpgrades();
        } else if (control.id === 'refundSkillPoints') {
            if (getPendingSkillPointCount() > 0) return;
            refundMode = !refundMode;
            renderUpgrades();
        } else if (control.id === 'confirmSkillSelection') {
            const pendingCount = getPendingSkillPointCount();
            if (pendingCount < 1 || pendingCount > state.skillPoints) return;
            const plannedRanks = getPlannedSkillRanks();
            const validPlan = skillNodes.every(node => plannedRanks[node.id] <= node.maxRank &&
                (!pendingSkillRanks[node.id] || skillNodeRequirementsMet(node, id =>
                    Boolean(skillNodeById[id] && skillNodeById[id].start) || plannedRanks[id] > 0)));
            if (!validPlan) {
                pendingSkillRanks = {};
                renderUpgrades();
                return;
            }
            const previousMaxHealth = getPlayerMaxHealth();
            Object.entries(pendingSkillRanks).forEach(([id, rank]) => {
                state.skillRanks[id] = getSkillNodeRank(id) + rank;
            });
            state.skillPoints -= pendingCount;
            const maxHealth = getPlayerMaxHealth();
            state.playerHp = Math.min(maxHealth, state.playerHp + Math.max(0, maxHealth - previousMaxHealth));
            if (state.tutorials.firstSkillPointPending) {
                state.tutorials.firstSkillPointPending = false;
                state.tutorials.firstSkillPointDismissed = false;
                state.tutorials.firstNextMapPending = true;
                state.tutorials.firstNextMapDismissed = false;
            }
            pendingSkillRanks = {};
            render();
            saveGame();
        } else if (control.id === 'resetSkillTree') {
            const spentPoints = Object.values(state.skillRanks).reduce((total, rank) => total + rank, 0);
            if (spentPoints === 0 && getPendingSkillPointCount() === 0) return;
            if (!window.confirm('Reset the skill tree and refund all spent skill points?')) return;
            state.skillRanks = {};
            state.skillPoints += spentPoints;
            pendingSkillRanks = {};
            refundMode = false;
            state.playerHp = Math.min(state.playerHp, getPlayerMaxHealth());
            render();
            saveGame();
        }
        return;
    }
    const button = event.target.closest('[data-skill-node]');
    if (!button) return;
    const node = skillNodeById[button.dataset.skillNode];
    if (!node) return;
    if (node.start) {
        const viewport = button.closest('.skill-tree-viewport');
        const board = button.closest('.skill-tree-board');
        skillTreePanX = viewport.clientWidth / 2 - (button.offsetLeft + button.offsetWidth / 2) * skillTreeZoom;
        skillTreePanY = viewport.clientHeight / 2 - (button.offsetTop + button.offsetHeight / 2) * skillTreeZoom;
        clampSkillTreePan(viewport, board);
        renderUpgrades();
        return;
    }
    if (refundMode) {
        if (getPendingSkillPointCount() > 0 || getSkillNodeRank(node.id) === 0 || pendingSkillRanks[node.id] ||
            !canRefundSkillRank(node.id)) return;
        state.skillRanks[node.id]--;
        if (state.skillRanks[node.id] <= 0) delete state.skillRanks[node.id];
        state.skillPoints++;
        state.playerHp = Math.min(state.playerHp, getPlayerMaxHealth());
        render();
        saveGame();
        return;
    }
    if (pendingSkillRanks[node.id]) {
        if (!canDeselectPendingSkillNode(node.id)) return;
        delete pendingSkillRanks[node.id];
        renderUpgrades();
        return;
    }
    const plannedRanks = getPlannedSkillRanks();
    const allocatedForPlan = id => Boolean(skillNodeById[id] && skillNodeById[id].start) ||
        (plannedRanks[id] || 0) > 0;
    const pendingCount = getPendingSkillPointCount();
    if ((plannedRanks[node.id] || 0) >= node.maxRank || pendingCount >= state.skillPoints ||
        !skillNodeRequirementsMet(node, allocatedForPlan)) return;
    pendingSkillRanks[node.id] = getSkillNodeRank(node.id, pendingSkillRanks) + 1;
    renderUpgrades();
});

elements.crafts.addEventListener('click', function(event) {
    const button = event.target.closest('[data-craft]');
    if (button && !button.disabled) craftGear(button.dataset.craft);
});

elements.craftingTools.addEventListener('click', function(event) {
    const categoryButton = event.target.closest('[data-craft-category]');
    if (categoryButton) {
        selectedCraftCategory = categoryButton.dataset.craftCategory;
        renderCrafting();
        return;
    }
    if (event.target.closest('#craftableOnly')) {
        showCraftableRecipesOnly = !showCraftableRecipesOnly;
        renderCrafting();
        return;
    }
    if (event.target.closest('#showHiddenRecipes')) {
        showCraftedRecipes = !showCraftedRecipes;
        if (showCraftedRecipes) showCraftableRecipesOnly = false;
        renderCrafting();
    }
});

elements.gear.addEventListener('click', function(event) {
    const remove = event.target.closest('[data-unequip-slot]');
    if (remove) {
        const slot = remove.dataset.unequipSlot;
        if (!gearSlots.includes(slot) || !state.gear[slot]) return;
        state.gear[slot] = null;
        state.playerHp = Math.min(state.playerHp, getPlayerMaxHealth());
        render();
        saveGame();
        elements.gear.querySelector('[data-gear-slot="' + slot + '"]')?.focus();
        return;
    }
    const button = event.target.closest('[data-gear-slot]');
    if (!button) return;
    selectedGearSlot = button.dataset.gearSlot;
    if (state.tutorials.firstGearPending &&
        selectedGearSlot === state.tutorials.firstGearSlot &&
        !state.tutorials.firstGearSlotSelected) {
        state.tutorials.firstGearSlotSelected = true;
        saveGame();
    }
    renderInventory();
    renderTutorialNotifications();
});

elements.gearInventory.addEventListener('click', function(event) {
    const button = event.target.closest('[data-equip]');
    if (!button) return;
    const item = itemById[button.dataset.equip];
    if (!item || item.slot !== selectedGearSlot || !ownsItem(item.id)) return;
    state.gear[item.slot] = item.id;
    state.playerHp = Math.min(state.playerHp, getPlayerMaxHealth());
    if (state.tutorials.firstGearPending &&
        selectedGearSlot === state.tutorials.firstGearSlot &&
        state.gear[selectedGearSlot] === state.tutorials.firstGearItemId) {
        state.tutorials.firstGearPending = false;
        state.tutorials.firstGearDismissed = false;
    }
    render();
    saveGame();
});

elements.increaseLevel.addEventListener('click', function() {
    state.skillPoints++;
    state.level++;
    state.experience = 0;
    render();
    saveGame();
});

elements.resumeCombat.addEventListener('click', function() {
    if (!state.combatPaused) return;
    const previousTargetId = state.targetMonsterId;
    state.playerHp = getPlayerMaxHealth();
    state.combatPaused = false;
    state.attackTimer = 0;
    state.targetMonsterId = state.monsterStates.some(monster => monster.id === previousTargetId)
        ? previousTargetId
        : (state.monsterStates[0] ? state.monsterStates[0].id : null);
    ensureLiveMonsterTarget();
    render();
    saveGame();
});

document.querySelector('#developerItems').addEventListener('change', function(event) {
    state.developerItemsEnabled = event.target.checked;
    if (!state.developerItemsEnabled) {
        gearSlots.forEach(slot => {
            if (itemById[state.gear[slot]]?.developerOnly) state.gear[slot] = null;
        });
        state.playerHp = Math.min(state.playerHp, getPlayerMaxHealth());
    }
    render();
    saveGame();
});

const hasSavedGame = loadGame();
document.querySelector('#developerItems').checked = state.developerItemsEnabled;
if (!state.monsterStates.length) resetMonsterStates(currentMap());
state.monsterStates.forEach(monster => {
    monster.hp = Math.min(monster.hp, currentMap().health);
});
syncLegacyEnemyState();
ensureLiveMonsterTarget();
render();
if (state.currentView === 'upgrades') {
    centerSkillTreeOnOrigin(skillTreeNeedsInitialFraming);
    skillTreeNeedsInitialFraming = false;
}
if (!hasSavedGame) saveGame();

setInterval(function() {
    if (!state.combatPaused) {
        const now = performance.now();
        const elapsed = Math.min((now - lastTick) / 1000, gameTickSeconds);
        lastTick = now;
        const map = currentMap();
        const killsBeforeTick = state.kills[map.id];
        ensureLiveMonsterTarget();
        const previousTarget = activeMonster();
        let anyRespawned = false;
        state.monsterStates.forEach(monster => {
            if (monster.hp > 0 || monster.respawnRemaining <= 0) return;
            monster.respawnRemaining = Math.max(0, monster.respawnRemaining - elapsed);
            if (monster.respawnRemaining === 0) {
                monster.hp = map.health;
                monster.attackTimer = 0;
                anyRespawned = true;
            }
        });
        state.monsterStates.forEach(monster => {
            if (monster.hp > 0) tickMonsterPoison(monster, elapsed);
        });
        ensureLiveMonsterTarget();
        syncLegacyEnemyState();
        const target = activeMonster();
        state.monsterStates.forEach(monster => {
            if (monster.hp <= 0 || state.combatPaused) return;
            monster.attackTimer += elapsed;
            while (monster.attackTimer >= map.attackInterval && !state.combatPaused) {
                monster.attackTimer -= map.attackInterval;
                if (Math.random() * 100 < getEnemyHitChance()) {
                    const previousPlayerHp = state.playerHp;
                    state.playerHp = Math.max(0, state.playerHp - map.attackDamage);
                    recentPlayerDamage = previousPlayerHp - state.playerHp;
                    nudgePlayerHealthBar();
                    elements.playerHealthDamage.classList.remove('is-visible');
                    void elements.playerHealthDamage.offsetWidth;
                    elements.playerHealthDamage.classList.add('is-visible');
                    window.clearTimeout(damageFadeTimeout);
                    damageFadeTimeout = window.setTimeout(function() {
                        elements.playerHealthDamage.classList.remove('is-visible');
                    }, 500);
                    if (state.playerHp === 0) {
                        state.combatPaused = true;
                        state.attackTimer = 0;
                    }
                } else {
                    flashDodge(elements.playerHealthTrack);
                }
            }
        });
        if (!target) {
            state.attackTimer = 0;
            if (state.kills[map.id] !== killsBeforeTick || anyRespawned) render();
            else renderCombat();
        } else {
            if (!previousTarget && target || anyRespawned && previousTarget && target.id !== previousTarget.id) {
                state.attackTimer = 0;
            }
            const attackInterval = getAttackSpeed();
            state.attackTimer += elapsed;
            while (state.attackTimer >= attackInterval && !state.combatPaused) {
                state.attackTimer -= attackInterval;
                const attackTargets = getPlayerAttackTargets();
                for (let attackIndex = 0; attackIndex < attackTargets.length; attackIndex++) {
                    const attackTarget = attackTargets[attackIndex];
                    if (attackTarget.hp <= 0) continue;
                    const targetCard = Array.from(elements.enemyRoster.children)
                        .find(card => card.dataset.monsterId === attackTarget.id);
                    if (Math.random() * 100 < getHitChance(getPlayerAccuracy(), map.evasion)) {
                        const hitDamage = getDamage();
                        if (attackIndex > 0) showMonsterHitBadge(attackTarget.id, 'MULTI-HIT', true);
                        applyDamageToMonster(attackTarget, hitDamage, 'physical');
                        tryApplyPoison(attackTarget);
                        triggerShockwaveSlash(attackTarget, hitDamage);
                    } else {
                        const targetTrack = targetCard && targetCard.querySelector('.health-track');
                        if (targetTrack) flashDodge(targetTrack);
                    }
                }
            }
            if (state.kills[map.id] !== killsBeforeTick || state.combatPaused || anyRespawned) {
                render();
            } else {
                renderCombat();
            }
        }
    } else {
        const now = performance.now();
        const elapsed = Math.min((now - lastTick) / 1000, gameTickSeconds);
        lastTick = now;
        const map = currentMap();
        const killsBefore = state.kills[map.id];
        state.monsterStates.forEach(monster => {
            if (monster.hp > 0) tickMonsterPoison(monster, elapsed);
        });
        syncLegacyEnemyState();
        if (state.kills[map.id] !== killsBefore) render();
        else renderCombat();
    }

    if (Date.now() - lastSave >= 1000) saveGame();
}, gameTickMilliseconds);

let skillTreePanListenersAdded = false;

function clampSkillTreePan(viewport, board) {
    if (!viewport || !board) return;
    const width = board.offsetWidth * skillTreeZoom;
    const height = board.offsetHeight * skillTreeZoom;
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;

    // Keep the viewport center over the board, so an edge cannot be dragged
    // so far away that the skill tree becomes unreachable.
    skillTreePanX = Math.max(viewportWidth / 2 - width, Math.min(viewportWidth / 2, skillTreePanX));
    skillTreePanY = Math.max(viewportHeight / 2 - height, Math.min(viewportHeight / 2, skillTreePanY));
}

function centerSkillTreeOnOrigin(resetZoom = false) {
    const viewport = document.querySelector('.skill-tree-viewport');
    const board = viewport && viewport.querySelector('.skill-tree-board');
    const origin = board && board.querySelector('[data-skill-node="origin"]');
    if (!viewport || !board || !origin) return;

    if (resetZoom) skillTreeZoom = initialSkillTreeZoom;
    renderUpgrades();
    skillTreePanX = viewport.clientWidth / 2 - (origin.offsetLeft + origin.offsetWidth / 2) * skillTreeZoom;
    skillTreePanY = viewport.clientHeight / 2 - (origin.offsetTop + origin.offsetHeight / 2) * skillTreeZoom;
    clampSkillTreePan(viewport, board);
    renderUpgrades();
}

function initSkillTreePan(viewport) {
    if (!viewport || skillTreePanListenersAdded) return;
    skillTreePanListenersAdded = true;
    const tooltip = viewport.querySelector('#skillNodeTooltip');
    const tooltipTitle = tooltip.querySelector('strong');
    const tooltipDescription = tooltip.querySelector('span');
    function showNodeTooltip(button) {
        const node = skillNodeById[button.dataset.skillNode];
        if (!node) return;
        tooltipTitle.textContent = node.name;
        tooltipDescription.textContent = node.effect;
        tooltip.hidden = false;
        tooltip.style.left = '0px';
        tooltip.style.top = '0px';
        const viewportRect = viewport.getBoundingClientRect();
        const nodeRect = button.getBoundingClientRect();
        const left = Math.max(8, Math.min(
            viewport.clientWidth - tooltip.offsetWidth - 8,
            nodeRect.left - viewportRect.left + (nodeRect.width - tooltip.offsetWidth) / 2
        ));
        let top = nodeRect.top - viewportRect.top - tooltip.offsetHeight - 10;
        if (top < 8) top = Math.min(viewport.clientHeight - tooltip.offsetHeight - 8, nodeRect.bottom - viewportRect.top + 10);
        tooltip.style.left = Math.max(8, left) + 'px';
        tooltip.style.top = Math.max(8, top) + 'px';
    }
    function hideNodeTooltip() {
        tooltip.hidden = true;
    }
    viewport.addEventListener('pointerover', function(event) {
        const button = event.target.closest('[data-skill-node]');
        if (!button || (event.relatedTarget && button.contains(event.relatedTarget))) return;
        showNodeTooltip(button);
    });
    viewport.addEventListener('pointerout', function(event) {
        const button = event.target.closest('[data-skill-node]');
        if (button && !(event.relatedTarget && button.contains(event.relatedTarget))) hideNodeTooltip();
    });
    viewport.addEventListener('focusin', function(event) {
        const button = event.target.closest('[data-skill-node]');
        if (button) showNodeTooltip(button);
    });
    viewport.addEventListener('focusout', function(event) {
        if (event.target.closest('[data-skill-node]')) hideNodeTooltip();
    });
    viewport.addEventListener('pointerdown', function(event) {
        if (event.button !== 0) return;
        if (event.target.closest('[data-skill-node], [data-skill-tree-control]')) return;
        skillTreePanning = true;
        skillTreePanStartX = event.clientX;
        skillTreePanStartY = event.clientY;
        viewport.classList.add('is-panning');
    });
    window.addEventListener('pointermove', function(event) {
        if (!skillTreePanning) return;
        skillTreePanX += event.clientX - skillTreePanStartX;
        skillTreePanY += event.clientY - skillTreePanStartY;
        skillTreePanStartX = event.clientX;
        skillTreePanStartY = event.clientY;
        clampSkillTreePan(viewport, viewport.querySelector('.skill-tree-board'));
        renderUpgrades();
    });
    window.addEventListener('pointerup', function() {
        skillTreePanning = false;
        viewport.classList.remove('is-panning');
    });
    window.addEventListener('pointercancel', function() {
        skillTreePanning = false;
        viewport.classList.remove('is-panning');
    });

    // Scroll wheel zoom on the skill tree viewport
    viewport.addEventListener('wheel', function(event) {
        event.preventDefault();
        const delta = -event.deltaY * 0.001;
        const nextZoom = Math.max(0.1, Math.min(3, skillTreeZoom + delta));
        if (nextZoom === skillTreeZoom) return;
        const rect = viewport.getBoundingClientRect();
        const cursorX = event.clientX - rect.left;
        const cursorY = event.clientY - rect.top;
        const boardX = (cursorX - skillTreePanX) / skillTreeZoom;
        const boardY = (cursorY - skillTreePanY) / skillTreeZoom;
        skillTreeZoom = nextZoom;
        skillTreePanX = cursorX - boardX * skillTreeZoom;
        skillTreePanY = cursorY - boardY * skillTreeZoom;
        clampSkillTreePan(viewport, viewport.querySelector('.skill-tree-board'));
        renderUpgrades();
    }, { passive: false });
}

// Re-init pan listeners whenever the skill tree is rendered
const originalRenderUpgrades = renderUpgrades;
renderUpgrades = function() {
    originalRenderUpgrades();
    const viewport = document.querySelector('.skill-tree-viewport');
    initSkillTreePan(viewport);
};

window.addEventListener('beforeunload', saveGame);
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') saveGame();
});
