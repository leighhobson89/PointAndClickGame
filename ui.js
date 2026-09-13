import {
    getForegroundsData, 
    setForegroundsData, 
    setContentContract,
    setMapRoomData,
    setPristineContent,
    setForegroundGridProcessed,
    setCurrentScreenHasForegroundItems,
    getForegroundsList,
    getArrayOfGameImages,
    setAnimationInProgress,
    setPreAnimationGridState,
    getDrawGrid,
    urlForegroundData,
    urlContentContract,
    urlMapRoomData,
    setInitialScreenId,
    setScrollingActive,
    getScrollingActive,
    setScrollDirection,
    getScrollDirection,
    setScrollPositionX,
    getScrollPositionX,
    getBeginGameStatus,
    getCanExitDialogueAtThisPoint,
    getCanvasCellHeight,
    getCanvasCellWidth,
    getCurrentExitOptionText,
    getCurrentlyMovingToAction,
    getCurrentScreenId,
    getCurrentScrollIndexDialogue,
    getCurrentStartIndexInventory,
    getCurrentXposNpc,
    getCurrentYposNpc,
    getCustomMouseCursor,
    getDialogueData,
    getDialogueOptionsScrollReserve,
    getDialogueScrollCount,
    getElements,
    getExitNumberToTransitionTo,
    getGameStateVariable,
    getGameVisibleActive,
    getGridData,
    getGridSizeX,
    getGridSizeY,
    getGridTargetX,
    getGridTargetY,
    getHoverCell,
    getHoveringInterestingObjectOrExit,
    getInitialScreenId,
    getLanguage,
    getLanguageSelected,
    getLocalization,
    getMaxTexTDisplayWidth,
    getMenuState,
    getNavigationData,
    getNpcData,
    getObjectData,
    getObjectToBeUsedWithSecondItem,
    getPlayerInventory,
    getPlayerObject,
    getPreviousGameState,
    getSecondItemAlreadyHovered,
    getSlotsPerRowInInventory,
    getTextDisplayDuration,
    getTextQueue,
    getTransitioningToAnotherScreen,
    getTransitioningToDialogueState,
    getUpcomingAction,
    getSelectedVerbId,
    getVerbButtonConstructionStatus,
    getWaitingForSecondItem,
    getWalkSpeedPlayer,
    resetAllVariables,
    setBeginGameStatus,
    setCurrentlyMovingToAction,
    setCurrentScreenId,
    setCurrentScrollIndexDialogue,
    setCurrentStartIndexInventory,
    setCurrentXposNpc,
    setCurrentYposNpc,
    setCustomMouseCursor,
    setDialoguesData,
    setDialogueScrollCount,
    setDisplayText,
    setElements,
    setGridData,
    setHoverCell,
    setHoveringInterestingObjectOrExit,
    setIsDisplayingText,
    setLanguage,
    setLanguageSelected,
    setNavigationData,
    setNpcsData,
    setObjectsData,
    setObjectToBeUsedWithSecondItem,
    setPreviousGameState,
    setPreviousScreenId,
    setSecondItemAlreadyHovered,
    setTextQueue,
    setTransitioningNow,
    setUpcomingAction,
    setVerbButtonConstructionStatus,
    setWaitingForSecondItem,
    urlDialogueData,
    urlNavigationData,
    urlNpcsData,
    urlObjectsData,
    urlWalkableJSONS,
    INITIAL_GAME_ID_NORMAL,
    PRE_INITIAL_GAME_BACKGROUND,
    INITIAL_GAME_BACKGROUND_URL_NORMAL,
    getOriginalGridState,
    getPreAnimationGridState,
    getOriginalValueInCellWhereObjectPlaced,
    getOriginalValueInCellWhereObjectPlacedNew,
    getAllGridData,
    setNextScreenId,
    setClickPoint,
    setPlayerObject,
    setCurrentForegroundImage,
    getContentContract,
    getQuestFacts,
    subscribeToGameState
} from "./constantsAndGlobalVars.js";
import {
    reattachDialogueOptionListeners,
    updateDialogueDisplay,
} from "./dialogue.js";
import {
    drawDebugGrid,
    handleRoomTransition,
    swapBackgroundOnRoomTransition,
    initializePlayerPosition,
    processLeftClickPoint,
    processRightClickPoint,
    setGameState,
    startGame,
    initializeEntityPathsObject
} from "./game.js";
import {
    constructCommand,
    performCommand
} from "./handleCommands.js";
import {
    initLocalization,
    localize
} from "./localization.js";
import {
    continueFromLocalSave,
    copySaveStringToClipBoard,
    describeResumableSave,
    hasResumableSave,
    initialiseSaveSystem,
    loadGame,
    loadGameOption,
    noteNewGameStarted,
    noteRoomChangeForAutosave,
    saveGame,
} from "./saveLoadGame.js";

import { playCutsceneGameIntro } from './events.js';
import {
    hasExplicitCoordinates,
    loadJsonResource,
    validateGridData,
    validateNavigationData,
    validateObjectRoot,
    validatePropertyRoot,
    waitForTransition,
} from './src/application/readiness.mjs';
import { assertValidContentBundle } from './src/content/validate-content.mjs';
import { createJournalPanel } from './src/adapters/journal-panel.mjs';
import { createCommandIntent, toLocalisationKey } from './src/domain/commands/commands.mjs';
import { pointerToWorld, resolveCellTarget, worldToGrid } from './src/domain/navigation/navigation.mjs';

let textTimer;
let activeTextResolve = null;
let assetsReadyPromise = Promise.resolve();
let localizationReadyPromise = Promise.resolve();
let debugToolsSession = null;

