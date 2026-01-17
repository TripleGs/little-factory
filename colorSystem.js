/* --- Color Management System --- */
class ColorManager {
    constructor(config) {
        this.config = config;
        this._palette = [];
        this._colorMap = new Map(); // For faster lookups by ID

        // Load starting colors
        if (config.starting && config.starting.colors) {
            config.starting.colors.forEach(color => {
                this._addColorInternal({
                    ...color,
                    timestamp: Date.now()
                });
            });
        }
    }

    /**
     * Get all colors in the palette
     */
    get palette() {
        return [...this._palette]; // Return copy to prevent external modification
    }

    /**
     * Get palette sorted by hue
     */
    get paletteSortedByHue() {
        return [...this._palette].sort((a, b) => {
            const hslA = this._rgbToHsl(a.r, a.g, a.b);
            const hslB = this._rgbToHsl(b.r, b.g, b.b);

            // Sort by hue first, then saturation, then lightness
            const hueTolerance = this.config.colorNaming?.hueSortTolerance ?? 1;
            const satTolerance = this.config.colorNaming?.saturationSortTolerance ?? 0.01;

            if (Math.abs(hslA.h - hslB.h) > hueTolerance) return hslA.h - hslB.h;
            if (Math.abs(hslA.s - hslB.s) > satTolerance) return hslB.s - hslA.s; // Higher saturation first
            return hslA.l - hslB.l;
        });
    }

    /**
     * Add a color to the palette if it's unique
     * @param {Object} rgb - Color object with r, g, b properties
     * @param {Object} metadata - Optional metadata (name, etc.)
     * @returns {Object|null} The color object if added, null if duplicate
     */
    addColor(rgb, metadata = {}) {
        // Check if palette is at max capacity
        if (this._palette.length >= this.config.palette.maxColors) {
            console.warn('Palette at maximum capacity');
            return null;
        }

        // First check for exact RGB match
        for (const color of this._palette) {
            if (color.r === rgb.r && color.g === rgb.g && color.b === rgb.b) {
                return null; // Exact duplicate
            }
        }

        // Then check for similar existing color (deduplication)
        const similar = this.findSimilarColor(rgb, this.config.palette.deduplicationTolerance);
        if (similar) {
            return null; // Color already exists
        }

        // Create new color object
        const colorObj = {
            id: this.generateColorId(rgb),
            r: rgb.r,
            g: rgb.g,
            b: rgb.b,
            name: metadata.name || (this.config.palette.autoNameColors ? this.generateColorName(rgb) : `Color #${this._palette.length + 1}`),
            timestamp: Date.now(),
            mixLevel: metadata.mixLevel || 0  // Track how many times this was mixed (0 = base color)
        };

        this._addColorInternal(colorObj);
        return colorObj;
    }

    /**
     * Internal method to add color without checks
     */
    _addColorInternal(colorObj) {
        this._palette.push(colorObj);
        this._colorMap.set(colorObj.id, colorObj);
    }

    /**
     * Find a similar color within tolerance
     * @param {Object} rgb - Color to search for
     * @param {number} tolerance - Euclidean distance threshold
     * @returns {Object|null} Similar color if found, null otherwise
     */
    findSimilarColor(rgb, tolerance) {
        for (const color of this._palette) {
            const distance = this._calculateDistance(rgb, color);
            if (distance < tolerance) {
                return color;
            }
        }
        return null;
    }

    /**
     * Calculate Euclidean distance between two colors in RGB space
     */
    _calculateDistance(color1, color2) {
        const dr = color1.r - color2.r;
        const dg = color1.g - color2.g;
        const db = color1.b - color2.b;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }

    /**
     * Mix two colors using additive mixing with normalization
     * @param {Object} color1 - First color {r, g, b}
     * @param {Object} color2 - Second color {r, g, b}
     * @returns {Object} Mixed color {r, g, b}
     */
    mixColors(color1, color2) {
        // Additive mixing
        let r = color1.r + color2.r;
        let g = color1.g + color2.g;
        let b = color1.b + color2.b;

        // Normalize if any value exceeds 255
        return this.normalizeColor({ r, g, b });
    }

