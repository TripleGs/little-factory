function formatSpeedIcon(multiplier) {
    const label = Number.isInteger(multiplier) ? multiplier.toFixed(0) : multiplier.toFixed(1);
    return `x${label}`;
}

function updateSpeedButtonLabel(buttonEl) {
    const target = buttonEl || els.speedButton;
    if (!target) return;

    const iconEl = target.querySelector('.speed-icon');
    if (iconEl) {
        iconEl.textContent = formatSpeedIcon(state.speedMultiplier);
    }

    const costEl = target.querySelector('.price-tag');
    if (costEl) {
        costEl.textContent = `$${state.speedUpgradeCost}`;
    }

    const canAfford = state.money >= state.speedUpgradeCost;
    updateButtonAffordability(target, state.speedUpgradeCost, canAfford);
}

function createSpeedUpgradeButton() {
    const btn = document.createElement('button');
    btn.className = 'tool-btn speed-toggle';
    btn.id = 'speed-button';
    btn.innerHTML = `
        <div class="speed-icon">${formatSpeedIcon(state.speedMultiplier)}</div>
        <span>Speed</span>
        <span class="price-tag">$${state.speedUpgradeCost}</span>
    `;

    updateSpeedButtonLabel(btn);

    btn.addEventListener('click', () => {
        if (state.money < state.speedUpgradeCost) {
            const cx = Math.floor(state.cols / 2);
            const cy = Math.floor(state.rows / 2);
            spawnFloatingText(cx, cy, `Need $${state.speedUpgradeCost}!`);
            Sound.play('error');
            return;
        }

        state.money -= state.speedUpgradeCost;
        els.money.innerText = state.money;
        state.speedMultiplier = Math.round((state.speedMultiplier + 0.1) * 10) / 10;
        state.speedUpgradeCost *= 2;

        spawnFloatingText(Math.floor(state.cols / 2), Math.floor(state.rows / 2), `Speed ${formatSpeedIcon(state.speedMultiplier)}!`);
        Sound.play('unlock');
        updateSpeedButtonLabel(btn);
    });

    return btn;
}

function setupSpeedControls() {
    updateSpeedButtonLabel();
}
