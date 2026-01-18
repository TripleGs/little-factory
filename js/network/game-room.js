/* --- Game Room System (PeerJS Only) --- */

const GameRoom = {
    roomCode: null,
    isHost: false,
    gameStarted: false,
    hostPeerId: null,
    reconnectInProgress: false,
    rehosting: false,
    pendingJoinRequests: [],
    activeJoinRequest: null,
    joinRequestReady: false,
    lateJoinMoney: 100,
    playerColors: ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722', '#795548'],

    // Generate a simple room code
    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },

    setupJoinRequestUI() {
        if (this.joinRequestReady) return;

        const acceptBtn = document.getElementById('btn-accept-join');
        const denyBtn = document.getElementById('btn-deny-join');
        if (!acceptBtn || !denyBtn) return;

        acceptBtn.addEventListener('click', () => {
            this.acceptJoinRequest();
        });

        denyBtn.addEventListener('click', () => {
            this.denyJoinRequest();
        });

        this.joinRequestReady = true;
    },

    queueJoinRequest(player, fromPeerId) {
        if (!this.isHost) return;

        const request = {
            player: { ...player, peerId: fromPeerId },
            peerId: fromPeerId
        };

        this.pendingJoinRequests.push(request);
        this.showNextJoinRequest();
        Lobby.update();
    },

    showNextJoinRequest() {
        if (this.activeJoinRequest || this.pendingJoinRequests.length === 0) return;

        this.activeJoinRequest = this.pendingJoinRequests.shift();
        const modal = document.getElementById('join-request-modal');
        const nameEl = document.getElementById('join-request-name');
        if (nameEl) {
            nameEl.textContent = this.activeJoinRequest.player.name || 'Player';
        }
        if (modal) {
            modal.classList.remove('hidden');
        }
    },

    clearJoinRequestModal() {
        const modal = document.getElementById('join-request-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.activeJoinRequest = null;
    },

    acceptJoinRequest() {
        if (!this.activeJoinRequest) return;

        const { player, peerId } = this.activeJoinRequest;
        if (!player) {
            this.clearJoinRequestModal();
            this.showNextJoinRequest();
            return;
        }

        const conn = peerId ? PeerManager.connections.get(peerId) : null;
        if (!conn || !conn.open) {
            this.clearJoinRequestModal();
            this.showNextJoinRequest();
            return;
        }

        player.money = this.lateJoinMoney;
        player.connected = true;
        player.isHost = false;

        this.addPlayer(player);
        this.handleSyncRequest(peerId);

        this.clearJoinRequestModal();
        this.showNextJoinRequest();
        Lobby.update();
    },

    denyJoinRequest() {
        if (!this.activeJoinRequest) return;

        const { peerId } = this.activeJoinRequest;
        if (peerId) {
            PeerManager.sendTo(peerId, {
                type: 'join_denied',
                data: { reason: 'Host denied the request.' }
            });
            const conn = PeerManager.connections.get(peerId);
            if (conn) {
                setTimeout(() => conn.close(), 200);
            }
        }

        this.clearJoinRequestModal();
        this.showNextJoinRequest();
        Lobby.update();
    },

    // Create a new game room (host)
    async createRoom(playerName) {
        this.isHost = true;
        this.roomCode = this.generateRoomCode();

        // Initialize PeerJS with room code as the peer ID prefix
        await PeerManager.init(this.roomCode + '-host');

        PeerManager.isHost = true;
        PeerManager.roomCode = this.roomCode;

        const playerId = PeerManager.peerId;
        const startingIcon = (typeof Meta !== 'undefined') ? Meta.getSelectedStartingIcon() : null;
        this.hostPeerId = playerId;
        PeerManager.hostPeerId = playerId;

        // Set up local state
        state.gameMode = 'multi';
        state.isHost = true;
        state.localPlayerId = playerId;
        state.players = [{
            id: playerId,
            peerId: playerId,
            name: playerName,
            color: this.playerColors[0],
            money: 0,
            emote: null,
            isHost: true,
            connected: true,
            startingIcon: startingIcon
        }];

        return this.roomCode;
    },

    // Join an existing room
    async joinRoom(roomCode, playerName) {
        this.roomCode = roomCode.toUpperCase();
        this.isHost = false;

        // Initialize PeerJS with a unique ID
        const odId = 'player-' + Math.random().toString(36).substr(2, 9);
        await PeerManager.init(this.roomCode + '-' + odId);

        PeerManager.isHost = false;
        PeerManager.roomCode = this.roomCode;

        const playerId = PeerManager.peerId;
        const startingIcon = (typeof Meta !== 'undefined') ? Meta.getSelectedStartingIcon() : null;

        // Set up local state
        state.gameMode = 'multi';
        state.isHost = false;
        state.localPlayerId = playerId;

        // The host's peer ID is predictable: roomCode-host
        const hostPeerId = this.roomCode + '-host';
        this.hostPeerId = hostPeerId;
        PeerManager.hostPeerId = hostPeerId;

        try {
            await this.connectToPeerWithRetry(hostPeerId, 6, 1000);
        } catch (err) {
            throw new Error('Could not connect to host. Room may not exist.');
        }

        // Create our player object
        const playerColor = this.playerColors[1 + Math.floor(Math.random() * (this.playerColors.length - 1))];
        state.players = [{
            id: playerId,
            peerId: playerId,
            name: playerName,
            color: playerColor,
            money: 0,
            emote: null,
            isHost: false,
            connected: true,
            startingIcon: startingIcon
        }];

        // Send join message to host
        PeerManager.sendToHost({
            type: 'player_joined',
            data: {
                player: state.players[0]
            }
        });

        return { isReconnect: false };
    },

    async connectToPeerWithRetry(peerId, attempts, delayMs) {
        if (PeerManager.connections.has(peerId)) {
            return PeerManager.connections.get(peerId);
        }

        const maxAttempts = Math.max(1, attempts || 1);
        const waitMs = Number.isFinite(delayMs) ? delayMs : 800;
        let lastError = null;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                return await PeerManager.connectToPeer(peerId);
            } catch (err) {
                lastError = err;
                if (attempt < maxAttempts - 1) {
                    await new Promise(resolve => setTimeout(resolve, waitMs));
                }
            }
        }

        throw lastError || new Error('Connection failed.');
    },

    // Called by PeerManager when a player connects (host only)
    onPlayerConnected(peerId) {
        console.log('Player connected via PeerJS:', peerId);
        // Player will send player_joined message
    },

    handlePlayerDeparture(playerId) {
        const playerIndex = state.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return { wasHost: false, leavingMoney: 0 };

        const player = state.players[playerIndex];
        const wasHost = player.isHost;
        const leavingMoney = Number(player.money) || 0;

        state.players.splice(playerIndex, 1);
        Lobby.update();
        Lobby.clearRemoteCursor(playerId);

        if (leavingMoney > 0 && state.players.length > 0) {
            const share = leavingMoney / state.players.length;
            state.players.forEach(p => {
                p.money = (p.money || 0) + share;
            });

            const localPlayer = state.players.find(p => p.id === state.localPlayerId);
            if (localPlayer) {
                state.money = localPlayer.money;
                if (els.money) {
                    els.money.innerText = Math.floor(state.money);
                }
                spawnFloatingText(Math.floor(state.cols / 2), Math.floor(state.rows / 2), `Inherited $${share.toFixed(1)}`);
            }

            Lobby.refreshMoneyDisplay();
            if (state.gameMode === 'multi') {
                Sync.broadcastMoneyUpdate();
            }
        }

        return { wasHost, leavingMoney };
    },

    // Called by PeerManager when a player disconnects
    onPlayerDisconnected(peerId) {
        console.log('Player disconnected:', peerId);
        if (this.rehosting) return;

        let pendingRemoved = false;
        if (this.activeJoinRequest && this.activeJoinRequest.peerId === peerId) {
            this.clearJoinRequestModal();
            this.showNextJoinRequest();
            pendingRemoved = true;
        }
        if (this.pendingJoinRequests.length > 0) {
            const nextQueue = this.pendingJoinRequests.filter(req => req.peerId !== peerId);
            if (nextQueue.length !== this.pendingJoinRequests.length) {
                pendingRemoved = true;
            }
            this.pendingJoinRequests = nextQueue;
        }
        if (pendingRemoved) {
            Lobby.update();
        }

        // Find the disconnected player
        let leavingPlayer = state.players.find(p => p.peerId === peerId || p.id === peerId);
        if (!leavingPlayer && peerId === this.hostPeerId) {
            leavingPlayer = state.players.find(p => p.isHost);
        }
        if (leavingPlayer) {
            const playerId = leavingPlayer.id;
            const { wasHost } = this.handlePlayerDeparture(playerId);

            // Notify other players (if we're host)
            if (this.isHost) {
                // Broadcast removal
                PeerManager.broadcast({
                    type: 'player_left',
                    data: { playerId: playerId }
                });

                // Broadcast new player list (important so clients remove them)
                PeerManager.broadcast({
                    type: 'player_list',
                    data: { players: state.players }
                });

                // Broadcast money updates
                Sync.broadcastMoneyUpdate();
            }

            // If the host left and we're not the host, we'll rely on the host monitor to convert to single player
        } else if (peerId === this.hostPeerId && !state.isHost) {
            // Host disconnected - will be handled by host monitor
        }

        // Remove their cursor
        const cursor = document.getElementById('cursor-' + peerId);
        if (cursor) cursor.remove();
    },

    kickPlayer(playerId) {
        if (!this.isHost || !playerId) return;
        if (playerId === state.localPlayerId) return;

        const player = state.players.find(p => p.id === playerId);
        if (!player) return;

        const peerId = player.peerId || player.id;
        if (peerId) {
            PeerManager.sendTo(peerId, {
                type: Protocol.types.PLAYER_KICKED,
                data: { reason: 'You were removed by the host.' }
            });
            const conn = PeerManager.connections.get(peerId);
            if (conn) {
                setTimeout(() => conn.close(), 200);
            }
        }

        this.handlePlayerDeparture(playerId);

        PeerManager.broadcast({
            type: 'player_left',
            data: { playerId: playerId }
        });

        PeerManager.broadcast({
            type: 'player_list',
            data: { players: state.players }
        });
    },

    // Convert to single player mode
    convertToSinglePlayer() {
        console.log('Converting to single-player mode...');
        spawnFloatingText(Math.floor(state.cols / 2), Math.floor(state.rows / 2), "Host disconnected - now single player");

        // Clean up multiplayer state
        PeerManager.destroy();

        // Switch to single player
        state.gameMode = 'single';
        state.isHost = false;
        this.isHost = false;
        this.hostPeerId = null;
        this.reconnectInProgress = false;

        // Keep only local player
        const localPlayer = state.players.find(p => p.id === state.localPlayerId);
        if (localPlayer) {
            state.players = [localPlayer];
        } else {
            state.players = [];
        }

        // Hide multiplayer UI
        const sidebar = document.getElementById('player-sidebar');
        if (sidebar) {
            sidebar.classList.add('hidden');
        }

        // Clear remote cursors
        const cursorContainer = document.getElementById('cursor-container');
        if (cursorContainer) {
            cursorContainer.innerHTML = '';
        }

        Lobby.update();
    },

    // Host adds a new player
    addPlayer(player) {
        // Assign color if needed
        if (!player.color) {
            const usedColors = state.players.map(p => p.color);
            player.color = this.playerColors.find(c => !usedColors.includes(c)) || this.playerColors[0];
        }
        if (player.emote === undefined) {
            player.emote = null;
        }

        // Check if player already exists (reconnect)
        const existing = state.players.find(p => p.id === player.id);
        if (existing) {
            existing.connected = true;
            existing.peerId = player.peerId;
        } else {
            state.players.push(player);
        }

        Lobby.update();

        // Send full player list to everyone
        if (this.isHost) {
            PeerManager.broadcast({
                type: 'player_list',
                data: { players: state.players }
            });
        }
    },

    // Host starts the game
    startGame() {
        if (!this.isHost) return;

        // Initialize game state (host generates it)
        Lobby.initHostGame();

        this.gameStarted = true;

        // Distribute starting money
        const startingMoney = COLOR_CONFIG.starting.money;
        state.players.forEach(player => {
            player.money = startingMoney;
        });

        // Send full state to all connected peers
        const gameStateMsg = {
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
        };

        PeerManager.broadcast(gameStateMsg);

        // Start game locally
        Lobby.finishGameStart();
    },

    // Handle sync request from a player (e.g., if they rejoin mid-game)
    handleSyncRequest(peerId) {
        if (!this.isHost) return;

        // Find player
        const player = state.players.find(p => p.peerId === peerId);

        // Send full game state
        PeerManager.sendTo(peerId, {
            type: 'full_sync',
            data: {
                players: state.players,
                gameState: {
                    cols: state.cols,
                    rows: state.rows,
                    grid: state.grid,
                    producerTypes: state.producerTypes,
                    usedIcons: Array.from(state.usedIcons),
                    selectedProducerType: state.selectedProducerType,
                    hostSeed: state.hostSeed,
                    unlocks: state.unlocks,
                    unlockedColors: Array.from(state.unlockedColors),
                    items: state.items
                },
                yourMoney: player?.money || COLOR_CONFIG.starting.money
            }
        });
    },

    // Update player money (just updates local state)
    updatePlayerMoney(playerId, amount) {
        const player = state.players.find(p => p.id === playerId);
        if (player) {
            player.money = amount;
        }
    },

    // Leave the room
    leaveRoom() {
        PeerManager.destroy();

        this.roomCode = null;
        this.gameStarted = false;
        this.isHost = false;
        this.hostPeerId = null;
        this.reconnectInProgress = false;
        this.pendingJoinRequests = [];
        this.activeJoinRequest = null;
        this.clearJoinRequestModal();
    }
};
