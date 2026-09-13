// Debug and test controller.
//
// This module owns every debug behaviour that does not need the DOM. The panel
// adapter and the `__GAME_TEST__` bridge are two presentations of the same
// controller, so a control can never drift from the API a test drives.
//
// Rules this file keeps:
//  - one state model: everything goes through the canonical store, scenario
//    loading, or an explicit port into the running game;
//  - stable semantic IDs only, never translated display text;
//  - invalid scenarios are rejected before any rendering side effect.

import {
    MOVEMENT_SPEED_MULTIPLIERS,
    SCENARIO_SCHEMA_VERSION,
    TEXT_SPEED_MULTIPLIERS,
    closeFactsOverPrerequisites,
    createScenario,
    createSeededRandom,
    criticalPathFrontier,
    deriveScenarioMutations,
    stateChecksum,
    validateFactConsistency,
    validateScenario,
} from '../domain/scenarios/scenarios.mjs';
import { whyGateUnavailable, whyUnavailable } from '../domain/puzzles/puzzles.mjs';
import { SAVE_MIGRATION_FIXTURES, INVENTORY_PRESETS, getScenario, listScenarios } from '../content/scenario-registry.mjs';
import { GAME_STATE_SCHEMA_VERSION, validateGameState } from '../state/game-state.mjs';
import { gameActions } from '../state/store.mjs';

export const DEBUG_API_VERSION = 1;
const MAX_LOG_ENTRIES = 200;

function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function writePath(root, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const parent = keys.reduce((current, key) => current?.[key], root);
    if (parent === null || parent === undefined) return false;
    parent[last] = value;
    return true;
}

