/* --- Initialization --- */

// Main entry point - show menu first
function startApp() {
    Menu.init();
    Menu.show();
}

// Initialize the game (called after menu selection)
function initGame() {
    state.colorManager = new ColorManager(COLOR_CONFIG);

    // Set starting money based on game mode
    if (state.gameMode === 'single') {
        state.money = COLOR_CONFIG.starting.money;
    } else {
        // In multiplayer, money comes from player object
        const localPlayer = state.players.find(p => p.id === state.localPlayerId);
        state.money = localPlayer ? localPlayer.money : COLOR_CONFIG.starting.money;
    }

    els.money.innerText = state.money;

    // Unlock starting colors (only if not already set by host)
    if (state.unlockedColors.size === 0) {
        COLOR_CONFIG.starting.colors.forEach(color => {
            state.unlockedColors.add(color.id);
        });
    }

    state.toolData = BASE_TOOLS[0];

    // Setup window sizing
    calculateOptimalGridSize();
    setupGrid(); // Initialize grid BEFORE unlocking producers (which spawn sellers)

    // Check if we have a pending grid from the host (multiplayer joiner)
    if (state._pendingGrid) {
        // Apply the host's grid state
        for (let y = 0; y < state.rows; y++) {
            for (let x = 0; x < state.cols; x++) {
                if (state._pendingGrid[y] && state._pendingGrid[y][x]) {
                    state.grid[y][x] = state._pendingGrid[y][x];
                    renderCell(x, y, state.grid[y][x]);
                }
            }
        }
        delete state._pendingGrid;
    } else if (state.producerTypes.length === 0) {
        // Only initialize producer if not already set (single player or host)
        unlockNewProducer();
    }

    renderPalette();
    setupControls();
    setupPaletteHoverBehavior();
    setupZoomControls();
    setupWindowResize();
    setupSpeedControls();

    els.grid.appendChild(els.itemLayer);
    applyZoom();
    requestAnimationFrame(loop);
}

// Start the app when DOM is ready
startApp();
