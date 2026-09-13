// The migration boundary for saves.
//
// Every save that enters the game passes through `migrateSave` first, so the
// rest of the code only ever sees the current envelope. A version this build
// does not know is refused loudly rather than half-applied.
//
// Declared history:
//   0  pre-release snapshot without quest or dialogue slices.
//   1  `{ schemaVersion, state }` with the whole canonical state, content
//      bundle included, written by the first storage repository.
//   2  the current `{ format, schemaVersion, savedAt, payload }` envelope,
//      which stores authored progress and patches the shipped content instead
//      of copying it.

import {
    PATCHED_WORLD_KINDS,
    SAVE_ERROR_CODES,
    SAVE_FORMAT_ID,
    SAVE_SCHEMA_VERSION,
    SaveError,
    capturePersistedState,
    diffGrids,
    diffJson,
    isDerivedEntityPath,
} from './save-format.mjs';

export const CURRENT_SAVE_VERSION = SAVE_SCHEMA_VERSION;
export const SUPPORTED_SAVE_VERSIONS = Object.freeze([0, 1, 2]);

function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function migrateZeroToOne(save) {
    return {
        schemaVersion: 1,
        state: {
            ...save.state,
            quests: save.state.quests ?? { facts: {}, bridgeState: 0 },
            dialogue: save.state.dialogue ?? { activeNodeId: null, removedOptions: [] },
        },
    };
}

/**
 * A version 1 save embedded the whole content bundle. There is no pristine
 * bundle available inside a pure migration, so the embedded content travels as
 * `payload.legacyContent` and is turned into a patch by
 * `finaliseLegacyWorld()` once the caller has the shipped content in hand.
 */
function migrateOneToTwo(save) {
    const state = save.state ?? {};
    const persisted = capturePersistedState({
        schemaVersion: state.schemaVersion ?? 1,
        location: state.location ?? { initialRoomId: 'libraryFoyer', currentRoomId: 'libraryFoyer', previousRoomId: 'libraryFoyer', nextRoomId: 'libraryFoyer' },
        player: state.player ?? { xPos: 0, yPos: 0, activeSprite: 'still_right' },
        inventory: state.inventory ?? {},
        quests: state.quests ?? { facts: {}, bridgeState: 0 },
        dialogue: state.dialogue ?? { activeNodeId: null, removedOptions: [] },
        settings: state.settings ?? { language: 'en' },
    });

    return {
        format: SAVE_FORMAT_ID,
        schemaVersion: 2,
        savedAt: save.savedAt ?? null,
        slot: save.slot ?? null,
        label: save.label ?? null,
        playTimeMs: save.playTimeMs ?? 0,
        migratedFrom: 1,
        payload: {
            ...persisted,
            world: { patches: {}, grids: { cells: [], removedRooms: [], addedRooms: {} } },
            legacyContent: clone(state.content) ?? null,
        },
    };
}

export function migrateSave(save) {
    if (!save || typeof save !== 'object') {
        throw new SaveError(SAVE_ERROR_CODES.unreadable, 'Save must be an object');
    }
    if (save.schemaVersion === 2) return clone(save);
    if (save.schemaVersion === 1 && save.state) return migrateOneToTwo(save);
    if (save.schemaVersion === 0 && save.state) return migrateOneToTwo(migrateZeroToOne(save));
    throw new SaveError(
        SAVE_ERROR_CODES.unsupportedVersion,
        `Unsupported save schemaVersion '${save.schemaVersion}'`,
        { schemaVersion: save.schemaVersion, supported: SUPPORTED_SAVE_VERSIONS },
    );
}

/**
 * Turn a migrated legacy save's embedded content bundle into the patch a
 * version 2 save would have stored, now that the shipped content is known.
 * Saves that never carried a bundle pass through untouched.
 */
export function finaliseLegacyWorld(envelope, pristineContent) {
    const legacy = envelope?.payload?.legacyContent;
    if (!legacy || !pristineContent) return envelope;

    const patches = {};
    for (const kind of PATCHED_WORLD_KINDS) {
        if (!legacy[kind]) continue;
        const operations = diffJson(pristineContent[kind] ?? null, legacy[kind], isDerivedEntityPath);
        if (operations.length > 0) patches[kind] = operations;
    }

    const { legacyContent, ...payload } = envelope.payload;
    return {
        ...envelope,
        payload: {
            ...payload,
            world: {
                patches,
                grids: legacy.grids ? diffGrids(pristineContent.grids ?? {}, legacy.grids) : envelope.payload.world.grids,
            },
        },
    };
}
