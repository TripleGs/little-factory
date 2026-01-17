// Cost Calculation Functions
function countEntitiesOfType(type) {
    let count = 0;
    for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
            if (state.grid[y][x] && state.grid[y][x].type === type) {
                count++;
            }
        }
    }
    return count;
}

function calculatePaintCost(colorObject) {
    const mixLevel = colorObject.mixLevel || 0;
    const baseCost = COLOR_CONFIG.palette.colorBaseCost + (mixLevel * COLOR_CONFIG.palette.costPerLevel);

    // Count how many colorers with this specific color have been placed
    const colorId = state.colorManager.generateColorId(colorObject);
    let count = 0;
    for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
            const tile = state.grid[y][x];
            if (tile && tile.type === 'colorer' && tile.color) {
                const tileColorId = state.colorManager.generateColorId(tile.color);
                if (tileColorId === colorId) {
                    count++;
                }
            }
        }
    }

    return baseCost * (count + 1);
}

function getToolCost(toolId) {
    if (toolId === 'paint') {
        if (state.subTool) {
            return calculatePaintCost(state.subTool);
        }
        return COLOR_CONFIG.palette.colorBaseCost;
    }

    const baseCost = COLOR_CONFIG.costs[toolId] || 0;

    if (toolId === 'producer' || toolId === 'seller') {
        const countType = toolId;
        const existingCount = countEntitiesOfType(countType);
        return baseCost * (existingCount + 1);
    }

    if (toolId === 'belt' || toolId === 'packager' || toolId === 'stopper') {
        const existingCount = countEntitiesOfType(toolId);
        return baseCost * (existingCount + 1);
    }

    return baseCost;
}
