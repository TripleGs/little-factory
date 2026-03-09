/* --- Chat System --- */
const Chat = {
    ready: false,
    maxMessages: 50,

    setup() {
        if (this.ready) return;

        const sendBtn = document.getElementById('btn-send-chat');
        const input = document.getElementById('chat-input');
        if (!sendBtn || !input) return;

        const handleSend = () => {
            this.sendMessage();
        };

        sendBtn.addEventListener('click', handleSend);
        input.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                handleSend();
            }
        });

        this.ready = true;
    },

    sendMessage() {
        if (state.gameMode !== 'multi') return;

        const input = document.getElementById('chat-input');
        if (!input) return;

        const message = input.value.trim();
        if (!message) return;

        const localPlayer = state.players.find(p => p.id === state.localPlayerId);
        if (!localPlayer) return;

        // Add message locally
        this.addMessage(localPlayer.name, message, localPlayer.color, true);

        // Broadcast to others
        Sync.broadcast({
            type: Protocol.types.CHAT_MESSAGE,
            data: {
                playerId: state.localPlayerId,
                playerName: localPlayer.name,
                playerColor: localPlayer.color,
                message: message
            }
        });

        input.value = '';
    },

    addMessage(playerName, message, playerColor, isLocal) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        const msgEl = document.createElement('div');
        msgEl.className = 'chat-message' + (isLocal ? ' local' : '');

        const nameEl = document.createElement('span');
        nameEl.className = 'chat-name';
        nameEl.style.color = playerColor;
        nameEl.textContent = playerName + ':';

        const textEl = document.createElement('span');
        textEl.className = 'chat-text';
        textEl.textContent = message;

        msgEl.appendChild(nameEl);
        msgEl.appendChild(textEl);
        container.appendChild(msgEl);

        // Remove old messages if too many
        while (container.children.length > this.maxMessages) {
            container.removeChild(container.firstChild);
        }

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    },

    clear() {
        const container = document.getElementById('chat-messages');
        if (container) {
            container.innerHTML = '';
        }
    }
};
