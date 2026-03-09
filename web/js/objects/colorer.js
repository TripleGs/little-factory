function handleColorMixing(item, tile) {
    if (!item.paintedBy) {
        item.paintedBy = new Set();
    }

    const paintKey = `${item.x},${item.y}`;
    if (item.paintedBy.has(paintKey)) return; // Already painted here

    // Mark as painted but don't apply color yet - store as pending
    item.paintedBy.add(paintKey);

    const paint = tile.color || { r: 0, g: 0, b: 0, mixLevel: 0 };
    const oldColor = { ...item.color };
    const newColor = state.colorManager.mixColors(item.color, paint);

    // Calculate new mix level
    const itemMixLevel = item.mixLevel || 0;
    const paintMixLevel = paint.mixLevel || 0;
    const newMixLevel = Math.max(itemMixLevel, paintMixLevel) + 1;

    // Apply color immediately
    item.color = newColor;
    item.mixLevel = newMixLevel;
    // item.pendingOldColor = oldColor; // No longer needed for diff
    item.colorChangeApplied = true;
    Sound.play('paint');

    // Check for color discovery immediately
    if (hasColorChanged(oldColor, newColor)) {
        handleColorDiscovery(item, newColor, newMixLevel);
    }
}

function hasColorChanged(oldColor, newColor) {
    return newColor.r !== oldColor.r ||
        newColor.g !== oldColor.g ||
        newColor.b !== oldColor.b;
}

function handleColorDiscovery(item, newColor, newMixLevel) {
    const newColorKey = `${newColor.r},${newColor.g},${newColor.b}`;

    if (!item.discoveredOnThisPass) {
        item.discoveredOnThisPass = new Set();
    }

    if (item.discoveredOnThisPass.has(newColorKey)) return;

    const discovered = state.colorManager.addColor(newColor, { mixLevel: newMixLevel });

    if (discovered) {
        spawnFloatingText(item.x, item.y, `Discovered ${discovered.name}!`);
        renderSubPalette();
        item.discoveredOnThisPass.add(newColorKey);
    }
}
