//DEBUG
export let debugFlag = false;
export let debugOptionFlag = false;
export let stateLoading = false;
export let nonPlayerAnimationFunctionalityActive = true;

//ELEMENTS
let elements;
let localization = {};
let language = 'en';
let languageSelected = 'en';
let oldLanguage = 'en';

//CONSTANTS
export const urlWalkableJSONS = '.\\resources\\screenWalkableJSONS\\masterJSONData.json';
export const urlNavigationData = '.\\resources\\screenNavigation.json';
export const urlObjectsData = '.\\resources\\objectsGame.json';
export const urlNpcsData = '.\\resources\\npcGame.json';
export const urlObjectsDataDebug = '.\\resources\\debugJSONs\\objectsDebug.json';
export const urlNpcsDataDebug = '.\\resources\\debugJSONs\\npcDebug.json';
export const urlDialogueData = '.\\resources\\dialogue.json';
export const urlForegroundData = '..\\resources\\screenWalkableJSONS\\masterForegroundData.json';
export const urlCustomMouseCursorNormal = './resources/mouse/mouseCrosshair.png';
export const urlCustomMouseCursorHoverInteresting = './resources/mouse/mouseHoverInteresting.png';
export const urlCustomMouseCursorClickInteresting = './resources/mouse/mouseClickInteresting.png';
export const urlCustomMouseCursorError = './resources/mouse/mouseNoPathFound.png';
export const INITIAL_GAME_ID_NORMAL = 'marketStreet';
export const INITIAL_GAME_ID_DEBUG = 'debugRoom';
export const PRE_INITIAL_GAME_BACKGROUND = './resources/backgrounds/preStartBackgroundImage.png'; //pre intro
export const INITIAL_GAME_BACKGROUND_URL_NORMAL = './resources/backgrounds/marketStreet.png';
export const INITIAL_GAME_BACKGROUND_URL_DEBUG = './resources/backgrounds/debugRoom.png';
export const MENU_STATE = 'menuState';
export const GAME_VISIBLE_ACTIVE = 'gameVisibleActive';
export const CUT_SCENE = 'cutSceneState';
export const INTERACTION_DIALOGUE_STATE = 'interactionDialogueState';
export const INITIAL_PLAYER_GRID_REF = {x: 10, y: 57}; //player start location on initial screen //10, 57
export const GRID_SIZE_X = 80;
export const GRID_SIZE_Y = 60;
export const WALK_SPEED_PLAYER = 3;
export const SLOTS_PER_ROW_IN_INVENTORY = 5; 
export const TEXT_DISPLAY_DURATION = 3500; //3500
export const MAX_TEXT_DISPLAY_WIDTH = 700;
export const COLOR_TEXT_PLAYER = 'rgb(255,255,255)';
export const shouldNotBeResizedArray = ['objectParrakeet', 'objectDonkeyFake']; //add any animating objects that should not be resized

export let playerObject = {
    originalWidth: 65,
    originalHeight: 140,
    width: 65,
    height: 140,
    speed: getWalkSpeedPlayer(),
    baselineSpeedForRoom: getWalkSpeedPlayer(),
    xPos: 0,
    yPos: 0,
    activeSprite: "still_right",
    frameCount: 0,
    sprites: {
        "still_up": "./resources/player/still_up.png",
        "move1_up": "./resources/player/move1_up.png",
        "move2_up": "./resources/player/move2_up.png",
        "still_down": "./resources/player/still_down.png",
        "move1_down": "./resources/player/move1_down.png",
        "move2_down": "./resources/player/move2_down.png",
        "still_left": "./resources/player/still_left.png",
        "move1_left": "./resources/player/move1_left.png",
        "move2_left": "./resources/player/move2_left.png",
        "move3_left": "./resources/player/move3_left.png",
        "move4_left": "./resources/player/move4_left.png",
        "move5_left": "./resources/player/move5_left.png",
        "move6_left": "./resources/player/move6_left.png",
        "move7_left": "./resources/player/move7_left.png",
        "move8_left": "./resources/player/move8_left.png",
        "move9_left": "./resources/player/move9_left.png",
        "still_right": "./resources/player/still_right.png",
        "move1_right": "./resources/player/move1_right.png",
        "move2_right": "./resources/player/move2_right.png",
        "move3_right": "./resources/player/move3_right.png",
        "move4_right": "./resources/player/move4_right.png",
        "move5_right": "./resources/player/move5_right.png",
        "move6_right": "./resources/player/move6_right.png",
        "move7_right": "./resources/player/move7_right.png",
        "move8_right": "./resources/player/move8_right.png",
        "move9_right": "./resources/player/move9_right.png"
    }
};

