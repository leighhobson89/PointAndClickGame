// Player-facing save adapter.
//
// The format lives in src/domain/save, the policy in src/application, and this
// file owns only the browser side: storage, the export string, the popup, the
// status line, and the derived-state rebuild that makes a restored save look
// like a game that was never interrupted.
//
// Restoring is deliberately two-phase. Everything that can fail — reading,
// migrating, validating, and building the candidate state — happens before a
// single byte of the running session is touched, so a corrupt or unsupported
// save leaves the player exactly where they were.

import {
    captureGameStatusForSaving,
    getCanvasCellHeight,
    getCanvasCellWidth,
    getContentContract,
    getCurrentStartIndexInventory,
    getElements,
    getGameInProgress,
    getGameStateVariable,
    getGameVisibleActive,
    getInteractiveDialogueState,
    getIsDisplayingText,
    getLanguage,
    getLanguageChangedFlag,
    getNavigationData,
    getPlayerObject,
    getPristineContent,
    getTransitioningNow,
    getTransitioningToAnotherScreen,
    getUnderlyingCellValue,
    resetAllVariables,
    restoreGameStatus,
    setBeginGameStatus,
    setLanguageChangedFlag,
    subscribeToGameState,
} from './constantsAndGlobalVars.js';
import { localize } from './localization.js';
import { changeCanvasBg, drawInventory, handleLanguageChange, updateInteractionInfo } from './ui.js';
import { initializeEntityPathsObject, setGameState, startGame } from './game.js';
import { createSaveRepository } from './src/adapters/storage.mjs';
import { createSaveService, SAVE_EVENTS, SAVE_SLOTS } from './src/application/save-service.mjs';
import { SAVE_ERROR_CODES, SaveError, describeSave } from './src/domain/save/save-format.mjs';
import { finaliseLegacyWorld, migrateSave } from './src/domain/save/migrations.mjs';

export { SAVE_SLOTS };

const STATUS_VISIBLE_MS = 3200;

let saveService = null;
let statusTimer = null;

/**
 * Localisation keys for the feedback line. Events carry stable IDs; only this
 * table turns one into displayed copy.
 */
const FEEDBACK_KEYS = Object.freeze({
    [SAVE_EVENTS.saved]: 'saveFeedbackSaved',
    [SAVE_EVENTS.blocked]: 'saveFeedbackBlocked',
    [SAVE_EVENTS.failed]: 'saveFeedbackFailed',
    [SAVE_EVENTS.restored]: 'saveFeedbackRestored',
    [SAVE_EVENTS.restoreFailed]: 'saveFeedbackRestoreFailed',
});

export function getSaveService() {
    return saveService;
}

/**
 * Build the service once per application boot and wire it to the running game.
 * Storage is read lazily so a browser with storage disabled fails at the point
 * of use, with feedback, rather than preventing the game from starting.
 */
export function initialiseSaveSystem({ storage = window.localStorage } = {}) {
    if (saveService) return saveService;

    saveService = createSaveService({ repository: createSaveRepository(storage) });
    saveService.configure({
        getState: () => captureGameStatusForSaving(),
        getPristineContent: () => getPristineContent(),
        getCurrentContent: () => captureGameStatusForSaving().content,
        getUnderlyingCellValue,
        getPlayerCell: currentPlayerCell,
        getMilestoneFacts: () => getContentContract()?.puzzle?.mandatoryFacts ?? [],
        isInGame: () => getGameInProgress(),
        isBusy: () => getGameStateVariable() === getInteractiveDialogueState()
            || getIsDisplayingText()
            || getTransitioningNow()
            || getTransitioningToAnotherScreen(),
    });
    saveService.subscribe(showSaveFeedback);

    // Checkpointing listens to the canonical store rather than being called
    // from each puzzle, so a milestone cannot be committed without being
    // checkpointed and no puzzle has to remember to ask.
    subscribeToGameState((_state, action) => {
        if (action?.type === 'quests/set-fact' && action.payload?.value === true) {
            saveService.noteFact(action.payload.factId);
        }
    });

    return saveService;
}

/**
 * The player's position as a walk-grid cell. `initializePlayerPosition()` is
 * the inverse, so a save round-trips through the grid and never through the
 * pixel geometry of one particular window size.
 */
function currentPlayerCell() {
    const player = getPlayerObject();
    const cellWidth = getCanvasCellWidth();
    const cellHeight = getCanvasCellHeight();
    if (!cellWidth || !cellHeight) return { x: 0, y: 0 };
    return {
        x: Math.round(player.xPos / cellWidth),
        y: Math.round((player.yPos + player.height) / cellHeight),
    };
}

export function hasResumableSave() {
    return Boolean(saveService?.hasSave(SAVE_SLOTS.resume));
}

