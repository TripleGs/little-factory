function getTile(x, y) {
    if (!isValid(x, y)) return null;
    return state.grid[y][x];
}

function isValid(x, y) {
    return x >= 0 && x < state.cols && y >= 0 && y < state.rows;
}

function isLocationOccupied(x, y, items) {
    return items.some(i => i.x === x && i.y === y);
}
