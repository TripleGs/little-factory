/**
 * Stats Menu - Shows income breakdown by producer type
 */

const Stats = (() => {
    let updateInterval = null;
    let incomeTracker = {}; // Track income per producer type
    let lastUpdateTime = Date.now();

    function init() {
        const toggleBtn = document.getElementById('btn-toggle-stats');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggle);
        }

        // Start tracking income
        startTracking();
    }

    function toggle() {
        const menu = document.getElementById('stats-menu');
        const toggleBtn = document.getElementById('btn-toggle-stats');

        if (menu && toggleBtn) {
            menu.classList.toggle('hidden');
            const isHidden = menu.classList.contains('hidden');

            // Update button appearance
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = isHidden ? 'fa-solid fa-chart-line' : 'fa-solid fa-xmark';
            }
        }
    }

    function show() {
        const menu = document.getElementById('stats-menu');
        if (menu) {
            menu.classList.remove('hidden');
        }
    }

    function hide() {
        const menu = document.getElementById('stats-menu');
        if (menu) {
            menu.classList.add('hidden');
        }
    }

    function startTracking() {
        // Update stats every second
        if (updateInterval) {
            clearInterval(updateInterval);
        }

        updateInterval = setInterval(() => {
            updateStats();
        }, 1000);
    }

    function stopTracking() {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
    }

    function trackIncome(producerType, amount) {
        // Track income by producer type
        if (!incomeTracker[producerType]) {
            incomeTracker[producerType] = {
                total: 0,
                lastSecond: 0,
                rate: 0
            };
        }

        incomeTracker[producerType].total += amount;
        incomeTracker[producerType].lastSecond += amount;
    }

    function updateStats() {
        const now = Date.now();
        const deltaTime = (now - lastUpdateTime) / 1000; // in seconds
        lastUpdateTime = now;

        if (deltaTime <= 0) return;

        // Calculate rates
        let totalRate = 0;
        for (const typeIndex in incomeTracker) {
            const tracker = incomeTracker[typeIndex];
            tracker.rate = tracker.lastSecond / deltaTime;
            tracker.lastSecond = 0;
            totalRate += tracker.rate;
        }

        // Update display
        renderStats(totalRate);
    }

    function renderStats(totalRate) {
        const menu = document.getElementById('stats-menu');
        if (!menu || menu.classList.contains('hidden')) {
            return;
        }

        const totalIncomeEl = document.getElementById('stats-total-income');
        const producerListEl = document.getElementById('stats-producer-list');

        if (!totalIncomeEl || !producerListEl) {
            return;
        }

        // Update total income rate
        totalIncomeEl.textContent = `$${totalRate.toFixed(1)}/s`;

        // Clear and rebuild producer list
        producerListEl.innerHTML = '';

        // Sort producer types by rate (highest first)
        const sortedTypes = Object.keys(incomeTracker)
            .map(typeIndex => ({
                typeIndex: parseInt(typeIndex),
                ...incomeTracker[typeIndex]
            }))
            .filter(item => item.rate > 0)
            .sort((a, b) => b.rate - a.rate);

        if (sortedTypes.length === 0) {
            producerListEl.innerHTML = '<div class="stats-empty">No income yet. Start selling items!</div>';
            return;
        }

        // Render each producer type
        sortedTypes.forEach(item => {
            const producerType = state.producerTypes[item.typeIndex];
            if (!producerType) return;

            // Count how many producers of this type are on the grid
            let producerCount = 0;
            for (let y = 0; y < state.rows; y++) {
                for (let x = 0; x < state.cols; x++) {
                    const cell = state.grid[y][x];
                    if (cell.type === 'producer' && cell.producerType === item.typeIndex) {
                        producerCount++;
                    }
                }
            }

            const producerItem = document.createElement('div');
            producerItem.className = 'stats-producer-item';

            producerItem.innerHTML = `
                <div class="stats-producer-icon">
                    <i class="${producerType.icon}"></i>
                </div>
                <div class="stats-producer-info">
                    <div class="stats-producer-name">${producerType.name}</div>
                    <div class="stats-producer-count">${producerCount} placed</div>
                </div>
                <div class="stats-producer-income">$${item.rate.toFixed(1)}/s</div>
            `;

            producerListEl.appendChild(producerItem);
        });
    }

    function reset() {
        incomeTracker = {};
        lastUpdateTime = Date.now();

        const totalIncomeEl = document.getElementById('stats-total-income');
        const producerListEl = document.getElementById('stats-producer-list');

        if (totalIncomeEl) {
            totalIncomeEl.textContent = '$0.0/s';
        }

        if (producerListEl) {
            producerListEl.innerHTML = '<div class="stats-empty">No income yet. Start selling items!</div>';
        }
    }

    return {
        init,
        toggle,
        show,
        hide,
        startTracking,
        stopTracking,
        trackIncome,
        updateStats,
        reset
    };
})();
