import { getCurrentScreenId, getElements, getParrotCompletedMovingToFlyer, setOriginalGridState, setParrotCompletedMovingToFlyer, getCutSceneState, setPreAnimationGridState, getGridData, getColorTextPlayer, getDialogueData, getGameVisibleActive, getLanguage, getNavigationData, getNpcData, setCurrentSpeaker, getObjectData, setAnimationInProgress, setCustomMouseCursor, getCustomMouseCursor, getCanvasCellWidth, getCanvasCellHeight, getAllGridData, setNavigationData, getDonkeyMovedOffScreen, getPreAnimationGridState } from "./constantsAndGlobalVars.js";
import { setScreenJSONData, setDialogueData, removeNpcFromEnvironment, removeObjectFromEnvironment, handleInventoryAdjustment, addItemToInventory, setObjectData, setNpcData } from "./handleCommands.js";
import { setDynamicBackgroundWithOffset, drawInventory, showText } from "./ui.js";
import { populatePathForEntityMovement, addEntityPath, setEntityPaths, getEntityPaths, addEntityToEnvironment, changeSpriteAndHoverableStatus, setGameState } from "./game.js";
import { dialogueEngine, getTextColor, getTextPosition, getOrderOfDialogue } from "./dialogue.js";

//OBJECTS DON'T NEED TO BE REMOVED FROM INVENTORY THIS IS HANDLED ELSEWHERE WHETHER THEY NEED TO BE REMOVED OR NOT
//REMEMBER TO CALL setOriginalGridData(gridData) AFTER MOVING OBJECTS AROUND ESPECIALLY IF ONE IS WHERE ANOTHER ONE WAS BEFORE
//EVENTS ADVANCING DIALOGUE QUEST OR SETTING TO NOT ABLE TO TALK SHOULD BE HANDLED IN THE EVENT NOT THE DIALOGUE ENGINE

//any door that is unlocked will be closed or opened
async function openCloseGenericUnlockedDoor(objectToUseWith, dialogueString, realVerbUsed, doorId) {
    const objectData = getObjectData().objects[doorId];
    const dialogueData = getDialogueData().dialogue;
    const language = getLanguage();
    const gridData = getGridData();

    switch (realVerbUsed) {
        case 'verbOpen':
        case 'verbUse':
            if (!objectData.interactable.activeStatus) {
                setAnimationInProgress(true);
                setPreAnimationGridState(gridData, doorId, true);
                setObjectData(doorId, `interactable.activeStatus`, true);
                //door opening animation in future
                setObjectData(doorId, `activeSpriteUrl`, 's2');
            } else {
                const dialogueString = dialogueData.globalMessages.alreadyOpen[language];
                await showText(dialogueString, getColorTextPlayer());
            }
            break;
        case 'verbClose':
            if (objectData.interactable.activeStatus) {
                setAnimationInProgress(true);
                setPreAnimationGridState(gridData, doorId, true);
                setObjectData(doorId, `interactable.activeStatus`, false);
                //door closing animation in future
                setObjectData(doorId, `activeSpriteUrl`, 's1');
            } else {
                const dialogueString = dialogueData.globalMessages.alreadyClosed[language];
                await showText(dialogueString, getColorTextPlayer());
            }
            break;
    }
}

async function placeParrotFlyerOnHook(blank, dialogueString, blank2, blank3) {
    const dialogueData = getDialogueData().dialogue;
    const language = getLanguage();
    let gridData = getGridData();

    removeObjectFromEnvironment('objectParrotHook', 'bigTree');

    setAnimationInProgress(true);
    setObjectData(`objectParrotFlyer`, `dimensions.width`, 2);
    setObjectData(`objectParrotFlyer`, `dimensions.height`, 4.6);
    addEntityToEnvironment('objectParrotFlyer', 47, 32, 0, 0, 2, 4.6, null, true, 'bigTree');
    changeSpriteAndHoverableStatus('s2', 'objectParrotFlyer', true);

    await showText(dialogueString, getColorTextPlayer());

    setPreAnimationGridState(gridData, 'objectParrotFlyer', true);

    setDialogueData('objectInteractions.verbLookAt.objectParrotFlyer', '0', '1');

    const gridUpdateData = getAllGridData();
    setOriginalGridState(gridUpdateData);

    await moveParrotToFlyer();
    console.log('Parrot has finished moving to the flyer!');
    setObjectData(`objectParrotMirror`, `interactable.canPickUp`, true);

    dialogueString = dialogueData.postAnimationEventDialogue.animationParrotMoveToParrotFlyer[language];
    await showText(dialogueString, getColorTextPlayer());
}

