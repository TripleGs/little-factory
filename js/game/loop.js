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
}

function updateMoneyRate() {
    if (!els.moneyRate) return;

    const secondsPerTick = CONFIG.tickRate / 1000;
    const speed = state.speedMultiplier || 1;
    const realSeconds = secondsPerTick / speed;
    const rate = realSeconds > 0 ? (state.moneyRateEarnings / realSeconds) : 0;
    state.moneyRate = rate;
    els.moneyRate.textContent = `$${rate.toFixed(1)}/s`;
    state.moneyRateEarnings = 0;
}
