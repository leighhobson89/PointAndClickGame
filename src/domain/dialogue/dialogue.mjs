function conditionsMet(conditions = [], facts = {}) {
    return conditions.every((condition) => condition.not === true ? facts[condition.factId] !== true : facts[condition.factId] === true);
}

export function validateDialogueGraph(graph) {
    const errors = [];
    if (!graph?.id || !graph?.startNodeId || !graph?.nodes) return ['dialogue graph requires id, startNodeId, and nodes'];
    if (!graph.nodes[graph.startNodeId]) errors.push(`start node '${graph.startNodeId}' does not exist`);
    for (const [nodeId, node] of Object.entries(graph.nodes)) {
        if (!node.id || node.id !== nodeId) errors.push(`node key '${nodeId}' must match its stable id`);
        if (!['line', 'choice', 'end'].includes(node.type)) errors.push(`${nodeId}.type is invalid`);
        if (node.nextNodeId && !graph.nodes[node.nextNodeId]) errors.push(`${nodeId} references missing next node '${node.nextNodeId}'`);
        for (const choice of node.choices ?? []) {
            if (!choice.id || !choice.textKey || !graph.nodes[choice.nextNodeId]) errors.push(`${nodeId} has an invalid choice`);
        }
        for (const action of node.actions ?? []) if (!action.id) errors.push(`${nodeId} has an action without a stable id`);
    }
    return errors;
}

export function createDialogueState(graph) {
    const errors = validateDialogueGraph(graph);
    if (errors.length) throw new TypeError(`Invalid dialogue graph: ${errors.join('; ')}`);
    return Object.freeze({ graphId: graph.id, nodeId: graph.startNodeId, visitedChoiceIds: [], consequenceIds: [], ended: false });
}

export function getDialogueNode(graph, state, facts = {}) {
    const node = graph.nodes[state.nodeId];
    return Object.freeze({
        ...node,
        choices: (node.choices ?? []).filter((choice) =>
            conditionsMet(choice.conditions, facts)
            && (choice.repeatable === true || !state.visitedChoiceIds.includes(choice.id))),
    });
}

export function advanceDialogue(graph, state, { choiceId = null, facts = {} } = {}) {
    if (state.ended) return Object.freeze({ state, actions: [], reason: 'already-ended' });
    const node = getDialogueNode(graph, state, facts);
    let nextNodeId = node.nextNodeId;
    let visitedChoiceIds = state.visitedChoiceIds;
    if (node.type === 'choice') {
        const choice = node.choices.find((item) => item.id === choiceId);
        if (!choice) return Object.freeze({ state, actions: [], reason: 'choice-unavailable' });
        nextNodeId = choice.nextNodeId;
        visitedChoiceIds = [...visitedChoiceIds, choice.id];
    }
    const actions = node.actions ?? [];
    const consequenceIds = [...new Set([...state.consequenceIds, ...actions.map((action) => action.id)])];
    const ended = node.type === 'end' || !nextNodeId;
    return Object.freeze({
        state: Object.freeze({ ...state, nodeId: ended ? state.nodeId : nextNodeId, visitedChoiceIds, consequenceIds, ended }),
        actions,
        reason: null,
    });
}
