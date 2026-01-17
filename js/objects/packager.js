/* --- Packaging Logic --- */
function shouldPackage(item, itemMap) {
    // Only regular items can enter an existing package
    if (item.isPackaged) return null;

    // Check if item can merge with something ahead (creation happens in handlePackaging)
    const tile = getTile(item.x, item.y);
    if (!tile) return null;

    const moveDir = tile.rotation;
    const nextX = item.x + DX[moveDir];
    const nextY = item.y + DY[moveDir];

    if (!isValid(nextX, nextY)) return null;

    const key = `${nextX},${nextY}`;
    const blockers = itemMap.get(key) || [];

    for (const blocker of blockers) {
        if (blocker === item) continue;
        if (!blocker.isPackaged) continue;

        // Determine the types to match
        const itemType = item.producerType;
        const blockerType = blocker.packagedItems[0]?.producerType;

        // Check if colors match (items must have same color to merge)
        const itemColor = item.color;
        const blockerColor = blocker.color;
        const colorsMatch = itemColor && blockerColor &&
            itemColor.r === blockerColor.r &&
            itemColor.g === blockerColor.g &&
            itemColor.b === blockerColor.b;

        // Can merge if item matches the package type and colors match
        if (itemType === blockerType && colorsMatch) {
            console.log('Merging items:', {
                itemId: item.id,
                itemPacked: item.isPackaged,
                blockerId: blocker.id,
                blockerPacked: blocker.isPackaged
            });
            return blocker;
        }
    }

    return null;
}

function mergeIntoPackage(target, item) {
    // Merge item into target (modifies target in-place)

    if (target.isPackaged && item.isPackaged) {
        return;
    } else if (target.isPackaged && !item.isPackaged) {
        // Target is package, item is regular - add item to package
        target.packagedItems.push(item);
        target.packageCount += 1;
    } else if (!target.isPackaged && item.isPackaged) {
        return;
    } else {
        // Neither packaged - convert target to package with both items
        target.isPackaged = true;
        target.packagedItems = [{ ...target }, item];
        target.packageCount = 2;
    }
}

function handlePackaging(item, tile) {
    // Only package items that aren't already packaged
    if (item.isPackaged) return;

    if (!item.packagedBy) {
        item.packagedBy = new Set();
    }

    const packKey = `${item.x},${item.y}`;
    if (item.packagedBy.has(packKey)) return; // Already packaged here

    // Check affordabilty
    if (state.money < 1) {
        // Not enough money to package
        return;
    }

    // Mark as packaged at this location
    item.packagedBy.add(packKey);

    console.log('Packaging item:', item.id, 'at', packKey);

    // deduct cost
    state.money -= 1;
    els.money.innerText = state.money;
    spawnFloatingText(item.x, item.y, '-$1.0');

    // Transform into a package immediately
    item.isPackaged = true;
    item.packagedItems = [{ ...item }]; // Store original item data
    item.packageCount = 1;

}
