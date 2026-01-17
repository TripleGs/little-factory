function moveAndProcessAllItems() {
    // Phase 1: Preparation & Intent Calculation
    const itemMap = new Map(); // coords -> array of items

    // Initialize item map and resets (store arrays to handle overlaps)
    state.items.forEach(item => {
        const key = `${item.x},${item.y}`;
        if (!itemMap.has(key)) {
            itemMap.set(key, []);
        }
        itemMap.get(key).push(item);
        item.lastX = item.x;
        item.lastY = item.y;
        item._intendedMove = null;
    });

    // Calculate intents
    state.items.forEach(item => {
        if (item.justSpawned) {
            item.justSpawned = false;
            item._intendedMove = { type: 'stay' };
            return;
        }

        item._intendedMove = calculateItemIntent(item, itemMap);
    });

    // Phase 2: Resolve Collisions
    const movingItems = new Set();
    const checkedItems = new Set();
    const recursionStack = new Set();
    const claimedTargets = new Set(); // Track destinations claimed by successful movers

    function canMove(item) {
        if (checkedItems.has(item)) return movingItems.has(item);
        if (recursionStack.has(item)) {
            // Cycle detected - treat as blocked
            return false;
        }

        const intent = item._intendedMove;
        if (!intent) return false;

        if (intent.type === 'remove') {
            movingItems.add(item);
            checkedItems.add(item);
            return true;
        }

        if (intent.type === 'package') {
            // Both items will be removed and replaced with one package
            movingItems.add(item);
            checkedItems.add(item);
            return true;
        }

        if (intent.type === 'stay') {
            checkedItems.add(item);
            return false;
        }

        // Intent is move(x,y)
        recursionStack.add(item);

        const targetKey = `${intent.x},${intent.y}`;
        const targetTile = getTile(intent.x, intent.y);
        const isSeller = targetTile && targetTile.type === 'seller';
        
        const blockers = itemMap.get(targetKey) || [];

        let blockersMoved = true;
        if (!isSeller) {
            for (const blocker of blockers) {
                if (blocker === item) continue;
                if (!canMove(blocker)) {
                    blockersMoved = false;
                    break;
                }
            }
        }

        recursionStack.delete(item);

        if (blockersMoved) {
            // Check if this specific target is already claimed by another Mover this tick
            // (e.g. two items converging on the same empty tile)
            if (!isSeller && claimedTargets.has(targetKey)) {
                checkedItems.add(item);
                return false;
            }

            // Success - Claim the target
            claimedTargets.add(targetKey);
            movingItems.add(item);
            checkedItems.add(item);
            return true;
        } else {
            checkedItems.add(item);
            return false;
        }
    }

    state.items.forEach(item => {
        if (item._intendedMove.type === 'move') {
            canMove(item);
        } else if (item._intendedMove.type === 'remove') {
            movingItems.add(item);
        } else if (item._intendedMove.type === 'package') {
            canMove(item);
        }
    });

    // Phase 3: Apply
    const remainingItems = [];
    const blockedBelts = new Set();
    const packagesToCreate = [];

    state.items.forEach(item => {
        const intent = item._intendedMove;

        if (intent.type === 'remove') {
            return;
        }

        if (intent.type === 'package' && movingItems.has(item)) {
            packagesToCreate.push({ item, target: intent.target });
            return; // Don't add to remainingItems yet
        }

        if (intent.type === 'move' && movingItems.has(item)) {
            handleItemMove(item, intent.x, intent.y);

            // Check if moved onto a stopper
            const newTile = getTile(item.x, item.y);
            if (newTile && newTile.type === 'stopper') {
                markItemStopped(item);
            }
        } else {
            // Blocked or Staying
            const tile = getTile(item.x, item.y);
            if (tile && (tile.type === 'belt' || tile.type === 'colorer' ||
                         tile.type === 'jumper' || tile.type === 'packager')) {
                blockedBelts.add(`${item.x},${item.y}`);
            }

            // Check if blocked item should merge with blocker
            if (intent.type === 'move') {
                const packageTarget = shouldPackage(item, itemMap);
                if (packageTarget) {
                    // Mark item as merging and let it move toward target
                    item._merging = true;
                    item._mergeTarget = packageTarget;
                    handleItemMove(item, intent.x, intent.y); // Move toward target
                }
            }
        }

        remainingItems.push(item);
        delete item._intendedMove;
    });

    // Check for items that have finished merging (overlapping with target)
    const toRemove = [];
    remainingItems.forEach(item => {
        if (item._merging && item._mergeTarget) {
            // Check if item has reached the target position
            if (item.x === item._mergeTarget.x && item.y === item._mergeTarget.y) {
                // Merge into target
                mergeIntoPackage(item._mergeTarget, item);
                toRemove.push(item);
            }
        }
    });

    // Remove merged items
    toRemove.forEach(item => {
        const idx = remainingItems.indexOf(item);
        if (idx !== -1) {
            remainingItems.splice(idx, 1);
        }
    });

    // Process packaging operations - avoid duplicates
    console.log('Packages to create:', packagesToCreate.length);
    const processedItems = new Set();

    packagesToCreate.forEach(({ item, target }) => {
        // Skip if either item was already packaged
        if (processedItems.has(item.id) || processedItems.has(target.id)) {
            console.log('Skipping duplicate package:', item.id, target.id);
            return;
        }

        console.log('Creating package from:', {
            itemId: item.id,
            itemPos: `${item.x},${item.y}`,
            targetId: target.id,
            targetPos: `${target.x},${target.y}`
        });

        // Mark both items as processed
        processedItems.add(item.id);
        processedItems.add(target.id);

        // Merge item into target (modify target in-place)
        mergeIntoPackage(target, item);

        // Remove only the moving item from remainingItems
        const itemIndex = remainingItems.indexOf(item);
        if (itemIndex !== -1) {
            remainingItems.splice(itemIndex, 1);
        }

        // Target stays in remainingItems and continues to exist

    });

    // Phase 4: Visuals
    updateBeltVisuals(blockedBelts);

    state.items = remainingItems;
}

