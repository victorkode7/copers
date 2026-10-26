const skillSpriteFixtureNode = window.adventureSkillTree.nodes.find(node => node.id === 'quickHands') ||
    window.adventureSkillTree.nodes.find(node => node.id === 'attackSpeedNode');
if (skillSpriteFixtureNode) skillSpriteFixtureNode.sprite = 'tests/fixtures/equipment-sprite.svg';