export function bootApplication() {
    setElements();

    initialiseSaveSystem();
    refreshContinueAvailability();

    getElements().inventoryUpArrow.classList.add("arrow-disabled");
    getElements().inventoryDownArrow.classList.add("arrow-disabled");

    assetsReadyPromise = preloadImages(getArrayOfGameImages());

    getElements().customCursor.classList.add("d-none");
    getElements().customCursor.style.transform = "translate(-50%, -50%)";

    getElements().newGameMenuButton.addEventListener("click", async (event) => {
        const playIntro = true; //DEBUG: true to play the begin game intro sequence

        clearFatalLoadError();
        setNewGameLoading(true);
        try {
            await ensureGameDataLoaded();
        } catch (error) {
            showFatalLoadError(error);
            return;
        } finally {
            setNewGameLoading(false);
        }

        initializeEntityPathsObject();

        setInitialScreenId(INITIAL_GAME_ID_NORMAL);
        setCurrentScreenId(getInitialScreenId());

        if (playIntro) {
            changeCanvasBg(PRE_INITIAL_GAME_BACKGROUND);
        } else {
            setClickPoint({x: null, y: null});
            changeCanvasBg(INITIAL_GAME_BACKGROUND_URL_NORMAL);
        }

        getElements().customCursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
        resetAllVariables(); //TODO RESET ALL VARIABLES WHEN USER STARTS NEW GAME
        setBeginGameStatus(true);
        updateInteractionInfo(
            localize("interactionWalkTo", getLanguage(), "verbsActionsInteraction"),
            false,
        );
        disableActivateButton(
            getElements().resumeGameMenuButton,
            "active",
            "btn-primary",
        );
        disableActivateButton(
            getElements().saveGameButton,
            "active",
            "btn-primary",
        );
        setGameState(getGameVisibleActive());
        await startGame();

        setPlayerObject('speed', getWalkSpeedPlayer() * getNavigationData()[getCurrentScreenId()].scalingPlayerSpeed);
        setPlayerObject('baselineSpeedForRoom', getPlayerObject().speed);

        noteNewGameStarted();

        if (playIntro) {
            await playCutsceneGameIntro();
        } else {
            setBeginGameStatus(false);
        }
    });

    getElements().continueGameMenuButton.addEventListener("click", async (event) => {
        if (getElements().continueGameMenuButton.classList.contains("disabled")) return;

        clearFatalLoadError();
        setNewGameLoading(true);
        try {
            // The stored save carries progress, not content, so the shipped
            // bundle has to be loaded and validated before it can be applied.
            await ensureGameDataLoaded();
        } catch (error) {
            showFatalLoadError(error);
            return;
        } finally {
            setNewGameLoading(false);
        }

        getElements().customCursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
        const continued = await continueFromLocalSave();
        if (!continued) {
            refreshContinueAvailability();
            return;
        }

        disableActivateButton(getElements().resumeGameMenuButton, "active", "btn-primary");
        disableActivateButton(getElements().saveGameButton, "active", "btn-primary");
    });

    getElements().resumeGameMenuButton.addEventListener("click", (event) => {
        getElements().customCursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;

        if (getPreviousGameState() !== null) {
            setGameState(getPreviousGameState());
            setPreviousGameState(null);
        }
    });

    getElements().returnToMenuButton.addEventListener("click", () => {
        setPreviousGameState(getGameStateVariable());
        setGameState(getMenuState());
        refreshContinueAvailability();
    });

    getElements().btnEnglish.addEventListener("click", () => {
        beginLanguageChange("en");
        setGameState(getMenuState());
    });

    getElements().btnSpanish.addEventListener("click", () => {
        beginLanguageChange("es");
        setGameState(getMenuState());
    });

    getElements().btnGerman.addEventListener("click", () => {
        beginLanguageChange("de");
        setGameState(getMenuState());
    });

    getElements().btnItalian.addEventListener("click", () => {
        beginLanguageChange("it");
        setGameState(getMenuState());
    });

    getElements().btnFrench.addEventListener("click", () => {
        beginLanguageChange("fr");
        setGameState(getMenuState());
    });

    getElements().saveGameButton.addEventListener("click", function() {
        getElements().overlay.classList.remove("d-none");
        saveGame(true);
    });

    getElements().loadGameButton.addEventListener("click", function() {
        getElements().overlay.classList.remove("d-none");
        loadGameOption();
    });

    getElements().copyButtonSavePopup.addEventListener("click", function() {
        copySaveStringToClipBoard();
    });

    getElements().closeButtonSavePopup.addEventListener("click", function() {
        getElements().saveLoadPopup.classList.add("d-none");
        getElements().overlay.classList.add("d-none");
    });

    getElements().loadStringButton.addEventListener("click", async function() {
        try {
            // An import can arrive from a cold menu, so the shipped content the
            // save patches has to be present before the save is applied.
            await ensureGameDataLoaded();
            await loadGame(true);
            getElements().saveLoadPopup.classList.add("d-none");
            document.getElementById("overlay").classList.add("d-none");
            disableActivateButton(getElements().resumeGameMenuButton, "active", "btn-primary");
            disableActivateButton(getElements().saveGameButton, "active", "btn-primary");
        } catch (error) {
            // The save system has already reported the failure on the status
            // line; the running session was never touched.
            console.error("Error loading game:", error);
        }
    });

    //------------------------------------------------------------------------------------------------------
    // VERB EVENT LISTENERS
    //------------------------------------------------------------------------------------------------------

    getElements().btnLookAt.addEventListener("click", function() {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(
                localize(
                    getVerbButtonConstructionStatus(),
                    getLanguage(),
                    "verbsActionsInteraction",
                ),
                false,
            );
        }
    });

    getElements().btnPickUp.addEventListener("click", function() {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(
                localize(
                    getVerbButtonConstructionStatus(),
                    getLanguage(),
                    "verbsActionsInteraction",
                ),
                false,
            );
        }
    });

    getElements().btnUse.addEventListener("click", function() {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(
                localize(
                    getVerbButtonConstructionStatus(),
                    getLanguage(),
                    "verbsActionsInteraction",
                ),
                false,
            );
        }
    });

    getElements().btnOpen.addEventListener("click", function() {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(
                localize(
                    getVerbButtonConstructionStatus(),
                    getLanguage(),
                    "verbsActionsInteraction",
                ),
                false,
            );
        }
    });

    getElements().btnClose.addEventListener("click", function() {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(
                localize(
                    getVerbButtonConstructionStatus(),
                    getLanguage(),
                    "verbsActionsInteraction",
                ),
                false,
            );
        }
    });

    getElements().btnPush.addEventListener("click", function() {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(
                localize(
                    getVerbButtonConstructionStatus(),
                    getLanguage(),
                    "verbsActionsInteraction",
                ),
                false,
            );
        }
    });

    getElements().btnPull.addEventListener("click", function() {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(
                localize(
                    getVerbButtonConstructionStatus(),
                    getLanguage(),
                    "verbsActionsInteraction",
                ),
                false,
            );
        }
    });

    getElements().btnTalkTo.addEventListener("click", function() {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(
                localize(
                    getVerbButtonConstructionStatus(),
                    getLanguage(),
                    "verbsActionsInteraction",
                ),
                false,
            );
        }
    });

    getElements().btnGive.addEventListener("click", function() {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(
                localize(
                    getVerbButtonConstructionStatus(),
                    getLanguage(),
                    "verbsActionsInteraction",
                ),
                false,
            );
        }
    });

    //------------------------------------------------------------------------------------------------------
    // INVENTORY EVENT LISTENERS
    //------------------------------------------------------------------------------------------------------

    // Event listeners for the up and down arrows
    getElements().inventoryUpArrow.addEventListener(
        "click",
        handleInventoryUpArrowClick,
    );
    getElements().inventoryDownArrow.addEventListener(
        "click",
        handleInventoryDownArrowClick,
    );

    // Convert NodeList to Array
    const inventoryItems = Array.from(
        document.querySelectorAll(".inventory-item"),
    );

    // Inventory presentation reads stable semantic IDs. Translated copy is never
    // parsed to reconstruct command meaning.
    inventoryItems.forEach(function(item) {
        item.addEventListener("mouseover", function() {
            const imgElement = item.querySelector("img");
            const objectId = imgElement?.alt;
            if (!objectId || objectId === 'empty') return;
            item.dataset.targetId = objectId;
            const verbId = getSelectedVerbId() === 'walkTo' || getSelectedVerbId() === 'pickUp' ? 'lookAt' : getSelectedVerbId();
            const verbText = localize(toLocalisationKey(verbId), getLanguage(), 'verbsActionsInteraction');
            const targetName = getObjectData().objects[objectId].name[getLanguage()];
            if (getWaitingForSecondItem()) {
                const primaryName = getObjectData().objects[getObjectToBeUsedWithSecondItem()].name[getLanguage()];
                const connector = localize(verbId === 'give' ? 'interactionTo' : 'interactionWith', getLanguage(), 'verbsActionsInteraction');
                updateInteractionInfo(`${verbText} ${primaryName} ${connector} ${targetName}`, false);
                setSecondItemAlreadyHovered(objectId);
            } else {
                updateInteractionInfo(`${verbText} ${targetName}`, false);
            }
        });
    });

    // Adding click event listener for each inventory item
    inventoryItems.some(function(item) {
        item.addEventListener("click", function() {
            const objectId = item.querySelector('img')?.alt;
            if (!objectId || objectId === 'empty') return;
            let verbId = getSelectedVerbId();
            if (verbId === 'walkTo' || verbId === 'pickUp') verbId = 'lookAt';
            const intent = createCommandIntent({
                verbId,
                primaryTargetId: getWaitingForSecondItem() ? getObjectToBeUsedWithSecondItem() : objectId,
                secondaryTargetId: getWaitingForSecondItem() ? objectId : null,
            });
            setUpcomingAction(intent);
            const command = constructCommand(intent);
            performCommand(command, true);
        });

        return false; // Continue iterating
    });

    //--------------------------------------------------------------------------------------------------------------
    // DIALOGUE EVENT LISTENERS
    //--------------------------------------------------------------------------------------------------------------

    getElements().dialogueDownArrow.addEventListener("click", scrollDown);
    getElements().dialogueUpArrow.addEventListener("click", scrollUp);

    // Initialize canvas event listener and set the initial game state
    initializeCanvasEventListener();
    setGameState(getMenuState());
    beginLanguageChange(getLanguageSelected());

    // Development-only debug and test controls. Nothing is created here: the
    // panel, overlays, and __GAME_TEST__ surface all live behind
    // installDebugTools(), which refuses to run unless the served build
    // advertises the capability *and* the session explicitly asks for it.
    installDebugTools().catch((error) => console.warn('Debug tools unavailable:', error.message));
}