function processItemMovement(item) {
    // Deprecated in favor of batch processing
    return item;
}

function calculateItemIntent(item, itemMap) {
    // Check if item is stopped by a stopper
    if (applyStopperState(item)) {
        return { type: 'stay' };
    }

    const tile = getTile(item.x, item.y);
    const moveDir = determineItemDirection(item, tile);

    if (moveDir === -2) {
        return { type: 'remove' };
    }

    if (moveDir === -1) {
        return { type: 'stay' };
    }

    const { nextX, nextY, consumed } = calculateNextPosition(item, moveDir);

    if (consumed) {
        return { type: 'remove' };
    }

    // If can't move (same position), stay and show belt as blocked
    if (nextX === item.x && nextY === item.y) {
        return { type: 'stay' };
    }

    return { type: 'move', x: nextX, y: nextY };
}

function determineItemDirection(item, tile) {
    if (!tile) return -1;

    if (tile.type === 'belt') {
        return tile.rotation;
    } else if (tile.type === 'packager') {
        handlePackaging(item, tile);
        return tile.rotation;
    } else if (tile.type === 'stopper') {
        return tile.rotation;
    } else if (tile.type === 'jumper') {
        // Mark item as jumping and return direction (will jump 2 cells instead of 1)
        markItemJumping(item);
        return tile.rotation;
    } else if (tile.type === 'colorer') {
        handleColorMixing(item, tile);
        return tile.rotation;
    } else if (tile.type === 'seller') {
        // Item is on a seller - mark it for selling
        if (!item.onSeller) {
            item.onSeller = true; // First tick on seller
            return -1; // Don't move, stay visible
        } else {
            // Second tick on seller - sell or trash now
            // Check if this is a product-specific seller
            if (tile.producerType !== undefined) {
                // For packages, check the first packaged item's type
                const checkType = item.isPackaged && item.packagedItems.length > 0
                    ? item.packagedItems[0].producerType
                    : item.producerType;

                if (checkType === tile.producerType) {
                    sellItem(item.x, item.y, item);
                } else {
                    // Trash the item (no money)
                    spawnFloatingText(item.x, item.y, "Trashed!");
                }
            } else {
                // Generic seller accepts all
                sellItem(item.x, item.y, item);
            }
            return -2; // Special value to indicate item should be removed
        }
    }

    return -1;
}

function calculateNextPosition(item, moveDir) {
    // Check if item is jumping (from a jumper belt)
    const jumpDistance = consumeJumpFlag(item);

    const tx = item.x + DX[moveDir] * jumpDistance;
    const ty = item.y + DY[moveDir] * jumpDistance;

    if (!isValid(tx, ty)) {
        return { nextX: item.x, nextY: item.y, consumed: false };
    }

    const target = getTile(tx, ty);

    if (target.type === 'seller') {
        // Don't move to seller if we have a pending color change - stay on colorer one more tick
        if (item.pendingColor && !item.colorChangeApplied) {
            return { nextX: item.x, nextY: item.y, consumed: false };
        }

        // Move onto the seller tile
        return { nextX: tx, nextY: ty, consumed: false };
    }

    if (target.type === 'belt' || target.type === 'colorer' || target.type === 'jumper' ||
        target.type === 'packager' || target.type === 'stopper') {
        return { nextX: tx, nextY: ty, consumed: false };
    }

    return { nextX: item.x, nextY: item.y, consumed: false };
}

function handleItemMove(item, nextX, nextY) {
    if (!item.visitedPositions) {
        item.visitedPositions = new Set();
    }

    const posKey = `${nextX},${nextY}`;

    // Handle loop detection
    if (nextX !== item.x || nextY !== item.y) {
        if (item.visitedPositions.has(posKey)) {
            resetItemLoopTracking(item);
        }
        item.visitedPositions.add(posKey);
    }

    // Move item
    item.x = nextX;
    item.y = nextY;
    item.justSpawned = false;
}

function resetItemLoopTracking(item) {
    // Reset all tracking when item completes a loop
    item.discoveredOnThisPass = new Set();
    item.visitedPositions = new Set();
    item.paintedBy = new Set();
}
