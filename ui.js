import { getTransitioningToDialogueState, setCurrentXposNpc, setCurrentYposNpc, getColorTextPlayer, setPreviousGameState, getPreviousGameState, getTextQueue, setTextQueue, getIsDisplayingText, setIsDisplayingText, setNpcData, setObjectToBeUsedWithSecondItem, setWaitingForSecondItem, setSecondItemAlreadyHovered, getSecondItemAlreadyHovered, getObjectToBeUsedWithSecondItem, getWaitingForSecondItem, setObjectsData, getLocalization, getMaxTexTDisplayWidth, getPlayerObject, getTextDisplayDuration, setDisplayText, gameState, getBeginGameStatus, getCanvasCellHeight, getCanvasCellWidth, getCurrentlyMovingToAction, getCurrentScreenId, getCurrentStartIndexInventory, getCustomMouseCursor, getDialogueData, getElements, getExitNumberToTransitionTo, getGameInProgress, getGameVisibleActive, getGridData, getGridSizeX, getGridSizeY, getHoverCell, getHoveringInterestingObjectOrExit, getInitialScreenId, getLanguage, getLanguageSelected, getMenuState, getNavigationData, getObjectData, getPlayerInventory, getSlotsPerRowInInventory, getVerbButtonConstructionStatus, resetAllVariables, setBeginGameStatus, setCurrentlyMovingToAction, setCurrentScreenId, setCurrentStartIndexInventory, setCustomMouseCursor, setDialogueData, setElements, setGameInProgress, setGridData, setHoverCell, setHoveringInterestingObjectOrExit, setLanguage, setLanguageSelected, setNavigationData, setPreviousScreenId, setTransitioningNow, setUpcomingAction, setVerbButtonConstructionStatus, urlDialogueData, urlNavigationData, urlObjectsData, urlNpcsData, urlWalkableJSONS, getUpcomingAction, getNpcData, getGameStateVariable, getDisplayText, getCurrentXposNpc, getCurrentYposNpc } from './constantsAndGlobalVars.js';
import { drawGrid, gameLoop, handleRoomTransition, initializePlayerPosition, processClickPoint, setGameState, startGame } from './game.js';
import { initLocalization, localize } from './localization.js';
import { copySaveStringToClipBoard, loadGame, loadGameOption, saveGame } from './saveLoadGame.js';
import { constructCommand, performCommand } from './handleCommands.js'

let textTimer; 

document.addEventListener('DOMContentLoaded', async () => {
    setElements();
    getElements().customCursor.classList.add('d-none');
    getElements().customCursor.style.transform = 'translate(-50%, -50%)';
    loadGameData(urlWalkableJSONS, urlNavigationData, urlObjectsData, urlDialogueData, urlNpcsData);


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
    
        if (getPreviousGameState() !== null) {
            setGameState(getPreviousGameState());
            setPreviousGameState(null);
        }
    
        gameLoop();
    });

    getElements().returnToMenuButton.addEventListener('click', () => {
        setPreviousGameState(getGameStateVariable());
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
//------------------------------------------------------------------------------------------------------

    getElements().btnLookAt.addEventListener('click', function () {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
        }
    });

    getElements().btnPickUp.addEventListener('click', function () {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
        }
    });

    getElements().btnUse.addEventListener('click', function () {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
        }
    });

    getElements().btnOpen.addEventListener('click', function () {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
        }
    });

    getElements().btnClose.addEventListener('click', function () {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
        }
    });

    getElements().btnPush.addEventListener('click', function () {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
        }
    });

    getElements().btnPull.addEventListener('click', function () {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
        }
    });

    getElements().btnTalkTo.addEventListener('click', function () {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
        }
    });

    getElements().btnGive.addEventListener('click', function () {
        if (getGameStateVariable() === getGameVisibleActive()) {
            resetSecondItemState();
            setVerbButtonConstructionStatus(this);
            updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
        }
    });

//------------------------------------------------------------------------------------------------------
// INVENTORY EVENT LISTENERS
//------------------------------------------------------------------------------------------------------

    // Event listeners for the up and down arrows
getElements().inventoryUpArrow.addEventListener('click', handleInventoryUpArrowClick);
getElements().inventoryDownArrow.addEventListener('click', handleInventoryDownArrowClick);

// Convert NodeList to Array
const inventoryItems = Array.from(document.querySelectorAll('.inventory-item'));