/**
 * Enablement has two independent gates, both required:
 *  1. the served build advertises `/debug-capability` (a development server or
 *     an explicitly enabled desktop build); and
 *  2. this session asked for the tools with `?debug=1` or a test bootstrap
 *     that set `window.__GAME_TEST_CONFIG__.enabled`.
 *
 * A query string alone can therefore never expose debug tools in production.
 */
export async function installDebugTools() {
    if (debugToolsSession) return debugToolsSession;

    const testConfig = typeof window !== 'undefined' ? window.__GAME_TEST_CONFIG__ : null;
    const requested = testConfig?.enabled === true
        || new URLSearchParams(window.location.search).get('debug') === '1';
    if (!requested) return null;

    let capability;
    try {
        const response = await fetch('./debug-capability', { cache: 'no-store' });
        capability = response.ok ? await response.json() : { enabled: false };
    } catch (error) {
        capability = { enabled: false, reason: error.message };
    }
    if (capability.enabled !== true) {
        console.warn('Debug tools requested but this build does not provide them.');
        return null;
    }

    const { installDebugTools: install } = await import('./debugTools.js');
    debugToolsSession = await install({ config: testConfig ?? {} });
    return debugToolsSession;
}

document.addEventListener("DOMContentLoaded", bootApplication, { once: true });

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//DEBUG END/////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const handleInventoryUpArrowClick = () => {
    if (getGameStateVariable() === getGameVisibleActive()) {
        if (getCurrentStartIndexInventory() > 0) {
            setCurrentStartIndexInventory(
                getCurrentStartIndexInventory() - getSlotsPerRowInInventory(),
            );
            drawInventory(getCurrentStartIndexInventory());
        }
    }
};

const handleInventoryDownArrowClick = () => {
    if (getGameStateVariable() === getGameVisibleActive()) {
        const inventory = getPlayerInventory();
        const totalSlots = Object.keys(inventory).length;

        if (
            getCurrentStartIndexInventory() + getSlotsPerRowInInventory() * 2 <
            totalSlots
        ) {
            setCurrentStartIndexInventory(
                getCurrentStartIndexInventory() + getSlotsPerRowInInventory(),
            );
            drawInventory(getCurrentStartIndexInventory());
        }
    }
};

export function initializeCanvasEventListener() {
    const canvas = getElements().canvas;

    canvas.addEventListener("click", handleCanvasLeftClick);
    canvas.addEventListener("contextmenu", handleCanvasRightClick);
    canvas.addEventListener("mouseenter", enableCustomCursor);
    canvas.addEventListener("mouseleave", disableCustomCursor);
    canvas.addEventListener("mousemove", trackCursor);
}

function trackCursor(event) {
    getElements().customCursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
}

function enableCustomCursor() {
    const canvas = getElements().canvas;
    canvas.style.cursor = "none";
    getElements().customCursor.classList.remove("d-none");
}

function disableCustomCursor() {
    const canvas = getElements().canvas;
    canvas.style.cursor = "pointer";
    getElements().customCursor.classList.add("d-none");
}

export function handleMouseMove(event, ctx) {
    const canvas = getElements().canvas;
    const rect = canvas.getBoundingClientRect();
    const gridData = getGridData();
    const world = pointerToWorld(event, rect, { width: canvas.width, height: canvas.height });
    const pointer = worldToGrid(world, {
        cellWidth: getCanvasCellWidth(), cellHeight: getCanvasCellHeight(), width: getGridSizeX(), height: getGridSizeY(),
    });
    const hoverX = pointer.x;
    const hoverY = pointer.y;

    if (pointer.inBounds) {
        if (
            getGameStateVariable() === getGameVisibleActive() &&
            !getTransitioningToDialogueState()
        ) {
            const cellValue =
                gridData.gridData[hoverY] && gridData.gridData[hoverY][hoverX];
            if (getHoverCell().x !== hoverX || getHoverCell().y !== hoverY) {
                setHoverCell(hoverX, hoverY);
                drawDebugGrid(getDrawGrid());
            }
            const target = resolveCellTarget(cellValue, {
                roomId: getCurrentScreenId(), navigation: getNavigationData(), objects: getObjectData().objects, npcs: getNpcData().npcs,
            });
            const interesting = Boolean(target?.canHover);
            setHoveringInterestingObjectOrExit(interesting);
            if (!getCurrentlyMovingToAction()) {
                const verbId = getSelectedVerbId();
                const verbText = localize(toLocalisationKey(verbId), getLanguage(), 'verbsActionsInteraction');
                const targetName = returnHoveredInterestingObjectOrExitName(cellValue)[0];
                if (getWaitingForSecondItem() && interesting && targetName) {
                    const primaryName = getObjectData().objects[getObjectToBeUsedWithSecondItem()]?.name[getLanguage()] ?? getObjectToBeUsedWithSecondItem();
                    const connector = localize(verbId === 'give' ? 'interactionTo' : 'interactionWith', getLanguage(), 'verbsActionsInteraction');
                    updateInteractionInfo(`${verbText} ${primaryName} ${connector} ${targetName}`, false);
                    setSecondItemAlreadyHovered(target.id);
                } else if (!getWaitingForSecondItem()) {
                    updateInteractionInfo(interesting && targetName ? `${verbText} ${targetName}` : verbText, false);
                }
            }
            setCustomMouseCursor(getCustomMouseCursor(interesting ? 'hoveringInteresting' : 'normal'));
        }
    }
}