export function describeResumableSave() {
    return saveService?.describe(SAVE_SLOTS.resume) ?? null;
}

export function noteRoomChangeForAutosave() {
    return saveService?.noteRoomChange() ?? null;
}

/**
 * A fresh game takes ownership of the resume slot immediately, so Continue can
 * never send a player back into a chapter they have just restarted.
 */
export function noteNewGameStarted() {
    if (!saveService) return null;
    saveService.beginSession(0);
    return saveService.write(SAVE_SLOTS.resume, { label: 'newGame', force: true });
}

export function noteMilestoneFact(factId) {
    return saveService?.noteFact(factId) ?? null;
}

/**
 * Continue the stored local game. Returns false without disturbing anything
 * when there is no readable save.
 */
export async function continueFromLocalSave(slot = SAVE_SLOTS.resume) {
    if (!saveService) return false;
    let envelope = null;
    try {
        envelope = saveService.read(slot);
    } catch (error) {
        saveService.noteRestoreFailed(slot, error);
        return false;
    }
    if (!envelope) return false;
    return applySaveEnvelopeToSession(envelope, slot);
}

/**
 * Validate, build, and only then commit. Phase one cannot touch the session;
 * phase two cannot fail on save content, because it has already been checked.
 */
export async function applySaveEnvelopeToSession(envelope, slot = 'import') {
    if (!saveService) throw new SaveError(SAVE_ERROR_CODES.invalidPayload, 'The save system is not initialised');

    let prepared;
    try {
        prepared = saveService.prepareRestore(envelope, captureGameStatusForSaving());
    } catch (error) {
        saveService.noteRestoreFailed(slot, error);
        return false;
    }

    await commitRestoredState(prepared);
    saveService.noteRestored(slot, describeSave(envelope));
    return true;
}

/**
 * Replace the session and rebuild everything a save deliberately does not
 * carry: canvas metrics, entity placement and the walk-grid stamps, visual
 * positions, background and foreground images, entity paths, the inventory
 * strip, and the owned animation frame.
 */
async function commitRestoredState({ state, playerCell }) {
    // Clearing first drops the previous session's placement bookkeeping,
    // pending paths, queued text, and transition flags, so nothing from the
    // interrupted game survives into the restored one.
    resetAllVariables();
    await restoreGameStatus(state);

    setGameState(getGameVisibleActive());
    setBeginGameStatus(false);

    const room = getNavigationData()[state.location.currentRoomId];
    if (room?.bgUrl) changeCanvasBg(room.bgUrl);

    initializeEntityPathsObject();
    await startGame(playerCell);

    drawInventory(getCurrentStartIndexInventory());
    updateInteractionInfo(localize('interactionWalkTo', getLanguage(), 'verbsActionsInteraction'), false);
    setLanguageChangedFlag(true);
    checkForLanguageChange();
}

//--------------------------------------------------------------------------------------------------------
// Manual export and import
//--------------------------------------------------------------------------------------------------------

export function encodeSaveString(envelope) {
    const serialized = JSON.stringify(envelope);
    // LZString keeps the historical, compact copy-and-paste string. Plain JSON
    // is still accepted on import so a save is never locked behind one library.
    return typeof LZString === 'undefined' ? serialized : LZString.compressToEncodedURIComponent(serialized);
}

export function decodeSaveString(text) {
    const trimmed = String(text ?? '').trim();
    if (!trimmed) throw new SaveError(SAVE_ERROR_CODES.unreadable, 'The save string is empty');

    const candidates = [];
    if (typeof LZString !== 'undefined') candidates.push(() => LZString.decompressFromEncodedURIComponent(trimmed));
    candidates.push(() => trimmed);

    for (const decode of candidates) {
        try {
            const parsed = JSON.parse(decode() ?? '');
            if (parsed && typeof parsed === 'object') return parsed;
        } catch {
            // Try the next encoding before giving up.
        }
    }
    throw new SaveError(SAVE_ERROR_CODES.unreadable, 'The save string could not be read');
}

/**
 * A manual save writes the resume slot and then reads it back, so the copy the
 * player is handed is the same bytes that were stored, already proven readable.
 * `showPopup` chooses between the copy-and-paste string and a downloaded file.
 */
export function saveGame(showPopup) {
    if (!saveService) return null;

    const result = saveService.write(SAVE_SLOTS.resume, { label: 'manual', force: true });
    if (!result.written) return result;

    const envelope = saveService.read(SAVE_SLOTS.resume);

    if (showPopup) {
        document.querySelector('.save-load-header').innerHTML = `${localize('headerStringSave', getLanguage(), 'ui')}`;
        document.getElementById('copyButtonSavePopup').classList.remove('d-none');
        document.getElementById('loadStringButton').classList.add('d-none');
        getElements().saveLoadPopup.classList.remove('d-none');
        getElements().loadSaveGameStringTextArea.value = encodeSaveString(envelope);
        getElements().loadSaveGameStringTextArea.readOnly = true;
    } else {
        downloadSaveFile(encodeSaveString(envelope));
    }

    return result;
}

