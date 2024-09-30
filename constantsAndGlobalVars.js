//DEBUG
export let debugFlag = false;
export let debugOptionFlag = false;
export let stateLoading = false;

//ELEMENTS
let elements;
let localization = {};
let language = 'en';
let languageSelected = 'en';
let oldLanguage = 'en';

//CONSTANTS
export const urlWalkableJSONS = '.\\resources\\screenWalkableJSONS\\masterJSONData.json';
export const urlNavigationData = '.\\resources\\screenNavigation.json';
export const urlObjectsData = '.\\resources\\objects.json';
export const urlDialogueData = '.\\resources\\dialogue.json';
export const urlNpcsData = '.\\resources\\npc.json';
export const urlCustomMouseCursorNormal = './resources/mouse/mouseCrosshair.png';
export const urlCustomMouseCursorHoverInteresting = './resources/mouse/mouseHoverInteresting.png';
export const urlCustomMouseCursorClickInteresting = './resources/mouse/mouseClickInteresting.png';
export const urlCustomMouseCursorError = './resources/mouse/mouseNoPathFound.png';
export const MENU_STATE = 'menuState';
export const GAME_VISIBLE_ACTIVE = 'gameVisibleActive';
export const CUT_SCENE = 'cutSceneState';
export const INITIAL_SCREEN_ID = 'libraryFoyerDebug'; //libraryFoyer is the start point change for debug
export const INITIAL_PLAYER_GRID_REF = {x: 5,y: 59}; //player start location on initial screen
export const GRID_SIZE_X = 80;
export const GRID_SIZE_Y = 60;
export const WALK_SPEED_PLAYER = 3;
export const SLOTS_PER_ROW_IN_INVENTORY = 5; 
export const TEXT_DISPLAY_DURATION = 3500;
export const MAX_TEXT_DISPLAY_WIDTH = 1200;

export let playerObject = {
    originalWidth: 45,
    originalHeight: 180,
    width: 45,
    height: 180,
    speed: getWalkSpeedPlayer(),
    color: 'rgba(0, 100, 0, 1)',
    xPos: '0',
    yPos: '0'
};

export let playerInventory = {    
};

//GLOBAL VARIABLES
export let gameState;
let hoverCell = { x: 0, y: 0 };
let canvasCellWidth = 15;
let canvasCellHeight = 10;
let gridTargetX = null;
let gridTargetY = null;
let targetX = null;
let targetY = null;
let gridData = null;
let navigationData = null;
let objectData = null;
let dialogueData = null;
let npcData = null;
let currentScreenId = INITIAL_SCREEN_ID;
let previousScreenId = INITIAL_SCREEN_ID;
let nextScreenId = INITIAL_SCREEN_ID;
let exitNumberToTransitionTo = null;
let zPosHover = null;
let upcomingAction = null;
let originalValueInCellWhereObjectOrNpcPlaced = {};
let currentStartIndexInventory = 0;
let displayText = null;
let objectToBeUsedWithSecondItem = null;
let secondItemAlreadyHovered = null;
let textQueue = [];
let previousGameState = null;

//FLAGS
let audioMuted;
let languageChangedFlag;
let beginGameState = true;
let gameInProgress = false;
let transitioningToAnotherScreen = false;
let transitioningNow = false;
let currentlyMoving = false;
let currentlyMovingToAction = false;
let hoveringInterestingObjectOrExit = false;
let lookingForAlternativePathToNearestWalkable = false;
let verbConstructionActive = null;
let waitingForSecondItem = null;
let isDisplayingText = false;

//let autoSaveOn = false;
//export let pauseAutoSaveCountdown = true;