// Adding mouseover event listener for each inventory item
inventoryItems.forEach(function(item) {
    item.addEventListener('mouseover', function() {
        const imgElement = item.querySelector('img');
        const interactionText = getElements().interactionInfo.textContent;

        if (imgElement) {
            const objectId = imgElement.alt;
            if (objectId !== "empty") {
                const objectOrNpcName = getObjectData().objects[objectId].name[getLanguage()];
                console.log(objectOrNpcName);

                // Extract the verbs
                const verbLookAt = localize('interactionLookAt', getLanguage(), 'verbsActionsInteraction');
                const verbWalkTo = localize('interactionWalkTo', getLanguage(), 'verbsActionsInteraction');
                const verbWalking = localize('interactionWalking', getLanguage(), 'verbsActionsInteraction');
                const verbTalkTo = localize('interactionTalkTo', getLanguage(), 'verbsActionsInteraction');
                const verbPickUp = localize('interactionPickUp', getLanguage(), 'verbsActionsInteraction');

                if (interactionText === verbWalkTo) {
                    setUpcomingAction(verbLookAt);
                    updateInteractionInfo(getUpcomingAction() + " " + objectOrNpcName, false);
                } else if (!getWaitingForSecondItem() && interactionText !== verbWalking && interactionText !== verbWalkTo) {
                    let words = interactionText.split(" ");
                    let verbKey = null;

                    const twoWordVerbs = [verbLookAt, verbTalkTo, verbPickUp];
                    const firstTwoWords = words.slice(0, 2).join(" ");
                    
                    if (firstTwoWords === verbPickUp) return; // Prevent duplicate items in inventory using pickup
                    
                    if (twoWordVerbs.includes(firstTwoWords)) {
                        const verbsInteraction = getLocalization()[getLanguage()]['verbsActionsInteraction'];
                        for (const [key, value] of Object.entries(verbsInteraction)) {
                            if (value === firstTwoWords) {
                                verbKey = key;
                                break;
                            }
                        }
                    } else {
                        const verbsInteraction = getLocalization()[getLanguage()]['verbsActionsInteraction'];
                        for (const [key, value] of Object.entries(verbsInteraction)) {
                            if (value === words[0]) {
                                verbKey = key;
                                break;
                            }
                        }
                    }
                    updateInteractionInfo(localize(verbKey, getLanguage(), 'verbsActionsInteraction') + " " + objectOrNpcName, false);
                }

                if (getWaitingForSecondItem()) {
                    if (!getSecondItemAlreadyHovered()) {
                        if (objectOrNpcName !== getObjectData().objects[getObjectToBeUsedWithSecondItem()].name[getLanguage()]) {
                            updateInteractionInfo(interactionText + " " + objectOrNpcName, false);
                            setSecondItemAlreadyHovered(objectOrNpcName);
                        }
                    } else if (objectOrNpcName !== getObjectData().objects[getObjectToBeUsedWithSecondItem()].name[getLanguage()]) {
                        let updatedText = interactionText.replace(new RegExp(getSecondItemAlreadyHovered()), objectOrNpcName);
                        updateInteractionInfo(updatedText, false);
                        setSecondItemAlreadyHovered(objectOrNpcName);
                    } else if (objectOrNpcName === getObjectData().objects[getObjectToBeUsedWithSecondItem()].name[getLanguage()]) {
                        return;
                    }
                }
            }
        }
    });
});

// Adding click event listener for each inventory item
inventoryItems.some(function(item) {
    if (getGameStateVariable() !== getGameVisibleActive()) {
        return true;
    }

    item.addEventListener('click', function() {
        const interactionText = getElements().interactionInfo.textContent;
        if (!getSecondItemAlreadyHovered()) {
            setUpcomingAction(interactionText);
        }

        const command = constructCommand(getUpcomingAction());
        console.log("command to perform: " + command);
        performCommand(command, true);
    });

    return false; // Continue iterating
});

// Initialize canvas event listener and set the initial game state
initializeCanvasEventListener();
setGameState(getMenuState());
handleLanguageChange(getLanguageSelected());

});

const handleInventoryUpArrowClick = () => {
    if (getGameStateVariable() === getGameVisibleActive()) {
        if (getCurrentStartIndexInventory() > 0) {
            setCurrentStartIndexInventory(getCurrentStartIndexInventory() - getSlotsPerRowInInventory());
            drawInventory(getCurrentStartIndexInventory());
        }
    }   
};

