import {
    getArrayOfGameImages,
    setAnimationInProgress,
    setPreAnimationGridState,
    getDrawGrid,
    setDrawGrid,
    getInitialBackgroundUrl,
    setInitialBackgroundUrl,
    setInitialScreenId,
    urlNpcsDataDebug,
    urlObjectsDataDebug,
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
    INITIAL_GAME_ID_DEBUG,
    PRE_INITIAL_GAME_BACKGROUND,
    INITIAL_GAME_BACKGROUND_URL_NORMAL,
    INITIAL_GAME_BACKGROUND_URL_DEBUG,
    getOriginalGridState,
    getPreAnimationGridState,
    getOriginalValueInCellWhereObjectPlaced,
    getOriginalValueInCellWhereObjectPlacedNew,
    getAllGridData,
    getNonPlayerAnimationFunctionalityActive,
    setNonPlayerAnimationFunctionalityActive,
    setNextScreenId
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
    addItemToInventory,
    constructCommand,
    performCommand
} from "./handleCommands.js";
import {
    initLocalization,
    localize
} from "./localization.js";
import {
    copySaveStringToClipBoard,
    loadGame,
    loadGameOption,
    saveGame,
} from "./saveLoadGame.js";

import { playCutsceneGameIntro } from './events.js';

let textTimer;

