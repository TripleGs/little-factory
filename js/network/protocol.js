/* --- Message Protocol --- */
const Protocol = {
    // Message type definitions
    types: {
        // Connection/lobby messages
        PLAYER_JOINED: 'player_joined',
        PLAYER_LEFT: 'player_left',
        PLAYER_LIST: 'player_list',
        GAME_START: 'game_start',
        REQUEST_SYNC: 'request_sync',
        FULL_SYNC: 'full_sync',

        // Game state messages
        TILE_PLACED: 'tile_placed',
        TILE_REMOVED: 'tile_removed',
        ITEM_SOLD: 'item_sold',

        // Player messages
        CURSOR_MOVE: 'cursor_move',
        MONEY_UPDATE: 'money_update',
        MONEY_TRANSFER: 'money_transfer',
        EMOTE_UPDATE: 'emote_update',
        UNLOCK_UPDATE: 'unlock_update',
        JOIN_DENIED: 'join_denied',

        // State sync
        FULL_STATE: 'full_state'
    },

    // Create a message object
    createMessage(type, data) {
        return {
            type: type,
            data: data,
            timestamp: Date.now(),
            senderId: state.localPlayerId
        };
    },

    // Handle incoming message
    handleMessage(message) {
        switch (message.type) {
            case this.types.PLAYER_JOINED:
                this.handlePlayerJoined(message.data);
                break;

            case this.types.PLAYER_LEFT:
                this.handlePlayerLeft(message.data);
                break;

            case this.types.PLAYER_LIST:
                this.handlePlayerList(message.data);
                break;

            case this.types.GAME_START:
                this.handleGameStart(message.data);
                break;

            case this.types.REQUEST_SYNC:
                this.handleSyncRequest(message);
                break;

            case this.types.FULL_SYNC:
                this.handleFullSync(message.data);
                break;

            case this.types.TILE_PLACED:
                this.handleTilePlaced(message.data);
                break;

            case this.types.TILE_REMOVED:
                this.handleTileRemoved(message.data);
                break;

            case this.types.ITEM_SOLD:
                this.handleItemSold(message.data);
                break;

            case this.types.CURSOR_MOVE:
                this.handleCursorMove(message.data);
                break;

            case this.types.MONEY_UPDATE:
                this.handleMoneyUpdate(message.data);
                break;

            case this.types.MONEY_TRANSFER:
                this.handleMoneyTransfer(message.data);
                break;

            case this.types.EMOTE_UPDATE:
                this.handleEmoteUpdate(message.data);
                break;

            case this.types.UNLOCK_UPDATE:
                this.handleUnlockUpdate(message.data);
                break;

            case this.types.JOIN_DENIED:
                this.handleJoinDenied(message.data);
                break;

            case this.types.FULL_STATE:
                this.handleFullState(message.data);
                break;

            default:
                console.warn('Unknown message type:', message.type);
        }
    },

    handlePlayerJoined(data) {
        const player = data.player;

        // Don't add ourselves
        if (player.id === state.localPlayerId) return;

        // Check if player already exists
        const existing = state.players.find(p => p.id === player.id);
        if (existing) {
            // Update existing player
            Object.assign(existing, player);
        } else {
            state.players.push(player);
        }

        Lobby.update();
    },

    handlePlayerLeft(data) {
        const { playerId } = data;

        // Remove player from list
        state.players = state.players.filter(p => p.id !== playerId);

        Lobby.update();

        // Remove their cursor
        Lobby.clearRemoteCursor(playerId);
    },

    handlePlayerList(data) {
        // Merge with existing state, preserving local player
        const { players } = data;
        players.forEach(player => {
            if (player.id === state.localPlayerId) {
                // Update our record but keep local money
                const localPlayer = state.players.find(p => p.id === state.localPlayerId);
                if (localPlayer) {
                    Object.assign(localPlayer, player, { money: state.money });
                }
            } else {
                const existing = state.players.find(p => p.id === player.id);
                if (existing) {
                    Object.assign(existing, player);
                } else {
                    state.players.push(player);
                }
            }
        });

        Lobby.update();
    },

    handleGameStart(data) {
        // Update players list from host
        state.players = data.players;

        // Find ourselves in the list and update money
        const localPlayer = state.players.find(p => p.id === state.localPlayerId);
        if (localPlayer) {
            state.money = localPlayer.money;
        }

        // Apply initial state from host
        if (data.initialState) {
            state.cols = data.initialState.cols || state.cols;
            state.rows = data.initialState.rows || state.rows;

            // Apply producer types from host (critical for sync!)
            if (data.initialState.producerTypes) {
                state.producerTypes = data.initialState.producerTypes;
            }
            if (data.initialState.usedIcons) {
                state.usedIcons = new Set(data.initialState.usedIcons);
            }
            if (data.initialState.selectedProducerType !== undefined) {
                state.selectedProducerType = data.initialState.selectedProducerType;
            }
            if (data.initialState.unlocks) {
                state.unlocks = { ...state.unlocks, ...data.initialState.unlocks };
            }
            if (data.initialState.unlockedColors) {
                state.unlockedColors = new Set(data.initialState.unlockedColors);
            }

            // Store grid to apply after setupGrid
            state._pendingGrid = data.initialState.grid;
        }

        GameRoom.gameStarted = true;
        Lobby.beginGame();
    },

    handleSyncRequest(message) {
        // Host handles sync requests
        if (state.isHost) {
            const { playerId, isReconnect } = message.data;
            GameRoom.handleSyncRequest(message.fromPeerId, isReconnect);
        }
    },

    handleFullSync(data) {
        // Received full game state (for reconnection or late join)
        const { players, gameState, yourMoney } = data;

        // Update players
        state.players = players;

        // Update our money
        state.money = yourMoney;
        const localPlayer = state.players.find(p => p.id === state.localPlayerId);
        if (localPlayer) {
            localPlayer.money = yourMoney;
        }

        // Apply game state
        if (gameState) {
            state.cols = gameState.cols;
            state.rows = gameState.rows;
            state.producerTypes = gameState.producerTypes || [];
            state.usedIcons = new Set(gameState.usedIcons || []);
            state.selectedProducerType = gameState.selectedProducerType || 0;
            if (gameState.unlocks) {
                state.unlocks = { ...state.unlocks, ...gameState.unlocks };
            }
            state.unlockedColors = new Set(gameState.unlockedColors || []);

            // Store grid and items to apply
            state._pendingGrid = gameState.grid;
            if (gameState.items) {
                state._pendingItems = gameState.items;
            }
        }

        // Start or resume game
        if (!GameRoom.gameStarted) {
            GameRoom.gameStarted = true;
        }

        // Initialize/reinitialize game
        Lobby.beginGame();
    },

    handleTilePlaced(data) {
        const { x, y, tile, playerId } = data;

        // Don't process our own placement
        if (playerId === state.localPlayerId) return;

        // Update the grid
        if (state.grid[y] && state.grid[y][x]) {
            const gridTile = state.grid[y][x];
            gridTile.type = tile.type;
            gridTile.rotation = tile.rotation;
            gridTile.color = tile.color;
            gridTile.producerType = tile.producerType;
            gridTile.locked = tile.locked;

            renderCell(x, y, gridTile);
        }
    },

    handleTileRemoved(data) {
        const { x, y, playerId } = data;

        // Don't process our own removal
        if (playerId === state.localPlayerId) return;

        if (state.grid[y] && state.grid[y][x]) {
            const tile = state.grid[y][x];
            tile.type = null;
            tile.rotation = 0;
            tile.color = null;
            tile.producerType = null;
            tile.locked = false;

            // Remove items at this location
            state.items = state.items.filter(i => i.x !== x || i.y !== y);

            renderCell(x, y, tile);
        }
    },

    handleItemSold(data) {
        // Items are sold locally on each client, money updates come via MONEY_UPDATE
        // This handler is kept for potential future use (e.g., showing remote sale animations)
    },

    handleCursorMove(data) {
        const { x, y, playerId } = data;

        // Don't show our own cursor
        if (playerId === state.localPlayerId) return;

        Lobby.updateRemoteCursor(playerId, x, y);
    },

    handleMoneyUpdate(data) {
        const { playerId, amount } = data;

        // Only update other players' money, not our own
        // Our local state.money is the source of truth for ourselves
        if (playerId !== state.localPlayerId) {
            Lobby.updatePlayerMoney(playerId, amount);
            GameRoom.updatePlayerMoney(playerId, amount);
        }
    },

    handleMoneyTransfer(data) {
        const { fromPlayerId, toPlayerId, amount } = data;
        if (!fromPlayerId || !toPlayerId || fromPlayerId === toPlayerId) return;

        const transferAmount = Number(amount);
        if (!Number.isFinite(transferAmount) || transferAmount <= 0) return;

        Lobby.applyMoneyTransfer(fromPlayerId, toPlayerId, transferAmount);
    },

    handleEmoteUpdate(data) {
        const { playerId, emote } = data;
        if (!playerId) return;

        Lobby.updatePlayerEmote(playerId, emote);
    },

    handleUnlockUpdate(data) {
        if (!data) return;

        if (data.unlocks) {
            Object.keys(data.unlocks).forEach((key) => {
                if (data.unlocks[key]) {
                    state.unlocks[key] = true;
                }
            });
        }

        if (Array.isArray(data.unlockedColors)) {
            data.unlockedColors.forEach((colorId) => {
                state.unlockedColors.add(colorId);
            });
        }

        if (Array.isArray(data.producerTypes)) {
            data.producerTypes.forEach((incoming) => {
                const existing = state.producerTypes.find((p) => p.id === incoming.id);
                if (existing) {
                    Object.assign(existing, incoming);
                } else {
                    state.producerTypes.push(incoming);
                }
            });
            state.producerTypes.sort((a, b) => a.id - b.id);
        }

        if (Array.isArray(data.usedIcons)) {
            data.usedIcons.forEach((icon) => state.usedIcons.add(icon));
        }

        if (data.sellerPlacement && state.grid[data.sellerPlacement.y]) {
            const { x, y, tile } = data.sellerPlacement;
            if (state.grid[y] && state.grid[y][x]) {
                state.grid[y][x] = tile;
                renderCell(x, y, tile);
            }
        }

        renderPalette();
        renderSubPalette();
    },

    handleJoinDenied(data) {
        const reason = data?.reason || 'Join request denied.';
        GameRoom.leaveRoom();
        Lobby.reset();
        Menu.show();
        Menu.showScreen('join');
        Menu.updateJoinStatus(reason, 'error');
    },

    handleFullState(data) {
        // Used for late joiners or resync
        if (data.grid) {
            state.grid = data.grid;
            // Re-render entire grid
            for (let y = 0; y < state.rows; y++) {
                for (let x = 0; x < state.cols; x++) {
                    renderCell(x, y, state.grid[y][x]);
                }
            }
        }

        if (data.players) {
            state.players = data.players;
            Lobby.refreshMoneyDisplay();
        }

        if (data.unlocks) {
            state.unlocks = { ...state.unlocks, ...data.unlocks };
        }

        if (data.unlockedColors) {
            state.unlockedColors = new Set(data.unlockedColors);
        }

        if (data.producerTypes) {
            state.producerTypes = data.producerTypes;
        }

        if (data.usedIcons) {
            state.usedIcons = new Set(data.usedIcons);
        }

        if (data.items) {
            state.items = data.items;
        }

        renderPalette();
        renderSubPalette();
    }
};