const handleInventoryDownArrowClick = () => {
    if (getGameStateVariable() === getGameVisibleActive()) {
        const inventory = getPlayerInventory();
        const totalSlots = Object.keys(inventory).length;
    
        if (getCurrentStartIndexInventory() + (getSlotsPerRowInInventory() * 2) < totalSlots) {
            setCurrentStartIndexInventory(getCurrentStartIndexInventory() + getSlotsPerRowInInventory());
            drawInventory(getCurrentStartIndexInventory());
        }
    }
};

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
    let interactionText = getElements().interactionInfo.textContent;

    const hoverX = Math.floor(mouseX / getCanvasCellWidth());
    const hoverY = Math.floor(mouseY / getCanvasCellHeight());

    if (hoverX >= 0 && hoverX < getGridSizeX() && hoverY >= 0 && hoverY < getGridSizeY()) {
        if (getGameStateVariable() === getGameVisibleActive() && !getTransitioningToDialogueState()) {
            const cellValue = gridData.gridData[hoverY] && gridData.gridData[hoverY][hoverX];

        const walkable = (cellValue.startsWith('e') || cellValue.startsWith('w'));

        if (getHoverCell().x !== hoverX || getHoverCell().y !== hoverY) {
            setHoverCell(hoverX, hoverY);

            //console.log(`Hovered Grid Position: (${getHoverCell().x}, ${getHoverCell().y}), Walkable: ${walkable}, zPos: ${getZPosHover()}`);
            //DEBUG
            drawGrid(ctx, getGridSizeX(), getGridSizeY(), hoverX, hoverY, walkable);
            //
        }

        setHoveringInterestingObjectOrExit(cellValue.startsWith('e') || cellValue.startsWith('o') || cellValue.startsWith('c'));

        if (!getWaitingForSecondItem() && getHoveringInterestingObjectOrExit() && !getCurrentlyMovingToAction() && getVerbButtonConstructionStatus() === 'interactionWalkTo') {
            const screenOrObjectName = returnHoveredInterestingObjectOrExitName(cellValue);
            updateInteractionInfo(localize('interactionWalkTo', getLanguage(), 'verbsActionsInteraction') + " " + screenOrObjectName, false);
        } else {
            if (!getWaitingForSecondItem() && !getHoveringInterestingObjectOrExit() && !getCurrentlyMovingToAction() && getVerbButtonConstructionStatus() === 'interactionWalkTo') {
                updateInteractionInfo(localize('interactionWalkTo', getLanguage(), 'verbsActionsInteraction'), false);
            }
            if (!getWaitingForSecondItem() && getVerbButtonConstructionStatus() !== 'interactionWalkTo') {
                updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction'), false);
            }
            if (!getWaitingForSecondItem() && !getCurrentlyMovingToAction() && getVerbButtonConstructionStatus() !== 'interactionWalkTo' && getHoveringInterestingObjectOrExit()) {
                const screenOrObjectName = returnHoveredInterestingObjectOrExitName(cellValue);
                updateInteractionInfo(localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction') + " " + screenOrObjectName, false);
            }
        }

        if (getWaitingForSecondItem() && getHoveringInterestingObjectOrExit()) {
            const screenObjectOrNpcName = returnHoveredInterestingObjectOrExitName(cellValue);
            
            if (getSecondItemAlreadyHovered() !== screenObjectOrNpcName) {
                console.log(interactionText);
                console.log(interactionText + " " + screenObjectOrNpcName);

                const oldItem = getSecondItemAlreadyHovered();

                if (interactionText.includes(oldItem)) {
                    const index = interactionText.indexOf(oldItem);
                    interactionText = interactionText.substring(0, index);
                }

                updateInteractionInfo(interactionText + " " + screenObjectOrNpcName, false);
                setSecondItemAlreadyHovered(screenObjectOrNpcName);
            }
        }

        if (getWaitingForSecondItem() && !getHoveringInterestingObjectOrExit()) {
            const screenOrObjectName = returnHoveredInterestingObjectOrExitName(cellValue);
            if (getSecondItemAlreadyHovered() !== screenOrObjectName && !getCurrentlyMovingToAction()) {
                const updatedText = interactionText.replace(new RegExp("\\s" + getSecondItemAlreadyHovered()), "");
                updateInteractionInfo(updatedText, false);
                setSecondItemAlreadyHovered(null);
            }
        }

        if (getHoveringInterestingObjectOrExit()) {
            setCustomMouseCursor(getCustomMouseCursor('hoveringInteresting'));
        } else {
            setCustomMouseCursor(getCustomMouseCursor('normal'));
        }
        }
    }
}

