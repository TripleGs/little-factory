/* --- Palette Rendering --- */

// Tools that appear in the belt popup (not in main hotbar)
const BELT_TOOLS = ['belt', 'packager', 'stopper', 'jumper'];

function renderPalette() {
    els.palette.innerHTML = '';
    renderToolButtons();
    renderSubPalette();
}

function renderToolButtons() {
    // Main hotbar tools: belt (group), producer, paint, eraser
    // Paint has its own unlock button in hotbar
    const hotbarTools = ['belt', 'producer', 'paint', 'eraser'];

    BASE_TOOLS.forEach(tool => {
        // Only show main hotbar tools
        if (!hotbarTools.includes(tool.id)) {
            return;
        }

        // Paint requires unlock
        if (tool.id === 'paint') {
            if (state.unlocks.paint) {
                const btn = createToolButton(tool);
                els.palette.appendChild(btn);
            } else {
                const unlockBtn = createUnlockButton('paint');
                els.palette.appendChild(unlockBtn);
            }
            return;
        }

        const btn = createToolButton(tool);
        els.palette.appendChild(btn);
    });

    const speedBtn = createSpeedUpgradeButton();
    els.speedButton = speedBtn;
    els.palette.appendChild(speedBtn);
}

function createToolButton(tool) {
    const btn = document.createElement('button');
    btn.className = 'tool-btn';

    const cost = getToolCost(tool.id);
    const canAfford = state.money >= cost;
    
    // Check if this is the active tool OR if it's the belt group and the active tool is in the group
    let isActive = state.tool === tool.id;
    if (tool.id === 'belt' && BELT_TOOLS.includes(state.tool)) {
        isActive = true;
    }

    // Get display icon (producer shows selected type)
    let displayIcon = tool.icon;
    if (tool.id === 'producer' && state.producerTypes.length > 0) {
        displayIcon = state.producerTypes[state.selectedProducerType].icon;
    } else if (tool.id === 'belt' && state.tool !== 'belt' && BELT_TOOLS.includes(state.tool)) {
        // Show the icon of the currently selected belt tool
        const selectedTool = BASE_TOOLS.find(t => t.id === state.tool);
        if (selectedTool) {
            displayIcon = selectedTool.icon;
        }
    }

    btn.innerHTML = `${displayIcon}<span>${tool.name}</span>`;

    if (isActive) btn.classList.add('active');
    updateButtonAffordability(btn, cost, canAfford);

    // Special case: paint button shows selected color
    if (tool.id === 'paint' && state.subTool) {
        const colorStr = state.colorManager.formatColor(state.subTool, 'rgb');
        btn.querySelector('i').style.color = colorStr;
    }

    btn.onclick = () => selectTool(tool, btn);

    return btn;
}

// Hide sub-palette when cursor enters a grid cell (not expand buttons)
function setupPaletteHoverBehavior() {
    els.grid.addEventListener('mouseover', (e) => {
        // Only hide if entering a grid cell, not expand buttons
        if (e.target.classList.contains('cell')) {
            els.subPalette.classList.remove('visible');
        }
    });
}

function renderSubPalette() {
    els.subPalette.innerHTML = '';

    if (state.tool === 'paint') {
        renderPaintPalette();
    } else if (state.tool === 'producer') {
        renderProducerPalette();
    } else if (state.tool === 'belt' || BELT_TOOLS.includes(state.tool)) {
        renderBeltPalette();
    }
}

function renderBeltPalette() {
    // Get all belt tools from BASE_TOOLS
    const beltTools = BASE_TOOLS.filter(tool => BELT_TOOLS.includes(tool.id));

    // Determine next unlock in belt group
    const beltUnlockOrder = ['packager', 'stopper', 'jumper'];
    const nextBeltUnlock = beltUnlockOrder.find(key => !state.unlocks[key]);

    // Count items to show (unlocked tools + 1 unlock button if available)
    let itemCount = beltTools.filter(t => t.id === 'belt' || state.unlocks[t.id]).length;
    if (nextBeltUnlock) itemCount++;

    const colCount = Math.min(Math.max(itemCount, 3), 10);
    els.subPalette.style.gridTemplateColumns = `repeat(${colCount}, 40px)`;

    // Add unlocked belt tools
    beltTools.forEach(tool => {
        if (tool.id === 'belt' || state.unlocks[tool.id]) {
            const btn = createBeltGroupButton(tool);
            els.subPalette.appendChild(btn);
        }
    });

    // Add next unlock button if there's one
    if (nextBeltUnlock) {
        const unlockBtn = createBeltUnlockButton(nextBeltUnlock);
        els.subPalette.appendChild(unlockBtn);
    }
}

