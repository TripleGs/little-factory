const Achievements = (() => {
    const definitions = [
        {
            id: 'first_sale',
            name: 'First Sale',
            description: 'Sell your first item.',
            reward: 5
        },
        {
            id: 'hundred_cash',
            name: 'Starter Stack',
            description: 'Reach $100 in a run.',
            reward: 5
        },
        {
            id: 'five_hundred_cash',
            name: 'Factory Flow',
            description: 'Reach $500 in a run.',
            reward: 8
        },
        {
            id: 'producer_purchase',
            name: 'New Line',
            description: 'Unlock a new producer type.',
            reward: 8
        },
        {
            id: 'first_expansion',
            name: 'Bigger Floor',
            description: 'Expand the grid once.',
            reward: 6
        },
        {
            id: 'multiplayer_start',
            name: 'Together We Build',
            description: 'Start a multiplayer game.',
            reward: 10
        }
    ];

    const unlocked = new Set();

    function init() {
        unlocked.clear();
        if (Meta && Meta.data && Meta.data.achievements) {
            Object.keys(Meta.data.achievements).forEach((id) => {
                if (Meta.data.achievements[id]) {
                    unlocked.add(id);
                }
            });
        }
    }

    function isUnlocked(id) {
        return unlocked.has(id);
    }

    function unlock(id) {
        if (!id || unlocked.has(id)) return;
        const achievement = definitions.find(entry => entry.id === id);
        if (!achievement) return;
        unlocked.add(id);
        Meta.data.achievements[id] = true;
        Meta.save();
        Meta.addDiamonds(achievement.reward);
        Sound.play('achievement');
        if (typeof spawnFloatingText === 'function' && state && state.grid && state.grid.length) {
            const cx = Math.floor(state.cols / 2);
            const cy = Math.floor(state.rows / 2);
            spawnFloatingText(cx, cy, `Achievement: ${achievement.name} +${achievement.reward}`);
        }
        if (typeof Menu !== 'undefined') {
            Menu.renderAchievements();
        }
    }

    function onItemSold(currentMoney) {
        unlock('first_sale');
        checkMoney(currentMoney);
    }

    function checkMoney(currentMoney) {
        if (currentMoney >= 100) {
            unlock('hundred_cash');
        }
        if (currentMoney >= 500) {
            unlock('five_hundred_cash');
        }
    }

    function onProducerPurchased() {
        unlock('producer_purchase');
    }

    function onGridExpanded() {
        unlock('first_expansion');
    }

    function onMultiplayerStart() {
        unlock('multiplayer_start');
    }

    function getDisplayData() {
        return definitions.map(entry => ({
            ...entry,
            unlocked: unlocked.has(entry.id)
        }));
    }

    return {
        init,
        isUnlocked,
        unlock,
        onItemSold,
        onProducerPurchased,
        onGridExpanded,
        onMultiplayerStart,
        getDisplayData
    };
})();
