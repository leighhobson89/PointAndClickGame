import { getLocalization, getAllGridData, urlObjectsData, setObjectData, getObjectData, setVerbButtonConstructionStatus, getVerbButtonConstructionStatus, setCustomMouseCursor, getCustomMouseCursor, setHoveringInterestingObjectOrExit, getHoveringInterestingObjectOrExit, getCurrentlyMovingToAction, resetAllVariables, getZPosHover, setZPosHover, getPreviousScreenId, setCurrentScreenId, getExitNumberToTransitionTo, setNavigationData, getNavigationData, setHoverCell, getHoverCell, getCanvasCellWidth, getCanvasCellHeight, getGridData, setGridData, gameState, getLanguage, setElements, getElements, setBeginGameStatus, getGameInProgress, setGameInProgress, getGameVisibleActive, getMenuState, getLanguageSelected, setLanguageSelected, setLanguage, getInitialScreenId, urlWalkableJSONS, urlNavigationData, getGridSizeX, getGridSizeY, getBeginGameStatus, getCurrentScreenId, setTransitioningNow, setPreviousScreenId, getCurrentlyMoving, setCurrentlyMovingToAction, setUpcomingAction } from './constantsAndGlobalVars.js';
import { setUpObjects, resizePlayerObject, handleRoomTransition, drawGrid, processClickPoint, setGameState, startGame, gameLoop, enemySquares, initializePlayerPosition } from './game.js';
import { initLocalization, localize } from './localization.js';
import { loadGameOption, loadGame, saveGame, copySaveStringToClipBoard } from './saveLoadGame.js';

document.addEventListener('DOMContentLoaded', async () => {
    setElements();
    getElements().customCursor.classList.add('d-none');
    getElements().customCursor.style.transform = 'translate(-50%, -50%)';
    loadGameData(urlWalkableJSONS, urlNavigationData, urlObjectsData);


    getElements().newGameMenuButton.addEventListener('click', (event) => {
        getElements().customCursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
        resetAllVariables(); //TODO RESET ALL VARIABLES WHEN USER STARTS NEW GAME
        setBeginGameStatus(true);
        if (!getGameInProgress()) {
            setGameInProgress(true);
        }
        updateInteractionInfo(localize('interactionWalkTo', getLanguage(), 'verbsActionsInteraction'), false);
        disableActivateButton(getElements().resumeGameMenuButton, 'active', 'btn-primary');
        disableActivateButton(getElements().saveGameButton, 'active', 'btn-primary');
        setGameState(getGameVisibleActive());
        startGame(getInitialScreenId());
    });

    getElements().resumeGameMenuButton.addEventListener('click', (event) => {
        getElements().customCursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
        if (gameState === getMenuState()) {
            setGameState(getGameVisibleActive());
        }
        gameLoop();
    });

    getElements().returnToMenuButton.addEventListener('click', () => {
        setGameState(getMenuState());
    });

    getElements().btnEnglish.addEventListener('click', () => {
        handleLanguageChange('en');
        setGameState(getMenuState());
    });

    getElements().btnSpanish.addEventListener('click', () => {
        handleLanguageChange('es');
        setGameState(getMenuState());
    });

    getElements().btnGerman.addEventListener('click', () => {
        handleLanguageChange('de');
        setGameState(getMenuState());
    });

    getElements().btnItalian.addEventListener('click', () => {
        handleLanguageChange('it');
        setGameState(getMenuState());
    });

    getElements().btnFrench.addEventListener('click', () => {
        handleLanguageChange('fr');
        setGameState(getMenuState());
    });

    getElements().saveGameButton.addEventListener('click', function () {
        getElements().overlay.classList.remove('d-none');
        saveGame(true);
    });

    getElements().loadGameButton.addEventListener('click', function () {
        getElements().overlay.classList.remove('d-none');
        loadGameOption();
    });

    getElements().copyButtonSavePopup.addEventListener('click', function () {
        copySaveStringToClipBoard();
    });

    getElements().closeButtonSavePopup.addEventListener('click', function () {
        getElements().saveLoadPopup.classList.add('d-none');
        getElements().overlay.classList.add('d-none');
    });

    getElements().loadStringButton.addEventListener('click', function () {
        loadGame(true)
            .then(() => {
                setElements();
                getElements().saveLoadPopup.classList.add('d-none');
                document.getElementById('overlay').classList.add('d-none');
                setGameState(getMenuState());
            })
            .catch((error) => {
                console.error('Error loading game:', error);
            });
    });

//------------------------------------------------------------------------------------------------------
// VERB EVENT LISTENERS

getElements().btnLookAt.addEventListener('click', function () {
    setVerbButtonConstructionStatus(this);
    updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
});

getElements().btnPickUp.addEventListener('click', function () {
    setVerbButtonConstructionStatus(this);
    updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
});

getElements().btnUse.addEventListener('click', function () {
    setVerbButtonConstructionStatus(this);
    updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
});

getElements().btnOpen.addEventListener('click', function () {
    setVerbButtonConstructionStatus(this);
    updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
});

getElements().btnClose.addEventListener('click', function () {
    setVerbButtonConstructionStatus(this);
    updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
});

getElements().btnPush.addEventListener('click', function () {
    setVerbButtonConstructionStatus(this);
    updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
});

getElements().btnPull.addEventListener('click', function () {
    setVerbButtonConstructionStatus(this);
    updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
});

getElements().btnTalkTo.addEventListener('click', function () {
    setVerbButtonConstructionStatus(this);
    updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
});

getElements().btnGive.addEventListener('click', function () {
    setVerbButtonConstructionStatus(this);
    updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
});

//------------------------------------------------------------------------------------------------------

    initializeCanvasEventListener();
    setGameState(getMenuState());
    handleLanguageChange(getLanguageSelected());
});

