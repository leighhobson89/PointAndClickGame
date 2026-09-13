import { assertValidGameState, cloneGameState, createInitialGameState } from './game-state.mjs';

export const gameActions = Object.freeze({
    replace: (state) => ({ type: 'state/replace', payload: state }),
    startSession: () => ({ type: 'session/start' }),
    disposeSession: () => ({ type: 'session/dispose' }),
    setLocation: (field, value) => ({ type: 'location/set', payload: { field, value } }),
    setPlayer: (property, value) => ({ type: 'player/set', payload: { property, value } }),
    setInventory: (inventory) => ({ type: 'inventory/set', payload: inventory }),
    setContent: (kind, value) => ({ type: 'content/set', payload: { kind, value } }),
    setSetting: (setting, value) => ({ type: 'settings/set', payload: { setting, value } }),
    setPresentationMode: (mode) => ({ type: 'presentation/set-mode', payload: mode }),
    setBridgeState: (value) => ({ type: 'quests/set-bridge', payload: value }),
    addRemovedDialogueOption: (value) => ({ type: 'dialogue/remove-option', payload: value }),
});

export function gameReducer(state, action) {
    switch (action.type) {
        case 'state/replace':
            return assertValidGameState(action.payload);
        case 'session/start':
            return { ...state, session: { generation: state.session.generation + 1, status: 'running' } };
        case 'session/dispose':
            return { ...state, session: { ...state.session, status: 'disposed' } };
        case 'location/set':
            return { ...state, location: { ...state.location, [action.payload.field]: action.payload.value } };
        case 'player/set':
            // The renderer and movement code hold a player reference for the
            // duration of a frame. Preserve that identity during the legacy
            // adapter phase while still publishing a new store root.
            state.player[action.payload.property] = action.payload.value;
            return { ...state, player: state.player };
        case 'inventory/set':
            return { ...state, inventory: action.payload };
        case 'content/set':
            return { ...state, content: { ...state.content, [action.payload.kind]: action.payload.value } };
        case 'settings/set':
            return { ...state, settings: { ...state.settings, [action.payload.setting]: action.payload.value } };
        case 'presentation/set-mode':
            return { ...state, presentation: { ...state.presentation, mode: action.payload } };
        case 'quests/set-bridge':
            return { ...state, quests: { ...state.quests, bridgeState: action.payload } };
        case 'dialogue/remove-option':
            return {
                ...state,
                dialogue: { ...state.dialogue, removedOptions: [...state.dialogue.removedOptions, action.payload] },
            };
        default:
            return state;
    }
}

export function createGameStore(initialState = createInitialGameState()) {
    let state = assertValidGameState(initialState);
    const subscribers = new Set();

    return Object.freeze({
        getState: () => state,
        getSnapshot: () => cloneGameState(state),
        dispatch(action) {
            const nextState = gameReducer(state, action);
            if (nextState !== state) {
                state = nextState;
                subscribers.forEach((subscriber) => subscriber(state, action));
            }
            return action;
        },
        subscribe(subscriber) {
            if (typeof subscriber !== 'function') throw new TypeError('subscriber must be a function');
            subscribers.add(subscriber);
            return () => subscribers.delete(subscriber);
        },
        getSubscriberCount: () => subscribers.size,
    });
}

export const gameSelectors = Object.freeze({
    sessionGeneration: (state) => state.session.generation,
    sessionStatus: (state) => state.session.status,
    currentRoomId: (state) => state.location.currentRoomId,
    language: (state) => state.settings.language,
    isRunning: (state) => state.session.status === 'running',
});
