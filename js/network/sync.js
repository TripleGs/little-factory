/* --- State Synchronization --- */
const Sync = {
    // Broadcast a message to all peers
    broadcast(message) {
        if (state.gameMode !== 'multi') return;

        PeerManager.broadcast(message);
    },

    // Broadcast tile placement
    broadcastTilePlaced(x, y, tile) {
        this.broadcast({
            type: Protocol.types.TILE_PLACED,
            data: {
                x: x,
                y: y,
                tile: {
                    type: tile.type,
                    rotation: tile.rotation,
                    color: tile.color,
                    producerType: tile.producerType,
                    locked: tile.locked
                },
                playerId: state.localPlayerId
            }
        });
    },

    // Broadcast tile removal
    broadcastTileRemoved(x, y) {
        this.broadcast({
            type: Protocol.types.TILE_REMOVED,
            data: {
                x: x,
                y: y,
                playerId: state.localPlayerId
            }
        });
    },

    // Broadcast item sold
    broadcastItemSold(x, y, amount) {
        this.broadcast({
            type: Protocol.types.ITEM_SOLD,
            data: {
                x: x,
                y: y,
                amount: amount,
                playerId: state.localPlayerId
            }
        });
    },

    // Broadcast money update
    broadcastMoneyUpdate() {
        this.broadcast({
            type: Protocol.types.MONEY_UPDATE,
            data: {
                playerId: state.localPlayerId,
                amount: state.money
            }
        });
    },

    // Broadcast grid expansion
    broadcastGridExpanded(type) {
        this.broadcast({
            type: Protocol.types.GRID_EXPANDED,
            data: {
                type: type,
                playerId: state.localPlayerId
            }
        });
    },

    // Broadcast unlock updates (tools, colors, producer types)
    broadcastUnlockState(data) {
        this.broadcast({
            type: Protocol.types.UNLOCK_UPDATE,
            data: data
        });
    },

    // Send full state to a peer (for resync)
    sendFullState() {
        this.broadcast({
            type: Protocol.types.FULL_STATE,
            data: {
                grid: state.grid,
                items: state.items,
                players: state.players,
                unlocks: state.unlocks,
                unlockedColors: Array.from(state.unlockedColors),
                producerTypes: state.producerTypes,
                usedIcons: Array.from(state.usedIcons)
            }
        });
    }
};