export function createDebugController(ports = {}) {
    const {
        store,
        content = {},
        session = {},
        world = {},
        inventory = {},
        commands = {},
        dialogue = {},
        saves = {},
        presentation = {},
        assets = {},
        diagnostics = {},
        idle = null,
        now = () => Date.now(),
    } = ports;

    if (!store?.dispatch) throw new TypeError('createDebugController requires a canonical store');

    const log = [];
    let pristineContent = null;
    let activeScenario = null;
    let activeSeed = null;
    let random = createSeededRandom(1);
    let paused = false;

    function record(source, name, detail = {}) {
        log.push({ at: now(), source, name, detail: clone(detail) ?? {} });
        if (log.length > MAX_LOG_ENTRIES) log.splice(0, log.length - MAX_LOG_ENTRIES);
        return detail;
    }

    function contract() {
        return content.getContract?.() ?? null;
    }

    function puzzleActions() {
        return contract()?.puzzle?.actions ?? [];
    }

    function connections() {
        return contract()?.world?.connections ?? [];
    }

    function capturePristineContent() {
        if (pristineContent) return pristineContent;
        pristineContent = {
            navigation: clone(content.getNavigation?.() ?? null),
            objects: clone(content.getObjects?.() ?? null),
            npcs: clone(content.getNpcs?.() ?? null),
            grids: clone(content.getGrids?.() ?? null),
        };
        return pristineContent;
    }

    function restorePristineContent() {
        const pristine = capturePristineContent();
        if (pristine.navigation) content.setNavigation?.(clone(pristine.navigation));
        if (pristine.objects) content.setObjects?.(clone(pristine.objects));
        if (pristine.npcs) content.setNpcs?.(clone(pristine.npcs));
        if (pristine.grids) content.setGrids?.(clone(pristine.grids));
    }

    /**
     * Deterministic starting cell: an explicit scenario spawn, the contract's
     * initial player reference for the opening room, or the lowest-numbered
     * exit's authored start position. Always content-derived, never copied.
     */
    function resolveSpawn(scenario) {
        if (scenario.spawn) return { ...scenario.spawn };
        if (scenario.roomId === contract()?.world?.initialRoomId && world.initialSpawn) return { ...world.initialSpawn() };
        const exits = content.getNavigation?.()?.[scenario.roomId]?.exits ?? {};
        const exitId = Object.keys(exits).sort()[0];
        const startPosition = exits[exitId]?.startPosition;
        return startPosition ? { x: startPosition.x, y: startPosition.y } : null;
    }

    function validationContext() {
        const current = contract();
        return {
            roomIds: current?.world?.rooms,
            factIds: current ? [...new Set([...(current.puzzle?.initialFacts ?? []), ...(current.puzzle?.actions ?? []).flatMap((action) => action.effects ?? [])])] : undefined,
            objectIds: content.getObjects?.() ? Object.keys(content.getObjects().objects) : undefined,
            npcIds: content.getNpcs?.() ? Object.keys(content.getNpcs().npcs) : undefined,
            localeIds: current?.locales,
        };
    }

    function currentChecksum() {
        return stateChecksum(store.getState(), {
            scenarioId: activeScenario?.id ?? null,
            seed: activeSeed,
            spawn: activeScenario ? resolveSpawn(activeScenario) : null,
        });
    }

    function applyMutations(mutations) {
        const applied = { exits: 0, objects: 0, npcs: 0, grids: 0, inventory: 0 };
        const failures = [];

        const navigation = content.getNavigation?.();
        if (navigation) {
            for (const exit of mutations.exits) {
                const exitRecord = navigation[exit.roomId]?.exits?.[exit.exitId];
                if (!exitRecord) failures.push(`exit ${exit.roomId}.${exit.exitId} does not exist`);
                else {
                    exitRecord.status = exit.status;
                    applied.exits += 1;
                }
            }
            content.setNavigation?.(navigation);
        }

        const objects = content.getObjects?.();
        if (objects) {
            for (const mutation of mutations.objects) {
                const target = objects.objects?.[mutation.id];
                if (!target || !writePath(target, mutation.path, mutation.value)) failures.push(`object ${mutation.id}.${mutation.path} does not exist`);
                else applied.objects += 1;
            }
            content.setObjects?.(objects);
        }

        const npcs = content.getNpcs?.();
        if (npcs) {
            for (const mutation of mutations.npcs) {
                const target = npcs.npcs?.[mutation.id];
                if (!target || !writePath(target, mutation.path, mutation.value)) failures.push(`npc ${mutation.id}.${mutation.path} does not exist`);
                else applied.npcs += 1;
            }
            content.setNpcs?.(npcs);
        }

        const grids = content.getGrids?.();
        if (grids) {
            for (const mutation of mutations.grids) {
                if (!grids[mutation.value]) failures.push(`grid variant '${mutation.value}' does not exist`);
                else {
                    grids[mutation.id] = clone(grids[mutation.value]);
                    applied.grids += 1;
                }
            }
            content.setGrids?.(grids);
        }

        for (const entry of mutations.inventory) {
            inventory.add?.(entry.objectId, entry.quantity);
            applied.inventory += 1;
        }

        return { applied, failures };
    }

    function mergeOverrides(scenario, overrides = {}) {
        if (!overrides || Object.keys(overrides).length === 0) return scenario;
        return createScenario({
            ...scenario,
            ...overrides,
            facts: { ...scenario.facts, ...(overrides.facts ?? {}) },
            inventory: overrides.inventory ?? scenario.inventory,
            presentation: { ...scenario.presentation, ...(overrides.presentation ?? {}) },
            simulate: { ...scenario.simulate, ...(overrides.simulate ?? {}) },
        });
    }

    const api = {
        apiVersion: DEBUG_API_VERSION,
        scenarioSchemaVersion: SCENARIO_SCHEMA_VERSION,
        stateSchemaVersion: GAME_STATE_SCHEMA_VERSION,

        // --- scenarios -----------------------------------------------------
        listScenarios,
        getScenario: (scenarioId) => clone(getScenario(scenarioId)),
        activeScenarioId: () => activeScenario?.id ?? null,

        validateScenarioFixture(scenarioId, overrides) {
            const base = getScenario(scenarioId);
            if (!base) return { valid: false, errors: [`unknown scenario '${scenarioId}'`] };
            const scenario = mergeOverrides(base, overrides);
            const errors = validateScenario(scenario, validationContext());
            const consistency = validateFactConsistency(scenario.facts, puzzleActions());
            for (const conflict of consistency.conflicts) {
                errors.push(`fact '${conflict.factId}' needs ${conflict.missingFactIds.join(', ')} for action '${conflict.actionId}'`);
            }
            return { valid: errors.length === 0, errors, scenario: clone(scenario) };
        },

        async loadScenario(scenarioId, overrides = {}) {
            const startedAt = now();
            const check = api.validateScenarioFixture(scenarioId, overrides);
            // Reject before any rendering side effect.
            if (!check.valid) {
                record('scenario', 'rejected', { scenarioId, errors: check.errors });
                return { loaded: false, scenarioId, errors: check.errors };
            }

            const scenario = mergeOverrides(getScenario(scenarioId), overrides);
            capturePristineContent();

            activeScenario = scenario;
            activeSeed = scenario.seed;
            random = createSeededRandom(scenario.seed);
            session.setRandom?.(random);

            await session.reset?.();
            restorePristineContent();

            store.dispatch(gameActions.setSetting('language', scenario.locale));
            await session.setLocale?.(scenario.locale);

            inventory.set?.({});
            for (const factId of Object.keys(closeFactsOverPrerequisites(scenario.facts, puzzleActions()))) {
                store.dispatch(gameActions.setQuestFact(factId, true));
            }

            const mutations = deriveScenarioMutations(scenario, { connections: connections(), factEffects: ports.factEffects });
            const { applied, failures } = applyMutations(mutations);

            const spawn = resolveSpawn(scenario);
            if (!spawn) {
                record('scenario', 'rejected', { scenarioId, errors: ['no deterministic spawn could be derived'] });
                return { loaded: false, scenarioId, errors: ['no deterministic spawn could be derived'] };
            }

            world.setMovementSpeed?.(MOVEMENT_SPEED_MULTIPLIERS[scenario.presentation.movementSpeed]);
            dialogue.setTextSpeed?.(TEXT_SPEED_MULTIPLIERS[scenario.presentation.textSpeed]);
            if (scenario.simulate.assetFailure) assets.setFailure?.(scenario.simulate.assetFailure);
            if (scenario.simulate.saveFixture) saves.setFixture?.(scenario.simulate.saveFixture);

            // Rebuild after the mutations so entity footprints, grids, and the
            // canvas are stamped from the scenario's world, not the old one.
            await session.rebuild?.();
            await world.teleport?.({ roomId: scenario.roomId, x: spawn.x, y: spawn.y });
            const idleResult = idle ? await idle.waitForIdle({ timeoutMs: 5_000 }) : { idle: true, pending: [] };

            const result = {
                loaded: true,
                scenarioId: scenario.id,
                seed: scenario.seed,
                roomId: scenario.roomId,
                spawn,
                checksum: currentChecksum(),
                applied,
                failures,
                durationMs: now() - startedAt,
                idle: idleResult.idle,
                pending: idleResult.pending,
                errors: [],
            };
            record('scenario', 'loaded', result);
            return result;
        },

        reloadScenario: (overrides) => (activeScenario ? api.loadScenario(activeScenario.id, overrides) : Promise.resolve({ loaded: false, errors: ['no active scenario'] })),

        // --- session -------------------------------------------------------
        async newSession() {
            activeScenario = null;
            activeSeed = null;
            await session.reset?.();
            restorePristineContent();
            return record('session', 'new', { checksum: currentChecksum() });
        },
        pause() {
            paused = true;
            session.pause?.();
            return record('session', 'pause', { paused });
        },
        resume() {
            paused = false;
            session.resume?.();
            return record('session', 'resume', { paused });
        },
        isPaused: () => paused,
        setSeed(seed) {
            if (!Number.isInteger(seed)) throw new TypeError('seed must be an integer');
            activeSeed = seed;
            random = createSeededRandom(seed);
            session.setRandom?.(random);
            return record('session', 'seed', { seed });
        },
        seed: () => activeSeed,
        random: () => random(),
        checksum: currentChecksum,

        exportSnapshot: () => ({
            schemaVersion: GAME_STATE_SCHEMA_VERSION,
            scenarioId: activeScenario?.id ?? null,
            seed: activeSeed,
            checksum: currentChecksum(),
            state: store.getSnapshot(),
        }),
        importSnapshot(snapshot) {
            const state = snapshot?.state ?? snapshot;
            const validation = validateGameState(state);
            if (!validation.valid) return record('session', 'import-rejected', { errors: validation.errors });
            store.dispatch(gameActions.replace(clone(state)));
            return record('session', 'import', { checksum: currentChecksum() });
        },
        validateState: () => {
            const state = store.getState();
            const shape = validateGameState(state);
            const consistency = validateFactConsistency(state.quests.facts, puzzleActions());
            return {
                valid: shape.valid && consistency.valid,
                errors: shape.errors,
                conflicts: consistency.conflicts,
            };
        },

        // --- content listings ------------------------------------------------
        listObjectIds: () => Object.keys(content.getObjects?.()?.objects ?? {}).sort(),
        listNpcIds: () => Object.keys(content.getNpcs?.()?.npcs ?? {}).sort(),
        listActionIds: () => puzzleActions().map((action) => action.id),

        // --- overlays ----------------------------------------------------------
        setOverlays: (options) => record('overlay', 'set', { options: world.setOverlays?.(options) ?? options }),
        overlays: () => world.overlays?.() ?? {},
        // The original hand-built tools, kept rather than replaced: the legacy
        // grid view redraws the room as bare cells, and the animation toggle
        // freezes non-player movement.
        toggleLegacyGridView: () => record('overlay', 'legacy-grid', { enabled: world.toggleLegacyGridView?.() ?? null }),
        toggleNonPlayerAnimation: () => record('overlay', 'non-player-animation', { enabled: world.toggleNonPlayerAnimation?.() ?? null }),
        openLegacyDebugWindow: () => record('overlay', 'legacy-value-window', { opened: diagnostics.openValueWindow?.() ?? false }),

        // --- location and movement ------------------------------------------
        listRooms: () => (contract()?.world?.rooms ?? []).map((roomId) => ({
            roomId,
            exits: Object.keys(content.getNavigation?.()?.[roomId]?.exits ?? {}),
        })),
        listAnchors(roomId) {
            const exits = content.getNavigation?.()?.[roomId]?.exits ?? {};
            return Object.entries(exits).map(([exitId, exit]) => ({ exitId, connectsTo: exit.connectsTo, status: exit.status, ...exit.startPosition }));
        },
        async teleport({ roomId, exitId = null, x = null, y = null } = {}) {
            const rooms = contract()?.world?.rooms ?? [];
            if (!rooms.includes(roomId)) return record('location', 'teleport-rejected', { roomId, reason: 'unknown-room' });
            const exits = content.getNavigation?.()?.[roomId]?.exits ?? {};
            let target = x !== null && y !== null ? { x, y } : null;
            if (!target && exitId) target = exits[exitId]?.startPosition ? { ...exits[exitId].startPosition } : null;
            if (!target) {
                const firstExitId = Object.keys(exits).sort()[0];
                target = exits[firstExitId]?.startPosition ? { ...exits[firstExitId].startPosition } : null;
            }
            if (!target || !Number.isInteger(target.x) || !Number.isInteger(target.y) || target.x < 0 || target.x >= 80 || target.y < 0 || target.y >= 60) {
                return record('location', 'teleport-rejected', { roomId, target, reason: 'invalid-coordinate' });
            }
            await world.teleport?.({ roomId, x: target.x, y: target.y });
            return record('location', 'teleport', { roomId, ...target, checksum: currentChecksum() });
        },
        completePath: () => record('location', 'complete-path', world.completePath?.() ?? {}),
        cancelPath: () => record('location', 'cancel-path', world.cancelPath?.() ?? {}),
        setMovementSpeed(speedId) {
            const multiplier = MOVEMENT_SPEED_MULTIPLIERS[speedId];
            if (multiplier === undefined) throw new TypeError(`Unknown movement speed '${speedId}'`);
            world.setMovementSpeed?.(multiplier);
            return record('location', 'movement-speed', { speedId, multiplier });
        },

        // --- inventory and verbs ---------------------------------------------
        listInventory: () => inventory.list?.() ?? [],
        listInventoryPresets: () => Object.keys(INVENTORY_PRESETS),
        addItem(objectId, quantity = 1) {
            const objects = content.getObjects?.()?.objects ?? {};
            if (!objects[objectId]) return record('inventory', 'add-rejected', { objectId, reason: 'unknown-object' });
            inventory.add?.(objectId, quantity);
            return record('inventory', 'add', { objectId, quantity });
        },
        removeItem(objectId, quantity = 1) {
            inventory.remove?.(objectId, quantity);
            return record('inventory', 'remove', { objectId, quantity });
        },
        applyInventoryPreset(presetId) {
            const preset = INVENTORY_PRESETS[presetId];
            if (!preset) return record('inventory', 'preset-rejected', { presetId });
            inventory.set?.({});
            for (const objectId of preset) inventory.add?.(objectId, 1);
            return record('inventory', 'preset', { presetId, items: [...preset] });
        },
        resetEntity(entityId) {
            const pristine = capturePristineContent();
            const objects = content.getObjects?.();
            if (objects?.objects?.[entityId] && pristine.objects?.objects?.[entityId]) {
                objects.objects[entityId] = clone(pristine.objects.objects[entityId]);
                content.setObjects?.(objects);
                return record('inventory', 'reset-entity', { entityId, kind: 'object' });
            }
            const npcs = content.getNpcs?.();
            if (npcs?.npcs?.[entityId] && pristine.npcs?.npcs?.[entityId]) {
                npcs.npcs[entityId] = clone(pristine.npcs.npcs[entityId]);
                content.setNpcs?.(npcs);
                return record('inventory', 'reset-entity', { entityId, kind: 'npc' });
            }
            return record('inventory', 'reset-entity-rejected', { entityId });
        },
        selectVerb(verbId) {
            commands.selectVerb?.(verbId);
            return record('command', 'verb', { verbId, selection: commands.current?.() });
        },
        selectTarget(targetId) {
            const result = commands.selectTarget?.(targetId);
            return record('command', 'target', { targetId, result: result?.status ?? null, selection: commands.current?.() });
        },
        cancelCommand() {
            commands.cancel?.();
            return record('command', 'cancel', { selection: commands.current?.() });
        },
        currentCommand: () => commands.current?.() ?? null,

        // --- dialogue and characters ------------------------------------------
        listDialogueGraphs: () => dialogue.listGraphs?.() ?? [],
        describeDialogue: (graphId, nodeId) => dialogue.describeNode?.(graphId, nodeId) ?? null,
        async startDialogue(npcId, nodeId = null) {
            const npcs = content.getNpcs?.()?.npcs ?? {};
            if (!npcs[npcId]) return record('dialogue', 'start-rejected', { npcId, reason: 'unknown-npc' });
            await dialogue.start?.(npcId, nodeId);
            return record('dialogue', 'start', { npcId, nodeId });
        },
        setTextSpeed(speedId) {
            const multiplier = TEXT_SPEED_MULTIPLIERS[speedId];
            if (multiplier === undefined) throw new TypeError(`Unknown text speed '${speedId}'`);
            dialogue.setTextSpeed?.(multiplier);
            return record('dialogue', 'text-speed', { speedId, multiplier });
        },
        skipDialogueLine: () => record('dialogue', 'skip', dialogue.skipLine?.() ?? {}),
        resetConversation(npcId) {
            api.resetEntity(npcId);
            dialogue.reset?.(npcId);
            return record('dialogue', 'reset', { npcId });
        },
        inspectNpc(npcId) {
            const npc = content.getNpcs?.()?.npcs?.[npcId];
            if (!npc) return null;
            return {
                npcId,
                roomId: npc.npcPlacementLocation,
                visible: Boolean(npc.npcPlacementLocation),
                pose: npc.activeSpriteUrl,
                canTalk: npc.interactable?.canTalk === true,
                questPhase: npc.interactable?.questPhase ?? null,
                dialoguePhase: npc.interactable?.dialoguePhase ?? null,
            };
        },

        // --- puzzles and quests ------------------------------------------------
        listFacts() {
            const state = store.getState();
            const mandatory = contract()?.puzzle?.mandatoryFacts ?? [];
            const all = [...new Set([...mandatory, ...(contract()?.puzzle?.initialFacts ?? []), ...Object.keys(state.quests.facts)])].sort();
            return all.map((factId) => ({ factId, satisfied: state.quests.facts[factId] === true, mandatory: mandatory.includes(factId) }));
        },
        explainAction(actionId) {
            const action = puzzleActions().find((entry) => entry.id === actionId);
            return whyUnavailable(action, store.getState().quests.facts);
        },
        explainGate(fromRoomId, exitId) {
            const connection = connections().find((entry) => entry.from === fromRoomId && entry.exit === exitId);
            return whyGateUnavailable(connection, store.getState().quests.facts);
        },
        applyMilestone(actionId) {
            const explanation = api.explainAction(actionId);
            if (!explanation.available) return record('puzzle', 'milestone-rejected', { actionId, ...explanation });
            const action = puzzleActions().find((entry) => entry.id === actionId);
            for (const factId of action.effects ?? []) store.dispatch(gameActions.setQuestFact(factId, true));
            const mutations = deriveScenarioMutations({ facts: store.getState().quests.facts, inventory: [] }, { connections: connections(), factEffects: ports.factEffects });
            applyMutations(mutations);
            return record('puzzle', 'milestone', { actionId, effects: action.effects, checksum: currentChecksum() });
        },
        revertToScenario: (scenarioId) => api.loadScenario(scenarioId),
        criticalPathFrontier: () => criticalPathFrontier(puzzleActions(), store.getState().quests.facts),
        factConflicts: () => validateFactConsistency(store.getState().quests.facts, puzzleActions()),

        // --- saves, localisation, presentation ----------------------------------
        listMigrationFixtures: () => Object.keys(SAVE_MIGRATION_FIXTURES),
        saveScenario: (key) => saves.save?.(key),
        loadSavedScenario: (key) => saves.load?.(key),
        selectMigrationFixture(fixtureId) {
            const fixture = SAVE_MIGRATION_FIXTURES[fixtureId];
            if (!fixture) return record('save', 'fixture-rejected', { fixtureId });
            saves.setFixture?.(fixtureId);
            return record('save', 'fixture', { fixtureId, schemaVersion: fixture.schemaVersion });
        },
        simulateStorageFailure: (enabled = true) => record('save', 'storage-failure', { enabled: saves.setStorageFailure?.(enabled) ?? enabled }),
        listLocales: () => contract()?.locales ?? [],
        async setLocale(locale) {
            if (!(contract()?.locales ?? []).includes(locale)) return record('presentation', 'locale-rejected', { locale });
            store.dispatch(gameActions.setSetting('language', locale));
            await session.setLocale?.(locale);
            return record('presentation', 'locale', { locale });
        },
        simulateMissingKey: (sectionAndKey) => record('presentation', 'missing-key', { key: presentation.setMissingKey?.(sectionAndKey) ?? sectionAndKey }),
        setViewportPreset: (presetId) => record('presentation', 'viewport', { presetId, applied: presentation.setViewport?.(presetId) ?? null }),
        setAccessibilityOption: (optionId, value) => record('presentation', 'accessibility', { optionId, value: presentation.setAccessibilityOption?.(optionId, value) ?? value }),
        setInputMode: (modeId) => record('presentation', 'input-mode', { modeId, applied: presentation.setInputMode?.(modeId) ?? null }),
        simulateAssetFailure: (assetUrl) => record('asset', 'failure', { assetUrl: assets.setFailure?.(assetUrl) ?? assetUrl }),

        // --- diagnostics ---------------------------------------------------------
        waitForIdle: (options) => (idle ? idle.waitForIdle(options) : Promise.resolve({ idle: true, pending: [], waitedMs: 0, timedOut: false })),
        idleProbes: () => idle?.pending() ?? [],
        log: () => clone(log),
        clearLog: () => log.splice(0, log.length).length,
        inspectSummary() {
            const state = store.getState();
            return {
                apiVersion: DEBUG_API_VERSION,
                schemaVersion: state.schemaVersion,
                scenarioId: activeScenario?.id ?? null,
                seed: activeSeed,
                checksum: currentChecksum(),
                sessionGeneration: state.session.generation,
                sessionStatus: state.session.status,
                paused,
                roomId: state.location.currentRoomId,
                previousRoomId: state.location.previousRoomId,
                playerCell: world.playerCell?.() ?? null,
                pathLength: world.pathCells?.()?.length ?? 0,
                presentationMode: state.presentation.mode,
                locale: state.settings.language,
                inventory: (inventory.list?.() ?? []).map((item) => item.objectId),
                facts: Object.entries(state.quests.facts).filter(([, value]) => value === true).map(([factId]) => factId).sort(),
                selectedCommand: commands.current?.() ?? null,
                activeDialogue: dialogue.active?.() ?? null,
                saveDirty: saves.isDirty?.() ?? false,
                assets: assets.readiness?.() ?? null,
                frameTime: diagnostics.frameTime?.() ?? null,
                idlePending: idle?.pending() ?? [],
            };
        },
        exportReproductionBundle() {
            return {
                schemaVersion: SCENARIO_SCHEMA_VERSION,
                apiVersion: DEBUG_API_VERSION,
                capturedAt: new Date(now()).toISOString(),
                scenarioId: activeScenario?.id ?? null,
                seed: activeSeed,
                checksum: currentChecksum(),
                summary: api.inspectSummary(),
                actions: clone(log),
                errors: clone(diagnostics.errors?.() ?? []),
            };
        },
    };

    return Object.freeze(api);
}
