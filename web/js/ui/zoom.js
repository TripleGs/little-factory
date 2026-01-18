/* --- Window Sizing & Zoom --- */
function calculateOptimalGridSize() {
    // Get available space (window height minus header and controls)
    const header = document.querySelector('header');
    const controls = document.getElementById('controls-overlay');

    const headerHeight = header ? header.offsetHeight : 60;
    const controlsHeight = controls ? controls.offsetHeight : 100;
    const padding = 40; // Extra padding

    const availableWidth = window.innerWidth - padding;
    const availableHeight = window.innerHeight - headerHeight - controlsHeight - padding;

    // Calculate cell size that fits the grid
    const cellSizeByWidth = Math.floor(availableWidth / state.cols) - 1; // -1 for border
    const cellSizeByHeight = Math.floor(availableHeight / state.rows) - 1;

    // Use the smaller of the two to ensure everything fits
    state.cellSize = Math.min(cellSizeByWidth, cellSizeByHeight, 80); // Max 80px
    state.cellSize = Math.max(state.cellSize, 40); // Min 40px
}

function applyZoom() {
    // Recalculate grid size based on zoom level
    calculateOptimalGridSize();

    // Apply zoom multiplier to cell size
    const baseSize = state.cellSize;
    state.cellSize = Math.round(baseSize * state.zoomLevel);

    // Rebuild the grid with new cell size
    setupGrid(true); // Preserve state
    renderAllCells();
    if (state.gameMode === 'multi' && typeof Lobby !== 'undefined') {
        Lobby.restoreRemoteCursors();
    }

    showZoomIndicator();
}

function zoomIn() {
    const oldZoom = state.zoomLevel;
    state.zoomLevel = Math.min(state.zoomLevel + state.zoomStep, state.maxZoom);

    if (oldZoom !== state.zoomLevel) {
        applyZoom();
    }
}

function zoomOut() {
    const oldZoom = state.zoomLevel;
    state.zoomLevel = Math.max(state.zoomLevel - state.zoomStep, state.minZoom);

    if (oldZoom !== state.zoomLevel) {
        applyZoom();
    }
}

function resetZoom() {
    state.zoomLevel = 1.0;
    applyZoom();
}

function showZoomIndicator() {
    // Remove existing indicator
    const existing = document.querySelector('.zoom-indicator');
    if (existing) existing.remove();

    // Create new indicator
    const indicator = document.createElement('div');
    indicator.className = 'zoom-indicator';
    indicator.textContent = `${Math.round(state.zoomLevel * 100)}%`;
    document.body.appendChild(indicator);

    // Remove after 1 second
    setTimeout(() => indicator.remove(), 1000);
}

function setupZoomControls() {
    document.addEventListener('keydown', (e) => {
        // Check for = or + (zoom in)
        if (e.key === '=' || e.key === '+') {
            e.preventDefault();
            zoomIn();
        }
        // Check for - (zoom out)
        else if (e.key === '-' || e.key === '_') {
            e.preventDefault();
            zoomOut();
        }
        // Check for 0 (reset zoom)
        else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            resetZoom();
        }
    });
}

function setupWindowResize() {
    window.addEventListener('resize', () => {
        calculateOptimalGridSize();
        const baseSize = state.cellSize;
        state.cellSize = Math.round(baseSize * state.zoomLevel);
        setupGrid(true); // Preserve state when resizing
        renderAllCells();
        if (state.gameMode === 'multi' && typeof Lobby !== 'undefined') {
            Lobby.restoreRemoteCursors();
        }
    });
}
