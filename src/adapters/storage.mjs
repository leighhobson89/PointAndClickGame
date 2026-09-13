import { migrateSave } from '../domain/save/migrations.mjs';

export function createStorageRepository(storage) {
    if (!storage?.getItem || !storage?.setItem) throw new TypeError('A Storage-compatible object is required');
    return Object.freeze({
        async save(key, state) {
            storage.setItem(key, JSON.stringify({ schemaVersion: 1, state }));
        },
        async load(key) {
            const serialized = storage.getItem(key);
            if (serialized === null) return null;
            return migrateSave(JSON.parse(serialized)).state;
        },
    });
}

