export const CURRENT_SAVE_VERSION = 1;

export function migrateSave(save) {
    if (!save || typeof save !== 'object') throw new TypeError('Save must be an object');
    if (save.schemaVersion === CURRENT_SAVE_VERSION) return structuredClone(save);
    if (save.schemaVersion === 0 && save.state) {
        return {
            schemaVersion: CURRENT_SAVE_VERSION,
            state: {
                ...save.state,
                quests: save.state.quests ?? { facts: {}, bridgeState: 0 },
                dialogue: save.state.dialogue ?? { activeNodeId: null, removedOptions: [] },
            },
        };
    }
    throw new RangeError(`Unsupported save schemaVersion '${save.schemaVersion}'`);
}

