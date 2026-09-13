import {
    getLanguage,
    getLocalization,
    setLanguage,
    setLocalization,
} from './constantsAndGlobalVars.js';
import { loadJsonResource, validateObjectRoot } from './src/application/readiness.mjs';
import { resolveLocalizedValue } from './src/domain/localisation/localisation.mjs';

let localizationData = {};

async function fetchLocalization() {
    localizationData = await loadJsonResource(fetch, 'localization.json', 'Localisation data', validateObjectRoot);
    return localizationData;
}

export async function initLocalization(language) {
    const localization = await fetchLocalization();
    setLocalization(localization);
    setLanguage(getLanguage());
}

function localize(key, language, section, tokens = {}, allowedTokens = Object.keys(tokens)) {
    return resolveLocalizedValue(getLocalization(), {
        locale: language,
        section,
        key,
        tokens,
        allowedTokens,
    });
}

export {
    localize
};