export function initializeCanvasEventListener() {
    const canvas = getElements().canvas;

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mouseenter', enableCustomCursor);
    canvas.addEventListener('mouseleave', disableCustomCursor);
    canvas.addEventListener('mousemove', trackCursor);
}

function trackCursor(event) {
    getElements().customCursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
}

function enableCustomCursor() {
    const canvas = getElements().canvas;
    canvas.style.cursor = 'none';
    getElements().customCursor.classList.remove('d-none');
}

function disableCustomCursor() {
    const canvas = getElements().canvas;
    canvas.style.cursor = 'pointer';
    getElements().customCursor.classList.add('d-none');
}

export function handleMouseMove(event, ctx) {
    const canvas = getElements().canvas;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const gridData = getGridData();

    const hoverX = Math.floor(mouseX / getCanvasCellWidth());
    const hoverY = Math.floor(mouseY / getCanvasCellHeight());

    if (hoverX >= 0 && hoverX < getGridSizeX() && hoverY >= 0 && hoverY < getGridSizeY()) {
        const cellValue = gridData.gridData[hoverY] && gridData.gridData[hoverY][hoverX];

        const walkable = (cellValue.startsWith('e') || cellValue.startsWith('w'));

        if (getHoverCell().x !== hoverX || getHoverCell().y !== hoverY) {
            setHoverCell(hoverX, hoverY);

            //console.log(`Hovered Grid Position: (${getHoverCell().x}, ${getHoverCell().y}), Walkable: ${walkable}, zPos: ${getZPosHover()}`);
            //DEBUG
            drawGrid(ctx, getGridSizeX(), getGridSizeY(), hoverX, hoverY, walkable);
            //
        }

        setHoveringInterestingObjectOrExit(cellValue.startsWith('e') || cellValue.startsWith('o'));
        // console.log("are we hovering anything interesting? " + getHoveringInterestingObjectOrExit());
        // console.log("verb construction status: " + getVerbButtonConstructionStatus());
        if (getHoveringInterestingObjectOrExit() && !getCurrentlyMovingToAction() && getVerbButtonConstructionStatus() === 'interactionWalkTo') {
            const screenOrObjectName = returnHoveredInterestingObjectOrExitName(cellValue);
            updateInteractionInfo(localize('interactionWalkTo', getLanguage(), 'verbsActionsInteraction') + " " + screenOrObjectName, false);
        } else {
            if (!getHoveringInterestingObjectOrExit() && !getCurrentlyMovingToAction() && getVerbButtonConstructionStatus() === 'interactionWalkTo') {
                updateInteractionInfo(localize('interactionWalkTo', getLanguage(), 'verbsActionsInteraction'), false);
            }
            if (getVerbButtonConstructionStatus() !== 'interactionWalkTo') {
                updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
            }
            if (!getCurrentlyMovingToAction() && getVerbButtonConstructionStatus() !== 'interactionWalkTo' && getHoveringInterestingObjectOrExit()) {
                const screenOrObjectName = returnHoveredInterestingObjectOrExitName(cellValue);
                updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction') + " " + screenOrObjectName, false);
            }
        }

        if (getHoveringInterestingObjectOrExit()) {
            setCustomMouseCursor(getCustomMouseCursor('hoveringInteresting'));
        } else {
            setCustomMouseCursor(getCustomMouseCursor('normal'));
        }
    }
}