async function moveParrotToFlyer() {
    if (!getParrotCompletedMovingToFlyer()) {
        let gridData = getGridData();
        setDialogueData('objectInteractions.verbLookAt.objectParrakeet', '0', '1');
        setObjectData(`objectParrakeet`, `activeSpriteUrl`, 's2');
        setObjectData(`objectParrakeet`, `canMove`, true);
        addEntityPath(`objectParrakeet`, getObjectData().objects['objectParrakeet'].canMove, 'bigTree');
    
        const path = populatePathForEntityMovement('objectParrakeet', 0);
        path.splice(0,3);
        setEntityPaths('objectParrakeet', 'path', path);
    
        console.log(getEntityPaths()['objectParrakeet'].path);
        await waitForAnimationToFinish(getParrotCompletedMovingToFlyer);
    }
}

async function waitForAnimationToFinish(animationGetterName) {
    let animationGetter = animationGetterName;

    while (!animationGetter()) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

async function combineMilkAndBowl(blank, dialogueString, blank2, blank3) {
    const objectMilkInBowl = 'objectMilkInBowl';

    addItemToInventory(objectMilkInBowl, 1);
    drawInventory(0);

    await showText(dialogueString, getColorTextPlayer());
}

async function combineRopeAndHook(blank, dialogueString, blank2, blank3) {
    const objectRopeAndHook = 'objectRopeAndHook';

    addItemToInventory(objectRopeAndHook, 1);
    drawInventory(0);

    await showText(dialogueString, getColorTextPlayer());
}

async function combinePulleyAndSturdyAnchor(blank, dialogueString, blank2, blank3) { //make sure to draw anchor on bg aswell!
    let gridData = getGridData();
    removeObjectFromEnvironment('objectSturdyAnchor', 'riverCrossing');

    await showText(dialogueString, getColorTextPlayer());

    const gridPositionX = 65;
    const gridPositionY = 20;

    const offsetX = getObjectData().objects['objectPulleyWheel'].offset.x * getCanvasCellWidth();
    const offsetY = getObjectData().objects['objectPulleyWheel'].offset.x * getCanvasCellHeight();

    const offSetAdjustmentX = 0;
    const offSetAdjustmentY = 0;

    const desiredVisualPositionX = Math.floor(gridPositionX * getCanvasCellWidth()) + offsetX + offSetAdjustmentX;
    const desiredVisualPositionY = Math.floor(gridPositionY * getCanvasCellHeight())  + offsetY + offSetAdjustmentY;

    setAnimationInProgress(true);
    setPreAnimationGridState(gridData, 'objectPulleyWheel', true);
    setObjectData(`objectPulleyWheel`, `visualPosition.x`, desiredVisualPositionX);
    setObjectData(`objectPulleyWheel`, `visualPosition.y`, desiredVisualPositionY);
    setObjectData(`objectPulleyWheel`, `dimensions.width`, 1.66);
    setObjectData(`objectPulleyWheel`, `dimensions.height`, 3);
    changeSpriteAndHoverableStatus('s2', 'objectPulleyWheel', true);
}

async function giveCarrotToDonkey(npcAndSlot, blank, realVerbUsed, special) {
    const gridData = getGridData();
    const objectId = 'objectCarrot';
    const npcData = getNpcData().npcs.npcDonkey;
    const giveScenarioId = npcData.interactable.receiveObjectScenarioId;
    const dialogueData = getDialogueData().dialogue.objectInteractions.verbGive[objectId].scenario[giveScenarioId].phase;

    const orderOfStartingDialogue = getOrderOfDialogue(objectId, null, null, null, false, giveScenarioId);
    setCustomMouseCursor(getCustomMouseCursor('normal'));
    setGameState(getCutSceneState());

    await showCutSceneDialogue(0, dialogueData, orderOfStartingDialogue, npcData);

    handleInventoryAdjustment(objectId, 1, false);
    drawInventory(0);

    const originalDonkeyX = npcData.visualPosition.x;
    const originalDonkeyY = npcData.visualPosition.y;
    const originalDonkeyWidth = npcData.dimensions.width;

    removeNpcFromEnvironment('npcDonkey', 'stables');
    setNpcData(`npcDonkey`, `objectPlacementLocation`, ``);

    setTimeout(() => {
        // Move object donkey to place of real and show
        setPreAnimationGridState(gridData, 'objectDonkeyFake', true);
        setObjectData(`objectDonkeyFake`, `visualPosition.x`, (originalDonkeyX)); // set this number when positioned
        setObjectData(`objectDonkeyFake`, `visualPosition.y`, (originalDonkeyY)); // set this number when positioned
        setObjectData(`objectDonkeyFake`, `dimensions.width`, originalDonkeyWidth);
        setObjectData(`objectDonkeyFake`, `dimensions.height`, 28);
        setObjectData(`objectDonkeyFake`, `visualPosition.y`, getObjectData().objects[`objectDonkeyFake`].visualPosition.y - 90);
        setObjectData(`objectDonkeyFake`, `activeSpriteUrl`, 's2');
        setObjectData(`objectDonkeyFake`, `interactable.canHover`, true);
    }, 50);
}

function changeCanvasBgTemp(url) {
    const canvas = getElements().canvas;
    const screenTilesWidebgImg = getNavigationData()[getCurrentScreenId()].screenTilesWidebgImg;
    setDynamicBackgroundWithOffset(canvas, url, 0, 0, screenTilesWidebgImg);
}

async function donkeyMoveRopeAvailable(blank, dialogueString, realVerbUsed, objectId) {
    const gridData = getGridData();
    const navigationData = getNavigationData();

    setTimeout(() => {
    setObjectData(`objectDonkeyFake`, `dimensions.width`, 8);
    setObjectData(`objectDonkeyFake`, `activeSpriteUrl`, 's4');
    addEntityToEnvironment('objectDonkeyRope', 40, 43, 0.5, 0, 6, 11, null, true, 'stables');
    setPreAnimationGridState(gridData, 'objectDonkeyRope', true);
    const gridUpdateData = getAllGridData();
    setOriginalGridState(gridUpdateData);
    }, 50);

    await showText(dialogueString, getColorTextPlayer());
    moveDonkeyOffScreen();

    setTimeout(() => {
    navigationData.stables.exits.e1.status = "open";
    setNavigationData(navigationData); //allow player to enter barn
    }, 50);
}

async function moveDonkeyOffScreen() {
    const dialogueData = getDialogueData().dialogue;
    const language = getLanguage();

    setObjectData(`objectDonkeyFake`, `activeSpriteUrl`, 's3');
    setObjectData(`objectDonkeyFake`, `canMove`, true);
    addEntityPath(`objectDonkeyFake`, getObjectData().objects['objectDonkeyFake'].canMove, 'stables');

    const path = populatePathForEntityMovement('objectDonkeyFake', 0);
    path.splice(0,3);
    setEntityPaths('objectDonkeyFake', 'path', path);

    await waitForAnimationToFinish(getDonkeyMovedOffScreen);

    changeCanvasBgTemp('./resources/backgrounds/stables.png');

    removeObjectFromEnvironment('objectDonkeyFake', 'stables');
    setObjectData(`objectDonkeyFake`, `objectPlacementLocation`, '');

    let dialogueString = dialogueData.postAnimationEventDialogue.animationDonkeyMovesOffScreen[language];
    await showText(dialogueString, getColorTextPlayer());
}

async function giveKeyToLibrarian(npcAndSlot, blank, realVerbUsed, special) {
    const language = getLanguage();
    const objectData = getObjectData().objects;
    const objectGiving = objectData.objectKeyResearchRoom;
    const objectId = 'objectKeyResearchRoom';
    const npcData = getNpcData().npcs.npcLibrarian;
    const giveScenarioId = npcData.interactable.receiveObjectScenarioId;
    const dialogueData = getDialogueData().dialogue.objectInteractions.verbGive[objectId].scenario[giveScenarioId].phase;

    const orderOfStartingDialogue = getOrderOfDialogue(objectId, null, null, null, false, giveScenarioId);
    setCustomMouseCursor(getCustomMouseCursor('normal'));
    setGameState(getCutSceneState());

    await showCutSceneDialogue(0, dialogueData, orderOfStartingDialogue, npcData);
    if (giveScenarioId === 1) {
        handleInventoryAdjustment(objectId, 1, true);
        addItemToInventory('objectParrotFlyer', 1);
        drawInventory(0);
    }
}

function unlockResearchRoomDoor(objectToUseWith, dialogueString, realVerbUsed, special) {
    const objectData = getObjectData().objects.objectDoorLibraryFoyerResearchRoom;
    const navigationData = getNavigationData();
    navigationData.libraryFoyer.exits.e1.status = "open";
    setNavigationData(navigationData);
    objectData.interactable.alreadyUsed = true;
    setNpcData(`npcLibrarian`, `interactable.receiveObjectScenarioId`, 1);

    showText(dialogueString, getColorTextPlayer());
}

function unlockDenDoor(objectToUseWith, dialogueString, realVerbUsed, special) {
    const objectData = getObjectData().objects.objectDoorToDen;
    const navigationData = getNavigationData();
    navigationData.seedyGuyAlley.exits.e1.status = "open";
    setNavigationData(navigationData);
    objectData.interactable.alreadyUsed = true;

    showText(dialogueString, getColorTextPlayer());
}

function allowInteractionPileOfBooks(objectToUseWith, dialogueString, realVerbUsed, special) {
    setNpcData(`npcLibrarian`, `interactable.canTalk`, false);
    setNpcData(`npcLibrarian`, `interactable.cantTalkDialogueNumber`, 1);
    setObjectData(`objectPileOfBooksLibraryFoyer`, `interactable.canHover`, true);
}

function moveBooksToGetResearchRoomKey(objectToUseWith, dialogueString, realVerbUsed, special) {
    showText(dialogueString, getColorTextPlayer());
    setObjectData(`objectKeyResearchRoom`, `interactable.canHover`, true);
    setObjectData(`objectKeyResearchRoom`, `activeSpriteUrl`, 's2');
    setObjectData(`objectPileOfBooksLibraryFoyer`, `interactable.alreadyUsed`, true);
    setObjectData(`objectPileOfBooksLibraryFoyer`, `interactable.activeStatus`, false);
}

function resetHookBackToTreePosition() {
    const gridData = getGridData();
    setAnimationInProgress(true);

    addEntityToEnvironment('objectParrotHook', 57, 36, 0, 0, 24, 12, null, true, 'bigTree');

    setPreAnimationGridState(gridData, 'objectParrotHook', true);
    changeSpriteAndHoverableStatus('s1', 'objectParrotHook', true); 
    setObjectData(`objectParrotHook`, `interactable.canPickUp`, true);
    
    const gridUpdateData = getAllGridData();
    setOriginalGridState(gridUpdateData);
}

function resizeBowlInObjectsJSON() {
    setObjectData(`objectBowl`, `dimensions.width`, 1);
    setObjectData(`objectBowl`, `dimensions.height`, 1);
}

function setCarpenterSpokenToTrue() {
    const allGridData = getAllGridData();
    setNpcData(`npcCarpenter`, `interactable.spokenToYet`, true);
    console.log("spoke to carpenter now");

    removeObjectFromEnvironment('objectBrokenFenceFarmTrack', 'cowPath');

    addEntityToEnvironment('npcCow', 13, 27, 1.8, -0.1, 6, 14, 's1', false, 'cowPath');
    setPreAnimationGridState(allGridData.cowPath, 'npcCow', false);

    addEntityToEnvironment('npcFarmer', 24, 26, 0, 0, 10, 8, 's1', false, 'cowPath');
    setPreAnimationGridState(allGridData.cowPath, 'npcFarmer', false);
    
    const gridUpdateData = getAllGridData();
    setOriginalGridState(gridUpdateData);

    setNpcData(`npcCow`,`interactable.canHover`, true);
    setNpcData(`npcFarmer`,`interactable.canHover`, true);
}

function carpenterStopPlayerPickingUpItemsEarly(blank,blank2, blank3, objectId) {
    const carpenterQuestPhase = getNpcData().npcs.npcCarpenter.interactable.questPhase;
    const carpenterDialogueColor = getNpcData().npcs.npcCarpenter.interactable.dialogueColor;
    if (carpenterQuestPhase < 2) {
        let dialogueString;
        dialogueString = getDialogueData().dialogue.specialDialogue.cannotPickUpPliersOrNailsYet[getLanguage()];

        showText(dialogueString, carpenterDialogueColor);        
    }
}

//when the farmer is implemented the player will speak and one option will trigger an event that will advance the questCutOff for the CARPENTER to 2 and advance the CARPENTER questPhase to 1, this will allow the dialogue for the carpenter to give the player the option to send him away to the farmer and thus we can allow the player to pick up the pliers and nails
function moveCarpenterToStables() {
    const allGridData = getAllGridData();
    console.log("carpenter gone to stables");
    removeNpcFromEnvironment('npcCarpenter', 'carpenter');

    const farmerX = getNpcData().npcs['npcFarmer'].gridPosition.x;
    const farmerY = getNpcData().npcs['npcFarmer'].gridPosition.y;
    const farmerWidth = getNpcData().npcs['npcFarmer'].dimensions.width;
    const farmerHeight = getNpcData().npcs['npcFarmer'].dimensions.height;

    removeNpcFromEnvironment('npcFarmer', 'cowPath');

    setTimeout(() => {
        addEntityToEnvironment('npcFarmer', 50, 26, 0, 0, farmerWidth, farmerHeight, 's1', false, 'cowPath');
        setPreAnimationGridState(allGridData.cowPath, 'npcFarmer', false);
        const gridUpdateData = getAllGridData();
        setOriginalGridState(gridUpdateData);

        setTimeout(() => {
            setNpcData(`npcCarpenter`, `dimensions.width`, `${farmerWidth - 2}`);
            setNpcData(`npcCarpenter`, `dimensions.height`, `${farmerHeight}`);
            setNpcData(`npcCarpenter`, `gridPosition.x`, `${farmerX}`);
            setNpcData(`npcCarpenter`, `gridPosition.y`, `${farmerY}`);
            addEntityToEnvironment('npcCarpenter', farmerX, farmerY, 0, 0, farmerWidth - 2, farmerHeight, 's3', false, 'cowPath');
            setPreAnimationGridState(allGridData.cowPath, 'npcCarpenter', false);
            setOriginalGridState(allGridData);
        
            setScreenJSONData('cowPath', 'bgUrl', './resources/backgrounds/cowPathRepairedFence.png');
            setObjectData(`objectPliers`, `interactable.canPickUpNow`, `true`);
            setObjectData(`objectNails`, `interactable.canPickUpNow`, `true`);
    
            const gridUpdateData = getAllGridData();
            setOriginalGridState(gridUpdateData);
        }, 50);
    }, 50);
}

function makeCowTalkableAfterSpeakingToFarmer() {
    setNpcData(`npcCow`, `interactable.canTalk`, true);
}

function makeCowNotTalkableAndPliersUseable() {
    setNpcData(`npcCow`, `interactable.canTalk`, false);
    setObjectData(`objectPliers`, `interactable.activeStatus`, true);
}

function makeFarmerNotTalkableAndSetCarpenterQuestPhaseAfterInitialDialogue() {
    setNpcData(`npcFarmer`, `interactable.canTalk`, false);
    makeCowTalkableAfterSpeakingToFarmer();
    setNpcData(`npcCarpenter`, `interactable.questPhase`, 1);
    setNpcData(`npcCarpenter`, `interactable.questCutOffNumber`, 2);
}

function makeMirrorGiveableToWoman() {
    setObjectData(`objectParrotMirror`, `interactable.canGive`, true);
    setNpcData(`npcWomanLostMirror`, `interactable.canTalk`, false);
}

function openBarrelBarn(blank, dialogueString, blank2, barrel) {    
    const gridData = getGridData();

    setObjectData(`${barrel}`, `interactable.activeStatus`, false);
    setObjectData(`${barrel}`, `interactable.alreadyUsed`, true);
    changeSpriteAndHoverableStatus('s3', `${barrel}`, true);

    const gridPositionX = 51;
    const gridPositionY = 45;

    const offsetX = getObjectData().objects['objectMallet'].offset.x * getCanvasCellWidth();
    const offsetY = getObjectData().objects['objectMallet'].offset.x * getCanvasCellHeight();

    const offSetAdjustmentX = 0;
    const offSetAdjustmentY = 0;

    const desiredVisualPositionX = Math.floor(gridPositionX * getCanvasCellWidth()) + offsetX + offSetAdjustmentX;
    const desiredVisualPositionY = Math.floor(gridPositionY * getCanvasCellHeight()) + offsetY + offSetAdjustmentY;

    setAnimationInProgress(true);
    setPreAnimationGridState(gridData, 'objectMallet', true);
    setObjectData(`objectMallet`, `visualPosition.x`, desiredVisualPositionX);
    setObjectData(`objectMallet`, `visualPosition.y`, desiredVisualPositionY);
    setObjectData(`objectMallet`, `dimensions.width`, 4.4);
    setObjectData(`objectMallet`, `dimensions.height`, 2.2);
    changeSpriteAndHoverableStatus('s2', 'objectMallet', true);

    showText(dialogueString, getColorTextPlayer());
}

function pickUpMallet () {
    changeSpriteAndHoverableStatus('s2', 'objectBarrelBarn', true); //workaround for putting objects on top of each other, had to draw handle on bg and then change bg to image without handle when user picks up mallet
}

async function giveWomanMirror(npcId, dialogueString, blank, objectId) {
    const npcData = getNpcData().npcs[npcId];

    const giveScenarioId = npcData.interactable.receiveObjectScenarioId;
    const dialogueData = getDialogueData().dialogue.objectInteractions.verbGive[objectId].scenario[giveScenarioId].phase;

    handleInventoryAdjustment(objectId, 1, true);
    drawInventory(0);

    const orderOfStartingDialogue = getOrderOfDialogue(objectId, null, null, null, false, giveScenarioId);
    setCustomMouseCursor(getCustomMouseCursor('normal'));
    setGameState(getCutSceneState());

    await showCutSceneDialogue(0, dialogueData, orderOfStartingDialogue, npcData);

    addItemToInventory('objectKeyToDen', 1);
    drawInventory(0);

    setDialogueData('npcInteractions.verbLookAt.npcWomanLostMirror', '0', '1');
    setNpcData(`npcWomanLostMirror`, `interactable.cantTalkDialogueNumber`, 1);
}

async function removeSplinterFromCowsHoof(blank, dialogueString, blank2, objectId) {
    const objectData = getObjectData().objects[objectId];
    const dialogueData = getDialogueData().dialogue;
    const language = getLanguage();

    if (objectData.interactable.activeStatus && !objectData.interactable.alreadyUsed) {
        showText(dialogueString, getColorTextPlayer());
        setNpcData(`npcCow`, `activeSpriteUrl`, `s2`);
        setNpcData(`npcCow`, `interactable.cantTalkDialogueNumber`, 1);
        setObjectData(`objectPliers`, `interactable.alreadyUsed`, true);
        setDialogueData('npcInteractions.verbLookAt.npcCow', '0', '1');
        addItemToInventory('objectSplinter', 1);
        drawInventory(0);
    } else {
        if (!objectData.interactable.alreadyUsed) {
            dialogueString = dialogueData.globalMessages.activeStatusNotSet[language];
            showText(dialogueString, getColorTextPlayer());
        } else {
            dialogueString = dialogueData.globalMessages.alreadyUsedButRetained[language];
            showText(dialogueString, getColorTextPlayer());
        }
    }
}

async function giveDogBowlOfMilk(townDog, dialogueString, blank2, objectId) {
    const dialogueData = getDialogueData().dialogue;
    const npcData = getNpcData().npcs[townDog];
    const gridData = getGridData();

    const giveScenarioId = npcData.interactable.receiveObjectScenarioId;
    const dialogueStringData = dialogueData.objectInteractions.verbGive[objectId].scenario[giveScenarioId].phase;

    handleInventoryAdjustment(objectId, 1, true);
    drawInventory(0);

    setNpcData(`${townDog}`, `activeSpriteUrl`, 's4');

    const gridPositionX = 65;
    const gridPositionY = 54;

    const offsetX = getObjectData().objects['objectBone'].offset.x * getCanvasCellWidth();
    const offsetY = getObjectData().objects['objectBone'].offset.x * getCanvasCellHeight();

    const offSetAdjustmentX = offsetX - (0.8 * getCanvasCellWidth()); //change these to move object with fine control
    const offSetAdjustmentY = 0; //change these to move object with fine control

    const desiredVisualPositionX = Math.floor(gridPositionX * getCanvasCellWidth()) + offsetX + offSetAdjustmentX;
    const desiredVisualPositionY = Math.floor(gridPositionY * getCanvasCellHeight()) + offsetY + offSetAdjustmentY;

    setObjectData(`objectBowl`, `dimensions.width`, 2);
    setObjectData(`objectBowl`, `dimensions.height`, 4);
    addEntityToEnvironment('objectBowl', 61, 51, 0, 0, 2, 4, null, true, 'marketStreet'); //add empty bowl back in for dog having drunk it

    setObjectData(`objectBowl`, `interactable.canPickUp`, false);
    setAnimationInProgress(true);
    setPreAnimationGridState(gridData, 'objectBone', true);
    setObjectData(`objectBone`, `visualPosition.x`, desiredVisualPositionX);
    setObjectData(`objectBone`, `visualPosition.y`, desiredVisualPositionY);
    setObjectData(`objectBone`, `dimensions.width`, 1.33);
    setObjectData(`objectBone`, `dimensions.height`, 2.4);
    setObjectData(`objectBone`, `interactable.canPickUp`, true);
    changeSpriteAndHoverableStatus('s2', 'objectBone', true); 
    
    const orderOfStartingDialogue = getOrderOfDialogue(objectId, null, null, null, false, giveScenarioId);
    setCustomMouseCursor(getCustomMouseCursor('normal'));
    setGameState(getCutSceneState());

    await showCutSceneDialogue(0, dialogueStringData, orderOfStartingDialogue, npcData);

    setDialogueData('npcInteractions.verbLookAt.npcTownDog', '0', '1');
    setDialogueData('objectInteractions.verbLookAt.objectBowl', '0', '1');

    setNpcData(`${townDog}`, `interactable.canTalk`, false);
}

async function showDialogueDisgustedToPickUpPoo() {
    const language = getLanguage();
    const dialogueString = getDialogueData().dialogue.specialDialogue.disgustedToTryAndPickUpPoo[language];
    await showText(dialogueString, getColorTextPlayer());
}

async function revealCarrot(blank, dialogueString, blank2, blank3) {
    const language = getLanguage();
    await showText(dialogueString, getColorTextPlayer());
    setDialogueData('objectInteractions.verbLookAt.objectLargePileOfPoo', '0', '1');
    setObjectData(`objectLargePileOfPoo`, `interactable.alreadyUsed`, true);
    setObjectData(`objectCarrot`, `interactable.canHover`, true);
    setObjectData(`objectCarrot`, `activeSpriteUrl`, `s2`);
}

//---------------------------------------------------------------------------------------------------------------------------------------------

// Executor function
export function executeInteractionEvent(objectEvent, dialogueString, realVerbUsed, special) {
    if (objectEvent === 'dialogueEngine') {
        let npcId = special;
        eval(`${'dialogueEngine'}('${realVerbUsed}', '${npcId}')`);
        return;
    } else {
        const safeDialogueString = `'${dialogueString.replace(/'/g, "\\'")}'`;
        
        if (objectEvent.actionUse1 && (realVerbUsed === 'verbUse' || realVerbUsed === 'verbOpen' || realVerbUsed === 'verbClose' || realVerbUsed === 'verbPush' || realVerbUsed === 'verbPull')) {
            try {
                if (objectEvent.objectUse) {
                    eval(`${objectEvent.actionUse1}('${objectEvent.objectUse}', ${safeDialogueString}, '${realVerbUsed}', '${special}')`);
                } else {
                    eval(`${objectEvent.actionUse1}(${null}, ${safeDialogueString}, '${realVerbUsed}', '${special}')`);
                }
            } catch (e) {
                console.error(`Error executing function ${objectEvent.actionUse1}:`, e);
            }
        }

        if (objectEvent.actionUse2 && (realVerbUsed === 'verbUse' || realVerbUsed === 'verbOpen' || realVerbUsed === 'verbClose' || realVerbUsed === 'verbPush' || realVerbUsed === 'verbPull')) {
            try {
                if (objectEvent.objectUse) {
                    eval(`${objectEvent.actionUse2}('${objectEvent.objectUse}', ${safeDialogueString}, '${realVerbUsed}', '${special}')`);
                } else {
                    eval(`${objectEvent.actionUse2}(${null}, ${safeDialogueString}, '${realVerbUsed}', '${special}')`);
                }
            } catch (e) {
                console.error(`Error executing function ${objectEvent.actionUse2}:`, e);
            }
        }

        if (objectEvent.actionUseWith11 && (realVerbUsed === "verbUse" || realVerbUsed === "verbOpen" || realVerbUsed === "verbPush" || realVerbUsed === "verbPull")) {
            try {
                if (objectEvent.objectUseWith1) {
                    eval(`${objectEvent.actionUseWith11}('${objectEvent.objectUseWith1}', ${safeDialogueString}, '${realVerbUsed}', '${special}')`);
                } else {
                    eval(`${objectEvent.actionUseWith11}(${null}, ${safeDialogueString}, '${realVerbUsed}', '${special}')`);
                }
            } catch (e) {
                console.error(`Error executing function ${objectEvent.actionUseWith11}:`, e);
            }
        }

        if (objectEvent.actionUseWith12 && (realVerbUsed === "verbUse" || realVerbUsed === "verbOpen" || realVerbUsed === "verbPush" || realVerbUsed === "verbPull")) {
            try {
                if (objectEvent.objectUseWith1) {
                    eval(`${objectEvent.actionUseWith12}('${objectEvent.objectUseWith1}', ${safeDialogueString}, '${realVerbUsed}', '${special}')`);
                } else {
                    eval(`${objectEvent.actionUseWith12}(${null}, ${safeDialogueString}, '${realVerbUsed}', '${special}')`);
                }
            } catch (e) {
                console.error(`Error executing function ${objectEvent.actionUseWith12}:`, e);
            }
        }

        if (objectEvent.actionGive1 && realVerbUsed === "verbGive") {
            try {
                eval(`${objectEvent.actionGive1}('${objectEvent.npcGiveTo}', ${safeDialogueString}, '${realVerbUsed}', '${special}')`);
            } catch (e) {
                console.error(`Error executing function ${objectEvent.actionGive1}:`, e);
            }
        }

        if (realVerbUsed === "verbPickUp" && getObjectData().objects[special].interactable.canPickUpNow) {
            try {
                eval(`${objectEvent.actionPickUp}(${null}, ${null}, ${null}, '${special}')`);
            } catch (e) {
                console.error(`Error executing function ${objectEvent.actionPickUp}:`, e);
            }
        }

        if (realVerbUsed === "verbPickUp" && !getObjectData().objects[special].interactable.canPickUpNow) {
            try {
                eval(`${objectEvent.actionCanPickUpButNotYet}(${null}, ${null}, ${null}, '${special}')`);
            } catch (e) {
                console.error(`Error executing function ${objectEvent.actionCanPickUpButNotYet}:`, e);
            }
        }

        if (objectEvent.dialogueEvent) {
            try {
                eval(`${objectEvent.dialogueEvent}(${null}, ${null}, ${null}, '${special}')`);
            } catch (e) {
                console.error(`Error executing function ${objectEvent.dialogueEvent}:`, e);
            }
        }
    }
}

export function turnNpcForDialogue(player, npc, npcId, originalState) {
    const playerXPos = player.xPos;
    const npcXPos = npc.visualPosition.x;

    if (npc.interactable.turnForDialogue) {
        if (originalState) {
            setNpcData(`${npcId}`, 'activeSpriteUrl', 's1'); 
            return;
        }
    
        if (playerXPos <= npcXPos) {
            setNpcData(`${npcId}`, 'activeSpriteUrl', 's2'); 
        } else {
            setNpcData(`${npcId}`, 'activeSpriteUrl', 's3'); 
        }
    }
    
}

async function showCutSceneDialogue(dialogueIndex, dialogueData, orderOfStartingDialogue, npcData) {
    const speaker = orderOfStartingDialogue[dialogueIndex];
    setCurrentSpeaker(speaker);
    const dialogueString = dialogueData[dialogueIndex][getLanguage()];

    const { xPos, yPos } = getTextPosition(speaker, npcData);
    const textColor = getTextColor(speaker, npcData.interactable.dialogueColor);

    await showText(dialogueString, textColor, xPos, yPos);

    if (dialogueIndex < orderOfStartingDialogue.end) {
        dialogueIndex++;
        await showCutSceneDialogue(dialogueIndex, dialogueData, orderOfStartingDialogue, npcData);
    } else {
        setGameState(getGameVisibleActive());
        setCurrentSpeaker('player');
    }
}

//--------------------------------------------------------------------------------------------------------------------------------------
//--UNUSED EVENTS-----------------------------------------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------------------------------------------

//Use objectBatteryDEBUG to activate objectMachineDEBUG
function useBatteryDEBUGOnMachineDEBUG(objectToUseWith, dialogueString, realVerbUsed, special) {
    showText(dialogueString, getColorTextPlayer());
    setObjectData(`objectMachineDEBUG`, `interactable.activeStatus`, true);
}

//Use objectMachineDEBUG to get objectBananaDEBUG
function machineDEBUGActivate(objectToUseWith, dialogueString, realVerbUsed, special) {
    showText(dialogueString, getColorTextPlayer());
    addItemToInventory("objectBananaDEBUG", 3);
    drawInventory(0);
    setObjectData(`objectMachineDEBUG`, `interactable.alreadyUsed`, true);
    setObjectData(`objectMachineDEBUG`, `interactable.activeStatus`, false);
}
