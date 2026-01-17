/* --- Item Rendering --- */
const itemMap = new Map();

function renderItems(alpha) {
    cleanupRemovedItems();

    state.items.forEach(item => {
        renderItem(item, alpha);
    });
}

function cleanupRemovedItems() {
    const activeIds = new Set(state.items.map(i => i.id));

    for (const [id, el] of itemMap) {
        if (!activeIds.has(id)) {
            // Add despawning animation before removal
            if (!el.classList.contains('despawning')) {
                el.classList.add('despawning');

                // Remove element after animation completes
                setTimeout(() => {
                    el.remove();
                    itemMap.delete(id);
                }, 300);
            }
        }
    }
}

function renderItem(item, alpha) {
    let el = itemMap.get(item.id);

    if (!el) {
        el = createItemElement(item);
        itemMap.set(item.id, el);
    }

    updateItemAppearance(el, item, alpha);
}

function createItemElement(item) {
    const el = document.createElement('div');
    el.className = 'item spawning';
    el.innerHTML = item.icon || CONFIG.icons.item;

    // Set initial position BEFORE adding to DOM to prevent flash at 0,0
    const originX = item.x * (state.cellSize + 1);
    const originY = item.y * (state.cellSize + 1);
    el.style.transform = `translate(${originX}px, ${originY}px) scale(0)`;

    // Set initial color
    const colorStr = state.colorManager.formatColor(item.color, 'rgb');
    el.style.color = colorStr;

    els.itemLayer.appendChild(el);

    // Remove spawning class after animation
    setTimeout(() => {
        el.classList.remove('spawning');
    }, 300);

    return el;
}

function updateItemAppearance(el, item, alpha) {
    // Check if we should apply the pending color change (at center of belt)
    // Deprecated: Color is now applied immediately in handleColorMixing
    /*
    if (item.pendingColor && !item.colorChangeApplied && alpha >= 0.5) {
        // Apply the pending color
        item.color = item.pendingColor;
        item.mixLevel = item.pendingMixLevel;
        item.colorChangeApplied = true;

        // Check for color discovery
        if (hasColorChanged(item.pendingOldColor, item.pendingColor)) {
            handleColorDiscovery(item, item.pendingColor, item.pendingMixLevel);
        }

        // Clear pending data
        item.pendingColor = null;
        item.pendingMixLevel = null;
        item.pendingOldColor = null;
    }
    */

    // Update item display (handle packages)
    if (item.isPackaged) {
        const originalIcon = item.packagedItems[0]?.icon || item.icon;
        el.innerHTML = `
            <div class="package-wrapper">
                <i class="fa-solid fa-box package-box"></i>
                ${originalIcon}
                <span class="package-count">${item.packageCount}</span>
            </div>
        `;
    } else {
        el.innerHTML = item.icon;
    }

    // Update color
    const colorStr = state.colorManager.formatColor(item.color, 'rgb');
    el.style.color = colorStr;

    // Apply merging animation if item is merging
    if (item._merging && !el.classList.contains('merging')) {
        el.classList.add('merging');
    }

    // Calculate position with interpolation
    let ix = item.x;
    let iy = item.y;

    if (!item.justSpawned) {
        ix = item.lastX + (item.x - item.lastX) * alpha;
        iy = item.lastY + (item.y - item.lastY) * alpha;
    }

    const originX = ix * (state.cellSize + 1);
    const originY = iy * (state.cellSize + 1);

    el.style.transform = `translate(${originX}px, ${originY}px)`;
}
