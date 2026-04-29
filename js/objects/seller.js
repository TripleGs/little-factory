function spawnCenterSeller() {
    const cx = Math.floor(state.cols / 2);
    const cy = Math.floor(state.rows / 2);
    if (!state.grid[cy] || !state.grid[cy][cx]) return null;

    const tile = { type: 'seller', rotation: 0, locked: true };
    state.grid[cy][cx] = tile;
    renderCell(cx, cy, tile);
    return { x: cx, y: cy, tile };
}

function sellItem(x, y, item) {
    // Base sell value of $1, plus 0.5 per mix level
    const sellMultiplier = item.isPackaged ? item.packageCount : 1;
    const mixLevel = item.mixLevel || 0;
    // Income multiplier based on producer type order (1st type = x1, 2nd type = x2, 3rd type = x3, etc.)
    // producerType is the index in the producerTypes array, so add 1 to get the order number
    const producerTypeOrder = (item.producerType ?? 0) + 1;
    const totalMoney = (1 + (mixLevel * COLOR_CONFIG.palette.sellValuePerLevel)) * sellMultiplier * producerTypeOrder;

    if (state.gameMode === 'multi' && state.players.length > 1) {
        // Split income equally among all players
        const splitAmount = totalMoney / state.players.length;

        // Add to local player's money (state.money is the source of truth)
        setMoney(state.money + splitAmount);
        state.moneyRateEarnings += splitAmount;

        // Show floating text with split indicator
        spawnFloatingText(x, y, `+$${totalMoney.toFixed(1)} (split)`);

        // Update multiplayer money display
        Lobby.refreshMoneyDisplay();

        // Broadcast our updated money to peers
        Sync.broadcastMoneyUpdate();
    } else {
        // Single player - original logic
        setMoney(state.money + totalMoney);
        state.moneyRateEarnings += totalMoney;
        spawnFloatingText(x, y, `+$${totalMoney.toFixed(1)}`);
    }

    renderPalette(); // Update affordability
}
