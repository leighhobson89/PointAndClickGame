import assert from 'node:assert/strict';
import test from 'node:test';

import {
    VERB_IDS, cancelCommand, contextualVerbForTarget, createCommandIntent, createCommandSelection, selectTarget, selectVerb,
} from '../../src/domain/commands/commands.mjs';
import { advanceDialogue, createDialogueState, getDialogueNode, validateDialogueGraph } from '../../src/domain/dialogue/dialogue.mjs';
import { addInventoryItem, combineInventoryItems, inventoryQuantity, removeInventoryItem, useInventoryItem } from '../../src/domain/inventory/inventory.mjs';
import { interpolateNamedTokens, resolveLocalizedValue } from '../../src/domain/localisation/localisation.mjs';
import { findNearestWalkable, findPath, findPathWithFallback, movementCost, pointerToWorld, resolveCellTarget, resolveHotspot, resolveInteractionAnchor, worldToGrid } from '../../src/domain/navigation/navigation.mjs';
import { applyPuzzleAction, whyGateUnavailable, whyUnavailable } from '../../src/domain/puzzles/puzzles.mjs';
import { finaliseLegacyWorld, migrateSave } from '../../src/domain/save/migrations.mjs';
import { createSaveEnvelope } from '../../src/domain/save/save-format.mjs';
import { createInitialGameState } from '../../src/state/game-state.mjs';
import { libraryDialogueGraph, libraryDialogueStartNodeId } from '../../src/content/library-dialogue.mjs';

test('all nine verbs produce stable intents without translated text', () => {
    assert.equal(VERB_IDS.length, 9);
    for (const verbId of VERB_IDS) assert.equal(createCommandIntent({ verbId, primaryTargetId: 'objectBook' }).verbId, verbId);
    assert.throws(() => createCommandIntent({ verbId: 'Look at' }), /Unknown verbId/);
});

test('two-target commands wait, reject the same target, complete, and cancel deterministically', () => {
    let selection = selectVerb(createCommandSelection(), 'use');
    const first = selectTarget(selection, 'objectRope');
    assert.equal(first.status, 'waiting');
    selection = first.selection;
    assert.deepEqual(selectTarget(selection, 'objectRope'), { status: 'error', reason: 'same-target', selection });
    const second = selectTarget(selection, 'objectHook');
    assert.equal(second.status, 'ready');
    assert.deepEqual(second.intent, { verbId: 'use', primaryTargetId: 'objectRope', secondaryTargetId: 'objectHook' });
    assert.deepEqual(cancelCommand(), createCommandSelection());
});

test('contextual defaults use stable target traits', () => {
    assert.equal(contextualVerbForTarget({ kind: 'npc', id: 'npcLibrarian' }), 'talkTo');
    assert.equal(contextualVerbForTarget({ kind: 'object', id: 'objectDoor', isDoor: true, isOpen: false }), 'open');
    assert.equal(contextualVerbForTarget({ kind: 'object', id: 'objectDoor', isDoor: true, isOpen: true }), 'close');
    assert.equal(contextualVerbForTarget({}), 'walkTo');
});

test('inventory add, remove, combine, and use are immutable and idempotent', () => {
    const original = {};
    const withRope = addInventoryItem(original, { objectId: 'objectRope', operationId: 'pickup.rope' });
    const repeated = addInventoryItem(withRope, { objectId: 'objectRope', operationId: 'pickup.rope' });
    assert.deepEqual(original, {});
    assert.deepEqual(repeated, withRope);
    let stock = addInventoryItem(withRope, { objectId: 'objectNail', quantity: 2, stackable: true });
    stock = addInventoryItem(stock, { objectId: 'objectNail', quantity: 2, stackable: true });
    assert.equal(inventoryQuantity(stock, 'objectNail'), 4);
    const combined = combineInventoryItems(stock, {
        id: 'rope-and-nail', ingredients: [{ objectId: 'objectRope' }, { objectId: 'objectNail', quantity: 2 }], result: { objectId: 'objectRig', stackable: false },
    });
    assert.equal(inventoryQuantity(combined, 'objectRig'), 1);
    assert.equal(inventoryQuantity(combined, 'objectNail'), 2);
    assert.deepEqual(combineInventoryItems(combined, { id: 'rope-and-nail', ingredients: [], result: { objectId: 'objectRig' } }), combined);
    assert.equal(inventoryQuantity(useInventoryItem(combined, 'objectNail', { quantity: 1, consume: true }), 'objectNail'), 1);
    assert.deepEqual(removeInventoryItem({}, { objectId: 'missing' }), {});
});

