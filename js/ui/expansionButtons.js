function createExpansionButtons() {
    // Add Row Button (Bottom)
    const addRowBtn = document.createElement('button');
    addRowBtn.className = 'expand-btn row-btn bottom';
    addRowBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';

    addRowBtn.onmouseenter = (e) => {
        const cost = 250 * (state.expansions + 1);
        showTooltip(addRowBtn, `Add Row Bottom ($${cost})`);
        addRowBtn.style.zIndex = '100';
    };
    addRowBtn.onmouseleave = () => {
        hideTooltip();
        addRowBtn.style.zIndex = '';
    };
    addRowBtn.onclick = () => {
        Sound.play('click');
        hideTooltip();
        expandGrid('row-bottom');
    };

    els.grid.appendChild(addRowBtn);

    // Add Row Button (Top)
    const addRowTopBtn = document.createElement('button');
    addRowTopBtn.className = 'expand-btn row-btn top';
    addRowTopBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';

    addRowTopBtn.onmouseenter = (e) => {
        const cost = 250 * (state.expansions + 1);
        showTooltip(addRowTopBtn, `Add Row Top ($${cost})`);
        addRowTopBtn.style.zIndex = '100';
    };
    addRowTopBtn.onmouseleave = () => {
        hideTooltip();
        addRowTopBtn.style.zIndex = '';
    };
    addRowTopBtn.onclick = () => {
        Sound.play('click');
        hideTooltip();
        expandGrid('row-top');
    };

    els.grid.appendChild(addRowTopBtn);

    // Add Col Button (Right)
    const addColBtn = document.createElement('button');
    addColBtn.className = 'expand-btn col-btn right';
    addColBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';

    addColBtn.onmouseenter = (e) => {
        const cost = 250 * (state.expansions + 1);
        showTooltip(addColBtn, `Add Col Right ($${cost})`);
        addColBtn.style.zIndex = '100';
    };
    addColBtn.onmouseleave = () => {
        hideTooltip();
        addColBtn.style.zIndex = '';
    };
    addColBtn.onclick = () => {
        Sound.play('click');
        hideTooltip();
        expandGrid('col-right');
    };

    els.grid.appendChild(addColBtn);

    // Add Col Button (Left)
    const addColLeftBtn = document.createElement('button');
    addColLeftBtn.className = 'expand-btn col-btn left';
    addColLeftBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';

    addColLeftBtn.onmouseenter = (e) => {
        const cost = 250 * (state.expansions + 1);
        showTooltip(addColLeftBtn, `Add Col Left ($${cost})`);
        addColLeftBtn.style.zIndex = '100';
    };
    addColLeftBtn.onmouseleave = () => {
        hideTooltip();
        addColLeftBtn.style.zIndex = '';
    };
    addColLeftBtn.onclick = () => {
        Sound.play('click');
        hideTooltip();
        expandGrid('col-left');
    };

    els.grid.appendChild(addColLeftBtn);
}

function shiftItems(dx, dy) {
    if (!dx && !dy) return;
    state.items.forEach(item => {
        item.x += dx;
        item.y += dy;
        if (Number.isFinite(item.lastX)) {
            item.lastX += dx;
        }
        if (Number.isFinite(item.lastY)) {
            item.lastY += dy;
        }
    });
}

function applyGridExpansion(type) {
    const normalizedType = type || 'row-bottom';

    if (normalizedType === 'row-top') {
        state.rows++;
        const newRow = [];
        for (let x = 0; x < state.cols; x++) {
            newRow.push({ type: null, rotation: 0, color: null });
        }
        state.grid.unshift(newRow);
        shiftItems(0, 1);
    } else if (normalizedType === 'row-bottom' || normalizedType === 'row') {
        state.rows++;
        const newRow = [];
        for (let x = 0; x < state.cols; x++) {
            newRow.push({ type: null, rotation: 0, color: null });
        }
        state.grid.push(newRow);
    } else if (normalizedType === 'col-left') {
        state.cols++;
        for (let y = 0; y < state.rows; y++) {
            state.grid[y].unshift({ type: null, rotation: 0, color: null });
        }
        shiftItems(1, 0);
    } else {
        // Default to right-side expansion for backwards compatibility
        state.cols++;
        for (let y = 0; y < state.rows; y++) {
            state.grid[y].push({ type: null, rotation: 0, color: null });
        }
    }

    setupGrid(true); // Re-render preserving data
}

function expandGrid(type) {
    const cost = 250 * (state.expansions + 1);
    if (state.money >= cost) {
        state.money -= cost;
        els.money.innerText = state.money;
        state.expansions++;
        Sound.play('unlock');
        applyGridExpansion(type);
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