export function returnHoveredInterestingObjectOrExitName(cellValue) {
    if (
        cellValue &&
        (cellValue.startsWith("e") ||
            cellValue.startsWith("o") ||
            cellValue.startsWith("c"))
    ) {
        const currentScreenId = getCurrentScreenId();
        const navigationData = getNavigationData();
        const objectData = getObjectData();
        const npcData = getNpcData();
        const language = getLanguage();

        // If it is an exit
        if (navigationData[currentScreenId] && cellValue.startsWith("e")) {
            const exitId =
                navigationData[currentScreenId].exits[cellValue].connectsTo;

            if (navigationData[exitId]) {
                return [navigationData[exitId][language], true];
            }
        }

        // If it is an object
        if (navigationData[currentScreenId] && cellValue.startsWith("o")) {
            const objectId = cellValue.substring(1);
            const objectName = objectData.objects[objectId]?.name[language];
            const canHover = objectData.objects[objectId].interactable.canHover;

            return [objectName, canHover];
        }

        // If it is an npc
        if (navigationData[currentScreenId] && cellValue.startsWith("c")) {
            const npcId = cellValue.substring(1);
            const npcName = npcData.npcs[npcId]?.name[language];
            const canHover = npcData.npcs[npcId]?.interactable.canHover;

            return [npcName, canHover];
        }
    }

    return [null, null];
}

function handleCanvasLeftClick(event) {
    console.log(getGameStateVariable());
    console.log(getGameVisibleActive());
    if (getGameStateVariable() === getGameVisibleActive()) {

        const canvas = getElements().canvas;
        const rect = canvas.getBoundingClientRect();
        const world = pointerToWorld(event, rect, { width: canvas.width, height: canvas.height });
        const clickX = world.x;
        const clickY = world.y;

        console.log(`Left Click Coordinates: (${clickX}, ${clickY})`);

        const clickPoint = {
            x: clickX,
            y: clickY
        };

        processLeftClickPoint(clickPoint, true);
    }
}

function handleCanvasRightClick(event) {
    event.preventDefault();

    if (getGameStateVariable() === getGameVisibleActive()) {

        const canvas = getElements().canvas;
        const rect = canvas.getBoundingClientRect();
        const world = pointerToWorld(event, rect, { width: canvas.width, height: canvas.height });
        const clickX = world.x;
        const clickY = world.y;

        console.log(`Right Click Coordinates: (${clickX}, ${clickY})`);

        const clickPoint = {
            x: clickX,
            y: clickY
        };

        processRightClickPoint(clickPoint, true);
    }
}

async function setElementsLanguageText() {
    getElements().menuTitle.innerHTML = `<h2>${localize("menuTitle", getLanguage(), "ui")}</h2>`;
    getElements().newGameMenuButton.innerHTML = `${localize("newGame", getLanguage(), "ui")}`;
    getElements().continueGameMenuButton.innerHTML = `${localize("continueGame", getLanguage(), "ui")}`;
    getElements().resumeGameMenuButton.innerHTML = `${localize("resumeGame", getLanguage(), "ui")}`;
    getElements().loadGameButton.innerHTML = `${localize("loadGame", getLanguage(), "ui")}`;
    getElements().saveGameButton.innerHTML = `${localize("saveGame", getLanguage(), "ui")}`;
    getElements().loadStringButton.innerHTML = `${localize("loadButton", getLanguage(), "ui")}`;
    getElements().openJournalButton.innerHTML = `${localize("openButton", getLanguage(), "journal")}`;
    getJournalPanel()?.refreshIfOpen();
    refreshContinueAvailability();
}

// --- journal ---------------------------------------------------------------

let journalPanel = null;
let journalUnsubscribe = null;

export function getJournalPanel() {
    return journalPanel;
}

/** Stable summary of the recorded facts, used to detect real progress. */
function factsSignature() {
    const facts = getQuestFacts() ?? {};
    return Object.keys(facts).filter((factId) => facts[factId] === true).sort().join('|');
}

/**
 * Build the journal once per session. The panel reads canonical facts on every
 * render, so it needs no subscription of its own beyond a refresh whenever the
 * player changes something while it is open.
 */
export function initialiseJournalPanel() {
    if (journalPanel) return journalPanel;
    const elements = getElements();
    if (!elements.journalPanel) return null;

    journalPanel = createJournalPanel({
        elements: {
            panel: elements.journalPanel,
            body: elements.journalBody,
            title: elements.journalTitle,
            progress: elements.journalProgress,
            openButton: elements.openJournalButton,
            closeButton: elements.closeJournalButton,
        },
        translate: (key, tokens = {}) => localize(key, getLanguage(), 'journal', tokens),
        getContract: () => getContentContract(),
        getFacts: () => getQuestFacts(),
    });
    // Facts are the journal's only input, so one store subscription keeps an
    // open journal correct no matter which puzzle recorded the change. The
    // store also publishes per-frame movement, so the signature check is not
    // an optimisation: re-rendering on every notification would rebuild the
    // hint controls under the player's cursor between press and release.
    let lastFactsSignature = factsSignature();
    journalUnsubscribe = subscribeToGameState(() => {
        const signature = factsSignature();
        if (signature === lastFactsSignature) return;
        lastFactsSignature = signature;
        journalPanel?.refreshIfOpen();
    });
    return journalPanel;
}

export function disposeJournalPanel() {
    journalUnsubscribe?.();
    journalUnsubscribe = null;
    journalPanel?.dispose();
    journalPanel = null;
}

export function refreshJournal() {
    journalPanel?.refreshIfOpen();
}

export async function handleLanguageChange(languageCode) {
    setLanguageSelected(languageCode);
    await setupLanguageAndLocalization();
    setElementsLanguageText();
}

async function setupLanguageAndLocalization() {
    setLanguage(getLanguageSelected());
    await initLocalization(getLanguage());
}

export function disableActivateButton(button, action, activeClass) {
    switch (action) {
        case "active":
            button.classList.remove("disabled");
            button.classList.add(activeClass);
            break;
        case "disable":
            button.classList.remove(activeClass);
            button.classList.add("disabled");
            break;
    }
}

export async function animateTransitionAndChangeBackground(optionalNewScreenId, optionalStartX, optionalStartY) {
    getElements().overlayCanvas.style.display = "block";
    getElements().customCursor.classList.add("d-none");

    requestAnimationFrame(() => {
        getElements().overlayCanvas.classList.add("visible");
        getElements().overlayCanvas.classList.remove("hidden");
    });

    await waitForTransition(getElements().overlayCanvas);
    const newScreenId = optionalNewScreenId || handleRoomTransition();
    const exit = "e" + getExitNumberToTransitionTo();

    // The departing room's exit record holds the start and final positions for
    // the arrival walk. Read them before the room identity moves on, because
    // the identity now moves as soon as the background does.
    const departingScreenId = getCurrentScreenId();
    const departingExit = getNavigationData()[departingScreenId]?.exits?.[exit];

    if (optionalNewScreenId) {
        setNextScreenId(optionalNewScreenId);
        swapBackgroundOnRoomTransition(newScreenId, true);
    }

    // BUG-033: the canvas already shows the new room by this point, so the room
    // identity has to change with it. Committing it after the fade-back left
    // getCurrentScreenId() pointing at the room the player had just left for
    // the whole fade, which drew that room's foreground items over the new
    // background. The overlay is still opaque here, so the swap is unseen.
    setPreviousScreenId(departingScreenId);
    setCurrentScreenId(newScreenId);
    setPlayerObject('speed', getWalkSpeedPlayer() * getNavigationData()[getCurrentScreenId()].scalingPlayerSpeed);
    setPlayerObject('baselineSpeedForRoom', getPlayerObject().speed);
    setForegroundGridProcessed(false);

    let startPosition;

    if (hasExplicitCoordinates(optionalStartX, optionalStartY)) {
        startPosition = { "x": optionalStartX, "y": optionalStartY };
    } else {
        startPosition = departingExit?.startPosition;
    }

    if (!startPosition) throw new Error(`No transition start position is defined for ${departingScreenId} ${exit}`);
    const startX = startPosition.x;
    const startY = startPosition.y;

    initializePlayerPosition(startX, startY);
    setDisplayText("", null);
    await fadeBackToGameInTransition();

    setAnimationInProgress(false);
    setPreAnimationGridState('clear', null, null, null);

    if (!hasExplicitCoordinates(optionalStartX, optionalStartY)) {
        setTransitioningNow(true);
        getElements().canvas.style.pointerEvents = "none";
        processLeftClickPoint({
            x: departingExit.finalPosition.x,
            y: departingExit.finalPosition.y,
        }, false);
    }

    noteRoomChangeForAutosave();
}

