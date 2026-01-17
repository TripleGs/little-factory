/* --- Menu System --- */
const Menu = {
    overlay: null,
    screens: {},
    playerName: 'Player',

    init() {
        this.overlay = document.getElementById('menu-overlay');
        this.screens = {
            main: document.getElementById('menu-main'),
            host: document.getElementById('menu-host'),
            join: document.getElementById('menu-join'),
            lobby: document.getElementById('menu-lobby')
        };

        // Load saved player name
        const savedName = localStorage.getItem('playerName');
        if (savedName) {
            this.playerName = savedName;
        }

        this.setupEventListeners();
        GameRoom.setupJoinRequestUI();
        this.showScreen('main');
    },

    setupEventListeners() {
        // Main menu buttons
        document.getElementById('btn-single-player').addEventListener('click', () => {
            this.startSinglePlayer();
        });

        document.getElementById('btn-host-game').addEventListener('click', () => {
            this.showScreen('host');
        });

        document.getElementById('btn-join-game').addEventListener('click', () => {
            this.showScreen('join');
        });

        // Host screen
        document.getElementById('btn-host-back').addEventListener('click', () => {
            GameRoom.leaveRoom();
            this.showScreen('main');
        });

        document.getElementById('btn-create-room').addEventListener('click', () => {
            this.createRoom();
        });

        // Join screen
        document.getElementById('btn-join-back').addEventListener('click', () => {
            GameRoom.leaveRoom();
            this.showScreen('main');
        });

        document.getElementById('btn-join-room').addEventListener('click', () => {
            this.joinRoom();
        });

        // Allow Enter key to join
        document.getElementById('join-room-code').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinRoom();
            }
        });

        // Lobby screen
        document.getElementById('btn-lobby-back').addEventListener('click', () => {
            GameRoom.leaveRoom();
            Lobby.reset();
            this.showScreen('main');
        });

        document.getElementById('btn-start-game').addEventListener('click', () => {
            if (state.isHost) {
                GameRoom.startGame();
            }
        });

        // Player name inputs
        document.querySelectorAll('.player-name-input').forEach(input => {
            input.value = this.playerName;
            input.addEventListener('change', (e) => {
                this.playerName = e.target.value || 'Player';
                localStorage.setItem('playerName', this.playerName);
                document.querySelectorAll('.player-name-input').forEach(i => {
                    i.value = this.playerName;
                });
            });
        });

        this.setupCopyButtons();
    },

    setupCopyButtons() {
        const buttons = [
            { buttonId: 'btn-copy-code', displayId: 'room-code-display' },
            { buttonId: 'btn-copy-code-lobby', displayId: 'lobby-room-code-display' }
        ];

        buttons.forEach(({ buttonId, displayId }) => {
            const btn = document.getElementById(buttonId);
            const display = document.getElementById(displayId);
            if (!btn || !display) return;

            const originalHtml = btn.innerHTML;
            btn.addEventListener('click', () => {
                const code = display.textContent;
                if (!code || code === '-----') return;
                navigator.clipboard.writeText(code).then(() => {
                    btn.textContent = 'Copied!';
                    setTimeout(() => {
                        btn.innerHTML = originalHtml;
                    }, 2000);
                });
            });
        });
    },

    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }

        // Reset UI when showing screens
        if (screenName === 'host') {
            this.clearRoomCode();
            document.getElementById('btn-create-room').style.display = 'block';
            this.updateHostStatus('Enter your name and create a room', 'info');
        } else if (screenName === 'join') {
            document.getElementById('join-room-code').value = '';
            this.clearRoomCode();
            this.updateJoinStatus('Enter the room code shared by the host', 'info');
        }
    },

    show() {
        this.overlay.classList.remove('hidden');
    },

    hide() {
        this.overlay.classList.add('hidden');
    },

    startSinglePlayer() {
        state.gameMode = 'single';
        state.localPlayerId = 'local';
        state.isHost = true;
        state.players = [{
            id: 'local',
            name: this.playerName,
            money: 0,
            color: '#4CAF50',
            emote: null
        }];

        this.hide();
        initGame();
    },

    async createRoom() {
        const nameInput = document.querySelector('#menu-host .player-name-input');
        this.playerName = nameInput.value || 'Player';
        localStorage.setItem('playerName', this.playerName);

        this.updateHostStatus('Creating room...', 'info');

        try {
            const roomCode = await GameRoom.createRoom(this.playerName);
            this.setRoomCode(roomCode);
            document.getElementById('btn-create-room').style.display = 'none';

            this.updateHostStatus('Share this code with your friends!', 'success');
            this.showScreen('lobby');
        } catch (err) {
            this.updateHostStatus('Failed to create room: ' + err.message, 'error');
        }
    },

    async joinRoom() {
        const codeInput = document.getElementById('join-room-code');
        const roomCode = codeInput.value.trim().toUpperCase();

        if (!roomCode || roomCode.length < 4) {
            this.updateJoinStatus('Please enter a valid room code', 'error');
            return;
        }

        const nameInput = document.querySelector('#menu-join .player-name-input');
        this.playerName = nameInput.value || 'Player';
        localStorage.setItem('playerName', this.playerName);

        this.updateJoinStatus('Joining room...', 'info');

        try {
            await GameRoom.joinRoom(roomCode, this.playerName);
            this.setRoomCode(roomCode);
            this.updateJoinStatus('Connected!', 'success');
            this.showScreen('lobby');
        } catch (err) {
            this.updateJoinStatus('Failed to join: ' + err.message, 'error');
        }
    },

    updateHostStatus(message, type) {
        const status = document.getElementById('host-status');
        if (status) {
            status.textContent = message;
            status.className = 'status-message ' + type;
        }
    },

    updateJoinStatus(message, type) {
        const status = document.getElementById('join-status');
        if (status) {
            status.textContent = message;
            status.className = 'status-message ' + type;
        }
    },

    setRoomCode(roomCode) {
        const hostContainer = document.getElementById('room-code-container');
        const lobbyContainer = document.getElementById('lobby-room-code-container');
        const hostDisplay = document.getElementById('room-code-display');
        const lobbyDisplay = document.getElementById('lobby-room-code-display');

        if (hostDisplay) hostDisplay.textContent = roomCode;
        if (lobbyDisplay) lobbyDisplay.textContent = roomCode;
        if (hostContainer) hostContainer.classList.remove('hidden');
        if (lobbyContainer) lobbyContainer.classList.remove('hidden');
    },

    clearRoomCode() {
        const hostContainer = document.getElementById('room-code-container');
        const lobbyContainer = document.getElementById('lobby-room-code-container');
        const hostDisplay = document.getElementById('room-code-display');
        const lobbyDisplay = document.getElementById('lobby-room-code-display');

        if (hostDisplay) hostDisplay.textContent = '-----';
        if (lobbyDisplay) lobbyDisplay.textContent = '-----';
        if (hostContainer) hostContainer.classList.add('hidden');
        if (lobbyContainer) lobbyContainer.classList.add('hidden');
    },

    goToLobby() {
        this.showScreen('lobby');
        Lobby.update();
    }
};
