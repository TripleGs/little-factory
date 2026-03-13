function normalizeMoney(amount) {
    return Math.round((Number(amount) || 0) * 100) / 100;
}

function formatMoney(amount) {
    return normalizeMoney(amount).toFixed(2);
}

function setPlayerMoney(player, amount) {
    if (!player) {
        return normalizeMoney(amount);
    }

    player.money = normalizeMoney(amount);
    return player.money;
}

function syncMoneyDisplay() {
    if (!els.money) return;
    els.money.innerText = formatMoney(state.money);
}

function setMoney(amount) {
    state.money = normalizeMoney(amount);
    syncMoneyDisplay();

    const localPlayer = state.players.find(player => player.id === state.localPlayerId);
    if (localPlayer) {
        localPlayer.money = state.money;
    }

    return state.money;
}

function getTile(x, y) {
    if (!isValid(x, y)) return null;
    return state.grid[y][x];
}

function isValid(x, y) {
    return x >= 0 && x < state.cols && y >= 0 && y < state.rows;
}

function isLocationOccupied(x, y, items) {
    return items.some(i => i.x === x && i.y === y);
}
