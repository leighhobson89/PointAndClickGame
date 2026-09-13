import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    CHOICE_FACT_PREFIX,
    OBJECTIVE_STATUS,
    chapterSummary,
    choiceFactId,
    deriveJournal,
    deriveObjectives,
    detectSoftLocks,
    explainActionAvailability,
    explainGate,
    nextActionIds,
    objectiveHintKey,
    objectiveTitleKey,
    reachableFacts,
    recordedChoiceIds,
    revealedHintKeys,
} from '../../src/domain/progress/journal.mjs';
import { applyActionById } from '../../src/domain/puzzles/puzzles.mjs';
import { SCENARIOS } from '../../src/content/scenario-registry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

const contract = readJson('resources/content-contract.json');
const localization = readJson('localization.json');
const actions = contract.puzzle.actions;
const START = { 'chapter1.started': true };

/** Apply actions until nothing new can be recorded, in dependency order. */
function playChapter(fromFacts = START) {
    let facts = { ...fromFacts };
    const order = [];
    let progressed = true;
    while (progressed) {
        progressed = false;
        for (const action of actions) {
            const result = applyActionById(facts, actions, action.id);
            if (result.available && result.changed) {
                facts = { ...result.facts };
                order.push(action.id);
                progressed = true;
            }
        }
    }
    return { facts, order };
}

test('objectives stay hidden until the player has met the puzzle, then activate and complete', () => {
    const atStart = deriveObjectives(contract, START);
    const library = atStart.find((objective) => objective.id === 'objective.libraryAccess');
    const wolf = atStart.find((objective) => objective.id === 'objective.wolf');

    assert.equal(library.status, OBJECTIVE_STATUS.ACTIVE, 'the library question exists from the first room');
    assert.equal(wolf.status, OBJECTIVE_STATUS.HIDDEN, 'the wolf must not be named before the player meets it');

    const revealed = deriveObjectives(contract, { ...START, 'bridge.repaired': true });
    assert.equal(revealed.find((objective) => objective.id === 'objective.wolf').status, OBJECTIVE_STATUS.ACTIVE);

    const done = deriveObjectives(contract, { ...START, 'bridge.repaired': true, 'river.wolfResolved': true });
    assert.equal(done.find((objective) => objective.id === 'objective.wolf').status, OBJECTIVE_STATUS.DONE);
});

test('a completed objective is reported done even if its reveal fact was never recorded', () => {
    const objectives = deriveObjectives(contract, { ...START, 'river.wolfResolved': true });
    assert.equal(objectives.find((objective) => objective.id === 'objective.wolf').status, OBJECTIVE_STATUS.DONE);
});

test('hints are opt-in, ordered, and never exceed the declared tiers', () => {
    const [objective] = deriveObjectives(contract, START);
    assert.deepEqual(revealedHintKeys(objective, 0), [], 'a player who asks for nothing is told nothing');
    assert.deepEqual(revealedHintKeys(objective, 2), [
        objectiveHintKey(objective.id, 1),
        objectiveHintKey(objective.id, 2),
    ]);
    assert.equal(revealedHintKeys(objective, 99).length, objective.hintTiers, 'asking harder cannot invent tiers');
});

test('every objective has a title and a full ladder of hints in every shipped locale', () => {
    for (const objective of contract.puzzle.objectives) {
        const keys = [objectiveTitleKey(objective.id)];
        for (let tier = 1; tier <= objective.hintTiers; tier += 1) keys.push(objectiveHintKey(objective.id, tier));
        for (const locale of contract.locales) {
            for (const key of keys) {
                const value = localization[locale]?.journal?.[key];
                assert.equal(typeof value, 'string', `${locale}.journal.${key} must exist`);
                assert.ok(value.trim().length > 0, `${locale}.journal.${key} must not be blank`);
            }
        }
    }
});

test('an unavailable action is explained by objective, never by raw prerequisite facts', () => {
    const explanation = explainActionAvailability(contract, START, 'bridge.repair');
    assert.equal(explanation.available, false);
    assert.equal(explanation.reason, 'missing-prerequisites');
    assert.ok(explanation.missingFactIds.length > 0);
    assert.deepEqual(explanation.blockingObjectiveIds, ['objective.bridge', 'objective.barnAccess']);

    const finished = playChapter().facts;
    assert.equal(explainActionAvailability(contract, finished, 'bridge.repair').available, true);
    assert.equal(explainActionAvailability(contract, finished, 'nope.notAnAction').reason, 'unknown-action');
});

test('a locked room gate explains itself through the objective that owns it', () => {
    const gate = explainGate(contract, START, 'den.unlocked');
    assert.equal(gate.available, false);
    assert.equal(gate.blockingObjectiveId, 'objective.denAccess');

    assert.equal(explainGate(contract, { ...START, 'den.unlocked': true }, 'den.unlocked').available, true);
    assert.equal(explainGate(contract, START, null).available, true, 'an ungated exit is always available');
});