export function returnHoveredInterestingObjectOrExitName(cellValue) {
    if (cellValue && (cellValue.startsWith('e') || cellValue.startsWith('o') || cellValue.startsWith('c'))) {
        const currentScreenId = getCurrentScreenId();
        const navigationData = getNavigationData();
        const objectData = getObjectData();
        const npcData = getNpcData();
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

        // If it is an npc
        if (navigationData[currentScreenId] && cellValue.startsWith('c')) {
            const npcId = cellValue.substring(1);
            const npcName = npcData.npcs[npcId]?.name[language];

            return npcName || "Unknown Npc";
        }
    }

    return null;
}

function handleCanvasClick(event) {
    console.log (getGameStateVariable());
    console.log (getGameVisibleActive());
    if (getGameStateVariable() === getGameVisibleActive()) {
        if (getBeginGameStatus()) {
            setBeginGameStatus(false);
        }
    
        const canvas = getElements().canvas;
        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        console.log(`Click Coordinates: (${clickX}, ${clickY})`);
        
        const clickPoint = { x: clickX, y: clickY};
        
        processClickPoint(clickPoint, true);
    }
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
        setDisplayText('', null); //remove text if change screen
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

export function drawInventory(startIndex) {
    const inventory = getPlayerInventory();
    const inventoryDivs = document.querySelectorAll('.inventory-item');

    inventoryDivs.forEach((div, index) => {
        div.innerHTML = '';

        const slotIndex = startIndex + index;
        const slotKey = `slot${slotIndex + 1}`;
        const inventorySlot = inventory[slotKey];

        if (inventorySlot) {
            const objectId = inventorySlot.object;
            const objectData = getObjectData().objects[objectId];
            const imageUrl = objectData.inventoryUrl;

            const imgTag = `<img src="${imageUrl}" alt="${objectId}" class="inventory-img" />`;

            div.innerHTML = imgTag;

            const number = inventorySlot.quantity || null;
            let numberSpan;

            if (number !== null) {
                if (number > 1) {
                    numberSpan = `<span class="inventory-number">${number}</span>`;
                    div.classList.add('show-triangle');
                } else {
                    numberSpan = `<span class="inventory-number"></span>`;
                    div.classList.remove('show-triangle');
                }

                div.innerHTML += numberSpan;
            }
        } else {
            div.innerHTML = `<img src="./resources/objects/images/blank.png" alt="empty" class="inventory-img" />`;
            div.classList.remove('show-triangle');
        }
    });
}

export function drawTextOnCanvas(text, color, xPos = null, yPos = null, currentSpeaker) { //do currentSpeaker
    if (!text) return;

    const canvas = getElements().canvas;
    const ctx = canvas.getContext('2d');

    const maxWidth = getMaxTexTDisplayWidth();
    const lineHeight = parseFloat(ctx.font) * 1.2;

    if (currentSpeaker === 'player' || !currentSpeaker) {
        const player = getPlayerObject();
        // If xPos and yPos aren't provided, use player's position by default
        if (!xPos) xPos = player.xPos;
        if (!yPos) {
            const halfCanvasHeight = canvas.height / 2;

            yPos = player.yPos + player.height < halfCanvasHeight
                ? player.yPos + player.height + 165
                : player.yPos - 10;
        }
    } else {
        xPos = getCurrentXposNpc();
        yPos = getCurrentYposNpc();
    }

    // Ensure text is within canvas bounds probably needs adjusting and adding the condition for display it below if over half way up etc tweak as you go
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

    // Handle text wrapping and drawing
    const lines = wrapTextAndPosition(text, ctx, maxWidth, xPos, yPos, lineHeight);
    drawWrappedText(lines, ctx, xPos, yPos, lineHeight, color);
}


function wrapTextAndPosition(text, ctx, maxWidth) {
    if (!text.includes(" ")) {
        return [text];
    }

    const words = text.split(' '); 
    const lines = [];
    let currentLine = ''; 

    words.forEach(word => {
        const testLine = currentLine + word + ' '; 
        const metrics = ctx.measureText(testLine); 
        const testWidth = metrics.width; 

        if (testWidth > maxWidth && currentLine) {
            lines.push(currentLine.trim()); 
            currentLine = word + ' '; 
        } else {
            currentLine = testLine; 
        }
    });

    if (currentLine) {
        lines.push(currentLine.trim());
    }

    return lines; 
}

function drawWrappedText(lines, ctx, x, startY, lineHeight, color) {
    let adjustedY = startY - (lines.length * lineHeight);

    lines.forEach(line => {
        ctx.font = '2.6em sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.letterSpacing = '3px';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'baseline';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = color;
        ctx.fillText(line, x, adjustedY);
        ctx.strokeStyle = "black"
        ctx.strokeText(line, x, adjustedY);

        adjustedY += lineHeight;
    });
}

function processQueue() {
    let textQueue = getTextQueue();

    if (textQueue.length === 0) {
        setIsDisplayingText(false);
        return;
    }

    setIsDisplayingText(true);

    const { text, color, resolve, xPos, yPos } = textQueue.shift();
    setCurrentXposNpc(xPos);
    setCurrentYposNpc(yPos);
    setDisplayText(text, color); 
    console.log('Displaying text:', text);

    if (textTimer) {
        clearTimeout(textTimer);
    }

    textTimer = setTimeout(() => {
        setDisplayText('', null);
        if (resolve) {
            console.log('Promise resolved!');
            resolve();
        }
        processQueue();
    }, getTextDisplayDuration());
}

export function showText(text, color, xPos, yPos) {
    return new Promise((resolve) => {
        let textQueue = getTextQueue();
        textQueue.push({ text, color, xPos, yPos, resolve});
        setTextQueue(textQueue);

        processQueue();
    });
}

export function loadGameData(gridUrl, screenNavUrl, objectsUrl, dialogueUrl, npcUrl) {
    fetch(gridUrl)
        .then(response => response.json())
        .then(gridData => {
            setGridData(gridData);
            console.log("Grid data loaded:", getGridData());
        })
        .catch(error => {
            console.error("Error loading grid data:", error);
        });

    fetch(screenNavUrl)
        .then(response => response.json())
        .then(navData => {
            setNavigationData(navData);
            console.log("Navigation data loaded:", getNavigationData());
        })
        .catch(error => {
            console.error("Error loading navigation data:", error);
        });

    fetch(objectsUrl)
        .then(response => response.json())
        .then(objectsData => {
            setObjectsData(objectsData);
            console.log("Object data loaded:", getObjectData());
        })
        .catch(error => {
            console.error("Error loading object data:", error);
        });

    fetch(dialogueUrl)
        .then(response => response.json())
        .then(dialogueData => {
            setDialogueData(dialogueData);
            console.log("Dialogue data loaded:", getDialogueData());
        })
        .catch(error => {
            console.error("Error loading dialogue data:", error);
        });

    fetch(npcUrl)
    .then(response => response.json())
    .then(npcData => {
        setNpcData(npcData);
        console.log("Npc data loaded:", getNpcData());
    })
    .catch(error => {
        console.error("Error loading npc data:", error);
    });
}

export function resetSecondItemState() {
    setWaitingForSecondItem(false);
    setObjectToBeUsedWithSecondItem(null);
    setSecondItemAlreadyHovered(null);
}

function adjustColor(color, reduction) {
    const rgbValues = color.match(/\d+/g).map(Number);
    const adjustedRgbValues = rgbValues.map(value => Math.max(0, value - reduction));
    return `rgb(${adjustedRgbValues[0]}, ${adjustedRgbValues[1]}, ${adjustedRgbValues[2]})`;
}

export function addDialogueRow(dialogueOptionText) {
    const dialogueSection = getElements().dialogueSection;
    
    const newRow = document.createElement('div');
    newRow.classList.add('row', 'dialogueRow');
    
    const newCol = document.createElement('div');
    newCol.classList.add('col-12');

    newCol.textContent = dialogueOptionText;
    newRow.appendChild(newCol);
    dialogueSection.appendChild(newRow);
}

export function removeDialogueRow(rowNumber) {
    const dialogueSection = getElements().dialogueSection;

    if (rowNumber === 0) { //remove all rows
        dialogueSection.innerHTML = "";
        return;
    }

    if (rowNumber > 0 && rowNumber <= dialogueSection.children.length) {
        const index = rowNumber - 1;
        dialogueSection.removeChild(dialogueSection.children[index]);
    } else {
        console.error('Invalid row number cannot remove check code');
    }
}


