/* --- Interaction & Rendering --- */
/* --- Input Handling --- */
function handleInput(x, y) {
    // Check for pending emote placement first (multiplayer only)
    if (state.gameMode === 'multi' && typeof Lobby !== 'undefined' && Lobby.pendingEmote) {
        if (Lobby.handleGridClick(x, y)) {
            return; // Emote was placed, don't process normal input
        }
    }

    const tile = state.grid[y][x];
    if (!state.tool) return;

    if (state.tool === 'eraser') {
        handleEraser(x, y, tile);
    } else {
        handlePlacement(x, y, tile);
    }

    renderCell(x, y, tile);
}

function handleEraser(x, y, tile) {
    if (!tile.type) return;

    // Locked tiles cannot be erased
    if (tile.locked) {
        spawnFloatingText(x, y, "Locked!");
        Sound.play('error');
        return;
    }

    tile.type = null;
    tile.rotation = 0;
    tile.color = null;
    tile.producerType = null;
    tile.locked = false;

    // Remove any items at this location
    state.items = state.items.filter(i => i.x !== x || i.y !== y);

    Sound.play('erase');

    // Broadcast tile removal in multiplayer
    if (state.gameMode === 'multi') {
        Sync.broadcastTileRemoved(x, y);
    }
}

function handlePlacement(x, y, tile) {
    // Validate placement - paint tool requires a color to be selected
    if (state.tool === 'paint' && (!state.subTool || state.toolData.type !== 'colorer')) {
        spawnFloatingText(x, y, "Select a color!");
        Sound.play('error');
        return;
    }

    // Locked tiles cannot be overwritten
    if (tile.locked) {
        spawnFloatingText(x, y, "Locked!");
        Sound.play('error');
        return;
    }

    const cost = getToolCost(state.tool);
    if (cost > state.money) {
        spawnFloatingText(x, y, `Need $${cost}!`);
        Sound.play('error');
        return;
    }

    // Deduct cost and place tile
    state.money -= cost;
    els.money.innerText = state.money;

    // Update local player's money in players array and broadcast
    if (state.gameMode === 'multi') {
        const localPlayer = state.players.find(p => p.id === state.localPlayerId);
        if (localPlayer) {
            localPlayer.money = state.money;
        }
        Lobby.refreshMoneyDisplay();
        Sync.broadcastMoneyUpdate();
    }

    // Auto-delete existing tile if any
    if (tile.type !== null) {
        tile.type = null;
        tile.rotation = 0;
        tile.color = null;
        tile.producerType = null;
        state.items = state.items.filter(i => i.x !== x || i.y !== y);
    }

    placeTile(tile);
    Sound.play('place');

    // Broadcast tile placement in multiplayer
    if (state.gameMode === 'multi') {
        Sync.broadcastTilePlaced(x, y, tile);
    }

    renderPalette(); // Update affordability
}

function placeTile(tile) {
    const toolData = state.toolData;

    tile.type = toolData.type;

    // Sellers are never rotated
    if (toolData.type === 'seller') {
        tile.rotation = 0;
    } else {
        tile.rotation = state.rotation;
    }

    if (toolData.type === 'colorer') {
        tile.color = { ...toolData.color };
    } else if (toolData.type === 'producer') {
        tile.producerType = state.selectedProducerType;
    }
}

function setupControls() {
    // Rotate with right click
    els.grid.addEventListener('contextmenu', (e) => {
        e.preventDefault();

        if (state.tool === 'seller') {
            const rect = els.grid.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / state.cellSize);
            const y = Math.floor((e.clientY - rect.top) / state.cellSize);
            spawnFloatingText(x, y, "Cannot rotate!");
            return;
        }

        state.rotation = (state.rotation + 1) % 4;
        updatePreview();
    });

    // Mouse move for preview
    els.grid.addEventListener('mousemove', (e) => {
        const cell = e.target.closest('.cell');
        if (!cell) return;
        const x = parseInt(cell.dataset.x);
        const y = parseInt(cell.dataset.y);
        showPreview(x, y);
    });

    // Mouse leave to clear preview
    els.grid.addEventListener('mouseleave', () => {
        clearPreview();
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Deselect current tool
            state.tool = null;
            state.toolData = {};
            state.subTool = null;
            document.querySelectorAll('#palette .tool-btn').forEach(b => b.classList.remove('active'));
            els.subPalette.classList.remove('visible');
            clearPreview();
        } else if (e.key === 'r' || e.key === 'R') {
            // Rotate logic with checks
            if (state.tool === 'seller') {
                return;
            }
            state.rotation = (state.rotation + 1) % 4;
            updatePreview();
        }
        // Number keys for tool selection
        const num = parseInt(e.key);
        if (!isNaN(num) && num > 0 && num <= 5) {
            const btns = els.palette.querySelectorAll('.tool-btn');
            if (btns[num - 1]) btns[num - 1].click();
        }
    });
}

