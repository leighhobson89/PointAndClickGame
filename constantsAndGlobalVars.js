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
export let gameState;
export const MENU_STATE = 'menuState';
export const GAME_VISIBLE_ACTIVE = 'gameVisibleActive';
export const NUMBER_OF_ENEMY_SQUARES = 10;
export const WALK_SPEED_PLAYER = 8;
export const MAX_ATTEMPTS_TO_DRAW_ENEMIES = 1000;
export const INITIAL_SCREEN_ID = 'screen1';
export const INITIAL_PATH = 'path1';
export const INITIAL_SNAP_POINT_ON_PATH = 5;

export let playerObject = {
    width: 40,
    height: 160,
    speed: getWalkSpeedPlayer(),
    color: 'green',
    xPos: '0',
    yPos: '0'
};

//GLOBAL VARIABLES
let canvasCellWidth = null;
let canvasCellHeight = null;
let gridTargetX = null;
let gridTargetY = null;
let targetX = null;
let targetY = null;
let pathsData = null;
let currentScreenId = INITIAL_SCREEN_ID;
let currentPath = INITIAL_PATH;

//FLAGS
let audioMuted;
let languageChangedFlag;
let beginGameState = true;
let gameInProgress = false;

//let autoSaveOn = false;
//export let pauseAutoSaveCountdown = true;

//GETTER SETTER METHODS
export function setElements() {
    elements = {
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

export function getStartPosition() {
    return INITIAL_SNAP_POINT_ON_PATH;
}

export function getCurrentPath() {
    return currentPath;
}

export function setCurrentPath(value) {
    currentPath = value;
}

export function getCurrentScreenId() {
    return currentScreenId;
}

export function setCurrentScreenId(value) {
    currentScreenId = value;
}

export function getPathsData() {
    return pathsData;
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




