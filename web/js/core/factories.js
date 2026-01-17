// Item Creation Factory
function createItem(x, y, icon, producerType) {
    return {
        id: state.nextId++,
        x, y,
        lastX: x,
        lastY: y,
        justSpawned: true,
        color: { ...COLOR_CONFIG.starting.itemColor },
        mixLevel: 0,
        icon,
        producerType, // Track which producer spawned this item
        discoveredOnThisPass: new Set(),
        visitedPositions: new Set(),
        paintedBy: new Set(),
        // Package tracking
        isPackaged: false,
        packagedItems: [],
        packageCount: 1,
        packagedBy: new Set()
    };
}

// Tile Creation Factory
function createTile(toolType, rotation, toolData) {
    const tile = {
        type: toolType,
        rotation: rotation
    };

    if (toolType === 'colorer') {
        tile.color = { ...toolData.color };
    } else if (toolType === 'producer') {
        tile.producerType = toolData.producerType ?? 0;
    }

    return tile;
}
