let money = 1;
let incomePerSec = 0;
const saveKey = 'idleGame2Save';
const themeKey = 'idleGame2Theme';
let saveErrorReported = false;
const themeToggle = $('#themeToggle');

function applyTheme(theme) {
    const isLight = theme === 'light';
    document.body.dataset.theme = isLight ? 'light' : 'dark';
    themeToggle.text(isLight ? 'Dark mode' : 'Light mode');
    themeToggle.attr('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
}

try {
    const savedTheme = localStorage.getItem(themeKey);
    if (savedTheme !== null && savedTheme !== 'light' && savedTheme !== 'dark') {
        throw new Error('Saved theme preference has an invalid value.');
    }
    applyTheme(savedTheme || 'dark');
} catch (error) {
    console.error('Game 2 could not read its saved theme preference.', error);
    applyTheme('dark');
}

themeToggle.click(function() {
    const nextTheme = document.body.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme);
    try {
        localStorage.setItem(themeKey, nextTheme);
    } catch (error) {
        console.error('Game 2 could not save its theme preference.', error);
        displayMessage('Theme preference could not be saved.');
    }
});

const upgrades = {
    clickUpgrade: {
        baseCost: 1,
        costMult: 1.5,
        tier: 0,
        moneyPerClick: 1,
        incomePerSec: 1
    },
    autoUpgrade: {
        baseCost: 50,
        costMult: 1.5,
        tier: 0
    },
    factoryUpgrade: {
        baseCost: 1000,
        costMult: 1.5,
        tier: 0,
        incomePerSec: 100
    }
};

const moneyEl = $('#moneyDisplay');
const incomeEl = $('#incomeDisplay');
const readout1 = $('#readout1');
const readout2 = $('#readout2');
const readout3 = $('#readout3');
const readout4 = $('#readout4');
const readout5 = $('#readout5');

function formatMoney(amount, showCents) {
    const suffixes = ['', 'k', 'm', 'b', 't', 'q', 'qi'];
    if (amount < 100000) {
        return '$' + (showCents ? amount.toFixed(2) : Math.round(amount).toLocaleString('en-US'));
    }

    let value = amount;
    let suffixIndex = 0;

    while (value >= 1000 && suffixIndex < suffixes.length - 1) {
        value /= 1000;
        suffixIndex++;
    }

    let decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
    let compactValue = Number(value.toFixed(decimals));
    if (compactValue >= 1000 && suffixIndex < suffixes.length - 1) {
        value /= 1000;
        suffixIndex++;
        decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
        compactValue = Number(value.toFixed(decimals));
    }
    return '$' + compactValue + suffixes[suffixIndex];
}

function updatePurchaseButton(buttonSelector, cardSelector, cost) {
    const canAfford = money >= cost;
    $(buttonSelector)
        .text((canAfford ? 'Purchase (' : "Can't afford (") + formatMoney(cost, false) + ')')
        .prop('disabled', !canAfford)
        .toggleClass('active', canAfford);
    $(cardSelector)
        .toggleClass('can-afford', canAfford)
        .toggleClass('cannot-afford', !canAfford);
}

function updateMoneyDisplay() {
    const autoMult = 1 + (upgrades.autoUpgrade.tier * 0.1);
    const factoryIncome = upgrades.factoryUpgrade.tier * 100;
    const totalIncome = incomePerSec * autoMult + factoryIncome;
    moneyEl.text(formatMoney(money));
    incomeEl.text('Income: $' + totalIncome.toFixed(2) + ' / sec');
}

function displayMessage(msg) {
    readout5.text(readout4.text());
    readout4.text(readout3.text());
    readout3.text(readout2.text());
    readout2.text(readout1.text());
    readout1.text(msg);
}

function reportSaveError(action, error) {
    if (!saveErrorReported) {
        console.error('Game 2 could not ' + action + ' its save data.', error);
        displayMessage('Save ' + action + ' failed. Check browser storage settings.');
        saveErrorReported = true;
    }
}

function saveGame() {
    try {
        localStorage.setItem(saveKey, JSON.stringify({
            version: 1,
            money: money,
            clickTier: upgrades.clickUpgrade.tier,
            autoTier: upgrades.autoUpgrade.tier,
            factoryTier: upgrades.factoryUpgrade.tier
        }));
        saveErrorReported = false;
    } catch (error) {
        reportSaveError('write', error);
    }
}

