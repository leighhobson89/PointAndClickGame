export const GAME_STATE_SCHEMA_VERSION = 1;

const DEFAULT_PLAYER = Object.freeze({
    originalWidth: 65,
    originalHeight: 140,
    width: 65,
    height: 140,
    speed: 3,
    baselineSpeedForRoom: 3,
    xPos: 0,
    yPos: 0,
    activeSprite: 'still_right',
    // How far through the nine-frame walk cycle the character is, as a
    // fraction of one step. Advanced by distance covered, not by ticks.
    walkPhase: 0,
    sprites: {},
});

function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function createInitialGameState(options = {}) {
    const roomId = options.roomId ?? 'libraryFoyer';

    return {
        schemaVersion: GAME_STATE_SCHEMA_VERSION,
        session: {
            generation: options.generation ?? 0,
            status: 'idle',
        },
        location: {
            initialRoomId: roomId,
            currentRoomId: roomId,
            previousRoomId: roomId,
            nextRoomId: roomId,
        },
        player: clone(options.player ?? DEFAULT_PLAYER),
        inventory: clone(options.inventory ?? {}),
        content: {
            grids: clone(options.content?.grids ?? null),
            navigation: clone(options.content?.navigation ?? null),
            objects: clone(options.content?.objects ?? null),
            dialogue: clone(options.content?.dialogue ?? null),
            npcs: clone(options.content?.npcs ?? null),
            foregrounds: clone(options.content?.foregrounds ?? null),
            contract: clone(options.content?.contract ?? null),
            mapRoom: clone(options.content?.mapRoom ?? null),
        },
        dialogue: {
            activeNodeId: null,
            removedOptions: [],
        },
        quests: {
            facts: {},
            bridgeState: 0,
        },
        settings: {
            theme: options.theme ?? 'mountain',
            language: options.language ?? 'en',
            selectedLanguage: options.selectedLanguage ?? options.language ?? 'en',
            oldLanguage: options.oldLanguage ?? options.language ?? 'en',
            audioMuted: options.audioMuted ?? false,
            textSpeed: options.textSpeed ?? 'normal',
            masterVolume: options.masterVolume ?? 100,
            musicVolume: options.musicVolume ?? 80,
            effectsVolume: options.effectsVolume ?? 90,
            subtitles: options.subtitles ?? true,
            reducedMotion: options.reducedMotion ?? false,
            highContrast: options.highContrast ?? false,
            hotspotHelp: options.hotspotHelp ?? false,
            hotspotIntensity: options.hotspotIntensity ?? 'subtle',
            inputMode: options.inputMode ?? 'auto',
            classicVerbs: options.classicVerbs ?? true,
        },
        presentation: {
            mode: 'menuState',
        },
    };
}

export function validateGameState(state) {
    const errors = [];
    const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

    if (!isObject(state)) errors.push('state must be an object');
    if (state?.schemaVersion !== GAME_STATE_SCHEMA_VERSION) errors.push(`schemaVersion must be ${GAME_STATE_SCHEMA_VERSION}`);
    if (!isObject(state?.session) || !Number.isInteger(state.session.generation) || state.session.generation < 0) {
        errors.push('session.generation must be a non-negative integer');
    }
    if (!isObject(state?.location) || typeof state.location.currentRoomId !== 'string' || state.location.currentRoomId.length === 0) {
        errors.push('location.currentRoomId must be a non-empty string');
    }
    if (!isObject(state?.player) || !Number.isFinite(state.player.xPos) || !Number.isFinite(state.player.yPos)) {
        errors.push('player must contain finite xPos and yPos values');
    }
    if (!isObject(state?.inventory)) errors.push('inventory must be an object');
    if (!isObject(state?.content)) errors.push('content must be an object');
    if (!isObject(state?.settings) || typeof state.settings.language !== 'string') {
        errors.push('settings.language must be a string');
    }

    try {
        JSON.stringify(state);
    } catch (error) {
        errors.push(`state must be serialisable: ${error.message}`);
    }

    return { valid: errors.length === 0, errors };
}

export function assertValidGameState(state) {
    const result = validateGameState(state);
    if (!result.valid) throw new TypeError(`Invalid game state: ${result.errors.join('; ')}`);
    return state;
}

export function cloneGameState(state) {
    return clone(assertValidGameState(state));
}
