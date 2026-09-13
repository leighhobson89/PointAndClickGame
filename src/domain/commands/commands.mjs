export const VERB_IDS = Object.freeze([
    'lookAt',
    'pickUp',
    'use',
    'open',
    'close',
    'push',
    'pull',
    'talkTo',
    'give',
]);

export const DEFAULT_VERB_ID = 'walkTo';
export const TWO_TARGET_VERB_IDS = Object.freeze(['use', 'give']);

const LEGACY_KEYS = Object.freeze({
    walkTo: 'verbWalkTo',
    lookAt: 'verbLookAt',
    pickUp: 'verbPickUp',
    use: 'verbUse',
    open: 'verbOpen',
    close: 'verbClose',
    push: 'verbPush',
    pull: 'verbPull',
    talkTo: 'verbTalkTo',
    give: 'verbGive',
});

const LOCALISATION_KEYS = Object.freeze({
    walkTo: 'interactionWalkTo',
    lookAt: 'interactionLookAt',
    pickUp: 'interactionPickUp',
    use: 'interactionUse',
    open: 'interactionOpen',
    close: 'interactionClose',
    push: 'interactionPush',
    pull: 'interactionPull',
    talkTo: 'interactionTalkTo',
    give: 'interactionGive',
});

export function assertVerbId(verbId, { allowWalk = true } = {}) {
    const allowed = allowWalk ? [DEFAULT_VERB_ID, ...VERB_IDS] : VERB_IDS;
    if (!allowed.includes(verbId)) throw new TypeError(`Unknown verbId '${verbId}'`);
    return verbId;
}

export function createCommandIntent({ verbId, primaryTargetId = null, secondaryTargetId = null } = {}) {
    assertVerbId(verbId);
    for (const [name, value] of Object.entries({ primaryTargetId, secondaryTargetId })) {
        if (value !== null && (typeof value !== 'string' || value.length === 0)) {
            throw new TypeError(`${name} must be a non-empty stable ID or null`);
        }
    }
    if (secondaryTargetId && !primaryTargetId) throw new TypeError('secondaryTargetId requires primaryTargetId');
    if (secondaryTargetId && !TWO_TARGET_VERB_IDS.includes(verbId)) {
        throw new TypeError(`${verbId} does not accept a secondary target`);
    }
    return Object.freeze({ verbId, primaryTargetId, secondaryTargetId });
}

export function createCommandSelection(verbId = DEFAULT_VERB_ID) {
    return Object.freeze({ verbId: assertVerbId(verbId), primaryTargetId: null, waitingForSecondTarget: false });
}

export function selectVerb(selection, verbId) {
    assertVerbId(verbId);
    return createCommandSelection(verbId);
}

export function selectTarget(selection, targetId) {
    if (!selection || typeof selection !== 'object') throw new TypeError('selection is required');
    if (typeof targetId !== 'string' || targetId.length === 0) return { status: 'error', reason: 'target-required', selection };
    const verbId = assertVerbId(selection.verbId);

    if (!TWO_TARGET_VERB_IDS.includes(verbId)) {
        return { status: 'ready', intent: createCommandIntent({ verbId, primaryTargetId: targetId }), selection: createCommandSelection() };
    }
    if (!selection.waitingForSecondTarget) {
        return {
            status: 'waiting',
            selection: Object.freeze({ verbId, primaryTargetId: targetId, waitingForSecondTarget: true }),
        };
    }
    if (selection.primaryTargetId === targetId) return { status: 'error', reason: 'same-target', selection };
    return {
        status: 'ready',
        intent: createCommandIntent({ verbId, primaryTargetId: selection.primaryTargetId, secondaryTargetId: targetId }),
        selection: createCommandSelection(),
    };
}

export function cancelCommand() {
    return createCommandSelection();
}

export function contextualVerbForTarget(target = {}) {
    if (target.kind === 'npc') return 'talkTo';
    if (target.kind === 'object' && target.isDoor) return target.isOpen ? 'close' : 'open';
    if (target.kind === 'object' && target.canPickUp) return 'lookAt';
    return target.id ? 'lookAt' : DEFAULT_VERB_ID;
}

export function toLegacyVerbKey(verbId) {
    return LEGACY_KEYS[assertVerbId(verbId)];
}

export function toLocalisationKey(verbId) {
    return LOCALISATION_KEYS[assertVerbId(verbId)];
}

export function fromLocalisationKey(key) {
    const entry = Object.entries(LOCALISATION_KEYS).find(([, value]) => value === key);
    return entry?.[0] ?? null;
}

