const saveKey = 'idleAdventureSave';
const worldContent = WorldContent.clone(window.adventureWorld);
const worldContentErrors = WorldContent.validate(worldContent);
if (worldContentErrors.length) throw new Error('World content could not be loaded: ' + worldContentErrors.join(' '));
const worldData = worldContent.worlds;
const mapData = worldContent.maps.map(map => {
    const first = WorldContent.definitions(worldContent, map)[0];
    // First-monster fields retain compatibility with legacy save migration.
    return {...WorldContent.defaults, ...first, ...map, enemy: first.name, drops: map.drops || [], itemDrops: map.itemDrops || []};
});
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
    map.drops = (map.drops || []).filter(drop => Object.hasOwn(materialNames, drop.id));
    map.itemDrops = (map.itemDrops || []).filter(drop =>
        Object.hasOwn(itemById, drop.id) && !itemById[drop.id].developerOnly);
});

const materialSources = WorldContent.sources(worldContent);

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
const skillTreeData = SkillDescriptions.normalize(SkillStatCompat.normalize(window.adventureSkillTree));
if (!skillTreeData || !Array.isArray(skillTreeData.nodes)) {
    throw new Error('Idle Adventure skill tree data could not be loaded.');
}
const skillNodes = skillTreeData.nodes;
const skillNodeById = Object.fromEntries(skillNodes.map(node => [node.id, node]));
// Content stores each line once; gameplay can follow it in either direction.
const skillNodeConnections = Object.fromEntries(skillNodes.map(node => [node.id, new Set()]));
skillNodes.forEach(node => node.requires.forEach(id => {
    if (!skillNodeConnections[id]) return;
    skillNodeConnections[node.id].add(id);
    skillNodeConnections[id].add(node.id);
}));
const experienceForNextLevel = level =>
    level === 0
        ? 50
        : skillTreeData.experienceBase + (level - 1) * skillTreeData.experiencePerLevel;

const basePlayerMaxHealth = 100;
const basePlayerMaxFury = 0;
const basePlayerMaxShields = 10;
const shieldSlamDamagePerStack = 1;
const furySecondsPerStack = 0.1;
const furyStackDecaySeconds = 0.5;
const furyDamagePerStack = 0.02;
const righteousFireSettings = Object.freeze({regenHealthCap: 0.3, healthDrainPerSecond: 0.1});
const righteousFireNodeIds = Object.freeze(['fireOfTheRighteous', 'righteousFire']);
const playerAccuracy = 100;
const basePlayerEvasion = 25;
const baseMultiHit = 1;
const gameTickMilliseconds = 100;
const gameTickSeconds = gameTickMilliseconds / 1000;
const combatStatFormatter = new Intl.NumberFormat('en-US', {maximumFractionDigits: 2});
const buffAmountFormatter = new Intl.NumberFormat('en-US', {notation: 'compact', maximumFractionDigits: 1});

let skillTreeZoom = 1;
let skillTreePanX = 0;
let skillTreePanY = 0;
let skillTreeNeedsInitialFraming = true;
const initialSkillTreeZoom = 1.1;
let pendingSkillRanks = {};
let skillTreePanning = false;
let skillTreePanStartX = 0;
let skillTreePanStartY = 0;
let renderedLoot;
let renderedLootMessage;

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
    developerTravelEnabled: false,
    crafted: [],
    tutorials: createTutorialState(),
    selectedWorld: worldData[0].id,
    lastMapByWorld: Object.fromEntries(worldData.map(world => [world.id, world.mapIds[0]])),
    selectedMap: worldData[0].mapIds[0],
    mapListExpanded: true,
    isInTown: true,
    currentView: 'town',
    enemyHp: mapData.find(map => map.id === worldData[0].mapIds[0]).health,
    enemyRespawnRemaining: 0,
    monsterStates: [],
    pendingEruptions: [],
    monsterColumns: 1,
    targetMonsterId: null,
    playerHp: basePlayerMaxHealth,
    furyStacks: 0,
    furyRemaining: 0,
    furyDecaying: false,
    shieldStacks: 0,
    combatPaused: false,
    attackTimer: 0,
    lootLog: [],
    lastDrop: 'Defeat enemies to find loot.',
    lastLoot: null
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
    bleedChance: document.querySelector('#bleedChanceDisplay'),
    speed: document.querySelector('#speedDisplay'),
    accuracy: document.querySelector('#accuracyDisplay'),
    evasion: document.querySelector('#evasionDisplay'),
    maxHealth: document.querySelector('#maxHealthDisplay'),
    detailedStats: document.querySelector('#detailedStats'),
    detailedStatsList: document.querySelector('#detailedStatsList'),
    maxFury: document.querySelector('#maxFuryDisplay'),
    healthRegen: document.querySelector('#healthRegenDisplay'),
    worldPanel: document.querySelector('.world-panel'),
    worldList: document.querySelector('#worldList'),
    mapList: document.querySelector('#mapList'),
    mapPanel: document.querySelector('.map-panel'),
    mapSelectionHint: document.querySelector('.map-selection-hint'),
    combatPanel: document.querySelector('.combat-panel'),
    combatArt: document.querySelector('#combatMonsterArt'),
    mapName: document.querySelector('#currentMapName'),
    mapDescription: document.querySelector('#mapDescription'),
    killProgress: document.querySelector('#killProgress'),
    killProgressLabel: document.querySelector('#killProgressLabel'),
    enemyRoster: document.querySelector('#enemyRoster'),
    mapLootTable: document.querySelector('#mapLootTable'),
    lootTableHeading: document.querySelector('#lootTableHeading'),
    playerHealthBar: document.querySelector('#playerHealthBar'),
    playerHealthDamage: document.querySelector('#playerHealthDamage'),
    playerHealthTrack: document.querySelector('.player-health-track'),
    playerHealthPanel: document.querySelector('.player-health'),
    playerHealthText: document.querySelector('#playerHealthText'),
    buffList: document.querySelector('#buffList'),
    buffEmpty: document.querySelector('#buffEmpty'),
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
let lastWallTick = Date.now();
let lastSimulatedAt = lastWallTick;
let pendingCombatSeconds = 0;
let combatContinuation = null;
let combatNeedsFullRender = false;
let combatCatchingUp = false;
let combatCatchupUiActive = false;
let simulatingCombat = false;
// undefined presents immediately; null suppresses effects; an array collects a live step.
let combatEffects;
let combatStatCache = null;
let combatPoisonForecasts = null;
let combatAnimationRestarts = null;
let combatEffectLayout = null;
const combatBuffViews = new Map();
const detailedStatViews = new Map();
let resolvingShieldSlam = false;
elements.detailedStats.addEventListener('toggle', renderDetailedStats);
// Presentation-only hit times; never saved or advanced by offline simulation.
const righteousFireHitUntil = new WeakMap();
let lastSave = Date.now();
let pendingOfflineRecap = null;
let offlineRecapReport = null;
let offlineRecapShown = false;

function captureOfflineRecapProgress() {
    return {
        gold: state.gold, level: state.level, experience: state.experience,
        materials: {...state.materials}, ownedItemIds: [...state.ownedItemIds]
    };
}

function normalizeOfflineRecap(value) {
    const before = value?.before;
    if (!value || !Number.isFinite(value.startedAt) || value.startedAt <= 0 ||
        !before || !['gold', 'level', 'experience'].every(key => Number.isSafeInteger(before[key]) && before[key] >= 0) ||
        !before.materials || typeof before.materials !== 'object' || Array.isArray(before.materials) ||
        !Array.isArray(before.ownedItemIds)) return null;
    return {
        startedAt: Math.min(value.startedAt, Date.now()), returnedAt: Date.now(),
        before: {
            gold: before.gold, level: before.level, experience: before.experience,
            materials: Object.fromEntries(Object.keys(materialNames).map(id => [id,
                Number.isSafeInteger(before.materials[id]) && before.materials[id] >= 0 ? before.materials[id] : 0])),
            ownedItemIds: before.ownedItemIds.filter(id => typeof id === 'string' && Object.hasOwn(itemById, id))
        }
    };
}

function startOfflineRecap() {
    offlineRecapReport = null;
    offlineRecapShown = false;
    if (pendingOfflineRecap) pendingOfflineRecap.returnedAt = Date.now();
    // Avoid a popup for a quick refresh. Tab switches never start a recap.
    else if (pendingCombatSeconds >= 5) pendingOfflineRecap = {
        startedAt: lastSimulatedAt, returnedAt: Date.now(), before: captureOfflineRecapProgress()
    };
}

function buildOfflineRecap(session) {
    const before = session.before, after = captureOfflineRecapProgress();
    const totalExperience = progress => {
        const levels = Math.max(0, progress.level - 1);
        return progress.experience + (progress.level > 0 ? experienceForNextLevel(0) : 0) +
            levels * skillTreeData.experienceBase + levels * (levels - 1) / 2 * skillTreeData.experiencePerLevel;
    };
    const levelPosition = progress => progress.level + progress.experience / experienceForNextLevel(progress.level);
    return {
        elapsedSeconds: Math.max(0, (session.returnedAt - session.startedAt) / 1000),
        gold: Math.max(0, after.gold - before.gold),
        experience: Math.max(0, totalExperience(after) - totalExperience(before)),
        levelPercent: Math.max(0, (levelPosition(after) - levelPosition(before)) * 100),
        startLevel: before.level, endLevel: after.level,
        materials: Object.keys(materialNames).map(id => ({id, amount: after.materials[id] - (before.materials[id] || 0)})).filter(drop => drop.amount > 0),
        items: after.ownedItemIds.filter(id => !before.ownedItemIds.includes(id) && Object.hasOwn(itemById, id)).map(id => ({id, amount: 1})),
        dead: state.combatPaused
    };
}

function formatOfflineRecapDuration(seconds) {
    let remaining = Math.max(0, Math.floor(seconds));
    const parts = [];
    for (const [unit, length] of [['d', 86400], ['h', 3600], ['m', 60], ['s', 1]]) {
        const amount = Math.floor(remaining / length);
        if (amount) parts.push(amount + unit);
        remaining %= length;
    }
    return parts.join(' ') || '0s';
}

function renderOfflineRecapRewards(container, drops, equipment) {
    container.replaceChildren();
    for (const drop of drops) {
        const item = equipment ? itemById[drop.id] : itemData.materialDetails?.[drop.id];
        const row = document.createElement('li');
        row.dataset[equipment ? 'itemId' : 'materialId'] = drop.id;
        if (equipment) row.dataset.rarity = item.rarity;
        const name = document.createElement('span'); name.className = 'offline-recap-reward-name';
        name.textContent = equipment ? item.name : materialNames[drop.id];
        const quantity = document.createElement('strong'); quantity.textContent = '+' + formatAmount(drop.amount);
        row.append(Equipment.createIcon(item), name, quantity); container.append(row);
    }
    if (!drops.length) {
        const empty = document.createElement('li'); empty.className = 'offline-recap-empty';
        empty.textContent = equipment ? 'No equipment found.' : 'No materials found.';
        container.append(empty);
    }
}

function showOfflineRecap() {
    if (!pendingOfflineRecap) return;
    if (!offlineRecapReport) offlineRecapReport = buildOfflineRecap(pendingOfflineRecap);
    if (document.hidden || offlineRecapShown) return;
    const report = offlineRecapReport, dialog = document.getElementById('offlineRecap');
    document.getElementById('offlineRecapTime').textContent = 'You were away for ' + formatOfflineRecapDuration(report.elapsedSeconds) + '.';
    document.getElementById('offlineRecapGold').textContent = '+' + formatAmount(report.gold);
    document.getElementById('offlineRecapXp').textContent = '+' + formatAmount(report.experience) + ' XP';
    const percent = report.levelPercent > 0 && report.levelPercent < .01 ? '<0.01' : combatStatFormatter.format(report.levelPercent);
    document.getElementById('offlineRecapLevels').textContent = '+' + percent + '% level progress · Level ' + report.startLevel + ' → ' + report.endLevel;
    document.getElementById('offlineRecapDeath').hidden = !report.dead;
    renderOfflineRecapRewards(document.getElementById('offlineRecapMaterials'), report.materials, false);
    renderOfflineRecapRewards(document.getElementById('offlineRecapItems'), report.items, true);
    dialog.showModal();
    offlineRecapShown = true;
    saveGame();
}

function clearOfflineRecap() {
    pendingOfflineRecap = null; offlineRecapReport = null; offlineRecapShown = false;
    const dialog = document.getElementById('offlineRecap');
    if (dialog.open) dialog.close();
}

function dismissOfflineRecap() {
    clearOfflineRecap();
    saveGame();
}

document.getElementById('offlineRecapContinue').addEventListener('click', dismissOfflineRecap);
document.getElementById('offlineRecapClose').addEventListener('click', dismissOfflineRecap);
document.getElementById('offlineRecap').addEventListener('close', event => {
    if (offlineRecapShown && !event.currentTarget.open) dismissOfflineRecap();
});
document.getElementById('offlineRecap').addEventListener('click', event => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dismissOfflineRecap();
});

function presentCombatEffect(effect) {
    if (combatEffects === null || document.hidden) return;
    if (combatEffects) combatEffects.push(effect);
    else effect();
}

function cachedCombatStat(key, calculate) {
    if (!combatStatCache) return calculate();
    if (!combatStatCache.has(key)) combatStatCache.set(key, calculate());
    return combatStatCache.get(key);
}

function restartCombatAnimation(element, className) {
    element.classList.remove(className);
    if (combatAnimationRestarts) {
        if (!combatAnimationRestarts.has(element)) combatAnimationRestarts.set(element, new Set());
        combatAnimationRestarts.get(element).add(className);
    } else {
        void element.offsetWidth;
        element.classList.add(className);
    }
}

function flushCombatEffects(effects) {
    if (!effects.length) return;
    const previousRestarts = combatAnimationRestarts;
    if (previousRestarts) { effects.forEach(effect => effect()); return; }
    combatAnimationRestarts = new Map();
    combatEffectLayout = {
        cards: new Map(Array.from(elements.enemyRoster.children, card => [card.dataset.monsterId, card])),
        bounds: new WeakMap(),
        frame: null
    };
    try { effects.forEach(effect => effect()); }
    finally {
        const restarts = combatAnimationRestarts;
        combatAnimationRestarts = previousRestarts;
        combatEffectLayout = null;
        // Restart all hit flashes together after a single layout flush.
        if (restarts.size) void elements.combatPanel.offsetWidth;
        restarts.forEach((classes, element) => classes.forEach(name => element.classList.add(name)));
    }
}

function getCombatEffectCard(id) {
    return combatEffectLayout ? combatEffectLayout.cards.get(id) :
        Array.from(elements.enemyRoster.children).find(card => card.dataset.monsterId === id);
}

