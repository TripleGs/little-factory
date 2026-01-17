/* --- PeerJS Connection Manager --- */

const PeerManager = {
    peer: null,
    peerId: null,
    connections: new Map(), // peerId -> DataConnection
    roomCode: null,
    isHost: false,

    // Initialize PeerJS with a specific ID
    async init(peerId) {
        this.peerId = peerId;

        return new Promise((resolve, reject) => {
            // Create peer with specific ID
            this.peer = new Peer(peerId, {
                debug: 1 // 0 = none, 1 = errors, 2 = warnings, 3 = all
            });

            this.peer.on('open', (id) => {
                console.log('PeerJS connected with ID:', id);
                this.peerId = id;
                resolve(id);
            });

            this.peer.on('error', (err) => {
                console.error('PeerJS error:', err);
                if (err.type === 'unavailable-id') {
                    // ID taken (room code already in use)
                    reject(new Error('Room code already in use. Try a different one.'));
                } else if (err.type === 'peer-unavailable') {
                    // Peer we tried to connect to doesn't exist
                    reject(new Error('Room not found. Check the code and try again.'));
                } else {
                    reject(err);
                }
            });

            this.peer.on('connection', (conn) => {
                this.handleIncomingConnection(conn);
            });

            this.peer.on('disconnected', () => {
                console.log('PeerJS disconnected from signaling server');
                // Try to reconnect
                if (!this.peer.destroyed) {
                    this.peer.reconnect();
                }
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!this.peer.open) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    },

    // Handle incoming connection (host receives these)
    handleIncomingConnection(conn) {
        console.log('Incoming connection from:', conn.peer);

        conn.on('open', () => {
            this.connections.set(conn.peer, conn);
            this.setupConnectionHandlers(conn);

            // Notify game room of new connection
            if (this.isHost) {
                GameRoom.onPlayerConnected(conn.peer);
            }
        });
    },

    // Connect to a peer (joiners call this)
    async connectToPeer(peerId) {
        return new Promise((resolve, reject) => {
            const conn = this.peer.connect(peerId, {
                reliable: true
            });

            conn.on('open', () => {
                console.log('Connected to peer:', peerId);
                this.connections.set(peerId, conn);
                this.setupConnectionHandlers(conn);
                resolve(conn);
            });

            conn.on('error', (err) => {
                console.error('Connection error:', err);
                reject(err);
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!conn.open) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    },

    // Set up handlers for a connection
    setupConnectionHandlers(conn) {
        conn.on('data', (data) => {
            this.handleMessage(conn.peer, data);
        });

        conn.on('close', () => {
            console.log('Connection closed:', conn.peer);
            this.connections.delete(conn.peer);
            GameRoom.onPlayerDisconnected(conn.peer);
        });

        conn.on('error', (err) => {
            console.error('Connection error with', conn.peer, err);
        });
    },

    // Handle incoming message
    handleMessage(fromPeerId, message) {
        // Add sender info
        message.fromPeerId = fromPeerId;

        // Special handling for player_joined on host
        if (this.isHost && message.type === 'player_joined') {
            if (GameRoom.gameStarted) {
                GameRoom.queueJoinRequest(message.data.player, fromPeerId);
                return;
            }
            GameRoom.addPlayer(message.data.player);
        }

        // If we're host and this should be relayed to others, do so
        if (this.isHost && message.relay !== false) {
            this.relayMessage(fromPeerId, message);
        }

        // Process the message
        Protocol.handleMessage(message);
    },

    // Host relays messages to all other peers
    relayMessage(fromPeerId, message) {
        const relayMsg = { ...message, relay: false }; // Don't relay again
        this.connections.forEach((conn, peerId) => {
            if (peerId !== fromPeerId && conn.open) {
                conn.send(relayMsg);
            }
        });
    },

    // Send to all connected peers
    broadcast(message) {
        const fullMessage = Protocol.createMessage(message.type, message.data);
        this.connections.forEach((conn) => {
            if (conn.open) {
                conn.send(fullMessage);
            }
        });
    },

    // Send to specific peer
    sendTo(peerId, message) {
        const conn = this.connections.get(peerId);
        if (conn && conn.open) {
            conn.send(Protocol.createMessage(message.type, message.data));
        }
    },

    // Send to host only (for non-hosts)
    sendToHost(message) {
        if (!this.isHost && this.connections.size > 0) {
            const hostConn = this.connections.values().next().value;
            if (hostConn && hostConn.open) {
                hostConn.send(Protocol.createMessage(message.type, message.data));
            }
        }
    },

    // Clean up
    destroy() {
        this.connections.forEach(conn => conn.close());
        this.connections.clear();
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.peerId = null;
        this.isHost = false;
        this.roomCode = null;
    },

    // Get connection count
    getConnectionCount() {
        return this.connections.size;
    }
};
