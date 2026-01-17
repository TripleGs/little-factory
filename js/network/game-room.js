/* --- Game Room System (PeerJS Only) --- */

const GameRoom = {
    roomCode: null,
    isHost: false,
    gameStarted: false,
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

        player.money = this.lateJoinMoney;
        player.connected = true;
        player.isHost = false;

        this.addPlayer(player);
        this.handleSyncRequest(peerId);

        this.clearJoinRequestModal();
        this.showNextJoinRequest();
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
            connected: true
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

        // Set up local state
        state.gameMode = 'multi';
        state.isHost = false;
        state.localPlayerId = playerId;

        // The host's peer ID is predictable: roomCode-host
        const hostPeerId = this.roomCode + '-host';

        try {
            await PeerManager.connectToPeer(hostPeerId);
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
            connected: true
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

    // Called by PeerManager when a player connects (host only)
    onPlayerConnected(peerId) {
        console.log('Player connected via PeerJS:', peerId);
        // Player will send player_joined message
    },

    // Called by PeerManager when a player disconnects
    onPlayerDisconnected(peerId) {
        console.log('Player disconnected:', peerId);

        // Find and mark player as disconnected
        const player = state.players.find(p => p.peerId === peerId);
        if (player) {
            const playerId = player.id;
            state.players = state.players.filter(p => p.peerId !== peerId);
            Lobby.update();

            // Notify other players
            if (this.isHost) {
                PeerManager.broadcast({
                    type: 'player_left',
                    data: { playerId: playerId }
                });
            }
        }

        // Remove their cursor
        const cursor = document.getElementById('cursor-' + peerId);
        if (cursor) cursor.remove();
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
        this.pendingJoinRequests = [];
        this.activeJoinRequest = null;
        this.clearJoinRequestModal();
    }
};
