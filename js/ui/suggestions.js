/* --- Block Suggestion System --- */
const Suggestions = {
    activeSuggestions: [], // Array of { id, playerId, el, x, y, tile, timerId }
    suggestionTimeout: 15000, // Auto-clear after 15 seconds
    nextSuggestionId: 0,

    // Show a suggestion from another player (unlimited per player)
    showSuggestion(playerId, x, y, tile, playerColor, playerName) {
        const cell = els.grid.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
        if (!cell) return;

        const suggestionId = this.nextSuggestionId++;

        // Create suggestion overlay
        const suggestionEl = document.createElement('div');
        suggestionEl.className = 'block-suggestion';
        suggestionEl.style.borderColor = playerColor;
        suggestionEl.dataset.suggestionId = suggestionId;

        // Create inner content based on tile type
        const innerEl = document.createElement('div');
        innerEl.className = `suggestion-inner object ${tile.type}`;

        if (tile.type === 'producer' && state.producerTypes[tile.producerType]) {
            const icon = state.producerTypes[tile.producerType].icon;
            innerEl.innerHTML = icon;
        }

        if (tile.type !== 'seller') {
            innerEl.style.transform = `rotate(${tile.rotation * 90}deg)`;
        }

        suggestionEl.appendChild(innerEl);

        // Add player name label
        const labelEl = document.createElement('div');
        labelEl.className = 'suggestion-label';
        labelEl.style.backgroundColor = playerColor;
        labelEl.textContent = playerName;
        suggestionEl.appendChild(labelEl);

        cell.appendChild(suggestionEl);

        // Track the suggestion
        const suggestionData = {
            id: suggestionId,
            playerId,
            el: suggestionEl,
            x,
            y,
            tile,
            timerId: setTimeout(() => this.clearSuggestionById(suggestionId), this.suggestionTimeout)
        };
        this.activeSuggestions.push(suggestionData);
    },

    // Clear a specific suggestion by ID
    clearSuggestionById(suggestionId) {
        const index = this.activeSuggestions.findIndex(s => s.id === suggestionId);
        if (index !== -1) {
            const suggestion = this.activeSuggestions[index];
            if (suggestion.timerId) {
                clearTimeout(suggestion.timerId);
            }
            if (suggestion.el && suggestion.el.parentNode) {
                suggestion.el.remove();
            }
            this.activeSuggestions.splice(index, 1);
        }
    },

    // Clear all suggestions from a specific player
    clearSuggestion(playerId) {
        const playerSuggestions = this.activeSuggestions.filter(s => s.playerId === playerId);
        playerSuggestions.forEach(suggestion => {
            this.clearSuggestionById(suggestion.id);
        });
    },

    // Clear all suggestions
    clearAllSuggestions() {
        [...this.activeSuggestions].forEach(suggestion => {
            this.clearSuggestionById(suggestion.id);
        });
    },

    // Send a suggestion to other players (called when shift+click)
    sendSuggestion(x, y) {
        if (state.gameMode !== 'multi') return;
        if (!state.tool || state.tool === 'eraser') return;

        const localPlayer = state.players.find(p => p.id === state.localPlayerId);
        if (!localPlayer) return;

        const tile = {
            type: state.toolData.type,
            rotation: state.rotation,
            color: state.toolData.color || null,
            producerType: state.selectedProducerType
        };

        Sync.broadcast({
            type: Protocol.types.BLOCK_SUGGESTION,
            data: {
                playerId: state.localPlayerId,
                playerName: localPlayer.name,
                playerColor: localPlayer.color,
                x,
                y,
                tile
            }
        });

        // Show suggestion locally as well
        this.showSuggestion(state.localPlayerId, x, y, tile, localPlayer.color, localPlayer.name);

        // Show floating text locally
        spawnFloatingText(x, y, "Suggested!");
    },

    // Clear own suggestion
    clearOwnSuggestion() {
        if (state.gameMode !== 'multi') return;

        Sync.broadcast({
            type: Protocol.types.BLOCK_SUGGESTION,
            data: {
                playerId: state.localPlayerId,
                clear: true
            }
        });

        this.clearSuggestion(state.localPlayerId);
    }
};
