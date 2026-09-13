export const DEFAULT_LOCALE = 'en';
export const MISSING_TRANSLATION = Object.freeze({ useKey: 'key', useFallback: 'fallback', throw: 'throw' });

const TOKEN_PATTERN = /\$\{([a-z][A-Za-z0-9]*)\}/g;

export function interpolateNamedTokens(template, tokens = {}, allowedTokens = Object.keys(tokens)) {
    if (typeof template !== 'string') throw new TypeError('template must be a string');
    const allowList = new Set(allowedTokens);
    const interpolated = template.replace(TOKEN_PATTERN, (whole, token) => {
        if (!allowList.has(token)) throw new TypeError(`Localisation token '${token}' is not allowed`);
        if (!Object.hasOwn(tokens, token)) throw new TypeError(`Missing localisation token '${token}'`);
        return String(tokens[token]);
    });
    if (interpolated.includes('${')) throw new TypeError('Localisation contains an invalid interpolation token');
    return interpolated;
}

export function resolveLocalizedValue(localization, { locale, section, key, fallbackLocale = DEFAULT_LOCALE, tokens = {}, allowedTokens, missing = MISSING_TRANSLATION.useKey } = {}) {
    const requested = localization?.[locale]?.[section]?.[key];
    const fallback = localization?.[fallbackLocale]?.[section]?.[key];
    const value = typeof requested === 'string' && requested.length > 0 ? requested : fallback;
    if (typeof value !== 'string' || value.length === 0) {
        if (missing === MISSING_TRANSLATION.throw) throw new ReferenceError(`Missing localisation key '${section}.${key}' for '${locale}'`);
        if (missing === MISSING_TRANSLATION.useFallback && typeof fallback === 'string') return fallback;
        return key;
    }
    return interpolateNamedTokens(value, tokens, allowedTokens ?? Object.keys(tokens));
}
