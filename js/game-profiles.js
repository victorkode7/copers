(function () {
    'use strict';

    const exportButton = document.getElementById('exportProfile');
    const importButton = document.getElementById('importProfile');
    const fileInput = document.getElementById('importProfileFile');
    const status = document.getElementById('profileStatus');
    let statusTimeout;
    let importing = false;

    function downloadText(text,name) {
        const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');
        link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
        window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    }

    function showBackups() {
        const list=document.getElementById('saveBackupsList');list.replaceChildren();
        try {
            const entries=SaveCompatibility.backups();
            if(!entries.length){const empty=document.createElement('li');empty.textContent='No automatic backups yet.';list.append(empty);}
            entries.forEach((entry,index)=>{
                const row=document.createElement('li'),label=document.createElement('span'),button=document.createElement('button');
                label.textContent=new Date(entry.createdAt).toLocaleString()+' — '+entry.reason;
                button.type='button';button.textContent='Download';
                button.addEventListener('click',()=>downloadText(entry.raw,'idle-adventure-recovery-'+entry.createdAt+'-'+index+'.json'));
                row.append(label,button);list.append(row);
            });
        }catch{const error=document.createElement('li');error.textContent='Your browser could not read recovery backups.';list.append(error);}
        const dialog=document.getElementById('saveBackupsDialog');if(!dialog.open)dialog.showModal();
    }

    document.getElementById('saveBackupsButton').addEventListener('click',showBackups);
    document.getElementById('browseRecoveryBackups').addEventListener('click',showBackups);
    document.getElementById('closeSaveBackups').addEventListener('click',()=>document.getElementById('saveBackupsDialog').close());
    document.getElementById('saveRecovery').addEventListener('cancel',event=>event.preventDefault());
    document.getElementById('downloadProtectedSave').addEventListener('click',()=>{
        const raw=SaveCompatibility.protection.raw;
        if(typeof raw==='string')downloadText(raw,'idle-adventure-original-save.json');
    });
    document.getElementById('retryProtectedSave').addEventListener('click',()=>{
        if(loadGame()){startOfflineRecap();render();updateCombatClock();}
    });
    document.getElementById('importRecoveryProfile').addEventListener('click',()=>{fileInput.value='';fileInput.click();});
    document.getElementById('resetProtectedSave').addEventListener('click',()=>document.getElementById('resetGame').click());

    function showStatus(message, error = false) {
        window.clearTimeout(statusTimeout);
        status.textContent = message;
        status.classList.toggle('is-error', error);
        status.hidden = false;
        if (!error) statusTimeout = window.setTimeout(() => { status.hidden = true; }, 8000);
    }

    function readBackup(text) {
        let backup;
        try {
            backup = JSON.parse(text.replace(/^\uFEFF/, ''));
        } catch {
            throw new Error('That file is not valid JSON.');
        }
        if (backup?.format === 'idle-adventure-profile') {
            if (backup.version !== 1) throw new Error('That backup version is not supported.');
            backup = backup.save;
        }
        try {
            // Also accept the original save format, including its older versions.
            return parseGameSave(JSON.stringify(backup));
        } catch {
            throw new Error('That file does not contain a valid, supported Idle Adventure profile.');
        }
    }

    exportButton.addEventListener('click', function () {
        let url;
        const link = document.createElement('a');
        try {
            if(SaveCompatibility.protection.blocked){
                if(typeof SaveCompatibility.protection.raw!=='string')throw new Error('Original save is unavailable.');
                downloadText(SaveCompatibility.protection.raw,'idle-adventure-original-save.json');return;
            }
            const now = new Date();
            const backup = {
                format: 'idle-adventure-profile', version: 1,
                exportedAt: now.toISOString(), save: createGameSave()
            };
            const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
            url = URL.createObjectURL(blob);
            link.href = url;
            link.download = 'idle-adventure-profile-' + now.toISOString().replace(/[:.]/g, '-') + '.json';
            document.body.append(link);
            link.click();
            showStatus('Profile exported. Keep the downloaded JSON file as your backup.');
        } catch {
            showStatus('Could not export your profile. Please try again.', true);
        } finally {
            link.remove();
            if (url) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    });

    importButton.addEventListener('click', function () {
        // Clearing the picker allows restoring the same backup again.
        fileInput.value = '';
        fileInput.click();
    });

    fileInput.addEventListener('change', async function () {
        const file = fileInput.files[0];
        if (!file || importing) return;
        importing = true;
        let restored = false;
        exportButton.disabled = importButton.disabled = true;
        try {
            if (file.size > 2 * 1024 * 1024) throw new Error('That file is too large to be a game profile.');
            const originalInput = await file.text();
            const saved = readBackup(originalInput);
            // Validate first, then ensure the replacement can be persisted before
            // changing the running game. Invalid files and storage failures keep it intact.
            restoreImportedProfile(saved,originalInput);
            restored = true;
            pendingSkillRanks = {};
            refundMode = false;
            skillTreePanning = false;
            skillTreeNeedsInitialFraming = true;
            inventoryCategory = 'slot';
            selectedGearSlot = 'weapon';
            selectedCraftCategory = 'all';
            showCraftableRecipesOnly = false;
            showCraftedRecipes = false;
            lastRenderedGearSignature = null;
            renderedLoot = renderedLootMessage = undefined;
            recentPlayerDamage = 0;
            clearEnemyDamageIndicator();
            window.LootEffects?.clear();
            shownTutorialNotifications.clear();
            elements.inventory.querySelectorAll('details[open]').forEach(detail => { detail.open = false; });
            state.mapListExpanded = true;
            document.getElementById('developerItems').checked = state.developerItemsEnabled;
            document.getElementById('developerTravel').checked = state.developerTravelEnabled;
            startOfflineRecap();
            render();
            if (state.currentView === 'upgrades') {
                centerSkillTreeOnOrigin(true);
                skillTreeNeedsInitialFraming = false;
            }
            saveGame();
            updateCombatClock();
            const refunded=SaveCompatibility.report(saved)?.refundedPoints || 0;
            showStatus('Profile imported. Your restored progress is now saved.'+(refunded?' Refunded '+refunded+' skill points after tree changes.':''));
        } catch (error) {
            const message = restored
                ? 'Your profile was saved, but could not be displayed. Reload the game to finish restoring it.'
                : 'Import failed. ' + error.message + ' Your current progress was kept.';
            showStatus(message,true);
            if(SaveCompatibility.protection.blocked)document.getElementById('saveRecoveryMessage').textContent=message+' The original save remains protected.';
        } finally {
            fileInput.value = '';
            importing = false;
            exportButton.disabled = importButton.disabled = false;
        }
    });
}());