test('localisation has explicit fallback, missing-key, and allow-listed interpolation', () => {
    const data = { en: { ui: { greeting: 'Hello ${playerName}' } }, es: { ui: {} } };
    assert.equal(resolveLocalizedValue(data, { locale: 'es', section: 'ui', key: 'greeting', tokens: { playerName: 'Jack' }, allowedTokens: ['playerName'] }), 'Hello Jack');
    assert.equal(resolveLocalizedValue(data, { locale: 'fr', section: 'ui', key: 'missing' }), 'missing');
    assert.throws(() => interpolateNamedTokens('${window}', { window: 'unsafe' }, ['playerName']), /not allowed/);
    assert.throws(() => interpolateNamedTokens('${playerName.toUpperCase()}', {}, []), /invalid interpolation/);
});

function walkLibraryDialogue({ startNodeId = undefined, choose = () => null } = {}) {
    let state = createDialogueState(libraryDialogueGraph, { startNodeId });
    const visitedNodeIds = [];
    for (let guard = 0; guard < 20 && !state.ended; guard += 1) {
        const node = getDialogueNode(libraryDialogueGraph, state);
        visitedNodeIds.push(node.id);
        state = advanceDialogue(libraryDialogueGraph, state, { choiceId: choose(node) }).state;
    }
    return { state, visitedNodeIds };
}

const chooseKeyBranch = (node) => node.id === 'library.librarian.q0.choices' ? 'library.librarian.askResearchKey'
    : node.id === 'library.librarian.q1.choices' ? 'library.librarian.pressForResearchKey' : null;

test('library dialogue graph traverses stable choices to a stable consequence', () => {
    assert.deepEqual(validateDialogueGraph(libraryDialogueGraph), []);
    const { state } = walkLibraryDialogue({ choose: chooseKeyBranch });
    assert.equal(state.ended, true);
    assert.deepEqual(state.consequenceIds, ['library.askedForResearchKey', 'library.learnRiddle']);
});

test('asking the librarian for the key continues the same conversation instead of greeting the player again', () => {
    const { visitedNodeIds } = walkLibraryDialogue({ choose: chooseKeyBranch });
    // The phase-1 greeting belongs to a conversation that starts there. Reaching
    // it straight after the key request made the librarian say hello mid-exchange.
    assert.equal(visitedNodeIds.includes('library.librarian.q1.intro'), false);
    assert.equal(visitedNodeIds.includes('library.librarian.q1.opening0'), false);
    assert.deepEqual(visitedNodeIds.slice(visitedNodeIds.indexOf('library.librarian.q0.choices')), [
        'library.librarian.q0.choices',
        'library.librarian.q0.keyResponse0',
        'library.librarian.q0.keyResponse1',
        'library.librarian.q1.choices',
        'library.librarian.q1.keyResponse0',
        'library.librarian.q1.keyResponse1',
        'library.librarian.q2.playerExit',
        'library.librarian.q2.librarianExit',
        'library.librarian.end.riddleKnown',
    ]);
});

test('the librarian conversation resumes at the quest phase the player left her in', () => {
    assert.equal(libraryDialogueStartNodeId(0), libraryDialogueGraph.startNodeId);
    assert.equal(libraryDialogueStartNodeId(1), 'library.librarian.q1.intro');
    assert.equal(libraryDialogueStartNodeId(99), libraryDialogueGraph.startNodeId);

    // Leaving after the key request records the phase change, so the next
    // conversation opens on "you're back" rather than the introduction.
    const asked = walkLibraryDialogue({ choose: (node) => node.id === 'library.librarian.q0.choices' ? 'library.librarian.askResearchKey' : node.id === 'library.librarian.q1.choices' ? 'library.librarian.q1.exit' : null });
    assert.deepEqual(asked.state.consequenceIds, ['library.askedForResearchKey']);

    const resumed = walkLibraryDialogue({ startNodeId: libraryDialogueStartNodeId(1), choose: chooseKeyBranch });
    assert.equal(resumed.visitedNodeIds[0], 'library.librarian.q1.intro');
    assert.equal(resumed.visitedNodeIds.includes('library.librarian.q0.choices'), false);
    assert.deepEqual(resumed.state.consequenceIds, ['library.learnRiddle']);
    assert.throws(() => createDialogueState(libraryDialogueGraph, { startNodeId: 'library.librarian.q9.nowhere' }), /Unknown dialogue start node/);
});

