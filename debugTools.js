// Development-only composition layer for the debug and test controls.
//
// This module is never referenced by index.html and is only imported
// dynamically by ui.js after two independent gates agree: the served build
// advertises `/debug-capability`, and the session explicitly asked for debug
// tools. A release server refuses to serve this file at all.
//
// Everything here is wiring. The rules live in src/domain, the orchestration in
// src/application/debug-controller.mjs, and the presentation in
// src/adapters/debug-panel.mjs.

import {
    gameStore,
    getAllGridData,
    getAnimationInProgress,
    getBeginGameStatus,
    getCanvasCellHeight,
    getCanvasCellWidth,
    getContentContract,
    getCurrentScreenId,
    getCurrentlyMovingToAction,
    getDialogueData,
    getDrawGrid,
    getElements,
    getNonPlayerAnimationFunctionalityActive,
    getGameVisibleActive,
    getGameStateVariable,
    getInitialStartGridReference,
    getIsDisplayingText,
    getLanguage,
    getNavigationData,
    getNpcData,
    getObjectData,
    getPlayerInventory,
    getPlayerObject,
    getPristineContent,
    getQuestFacts,
    getTextQueue,
    getTransitioningNow,
    getTransitioningToAnotherScreen,
    getTransitioningToDialogueState,
    getWalkSpeedPlayer,
    resetAllVariables,
    setBeginGameStatus,
    setClickPoint,
    setCurrentScreenId,
    setCurrentlyMovingToAction,
    setDrawGrid,
    setForcePlayerLocation,
    setForegroundGridProcessed,
    setNonPlayerAnimationFunctionalityActive,
    setGridData,
    setNavigationData,
    setNextScreenId,
    setNpcsData,
    setObjectsData,
    setPlayerInventory,
    setPlayerObject,
    setPreviousScreenId,
    setTextDisplayScale,
    setTransitioningNow,
    setTransitioningToAnotherScreen,
    setUpcomingAction,
    setVerbButtonConstructionStatus,
    getSelectedVerbId,
} from './constantsAndGlobalVars.js';
import {
    entityPaths,
    getFrameTimeSummary,
    initializePlayerPosition,
    isGameLoopActive,
    pauseGameLoop,
    resumeGameLoop,
    setDebugOverlayRenderer,
    setGameState,
    startGame,
} from './game.js';
import {
    changeCanvasBg,
    drawInventory,
    handleLanguageChange,
    openDebugWindow,
    skipCurrentText,
} from './ui.js';
import { addItemToInventory, constructCommand, handleInventoryAdjustment, performCommand } from './handleCommands.js';
import { dialogueEngine } from './dialogue.js';
import { clearProgressDiagnostics, getProgressDiagnostics } from './events.js';
import { createDebugController } from './src/application/debug-controller.mjs';
import { createIdleTracker } from './src/application/idle.mjs';
import { createDebugPanel } from './src/adapters/debug-panel.mjs';
import { createOverlayOptions, drawDebugOverlays } from './src/adapters/debug-overlays.mjs';
import { createStorageRepository } from './src/adapters/storage.mjs';
import { FACT_EFFECTS } from './src/content/scenario-registry.mjs';
import { libraryDialogueGraph } from './src/content/library-dialogue.mjs';
import { createDialogueState, getDialogueNode } from './src/domain/dialogue/dialogue.mjs';
import { createCommandIntent } from './src/domain/commands/commands.mjs';

const VIEWPORT_PRESETS = Object.freeze({
    '1280x720': { width: 1280, height: 720 },
    '1440x900': { width: 1440, height: 900 },
    '1920x1080': { width: 1920, height: 1080 },
    '834x1112': { width: 834, height: 1112 },
});

let installed = null;