export function returnHoveredInterestingObjectOrExitName(cellValue) {
    if (cellValue && (cellValue.startsWith('e') || cellValue.startsWith('o'))) {
        const currentScreenId = getCurrentScreenId();
        const navigationData = getNavigationData();
        const objectData = getObjectData();
        const language = getLanguage();

        // If it is an exit
        if (navigationData[currentScreenId] && cellValue.startsWith('e')) {
            const exitId = navigationData[currentScreenId].exits[cellValue].connectsTo;

            if (navigationData[exitId]) {
                return navigationData[exitId][language];
            }
        }

        // If it is an object
        if (navigationData[currentScreenId] && cellValue.startsWith('o')) {
            const objectId = cellValue.substring(1);
            const objectName = objectData.objects[objectId]?.name[language];

            return objectName || "Unknown Object";
        }
    }

    return null;
}

function handleCanvasClick(event) {

    if (getBeginGameStatus) {
        setBeginGameStatus(false);
    }

    const canvas = getElements().canvas;
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    console.log(`Click Coordinates: (${clickX}, ${clickY})`);
    
    const clickPoint = { x: clickX, y: clickY};

    setBeginGameStatus(false);
    
    processClickPoint(clickPoint, true);
}

async function setElementsLanguageText() {
    // Localization text
    getElements().menuTitle.innerHTML = `<h2>${localize('menuTitle', getLanguage(), 'ui')}</h2>`;
    getElements().newGameMenuButton.innerHTML = `${localize('newGame', getLanguage(), 'ui')}`;
    getElements().resumeGameMenuButton.innerHTML = `${localize('resumeGame', getLanguage(), 'ui')}`;
    getElements().loadGameButton.innerHTML = `${localize('loadGame', getLanguage(), 'ui')}`;
    getElements().saveGameButton.innerHTML = `${localize('saveGame', getLanguage(), 'ui')}`;
    getElements().loadStringButton.innerHTML = `${localize('loadButton', getLanguage(), 'ui')}`;
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
        case 'active':
            button.classList.remove('disabled');
            button.classList.add(activeClass);
            break;
        case 'disable':
            button.classList.remove(activeClass);
            button.classList.add('disabled');
            break;
    }
}

export function animateTransitionAndChangeBackground() {
    const overlay = document.getElementById('overlayCanvas');
    getElements().overlayCanvas.style.display = 'block';
    getElements().customCursor.classList.add('d-none');

    requestAnimationFrame(() => {
        getElements().overlayCanvas.classList.add('visible');
        getElements().overlayCanvas.classList.remove('hidden');
    });

    getElements().overlayCanvas.addEventListener('transitionend', () => {
        const newScreenId = handleRoomTransition();
        const exit = 'e' + getExitNumberToTransitionTo();

        const startPosition = getNavigationData()[getCurrentScreenId()]?.exits[exit]?.startPosition;
        const startX = startPosition.x;
        const startY = startPosition.y;

        initializePlayerPosition(startX, startY);
        fadeBackToGameInTransition();
        
        setTransitioningNow(true);
        canvas.style.pointerEvents = 'none';
        processClickPoint({
            x: getNavigationData()[getCurrentScreenId()].exits[exit].finalPosition.x,
            y: getNavigationData()[getCurrentScreenId()].exits[exit].finalPosition.y
        }, false);
        setPreviousScreenId(getCurrentScreenId());
        setCurrentScreenId(newScreenId);
    }, { once: true });
}

