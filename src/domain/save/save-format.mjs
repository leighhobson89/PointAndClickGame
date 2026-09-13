// Versioned save format for player progress.
//
// A save records authored progress only. Anything a renderer, a grid placement
// pass, or a viewport can recompute is deliberately absent, so a save stays
// small, stays viewport-independent, and cannot pin derived state to whatever
// the machine that wrote it happened to be doing.
//
// Three rules hold this file together:
//  - stable canonical facts and IDs only, never translated display text;
//  - world changes are stored as a patch against the shipped content, never as
//    a copy of the content bundle;
//  - nothing here touches the DOM, storage, or the clock. Building and applying
//    a save are pure functions, so a caller can validate a candidate state
//    completely before committing anything to the running session.

export const SAVE_FORMAT_ID = 'pointAndClick.save';
export const SAVE_SCHEMA_VERSION = 2;

/**
 * Content kinds that the running game mutates and that a save therefore has to
 * patch. `grids` is handled separately because its placement markers are
 * derived; `foregrounds`, `contract`, and `mapRoom` are never mutated at
 * runtime and are always re-read from the shipped bundle.
 */
export const PATCHED_WORLD_KINDS = Object.freeze(['navigation', 'objects', 'npcs', 'dialogue']);

export const SAVE_ERROR_CODES = Object.freeze({
    unreadable: 'save.unreadable',
    unsupportedVersion: 'save.unsupportedVersion',
    invalidPayload: 'save.invalidPayload',
    incompatibleContent: 'save.incompatibleContent',
});

export class SaveError extends Error {
    constructor(code, message, detail = {}) {
        super(message);
        this.name = 'SaveError';
        this.code = code;
        this.detail = detail;
    }
}

function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
        return a.every((value, index) => deepEqual(value, b[index]));
    }
    if (isPlainObject(a) && isPlainObject(b)) {
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        for (const key of keys) if (!deepEqual(a[key], b[key])) return false;
        return true;
    }
    return false;
}

/**
 * `o<objectId>` and `c<npcId>` cells are stamped into the walk grid by the
 * entity placement pass, so they are derived, not authored. A save never
 * records them and a restore rebuilds them.
 */
export function isEntityPlacementCell(value) {
    return typeof value === 'string' && /^[oc][A-Za-z]/.test(value);
}

/**
 * Object and NPC records carry pixel geometry recomputed from the canvas cell
 * size every time entities are placed. Persisting it would restore one
 * machine's viewport onto another's. Paths are rooted at the file's own
 * container property, so they read `objects.<objectId>.visualPosition` and
 * `npcs.<npcId>.dimensions.width`.
 */
export function isDerivedEntityPath(path) {
    if (path[0] !== 'objects' && path[0] !== 'npcs') return false;
    if (path.length < 3) return false;
    if (path[2] === 'visualPosition') return true;
    return path[2] === 'dimensions' && (path[3] === 'width' || path[3] === 'height');
}

/**
 * Flat, order-independent patch operations against a JSON tree. Arrays are
 * replaced whole; only plain objects are walked, which keeps a patch readable
 * and keeps application trivially reversible against a pristine base.
 */
export function diffJson(base, next, isDerived = () => false, path = [], operations = []) {
    if (isDerived(path)) return operations;

    if (isPlainObject(base) && isPlainObject(next)) {
        for (const key of Object.keys(base)) {
            if (!(key in next)) {
                if (!isDerived([...path, key])) operations.push({ op: 'remove', path: [...path, key] });
            }
        }
        for (const key of Object.keys(next)) {
            diffJson(base[key], next[key], isDerived, [...path, key], operations);
        }
        return operations;
    }

    if (!deepEqual(base, next)) operations.push({ op: 'set', path, value: clone(next) });
    return operations;
}

export function applyJsonOperations(target, operations) {
    for (const operation of operations ?? []) {
        const path = operation.path ?? [];
        if (path.length === 0) continue;
        let parent = target;
        for (const key of path.slice(0, -1)) {
            if (!isPlainObject(parent[key]) && !Array.isArray(parent[key])) parent[key] = {};
            parent = parent[key];
        }
        const last = path[path.length - 1];
        if (operation.op === 'remove') delete parent[last];
        else parent[last] = clone(operation.value);
    }
    return target;
}