export async function installDebugTools({ config = {} } = {}) {
    if (installed) return installed;

    let overlayOptions = createOverlayOptions();
    let movementMultiplier = 1;
    let pendingSaves = 0;
    let saveFixtureId = 'current';
    let storageFailureEnabled = false;
    let missingKeySimulation = null;
    let inputMode = 'pointer';
    const accessibility = { highContrast: false, reducedMotion: false, textScale: false };
    const capturedErrors = [];
    const failingAssets = new Set();

    const onWindowError = (event) => capturedErrors.push({ kind: 'error', message: event.message });
    const onRejection = (event) => capturedErrors.push({ kind: 'unhandledrejection', message: String(event.reason) });
    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onRejection);

    // The scenario repository writes the same versioned envelope the player's
    // saves use, so a debug round trip exercises the shipping save path rather
    // than a parallel one.
    const repository = createStorageRepository({
        getItem: (key) => {
            if (storageFailureEnabled) throw new Error('Simulated storage read failure');
            return localStorage.getItem(key);
        },
        setItem: (key, value) => {
            if (storageFailureEnabled) throw new Error('Simulated storage write failure');
            localStorage.setItem(key, value);
        },
        removeItem: (key) => localStorage.removeItem(key),
    }, {
        getPristineContent: () => getPristineContent(),
        getBaseState: () => gameStore.getSnapshot(),
    });

    const idle = createIdleTracker({
        stableTicks: 2,
        now: () => performance.now(),
        schedule: (callback) => requestAnimationFrame(callback),
        probes: {
            startup: () => getBeginGameStatus() === true,
            movement: () => (entityPaths.player?.path?.length ?? 0) > 0 || getCurrentlyMovingToAction() === true,
            transition: () => getTransitioningNow() === true || getTransitioningToAnotherScreen() === true,
            dialogue: () => getIsDisplayingText() === true || getTextQueue().length > 0 || getTransitioningToDialogueState() === true,
            animation: () => getAnimationInProgress() === true,
            saveQueue: () => pendingSaves > 0,
        },
    });

    function inventoryList() {
        return Object.entries(getPlayerInventory())
            .sort(([left], [right]) => Number(left.slice(4)) - Number(right.slice(4)))
            .map(([slot, item]) => ({ slot, objectId: item.object, quantity: item.quantity }));
    }

    function playerCell() {
        const player = getPlayerObject();
        const cellWidth = getCanvasCellWidth();
        const cellHeight = getCanvasCellHeight();
        if (!cellWidth || !cellHeight) return null;
        return {
            x: Math.floor((player.xPos + player.width / 2) / cellWidth),
            y: Math.floor((player.yPos + player.height) / cellHeight),
        };
    }

    /**
     * Stop the player cleanly: the path, the click that produced it, any forced
     * location, and the "moving to an action" intent all have to go, or the
     * movement idle probe never settles.
     */
    function clearMovementIntent() {
        if (entityPaths.player) {
            entityPaths.player.path = [];
            entityPaths.player.currentIndex = 0;
        }
        setClickPoint({ x: null, y: null });
        setForcePlayerLocation([]);
        setCurrentlyMovingToAction(false);
        setUpcomingAction(null);
    }

    function applyPlayerSpeed(roomId) {
        const scaling = getNavigationData()?.[roomId]?.scalingPlayerSpeed ?? 1;
        const baseline = getWalkSpeedPlayer() * scaling;
        setPlayerObject('baselineSpeedForRoom', baseline);
        setPlayerObject('speed', Math.max(0.5, baseline * movementMultiplier));
    }

    const controller = createDebugController({
        store: gameStore,
        factEffects: FACT_EFFECTS,
        idle,
        now: () => performance.now(),

        content: {
            getContract: getContentContract,
            getNavigation: getNavigationData,
            setNavigation: setNavigationData,
            getObjects: getObjectData,
            setObjects: setObjectsData,
            getNpcs: getNpcData,
            setNpcs: setNpcsData,
            getGrids: getAllGridData,
            setGrids: setGridData,
        },

        session: {
            reset: async () => {
                resetAllVariables();
                movementMultiplier = 1;
                setTextDisplayScale(1);
            },
            // Re-arm a complete playable session from the current content.
            rebuild: async () => {
                setBeginGameStatus(true);
                setGameState(getGameVisibleActive());
                await startGame();
                setBeginGameStatus(false);
                setClickPoint({ x: null, y: null });
            },
            setLocale: (locale) => handleLanguageChange(locale),
            pause: pauseGameLoop,
            resume: resumeGameLoop,
            // Any future randomness routes through the seeded generator so a
            // scenario plus seed always reproduces the same run.
            setRandom: (random) => { Math.random = random; },
        },

        world: {
            initialSpawn: () => getInitialStartGridReference(),
            playerCell,
            pathCells: () => entityPaths.player?.path ?? [],
            teleport: async ({ roomId, x, y }) => {
                setTransitioningNow(false);
                setTransitioningToAnotherScreen(false);
                clearMovementIntent();
                setNextScreenId(roomId);
                setPreviousScreenId(getCurrentScreenId());
                setCurrentScreenId(roomId);
                changeCanvasBg(getNavigationData()[roomId].bgUrl);
                initializePlayerPosition(x, y);
                applyPlayerSpeed(roomId);
                setForegroundGridProcessed(false);
                const canvas = getElements().canvas;
                if (canvas) canvas.style.pointerEvents = 'auto';
            },
            completePath: () => {
                const path = entityPaths.player?.path ?? [];
                const destination = path[path.length - 1];
                if (!destination) return { completed: false, reason: 'no-active-path' };
                clearMovementIntent();
                initializePlayerPosition(destination.x, destination.y);
                return { completed: true, destination };
            },
            cancelPath: () => {
                const remaining = entityPaths.player?.path?.length ?? 0;
                clearMovementIntent();
                return { cancelled: remaining > 0, remaining };
            },
            setMovementSpeed: (multiplier) => {
                movementMultiplier = multiplier;
                applyPlayerSpeed(getCurrentScreenId());
                return multiplier;
            },
            setOverlays: (options) => {
                overlayOptions = createOverlayOptions(options);
                return overlayOptions;
            },
            overlays: () => ({ ...overlayOptions }),
            toggleLegacyGridView: () => {
                setDrawGrid(!getDrawGrid());
                return getDrawGrid();
            },
            toggleNonPlayerAnimation: () => {
                setNonPlayerAnimationFunctionalityActive(!getNonPlayerAnimationFunctionalityActive());
                return getNonPlayerAnimationFunctionalityActive();
            },
        },

        inventory: {
            list: inventoryList,
            set: (value) => {
                setPlayerInventory(value);
                drawInventory(0);
            },
            add: (objectId, quantity = 1) => {
                addItemToInventory(objectId, quantity);
                drawInventory(0);
            },
            remove: (objectId, quantity = 1) => {
                handleInventoryAdjustment(objectId, quantity, false);
                drawInventory(0);
            },
        },

        commands: {
            selectVerb: (verbId) => setVerbButtonConstructionStatus(verbId),
            selectTarget: (targetId) => {
                const verbId = getSelectedVerbId();
                const intent = createCommandIntent({ verbId, primaryTargetId: targetId });
                const command = constructCommand(intent);
                performCommand(command, Boolean(inventoryList().find((item) => item.objectId === targetId)));
                return { status: 'ready', intent };
            },
            cancel: () => setVerbButtonConstructionStatus(null),
            current: () => ({ verbId: getSelectedVerbId() }),
        },

        dialogue: {
            listGraphs: () => [{ id: libraryDialogueGraph.id, npcId: 'npcLibrarian', startNodeId: libraryDialogueGraph.startNodeId }],
            describeNode: (npcId, nodeId = null) => {
                if (npcId !== 'npcLibrarian') return { npcId, reason: 'no-explicit-graph-yet' };
                const state = createDialogueState(libraryDialogueGraph);
                const node = getDialogueNode(libraryDialogueGraph, { ...state, nodeId: nodeId ?? state.nodeId }, getQuestFacts());
                return {
                    graphId: libraryDialogueGraph.id,
                    nodeId: node.id,
                    type: node.type,
                    speaker: node.speaker ?? null,
                    nextNodeId: node.nextNodeId ?? null,
                    actions: (node.actions ?? []).map((action) => action.id),
                    choices: (node.choices ?? []).map((choice) => ({
                        id: choice.id,
                        textKey: choice.textKey,
                        nextNodeId: choice.nextNodeId,
                        conditions: choice.conditions ?? [],
                    })),
                };
            },
            start: async (npcId) => dialogueEngine('verbTalkTo', npcId, true),
            setTextSpeed: (multiplier) => setTextDisplayScale(multiplier),
            skipLine: () => skipCurrentText(),
            reset: () => ({ reset: true }),
            active: () => ({
                displayingText: getIsDisplayingText(),
                queued: getTextQueue().length,
                mode: getGameStateVariable(),
            }),
        },

        saves: {
            save: async (key) => {
                pendingSaves += 1;
                try {
                    await repository.save(key, gameStore.getSnapshot());
                    return { saved: true, key, fixtureId: saveFixtureId };
                } catch (error) {
                    return { saved: false, key, error: error.message };
                } finally {
                    pendingSaves -= 1;
                }
            },
            load: async (key) => {
                try {
                    const state = await repository.load(key);
                    return state ? { loaded: true, key, roomId: state.location.currentRoomId } : { loaded: false, key, reason: 'not-found' };
                } catch (error) {
                    return { loaded: false, key, error: error.message };
                }
            },
            setFixture: (fixtureId) => { saveFixtureId = fixtureId; return fixtureId; },
            setStorageFailure: (enabled) => { storageFailureEnabled = enabled === true; return storageFailureEnabled; },
            isDirty: () => pendingSaves > 0,
        },

        presentation: {
            setViewport: (presetId) => {
                const preset = VIEWPORT_PRESETS[presetId];
                if (!preset) return null;
                document.documentElement.style.setProperty('--debug-viewport-width', `${preset.width}px`);
                document.documentElement.dataset.debugViewport = presetId;
                window.dispatchEvent(new Event('resize'));
                return preset;
            },
            setAccessibilityOption: (optionId, value) => {
                if (!(optionId in accessibility)) return null;
                accessibility[optionId] = value === 'toggle' ? !accessibility[optionId] : value === true;
                document.documentElement.dataset[`debug${optionId[0].toUpperCase()}${optionId.slice(1)}`] = String(accessibility[optionId]);
                return accessibility[optionId];
            },
            setInputMode: (modeId) => {
                inputMode = modeId;
                document.documentElement.dataset.debugInputMode = modeId;
                return modeId;
            },
            setMissingKey: (sectionAndKey) => {
                missingKeySimulation = sectionAndKey;
                document.documentElement.dataset.debugMissingKey = sectionAndKey ?? '';
                return missingKeySimulation;
            },
        },

        assets: {
            readiness: () => ({
                simulatedFailures: [...failingAssets],
                decodedBackground: Boolean(getNavigationData()?.[getCurrentScreenId()]?.bgUrl),
                documentState: document.readyState,
            }),
            setFailure: (assetUrl) => {
                failingAssets.add(assetUrl);
                return assetUrl;
            },
        },

        diagnostics: {
            frameTime: () => getFrameTimeSummary(),
            errors: () => capturedErrors,
            openValueWindow: () => {
                openDebugWindow();
                return true;
            },
        },
    });

    // Additive overlays: drawn after the frame, never clearing it.
    setDebugOverlayRenderer((context) => {
        const grid = getAllGridData()?.[getCurrentScreenId()];
        if (!grid) return;
        drawDebugOverlays(context, {
            grid,
            cellWidth: getCanvasCellWidth(),
            cellHeight: getCanvasCellHeight(),
            options: overlayOptions,
            path: entityPaths.player?.path ?? [],
            playerCell: playerCell(),
        });
    });

    const panel = createDebugPanel(controller);
    if (config.showPanel !== false) panel.toggle(true);

    // The narrow, versioned surface automated tests drive. It exposes IDs and
    // readiness, never mutable internal object references.
    window.__GAME_TEST__ = Object.freeze({
        apiVersion: controller.apiVersion,
        scenarioSchemaVersion: controller.scenarioSchemaVersion,
        stateSchemaVersion: controller.stateSchemaVersion,
        listScenarios: () => controller.listScenarios(),
        validateScenario: (scenarioId, overrides) => controller.validateScenarioFixture(scenarioId, overrides),
        loadScenario: (scenarioId, overrides) => controller.loadScenario(scenarioId, overrides),
        reloadScenario: (overrides) => controller.reloadScenario(overrides),
        waitForIdle: (options) => controller.waitForIdle(options),
        idlePending: () => controller.idleProbes(),
        inspectSummary: () => controller.inspectSummary(),
        validateState: () => controller.validateState(),
        checksum: () => controller.checksum(),
        setSeed: (seed) => controller.setSeed(seed),
        teleport: (target) => controller.teleport(target),
        listRooms: () => controller.listRooms(),
        listAnchors: (roomId) => controller.listAnchors(roomId),
        completePath: () => controller.completePath(),
        cancelPath: () => controller.cancelPath(),
        setMovementSpeed: (speedId) => controller.setMovementSpeed(speedId),
        setOverlays: (options) => controller.setOverlays(options),
        toggleLegacyGridView: () => controller.toggleLegacyGridView(),
        toggleNonPlayerAnimation: () => controller.toggleNonPlayerAnimation(),
        addItem: (objectId, quantity) => controller.addItem(objectId, quantity),
        removeItem: (objectId, quantity) => controller.removeItem(objectId, quantity),
        applyInventoryPreset: (presetId) => controller.applyInventoryPreset(presetId),
        listInventory: () => controller.listInventory(),
        resetEntity: (entityId) => controller.resetEntity(entityId),
        selectVerb: (verbId) => controller.selectVerb(verbId),
        selectTarget: (targetId) => controller.selectTarget(targetId),
        cancelCommand: () => controller.cancelCommand(),
        describeDialogue: (npcId, nodeId) => controller.describeDialogue(npcId, nodeId),
        setTextSpeed: (speedId) => controller.setTextSpeed(speedId),
        skipDialogueLine: () => controller.skipDialogueLine(),
        resetConversation: (npcId) => controller.resetConversation(npcId),
        inspectNpc: (npcId) => controller.inspectNpc(npcId),
        listFacts: () => controller.listFacts(),
        explainAction: (actionId) => controller.explainAction(actionId),
        explainGate: (roomId, exitId) => controller.explainGate(roomId, exitId),
        applyMilestone: (actionId) => controller.applyMilestone(actionId),
        criticalPathFrontier: () => controller.criticalPathFrontier(),
        factConflicts: () => controller.factConflicts(),
        journal: () => controller.journal(),
        objectives: () => controller.objectives(),
        explainObjectiveForAction: (actionId) => controller.explainObjectiveForAction(actionId),
        explainGateObjective: (gateFactId) => controller.explainGateObjective(gateFactId),
        softLocks: () => controller.softLocks(),
        chapterSummary: () => controller.chapterSummary(),
        recordedChoices: () => controller.recordedChoices(),
        // Actions that ran while the canonical graph said their prerequisites
        // were unmet. Empty is the healthy state; see BUG-036.
        progressDiagnostics: () => getProgressDiagnostics(),
        clearProgressDiagnostics: () => clearProgressDiagnostics(),
        saveScenario: (key) => controller.saveScenario(key),
        loadSavedScenario: (key) => controller.loadSavedScenario(key),
        selectMigrationFixture: (fixtureId) => controller.selectMigrationFixture(fixtureId),
        simulateStorageFailure: (enabled) => controller.simulateStorageFailure(enabled),
        simulateAssetFailure: (assetUrl) => controller.simulateAssetFailure(assetUrl),
        simulateMissingKey: (key) => controller.simulateMissingKey(key),
        setLocale: (locale) => controller.setLocale(locale),
        setViewportPreset: (presetId) => controller.setViewportPreset(presetId),
        setAccessibilityOption: (optionId, value) => controller.setAccessibilityOption(optionId, value),
        setInputMode: (modeId) => controller.setInputMode(modeId),
        pause: () => controller.pause(),
        resume: () => controller.resume(),
        newSession: () => controller.newSession(),
        exportSnapshot: () => controller.exportSnapshot(),
        importSnapshot: (snapshot) => controller.importSnapshot(snapshot),
        exportReproductionBundle: () => controller.exportReproductionBundle(),
        log: () => controller.log(),
        openLegacyDebugWindow: () => controller.openLegacyDebugWindow(),
        panel: Object.freeze({
            toggle: (force) => panel.toggle(force),
            isVisible: () => panel.isVisible(),
        }),
    });

    if (typeof config.seed === 'number') controller.setSeed(config.seed);

    document.body.dataset.debugTools = 'enabled';

    installed = Object.freeze({
        controller,
        panel,
        dispose() {
            window.removeEventListener('error', onWindowError);
            window.removeEventListener('unhandledrejection', onRejection);
            setDebugOverlayRenderer(null);
            panel.dispose();
            delete window.__GAME_TEST__;
            delete document.body.dataset.debugTools;
            installed = null;
        },
    });
    return installed;
}

export function isDebugToolsInstalled() {
    return installed !== null;
}

export function isSimulationRunning() {
    return isGameLoopActive();
}
