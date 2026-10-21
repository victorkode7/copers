// Loaded before game.js to prove new catalogue entries need no runtime edits.
// Keep a legacy ID available for save-migration checks after seed items are renamed.
if (!window.adventureItems.items.some(item => item.id === 'trailblazerBlade')) {
    window.adventureItems.items.push({id: 'trailblazerBlade', name: 'Legacy Test Sword', slot: 'weapon', rarity: 'common', description: '', sprite: '', stats: {damage: 5, attackSpeedMultiplier: 1 / 0.98}, recipe: {materials: {gel: 12}}});
}
window.adventureItems.items.push(
    {id: 'testAmulet', name: 'Test Amulet', slot: 'necklace', rarity: 'rare', description: '', sprite: 'tests/fixtures/equipment-sprite.svg', stats: {damage: 7, damageMultiplier: 2, health: 30, accuracy: 9, poisonChance: 0.2, poisonDamage: 3, poisonTickRate: 1}, recipe: {materials: {gel: 2}}},
    {id: 'testDropHelm', name: 'Test Drop Helm', slot: 'helmet', rarity: 'rare', description: '', sprite: '', stats: {accuracy: 4}, recipe: null}
);
