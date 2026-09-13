import assert from 'node:assert/strict';
import test from 'node:test';

import {
    SAVE_ERROR_CODES,
    SAVE_FORMAT_ID,
    SAVE_SCHEMA_VERSION,
    applySaveEnvelope,
    createSaveEnvelope,
    describeSave,
    diffGrids,
    diffJson,
    validateSaveEnvelope,
} from '../../src/domain/save/save-format.mjs';
import { finaliseLegacyWorld, migrateSave } from '../../src/domain/save/migrations.mjs';
import {
    SAVE_BLOCKED_REASONS,
    SAVE_EVENTS,
    SAVE_SLOTS,
    createSaveService,
} from '../../src/application/save-service.mjs';
import { createInitialGameState, validateGameState } from '../../src/state/game-state.mjs';
import { createSaveRepository, createStorageRepository } from '../../src/adapters/storage.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));

function row(fill) {
    return Array.from({ length: 4 }, () => fill);
}

function shippedContent() {
    return {
        grids: {
            libraryFoyer: [row('w1'), row('w1'), row('n'), row('w1')],
            riverCrossing: [row('n'), row('b1'), row('w1'), row('w1')],
            riverCrossingBridgeComplete: [row('w1'), row('w1'), row('w1'), row('w1')],
        },
        navigation: {
            libraryFoyer: { bgUrl: './resources/backgrounds/libraryFoyer.png', alreadyVisited: false },
            riverCrossing: { bgUrl: './resources/backgrounds/riverCrossing.png', alreadyVisited: false },
        },
        objects: {
            objects: {
                objectBook: {
                    objectPlacementLocation: 'libraryFoyer',
                    gridPosition: { x: 1, y: 1 },
                    dimensions: { originalWidth: 2, originalHeight: 2, width: 40, height: 40 },
                    visualPosition: { x: 120, y: 80 },
                },
            },
        },
        npcs: { npcs: { npcLibrarian: { npcPlacementLocation: 'libraryFoyer', gridPosition: { x: 3, y: 1 } } } },
        dialogue: { dialogue: { npcLibrarian: { phase: 0 } } },
        foregrounds: { libraryFoyer: [row('-'), row('-'), row('-'), row('-')] },
    };
}

/** A session part-way through the chapter, with the world genuinely changed. */
function playedState() {
    const pristine = shippedContent();
    const state = createInitialGameState({ roomId: 'libraryFoyer', language: 'de', content: { ...pristine, contract: { contentVersion: 'chapter1-world-v1' }, mapRoom: {} } });

    state.location.currentRoomId = 'riverCrossing';
    state.location.previousRoomId = 'libraryFoyer';
    state.player.xPos = 480;
    state.player.yPos = 260;
    state.player.activeSprite = 'still_left';
    state.inventory = { slot1: { objectId: 'objectRopeAndHook', quantity: 1 } };
    state.quests.facts = { 'chapter1.started': true, 'library.riddleKnown': true, 'rigging.assembled': true };
    state.quests.bridgeState = 2;
    state.dialogue.removedOptions = ['library.askAgain'];

    // World changes the running game really makes: a visited room, an object
    // carried out of its room, a repaired bridge, and the placement stamps the
    // entity pass writes into the walk grid.
    state.content.navigation.libraryFoyer.alreadyVisited = true;
    state.content.objects.objects.objectBook.objectPlacementLocation = 'inventory';
    state.content.objects.objects.objectBook.visualPosition = { x: 999, y: 999 };
    state.content.objects.objects.objectBook.dimensions.width = 77;
    state.content.grids.riverCrossing[1] = row('w1');
    delete state.content.grids.riverCrossingBridgeComplete;
    state.content.grids.libraryFoyer[1][1] = 'oobjectBook';
    state.content.grids.libraryFoyer[1][3] = 'cnpcLibrarian';

    return state;
}