document.addEventListener("DOMContentLoaded", () => {
    setElements();
    
    getElements().inventoryUpArrow.classList.add("arrow-disabled");
    getElements().inventoryDownArrow.classList.add("arrow-disabled");

    async function preLoadGameImages(arrayOfImages) {
        await preloadImages(arrayOfImages);
        console.log("Images preloaded, initializing game...");
    }

    preLoadGameImages(getArrayOfGameImages());

    getElements().customCursor.classList.add("d-none");
    getElements().customCursor.style.transform = "translate(-50%, -50%)";

    getElements().newGameMenuButton.addEventListener("click", async (event) => {
        const playIntro = true; //DEBUG: true to play the begin game intro sequence

        await loadGameData(
            urlWalkableJSONS,
            urlNavigationData,
            urlObjectsData,
            urlDialogueData,
            urlNpcsData,
        );

        initializeEntityPathsObject();

        setInitialScreenId(INITIAL_GAME_ID_NORMAL);
        setCurrentScreenId(getInitialScreenId());

        if (playIntro) {
            setInitialBackgroundUrl(PRE_INITIAL_GAME_BACKGROUND);
        } else {
            setInitialBackgroundUrl(INITIAL_GAME_BACKGROUND_URL_NORMAL);
        }
        
        setInitialBackgroundImage();

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

        if (playIntro) {
            await playCutsceneGameIntro();
        } else {
            setBeginGameStatus(false);
        }
    });

    getElements().debugRoomMenuButton.addEventListener("click", async (event) => {
        await loadGameData(
            urlWalkableJSONS,
            urlNavigationData,
            urlObjectsDataDebug,
            urlDialogueData,
            urlNpcsDataDebug,
        );
        setInitialScreenId(INITIAL_GAME_ID_DEBUG);
        setCurrentScreenId(getInitialScreenId());
        setInitialBackgroundUrl(INITIAL_GAME_BACKGROUND_URL_DEBUG);
        setInitialBackgroundImage();

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
        console.log(getCurrentScreenId());
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
    });

    getElements().btnEnglish.addEventListener("click", () => {
        handleLanguageChange("en");
        setGameState(getMenuState());
    });

    getElements().btnSpanish.addEventListener("click", () => {
        handleLanguageChange("es");
        setGameState(getMenuState());
    });

    getElements().btnGerman.addEventListener("click", () => {
        handleLanguageChange("de");
        setGameState(getMenuState());
    });

    getElements().btnItalian.addEventListener("click", () => {
        handleLanguageChange("it");
        setGameState(getMenuState());
    });

    getElements().btnFrench.addEventListener("click", () => {
        handleLanguageChange("fr");
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

    getElements().loadStringButton.addEventListener("click", function() {
        loadGame(true)
            .then(() => {
                setElements();
                getElements().saveLoadPopup.classList.add("d-none");
                document.getElementById("overlay").classList.add("d-none");
                setGameState(getMenuState());
            })
            .catch((error) => {
                console.error("Error loading game:", error);
            });
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

    // Adding mouseover event listener for each inventory item
    inventoryItems.forEach(function(item) {
        item.addEventListener("mouseover", function() {
            const imgElement = item.querySelector("img");
            const interactionText = getElements().interactionInfo.textContent;

            if (imgElement) {
                const objectId = imgElement.alt;
                if (objectId !== "empty") {
                    const objectOrNpcName =
                        getObjectData().objects[objectId].name[getLanguage()];
                    console.log(objectOrNpcName);

                    // Extract the verbs
                    const verbLookAt = localize(
                        "interactionLookAt",
                        getLanguage(),
                        "verbsActionsInteraction",
                    );
                    const verbWalkTo = localize(
                        "interactionWalkTo",
                        getLanguage(),
                        "verbsActionsInteraction",
                    );
                    const verbWalking = localize(
                        "interactionWalking",
                        getLanguage(),
                        "verbsActionsInteraction",
                    );
                    const verbTalkTo = localize(
                        "interactionTalkTo",
                        getLanguage(),
                        "verbsActionsInteraction",
                    );
                    const verbPickUp = localize(
                        "interactionPickUp",
                        getLanguage(),
                        "verbsActionsInteraction",
                    );

                    if (interactionText.includes(verbWalkTo) || interactionText.includes(verbPickUp)) {
                        setUpcomingAction(verbLookAt);
                        if (
                            getGameStateVariable() === getGameVisibleActive() &&
                            !getTransitioningToDialogueState()
                        ) {
                            updateInteractionInfo(
                                getUpcomingAction() + " " + objectOrNpcName,
                                false,
                            );
                            if (interactionText.includes(verbPickUp)) {
                                setVerbButtonConstructionStatus(null);
                                setUpcomingAction(null);
                            }
                        }
                    } else if (
                        !getWaitingForSecondItem() &&
                        interactionText !== verbWalking &&
                        interactionText !== verbWalkTo
                    ) {
                        let words = interactionText.split(" ");
                        let verbKey = null;

                        const twoWordVerbs = [verbLookAt, verbTalkTo, verbPickUp];
                        const firstTwoWords = words.slice(0, 2).join(" ");

                        //if (firstTwoWords === verbPickUp) return; // Prevent duplicate items in inventory using pickup

                        if (twoWordVerbs.includes(firstTwoWords)) {
                            const verbsInteraction =
                                getLocalization()[getLanguage()]["verbsActionsInteraction"];
                            for (const [key, value] of Object.entries(verbsInteraction)) {
                                if (value === firstTwoWords) {
                                    verbKey = key;
                                    break;
                                }
                            }
                        } else {
                            const verbsInteraction =
                                getLocalization()[getLanguage()]["verbsActionsInteraction"];
                            for (const [key, value] of Object.entries(verbsInteraction)) {
                                if (value === words[0]) {
                                    verbKey = key;
                                    break;
                                }
                            }
                        }
                        if (
                            getGameStateVariable() === getGameVisibleActive() &&
                            !getTransitioningToDialogueState()
                        ) {
                            updateInteractionInfo(
                                localize(verbKey, getLanguage(), "verbsActionsInteraction") +
                                " " +
                                objectOrNpcName,
                                false,
                            );
                        }
                    }

                    if (getWaitingForSecondItem()) {
                        if (!getSecondItemAlreadyHovered()) {
                            if (
                                objectOrNpcName !==
                                getObjectData().objects[getObjectToBeUsedWithSecondItem()].name[
                                    getLanguage()
                                ]
                            ) {
                                updateInteractionInfo(
                                    interactionText + " " + objectOrNpcName,
                                    false,
                                );
                                setSecondItemAlreadyHovered(objectOrNpcName);
                            }
                        } else if (
                            objectOrNpcName !==
                            getObjectData().objects[getObjectToBeUsedWithSecondItem()].name[
                                getLanguage()
                            ]
                        ) {
                            let updatedText = interactionText.replace(
                                new RegExp(getSecondItemAlreadyHovered()),
                                objectOrNpcName,
                            );
                            updateInteractionInfo(updatedText, false);
                            setSecondItemAlreadyHovered(objectOrNpcName);
                        } else if (
                            objectOrNpcName ===
                            getObjectData().objects[getObjectToBeUsedWithSecondItem()].name[
                                getLanguage()
                            ]
                        ) {
                            return;
                        }
                    }
                }
            }
        });
    });

    // Adding click event listener for each inventory item
    inventoryItems.some(function(item) {
        item.addEventListener("click", function() {
            const interactionText = getElements().interactionInfo.textContent;
            if (!getSecondItemAlreadyHovered()) {
                setUpcomingAction(interactionText);
            }

            const command = constructCommand(getUpcomingAction(), true, true);
            console.log("command to perform: " + command);
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
    handleLanguageChange(getLanguageSelected());

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //DEBUG WHEEL START/////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    const container = document.getElementById('wheelMenuContainer');

    const closeButton = document.getElementById('closeButton');
    const wheelMenuContainer = document.getElementById('wheelMenuContainer');

    // Close the wheel menu container when the close button is clicked
    closeButton.addEventListener('click', function() {
        wheelMenuContainer.style.display = 'none';
    });


    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    container.addEventListener('mousedown', function(e) {
        isDragging = true;
        offsetX = e.clientX - container.getBoundingClientRect().left;
        offsetY = e.clientY - container.getBoundingClientRect().top;
        container.style.cursor = 'move';
        wheelMenu.style.overflowX = 'hidden';
    });

    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            const left = e.clientX - offsetX;
            const top = e.clientY - offsetY;
            container.style.left = `${left}px`;
            container.style.top = `${top}px`;
        }
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
        container.style.cursor = 'default';
        wheelMenu.style.overflowX = 'auto';
    });

    function highlightSelectedItem(item) {
        wheelItems.forEach(wheelItem => {
            wheelItem.style.backgroundColor = '';
        });
        if (item) {
            item.style.backgroundColor = '#d4edda';
        }
    }

    const wheelMenuList = document.getElementById('wheelMenuList');
    let currentScrollPosition = 0;
    let selectedWheelItem = null; // Keep track of the clicked item
    const wheelItems = wheelMenuList.querySelectorAll('li');

    function getSelectedItem() {
        const itemHeight = wheelItems[0].offsetHeight;
        const index = Math.round(-currentScrollPosition / itemHeight);
        return wheelItems[index];
    }

    document.getElementById('wheelMenuContainer').addEventListener('wheel', function(event) {
        event.preventDefault();
        const itemHeight = wheelItems[0].offsetHeight;

        const maxScrollPosition = -(itemHeight * (wheelItems.length - 7));

        if (event.deltaY > 0) {
            if (currentScrollPosition > maxScrollPosition) {
                currentScrollPosition -= itemHeight;
            }
        } else {
            if (currentScrollPosition < 0) {
                currentScrollPosition += itemHeight;
            }
        }

        wheelMenuList.style.transform = `translateY(${currentScrollPosition}px)`;
        selectedWheelItem = getSelectedItem();
        highlightSelectedItem(selectedWheelItem);
    });

    wheelItems.forEach(item => {
        item.addEventListener('click', function() {
			document.getElementById('selectItemButton').style.backgroundColor ='#28a745';
			document.getElementById('selectItemButton').disabled = false;
            selectedWheelItem = item;
            highlightSelectedItem(item);
        });
    });

    document.getElementById('selectItemButton').addEventListener('click', function() {
        if (selectedWheelItem) {
            const selectedItem = selectedWheelItem.textContent;
            addItemToInventory(selectedItem, 1);
            drawInventory(0);
        } else {
            console.log('No item selected.');
        }
    });

	document.getElementById('drawGridButton').addEventListener('click', function() {
		const currentDrawGrid = getDrawGrid();

		if (currentDrawGrid) {
			document.getElementById('drawGridButton').textContent = 'Show Grid';
		} else {
			document.getElementById('drawGridButton').textContent = 'Hide Grid';
		}

        setDrawGrid(!currentDrawGrid);
    });

    document.getElementById('debugWindowButton').addEventListener('click', function() {
        openDebugWindow();
    });

    document.getElementById('toggleAnimationNonPlayer').addEventListener('click', function() {
        if (getNonPlayerAnimationFunctionalityActive()) {
			document.getElementById('toggleAnimationNonPlayer').textContent = 'Start Anim.';
            setNonPlayerAnimationFunctionalityActive(false);
		} else {
			document.getElementById('toggleAnimationNonPlayer').textContent = 'Stop Anim.';
            setNonPlayerAnimationFunctionalityActive(true);
		}
    });

    document.addEventListener('mousedown', function(event) {
        showHideDebugPanel(event);
    });

    document.addEventListener('keydown', function(event) {
        if (event.code === 'NumpadSubtract') {
            showHideDebugPanel(event);
        }
    });

    
function showHideDebugPanel(event) {
    // Check if the event is a middle mouse click or NumpadSubtract keypress
    const isMiddleMouseClick = event.type === 'mousedown' && event.button === 1;
    const isNumpadSubtract = event.type === 'keydown' && event.code === 'NumpadSubtract';

    if (isMiddleMouseClick || isNumpadSubtract) {
        if (getGameStateVariable() === getGameVisibleActive()) {
            const wheelMenu = document.querySelector('.wheel-menu-container');
            if (wheelMenu) {
                if (wheelMenu.style.display === 'block') {
                    wheelMenu.style.display = 'none';
                } else {
                    document.getElementById('selectItemButton').style.backgroundColor = '#6c757d';
                    document.getElementById('selectItemButton').disabled = true;
                    wheelMenu.style.display = 'block';
                }
            }
        }
    }
}
});

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
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const gridData = getGridData();
    let interactionText = getElements().interactionInfo.textContent;

    const hoverX = Math.floor(mouseX / getCanvasCellWidth());
    const hoverY = Math.floor(mouseY / getCanvasCellHeight());

    if (
        hoverX >= 0 &&
        hoverX < getGridSizeX() &&
        hoverY >= 0 &&
        hoverY < getGridSizeY()
    ) {
        if (
            getGameStateVariable() === getGameVisibleActive() &&
            !getTransitioningToDialogueState()
        ) {
            const cellValue =
                gridData.gridData[hoverY] && gridData.gridData[hoverY][hoverX];

            const walkable = cellValue.startsWith("e") || cellValue.startsWith("w");

            if (getHoverCell().x !== hoverX || getHoverCell().y !== hoverY) {
                setHoverCell(hoverX, hoverY);

                // console.log(
                //     `Hovered Grid Position: (${getHoverCell().x}, ${getHoverCell().y}), Walkable: ${walkable}`,
                // ); //, zPos: ${getZPosHover()}
                //DEBUG
                drawDebugGrid(getDrawGrid());
                //
            }

            setHoveringInterestingObjectOrExit(
                cellValue.startsWith("e") ||
                cellValue.startsWith("o") ||
                cellValue.startsWith("c"),
            );

            if (
                !getWaitingForSecondItem() &&
                getHoveringInterestingObjectOrExit() &&
                !getCurrentlyMovingToAction() &&
                getVerbButtonConstructionStatus() === "interactionWalkTo"
            ) {
                const screenOrObjectNameAndHoverStatus =
                    returnHoveredInterestingObjectOrExitName(cellValue);
                const screenOrObjectName = screenOrObjectNameAndHoverStatus[0];
                if (screenOrObjectNameAndHoverStatus[1]) {
                    updateInteractionInfo(
                        localize(
                            "interactionWalkTo",
                            getLanguage(),
                            "verbsActionsInteraction",
                        ) +
                        " " +
                        screenOrObjectName,
                        false,
                    );
                }
            } else {
                if (
                    !getWaitingForSecondItem() &&
                    !getHoveringInterestingObjectOrExit() &&
                    !getCurrentlyMovingToAction() &&
                    getVerbButtonConstructionStatus() === "interactionWalkTo"
                ) {
                    updateInteractionInfo(
                        localize(
                            "interactionWalkTo",
                            getLanguage(),
                            "verbsActionsInteraction",
                        ),
                        false,
                    );
                }
                if (
                    !getWaitingForSecondItem() &&
                    getVerbButtonConstructionStatus() !== "interactionWalkTo"
                ) {
                    updateInteractionInfo(
                        localize(
                            getVerbButtonConstructionStatus(),
                            getLanguage(),
                            "verbsActionsInteraction",
                        ),
                        false,
                    );
                }
                if (
                    !getWaitingForSecondItem() &&
                    !getCurrentlyMovingToAction() &&
                    getVerbButtonConstructionStatus() !== "interactionWalkTo" &&
                    getHoveringInterestingObjectOrExit()
                ) {
                    const screenOrObjectNameAndHoverStatus =
                        returnHoveredInterestingObjectOrExitName(cellValue);
                    const screenOrObjectName = screenOrObjectNameAndHoverStatus[0];
                    if (screenOrObjectNameAndHoverStatus[1]) {
                        updateInteractionInfo(
                            localize(
                                getVerbButtonConstructionStatus(),
                                getLanguage(),
                                "verbsActionsInteraction",
                            ) +
                            " " +
                            screenOrObjectName,
                            false,
                        );
                    }
                }
            }

            if (getWaitingForSecondItem() && getHoveringInterestingObjectOrExit()) {
                const screenOrObjectNameAndHoverStatus =
                    returnHoveredInterestingObjectOrExitName(cellValue);
                const screenObjectOrNpcName = screenOrObjectNameAndHoverStatus[0];
                if (
                    screenOrObjectNameAndHoverStatus[1] &&
                    !getCurrentlyMovingToAction()
                ) {
                    if (getSecondItemAlreadyHovered() !== screenObjectOrNpcName) {
                        console.log(interactionText);
                        console.log(interactionText + " " + screenObjectOrNpcName);

                        const oldItem = getSecondItemAlreadyHovered();

                        if (interactionText.includes(oldItem)) {
                            const index = interactionText.indexOf(oldItem);
                            interactionText = interactionText.substring(0, index);
                        }

                        updateInteractionInfo(
                            interactionText + " " + screenObjectOrNpcName,
                            false,
                        );
                        setSecondItemAlreadyHovered(screenObjectOrNpcName);
                    }
                }
            }

            if (getWaitingForSecondItem() && !getHoveringInterestingObjectOrExit()) {
                const screenOrObjectNameAndHoverStatus =
                    returnHoveredInterestingObjectOrExitName(cellValue);
                const screenOrObjectName = screenOrObjectNameAndHoverStatus[0];

                if (screenOrObjectNameAndHoverStatus[1]) {
                    if (
                        getSecondItemAlreadyHovered() !== screenOrObjectName &&
                        !getCurrentlyMovingToAction()
                    ) {
                        const updatedText = interactionText.replace(
                            new RegExp("\\s" + getSecondItemAlreadyHovered()),
                            "",
                        );
                        updateInteractionInfo(updatedText, false);
                        setSecondItemAlreadyHovered(null);
                    }
                }
            }

            if (getHoveringInterestingObjectOrExit()) {
                const screenOrObjectNameAndHoverStatus =
                    returnHoveredInterestingObjectOrExitName(cellValue);
                if (screenOrObjectNameAndHoverStatus[1]) {
                    setCustomMouseCursor(getCustomMouseCursor("hoveringInteresting"));
                } else {
                    setCustomMouseCursor(getCustomMouseCursor("normal"));
                }
            } else {
                setCustomMouseCursor(getCustomMouseCursor("normal"));
            }
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
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

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
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

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
    getElements().resumeGameMenuButton.innerHTML = `${localize("resumeGame", getLanguage(), "ui")}`;
    getElements().loadGameButton.innerHTML = `${localize("loadGame", getLanguage(), "ui")}`;
    getElements().saveGameButton.innerHTML = `${localize("saveGame", getLanguage(), "ui")}`;
    getElements().loadStringButton.innerHTML = `${localize("loadButton", getLanguage(), "ui")}`;
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

    getElements().overlayCanvas.addEventListener(
        "transitionend",
        () => {
            const newScreenId = optionalNewScreenId || handleRoomTransition();
            const exit = "e" + getExitNumberToTransitionTo();

            if (optionalNewScreenId) {
                setNextScreenId(optionalNewScreenId);
                swapBackgroundOnRoomTransition(newScreenId, true);
            }

            let startPosition;

            if (!optionalStartX && !optionalStartY) {
                startPosition = getNavigationData()[getCurrentScreenId()]?.exits[exit]?.startPosition;
            } else {
                startPosition = { "x": optionalStartX, "y": optionalStartY };
            }

            const startX = startPosition.x;
            const startY = startPosition.y;

            initializePlayerPosition(startX, startY);
            setDisplayText("", null);
            fadeBackToGameInTransition();

            setAnimationInProgress(false);
            console.log("about to clear pre animation grid")
            setPreAnimationGridState('clear', null, null, null);

            if (!optionalStartX && !optionalStartY) {
                setTransitioningNow(true);
                canvas.style.pointerEvents = "none";
                processLeftClickPoint({
                    x: getNavigationData()[getCurrentScreenId()].exits[exit].finalPosition
                        .x,
                    y: getNavigationData()[getCurrentScreenId()].exits[exit].finalPosition
                        .y,
                },
                false,
            );
            }

            setPreviousScreenId(getCurrentScreenId());
            setCurrentScreenId(newScreenId);
        }, {
            once: true
        },
    );
}

export function fadeBackToGameInTransition() {
    getElements().overlayCanvas.classList.add("hidden");
    getElements().overlayCanvas.classList.remove("visible");

    requestAnimationFrame(() => {
        getElements().overlayCanvas.classList.remove("visible");
        getElements().overlayCanvas.classList.add("hidden");
    });

    getElements().overlayCanvas.addEventListener(
        "transitionend",
        () => {
            getElements().overlayCanvas.classList.add("hidden");
            getElements().overlayCanvas.style.display = "none";
            console.log("fade transition complete!");
        }, {
            once: true
        },
    );
}

export function updateInteractionInfo(text, action) {
    if (action) {
        setCurrentlyMovingToAction(true);
    }
    const interactionInfo = getElements().interactionInfo;
    if (interactionInfo) {
        interactionInfo.textContent = text;
        if (action) {
            setUpcomingAction(interactionInfo.textContent);
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

    textTimer = setTimeout(() => {
        setDisplayText("", null);
        if (resolve) {
            console.log("Promise resolved!");
            resolve();
        }
        processQueue();
    }, getTextDisplayDuration());
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

export async function loadGameData(
    gridUrl,
    screenNavUrl,
    objectsUrl,
    dialogueUrl,
    npcUrl
) {
    try {
        // Load grid data
        const gridResponse = await fetch(gridUrl);
        const gridData = await gridResponse.json();
        setGridData(gridData);
        console.log("Grid data loaded:", getGridData());

        // Load navigation data
        const navResponse = await fetch(screenNavUrl);
        const navData = await navResponse.json();
        setNavigationData(navData);
        console.log("Navigation data loaded:", getNavigationData());

        // Load object data
        const objectsResponse = await fetch(objectsUrl);
        const objectsData = await objectsResponse.json();
        setObjectsData(objectsData);
        console.log("Object data loaded:", getObjectData());

        // Load dialogue data
        const dialogueResponse = await fetch(dialogueUrl);
        const dialogueData = await dialogueResponse.json();
        setDialoguesData(dialogueData);
        console.log("Dialogue data loaded:", getDialogueData());

        // Load NPC data
        const npcResponse = await fetch(npcUrl);
        const npcData = await npcResponse.json();
        setNpcsData(npcData);
        console.log("Npc data loaded:", getNpcData());

    } catch (error) {
        console.error("Error loading game data:", error);
    }
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

export function addDialogueRow(dialogueOptionText) {
    const dialogueSection = getElements().dialogueSection;

    const newRow = document.createElement("div");
    newRow.classList.add("row", "dialogueRow");

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
        canvas.style.backgroundImage = `url(${imageUrl})`;
    };

    backgroundImage.onerror = function() {
        console.error(`Failed to load image: ${imageUrl}`);
    };
}

export function handleEdgeScroll() {
    const player = getPlayerObject();
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

function setInitialBackgroundImage() {
    const canvas = getElements().canvas;

    const backgroundImageUrl = getInitialBackgroundUrl();
    canvas.style.backgroundImage = `url(${backgroundImageUrl})`;
}

async function preloadImages(imageUrls) {
    const promises = imageUrls.map((url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = resolve;
            img.onerror = reject;
        });
    });
    await Promise.all(promises);
    console.log("All images preloaded");
}

let debugWindow;

function openDebugWindow() {
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