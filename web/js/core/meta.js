const META_CONFIG = {
    storageKey: 'little-factory-meta',
    iconCost: 6
};

const Meta = {
    data: {
        diamonds: 0,
        ownedIcons: [],
        selectedStartingIcon: null,
        achievements: {},
        settings: {
            muted: false,
            volume: 0.6
        }
    },

    load() {
        const raw = localStorage.getItem(META_CONFIG.storageKey);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                this.data.diamonds = parsed.diamonds || 0;
                this.data.ownedIcons = Array.isArray(parsed.ownedIcons) ? parsed.ownedIcons : [];
                this.data.selectedStartingIcon = parsed.selectedStartingIcon || null;
                this.data.achievements = parsed.achievements || {};
                const settings = parsed.settings || {};
                this.data.settings = {
                    muted: Boolean(settings.muted),
                    volume: typeof settings.volume === 'number' ? settings.volume : 0.6
                };
            } catch (err) {
                console.warn('Failed to load meta data:', err);
            }
        }

        if (this.data.ownedIcons.length === 0 && COLOR_CONFIG.availableIcons.length > 0) {
            this.data.ownedIcons = [COLOR_CONFIG.availableIcons[0]];
        }

        if (!this.data.selectedStartingIcon || !this.ownsIcon(this.data.selectedStartingIcon)) {
            this.data.selectedStartingIcon = this.data.ownedIcons[0] || null;
        }

        this.save();
    },

    save() {
        localStorage.setItem(META_CONFIG.storageKey, JSON.stringify(this.data));
    },

    getDiamonds() {
        return this.data.diamonds || 0;
    },

    addDiamonds(amount) {
        const value = Math.max(0, Math.floor(amount || 0));
        if (value <= 0) return;
        this.data.diamonds += value;
        this.save();
        if (typeof Menu !== 'undefined') {
            Menu.updateMetaDisplays();
        }
    },

    spendDiamonds(amount) {
        const value = Math.max(0, Math.floor(amount || 0));
        if (value <= 0 || this.data.diamonds < value) return false;
        this.data.diamonds -= value;
        this.save();
        if (typeof Menu !== 'undefined') {
            Menu.updateMetaDisplays();
        }
        return true;
    },

    ownsIcon(iconClass) {
        return this.data.ownedIcons.includes(iconClass);
    },

    buyIcon(iconClass) {
        if (!iconClass || this.ownsIcon(iconClass)) {
            return { ok: false, reason: 'owned' };
        }
        if (!COLOR_CONFIG.availableIcons.includes(iconClass)) {
            return { ok: false, reason: 'invalid' };
        }
        if (!this.spendDiamonds(META_CONFIG.iconCost)) {
            return { ok: false, reason: 'funds' };
        }
        this.data.ownedIcons.push(iconClass);
        this.data.selectedStartingIcon = iconClass;
        this.save();
        if (typeof Menu !== 'undefined') {
            Menu.updateMetaDisplays();
        }
        return { ok: true };
    },

    selectIcon(iconClass) {
        if (!iconClass || !this.ownsIcon(iconClass)) return false;
        this.data.selectedStartingIcon = iconClass;
        this.save();
        if (typeof Menu !== 'undefined') {
            Menu.updateMetaDisplays();
        }
        return true;
    },

    getSelectedStartingIcon() {
        if (this.data.selectedStartingIcon && this.ownsIcon(this.data.selectedStartingIcon)) {
            return this.data.selectedStartingIcon;
        }
        if (this.data.ownedIcons.length > 0) {
            this.data.selectedStartingIcon = this.data.ownedIcons[0];
            this.save();
            return this.data.selectedStartingIcon;
        }
        return null;
    },

    getSettings() {
        return { ...this.data.settings };
    },

    setSettings(next) {
        this.data.settings = { ...this.data.settings, ...next };
        this.save();
    }
};