test('a save records authored progress and patches content instead of copying it', () => {
    const pristine = shippedContent();
    const envelope = createSaveEnvelope({
        state: playedState(),
        pristineContent: pristine,
        currentContent: playedState().content,
        playerCell: { x: 12, y: 40 },
        savedAt: '2026-09-13T10:00:00.000Z',
        slot: SAVE_SLOTS.resume,
    });

    assert.equal(envelope.format, SAVE_FORMAT_ID);
    assert.equal(envelope.schemaVersion, SAVE_SCHEMA_VERSION);
    assert.deepEqual(validateSaveEnvelope(envelope), { valid: true, errors: [] });

    const serialized = JSON.stringify(envelope);
    assert.ok(!serialized.includes('libraryFoyer.png'), 'a save must not carry the shipped content bundle');
    assert.ok(serialized.length < JSON.stringify(playedState()).length, 'a patch must be smaller than the state it came from');

    // Position travels as a grid cell, never as pixels.
    assert.deepEqual(envelope.payload.player.cell, { x: 12, y: 40 });
    assert.equal(envelope.payload.player.xPos, undefined);

    // Authored world change, derived geometry dropped, placement stamps dropped.
    assert.deepEqual(envelope.payload.world.patches.navigation, [
        { op: 'set', path: ['libraryFoyer', 'alreadyVisited'], value: true },
    ]);
    assert.deepEqual(envelope.payload.world.patches.objects, [
        { op: 'set', path: ['objects', 'objectBook', 'objectPlacementLocation'], value: 'inventory' },
    ]);
    assert.deepEqual(envelope.payload.world.grids.removedRooms, ['riverCrossingBridgeComplete']);
    assert.equal(envelope.payload.world.grids.cells.length, 4, 'only the repaired river row is an authored change');
    assert.ok(envelope.payload.world.grids.cells.every(([roomId]) => roomId === 'riverCrossing'));
});

test('a mid-puzzle save round-trips every canonical field and rebuilds the world from shipped content', () => {
    const pristine = shippedContent();
    const saved = playedState();
    const envelope = createSaveEnvelope({
        state: saved,
        pristineContent: pristine,
        currentContent: saved.content,
        playerCell: { x: 12, y: 40 },
        savedAt: '2026-09-13T10:00:00.000Z',
    });

    // Restore onto a brand-new session: a different room, empty inventory, no
    // facts, and freshly loaded content.
    const baseState = createInitialGameState({ roomId: 'libraryFoyer', content: { ...clone(pristine), contract: {}, mapRoom: {} } });
    const restored = applySaveEnvelope({ envelope, baseState, pristineContent: pristine });

    assert.deepEqual(validateGameState(restored.state), { valid: true, errors: [] });
    assert.equal(restored.state.location.currentRoomId, 'riverCrossing');
    assert.equal(restored.state.location.previousRoomId, 'libraryFoyer');
    assert.deepEqual(restored.playerCell, { x: 12, y: 40 });
    assert.equal(restored.state.player.activeSprite, 'still_left');
    assert.deepEqual(restored.state.inventory, saved.inventory);
    assert.deepEqual(restored.state.quests, saved.quests);
    assert.deepEqual(restored.state.dialogue.removedOptions, ['library.askAgain']);
    assert.equal(restored.state.settings.language, 'de');

    // World mutations came back.
    assert.equal(restored.state.content.navigation.libraryFoyer.alreadyVisited, true);
    assert.equal(restored.state.content.objects.objects.objectBook.objectPlacementLocation, 'inventory');
    assert.equal(restored.state.content.grids.riverCrossingBridgeComplete, undefined);
    assert.deepEqual(restored.state.content.grids.riverCrossing[1], row('w1'));

    // Derived state did not. Entity geometry and the walk-grid placement stamps
    // are rebuilt by the renderer and the placement pass after a restore.
    assert.deepEqual(restored.state.content.objects.objects.objectBook.visualPosition, { x: 120, y: 80 });
    assert.equal(restored.state.content.objects.objects.objectBook.dimensions.width, 40);
    assert.equal(restored.state.content.grids.libraryFoyer[1][1], 'w1');
    assert.equal(restored.state.content.grids.libraryFoyer[1][3], 'w1');
});

