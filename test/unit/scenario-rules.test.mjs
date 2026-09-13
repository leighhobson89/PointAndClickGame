import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    SCENARIO_SCHEMA_VERSION,
    closeFactsOverPrerequisites,
    createScenario,
    createSeededRandom,
    criticalPathFrontier,
    deriveScenarioMutations,
    stateChecksum,
    validateFactConsistency,
    validateScenario,
} from '../../src/domain/scenarios/scenarios.mjs';
import { FACT_EFFECTS, SCENARIOS, listScenarios, validateRegistry } from '../../src/content/scenario-registry.mjs';
import { createIdleTracker } from '../../src/application/idle.mjs';
import { createInitialGameState } from '../../src/state/game-state.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

const contract = readJson('resources/content-contract.json');
const objects = readJson('resources/objectsGame.json');
const npcs = readJson('resources/npcGame.json');
const grids = readJson('resources/screenWalkableJSONS/masterJSONData.json');

const contractFactIds = [
    ...contract.puzzle.initialFacts,
    ...contract.puzzle.actions.flatMap((action) => action.effects),
];

const validationContext = {
    roomIds: contract.world.rooms,
    factIds: contractFactIds,
    objectIds: Object.keys(objects.objects),
    npcIds: Object.keys(npcs.npcs),
    localeIds: contract.locales,
};

const readPath = (root_, dotted) => dotted.split('.').reduce((value, key) => value?.[key], root_);

test('every reviewed scenario fixture validates against the shipped content contract', () => {
    assert.deepEqual(validateRegistry(validationContext), []);

    // The catalogue in docs/debug-test-controls.md must stay implemented.
    const expected = [
        'chapter1.new-game', 'chapter1.library-riddle', 'chapter1.research-unlock-ready', 'chapter1.town-open',
        'chapter1.den-unlock-ready', 'chapter1.barn-unblock-ready', 'chapter1.rigging-ready', 'chapter1.bridge-ready',
        'chapter1.wolf-ready', 'chapter1.map-entry', 'system.inventory-full', 'system.long-localisation',
        'system.corrupt-save', 'system.asset-failure',
    ];
    assert.deepEqual(listScenarios().map((scenario) => scenario.id).sort(), [...expected].sort());
});

test('scenario facts are internally consistent and never assert an unreachable state', () => {
    for (const scenario of Object.values(SCENARIOS)) {
        const consistency = validateFactConsistency(scenario.facts, contract.puzzle.actions);
        assert.deepEqual(consistency.conflicts, [], `${scenario.id} asserts facts whose prerequisites are missing`);
    }
    // Closing over prerequisites walks the whole chapter backwards: repairing
    // the bridge is only reachable once the wood is hoisted, which reaches back
    // through the rigging, the barn, the den and the library to the start.
    const closed = closeFactsOverPrerequisites({ 'bridge.repaired': true }, contract.puzzle.actions);
    for (const factId of ['rigging.woodHoisted', 'rigging.pulleyMounted', 'barn.unblocked', 'den.unlocked', 'library.riddleKnown', 'chapter1.started']) {
        assert.equal(closed[factId], true, `closing bridge.repaired should require ${factId}`);
    }
});

test('every fact effect targets a property that exists in shipped content', () => {
    for (const [factId, effect] of Object.entries(FACT_EFFECTS)) {
        assert.ok(contractFactIds.includes(factId), `${factId} is not a declared contract fact`);
        for (const mutation of effect.objects ?? []) {
            const target = objects.objects[mutation.objectId];
            assert.ok(target, `${factId} references unknown object '${mutation.objectId}'`);
            assert.notEqual(readPath(target, mutation.path), undefined, `${factId}: ${mutation.objectId}.${mutation.path} does not exist`);
        }
        for (const mutation of effect.npcs ?? []) {
            const target = npcs.npcs[mutation.npcId];
            assert.ok(target, `${factId} references unknown NPC '${mutation.npcId}'`);
            assert.notEqual(readPath(target, mutation.path), undefined, `${factId}: ${mutation.npcId}.${mutation.path} does not exist`);
        }
        for (const mutation of effect.grids ?? []) {
            assert.ok(grids[mutation.variantId], `${factId} references unknown grid variant '${mutation.variantId}'`);
        }
        for (const entry of effect.inventory ?? []) {
            assert.ok(objects.objects[entry.objectId], `${factId} grants unknown item '${entry.objectId}'`);
        }
    }
});

test('mutations are derived from gate facts rather than copied world state', () => {
    const locked = deriveScenarioMutations(SCENARIOS['chapter1.new-game'], {
        connections: contract.world.connections,
        factEffects: FACT_EFFECTS,
    });
    const denGate = locked.exits.find((exit) => exit.roomId === 'alley' && exit.exitId === 'e1');
    assert.equal(denGate.status, 'locked');
    assert.equal(locked.exits.find((exit) => exit.roomId === 'libraryFoyer' && exit.exitId === 'e2').status, 'open');

    const open = deriveScenarioMutations(SCENARIOS['chapter1.map-entry'], {
        connections: contract.world.connections,
        factEffects: FACT_EFFECTS,
    });
    for (const gate of ['libraryFoyer.e1', 'alley.e1', 'stables.e1', 'riverCrossing.e2']) {
        const [roomId, exitId] = gate.split('.');
        assert.equal(open.exits.find((exit) => exit.roomId === roomId && exit.exitId === exitId).status, 'open', `${gate} should be open`);
    }
    assert.ok(open.grids.some((mutation) => mutation.id === 'riverCrossing' && mutation.value === 'riverCrossingBridgeComplete'));
    assert.ok(open.inventory.some((entry) => entry.objectId === 'objectKeyToDen'));
    // Every derived inventory entry is unique, so repeated facts never stack.
    assert.equal(new Set(open.inventory.map((entry) => entry.objectId)).size, open.inventory.length);
});

