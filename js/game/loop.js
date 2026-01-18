/* --- Core Loop --- */
function loop(timestamp) {
    if (!state.lastTick) state.lastTick = timestamp;
    const speed = state.speedMultiplier || 1;
    state.timeAcc += (timestamp - state.lastTick) * speed;
    state.lastTick = timestamp;

    while (state.timeAcc >= CONFIG.tickRate) {
        tick();
        state.timeAcc -= CONFIG.tickRate;
    }

    renderItems(state.timeAcc / CONFIG.tickRate);
    requestAnimationFrame(loop);
}

/* --- Game Loop --- */
function tick() {
    spawnItemsFromProducers();
    moveAndProcessAllItems();
    updateMoneyRate();
    if (window.Sound) {
        Sound.updateConveyor(state.items.length);
    }
}

function updateMoneyRate() {
    if (!els.moneyRate) return;

    const secondsPerTick = CONFIG.tickRate / 1000;
    const speed = state.speedMultiplier || 1;
    const realSeconds = secondsPerTick / speed;
    const currentRate = realSeconds > 0 ? (state.moneyRateEarnings / realSeconds) : 0;

    // Add current rate to history
    state.moneyRateHistory.push(currentRate);

    // Keep only the last N entries
    while (state.moneyRateHistory.length > state.moneyRateWindowSize) {
        state.moneyRateHistory.shift();
    }

    // Calculate rolling average
    const sum = state.moneyRateHistory.reduce((a, b) => a + b, 0);
    const avgRate = state.moneyRateHistory.length > 0 ? sum / state.moneyRateHistory.length : 0;

    state.moneyRate = avgRate;
    els.moneyRate.textContent = `$${avgRate.toFixed(1)}/s`;
    state.moneyRateEarnings = 0;
}