//GETTER SETTER METHODS
export function setElements() {
    elements = {
        inventoryUpArrow: document.querySelector('.inventory-up'),
        inventoryDownArrow: document.querySelector('.inventory-down'),
        interactionInfo: document.getElementById('interactionInfo'),
        customCursor: document.querySelector('.custom-mouse'),
        customCursorImage: document.querySelector('.custom-mouse-image'),
        overlayCanvas: document.querySelector('.overlay-canvas'),
        menu: document.getElementById('menu'),
        menuTitle: document.getElementById('menuTitle'),
        newGameMenuButton:  document.getElementById('newGame'),
        resumeGameMenuButton: document.getElementById('resumeFromMenu'),
        loadGameButton: document.getElementById('loadGame'),
        saveGameButton: document.getElementById('saveGame'),
        saveLoadPopup: document.getElementById('loadSaveGameStringPopup'),
        loadSaveGameStringTextArea: document.getElementById('loadSaveGameStringTextArea'),
        loadStringButton: document.getElementById('loadStringButton'),
        textAreaLabel: document.getElementById('textAreaLabel'),
        returnToMenuButton: document.getElementById('returnToMenu'),
        pauseResumeGameButton: document.getElementById('resumeGame'),
        canvas: document.getElementById('canvas'),
        canvasContainer: document.getElementById('canvasContainer'),
        buttonRow: document.getElementById('buttonRow'),
        btnEnglish: document.getElementById('btnEnglish'),
        btnSpanish: document.getElementById('btnSpanish'),
        btnFrench: document.getElementById('btnFrench'),
        btnGerman: document.getElementById('btnGerman'),
        btnItalian: document.getElementById('btnItalian'),
        copyButtonSavePopup: document.getElementById('copyButtonSavePopup'),
        closeButtonSavePopup: document.getElementById('closeButtonSavePopup'),
        overlay: document.getElementById('overlay'),
        btnLookAt: document.getElementById('btnLookAt'),
        btnPickUp: document.getElementById('btnPickUp'),
        btnUse: document.getElementById('btnUse'),
        btnOpen: document.getElementById('btnOpen'),
        btnClose: document.getElementById('btnClose'),
        btnPush: document.getElementById('btnPush'),
        btnPull: document.getElementById('btnPull'),
        btnTalkTo: document.getElementById('btnTalkTo'),
        btnGive: document.getElementById('btnGive')
    };
}

export function getCurrentScreenId() {
    return currentScreenId;
}

export function setCurrentScreenId(value) {
    currentScreenId = value;
}

export function getPreviousScreenId() {
    return previousScreenId;
}

export function setPreviousScreenId(value) {
    previousScreenId = value;
}

export function getNextScreenId() {
    return nextScreenId;
}

export function setNextScreenId(value) {
    nextScreenId = value;
}

export function getGridData() {
    let screenId;
    let idType;
    if (getTransitioningNow()) {
        screenId = getNextScreenId(); // If transitioning use next screen id
        idType = 'next';
    } else {
        screenId = getCurrentScreenId(); // Normally use current screen id
        idType = 'current';
    }
    return { gridData: gridData[screenId], idType: idType }; // Returns both values as an object
}

export function getAllGridData() {
    return gridData;
}

export function setGridData(value) {
    gridData = value;
}

export function getNavigationData() {
    return navigationData;
}

export function setNavigationData(value) {
    navigationData = value;
}

export function getObjectData() {
    return objectData;
}

export function setObjectsData(value) { // purposely spelt this way because we have a 'pre' setter called setObjectData(value) in handleCommands.js that provides an easier interface for setting thevalues faster
    objectData = value;
}

export function setDialogueData(value) {
    dialogueData = value;
}

export function getDialogueData() {
    return dialogueData;
}

export function setNpcData(value) {
    npcData = value;
}

export function getNpcData() {
    return npcData;
}

export function getInitialScreenId() {
    return INITIAL_SCREEN_ID;
}

export function getInitialStartGridReference() {
    return INITIAL_PLAYER_GRID_REF;
}

export function getPlayerObject() {
    return playerObject;
}

export function setPlayerObject(property, value) {
    playerObject[property] = value;
}

export function setGameStateVariable(value) {
    gameState = value;
}

export function getGameStateVariable() {
    return gameState;
}

export function getElements() {
    return elements;
}

