const PLACEMENT_COST_MULTIPLIER = 1.5;

function createEmptyProgression() {
    return {
        placementCounts: {},
        expansions: 0,
        newProducerPurchases: 0
    };
}

function normalizeProgression(progression) {
    const safeProgression = progression && typeof progression === 'object'
        ? progression
        : createEmptyProgression();

    if (!safeProgression.placementCounts || typeof safeProgression.placementCounts !== 'object') {
        safeProgression.placementCounts = {};
    }

    safeProgression.expansions = Math.max(0, Number(safeProgression.expansions) || 0);
    safeProgression.newProducerPurchases = Math.max(0, Number(safeProgression.newProducerPurchases) || 0);
    return safeProgression;
}

function ensurePlayerProgression(playerId = state.localPlayerId) {
    if (!playerId) return null;

    const player = state.players.find((entry) => entry.id === playerId);
    if (!player) return null;

    player.progression = normalizeProgression(player.progression);
    return player.progression;
}

function syncLocalProgressionToPlayerRecord() {
    const progression = ensurePlayerProgression();
    if (!progression) return;

    progression.placementCounts = { ...state.placementCounts };
    progression.expansions = state.expansions;
    progression.newProducerPurchases = state.newProducerPurchases;
}

function updatePlayerProgression(playerId, progression) {
    if (!playerId || !progression) return;

    const playerProgression = ensurePlayerProgression(playerId);
    if (!playerProgression) return;

    const safeProgression = normalizeProgression(progression);
    playerProgression.placementCounts = { ...safeProgression.placementCounts };
    playerProgression.expansions = safeProgression.expansions;
    playerProgression.newProducerPurchases = safeProgression.newProducerPurchases;

    if (playerId === state.localPlayerId) {
        state.expansions = playerProgression.expansions;
        state.newProducerPurchases = playerProgression.newProducerPurchases;
    }
}

function applyLocalEconomyProgression(progression) {
    const safeProgression = normalizeProgression(progression);
    state.placementCounts = { ...safeProgression.placementCounts };
    state.expansions = safeProgression.expansions;
    state.newProducerPurchases = safeProgression.newProducerPurchases;
    syncLocalProgressionToPlayerRecord();
}

function captureLocalProgression() {
    syncLocalProgressionToPlayerRecord();
    return {
        placementCounts: { ...state.placementCounts },
        expansions: state.expansions,
        newProducerPurchases: state.newProducerPurchases
    };
}

function getPlacementKey(toolId, options = {}) {
    if (toolId === 'paint' || toolId === 'colorer') {
        const colorId = options.colorId
            || options.color?.id
            || options.tile?.color?.id
            || state.subTool?.id
            || 'default';
        return `colorer:${colorId}`;
    }

    if (toolId === 'producer') {
        const producerTypeId = options.producerTypeId
            ?? options.tile?.producerType
            ?? state.selectedProducerType
            ?? 0;
        return `producer:${producerTypeId}`;
    }

    return toolId;
}

function getPlacementCount(key) {
    return state.placementCounts[key] || 0;
}

function incrementPlacementCount(toolId, tile) {
    const key = getPlacementKey(toolId, { tile });
    state.placementCounts[key] = getPlacementCount(key) + 1;
    syncLocalProgressionToPlayerRecord();
}

function decrementPlacementCount(tile) {
    if (!tile || !tile.type) return;
    const key = getPlacementKey(tile.type, { tile });
    const current = getPlacementCount(key);
    if (current > 0) {
        const nextCount = current - 1;
        if (nextCount === 0) {
            delete state.placementCounts[key];
        } else {
            state.placementCounts[key] = nextCount;
        }
    }
    syncLocalProgressionToPlayerRecord();
}

function rebuildLocalPlacementCounts() {
    const placementCounts = {};

    for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
            const tile = state.grid[y]?.[x];
            if (!tile || !tile.type || tile.placedBy !== state.localPlayerId) continue;

            const key = getPlacementKey(tile.type, { tile });
            placementCounts[key] = (placementCounts[key] || 0) + 1;
        }
    }

    state.placementCounts = placementCounts;
    syncLocalProgressionToPlayerRecord();
}

function restoreLocalEconomyProgression() {
    const playerProgression = ensurePlayerProgression();
    applyLocalEconomyProgression(playerProgression || createEmptyProgression());
    rebuildLocalPlacementCounts();
}

function scalePlacementCost(baseCost, count) {
    return Math.round(baseCost * Math.pow(PLACEMENT_COST_MULTIPLIER, count) * 100) / 100;
}

function calculatePaintCost(colorObject) {
    const mixLevel = colorObject.mixLevel || 0;
    const baseCost = COLOR_CONFIG.palette.colorBaseCost + (mixLevel * COLOR_CONFIG.palette.costPerLevel);
    const key = getPlacementKey('paint', { color: colorObject });
    const count = getPlacementCount(key);
    return scalePlacementCost(baseCost, count);
}

function getToolCost(toolId, options = {}) {
    if (toolId === 'paint') {
        if (options.color) return calculatePaintCost(options.color);
        if (state.subTool) return calculatePaintCost(state.subTool);
        return COLOR_CONFIG.palette.colorBaseCost;
    }

    const baseCost = COLOR_CONFIG.costs[toolId] || 0;
    if (baseCost === 0) return 0;

    const key = getPlacementKey(toolId, options);
    const count = getPlacementCount(key);

    return scalePlacementCost(baseCost, count);
}

function getExpansionCost() {
    // Doubling: 250, 500, 1000, 2000...
    return 250 * Math.pow(2, state.expansions);
}

function getNewProducerCost() {
    return COLOR_CONFIG.costs.newProducer * Math.pow(2, state.newProducerPurchases);
}