export let playerInventory = {};

//GLOBAL VARIABLES
export let initialScreenId = '';
export let initialBackgroundValue = '';

export let gameState;
let hoverCell = { x: 0, y: 0 };
let canvasCellWidth = 15;
let canvasCellHeight = 10;
let gridTargetX = null;
let gridTargetY = null;
let targetXPlayer = null;
let targetYPlayer = null;
let targetXEntity = {};
let targetYEntity = {};
let gridData = null;
let navigationData = null;
let objectData = null;
let dialogueData = null;
let npcData = null;
let foregroundsData = null;
let currentScreenId = initialScreenId;
let previousScreenId = initialScreenId;
let nextScreenId = initialScreenId;
let exitNumberToTransitionTo = null;
let zPosHover = null;
let upcomingAction = null;
let originalValueInCellWhereObjectPlaced = {};
let originalValueInCellWhereNpcPlaced = {};
let originalValueInCellWhereObjectPlacedNew = {};
let originalValueInCellWhereNpcPlacedNew = {};
let originalGridState = {};
let resizedObjectsGridState = {};
let resizedNpcsGridState = {};
let preAnimationGridStates = [];
let currentStartIndexInventory = 0;
let displayText = {};
let objectToBeUsedWithSecondItem = null;
let secondItemAlreadyHovered = null;
let textQueue = [];
let previousGameState = null;
let currentXposNpc = null;
let currentYposNpc = null;
let currentSpeaker = null;
let bottomContainerHeight = null;
let currentDialogueRowsOptionsIds = {};
let dialogueOptionsScrollReserve = [];
let currentExitOptionRow;
let dialogueRows = [];
let dialogueOptionClicked;
let dialogueTextClicked;
let removedDialogueOptions = [];
let currentExitOptionText = null;
let currentScrollIndexDialogue = 0;
let resolveDialogueOptionClick;
let dialogueScrollCount = 0;
let exitOptionIndex = -1;
let clickPoint = null;
let scrollPositionX;
let scrollDirection = 0;
let swappedDialogueObject = {};
let pendingEvent = [];
let verbsBlockedExcept = [];
let forcePlayerLocation = [];
let bridgeState = 0;
let playerDirection = 'right';
let playerMovementStatus = [];
let currentForegroundImage = null;
let currentPlayerImage = null;
let trackingGrid = Array.from({ length: getGridSizeY() }, () => Array(getGridSizeX()).fill("-"));

//GLOBAL FLAGS
let audioMuted;
let languageChangedFlag;
let beginGameState = true;
let gameInProgress = false;
let transitioningToAnotherScreen = false;
let transitioningNow = false;
let currentlyMovingToAction = false;
let hoveringInterestingObjectOrExit = false;
let lookingForAlternativePathToNearestWalkable = false;
let verbConstructionActive = null;
let waitingForSecondItem = null;
let isDisplayingText = false;
let objectOriginalValueUpdatedYet = false;
let animationInProgress = false;
let transitioningToDialogueState = false;
let readyToAdvanceNpcQuestPhase = false;
let triggerQuestPhaseAdvance = false;
let canExitDialogueAtThisPoint = false;
let scrollingActive = false;
let earlyExitFromDialogue = false;
let drawGrid = false;
let cantGoThatWay = false;
let currentScreenHasForegroundItems = true;
let foregroundGridProcessed = false;

