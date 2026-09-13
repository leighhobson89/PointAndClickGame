function normalizedFacts(facts = {}) {
    return { ...facts };
}

export function whyUnavailable(action, facts = {}) {
    if (!action) return Object.freeze({ available: false, actionId: null, missingFactIds: [], reason: 'unknown-action' });
    const missingFactIds = (action.requires ?? []).filter((factId) => facts[factId] !== true);
    return Object.freeze({
        available: missingFactIds.length === 0,
        actionId: action.id,
        missingFactIds,
        reason: missingFactIds.length ? 'missing-prerequisites' : null,
    });
}

export function applyPuzzleAction(facts, action) {
    const availability = whyUnavailable(action, facts);
    if (!availability.available) return Object.freeze({ facts: normalizedFacts(facts), changed: false, ...availability });
    const nextFacts = normalizedFacts(facts);
    let changed = false;
    for (const factId of action.effects ?? []) {
        if (nextFacts[factId] !== true) {
            nextFacts[factId] = true;
            changed = true;
        }
    }
    return Object.freeze({ facts: nextFacts, changed, available: true, actionId: action.id, missingFactIds: [], reason: changed ? null : 'already-applied' });
}

export function applyActionById(facts, actions, actionId) {
    return applyPuzzleAction(facts, actions.find((action) => action.id === actionId));
}

export function whyGateUnavailable(connection, facts = {}) {
    if (!connection) return Object.freeze({ available: false, reason: 'unknown-exit', missingFactIds: [] });
    if (!connection.gateFact || facts[connection.gateFact] === true) return Object.freeze({ available: true, reason: null, missingFactIds: [] });
    return Object.freeze({ available: false, reason: 'missing-gate-fact', missingFactIds: [connection.gateFact] });
}

