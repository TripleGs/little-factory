/* --- Color System Configuration --- */
const COLOR_CONFIG = {
    mixing: {
        algorithm: 'additive-normalized',  // Preserve existing behavior
        normalizationMethod: 'preserve-hue'
    },
    palette: {
        deduplicationTolerance: 15,  // Euclidean distance threshold for considering colors the same
        maxColors: 500,              // Performance safety limit
        autoNameColors: true,        // Generate descriptive names for new colors
        sortBy: 'timestamp',         // Chronological discovery order
        colorBaseCost: 50,           // Base cost for any paint color
        colorValueMultiplier: 0,     // No brightness-based pricing
        costPerLevel: 25,            // Additional cost per mix level (yellow costs more than red)
        sellValuePerLevel: 0.5       // Additional sell value per mix level
    },
    starting: {
        colors: [  // Initial palette colors
            { id: 'red', name: 'Red', r: 255, g: 0, b: 0, mixLevel: 0 },
            { id: 'green', name: 'Green', r: 0, g: 255, b: 0, mixLevel: 0 },
            { id: 'blue', name: 'Blue', r: 0, g: 0, b: 255, mixLevel: 0 }
        ],
        itemColor: { r: 5, g: 5, b: 5 }, // Starting color for spawned items (very dark gray, sells for $1)
        money: 500  // Starting money
    },
    costs: {
        belt: 5,
        jumper: 100,
        producer: 25,
        seller: 15,
        eraser: 0,  // Free to erase
        newProducer: 1000,  // Cost to unlock a new producer type
        packager: 50,
        stopper: 75
    },
    unlockCosts: {
        paint: 50,        // Painting system
        packager: 100,     // Packaging system
        stopper: 250,      // Stopper tiles
        jumper: 500        // Jumper tiles
    },
    availableIcons: [
        'fa-solid fa-book-open',
        'fa-solid fa-gem',
        'fa-solid fa-star',
        'fa-solid fa-heart',
        'fa-solid fa-bolt',
        'fa-solid fa-fire',
        'fa-solid fa-droplet',
        'fa-solid fa-leaf',
        'fa-solid fa-snowflake',
        'fa-solid fa-sun',
        'fa-solid fa-moon',
        'fa-solid fa-cloud',
        'fa-solid fa-gift',
        'fa-solid fa-trophy',
        'fa-solid fa-crown',
        'fa-solid fa-key',
        'fa-solid fa-lock',
        'fa-solid fa-scroll',
        'fa-solid fa-feather',
        'fa-solid fa-dice',
        'fa-solid fa-compass',
        'fa-solid fa-anchor',
        'fa-solid fa-shield',
        'fa-solid fa-wand-magic',
        'fa-solid fa-flask',
        'fa-solid fa-seedling'
    ],
    ui: {
        previewOpacity: 0.5,
        disabledOpacity: 0.5,
        costDisplayOpacity: 0.6,
        eraserPreviewColor: 'rgba(255, 0, 0, 0.2)'
    },
    floatingText: {
        offsetX: 10,
        offsetY: 0,
        duration: 1000,
        moveDistance: -30
    },
    colorNaming: {
        hueRanges: [15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345],
        hueNames: ['Red', 'Orange', 'Yellow', 'Lime', 'Green', 'Teal', 'Cyan', 'Blue', 'Indigo', 'Purple', 'Magenta', 'Pink'],
        grayscaleThreshold: 0.1,
        whiteThreshold: 0.95,
        blackThreshold: 0.05,
        lightModifiers: [
            { threshold: 0.9, name: 'Very Pale' },
            { threshold: 0.75, name: 'Pale' },
            { threshold: 0.6, name: 'Light' },
            { threshold: 0.5, name: 'Bright' },
            { threshold: 0.3, name: 'Deep' },
            { threshold: 0.2, name: 'Dark' },
            { threshold: 0, name: 'Very Dark' }
        ],
        hueSortTolerance: 1,
        saturationSortTolerance: 0.01
    }
};