function beginLanguageChange(languageCode) {
    localizationReadyPromise = handleLanguageChange(languageCode);
    localizationReadyPromise.catch(showFatalLoadError);
    return localizationReadyPromise;
}

export async function fadeBackToGameInTransition() {
    getElements().overlayCanvas.classList.add("hidden");
    getElements().overlayCanvas.classList.remove("visible");

    requestAnimationFrame(() => {
        getElements().overlayCanvas.classList.remove("visible");
        getElements().overlayCanvas.classList.add("hidden");
    });

    await waitForTransition(getElements().overlayCanvas);
    getElements().overlayCanvas.classList.add("hidden");
    getElements().overlayCanvas.style.display = "none";
}

export function updateInteractionInfo(text, action) {
    if (action) {
        setCurrentlyMovingToAction(true);
    }
    const interactionInfo = getElements().interactionInfo;
    if (interactionInfo) {
        interactionInfo.textContent = text;
        if (action) {
            interactionInfo.style.color = "rgb(255, 255, 0)";
            interactionInfo.style.fontWeight = "bold";
        } else {
            interactionInfo.style.color = "rgb(255, 255, 255)";
            interactionInfo.style.fontWeight = "normal";
        }
    } else {
        console.error("Interaction info element not found");
    }
}

export function drawInventory(startIndex) {
    const inventory = getPlayerInventory();
    const inventoryDivs = document.querySelectorAll(".inventory-item");

    inventoryDivs.forEach((div, index) => {
        div.innerHTML = "";

        const slotIndex = startIndex + index;
        const slotKey = `slot${slotIndex + 1}`;
        const inventorySlot = inventory[slotKey];

        if (inventorySlot) {
            const objectId = inventorySlot.object;
            const objectData = getObjectData().objects[objectId];
            const imageUrl = objectData.inventoryUrl;

            const imgTag = `<img src="${imageUrl}" alt="${objectId}" style="width: 85%; height: 85%;" class="inventory-img" />`;

            div.innerHTML = imgTag;
            div.dataset.targetId = objectId;

            const number = inventorySlot.quantity || null;
            let numberSpan;

            if (number !== null) {
                if (number > 1) {
                    numberSpan = `<span class="inventory-number">${number}</span>`;
                    div.classList.add("show-triangle");
                } else {
                    numberSpan = `<span class="inventory-number"></span>`;
                    div.classList.remove("show-triangle");
                }

                div.innerHTML += numberSpan;
            }
        } else {
            div.innerHTML = `<img src="./resources/objects/images/blank.png" alt="empty" style="width: 50%; height: 50%;" class="inventory-img" />`;
            delete div.dataset.targetId;
            div.classList.remove("show-triangle");
        }
    });

        const upArrow = getElements().inventoryUpArrow;
        const downArrow = getElements().inventoryDownArrow;
        const slotsPerRow = getSlotsPerRowInInventory();
        const totalSlots = Object.keys(inventory).length;
    
        if (startIndex > 0) {
            upArrow.classList.remove("arrow-disabled");
        } else {
            upArrow.classList.add("arrow-disabled");
        }
    
        if (startIndex + slotsPerRow * 2 < totalSlots) {
            downArrow.classList.remove("arrow-disabled");
        } else {
            downArrow.classList.add("arrow-disabled");
        }
}

export function drawTextOnCanvas(
    text,
    color,
    xPos = null,
    yPos = null,
    currentSpeaker,
) {
    if (!text) return;

    const canvas = getElements().canvas;
    const ctx = canvas.getContext("2d");

    const maxWidth = getMaxTexTDisplayWidth();
    const lineHeight = parseFloat(ctx.font) * 1.2;

    if (currentSpeaker === "player" || !currentSpeaker) {
        const player = getPlayerObject();

        if (!xPos) xPos = player.xPos;
        if (!yPos) {
            const halfCanvasHeight = canvas.height / 2;

            yPos =
                player.yPos + player.height < halfCanvasHeight ?
                player.yPos + player.height + 165 :
                player.yPos - 10;
        }
    } else {
        xPos = getCurrentXposNpc();
        yPos = getCurrentYposNpc();
    }

    if (yPos + 100 > canvas.height) {
        yPos = canvas.height - 100;
    }

    if (yPos - 190 < 0) {
        yPos += 50;
    }

    if (xPos - maxWidth / 2 < 0) {
        xPos = maxWidth / 2 + 10;
    }
    if (xPos + maxWidth / 2 > canvas.width) {
        xPos = canvas.width - maxWidth / 2 - 10;
    }

    const {
        lines,
        maxLineWidth
    } = wrapTextAndPosition(
        text,
        ctx,
        maxWidth,
        xPos,
        yPos,
        lineHeight,
    );

    const rectWidth = maxLineWidth + 10;
    const rectHeight = lines.length * lineHeight;

    const adjustedY = yPos - rectHeight - (lineHeight * 0.75);
    const cornerRadius = 20;

    ctx.fillStyle = 'rgb(0, 0, 0, 0.5)';
    drawRoundedRect(ctx, xPos - rectWidth / 2, adjustedY, rectWidth, rectHeight, cornerRadius, color);
    ctx.fill();

    ctx.strokeStyle = `${color}`;
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, xPos - rectWidth / 2, adjustedY, rectWidth, rectHeight, cornerRadius, color);
    ctx.stroke();

    drawWrappedText(lines, ctx, xPos, yPos, lineHeight, color);
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function wrapTextAndPosition(text, ctx, maxWidth) {
    const lines = [];

    if (!text.includes(" ")) {
        const metrics = ctx.measureText(text);
        const maxLineWidth = metrics.width;
        lines.push(text);
        return {
            lines,
            maxLineWidth
        };
    }

    const words = text.split(" ");

    let currentLine = "";
    let maxLineWidth = 0;

    words.forEach((word) => {
        const testLine = currentLine + word + " ";
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && currentLine) {
            lines.push(currentLine.trim());
            const currentLineWidth = ctx.measureText(currentLine.trim()).width;
            maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
            currentLine = word + " ";
        } else {
            currentLine = testLine;
        }
    });

    if (currentLine) {
        lines.push(currentLine.trim());
        const currentLineWidth = ctx.measureText(currentLine.trim()).width;
        maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
    }

    return {
        lines,
        maxLineWidth
    };
}