test('an authored grid change hidden under a placed entity is recovered from the recorded original value', () => {
    const pristine = { riverCrossing: [row('b1')] };
    const current = { riverCrossing: [['oobjectCrate', 'w1', 'b1', 'b1']] };

    const blind = diffGrids(pristine, current);
    assert.deepEqual(blind.cells, [['riverCrossing', 1, 0, 'w1']]);

    const informed = diffGrids(pristine, current, { underlyingCellValue: (roomId, x, y) => (x === 0 && y === 0 ? 'w1' : undefined) });
    assert.deepEqual(informed.cells, [['riverCrossing', 0, 0, 'w1'], ['riverCrossing', 1, 0, 'w1']]);
});

test('json patches record additions, changes, and removals without touching derived entity geometry', () => {
    const base = { a: 1, b: { c: 2, d: 3 }, e: [1, 2] };
    const next = { a: 1, b: { c: 9 }, e: [1, 2, 3], f: true };
    assert.deepEqual(diffJson(base, next), [
        { op: 'remove', path: ['b', 'd'] },
        { op: 'set', path: ['b', 'c'], value: 9 },
        { op: 'set', path: ['e'], value: [1, 2, 3] },
        { op: 'set', path: ['f'], value: true },
    ]);
});

test('invalid, corrupt, and unsupported saves are refused before anything is applied', () => {
    const pristine = shippedContent();
    const baseState = createInitialGameState({ content: { ...clone(pristine), contract: {}, mapRoom: {} } });
    const before = clone(baseState);

    assert.throws(() => applySaveEnvelope({ envelope: { format: SAVE_FORMAT_ID, schemaVersion: 2, payload: {} }, baseState, pristineContent: pristine }), (error) => {
        assert.equal(error.code, SAVE_ERROR_CODES.invalidPayload);
        return true;
    });
    assert.throws(() => migrateSave({ schemaVersion: 99, state: {} }), (error) => {
        assert.equal(error.code, SAVE_ERROR_CODES.unsupportedVersion);
        return true;
    });
    assert.throws(() => migrateSave('not a save'), (error) => {
        assert.equal(error.code, SAVE_ERROR_CODES.unreadable);
        return true;
    });

    assert.deepEqual(baseState, before, 'a refused save must leave the current state untouched');
});

test('a declared legacy save migrates into a patch and restores with the shipped content', () => {
    const pristine = shippedContent();
    const legacyState = playedState();
    const legacy = { schemaVersion: 1, state: legacyState };

    const envelope = finaliseLegacyWorld(migrateSave(legacy), pristine);
    assert.equal(envelope.payload.legacyContent, undefined);
    assert.deepEqual(envelope.payload.world.patches.navigation, [
        { op: 'set', path: ['libraryFoyer', 'alreadyVisited'], value: true },
    ]);

    const baseState = createInitialGameState({ content: { ...clone(pristine), contract: {}, mapRoom: {} } });
    const restored = applySaveEnvelope({ envelope, baseState, pristineContent: pristine });
    assert.equal(restored.state.location.currentRoomId, 'riverCrossing');
    assert.equal(restored.state.content.navigation.libraryFoyer.alreadyVisited, true);
    assert.deepEqual(validateGameState(restored.state), { valid: true, errors: [] });
});

test('a save restores into a session running a different language', () => {
    const pristine = shippedContent();
    const saved = playedState();
    const envelope = createSaveEnvelope({ state: saved, pristineContent: pristine, currentContent: saved.content, playerCell: { x: 1, y: 1 } });

    const baseState = createInitialGameState({ language: 'fr', content: { ...clone(pristine), contract: {}, mapRoom: {} } });
    const restored = applySaveEnvelope({ envelope, baseState, pristineContent: pristine });

    assert.equal(restored.state.settings.language, 'de');
    assert.equal(describeSave(envelope).language, 'de');
    assert.deepEqual(describeSave(envelope).factIds, ['chapter1.started', 'library.riddleKnown', 'rigging.assembled']);
});

//--------------------------------------------------------------------------------------------------------
// Policy
//--------------------------------------------------------------------------------------------------------

function memoryStorage() {
    const map = new Map();
    return {
        map,
        getItem: (key) => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => map.set(key, value),
        removeItem: (key) => map.delete(key),
    };
}

