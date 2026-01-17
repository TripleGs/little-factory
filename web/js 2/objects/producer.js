/* --- Helper Functions --- */
function getRandomIcon() {
    const availableIcons = COLOR_CONFIG.availableIcons.filter(icon => !state.usedIcons.has(icon));
    if (availableIcons.length === 0) {
        // If all icons used, allow reuse
        return COLOR_CONFIG.availableIcons[Math.floor(Math.random() * COLOR_CONFIG.availableIcons.length)];
    }
    const randomIcon = availableIcons[Math.floor(Math.random() * availableIcons.length)];
    state.usedIcons.add(randomIcon);
    return randomIcon;
}

function unlockNewProducer() {
    const newIcon = getRandomIcon();
    const newType = {
        id: state.producerTypes.length,
        icon: `<i class="${newIcon}"></i>`,
        name: `Producer ${state.producerTypes.length + 1}`
    };
    state.producerTypes.push(newType);
    state.selectedProducerType = newType.id;

    // Auto-spawn a locked seller for this producer type
    const sellerPlacement = spawnLockedSeller(newType.id);

    return { type: newType, sellerPlacement };
}

function spawnLockedSeller(producerTypeId) {
    const spot = findEmptyCell();
    if (!spot) {
        // Grid is full, notify user
        spawnFloatingText(Math.floor(state.cols / 2), Math.floor(state.rows / 2), 'No room for seller!');
        return null;
    }

    const { x, y } = spot;
    const tile = {
        type: 'seller',
        rotation: 0,
        locked: true,
        producerType: producerTypeId
    };
    state.grid[y][x] = tile;

    renderCell(x, y, state.grid[y][x]);
    spawnFloatingText(x, y, 'New Seller!');

    return { x, y, tile };
}

function findEmptyCell() {
    const emptyCells = [];

    for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
            if (!state.grid[y][x] || state.grid[y][x].type === null) {
                emptyCells.push({ x, y });
            }
        }
    }

    if (emptyCells.length > 0) {
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
    return null;
}

/* --- Game Loop --- */
function spawnItemsFromProducers() {
    const nextItems = [];
    for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
            if (state.grid[y][x].type === 'producer') {
                spawnItem(x, y, nextItems);
            }
        }
    }
    // Add newly spawned items to state
    state.items.push(...nextItems);
}

function spawnItem(px, py, list) {
    const pRot = state.grid[py][px].rotation;
    const tx = px + DX[pRot];
    const ty = py + DY[pRot];

    const target = getTile(tx, ty);
    if (!target || (target.type !== 'belt' && target.type !== 'colorer' &&
                    target.type !== 'jumper' && target.type !== 'packager' &&
                    target.type !== 'stopper')) return;

    // Get the producer's type to determine which icon to use
    const producerTile = state.grid[py][px];
    const producerTypeId = producerTile.producerType ?? 0;
    const itemIcon = state.producerTypes[producerTypeId]?.icon || CONFIG.icons.item;

    // Check if location is occupied
    if (isLocationOccupied(tx, ty, list)) return;

    // Check if there's a package at the spawn location
    const existingPackage = state.items.find(i => i.x === tx && i.y === ty && i.isPackaged);
    if (existingPackage) {
        // Check if types match
        const packageType = existingPackage.packagedItems[0]?.producerType;
        if (packageType === producerTypeId) {
            // Add to existing package instead of spawning
            const newItem = createItem(tx, ty, itemIcon, producerTypeId);
            mergeIntoPackage(existingPackage, newItem);
            spawnFloatingText(tx, ty, `+1 (x${existingPackage.packageCount})`);
            return;
        } else {
            // Type mismatch - can't spawn
            return;
        }
    }

    if (isLocationOccupied(tx, ty, state.items)) return;

    list.push(createItem(tx, ty, itemIcon, producerTypeId));
}