test('the chapter can be completed from a clean start and never soft-locks on the way', () => {
    const { facts, order } = playChapter();
    assert.equal(order.length, actions.length, 'every authored action is performed exactly once');
    for (const factId of contract.puzzle.mandatoryFacts) {
        assert.equal(facts[factId], true, `${factId} must be reachable from a clean start`);
    }

    // Walk the same path again, checking after every single step that the rest
    // of the chapter is still finishable. This is the no-soft-lock guarantee.
    let progress = { ...START };
    assert.equal(detectSoftLocks(contract, progress).softLocked, false);
    let completed = 0;
    for (const actionId of order) {
        progress = { ...applyActionById(progress, actions, actionId).facts };
        const locks = detectSoftLocks(contract, progress);
        assert.equal(locks.softLocked, false, `${actionId} stranded ${locks.unreachableMandatoryFactIds.join(', ')}`);
        const done = deriveJournal(contract, progress).completed.length;
        assert.ok(done >= completed, `${actionId} must not un-complete an objective`);
        completed = done;
    }
    assert.equal(deriveJournal(contract, progress).chapterComplete, true);
});

test('no shipped scenario fixture starts the player in a soft-locked state', () => {
    for (const scenario of Object.values(SCENARIOS)) {
        const locks = detectSoftLocks(contract, scenario.facts);
        assert.equal(locks.softLocked, false, `${scenario.id} cannot finish: ${locks.unreachableMandatoryFactIds.join(', ')}`);
    }
});

test('reachable facts from a clean start cover the whole authored chapter', () => {
    const reached = reachableFacts(contract, START);
    for (const action of actions) {
        for (const factId of action.effects) assert.ok(reached.has(factId), `${factId} is unreachable`);
    }
});

test('the journal reports only the chain the player is actually on', () => {
    const atStart = deriveJournal(contract, START);
    assert.equal(atStart.milestonesReachedCount, 0);
    assert.equal(atStart.chapterComplete, false);
    assert.ok(atStart.hidden.length > 0, 'unmet puzzles stay out of the journal');
    for (const objective of atStart.active) {
        assert.ok(objective.nextActionIds.every((actionId) =>
            actions.find((action) => action.id === actionId).chain === objective.chain));
    }
    assert.deepEqual(nextActionIds(contract, START, 'library'), ['library.learnRiddle']);
});

test('the journal is a pure function of the facts', () => {
    const facts = { ...START, 'library.riddleKnown': true };
    assert.deepEqual(deriveJournal(contract, facts), deriveJournal(contract, { ...facts }));
});

test('stable choice variants are recorded as facts and reach the chapter summary', () => {
    const choice = choiceFactId('library.librarian.askResearchKey');
    assert.equal(choice, `${CHOICE_FACT_PREFIX}library.librarian.askResearchKey`);
    assert.deepEqual(recordedChoiceIds({ [choice]: true, 'library.riddleKnown': true }), ['library.librarian.askResearchKey']);

    const finished = { ...playChapter().facts, [choice]: true };
    const summary = chapterSummary(contract, finished);
    assert.equal(summary.chapterComplete, true);
    assert.deepEqual(summary.choiceIds, ['library.librarian.askResearchKey']);
    assert.deepEqual(summary.outstandingObjectiveIds, []);
    assert.equal(summary.objectivesCompleted, summary.objectiveCount);
    assert.equal(summary.milestonesReached, summary.milestoneCount);
    assert.ok(!summary.optionalFactIds.includes(choice), 'a choice is not an optional discovery');
});

test('the summary separates optional discoveries from the facts the chapter required', () => {
    const summary = chapterSummary(contract, { ...playChapter().facts, 'farmer.wentHome': true });
    assert.ok(summary.optionalFactIds.includes('farmer.wentHome'), 'sending the farmer home is flavour, not a requirement');
    assert.ok(!summary.optionalFactIds.includes('bridge.repaired'), 'a mandatory fact is never reported as optional');
});

test('every pickup mapping names a real action and every gate fact is declared mandatory', () => {
    const actionIds = new Set(actions.map((action) => action.id));
    for (const [objectId, actionId] of Object.entries(contract.puzzle.runtimePickupActions)) {
        assert.ok(actionIds.has(actionId), `${objectId} maps to unknown action ${actionId}`);
    }
    for (const connection of contract.world.connections.filter((entry) => entry.gateFact)) {
        assert.ok(contract.puzzle.mandatoryFacts.includes(connection.gateFact), `${connection.gateFact} gates a room but is not mandatory`);
    }
});