test('invalid scenarios are rejected with specific reasons', () => {
    const errors = validateScenario(createScenario({
        id: 'chapter1.broken',
        seed: 7,
        roomId: 'notARoom',
        locale: 'xx',
        facts: { 'library.riddleKnown': true, 'not.aFact': true },
        inventory: [{ objectId: 'objectDoesNotExist' }],
        presentation: { movementSpeed: 'warp', textSpeed: 'sluggish' },
    }), validationContext);

    assert.ok(errors.some((error) => error.includes("roomId 'notARoom'")));
    assert.ok(errors.some((error) => error.includes('not.aFact')));
    assert.ok(errors.some((error) => error.includes('objectDoesNotExist')));
    assert.ok(errors.some((error) => error.includes("locale 'xx'")));
    assert.ok(errors.some((error) => error.includes('movementSpeed')));
    assert.ok(errors.some((error) => error.includes('textSpeed')));

    const spawnErrors = validateScenario(createScenario({ id: 'chapter1.offGrid', seed: 1, roomId: 'libraryFoyer', spawn: { x: 99, y: 5 }, facts: {} }), validationContext);
    assert.ok(spawnErrors.some((error) => error.includes('outside the 80 x 60 grid')));

    assert.ok(validateScenario({ ...SCENARIOS['chapter1.new-game'], schemaVersion: 99 }, validationContext)
        .some((error) => error.includes(`must be ${SCENARIO_SCHEMA_VERSION}`)));
});

test('the same state and seed always produce the same checksum', () => {
    const build = () => {
        const state = createInitialGameState({ roomId: 'riverCrossing', language: 'de' });
        state.quests.facts['bridge.repaired'] = true;
        state.quests.facts['chapter1.started'] = true;
        state.inventory = { slot1: { object: 'objectBone', quantity: 1 } };
        return state;
    };
    const context = { scenarioId: 'chapter1.wolf-ready', seed: 1009, spawn: { x: 12, y: 40 } };

    assert.equal(stateChecksum(build(), context), stateChecksum(build(), context));

    const different = build();
    different.quests.facts['river.wolfResolved'] = true;
    assert.notEqual(stateChecksum(different, context), stateChecksum(build(), context));

    // Player pixel position is viewport-derived, so it must not move the checksum.
    const moved = build();
    moved.player.xPos = 812.5;
    moved.player.yPos = 33.25;
    assert.equal(stateChecksum(moved, context), stateChecksum(build(), context));

    assert.notEqual(stateChecksum(build(), context), stateChecksum(build(), { ...context, seed: 1 }));
});

test('the seeded generator is reproducible and seed-sensitive', () => {
    const draw = (seed) => Array.from({ length: 5 }, createSeededRandom(seed));
    const first = createSeededRandom(4242);
    const second = createSeededRandom(4242);
    assert.deepEqual([first(), first(), first()], [second(), second(), second()]);
    assert.notDeepEqual(draw(1).map(() => 0), []);
    const a = createSeededRandom(1);
    const b = createSeededRandom(2);
    assert.notEqual(a(), b());
    const sample = createSeededRandom(99);
    for (let index = 0; index < 50; index += 1) {
        const value = sample();
        assert.ok(value >= 0 && value < 1, 'seeded values stay in [0, 1)');
    }
});

test('the critical-path frontier reports only actions that are available and unfinished', () => {
    // From a clean start the chapter opens on five independent threads: the
    // library tutorial, the carpenter, the pitchfork, the milk bottle, and the
    // river rigging. That breadth is the point of the chapter, so the frontier
    // naming all five is the assertion, not an accident of ordering.
    const frontier = criticalPathFrontier(contract.puzzle.actions, { 'chapter1.started': true });
    assert.deepEqual(frontier.map((entry) => entry.actionId).sort(), [
        'carpenter.speakTo',
        'house.takePitchfork',
        'kitchen.takeMilk',
        'library.learnRiddle',
        'rigging.assemble',
    ]);

    const finished = Object.fromEntries(contract.puzzle.actions.flatMap((action) => action.effects).map((factId) => [factId, true]));
    assert.deepEqual(criticalPathFrontier(contract.puzzle.actions, { ...finished, 'chapter1.started': true }), []);
});

test('the idle tracker waits for every probe and names whatever is still busy', async () => {
    let movementTicks = 3;
    const tracker = createIdleTracker({
        stableTicks: 2,
        now: () => Date.now(),
        schedule: (callback) => setTimeout(callback, 1),
        probes: {
            movement: () => (movementTicks -= 1) > 0,
            dialogue: () => false,
        },
    });

    assert.deepEqual(tracker.probeNames, ['movement', 'dialogue']);
    const result = await tracker.waitForIdle({ timeoutMs: 1_000 });
    assert.equal(result.idle, true);
    assert.equal(result.timedOut, false);

    const stuck = createIdleTracker({
        stableTicks: 1,
        now: () => Date.now(),
        schedule: (callback) => setTimeout(callback, 1),
        probes: { animation: () => true, transition: () => false },
    });
    const timedOut = await stuck.waitForIdle({ timeoutMs: 30 });
    assert.equal(timedOut.idle, false);
    assert.equal(timedOut.timedOut, true);
    assert.deepEqual(timedOut.pending, ['animation']);
});