function serviceUnderTest({ busy = false, inGame = true, storage = memoryStorage(), clock = { value: 0 } } = {}) {
    const state = playedState();
    const service = createSaveService({ repository: createSaveRepository(storage), now: () => clock.value });
    service.configure({
        getState: () => clone(state),
        getPristineContent: () => shippedContent(),
        getCurrentContent: () => clone(state.content),
        getPlayerCell: () => ({ x: 4, y: 4 }),
        getMilestoneFacts: () => ['rigging.assembled', 'bridge.repaired'],
        isInGame: () => inGame,
        isBusy: () => busy,
    });
    return { service, state, storage, clock };
}

test('saving waits while the game is busy and refuses outside a session, with a stable reason', () => {
    const busy = serviceUnderTest({ busy: true });
    const blocked = busy.service.write(SAVE_SLOTS.resume);
    assert.equal(blocked.event, SAVE_EVENTS.blocked);
    assert.equal(blocked.reason, SAVE_BLOCKED_REASONS.busy);
    assert.equal(busy.storage.map.size, 0, 'a refused save must not write anything');

    const menu = serviceUnderTest({ inGame: false });
    assert.equal(menu.service.write(SAVE_SLOTS.resume).reason, SAVE_BLOCKED_REASONS.notInGame);

    const ready = serviceUnderTest();
    assert.equal(ready.service.write(SAVE_SLOTS.resume).event, SAVE_EVENTS.saved);
    assert.equal(ready.service.describe(SAVE_SLOTS.resume).roomId, 'riverCrossing');
});

test('milestones checkpoint even mid-conversation, and ordinary autosaves are rate limited', () => {
    const { service, storage } = serviceUnderTest({ busy: true });

    assert.equal(service.noteFact('library.riddleKnown'), null, 'only declared milestones checkpoint');
    const checkpoint = service.noteFact('rigging.assembled');
    assert.equal(checkpoint.event, SAVE_EVENTS.saved);
    assert.equal(checkpoint.slot, SAVE_SLOTS.checkpoint);
    assert.equal(service.describe(SAVE_SLOTS.checkpoint).label, 'rigging.assembled');
    assert.equal(storage.map.size, 2, 'a milestone writes both the checkpoint and the resume slot');

    const quiet = serviceUnderTest({ clock: { value: 1_000 } });
    assert.equal(quiet.service.noteRoomChange().event, SAVE_EVENTS.saved);
    assert.equal(quiet.service.noteRoomChange(), null, 'a second room change inside the interval is skipped');
    quiet.clock.value += 60_000;
    assert.equal(quiet.service.noteRoomChange().event, SAVE_EVENTS.saved);
});

test('storage failure is reported as an event and never throws into the running game', () => {
    const failing = {
        getItem: () => { throw new Error('Simulated storage read failure'); },
        setItem: () => { throw new Error('Simulated storage write failure'); },
    };
    const { service } = serviceUnderTest({ storage: failing });

    const result = service.write(SAVE_SLOTS.resume);
    assert.equal(result.event, SAVE_EVENTS.failed);
    assert.match(result.message, /Simulated storage write failure/);
    assert.equal(service.hasSave(SAVE_SLOTS.resume), false);
    assert.equal(service.describe(SAVE_SLOTS.resume), null);
});

test('the storage repository round-trips a state through the versioned envelope', async () => {
    const storage = memoryStorage();
    const pristine = shippedContent();
    const repository = createStorageRepository(storage, { getPristineContent: () => pristine });
    const saved = playedState();

    await repository.save('slot', saved);
    const envelope = JSON.parse(storage.map.get('pointAndClick.save.slot'));
    assert.equal(envelope.schemaVersion, SAVE_SCHEMA_VERSION);

    const baseState = createInitialGameState({ content: { ...clone(pristine), contract: {}, mapRoom: {} } });
    const restored = await repository.load('slot', baseState);
    assert.equal(restored.location.currentRoomId, 'riverCrossing');
    assert.equal(restored.quests.facts['rigging.assembled'], true);
    assert.equal(await repository.load('missing', baseState), null);
});
