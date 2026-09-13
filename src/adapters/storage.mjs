// Browser-storage adapters for saves.
//
// `createSaveRepository` is the one place that knows how a save envelope is
// keyed and serialised. `createStorageRepository` keeps the older
// state-in/state-out shape that the debug scenario tools and the integration
// tests use, but it is now a thin wrapper over the same envelope path so the
// two cannot drift into separate save formats.

import { finaliseLegacyWorld, migrateSave } from '../domain/save/migrations.mjs';
import {
    SAVE_ERROR_CODES,
    SaveError,
    applySaveEnvelope,
    assertValidSaveEnvelope,
    createSaveEnvelope,
} from '../domain/save/save-format.mjs';

export const SAVE_KEY_PREFIX = 'pointAndClick.save.';

function requireStorage(storage) {
    if (!storage?.getItem || !storage?.setItem) throw new TypeError('A Storage-compatible object is required');
    return storage;
}

export function createSaveRepository(storage, { prefix = SAVE_KEY_PREFIX } = {}) {
    const backing = requireStorage(storage);
    const keyFor = (slot) => `${prefix}${slot}`;

    return Object.freeze({
        keyFor,
        write(slot, envelope) {
            backing.setItem(keyFor(slot), JSON.stringify(envelope));
            return envelope;
        },
        read(slot) {
            const serialized = backing.getItem(keyFor(slot));
            if (serialized === null || serialized === undefined) return null;
            try {
                return JSON.parse(serialized);
            } catch (error) {
                throw new SaveError(SAVE_ERROR_CODES.unreadable, `Save in slot '${slot}' is not readable JSON`, { slot, cause: error.message });
            }
        },
        remove(slot) {
            backing.removeItem?.(keyFor(slot));
        },
    });
}

/**
 * State-level convenience repository. `save(key, state)` and `load(key)` keep
 * their original signatures; supplying `getPristineContent` makes the stored
 * envelope a content patch rather than a copy, and `getBaseState` gives a load
 * the shipped content to rebuild against.
 */
export function createStorageRepository(storage, { getPristineContent = () => null, getBaseState = null } = {}) {
    const repository = createSaveRepository(storage);

    return Object.freeze({
        async save(key, state) {
            const pristineContent = getPristineContent();
            repository.write(key, createSaveEnvelope({
                state,
                pristineContent,
                currentContent: state.content,
                savedAt: new Date().toISOString(),
                slot: key,
            }));
        },
        /**
         * `baseStateOverride` lets a caller that already holds the live state
         * hand it in directly; without either that or `getBaseState` there is
         * nothing to rebuild the shipped half of the state from.
         */
        async load(key, baseStateOverride = null) {
            const stored = repository.read(key);
            if (stored === null) return null;
            const pristineContent = getPristineContent();
            const envelope = assertValidSaveEnvelope(finaliseLegacyWorld(migrateSave(stored), pristineContent));
            const baseState = baseStateOverride ?? getBaseState?.() ?? null;
            if (!baseState) return envelope.payload;
            return applySaveEnvelope({ envelope, baseState, pristineContent: pristineContent ?? baseState.content }).state;
        },
        remove(key) {
            repository.remove(key);
        },
    });
}
