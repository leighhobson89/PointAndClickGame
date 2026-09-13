// Chapter progress: objectives, hints, availability explanations, soft-lock
// detection, and the chapter-completion summary.
//
// Everything here is derived from the canonical fact set plus the shipped
// content contract. Nothing is stored twice: the journal has no state of its
// own, so a save that restores facts restores the journal exactly. This module
// returns stable IDs and localisation keys only — never translated text — so
// the same journal renders in every locale.

import { whyUnavailable } from '../puzzles/puzzles.mjs';

export const JOURNAL_SECTION = 'journal';

export const OBJECTIVE_STATUS = Object.freeze({
    HIDDEN: 'hidden',
    ACTIVE: 'active',
    DONE: 'done',
});

export const CHOICE_FACT_PREFIX = 'choice.';

const isTrue = (facts, factId) => facts?.[factId] === true;

export function objectiveTitleKey(objectiveId) {
    return `${objectiveId}.title`;
}

export function objectiveHintKey(objectiveId, tier) {
    return `${objectiveId}.hint${tier}`;
}

export function choiceFactId(choiceId) {
    return `${CHOICE_FACT_PREFIX}${choiceId}`;
}

function contractActions(contract) {
    return contract?.puzzle?.actions ?? [];
}

function contractObjectives(contract) {
    return contract?.puzzle?.objectives ?? [];
}

/**
 * Actions in a chain that the player could perform right now but has not.
 * This is the player-safe cousin of the debug critical-path frontier: it is
 * scoped to one objective's chain and is never rendered as raw action IDs.
 */
export function nextActionIds(contract, facts = {}, chainId = null) {
    return contractActions(contract)
        .filter((action) => chainId === null || action.chain === chainId)
        .filter((action) => (action.requires ?? []).every((factId) => isTrue(facts, factId)))
        .filter((action) => (action.effects ?? []).some((factId) => !isTrue(facts, factId)))
        .map((action) => action.id);
}

/**
 * Objective status for every declared objective. An objective stays hidden
 * until the player has seen the thing that raises the question, which is what
 * keeps the journal spoiler-safe: it never names a puzzle the player has not
 * met yet.
 */
export function deriveObjectives(contract, facts = {}) {
    return Object.freeze(contractObjectives(contract).map((objective) => {
        const done = isTrue(facts, objective.completedBy);
        const revealed = done || isTrue(facts, objective.revealedBy);
        const status = done ? OBJECTIVE_STATUS.DONE : revealed ? OBJECTIVE_STATUS.ACTIVE : OBJECTIVE_STATUS.HIDDEN;
        return Object.freeze({
            id: objective.id,
            chain: objective.chain,
            status,
            titleKey: objectiveTitleKey(objective.id),
            completedBy: objective.completedBy,
            revealedBy: objective.revealedBy,
            hintTiers: objective.hintTiers ?? 0,
            nextActionIds: Object.freeze(status === OBJECTIVE_STATUS.ACTIVE ? nextActionIds(contract, facts, objective.chain) : []),
        });
    }));
}

/**
 * The journal as the player sees it: revealed objectives, split into what is
 * still open and what is already done, plus milestone progress.
 */
export function deriveJournal(contract, facts = {}) {
    const objectives = deriveObjectives(contract, facts);
    const milestoneFacts = contract?.puzzle?.milestoneFacts ?? contract?.puzzle?.mandatoryFacts ?? [];
    const milestonesReached = milestoneFacts.filter((factId) => isTrue(facts, factId));

    return Object.freeze({
        objectives,
        active: Object.freeze(objectives.filter((objective) => objective.status === OBJECTIVE_STATUS.ACTIVE)),
        completed: Object.freeze(objectives.filter((objective) => objective.status === OBJECTIVE_STATUS.DONE)),
        hidden: Object.freeze(objectives.filter((objective) => objective.status === OBJECTIVE_STATUS.HIDDEN)),
        milestoneFactIds: Object.freeze([...milestoneFacts]),
        milestonesReached: Object.freeze(milestonesReached),
        milestoneCount: milestoneFacts.length,
        milestonesReachedCount: milestonesReached.length,
        chapterComplete: isTrue(facts, contract?.puzzle?.objectives?.at(-1)?.completedBy ?? 'chapter1.mapReached'),
    });
}

/**
 * Hint keys an objective is willing to give up, one tier at a time. Tier 1 is
 * a nudge towards the place, tier 2 names the obstacle, tier 3 states the
 * solution. The caller decides how many tiers the player has asked for, so a
 * player who wants no hints is never shown one.
 */
export function revealedHintKeys(objective, revealedTierCount = 0) {
    const tiers = Math.max(0, Math.min(revealedTierCount, objective?.hintTiers ?? 0));
    return Object.freeze(Array.from({ length: tiers }, (unused, index) => objectiveHintKey(objective.id, index + 1)));
}

/**
 * A player-readable reason an action is unavailable. The reason is a stable
 * ID, and the blocking prerequisites are reported as the objectives that own
 * them rather than as raw fact IDs, so a gate explanation never leaks the
 * name of a puzzle step the player has not reached.
 */
