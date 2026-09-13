export async function loadContentBundle(fetchJson, resources) {
    if (typeof fetchJson !== 'function') throw new TypeError('fetchJson must be a function');
    const entries = await Promise.all(Object.entries(resources).map(async ([kind, resourceId]) => [kind, await fetchJson(resourceId)]));
    return Object.freeze(Object.fromEntries(entries));
}

