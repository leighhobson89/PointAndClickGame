export const PLAYER_PREFERENCES_KEY = 'pointAndClick.preferences.v1';

export const DEFAULT_PLAYER_PREFERENCES = Object.freeze({
    theme: 'mountain',
    textSpeed: 'normal',
    masterVolume: 100,
    musicVolume: 80,
    effectsVolume: 90,
    subtitles: true,
    reducedMotion: false,
    highContrast: false,
    hotspotHelp: false,
    hotspotIntensity: 'subtle',
    inputMode: 'auto',
    classicVerbs: true,
});

const ENUMS = Object.freeze({
    theme: ['mountain', 'river', 'arctic', 'midnight', 'forest', 'sunset', 'desert', 'royal', 'rose', 'storybook'],
    textSpeed: ['slow', 'normal', 'fast', 'instant'],
    hotspotIntensity: ['subtle', 'strong'],
    inputMode: ['auto', 'pointer', 'keyboard', 'touch', 'gamepad'],
});

function clampVolume(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(100, Math.max(0, Math.round(number))) : fallback;
}

export function normalisePlayerPreferences(value = {}) {
    const result = { ...DEFAULT_PLAYER_PREFERENCES };
    for (const key of Object.keys(result)) {
        if (!(key in value)) continue;
        if (key.endsWith('Volume')) result[key] = clampVolume(value[key], result[key]);
        else if (ENUMS[key]) result[key] = ENUMS[key].includes(value[key]) ? value[key] : result[key];
        else result[key] = value[key] === true;
    }
    return Object.freeze(result);
}

export function loadPlayerPreferences(storage) {
    try {
        const raw = storage?.getItem?.(PLAYER_PREFERENCES_KEY);
        return normalisePlayerPreferences(raw ? JSON.parse(raw) : {});
    } catch {
        return normalisePlayerPreferences();
    }
}

export function savePlayerPreferences(storage, preferences) {
    const normalised = normalisePlayerPreferences(preferences);
    storage?.setItem?.(PLAYER_PREFERENCES_KEY, JSON.stringify(normalised));
    return normalised;
}

export function applyPlayerPreferences(root, preferences) {
    const value = normalisePlayerPreferences(preferences);
    root.dataset.theme = value.theme;
    root.dataset.inputMode = value.inputMode;
    root.dataset.highContrast = String(value.highContrast);
    root.dataset.reducedMotion = String(value.reducedMotion);
    root.dataset.hotspotHelp = String(value.hotspotHelp);
    root.dataset.hotspotIntensity = value.hotspotIntensity;
    root.dataset.classicVerbs = String(value.classicVerbs);
    root.style.setProperty('--master-volume', String(value.masterVolume / 100));
    return value;
}