function drawWrappedText(lines, ctx, x, startY, lineHeight, color) {
    let adjustedY = startY - lines.length * lineHeight;

    lines.forEach((line) => {
        ctx.font = "2.6em sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "baseline";
        ctx.lineWidth = 1.5;
        ctx.fillStyle = color;
        ctx.fillText(line, x, adjustedY);
        ctx.strokeStyle = "black";
        ctx.strokeText(line, x, adjustedY);

        adjustedY += lineHeight;
    });
}

function getContrastingColor(rgbString) {

    const rgbValues = rgbString.match(/\d+/g).map(Number);
    if (rgbValues.length !== 3) {
        throw new Error("Invalid RGB string. Please provide a valid string like rgb(200,200,34).");
    }

    const [r, g, b] = rgbValues;

    const complementaryColor = {
        r: 255 - r,
        g: 255 - g,
        b: 255 - b
    };

    return `rgb(${complementaryColor.r}, ${complementaryColor.g}, ${complementaryColor.b})`;
}

function processQueue() {
    let textQueue = getTextQueue();

    if (textQueue.length === 0) {
        activeTextResolve = null;
        setIsDisplayingText(false);
        return;
    }

    setIsDisplayingText(true);

    const {
        text,
        color,
        resolve,
        xPos,
        yPos
    } = textQueue.shift();
    setCurrentXposNpc(xPos);
    setCurrentYposNpc(yPos);
    setDisplayText(text, color);
    console.log("Displaying text:", text);

    if (textTimer) {
        clearTimeout(textTimer);
    }

    activeTextResolve = resolve ?? null;

    textTimer = setTimeout(() => {
        textTimer = null;
        finishActiveLine();
    }, getTextDisplayDuration());
}

function finishActiveLine() {
    setDisplayText("", null);
    const resolve = activeTextResolve;
    activeTextResolve = null;
    if (resolve) {
        console.log("Promise resolved!");
        resolve();
    }
    processQueue();
}

/**
 * Development-only: finish the line being displayed immediately through the
 * same completion path a timer would take, so queued promises still resolve.
 */
export function skipCurrentText() {
    if (!textTimer && !activeTextResolve) return { skipped: false, reason: 'no-active-line' };
    clearTimeout(textTimer);
    textTimer = null;
    finishActiveLine();
    return { skipped: true, remaining: getTextQueue().length };
}

export function showText(text, color, xPos, yPos) {
    return new Promise((resolve) => {
        let textQueue = getTextQueue();
        textQueue.push({
            text,
            color,
            xPos,
            yPos,
            resolve
        });
        setTextQueue(textQueue);

        processQueue();
    });
}

/**
 * Load and validate the shipped content bundle once. Continue and import both
 * need it, and both can be reached from a cold menu where New Game has never
 * run, so the work is shared rather than repeated per entry point.
 */
export async function ensureGameDataLoaded() {
    await Promise.all([
        loadGameData(
            urlWalkableJSONS,
            urlNavigationData,
            urlObjectsData,
            urlDialogueData,
            urlNpcsData,
            urlForegroundData,
        ),
        assetsReadyPromise,
        localizationReadyPromise,
    ]);
}

export async function loadGameData(
    gridUrl,
    screenNavUrl,
    objectsUrl,
    dialogueUrl,
    npcUrl,
    gridForegroundsUrl // New URL for the foreground grid data
) {
    const [gridData, navData, objectsData, dialogueData, npcData, foregroundData, contract, mapRoom, localizationData] = await Promise.all([
        loadJsonResource(fetch, gridUrl, 'Walk-grid data', validateGridData),
        loadJsonResource(fetch, screenNavUrl, 'Navigation data', validateNavigationData),
        loadJsonResource(fetch, objectsUrl, 'Object data', validatePropertyRoot('objects')),
        loadJsonResource(fetch, dialogueUrl, 'Dialogue data', validatePropertyRoot('dialogue')),
        loadJsonResource(fetch, npcUrl, 'NPC data', validatePropertyRoot('npcs')),
        loadJsonResource(fetch, gridForegroundsUrl, 'Foreground-grid data', validateObjectRoot),
        loadJsonResource(fetch, urlContentContract, 'Content contract', validateObjectRoot),
        loadJsonResource(fetch, urlMapRoomData, 'Map room data', validateObjectRoot),
        loadJsonResource(fetch, 'localization.json', 'Localisation data', validateObjectRoot),
    ]);

    const validated = assertValidContentBundle({
        contract,
        grids: gridData,
        navigation: navData,
        objects: objectsData,
        dialogue: dialogueData,
        npcs: npcData,
        foregrounds: foregroundData,
        localization: localizationData,
        mapRoom,
    });

    // Keep the bundle exactly as shipped before the running game places
    // entities or a puzzle rewrites anything. Saves are a patch against this.
    setPristineContent({
        grids: validated.grids,
        navigation: navData,
        objects: objectsData,
        npcs: npcData,
        dialogue: dialogueData,
        foregrounds: foregroundData,
    });

    // Commit only after every resource has loaded and passed its startup contract.
    setGridData(validated.grids);
    setNavigationData(navData);
    setObjectsData(objectsData);
    setDialoguesData(dialogueData);
    setNpcsData(npcData);
    setForegroundsData(foregroundData);
    setContentContract(contract);
    setMapRoomData(mapRoom);

    return { gridData: validated.grids, navData, objectsData, dialogueData, npcData, foregroundData, contract, mapRoom };
}

export function resetSecondItemState() {
    setWaitingForSecondItem(false);
    setObjectToBeUsedWithSecondItem(null);
    setSecondItemAlreadyHovered(null);
}

function adjustColor(color, reduction) {
    const rgbValues = color.match(/\d+/g).map(Number);
    const adjustedRgbValues = rgbValues.map((value) =>
        Math.max(0, value - reduction),
    );
    return `rgb(${adjustedRgbValues[0]}, ${adjustedRgbValues[1]}, ${adjustedRgbValues[2]})`;
}

export function addDialogueRow(dialogueOptionText, choiceId = null) {
    const dialogueSection = getElements().dialogueSection;

    const newRow = document.createElement("div");
    newRow.classList.add("row", "dialogueRow");
    if (choiceId) newRow.dataset.choiceId = choiceId;

    const newCol = document.createElement("div");
    newCol.classList.add("col-12");

    newCol.textContent = dialogueOptionText;
    newRow.appendChild(newCol);
    dialogueSection.appendChild(newRow);
}

export function removeDialogueRow(rowNumber) {
    const dialogueSection = getElements().dialogueSection;

    if (rowNumber === 0) {
        dialogueSection.innerHTML = "";
        return;
    }

    if (rowNumber > 0 && rowNumber <= dialogueSection.children.length) {
        const index = rowNumber - 1;
        dialogueSection.removeChild(dialogueSection.children[index]);
    } else {
        console.error("Invalid row number cannot remove check code");
    }
}

export function showDialogueArrows() {
    const upArrow = getElements().dialogueUpArrow;
    const downArrow = getElements().dialogueDownArrow;

    if (upArrow) {
        upArrow.classList.remove("arrow-disabled");
    }

    if (downArrow) {
        downArrow.classList.remove("arrow-disabled");
    }
}

