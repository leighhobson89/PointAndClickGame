import test from 'node:test';
import assert from 'node:assert/strict';

import {
    createInitialGameState,
    validateGameState,
} from '../../src/state/game-state.mjs';
import {
    createGameStore,
    gameActions,
    gameSelectors,
} from '../../src/state/store.mjs';

test('createInitialGameState returns clean independent serialisable state', () => {
    const first = createInitialGameState();
    const second = createInitialGameState();

    first.inventory.key = { quantity: 1 };
    first.quests.facts.openedDoor = true;

    assert.deepEqual(second.inventory, {});
    assert.deepEqual(second.quests.facts, {});
    assert.equal(validateGameState(first).valid, true);
    assert.doesNotThrow(() => JSON.stringify(first));
});

test('store dispatches actions, notifies once, and can cleanly replace state', () => {
    const store = createGameStore();
    const actions = [];
    const unsubscribe = store.subscribe((_state, action) => actions.push(action.type));

    store.dispatch(gameActions.startSession());
    store.dispatch(gameActions.setLocation('currentRoomId', 'marketStreet'));
    const livePlayer = store.getState().player;
    store.dispatch(gameActions.setPlayer('xPos', 0));

    assert.equal(gameSelectors.sessionGeneration(store.getState()), 1);
    assert.equal(gameSelectors.currentRoomId(store.getState()), 'marketStreet');
    assert.equal(store.getState().player.xPos, 0);
    assert.equal(store.getState().player, livePlayer);
    assert.deepEqual(actions, ['session/start', 'location/set', 'player/set']);

    unsubscribe();
    store.dispatch(gameActions.replace(createInitialGameState({ generation: 1 })));
    assert.equal(store.getSubscriberCount(), 0);
    assert.equal(store.getState().location.currentRoomId, 'libraryFoyer');
});

test('invalid replacement state is rejected', () => {
    const store = createGameStore();
    assert.throws(
        () => store.dispatch(gameActions.replace({ schemaVersion: 99 })),
        /Invalid game state/,
    );
});
