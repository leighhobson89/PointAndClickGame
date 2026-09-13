// Deterministic debug/test scenarios.
//
// A scenario is a small, reviewed fixture describing the canonical facts a
// tester wants to start from. It never contains a copied world-state blob:
// every exit status, entity mutation, grid variant, and starting inventory is
// derived from the facts plus the authoritative content contract.

export const SCENARIO_SCHEMA_VERSION = 1;

export const MOVEMENT_SPEED_IDS = Object.freeze(['slow', 'normal', 'fast', 'instant']);
export const MOVEMENT_SPEED_MULTIPLIERS = Object.freeze({ slow: 0.4, normal: 1, fast: 4, instant: 40 });

export const TEXT_SPEED_IDS = Object.freeze(['slow', 'normal', 'fast', 'instant']);
export const TEXT_SPEED_MULTIPLIERS = Object.freeze({ slow: 2, normal: 1, fast: 0.35, instant: 0 });

const ID_PATTERN = /^[a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9-]+)*$/;
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isId = (value) => typeof value === 'string' && ID_PATTERN.test(value);

// --- determinism -----------------------------------------------------------

export function stableStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

export function checksumString(text) {
    // FNV-1a, expressed as eight lowercase hexadecimal characters.
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}

export function createSeededRandom(seed) {
    if (!Number.isInteger(seed)) throw new TypeError('seed must be an integer');
    let state = (seed >>> 0) || 0x9e3779b9;
    return function seededRandom() {
        state = (state + 0x6d2b79f5) >>> 0;
        let value = Math.imul(state ^ (state >>> 15), 1 | state);
        value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

// --- checksum --------------------------------------------------------------

function trueFactIds(facts = {}) {
    return Object.entries(facts).filter(([, value]) => value === true).map(([factId]) => factId).sort();
}

function inventorySummary(inventory = {}) {
    return Object.entries(inventory)
        .sort(([left], [right]) => Number(left.slice(4)) - Number(right.slice(4)))
        .map(([, item]) => `${item.object}x${item.quantity ?? 1}`);
}

/**
 * The canonical, viewport-independent part of a game state. Player pixel
 * coordinates are deliberately excluded because they are derived from the
 * measured canvas size, which would make the checksum viewport-dependent.
 */
export function canonicalStateDigest(state, { scenarioId = null, seed = null, spawn = null } = {}) {
    return {
        schemaVersion: state?.schemaVersion ?? null,
        scenarioId,
        seed,
        spawn: spawn ? { x: spawn.x, y: spawn.y } : null,
        roomId: state?.location?.currentRoomId ?? null,
        facts: trueFactIds(state?.quests?.facts),
        bridgeState: state?.quests?.bridgeState ?? 0,
        inventory: inventorySummary(state?.inventory),
        removedDialogueOptions: [...(state?.dialogue?.removedOptions ?? [])].sort(),
        language: state?.settings?.language ?? null,
        presentationMode: state?.presentation?.mode ?? null,
    };
}

export function stateChecksum(state, context = {}) {
    return checksumString(stableStringify(canonicalStateDigest(state, context)));
}

// --- schema ----------------------------------------------------------------

export function createScenario(partial = {}) {
    return Object.freeze({
        schemaVersion: SCENARIO_SCHEMA_VERSION,
        id: partial.id,
        description: partial.description ?? '',
        seed: partial.seed ?? 1,
        roomId: partial.roomId ?? 'libraryFoyer',
        spawn: partial.spawn ? Object.freeze({ ...partial.spawn }) : null,
        locale: partial.locale ?? 'en',
        facts: Object.freeze({ ...(partial.facts ?? {}) }),
        inventory: Object.freeze([...(partial.inventory ?? [])].map((entry) =>
            Object.freeze(typeof entry === 'string' ? { objectId: entry, quantity: 1 } : { quantity: 1, ...entry }))),
        presentation: Object.freeze({
            mode: 'gameVisibleActive',
            movementSpeed: 'fast',
            textSpeed: 'instant',
            ...(partial.presentation ?? {}),
        }),
        simulate: Object.freeze({ ...(partial.simulate ?? {}) }),
    });
}

/**
 * Validate a scenario against the schema and, when supplied, the shipped
 * content. `context` keeps this function browser- and file-system-free.
 */
export function validateScenario(scenario, context = {}) {
    const errors = [];
    const { roomIds, factIds, objectIds, localeIds, movementSpeedIds = MOVEMENT_SPEED_IDS, textSpeedIds = TEXT_SPEED_IDS } = context;

    if (!isObject(scenario)) return ['scenario must be an object'];
    if (scenario.schemaVersion !== SCENARIO_SCHEMA_VERSION) errors.push(`scenario.schemaVersion must be ${SCENARIO_SCHEMA_VERSION}`);
    if (!isId(scenario.id)) errors.push('scenario.id must be a stable ID');
    if (!Number.isInteger(scenario.seed)) errors.push('scenario.seed must be an integer');
    if (typeof scenario.roomId !== 'string' || scenario.roomId.length === 0) errors.push('scenario.roomId must be a non-empty string');
    else if (roomIds && !roomIds.includes(scenario.roomId)) errors.push(`scenario.roomId '${scenario.roomId}' is not a contract room`);

    if (scenario.spawn !== null && scenario.spawn !== undefined) {
        if (!Number.isInteger(scenario.spawn.x) || !Number.isInteger(scenario.spawn.y)) errors.push('scenario.spawn must use integer grid coordinates');
        else if (scenario.spawn.x < 0 || scenario.spawn.x >= 80 || scenario.spawn.y < 0 || scenario.spawn.y >= 60) {
            errors.push(`scenario.spawn (${scenario.spawn.x},${scenario.spawn.y}) is outside the 80 x 60 grid`);
        }
    }

    if (!isObject(scenario.facts)) errors.push('scenario.facts must be an object');
    else {
        for (const [factId, value] of Object.entries(scenario.facts)) {
            if (value !== true) errors.push(`scenario.facts.${factId} must be true; scenarios only assert satisfied facts`);
            if (factIds && !factIds.includes(factId)) errors.push(`scenario.facts.${factId} is not a declared contract fact`);
        }
    }

    if (!Array.isArray(scenario.inventory)) errors.push('scenario.inventory must be an array');
    else {
        for (const entry of scenario.inventory) {
            if (!isObject(entry) || typeof entry.objectId !== 'string') errors.push('scenario.inventory entries need an objectId');
            else if (objectIds && !objectIds.includes(entry.objectId)) errors.push(`scenario.inventory references unknown object '${entry.objectId}'`);
            if (isObject(entry) && entry.quantity !== undefined && (!Number.isInteger(entry.quantity) || entry.quantity < 1)) {
                errors.push(`scenario.inventory.${entry.objectId} quantity must be a positive integer`);
            }
        }
    }

    if (localeIds && !localeIds.includes(scenario.locale)) errors.push(`scenario.locale '${scenario.locale}' is not a supported locale`);
    if (!movementSpeedIds.includes(scenario.presentation?.movementSpeed)) errors.push('scenario.presentation.movementSpeed is invalid');
    if (!textSpeedIds.includes(scenario.presentation?.textSpeed)) errors.push('scenario.presentation.textSpeed is invalid');

    return errors;
}

/**
 * Report facts that cannot be true together: a fact is inconsistent when the
 * action that produces it is unreachable from the other asserted facts.
 */
export function validateFactConsistency(facts = {}, actions = []) {
    const asserted = new Set(trueFactIds(facts));
    const producers = new Map();
    for (const action of actions) for (const effect of action.effects ?? []) producers.set(effect, action);

    const conflicts = [];
    for (const factId of asserted) {
        const action = producers.get(factId);
        if (!action) continue;
        const missing = (action.requires ?? []).filter((required) => !asserted.has(required));
        if (missing.length) conflicts.push({ factId, actionId: action.id, missingFactIds: missing });
    }
    return Object.freeze({ valid: conflicts.length === 0, conflicts });
}

/**
 * Facts a scenario must also assert so that its explicit facts are reachable.
 */
export function closeFactsOverPrerequisites(facts = {}, actions = []) {
    const closed = { ...facts };
    const producers = new Map();
    for (const action of actions) for (const effect of action.effects ?? []) producers.set(effect, action);

    let changed = true;
    while (changed) {
        changed = false;
        for (const factId of trueFactIds(closed)) {
            for (const required of producers.get(factId)?.requires ?? []) {
                if (closed[required] !== true) {
                    closed[required] = true;
                    changed = true;
                }
            }
        }
    }
    return closed;
}

// --- derivation ------------------------------------------------------------

function pushMutation(list, mutation) {
    const index = list.findIndex((entry) => entry.id === mutation.id && entry.path === mutation.path);
    if (index === -1) list.push(mutation);
    else list[index] = mutation;
}

/**
 * Turn a scenario's facts into the concrete world mutations the running game
 * needs. Exit statuses come from the content contract's gate facts, so a new
 * gate never needs a new scenario blob.
 */
export function deriveScenarioMutations(scenario, { connections = [], factEffects = {} } = {}) {
    const facts = scenario.facts ?? {};
    const exits = [];
    const objects = [];
    const npcs = [];
    const grids = [];
    const inventory = [];

    for (const connection of connections) {
        const open = !connection.gateFact || facts[connection.gateFact] === true;
        exits.push({ roomId: connection.from, exitId: connection.exit, status: open ? 'open' : 'locked' });
        exits.push({ roomId: connection.to, exitId: connection.returnExit, status: 'open' });
    }

    for (const factId of trueFactIds(facts)) {
        const effect = factEffects[factId];
        if (!effect) continue;
        for (const mutation of effect.objects ?? []) pushMutation(objects, { id: mutation.objectId, path: mutation.path, value: mutation.value, factId });
        for (const mutation of effect.npcs ?? []) pushMutation(npcs, { id: mutation.npcId, path: mutation.path, value: mutation.value, factId });
        for (const mutation of effect.grids ?? []) pushMutation(grids, { id: mutation.roomId, path: 'variant', value: mutation.variantId, factId });
        for (const entry of effect.inventory ?? []) inventory.push({ objectId: entry.objectId, quantity: entry.quantity ?? 1, stackable: entry.stackable === true, factId });
    }

    for (const entry of scenario.inventory ?? []) {
        inventory.push({ objectId: entry.objectId, quantity: entry.quantity ?? 1, stackable: entry.stackable === true, factId: null });
    }

    const seen = new Set();
    const uniqueInventory = inventory.filter((entry) => {
        if (seen.has(entry.objectId)) return false;
        seen.add(entry.objectId);
        return true;
    });

    return Object.freeze({
        exits: Object.freeze(exits),
        objects: Object.freeze(objects),
        npcs: Object.freeze(npcs),
        grids: Object.freeze(grids),
        inventory: Object.freeze(uniqueInventory),
    });
}

/**
 * Actions that are available right now but whose effects are not yet recorded.
 * This is the debug-only critical-path frontier; player mode never shows it.
 */
export function criticalPathFrontier(actions = [], facts = {}) {
    return actions
        .filter((action) => (action.requires ?? []).every((factId) => facts[factId] === true))
        .filter((action) => (action.effects ?? []).some((factId) => facts[factId] !== true))
        .map((action) => Object.freeze({ actionId: action.id, effects: [...(action.effects ?? [])] }));
}