function getCombatEffectBounds(element) {
    if (!combatEffectLayout) return element.getBoundingClientRect();
    if (!combatEffectLayout.bounds.has(element)) combatEffectLayout.bounds.set(element, element.getBoundingClientRect());
    return combatEffectLayout.bounds.get(element);
}

function getCombatOverlayBounds(svg) {
    // All combat overlays use the same absolute inset and dimensions. Reuse
    // their coordinate frame only for this synchronous batch of effects.
    if (!combatEffectLayout) return svg.getBoundingClientRect();
    return combatEffectLayout.frame ||= svg.getBoundingClientRect();
}
let selectedGearSlot = 'weapon';
let inventoryCategory = 'slot';
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
elements.combatArt.addEventListener('error', () => {
    elements.combatArt.hidden = true;
    elements.combatPanel.classList.remove('has-monster-art');
});
const poisonDamageType = {
    baseDamage: 1,
    durationSeconds: 5,
    tickIntervalSeconds: 1
};

function currentMap() {
    return mapData.find(map => map.id === state.selectedMap) || mapData.find(map => map.id === worldData[0].mapIds[0]);
}

const monsterDefinitionCache = new WeakMap();
const monsterDefinitionIndices = new WeakMap();
function monsterDefinitions(map = currentMap()) {
    if (monsterDefinitionCache.has(map)) return monsterDefinitionCache.get(map);
    const definitions = WorldContent.definitions(worldContent, map).map(monster => ({
        ...monster,
        drops: monster.drops.filter(drop => Object.hasOwn(materialNames, drop.id)),
        itemDrops: monster.itemDrops.filter(drop => Object.hasOwn(itemById, drop.id) && !itemById[drop.id].developerOnly)
    }));
    monsterDefinitionCache.set(map, definitions);
    monsterDefinitionIndices.set(map, new Map(definitions.map(definition => [definition.id, definition])));
    return definitions;
}

function monsterDefinition(monster, map = currentMap()) {
    const definitions = monsterDefinitions(map);
    return monsterDefinitionIndices.get(map).get(monster?.id) || definitions[0];
}

function createMonsterStates(map, savedStates, legacyHp, legacyRespawn) {
    return monsterDefinitions(map).map((definition, index) => {
        const saved = Array.isArray(savedStates)
            ? savedStates.find(monster => monster.id === definition.id) || savedStates[index]
            : null;
        const hp = saved
            ? Math.max(0, Math.min(definition.health, saved.hp))
            : index === 0 && Number.isFinite(legacyHp) ? Math.max(0, Math.min(definition.health, legacyHp)) : definition.health;
        const respawnRemaining = saved
            ? Math.max(0, Math.min(definition.respawnSeconds, saved.respawnRemaining))
            : index === 0 && hp === 0 ? Math.max(0, Math.min(definition.respawnSeconds, legacyRespawn || 0)) : 0;
        return {
            id: definition.id,
            hp: hp === 0 && respawnRemaining === 0 ? definition.health : hp,
            respawnRemaining,
            attackTimer: saved && Number.isFinite(saved.attackTimer) ? Math.max(0, saved.attackTimer) : 0,
            freezeRemaining: saved && Number.isFinite(saved.freezeRemaining)
                ? Math.max(0, Math.min(arrowSkillSettings.freezeDuration, saved.freezeRemaining)) : 0,
            poisonStacks: saved && Array.isArray(saved.poisonStacks)
                ? saved.poisonStacks.filter(stack => stack &&
                    Number.isFinite(stack.remainingDuration) && stack.remainingDuration > 0 &&
                    Number.isFinite(stack.timeUntilTick) && stack.timeUntilTick > 0)
                    .map(stack => ({
                        remainingDuration: stack.remainingDuration,
                        timeUntilTick: stack.timeUntilTick
                    }))
                : [],
            bleed: hp > 0 && saved?.bleed && isValidBleedState(saved.bleed)
                ? {...saved.bleed, baseDamagePerTick:saved.bleed.baseDamagePerTick ?? saved.bleed.stacks} : null
        };
    });
}

function resetMonsterStates(map = currentMap()) {
    resetDamageBreakdown(map.id);
    monsterDefinitionCache.delete(map);
    state.pendingEruptions = [];
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
    const multiHit = getMultiHit();
    const guaranteedHits = Math.floor(multiHit);
    const extraHit = Math.random() < multiHit - guaranteedHits ? 1 : 0;
    const targets = [];
    for (let offset = 0; offset < state.monsterStates.length && targets.length < guaranteedHits + extraHit; offset++) {
        const monster = state.monsterStates[(targetIndex + offset) % state.monsterStates.length];
        if (monster.hp > 0) targets.push(monster);
    }
    return targets;
}

function setInitialMonsterTarget() {
    const monster = state.monsterStates.find(entry => entry.hp > 0) || state.monsterStates[0];
    state.targetMonsterId = monster ? monster.id : null;
}

function selectNextMonsterTarget(defeatedMonster) {
    // Splash, poison and burning kills must not interrupt a different target.
    if (defeatedMonster.id !== state.targetMonsterId) return;
    state.attackTimer = 0;
    clearEnemyDamageIndicator();
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
    presentCombatEffect(() => {
        recentEnemyDamage = 0;
        elements.enemyRoster.querySelectorAll('.enemy-health-damage, .enemy-health-poison-damage').forEach(indicator => {
            window.clearTimeout(enemyDamageIndicatorTimers.get(indicator));
            indicator.classList.remove('is-visible');
            if (indicator.classList.contains('enemy-health-poison-damage')) {
                indicator.style.left = '0%';
                indicator.style.width = '0%';
            }
        });
    });
}

function flashDodge(track) {
    presentCombatEffect(() => {
        window.clearTimeout(dodgeFlashTimeouts.get(track));
        restartCombatAnimation(track, 'is-dodging');
        dodgeFlashTimeouts.set(track, window.setTimeout(function() {
            track.classList.remove('is-dodging');
            dodgeFlashTimeouts.delete(track);
        }, 420));
    });
}

function showMonsterProc(monsterId, procName) {
    presentCombatEffect(() => {
        const card = getCombatEffectCard(monsterId);
        const notice = card && card.querySelector('[data-enemy-proc-notice]');
        if (!notice) return;

        const activeProcs = (notice.dataset.activeProcs || '').split('|').filter(Boolean);
        if (!activeProcs.includes(procName)) activeProcs.push(procName);
        notice.dataset.activeProcs = activeProcs.join('|');
        notice.textContent = activeProcs.join(' · ');
        restartCombatAnimation(notice, 'is-visible');

        window.clearTimeout(monsterProcTimers.get(notice));
        monsterProcTimers.set(notice, window.setTimeout(function() {
            notice.textContent = '';
            notice.dataset.activeProcs = '';
            notice.classList.remove('is-visible');
            monsterProcTimers.delete(notice);
        }, 1100));
    });
}

function showPoisonStackProc(monster) {
    presentCombatEffect(() => {
        const card = getCombatEffectCard(monster.id);
        const indicator = card && card.querySelector('[data-enemy-dot-status]');
        if (!indicator) return;
        indicator.hidden = false;
        indicator.querySelector('[data-enemy-dot-count]').textContent = monster.poisonStacks.length + 'x';
        restartCombatAnimation(indicator, 'is-applying');
    });
}

function flashShockwaveHealthBar(monsterId) {
    presentCombatEffect(() => {
        const card = getCombatEffectCard(monsterId);
        const healthTrack = card && card.querySelector('.health-track');
        if (!healthTrack) return;
        restartCombatAnimation(healthTrack, 'is-shockwave-hit');
    });
}

function showMonsterHitBadge(monsterId, label, isMultiHit = false, priority = 0) {
    presentCombatEffect(() => {
        const card = getCombatEffectCard(monsterId);
        if (!card) return;
        const notice = card.querySelector('[data-combat-hit-badge]');
        if (notice) {
            if ((notice.classList.contains('is-visible') || combatAnimationRestarts?.get(notice)?.has('is-visible')) &&
                Number(notice.dataset.hitPriority || 0) > priority) return;
            notice.dataset.hitPriority = String(priority);
            notice.hidden = false;
            notice.textContent = label;
            notice.classList.toggle('is-multihit', isMultiHit);
            restartCombatAnimation(notice, 'is-visible');
            window.clearTimeout(shockwaveHitTimers.get(notice));
            shockwaveHitTimers.set(notice, window.setTimeout(() => {
                notice.classList.remove('is-visible');
                shockwaveHitTimers.delete(notice);
            }, priority > 0 ? arrowVisualDurations.forkingArrow : 1500));
        }
    });
}

function flashShockwaveCard(monsterId) {
    presentCombatEffect(() => {
        const card = getCombatEffectCard(monsterId);
        if (!card) return;
        restartCombatAnimation(card, 'is-shockwave-splashed');
    });
}

function flashPlayerHealthBar() {
    presentCombatEffect(() => {
        restartCombatAnimation(elements.playerHealthTrack, 'is-damaged');
    });
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
    return cachedCombatStat('getSkillStat:' + stat, () => {
        return getSkillStatFromRanks(stat, state.skillRanks);
    });
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
    return cachedCombatStat('getGearStat:' + stat, () => {
        return Equipment.aggregate(getEquippedItems(), stat);
    });
}

function getPlayerMaxHealth() {
    return Math.max(1, Math.round((basePlayerMaxHealth + getSkillStat('health') + getGearStat('health')) *
        getSkillMultiplier('healthMultiplier') * getGearStat('healthMultiplier')));
}

function getPlayerMaxFury() {
    return cachedCombatStat('getPlayerMaxFury', () => Math.max(0, Math.round((basePlayerMaxFury + getSkillStat('maxFury') + getGearStat('maxFury')) *
        getSkillMultiplier('maxFuryMultiplier') * getGearStat('maxFuryMultiplier'))));
}

function clearFury() {
    state.furyStacks = 0;
    state.furyRemaining = 0;
    state.furyDecaying = false;
}

function getPlayerMaxShields() {
    return cachedCombatStat('getPlayerMaxShields', () => Math.max(0, Math.round(
        (basePlayerMaxShields + getSkillStat('maxShields') + getGearStat('maxShields')) *
        getSkillMultiplier('maxShieldsMultiplier') * getGearStat('maxShieldsMultiplier'))));
}

function hasShieldGeneration() {
    return getSkillNodeRank('shieldGenerator') > 0 || getSkillNodeRank('resonantGuard') > 0;
}

function normalizeShields() {
    state.shieldStacks = hasShieldGeneration()
        ? Math.min(getPlayerMaxShields(), Math.max(0, Math.floor(state.shieldStacks))) : 0;
}

function gainShields() {
    if (!hasShieldGeneration() || state.playerHp <= 0 || state.combatPaused) return;
    normalizeShields();
    state.shieldStacks = Math.min(getPlayerMaxShields(), state.shieldStacks + 1);
    tryShieldSlam();
}

function gainShieldFromKill() {
    if (getSkillNodeRank('shieldGenerator') > 0) gainShields();
}

function tryShieldSlam() {
    if (resolvingShieldSlam || getSkillNodeRank('shieldSlam') <= 0 || state.playerHp <= 0 || state.combatPaused) return;
    normalizeShields();
    const maximum = getPlayerMaxShields();
    if (!maximum || state.shieldStacks < maximum) return;
    // A slam kill can grant another shield. Resolve those triggers iteratively,
    // including a capacity of one, without recursively overflowing the stack.
    resolvingShieldSlam = true;
    try {
        while (state.shieldStacks >= maximum) {
            const target = activeMonster() || state.monsterStates.find(monster => monster.hp > 0);
            if (!target) break; // Keep shields until there is a target to slam.
            const consumed = Math.max(1, Math.floor(state.shieldStacks / 2));
            state.shieldStacks -= consumed;
            let remainingDamage = getDamage() * shieldSlamDamagePerStack * consumed;
            const overflowing = getSkillNodeRank('overflowingSlam') > 0;
            const hitIds = [];
            let slamTarget = target;
            while (slamTarget && remainingDamage > 1e-8) {
                const healthBefore = slamTarget.hp;
                hitIds.push(slamTarget.id);
                applyDamageToMonster(slamTarget, remainingDamage, 'physical', hitIds.length === 1 ? 'shieldSlam' : 'overflowingSlam');
                tryApplyPoison(slamTarget);
                // Only unused physical damage carries on. Poison executions
                // and newly gained Fury cannot increase this slam's budget.
                remainingDamage = Math.max(0, remainingDamage - healthBefore);
                if (!overflowing || slamTarget.hp > 0 || remainingDamage <= 1e-8) break;
                slamTarget = activeMonster();
            }
            showShieldSlamWave(hitIds);
        }
    } finally {
        resolvingShieldSlam = false;
    }
}

function normalizeFury() {
    const maximum = getPlayerMaxFury();
    state.furyStacks = Math.min(maximum, Math.max(0, state.furyStacks));
    // The countdown between lost stacks keeps its own interval, even when
    // a low stack count has a shorter maximum duration from hits.
    const durationCap = state.furyDecaying ? furyStackDecaySeconds : state.furyStacks * furySecondsPerStack;
    state.furyRemaining = Math.min(state.furyRemaining, durationCap);
    if (state.furyStacks === 0) clearFury();
}

function gainFuryFromHit() {
    if (state.playerHp <= 0 || state.combatPaused) return;
    normalizeFury();
    const maximum = getPlayerMaxFury();
    if (!maximum) return;
    state.furyStacks = Math.min(maximum, state.furyStacks + 1);
    state.furyRemaining = Math.min(state.furyStacks * furySecondsPerStack, state.furyRemaining + furySecondsPerStack);
    state.furyDecaying = false;
}

function tickFury(elapsed) {
    normalizeFury();
    if (!state.furyStacks) return;
    state.furyRemaining -= elapsed;
    // After the shared timer expires, lose one stack per half second.
    // Preserve elapsed overshoot so offline and foreground steps agree.
    if (state.furyRemaining < 1e-8) {
        const lostStacks = Math.min(state.furyStacks, 1 + Math.floor((1e-8 - state.furyRemaining) / furyStackDecaySeconds));
        state.furyStacks -= lostStacks;
        state.furyRemaining += lostStacks * furyStackDecaySeconds;
        state.furyDecaying = state.furyStacks > 0;
        if (!state.furyStacks) clearFury();
    }
}

function formatBuffAmount(amount) {
    const rounded = Math.round(amount);
    return rounded < 1000 ? String(rounded) : buffAmountFormatter.format(rounded).toLowerCase();
}

