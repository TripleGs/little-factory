function setupGrid(preserveState = false) {
    // Cell size is already calculated by calculateOptimalGridSize()
    // Update CSS variable
    document.documentElement.style.setProperty('--cell-size', `${state.cellSize}px`);

    els.grid.style.gridTemplateColumns = `repeat(${state.cols}, ${state.cellSize}px)`;
    els.grid.innerHTML = '';

    // Create Expansion Buttons
    createExpansionButtons();

    els.grid.appendChild(els.itemLayer);

    if (!preserveState) {
        state.grid = [];
        state.items = [];
        state.nextId = 0;

        for (let y = 0; y < state.rows; y++) {
            const row = [];
            for (let x = 0; x < state.cols; x++) {
                row.push({ type: null, rotation: 0, color: null });
                createCell(x, y);
            }
            state.grid.push(row);
        }
    } else {
        // Just re-render cells for existing grid
        for (let y = 0; y < state.rows; y++) {
            for (let x = 0; x < state.cols; x++) {
                createCell(x, y);
                // Re-render content
                const tile = state.grid[y][x];
                if (tile && tile.type) {
                    renderCell(x, y, tile);
                }
            }
        }
    }
}

function createCell(x, y) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.x = x;
    cell.dataset.y = y;
    cell.style.width = `${state.cellSize}px`;
    cell.style.height = `${state.cellSize}px`;

    const interact = () => handleInput(x, y);
    cell.onmousedown = interact;
    cell.onmouseenter = (e) => { if (e.buttons === 1) interact(); };

    els.grid.appendChild(cell);
}

function renderAllCells() {
    for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
            renderCell(x, y, state.grid[y][x]);
        }
    }
}