/**
 * Authored walk-grid changes only: cells a puzzle genuinely rewrote, never the
 * entity placement stamps. When a cell is currently hidden under an entity the
 * caller can supply the value recorded beneath it, so an authored change under
 * an object is still preserved.
 */
export function diffGrids(pristineGrids, currentGrids, { underlyingCellValue = () => undefined } = {}) {
    const cells = [];
    const removedRooms = [];
    const addedRooms = {};

    for (const roomId of Object.keys(pristineGrids ?? {})) {
        if (!currentGrids?.[roomId]) removedRooms.push(roomId);
    }

    for (const [roomId, grid] of Object.entries(currentGrids ?? {})) {
        const pristine = pristineGrids?.[roomId];
        if (!pristine) {
            addedRooms[roomId] = grid.map((row, y) => row.map((value, x) => (isEntityPlacementCell(value)
                ? underlyingCellValue(roomId, x, y) ?? value
                : value)));
            continue;
        }
        for (let y = 0; y < grid.length; y += 1) {
            for (let x = 0; x < grid[y].length; x += 1) {
                const current = isEntityPlacementCell(grid[y][x])
                    ? underlyingCellValue(roomId, x, y)
                    : grid[y][x];
                if (current === undefined) continue;
                if (current !== pristine[y]?.[x]) cells.push([roomId, x, y, current]);
            }
        }
    }

    return { cells, removedRooms, addedRooms };
}

export function applyGridDelta(grids, delta) {
    for (const roomId of delta?.removedRooms ?? []) delete grids[roomId];
    for (const [roomId, grid] of Object.entries(delta?.addedRooms ?? {})) grids[roomId] = clone(grid);
    for (const [roomId, x, y, value] of delta?.cells ?? []) {
        if (!grids[roomId]?.[y]) continue;
        grids[roomId][y][x] = value;
    }
    return grids;
}

/**
 * The canonical fields a save owns. Everything outside this list is either
 * shipped content or derived at restore time.
 */
export function capturePersistedState(state, { playerCell = null } = {}) {
    return {
        gameStateSchemaVersion: state.schemaVersion,
        location: {
            initialRoomId: state.location.initialRoomId,
            currentRoomId: state.location.currentRoomId,
            previousRoomId: state.location.previousRoomId,
            nextRoomId: state.location.nextRoomId,
        },
        player: {
            // Grid cells, not pixels. Pixel positions are a product of the
            // canvas size at the moment of the save, so restoring them would
            // displace the player whenever the viewport differs from the one
            // that wrote the save.
            cell: playerCell ?? { x: 0, y: 0 },
            activeSprite: state.player.activeSprite,
        },
        inventory: clone(state.inventory) ?? {},
        quests: {
            facts: clone(state.quests.facts) ?? {},
            bridgeState: state.quests.bridgeState ?? 0,
        },
        dialogue: {
            // Removed options are a durable consequence and are kept. The node
            // a conversation was sitting on is not: the legacy conversations
            // still hold their progress outside canonical state (BUG-011,
            // BUG-031), so a restore lands in the room rather than part-way
            // through a line nobody can rewind to.
            activeNodeId: null,
            removedOptions: clone(state.dialogue?.removedOptions) ?? [],
        },
        settings: clone(state.settings) ?? {},
    };
}

export function createSaveEnvelope({
    state,
    pristineContent = null,
    currentContent = null,
    gridUnderlyingValue,
    playerCell = null,
    savedAt = null,
    playTimeMs = 0,
    label = null,
    slot = null,
} = {}) {
    if (!state) throw new SaveError(SAVE_ERROR_CODES.invalidPayload, 'A canonical game state is required to build a save');

    const world = { patches: {}, grids: { cells: [], removedRooms: [], addedRooms: {} } };
    const current = currentContent ?? state.content ?? {};

    if (pristineContent) {
        for (const kind of PATCHED_WORLD_KINDS) {
            const operations = diffJson(pristineContent[kind] ?? null, current[kind] ?? null, isDerivedEntityPath);
            if (operations.length > 0) world.patches[kind] = operations;
        }
        world.grids = diffGrids(pristineContent.grids ?? {}, current.grids ?? {}, { underlyingCellValue: gridUnderlyingValue });
    }

    return {
        format: SAVE_FORMAT_ID,
        schemaVersion: SAVE_SCHEMA_VERSION,
        savedAt,
        slot,
        label,
        playTimeMs,
        payload: { ...capturePersistedState(state, { playerCell }), world },
    };
}