export function hideDialogueArrows() {
    const upArrow = getElements().dialogueUpArrow;
    const downArrow = getElements().dialogueDownArrow;

    if (upArrow) {
        upArrow.classList.add("arrow-disabled");
    }

    if (downArrow) {
        downArrow.classList.add("arrow-disabled");
    }
}

async function scrollDown() {
    const currentScrollIndex = getCurrentScrollIndexDialogue();
    const scrollReserve = getDialogueOptionsScrollReserve();
    const canExit = getCanExitDialogueAtThisPoint();

    if (canExit) {
        if (currentScrollIndex + 3 < scrollReserve.length) {
            setCurrentScrollIndexDialogue(currentScrollIndex + 1);
            updateDialogueDisplay(getCurrentExitOptionText());
        }
    } else {
        if (currentScrollIndex + 4 < scrollReserve.length) {
            setCurrentScrollIndexDialogue(currentScrollIndex + 1);
            updateDialogueDisplay(getCurrentExitOptionText());
        }
    }

    setDialogueScrollCount(getDialogueScrollCount() + 1);
    reattachDialogueOptionListeners();
}

async function scrollUp() {
    const currentScrollIndex = getCurrentScrollIndexDialogue();
    if (currentScrollIndex > 0) {
        setCurrentScrollIndexDialogue(currentScrollIndex - 1);
        updateDialogueDisplay(getCurrentExitOptionText());
    }

    setDialogueScrollCount(getDialogueScrollCount() - 1);
    reattachDialogueOptionListeners();
}

export function setDynamicBackgroundWithOffset(
    canvas,
    imageUrl,
    xOffset,
    yOffset,
    screenTilesWidebgImg,
) {
    // add offset as in background position +/- offsetX * getCanvasCellWidth()
    const backgroundImage = new Image();
    backgroundImage.src = imageUrl;
    // Data/image readiness is awaited before play; update the selected URL
    // immediately so an older image's late onload cannot overwrite a newer room.
    canvas.style.backgroundImage = `url(${imageUrl})`;

    // BUG-033: whether a room has foreground items is a property of the room's
    // background file, so it is decided here, synchronously, from the URL being
    // applied. Deciding it inside onload left the previous room's answer in
    // place for every frame drawn before the new image finished decoding.
    const bgFilename = imageUrl.split('/').pop().split('\\').pop().replace(/['")]/g, "");
    setCurrentScreenHasForegroundItems(getForegroundsList().includes(bgFilename));

    backgroundImage.onload = function() {
        const imgWidth = backgroundImage.width;
        const imgHeight = backgroundImage.height;

        const canvasWidth = canvas.clientWidth;
        const canvasHeight = canvas.clientHeight;

        const scaleRatio = canvasHeight / imgHeight;
        const scaledHeight = imgHeight * scaleRatio;
        const scaledWidth = imgWidth * scaleRatio;

        const finalWidth = canvasWidth * screenTilesWidebgImg;
        const finalHeight = scaledHeight;

        canvas.style.backgroundSize = `${finalWidth}px ${finalHeight}px`;
    };

    backgroundImage.onerror = function() {
        console.error(`Failed to load image: ${imageUrl}`);
    };
}

export function changeCanvasBg(url) {
    const canvas = getElements().canvas;
    const screenTilesWidebgImg = getNavigationData()[getCurrentScreenId()].screenTilesWidebgImg;
    setDynamicBackgroundWithOffset(canvas, url, 0, 0, screenTilesWidebgImg);
}

export function handleEdgeScroll() {
    const player = getPlayerObject();
    const canvas = getElements().canvas;
    const canvasWidthInCells = 80;
    const proximityThreshold = 3;
    const screenData = getNavigationData()[getCurrentScreenId()];
    const screenTilesWide = screenData.screenTilesWidebgImg;
    const imgWidth = screenTilesWide * getCanvasCellWidth() * canvasWidthInCells;
    const playerWalkSpeed = getWalkSpeedPlayer();
    const scrollSpeed = playerWalkSpeed * 1.5;

    const playerGridX = Math.floor(player.xPos / getCanvasCellWidth());

    //console.log("Player Grid X:", playerGridX);

    const isNearLeftEdge = playerGridX <= proximityThreshold;
    const isNearRightEdge =
        playerGridX >= canvasWidthInCells - 1 - proximityThreshold;

    const targetX = getGridTargetX();
    const targetY = getGridTargetY();

    //console.log("Target X:", targetX, "Target Y:", targetY);

    const isTargetingLeftEdge = targetX < 3 && targetY >= 0 && targetY < 60;
    const isTargetingRightEdge = targetX > 77 && targetY >= 0 && targetY < 60;

    // console.log("Is Near Left Edge:", isNearLeftEdge);
    // console.log("Is Near Right Edge:", isNearRightEdge);
    // console.log("Is Targeting Left Edge:", isTargetingLeftEdge);
    // console.log("Is Targeting Right Edge:", isTargetingRightEdge);

    // Check if we're scrolling to the left or right and set scroll direction
    if (!getTransitioningToAnotherScreen() && screenTilesWide > 1) {
        let bgPosition = getScrollPositionX() || 0;

        // console.log("Background Position X:", bgPosition);

        if (isNearLeftEdge && isTargetingLeftEdge) {
            const maxScrollLeft = 0; // Leftmost scroll limit
            // console.log("Attempting to scroll left...");
            if (bgPosition < maxScrollLeft) {
                setScrollingActive(true);
                setScrollDirection(-1); // Scroll to the left
                // console.log("Scrolling Left: Active");
            }
        } else if (isNearRightEdge && isTargetingRightEdge) {
            const maxScrollRight = -(imgWidth / 2); // Rightmost scroll limit (50% image width)
            // console.log("Attempting to scroll right...");
            if (bgPosition > maxScrollRight) {
                setScrollingActive(true);
                setScrollDirection(1); // Scroll to the right
                // console.log("Scrolling Right: Active");
            }
        }
    }

    // Continue scrolling while the flag is active
    if (getScrollingActive()) {
        let bgPosition = getScrollPositionX() || 0;

        if (getScrollDirection() === -1) {
            // Scrolling left
            const maxScrollLeft = 0;
            bgPosition = Math.min(bgPosition + scrollSpeed, maxScrollLeft);
            // console.log("Scrolling left... New Position X:", bgPosition);

            if (bgPosition <= maxScrollLeft) {
                setScrollingActive(false); // Stop scrolling when the boundary is reached
                // console.log("Stopped scrolling left, reached boundary.");
            }
        } else if (getScrollDirection() === 1) {
            // Scrolling right
            const maxScrollRight = -(imgWidth / 2);
            bgPosition = Math.max(bgPosition - scrollSpeed, maxScrollRight);
            // console.log("Scrolling right... New Position X:", bgPosition);

            if (bgPosition >= maxScrollRight) {
                setScrollingActive(false); // Stop scrolling when the boundary is reached
                // console.log("Stopped scrolling right, reached boundary.");
            }
        }

        canvas.style.backgroundPositionX = `${bgPosition}px`;
        setScrollPositionX(bgPosition);
    }
}

async function preloadImages(imageUrls) {
    const promises = imageUrls.map((url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = resolve;
            img.onerror = () => reject(new Error(`Required image failed to load: ${url}`));
        });
    });
    await Promise.all(promises);
    console.log("All images preloaded");
}

