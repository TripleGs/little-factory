let state = {
    grid: [],      // { type, rotation, color: {r,g,b}, producerType }
    items: [],     // { id, x, y, ..., color: {r,g,b} }
    money: 0,
    moneyRate: 0,
    moneyRateEarnings: 0,
    moneyRateHistory: [],  // Rolling history for average calculation
    moneyRateWindowSize: 5, // Number of ticks to average over
    speedMultiplier: 1.0,
    speedUpgradeCost: 100,
    tool: 'belt',
    toolData: {},
    subTool: null, // Selected color object {r,g,b}

    rotation: 0,
    lastTick: 0,
    timeAcc: 0,
    nextId: 0,

    colorManager: null, // ColorManager instance
    producerTypes: [],  // Array of unlocked producer types with their icons
    usedIcons: new Set(), // Track which icons have been used
    selectedProducerType: 0, // Index of currently selected producer type

    // Dynamic Dimensions
    cols: 5,
    rows: 5,
    cellSize: 60,
    expansions: 0, // Track expansion count for cost scaling

    // Zoom
    zoomLevel: 1.0,
    minZoom: 0.5,
    maxZoom: 2.0,
    zoomStep: 0.1,

    // Package and Stopper tracking
    stoppedItems: new Map(), // Map<itemId, { ticksRemaining: number }>

    // Unlock progression system
    unlocks: {
        paint: false,
        packager: false,
        stopper: false,
        newProducer: false,
        jumper: false
    },
    unlockedColors: new Set(), // Track which color IDs have been unlocked for painting

    // Multiplayer state
    gameMode: 'single', // 'single' or 'multi'
    players: [],        // { id, name, money, color, emote }
    localPlayerId: null,
    isHost: false,
    hostSeed: null
};

const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];