test('puzzle prerequisites explain gates and effects are idempotent with convergent facts', () => {
    const action = { id: 'bridge.repair', requires: ['bridge.materials'], effects: ['bridge.repaired'] };
    assert.deepEqual(whyUnavailable(action, {}), { available: false, actionId: 'bridge.repair', missingFactIds: ['bridge.materials'], reason: 'missing-prerequisites' });
    const first = applyPuzzleAction({ 'bridge.materials': true }, action);
    assert.equal(first.changed, true);
    assert.equal(applyPuzzleAction(first.facts, action).changed, false);
    const alternate = applyPuzzleAction({ 'bridge.materials': true }, { ...action, id: 'bridge.repairAlternate' });
    assert.deepEqual(alternate.facts, first.facts);
    assert.deepEqual(whyGateUnavailable({ gateFact: 'bridge.repaired' }, first.facts), { available: true, reason: null, missingFactIds: [] });
});

test('path rules cover costs, boundaries, fallback, pointer transforms, and semantic resolution', () => {
    const grid = [
        ['w100', 'w100', 'n'],
        ['n', 'w100', 'n'],
        ['n', 'w100', 'w100'],
    ];
    assert.equal(movementCost('n'), 10000);
    assert.deepEqual(findPath(grid, { x: 0, y: 0 }, { x: 2, y: 2 }, { blocked: (cell) => cell === 'n' }).at(-1), { x: 2, y: 2 });
    assert.deepEqual(findPath(grid, { x: -1, y: 0 }, { x: 2, y: 2 }), []);
    assert.deepEqual(findNearestWalkable(grid, { x: 2, y: 0 }), { x: 1, y: 0 });
    assert.equal(findPathWithFallback(grid, { x: 0, y: 0 }, { x: 2, y: 0 }, { blocked: (cell) => cell === 'n' }).usedFallback, true);
    const world = pointerToWorld({ clientX: 60, clientY: 45 }, { left: 10, top: 20, width: 100, height: 50 }, { width: 200, height: 100 });
    assert.deepEqual(world, { x: 100, y: 50 });
    assert.deepEqual(worldToGrid(world, { cellWidth: 10, cellHeight: 10, width: 20, height: 10 }), { x: 10, y: 5, inBounds: true });
    assert.equal(resolveHotspot([{ id: 'book', x: 2, y: 3, width: 4, height: 5 }], { x: 3, y: 4 }).id, 'book');
    assert.deepEqual(resolveInteractionAnchor({ id: 'book' }, { book: { x: 4, y: 5 } }), { x: 4, y: 5 });
    assert.equal(resolveCellTarget('cnpcLibrarian', { roomId: 'library', npcs: { npcLibrarian: { interactable: { canHover: true } } } }).kind, 'npc');
});

test('save migrations accept current and declared legacy saves only', () => {
    const current = createSaveEnvelope({ state: createInitialGameState(), savedAt: '2026-09-13T00:00:00.000Z' });
    assert.deepEqual(migrateSave(current), current);

    // A version 1 save carried the whole canonical state, content bundle and
    // all. Migration keeps its progress and parks the bundle for the caller to
    // turn into a patch once the shipped content is known.
    const legacy = { schemaVersion: 1, state: { ...createInitialGameState(), content: { navigation: { libraryFoyer: { alreadyVisited: true } } } } };
    const migrated = migrateSave(legacy);
    assert.equal(migrated.schemaVersion, 2);
    assert.equal(migrated.migratedFrom, 1);
    assert.deepEqual(migrated.payload.quests, { facts: {}, bridgeState: 0 });
    assert.deepEqual(migrated.payload.legacyContent.navigation.libraryFoyer, { alreadyVisited: true });

    assert.deepEqual(migrateSave({ schemaVersion: 0, state: {} }).payload.quests, { facts: {}, bridgeState: 0 });
    assert.throws(() => migrateSave({ schemaVersion: 99, state: {} }), /Unsupported/);

    const finalised = finaliseLegacyWorld(migrated, { navigation: { libraryFoyer: { alreadyVisited: false } } });
    assert.equal(finalised.payload.legacyContent, undefined);
    assert.deepEqual(finalised.payload.world.patches.navigation, [
        { op: 'set', path: ['libraryFoyer', 'alreadyVisited'], value: true },
    ]);
});