//IMAGE URLS
export const arrayOfGameImages = [
    //BACKGROUNDS
    "./resources/backgrounds/barn.png",
    "./resources/backgrounds/deadTree.png",
    "./resources/backgrounds/carpenter.png",
    "./resources/backgrounds/cowPathBrokenFence.png",
    "./resources/backgrounds/cowPathRepairedFence.png",
    "./resources/backgrounds/debugRoom.png",
    "./resources/backgrounds/den.png",
    "./resources/backgrounds/house.png",
    "./resources/backgrounds/kitchen.png",
    "./resources/backgrounds/largePileOfPoo.png",
    "./resources/backgrounds/libraryFoyer.png",
    "./resources/backgrounds/marketStreet.png",
    "./resources/backgrounds/researchRoom.png",
    "./resources/backgrounds/riverCrossing.png",
    "./resources/backgrounds/riverCrossingBridgeHalfComplete.png",
    "./resources/backgrounds/riverCrossingBridgeComplete.png",
    "./resources/backgrounds/roadIntoTown.png",
    "./resources/backgrounds/alley.png",
    "./resources/backgrounds/sewer.png",
    "./resources/backgrounds/stables.png",
    "./resources/backgrounds/stablesTemp.png",
    "./resources/backgrounds/stinkingDump.png",
    "./resources/backgrounds/testWide.png",

    //FOREGROUNDS
    "./resources/foregrounds/libraryFoyer.png",
    "./resources/foregrounds/marketStreet.png",
    "./resources/foregrounds/riverCrossing.png",
    "./resources/foregrounds/riverCrossingBridgeHalfComplete.png",
    "./resources/foregrounds/riverCrossingBridgeComplete.png",
    "./resources/foregrounds/sewer.png",
    "./resources/foregrounds/stables.png",
    "./resources/foregrounds/stablesTemp.png",

    //OBJECTS
    "./resources/objects/images/banana.png",
    "./resources/objects/images/barrelBarnClosedWorld.png",
    "./resources/objects/images/barrelBarnOpenHandleWorld.png",
    "./resources/objects/images/barrelBarnOpenWorld.png",
    "./resources/objects/images/battery.png",
    "./resources/objects/images/blank.png",
    "./resources/objects/images/boneInv.png",
    "./resources/objects/images/bonePulleyWorld.png",
    "./resources/objects/images/boneWorld.png",
    "./resources/objects/images/bowlInv.png",
    "./resources/objects/images/bowlWorld.png",
    "./resources/objects/images/carrotInv.png",
    "./resources/objects/images/carrotWorld.png",
    "./resources/objects/images/crowbarInv.png",
    "./resources/objects/images/crowbarWorld.png",
    "./resources/objects/images/donkeyNotOnRopeLeft.png",
    "./resources/objects/images/donkeyNotOnRopeRight.png",
    "./resources/objects/images/donkeyOnRopeHappy.png",
    "./resources/objects/images/goldKeyInv.png",
    "./resources/objects/images/goldKeyWorld.png",
    "./resources/objects/images/hookInv.png",
    "./resources/objects/images/hookWorld.png",
    "./resources/objects/images/IllegibleMapInv.png",
    "./resources/objects/images/IllegibleMapWorld.png",
    "./resources/objects/images/keyDenInv.png",
    "./resources/objects/images/libraryFoyer_Exit_MarketStreetClosed.png",
    "./resources/objects/images/libraryFoyer_Exit_MarketStreetOpen.png",
    "./resources/objects/images/marketStreet_Exit_LibraryFoyerClosed.png",
    "./resources/objects/images/marketStreet_Exit_LibraryFoyerOpen.png",
    "./resources/objects/images/libraryFoyer_Exit_ResearchRoomClosed.png",
    "./resources/objects/images/libraryFoyer_Exit_ResearchRoomOpen.png",
    "./resources/objects/images/machine.png",
    "./resources/objects/images/malletInv.png",
    "./resources/objects/images/malletWorld.png",
    "./resources/objects/images/manholeCover.png",
    "./resources/objects/images/manholeCoverFixed.png",
    "./resources/objects/images/milkBottleInv.png",
    "./resources/objects/images/milkBottleWorld.png",
    "./resources/objects/images/milkInBowlInv.png",
    "./resources/objects/images/nailsInv.png",
    "./resources/objects/images/nailsWorld.png",
    "./resources/objects/images/oldGRedGloveInv.png",
    "./resources/objects/images/oldGRedGloveWorld.png",
    "./resources/objects/images/paperScrawledOnInv.png",
    "./resources/objects/images/parrotFlyerInv.png",
    "./resources/objects/images/parrotFlyerWorld.png",
    "./resources/objects/images/parrotLeft.png",
    "./resources/objects/images/parrotMirrorInv.png",
    "./resources/objects/images/parrotMirrorWorld.png",
    "./resources/objects/images/parrotRight.png",
    "./resources/objects/images/pitchForkInv.png",
    "./resources/objects/images/pitchForkWorld.png",
    "./resources/objects/images/pliersInv.png",
    "./resources/objects/images/pliersWorld.png",
    "./resources/objects/images/pulleyInv.png",
    "./resources/objects/images/pulleyWorld.png",
    "./resources/objects/images/ropeHookInv.png",
    "./resources/objects/images/ropeHookWorld.png",
    "./resources/objects/images/ropeInv.png",
    "./resources/objects/images/ropeWorld.png",
    "./resources/objects/images/alley_Exit_DenClosed.png",
    "./resources/objects/images/alley_Exit_DenOpen.png",
    "./resources/objects/images/splinterInv.png",
    "./resources/objects/images/splinterPulleyWorld.png",

    //NPCS
    "./resources/npcs/blank.png",
    "./resources/npcs/carpenterNpc.png",
    "./resources/npcs/carpenterNpcBack.png",
    "./resources/npcs/carpenterNpcLeft.png",
    "./resources/npcs/carpenterNpcRight.png",
    "./resources/npcs/cowHappy.png",
    "./resources/npcs/cowPain.png",
    "./resources/npcs/donkeyNotOnRope.png",
    "./resources/npcs/donkeyOnRope.png",
    "./resources/npcs/farmer.png",
    "./resources/npcs/librarian.png",
    "./resources/npcs/monkey.png",
    "./resources/npcs/seedyGuy.png",
    "./resources/npcs/townDogLeft.png",
    "./resources/npcs/townDogNoBone.png",
    "./resources/npcs/townDogRight.png",
    "./resources/npcs/womanLostMirrorLeft.png",
    "./resources/npcs/womanLostMirrorRight.png",

    //PLAYER
    "./resources/player/still_up.png",
    "./resources/player/move1_up.png",
    "./resources/player/move2_up.png",
    "./resources/player/still_down.png",
    "./resources/player/move1_down.png",
    "./resources/player/move2_down.png",
    "./resources/player/still_left.png",
    "./resources/player/move1_left.png",
    "./resources/player/move2_left.png",
    "./resources/player/move3_left.png",
    "./resources/player/move4_left.png",
    "./resources/player/move5_left.png",
    "./resources/player/move6_left.png",
    "./resources/player/move7_left.png",
    "./resources/player/move8_left.png",
    "./resources/player/move9_left.png",
    "./resources/player/still_right.png",
    "./resources/player/move1_right.png",
    "./resources/player/move2_right.png",
    "./resources/player/move3_right.png",
    "./resources/player/move4_right.png",
    "./resources/player/move5_right.png",
    "./resources/player/move6_right.png",
    "./resources/player/move7_right.png",
    "./resources/player/move8_right.png",
    "./resources/player/move9_right.png",

    //MOUSEPOINTER
    "./resources/mouse/mouseClickInteresting.png",
    "./resources/mouse/mouseCrosshair.png",
    "./resources/mouse/mouseHoverInteresting.png",
    "./resources/mouse/mouseNoPathFound.png",
];