    /**
     * Normalize color values, preserving hue while maximizing brightness
     * @param {Object} rgb - Color to normalize
     * @returns {Object} Normalized color {r, g, b}
     */
    normalizeColor(rgb) {
        const maxVal = Math.max(rgb.r, rgb.g, rgb.b);

        if (maxVal > 255) {
            const scale = 255 / maxVal;
            return {
                r: Math.round(rgb.r * scale),
                g: Math.round(rgb.g * scale),
                b: Math.round(rgb.b * scale)
            };
        }

        return {
            r: Math.round(rgb.r),
            g: Math.round(rgb.g),
            b: Math.round(rgb.b)
        };
    }

    /**
     * Generate a unique ID for a color based on its RGB values
     */
    generateColorId(rgb) {
        // Simple hash based on RGB values
        return `c_${rgb.r}_${rgb.g}_${rgb.b}_${Date.now()}`;
    }

    /**
     * Generate a descriptive name for a color based on its RGB values
     * @param {Object} rgb - Color to name
     * @returns {string} Descriptive color name
     */
    generateColorName(rgb) {
        const hsl = this._rgbToHsl(rgb.r, rgb.g, rgb.b);

        // Check if it's grayscale (including white and black)
        if (this._isGrayscale(hsl)) {
            return this._getGrayscaleName(hsl);
        }

        // Get hue name and lightness modifier
        const hueName = this._getHueName(hsl.h);
        const modifier = this._getLightnessModifier(hsl.l, hsl.s);

        return modifier ? `${modifier} ${hueName}` : hueName;
    }

    /**
     * Check if a color is grayscale
     */
    _isGrayscale(hsl) {
        const config = this.config.colorNaming || {};
        const threshold = config.grayscaleThreshold ?? 0.1;
        return hsl.s < threshold;
    }

    /**
     * Get grayscale color name
     */
    _getGrayscaleName(hsl) {
        const config = this.config.colorNaming || {};
        const whiteThreshold = config.whiteThreshold ?? 0.95;
        const blackThreshold = config.blackThreshold ?? 0.05;

        if (hsl.l > whiteThreshold) return 'White';
        if (hsl.l < blackThreshold) return 'Black';
        if (hsl.l > 0.8) return 'Light Gray';
        if (hsl.l > 0.6) return 'Silver';
        if (hsl.l > 0.4) return 'Gray';
        if (hsl.l > 0.2) return 'Dark Gray';
        return 'Charcoal';
    }

    /**
     * Get hue name from hue angle
     */
    _getHueName(hue) {
        const config = this.config.colorNaming || {};
        const hueRanges = config.hueRanges || [15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345];
        const hueNames = config.hueNames || ['Red', 'Orange', 'Yellow', 'Lime', 'Green', 'Teal', 'Cyan', 'Blue', 'Indigo', 'Purple', 'Magenta', 'Pink'];

        // Check each hue range
        for (let i = 0; i < hueRanges.length; i++) {
            if (hue < hueRanges[i]) {
                return hueNames[i];
            }
        }

        // Wrap around to Red (hue >= 345)
        return hueNames[0];
    }

    /**
     * Get lightness modifier name
     */
    _getLightnessModifier(lightness, saturation) {
        const config = this.config.colorNaming || {};
        const modifiers = config.lightModifiers || [
            { threshold: 0.75, name: 'Pale' },
            { threshold: 0.6, name: 'Light' },
            { threshold: 0.5, name: 'Bright' },
            { threshold: 0.3, name: 'Deep' },
            { threshold: 0, name: 'Dark' }
        ];

        // Find the appropriate modifier based on lightness
        for (const mod of modifiers) {
            if (lightness > mod.threshold) {
                return mod.name;
            }
        }

        return modifiers[modifiers.length - 1].name; // Return darkest if none match
    }

    /**
     * Convert RGB to HSL
     * @returns {Object} HSL object with h (0-360), s (0-1), l (0-1)
     */
    _rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return {
            h: Math.round(h * 360),
            s: s,
            l: l
        };
    }

    /**
     * Format color for display
     * @param {Object} rgb - Color to format
     * @param {string} format - Format type ('rgb', 'hex')
     * @returns {string} Formatted color string
     */
    formatColor(rgb, format = 'rgb') {
        if (format === 'rgb') {
            return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        } else if (format === 'hex') {
            const toHex = (n) => {
                const hex = Math.round(n).toString(16);
                return hex.length === 1 ? '0' + hex : hex;
            };
            return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
        }
        return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    }
}
