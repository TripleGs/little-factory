/* --- Menu System --- */
const Menu = {
    overlay: null,
    screens: {},
    playerName: 'Player',
    settingsReady: false,

    init() {
        this.overlay = document.getElementById('menu-overlay');
        this.screens = {
            main: document.getElementById('menu-main'),
            play: document.getElementById('menu-play'),
            multi: document.getElementById('menu-multi'),
            host: document.getElementById('menu-host'),
            join: document.getElementById('menu-join'),
            lobby: document.getElementById('menu-lobby'),
            shop: document.getElementById('menu-shop'),
            achievements: document.getElementById('menu-achievements'),
            settings: document.getElementById('menu-settings')
        };

        // Load saved player name
        const savedName = localStorage.getItem('playerName');
        if (savedName) {
            this.playerName = savedName;
        }

        this.setupEventListeners();
        GameRoom.setupJoinRequestUI();
        if (typeof Meta !== 'undefined') {
            Meta.load();
        }
        if (typeof Achievements !== 'undefined') {
            Achievements.init();
        }
        this.applySoundSettings();
        this.updateMetaDisplays();
        this.renderShop();
        this.renderAchievements();
        this.showScreen('main');
    },

    setupEventListeners() {
        // Main menu buttons
        document.getElementById('btn-play').addEventListener('click', () => {
            this.showScreen('play');
        });

        document.getElementById('btn-play-back').addEventListener('click', () => {
            this.showScreen('main');
        });

        document.getElementById('btn-single-player').addEventListener('click', () => {
            this.startSinglePlayer();
        });

        document.getElementById('btn-multi-player').addEventListener('click', () => {
            this.showScreen('multi');
        });

        document.getElementById('btn-multi-back').addEventListener('click', () => {
            this.showScreen('play');
        });

        document.getElementById('btn-host-game').addEventListener('click', () => {
            this.showScreen('host');
        });

        document.getElementById('btn-join-game').addEventListener('click', () => {
            this.showScreen('join');
        });

        document.getElementById('btn-icon-shop').addEventListener('click', () => {
            this.renderShop();
            this.showScreen('shop');
        });

        document.getElementById('btn-achievements').addEventListener('click', () => {
            this.renderAchievements();
            this.showScreen('achievements');
        });

        const menuSettingsBtn = document.getElementById('btn-settings');
        if (menuSettingsBtn) {
            menuSettingsBtn.addEventListener('click', () => {
                this.renderSettings();
                this.showScreen('settings');
            });
        }

        // Host screen
        document.getElementById('btn-host-back').addEventListener('click', () => {
            GameRoom.leaveRoom();
            this.showScreen('multi');
        });

        document.getElementById('btn-create-room').addEventListener('click', () => {
            this.createRoom();
        });

        // Join screen
        document.getElementById('btn-join-back').addEventListener('click', () => {
            GameRoom.leaveRoom();
            this.showScreen('multi');
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

        document.getElementById('btn-shop-back').addEventListener('click', () => {
            this.showScreen('main');
        });

        document.getElementById('btn-achievements-back').addEventListener('click', () => {
            this.showScreen('main');
        });

        document.getElementById('btn-settings-back').addEventListener('click', () => {
            this.showScreen('main');
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

        document.querySelectorAll('.menu-btn').forEach(button => {
            button.addEventListener('click', () => {
                Sound.play('click');
            });
        });

        this.setupSettingsControls();
        this.setupCopyButtons();

        // In-Game Settings Button
        const gameSettingsBtn = document.getElementById('btn-ingame-settings');
        if (gameSettingsBtn) {
            gameSettingsBtn.addEventListener('click', () => {
                Sound.play('click');
                this.renderSettings();
                this.showScreen('settings');
                this.overlay.classList.remove('hidden');

                // Add "Return to Menu" button if not present
                this.ensureReturnToMenuButton();
            });
        }
    },

    ensureReturnToMenuButton() {
        // Only add if we are in game mode (state.gameStarted or just check existence)
        const settingsScreen = document.getElementById('menu-settings');
        const buttonsContainer = settingsScreen.querySelector('.menu-buttons');

        if (!document.getElementById('btn-return-menu')) {
            const returnBtn = document.createElement('button');
            returnBtn.id = 'btn-return-menu';
            returnBtn.className = 'menu-btn danger';
            returnBtn.innerHTML = '<i class="fa-solid fa-house"></i> Return to Menu';

            returnBtn.onclick = () => {
                Sound.play('click');
                // Basic cleanup
                GameRoom.leaveRoom();
                Lobby.reset();
                this.showScreen('main');
                // Hide the return button again for next time
                returnBtn.style.display = 'none';
            };

            // Insert before back button
            const backBtn = document.getElementById('btn-settings-back');
            buttonsContainer.insertBefore(returnBtn, backBtn);
        } else {
            document.getElementById('btn-return-menu').style.display = 'flex';
        }

        // Adjust back button behavior to close overlay if in-game
        const backBtn = document.getElementById('btn-settings-back');
        // Remove old listeners to cleanly switch behavior is tricky without storing reference.
        // Simplified approach: Make back button check context
        backBtn.onclick = () => {
            Sound.play('click');
            const isIngame = !document.querySelector('#menu-main.active');
            // Better check: are we pausing a running game? 
            if (this.overlay.classList.contains('hidden') === false && state.gameMode) {
                // If we came from game, just hide overlay
                this.hide();
            } else {
                this.showScreen('main');
            }

            // Hide return button
            const returnBtn = document.getElementById('btn-return-menu');
            if (returnBtn) returnBtn.style.display = 'none';
        };
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
        } else if (screenName === 'main') {
            this.updateMetaDisplays();
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
        state.hostSeed = null;
        const startingIcon = (typeof Meta !== 'undefined') ? Meta.getSelectedStartingIcon() : null;
        state.players = [{
            id: 'local',
            name: this.playerName,
            money: 0,
            color: '#4CAF50',
            emote: null,
            startingIcon: startingIcon
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

    updateMetaDisplays() {
        const diamonds = (typeof Meta !== 'undefined') ? Meta.getDiamonds() : 0;
        const shopDiamondEl = document.getElementById('shop-diamond-count');
        if (shopDiamondEl) shopDiamondEl.textContent = diamonds;

        const iconEl = document.getElementById('starting-icon-display');
        if (iconEl) {
            const iconClass = (typeof Meta !== 'undefined') ? Meta.getSelectedStartingIcon() : null;
            iconEl.innerHTML = iconClass ? `<i class="${iconClass}"></i>` : '<i class="fa-solid fa-question"></i>';
        }
    },

    applySoundSettings() {
        if (typeof Meta === 'undefined') return;
        const settings = Meta.getSettings();
        Sound.setMuted(settings.muted);
        Sound.setVolume(settings.volume);
    },

    setupSettingsControls() {
        if (this.settingsReady) return;
        const muteToggle = document.getElementById('setting-mute');
        const volumeRange = document.getElementById('setting-volume');
        const volumeLabel = document.getElementById('setting-volume-label');
        if (!muteToggle || !volumeRange || !volumeLabel || typeof Meta === 'undefined') return;

        muteToggle.addEventListener('change', () => {
            const muted = muteToggle.checked;
            Meta.setSettings({ muted });
            Sound.setMuted(muted);
            if (!muted) {
                Sound.play('click');
            }
        });

        volumeRange.addEventListener('input', () => {
            const volume = Math.max(0, Math.min(1, Number(volumeRange.value) / 100));
            Meta.setSettings({ volume });
            Sound.setVolume(volume);
            volumeLabel.textContent = `${Math.round(volume * 100)}%`;
        });

        this.settingsReady = true;
    },

    renderSettings() {
        const muteToggle = document.getElementById('setting-mute');
        const volumeRange = document.getElementById('setting-volume');
        const volumeLabel = document.getElementById('setting-volume-label');
        if (!muteToggle || !volumeRange || !volumeLabel || typeof Meta === 'undefined') return;
        const settings = Meta.getSettings();
        muteToggle.checked = settings.muted;
        volumeRange.value = Math.round((settings.volume || 0) * 100);
        volumeLabel.textContent = `${volumeRange.value}%`;
    },

    updateShopStatus(message, type) {
        const status = document.getElementById('shop-status');
        if (status) {
            status.textContent = message;
            status.className = 'status-message ' + type;
        }
    },

    renderShop() {
        const grid = document.getElementById('icon-shop-grid');
        if (!grid || typeof Meta === 'undefined') return;
        this.updateMetaDisplays();
        grid.innerHTML = '';

        const selectedIcon = Meta.getSelectedStartingIcon();
        COLOR_CONFIG.availableIcons.forEach((iconClass) => {
            const owned = Meta.ownsIcon(iconClass);
            const selected = selectedIcon === iconClass;
            const card = document.createElement('button');
            card.className = 'icon-shop-card';
            if (owned) card.classList.add('owned');
            if (selected) card.classList.add('selected');
            card.dataset.icon = iconClass;

            const label = owned ? (selected ? 'Selected' : 'Select') : `<i class="fa-solid fa-gem"></i> ${META_CONFIG.iconCost}`;
            card.innerHTML = `
                <div class="icon-shop-glyph"><i class="${iconClass}"></i></div>
                <div class="icon-shop-label">${label}</div>
            `;

            const canAfford = Meta.getDiamonds() >= META_CONFIG.iconCost;
            if (!owned && !canAfford) {
                card.classList.add('disabled');
            }

            card.addEventListener('click', () => {
                if (owned) {
                    Meta.selectIcon(iconClass);
                    Sound.play('click');
                    this.updateShopStatus('Starting icon updated.', 'success');
                } else {
                    const result = Meta.buyIcon(iconClass);
                    if (result.ok) {
                        Sound.play('unlock');
                        this.updateShopStatus('Icon purchased and selected!', 'success');
                    } else if (result.reason === 'funds') {
                        Sound.play('error');
                        this.updateShopStatus('Not enough diamonds yet.', 'error');
                    } else {
                        Sound.play('error');
                        this.updateShopStatus('Icon unavailable.', 'error');
                    }
                }
                this.updateMetaDisplays();
                this.renderShop();
            });

            grid.appendChild(card);
        });
    },

    renderAchievements() {
        const list = document.getElementById('achievement-list');
        if (!list || typeof Achievements === 'undefined') return;
        this.updateMetaDisplays();
        list.innerHTML = '';

        Achievements.getDisplayData().forEach((achievement) => {
            const card = document.createElement('div');
            card.className = 'achievement-card';
            card.classList.add(achievement.unlocked ? 'unlocked' : 'locked');
            card.innerHTML = `
                <div class="achievement-info">
                    <div class="achievement-title">${achievement.name}</div>
                    <div class="achievement-desc">${achievement.description}</div>
                </div>
                <div class="achievement-reward">
                    <i class="fa-solid fa-gem"></i>
                    +${achievement.reward}
                </div>
            `;
            list.appendChild(card);
        });
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