export function getLanguageChangedFlag() {
    return languageChangedFlag;
}

export function setLanguageChangedFlag(value) {
    languageChangedFlag = value;
}

export function resetAllVariables() {
    // GLOBAL VARIABLES

    // FLAGS
}

export function captureGameStatusForSaving() {
    let gameState = {};

    // Game variables

    // Flags

    // UI elements

    gameState.language = getLanguage();

    return gameState;
}
export function restoreGameStatus(gameState) {
    return new Promise((resolve, reject) => {
        try {
            // Game variables

            // Flags

            // UI elements

            setLanguage(gameState.language);

            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

export function setLocalization(value) {
    localization = value;
}

export function getLocalization() {
    return localization;
}

export function setLanguage(value) {
    language = value;
}

export function getLanguage() {
    return language;
}

export function setOldLanguage(value) {
    oldLanguage = value;
}

export function getOldLanguage() {
    return oldLanguage;
}

export function setAudioMuted(value) {
    audioMuted = value;
}

export function getAudioMuted() {
    return audioMuted;
}

export function getMenuState() {
    return MENU_STATE;
}

export function setPreviousGameState(value) {
    previousGameState = value;
}

export function getPreviousGameState() {
    return previousGameState;
}

export function getGameVisibleActive() {
    return GAME_VISIBLE_ACTIVE;
}

export function getCutSceneState() {
    return CUT_SCENE;
}

export function getWalkSpeedPlayer() {
    return WALK_SPEED_PLAYER;
}

export function getLanguageSelected() {
    return languageSelected;
}

export function setLanguageSelected(value) {
    languageSelected = value;
}

export function getBeginGameStatus() {
    return beginGameState;
}

export function setBeginGameStatus(value) {
    beginGameState = value;
}

export function getGameInProgress() {
    return gameInProgress;
}

export function setGameInProgress(value) {
    gameInProgress = value;
}

export function setTargetX(value) {
    targetX = value;
}

export function setTargetY(value) {
    targetY = value;
}

export function getTargetX() {
   return targetX;
}

export function getTargetY() {
    return targetY;
}

export function setGridTargetX(value) {
    gridTargetX = value;
}

export function setGridTargetY(value) {
    gridTargetY = value;
}

export function getGridTargetX() {
   return gridTargetX;
}

export function getGridTargetY() {
    return gridTargetY;
}

export function setCanvasCellWidth(value) {
    canvasCellWidth = value;
}

export function setCanvasCellHeight(value) {
    canvasCellHeight = value;
}

export function getCanvasCellWidth() {
   return canvasCellWidth;
}

export function getCanvasCellHeight() {
    return canvasCellHeight;
}

export function setHoverCell(valueX, valueY) {
    hoverCell = { x: valueX, y: valueY };
}

export function getHoverCell() {
   return hoverCell;
}

export function getZPosHover() {
    return zPosHover;
 }

 export function setZPosHover(value) {
    zPosHover = value;
}

export function getGridSizeX() {
    return GRID_SIZE_X;
}

export function getGridSizeY() {
    return GRID_SIZE_Y;
}

export function getTransitioningToAnotherScreen() {
    return transitioningToAnotherScreen;
}

export function setTransitioningToAnotherScreen(value) {
    transitioningToAnotherScreen = value;
}

export function getTransitioningNow() {
    return transitioningNow;
}

export function setTransitioningNow(value) {
    transitioningNow = value;
}

export function getExitNumberToTransitionTo() {
    return exitNumberToTransitionTo;
}

export function setExitNumberToTransitionTo(value) {
    exitNumberToTransitionTo = value;
}

export function setCurrentlyMoving(value) {
    currentlyMoving = value;
}

export function getCurrentlyMoving() {
    return currentlyMoving;
}

export function setCurrentlyMovingToAction(value) {
    currentlyMovingToAction = value;
}

export function getCurrentlyMovingToAction() {
    return currentlyMovingToAction;
}

export function setHoveringInterestingObjectOrExit(value) {
    hoveringInterestingObjectOrExit = value;
}

export function getHoveringInterestingObjectOrExit() {
    return hoveringInterestingObjectOrExit;
}

export function setLookingForAlternativePathToNearestWalkable(value) {
    lookingForAlternativePathToNearestWalkable = value;
}

export function getLookingForAlternativePathToNearestWalkable() {
    return lookingForAlternativePathToNearestWalkable;
}

setLookingForAlternativePathToNearestWalkable

export function setCustomMouseCursor(value) {
    getElements().customCursorImage.src = value;
}

export function getCustomMouseCursor(value) {
    switch (value) {
        case 'normal':
            return urlCustomMouseCursorNormal;
        case 'hoveringInteresting':
            return urlCustomMouseCursorHoverInteresting;
        case 'clickInteresting':
            return urlCustomMouseCursorClickInteresting;
        default:
            return urlCustomMouseCursorError;
    }
}

export function setVerbButtonConstructionStatus(value) {
    verbConstructionActive = value;
}

export function getVerbButtonConstructionStatus() {
    switch(verbConstructionActive) {
        case null:
            return 'interactionWalkTo';
        case btnLookAt:
            return 'interactionLookAt';
        case btnPickUp:
            return 'interactionPickUp';
        case btnUse:
            return 'interactionUse';
        case btnOpen:
            return 'interactionOpen';
        case btnClose:
            return 'interactionClose';
        case btnPush:
            return 'interactionPush';
        case btnPull:
            return 'interactionPull';
        case btnTalkTo:
            return 'interactionTalkTo';
        case btnGive:
            return 'interactionGive';
    }
}

export function setUpcomingAction(value) {
    upcomingAction = value;
}

export function getUpcomingAction() {
    return upcomingAction;
}

export function getOriginalValueInCellWhereObjectOrNpcPlaced() {
    return originalValueInCellWhereObjectOrNpcPlaced;
}

export function setOriginalValueInCellWhereObjectOrNpcPlaced(roomId, gridX, gridY, objectId, originalValue) {
    if (!originalValueInCellWhereObjectOrNpcPlaced[roomId]) {
        originalValueInCellWhereObjectOrNpcPlaced[roomId] = {};
    }
    const cellKey = `${gridX},${gridY}`;
    originalValueInCellWhereObjectOrNpcPlaced[roomId][cellKey] = {
        objectId: objectId,
        originalValue: originalValue,
    };
}

export function setPlayerInventory(value) {
    playerInventory = value;
}

export function getPlayerInventory() {
    return playerInventory;
}

export function getSlotsPerRowInInventory() {
    return SLOTS_PER_ROW_IN_INVENTORY;
}

export function setCurrentStartIndexInventory(value) {
    currentStartIndexInventory = value;
}

export function getCurrentStartIndexInventory() {
    return currentStartIndexInventory;
}

export function setDisplayText(value) {
    displayText = value;
}

export function getDisplayText() {
    return displayText;
}

export function getTextDisplayDuration() {
    return TEXT_DISPLAY_DURATION;
}

export function getMaxTexTDisplayWidth() {
    return MAX_TEXT_DISPLAY_WIDTH;
}

export function setWaitingForSecondItem(value) {
    waitingForSecondItem = value;
}

export function getWaitingForSecondItem() {
    return waitingForSecondItem;
}

export function setSecondItemAlreadyHovered(value) {
    secondItemAlreadyHovered = value;
}

export function getSecondItemAlreadyHovered() {
    return secondItemAlreadyHovered;
}

export function setObjectToBeUsedWithSecondItem(value) {
    objectToBeUsedWithSecondItem = value;
}

export function getObjectToBeUsedWithSecondItem() {
    return objectToBeUsedWithSecondItem;
}

export function setIsDisplayingText(value) {
    isDisplayingText = value;
}

export function getIsDisplayingText() {
    return isDisplayingText;
}

export function setTextQueue(value) {
    textQueue = value;
}

export function getTextQueue() {
    return textQueue;
}