function loadGame() {
    try {
        const savedData = localStorage.getItem(saveKey);
        if (savedData === null) {
            return false;
        }

        const data = JSON.parse(savedData);
        if (
            data === null ||
            data.version !== 1 ||
            !Number.isFinite(data.money) ||
            data.money < 0 ||
            !Number.isInteger(data.clickTier) ||
            data.clickTier < 0 ||
            !Number.isInteger(data.autoTier) ||
            data.autoTier < 0 ||
            !Number.isInteger(data.factoryTier) ||
            data.factoryTier < 0
        ) {
            throw new Error('Save data has an invalid format.');
        }

        money = data.money;
        upgrades.clickUpgrade.tier = data.clickTier;
        upgrades.autoUpgrade.tier = data.autoTier;
        upgrades.factoryUpgrade.tier = data.factoryTier;
        incomePerSec = upgrades.clickUpgrade.tier * upgrades.clickUpgrade.incomePerSec;
        return true;
    } catch (error) {
        reportSaveError('read', error);
        return true;
    }
}

function updateUpgradeButtons() {
    const clickCost = Math.ceil(upgrades.clickUpgrade.baseCost * Math.pow(upgrades.clickUpgrade.costMult, upgrades.clickUpgrade.tier));
    updatePurchaseButton('#buyClickUpgrade', '#clickUpgrade', clickCost);
    $('#clickLevel strong').text(upgrades.clickUpgrade.tier);
    $('#clickUpgrade #Mult').text('Adds +$' + (upgrades.clickUpgrade.tier * upgrades.clickUpgrade.incomePerSec) + '/sec passive income');

    const autoCost = Math.ceil(upgrades.autoUpgrade.baseCost * Math.pow(upgrades.autoUpgrade.costMult, upgrades.autoUpgrade.tier));
    const autoMult = (1 + (upgrades.autoUpgrade.tier * 0.1)).toFixed(2);
    updatePurchaseButton('#buyAutoUpgrade', '#autoUpgrade', autoCost);
    $('#autoLevel strong').text(upgrades.autoUpgrade.tier);
    $('#autoUpgrade #Mult').text(autoMult + 'x money multiplier');

    const factoryCost = Math.ceil(upgrades.factoryUpgrade.baseCost * Math.pow(upgrades.factoryUpgrade.costMult, upgrades.factoryUpgrade.tier));
    updatePurchaseButton('#buyFactoryUpgrade', '#factoryUpgrade', factoryCost);
    $('#factoryLevel strong').text(upgrades.factoryUpgrade.tier);
    $('#factoryUpgrade #Mult').text('Adds +$' + (upgrades.factoryUpgrade.tier * upgrades.factoryUpgrade.incomePerSec) + '/sec passive income');
}

const hasSavedData = loadGame();
let lastSecond = Date.now();
let lastSave = lastSecond;

setInterval(function() {
    const now = Date.now();
    const elapsedSeconds = (now - lastSecond) / 1000;
    if (elapsedSeconds > 0) {
        const autoMult = 1 + (upgrades.autoUpgrade.tier * 0.1);
        const factoryIncome = upgrades.factoryUpgrade.tier * 100;
        money += (incomePerSec * autoMult + factoryIncome) * elapsedSeconds;
        lastSecond = now;
        updateMoneyDisplay();
        updateUpgradeButtons();
        if (now - lastSave >= 1000) {
            saveGame();
            lastSave = now;
        }
    }
}, 50);

$(document).on('click', '.earn-btn', function() {
    const clickPower = 1 + upgrades.clickUpgrade.tier;
    money += clickPower;
    displayMessage('Earned $' + clickPower + '!');
    updateMoneyDisplay();
    updateUpgradeButtons();
    saveGame();
});

function purchaseClickUpgrade() {
    const cost = Math.ceil(upgrades.clickUpgrade.baseCost * Math.pow(upgrades.clickUpgrade.costMult, upgrades.clickUpgrade.tier));
    if (money >= cost) {
        money -= cost;
        upgrades.clickUpgrade.tier++;
        incomePerSec += upgrades.clickUpgrade.incomePerSec;
        displayMessage('Purchased Click Bot Level ' + upgrades.clickUpgrade.tier + '! (+$1/sec)');
        updateMoneyDisplay();
        updateUpgradeButtons();
        saveGame();
        $('#clickUpgrade').addClass('purchased-flash');
        setTimeout(function() { $('#clickUpgrade').removeClass('purchased-flash'); }, 400);
    }
}

function purchaseAutoUpgrade() {
    const cost = Math.ceil(upgrades.autoUpgrade.baseCost * Math.pow(upgrades.autoUpgrade.costMult, upgrades.autoUpgrade.tier));
    if (money >= cost) {
        money -= cost;
        upgrades.autoUpgrade.tier++;
        const autoMult = (1 + (upgrades.autoUpgrade.tier * 0.1)).toFixed(2);
        displayMessage('Purchased Auto Earner Level ' + upgrades.autoUpgrade.tier + '! (' + autoMult + 'x multiplier)');
        updateMoneyDisplay();
        updateUpgradeButtons();
        saveGame();
        $('#autoUpgrade').addClass('purchased-flash');
        setTimeout(function() { $('#autoUpgrade').removeClass('purchased-flash'); }, 400);
    }
}