export function validateSaveEnvelope(envelope) {
    const errors = [];
    if (!isPlainObject(envelope)) return { valid: false, errors: ['save must be an object'] };
    if (envelope.format !== SAVE_FORMAT_ID) errors.push(`save.format must be '${SAVE_FORMAT_ID}'`);
    if (envelope.schemaVersion !== SAVE_SCHEMA_VERSION) errors.push(`save.schemaVersion must be ${SAVE_SCHEMA_VERSION}`);

    const payload = envelope.payload;
    if (!isPlainObject(payload)) {
        errors.push('save.payload must be an object');
        return { valid: false, errors };
    }
    if (typeof payload.location?.currentRoomId !== 'string' || payload.location.currentRoomId.length === 0) {
        errors.push('save.payload.location.currentRoomId must be a non-empty room ID');
    }
    if (!Number.isFinite(payload.player?.cell?.x) || !Number.isFinite(payload.player?.cell?.y)) {
        errors.push('save.payload.player.cell must contain finite x and y grid coordinates');
    }
    if (!isPlainObject(payload.inventory)) errors.push('save.payload.inventory must be an object');
    if (!isPlainObject(payload.quests?.facts)) errors.push('save.payload.quests.facts must be an object');
    if (!Array.isArray(payload.dialogue?.removedOptions)) errors.push('save.payload.dialogue.removedOptions must be an array');
    if (typeof payload.settings?.language !== 'string') errors.push('save.payload.settings.language must be a string');
    if (!isPlainObject(payload.world)) errors.push('save.payload.world must be an object');

    return { valid: errors.length === 0, errors };
}

export function assertValidSaveEnvelope(envelope) {
    const result = validateSaveEnvelope(envelope);
    if (!result.valid) {
        throw new SaveError(SAVE_ERROR_CODES.invalidPayload, `Invalid save: ${result.errors.join('; ')}`, { errors: result.errors });
    }
    return envelope;
}

/**
 * Build the state a restore would commit, without committing anything. The
 * caller validates the result and only then replaces the running session, so a
 * rejected save leaves the current game untouched.
 */
export function applySaveEnvelope({ envelope, baseState, pristineContent }) {
    assertValidSaveEnvelope(envelope);
    if (!baseState) throw new SaveError(SAVE_ERROR_CODES.invalidPayload, 'A base state is required to apply a save');
    if (!pristineContent) throw new SaveError(SAVE_ERROR_CODES.incompatibleContent, 'Shipped content must be loaded before a save can be applied');

    const payload = envelope.payload;
    const content = {
        ...clone(baseState.content),
        grids: clone(pristineContent.grids ?? baseState.content?.grids ?? null),
    };

    for (const kind of PATCHED_WORLD_KINDS) {
        const pristine = clone(pristineContent[kind] ?? null);
        content[kind] = pristine === null ? clone(baseState.content?.[kind] ?? null) : applyJsonOperations(pristine, payload.world?.patches?.[kind]);
    }
    if (content.grids) applyGridDelta(content.grids, payload.world?.grids);

    const state = {
        ...clone(baseState),
        location: { ...clone(baseState.location), ...clone(payload.location) },
        // The player's pixel geometry is rebuilt by the caller from the saved
        // grid cell and the live canvas metrics, so only the sprite carries over.
        player: { ...clone(baseState.player), activeSprite: payload.player.activeSprite ?? baseState.player.activeSprite },
        inventory: clone(payload.inventory),
        quests: clone(payload.quests),
        dialogue: clone(payload.dialogue),
        settings: { ...clone(baseState.settings), ...clone(payload.settings) },
        content,
    };

    return { state, playerCell: clone(payload.player.cell), playTimeMs: envelope.playTimeMs ?? 0 };
}

export function describeSave(envelope) {
    if (!isPlainObject(envelope) || !isPlainObject(envelope.payload)) return null;
    return Object.freeze({
        schemaVersion: envelope.schemaVersion,
        savedAt: envelope.savedAt ?? null,
        slot: envelope.slot ?? null,
        label: envelope.label ?? null,
        playTimeMs: envelope.playTimeMs ?? 0,
        roomId: envelope.payload.location?.currentRoomId ?? null,
        language: envelope.payload.settings?.language ?? null,
        factIds: Object.entries(envelope.payload.quests?.facts ?? {})
            .filter(([, value]) => value === true)
            .map(([factId]) => factId)
            .sort(),
    });
}