function downloadSaveFile(text) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ChipShopSave_${getCurrentTimestamp()}.txt`;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    URL.revokeObjectURL(url);
    anchor.remove();
}

function getCurrentTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}_${padZero(now.getMonth() + 1)}_${padZero(now.getDate())}_${padZero(now.getHours())}_${padZero(now.getMinutes())}_${padZero(now.getSeconds())}`;
}

function padZero(num) {
    return num.toString().padStart(2, '0');
}

export function copySaveStringToClipBoard() {
    const textArea = getElements().loadSaveGameStringTextArea;
    textArea.select();
    textArea.setSelectionRange(0, 99999);

    try {
        navigator.clipboard.writeText(textArea.value)
            .catch((error) => console.error('Could not copy the save string:', error))
            .finally(() => textArea.setSelectionRange(0, 0));
    } catch (error) {
        console.error('Could not copy the save string:', error);
    }
}

export function loadGameOption() {
    getElements().loadSaveGameStringTextArea.readOnly = false;
    document.querySelector('.save-load-header').innerHTML = `${localize('headerStringLoad', getLanguage(), 'ui')}`;
    document.getElementById('loadStringButton').classList.remove('d-none');
    document.getElementById('copyButtonSavePopup').classList.add('d-none');
    getElements().saveLoadPopup.classList.remove('d-none');
    document.getElementById('overlay').classList.remove('d-none');
    getElements().loadSaveGameStringTextArea.value = '';
    getElements().loadSaveGameStringTextArea.placeholder = `${localize('textAreaLabel', getLanguage(), 'ui')}`;
}

/**
 * Import a save. `fromString` reads the popup's text area; otherwise the player
 * picks a file. Either way the text goes through the same decode, migrate,
 * validate, apply path, so a file and a pasted string cannot behave differently.
 */
export async function loadGame(fromString) {
    const text = fromString ? getElements().loadSaveGameStringTextArea.value : await readSaveFile();
    return importSaveText(text);
}

export async function importSaveText(text) {
    if (!saveService) throw new SaveError(SAVE_ERROR_CODES.invalidPayload, 'The save system is not initialised');

    let envelope;
    try {
        envelope = finaliseLegacyWorld(migrateSave(decodeSaveString(text)), getPristineContent());
    } catch (error) {
        saveService.noteRestoreFailed('import', error);
        throw error;
    }

    getElements().overlay.classList.add('d-none');
    const applied = await applySaveEnvelopeToSession(envelope, 'import');
    if (!applied) throw new SaveError(SAVE_ERROR_CODES.invalidPayload, 'The save could not be applied');
    return applied;
}

function readSaveFile() {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt';
        input.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) {
                reject(new SaveError(SAVE_ERROR_CODES.unreadable, 'No save file was selected'));
                return;
            }
            const reader = new FileReader();
            reader.onload = (loaded) => resolve(loaded.target.result);
            reader.onerror = () => reject(new SaveError(SAVE_ERROR_CODES.unreadable, 'The save file could not be read'));
            reader.readAsText(file);
        });
        input.click();
    });
}

//--------------------------------------------------------------------------------------------------------
// Feedback
//--------------------------------------------------------------------------------------------------------

/**
 * One quiet line. Successes use a polite status region so a screen reader is
 * not interrupted mid-sentence; failures use an assertive alert because the
 * player's progress is at stake.
 */
function showSaveFeedback(event) {
    const region = document.getElementById('saveStatus');
    if (!region) return;

    const failed = event.event === SAVE_EVENTS.failed || event.event === SAVE_EVENTS.restoreFailed;
    const key = FEEDBACK_KEYS[event.event];
    if (!key) return;

    region.textContent = localize(key, getLanguage(), 'ui');
    region.dataset.saveEvent = event.event;
    if (event.reason) region.dataset.saveReason = event.reason;
    else delete region.dataset.saveReason;
    if (event.code) region.dataset.saveCode = event.code;
    else delete region.dataset.saveCode;
    region.setAttribute('role', failed ? 'alert' : 'status');
    region.classList.remove('d-none');
    region.classList.toggle('save-status-error', failed);

    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
        region.classList.add('d-none');
        region.textContent = '';
    }, STATUS_VISIBLE_MS);
}

export function checkForLanguageChange() {
    if (getLanguageChangedFlag()) {
        handleLanguageChange(getLanguage());
    }
    setLanguageChangedFlag(false);
}