function createBeltUnlockButton(unlockKey) {
    const btn = document.createElement('button');
    btn.className = 'tool-btn';
    btn.style.borderStyle = 'dashed';
    btn.style.opacity = '0.7';
    btn.style.position = 'relative';

    const cost = COLOR_CONFIG.unlockCosts[unlockKey];
    const canAfford = state.money >= cost;

    // Map unlock keys to display info
    const unlockInfo = {
        packager: { icon: '<i class="fa-solid fa-box"></i>', name: 'Packager' },
        stopper: { icon: '<i class="fa-solid fa-hand"></i>', name: 'Stopper' },
        jumper: { icon: '<i class="fa-solid fa-angles-up"></i>', name: 'Jumper' }
    };

    const info = unlockInfo[unlockKey];
    btn.innerHTML = `
        ${info.icon}
        <span class="price-tag">$${cost}</span>
        <span class="lock-icon">
            <i class="fa-solid fa-lock"></i>
        </span>
    `;
    btn.title = `Unlock ${info.name} ($${cost})`;

    updateButtonAffordability(btn, cost, canAfford);

    btn.onclick = (e) => {
        e.stopPropagation();
        if (state.money >= cost) {
            state.money -= cost;
            els.money.innerText = state.money;
            state.unlocks[unlockKey] = true;
            spawnFloatingText(state.cols / 2, state.rows / 2, `Unlocked ${info.name}!`);
            renderSubPalette();
            renderPalette();
            if (state.gameMode === 'multi') {
                const localPlayer = state.players.find(p => p.id === state.localPlayerId);
                if (localPlayer) {
                    localPlayer.money = state.money;
                }
                Sync.broadcastMoneyUpdate();
                Sync.broadcastUnlockState({
                    unlocks: state.unlocks
                });
            }
        }
    };

    return btn;
}

function createBeltGroupButton(tool) {
    const btn = document.createElement('button');
    btn.className = 'tool-btn';

    const cost = getToolCost(tool.id);
    const canAfford = state.money >= cost;
    const isSelected = state.tool === tool.id;

    btn.innerHTML = `${tool.icon}<span class="price-tag">$${cost}</span>`;
    btn.title = tool.name;

    updateButtonAffordability(btn, cost, canAfford);

    if (isSelected) btn.classList.add('active');

    btn.onclick = (e) => {
        e.stopPropagation();
        selectBeltTool(tool);
    };

    return btn;
}

function selectBeltTool(tool) {
    state.tool = tool.id;
    state.toolData = tool;

    els.subPalette.classList.remove('visible');

    renderPalette();
}

function renderPaintPalette() {
    const available = state.colorManager.paletteSortedByHue;
    const colCount = Math.min(Math.max(available.length, 3), 10);
    els.subPalette.style.gridTemplateColumns = `repeat(${colCount}, 40px)`;

    if (available.length === 0) {
        renderEmptyPaletteMessage();
        return;
    }

    available.forEach(color => {
        const btn = createColorButton(color);
        els.subPalette.appendChild(btn);
    });
}

function renderEmptyPaletteMessage() {
    const msg = document.createElement('div');
    msg.className = 'empty-message';
    msg.textContent = 'Mix colors to discover more!';
    msg.style.padding = '0.5rem';
    msg.style.opacity = COLOR_CONFIG.ui.costDisplayOpacity;
    els.subPalette.appendChild(msg);
}

