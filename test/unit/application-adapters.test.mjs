import assert from 'node:assert/strict';
import test from 'node:test';

import { createActionController } from '../../src/application/actions.mjs';
import { createGameSession } from '../../src/application/game-session.mjs';
import { createAssetLoader } from '../../src/adapters/asset-loader.mjs';
import { createCanvasRenderer, RENDER_LAYER_ORDER } from '../../src/adapters/canvas-renderer.mjs';
import { bindSemanticControls } from '../../src/adapters/dom-ui.mjs';
import { createStorageRepository } from '../../src/adapters/storage.mjs';
import { loadContentBundle } from '../../src/content/loader.mjs';
import { createInitialGameState } from '../../src/state/game-state.mjs';
import { createGameStore, gameActions } from '../../src/state/store.mjs';

function fakeElement(dataset) {
    const listeners = new Map();
    return { dataset, addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: (type) => listeners.delete(type), click: () => listeners.get('click')?.() };
}

test('DOM controls dispatch semantic IDs into the store and dispose their listeners', () => {
    const verb = fakeElement({ verbId: 'lookAt' });
    const target = fakeElement({ targetId: 'objectBook' });
    const intents = [];
    const store = createGameStore(createInitialGameState());
    const controller = createActionController({ execute: (intent) => {
        intents.push(intent);
        store.dispatch(gameActions.setQuestFact(`command.${intent.verbId}.${intent.primaryTargetId}`, true));
    } });
    const dispose = bindSemanticControls({ querySelectorAll: (selector) => selector === '[data-verb-id]' ? [verb] : [target] }, controller);
    verb.click(); target.click();
    assert.equal(intents[0].primaryTargetId, 'objectBook');
    assert.equal(store.getState().quests.facts['command.lookAt.objectBook'], true);
    dispose();
    verb.click(); target.click();
    assert.equal(intents.length, 1);
});

test('renderer preserves declared draw order with a recording context', () => {
    const calls = [];
    const layers = Object.fromEntries(RENDER_LAYER_ORDER.map((id) => [id, () => calls.push(id)]));
    createCanvasRenderer({}, layers).render({});
    assert.deepEqual(calls, RENDER_LAYER_ORDER);
});

test('session lifecycle works with fake renderer, storage, and awaited assets', async () => {
    const calls = [];
    const store = createGameStore(createInitialGameState());
    const stateStorage = new Map();
    const storage = createStorageRepository({ getItem: (key) => stateStorage.get(key) ?? null, setItem: (key, value) => stateStorage.set(key, value) });
    const session = createGameSession({
        store,
        renderer: { render: () => calls.push('render'), start: () => () => calls.push('stop'), dispose: () => calls.push('dispose') },
        assetLoader: createAssetLoader(async (id) => calls.push(`asset:${id}`)),
        storage,
    });
    await session.start(['library']);
    await session.save('slot');
    session.dispose();
    await session.restore('slot');
    assert.deepEqual(calls, ['asset:library', 'render', 'stop', 'dispose', 'render']);
    assert.equal(store.getState().quests.facts['chapter1.started'], true);
});

test('asset and content adapters expose readiness and errors without a browser', async () => {
    await assert.rejects(() => createAssetLoader(async (id) => { throw new Error(id); }).load(['missing']), /missing/);
    assert.deepEqual(await loadContentBundle(async (id) => ({ id }), { navigation: 'nav', dialogue: 'talk' }), { navigation: { id: 'nav' }, dialogue: { id: 'talk' } });
});
