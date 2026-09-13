export const RENDER_LAYER_ORDER = Object.freeze(['background', 'objects', 'npcs', 'player', 'foreground', 'effects']);

export function createCanvasRenderer(context, layers = {}) {
    if (!context) throw new TypeError('A rendering context is required');
    return Object.freeze({
        render(state) {
            for (const layerId of RENDER_LAYER_ORDER) layers[layerId]?.(context, state);
        },
        start() {
            return () => {};
        },
        dispose() {},
    });
}

