/* --- Lobby System --- */
function pickRandomStartingIcon(players) {
    const icons = players
        .map(player => player.startingIcon)
        .filter(Boolean);
    if (icons.length === 0) return null;
    return icons[Math.floor(Math.random() * icons.length)];
}

const Lobby = {
    transferReady: false,
    emoteReady: false,
    emoteTimers: new Map(),
    emoteDurationMs: 2800,
    cursorTrackingReady: false,
    remoteCursorPositions: new Map(),
    pendingEmote: null,  // Emote waiting to be placed on grid
    gridEmotes: [],      // Active emotes displayed on grid
    roomCodeCopyReady: false,
    sidebarToggleReady: false,
    hostMonitorReady: false,
    hostMonitorTimer: null,
    emoteIcons: {
        'thumbs-up': 'fa-thumbs-up',
        'face-laugh': 'fa-face-laugh',
        'heart': 'fa-heart',
        'bolt': 'fa-bolt',
        'face-angry': 'fa-face-angry',
        poo: 'fa-poo',
        'arrow-up': 'fa-arrow-up',
        'arrow-down': 'fa-arrow-down',
        'arrows-left-right': 'fa-arrows-left-right',
        'face-surprise': 'fa-face-surprise',
        'face-grin-squint': 'fa-face-grin-squint',
        skull: 'fa-skull'
    },
    update() {
        const playerList = document.getElementById('player-list');
        const startBtn = document.getElementById('btn-start-game');
        const waitingText = document.getElementById('lobby-waiting');

        // Clear and rebuild player list
        playerList.innerHTML = '';

        state.players.forEach(player => {
            const item = document.createElement('div');
            item.className = 'player-item';
            if (player.connected === false) {
                item.classList.add('disconnected');
            }

            // Connection status indicator
            const statusDot = document.createElement('div');
            statusDot.className = 'connection-status ' + (player.connected !== false ? 'connected' : 'disconnected');

            const colorDot = document.createElement('div');
            colorDot.className = 'player-color';
            colorDot.style.backgroundColor = player.color;

            const name = document.createElement('div');
            name.className = 'player-name';
            name.textContent = player.name;

            item.appendChild(statusDot);
            item.appendChild(colorDot);
            item.appendChild(name);

            // Add badges
            if (player.isHost) {
                const hostBadge = document.createElement('span');
                hostBadge.className = 'player-host-badge';
                hostBadge.textContent = 'HOST';
                item.appendChild(hostBadge);
            }

            if (player.id === state.localPlayerId) {
                const youBadge = document.createElement('span');
                youBadge.className = 'player-you-badge';
                youBadge.textContent = 'YOU';
                item.appendChild(youBadge);
            }

            if (state.isHost && player.id !== state.localPlayerId) {
                const kickBtn = document.createElement('button');
                kickBtn.className = 'player-kick-btn';
                kickBtn.type = 'button';
                kickBtn.title = 'Kick player';
                kickBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                kickBtn.addEventListener('click', () => {
                    this.kickPlayer(player.id);
                });
                item.appendChild(kickBtn);
            }

            playerList.appendChild(item);
        });

        // Count connected players
        const connectedCount = state.players.filter(p => p.connected !== false).length;
        const hasPendingRequest = state.isHost && (GameRoom.activeJoinRequest || GameRoom.pendingJoinRequests.length > 0);
        if (startBtn && !startBtn.dataset.defaultHtml) {
            startBtn.dataset.defaultHtml = startBtn.innerHTML;
        }

        // Update UI based on role
        if (state.isHost) {
            startBtn.style.display = 'block';
            if (hasPendingRequest) {
                startBtn.disabled = true;
                startBtn.classList.add('pending');
                startBtn.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> Join Request Pending';
                waitingText.textContent = 'Join request pending...';
            } else {
                startBtn.disabled = connectedCount < 2;
                startBtn.classList.remove('pending');
                startBtn.innerHTML = startBtn.dataset.defaultHtml;
                waitingText.textContent = connectedCount < 2
                    ? 'Waiting for players to join...'
                    : `${connectedCount} players ready!`;
            }
        } else {
            startBtn.style.display = 'none';
            waitingText.textContent = 'Waiting for host to start the game...';
        }

        this.refreshMoneyDisplay();
    },

    addPlayer(player) {
        // Assign a color if not set
        if (!player.color) {
            const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0'];
            player.color = colors[state.players.length % colors.length];
        }

        state.players.push(player);
        this.update();
    },

    removePlayer(playerId) {
        state.players = state.players.filter(p => p.id !== playerId);
        this.update();
    },

    startGame() {
        if (!state.isHost) return;

        // Distribute starting money
        const startingMoney = COLOR_CONFIG.starting.money;
        state.players.forEach(player => {
            player.money = startingMoney;
        });

        // Host initializes the game first to generate state
        this.initHostGame();

        // Send game start to all peers with full initial state
        Sync.broadcast({
            type: 'game_start',
            data: {
                players: state.players,
                initialState: {
                    cols: state.cols,
                    rows: state.rows,
                    grid: state.grid,
                    producerTypes: state.producerTypes,
                    usedIcons: Array.from(state.usedIcons),
                    selectedProducerType: state.selectedProducerType,
                    hostSeed: state.hostSeed,
                    unlocks: state.unlocks,
                    unlockedColors: Array.from(state.unlockedColors)
                }
            }
        });

        // Finish starting game locally (already initialized)
        this.finishGameStart();
    },

    // Host initializes the game state that will be shared
    initHostGame() {
        state.colorManager = new ColorManager(COLOR_CONFIG);
        state.money = COLOR_CONFIG.starting.money;
        if (state.gameMode === 'multi' && !state.hostSeed) {
            state.hostSeed = Math.floor(Math.random() * 1e9);
        }

        // Unlock starting colors
        COLOR_CONFIG.starting.colors.forEach(color => {
            state.unlockedColors.add(color.id);
        });

        state.toolData = BASE_TOOLS[0];

        // Setup grid
        calculateOptimalGridSize();
        setupGrid();

        // Initialize producer (this is where randomness happens)
        if (state.gameMode === 'multi') {
            const startingIcon = pickRandomStartingIcon(state.players);
            unlockNewProducer(startingIcon);
        } else {
            unlockNewProducer();
        }
    },

    // Called by host after initHostGame
    finishGameStart() {
        Menu.hide();

        // Render and start loop (grid already set up)
        renderPalette();
        setupControls();
        setupPaletteHoverBehavior();
        setupZoomControls();
        setupWindowResize();
        setupSpeedControls();

        els.grid.appendChild(els.itemLayer);
        els.money.innerText = state.money;
        applyZoom();
        requestAnimationFrame(loop);

        // Set up multiplayer UI
        this.setupCursorTracking();
        this.updateMultiplayerUI();

        if (state.gameMode === 'multi' && typeof Achievements !== 'undefined') {
            Achievements.onMultiplayerStart();
        }
    },

    // Called by joiner when receiving game_start
    beginGame() {
        Menu.hide();

        // Joiner uses initGame which will apply the received state
        initGame();

        // If multiplayer, set up cursor tracking
        if (state.gameMode === 'multi') {
            this.setupCursorTracking();
            this.updateMultiplayerUI();
        }
    },

    setupCursorTracking() {
        this.ensureCursorContainer();
        if (this.cursorTrackingReady) return;

        // Create cursor container
        // Track local cursor and broadcast
        els.grid.addEventListener('mousemove', (e) => {
            if (state.gameMode !== 'multi') return;

            const rect = els.grid.getBoundingClientRect();
            const x = (e.clientX - rect.left) / state.zoomLevel;
            const y = (e.clientY - rect.top) / state.zoomLevel;

            Sync.broadcast({
                type: 'cursor_move',
                data: {
                    x: x,
                    y: y,
                    playerId: state.localPlayerId
                }
            });
        });

        this.cursorTrackingReady = true;
    },

    ensureCursorContainer() {
        let cursorContainer = document.getElementById('cursor-container');
        if (!cursorContainer) {
            cursorContainer = document.createElement('div');
            cursorContainer.id = 'cursor-container';
            cursorContainer.style.position = 'absolute';
            cursorContainer.style.top = '0';
            cursorContainer.style.left = '0';
            cursorContainer.style.width = '100%';
            cursorContainer.style.height = '100%';
            cursorContainer.style.pointerEvents = 'none';
            cursorContainer.style.overflow = 'hidden';
            els.grid.appendChild(cursorContainer);
        }
        return cursorContainer;
    },

    updateRemoteCursor(playerId, x, y) {
        const cursorContainer = this.ensureCursorContainer();
        if (!cursorContainer) return;

        let cursor = document.getElementById('cursor-' + playerId);
        const player = state.players.find(p => p.id === playerId);
        if (!player) return;

        if (!cursor) {
            cursor = document.createElement('div');
            cursor.id = 'cursor-' + playerId;
            cursor.className = 'remote-cursor';
            cursor.style.color = player.color;

            const pointer = document.createElement('div');
            pointer.className = 'cursor-pointer';

            const label = document.createElement('div');
            label.className = 'cursor-label';
            label.style.backgroundColor = player.color;
            const name = document.createElement('span');
            name.className = 'cursor-name';
            label.appendChild(name);

            cursor.appendChild(pointer);
            cursor.appendChild(label);
            cursorContainer.appendChild(cursor);
        }

        const label = cursor.querySelector('.cursor-label');
        if (label) {
            const name = label.querySelector('.cursor-name');
            if (name) {
                name.textContent = player.name;
            }
            label.style.backgroundColor = player.color;
        }
        cursor.style.color = player.color;
        this.updateCursorEmote(cursor, player.emote);

        cursor.style.left = x + 'px';
        cursor.style.top = y + 'px';

        this.remoteCursorPositions.set(playerId, { x, y });
    },

    restoreRemoteCursors() {
        if (state.gameMode !== 'multi') return;

        this.ensureCursorContainer();
        this.remoteCursorPositions.forEach((pos, playerId) => {
            this.updateRemoteCursor(playerId, pos.x, pos.y);
        });
    },

    updateMultiplayerUI() {
        const sidebar = document.getElementById('player-sidebar');
        if (!sidebar) return;

        const headerStats = document.getElementById('multiplayer-stats');
        if (headerStats) {
            headerStats.remove();
        }

        if (state.gameMode !== 'multi') {
            sidebar.classList.add('hidden');
            return;
        }

        sidebar.classList.remove('hidden');
        this.setupTransferControls();
        this.setupEmoteControls();
        this.setupSidebarToggles();
        this.setupHostMonitor();
        this.updateSidebarRoomCode();
        this.refreshMoneyDisplay();

        // Setup chat
        if (typeof Chat !== 'undefined') {
            Chat.setup();
        }
    },

    setupHostMonitor() {
        if (this.hostMonitorReady) return;
        this.hostMonitorReady = true;

        let lastHostMessage = Date.now();
        let hostDisconnected = false;

        // Reset timer when we receive any message from host
        window.addEventListener('host-message-received', () => {
            lastHostMessage = Date.now();
            hostDisconnected = false;
        });

        this.hostMonitorTimer = setInterval(() => {
            if (state.gameMode !== 'multi' || state.isHost) return;

            const hostId = GameRoom.hostPeerId;
            if (!hostId) return;

            const conn = PeerManager.connections.get(hostId);
            const timeSinceLastMessage = Date.now() - lastHostMessage;

            // Check if connection is closed
            if (conn && !conn.open && !hostDisconnected) {
                console.log('Host connection closed, starting 30s timer...');
                hostDisconnected = true;
                lastHostMessage = Date.now(); // Start the 30s countdown
            }

            // If host has been disconnected for 30 seconds, convert to single player
            if (hostDisconnected && timeSinceLastMessage > 30000) {
                console.log('No host communication for 30 seconds, converting to single player');
                clearInterval(this.hostMonitorTimer);
                this.hostMonitorTimer = null;
                this.hostMonitorReady = false;
                GameRoom.convertToSinglePlayer();
            }
        }, 1000);
    },

    updateSidebarRoomCode() {
        const roomContainer = document.getElementById('sidebar-room');
        const roomCodeEl = document.getElementById('sidebar-room-code');
        const copyBtn = document.getElementById('btn-copy-code-sidebar');
        if (!roomContainer || !roomCodeEl) return;

        const code = GameRoom.roomCode || '';
        if (state.gameMode !== 'multi' || !code) {
            roomContainer.classList.add('hidden');
            return;
        }

        roomContainer.classList.remove('hidden');
        roomCodeEl.textContent = code;

        if (copyBtn && !this.roomCodeCopyReady) {
            const originalHtml = copyBtn.innerHTML;
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(code).then(() => {
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.innerHTML = originalHtml;
                    }, 2000);
                });
            });
            this.roomCodeCopyReady = true;
        }
    },

    setupSidebarToggles() {
        if (this.sidebarToggleReady) return;
        const toggles = document.querySelectorAll('#player-sidebar .section-toggle');
        if (!toggles.length) return;

        toggles.forEach((toggle) => {
            toggle.addEventListener('click', () => {
                const section = toggle.closest('.sidebar-section');
                if (!section) return;
                section.classList.toggle('collapsed');
            });
        });
        this.sidebarToggleReady = true;
    },

    refreshMoneyDisplay() {
        if (state.gameMode !== 'multi') return;

        const list = document.getElementById('sidebar-player-list');
        const targetSelect = document.getElementById('transfer-target');
        if (!list || !targetSelect) return;

        // Preserve current dropdown selection
        const currentSelection = targetSelect.value;

        list.innerHTML = '';
        targetSelect.innerHTML = '<option value="">Select player...</option>';

        const otherPlayers = state.players.filter(player => player.id !== state.localPlayerId);
        const connectedPlayers = otherPlayers.filter(player => player.connected !== false);

        if (connectedPlayers.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'sidebar-empty';
            empty.textContent = 'No other players yet.';
            list.appendChild(empty);
        } else {
            connectedPlayers.forEach(player => {
                const row = document.createElement('div');
                row.className = 'sidebar-player';

                const info = document.createElement('div');
                info.className = 'sidebar-player-info';

                const colorDot = document.createElement('div');
                colorDot.className = 'sidebar-player-color';
                colorDot.style.backgroundColor = player.color;

                const name = document.createElement('span');
                name.className = 'sidebar-player-name';
                name.textContent = player.name;

                const amount = document.createElement('span');
                amount.className = 'sidebar-player-money';
                amount.id = 'sidebar-money-' + player.id;
                amount.textContent = '$' + Math.floor(player.money || 0);

                info.appendChild(colorDot);
                info.appendChild(name);
                row.appendChild(info);
                row.appendChild(amount);

                if (state.isHost) {
                    const kickBtn = document.createElement('button');
                    kickBtn.className = 'sidebar-kick-btn';
                    kickBtn.type = 'button';
                    kickBtn.title = 'Kick player';
                    kickBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                    kickBtn.addEventListener('click', () => {
                        this.kickPlayer(player.id);
                    });
                    row.appendChild(kickBtn);
                }

                list.appendChild(row);
            });
        }

        connectedPlayers.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name;
            targetSelect.appendChild(option);
        });

        // Restore previous selection if the player is still available
        if (currentSelection && connectedPlayers.some(p => p.id === currentSelection)) {
            targetSelect.value = currentSelection;
        }

        targetSelect.disabled = connectedPlayers.length === 0;
        const sendButton = document.getElementById('btn-send-money');
        if (sendButton) {
            sendButton.disabled = connectedPlayers.length === 0;
        }

        this.syncEmoteButtons();
    },

    updatePlayerMoney(playerId, amount) {
        const player = state.players.find(p => p.id === playerId);
        if (player) {
            player.money = amount;
        }

        const el = document.getElementById('sidebar-money-' + playerId);
        if (el) {
            el.textContent = '$' + Math.floor(amount);
        } else {
            this.refreshMoneyDisplay();
        }
    },

    updatePlayerEmote(playerId, emote) {
        const player = state.players.find(p => p.id === playerId);
        if (player) {
            player.emote = emote || null;
        }

        const cursor = document.getElementById('cursor-' + playerId);
        if (cursor) {
            this.updateCursorEmote(cursor, emote);
        }

        if (playerId === state.localPlayerId) {
            this.syncEmoteButtons();
        }

        this.scheduleEmoteClear(playerId, emote, false);
    },

    clearRemoteCursor(playerId) {
        this.remoteCursorPositions.delete(playerId);
        const cursor = document.getElementById('cursor-' + playerId);
        if (cursor) {
            cursor.remove();
        }
    },

    kickPlayer(playerId) {
        if (!state.isHost) return;
        GameRoom.kickPlayer(playerId);
    },

    setupTransferControls() {
        if (this.transferReady) return;

        const sendButton = document.getElementById('btn-send-money');
        const amountInput = document.getElementById('transfer-amount');
        const targetSelect = document.getElementById('transfer-target');
        if (!sendButton || !amountInput || !targetSelect) return;

        const handleSend = () => {
            this.sendMoney();
        };

        sendButton.addEventListener('click', handleSend);
        amountInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                handleSend();
            }
        });

        this.transferReady = true;
    },

    setupEmoteControls() {
        if (this.emoteReady) return;

        const buttons = document.querySelectorAll('.emote-btn');
        if (!buttons.length) return;

        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                const emote = button.dataset.emote || '';
                this.selectEmote(emote);
            });
        });

        this.emoteReady = true;
    },

    // Select an emote to place on next grid click
    selectEmote(emote) {
        if (state.gameMode !== 'multi') return;

        if (!emote) {
            // Clear button clicked - clear pending emote
            this.pendingEmote = null;
            this.syncEmoteButtons();
            return;
        }

        // Toggle pending emote
        if (this.pendingEmote === emote) {
            this.pendingEmote = null;
        } else {
            this.pendingEmote = emote;
        }
        this.syncEmoteButtons();
    },

    // Called when grid is clicked - place emote if one is pending
    handleGridClick(x, y) {
        if (!this.pendingEmote || state.gameMode !== 'multi') return false;

        const localPlayer = state.players.find(p => p.id === state.localPlayerId);
        if (!localPlayer) return false;

        // Place the emote on grid
        this.placeGridEmote(x, y, this.pendingEmote, localPlayer.color, state.localPlayerId);

        // Broadcast to others
        Sync.broadcast({
            type: Protocol.types.EMOTE_UPDATE,
            data: {
                playerId: state.localPlayerId,
                emote: this.pendingEmote,
                gridX: x,
                gridY: y,
                playerColor: localPlayer.color
            }
        });

        // Clear pending emote after placing
        this.pendingEmote = null;
        this.syncEmoteButtons();

        return true; // Indicate emote was placed
    },

    // Place an emote visually on the grid
    placeGridEmote(x, y, emote, playerColor, playerId) {
        const iconClass = this.emoteIcons[emote];
        if (!iconClass) return;

        // Create emote element
        const emoteEl = document.createElement('div');
        emoteEl.className = 'grid-emote';
        emoteEl.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        emoteEl.style.color = playerColor;

        // Position it on the grid
        const cellSize = state.cellSize;
        emoteEl.style.left = (x * cellSize + cellSize / 2) + 'px';
        emoteEl.style.top = (y * cellSize + cellSize / 2) + 'px';

        // Add to grid
        const cursorContainer = this.ensureCursorContainer();
        cursorContainer.appendChild(emoteEl);

        // Track it
        const emoteData = { el: emoteEl, playerId };
        this.gridEmotes.push(emoteData);

        // Animate and remove after duration
        setTimeout(() => {
            emoteEl.classList.add('fade-out');
            setTimeout(() => {
                emoteEl.remove();
                this.gridEmotes = this.gridEmotes.filter(e => e !== emoteData);
            }, 500);
        }, this.emoteDurationMs);
    },

    syncEmoteButtons() {
        document.querySelectorAll('.emote-btn').forEach((button) => {
            const value = button.dataset.emote || '';
            button.classList.toggle('active', value === this.pendingEmote);
        });
    },

    setLocalEmote(emote) {
        // Legacy function - now used only for cursor emote display
        if (state.gameMode !== 'multi') return;

        const localPlayer = state.players.find(p => p.id === state.localPlayerId);
        if (!localPlayer) return;

        const normalized = emote || '';
        localPlayer.emote = normalized || null;
        this.scheduleEmoteClear(state.localPlayerId, normalized, true);

        Sync.broadcast({
            type: Protocol.types.EMOTE_UPDATE,
            data: {
                playerId: state.localPlayerId,
                emote: normalized
            }
        });
    },

    scheduleEmoteClear(playerId, emote, broadcastClear) {
        const existing = this.emoteTimers.get(playerId);
        if (existing) {
            clearTimeout(existing);
            this.emoteTimers.delete(playerId);
        }

        if (!emote) return;

        const currentEmote = emote;
        const timerId = setTimeout(() => {
            const player = state.players.find(p => p.id === playerId);
            if (!player || player.emote !== currentEmote) return;

            if (broadcastClear && playerId === state.localPlayerId) {
                this.setLocalEmote('');
            } else {
                this.updatePlayerEmote(playerId, '');
            }
        }, this.emoteDurationMs);

        this.emoteTimers.set(playerId, timerId);
    },

    updateCursorEmote(cursor, emote) {
        const label = cursor.querySelector('.cursor-label');
        if (!label) return;

        const iconClass = this.emoteIcons[emote];
        let emoteEl = label.querySelector('.cursor-emote');

        if (!iconClass) {
            if (emoteEl) {
                emoteEl.remove();
            }
            return;
        }

        if (!emoteEl) {
            emoteEl = document.createElement('i');
            emoteEl.className = 'cursor-emote fa-solid';
            label.appendChild(emoteEl);
        }

        emoteEl.className = 'cursor-emote fa-solid ' + iconClass;
        emoteEl.classList.remove('emote-pop');
        void emoteEl.offsetWidth;
        emoteEl.classList.add('emote-pop');
    },

    sendMoney() {
        if (state.gameMode !== 'multi') return;

        const targetSelect = document.getElementById('transfer-target');
        const amountInput = document.getElementById('transfer-amount');
        if (!targetSelect || !amountInput) return;

        const targetId = targetSelect.value;
        const amount = Math.floor(Number(amountInput.value));

        if (!targetId || targetId === state.localPlayerId) return;
        if (!Number.isFinite(amount) || amount <= 0) return;
        if (state.money < amount) return;

        const targetPlayer = state.players.find(player => player.id === targetId && player.connected !== false);
        if (!targetPlayer) return;

        this.applyMoneyTransfer(state.localPlayerId, targetId, amount);

        Sync.broadcast({
            type: Protocol.types.MONEY_TRANSFER,
            data: {
                fromPlayerId: state.localPlayerId,
                toPlayerId: targetId,
                amount: amount
            }
        });

        amountInput.value = '';
        targetSelect.value = '';
    },

    applyMoneyTransfer(fromPlayerId, toPlayerId, amount) {
        const transferAmount = Number(amount);
        if (!Number.isFinite(transferAmount) || transferAmount <= 0) return;

        const sender = state.players.find(player => player.id === fromPlayerId);
        const receiver = state.players.find(player => player.id === toPlayerId);

        if (sender) {
            sender.money = (sender.money || 0) - transferAmount;
        }

        if (receiver) {
            receiver.money = (receiver.money || 0) + transferAmount;
        }

        if (fromPlayerId === state.localPlayerId) {
            state.money = sender ? sender.money : state.money - transferAmount;
            els.money.innerText = Math.floor(state.money);
        } else if (toPlayerId === state.localPlayerId) {
            state.money = receiver ? receiver.money : state.money + transferAmount;
            els.money.innerText = Math.floor(state.money);
        }

        this.refreshMoneyDisplay();
    },

    reset() {
        state.players = [];
        state.gameMode = 'single';
        state.isHost = false;
        state.localPlayerId = null;
        state.hostSeed = null;
        this.roomCodeCopyReady = false;
        this.sidebarToggleReady = false;
        this.hostMonitorReady = false;

        if (this.hostMonitorTimer) {
            clearInterval(this.hostMonitorTimer);
            this.hostMonitorTimer = null;
        }

        const sidebar = document.getElementById('player-sidebar');
        if (sidebar) {
            sidebar.classList.add('hidden');
        }

        this.emoteTimers.forEach((timerId) => clearTimeout(timerId));
        this.emoteTimers.clear();
        this.remoteCursorPositions.clear();
        this.cursorTrackingReady = false;
    }
};
