export function createGameSession({ store, renderer, assetLoader, storage } = {}) {
    if (!store?.dispatch || !renderer?.render || !assetLoader?.load) throw new TypeError('store, renderer, and assetLoader are required');
    let disposed = false;
    let disposeRenderer = null;
    return Object.freeze({
        async start(assetIds = []) {
            disposed = false;
            await assetLoader.load(assetIds);
            store.dispatch({ type: 'session/start' });
            disposeRenderer = renderer.start?.(store) ?? null;
            renderer.render(store.getState());
            return store.getState();
        },
        async restore(key) {
            // The stored save holds progress only, so the live state supplies
            // the shipped content the restore is rebuilt against.
            const state = await storage?.load(key, store.getSnapshot());
            if (state) store.dispatch({ type: 'state/replace', payload: state });
            renderer.render(store.getState());
            return store.getState();
        },
        async save(key) {
            await storage?.save(key, store.getSnapshot());
        },
        dispose() {
            if (disposed) return;
            disposed = true;
            disposeRenderer?.();
            disposeRenderer = null;
            renderer.dispose?.();
            store.dispatch({ type: 'session/dispose' });
        },
    });
}