export function fadeBackToGameInTransition() {
    getElements().overlayCanvas.classList.add('hidden');
    getElements().overlayCanvas.classList.remove('visible');

    requestAnimationFrame(() => {
        getElements().overlayCanvas.classList.remove('visible');
        getElements().overlayCanvas.classList.add('hidden');
    });

    getElements().overlayCanvas.addEventListener('transitionend', () => {
        getElements().overlayCanvas.classList.add('hidden');
        getElements().overlayCanvas.style.display = 'none';
        console.log("fade transition complete!");
    }, { once: true });
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
            interactionInfo.style.color = 'rgb(255, 255, 0)';
            interactionInfo.style.fontWeight = 'bold';
        } else {
            interactionInfo.style.color = 'rgb(255, 255, 255)';
            interactionInfo.style.fontWeight = 'normal';
        }
    } else {
        console.error('Interaction info element not found');
    }
}

export function parseCommand(userCommand) {
    const objectData = getObjectData().objects;  // Retrieve all objects
    const language = getLanguage();              // Get the current language
    const localization = getLocalization()[language]['verbsActionsInteraction'];  // Get localized verbs/actions

    // Step 1: Extract the object name by going from the last word backwards
    let commandParts = userCommand.split(' ');  // Split the command string into parts
    let objectMatch = null;                     // To store the matched objectId
    let objectName = '';                        // To store the object name found
    let verbPart = '';                          // To store the verb part of the command

    // Step 2: Try to match object name from the last word, working backwards
    for (let i = commandParts.length - 1; i >= 0; i--) {
        objectName = commandParts.slice(i).join(' ');  // Extract from current word onwards (reverse slice)

        // Compare with each object name in the current language
        for (const objectId in objectData) {
            if (objectData[objectId].name[language] === objectName) {
                objectMatch = objectId;  // Found the objectId
                verbPart = commandParts.slice(0, i).join(' ');  // Remaining part is the verb
                break;
            }
        }
        if (objectMatch) break;  // If object match found, stop further searching
    }

    // If no object match found, return an error or null
    if (!objectMatch) {
        console.warn('No object match found for the command:', userCommand);
        return null;
    }

    // Step 3: Match the remaining verb part with localization verbs/actions
    let verbKey = null;
    for (const key in localization) {
        if (localization[key] === verbPart) {
            verbKey = key;  // Found the matching verb key
            break;
        }
    }

    // If no verb match found, return an error or null
    if (!verbKey) {
        console.warn('No verb match found for the command:', verbPart);
        return null;
    }

    // Step 4: Return the matched object and verb as an object
    return {
        objectId: objectMatch,
        verbKey: verbKey
    };
}

export function loadGameData(gridUrl, screenNavUrl, objectsUrl) {
    // Load grid data
    fetch(gridUrl)
        .then(response => response.json())
        .then(gridData => {
            setGridData(gridData);
            console.log("Grid data loaded:", getGridData());
        })
        .catch(error => {
            console.error("Error loading grid data:", error);
        });

    // Load navigation data
    fetch(screenNavUrl)
        .then(response => response.json())
        .then(navData => {
            setNavigationData(navData);
            console.log("Navigation data loaded:", getNavigationData());
        })
        .catch(error => {
            console.error("Error loading navigation data:", error);
        });

    // Load object data
    fetch(objectsUrl)
        .then(response => response.json())
        .then(objectsData => {
            setObjectData(objectsData);
            console.log("Object data loaded:", getObjectData());
        })
        .catch(error => {
            console.error("Error loading object data:", error);
        });
}