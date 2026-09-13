export function createAssetLoader(loadOne) {
    if (typeof loadOne !== 'function') throw new TypeError('loadOne must be a function');
    return Object.freeze({
        async load(assetIds) {
            const results = await Promise.allSettled([...new Set(assetIds)].map((assetId) => loadOne(assetId)));
            const failed = results.find((result) => result.status === 'rejected');
            if (failed) throw failed.reason;
            return results.map((result) => result.value);
        },
    });
}

