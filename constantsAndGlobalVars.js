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
export const MENU_STATE = 'menuState';
export const GAME_VISIBLE_ACTIVE = 'gameVisibleActive';
export const NUMBER_OF_ENEMY_SQUARES = 10;
export const MAX_ATTEMPTS_TO_DRAW_ENEMIES = 1000;
export const INITIAL_SCREEN_ID = 'libraryFoyer'; //libraryFoyer is the start point change for debug
export const GRID_SIZE_X = 80;
export const GRID_SIZE_Y = 60;
export const WALK_SPEED_PLAYER = 3;

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
let currentScreenId = INITIAL_SCREEN_ID;
let previousScreenId = INITIAL_SCREEN_ID;
let nextScreenId = INITIAL_SCREEN_ID;
let exitNumberToTransitionTo = null;
let zPosHover = null;

//FLAGS
let audioMuted;
let languageChangedFlag;
let beginGameState = true;
let gameInProgress = false;
let transitioningToAnotherScreen = false;
let transitioningNow = false;
let currentlyMoving = false;

//let autoSaveOn = false;
//export let pauseAutoSaveCountdown = true;

//GETTER SETTER METHODS
export function setElements() {
    elements = {
        interactionInfo: document.getElementById('interactionInfo'),
        customCursor: document.querySelector('.custom-mouse'),
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


export function setGridData(value) {
    gridData = value;
}

export function getNavigationData() {
    return navigationData;
}

export function setNavigationData(value) {
    navigationData = value;
}

export function getInitialScreenId() {
    return INITIAL_SCREEN_ID;
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

export function getGameVisibleActive() {
    return GAME_VISIBLE_ACTIVE;
}

export function getNumberOfEnemySquares() {
    return NUMBER_OF_ENEMY_SQUARES;
}

export function getWalkSpeedPlayer() {
    return WALK_SPEED_PLAYER;
}

export function getMaxAttemptsToDrawEnemies() {
    return MAX_ATTEMPTS_TO_DRAW_ENEMIES;
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