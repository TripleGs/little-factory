const Sound = (() => {
    // ------------------------------------------------------------------------
    // Configuration & State
    // ------------------------------------------------------------------------
    let context = null;
    let masterGain = null;
    let enabled = true;
    let muted = false;
    let volume = 0.6;

    // Pitch scaling for "combo" effects (Pentatonic C Major-ish ratios)
    const PITCH_SCALE = [1, 1.125, 1.25, 1.5, 1.66, 2.0];
    let comboCount = 0;
    let lastActionTime = 0;
    const COMBO_RESET_MS = 600; // Time to reset pitch to base

    // Keep original WAV sources for texture/complex sounds
    const textureSources = {
        unlock: ['audio/unlock.wav', 'audio/unlock_2.wav'],
        achievement: ['audio/achievement.wav', 'audio/achievement_2.wav'],
        error: ['audio/error.wav', 'audio/error_2.wav'], // Fallback if synth error isn't preferred
        sell: ['audio/sell.wav', 'audio/sell_2.wav', 'audio/sell_3.wav']
    };

    // Buffer cache for wav files
    const buffers = {};

    // ------------------------------------------------------------------------
    // Initialization
    // ------------------------------------------------------------------------
    function init() {
        if (!context) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            context = new AudioContext();
            masterGain = context.createGain();
            masterGain.connect(context.destination);
            updateVolume();
            preloadTextures();
        }
        if (context.state === 'suspended') {
            context.resume();
        }
    }

    async function loadBuffer(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await context.decodeAudioData(arrayBuffer);
        } catch (e) {
            console.warn('Failed to load sound:', url, e);
            return null;
        }
    }

    function preloadTextures() {
        Object.entries(textureSources).forEach(([key, urls]) => {
            buffers[key] = [];
            urls.forEach(async (url) => {
                const buffer = await loadBuffer(url);
                if (buffer) buffers[key].push(buffer);
            });
        });
    }

    // ------------------------------------------------------------------------
    // Synthesis Helpers (The "Dopamine" Generators)
    // ------------------------------------------------------------------------

    // Helper: Random float between min and max
    function randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    // Satisfying "Pop" / "Thock" sound for placement
    function synthPop(pitchMultiplier = 1) {
        if (!context) return;
        const t = context.currentTime;

        const osc = context.createOscillator();
        const gain = context.createGain();

        // Sine wave for clean body, Triangle for a bit more "thud"
        osc.type = 'triangle';

        // Pitch envelope with Variance
        const variance = randomRange(0.98, 1.02);
        const frequency = 220 * pitchMultiplier * variance;

        osc.frequency.setValueAtTime(frequency * 3.5, t);
        osc.frequency.exponentialRampToValueAtTime(frequency, t + 0.1);

        // Volume envelope: Attack fast, decay fast
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.8, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(t);
        osc.stop(t + 0.35);
    }

    // Crisp high-hat / click for UI
    function synthClick(pitchMultiplier = 1) {
        if (!context) return;
        const t = context.currentTime;

        // 1. Noise Burst
        const bufferSize = context.sampleRate * 0.05; // 50ms
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.8;
        }
        const noise = context.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = context.createGain();

        // 2. High Tone (Sine)
        const osc = context.createOscillator();
        osc.type = 'sine';
        const variance = randomRange(0.95, 1.05);
        osc.frequency.setValueAtTime(1200 * pitchMultiplier * variance, t);
        const oscGain = context.createGain();

        // Envelopes
        noiseGain.gain.setValueAtTime(0.8, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        oscGain.gain.setValueAtTime(0.3, t);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        noise.connect(noiseGain);
        osc.connect(oscGain);
        noiseGain.connect(masterGain);
        oscGain.connect(masterGain);

        noise.start(t);
        osc.start(t);
        osc.stop(t + 0.15);
    }

    // Crunchy noise sweep for Erase/Delete
    function synthCrunch() {
        if (!context) return;
        const t = context.currentTime;

        const bufferSize = context.sampleRate * 0.3;
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }

        const noise = context.createBufferSource();
        noise.buffer = buffer;

        // Filter sweep makes it sound like "shhh-oom" or "zip"
        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        // Variance on start frequency
        const startFreq = 8000 * randomRange(0.9, 1.1);
        filter.frequency.setValueAtTime(startFreq, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + 0.25);

        const gain = context.createGain();
        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        noise.start(t);
        noise.stop(t + 0.3);
    }

    // Harsh buzzer for Error
    function synthError() {
        if (!context) return;
        const t = context.currentTime;
        const osc = context.createOscillator();
        osc.type = 'sawtooth';

        const variance = randomRange(0.9, 1.1);
        osc.frequency.setValueAtTime(150 * variance, t);
        osc.frequency.linearRampToValueAtTime(100 * variance, t + 0.3);

        const gain = context.createGain();
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.35);
    }

    // "Cha-ching!" / Satisfying Sell Sound
    function synthSell(pitchMultiplier = 1) {
        if (!context) return;
        const t = context.currentTime;
        const playTime = 0.6;

        // 1. The High "Glimmer" (Two sine waves slightly detuned)
        const osc1 = context.createOscillator();
        const osc2 = context.createOscillator();
        const gainHigh = context.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';

        // Major scale notes usually sound "winning"
        // Let's do a rapid arpeggio slide
        const baseFreq = 880 * pitchMultiplier;

        // Rapid pitch envelope (coin sound)
        osc1.frequency.setValueAtTime(baseFreq, t);
        osc1.frequency.exponentialRampToValueAtTime(baseFreq * 2, t + 0.1);

        osc2.frequency.setValueAtTime(baseFreq * 1.5, t); // Perfect fifth high
        osc2.frequency.exponentialRampToValueAtTime(baseFreq * 3, t + 0.1);

        gainHigh.gain.setValueAtTime(0, t);
        gainHigh.gain.linearRampToValueAtTime(0.3, t + 0.02);
        gainHigh.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        // 2. The Low "Satisfaction" Thump (Kick-like)
        const oscLow = context.createOscillator();
        const gainLow = context.createGain();
        oscLow.type = 'triangle';

        oscLow.frequency.setValueAtTime(150, t);
        oscLow.frequency.exponentialRampToValueAtTime(0.001, t + 0.2);

        gainLow.gain.setValueAtTime(0.5, t);
        gainLow.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc1.connect(gainHigh);
        osc2.connect(gainHigh);
        oscLow.connect(gainLow);

        gainHigh.connect(masterGain);
        gainLow.connect(masterGain); // Thump is monophonic center

        osc1.start(t);
        osc2.start(t);
        oscLow.start(t);

        osc1.stop(t + playTime);
        osc2.stop(t + playTime);
        oscLow.stop(t + playTime);
    }

    // Play a wav buffer with random variations
    function playBuffer(key) {
        if (!context || !buffers[key] || buffers[key].length === 0) return;

        // Pick random variant
        const variantBuffers = buffers[key];
        const buffer = variantBuffers[Math.floor(Math.random() * variantBuffers.length)];

        const source = context.createBufferSource();
        source.buffer = buffer;

        // Randomize pitch/rate slightly
        const jitter = 0.08; // Increased jitter for wavs too
        source.playbackRate.value = 1 + (Math.random() * jitter * 2 - jitter);

        source.connect(masterGain);
        source.start(0);
    }


    // ------------------------------------------------------------------------
    // Conveyor Loop State
    // ------------------------------------------------------------------------
    let conveyorOsc = null;
    let conveyorGain = null;
    let conveyorFilter = null;
    let conveyorLFO = null;
    let conveyorActive = false;
    let targetConveyorVol = 0;

    // Updates the target volume for conveyor ambience based on factory activity
    function updateConveyor(activeItems) {
        if (!context) return;

        // Logarithmic scaling: 1 item = 0.05, 10 items = 0.15, 100 items = 0.25
        // Cap at 0.3 to prevent overwhelming the mix
        if (activeItems > 0) {
            targetConveyorVol = Math.min(0.05 + Math.log10(activeItems) * 0.1, 0.3);
            if (!conveyorActive) startConveyor();
        } else {
            targetConveyorVol = 0;
        }

        if (conveyorActive && conveyorGain) {
            // Smoothly ramp to the new volume
            conveyorGain.gain.setTargetAtTime(targetConveyorVol * (muted ? 0 : 1), context.currentTime, 0.5);
        }
    }

    function startConveyor() {
        if (conveyorActive || !context) return;
        conveyorActive = true;

        const t = context.currentTime;

        // 1. Motor Hum (Sawtooth for grit)
        conveyorOsc = context.createOscillator();
        conveyorOsc.type = 'sawtooth';
        conveyorOsc.frequency.value = 50; // Low rumble base

        // 2. Filter to muffle it into a "motor" sound
        conveyorFilter = context.createBiquadFilter();
        conveyorFilter.type = 'lowpass';
        conveyorFilter.frequency.value = 200;

        // 3. LFO for "Randomized" varation (Modulates filter)
        conveyorLFO = context.createOscillator();
        conveyorLFO.type = 'sine';
        conveyorLFO.frequency.value = 0.5 + Math.random(); // Slow modulation
        const lfoGain = context.createGain();
        lfoGain.gain.value = 100; // Modulate cuttoff by +/- 100Hz

        // 4. Gain Node
        conveyorGain = context.createGain();
        conveyorGain.gain.value = 0; // Start silent, ramp up

        // Connections
        conveyorLFO.connect(lfoGain);
        lfoGain.connect(conveyorFilter.frequency);

        conveyorOsc.connect(conveyorFilter);
        conveyorFilter.connect(conveyorGain);
        conveyorGain.connect(masterGain);

        conveyorOsc.start(t);
        conveyorLFO.start(t);
    }

    // Stop isn't really used, we just fade volume to 0, but good for cleanup
    function stopConveyor() {
        if (!conveyorActive) return;
        if (conveyorOsc) conveyorOsc.stop(context.currentTime + 1);
        if (conveyorLFO) conveyorLFO.stop(context.currentTime + 1);
        conveyorActive = false;
    }

    // Producer Sound - requested to be "closer to the UI click sound"
    function synthProduce(pitchMultiplier = 1) {
        if (!context) return;
        const t = context.currentTime;

        // Short, sharp mechanical click (higher pitch than pop, lower than click)
        const osc = context.createOscillator();
        osc.type = 'square'; // Square wave for "digital/mechanical" feel

        // Slight downward chirp
        const startFreq = 600 * pitchMultiplier * randomRange(0.95, 1.05);
        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 0.5, t + 0.08);

        const gain = context.createGain();
        gain.gain.setValueAtTime(0.25, t); // Lower volume than UI clicks
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(t);
        osc.stop(t + 0.1);
    }
    // Paint Sound - Wet "Slosh" (Liquid coating)
    function synthPaint(pitchMultiplier = 1) {
        if (!context) return;
        const t = context.currentTime;

        // 1. Fluid Body (Sine sweep)
        const osc = context.createOscillator();
        osc.type = 'sine';
        const startFreq = 400 * pitchMultiplier * randomRange(0.95, 1.05);
        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.exponentialRampToValueAtTime(startFreq * 0.6, t + 0.15); // Pitch drops (viscosity)

        const oscGain = context.createGain();
        oscGain.gain.setValueAtTime(0.3, t);
        oscGain.gain.linearRampToValueAtTime(0, t + 0.15);

        // 2. Splash (Filtered Noise)
        const bufferSize = context.sampleRate * 0.2;
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }
        const noise = context.createBufferSource();
        noise.buffer = buffer;

        const filter = context.createBiquadFilter();
        filter.type = 'lowpass';
        // Start open, close down (muffled splash)
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.linearRampToValueAtTime(300, t + 0.15);

        const noiseGain = context.createGain();
        noiseGain.gain.setValueAtTime(0.5, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.connect(oscGain);
        oscGain.connect(masterGain);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);

        osc.start(t);
        noise.start(t);

        osc.stop(t + 0.2);
        noise.stop(t + 0.2);
    }

    // Package Sound - Cardboard "Folding/Crunching"
    function synthPackage(pitchMultiplier = 1) {
        if (!context) return;
        const t = context.currentTime;

        // Brown noise for cardboard texture
        const bufferSize = context.sampleRate * 0.25;
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02; // Simple brown noise approximation
            lastOut = data[i];
            data[i] *= 3.5; // Gain compensation
        }

        const noise = context.createBufferSource();
        noise.buffer = buffer;

        // Dynamic filter to simulate folding motion
        const filter = context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 0.8;

        // "Ripping" sweep
        filter.frequency.setValueAtTime(400, t);
        filter.frequency.exponentialRampToValueAtTime(1200, t + 0.05); // Initial crease
        filter.frequency.exponentialRampToValueAtTime(200, t + 0.2);   // Fold down

        const gain = context.createGain();
        // Double-pump envelope to sound like "ker-chunk" or "fold-flap"
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.6, t + 0.02);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.08); // Dip
        gain.gain.linearRampToValueAtTime(0.5, t + 0.12); // Second hit
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        noise.start(t);
        noise.stop(t + 0.25);
    }

    // Stop Sound - "Brake Squeak" / "Halt"
    function synthStop(pitchMultiplier = 1) {
        if (!context) return;
        const t = context.currentTime;

        // Friction sound (High saw wave filtered)
        const osc = context.createOscillator();
        osc.type = 'sawtooth';
        const startFreq = 400 * pitchMultiplier * randomRange(0.9, 1.1);

        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.linearRampToValueAtTime(startFreq * 0.8, t + 0.1); // Small pitch drop

        const gain = context.createGain();
        gain.gain.setValueAtTime(0.15, t); // Quiet
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(t);
        osc.stop(t + 0.2);
    }

    // ------------------------------------------------------------------------
    // Main Play Interface
    // ------------------------------------------------------------------------
    function play(type) {
        if (!enabled || muted) return;
        init(); // Ensure context is ready

        const now = performance.now();

        // Manage "Combo" Pitch System
        // If action is within rapid succession, increase scale index
        if (type === 'place' || type === 'click' || type === 'sell' || type === 'produce') {
            if (now - lastActionTime < COMBO_RESET_MS) {
                comboCount = Math.min(comboCount + 1, PITCH_SCALE.length - 1);
            } else {
                comboCount = 0;
            }
            lastActionTime = now;
        }

        const pitchMult = PITCH_SCALE[comboCount] || 1;

        // Route to generator
        switch (type) {
            case 'place':
                synthPop(pitchMult);
                break;
            case 'click':
                synthClick(pitchMult * 1.5); // Click usually needs to be higher
                break;
            case 'erase':
                synthCrunch();
                comboCount = 0; // Reset combo on delete
                break;
            case 'error':
                synthError();
                // Optionally layer with wav
                // playBuffer('error'); 
                break;
            case 'sell':
                // New specialized synth function
                synthSell(pitchMult);
                // Can still overlay texture if desired, but user wanted "better"
                // playBuffer('sell'); 
                break;
            case 'produce':
                synthProduce(pitchMult);
                break;
            case 'paint':
                synthPaint(pitchMult);
                break;
            case 'package':
                synthPackage(pitchMult);
                break;
            case 'stop':
                synthStop(pitchMult);
                break;
            default:
                // Fallback to wav textures
                playBuffer(type);
                break;
        }
    }

    // ------------------------------------------------------------------------
    // Utility / Config
    // ------------------------------------------------------------------------
    function updateVolume() {
        if (masterGain) {
            masterGain.gain.setValueAtTime(muted ? 0 : Math.min(Math.max(volume, 0), 1), context ? context.currentTime : 0);
        }
    }

    function unlock() {
        init();
        // Play a silent buffer to unlock audio on iOS/Browsers
        if (context) {
            const buffer = context.createBuffer(1, 1, 22050);
            const source = context.createBufferSource();
            source.buffer = buffer;
            source.connect(context.destination);
            source.start(0);
        }
    }

    function setEnabled(val) { enabled = !!val; }
    function setMuted(val) {
        muted = !!val;
        updateVolume();
    }
    function setVolume(val) {
        volume = val;
        updateVolume();
    }

    return {
        play,
        unlock,
        setEnabled,
        setMuted,
        setVolume,
        updateConveyor
    };
})();

window.addEventListener('pointerdown', () => {
    Sound.unlock();
}, { once: true });
window.addEventListener('keydown', () => {
    Sound.unlock();
}, { once: true });
