function createExpansionButtons() {
    // Add Row Button (Bottom)
    const addRowBtn = document.createElement('button');
    addRowBtn.className = 'expand-btn row-btn';
    addRowBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';

    addRowBtn.onmouseenter = (e) => {
        const cost = 250 * (state.expansions + 1);
        showTooltip(addRowBtn, `Add Row ($${cost})`);
        // Ensure button doesn't block other UI
        addRowBtn.style.zIndex = '100';
    };
    addRowBtn.onmouseleave = () => {
        hideTooltip();
        addRowBtn.style.zIndex = '';
    };
    addRowBtn.onclick = () => {
        Sound.play('click');
        hideTooltip();
        expandGrid('row');
    };

    els.grid.appendChild(addRowBtn);

    // Add Col Button (Right)
    const addColBtn = document.createElement('button');
    addColBtn.className = 'expand-btn col-btn';
    addColBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';

    addColBtn.onmouseenter = (e) => {
        const cost = 250 * (state.expansions + 1);
        showTooltip(addColBtn, `Add Col ($${cost})`);
        addColBtn.style.zIndex = '100';
    };
    addColBtn.onmouseleave = () => {
        hideTooltip();
        addColBtn.style.zIndex = '';
    };
    addColBtn.onclick = () => {
        Sound.play('click');
        hideTooltip();
        expandGrid('col');
    };

    els.grid.appendChild(addColBtn);
}

function expandGrid(type) {
    const cost = 250 * (state.expansions + 1);
    if (state.money >= cost) {
        state.money -= cost;
        els.money.innerText = state.money;
        state.expansions++;
        Sound.play('unlock');

        if (type === 'row') {
            state.rows++;
            const newRow = [];
            for (let x = 0; x < state.cols; x++) {
                newRow.push({ type: null, rotation: 0, color: null });
            }
            state.grid.push(newRow);
        } else {
            state.cols++;
            // Add null cell to each existing row
            for (let y = 0; y < state.rows; y++) {
                state.grid[y].push({ type: null, rotation: 0, color: null });
            }
        }

        setupGrid(true); // Re-render preserving data
        spawnFloatingText(0, 0, "Expanded!");
        if (typeof Achievements !== 'undefined') {
            Achievements.onGridExpanded();
        }

        // Broadcast expansion to other players in multiplayer
        if (state.gameMode === 'multi') {
            const localPlayer = state.players.find(p => p.id === state.localPlayerId);
            if (localPlayer) {
                localPlayer.money = state.money;
            }
            Sync.broadcastGridExpanded(type);
            Sync.broadcastMoneyUpdate();
            if (typeof Lobby !== 'undefined') {
                Lobby.refreshMoneyDisplay();
                Lobby.restoreRemoteCursors();
            }
        }
    } else {
        // Show error somewhere?
        const cx = Math.floor(state.cols / 2);
        const cy = Math.floor(state.rows / 2);
        spawnFloatingText(cx, cy, `Need $${cost}!`);
        Sound.play('error');
    }
}
