function sellItem(x, y, item) {
    // Base sell value of $1, plus 0.5 per mix level
    const sellMultiplier = item.isPackaged ? item.packageCount : 1;
    const mixLevel = item.mixLevel || 0;
    const totalMoney = (1 + (mixLevel * COLOR_CONFIG.palette.sellValuePerLevel)) * sellMultiplier;

    if (state.gameMode === 'multi' && state.players.length > 1) {
        // Split income equally among all players
        const splitAmount = totalMoney / state.players.length;

        // Add to local player's money (state.money is the source of truth)
        state.money += splitAmount;
        state.moneyRateEarnings += splitAmount;
        els.money.innerText = Math.floor(state.money);

        // Update our entry in the players array
        const localPlayer = state.players.find(p => p.id === state.localPlayerId);
        if (localPlayer) {
            localPlayer.money = state.money;
        }

        // Show floating text with split indicator
        spawnFloatingText(x, y, `+$${totalMoney.toFixed(1)} (split)`);

        // Update multiplayer money display
        Lobby.refreshMoneyDisplay();

        // Broadcast our updated money to peers
        Sync.broadcastMoneyUpdate();
    } else {
        // Single player - original logic
        state.money += totalMoney;
        state.moneyRateEarnings += totalMoney;
        els.money.innerText = state.money;
        spawnFloatingText(x, y, `+$${totalMoney.toFixed(1)}`);
    }

    renderPalette(); // Update affordability
}
