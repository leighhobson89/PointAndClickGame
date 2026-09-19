import test from 'node:test';
import assert from 'node:assert/strict';

import {
    cachedImageUrls,
    imageFor,
    isImageReady,
    preloadImages,
} from '../../src/adapters/image-cache.mjs';

test('preloading owns one decoded Image per URL and drawing reuses it', async () => {
    const OriginalImage = globalThis.Image;
    let constructions = 0;

    class FakeImage {
        constructor() {
            constructions += 1;
            this.complete = false;
            this.naturalWidth = 0;
            this.listeners = new Map();
        }

        addEventListener(type, listener) {
            this.listeners.set(type, listener);
        }

        removeEventListener(type, listener) {
            if (this.listeners.get(type) === listener) this.listeners.delete(type);
        }

        set src(value) {
            this.url = value;
            queueMicrotask(() => {
                this.complete = true;
                this.naturalWidth = 64;
                this.listeners.get('load')?.();
            });
        }
    }

    globalThis.Image = FakeImage;
    try {
        const urls = ['./player-cache-test.png', './npc-cache-test.png'];
        const loaded = await preloadImages([urls[0], urls[0], urls[1]]);

        assert.equal(constructions, 2, 'duplicate preload URLs share one Image');
        assert.equal(loaded.length, 2);
        assert.equal(imageFor(urls[0]), loaded[0], 'the renderer receives the preloaded Image');
        assert.equal(isImageReady(imageFor(urls[1])), true);
        assert.deepEqual(cachedImageUrls().filter((url) => urls.includes(url)).sort(), urls.sort());
    } finally {
        globalThis.Image = OriginalImage;
    }
});

