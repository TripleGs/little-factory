function updateBeltVisuals(blockedBelts) {
    // Iterate over all visible cells to update paused state
    // This is more efficient than iterating all grid cells if we have a way to query belts,
    // but iterating grid is acceptable for 5x5 to 20x20
    for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
            const cell = els.grid.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
            if (!cell) continue;

            const beltObj = cell.querySelector('.object.belt, .object.colorer, .object.jumper, .object.packager');
            if (beltObj) {
                if (blockedBelts.has(`${x},${y}`)) {
                    beltObj.classList.add('paused');
                } else {
                    beltObj.classList.remove('paused');
                }
            }
        }
    }
}