function createColorButton(color) {
    const btn = document.createElement('button');
    btn.className = 'tool-btn color-btn';

    const isUnlocked = state.unlockedColors.has(color.id);
    const unlockCost = color.mixLevel * 250; // $250 per mix level
    const isSelected = state.tool === 'paint' && state.subTool && state.subTool.id === color.id;

    const colorStr = state.colorManager.formatColor(color, 'rgb');

    if (!isUnlocked) {
        // Show as locked color that needs unlock purchase
        btn.style.opacity = '0.7';
        btn.style.borderStyle = 'dashed';
        btn.style.position = 'relative';
        btn.title = `${color.name} ($${unlockCost})`;

        const canAfford = state.money >= unlockCost;

        btn.innerHTML = `
            ${CONFIG.icons.drip}
            <span class="price-tag">$${unlockCost}</span>
            <span class="lock-icon">
                <i class="fa-solid fa-lock"></i>
            </span>
        `;
        btn.querySelector('i.fa-fill-drip').style.color = colorStr;

        updateButtonAffordability(btn, unlockCost, canAfford);

        btn.onclick = (e) => {
            e.stopPropagation();
            if (state.money >= unlockCost) {
                state.money -= unlockCost;
                els.money.innerText = state.money;
                state.unlockedColors.add(color.id);
                spawnFloatingText(state.cols / 2, state.rows / 2, `Unlocked ${color.name}!`);
                renderPalette();
                if (state.gameMode === 'multi') {
                    const localPlayer = state.players.find(p => p.id === state.localPlayerId);
                    if (localPlayer) {
                        localPlayer.money = state.money;
                    }
                    Sync.broadcastMoneyUpdate();
                    Sync.broadcastUnlockState({
                        unlockedColors: Array.from(state.unlockedColors)
                    });
                }
            }
        };
    } else {
        // Normal unlocked color - show placement cost
        const cost = calculatePaintCost(color);
        btn.title = `${color.name} ($${cost})`;

        const canAfford = state.money >= cost;

        btn.innerHTML = `
            ${CONFIG.icons.drip}
            <span class="price-tag">$${cost}</span>
        `;
        btn.querySelector('i').style.color = colorStr;

        updateButtonAffordability(btn, cost, canAfford);

        if (isSelected) btn.classList.add('active');

        btn.onclick = (e) => {
            e.stopPropagation();
            selectPaintColor(color);
        };
    }

    return btn;
}

function renderProducerPalette() {
    // Always show + button for new producers
    const colCount = Math.min(Math.max(state.producerTypes.length + 1, 3), 10);
    els.subPalette.style.gridTemplateColumns = `repeat(${colCount}, 40px)`;

    state.producerTypes.forEach(producerType => {
        const btn = createProducerTypeButton(producerType);
        els.subPalette.appendChild(btn);
    });

    // Always show "New Producer" button
    const newProducerBtn = createNewProducerButton();
    els.subPalette.appendChild(newProducerBtn);
}

function createProducerTypeButton(producerType) {
    const btn = document.createElement('button');
    btn.className = 'tool-btn';

    const cost = getToolCost('producer');
    const canAfford = state.money >= cost;

    if (state.selectedProducerType === producerType.id) {
        btn.classList.add('active');
    }

    btn.innerHTML = `${producerType.icon}<span class="price-tag">$${cost}</span>`;
    btn.title = producerType.name;

    updateButtonAffordability(btn, cost, canAfford);

    btn.onclick = (e) => {
        e.stopPropagation();
        state.selectedProducerType = producerType.id;
        renderSubPalette();
        renderPalette();
    };

    return btn;
}

function createNewProducerButton() {
    const btn = document.createElement('button');
    btn.className = 'tool-btn';
    btn.style.borderStyle = 'dashed';

    const newProducerCost = COLOR_CONFIG.costs.newProducer;
    const canAfford = state.money >= newProducerCost;

    btn.innerHTML = `<i class="fa-solid fa-plus"></i><span class="price-tag">$${newProducerCost}</span>`;
    btn.title = `Unlock New Producer ($${newProducerCost})`;

    updateButtonAffordability(btn, newProducerCost, canAfford);

    btn.onclick = (e) => {
        e.stopPropagation();
        handleNewProducerPurchase(newProducerCost);
    };

    return btn;
}