function purchaseFactoryUpgrade() {
    const cost = Math.ceil(upgrades.factoryUpgrade.baseCost * Math.pow(upgrades.factoryUpgrade.costMult, upgrades.factoryUpgrade.tier));
    if (money >= cost) {
        money -= cost;
        upgrades.factoryUpgrade.tier++;
        const factoryIncome = upgrades.factoryUpgrade.tier * 100;
        displayMessage('Purchased Factory Level ' + upgrades.factoryUpgrade.tier + '! (+$' + factoryIncome + '/sec)');
        updateMoneyDisplay();
        updateUpgradeButtons();
        saveGame();
        $('#factoryUpgrade').addClass('purchased-flash');
        setTimeout(function() { $('#factoryUpgrade').removeClass('purchased-flash'); }, 400);
    }
}

const purchaseActions = {
    buyClickUpgrade: purchaseClickUpgrade,
    buyAutoUpgrade: purchaseAutoUpgrade,
    buyFactoryUpgrade: purchaseFactoryUpgrade
};
let heldPurchaseButton = null;
let heldPurchasePointerId = null;
let heldPurchaseStartedAt = 0;
let heldPurchaseTimer = null;

function stopHeldPurchase() {
    if (heldPurchaseTimer !== null) {
        clearTimeout(heldPurchaseTimer);
        heldPurchaseTimer = null;
    }
    heldPurchaseButton = null;
    heldPurchasePointerId = null;
}

function scheduleHeldPurchase() {
    if (!heldPurchaseButton) {
        return;
    }
    if (heldPurchaseButton.disabled) {
        stopHeldPurchase();
        return;
    }

    const heldFor = performance.now() - heldPurchaseStartedAt;
    const delay = Math.max(60, 400 - heldFor * 0.07);
    heldPurchaseTimer = setTimeout(function() {
        if (!heldPurchaseButton || heldPurchaseButton.disabled) {
            stopHeldPurchase();
            return;
        }
        purchaseActions[heldPurchaseButton.id]();
        scheduleHeldPurchase();
    }, delay);
}

$(document).on('pointerdown', '.buy-button', function(e) {
    const pointer = e.originalEvent;
    if (!pointer.isPrimary || pointer.button !== 0 || this.disabled) {
        return;
    }

    e.preventDefault();
    stopHeldPurchase();
    heldPurchaseButton = this;
    heldPurchasePointerId = pointer.pointerId;
    heldPurchaseStartedAt = performance.now();
    purchaseActions[this.id]();
    scheduleHeldPurchase();
});

$(document).on('click', '.buy-button', function(e) {
    if (e.originalEvent && e.originalEvent.detail > 0) {
        return;
    }
    purchaseActions[this.id]();
});

$(document).on('pointerup pointercancel', function(e) {
    if (e.originalEvent.pointerId === heldPurchasePointerId) {
        stopHeldPurchase();
    }
});

$(window).on('blur', stopHeldPurchase);

$('#resetGame').click(function() {
    money = 1;
    incomePerSec = 0;
    lastSecond = Date.now();
    upgrades.clickUpgrade.tier = 0;
    upgrades.autoUpgrade.tier = 0;
    upgrades.factoryUpgrade.tier = 0;
    displayMessage('Game reset!');
    updateMoneyDisplay();
    updateUpgradeButtons();
    saveGame();
});

$('#moneyInput').keydown(function(e) {
    if (e.key === 'Enter') {
        const input = $(this);
        const value = input.val().trim();
        const match = value.match(/^\$?([+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?)\s*(qi|k|m|b|t|q)?$/i);
        if (match) {
            const suffixes = { k: 1e3, m: 1e6, b: 1e9, t: 1e12, q: 1e15, qi: 1e18 };
            const amount = Number(match[1].replace(/,/g, '')) * (suffixes[(match[2] || '').toLowerCase()] || 1);
            if (!Number.isFinite(amount) || !Number.isFinite(money + amount)) {
                displayMessage('Amount is too large to add.');
                input.val('');
                return;
            }
            money += amount;
            displayMessage('Added ' + formatMoney(Math.abs(amount), false) + (amount < 0 ? ' (subtracted).' : '!'));
            updateMoneyDisplay();
            updateUpgradeButtons();
            saveGame();
        } else if (value) {
            displayMessage('Enter a valid amount, such as 500k.');
        }
        input.val('');
    }
});

updateMoneyDisplay();
updateUpgradeButtons();
displayMessage('Welcome to Idle Game 2!');
if (!hasSavedData) {
    saveGame();
}

window.addEventListener('beforeunload', saveGame);
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        saveGame();
    }
});