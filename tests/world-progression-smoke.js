(function () {
    const key = 'worldProgressionSmoke', previous = JSON.parse(sessionStorage.getItem(key) || 'null');
    const checks = previous?.checks || [], $ = id => document.getElementById(id);
    const check = (name,ok) => { checks.push((ok ? 'PASS ' : 'FAIL ') + name); if (!ok) throw new Error(name); };
    const near = (a,b) => Math.abs(a-b) < 1e-7, count = ranks => Object.values(ranks).reduce((sum,rank) => sum+rank,0);
    function fresh(level = 0) {
        SkillBuilds.cancelEditing(false); combatStatCache = null; clearPlayerCombatBuffs();
        state.level = level; state.experience = 0; state.experienceRemainder = 0;
        state.skillRanks = {}; pendingSkillRanks = {}; state.defeatedBossWorldIds = [];
        state.skillPointRecoveryRanks = null; state.skillPointTrimPending = false;
        state.kills = Object.fromEntries(mapData.map(map => [map.id,0]));
        state.gear = createEmptyGear(); state.ownedItemIds = []; state.itemCrafts = {}; state.crafted = [];
        state.upgrades = {strength:0,haste:0,evasion:0}; state.gold = 1000;
        state.materials = Object.fromEntries(Object.keys(materialNames).map(id => [id,0]));
        state.tutorials = createTutorialState(); state.lootLog = []; state.lastLoot = null;
        state.selectedMap = worldData[0].mapIds[0]; state.selectedWorld = worldData[0].id;
        state.currentView = 'town'; state.isInTown = true; state.playerHp = 100; state.playerMana = 0; state.combatPaused = true;
        resetMonsterStates(currentMap()); resetCombatClock(); clearOfflineRecap(); syncSkillPoints();
    }
    try {
        if (previous) {
            check('over-cap save reloads without entering save recovery', !SaveCompatibility.protection.blocked);
            check('over-cap tree opens for trimming on startup', SkillBuilds.isEditing() && state.currentView === 'upgrades' && count(SkillBuilds.getEditingRanks()) === 20);
            check('over-cap skills are inactive and the allowed budget is 15', count(state.skillRanks) === 0 && state.skillPoints === 15 && getSkillPointCap() === 15 && state.combatPaused);
            check('the capped tree interface fits the viewport', document.documentElement.scrollWidth <= innerWidth);
            check('red warning requests removal of five points', $('skillBuildBudgetWarning').classList.contains('is-over-budget') && /Remove 5/.test($('skillBuildBudgetWarning').textContent) && $('confirmSkillSelection').disabled);
            check('the original full tree remains recoverable', count(state.skillPointRecoveryRanks) === 20 && !$('recoverSkillBuild').hidden && count(SkillBuilds.exportCurrent().skillRanks) === 20);
            SkillBuilds.applyEditing();
            check('an over-cap plan cannot be applied', count(state.skillRanks) === 0 && SkillBuilds.isEditing());
            const order = previous.order.slice().reverse();
            while (count(SkillBuilds.getEditingRanks()) > 15) SkillBuilds.editNode(order.shift());
            SkillBuilds.applyEditing();
            check('trimmed tree applies within the cap while preserving the full original', !SkillBuilds.isEditing() && count(state.skillRanks) + state.skillPoints === 15 && count(state.skillPointRecoveryRanks) === 20 && !state.skillPointTrimPending);
            check('XP strip shows total earned points even after spending them', elements.skillPoints.textContent === 'Skill points: 15 / 15');
            check('skill tree shows confirmed spent points separately', $('skillPointsTotalDisplay').textContent === 'Spent points: ' + count(state.skillRanks));
            const saved = parseGameSave(localStorage.getItem(saveKey));
            check('both trimmed and original trees persist', count(saved.skillRanks) + saved.skillPoints === 15 && count(saved.skillPointRecoveryRanks) === 20);
            $('recoverSkillBuild').click();
            check('recovery button reopens the original tree after applying', SkillBuilds.isEditing() && count(SkillBuilds.getEditingRanks()) === 20);
            SkillBuilds.cancelEditing();
            const confirm = window.confirm; window.confirm = () => true; $('resetGame').click(); window.confirm = confirm;
            check('full reset clears boss rewards, fractional XP and recovery plans', getSkillPointCap() === 15 && state.defeatedBossWorldIds.length === 0 && state.experienceRemainder === 0 && state.skillPointRecoveryRanks === null);
            check('no runtime errors', !window.smokeErrors.length);
            sessionStorage.removeItem(key); checks.push('SMOKE PASSED');
        } else {
            for (let world=0; world<worldData.length; world++) {
                const threshold = 15*(world+1), rates = [1,.1,.05,.01,.001,.0001,.0001];
                for (let i=0; i<rates.length; i++) check('World ' + (world+1) + ' level ' + (threshold-1+i) + ' has the intended XP rate', Progression.experienceMultiplier(threshold-1+i,world) === rates[i]);
            }
            fresh(14); state.experience = experienceForNextLevel(14)-1; awardExperience(51);
            check('crossing the threshold recalculates XP within the same reward', state.level === 15 && state.experience === 5 && state.skillPoints === 15);
            awardExperience(experienceForNextLevel(15)*10-50);
            check('leveling past the cap cannot grant extra skill points', state.level === 16 && state.skillPoints === 15);
            DeveloperTools.setMode(true);$('increaseLevelButton').click();DeveloperTools.setMode(false);
            check('developer level increases also respect the skill point cap', state.level === 17 && state.skillPoints === 15);
            check('XP penalty and skill point cap are visible', !$('experiencePenalty').hidden && $('experiencePenalty').textContent.includes('99%') && elements.skillPoints.textContent === 'Skill points: 15 / 15');
            fresh(18); state.combatPaused = false;
            for (let i=0; i<500; i++) awardExperience(1);
            check('tiny XP rewards accumulate fractionally', state.experience === 0 && near(state.experienceRemainder,.5));
            saveGame(); check('fractional XP survives saving and loading', loadGame() && near(state.experienceRemainder,.5));
            for (let i=0; i<500; i++) awardExperience(1);
            check('fractions eventually grant a whole XP point', state.experience === 1 && near(state.experienceRemainder,0));
            state.selectedWorld = worldData[1].id;
            check('XP rate follows the actual combat map, not the world selector', getExperienceMultiplier() === .001);
            const once = {level:14,experience:0,experienceRemainder:0}, chunks = {...once};
            Progression.awardExperience(once,50000,0,() => 100);
            for(let i=0; i<5000; i++) Progression.awardExperience(chunks,10,0,() => 100);
            check('batched and individual XP rewards agree across penalty thresholds', once.level === chunks.level && once.experience === chunks.experience && near(once.experienceRemainder,chunks.experienceRemainder));
            fresh(60);
            for (let index=0; index<worldData.length; index++) {
                const world = worldData[index]; state.selectedWorld = world.id; state.selectedMap = world.mapIds.at(-1);
                resetMonsterStates(currentMap()); defeatEnemy(state.monsterStates[0]);
                const cap = 15*(index+2);
                check('World ' + (index+1) + ' boss raises the cap by 15', getSkillPointCap() === cap && state.skillPoints === Math.min(state.level,cap));
                render();
                check('World ' + (index+1) + ' cap increase highlights the denominator', elements.skillPoints.textContent === 'Skill points: ' + state.skillPoints + ' / ' + cap && elements.skillPointCap.classList.contains('is-increased') && elements.skillPointCap.classList.contains('has-new-cap') && elements.skillPointCap.dataset.capGain === '+15 CAP');
                const notice = elements.tutorialNotifications.querySelector('[data-tutorial-notification="skillPointCap-' + cap + '"]');
                check('World ' + (index+1) + ' cap notification explains the new maximum', notice?.textContent.includes('up to ' + cap) && notice.textContent.includes('by leveling'));
                const animation = elements.skillPointCap.getAnimations()[0];
                render();
                check('combat refreshes preserve the same cap notification and animation', elements.tutorialNotifications.contains(notice) && elements.skillPointCap.getAnimations()[0] === animation);
                notice.querySelector('button').click();
                check('dismissing the cap notification clears the persistent highlight and is saved', !elements.tutorialNotifications.querySelector('[data-tutorial-notification="skillPointCap-' + cap + '"]') && !elements.skillPointCap.classList.contains('has-new-cap') && parseGameSave(localStorage.getItem(saveKey)).tutorials.skillPointCapDismissed);
                resetMonsterStates(currentMap()); defeatEnemy(state.monsterStates[0]);
                render();
                check('World ' + (index+1) + ' boss repeats cannot farm extra capacity', getSkillPointCap() === cap && state.defeatedBossWorldIds.length === index+1);
                check('repeat boss kills do not restore a dismissed notification', !elements.tutorialNotifications.querySelector('[data-tutorial-notification="skillPointCap-' + cap + '"]'));
            }
            const complete = createGameSave(); delete complete.defeatedBossWorldIds;
            check('older saves infer boss victories from kill history', getSkillPointCap(parseGameSave(JSON.stringify(complete))) === 15*(worldData.length+1));
            const marked = createGameSave(); marked.kills = Object.fromEntries(mapData.map(map => [map.id,0]));
            check('earned boss bonuses persist independently of later map edits', getSkillPointCap(parseGameSave(JSON.stringify(marked))) === getSkillPointCap());
            fresh(20); const unspent = createGameSave(); unspent.skillPoints = 20;
            const migrated = parseGameSave(JSON.stringify(unspent));
            check('legacy excess unspent points are capped without discarding character levels', migrated.level === 20 && migrated.skillPoints === 15 && migrated.skillPointRecoveryRanks === null);
            for (const value of [1,-1,NaN]) {
                const invalid = createGameSave(); invalid.experienceRemainder = value;
                let rejected = false; try { parseGameSave(JSON.stringify(invalid)); } catch { rejected = true; }
                check('malformed fractional XP is rejected', rejected);
            }
            const ranks = {}, order = [];
            for(let i=0; i<20; i++) {
                const node = skillNodes.find(node => !node.start && (ranks[node.id] || 0) < node.maxRank && skillNodeRequirementsMet(node,id => skillNodeById[id]?.start || ranks[id] > 0));
                if(!node)throw new Error('Not enough connected skills for the migration fixture');
                ranks[node.id] = (ranks[node.id] || 0)+1; order.push(node.id);
            }
            state.skillRanks = ranks; state.skillPoints = 0;
            const legacy = createGameSave();
            for (const field of ['defeatedBossWorldIds','skillPointRecoveryRanks','skillPointTrimPending','experienceRemainder']) delete legacy[field];
            localStorage.setItem(saveKey,JSON.stringify(legacy)); sessionStorage.setItem(key,JSON.stringify({checks,order}));
            SaveCompatibility.protection.blocked = true; location.reload(); return;
        }
    } catch(error) { sessionStorage.removeItem(key); checks.push('ERROR ' + error.stack); }
    const report=document.createElement('pre'); report.id='smoke-results'; report.textContent=checks.join('\n'); document.body.append(report);
}());
