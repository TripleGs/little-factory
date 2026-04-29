const META_CONFIG = {
    storageKey: 'little-factory-meta'
};

const Meta = {
    data: {
        settings: {
            showFloatingText: true
        }
    },

    load() {
        const raw = localStorage.getItem(META_CONFIG.storageKey);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                const settings = parsed.settings || {};
                this.data.settings = {
                    showFloatingText: settings.showFloatingText !== false
                };
            } catch (err) {
                console.warn('Failed to load meta data:', err);
            }
        }

        this.save();
    },

    save() {
        localStorage.setItem(META_CONFIG.storageKey, JSON.stringify(this.data));
    },

    getSettings() {
        return { ...this.data.settings };
    },

    setSettings(next) {
        this.data.settings = { ...this.data.settings, ...next };
        this.save();
    }
};
