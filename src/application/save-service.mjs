// Progress ownership: who may write a save, when, and to which slot.
//
// The service is deliberately DOM-free and storage-agnostic. It decides policy
// — is the game in a savable moment, is this fact a milestone, which slot gets
// written — and reports what happened as stable event IDs. The adapter that
// owns the screen turns those events into localised, unobtrusive feedback.

import {
    SAVE_ERROR_CODES,
    SaveError,
    applySaveEnvelope,
    assertValidSaveEnvelope,
    createSaveEnvelope,
    describeSave,
} from '../domain/save/save-format.mjs';
import { finaliseLegacyWorld, migrateSave } from '../domain/save/migrations.mjs';

export const SAVE_SLOTS = Object.freeze({
    resume: 'resume',
    checkpoint: 'checkpoint',
});

/**
 * Reasons a save is refused. They are stable IDs rather than sentences so the
 * UI can localise them and a test can assert on them.
 */
export const SAVE_BLOCKED_REASONS = Object.freeze({
    notInGame: 'save.blocked.notInGame',
    busy: 'save.blocked.busy',
    noState: 'save.blocked.noState',
});

export const SAVE_EVENTS = Object.freeze({
    saved: 'save.saved',
    blocked: 'save.blocked',
    failed: 'save.failed',
    restored: 'save.restored',
    restoreFailed: 'save.restoreFailed',
});

export function createSaveService({
    repository,
    now = () => Date.now(),
    autosaveIntervalMs = 30_000,
} = {}) {
    if (!repository?.write || !repository?.read) throw new TypeError('createSaveService requires a save repository');

    let ports = null;
    const listeners = new Set();
    let carriedPlayTimeMs = 0;
    let sessionStartedAt = null;
    // The first room change of a session always autosaves; the interval only
    // rate-limits the ones after it.
    let lastAutosaveAt = Number.NEGATIVE_INFINITY;

    function emit(event, detail = {}) {
        const payload = Object.freeze({ event, at: now(), ...detail });
        listeners.forEach((listener) => listener(payload));
        return payload;
    }

    function playTimeMs() {
        if (sessionStartedAt === null) return carriedPlayTimeMs;
        return carriedPlayTimeMs + Math.max(0, now() - sessionStartedAt);
    }

    function savabilityReason() {
        if (!ports?.getState) return SAVE_BLOCKED_REASONS.noState;
        if (ports.isInGame && !ports.isInGame()) return SAVE_BLOCKED_REASONS.notInGame;
        // A save taken mid-conversation, mid-cutscene, or mid-transition would
        // record a moment the restore cannot rebuild, so those moments wait.
        if (ports.isBusy && ports.isBusy()) return SAVE_BLOCKED_REASONS.busy;
        return null;
    }

    function buildEnvelope({ slot = null, label = null } = {}) {
        return createSaveEnvelope({
            state: ports.getState(),
            pristineContent: ports.getPristineContent?.() ?? null,
            currentContent: ports.getCurrentContent?.() ?? null,
            gridUnderlyingValue: ports.getUnderlyingCellValue,
            playerCell: ports.getPlayerCell?.() ?? null,
            savedAt: new Date(now()).toISOString(),
            playTimeMs: playTimeMs(),
            label,
            slot,
        });
    }

    /**
     * Write one slot. A refused or failed write never disturbs whatever is
     * already stored, and always reports why.
     */
    function write(slot, { label = null, force = false } = {}) {
        const blocked = force ? null : savabilityReason();
        if (blocked) return emit(SAVE_EVENTS.blocked, { slot, reason: blocked, written: false });

        try {
            const envelope = buildEnvelope({ slot, label });
            assertValidSaveEnvelope(envelope);
            repository.write(slot, envelope);
            return emit(SAVE_EVENTS.saved, { slot, written: true, describe: describeSave(envelope) });
        } catch (error) {
            return emit(SAVE_EVENTS.failed, {
                slot,
                written: false,
                code: error instanceof SaveError ? error.code : SAVE_ERROR_CODES.unreadable,
                message: error.message,
            });
        }
    }

    function readEnvelope(slot) {
        const stored = repository.read(slot);
        if (stored === null || stored === undefined) return null;
        const migrated = finaliseLegacyWorld(migrateSave(stored), ports?.getPristineContent?.() ?? null);
        return assertValidSaveEnvelope(migrated);
    }

    return Object.freeze({
        SAVE_SLOTS,

        /** Wire the service to the running game. Called once per application boot. */
        configure(nextPorts) {
            ports = nextPorts;
            return ports;
        },

        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },

        beginSession(previousPlayTimeMs = 0) {
            carriedPlayTimeMs = previousPlayTimeMs;
            sessionStartedAt = now();
            // A new game has just written the resume slot, so the interval
            // starts from here rather than firing again on the first exit.
            lastAutosaveAt = now();
        },

        endSession() {
            carriedPlayTimeMs = playTimeMs();
            sessionStartedAt = null;
        },

        playTimeMs,
        canSave: () => savabilityReason() === null,
        whySaveBlocked: savabilityReason,
        buildEnvelope,

        write,
        read: readEnvelope,

        describe(slot) {
            try {
                const envelope = readEnvelope(slot);
                return envelope ? describeSave(envelope) : null;
            } catch {
                return null;
            }
        },

        hasSave(slot) {
            try {
                return readEnvelope(slot) !== null;
            } catch {
                return false;
            }
        },

        clear(slot) {
            repository.remove?.(slot);
        },

        /**
         * Validate and build the state a restore would commit. Nothing is
         * committed here: the caller inspects the result, and on any thrown
         * SaveError the running session is still exactly as it was.
         */
        prepareRestore(envelope, baseState) {
            const prepared = applySaveEnvelope({
                envelope,
                baseState,
                pristineContent: ports?.getPristineContent?.() ?? null,
            });
            carriedPlayTimeMs = prepared.playTimeMs;
            sessionStartedAt = now();
            return prepared;
        },

        noteRestored(slot, describe) {
            return emit(SAVE_EVENTS.restored, { slot, describe });
        },

        noteRestoreFailed(slot, error) {
            return emit(SAVE_EVENTS.restoreFailed, {
                slot,
                code: error instanceof SaveError ? error.code : SAVE_ERROR_CODES.unreadable,
                message: error?.message ?? String(error),
            });
        },

        /**
         * Autosave on room change, rate-limited so a player pacing between two
         * rooms does not write continuously.
         */
        noteRoomChange() {
            if (savabilityReason()) return null;
            if (now() - lastAutosaveAt < autosaveIntervalMs) return null;
            lastAutosaveAt = now();
            return write(SAVE_SLOTS.resume, { label: 'autosave.roomChange' });
        },

        /**
         * Checkpoint the declared Chapter 1 milestones. The milestone list comes
         * from the content contract, so a new mandatory fact checkpoints itself.
         * A milestone usually commits inside a conversation or cutscene, which
         * is exactly when an ordinary save waits, so this write is forced: the
         * progress is worth keeping and a restore always resumes in the room
         * rather than part-way through the moment that granted it.
         */
        noteFact(factId) {
            const milestones = ports?.getMilestoneFacts?.() ?? [];
            if (!milestones.includes(factId)) return null;
            lastAutosaveAt = now();
            const checkpoint = write(SAVE_SLOTS.checkpoint, { label: factId, force: true });
            write(SAVE_SLOTS.resume, { label: factId, force: true });
            return checkpoint;
        },
    });
}