export function explainActionAvailability(contract, facts = {}, actionId = null) {
    const action = contractActions(contract).find((candidate) => candidate.id === actionId) ?? null;
    const availability = whyUnavailable(action, facts);
    const blockingObjectiveIds = availability.missingFactIds
        .map((factId) => owningObjectiveId(contract, factId))
        .filter((objectiveId, index, all) => objectiveId !== null && all.indexOf(objectiveId) === index);

    return Object.freeze({
        actionId,
        available: availability.available,
        reason: availability.reason,
        missingFactIds: Object.freeze([...availability.missingFactIds]),
        blockingObjectiveIds: Object.freeze(blockingObjectiveIds),
        chain: action?.chain ?? null,
    });
}

/**
 * A gate's explanation, expressed the same way as an action's. Room gates
 * carry a single fact, so the answer is which objective still owns it.
 */
export function explainGate(contract, facts = {}, gateFactId = null) {
    if (!gateFactId || isTrue(facts, gateFactId)) {
        return Object.freeze({ gateFactId, available: true, reason: null, blockingObjectiveId: null });
    }
    return Object.freeze({
        gateFactId,
        available: false,
        reason: 'missing-gate-fact',
        blockingObjectiveId: owningObjectiveId(contract, gateFactId),
    });
}

function owningObjectiveId(contract, factId) {
    const producer = contractActions(contract).find((action) => (action.effects ?? []).includes(factId));
    if (!producer) return null;
    const objective = contractObjectives(contract).find((candidate) => candidate.chain === producer.chain);
    return objective?.id ?? null;
}

/**
 * Every fact still obtainable from the given facts, by repeatedly applying
 * whatever the player could do next. Because no Chapter 1 action consumes a
 * fact, this closure is exactly "everything still achievable".
 */
export function reachableFacts(contract, facts = {}) {
    const reached = new Set(Object.entries(facts).filter(([, value]) => value === true).map(([factId]) => factId));
    const actions = contractActions(contract);
    let changed = true;
    while (changed) {
        changed = false;
        for (const action of actions) {
            if (!(action.requires ?? []).every((factId) => reached.has(factId))) continue;
            for (const factId of action.effects ?? []) {
                if (!reached.has(factId)) {
                    reached.add(factId);
                    changed = true;
                }
            }
        }
    }
    return reached;
}

/**
 * Mandatory facts that can no longer be reached. An empty list is the
 * chapter's no-soft-lock guarantee, and it is asserted from a clean start and
 * from every shipped scenario fixture.
 */
export function detectSoftLocks(contract, facts = {}) {
    const reached = reachableFacts(contract, facts);
    const unreachable = (contract?.puzzle?.mandatoryFacts ?? []).filter((factId) => !reached.has(factId));
    return Object.freeze({
        softLocked: unreachable.length > 0,
        unreachableMandatoryFactIds: Object.freeze(unreachable),
    });
}

export function recordedChoiceIds(facts = {}) {
    return Object.freeze(Object.entries(facts)
        .filter(([factId, value]) => value === true && factId.startsWith(CHOICE_FACT_PREFIX))
        .map(([factId]) => factId.slice(CHOICE_FACT_PREFIX.length))
        .sort());
}

/**
 * The end-of-chapter summary: how much of the chapter was completed, which
 * optional discoveries the player made, and which stable choice variants they
 * took. Optional facts are the ones no mandatory fact depends on, which is
 * what makes exploration visible without turning it into a requirement.
 */
export function chapterSummary(contract, facts = {}) {
    const journal = deriveJournal(contract, facts);
    const mandatory = new Set(contract?.puzzle?.mandatoryFacts ?? []);
    const requiredForMandatory = requiredFactClosure(contract, mandatory);
    const optionalFound = Object.entries(facts)
        .filter(([factId, value]) => value === true && !requiredForMandatory.has(factId) && !factId.startsWith(CHOICE_FACT_PREFIX))
        .map(([factId]) => factId)
        .sort();

    return Object.freeze({
        chapterComplete: journal.chapterComplete,
        milestonesReached: journal.milestonesReachedCount,
        milestoneCount: journal.milestoneCount,
        objectivesCompleted: journal.completed.length,
        objectiveCount: journal.objectives.length,
        optionalFactIds: Object.freeze(optionalFound),
        choiceIds: recordedChoiceIds(facts),
        outstandingObjectiveIds: Object.freeze(journal.objectives
            .filter((objective) => objective.status !== OBJECTIVE_STATUS.DONE)
            .map((objective) => objective.id)),
    });
}

function requiredFactClosure(contract, targetFactIds) {
    const actions = contractActions(contract);
    const required = new Set(targetFactIds);
    let changed = true;
    while (changed) {
        changed = false;
        for (const action of actions) {
            if (!(action.effects ?? []).some((factId) => required.has(factId))) continue;
            for (const factId of action.requires ?? []) {
                if (!required.has(factId)) {
                    required.add(factId);
                    changed = true;
                }
            }
        }
    }
    return required;
}