function handleNewProducerPurchase(cost) {
    if (state.money >= cost) {
        const spot = findEmptyCell();
        if (!spot) {
            const cx = Math.floor(state.cols / 2);
            const cy = Math.floor(state.rows / 2);
            spawnFloatingText(cx, cy, "Map is full can't place sale bin");
            return;
        }

        state.money -= cost;
        els.money.innerText = state.money;
        const result = unlockNewProducer();
        const newType = result.type;
        spawnFloatingText(state.cols / 2, state.rows / 2, `Unlocked ${newType.name}!`);
        renderSubPalette();
        renderPalette();

        if (state.gameMode === 'multi') {
            const localPlayer = state.players.find(p => p.id === state.localPlayerId);
            if (localPlayer) {
                localPlayer.money = state.money;
            }
            Sync.broadcastMoneyUpdate();
            Sync.broadcastUnlockState({
                unlocks: state.unlocks,
                unlockedColors: Array.from(state.unlockedColors),
                producerTypes: state.producerTypes,
                usedIcons: Array.from(state.usedIcons),
                sellerPlacement: result.sellerPlacement
            });
        }
    }
}

function selectTool(tool, btnEl) {
    // For belt button, preserve current belt tool selection if one exists
    if (tool.id === 'belt' && BELT_TOOLS.includes(state.tool)) {
        // Keep current belt tool selected, just show popup
    } else {
        state.tool = tool.id;
        state.toolData = tool;
    }

    // UI Updates
    document.querySelectorAll('#palette .tool-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');

    // Tools with sub-palettes show their popup on click
    if (tool.id === 'paint' || tool.id === 'producer' || tool.id === 'belt') {
        els.subPalette.classList.add('visible');
        renderSubPalette();

        // If paint and a color is already selected, re-apply it to toolData
        if (tool.id === 'paint' && state.subTool) {
            state.toolData = {
                type: 'colorer',
                color: { ...state.subTool },
                id: 'paint'
            };
        }
    } else {
        els.subPalette.classList.remove('visible');
    }
}

function selectPaintColor(colorObj) {
    // Ensure paint tool is selected
    state.tool = 'paint';
    state.subTool = colorObj;
    state.toolData = {
        type: 'colorer',
        color: { ...colorObj }, // copy values
        id: 'paint'
    };

    // Close sub-palette after selecting color
    els.subPalette.classList.remove('visible');

    renderPalette(); // Update main icon color
}

function createUnlockButton(unlockKey) {
    const btn = document.createElement('button');
    btn.className = 'tool-btn unlock-btn';
    btn.style.borderStyle = 'dashed';
    btn.style.opacity = '0.7';
    btn.style.position = 'relative';

    const cost = COLOR_CONFIG.unlockCosts[unlockKey];
    const canAfford = state.money >= cost;

    // Map unlock keys to display info
    const unlockInfo = {
        paint: { icon: '<i class="fa-solid fa-fill-drip"></i>', name: 'Unlock Painting' },
        packager: { icon: '<i class="fa-solid fa-box"></i>', name: 'Unlock Packaging' },
        stopper: { icon: '<i class="fa-solid fa-hand"></i>', name: 'Unlock Stopper' },
        newProducer: { icon: '<i class="fa-solid fa-cube"></i>', name: 'Unlock New Producers' },
        jumper: { icon: '<i class="fa-solid fa-arrow-up"></i>', name: 'Unlock Jumper' }
    };

    const info = unlockInfo[unlockKey];
    btn.innerHTML = `
        ${info.icon}
        <span class="price-tag">$${cost}</span>
        <span class="lock-icon">
            <i class="fa-solid fa-lock"></i>
        </span>
    `;
    btn.title = `${info.name} ($${cost})`;

    updateButtonAffordability(btn, cost, canAfford);
    
    btn.onclick = () => {
        if (state.money >= cost) {
            state.money -= cost;
            els.money.innerText = state.money;
            state.unlocks[unlockKey] = true;

            spawnFloatingText(state.cols / 2, state.rows / 2, `${info.name}!`);
            renderPalette();
            if (state.gameMode === 'multi') {
                const localPlayer = state.players.find(p => p.id === state.localPlayerId);
                if (localPlayer) {
                    localPlayer.money = state.money;
                }
                Sync.broadcastMoneyUpdate();
                Sync.broadcastUnlockState({
                    unlocks: state.unlocks
                });
            }
        }
    };

    return btn;
}