const foregroundsList = [
    "libraryFoyer.png",
    "marketStreet.png",
    "riverCrossing.png",
    "riverCrossingBridgeHalfComplete.png",
    "riverCrossingBridgeComplete.png",
    "sewer.png",
    "stables.png",
    "stablesTemp.png",
]

//EVENT SPECIFIC FLAGS
let animationFinishedFlag = [];

//let autoSaveOn = false;
//export let pauseAutoSaveCountdown = true;

//GETTER SETTER METHODS
export function setElements() {
    elements = {
        dialogueSection: document.getElementById('dialogueSection'),
        bottomContainer: document.getElementById('bottomContainer'),
        verbsInventoryContainer: document.getElementById('verbsInventoryContainer'),
        dialogueContainer: document.getElementById('dialogueContainer'),
        inventoryUpArrow: document.getElementById('inventoryScrollUp'),
        inventoryDownArrow: document.getElementById('inventoryScrollDown'),
        dialogueUpArrow: document.getElementById('dialogueScrollUp'),
        dialogueDownArrow: document.getElementById('dialogueScrollDown'),
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
        debugRoomMenuButton: document.getElementById('debugRoom'),
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

export function setDialoguesData(value) {
    dialogueData = value;
}

export function getDialogueData() {
    return dialogueData;
}

export function setNpcsData(value) {
    npcData = value;
}

export function getForegroundsData() {
    return foregroundsData;
}

export function setForegroundsData(value) {
    foregroundsData = value;
}

export function getNpcData() {
    return npcData;
}

export function getInitialScreenId() {
    return initialScreenId;
}

export function setInitialScreenId(value) {
    initialScreenId = value;
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

export function getInteractiveDialogueState() {
    return INTERACTION_DIALOGUE_STATE;
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

export function setTargetXPlayer(value) {
    targetXPlayer = value;
}

export function setTargetYPlayer(value) {
    targetYPlayer = value;
}

export function getTargetXPlayer() {
   return targetXPlayer;
}

export function getTargetYPlayer() {
    return targetYPlayer;
}

export function setTargetXEntity(entityId, value) {
    targetXEntity[entityId] = value;
}

export function setTargetYEntity(entityId, value) {
    targetYEntity[entityId] = value;
}

export function getTargetXEntity(entityId) {
    return targetXEntity[entityId];
}

export function getTargetYEntity(entityId) {
    return targetYEntity[entityId];
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

export function getOriginalValueInCellWhereObjectPlaced() {
    return originalValueInCellWhereObjectPlaced;
}

export function setOriginalValueInCellWhereObjectPlaced(roomId, gridX, gridY, objectId, originalValue) {
    if (!originalValueInCellWhereObjectPlaced[roomId]) {
        originalValueInCellWhereObjectPlaced[roomId] = {};
    }
    const cellKey = `${gridX},${gridY}`;
    originalValueInCellWhereObjectPlaced[roomId][cellKey] = {
        objectId: objectId,
        originalValue: originalValue,
    };
}

export function getOriginalValueInCellWhereNpcPlaced() {
    return originalValueInCellWhereNpcPlaced;
}

export function setOriginalValueInCellWhereNpcPlaced(roomId, gridX, gridY, npcId, originalValue) {
    if (!originalValueInCellWhereNpcPlaced[roomId]) {
        originalValueInCellWhereNpcPlaced[roomId] = {};
    }
    const cellKey = `${gridX},${gridY}`;
    originalValueInCellWhereNpcPlaced[roomId][cellKey] = {
        npcId: npcId,
        originalValue: originalValue,
    };
}

export function getOriginalValueInCellWhereObjectPlacedNew() {
    return originalValueInCellWhereObjectPlacedNew;
}

export function setOriginalValueInCellWhereObjectPlacedNew(roomId, gridX, gridY, objectId, originalValue) {
    if (!originalValueInCellWhereObjectPlacedNew[roomId]) {
        originalValueInCellWhereObjectPlacedNew[roomId] = {};
    }
    const cellKey = `${gridX},${gridY}`;
    originalValueInCellWhereObjectPlacedNew[roomId][cellKey] = {
        objectId: objectId,
        originalValue: originalValue,
    };
}

export function getOriginalValueInCellWhereNpcPlacedNew() {
    return originalValueInCellWhereNpcPlacedNew;
}

export function setOriginalValueInCellWhereNpcPlacedNew(roomId, gridX, gridY, npcId, originalValue) {
    if (!originalValueInCellWhereNpcPlacedNew[roomId]) {
        originalValueInCellWhereNpcPlacedNew[roomId] = {};
    }
    const cellKey = `${gridX},${gridY}`;
    originalValueInCellWhereNpcPlacedNew[roomId][cellKey] = {
        npcId: npcId,
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

export function setDisplayText(value1, value2) {
    displayText = { value1, value2 };
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

export function getColorTextPlayer() {
    return COLOR_TEXT_PLAYER;
}

export function setCurrentXposNpc(value) {
    currentXposNpc = value;
}

export function getCurrentXposNpc() {
    return currentXposNpc;
}

export function setCurrentYposNpc(value) {
    currentYposNpc = value;
}

export function getCurrentYposNpc() {
    return currentYposNpc;
}

export function setCurrentSpeaker(value) {
    currentSpeaker = value;
}

export function getCurrentSpeaker() {
    return currentSpeaker;
}

export function setObjectOriginalValueUpdatedYet(value) {
    objectOriginalValueUpdatedYet = value;
}

export function getObjectOriginalValueUpdatedYet() {
    return objectOriginalValueUpdatedYet;
}

export function setOriginalGridState(value) {
    originalGridState = JSON.parse(JSON.stringify(value));
}

export function getOriginalGridState() {
    return JSON.parse(JSON.stringify(originalGridState)); // Return a new deep copy
}

export function setResizedObjectsGridState(value) {
    resizedObjectsGridState = JSON.parse(JSON.stringify(value));
}

export function getResizedObjectsGridState() {
    return JSON.parse(JSON.stringify(resizedObjectsGridState)); // Return a new deep copy
}

export function setResizedNpcsGridState(value) {
    resizedNpcsGridState = JSON.parse(JSON.stringify(value));
}

export function getResizedNpcsGridState() {
    return JSON.parse(JSON.stringify(resizedNpcsGridState)); // Return a new deep copy
}

export function setPreAnimationGridState(gridState, objectId, isObjectTrueNpcFalse) {
    if (gridState === 'clear') {
        preAnimationGridStates = [];
        console.log("preAnimationStateGrid cleared!!");
        return;
    }
    
    const newState = {
        grid: JSON.parse(JSON.stringify(gridState)),  // Deep copy of the grid
        id: objectId,
        isObjectTrueNpcFalse: isObjectTrueNpcFalse
    };
    
    preAnimationGridStates.push(newState);
}

export function getPreAnimationGridState() {
    return JSON.parse(JSON.stringify(preAnimationGridStates)); // Return a new deep copy
}

export function setAnimationInProgress(value) {
    animationInProgress = value;
}

export function getAnimationInProgress() {
    return animationInProgress;
}

export function setBottomContainerHeight(value) {
    bottomContainerHeight = value;
}

export function getBottomContainerHeight() {
    return bottomContainerHeight;
}

export function setTransitioningToDialogueState(value) {
    transitioningToDialogueState = value;
}

export function getTransitioningToDialogueState() {
    return transitioningToDialogueState;
}

export function setReadyToAdvanceNpcQuestPhase(value) {
    readyToAdvanceNpcQuestPhase = value;
}

export function getReadyToAdvanceNpcQuestPhase() {
    return readyToAdvanceNpcQuestPhase;
}

export function setTriggerQuestPhaseAdvance(value) {
    triggerQuestPhaseAdvance = value;
}

export function getTriggerQuestPhaseAdvance() {
    return triggerQuestPhaseAdvance;
}

export function setCurrentExitOptionRow(value) {
    currentExitOptionRow = value;
}

export function getCurrentExitOptionRow() {
    return currentExitOptionRow;
}

export function setDialogueOptionsScrollReserve(value) {
    dialogueOptionsScrollReserve = value;
}

export function getDialogueOptionsScrollReserve() {
    return dialogueOptionsScrollReserve;
}

export function setCurrentDialogueRowsOptionsIds(value) {
    currentDialogueRowsOptionsIds = value;
}

export function getCurrentDialogueRowsOptionsIds() {
    return currentDialogueRowsOptionsIds;
}

export function setDialogueRows(value) {
    dialogueRows = value;
}

export function getDialogueRows() {
    return dialogueRows;
}

export function setDialogueOptionClicked(value) {
    dialogueOptionClicked = value;
}

export function getDialogueOptionClicked() {
    return dialogueOptionClicked;
}

export function setDialogueTextClicked(value) {
    dialogueTextClicked = value;
}

export function getDialogueTextClicked() {
    return dialogueTextClicked;
}

export function setCanExitDialogueAtThisPoint(value) {
    canExitDialogueAtThisPoint = value;
}

export function getCanExitDialogueAtThisPoint() {
    return canExitDialogueAtThisPoint;
}

export function setQuestPhaseNpc(npcId, value) {
    getNpcData().npcs[npcId].interactable.questPhase = value;
}

export function getQuestPhaseNpc(npcId) {
    return getNpcData().npcs[npcId].interactable.questPhase;
}

export function setRemovedDialogueOptions(npcId, questPhase, optionId) {
    removedDialogueOptions.push({
        npcId: npcId,
        questPhase: questPhase,
        optionId: optionId
    });
}

export function getRemovedDialogueOptions() {
    return removedDialogueOptions;
}

export function setCurrentExitOptionText(value) {
    currentExitOptionText = value;
}

export function getCurrentExitOptionText() {
    return currentExitOptionText;
}

export function setCurrentScrollIndexDialogue(value) {
    currentScrollIndexDialogue = value;
}

export function getCurrentScrollIndexDialogue() {
    return currentScrollIndexDialogue;
}

export function setResolveDialogueOptionClick(value) {
    resolveDialogueOptionClick = value;
}

export function getResolveDialogueOptionClick() {
    return resolveDialogueOptionClick;
}

export function setDialogueScrollCount(value) {
    dialogueScrollCount = value;
}

export function getDialogueScrollCount() {
    return dialogueScrollCount;
}

export function setExitOptionIndex(value) {
    exitOptionIndex = value;
}

export function getExitOptionIndex() {
    return exitOptionIndex;
}

export function setClickPoint(value) {
    clickPoint = value;
}

export function getClickPoint() {
    return clickPoint;
}

export function setScrollPositionX(value) {
    scrollPositionX = value;
}

export function getScrollPositionX() {
    return scrollPositionX;
}

export function getScrollingActive() {
    return scrollingActive;
}

export function setScrollingActive(value) {
    scrollingActive = value;
}

export function getScrollDirection() {
    return scrollDirection;
}

export function setScrollDirection(value) {
    scrollDirection = value;
}

export function getAnimationFinished() {
    return animationFinishedFlag;
}

export function setAnimationFinished(animation, value) {
    animationFinishedFlag[animation] = value;
}

export function getSwappedDialogueObject() {
    return swappedDialogueObject;
}

export function setSwappedDialogueObject(value) {
    swappedDialogueObject = value;
}

export function getEarlyExitFromDialogue() {
    return earlyExitFromDialogue;
}

export function setEarlyExitFromDialogue(value) {
    earlyExitFromDialogue = value;
}

export function getInitialBackgroundUrl() {
    return initialBackgroundValue;
}

export function setInitialBackgroundUrl(value) {
    initialBackgroundValue = value;
}

export function getDrawGrid() {
    return drawGrid;
}

export function setDrawGrid(value) {
    drawGrid = value;
}

export function getCantGoThatWay() {
    return cantGoThatWay;
}

export function setCantGoThatWay(value) {
    cantGoThatWay = value;
}

export function getNonPlayerAnimationFunctionalityActive() {
    return nonPlayerAnimationFunctionalityActive;
}

export function setNonPlayerAnimationFunctionalityActive(value) {
    nonPlayerAnimationFunctionalityActive = value;
}

export function getPendingEvents() {
    return pendingEvent;
}

export function setPendingEvents(value) {
    pendingEvent = value;
}

export function getShouldNotBeResizedArray() {
    return shouldNotBeResizedArray;
}

export function getArrayOfGameImages() {
    return arrayOfGameImages;
}

export function setVerbsBlockedExcept(value) {
    verbsBlockedExcept = value;
}

export function getVerbsBlockedExcept() {
    return verbsBlockedExcept;
}

export function setForcePlayerLocation(value) {
    forcePlayerLocation = value;
}

export function getForcePlayerLocation() {
    return forcePlayerLocation;
}

export function setBridgeState(value) {
    bridgeState = value;
}

export function getBridgeState() {
    return bridgeState;
}

export function setPlayerDirection(value) {
    playerDirection = value;
}

export function getPlayerDirection() {
    return playerDirection;
}

export function setPlayerMovementStatus(value) {
    playerMovementStatus = value;
}

export function getPlayerMovementStatus() {
    return playerMovementStatus;
}

export function getActivePlayerSprite() {
    return playerObject.sprites[playerObject.activeSprite];
}

export function setActivePlayerSprite(direction, isMoving) {
    const movementState = isMoving ? (playerObject.activeSprite === `move1_${direction}` ? 'move2' : 'move1') : 'still';
    playerObject.activeSprite = `${movementState}_${direction}`;
}

export function getForegroundsList() {
    return foregroundsList;
}

export function setCurrentScreenHasForegroundItems(value) {
    currentScreenHasForegroundItems = value;
}

export function getCurrentScreenHasForegroundItems() {
    return currentScreenHasForegroundItems;
}

export function setCurrentForegroundImage(value) {
    currentForegroundImage = value;
}

export function getCurrentForegroundImage() {
    return currentForegroundImage;
}

export function setCurrentPlayerImage(value) {
    currentPlayerImage = value;
}

export function getCurrentPlayerImage() {
    return currentPlayerImage;
}

export function setForegroundGridProcessed(value) {
    foregroundGridProcessed = value;
}

export function getForegroundGridProcessed() {
    return foregroundGridProcessed;
}

export function getTrackingGrid(x, y) {
    // Check if 'x' is equal to 'all' which means we want the entire grid
    if (x === 'all') {
        return trackingGrid;  // Return the entire grid
    }

    // Validate the coordinates for normal access
    if (y >= 0 && y < trackingGrid.length && x >= 0 && x < trackingGrid[0].length) {
        return trackingGrid[y][x];  // Return the specific cell if within bounds
    } else {
        console.warn(`Attempted to access trackingGrid at invalid coordinates (${x}, ${y})`);
        return "-";  // Return a default value when out of bounds
    }
}

// Setter function to set a value in a specific cell in the tracking grid
export function setTrackingGrid(x, y, value) {
    if (y >= 0 && y < trackingGrid.length && x >= 0 && x < trackingGrid[0].length) {
        trackingGrid[y][x] = value;
    } else {
        console.error(`Attempted to set trackingGrid at invalid coordinates (${x}, ${y})`);
    }
}