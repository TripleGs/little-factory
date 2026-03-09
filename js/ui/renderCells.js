/* --- Cell Rendering --- */
function renderCell(x, y, tile) {
    const cell = els.grid.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    if (!cell) return;

    cell.innerHTML = '';

    if (!tile.type) return;

    if (tile.type === 'producer') {
        renderProducerCell(cell, tile);
    } else {
        renderStandardCell(cell, tile);
    }
}

function getSellerIconHtml(tile) {
    if (tile && tile.producerType !== undefined && state.producerTypes[tile.producerType]) {
        return state.producerTypes[tile.producerType].icon;
    }
    return CONFIG.icons.seller;
}

function buildSellerMarkup(iconHtml) {
    return `<div class="seller-bin-icon">${iconHtml}</div>`;
}

function renderProducerCell(cell, tile) {
    const obj = document.createElement('div');
    obj.className = `object ${tile.type}`;

    const producerTypeId = tile.producerType ?? 0;
    const producerIcon = state.producerTypes[producerTypeId]?.icon || CONFIG.icons.producer;

    const container = createProducerContainer(producerIcon, tile.rotation);
    obj.appendChild(container);
    obj.style.transform = 'none';
    cell.appendChild(obj);
}

function createProducerContainer(icon, rotation) {
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';

    // Icon stays upright
    const iconEl = document.createElement('div');
    iconEl.innerHTML = icon;
    container.appendChild(iconEl);

    // Arrow rotates - use cell size based offset (25% of cell size)
    const arrowEl = document.createElement('div');
    arrowEl.className = 'producer-arrow';
    arrowEl.innerHTML = '<i class="fa-solid fa-caret-right"></i>';
    const arrowOffset = Math.round(state.cellSize * 0.25);
    arrowEl.style.transform = `rotate(${rotation * 90}deg) translateX(${arrowOffset}px)`;
    container.appendChild(arrowEl);

    return container;
}

function renderStandardCell(cell, tile) {
    const obj = document.createElement('div');
    obj.className = `object ${tile.type}`;

    // Add locked class if applicable
    if (tile.locked) {
        obj.classList.add('locked');
    }

    if (tile.type === 'seller') {
        // For product-specific sellers, show the producer icon at the bottom of the bin
        const sellerIcon = getSellerIconHtml(tile);
        obj.innerHTML = buildSellerMarkup(sellerIcon);
    }

    if (tile.type === 'colorer') {
        const colorStr = state.colorManager.formatColor(tile.color, 'rgb');
        cell.style.color = colorStr;
    } else {
        cell.style.color = '';
    }

    // Sellers should never be rotated
    if (tile.type === 'seller') {
        obj.style.transform = 'none';
    } else {
        obj.style.transform = `rotate(${tile.rotation * 90}deg)`;
    }

    cell.appendChild(obj);
}
