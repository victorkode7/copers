// The optional module selects a separate development save namespace. Without it,
// saved developer preferences cannot enable tooling or change the playtest slot.
const saveKey = window.DeveloperTools?.saveKey || 'idleAdventureSave';
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
    skillPointCapPending: false,
    skillPointCapDismissed: false,
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
let preservedSaveFields = {};

function saveCompatibilityContext() {
    return {skills:skillNodeById,connections:skillNodeConnections,skillAliases:skillTreeData.nodeIdAliases,
        removedSkills:skillTreeData.removedNodes,items:itemById,slots:gearSlots,
        materials:materialNames,maps:Object.fromEntries(mapData.map(map=>[map.id,map])),worlds:worldData,
        worldById:Object.fromEntries(worldData.map(world=>[world.id,world]))};
}

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
const furyBuffSettings = Object.freeze({secondsPerStack:furySecondsPerStack, decaySeconds:furyStackDecaySeconds});
const furyDamagePerStack = 0.02;
const righteousFireSettings = Object.freeze({regenHealthCap: 0.3, healthDrainPerSecond: 0.1, damageMultiplier: 1});
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
let displayedSkillPointCap = null;
let animatedSkillPointCap = null;
let skillPointCapAnimationTimer;

const state = {
    gold: 0,
    kills: Object.fromEntries(mapData.map(map => [map.id, 0])),
    materials: Object.fromEntries(Object.keys(materialNames).map(id => [id, 0])),
    upgrades: { strength: 0, haste: 0, evasion: 0 },
    level: 0,
    experience: 0,
    experienceRemainder: 0,
    skillPoints: 0,
    skillRanks: {},
    mapMastery: {},
    defeatedBossWorldIds: [],
    skillPointRecoveryRanks: null,
    skillPointTrimPending: false,
    unlockedMapIds: [],
    unlockedWorldIds: [],
    gear: createEmptyGear(),
    ownedItemIds: [],
    // Preferences only. Capabilities, UI and mutations belong to the removable
    // developer module; never add inline flag-based developer bypasses here.
    developerItemsEnabled: false,
    developerTravelEnabled: false,
    crafted: [],
    itemCrafts: {},
    itemRollSaves: {},
    townProgress: TownProgression.defaults(),
    tutorials: createTutorialState(),
    selectedWorld: worldData[0].id,
    lastMapByWorld: Object.fromEntries(worldData.map(world => [world.id, world.mapIds[0]])),
    selectedMap: worldData[0].mapIds[0],
    mapListExpanded: true,
    mapListLocked: false,
    isInTown: true,
    currentView: 'town',
    enemyHp: mapData.find(map => map.id === worldData[0].mapIds[0]).health,
    enemyRespawnRemaining: 0,
    monsterStates: [],
    pendingEruptions: [],
    pendingVoidMissiles: [],
    monsterColumns: 1,
    targetMonsterId: null,
    playerHp: basePlayerMaxHealth,
    playerMana: 0,
    manaCapacity: 0,
    voidCharges: 0,
    gatheringPower: {stacks:0,progress:0,remaining:0},
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
    skillPointTotal: document.querySelector('#skillPointTotal'),
    skillPointCap: document.querySelector('#skillPointCapValue'),
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
    mapSelectorLock: document.querySelector('#mapSelectorLock'),
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
// undefined presents immediately; null suppresses effects; an array collects
// ordered event records and legacy presentation callbacks for a live step.
let combatEffects;
let combatStatCache = null;
const skillBonusCache = {ranks: null, level: null, flat: new Map(), multipliers: new Map()};
let combatPoisonForecasts = null;
let combatAnimationRestarts = null;
let combatEffectLayout = null;
const combatBuffViews = new Map();
let voidVolleyBuffProc = null;
const detailedStatViews = new Map();
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
        dead: state.playerHp<=0
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

function combatEffectEnabled(category = 'general') {
    return !window.MapMastery?.isOpen() && window.CombatSettings?.enabled(category) !== false;
}

function presentCombatEffect(effect, category = 'general') {
    // Presentation-only compatibility helper. Combat rules emit data records.
    if (combatEffects === null || document.hidden || !combatEffectEnabled(category)) return;
    if (combatEffects) combatEffects.push(() => { if (combatEffectEnabled(category)) effect(); });
    else effect();
}

// Simulation-facing entry point: no DOM, visibility, or renderer settings.
// Construct records only when presentation is requested, including live steps.
function emitCombatEvent(type, details) {
    if (combatEffects === null) return;
    const event = {...details, type};
    // Spawn IDs can be reused on other maps; keep delayed visuals on their map.
    if (event.monsterId !== undefined) event.mapId = state.selectedMap;
    if (combatEffects) combatEffects.push(event);
    else presentCombatEvent(event);
}

function presentCombatEvent(event) {
    // Keep compatibility with presentation callbacks supplied by older callers.
    if (typeof event === 'function') { event(); return; }
    // Cancellation/reset release handles even when the app is hidden.
    if (event.type === 'voidVolleyReset') {
        if(event.epoch===voidMissilePresentationEpoch)presentVoidVolleyReset();
        return;
    }
    if (event.type === 'voidMissileCancelled') {presentVoidMissileCancelled(event);return;}
    if (document.hidden) return;
    switch (event.type) {
        case 'poisonTransferred':
            if (event.mapId !== state.selectedMap || !isCombatView()) break;
            presentPoisonTransfer(event);
            break;
        case 'righteousFireHit':
            if (event.mapId !== state.selectedMap || !isCombatView() || !combatEffectEnabled()) break;
            presentRighteousFireHit(event);
            break;
        case 'monsterDefeated':
            if (event.mapId !== state.selectedMap || !isCombatView()) break;
            presentMonsterDefeat(event);
            break;
        case 'enemyDamageCleared':
            if (event.mapId === state.selectedMap && combatEffectEnabled()) presentEnemyDamageIndicatorReset();
            break;
        case 'playerCombatBuffsCleared':
            if (event.mapId === state.selectedMap && combatEffectEnabled()) presentPlayerCombatBuffsCleared();
            break;
        case 'elementalEffectsCleared':
            if (event.mapId === state.selectedMap) elements.combatPanel.querySelectorAll('.elemental-effect-layer').forEach(layer=>layer.remove());
            break;
        case 'arrowFired':
            if (event.mapId !== state.selectedMap || !isCombatView()) break;
            presentCombatArrow(event);
            break;
        case 'voidBoltCast':
            if (event.mapId !== state.selectedMap || !isCombatView()) break;
            presentVoidBoltCast(event);
            break;
        case 'voidVortexCast':
            if (event.mapId !== state.selectedMap || !isCombatView()) break;
            presentVoidVortexCast(event);
            break;
        case 'volcanicEruption':
            if (event.mapId !== state.selectedMap || !isCombatView()) break;
            presentVolcanicEruption(event);
            break;
        case 'eruptionChain':
            if (event.mapId !== state.selectedMap || !isCombatView()) break;
            presentEruptionChain(event);
            break;
        case 'elementalBurst':
            if (event.mapId !== state.selectedMap || !isCombatView()) break;
            presentElementalBurst(event);
            break;
        case 'shieldSlamWave':
            if (event.mapId !== state.selectedMap || !isCombatView()) break;
            presentShieldSlamWave(event);
            break;
        case 'voidVolleyCast':
        case 'voidMissileImpact':
        case 'voidVolleyPlayerGlow':
        case 'voidVolleyBuffProc':
            if (event.mapId !== state.selectedMap || !isCombatView() || event.epoch !== voidMissilePresentationEpoch) break;
            if (event.type === 'voidVolleyCast') presentVoidVolleyCast(event);
            else if (event.type === 'voidMissileImpact') presentVoidMissileImpact(event);
            else if (event.type === 'voidVolleyPlayerGlow') presentVoidVolleyPlayerGlow(event);
            else presentVoidVolleyBuffProc(event);
            break;
        case 'playerDodged':
            flashDodge(elements.playerHealthTrack);
            break;
        case 'playerDamaged':
            showPlayerDamage(event.damage);
            break;
        case 'playerShieldBlocked':
            if (event.mapId !== state.selectedMap || !isCombatView()) break;
            restartCombatAnimation(elements.playerHealthPanel, 'is-shield-blocking');
            break;
        case 'monsterShockwaveFlash': {
            if (event.mapId !== state.selectedMap || !isCombatView() || !combatEffectEnabled('glows') || !combatEffectEnabled('abilities')) break;
            const track = getCombatEffectCard(event.monsterId)?.querySelector('.health-track');
            if (track) restartCombatAnimation(track, 'is-shockwave-hit');
            break;
        }
        case 'monsterShockwaveShake': {
            if (event.mapId !== state.selectedMap || !isCombatView() || !combatEffectEnabled('shaking') || !combatEffectEnabled('abilities')) break;
            const card = getCombatEffectCard(event.monsterId);
            if (card) restartCombatAnimation(card, 'is-shockwave-splashed');
            break;
        }
        case 'monsterDamaged':
            if (event.mapId !== state.selectedMap || !isCombatView()) break;
            showMonsterDamage(event.monsterId, event.damage, event.damageType);
            break;
        case 'monsterHitNotice':
            if (event.mapId !== state.selectedMap || !isCombatView()) break;
            presentMonsterHitBadge(event.monsterId, event.label, event.isMultiHit, event.priority);
            break;
        case 'monsterProcNotice':
            if (event.mapId !== state.selectedMap || !isCombatView()) break;
            presentMonsterProc(event.monsterId, event.procName);
            break;
        case 'monsterPoisonApplied':
            if (event.mapId !== state.selectedMap || !isCombatView()) break;
            presentPoisonStackProc(event.monsterId);
            break;
        case 'monsterBleedApplied':
            if (event.mapId !== state.selectedMap || !isCombatView()) break;
            presentBleedStackProc(event.monsterId);
            break;
        case 'monsterDodged': {
            if (event.mapId !== state.selectedMap || !isCombatView() || !combatEffectEnabled('glows')) break;
            const card = getCombatEffectCard(event.monsterId);
            const track = card && card.querySelector('.health-track');
            if (track) flashDodge(track);
            break;
        }
    }
}

function cachedCombatStat(key, calculate) {
    if (!combatStatCache) return calculate();
    if (!combatStatCache.has(key)) combatStatCache.set(key, calculate());
    return combatStatCache.get(key);
}

function restartCombatAnimation(element, className) {
    const category = ['is-defeating', 'is-shockwave-splashed'].includes(className) ? 'shaking'
        : ['is-applying', 'is-proccing', 'is-releasing', 'is-damaged', 'is-dodging', 'is-shockwave-hit', 'is-shield-blocking'].includes(className) ? 'glows' : 'general';
    if (!combatEffectEnabled(category)) return;
    if(category==='glows'&&window.CombatWebGLEffects?.pulse(element,className))return;
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
    if (!effects.length) {
        if(!combatAnimationRestarts)pruneVoidMissilePresentations();
        return;
    }
    const previousRestarts = combatAnimationRestarts;
    if (previousRestarts) { effects.forEach(presentCombatEvent); return; }
    combatAnimationRestarts = new Map();
    combatEffectLayout = {
        cards: new Map(Array.from(elements.enemyRoster.children, card => [card.dataset.monsterId, card])),
        bounds: new WeakMap(),
        frame: null
    };
    try { effects.forEach(presentCombatEvent); }
    finally {
        const restarts = combatAnimationRestarts;
        combatAnimationRestarts = previousRestarts;
        combatEffectLayout = null;
        pruneVoidMissilePresentations();
        // Restart all hit flashes together after a single layout flush.
        if (restarts.size) void elements.combatPanel.offsetWidth;
        restarts.forEach((classes, element) => classes.forEach(name => element.classList.add(name)));
    }
}

function getCombatEffectCard(id) {
    return combatEffectLayout ? combatEffectLayout.cards.get(id) :
        Array.from(elements.enemyRoster.children).find(card => card.dataset.monsterId === id);
}

function getCombatEffectMonster(id) {
    return combatEffectLayout
        ? (combatEffectLayout.monsters ||= new Map(state.monsterStates.map(monster => [monster.id, monster]))).get(id)
        : state.monsterStates.find(monster => monster.id === id);
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
let lastRenderedEquippedSignature = null;
const recipeViews = new Map(), recipeCategoryViews = new Map(), materialInventoryViews = new Map();
// Retained entries preserve hover, focus and open popovers while quantities change.
const materialLocationSources = new WeakMap(), materialLocationSignatures = new WeakMap();
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

function isCombatView() {return state.currentView==='map';}

const monsterDefinitionCache = new WeakMap();
const monsterDefinitionIndices = new WeakMap();
const monsterMasteryKeys = new WeakMap();
function monsterDefinitions(map = currentMap()) {
    const masteryKey=MasterySystem.selection(state,map);
    const masteryTree=MasterySystem.tree(worldContent,map),cachedKey=monsterMasteryKeys.get(map);
    if (monsterDefinitionCache.has(map) && cachedKey?.nodes===masteryKey && cachedKey?.tree===masteryTree) return monsterDefinitionCache.get(map);
    const bonus=stat=>MasterySystem.bonus(worldContent,map,state,stat);
    const raw=WorldContent.definitions(worldContent,map),count=raw.length?Math.max(1,Math.min(100,raw.length+Math.round(bonus('monsterCountBonus')))):0;
    const usedIds=new Set(raw.map(monster=>monster.id));
    const definitions = Array.from({length:count},(_,index)=>{
        const monster=raw[index%raw.length];let id=monster.id;
        if(index>=raw.length){id+='-mastery-'+index;while(usedIds.has(id))id+='-extra';usedIds.add(id);}
        return ({
        ...monster,
        id,
        health:Math.max(1,Math.min(Number.MAX_SAFE_INTEGER,Math.round(monster.health*bonus('monsterHealthMultiplier')))),
        attackDamage:monster.attackDamage*bonus('monsterDamageMultiplier'),
        accuracy:monster.accuracy*bonus('monsterAccuracyMultiplier'),
        respawnSeconds:Math.max(.05,monster.respawnSeconds*bonus('monsterRespawnMultiplier')),
        drops: monster.drops.filter(drop => Object.hasOwn(materialNames, drop.id)),
        itemDrops: monster.itemDrops.filter(drop => Object.hasOwn(itemById, drop.id) && !itemById[drop.id].developerOnly)
    });});
    monsterDefinitionCache.set(map, definitions);
    monsterMasteryKeys.set(map,{nodes:masteryKey,tree:masteryTree});
    monsterDefinitionIndices.set(map, new Map(definitions.map(definition => [definition.id, definition])));
    return definitions;
}

function refreshMasteryMonsters(previousDefinitions) {
    const map=currentMap(),old=new Map(previousDefinitions.map(definition=>[definition.id,definition])),definitions=monsterDefinitions(map);
    const saved=state.monsterStates.map(monster=>{
        const before=old.get(monster.id),after=definitions.find(definition=>definition.id===monster.id);
        if(!before||!after)return monster;
        return {...monster,hp:monster.hp/before.health*after.health,respawnRemaining:monster.respawnRemaining/before.respawnSeconds*after.respawnSeconds};
    });
    // New population slots begin at full health; surviving slots retain their
    // damage and respawn progress as proportions of the new encounter stats.
    const byId=new Map(saved.map(monster=>[monster.id,monster])),fresh=createMonsterStates(map);
    state.monsterStates=definitions.map((definition,index)=>{
        const previous=byId.get(definition.id);
        return previous?{...previous,hp:Math.min(definition.health,previous.hp)}:fresh[index];
    });
    state.pendingEruptions=[];state.pendingVoidMissiles=[];
    resetVoidMissilePresentation();
    if(!state.monsterStates.some(monster=>monster.id===state.targetMonsterId))state.targetMonsterId=definitions[0]?.id||null;
    combatNeedsFullRender=true;combatLootSignature=null;syncLegacyEnemyState();
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
            rimeBrand: hp>0 && saved?.rimeBrand && isValidBrandState(saved.rimeBrand) ? {...saved.rimeBrand} : null,
            emberBrand: hp>0 && saved?.emberBrand && isValidBrandState(saved.emberBrand) ? {...saved.emberBrand} : null,
            scorched: hp>0 && saved?.scorched===true,
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
    window.MapMastery?.close(false);
    clearPlayerCombatBuffs();
    emitCombatEvent('elementalEffectsCleared', {mapId:map.id});
    resetDamageBreakdown(map.id);
    monsterDefinitionCache.delete(map);
    state.pendingEruptions = [];
    state.pendingVoidMissiles = [];
    resetVoidMissilePresentation();
    state.monsterStates = createMonsterStates(map);
    state.targetMonsterId = monsterDefinitions(map)[0].id;
    state.playerHp=Math.min(state.playerHp,getPlayerMaxHealth());
    state.playerMana=Math.min(state.playerMana,getPlayerMaxMana());
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
    return combatAbilities.getPlayerAttackTargets();
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
    emitCombatEvent('enemyDamageCleared', {mapId:state.selectedMap});
}

function presentEnemyDamageIndicatorReset() {
    recentEnemyDamage = 0;
    elements.enemyRoster.querySelectorAll('.enemy-health-damage, .enemy-health-poison-damage').forEach(indicator => {
        window.clearTimeout(enemyDamageIndicatorTimers.get(indicator));
        indicator.classList.remove('is-visible');
        if (indicator.classList.contains('enemy-health-poison-damage')) {
            setCombatBar(indicator, 0);
        }
    });
}

function flashDodge(track) {
    if (!combatEffectEnabled('glows')) return;
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
    emitCombatEvent('monsterProcNotice', {monsterId, procName});
}

function presentMonsterProc(monsterId, procName) {
    if (!combatEffectEnabled('abilities')) return;
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
}

function showPoisonStackProc(monster) {
    emitCombatEvent('monsterPoisonApplied', {monsterId: monster.id});
}

function presentPoisonStackProc(monsterId) {
    if (!combatEffectEnabled()) return;
    const monster = getCombatEffectMonster(monsterId);
    const card = getCombatEffectCard(monsterId);
    const indicator = card && card.querySelector('[data-enemy-dot-status]');
    if (!monster || !indicator) return;
    const count = monster.hp > 0 ? monster.poisonStacks.length : 0;
    updateCombatHidden(indicator, count === 0);
    if (!count) return;
    updateCombatText(indicator.querySelector('[data-enemy-dot-count]'), count + 'x');
    restartCombatAnimation(indicator, 'is-applying');
}

function flashShockwaveHealthBar(monsterId) {
    emitCombatEvent('monsterShockwaveFlash', {monsterId});
}

function showMonsterHitBadge(monsterId, label, isMultiHit = false, priority = 0) {
    emitCombatEvent('monsterHitNotice', {monsterId, label, isMultiHit, priority});
}

function presentMonsterHitBadge(monsterId, label, isMultiHit = false, priority = 0) {
    if (!combatEffectEnabled('abilities')) return;
    const card = getCombatEffectCard(monsterId);
    if (!card) return;
    const notice = card.querySelector('[data-combat-hit-badge]');
    if (!notice) return;
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

function flashShockwaveCard(monsterId) {
    emitCombatEvent('monsterShockwaveShake', {monsterId});
}

function flashPlayerHealthBar() {
    if (!combatEffectEnabled('glows')) return;
    presentCombatEffect(() => {
        restartCombatAnimation(elements.playerHealthTrack, 'is-damaged');
    });
}

function showPlayerDamage(damage) {
    if (!combatEffectEnabled()) return;
    recentPlayerDamage = damage;
    flashPlayerHealthBar();
    restartCombatAnimation(elements.playerHealthDamage, 'is-visible');
    window.clearTimeout(damageFadeTimeout);
    damageFadeTimeout = window.setTimeout(() => {
        elements.playerHealthDamage.classList.remove('is-visible');
    }, 500);
}

function showMonsterDamage(monsterId, damage, damageType) {
    if (!combatEffectEnabled()) return;
    recentEnemyDamage = damage;
    if (damageType !== 'physical') return;
    const monster = getCombatEffectMonster(monsterId);
    const card = getCombatEffectCard(monsterId);
    const indicator = card && card.querySelector('.enemy-health-damage');
    if (!monster || !indicator) return;
    // Place the hit snapshot beside the current health bar, including when
    // several simulation steps have completed before this batch is presented.
    const maxHp = monsterDefinition(monster).health;
    const currentHpPercent = Math.max(0, Math.min(100, monster.hp / maxHp * 100));
    const damagePercent = Math.min(100 - currentHpPercent, Math.max(damage / maxHp * 100, 1));
    setCombatBar(indicator, damagePercent, currentHpPercent);
    indicator.classList.add('is-visible');
    window.clearTimeout(enemyDamageIndicatorTimers.get(indicator));
    enemyDamageIndicatorTimers.set(indicator, window.setTimeout(() => {
        indicator.classList.remove('is-visible');
        enemyDamageIndicatorTimers.delete(indicator);
    }, 250));
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

function resolveSkillNodeId(id) {
    if (Object.hasOwn(skillNodeById,id)) return id;
    const visited = new Set();
    while (!Object.hasOwn(skillNodeById,id)) {
        const next = skillTreeData.nodeIdAliases?.[id] ?? SkillStatCompat.nodeIdAliases[id];
        if (typeof next !== 'string' || visited.has(id)) return id;
        visited.add(id);id = next;
    }
    return id;
}

function skillNodeDefinition(id) {
    return skillNodeById[resolveSkillNodeId(id)];
}

function getSkillNodeRank(id, ranks = state.skillRanks) {
    return ranks[resolveSkillNodeId(id)] || 0;
}

function getPendingSkillPointCount() {
    return Object.values(pendingSkillRanks).reduce((total, rank) => total + rank, 0);
}

function getPlannedSkillRanks() {
    if(window.SkillBuilds?.isEditing())return SkillBuilds.getEditingRanks();
    return Object.fromEntries(skillNodes.map(node => [
        node.id,
        getSkillNodeRank(node.id) + getSkillNodeRank(node.id, pendingSkillRanks)
    ]));
}

function canDeselectPendingSkillNode(nodeId) {
    if(window.SkillBuilds?.isEditing())return (SkillBuilds.getEditingRanks()[nodeId]||0)>0;
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
    const cache = getSkillBonusCache();
    if (!cache.flat.has(stat)) cache.flat.set(stat, getSkillStatFromRanks(stat, state.skillRanks) + (Equipment.stats[stat]?.mode === 'add' ? MasterySystem.bonus(worldContent,currentMap(),state,stat) : 0));
    return cache.flat.get(stat);
}

function invalidateSkillBonusCache() {
    skillBonusCache.ranks = null;
    // Derived values in the current combat batch must also see allocation edits.
    if (combatStatCache) combatStatCache.clear();
}

function getSkillBonusCache() {
    // Loading/resetting/importing builds replaces the allocation object. In-place
    // purchases and refunds explicitly invalidate it; level affects attack speed.
    const mapId=state.selectedMap;
    const menagerie=state.townProgress.buildings.menagerie;
    if (skillBonusCache.ranks !== state.skillRanks || skillBonusCache.level !== state.level || skillBonusCache.mastery !== state.mapMastery || skillBonusCache.mapId !== mapId || skillBonusCache.menagerie !== menagerie) {
        skillBonusCache.ranks = state.skillRanks;
        skillBonusCache.level = state.level;
        skillBonusCache.mastery = state.mapMastery;
        skillBonusCache.mapId = mapId;
        skillBonusCache.menagerie = menagerie;
        skillBonusCache.flat.clear();
        skillBonusCache.multipliers.clear();
    }
    return skillBonusCache;
}

function ownsItem(id, source = state) {
    const item = Object.hasOwn(itemById, id) ? itemById[id] : null;
    return Boolean(item && (item.developerOnly
        ? window.DeveloperTools?.owns(item,source) === true
        : source.ownedItemIds.includes(id)));
}

function getEquippedItems() {
    return Object.values(state.gear).filter(id => ownsItem(id)).map(id => ItemCrafting.effective(itemById[id]));
}

function getGearStat(stat) {
    return cachedCombatStat('getGearStat:' + stat, () => {
        return Equipment.aggregate(getEquippedItems(), stat);
    });
}

function getPlayerMaxHealth() {
    return CombatHealth.getMaxHealth(basePlayerMaxHealth + getSkillStat('health') + getGearStat('health'),
        getSkillMultiplier('healthMultiplier'), getGearStat('healthMultiplier'));
}

function getPlayerMaxFury() {
    return cachedCombatStat('getPlayerMaxFury', () => Math.max(0, Math.round((basePlayerMaxFury + getSkillStat('maxFury') + getGearStat('maxFury')) *
        getSkillMultiplier('maxFuryMultiplier') * getGearStat('maxFuryMultiplier'))));
}

function clearFury() {
    CombatBuffs.clearFury(state);
}

function clearPlayerCombatBuffs() {
    clearFury();clearGatheringPower();state.voidCharges=0;state.shieldStacks=0;
    emitCombatEvent('playerCombatBuffsCleared', {mapId:state.selectedMap});
}

function presentPlayerCombatBuffsCleared() {
    voidVolleyBuffProc=null;
    elements.playerHealthPanel.querySelector('.void-volley-player-glow')?.remove();
    renderCombatBuffs();
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
    return combatAbilities.normalizeShields();
}

function gainShields() {
    return combatAbilities.gainShields();
}

function gainShieldFromKill() {
    return combatAbilities.gainShieldFromKill();
}

function tryShieldSlam() {
    return combatAbilities.tryShieldSlam();
}

function normalizeFury() {
    CombatBuffs.normalizeFury(state, getPlayerMaxFury(), furyBuffSettings);
}

function gainFuryFromHit() {
    CombatBuffs.gainFuryFromHit(state, getPlayerMaxFury(), furyBuffSettings);
}

function tickFury(elapsed) {
    CombatBuffs.tickFury(state, elapsed, getPlayerMaxFury(), furyBuffSettings);
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
        updateCombatText(view.stacks, buff.stackLabel ?? formatBuffAmount(buff.stacks));
        updateCombatText(view.value, buff.value);
        updateCombatHidden(view.value, !buff.value);
        view.element.classList.toggle('is-proccing', buff.proccing === true);
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
    if (state.playerHp<=0) {renderBuffs([]);return;}
    normalizeFury();
    normalizeShields();
    normalizeVoidCharges();
    const buffs = [];
    const volleyProccing=voidVolleyBuffProc && voidVolleyBuffProc.mapId===state.selectedMap &&
        (getSkillNodeRank('voidBolt')>0 || getSkillNodeRank('voidVortex')>0) && performance.now()<voidVolleyBuffProc.until;
    if(state.voidCharges>0||volleyProccing){
        const node=skillNodeDefinition('voidBolt'),unlocked=getSkillNodeRank('voidVolley')>0;
        const shownCharges=volleyProccing?spellSettings.voidVolley.charges:state.voidCharges;
        buffs.push({id:'voidCharges',name:'Void Charge',sprite:SkillSprites.safePath(node?.sprite),icon:node?.icon||'◈',
            stacks:shownCharges,stackLabel:shownCharges+'/'+spellSettings.voidVolley.charges,value:'',proccing:Boolean(volleyProccing),
            description:volleyProccing?'Void Volley released.':state.voidCharges+' / 5 Void Charges. '+(unlocked?'At 5 charges, spend 10 mana to fire 10 Void Volley missiles.':'Unlock Void Volley to consume these charges.')+' Charges last until death or a map change.'});
    }
    if (state.shieldStacks > 0) {
        const node = skillNodeDefinition(getSkillNodeRank('shieldGenerator') > 0 ? 'shieldGenerator' : 'resonantGuard');
        buffs.push({id:'shields',name:'Shields',sprite:SkillSprites.safePath(node?.sprite),icon:'🛡',
            stacks:state.shieldStacks,value:'1 hit',
            description:state.shieldStacks + ' / ' + getPlayerMaxShields() + ' shields. Each shield blocks one enemy hit. Self-damage and health drain bypass shields.'});
    }
    if (state.furyStacks > 0) {
        const bonus = formatBuffAmount(state.furyStacks * furyDamagePerStack * 100) + '%';
        buffs.push({id:'fury',name:'Fury',sprite:SkillSprites.safePath(skillNodeDefinition('maxFury')?.sprite) || 'assets/ui/icon-sword.png',
            stacks:state.furyStacks,value:bonus,duration:state.furyRemaining,
            description:'+' + bonus + ' damage. ' + combatStatFormatter.format(state.furyRemaining) + 's until the next stack is lost. Hits add ' + furySecondsPerStack + ' seconds.'});
    }
    if (getGatheringPowerMultiplier()>1) {
        const power=state.gatheringPower;
        buffs.push({id:'gatheringPower',name:'Gathering Power',icon:'✦',stacks:power.stacks,
            value:'+'+formatBuffAmount(power.stacks*2)+'% dmg',duration:power.remaining,
            description:'+2% damage per stack. Gain one stack each second in combat, up to 50 stacks (+100% damage, double damage). All stacks expire after 1 second out of combat, on death, or when changing maps.'});
    }
    const righteousFireNode = getRighteousFireNode();
    if (righteousFireNode && state.playerHp > 0 && !state.combatPaused) {
        const targets = state.monsterStates.filter(monster => monster.hp > 0).length;
        const excess = getRighteousFireRegeneration(gameTickSeconds).excess;
        const fireSettings = getRighteousFireSettings();
        const damage = targets ? excess / gameTickSeconds / targets * fireSettings.damageMultiplier : 0;
        buffs.push({id:'fireOfTheRighteous',name:'Fire of the Righteous',
            sprite:SkillSprites.safePath(righteousFireNode.sprite),icon:righteousFireNode.icon,
            stacks:1,value:formatBuffAmount(damage) + '/s',
            description:combatStatFormatter.format(damage) + ' burning damage per second per enemy.\n' + (fireSettings.description || SkillDescriptions.describe(righteousFireNode))});
    }
    renderBuffs(buffs);
    updateCombatText(elements.damage, formatAmount(getDamage()));
    renderDetailedStats();
}

function showVoidVolleyBuffProc() {
    emitCombatEvent('voidVolleyBuffProc', {mapId:state.selectedMap,epoch:voidMissilePresentationEpoch});
}

function presentVoidVolleyBuffProc({mapId}) {
    if (!combatEffectEnabled('glows') || !combatEffectEnabled('abilities')) return;
    if(!isCombatView()||state.selectedMap!==mapId||state.playerHp<=0)return;
    const proc={mapId,until:performance.now()+650};
    voidVolleyBuffProc=proc;
    // Keep its slot until the release finishes, including when the fifth
    // charge was gained and consumed before the next combat render.
    renderCombatBuffs();
    const element=combatBuffViews.get('voidCharges')?.element;
    if(!element)return;
    const finish=event=>{
        if(event&&event.target!==element)return;
        element.removeEventListener('animationend',finish);
        if(voidVolleyBuffProc!==proc)return;
        voidVolleyBuffProc=null;
        renderCombatBuffs();
    };
    element.addEventListener('animationend',finish);
    window.setTimeout(finish,700);
    restartCombatAnimation(element,'is-proccing');
}

function getPlayerHealthRegen() {
    const flat = getSkillStat('healthRegen') + getGearStat('healthRegen');
    const maximumHealthRate = getSkillStat('healthRegenPercent') + getGearStat('healthRegenPercent');
    const increase = getSkillStat('healthRegenIncrease') + getGearStat('healthRegenIncrease');
    return CombatHealth.getHealthRegeneration(getPlayerMaxHealth(), flat, maximumHealthRate, increase);
}

function hasFireOfTheRighteous() {
    return Boolean(getRighteousFireNode());
}

function getRighteousFireNode() {
    for (const id of righteousFireNodeIds) {
        if (skillNodeDefinition(id) && getSkillNodeRank(id) > 0) return skillNodeDefinition(id);
    }
    return null;
}

function getRighteousFireSettings() {
    return cachedCombatStat('getRighteousFireSettings', () => {
        const unique = getEquippedItems().map(Equipment.uniqueEffect).find(effect => effect?.righteousFire);
        return unique ? {...righteousFireSettings, ...unique.righteousFire, description:unique.description} : righteousFireSettings;
    });
}

function getRighteousFireRegeneration(elapsed) {
    const maxHealth = getPlayerMaxHealth(), regeneration = getPlayerHealthRegen();
    return CombatHealth.getRighteousFireRegeneration(state, elapsed, maxHealth, regeneration, getRighteousFireSettings());
}

function applyPlayerHealing(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const maxHealth = getPlayerMaxHealth();
    const healingCap = hasFireOfTheRighteous() ? getRighteousFireSettings().regenHealthCap : 1;
    return CombatHealth.applyPlayerHealing(state, amount, maxHealth, healingCap);
}

function tickPlayerRegeneration(elapsed) {
    return combatAbilities.tickPlayerRegeneration(elapsed);
}

function presentRighteousFireHit({targetIds,duration}) {
    const until=performance.now()+duration;
    targetIds.forEach(id=>{
        const monster=getCombatEffectMonster(id);
        if(monster?.hp>0)righteousFireHitUntil.set(monster,until);
    });
}

function getSkillMultiplier(stat) {
    const cache = getSkillBonusCache();
    if (!cache.multipliers.has(stat)) {
        cache.multipliers.set(stat, Object.entries(state.skillRanks).reduce((total, [id, rank]) => {
            const node = skillNodeById[id];
            if (!node || !rank) return total;
            if (stat === 'attackSpeedMultiplier' && node.stats.attackSpeedPerLevel) {
                total *= Math.pow(1 + node.stats.attackSpeedPerLevel, state.level * rank);
            }
            return total * Math.pow(node.stats[stat] || 1, rank);
        }, 1) * (Equipment.stats[stat]?.mode === 'multiply' ? MasterySystem.bonus(worldContent,currentMap(),state,stat) : 1));
    }
    return cache.multipliers.get(stat);
}

function getDamage() {
    return CombatHealth.getPhysicalDamage(2 + state.upgrades.strength * 2 + getGearStat('damage') + getSkillStat('damage'),
        getSkillMultiplier('damageMultiplier'), getGearStat('damageMultiplier'), state.furyStacks, furyDamagePerStack);
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
        {id:'spellDamage',name:'Spell damage',total:number(getSpellDamage()*getGatheringPowerMultiplier()),rows:[
            ['Flat spell damage',number(flat('spellDamage'))],['Spell damage multiplier',multiplier(combinedMultiplier('spellDamageMultiplier'))],
            ['Fury damage bonus',percent(state.furyStacks*furyDamagePerStack)],['Gathering Power',multiplier(getGatheringPowerMultiplier())]]},
        {id:'mana',name:'Maximum mana',total:formatAmount(getPlayerMaxMana()),rows:[
            ['Flat mana',number(flat('mana'))],['Maximum mana multiplier',multiplier(combinedMultiplier('manaMultiplier'))]]},
        {id:'manaRegen',name:'Mana regeneration',total:number(getPlayerManaRegen())+' mana/s',rows:[
            ['Flat mana regen',number(flat('manaRegen'))],['Maximum mana regen',percent(flat('manaRegenPercent'))+'/s'],
            ['Increased mana regen',percent(flat('manaRegenIncrease'))]]},
        {id:'damage', name:'Physical damage', total:formatAmount(getDamage()*getGatheringPowerMultiplier()), rows:[
            ['Flat physical damage', number(2 + state.upgrades.strength * 2 + flat('damage'))],
            ['Physical damage multiplier', multiplier(combinedMultiplier('damageMultiplier'))],
            ['Fury damage bonus', percent(state.furyStacks * furyDamagePerStack)],
            ['Gathering Power',multiplier(getGatheringPowerMultiplier())]
        ]},
        {id:'bowDamage', name:'Bow attack damage', total:formatAmount(getDamage()*getBowDamageMultiplier()*getGatheringPowerMultiplier()), rows:[
            ['Physical damage', formatAmount(getDamage()*getGatheringPowerMultiplier())],
            ['Increased damage from skill tree', signedPercent(getSkillStat('bowDamageIncrease'))],
            ['Increased damage from equipment', signedPercent(getGearStat('bowDamageIncrease'))],
            ['Piercing Arrow damage', formatAmount(getDamage()*2*getBowDamageMultiplier()*getGatheringPowerMultiplier())]
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
            ['Regen healing limit', hasFireOfTheRighteous() ? (getRighteousFireSettings().regenHealthCap * 100) + '% HP' : '100% HP']
        ]},
        {id:'poisonChance', name:'Poison chance', total:percent(getPoisonChance()), rows:[
            ['Flat poison chance', percent(flat('poisonChance'))],
            ['Chance multiplier', multiplier(combinedMultiplier('poisonChanceMultiplier'))]
        ]},
        {id:'poisonDamage', name:'Poison damage per tick', total:formatAmount(getPoisonDamage()*getGatheringPowerMultiplier()), rows:[
            ['Flat poison damage', number(poisonDamageType.baseDamage + flat('poisonDamage'))],
            ['Poison damage multiplier', multiplier(combinedMultiplier('poisonDamageMultiplier'))],
            ['Gathering Power',multiplier(getGatheringPowerMultiplier())]
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
        {id:'bleedDamage', name:'Bleed from a normal hit', total:number(getBleedDamage()*getGatheringPowerMultiplier()) + ' / tick', rows:[
            ['Triggering hit damage', number(getDamage())],
            ['Damage taken from hit', percent(getBleedHitDamageRatio())],
            ['Flat bonus per stack', number(flat('bleedDamage'))],
            ['Bleed damage multiplier', multiplier(combinedMultiplier('bleedDamageMultiplier'))],
            ['Gathering Power',multiplier(getGatheringPowerMultiplier())],
            ['Maximum stacks', hasDeepWounds() ? number(getBleedMaximumStacks()) : 'Unlimited'],
            ['Stacks per successful application', number(getBleedStacksPerApplication())]
        ]},
        {id:'bleedTickRate', name:'Bleed tick speed', total:number(1 / getBleedTickInterval()) + ' ticks/s', rows:[
            ['Tick speed bonus', percent(flat('bleedTickRate'))],
            ['Tick speed multiplier', multiplier(combinedMultiplier('bleedTickRateMultiplier'))],
            ['Tick interval', number(getBleedTickInterval()) + 's'],
            ['Time per successful application', number(bleedDamageType.secondsPerApplication * getBleedStacksPerApplication()) + 's'],
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

function getSkillPointCap(profile = state) {
    return Progression.skillPointCap(profile, worldData);
}

function getEarnedSkillPoints(profile = state) {
    return Progression.earnedSkillPoints(profile, worldData);
}

function syncSkillPoints() {
    const spent = Object.values(state.skillRanks).reduce((sum, rank) => sum + rank, 0);
    state.skillPoints = Math.max(0, getEarnedSkillPoints() - spent);
}

function getExperienceMultiplier(level = state.level, map = currentMap()) {
    return Progression.experienceMultiplier(level, worldData.findIndex(world => world.mapIds.includes(map.id)));
}

function worldIsUnlocked(index) {
    if (!worldData[index]) return false;
    if (window.DeveloperTools?.allows('travel',state)) return true;
    if (state.unlockedWorldIds.includes(worldData[index].id)) return true;
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
    if (window.DeveloperTools?.allows('travel',state)) return true;
    if (state.unlockedMapIds.includes(maps[index].id)) return true;
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
    materialLocationSources.set(location,source);
    updateMaterialLocation(location,source);
    return location;
}

function updateMaterialLocation(location,source) {
    const access = mapTravelAccess(source.mapId);
    location.dataset.materialMap = source.mapId || '';
    updateCombatText(location, source.location + (access.unlocked ? '' : ' · Locked'));
    if(location.disabled===access.unlocked)location.disabled=!access.unlocked;
    const title=access.unlocked ? 'Travel to ' + source.location + ' · ' + access.world.name : access.reason;
    if(location.title!==title)location.title=title;
    updateCombatAttribute(location,'aria-label',access.unlocked ? title : source.location + '. Locked. ' + access.reason);
}

function refreshMaterialLocations(container) {
    const signature=JSON.stringify([state.developerTravelEnabled,mapData.map(map=>mapTravelAccess(map.id).unlocked)]);
    if(materialLocationSignatures.get(container)===signature)return;
    materialLocationSignatures.set(container,signature);
    container.querySelectorAll('[data-material-map]').forEach(location=>{const source=materialLocationSources.get(location);if(source)updateMaterialLocation(location,source);});
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
    state.mapListExpanded = state.mapListLocked;
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
    if(!state.mapListLocked)window.scrollTo(0, 0);
    if (changedMap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (combatEffectEnabled()) elements.combatPanel.animate([{opacity: .72, transform: 'translateY(6px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 260, easing: 'ease-out'});
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
        ...preservedSaveFields,
        ...SaveCompatibility.unlocks(state,saveCompatibilityContext()),
        version: SaveCompatibility.version,
        profileEnvironment: window.DeveloperTools?.environment || 'playtest',
        contentMigrationVersion: SaveCompatibility.contentMigrations.at(-1).version,
        lastSimulatedAt,
        offlineRecap: pendingOfflineRecap,
        attackTimer: state.attackTimer,
        gold: state.gold,
        kills: state.kills,
        materials: state.materials,
        upgrades: state.upgrades,
        level: state.level,
        experience: state.experience,
        experienceRemainder: state.experienceRemainder,
        skillPoints: state.skillPoints,
        skillRanks: state.skillRanks,
        mapMastery: state.mapMastery,
        defeatedBossWorldIds: state.defeatedBossWorldIds,
        skillPointRecoveryRanks: state.skillPointRecoveryRanks,
        skillPointTrimPending: state.skillPointTrimPending,
        gear: state.gear,
        ownedItemIds: state.ownedItemIds,
        developerItemsEnabled: window.DeveloperTools?.allows('equipment',state) === true,
        developerTravelEnabled: window.DeveloperTools?.allows('travel',state) === true,
        crafted: state.crafted,
        itemCrafts: state.itemCrafts,
        itemRollSaves: state.itemRollSaves,
        townProgress: TownProgression.clone(state.townProgress),
        tutorials: state.tutorials,
        selectedWorld: state.selectedWorld,
        lastMapByWorld: state.lastMapByWorld,
        selectedMap: state.selectedMap,
        mapListLocked: state.mapListLocked,
        currentView: state.currentView,
        enemyHp: state.enemyHp,
        enemyRespawnRemaining: state.enemyRespawnRemaining,
        monsterStates: state.monsterStates,
        pendingEruptions: state.pendingEruptions,
        pendingVoidMissiles: state.pendingVoidMissiles,
        monsterColumns: state.monsterColumns,
        targetMonsterId: state.targetMonsterId,
        playerHp: state.playerHp,
        playerMana: state.playerMana,
        voidCharges: state.voidCharges,
        gatheringPower: {...state.gatheringPower},
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
    if (simulatingCombat || SaveCompatibility.protection.blocked) return;
    try {
        localStorage.setItem(saveKey, JSON.stringify(createGameSave()));
        lastSave = Date.now();
    } catch (error) {
        console.error('Could not save Idle Adventure progress.', error);
    }
}

// Parse and migrate without changing live progress or browser storage.
function parseGameSave(rawSave) {
    const saved = JSON.parse(rawSave.replace(/^\uFEFF/,''));
    if (!saved || typeof saved !== 'object' || Array.isArray(saved) ||
        ![1, 2, 3, SaveCompatibility.version].includes(saved.version)) {
        throw new Error('Save data has an invalid or unsupported format.');
    }
    SaveCompatibility.assertCollections(saved);
    if(saved.profileEnvironment==='development'&&!window.DeveloperTools)throw new Error('Development profiles must be opened in a development build.');
    if(saved.profileEnvironment!==undefined&&!['development','playtest'].includes(saved.profileEnvironment))throw new Error('Invalid profile environment.');
    Progression.assertSave(saved);
    if (['level', 'experience', 'skillPoints'].some(key => saved[key] !== undefined &&
        (!Number.isSafeInteger(saved[key]) || saved[key] < 0))) {
        throw new Error('Save data has invalid experience or skill points.');
    }
    if (saved && saved.developerTravelEnabled === undefined) saved.developerTravelEnabled = false;
    if (saved && saved.developerItemsEnabled === undefined) saved.developerItemsEnabled = false;
    if (saved.mapListLocked === undefined) saved.mapListLocked = false;
    if(typeof saved.developerItemsEnabled!=='boolean'||typeof saved.developerTravelEnabled!=='boolean')throw new Error('Invalid developer preferences.');
    // Ignore legacy/imported preferences when the optional capability is absent.
    saved.profileEnvironment=window.DeveloperTools?.environment||'playtest';
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
    if (saved && saved.skillPoints === undefined) saved.skillPoints = saved.level - Object.values(saved.skillRanks || Object.fromEntries((saved.skillNodes || []).map(id=>[id,1]))).reduce((sum,rank)=>sum+rank,0);
    if (saved && Number.isInteger(saved.level) && Number.isInteger(saved.experience) &&
        Number.isInteger(saved.skillPoints)) {
        const previousLevel = saved.level;
        const fullLevelBudget = saved.skillPoints + Object.values(saved.skillRanks || Object.fromEntries((saved.skillNodes || []).map(id => [id,1]))).reduce((sum,rank) => sum + rank,0) === saved.level;
        while (saved.experience >= experienceForNextLevel(saved.level)) {
            saved.experience -= experienceForNextLevel(saved.level);
            saved.level++;
            if (fullLevelBudget || saved.level <= getSkillPointCap(saved)) saved.skillPoints++;
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
    }
    if (saved.tutorials && typeof saved.tutorials === 'object' && !Array.isArray(saved.tutorials)) saved.tutorials = {...createTutorialState(),...saved.tutorials};
    if (saved.upgrades && typeof saved.upgrades === 'object' && !Array.isArray(saved.upgrades)) legacyUpgradeIds.forEach(id=>{if(saved.upgrades[id]===undefined)saved.upgrades[id]=0;});
    if (saved.itemCrafts === undefined) saved.itemCrafts = {};
    ItemCrafting.validateSave(saved.itemCrafts);
    if (saved.itemRollSaves === undefined) saved.itemRollSaves = {};
    ItemCrafting.validateSave(saved.itemRollSaves);
    saved.townProgress=TownProgression.normalize(saved.townProgress,saved.townUnlocks);delete saved.townUnlocks;
    // Retire the Town prototype without carrying its temporary encounter onto a map.
    const retiredTownView=saved.currentView==='settlement';
    const retiredTownBattle=saved.settlement?.battle?.active===true||
        Array.isArray(saved.monsterStates)&&saved.monsterStates.some(monster=>/^town_wave\d+_enemy/.test(monster?.id))||
        typeof saved.targetMonsterId==='string'&&/^town_wave\d+_enemy/.test(saved.targetMonsterId);
    delete saved.settlement;
    if(retiredTownView||retiredTownBattle){saved.currentView='map';saved.isInTown=false;saved.combatPaused=true;}
    SaveCompatibility.migrate(saved,saveCompatibilityContext());
    if(!window.DeveloperTools){saved.developerItemsEnabled=false;saved.developerTravelEnabled=false;}
    if(retiredTownBattle){
        saved.enemyHp=mapData.find(map=>map.id===saved.selectedMap).health;saved.enemyRespawnRemaining=0;
        saved.monsterStates=[];saved.pendingEruptions=[];saved.pendingVoidMissiles=[];saved.targetMonsterId=null;saved.attackTimer=0;
        saved.voidCharges=0;saved.gatheringPower={stacks:0,progress:0,remaining:0};
        saved.furyStacks=0;saved.furyRemaining=0;saved.furyDecaying=false;saved.shieldStacks=0;
    }
    MasterySystem.normalizeProfile(saved,worldContent);
    normalizeElementalSaveTimers(saved);
    if (
        saved === null ||
        saved.version !== SaveCompatibility.version ||
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
        typeof saved.mapListLocked !== 'boolean' ||
        !saved.tutorials || typeof saved.tutorials !== 'object' ||
        Array.isArray(saved.tutorials) ||
        typeof saved.tutorials.firstSkillPointPending !== 'boolean' ||
        typeof saved.tutorials.skillPointCapPending !== 'boolean' ||
        typeof saved.tutorials.skillPointCapDismissed !== 'boolean' ||
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
        (saved.currentView !== undefined && !['map', 'town', 'townPage', 'upgrades', 'inventory'].includes(saved.currentView)) ||
        !Number.isFinite(saved.enemyHp) || saved.enemyHp < 0 ||
        (saved.enemyHp === 0 && !(Number.isFinite(saved.enemyRespawnRemaining) &&
            saved.enemyRespawnRemaining > 0)) ||
        (saved.enemyRespawnRemaining !== undefined &&
            (!Number.isFinite(saved.enemyRespawnRemaining) || saved.enemyRespawnRemaining < 0)) ||
        (saved.monsterColumns !== undefined && (!Number.isInteger(saved.monsterColumns) || saved.monsterColumns < 1 || saved.monsterColumns > 100)) ||
        (saved.furyStacks !== undefined && (!Number.isSafeInteger(saved.furyStacks) || saved.furyStacks < 0)) ||
        (saved.furyRemaining !== undefined && (!Number.isFinite(saved.furyRemaining) || saved.furyRemaining < 0)) ||
        !isValidGatheringPower(saved.gatheringPower) ||
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
                isValidBrandState(monster.rimeBrand) && isValidBrandState(monster.emberBrand) &&
                (monster.scorched===undefined || typeof monster.scorched==='boolean') &&
                (monster.poisonStacks === undefined || Array.isArray(monster.poisonStacks) &&
                    monster.poisonStacks.every(stack => stack &&
                        Number.isFinite(stack.remainingDuration) && stack.remainingDuration > 0 &&
                        stack.remainingDuration <= 60 && Number.isFinite(stack.timeUntilTick) &&
                        stack.timeUntilTick > 0 && stack.timeUntilTick <= 10))))) ||
        (saved.targetMonsterId !== undefined && saved.targetMonsterId !== null && typeof saved.targetMonsterId !== 'string') ||
        (saved.playerHp !== undefined && (!Number.isFinite(saved.playerHp) || saved.playerHp < 0)) ||
        (saved.playerMana !== undefined && (!Number.isFinite(saved.playerMana) || saved.playerMana < 0)) ||
        (!Number.isSafeInteger(saved.voidCharges) || saved.voidCharges<0 || saved.voidCharges>spellSettings.voidVolley.charges) ||
        (saved.combatPaused !== undefined && typeof saved.combatPaused !== 'boolean') ||
        (!Array.isArray(saved.pendingVoidMissiles) || !saved.pendingVoidMissiles.every(hit => hit &&
            typeof hit.targetId === 'string' && Number.isFinite(hit.damage) && hit.damage > 0 &&
            Number.isFinite(hit.remaining) && hit.remaining > 0)) ||
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
        ![saved.level, getEarnedSkillPoints(saved)].includes(saved.skillPoints + Object.values(saved.skillRanks).reduce((total, rank) => total + rank, 0)) ||
        !gearSlots.every(slot => saved.gear[slot] === null || (
            ownsItem(saved.gear[slot], saved) && itemById[saved.gear[slot]].slot === slot
        ))
    ) {
        throw new Error('Save data has an invalid format.');
    }

    if(saved.playerMana===undefined)saved.playerMana=getProfileMaxMana(saved);
    Progression.normalizeSave(saved, worldData);
    return saved;
}

function applyGameSave(saved) {
    resetVoidMissilePresentation();
    window.ItemCrafting?.stopAuto();
    window.SkillBuilds?.cancelEditing(false);
    voidVolleyBuffProc=null;
    elements.playerHealthPanel.querySelector('.void-volley-player-glow')?.remove();
    preservedSaveFields = JSON.parse(JSON.stringify(saved));
    delete preservedSaveFields.settlement;
    state.gold = saved.gold;
    state.kills = saved.kills;
    state.materials = saved.materials;
    state.upgrades = saved.upgrades;
    state.level = saved.level;
    state.experience = saved.experience;
    state.experienceRemainder = saved.experienceRemainder;
    state.skillPoints = saved.skillPoints;
    state.skillRanks = saved.skillRanks;
    state.mapMastery = saved.mapMastery || {};
    state.defeatedBossWorldIds = saved.defeatedBossWorldIds;
    state.skillPointRecoveryRanks = saved.skillPointRecoveryRanks;
    state.skillPointTrimPending = saved.skillPointTrimPending;
    state.unlockedMapIds = saved.unlockedMapIds || [];
    state.unlockedWorldIds = saved.unlockedWorldIds || [];
    state.gear = saved.gear;
    state.ownedItemIds = saved.ownedItemIds;
    state.developerItemsEnabled = saved.developerItemsEnabled;
    state.developerTravelEnabled = saved.developerTravelEnabled;
    state.mapListLocked = saved.mapListLocked;
    if(state.mapListLocked)state.mapListExpanded=true;
    state.crafted = saved.crafted;
    state.itemCrafts = saved.itemCrafts;
    state.itemRollSaves = saved.itemRollSaves;
    state.townProgress = TownProgression.normalize(saved.townProgress);
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
    state.pendingVoidMissiles = selectedMapChanged ? [] : saved.pendingVoidMissiles
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
    state.manaCapacity=getPlayerMaxMana();
    state.playerMana=saved.playerMana === undefined ? state.manaCapacity : Math.min(saved.playerMana,state.manaCapacity);
    state.voidCharges=saved.voidCharges;normalizeVoidCharges();
    state.gatheringPower=saved.gatheringPower ? {...saved.gatheringPower} : {stacks:0,progress:0,remaining:0};
    state.furyStacks = saved.furyStacks || 0;
    state.furyRemaining = saved.furyRemaining || 0;
    state.furyDecaying = saved.furyDecaying === true;
    normalizeFury();
    state.shieldStacks = saved.shieldStacks || 0;
    normalizeShields();
    if (state.playerHp<=0 || selectedMapChanged) clearPlayerCombatBuffs();
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
    if (state.skillPointTrimPending) {
        clearPlayerCombatBuffs();
        window.SkillBuilds?.recoverBuild();
    }
}

function loadGame() {
    let rawSave;
    try {
        rawSave = localStorage.getItem(saveKey);
        if (rawSave === null) return false;
        const saved = parseGameSave(rawSave);
        const migrated = JSON.stringify(saved);
        const changed = JSON.stringify(JSON.parse(rawSave.replace(/^\uFEFF/,''))) !== migrated;
        if (changed) SaveCompatibility.backup(rawSave,'Before automatic save migration');
        const previous = createGameSave();
        try {
            applyGameSave(saved);
            if (changed) localStorage.setItem(saveKey,migrated);
        } catch (error) {
            applyGameSave(previous);
            throw error;
        }
        clearSaveRecovery();
        const report = SaveCompatibility.report(saved);
        if (report?.refundedPoints || report?.unavailableItems.length) {
            const status = document.getElementById('profileStatus');
            status.textContent = 'Save updated.'+(report.refundedPoints?' Refunded '+report.refundedPoints+' skill points after tree changes.':'')+
                (report.unavailableItems.length?' '+report.unavailableItems.length+' unavailable items are preserved for returning content.':'')+' Original saves are available in Backups.';
            status.classList.remove('is-error');status.hidden = false;
        }
        return true;
    } catch (error) {
        console.error('Could not load Idle Adventure progress.', error);
        try { SaveCompatibility.backup(rawSave,'Original save that could not be loaded'); } catch { /* The primary save remains protected even when storage is unavailable. */ }
        showSaveRecovery(rawSave,error);
        return false;
    }
}

function showSaveRecovery(raw,error) {
    Object.assign(SaveCompatibility.protection,{blocked:true,raw:typeof raw==='string'?raw:null,error});
    if (combatContinuation !== null) window.clearTimeout(combatContinuation);
    combatContinuation = null;
    const dialog = document.getElementById('saveRecovery');
    const reason = ['QuotaExceededError','SecurityError'].includes(error.name)
        ? 'Your browser could not store a recovery backup. Download the original save, then free storage or allow browser storage and retry.'
        : ['SyntaxError','TypeError'].includes(error.name) ? 'The saved profile is incomplete or unreadable.' : error.message;
    document.getElementById('saveRecoveryMessage').textContent = 'Your save could not be loaded. The original is protected and automatic saving is paused. '+reason;
    document.getElementById('downloadProtectedSave').disabled = typeof raw !== 'string';
    if (!dialog.open) dialog.showModal();
}

function clearSaveRecovery() {
    Object.assign(SaveCompatibility.protection,{blocked:false,raw:null,error:null});
    document.getElementById('saveRecovery').close();
}

function restoreImportedProfile(saved, originalInput) {
    const previousRaw=localStorage.getItem(saveKey),previous=createGameSave();
    try {
        SaveCompatibility.backup(originalInput,'Original imported profile');
        SaveCompatibility.backup(previousRaw,'Before profile import');
        if (!SaveCompatibility.protection.blocked) SaveCompatibility.backup(JSON.stringify(previous),'Latest progress before profile import');
        localStorage.setItem(saveKey,JSON.stringify(saved));
    } catch {
        throw new Error('Your browser could not store the imported profile or its recovery backup.');
    }
    try {
        applyGameSave(saved);
    } catch (error) {
        try {
            if (previousRaw === null) localStorage.removeItem(saveKey); else localStorage.setItem(saveKey,previousRaw);
            applyGameSave(previous);
        } catch (rollbackError) {showSaveRecovery(previousRaw,rollbackError);}
        throw error;
    }
    clearSaveRecovery();
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
    if(state.mapListLocked)state.mapListExpanded=true;
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
    updateCombatAttribute(elements.mapSelectorLock,'aria-pressed',String(state.mapListLocked));
    elements.mapSelectorLock.title=state.mapListLocked?'Unlock map selector to allow collapsing':'Lock map selector open';
    elements.mapSelectionHint.textContent = state.mapListLocked?'Map selector locked open.':state.mapListExpanded
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
            (state.selectedMap === map.id ? '. Current map.' + (state.mapListLocked?'':' Click to ' +
                (state.mapListExpanded ? 'collapse' : 'show all maps') + '.') : '.'));
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
            const pointOverlay=document.createElement('div');pointOverlay.id='skillTreePointOverlay';
            pointOverlay.className='skill-tree-point-overlay';
            pointOverlay.append(skillPointsBar.querySelector('#skillPointsDisplay'));
            const budgetWarning=document.createElement('p');budgetWarning.id='skillBuildBudgetWarning';budgetWarning.hidden=true;budgetWarning.setAttribute('role','status');
            pointOverlay.append(budgetWarning);viewport.append(pointOverlay);
            const positionPoints=()=>{pointOverlay.style.top=(skillPointsBar.offsetTop+skillPointsBar.offsetHeight+8)+'px';};
            if(typeof ResizeObserver==='function')new ResizeObserver(positionPoints).observe(skillPointsBar);
            positionPoints();
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

    updateSkillTreeTransform(board.parentElement, board);

    // Update the skill points display bar
    const skillPointsDisplay = document.querySelector('#skillPointsDisplay');
    const pendingPointCount = getPendingSkillPointCount();
    const editingBuild=Boolean(window.SkillBuilds?.isEditing());
    const plannedRanks = getPlannedSkillRanks();
    const committedPoints = Object.values(state.skillRanks).reduce((total, rank) => total + rank, 0);
    const spentPointsDisplay = document.querySelector('#skillPointsTotalDisplay');
    if (spentPointsDisplay) {
        spentPointsDisplay.textContent = 'Spent points: ' + committedPoints;
        spentPointsDisplay.title = 'Confirmed points spent in your active skill tree. Unspent points are shown below.';
    }
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
    if(confirmButton)confirmButton.textContent='Confirm';
    if(clearButton)clearButton.textContent='Clear';
    if(refundButton)refundButton.disabled=editingBuild;

    skillNodes.forEach(node => {
        const committedRank = editingBuild?0:getSkillNodeRank(node.id);
        const rank = plannedRanks[node.id] || 0;
        const allocatedForPlan = id => Boolean(skillNodeById[id] && skillNodeById[id].start) ||
            (plannedRanks[id] || 0) > 0;
        const available = node.start || skillNodeRequirementsMet(node, allocatedForPlan);
        const canAllocate = !node.start && available && rank < node.maxRank && (editingBuild || pendingPointCount < state.skillPoints);
        const canDeselect = !node.start && canDeselectPendingSkillNode(node.id);
        const button = board.querySelector('[data-skill-node="' + node.id + '"]');
        updateSkillTreeNodeSize(button, node);
        button.className = 'skill-node' +
            (node.start ? ' is-origin is-allocated' : '') +
            (['health', 'attackSpeed', 'accuracy', 'damage','mana'].includes(node.type) ? ' is-base-' + node.type : '') +
            (committedRank > 0 && !node.start ? ' is-allocated' : '') +
            (refundMode && committedRank > 0 ? ' is-refundable' : '') +
            (rank > committedRank && !node.start ? ' is-pending' : '') +
            (!node.start && !available && rank === 0 ? ' is-locked' : '') +
            (canAllocate ? ' is-available' : '') +
            (!editingBuild && !node.start && available && pendingPointCount >= state.skillPoints && rank < node.maxRank ? ' needs-point' : '');
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
                    canAllocate ? 'Click to select' :
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
        link.classList.toggle('is-active', !editingBuild&&skillNodeIsAllocated(sourceId) && skillNodeIsAllocated(targetId));
        link.classList.toggle('is-pending', isPlanned(sourceId) && isPlanned(targetId) &&
            (editingBuild||Boolean(pendingSkillRanks[sourceId] || pendingSkillRanks[targetId])));
        link.classList.toggle('tutorial-skill-link',
            state.tutorials.firstSkillPointPending &&
            state.skillPoints > 0 &&
            pendingPointCount === 0 &&
            link.dataset.skillNodeSource === 'origin');
    });
    window.SkillBuilds?.updateEditingUi();
}

function recipeIsUnlocked(recipe) {
    return Object.keys(recipe.materials).every(id =>
        (materialSources[id] || []).some(source => mapTravelAccess(source.mapId).unlocked));
}

function renderCrafting() {
    ItemCrafting.render();
    if (ItemCrafting.mode() !== 'recipes') return;
    const unlockedRecipes = recipes.filter(recipe => (!recipe.developerOnly || ownsItem(recipe.id)) && recipeIsUnlocked(recipe));
    const unlockedIds = new Set(unlockedRecipes.map(recipe => recipe.id));
    const canCraftRecipe = recipe => !ownsItem(recipe.id) && !recipe.developerOnly && GameResources.canSpend(state,recipe.materials);
    const craftedCount = unlockedRecipes.filter(recipe => state.crafted.includes(recipe.id)).length;
    const craftableCount = unlockedRecipes.filter(canCraftRecipe).length;
    updateCombatText(elements.craftingSummary, craftableCount + ' ready to craft · ' + craftedCount + ' of ' + unlockedRecipes.length + ' unlocked recipes crafted');
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
    const visibleIds=new Set(), visibleCategories=new Set();
    craftingCategories.forEach(categoryGroup => {
        const categoryRecipes = categoryGroup.recipes
            .map(id => recipes.find(recipe => recipe.id === id))
            .filter(recipe => recipe && unlockedIds.has(recipe.id))
            .filter(recipe => selectedCraftCategory === 'all' || (recipeCategories[recipe.slot] || 'accessories') === selectedCraftCategory)
            .filter(recipe => showCraftedRecipes || !state.crafted.includes(recipe.id) || !ownsItem(recipe.id))
            .filter(recipe => !showCraftableRecipesOnly || canCraftRecipe(recipe));
        if (!categoryRecipes.length) return;
        visibleRecipeCount += categoryRecipes.length;
        visibleCategories.add(categoryGroup.id);

        let categoryView=recipeCategoryViews.get(categoryGroup.id);
        if(!categoryView){
        const section = document.createElement('section');
        section.className = 'crafting-category-section';
        section.dataset.craftingCategory = categoryGroup.id;
        const heading = document.createElement('div');
        heading.className = 'crafting-category-heading';
        const title = document.createElement('h3');
        title.textContent = categoryGroup.title;
        const progress = document.createElement('span');
        progress.className = 'crafting-category-progress';
        heading.append(title, progress);
        const cards = document.createElement('div');
        cards.className = 'crafting-category-cards';
        section.append(heading,cards);categoryView={section,cards,progress};recipeCategoryViews.set(categoryGroup.id,categoryView);
        }
        const {section,cards,progress}=categoryView;
        const ready=categoryRecipes.filter(canCraftRecipe).length;
        updateCombatText(progress,ready+' ready · '+categoryRecipes.length+' shown');

        categoryRecipes.forEach((recipe,index) => {
            visibleIds.add(recipe.id);
            const crafted = state.crafted.includes(recipe.id)&&ownsItem(recipe.id);
            const canCraft = canCraftRecipe(recipe);
            const category = recipeCategories[recipe.slot] || 'accessories';
            const structure=JSON.stringify([recipe.name,recipe.slot,recipe.sprite,recipe.rarity,recipe.description,Object.entries(recipe.materials).map(([id,amount])=>[id,amount,materialNames[id],itemData.materialDetails?.[id],materialSources[id]])]);
            let view=recipeViews.get(recipe.id);
            if(view?.structure!==structure){view?.element.remove();view=null;}
            if(!view){
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
            cardHeading.append(EquipmentSpritePreview.createIcon(recipe, equipmentSlots.find(slot => slot.id === recipe.slot)?.icon), name, slotTag);

            const effect = document.createElement('p');
            effect.className = 'craft-card-effect';
            effect.textContent = recipe.crafting ? ItemCrafting.describe(recipe) : recipe.effect;
            const description = document.createElement('p');
            description.className = 'craft-card-description';
            description.textContent = recipe.description;

            const materials = document.createElement('ul');
            materials.className = 'craft-materials';
            const requirements=[];
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
                requirements.push({id,amount,element:requirement,quantity});
                materials.appendChild(requirement);
            });

            const button = document.createElement('button');
            button.className = 'action-button craft-action';
            button.type = 'button';
            button.dataset.craft = recipe.id;
            button.disabled = !canCraft || crafted;
            button.textContent = crafted ? 'Already crafted' : ownsItem(recipe.id) ? 'Already owned' : canCraft ? 'Craft item' : 'Missing materials';

            item.append(cardHeading, effect, description, materials, button);
            view={element:item,button,effect,requirements,structure};recipeViews.set(recipe.id,view);
            }
            view.element.classList.toggle('is-crafted',crafted);view.element.classList.toggle('is-craftable',canCraft&&!crafted);
            const disabled=!canCraft||crafted;if(view.button.disabled!==disabled)view.button.disabled=disabled;
            updateCombatText(view.button,crafted?'Already crafted':ownsItem(recipe.id)?'Already owned':canCraft?'Craft item':'Missing materials');
            updateCombatText(view.effect,recipe.crafting?ItemCrafting.describe(recipe):recipe.effect);
            view.requirements.forEach(({id,amount,element,quantity})=>{
                const enough=GameResources.canSpend(state,{[id]:amount});element.classList.toggle('has-enough',enough);element.classList.toggle('needs-more',!enough);
                updateCombatText(quantity,formatAmount(state.materials[id])+' / '+formatAmount(amount));
            });
            if(cards.children[index]!==view.element)cards.insertBefore(view.element,cards.children[index]||null);
        });

        const index=visibleCategories.size-1;
        if(elements.crafts.children[index]!==section)elements.crafts.insertBefore(section,elements.crafts.children[index]||null);
    });
    for(const [id,view] of recipeViews)if(!visibleIds.has(id)){view.element.remove();recipeViews.delete(id);}
    for(const [id,view] of recipeCategoryViews)if(!visibleCategories.has(id)){view.section.remove();recipeCategoryViews.delete(id);}
    const previousEmpty=elements.crafts.querySelector('.crafting-empty');
    if(visibleRecipeCount)previousEmpty?.remove();
    if (!visibleRecipeCount) {
        const empty = previousEmpty || document.createElement('p');
        empty.className = 'crafting-empty subtle';
        empty.textContent = showCraftableRecipesOnly
            ? 'No unlocked recipes are ready to craft. Collect materials or turn off this filter.'
            : !showCraftedRecipes && unlockedRecipes.some(recipe => state.crafted.includes(recipe.id) &&
                (selectedCraftCategory === 'all' || recipeCategories[recipe.slot] === selectedCraftCategory))
                ? 'All items in this category are crafted. Select Show hidden to view them.'
                : 'No recipes unlocked in this category yet. Unlock more areas to discover recipes.';
        if(!empty.isConnected)elements.crafts.appendChild(empty);
    }
    refreshMaterialLocations(elements.crafts);
}

function renderItemComparison(container, item) {
    const equipped = itemById[state.gear[item.slot]];
    const labels = {new: 'New bonus', better: 'Improvement', equal: 'Equal value', worse: 'Worse value', missing: 'Missing bonus'};
    const lines = Equipment.compare(ItemCrafting.effective(item), ItemCrafting.effective(equipped));
    const craftedKeys = new Set(ItemCrafting.rollsFor(item).filter(Boolean).map(roll => roll.stat));
    // Keep permanent bonuses above crafted bonuses, preserving the usual stat
    // order within each group. Empty crafted slots are appended below both.
    lines.sort((a, b) => Number(craftedKeys.has(a.key)) - Number(craftedKeys.has(b.key)));
    container.classList.add('item-stat-comparison');
    container.replaceChildren();
    lines.forEach(line => {
        const entry = document.createElement('span');
        entry.className = 'item-stat-line stat-' + line.status;
        entry.dataset.stat = line.key;
        entry.dataset.comparison = line.status;
        if (craftedKeys.has(line.key)) entry.classList.add('is-crafted-stat');
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
        if (craftedKeys.has(line.key)) entry.append(Object.assign(document.createElement('small'), {className:'crafted-stat-label',textContent:'Crafted'}));
        container.append(entry);
    });
    if (!lines.length) container.textContent = 'No stat bonuses';
    ItemCrafting.appendSlots(container, item, state, true);
    const unique = Equipment.uniqueEffect(item);
    if (unique) container.append(Object.assign(document.createElement('span'), {
        className: 'item-stat-line item-unique-effect', textContent: 'Unique: ' + unique.description
    }));
}

function renderInventory() {
    document.querySelectorAll('[data-inventory-category]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.inventoryCategory === (inventoryCategory === 'slot' ? 'all' : inventoryCategory)));
    });
    elements.inventoryView.querySelector('.gear-workspace').hidden = inventoryCategory === 'materials';
    elements.inventoryView.querySelector('.materials-panel').hidden = ['weapons', 'armor'].includes(inventoryCategory);
    if(elements.inventoryView.querySelector('.materials-panel').hidden)elements.inventory.querySelectorAll('details[open]').forEach(entry=>{entry.open=false;});
    const gearSignature = JSON.stringify({
        selectedGearSlot,
        inventoryCategory,
        itemCrafts: state.itemCrafts,
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
    const equippedSignature=JSON.stringify([selectedGearSlot,state.gear,Object.values(state.gear).map(id=>itemById[id]),state.itemCrafts,state.tutorials.firstGearPending,state.tutorials.firstGearSlotSelected,state.tutorials.firstGearSlot]);
    if(equippedSignature!==lastRenderedEquippedSignature){
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
        const icon = EquipmentSpritePreview.createIcon(equippedItem, slot.icon);
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
            bonus.textContent = ItemCrafting.describe(equippedItem);
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
    lastRenderedEquippedSignature=equippedSignature;
    }

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
        const spriteFrame = EquipmentSpritePreview.createIcon(recipe, selectedSlot.icon);
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

    const ownedMaterials = Object.entries(materialNames).filter(([id]) => state.materials[id] > 0);
    const activeMaterials=new Set(ownedMaterials.map(([id])=>id));
    for(const [id,view] of materialInventoryViews)if(!activeMaterials.has(id)){view.entry.remove();materialInventoryViews.delete(id);}
    const previousEmpty=elements.inventory.querySelector('.inventory-empty');
    if(ownedMaterials.length)previousEmpty?.remove();
    else if(!previousEmpty){
        const empty=document.createElement('p');empty.className='inventory-empty subtle';
        empty.textContent='No materials collected yet. Defeat enemies to find some.';elements.inventory.append(empty);
    }
    ownedMaterials.forEach(([id,name],index)=>{
        const material=itemData.materialDetails?.[id],structure=JSON.stringify([name,material,materialSources[id]]);
        let view=materialInventoryViews.get(id);
        if(view?.structure!==structure){view?.entry.remove();view=null;}
        if(!view){
            const entry=document.createElement('details');entry.className='material-entry';entry.dataset.materialId=id;
            const summary=document.createElement('summary');summary.className='material-summary';
            const identity=document.createElement('span');identity.className='material-identity';
            identity.appendChild(Equipment.createIcon(material,'◇'));
            const label=document.createElement('span');label.textContent=name;label.title=name;identity.append(label);
            const count=document.createElement('strong');
            const toggle=document.createElement('span');toggle.className='material-toggle';toggle.setAttribute('aria-hidden','true');
            summary.append(identity,count,toggle);
            const details=document.createElement('div');details.className='material-details';
            const description=document.createElement('p');description.className='material-description';
            description.textContent=material?.description||'No description available.';
            const heading=document.createElement('h3');heading.textContent='Drops from';
            const sources=document.createElement('ul');sources.className='material-sources';
            for(const source of materialSources[id]||[]){
                const location=document.createElement('li'),enemy=document.createElement('span');enemy.textContent=source.enemy;
                location.append(enemy,createMaterialLocation(source));sources.append(location);
            }
            if(!sources.childElementCount){const empty=document.createElement('li');empty.textContent='No known drop locations.';sources.append(empty);}
            details.append(description,heading,sources);entry.append(summary,details);
            view={entry,count,structure};materialInventoryViews.set(id,view);
        }
        updateCombatText(view.count,formatAmount(state.materials[id]));
        if(elements.inventory.children[index]!==view.entry)elements.inventory.insertBefore(view.entry,elements.inventory.children[index]||null);
    });
    refreshMaterialLocations(elements.inventory);
}

function renderTutorialNotifications() {
    const notifications = [];
    if (state.tutorials.skillPointCapPending && !state.tutorials.skillPointCapDismissed) {
        notifications.push({
            id: 'skillPointCap-' + getSkillPointCap(),
            message: 'Skill point cap increased by 15! You can now earn up to ' + getSkillPointCap() + ' skill points by leveling. Visit the Skill Tree to spend your available points.',
            dismissed: 'skillPointCapDismissed',
            dismissLabel: 'Dismiss skill point cap notification'
        });
    }
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
        image.addEventListener('error', () => { image.replaceWith(document.createTextNode('✦'));mark.classList.remove('has-monster-sprite'); });
        mark.replaceChildren(image);
        mark.classList.add('has-monster-sprite');
    }
    for (const kind of ['poison','bleed']) {
        const overlay=document.createElement('span');overlay.className='enemy-dot-sprite-effect is-'+kind;
        for(let particle=0;particle<3;particle++) overlay.append(document.createElement('i'));
        mark.append(overlay);
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
    const freezeCount=document.createElement('strong');
    freezeStatus.append(createElementalIcon('rimeBrand'),freezeCount);
    effectRow.append(procNotice);
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
    const elementalRow=document.createElement('span');elementalRow.className='enemy-elemental-row';
    const brandStatuses=Object.fromEntries(['rimeBrand','emberBrand','scorched'].map(id=>{
        const badge=document.createElement('span');badge.className='enemy-elemental-status is-'+id;
        badge.dataset.elementalStatus=id;badge.hidden=true;badge.tabIndex=0;
        badge.append(createElementalIcon(id),document.createElement('strong'));
        elementalRow.append(badge);return [id+'Status',badge];
    }));
    dotRow.append(freezeStatus,elementalRow);
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
        dotStatus, dotCount, bleedStatus, respawn, freezeStatus,freezeCount,card,elementalRow,...brandStatuses});
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
    if (animate && combatEffectEnabled() && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        rewards.animate([{opacity: 0.3, transform: 'translateY(5px)'}, {opacity: 1, transform: 'translateY(0)'}], {duration: 260, easing: 'ease-out'});
        if (newEquipment && loot.equipment.length && combatEffectEnabled('glows')) equipment.animate([{opacity: 0.3, transform: 'scale(0.97)', filter: 'brightness(1.6)'}, {opacity: 1, transform: 'scale(1)', filter: 'brightness(1)'}], {duration: 650, easing: 'ease-out'});
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
    if(name==='title'&&window.LiveTooltips){LiveTooltips.setTitle(element,text);return;}
    if (element.getAttribute(name) !== text) element.setAttribute(name, text);
}

function updateCombatHidden(element, hidden) {
    if (element.hidden !== hidden) element.hidden = hidden;
}

let combatLootSignature = null;
let combatLootOwnedLabels = [];

function setCombatBar(bar, percent, offset = 0) {
    const transform = 'translateX(' + offset + '%) scaleX(' + percent / 100 + ')';
    if (bar.style.transform !== transform) bar.style.transform = transform;
}

function renderCombat() {
    window.MapMastery?.render();
    if (window.MapMastery?.isOpen()) {renderDetailedStats();return;}
    // This cache expires every render so equipment, ranks and levels stay current.
    const previousCache = combatStatCache;
    combatStatCache = new Map();
    try { renderCombatContent(); }
    finally { combatStatCache = previousCache;window.LiveTooltips?.refresh(); }
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
        elements.combatPanel.querySelectorAll('.poison-transfer, .combat-arrow, .eruption-chain, .shield-slam-wave, .spell-effect').forEach(effect => effect.remove());
        window.CombatWebGL?.clear();
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
    updateCombatText(elements.killProgressLabel,'Kills to clear map');
    updateCombatHidden(elements.killProgressLabel, completed);
    const masteryDropRate=MasterySystem.bonus(worldContent,map,state,'dropRateMultiplier');
    const lootEntries = [
        { name: 'Gold', amount: lootMonster.gold, chance: 1, owned: state.gold },
        ...[...map.drops, ...lootMonster.drops].map(drop => ({ name: materialNames[drop.id], materialId: drop.id, amount: drop.amount, chance: Math.min(1,drop.chance*masteryDropRate), owned: state.materials[drop.id] || 0 })),
        ...[...map.itemDrops, ...lootMonster.itemDrops].map(drop => ({
            name: itemById[drop.id].name,
            itemId: drop.id,
            owned: ownsItem(drop.id) ? 1 : 0,
            amount: [1, 1],
            chanceText: WorldContent.chanceText(Math.min(1,drop.chance*masteryDropRate)),
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
        updateCombatAttribute(view.name,'title',definition.name);
        updateCombatHidden(view.targetLabel, !target || target.id !== monster.id);
        const playerAccuracyText = view.playerAccuracyValue;
        const enemyAccuracyText = view.enemyAccuracyValue;
        updateCombatText(playerAccuracyText, combatStatFormatter.format(playerHitChance) + '%');
        updateCombatText(enemyAccuracyText, combatStatFormatter.format(enemyHitChance) + '%');
        setAccuracyClass(playerAccuracyText, playerHitChance, true);
        setAccuracyClass(enemyAccuracyText, enemyHitChance, false);
        setCombatBar(view.healthBar, hpPercent);
        const healthTrack = view.healthTrack;
        updateCombatAttribute(healthTrack, 'aria-valuenow', Math.round(hpPercent));
        const poisonIndicator = view.poisonDamageBar;
        const remainingPoisonDamage = Math.min(monster.hp, getRemainingPoisonDamage(monster));
        const poisonPercent = remainingPoisonDamage / definition.health * 100;
        setCombatBar(poisonIndicator, poisonPercent, Math.max(0, hpPercent - poisonPercent));
        poisonIndicator.classList.toggle('is-visible', monster.hp > 0 && remainingPoisonDamage > 0);
        updateCombatAttribute(poisonIndicator, 'title', remainingPoisonDamage > 0
            ? 'Poison will deal ' + combatStatFormatter.format(remainingPoisonDamage) + ' more damage'
            : '');
        const remainingBleedDamage = Math.min(Math.max(0, monster.hp - remainingPoisonDamage), getRemainingBleedDamage(monster));
        const bleedPercent = remainingBleedDamage / definition.health * 100;
        setCombatBar(view.bleedDamageBar, bleedPercent, Math.max(0, hpPercent - poisonPercent - bleedPercent));
        view.bleedDamageBar.classList.toggle('is-visible', monster.hp > 0 && remainingBleedDamage > 0);
        updateCombatAttribute(view.bleedDamageBar, 'title', remainingBleedDamage > 0
            ? 'Bleed will deal ' + combatStatFormatter.format(getRemainingBleedDamage(monster)) + ' more damage' : '');
        updateBleedStatus(view.bleedStatus, monster);
        card.classList.toggle('is-poisoned',monster.hp>0 && monster.poisonStacks.some(stack=>stack.remainingDuration>0));
        card.classList.toggle('is-bleeding',monster.hp>0 && Boolean(monster.bleed?.stacks>0 && monster.bleed.remainingDuration>0));
        renderElementalStatuses(view,monster);
        updateCombatText(view.hpText, Math.ceil(monster.hp) + ' / ' + definition.health + ' HP');
        updateCombatText(view.intervalValue, getMonsterAttackInterval(monster).toFixed(1) + 's');
        const freezeStatus = view.freezeStatus;
        const frozen = monster.hp > 0 && monster.freezeRemaining > 0;
        card.classList.toggle('is-frozen', frozen);
        updateCombatHidden(freezeStatus, !frozen);
        updateCombatText(view.freezeCount, frozen ? combatStatFormatter.format(monster.freezeRemaining)+'s' : '');
        updateCombatAttribute(freezeStatus,'aria-label','Frozen: '+combatStatFormatter.format(monster.freezeRemaining)+' seconds remaining');
        updateCombatAttribute(freezeStatus, 'title', 'Attacks take 3 seconds longer. Freezing Arrows and Glacial Rupture refresh the 9-second duration.');
        updateCombatText(view.damageValue,combatStatFormatter.format(definition.attackDamage));
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
    setCombatBar(elements.playerHealthBar, playerHpPercent);
    const damagePercent = Math.min(100 - playerHpPercent, recentPlayerDamage / maxHealth * 100);
    setCombatBar(elements.playerHealthDamage, damagePercent, playerHpPercent);
    updateCombatAttribute(elements.playerHealthTrack, 'aria-valuenow', Math.round(playerHpPercent));
    // Keep fractional combat health, but do not round the displayed HP above a healing cap.
    const displayedPlayerHp = state.playerHp > 0 && state.playerHp < 1 ? '<1' : Math.floor(state.playerHp + 1e-8);
    updateCombatText(elements.playerHealthText, displayedPlayerHp + ' / ' + maxHealth + ' HP');
    renderCombatBuffs();
    renderPlayerMana();
    updateCombatText(elements.combatStatusLabel, state.combatPaused ? 'Dead' : target ? 'Auto-battling' : 'Waiting for respawn');
    elements.combatStatus.classList.toggle('combat-dead', state.combatPaused);
    elements.combatStatus.classList.toggle('is-fighting', !state.combatPaused && Boolean(target));
    updateCombatHidden(elements.resumeCombat, !state.combatPaused || !isCombatView());
    renderLootNotice();
    renderDamageBreakdown();
    window.LootEffects?.sync(isCombatView(), map.id);
    window.CombatWebGL?.sync(isCombatView(), map.id);
    window.CombatWebGLEffects?.sync();
}

function renderSkillPointDisplay() {
    const cap = getSkillPointCap();
    const pending = state.tutorials.skillPointCapPending && !state.tutorials.skillPointCapDismissed;
    const total = getEarnedSkillPoints();
    if (elements.skillPointTotal.textContent !== String(total)) elements.skillPointTotal.textContent = total;
    if (elements.skillPointCap.textContent !== String(cap)) elements.skillPointCap.textContent = cap;
    elements.skillPointCap.classList.toggle('has-new-cap', pending);
    const increased = displayedSkillPointCap !== null && cap > displayedSkillPointCap;
    if (increased || pending && animatedSkillPointCap !== cap) {
        window.clearTimeout(skillPointCapAnimationTimer);
        elements.skillPointCap.dataset.capGain = '+' + (increased ? cap - displayedSkillPointCap : 15) + ' CAP';
        elements.skillPointCap.classList.remove('is-increased');
        void elements.skillPointCap.offsetWidth;
        elements.skillPointCap.classList.add('is-increased');
        animatedSkillPointCap = cap;
        skillPointCapAnimationTimer = window.setTimeout(() => elements.skillPointCap.classList.remove('is-increased'), 3500);
    } else if (displayedSkillPointCap !== null && cap < displayedSkillPointCap) {
        window.clearTimeout(skillPointCapAnimationTimer);
        elements.skillPointCap.classList.remove('is-increased');
        animatedSkillPointCap = null;
    }
    displayedSkillPointCap = cap;
    updateCombatAttribute(elements.skillPoints,'title','Total earned: ' + total + '. Available: ' + state.skillPoints + '. Each world boss raises the cap by 15 once.');
}

function render() {
    window.DeveloperTools?.render();
    if (state.currentView !== 'town') window.ItemCrafting?.stopAuto('Auto rolling stopped after leaving crafting.');
    const speedBonus = Math.round((getAttackSpeedMultiplier() - 1) * 10000) / 100;
    const experienceRequired = experienceForNextLevel(state.level);
    const experiencePercent = Math.min(100, state.experience / experienceRequired * 100);
    elements.gold.textContent = formatAmount(state.gold);
    elements.level.textContent = 'Level ' + state.level;
    elements.experience.textContent = state.experience + ' / ' + experienceRequired + ' XP';
    const xpRate = getExperienceMultiplier();
    const penalty = document.getElementById('experiencePenalty');
    penalty.hidden = xpRate === 1;
    penalty.textContent = xpRate < 1 ? 'XP −' + Number(((1 - xpRate) * 100).toFixed(2)) + '%' : '';
    const experienceHint=xpRate < 1 ? 'XP gained in this world is reduced by ' + Number(((1 - xpRate) * 100).toFixed(2)) + '% at your level. Fractional XP is retained.' : 'Full XP rewards. XP penalties start at level ' + (15 * (Math.max(0, worldData.findIndex(world => world.mapIds.includes(state.selectedMap))) + 1)) + ' in this world.';
    updateCombatAttribute(elements.experience,'title',experienceHint);
    updateCombatAttribute(penalty,'title',experienceHint);
    renderSkillPointDisplay();
    elements.experienceBar.style.width = experiencePercent + '%';
    elements.experienceTrack.setAttribute('aria-valuenow', String(state.experience));
    elements.experienceTrack.setAttribute('aria-valuemax', String(experienceRequired));
    elements.experienceTrack.setAttribute('aria-valuetext', state.experience + ' of ' +
        experienceRequired + ' XP to level ' + (state.level + 1));
    elements.damage.textContent = formatAmount(getDamage()*getGatheringPowerMultiplier());
    document.getElementById('spellDamageDisplay').textContent=combatStatFormatter.format(getSpellDamage()*getGatheringPowerMultiplier());
    document.getElementById('maxManaDisplay').textContent=formatAmount(getPlayerMaxMana());
    document.getElementById('manaRegenDisplay').textContent=combatStatFormatter.format(getPlayerManaRegen())+' mana/s';
    elements.multiHit.textContent = combatStatFormatter.format(getMultiHit());
    elements.poisonChance.textContent = combatStatFormatter.format(getPoisonChance() * 100) + '%';
    elements.bleedChance.textContent = combatStatFormatter.format(getBleedChance() * 100) + '%';
    elements.speed.textContent = (speedBonus >= 0 ? '+' : '') + combatStatFormatter.format(speedBonus) + '%';
    elements.accuracy.textContent = formatAmount(getPlayerAccuracy());
    elements.evasion.textContent = formatAmount(getPlayerEvasion());
    elements.maxHealth.textContent = formatAmount(getPlayerMaxHealth());
    elements.maxFury.textContent = formatAmount(getPlayerMaxFury());
    elements.healthRegen.textContent = combatStatFormatter.format(getPlayerHealthRegen()) + ' HP/s';
    if (state.currentView !== 'inventory' && !elements.inventoryView.hidden)
        elements.inventory.querySelectorAll('details[open]').forEach(entry => { entry.open = false; });
    elements.townView.hidden = state.currentView !== 'town';
    elements.upgradesView.hidden = state.currentView !== 'upgrades';
    elements.mapView.hidden = state.currentView !== 'map';
    elements.inventoryView.hidden = state.currentView !== 'inventory';
    const townPageOpen=state.currentView==='townPage';
    document.body.classList.toggle('town-page-open',townPageOpen);
    document.querySelector('#townPageView').hidden=!townPageOpen;
    document.querySelector('#townPageButton').setAttribute('aria-pressed',String(townPageOpen));
    elements.worldPanel.hidden = townPageOpen || !worldSelectorIsUnlocked();
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
    window.TownPage?.render();
    renderCombat();
    // Refresh a panel when it is visible; switching views calls render() again
    // with current game state, so hidden panels do not need combat updates.
    if (state.currentView === 'upgrades') renderUpgrades();
    if (state.currentView === 'town') renderCrafting();
    if (state.currentView === 'inventory') renderInventory();
    renderTutorialNotifications();
    window.LiveTooltips?.refresh();
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

function awardExperience(amount, map = currentMap()) {
    const previousLevel = state.level;
    const levelsGained = Progression.awardExperience(state, amount, worldData.findIndex(world => world.mapIds.includes(map.id)), experienceForNextLevel);
    if (levelsGained) syncSkillPoints();
    if (previousLevel === 0 && state.level > 0) state.tutorials.firstSkillPointPending = true;
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
    const killsBefore=state.kills[map.id];
    // Boss encounters use real kills, with separate mastery thresholds. Do not
    // consume Menagerie fractional credit or award its multiplier on these maps.
    const killCredit=MasterySystem.kind(worldContent,map)==='boss'?1:TownProgression.killCredit(state,map.id,worldData.findIndex(world=>world.mapIds.includes(map.id)));
    state.kills[map.id]=Math.min(Number.MAX_SAFE_INTEGER,killsBefore+killCredit);
    window.MapMastery?.award(map);
    const world = worldForMap(map.id);
    const defeatedBoss = world?.mapIds.at(-1) === map.id && !state.defeatedBossWorldIds.includes(world.id);
    if (defeatedBoss) {
        state.defeatedBossWorldIds.push(world.id);
        syncSkillPoints();
        state.tutorials.skillPointCapPending = true;
        state.tutorials.skillPointCapDismissed = false;
    }
    if (map.id === worldData[0].mapIds[0] && killsBefore < map.goal && state.kills[map.id] >= map.goal) {
        state.tutorials.firstMapGoalPending = true;
        state.tutorials.firstMapGoalDismissed = false;
    }
    const experienceGained = definition.experience;
    awardExperience(experienceGained, map);
    const found = [];
    const lootMaterials = new Map();
    const equipment = [];
    const masteryDropRate=MasterySystem.bonus(worldContent,map,state,'dropRateMultiplier');
    [...map.drops, ...definition.drops].forEach(drop => {
        if (Object.hasOwn(materialNames, drop.id) && Math.random() < Math.min(1,drop.chance*masteryDropRate)) {
            const amount = rollRange(drop.amount);
            state.materials[drop.id] += amount;
            found.push(amount + ' ' + materialNames[drop.id]);
            lootMaterials.set(drop.id, (lootMaterials.get(drop.id) || 0) + amount);
        }
    });
    [...map.itemDrops, ...definition.itemDrops].forEach(drop => {
        const item = itemById[drop.id];
        if (item && !item.developerOnly && !ownsItem(item.id) && Math.random() < Math.min(1,drop.chance*masteryDropRate)) {
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
    if (defeatedBoss) {
        state.lootLog.unshift('Defeated ' + definition.name + '! Skill point cap +15 (' + getSkillPointCap() + ' maximum).');
        state.lootLog = state.lootLog.slice(0,12);
    }

    if(combatEffects!==null) {
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
        emitCombatEvent('monsterDefeated', {monsterId:monster.id,mapId:map.id,rewards});
    }

    finishMonsterDefeat(monster,definition,remainingPoison);
    saveGame();
}

function presentMonsterDefeat({monsterId,mapId,rewards}) {
    if(!combatEffectEnabled())return;
    const monster=getCombatEffectMonster(monsterId);
    const card=monster && getCombatEffectCard(monsterId);
    // Earned loot can still use the status row if its original plate is gone.
    window.LootEffects?.drop(rewards,card?.querySelector('.enemy-mark') || card,mapId);
    // A delayed death event must not shake a monster that has already respawned.
    if(card && monster.hp<=0)restartCombatAnimation(card,'is-defeating');
}

function finishMonsterDefeat(monster,definition,remainingPoison) {
    monster.hp = 0;
    monster.poisonStacks = [];
    monster.bleed = null;
    monster.respawnRemaining = definition.respawnSeconds;
    monster.attackTimer = 0;
    monster.freezeRemaining = 0;
    clearElementalDebuffs(monster);
    selectNextMonsterTarget(monster);
    syncLegacyEnemyState();
    transferPoisonOnDeath(monster, remainingPoison);
    gainShieldFromKill();
}

function transferPoisonOnDeath(monster, stacks) {
    return combatAbilities.transferPoisonOnDeath(monster, stacks);
}

function showPoisonTransfer(sourceId, targetId) {
    emitCombatEvent('poisonTransferred', {mapId:state.selectedMap,sourceId,targetId});
}

function presentPoisonTransfer({sourceId,targetId}) {
    if(!combatEffectEnabled('projectiles') || !getCombatEffectMonster(sourceId) || !getCombatEffectMonster(targetId))return;
    const source = getCombatEffectCard(sourceId)?.querySelector('.enemy-mark');
    const target = getCombatEffectCard(targetId)?.querySelector('.enemy-mark');
    if (!source || !target) return;
    if(window.CombatWebGLEffects?.transfer(source,target))return;
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
}

function applyDamageToPlayer(damage, source = 'enemy') {
    if (!CombatHealth.isValidDamage(state.playerHp, damage)) return;
    if (source === 'enemy') normalizeShields();
    const result = CombatHealth.applyPlayerDamage(state, damage, source);
    if (result.blocked) {
        emitCombatEvent('playerShieldBlocked', {mapId: state.selectedMap});
        return;
    }
    emitCombatEvent('playerDamaged', {damage: result.damageDealt});
    if (result.died) {
        state.combatPaused = true;
        state.attackTimer = 0;
        clearPlayerCombatBuffs();
    }
}

function getMonsterDamageTakenMultiplier(monster) {
    const power=getGatheringPowerMultiplier();
    return CombatHealth.getMonsterDamageTakenMultiplier(state, monster, power, getSkillNodeRank('singledOff')>0);
}

function applyDamageToMonster(monster, damage, damageType = 'physical', abilityId = null) {
    // Scale at the hit so forks and arrows generated by Multishot each receive
    // this bonus once, while their other attack procs keep the original damage.
    if (damageType === 'physical' && bowAttackAbilityIds.has(abilityId)) damage *= getBowDamageMultiplier();
    if (!monster || !CombatHealth.isValidDamage(monster.hp, damage)) return false;
    // Every successful hit builds Fury, including splash and generated arrows.
    // Damage over time and poison executions never build or extend Fury.
    if (damageType !== 'poison' && damageType !== 'bleed' && damageType !== 'dot') gainFuryFromHit();
    const previousHp = monster.hp;
    const multiplier = abilityId === 'poisonExecute' ? 1 : getMonsterDamageTakenMultiplier(monster)*getFireDamageTakenMultiplier(monster,abilityId);
    const result = CombatHealth.applyMonsterDamage(monster, damage, multiplier);
    recordMonsterDamage(result.damageDealt, damageType, abilityId);
    syncLegacyEnemyState();
    if (result.died) {
        defeatEnemy(monster);
        return true;
    }
    // Non-poison damage can bring an already-poisoned enemy into execute range.
    // Poison ticks check after updating every stack's remaining lifetime.
    if (damageType !== 'poison' && tryExecutePoison(monster)) return true;
    if ((damageType === 'physical' || damageType === 'spell') && abilityId) {
        if (SkillDescriptions.getAbilityTargeting(skillNodeDefinition(abilityId)) === 'singleTarget') {
            // Bleed stores the hit before target modifiers; its ticks apply the
            // current vulnerability once, just like Poison and burning damage.
            tryApplyBleed(monster, damage);
        }
        // Every direct ability hit rolls Poison once, regardless of its targeting
        // tag. DOTs cannot apply Poison; basic attacks roll it in the attack loop.
        tryApplyPoison(monster);
        if (monster.hp <= 0) return true; // The new stack can trigger Poison Execute.
    }

    const damageDealt = previousHp - monster.hp;
    emitCombatEvent('monsterDamaged', {monsterId: monster.id, damage: damageDealt, damageType});
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
    return combatAbilities.getRemainingPoisonDamage(monster);
}

function tryExecutePoison(monster) {
    return combatAbilities.tryExecutePoison(monster);
}

function tryApplyPoison(monster) {
    return combatAbilities.tryApplyPoison(monster);
}

function tickMonsterPoison(monster, elapsed) {
    return combatAbilities.tickMonsterPoison(monster, elapsed);
}

function playerHasShockwaveSlash() {
    return combatAbilities.playerHasShockwaveSlash();
}

function triggerShockwaveSlash(hitMonster, hitDamage) {
    return combatAbilities.triggerShockwaveSlash(hitMonster, hitDamage);
}

function craftGear(id) {
    const recipe = recipes.find(entry => entry.id === id);
    if (!recipe || !recipeIsUnlocked(recipe) || ownsItem(id) || recipe.developerOnly) return;
    if(!GameResources.spend(state,recipe.materials))return;
    // Crafting history survives ownership loss. Reacquisition never adds a second
    // completion entry or re-awards any first-craft progression.
    if(!state.crafted.includes(id))state.crafted.push(id);
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
    if (!window.confirm('Reset all Idle Adventure progress? A recovery backup will be kept.')) return;
    window.ItemCrafting?.stopAuto();
    try { SaveCompatibility.backup(SaveCompatibility.protection.blocked ? SaveCompatibility.protection.raw : JSON.stringify(createGameSave()),'Before explicit game reset'); }
    catch (error) {showSaveRecovery(localStorage.getItem(saveKey),error);return;}
    document.querySelector('#combatSettingsDialog').close();
    clearSaveRecovery();preservedSaveFields={};state.unlockedMapIds=[];state.unlockedWorldIds=[];
    state.gold = 0;
    state.kills = Object.fromEntries(mapData.map(map => [map.id, 0]));
    state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id, 0]));
    state.upgrades = { strength: 0, haste: 0, evasion: 0 };
    state.level = 0;
    state.experience = 0;
    state.experienceRemainder = 0;
    state.skillPoints = 0;
    state.skillRanks = {};
    state.mapMastery = {};
    state.defeatedBossWorldIds = [];
    state.skillPointRecoveryRanks = null;
    state.skillPointTrimPending = false;
    state.playerMana=0;state.manaCapacity=0;state.voidCharges=0;
    clearGatheringPower();
    clearFury();
    state.shieldStacks = 0;
    state.gear = createEmptyGear();
    state.ownedItemIds = [];
    state.developerItemsEnabled = false;
    state.developerTravelEnabled = false;
    state.mapListLocked = false;
    inventoryCategory = 'slot';
    state.crafted = [];
    state.itemCrafts = {};
    state.itemRollSaves = {};
    state.townProgress = TownProgression.defaults();
    state.tutorials = createTutorialState();
    state.selectedWorld = worldData[0].id;
    state.lastMapByWorld = Object.fromEntries(worldData.map(world => [world.id, world.mapIds[0]]));
    state.selectedMap = worldData[0].mapIds[0];
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

elements.mapSelectorLock.addEventListener('click', function() {
    state.mapListLocked=!state.mapListLocked;
    if(state.mapListLocked)state.mapListExpanded=true;
    renderMaps();saveGame();
});

elements.mapList.addEventListener('click', function(event) {
    const button = event.target.closest('[data-map]');
    if (!button || button.disabled) return;
    const selected = mapsForWorld(state.selectedWorld).find(map => map.id === button.dataset.map);
    if (!selected) return;
    if (selected.id === state.selectedMap) {
        if(state.mapListLocked)return;
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
        if(window.SkillBuilds?.isEditing()) {
            if(control.id==='confirmSkillSelection'){SkillBuilds.applyEditing();return;}
            if(control.id==='clearSkillSelection'){SkillBuilds.cancelEditing();return;}
            if(control.id==='resetSkillTree'){SkillBuilds.clearEditing();return;}
        }
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
            invalidateSkillBonusCache();
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
        updateSkillTreeTransform(viewport, board);
        return;
    }
    if(window.SkillBuilds?.isEditing()){SkillBuilds.editNode(node.id);return;}
    if (refundMode) {
        if (getPendingSkillPointCount() > 0 || getSkillNodeRank(node.id) === 0 || pendingSkillRanks[node.id] ||
            !canRefundSkillRank(node.id)) return;
        state.skillRanks[node.id]--;
        if (state.skillRanks[node.id] <= 0) delete state.skillRanks[node.id];
        invalidateSkillBonusCache();
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
    state.level++;
    state.experience = 0;
    state.experienceRemainder = 0;
    syncSkillPoints();
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

// Existing rules still use the live game state and event collector. Resolve
// them at call time so build changes and rule replacements remain visible.
// The ability engine owns its stateful rules and reentrancy. Host callbacks
// resolve live stats and route data events without owning ability calculations.
const combatAbilities = CombatAbilities.create({
    state,
    random: () => Math.random(),
    settings: {
        arrowSkillSettings, arrowTravelDirections, arrowImpactPause, eruptionSkillSettings,
        spellSettings, voidMissileTiming, gameTickSeconds, elementalSkillSettings, elementalBrands,
        bleedDamageType, deepWoundsSettings, poisonDamageType, shieldSlamDamagePerStack
    },
    rules: {
        activeMonster: () => activeMonster(),
        applyDamageToMonster: (monster, damage, damageType, abilityId) => applyDamageToMonster(monster, damage, damageType, abilityId),
        applyDamageToPlayer: (damage, source) => applyDamageToPlayer(damage, source),
        applyPlayerHealing: (amount) => applyPlayerHealing(amount),
        emitCombatEvent: (type, details) => emitCombatEvent(type, details),
        flashShockwaveCard: (id) => flashShockwaveCard(id),
        flashShockwaveHealthBar: (id) => flashShockwaveHealthBar(id),
        getArrowFlightTime: (kind, sourceId) => getArrowFlightTime(kind, sourceId),
        getBleedChance: () => getBleedChance(),
        getBleedHitDamageRatio: () => getBleedHitDamageRatio(),
        getBleedMaximumStacks: () => getBleedMaximumStacks(),
        getBleedStacksPerApplication: () => getBleedStacksPerApplication(),
        getBleedTickDamage: (bleed) => getBleedTickDamage(bleed),
        getBleedTickInterval: () => getBleedTickInterval(),
        getDamage: () => getDamage(),
        getHitChance: (accuracy, evasion) => getHitChance(accuracy, evasion),
        getMonsterDamageTakenMultiplier: (monster) => getMonsterDamageTakenMultiplier(monster),
        getMultiHit: () => getMultiHit(),
        getPlayerAccuracy: () => getPlayerAccuracy(),
        getPlayerHealthRegen: () => getPlayerHealthRegen(),
        getPlayerManaRegen: () => getPlayerManaRegen(),
        getPlayerMaxHealth: () => getPlayerMaxHealth(),
        getPlayerMaxMana: () => getPlayerMaxMana(),
        getPlayerMaxShields: () => getPlayerMaxShields(),
        getPoisonChance: () => getPoisonChance(),
        getPoisonDamage: () => getPoisonDamage(),
        getPoisonTickInterval: () => getPoisonTickInterval(),
        getRighteousFireRegeneration: (elapsed) => getRighteousFireRegeneration(elapsed),
        getRighteousFireSettings: () => getRighteousFireSettings(),
        getSkillNodeRank: (id) => getSkillNodeRank(id),
        getSkillStat: (stat) => getSkillStat(stat),
        getSpellDamage: () => getSpellDamage(),
        hasDeepWounds: () => hasDeepWounds(),
        hasFireOfTheRighteous: () => hasFireOfTheRighteous(),
        hasShieldGeneration: () => hasShieldGeneration(),
        monsterDefinition: (monster) => monsterDefinition(monster),
        showCombatArrow: (sourceId, targetId, kind, direction, visual) => showCombatArrow(sourceId, targetId, kind, direction, visual),
        showElementalBurst: (targetIds, element, explosion) => showElementalBurst(targetIds, element, explosion),
        showEruptionChain: (sourceId, targetId, delay) => showEruptionChain(sourceId, targetId, delay),
        showMonsterHitBadge: (id, label, isMultiHit) => showMonsterHitBadge(id, label, isMultiHit),
        showMonsterProc: (id, label) => showMonsterProc(id, label),
        showPoisonStackProc: (monster) => showPoisonStackProc(monster),
        showPoisonTransfer: (sourceId, targetId) => showPoisonTransfer(sourceId, targetId),
        showShieldSlamWave: (hitIds) => showShieldSlamWave(hitIds),
        showSpellCast: (kind, hits, visualDelay) => showSpellCast(kind, hits, visualDelay),
        showVoidMissileImpact: (targetId, missile) => showVoidMissileImpact(targetId, missile),
        showVoidVolleyBuffProc: () => showVoidVolleyBuffProc(),
        showVoidVortex: (targetIds, delay) => showVoidVortex(targetIds, delay),
        showVolcanicEruption: (centerId, targetIds) => showVolcanicEruption(centerId, targetIds),
        getShockwaveSettings: () => {
            const unique = getEquippedItems().map(Equipment.uniqueEffect).find(effect => effect?.shockwaveSlash);
            return unique?.shockwaveSlash || {chance:0.25,triggers:1};
        },
        getPoisonForecast: monster => combatPoisonForecasts?.get(monster),
        setPoisonForecast: (monster, forecast) => combatPoisonForecasts?.set(monster, forecast),
        advanceVoidMissile: hit => advanceVoidMissilePresentation(hit),
        cancelVoidMissile: hit => cancelVoidMissilePresentation(hit),
        showRighteousFireHit: targets => {
            if(combatEffects!==null)emitCombatEvent('righteousFireHit', {mapId:state.selectedMap,targetIds:targets.map(monster=>monster.id),duration:350});
        }
    }
});

const combatSimulation = CombatSimulation.create({
    state,
    random: () => Math.random(),
    freezeDelay: arrowSkillSettings.freezeDelay,
    rules: {
        tickTown: (profile, elapsed) => TownProgression.tick(profile, elapsed),
        currentMap: () => currentMap(),
        tickFury: (elapsed) => tickFury(elapsed),
        tickGatheringPower: (elapsed) => tickGatheringPower(elapsed),
        normalizeShields: () => normalizeShields(),
        tickPlayerRegeneration: (elapsed) => tickPlayerRegeneration(elapsed),
        ensureLiveMonsterTarget: () => ensureLiveMonsterTarget(),
        activeMonster: () => activeMonster(),
        monsterDefinition: (monster, map) => monsterDefinition(monster, map),
        clearElementalDebuffs: (monster) => clearElementalDebuffs(monster),
        tickPendingEruptions: (elapsed) => tickPendingEruptions(elapsed),
        tickPendingVoidMissiles: (elapsed) => tickPendingVoidMissiles(elapsed),
        tryShieldSlam: () => tryShieldSlam(),
        tickPlayerMana: (elapsed) => tickPlayerMana(elapsed),
        tickMonsterPoison: (monster, elapsed) => tickMonsterPoison(monster, elapsed),
        tickMonsterBleed: (monster, elapsed) => tickMonsterBleed(monster, elapsed),
        tickElementalBrands: (monster, elapsed) => tickElementalBrands(monster, elapsed),
        syncLegacyEnemyState: () => syncLegacyEnemyState(),
        getEnemyHitChance: (monster) => getEnemyHitChance(monster),
        applyDamageToPlayer: (damage, source) => applyDamageToPlayer(damage, source),
        emitCombatEvent: (type, details) => emitCombatEvent(type, details),
        getAttackSpeed: () => getAttackSpeed(),
        getDamage: () => getDamage(),
        getPlayerAttackTargets: () => getPlayerAttackTargets(),
        getHitChance: (accuracy, evasion) => getHitChance(accuracy, evasion),
        getPlayerAccuracy: () => getPlayerAccuracy(),
        showMonsterHitBadge: (id, label, isMultiHit) => showMonsterHitBadge(id, label, isMultiHit),
        applyDamageToMonster: (monster, damage, damageType) => applyDamageToMonster(monster, damage, damageType),
        tryApplyBleed: (monster, damage) => tryApplyBleed(monster, damage),
        tryApplyPoison: (monster) => tryApplyPoison(monster),
        triggerShockwaveSlash: (monster, damage) => triggerShockwaveSlash(monster, damage),
        triggerVolcanicEruption: (monster, damage) => triggerVolcanicEruption(monster, damage),
        triggerAttackArrowSkills: (monster, damage) => triggerAttackArrowSkills(monster, damage),
        triggerAttackSpells: () => triggerAttackSpells()
    }
});

const hasSavedGame = loadGame();
if (hasSavedGame) startOfflineRecap();
// Removing the optional file removes its controls and implementation entirely.
window.DeveloperTools?.mount();
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
    if (SaveCompatibility.protection.blocked) return {needsRender:false,effects:[]};
    const previousEffects = combatEffects, previousSimulation = simulatingCombat;
    const previousForecasts = combatPoisonForecasts;
    combatPoisonForecasts = new WeakMap();
    const effects = collectEffects ? [] : null;
    combatEffects = effects;
    simulatingCombat = true;
    try {
        return {...combatSimulation.step(elapsed), effects:effects || []};
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
    window.DeveloperTools?.setBusy(active);
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
    window.DeveloperTools?.render();
}

function processCombatBacklog() {
    if (SaveCompatibility.protection.blocked) return;
    const startedAt = performance.now(), effects = [];
    const showEffects = !document.hidden && !combatCatchingUp && combatEffectEnabled();
    combatStatCache = new Map();
    try {
        // Bound each batch, not the amount of elapsed game time. The remainder is
        // retained and continued in another task so input and painting can run.
        for (let steps = 0; pendingCombatSeconds + 1e-8 >= gameTickSeconds && steps < 250; steps++) {
            let elapsed = gameTickSeconds;
            if (state.combatPaused && !TownProgression.hasConverters(state) && !state.furyStacks && !state.gatheringPower?.stacks && !state.pendingEruptions.length && !state.pendingVoidMissiles.length && state.monsterStates.every(monster => !monster.poisonStacks.length && !monster.bleed && !monster.rimeBrand && !monster.emberBrand)) {
                // Once Fury, DOTs, travelling eruptions and missiles finish, only respawns
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
            else {renderCombat();window.TownPage?.renderProduction();}
            combatNeedsFullRender = false;
        }
        const finishedCatchup=combatCatchingUp;
        combatCatchingUp = false;
        if(finishedCatchup)window.DeveloperTools?.render();
        showOfflineRecap();
    }
    pruneVoidMissilePresentations();
    if (Date.now() - lastSave >= 1000) saveGame();
}

function updateCombatClock() {
    if (SaveCompatibility.protection.blocked) return;
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

function updateSkillTreeNodeSize(button, node) {
    const nodeSize = [1, 1.25, 1.5].includes(Number(node.size)) ? Number(node.size) : 1;
    const baseNodeSize = 78 * nodeSize;
    const displayedNodeSize = node.start
        ? Math.min(130, baseNodeSize / Math.max(skillTreeZoom, 0.1)) : baseNodeSize;
    const size = displayedNodeSize + 'px';
    for (const property of ['width', 'height', 'minWidth', 'minHeight']) {
        if (button.style[property] !== size) button.style[property] = size;
    }
    if (node.start) {
        const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const icon = button.querySelector('.skill-node-icon');
        const fontSize = displayedNodeSize * 1.8 * rootFontSize / 78 + 'px';
        if (icon.style.fontSize !== fontSize) icon.style.fontSize = fontSize;
    }
}

function updateSkillTreeTransform(viewport, board, resizeOrigin = false) {
    if (!viewport || !board) return;
    if (resizeOrigin) {
        const origin = board.querySelector('[data-skill-node="origin"]');
        if (origin) updateSkillTreeNodeSize(origin, skillNodeById.origin);
    }
    clampSkillTreePan(viewport, board);
    const transform = 'translate(' + skillTreePanX + 'px, ' + skillTreePanY + 'px) scale(' + skillTreeZoom + ')';
    if (board.style.transform !== transform) {
        board.style.transform = transform;
        // A tooltip belongs to the previous camera position until hovered again.
        const tooltip = viewport.querySelector('#skillNodeTooltip');
        if (tooltip && !tooltip.hidden) tooltip.hidden = true;
    }
}

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
    updateSkillTreeNodeSize(origin, skillNodeById.origin);
    skillTreePanX = viewport.clientWidth / 2 - (origin.offsetLeft + origin.offsetWidth / 2) * skillTreeZoom;
    skillTreePanY = viewport.clientHeight / 2 - (origin.offsetTop + origin.offsetHeight / 2) * skillTreeZoom;
    updateSkillTreeTransform(viewport, board);
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
        tooltip.classList.toggle('is-righteous-fire', righteousFireNodeIds.some(id => resolveSkillNodeId(id) === node.id));
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
        if (event.target.closest('[data-skill-node], [data-skill-tree-control], .skill-points-bar')) return;
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
        updateSkillTreeTransform(viewport, viewport.querySelector('.skill-tree-board'));
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
        updateSkillTreeTransform(viewport, viewport.querySelector('.skill-tree-board'), true);
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