function renderBuffs(buffs) {
    const activeIds = new Set(buffs.map(buff => buff.id));
    combatBuffViews.forEach((view, id) => {
        if (!activeIds.has(id)) { view.element.remove(); combatBuffViews.delete(id); }
    });
    buffs.forEach((buff, index) => {
        let view = combatBuffViews.get(buff.id);
        if (!view) {
            const element = document.createElement('li');
            element.className = 'combat-buff';
            element.dataset.buffId = buff.id;
            element.tabIndex = 0;
            const stacks = document.createElement('span'); stacks.className = 'buff-stacks';
            const value = document.createElement('span'); value.className = 'buff-value';
            const duration = document.createElement('span'); duration.className = 'buff-duration';
            element.append(stacks, value, duration);
            view = {element, stacks, value, duration, icon:null, sprite:null};
            combatBuffViews.set(buff.id, view);
        }
        if (!view.icon || view.sprite !== buff.sprite || view.iconGlyph !== buff.icon) {
            view.icon?.remove();
            view.icon = SkillSprites.icon({sprite:buff.sprite,icon:buff.icon}, 'buff-icon');
            view.sprite = buff.sprite;
            view.iconGlyph = buff.icon;
            view.element.prepend(view.icon);
        }
        updateCombatText(view.stacks, formatBuffAmount(buff.stacks));
        updateCombatText(view.value, buff.value);
        updateCombatHidden(view.duration, buff.duration === undefined);
        updateCombatText(view.duration, buff.duration === undefined ? '' : combatStatFormatter.format(buff.duration) + 's');
        updateCombatAttribute(view.element, 'title', buff.description);
        updateCombatAttribute(view.element, 'aria-label', buff.name + ': ' + buff.stacks + ' stacks, ' + buff.description);
        if (elements.buffList.children[index] !== view.element) {
            elements.buffList.insertBefore(view.element, elements.buffList.children[index] || null);
        }
    });
    updateCombatHidden(elements.buffEmpty, buffs.length > 0);
}

function renderCombatBuffs() {
    normalizeFury();
    normalizeShields();
    const buffs = [];
    if (state.shieldStacks > 0) {
        const node = getSkillNodeRank('shieldGenerator') > 0 ? skillNodeById.shieldGenerator : skillNodeById.resonantGuard;
        buffs.push({id:'shields',name:'Shields',sprite:SkillSprites.safePath(node?.sprite),icon:'🛡',
            stacks:state.shieldStacks,value:'1 hit',
            description:state.shieldStacks + ' / ' + getPlayerMaxShields() + ' shields. Each shield blocks one enemy hit. Self-damage and health drain bypass shields.'});
    }
    if (state.furyStacks > 0) {
        const bonus = formatBuffAmount(state.furyStacks * furyDamagePerStack * 100) + '%';
        buffs.push({id:'fury',name:'Fury',sprite:SkillSprites.safePath(skillNodeById.maxFury?.sprite) || 'assets/ui/icon-sword.png',
            stacks:state.furyStacks,value:bonus,duration:state.furyRemaining,
            description:'+' + bonus + ' damage. ' + combatStatFormatter.format(state.furyRemaining) + 's until the next stack is lost. Hits add ' + furySecondsPerStack + ' seconds.'});
    }
    const righteousFireNode = getRighteousFireNode();
    if (righteousFireNode && state.playerHp > 0 && !state.combatPaused) {
        const targets = state.monsterStates.filter(monster => monster.hp > 0).length;
        const excess = getRighteousFireRegeneration(gameTickSeconds).excess;
        const damage = targets ? excess / gameTickSeconds / targets : 0;
        buffs.push({id:'fireOfTheRighteous',name:'Fire of the Righteous',
            sprite:SkillSprites.safePath(righteousFireNode.sprite),icon:righteousFireNode.icon,
            stacks:1,value:formatBuffAmount(damage) + '/s',
            description:combatStatFormatter.format(damage) + ' burning damage per second per enemy.\n' + SkillDescriptions.describe(righteousFireNode)});
    }
    renderBuffs(buffs);
    updateCombatText(elements.damage, formatAmount(getDamage()));
    renderDetailedStats();
}

function getPlayerHealthRegen() {
    const flat = getSkillStat('healthRegen') + getGearStat('healthRegen');
    const maximumHealthRate = getSkillStat('healthRegenPercent') + getGearStat('healthRegenPercent');
    const increase = getSkillStat('healthRegenIncrease') + getGearStat('healthRegenIncrease');
    return Math.max(0, flat + getPlayerMaxHealth() * maximumHealthRate) * Math.max(0, 1 + increase);
}

function hasFireOfTheRighteous() {
    return Boolean(getRighteousFireNode());
}

function getRighteousFireNode() {
    for (const id of righteousFireNodeIds) {
        if (skillNodeById[id] && getSkillNodeRank(id) > 0) return skillNodeById[id];
    }
    return null;
}

function getRighteousFireRegeneration(elapsed) {
    const maxHealth = getPlayerMaxHealth(), regeneration = getPlayerHealthRegen() * elapsed;
    const drain = maxHealth * righteousFireSettings.healthDrainPerSecond * elapsed;
    const healing = Math.min(regeneration, Math.max(0,
        maxHealth * righteousFireSettings.regenHealthCap - state.playerHp + drain));
    return {drain, healing, excess: regeneration - healing};
}

function applyPlayerHealing(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const maxHealth = getPlayerMaxHealth();
    const limit = hasFireOfTheRighteous() ? maxHealth * righteousFireSettings.regenHealthCap : maxHealth;
    const previousHp = state.playerHp;
    // Existing health above the cap drains normally; healing cannot add to it.
    if (previousHp >= limit) return 0;
    state.playerHp = Math.min(limit, previousHp + amount);
    return state.playerHp - previousHp;
}

function tickPlayerRegeneration(elapsed) {
    if (state.combatPaused || state.playerHp <= 0) return;
    if (!hasFireOfTheRighteous()) {
        applyPlayerHealing(getPlayerHealthRegen() * elapsed);
        return;
    }

    // Resolve regeneration and drain together. Reserve healing to offset the
    // drain and reach 30% health; convert only the regeneration left over.
    const {drain, healing, excess} = getRighteousFireRegeneration(elapsed);
    if (healing >= drain) applyPlayerHealing(healing - drain);
    else applyDamageToPlayer(drain - healing, 'self');

    if (excess <= 0 || state.playerHp <= 0) return;
    // Snapshot living targets so kills cannot redistribute this tick's damage.
    const targets = state.monsterStates.filter(monster => monster.hp > 0);
    if (!targets.length) return;
    const damage = excess / targets.length;
    targets.forEach(monster => applyDamageToMonster(monster, damage, 'dot', 'righteousFire'));
    presentCombatEffect(() => {
        const until = performance.now() + 350;
        targets.forEach(monster => righteousFireHitUntil.set(monster, until));
    });
}

function getSkillMultiplier(stat) {
    return cachedCombatStat('getSkillMultiplier:' + stat, () => {
        return Object.entries(state.skillRanks).reduce((total, [id, rank]) => {
            const node = skillNodeById[id];
            if (!node || !rank) return total;
            if (stat === 'attackSpeedMultiplier' && node.stats.attackSpeedPerLevel) {
                total *= Math.pow(1 + node.stats.attackSpeedPerLevel, state.level * rank);
            }
            return total * Math.pow(node.stats[stat] || 1, rank);
        }, 1);
    });
}