function setNewGameLoading(isLoading) {
    const button = getElements().newGameMenuButton;
    button.disabled = isLoading;
    button.setAttribute('aria-busy', String(isLoading));
}

/**
 * Enable Continue only when a stored save can actually be read, and publish
 * what it holds as stable IDs on the detail element so a test or an assistive
 * reader can see the room and the time without parsing translated copy.
 */
export function refreshContinueAvailability() {
    const button = getElements().continueGameMenuButton;
    const detail = getElements().continueGameDetail;
    if (!button) return null;

    const describe = hasResumableSave() ? describeResumableSave() : null;
    disableActivateButton(button, describe ? "active" : "disable", "btn-primary");
    button.dataset.hasSave = String(Boolean(describe));

    if (detail) {
        detail.dataset.continueRoom = describe?.roomId ?? '';
        detail.dataset.continueSavedAt = describe?.savedAt ?? '';
        detail.dataset.continueFacts = String(describe?.factIds.length ?? 0);
        detail.textContent = describe
            ? `${localize('continueDetail', getLanguage(), 'ui')} ${getNavigationData()?.[describe.roomId]?.[getLanguage()] ?? describe.roomId}`
            : '';
    }

    return describe;
}

function clearFatalLoadError() {
    const fatalError = document.getElementById('fatalLoadError');
    fatalError.textContent = '';
    fatalError.classList.add('d-none');
}

function showFatalLoadError(error) {
    console.error('Unable to start the game:', error);
    const fatalError = document.getElementById('fatalLoadError');
    fatalError.textContent = `The game could not start. ${error.message || error}`;
    fatalError.classList.remove('d-none');
    setGameState(getMenuState());
}

// Foreground images are drawn every frame. Building a fresh Image each time
// allocated one per frame and could not draw until that copy had decoded, so a
// newly entered room showed nothing where its foreground belonged. One decoded
// image per URL is kept instead.
const foregroundImageCache = new Map();

function foregroundImageFor(url) {
    let image = foregroundImageCache.get(url);
    if (!image) {
        image = new Image();
        image.onerror = () => console.error("Failed to load foreground image:", url);
        image.src = url;
        foregroundImageCache.set(url, image);
    }
    return image;
}

export function drawForegroundImageForCurrentScreen() {
    const canvas = getElements().canvas;
    const ctx = canvas.getContext("2d");
    const screenId = `foregrounds/${getCurrentScreenId()}.png`;
    const imagesArray = getArrayOfGameImages();
    const foregroundUrl = imagesArray.find((url) => url.includes(screenId));

    if (!foregroundUrl) {
        setCurrentForegroundImage(null);
        return;
    }

    const foregroundImage = foregroundImageFor(foregroundUrl);
    setCurrentForegroundImage(foregroundImage);

    if (foregroundImage.complete && foregroundImage.naturalWidth > 0) {
        ctx.drawImage(foregroundImage, 0, 0, canvas.width, canvas.height);
    }
}

let debugWindow;

export function openDebugWindow() {
    // Check if the debug window is already open
    if (debugWindow && !debugWindow.closed) {
        // If it's open, focus on it
        debugWindow.focus();
        return; // Exit the function
    }

    // Get the current window dimensions and position
    const currentWindowHeight = window.outerHeight; // Height of the current window
    const currentWindowWidth = window.outerWidth;   // Width of the current window
    const windowX = window.screenX || window.screen.left; // X position of the current window
    const windowY = window.screenY || window.screen.top;  // Y position of the current window

    // Calculate the position for the new window
    const newWindowX = windowX; // Same X position
    const newWindowY = windowY + currentWindowHeight; // Position directly below the current window

    // Open the new window with specified dimensions and position
    debugWindow = window.open(
        '',
        '_blank',
        `width=${currentWindowWidth},height=${window.screen.height - newWindowY},top=${newWindowY},left=${newWindowX},scrollbars=no,resizable=yes`
    );

    // Set the title and initial HTML structure for the new window
    debugWindow.document.write(`
        <html>
        <head>
            <title>Debug Values</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    margin: 0; /* Remove default margin */
                }
                .debug-container {
                    width: 100%; /* Adjust width to fill the window */
                    max-height: 90vh; /* Limit height to 90% of the viewport height */
                    overflow-y: auto; /* Allow vertical scrolling within the container */
                    background-color: #f8f8f8;
                    border-radius: 8px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    padding: 10px;
                    font-size: 0.7em;
                }
                .debug-val {
                    margin-bottom: 10px;
                    padding: 5px;
                    background-color: #e0e0e0;
                    border-radius: 4px;
                }
                label {
                    font-weight: bold;
                    display: block;
                    margin-bottom: 5px;
                }
            </style>
        </head>
        <body>
            <div id="debugContainer" class="debug-container">
                <label for="debugVal1">getPreAnimationState()</label>
                <div id="debugVal1" class="debug-val">Debug Value 1</div>

                <label for="debugVal2">getOriginalGrid()</label>
                <div id="debugVal2" class="debug-val">Debug Value 2</div>

                <label for="debugVal3">getOriginalValueInCellWhereObjectPlaced()</label>
                <div id="debugVal3" class="debug-val">Debug Value 3</div>

                <label for="debugVal4">getOriginalValueInCellWhereObjectPlacedNew()</label>
                <div id="debugVal4" class="debug-val">Debug Value 4</div>

                <label for="debugVal5">currentGrid()</label>
                <div id="debugVal5" class="debug-val">Debug Value 5</div>
            </div>
        </body>
        </html>
    `);

    // Finalize the document in the new window
    debugWindow.document.close();
}

export function updateDebugValues() {
    // The grid serialisation below is expensive. Normal play never opens the
    // debug window, so leave the frame budget alone unless it is actually open.
    if (!debugWindow || debugWindow.closed) return;

    // Fetch dynamic values from relevant functions
    const preAnimationGridState = JSON.stringify(getPreAnimationGridState());
    const originalGrid = JSON.stringify(getOriginalGridState()[getCurrentScreenId()]);
    const originalValueInCell = JSON.stringify(getOriginalValueInCellWhereObjectPlaced());
    const newOriginalValueInCell = JSON.stringify(getOriginalValueInCellWhereObjectPlacedNew());
    const currentGridState = JSON.stringify(getAllGridData()[getCurrentScreenId()]);

    // Create the values object dynamically
    const newValues = {
        debugVal1: `${preAnimationGridState}`, // Assign the preAnimationGridState
        debugVal2: `${originalGrid}`,          // Assign the original grid value
        debugVal3: `${originalValueInCell}`,   // Assign the original value in cell where object was placed
        debugVal4: `${newOriginalValueInCell}`,// Assign the new value in cell where object was placed
        debugVal5: `${currentGridState}`       // Assign the current grid state
    };

    // Update each value in the debug window if it exists and is open
    if (debugWindow && !debugWindow.closed) {
        debugWindow.document.getElementById('debugVal1').textContent = newValues.debugVal1;
        debugWindow.document.getElementById('debugVal2').textContent = newValues.debugVal2;
        debugWindow.document.getElementById('debugVal3').textContent = newValues.debugVal3;
        debugWindow.document.getElementById('debugVal4').textContent = newValues.debugVal4;
        debugWindow.document.getElementById('debugVal5').textContent = newValues.debugVal5;
    }
}