let lastPreviewCell = null;

function showPreview(x, y) {
    // Clear previous preview
    if (lastPreviewCell) {
        const [px, py] = lastPreviewCell;
        if (px !== x || py !== y) {
            clearPreviewCell(px, py);
        }
    }

    if (!state.tool) return; // No tool selected

    const cell = els.grid.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    const tile = state.grid[y][x];

    // For eraser, only show preview if there's content to erase
    if (state.tool === 'eraser' && !tile.type) return;

    // Remove existing preview
    const existingPreview = cell.querySelector('.preview');
    if (existingPreview) existingPreview.remove();

    if (state.tool === 'eraser') {
        // Show red overlay for eraser
        cell.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
    } else {
        // Create preview element
        const preview = document.createElement('div');
        preview.className = 'preview object ' + state.toolData.type;

        if (state.toolData.type === 'producer') {
            const producerTypeId = state.selectedProducerType || 0;
            const producerIcon = state.producerTypes && state.producerTypes[producerTypeId] ? state.producerTypes[producerTypeId].icon : CONFIG.icons.producer;

            // Container for icon and arrow
            const container = document.createElement('div');
            container.style.position = 'relative';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';

            // Icon stays upright
            const iconEl = document.createElement('div');
            iconEl.innerHTML = producerIcon;
            container.appendChild(iconEl);

            // Arrow rotates - same style as belt arrow, centered, default black color
            const arrowEl = document.createElement('div');
            arrowEl.className = 'producer-arrow';
            arrowEl.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';
            arrowEl.style.fontSize = '1.5em';
            arrowEl.style.position = 'absolute';
            arrowEl.style.zIndex = '100';
            arrowEl.style.color = 'inherit'; // Use default black

            // Apply rotation to arrow (centered, no offset)
            arrowEl.style.transform = `rotate(${state.rotation * 90}deg)`;
            container.appendChild(arrowEl);

            preview.appendChild(container);

            // Don't rotate the preview container itself for producer
            preview.style.transform = 'none';
        } else if (state.toolData.type === 'belt' || state.toolData.type === 'colorer' ||
                   state.toolData.type === 'packager' || state.toolData.type === 'stopper' ||
                   state.toolData.type === 'jumper') {
            // Belt, colorer, packager, stopper, and jumper previews with arrow indicator
            const container = document.createElement('div');
            container.style.position = 'relative';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';

            // Arrow indicator
            const arrowEl = document.createElement('div');
            arrowEl.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';
            arrowEl.style.fontSize = '1.5em';
            arrowEl.style.position = 'relative';
            arrowEl.style.zIndex = '100';

            if (state.toolData.type === 'colorer' && state.subTool) {
                const c = state.subTool;
                arrowEl.style.color = `rgb(${c.r}, ${c.g}, ${c.b})`;
            } else if (state.toolData.type === 'packager') {
                // Use same color as belt (default black) for visibility
            } else if (state.toolData.type === 'stopper') {
                arrowEl.style.color = '#dc2626';
            } else if (state.toolData.type === 'jumper') {
                arrowEl.style.color = '#7c3aed';
            }

            container.appendChild(arrowEl);
            preview.appendChild(container);
            preview.style.transform = `rotate(${state.rotation * 90}deg)`;
        } else {
            if (state.toolData.type === 'seller') {
                preview.innerHTML = buildSellerMarkup(CONFIG.icons.seller);
            }

            // Sellers should never be rotated
            if (state.toolData.type === 'seller') {
                preview.style.transform = 'none';
            } else {
                preview.style.transform = `rotate(${state.rotation * 90}deg)`;
            }
        }

        preview.style.opacity = '0.5';
        cell.appendChild(preview);
    }

    lastPreviewCell = [x, y];
}

function clearPreview() {
    if (lastPreviewCell) {
        const [x, y] = lastPreviewCell;
        clearPreviewCell(x, y);
        lastPreviewCell = null;
    }
}

function clearPreviewCell(x, y) {
    const cell = els.grid.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    if (cell) {
        const preview = cell.querySelector('.preview');
        if (preview) preview.remove();
        cell.style.backgroundColor = '';
    }
}

function updatePreview() {
    if (lastPreviewCell) {
        const [x, y] = lastPreviewCell;
        showPreview(x, y);
    }
}