function getDamage() {
    return Math.max(1, Math.round((2 + state.upgrades.strength * 2 + getGearStat('damage') +
        getSkillStat('damage')) * getSkillMultiplier('damageMultiplier') * getGearStat('damageMultiplier') *
        (1 + state.furyStacks * furyDamagePerStack)));
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

function getEnemyHitChance(monster = activeMonster()) {
    return Math.max(getGearStat('minimumEnemyHitChance'), Math.min(95, monsterDefinition(monster).accuracy - getPlayerEvasion()));
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
    if (!element.classList.contains(classes[colorIndex])) {
        element.classList.remove(...classes);
        element.classList.add(classes[colorIndex]);
    }
}

function getGoldMultiplier() {
    return Math.max(0, (1 + getGearStat('goldBonus') + getSkillStat('goldBonus')) *
        getSkillMultiplier('goldBonusMultiplier') * getGearStat('goldBonusMultiplier'));
}

function renderDetailedStats() {
    // Closed details cost no stat calculations or DOM updates during combat.
    if (!elements.detailedStats.open) return;
    const number = value => combatStatFormatter.format(value);
    const percent = value => number(value * 100) + '%';
    const signedPercent = value => (value >= 0 ? '+' : '') + percent(value);
    const multiplier = value => '×' + number(value);
    const flat = stat => getSkillStat(stat) + getGearStat(stat);
    const combinedMultiplier = stat => getSkillMultiplier(stat) * getGearStat(stat);
    const groups = [
        {id:'damage', name:'Damage', total:formatAmount(getDamage()), rows:[
            ['Flat damage', number(2 + state.upgrades.strength * 2 + flat('damage'))],
            ['Damage multiplier', multiplier(combinedMultiplier('damageMultiplier'))],
            ['Fury damage bonus', percent(state.furyStacks * furyDamagePerStack)]
        ]},
        {id:'multiHit', name:'Multi-hit', total:number(getMultiHit()), rows:[
            ['Flat multi-hit', number(baseMultiHit + flat('multiHit'))],
            ['Multi-hit multiplier', multiplier(combinedMultiplier('multiHitMultiplier'))]
        ]},
        {id:'attackSpeed', name:'Attack speed', total:multiplier(getAttackSpeedMultiplier()), rows:[
            ['Skill tree multi', multiplier(getSkillMultiplier('attackSpeedMultiplier'))],
            ['Equipment', multiplier(getGearStat('attackSpeedMultiplier'))],
            ['Skill tree additive', signedPercent(getSkillStat('attackSpeedBonus'))],
            ['Upgrade multiplier', multiplier(1 / Math.pow(.92, state.upgrades.haste))],
            ['Attack interval', number(getAttackSpeed()) + 's'],
            ['Minimum interval', number(getGearStat('minimumAttackInterval')) + 's']
        ]},
        {id:'accuracy', name:'Accuracy', total:formatAmount(getPlayerAccuracy()), rows:[
            ['Flat accuracy', number(playerAccuracy + flat('accuracy'))],
            ['Accuracy multiplier', multiplier(combinedMultiplier('accuracyMultiplier'))]
        ]},
        {id:'evasion', name:'Evasion', total:formatAmount(getPlayerEvasion()), rows:[
            ['Flat evasion', number(basePlayerEvasion + state.upgrades.evasion * 5 + flat('evasion'))],
            ['Evasion multiplier', multiplier(combinedMultiplier('evasionMultiplier'))],
            ['Minimum enemy hit chance', number(getGearStat('minimumEnemyHitChance')) + '%']
        ]},
        {id:'health', name:'Max HP', total:formatAmount(getPlayerMaxHealth()), rows:[
            ['Flat HP (including base)', number(basePlayerMaxHealth + flat('health'))],
            ['Max HP multiplier', multiplier(combinedMultiplier('healthMultiplier'))]
        ]},
        {id:'healthRegen', name:'Health regen', total:number(getPlayerHealthRegen()) + ' HP/s', rows:[
            ['Flat HP regen', number(flat('healthRegen')) + ' HP/s'],
            ['Maximum HP regen', percent(flat('healthRegenPercent')) + '/s'],
            ['Regen from maximum HP', number(getPlayerMaxHealth() * flat('healthRegenPercent')) + ' HP/s'],
            ['Increased health regen', percent(flat('healthRegenIncrease'))],
            ['Regen healing limit', hasFireOfTheRighteous() ? '30% HP' : '100% HP']
        ]},
        {id:'poisonChance', name:'Poison chance', total:percent(getPoisonChance()), rows:[
            ['Flat poison chance', percent(flat('poisonChance'))],
            ['Chance multiplier', multiplier(combinedMultiplier('poisonChanceMultiplier'))]
        ]},
        {id:'poisonDamage', name:'Poison damage per tick', total:formatAmount(getPoisonDamage()), rows:[
            ['Flat poison damage', number(poisonDamageType.baseDamage + flat('poisonDamage'))],
            ['Poison damage multiplier', multiplier(combinedMultiplier('poisonDamageMultiplier'))]
        ]},
        {id:'poisonTickRate', name:'Poison tick speed', total:number(1 / getPoisonTickInterval()) + ' ticks/s', rows:[
            ['Tick speed bonus', percent(flat('poisonTickRate'))],
            ['Tick speed multiplier', multiplier(combinedMultiplier('poisonTickRateMultiplier'))],
            ['Tick interval', number(getPoisonTickInterval()) + 's'],
            ['Stack duration', number(poisonDamageType.durationSeconds) + 's']
        ]},
        {id:'bleedChance', name:'Bleed chance', total:percent(getBleedChance()), rows:[
            ['Flat bleed chance', percent(flat('bleedChance'))],
            ['Chance multiplier', multiplier(combinedMultiplier('bleedChanceMultiplier'))]
        ]},
        {id:'bleedDamage', name:'Bleed from a normal hit', total:number(getBleedDamage()) + ' / tick', rows:[
            ['Triggering hit damage', number(getDamage())],
            ['Damage taken from hit', percent(bleedDamageType.hitDamageRatio)],
            ['Flat bonus per application', number(flat('bleedDamage'))],
            ['Bleed damage multiplier', multiplier(combinedMultiplier('bleedDamageMultiplier'))]
        ]},
        {id:'bleedTickRate', name:'Bleed tick speed', total:number(1 / getBleedTickInterval()) + ' ticks/s', rows:[
            ['Tick speed bonus', percent(flat('bleedTickRate'))],
            ['Tick speed multiplier', multiplier(combinedMultiplier('bleedTickRateMultiplier'))],
            ['Tick interval', number(getBleedTickInterval()) + 's'],
            ['Time per application', number(bleedDamageType.secondsPerApplication) + 's'],
            ['Maximum shared duration', number(bleedDamageType.maximumDuration) + 's']
        ]},
        {id:'maxFury', name:'Maximum fury', total:formatAmount(getPlayerMaxFury()), rows:[
            ['Flat maximum fury', number(basePlayerMaxFury + flat('maxFury'))],
            ['Maximum fury multiplier', multiplier(combinedMultiplier('maxFuryMultiplier'))]
        ]},
        {id:'maxShields', name:'Maximum shields', total:formatAmount(getPlayerMaxShields()), rows:[
            ['Flat maximum shields', number(basePlayerMaxShields + flat('maxShields'))],
            ['Maximum shields multiplier', multiplier(combinedMultiplier('maxShieldsMultiplier'))],
            ['Current shields', number(state.shieldStacks)]
        ]},
        {id:'gold', name:'Gold gained', total:multiplier(getGoldMultiplier()), rows:[
            ['Gold bonus', percent(flat('goldBonus'))],
            ['Gold multiplier', multiplier(combinedMultiplier('goldBonusMultiplier'))]
        ]}
    ];
    groups.forEach(group => {
        let view = detailedStatViews.get(group.id);
        if (!view) {
            const section = document.createElement('section');
            section.className = 'detailed-stat-group';
            section.dataset.stat = group.id;
            const heading = document.createElement('h4'); heading.className = 'detailed-stat-heading';
            const name = document.createElement('span'); name.textContent = group.name;
            const total = document.createElement('strong');
            heading.append(name, total);
            const list = document.createElement('dl');
            const values = group.rows.map(([label]) => {
                const row = document.createElement('div'); row.className = 'detailed-stat-row';
                const term = document.createElement('dt'); term.textContent = label;
                const value = document.createElement('dd');
                row.append(term, value); list.append(row);
                return value;
            });
            section.append(heading, list);
            elements.detailedStatsList.append(section);
            view = {total, values}; detailedStatViews.set(group.id, view);
        }
        updateCombatText(view.total, group.total);
        group.rows.forEach(([, value], index) => updateCombatText(view.values[index], value));
    });
}

function skillNodeIsAllocated(id) {
    return Boolean(skillNodeById[id] && skillNodeById[id].start) || getSkillNodeRank(id) > 0;
}

function skillNodeIsAvailable(node) {
    return node.start || (getSkillNodeRank(node.id) < node.maxRank &&
        skillNodeRequirementsMet(node, skillNodeIsAllocated));
}

function skillNodeRequirementsMet(node, isAllocated) {
    const connected = new Set(skillNodes.filter(entry => entry.start).map(entry => entry.id));
    const queue = [...connected];
    for (let index = 0; index < queue.length; index++) {
        skillNodeConnections[queue[index]].forEach(id => {
            if (connected.has(id) || !isAllocated(id)) return;
            connected.add(id);
            queue.push(id);
        });
    }
    // A selected node must reach the center. An unselected node must touch
    // that connected selection; disconnected cycles cannot support themselves.
    return connected.has(node.id) || [...skillNodeConnections[node.id]].some(id => connected.has(id));
}

function mapsForWorld(worldId) {
    const world = worldData.find(entry => entry.id === worldId);
    return world ? world.mapIds.map(id => mapData.find(map => map.id === id)).filter(Boolean) : [];
}

function worldForMap(mapId) {
    return worldData.find(world => world.mapIds.includes(mapId));
}

function worldIsUnlocked(index) {
    if (!worldData[index]) return false;
    if (state.developerTravelEnabled) return true;
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
    if (!maps[index]) return false;
    if (state.developerTravelEnabled) return true;
    if (index === 0) return true;
    return state.kills[maps[index - 1].id] >= maps[index - 1].goal;
}

function mapTravelAccess(mapId) {
    const map = mapData.find(entry => entry.id === mapId), world = worldForMap(mapId);
    if (!map || !world) return {unlocked: false, reason: 'Location unavailable.'};
    const worldIndex = worldData.indexOf(world), maps = mapsForWorld(world.id);
    if (!worldIsUnlocked(worldIndex)) {
        const previousWorld = worldData[worldIndex - 1];
        const finalMap = mapData.find(entry => entry.id === previousWorld?.mapIds.at(-1));
        return {unlocked: false, reason: 'Clear ' + (finalMap?.name || 'the previous world') + ' to unlock ' + world.name + '.'};
    }
    const index = maps.findIndex(entry => entry.id === mapId);
    if (!mapIsUnlocked(maps, index)) {
        const previous = maps[index - 1];
        return {unlocked: false, reason: 'Get ' + formatAmount(previous.goal) + ' kills in ' + previous.name + '.'};
    }
    return {unlocked: true, map, world};
}

function createMaterialLocation(source) {
    const location = document.createElement('button'); location.type = 'button';
    location.className = 'material-location-link';
    const access = mapTravelAccess(source.mapId);
    location.dataset.materialMap = source.mapId || '';
    location.textContent = source.location + (access.unlocked ? '' : ' · Locked');
    location.disabled = !access.unlocked;
    location.title = access.unlocked ? 'Travel to ' + source.location + ' · ' + access.world.name : access.reason;
    location.setAttribute('aria-label', access.unlocked ? location.title : source.location + '. Locked. ' + access.reason);
    return location;
}

function travelToMap(mapId) {
    const access = mapTravelAccess(mapId);
    if (!access.unlocked) return false;
    const {map: selected, world} = access;
    const changedMap = state.selectedMap !== selected.id;
    const tutorialNextMap = state.tutorials.firstNextMapPending || state.tutorials.firstMapGoalPending ? nextUnlockedMap() : null;
    state.selectedWorld = world.id;
    state.selectedMap = selected.id;
    if (selected === tutorialNextMap) {
        state.tutorials.firstNextMapPending = false;
        if (state.tutorials.firstMapGoalPending) {
            state.tutorials.firstMapGoalPending = false;
            state.tutorials.firstMapGoalDismissed = true;
        }
    }
    state.lastMapByWorld[world.id] = selected.id;
    state.mapListExpanded = false;
    if (changedMap) {
        resetMonsterStates(selected);
        clearEnemyDamageIndicator();
        state.attackTimer = 0;
        state.lastDrop = 'Defeat enemies to find loot.';
        state.lastLoot = null;
    }
    state.isInTown = false;
    state.currentView = 'map';
    document.querySelectorAll('.craft-material-tooltip:popover-open').forEach(panel => panel.hidePopover());
    render();
    window.scrollTo(0, 0);
    if (changedMap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        elements.combatPanel.animate([{opacity: .72, transform: 'translateY(6px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 260, easing: 'ease-out'});
    }
    saveGame();
    return true;
}

function toggleMaterialSources(button) {
    const panel = document.getElementById(button.dataset.materialInfo);
    if (!panel) return;
    if (panel.matches(':popover-open')) { panel.hidePopover(); button.setAttribute('aria-expanded', 'false'); return; }
    panel.showPopover();
    button.setAttribute('aria-expanded', 'true');
    const bounds = button.getBoundingClientRect(), rect = panel.getBoundingClientRect();
    panel.style.left = Math.max(12, Math.min(document.documentElement.clientWidth - rect.width - 12, bounds.left)) + 'px';
    panel.style.top = Math.max(12, Math.min(innerHeight - rect.height - 12,
        bounds.bottom + 8 + rect.height <= innerHeight - 12 ? bounds.bottom + 8 : bounds.top - rect.height - 8)) + 'px';
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

function createGameSave() {
    return {
        version: 3,
        lastSimulatedAt,
        offlineRecap: pendingOfflineRecap,
        attackTimer: state.attackTimer,
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
        developerTravelEnabled: state.developerTravelEnabled,
        crafted: state.crafted,
        tutorials: state.tutorials,
        selectedWorld: state.selectedWorld,
        lastMapByWorld: state.lastMapByWorld,
        selectedMap: state.selectedMap,
        currentView: state.currentView,
        enemyHp: state.enemyHp,
        enemyRespawnRemaining: state.enemyRespawnRemaining,
        monsterStates: state.monsterStates,
        pendingEruptions: state.pendingEruptions,
        monsterColumns: state.monsterColumns,
        targetMonsterId: state.targetMonsterId,
        playerHp: state.playerHp,
        furyStacks: state.furyStacks,
        furyRemaining: state.furyRemaining,
        furyDecaying: state.furyDecaying,
        shieldStacks: state.shieldStacks,
        combatPaused: state.combatPaused,
        lootLog: state.lootLog.slice(0, 12),
        lastDrop: state.lastDrop,
        lastLoot: state.lastLoot
    };
}

function saveGame() {
    if (simulatingCombat) return;
    try {
        localStorage.setItem(saveKey, JSON.stringify(createGameSave()));
        lastSave = Date.now();
    } catch (error) {
        console.error('Could not save Idle Adventure progress.', error);
    }
}

// Parse and migrate without changing live progress or browser storage.
function parseGameSave(rawSave) {
    const saved = JSON.parse(rawSave);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved) ||
        ![1, 2, 3].includes(saved.version)) {
        throw new Error('Save data has an invalid or unsupported format.');
    }
    if (['level', 'experience', 'skillPoints'].some(key => saved[key] !== undefined &&
        (!Number.isSafeInteger(saved[key]) || saved[key] < 0))) {
        throw new Error('Save data has invalid experience or skill points.');
    }
    if (saved && saved.developerTravelEnabled === undefined) saved.developerTravelEnabled = false;
    if (saved && typeof saved.selectedMap === 'string' && !mapData.some(map => map.id === saved.selectedMap)) {
        saved.selectedMap = worldData[0].mapIds[0];
        saved.enemyHp = mapData.find(map => map.id === saved.selectedMap).health;
        saved.enemyRespawnRemaining = 0;
        saved.monsterStates = [];
        saved.pendingEruptions = [];
    }
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
        // Keep allocated Fire when an editor export switches between its IDs.
        const fireNodeId = righteousFireNodeIds.find(id => skillNodeById[id]);
        righteousFireNodeIds.forEach(id => {
            if (fireNodeId && !skillNodeById[id] && Object.hasOwn(saved.skillRanks, id) && !Object.hasOwn(saved.skillRanks, fireNodeId)) {
                saved.skillRanks[fireNodeId] = saved.skillRanks[id];
                delete saved.skillRanks[id];
            }
        });
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
        !saved.kills || typeof saved.kills !== 'object' || Array.isArray(saved.kills) ||
        !saved.materials || typeof saved.materials !== 'object' || Array.isArray(saved.materials) ||
        !saved.upgrades || typeof saved.upgrades !== 'object' || Array.isArray(saved.upgrades) ||
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
        typeof saved.developerTravelEnabled !== 'boolean' ||
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
            (!Number.isFinite(saved.enemyRespawnRemaining) || saved.enemyRespawnRemaining < 0)) ||
        (saved.monsterColumns !== undefined && (!Number.isInteger(saved.monsterColumns) || saved.monsterColumns < 1 || saved.monsterColumns > 100)) ||
        (saved.furyStacks !== undefined && (!Number.isSafeInteger(saved.furyStacks) || saved.furyStacks < 0)) ||
        (saved.furyRemaining !== undefined && (!Number.isFinite(saved.furyRemaining) || saved.furyRemaining < 0)) ||
        (saved.furyDecaying !== undefined && typeof saved.furyDecaying !== 'boolean') ||
        (saved.shieldStacks !== undefined && (!Number.isSafeInteger(saved.shieldStacks) || saved.shieldStacks < 0)) ||
        (saved.monsterStates !== undefined && (!Array.isArray(saved.monsterStates) ||
            !saved.monsterStates.every(monster => monster && typeof monster.id === 'string' &&
                Number.isFinite(monster.hp) && monster.hp >= 0 &&
                Number.isFinite(monster.respawnRemaining) && monster.respawnRemaining >= 0 &&
                (monster.attackTimer === undefined ||
                    Number.isFinite(monster.attackTimer) && monster.attackTimer >= 0) &&
                (monster.freezeRemaining === undefined || Number.isFinite(monster.freezeRemaining) &&
                    monster.freezeRemaining >= 0 && monster.freezeRemaining <= arrowSkillSettings.freezeDuration) &&
                isValidBleedState(monster.bleed) &&
                (monster.poisonStacks === undefined || Array.isArray(monster.poisonStacks) &&
                    monster.poisonStacks.every(stack => stack &&
                        Number.isFinite(stack.remainingDuration) && stack.remainingDuration > 0 &&
                        stack.remainingDuration <= 60 && Number.isFinite(stack.timeUntilTick) &&
                        stack.timeUntilTick > 0 && stack.timeUntilTick <= 10))))) ||
        (saved.targetMonsterId !== undefined && saved.targetMonsterId !== null && typeof saved.targetMonsterId !== 'string') ||
        (saved.playerHp !== undefined && (!Number.isFinite(saved.playerHp) || saved.playerHp < 0)) ||
        (saved.combatPaused !== undefined && typeof saved.combatPaused !== 'boolean') ||
        (saved.pendingEruptions !== undefined && (!Array.isArray(saved.pendingEruptions) ||
            !saved.pendingEruptions.every(hit => hit && typeof hit.targetId === 'string' &&
                Number.isFinite(hit.damage) && hit.damage > 0 &&
                Number.isSafeInteger(hit.chainsRemaining) && hit.chainsRemaining >= 0 &&
                Number.isFinite(hit.remaining) && hit.remaining > 0 &&
                hit.remaining <= eruptionSkillSettings.chainDelay / 1000))) ||
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

    return saved;
}

function applyGameSave(saved) {
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
    state.developerTravelEnabled = saved.developerTravelEnabled;
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
    state.monsterColumns = saved.monsterColumns || 1;
    state.pendingEruptions = selectedMapChanged ? [] : (saved.pendingEruptions || [])
        .filter(hit => state.monsterStates.some(monster => monster.id === hit.targetId))
        .map(hit => ({...hit}));
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
    state.furyStacks = saved.furyStacks || 0;
    state.furyRemaining = saved.furyRemaining || 0;
    state.furyDecaying = saved.furyDecaying === true;
    normalizeFury();
    state.shieldStacks = saved.shieldStacks || 0;
    normalizeShields();
    state.lootLog = Array.isArray(saved.lootLog)
        ? saved.lootLog.filter(entry => typeof entry === 'string').slice(0, 12)
        : [];
    state.lastDrop = typeof saved.lastDrop === 'string' ? saved.lastDrop : 'Defeat enemies to find loot.';
    state.lastLoot = normalizeLootNotice(saved.lastLoot);
    state.attackTimer = Number.isFinite(saved.attackTimer) && saved.attackTimer >= 0 ? saved.attackTimer : 0;
    resetCombatClock(Number.isFinite(saved.lastSimulatedAt) && saved.lastSimulatedAt > 0
        ? Math.min(saved.lastSimulatedAt, Date.now()) : Date.now());
    clearOfflineRecap();
    pendingOfflineRecap = normalizeOfflineRecap(saved.offlineRecap);
    resetDamageBreakdown(state.selectedMap);
}

function loadGame() {
    try {
        const rawSave = localStorage.getItem(saveKey);
        if (!rawSave) return false;
        applyGameSave(parseGameSave(rawSave));
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
        WorldContent.applyBackground(button, world.background);
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
        const progressPercent = map.goal === 0 ? 100 : Math.min(100, progress / map.goal * 100);
        const tutorialNextMap = nextUnlockedMap();
        button.className = 'map-button ' + (unlocked ? (completed ? 'completed' : 'incomplete') : 'locked') +
            (state.selectedMap === map.id ? ' selected' : '') +
            ((state.tutorials.firstNextMapPending || state.tutorials.firstMapGoalPending) &&
                tutorialNextMap === map ? ' tutorial-highlight' : '');
        button.querySelector('.map-progress-fill').style.width = progressPercent + '%';
        WorldContent.applyBackground(button, WorldContent.background(worldContent, map));
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
        links.setAttribute('viewBox', '0 0 ' + (gridColumnCount * 160) + ' ' + (gridRowCount * 160));
        links.setAttribute('preserveAspectRatio', 'none');
        links.setAttribute('aria-hidden', 'true');

        skillNodes.forEach(node => {
            node.requires.forEach(requiredId => {
                const requiredNode = skillNodeById[requiredId];
                const link = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                link.setAttribute('x1', String((gridColumn(requiredNode) - 0.5) * 160));
                link.setAttribute('y1', String((gridRow(requiredNode) - 0.5) * 160));
                link.setAttribute('x2', String((gridColumn(node) - 0.5) * 160));
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
                effect.textContent = SkillDescriptions.describe(node);
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
        tooltip.innerHTML = '<strong></strong><small class="ability-tag" hidden></small><span></span>';
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
                ? 'Click allocated nodes to refund points. Remaining nodes must stay connected to the center.'
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
        const description = SkillDescriptions.describe(node);
        const effect = button.querySelector('.skill-node-effect');
        if (effect) effect.textContent = description;
        const labelParts = [node.name, SkillDescriptions.abilityTagLabel(node), description];
        if (node.start) {
            labelParts.push('Starting node');
        } else {
            labelParts.push(committedRank > 0 ? (refundMode ? 'Click to refund one point' : 'Already selected') :
                rank > 0 ? 'Selected, pending confirmation' : 'Not selected');
            labelParts.push(canDeselect ? 'Click to deselect' :
                pendingSkillRanks[node.id] ? 'Keeps selected nodes connected to the center' :
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
        const sourceId = link.dataset.skillNodeSource;
        const targetId = link.dataset.skillNodeLink;
        const isPlanned = id => Boolean(skillNodeById[id] && skillNodeById[id].start) ||
            (plannedRanks[id] || 0) > 0;
        link.classList.toggle('is-active', skillNodeIsAllocated(sourceId) && skillNodeIsAllocated(targetId));
        link.classList.toggle('is-pending', isPlanned(sourceId) && isPlanned(targetId) &&
            Boolean(pendingSkillRanks[sourceId] || pendingSkillRanks[targetId]));
        link.classList.toggle('tutorial-skill-link',
            state.tutorials.firstSkillPointPending &&
            state.skillPoints > 0 &&
            pendingPointCount === 0 &&
            link.dataset.skillNodeSource === 'origin');
    });
}

function recipeIsUnlocked(recipe) {
    return Object.keys(recipe.materials).every(id =>
        (materialSources[id] || []).some(source => mapTravelAccess(source.mapId).unlocked));
}

function renderCrafting() {
    elements.crafts.innerHTML = '';
    const unlockedRecipes = recipes.filter(recipe => (!recipe.developerOnly || state.developerItemsEnabled) && recipeIsUnlocked(recipe));
    const unlockedIds = new Set(unlockedRecipes.map(recipe => recipe.id));
    const canCraftRecipe = recipe => !ownsItem(recipe.id) && (!recipe.developerOnly || state.developerItemsEnabled) && Object.entries(recipe.materials)
        .every(([id, amount]) => state.materials[id] >= amount);
    const craftedCount = unlockedRecipes.filter(recipe => state.crafted.includes(recipe.id)).length;
    const craftableCount = unlockedRecipes.filter(recipe => !state.crafted.includes(recipe.id) && canCraftRecipe(recipe)).length;
    elements.craftingSummary.textContent = craftableCount + ' ready to craft · ' + craftedCount + ' of ' + unlockedRecipes.length + ' unlocked recipes crafted';
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
            .filter(recipe => recipe && unlockedIds.has(recipe.id))
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
                const materialDetail = itemData.materialDetails?.[id];
                if (materialDetail?.sprite) materialLabel.appendChild(Equipment.createIcon(materialDetail));
                if (materialDetail?.description) materialName.title = materialDetail.description;
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
                sourceInfo.dataset.materialInfo = tooltipId;
                sourceInfo.setAttribute('aria-controls', tooltipId);
                sourceInfo.setAttribute('aria-expanded', 'false');
                sourceInfo.setAttribute('aria-haspopup', 'dialog');
                const tooltip = document.createElement('span');
                tooltip.id = tooltipId;
                tooltip.className = 'craft-material-tooltip';
                tooltip.setAttribute('popover', 'auto');
                tooltip.setAttribute('role', 'dialog');
                tooltip.setAttribute('aria-label', 'Drop locations for ' + materialNames[id]);
                tooltip.addEventListener('toggle', () => sourceInfo.setAttribute('aria-expanded', String(tooltip.matches(':popover-open'))));
                const tooltipHeading = document.createElement('strong');
                tooltipHeading.textContent = 'Drops from:';
                tooltip.appendChild(tooltipHeading);
                sources.forEach(source => {
                    const sourceEntry = document.createElement('span');
                    sourceEntry.className = 'craft-material-tooltip-source';
                    const enemy = document.createElement('span');
                    enemy.textContent = source.enemy;
                    const location = createMaterialLocation(source);
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
            ? 'No unlocked recipes are ready to craft. Collect materials or turn off this filter.'
            : !showCraftedRecipes && unlockedRecipes.some(recipe => state.crafted.includes(recipe.id) &&
                (selectedCraftCategory === 'all' || recipeCategories[recipe.slot] === selectedCraftCategory))
                ? 'All items in this category are crafted. Select Show hidden to view them.'
                : 'No recipes unlocked in this category yet. Unlock more areas to discover recipes.';
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
    document.querySelectorAll('[data-inventory-category]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.inventoryCategory === (inventoryCategory === 'slot' ? 'all' : inventoryCategory)));
    });
    elements.inventoryView.querySelector('.gear-workspace').hidden = inventoryCategory === 'materials';
    elements.inventoryView.querySelector('.materials-panel').hidden = ['weapons', 'armor'].includes(inventoryCategory);
    const gearSignature = JSON.stringify({
        selectedGearSlot,
        inventoryCategory,
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
        window.EquipmentEffects?.apply(icon);
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
    elements.gearSelectionHeading.textContent = inventoryCategory === 'slot' ? selectedSlot.name + ' selection'
        : inventoryCategory === 'weapons' ? 'Weapons' : inventoryCategory === 'armor' ? 'Armor' : 'Your gear';
    const matchingTutorialSlot = state.tutorials.firstGearPending &&
        state.tutorials.firstGearSlot === selectedSlot.id;
    elements.gearSelectionHint.textContent = matchingTutorialSlot
        ? state.tutorials.firstGearSlotSelected
            ? 'Now click Equip on the highlighted item.'
            : 'Click the highlighted ' + selectedSlot.name.toLowerCase() + ' slot on the left to view your new item.'
        : inventoryCategory === 'slot' ? 'Choose an owned ' + selectedSlot.name.toLowerCase() + ' to equip.'
            : 'Compare your owned gear and choose what to equip.';
    elements.gearInventory.innerHTML = '';
    const slotGear = itemData.items.filter(item => ownsItem(item.id) && state.gear[item.slot] !== item.id &&
        (inventoryCategory !== 'slot' || item.slot === selectedSlot.id) &&
        (inventoryCategory !== 'weapons' || item.slot === 'weapon') &&
        (inventoryCategory !== 'armor' || recipeCategories[item.slot] === 'armor'));
    if (slotGear.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'inventory-empty subtle';
        empty.textContent = inventoryCategory !== 'slot'
            ? 'No spare gear in this category. Craft equipment or explore for drops.' : state.gear[selectedSlot.id]
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

    const materialsVisible = state.currentView === 'inventory' && !elements.inventoryView.querySelector('.materials-panel').hidden;
    const expandedMaterials = new Set(materialsVisible
        ? [...elements.inventory.querySelectorAll('details[open]')].map(entry => entry.dataset.materialId) : []);
    const focusedMaterial = materialsVisible && elements.inventory.contains(document.activeElement)
        ? document.activeElement.closest('.material-entry')?.dataset.materialId : null;
    const focusedMaterialMap = document.activeElement?.dataset.materialMap;
    elements.inventory.innerHTML = '';
    const ownedMaterials = Object.entries(materialNames).filter(([id]) => state.materials[id] > 0);
    if (ownedMaterials.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'inventory-empty subtle';
        empty.textContent = 'No materials collected yet. Defeat enemies to find some.';
        elements.inventory.appendChild(empty);
    }
    ownedMaterials.forEach(([id, name]) => {
        const entry = document.createElement('details');
        entry.className = 'material-entry';
        entry.dataset.materialId = id;
        entry.open = expandedMaterials.has(id);
        const summary = document.createElement('summary'); summary.className = 'material-summary';
        const identity = document.createElement('span');
        identity.className = 'material-identity';
        const material = itemData.materialDetails?.[id];
        identity.appendChild(Equipment.createIcon(material, '◇'));
        const label = document.createElement('span'); label.textContent = name; label.title = name;
        identity.appendChild(label);
        const count = document.createElement('strong'); count.textContent = formatAmount(state.materials[id]);
        const toggle = document.createElement('span'); toggle.className = 'material-toggle'; toggle.setAttribute('aria-hidden', 'true');
        summary.append(identity, count, toggle);
        const details = document.createElement('div'); details.className = 'material-details';
        const description = document.createElement('p'); description.className = 'material-description';
        description.textContent = material?.description || 'No description available.';
        const heading = document.createElement('h3'); heading.textContent = 'Drops from';
        const sources = document.createElement('ul'); sources.className = 'material-sources';
        for (const source of materialSources[id] || []) {
            const location = document.createElement('li');
            const enemy = document.createElement('span'); enemy.textContent = source.enemy;
            const map = createMaterialLocation(source);
            location.append(enemy, map); sources.append(location);
        }
        if (!sources.childElementCount) {
            const empty = document.createElement('li'); empty.textContent = 'No known drop locations.'; sources.append(empty);
        }
        details.append(description, heading, sources);
        entry.append(summary, details);
        elements.inventory.appendChild(entry);
    });
    if (focusedMaterial) {
        const entry = [...elements.inventory.children].find(entry => entry.dataset.materialId === focusedMaterial);
        const location = [...(entry?.querySelectorAll('[data-material-map]') || [])].find(button => button.dataset.materialMap === focusedMaterialMap);
        (location || entry?.querySelector('summary'))?.focus({preventScroll: true});
    }
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

const enemyCardViews = new WeakMap();
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
    const spritePath = WorldContent.safePath(definition.sprite);
    if (spritePath) {
        const image = document.createElement('img');
        image.alt = '';
        image.src = spritePath;
        image.addEventListener('error', () => { mark.textContent = '✦'; });
        mark.replaceChildren(image);
        mark.classList.add('has-monster-sprite');
    }
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
    playerAccuracy.title = 'Your chance to hit this enemy';
    const playerAccuracyLabel = document.createElement('span');
    playerAccuracyLabel.innerHTML = '<span class="hit-chance-full-label">Your hit chance:</span><span class="hit-chance-compact-label">You hit:</span>';
    playerAccuracy.appendChild(playerAccuracyLabel);
    const playerAccuracyValue = document.createElement('strong');
    playerAccuracyValue.dataset.playerAccuracy = '';
    playerAccuracy.appendChild(playerAccuracyValue);
    const enemyAccuracy = document.createElement('p');
    enemyAccuracy.className = 'hit-chance';
    enemyAccuracy.title = 'This enemy\'s chance to hit you';
    const enemyAccuracyLabel = document.createElement('span');
    enemyAccuracyLabel.innerHTML = '<span class="hit-chance-full-label">Enemy hit chance:</span><span class="hit-chance-compact-label">Enemy hit:</span>';
    enemyAccuracy.appendChild(enemyAccuracyLabel);
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
    const freezeStatus = document.createElement('span');
    freezeStatus.className = 'enemy-freeze-status';
    freezeStatus.dataset.enemyFreezeStatus = '';
    freezeStatus.hidden = true;
    effectRow.append(procNotice, freezeStatus);
    const dotRow = document.createElement('div');
    dotRow.className = 'enemy-dot-row';
    const bleedStatus = document.createElement('span');
    bleedStatus.className = 'enemy-dot-status enemy-bleed-status';
    bleedStatus.dataset.enemyBleedStatus = '';
    bleedStatus.hidden = true;
    const bleedCount = document.createElement('strong');
    bleedCount.dataset.enemyBleedCount = '';
    const bleedDuration = document.createElement('span');
    bleedDuration.dataset.enemyBleedDuration = '';
    bleedStatus.append(droplet.cloneNode(true), bleedCount, bleedDuration);
    dotRow.append(dotStatus, bleedStatus);
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
    const bleedDamageBar = document.createElement('div');
    bleedDamageBar.className = 'enemy-health-poison-damage enemy-health-bleed-damage';
    bleedDamageBar.setAttribute('aria-hidden', 'true');
    healthTrack.append(poisonDamageBar, bleedDamageBar, healthBar, damageBar);
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
    details.append(playerAccuracy, enemyAccuracy, effectRow, dotRow, healthTrack, summary);
    card.append(title, mark, details, shockwaveNotice);
    enemyCardViews.set(card, {name, targetLabel, playerAccuracyValue, enemyAccuracyValue,
        healthBar, healthTrack, poisonDamageBar, bleedDamageBar, hpText, intervalValue, damageValue,
        dotStatus, dotCount, bleedStatus, respawn, freezeStatus});
    card.addEventListener('animationend', event => {
        if (event.animationName === 'enemy-death-shake') card.classList.remove('is-defeating');
        if (event.animationName === 'poison-stack-proc' || event.animationName === 'bleed-stack-proc') event.target.classList.remove('is-applying');
        if (event.animationName === 'shockwave-card-hit') event.target.classList.remove('is-shockwave-splashed');
        if (event.animationName === 'shockwave-health-impact' && event.target.classList.contains('is-shockwave-hit')) {
            event.target.classList.remove('is-shockwave-hit');
        }
    });
    return card;
}

function normalizeLootNotice(value) {
    if (!value || !Number.isFinite(value.gold) || value.gold < 0 || !Array.isArray(value.materials) || !Array.isArray(value.equipment)) return null;
    return {
        gold: Math.floor(value.gold),
        materials: value.materials.filter(entry => entry && typeof entry.id === 'string' && Object.hasOwn(materialNames, entry.id) && Number.isFinite(entry.amount) && entry.amount >= 1)
            .map(entry => ({id: entry.id, amount: Math.floor(entry.amount)})),
        equipment: [...new Set(value.equipment.filter(id => typeof id === 'string' && Object.hasOwn(itemById, id) && !itemById[id].developerOnly))]
    };
}

function renderLootNotice() {
    const loot = state.lastLoot;
    if (renderedLoot === loot && renderedLootMessage === state.lastDrop) return;
    const animate = renderedLoot !== undefined && loot !== null;
    renderedLoot = loot;
    renderedLootMessage = state.lastDrop;
    const heading = document.createElement('p');
    heading.className = 'loot-notice-title';
    heading.textContent = 'Latest loot';
    if (!loot) {
        const empty = document.createElement('p');
        empty.className = 'loot-empty';
        empty.textContent = state.lastDrop;
        elements.lastDrop.replaceChildren(heading, empty);
        return;
    }
    const equipmentKey = JSON.stringify(loot.equipment);
    let equipment = elements.lastDrop.querySelector('.loot-equipment');
    const newEquipment = equipment?.dataset.items !== equipmentKey;
    if (newEquipment) {
        equipment = document.createElement('div');
        equipment.className = 'loot-equipment';
        equipment.dataset.items = equipmentKey;
        loot.equipment.forEach(id => {
            const item = itemById[id];
            if (!item) return;
            const card = document.createElement('div');
            card.className = 'loot-equipment-drop';
            card.dataset.rarity = item.rarity || 'common';
            const copy = document.createElement('div');
            copy.className = 'loot-equipment-copy';
            const name = document.createElement('strong');
            name.textContent = item.name;
            const caption = document.createElement('span');
            caption.textContent = 'Latest equipment · ' + item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1);
            copy.append(name, caption);
            card.append(Equipment.createIcon(item), copy);
            equipment.append(card);
        });
    }
    const rewards = document.createElement('div');
    rewards.className = 'loot-rewards';
    const reward = (name, amount, gold = false) => {
        const chip = document.createElement('span');
        chip.className = 'loot-reward' + (gold ? ' loot-reward--gold' : '');
        const label = document.createElement('span');
        label.textContent = name;
        const quantity = document.createElement('strong');
        quantity.textContent = (gold ? '+' : '×') + formatAmount(amount);
        chip.append(label, quantity);
        rewards.append(chip);
    };
    if (loot.gold > 0) reward('Gold', loot.gold, true);
    loot.materials.forEach(entry => reward(materialNames[entry.id], entry.amount));
    if (!rewards.childElementCount) {
        const empty = document.createElement('span');
        empty.className = 'loot-empty';
        empty.textContent = 'No gold or materials this time.';
        rewards.append(empty);
    }
    elements.lastDrop.replaceChildren(heading, ...(loot.equipment.length ? [equipment] : []), rewards);
    if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        rewards.animate([{opacity: 0.3, transform: 'translateY(5px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 260, easing: 'ease-out'});
        if (newEquipment && loot.equipment.length) equipment.animate([{opacity: 0.3, transform: 'scale(0.97)', filter: 'brightness(1.6)'}, {opacity: 1, transform: 'scale(1)', filter: 'brightness(1)'}], {duration: 650, easing: 'ease-out'});
    }
}

function renderMonsterArt(definition) {
    const path = WorldContent.safePath(definition.sprite);
    const art = elements.combatArt;
    if (art.dataset.sprite === path) return;
    art.dataset.sprite = path;
    art.hidden = !path;
    elements.combatPanel.classList.toggle('has-monster-art', Boolean(path));
    if (path) art.src = path;
    else art.removeAttribute('src');
}

function updateCombatText(element, value) {
    const text = String(value);
    if (element.textContent !== text) element.textContent = text;
}

function updateCombatAttribute(element, name, value) {
    const text = String(value);
    if (element.getAttribute(name) !== text) element.setAttribute(name, text);
}

function updateCombatHidden(element, hidden) {
    if (element.hidden !== hidden) element.hidden = hidden;
}

let combatLootSignature = null;
let combatLootOwnedLabels = [];

function renderCombat() {
    // This cache expires every render so equipment, ranks and levels stay current.
    const previousCache = combatStatCache;
    combatStatCache = new Map();
    try { renderCombatContent(); }
    finally { combatStatCache = previousCache; }
}

function renderCombatContent() {
    const map = currentMap();
    const definitions = monsterDefinitions(map);
    const ids = definitions.map(definition => definition.id);
    elements.enemyRoster.classList.toggle('has-multiple', definitions.length > 1);
    elements.enemyRoster.classList.toggle('is-crowded', definitions.length > 3);
    let renderedCards = Array.from(elements.enemyRoster.children)
        .filter(card => card.classList.contains('enemy-card'));
    const renderedIds = renderedCards.map(card => card.dataset.monsterId);
    // Spawn IDs are local to a map (several maps use "main"). Rebuild on
    // map changes so creation-time sprites and health labels cannot carry over.
    if (elements.enemyRoster.dataset.mapId !== map.id ||
        ids.length !== renderedIds.length || ids.some((id, index) => id !== renderedIds[index])) {
        elements.combatPanel.querySelectorAll('.poison-transfer, .combat-arrow, .eruption-chain, .shield-slam-wave').forEach(effect => effect.remove());
        renderedCards = definitions.map(createEnemyCard);
        elements.enemyRoster.replaceChildren(...renderedCards);
        elements.enemyRoster.dataset.mapId = map.id;
    }
    updateCombatFormation();
    const target = activeMonster();
    const lootMonster = monsterDefinition(target, map);
    renderMonsterArt(lootMonster);
    WorldContent.applyBackground(elements.combatPanel, WorldContent.background(worldContent, map));
    updateCombatText(elements.lootTableHeading, 'Loot table · ' + lootMonster.name);
    const progress = state.kills[map.id];
    const completed = progress >= map.goal;
    const maxHealth = getPlayerMaxHealth();
    const playerHpPercent = Math.max(0, Math.min(100, state.playerHp / maxHealth * 100));
    const righteousFireActive = hasFireOfTheRighteous() && state.playerHp > 0 && !state.combatPaused;
    const visualNow = performance.now();
    elements.playerHealthPanel.classList.toggle('is-righteous-fire', righteousFireActive);
    updateCombatText(elements.mapName, map.name);
    updateCombatText(elements.mapDescription, map.description);
    updateCombatText(elements.killProgress, completed ? progress + ' kills' : Math.min(progress, map.goal) + ' / ' + map.goal);
    updateCombatHidden(elements.killProgressLabel, completed);
    const lootEntries = [
        { name: 'Gold', amount: lootMonster.gold, chance: 1, owned: state.gold },
        ...[...map.drops, ...lootMonster.drops].map(drop => ({ name: materialNames[drop.id], materialId: drop.id, amount: drop.amount, chance: drop.chance, owned: state.materials[drop.id] || 0 })),
        ...[...map.itemDrops, ...lootMonster.itemDrops].map(drop => ({
            name: itemById[drop.id].name,
            itemId: drop.id,
            owned: ownsItem(drop.id) ? 1 : 0,
            amount: [1, 1],
            chanceText: WorldContent.chanceText(drop.chance),
            unique: itemById[drop.id].rarity === 'unique'
        }))
    ];
    const lootSignature = JSON.stringify(lootEntries.map(drop => [drop.name, drop.itemId, drop.materialId,
        drop.amount, drop.chance, drop.chanceText, drop.unique, itemData.materialDetails?.[drop.materialId]?.sprite]));
    if (combatLootSignature !== lootSignature) {
        combatLootSignature = lootSignature;
        combatLootOwnedLabels = [];
        elements.mapLootTable.replaceChildren();
        lootEntries.forEach(drop => {
            const entry = document.createElement('li');
            if (drop.unique) entry.className = 'unique-drop';
            if (drop.itemId) entry.dataset.itemId = drop.itemId;
            const amount = document.createElement('span');
            amount.className = 'loot-table-label';
            if (drop.materialId) {
                entry.dataset.materialId = drop.materialId;
                amount.appendChild(Equipment.createIcon(itemData.materialDetails?.[drop.materialId]));
            }
            const name = document.createElement('span');
            name.textContent = drop.name;
            amount.appendChild(name);
            const details = document.createElement('strong');
            details.textContent = formatAmount(drop.amount[0]) +
                (drop.amount[0] === drop.amount[1] ? '' : '–' + formatAmount(drop.amount[1])) +
                (drop.chanceText ? ' · ' + drop.chanceText : ' · ' + WorldContent.chanceText(drop.chance));
            const values = document.createElement('span');
            values.className = 'loot-table-values';
            const owned = document.createElement('small');
            owned.className = 'loot-table-owned';
            combatLootOwnedLabels.push(owned);
            values.append(details, owned);
            entry.append(amount, values);
            elements.mapLootTable.appendChild(entry);
        });
    }
    lootEntries.forEach((drop, index) => updateCombatText(combatLootOwnedLabels[index], 'Owned: ' + formatAmount(drop.owned)));
    const monstersById = new Map(state.monsterStates.map(monster => [monster.id, monster]));
    const playerAccuracy = getPlayerAccuracy();
    renderedCards.forEach((card, index) => {
        const definition = definitions[index];
        const monster = monstersById.get(definition.id);
        if (!monster) return;
        const view = enemyCardViews.get(card);
        const playerHitChance = getHitChance(playerAccuracy, definition.evasion);
        const enemyHitChance = getEnemyHitChance(monster);
        const hpPercent = Math.max(0, Math.min(100, monster.hp / definition.health * 100));
        card.classList.toggle('is-target', Boolean(target && target.id === monster.id));
        card.classList.toggle('is-respawning', monster.hp <= 0);
        card.classList.toggle('is-righteous-fire', righteousFireActive && (righteousFireHitUntil.get(monster) || 0) > visualNow);
        updateCombatText(view.name, definition.name);
        if (view.name.title !== definition.name) view.name.title = definition.name;
        updateCombatHidden(view.targetLabel, !target || target.id !== monster.id);
        const playerAccuracyText = view.playerAccuracyValue;
        const enemyAccuracyText = view.enemyAccuracyValue;
        updateCombatText(playerAccuracyText, combatStatFormatter.format(playerHitChance) + '%');
        updateCombatText(enemyAccuracyText, combatStatFormatter.format(enemyHitChance) + '%');
        setAccuracyClass(playerAccuracyText, playerHitChance, true);
        setAccuracyClass(enemyAccuracyText, enemyHitChance, false);
        view.healthBar.style.width = hpPercent + '%';
        const healthTrack = view.healthTrack;
        updateCombatAttribute(healthTrack, 'aria-valuenow', Math.round(hpPercent));
        const poisonIndicator = view.poisonDamageBar;
        const remainingPoisonDamage = Math.min(monster.hp, getRemainingPoisonDamage(monster));
        const poisonPercent = remainingPoisonDamage / definition.health * 100;
        poisonIndicator.style.left = Math.max(0, hpPercent - poisonPercent) + '%';
        poisonIndicator.style.width = poisonPercent + '%';
        poisonIndicator.classList.toggle('is-visible', monster.hp > 0 && remainingPoisonDamage > 0);
        updateCombatAttribute(poisonIndicator, 'title', remainingPoisonDamage > 0
            ? 'Poison will deal ' + remainingPoisonDamage + ' more damage'
            : '');
        const remainingBleedDamage = Math.min(Math.max(0, monster.hp - remainingPoisonDamage), getRemainingBleedDamage(monster));
        const bleedPercent = remainingBleedDamage / definition.health * 100;
        view.bleedDamageBar.style.left = Math.max(0, hpPercent - poisonPercent - bleedPercent) + '%';
        view.bleedDamageBar.style.width = bleedPercent + '%';
        view.bleedDamageBar.classList.toggle('is-visible', monster.hp > 0 && remainingBleedDamage > 0);
        updateCombatAttribute(view.bleedDamageBar, 'title', remainingBleedDamage > 0
            ? 'Bleed will deal ' + combatStatFormatter.format(getRemainingBleedDamage(monster)) + ' more damage' : '');
        updateBleedStatus(view.bleedStatus, monster);
        updateCombatText(view.hpText, Math.ceil(monster.hp) + ' / ' + definition.health + ' HP');
        updateCombatText(view.intervalValue, getMonsterAttackInterval(monster).toFixed(1) + 's');
        const freezeStatus = view.freezeStatus;
        const frozen = monster.hp > 0 && monster.freezeRemaining > 0;
        card.classList.toggle('is-frozen', frozen);
        updateCombatHidden(freezeStatus, !frozen);
        updateCombatText(freezeStatus, frozen ? 'Frozen ' + monster.freezeRemaining.toFixed(1) + 's' : '');
        updateCombatAttribute(freezeStatus, 'title', 'Attacks take 3 seconds longer. Further arrow hits refresh the 9-second duration.');
        updateCombatText(view.damageValue, String(definition.attackDamage));
        const dotStatus = view.dotStatus;
        const poisonStackCount = monster.poisonStacks ? monster.poisonStacks.length : 0;
        updateCombatHidden(dotStatus, poisonStackCount === 0);
        updateCombatText(view.dotCount, poisonStackCount + 'x');
        updateCombatAttribute(dotStatus, 'aria-label', poisonStackCount + ' poison ' +
            (poisonStackCount === 1 ? 'stack' : 'stacks'));
        updateCombatAttribute(dotStatus, 'title', poisonStackCount + ' poison ' + (poisonStackCount === 1 ? 'stack' : 'stacks'));
        const respawn = view.respawn;
        updateCombatHidden(respawn, monster.respawnRemaining <= 0);
        updateCombatText(respawn, monster.respawnRemaining > 0
            ? 'Respawns in ' + monster.respawnRemaining.toFixed(1) + 's'
            : '');
    });
    elements.playerHealthBar.style.width = playerHpPercent + '%';
    const damagePercent = Math.min(100 - playerHpPercent, recentPlayerDamage / maxHealth * 100);
    elements.playerHealthDamage.style.left = playerHpPercent + '%';
    elements.playerHealthDamage.style.width = damagePercent + '%';
    updateCombatAttribute(elements.playerHealthTrack, 'aria-valuenow', Math.round(playerHpPercent));
    // Keep fractional combat health, but do not round the displayed HP above a healing cap.
    const displayedPlayerHp = state.playerHp > 0 && state.playerHp < 1 ? '<1' : Math.floor(state.playerHp + 1e-8);
    updateCombatText(elements.playerHealthText, displayedPlayerHp + ' / ' + maxHealth + ' HP');
    renderCombatBuffs();
    updateCombatText(elements.combatStatusLabel, state.combatPaused ? 'Dead' : target ? 'Auto-battling' : 'Waiting for respawn');
    elements.combatStatus.classList.toggle('combat-dead', state.combatPaused);
    elements.combatStatus.classList.toggle('is-fighting', !state.combatPaused && Boolean(target));
    updateCombatHidden(elements.resumeCombat, !state.combatPaused || state.currentView !== 'map');
    renderLootNotice();
    renderDamageBreakdown();
    window.LootEffects?.sync(state.currentView === 'map', map.id);
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
    elements.multiHit.textContent = combatStatFormatter.format(getMultiHit());
    elements.poisonChance.textContent = combatStatFormatter.format(getPoisonChance() * 100) + '%';
    elements.bleedChance.textContent = combatStatFormatter.format(getBleedChance() * 100) + '%';
    elements.speed.textContent = (speedBonus >= 0 ? '+' : '') + combatStatFormatter.format(speedBonus) + '%';
    elements.accuracy.textContent = formatAmount(getPlayerAccuracy());
    elements.evasion.textContent = formatAmount(getPlayerEvasion());
    elements.maxHealth.textContent = formatAmount(getPlayerMaxHealth());
    elements.maxFury.textContent = formatAmount(getPlayerMaxFury());
    elements.healthRegen.textContent = combatStatFormatter.format(getPlayerHealthRegen()) + ' HP/s';
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
    if (levelsGained && combatStatCache) combatStatCache.clear();
    return levelsGained;
}

function defeatEnemy(monster) {
    const map = currentMap();
    const remainingPoison = (monster.poisonStacks || [])
        .filter(stack => stack.remainingDuration > 0)
        .map(stack => ({...stack}));
    const definition = monsterDefinition(monster, map);
    const gold = Math.floor(rollRange(definition.gold) * getGoldMultiplier());
    state.gold += gold;
    state.kills[map.id]++;
    if (map.id === worldData[0].mapIds[0] && state.kills[map.id] === map.goal) {
        state.tutorials.firstMapGoalPending = true;
        state.tutorials.firstMapGoalDismissed = false;
    }
    const experienceGained = definition.experience;
    awardExperience(experienceGained);
    const found = [];
    const lootMaterials = new Map();
    const equipment = [];
    [...map.drops, ...definition.drops].forEach(drop => {
        if (Object.hasOwn(materialNames, drop.id) && Math.random() < drop.chance) {
            const amount = rollRange(drop.amount);
            state.materials[drop.id] += amount;
            found.push(amount + ' ' + materialNames[drop.id]);
            lootMaterials.set(drop.id, (lootMaterials.get(drop.id) || 0) + amount);
        }
    });
    [...map.itemDrops, ...definition.itemDrops].forEach(drop => {
        const item = itemById[drop.id];
        if (item && !item.developerOnly && !ownsItem(item.id) && Math.random() < drop.chance) {
            state.ownedItemIds.push(item.id);
            promptForFirstGear(item.id, item.slot);
            found.push(item.name);
            equipment.push(item.id);
        }
    });
    state.lastDrop = found.length
        ? 'Found ' + found.join(' and ') + '.'
        : 'No materials this time.';
    state.lastLoot = {
        gold,
        materials: Array.from(lootMaterials, ([id, amount]) => ({id, amount})),
        equipment: equipment.length ? equipment : state.lastLoot?.equipment || []
    };
    addLootDrop(gold, found);

    presentCombatEffect(() => {
        const defeatedCard = getCombatEffectCard(monster.id);
        if (state.currentView === 'map') {
            const rewards = [
                ...(gold > 0 ? [{key: 'gold', name: 'Gold', amount: gold, gold: true}] : []),
                ...Array.from(lootMaterials, ([id, amount]) => ({
                    key: 'material:' + id, name: materialNames[id], amount,
                    sprite: itemData.materialDetails?.[id]?.sprite
                })),
                ...equipment.map(id => ({
                    key: 'equipment:' + id, name: itemById[id].name, amount: 1,
                    sprite: itemById[id].sprite, rarity: itemById[id].rarity, equipment: true
                }))
            ];
            window.LootEffects?.drop(rewards, defeatedCard?.querySelector('.enemy-mark') || defeatedCard, map.id);
        }
        if (defeatedCard) {
            restartCombatAnimation(defeatedCard, 'is-defeating');
        }

    });

    monster.hp = 0;
    monster.poisonStacks = [];
    monster.bleed = null;
    monster.respawnRemaining = definition.respawnSeconds;
    monster.attackTimer = 0;
    monster.freezeRemaining = 0;
    selectNextMonsterTarget(monster);
    syncLegacyEnemyState();
    transferPoisonOnDeath(monster, remainingPoison);
    gainShieldFromKill();
    saveGame();
}

function transferPoisonOnDeath(monster, stacks) {
    if (getSkillNodeRank('bloomingFlower') <= 0 || !stacks.length) return;
    const targets = state.monsterStates.filter(target => target !== monster && target.hp > 0);
    if (!targets.length) return;
    const target = targets[Math.floor(Math.random() * targets.length)];
    if (!Array.isArray(target.poisonStacks)) target.poisonStacks = [];
    target.poisonStacks.push(...stacks);
    showPoisonTransfer(monster.id, target.id);
    showMonsterProc(target.id, 'BLOOMING FLOWER');
    showPoisonStackProc(target);
}

function showPoisonTransfer(sourceId, targetId) {
    presentCombatEffect(() => {
        const source = getCombatEffectCard(sourceId)?.querySelector('.enemy-mark');
        const target = getCombatEffectCard(targetId)?.querySelector('.enemy-mark');
        if (!source || !target) return;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('poison-transfer');
        svg.setAttribute('aria-hidden', 'true');
        svg.dataset.sourceId = sourceId;
        svg.dataset.targetId = targetId;
        elements.combatPanel.appendChild(svg);
        const frame = getCombatOverlayBounds(svg);
        if (!frame.width || !frame.height) { svg.remove(); return; }
        svg.setAttribute('viewBox', '0 0 ' + frame.width + ' ' + frame.height);
        const from = getCombatEffectBounds(source), to = getCombatEffectBounds(target);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(from.left + from.width / 2 - frame.left));
        line.setAttribute('y1', String(from.top + from.height / 2 - frame.top));
        line.setAttribute('x2', String(to.left + to.width / 2 - frame.left));
        line.setAttribute('y2', String(to.top + to.height / 2 - frame.top));
        line.setAttribute('pathLength', '1');
        svg.appendChild(line);
        svg.addEventListener('animationend', event => {
            if (event.target === svg) svg.remove();
        });
        window.setTimeout(() => svg.remove(), 800);
    });
}

function applyDamageToPlayer(damage, source = 'enemy') {
    if (!Number.isFinite(damage) || damage <= 0 || state.playerHp <= 0) return;
    if (source === 'enemy') {
        normalizeShields();
        if (state.shieldStacks > 0) {
            state.shieldStacks--;
            presentCombatEffect(() => restartCombatAnimation(elements.playerHealthPanel, 'is-shield-blocking'));
            return;
        }
    }
    const previousHp = state.playerHp;
    state.playerHp = Math.max(0, state.playerHp - damage);
    if (state.playerHp < 1e-8) state.playerHp = 0;
    const damageDealt = previousHp - state.playerHp;
    presentCombatEffect(() => {
        recentPlayerDamage = damageDealt;
        flashPlayerHealthBar();
        restartCombatAnimation(elements.playerHealthDamage, 'is-visible');
        window.clearTimeout(damageFadeTimeout);
        damageFadeTimeout = window.setTimeout(() => {
            elements.playerHealthDamage.classList.remove('is-visible');
        }, 500);
    });
    if (state.playerHp === 0) {
        state.combatPaused = true;
        state.attackTimer = 0;
    }
}

function applyDamageToMonster(monster, damage, damageType = 'physical', abilityId = null) {
    if (!monster || monster.hp <= 0 || !Number.isFinite(damage) || damage <= 0) return false;
    // Every successful hit builds Fury, including splash and generated arrows.
    // Damage over time and poison executions never build or extend Fury.
    if (damageType !== 'poison' && damageType !== 'bleed' && damageType !== 'dot') gainFuryFromHit();
    const previousHp = monster.hp;
    monster.hp = Math.max(0, monster.hp - damage);
    recordMonsterDamage(previousHp - monster.hp, damageType, abilityId);
    syncLegacyEnemyState();
    if (monster.hp <= 0) {
        defeatEnemy(monster);
        return true;
    }
    // Non-poison damage can bring an already-poisoned enemy into execute range.
    // Poison ticks check after updating every stack's remaining lifetime.
    if (damageType !== 'poison' && tryExecutePoison(monster)) return true;
    if (damageType === 'physical' && abilityId &&
        SkillDescriptions.getAbilityTargeting(skillNodeById[abilityId]) === 'singleTarget') {
        tryApplyBleed(monster, damage);
    }

    const damageDealt = previousHp - monster.hp;
    presentCombatEffect(() => {
        recentEnemyDamage = damageDealt;
        const targetCard = getCombatEffectCard(monster.id);
        const damageIndicator = damageType === 'physical' && targetCard
            ? targetCard.querySelector('.enemy-health-damage')
            : null;
        if (damageIndicator) {
            const maxHp = monsterDefinition(monster).health;
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
    });
    return false;
}

function getPoisonTickInterval() {
    return cachedCombatStat('getPoisonTickInterval', () => {
        const rate = (1 + getSkillStat('poisonTickRate') + getGearStat('poisonTickRate')) *
            getSkillMultiplier('poisonTickRateMultiplier') * getGearStat('poisonTickRateMultiplier');
        return poisonDamageType.tickIntervalSeconds / Math.max(0.1, rate);
    });
}

function getPoisonDamage() {
    return cachedCombatStat('getPoisonDamage', () => Math.max(1, Math.round((poisonDamageType.baseDamage + getSkillStat('poisonDamage') + getGearStat('poisonDamage')) *
        getSkillMultiplier('poisonDamageMultiplier') * getGearStat('poisonDamageMultiplier'))));
}

function getPoisonChance() {
    return cachedCombatStat('getPoisonChance', () => Math.max(0, Math.min(1,
        (getSkillStat('poisonChance') + getGearStat('poisonChance')) *
        getSkillMultiplier('poisonChanceMultiplier') * getGearStat('poisonChanceMultiplier'))));
}

function getRemainingPoisonDamage(monster) {
    if (!monster || monster.hp <= 0 || !Array.isArray(monster.poisonStacks) || !monster.poisonStacks.length) return 0;
    const tickInterval = getPoisonTickInterval();
    const damagePerTick = getPoisonDamage();
    const cached = combatPoisonForecasts?.get(monster);
    // Ticking replaces the array; applying or spreading poison changes its length.
    // Scope forecasts to this simulation step and recheck stats after level-ups.
    if (cached && cached.stacks === monster.poisonStacks && cached.length === monster.poisonStacks.length &&
        cached.interval === tickInterval && cached.damage === damagePerTick) return cached.total;
    const total = monster.poisonStacks.reduce((total, stack) => {
        const firstTickIn = Math.max(0, stack.timeUntilTick);
        if (firstTickIn > stack.remainingDuration + 1e-6) return total;
        const ticksRemaining = 1 + Math.floor(
            (stack.remainingDuration - firstTickIn + 1e-6) / tickInterval
        );
        return total + Math.max(0, ticksRemaining) * damagePerTick;
    }, 0);
    combatPoisonForecasts?.set(monster, {
        stacks: monster.poisonStacks, length: monster.poisonStacks.length,
        interval: tickInterval, damage: damagePerTick, total
    });
    return total;
}

function tryExecutePoison(monster) {
    if (getSkillNodeRank('poisonExecute') <= 0 || !monster || monster.hp <= 0 ||
        getRemainingPoisonDamage(monster) < monster.hp) return false;
    showMonsterProc(monster.id, 'POISON EXECUTE');
    return applyDamageToMonster(monster, monster.hp, 'poison', 'poisonExecute');
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
    tryExecutePoison(monster);
    return true;
}

function tickMonsterPoison(monster, elapsed) {
    if (monster.hp <= 0 || !Array.isArray(monster.poisonStacks) || !monster.poisonStacks.length) return false;
    if (tryExecutePoison(monster)) return true;
    const tickInterval = getPoisonTickInterval();
    const remainingStacks = [];
    let damage = 0;
    for (const stack of monster.poisonStacks) {
        stack.remainingDuration -= elapsed;
        stack.timeUntilTick -= elapsed;
        while (stack.timeUntilTick <= 0 && stack.remainingDuration >= -1e-6) {
            damage += getPoisonDamage();
            stack.timeUntilTick += tickInterval;
        }
        if (stack.remainingDuration > 0) remainingStacks.push(stack);
    }
    // Advance every stack before dealing damage so death transfers cannot
    // repeat a tick or carry stacks with stale lifetimes to another enemy.
    monster.poisonStacks = remainingStacks;
    if (damage > 0) applyDamageToMonster(monster, damage, 'poison');
    return monster.hp <= 0 || tryExecutePoison(monster);
}

function playerHasShockwaveSlash() {
    return (state.skillRanks.shockwaveSlash || 0) > 0;
}

function triggerShockwaveSlash(hitMonster, hitDamage) {
    if (!playerHasShockwaveSlash() || Math.random() >= 0.25) return;
    const splashDamage = hitDamage * 0.33;
    const splashTargets = state.monsterStates
        .filter(monster => monster.hp > 0 && monster.id !== hitMonster.id);
    splashTargets.forEach(monster => {
        showMonsterProc(monster.id, 'SHOCKWAVE HIT');
        flashShockwaveCard(monster.id);
        flashShockwaveHealthBar(monster.id);
        applyDamageToMonster(monster, splashDamage, 'physical', 'shockwaveSlash');
        tryApplyPoison(monster);
    });
    // One shield per activation, independently of the number of splash hits.
    // A proc against a lone boss still grants its shield.
    if (getSkillNodeRank('resonantGuard') > 0) gainShields();
}

function craftGear(id) {
    const recipe = recipes.find(entry => entry.id === id);
    if (!recipe || !recipeIsUnlocked(recipe) || ownsItem(id) || state.crafted.includes(id) || (recipe.developerOnly && !state.developerItemsEnabled)) return;
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
    if (!activeMonster()) {
        ensureLiveMonsterTarget();
        state.attackTimer = 0;
    }
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
    clearFury();
    state.shieldStacks = 0;
    state.gear = createEmptyGear();
    state.ownedItemIds = [];
    state.developerItemsEnabled = false;
    state.developerTravelEnabled = false;
    inventoryCategory = 'slot';
    document.querySelector('#developerItems').checked = false;
    document.querySelector('#developerTravel').checked = false;
    state.crafted = [];
    state.tutorials = createTutorialState();
    state.selectedWorld = worldData[0].id;
    state.lastMapByWorld = Object.fromEntries(worldData.map(world => [world.id, world.mapIds[0]]));
    state.selectedMap = 'greenfields';
    state.mapListExpanded = true;
    state.isInTown = true;
    state.currentView = 'town';
    skillTreeNeedsInitialFraming = true;
    resetMonsterStates(mapData.find(map => map.id === worldData[0].mapIds[0]));
    state.playerHp = getPlayerMaxHealth();
    state.combatPaused = false;
    state.attackTimer = 0;
    resetCombatClock();
    clearOfflineRecap();
    state.lootLog = [];
    state.lastDrop = 'Defeat enemies to find loot.';
    state.lastLoot = null;
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
    state.lastLoot = null;
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
    travelToMap(selected.id);
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
            state.playerHp = Math.min(maxHealth, state.playerHp);
            applyPlayerHealing(Math.max(0, maxHealth - previousMaxHealth));
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
    const info = event.target.closest('[data-material-info]');
    if (info) { toggleMaterialSources(info); return; }
    const location = event.target.closest('[data-material-map]');
    if (location) { if (!location.disabled) travelToMap(location.dataset.materialMap); return; }
    const button = event.target.closest('[data-craft]');
    if (button && !button.disabled) craftGear(button.dataset.craft);
});

elements.inventory.addEventListener('click', function(event) {
    const location = event.target.closest('[data-material-map]');
    if (location && !location.disabled) travelToMap(location.dataset.materialMap);
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

document.querySelector('#inventoryTools').addEventListener('click', function(event) {
    const button = event.target.closest('[data-inventory-category]');
    if (!button) return;
    inventoryCategory = button.dataset.inventoryCategory;
    renderInventory();
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
    inventoryCategory = 'slot';
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
    if (!item || !ownsItem(item.id) || (inventoryCategory === 'slot' && item.slot !== selectedGearSlot)) return;
    selectedGearSlot = item.slot;
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

document.querySelector('#developerTravel').addEventListener('change', function(event) {
    state.developerTravelEnabled = event.target.checked;
    state.mapListExpanded = true;
    if (!state.developerTravelEnabled) {
        const worldIndex = worldData.findIndex(world => world.id === state.selectedWorld);
        const world = worldIsUnlocked(worldIndex) ? worldData[worldIndex] : worldData[0];
        const maps = mapsForWorld(world.id);
        const currentIndex = maps.findIndex(map => map.id === state.selectedMap);
        const destination = mapIsUnlocked(maps, currentIndex) ? maps[currentIndex]
            : maps.filter((map, index) => mapIsUnlocked(maps, index)).at(-1);
        if (destination.id !== state.selectedMap) {
            state.selectedWorld = world.id;
            state.selectedMap = destination.id;
            state.lastMapByWorld[world.id] = destination.id;
            resetMonsterStates(destination);
            clearEnemyDamageIndicator();
            state.attackTimer = 0;
            state.lastLoot = null;
            state.lastDrop = 'Defeat enemies to find loot.';
        }
    }
    render();
    saveGame();
});

const hasSavedGame = loadGame();
if (hasSavedGame) startOfflineRecap();
document.querySelector('#developerItems').checked = state.developerItemsEnabled;
document.querySelector('#developerTravel').checked = state.developerTravelEnabled;
if (!state.monsterStates.length) resetMonsterStates(currentMap());
state.monsterStates.forEach(monster => {
    monster.hp = Math.min(monster.hp, monsterDefinition(monster).health);
});
syncLegacyEnemyState();
ensureLiveMonsterTarget();
render();
if (state.currentView === 'upgrades') {
    centerSkillTreeOnOrigin(skillTreeNeedsInitialFraming);
    skillTreeNeedsInitialFraming = false;
}
if (!hasSavedGame) saveGame();

// All combat rules use the same 100 ms steps, including background catch-up.
// Visual effects are returned to the caller; this function does not touch the DOM.
function simulateCombatStep(elapsed, collectEffects = false) {
    const previousEffects = combatEffects, previousSimulation = simulatingCombat;
    const previousForecasts = combatPoisonForecasts;
    combatPoisonForecasts = new WeakMap();
    const effects = collectEffects ? [] : null;
    combatEffects = effects;
    simulatingCombat = true;
    try {
        const map = currentMap();
        tickFury(elapsed);
        normalizeShields();
        const killsBeforeTick = state.kills[map.id];
        const wasPaused = state.combatPaused;
        tickPlayerRegeneration(elapsed);
        ensureLiveMonsterTarget();
        const previousTarget = activeMonster();
        let anyRespawned = false;
        const enemyAttackElapsed = [];
        state.monsterStates.forEach((monster, index) => {
            const frozenSeconds = Math.min(elapsed, monster.freezeRemaining || 0);
            monster.freezeRemaining = Math.max(0, (monster.freezeRemaining || 0) - elapsed);
            if (monster.freezeRemaining < 1e-6) monster.freezeRemaining = 0;
            const interval = monsterDefinition(monster, map).attackInterval;
            // Keep attack progress in normal interval units. This avoids a burst
            // of banked attacks when freezing expires, including mid-step.
            enemyAttackElapsed[index] = elapsed - frozenSeconds +
                frozenSeconds * interval / (interval + arrowSkillSettings.freezeDelay);
            if (monster.hp > 0 || monster.respawnRemaining <= 0) return;
            monster.respawnRemaining = Math.max(0, monster.respawnRemaining - elapsed);
            if (monster.respawnRemaining === 0) {
                monster.hp = monsterDefinition(monster, map).health;
                monster.attackTimer = 0;
                monster.freezeRemaining = 0;
                monster.bleed = null;
                anyRespawned = true;
            }
        });
        tickPendingEruptions(elapsed);
        tryShieldSlam();
        if (!state.combatPaused) {
            state.monsterStates.forEach(monster => {
                if (monster.hp > 0) {
                    tickMonsterPoison(monster, elapsed);
                    if (monster.hp > 0) tickMonsterBleed(monster, elapsed);
                }
            });
            ensureLiveMonsterTarget();
            syncLegacyEnemyState();
            const target = activeMonster();
            state.monsterStates.forEach((monster, index) => {
                if (monster.hp <= 0 || state.combatPaused) return;
                const definition = monsterDefinition(monster, map);
                monster.attackTimer += enemyAttackElapsed[index];
                while (monster.attackTimer >= definition.attackInterval && !state.combatPaused) {
                    monster.attackTimer -= definition.attackInterval;
                    if (Math.random() * 100 < getEnemyHitChance(monster)) {
                        applyDamageToPlayer(definition.attackDamage, 'enemy');
                    } else {
                        flashDodge(elements.playerHealthTrack);
                    }
                }
            });
            if (!target) {
                state.attackTimer = 0;
            } else {
                if (!previousTarget && target || anyRespawned && previousTarget && target.id !== previousTarget.id) {
                    state.attackTimer = 0;
                }
                const attackInterval = getAttackSpeed();
                state.attackTimer += elapsed;
                while (state.attackTimer >= attackInterval && !state.combatPaused) {
                    state.attackTimer -= attackInterval;
                    const arrowTarget = activeMonster();
                    const arrowDamage = getDamage();
                    const attackTargets = getPlayerAttackTargets();
                    const extraEruptionTargets = [];
                    for (let attackIndex = 0; attackIndex < attackTargets.length; attackIndex++) {
                        const attackTarget = attackTargets[attackIndex];
                        if (attackTarget.hp <= 0) continue;
                        if (Math.random() * 100 < getHitChance(getPlayerAccuracy(), monsterDefinition(attackTarget, map).evasion)) {
                            const hitDamage = getDamage();
                            if (attackIndex > 0) showMonsterHitBadge(attackTarget.id, 'MULTI-HIT', true);
                            applyDamageToMonster(attackTarget, hitDamage, 'physical');
                            // Basic attacks also roll Bleed, including multihits.
                            tryApplyBleed(attackTarget, hitDamage);
                            tryApplyPoison(attackTarget);
                            triggerShockwaveSlash(attackTarget, hitDamage);
                            if (attackIndex > 0) extraEruptionTargets.push({target: attackTarget, damage: hitDamage});
                        } else {
                            presentCombatEffect(() => {
                                const targetCard = getCombatEffectCard(attackTarget.id);
                                const targetTrack = targetCard && targetCard.querySelector('.health-track');
                                if (targetTrack) flashDodge(targetTrack);
                            });
                        }
                    }
                    if (arrowTarget) {
                        triggerVolcanicEruption(arrowTarget, arrowDamage);
                        extraEruptionTargets.forEach(hit => triggerVolcanicEruption(hit.target, hit.damage));
                        triggerAttackArrowSkills(arrowTarget, arrowDamage);
                    }
                }
            }
        } else {
            state.monsterStates.forEach(monster => {
                if (monster.hp > 0) {
                    tickMonsterPoison(monster, elapsed);
                    if (monster.hp > 0) tickMonsterBleed(monster, elapsed);
                }
            });
            ensureLiveMonsterTarget();
            syncLegacyEnemyState();
        }

        return {
            needsRender: state.kills[map.id] !== killsBeforeTick || anyRespawned || wasPaused !== state.combatPaused,
            effects: effects || []
        };
    } finally {
        combatEffects = previousEffects;
        simulatingCombat = previousSimulation;
        combatPoisonForecasts = previousForecasts;
    }
}

function setCombatCatchupUi(active) {
    if (document.hidden || combatCatchupUiActive === active) return;
    combatCatchupUiActive = active;
    document.querySelector('.nav-header').inert = active;
    document.querySelector('.experience-strip').inert = active;
    document.querySelector('main').inert = active;
    document.querySelector('.developer-options').inert = active;
    document.querySelector('#combatCatchupNotice').hidden = !active;
    if (active) {
        elements.combatStatusLabel.textContent = 'Catching up…';
        document.querySelector('main').setAttribute('aria-busy', 'true');
    } else {
        document.querySelector('main').removeAttribute('aria-busy');
    }
}

function resetCombatClock(timestamp = Date.now()) {
    if (combatContinuation !== null) window.clearTimeout(combatContinuation);
    combatContinuation = null;
    lastTick = performance.now();
    lastWallTick = Date.now();
    lastSimulatedAt = timestamp;
    pendingCombatSeconds = Math.max(0, (lastWallTick - timestamp) / 1000);
    combatNeedsFullRender = true;
    combatCatchingUp = pendingCombatSeconds >= 0.5;
    setCombatCatchupUi(false);
}

function processCombatBacklog() {
    const startedAt = performance.now(), effects = [];
    const showEffects = !document.hidden && !combatCatchingUp;
    combatStatCache = new Map();
    try {
        // Bound each batch, not the amount of elapsed game time. The remainder is
        // retained and continued in another task so input and painting can run.
        for (let steps = 0; pendingCombatSeconds + 1e-8 >= gameTickSeconds && steps < 250; steps++) {
            let elapsed = gameTickSeconds;
            if (state.combatPaused && !state.furyStacks && !state.pendingEruptions.length && state.monsterStates.every(monster => !monster.poisonStacks.length && !monster.bleed)) {
                // Once Fury, damage over time and travelling eruptions finish, only respawns
                // can change a dead player's state. Preserve 100 ms boundaries.
                const nextRespawn = Math.min(...state.monsterStates
                    .filter(monster => monster.hp <= 0 && monster.respawnRemaining > 0)
                    .map(monster => monster.respawnRemaining));
                elapsed = Number.isFinite(nextRespawn)
                    ? Math.min(pendingCombatSeconds, Math.max(gameTickSeconds,
                        Math.ceil((nextRespawn - 1e-8) / gameTickSeconds) * gameTickSeconds))
                    : pendingCombatSeconds;
            }
            const result = simulateCombatStep(elapsed, showEffects);
            pendingCombatSeconds = Math.max(0, pendingCombatSeconds - elapsed);
            lastSimulatedAt += elapsed * 1000;
            combatNeedsFullRender ||= result.needsRender;
            effects.push(...result.effects);
            if (performance.now() - startedAt >= 8) break;
        }
    } finally {
        combatStatCache = null;
    }
    const unfinished = pendingCombatSeconds + 1e-8 >= gameTickSeconds;
    if (unfinished) {
        combatCatchingUp = true;
        setCombatCatchupUi(true);
        if (combatContinuation === null) {
            combatContinuation = window.setTimeout(() => {
                combatContinuation = null;
                updateCombatClock();
            }, 0);
        }
    } else {
        if (combatContinuation !== null) window.clearTimeout(combatContinuation);
        combatContinuation = null;
        setCombatCatchupUi(false);
        if (!document.hidden) {
            flushCombatEffects(effects);
            if (combatNeedsFullRender || combatCatchingUp) render();
            else renderCombat();
            combatNeedsFullRender = false;
        }
        combatCatchingUp = false;
        showOfflineRecap();
    }
    if (Date.now() - lastSave >= 1000) saveGame();
}

function updateCombatClock() {
    const now = performance.now(), wallNow = Date.now();
    // The wall clock also covers device sleep when the monotonic clock pauses.
    const monotonicElapsed = Math.max(0, (now - lastTick) / 1000);
    const wallElapsed = Math.max(0, (wallNow - lastWallTick) / 1000);
    const elapsed = wallElapsed > monotonicElapsed + 1 ? wallElapsed : monotonicElapsed;
    lastTick = now;
    lastWallTick = wallNow;
    pendingCombatSeconds += elapsed;
    combatCatchingUp ||= pendingCombatSeconds >= 0.5;
    processCombatBacklog();
}

setInterval(updateCombatClock, gameTickMilliseconds);
if (pendingCombatSeconds >= gameTickSeconds) updateCombatClock();

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
    const tooltipTag = tooltip.querySelector('.ability-tag');
    function showNodeTooltip(button) {
        const node = skillNodeById[button.dataset.skillNode];
        if (!node) return;
        tooltipTitle.textContent = node.name;
        tooltipDescription.textContent = SkillDescriptions.describe(node);
        const tag = SkillDescriptions.abilityTagLabel(node);
        tooltipTag.textContent = tag;
        tooltipTag.dataset.targeting = SkillDescriptions.getAbilityTargeting(node) || '';
        tooltipTag.hidden = !tag;
        tooltip.classList.toggle('is-righteous-fire', righteousFireNodeIds.includes(node.id));
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
window.addEventListener('pagehide', saveGame);
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') saveGame();
    else {
        combatNeedsFullRender = true;
        updateCombatClock();
    }
});
