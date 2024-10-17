import { setOriginalGridState, setParrotCompletedMovingToFlyer, getParrotCompletedMovingToFlyer, getCutSceneState, setPreAnimationGridState, getGridData, getColorTextPlayer, getDialogueData, getGameVisibleActive, getLanguage, getNavigationData, getNpcData, setCurrentSpeaker, getObjectData, setAnimationInProgress, setCustomMouseCursor, getCustomMouseCursor, getCanvasCellWidth, getCanvasCellHeight, getAllGridData, setNavigationData } from "./constantsAndGlobalVars.js";
import { setDialogueData, removeObjectFromEnvironment, handleInventoryAdjustment, addItemToInventory, setObjectData, setNpcData } from "./handleCommands.js";
import { drawInventory, showText } from "./ui.js";
import { addObjectToEnvironment, showHideObjectAndMakeHoverable, setGameState, gameLoop } from "./game.js";
import { getTextColor, getTextPosition, getOrderOfDialogue, dialogueEngine } from "./dialogue.js";

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

    setAnimationInProgress(true);
    setPreAnimationGridState(gridData, 'objectParrotHook', true);
    setObjectData(`objectParrotFlyer`, `dimensions.width`, 1);
    setObjectData(`objectParrotFlyer`, `dimensions.height`, 1);
    setObjectData(`objectParrotHook`, `visualPosition.x`, 50);
    setObjectData(`objectParrotHook`, `visualPosition.y`, 50);
    showHideObjectAndMakeHoverable('s2', 'objectParrotHook', false);

    await showText(dialogueString, getColorTextPlayer());

    const gridPositionX = 65;
    const gridPositionY = 14;

    const offsetX = getObjectData().objects['objectParrotFlyer'].offset.x * getCanvasCellWidth();
    const offsetY = getObjectData().objects['objectParrotFlyer'].offset.x * getCanvasCellHeight();

    const offSetAdjustmentX = 0;
    const offSetAdjustmentY = 0;

    const desiredVisualPositionX = Math.floor(gridPositionX * getCanvasCellWidth()) + offsetX + offSetAdjustmentX;
    const desiredVisualPositionY = Math.floor(gridPositionY * getCanvasCellHeight())  + offsetY + offSetAdjustmentY;

    setPreAnimationGridState(gridData, 'objectParrotFlyer', true);
    setObjectData(`objectParrotFlyer`, `visualPosition.x`, desiredVisualPositionX);
    setObjectData(`objectParrotFlyer`, `visualPosition.y`, desiredVisualPositionY);
    setObjectData(`objectParrotFlyer`, `dimensions.width`, 20);
    setObjectData(`objectParrotFlyer`, `dimensions.height`, 15);
    showHideObjectAndMakeHoverable('s2', 'objectParrotFlyer', true);

    setDialogueData('objectInteractions.verbLookAt.objectParrotFlyer', '0', '1');

    const waitForTimeout = (duration) => {
        return new Promise(resolve => setTimeout(resolve, duration));
    };

    await waitForTimeout(3000); //await animation function TODO
    setParrotCompletedMovingToFlyer(true);
    
    setObjectData(`objectParrotMirror`, `interactable.canPickUp`, true);

    dialogueString = dialogueData.postAnimationEventDialogue.animationParrotMoveToParrotFlyer[language];
    await showText(dialogueString, getColorTextPlayer());

    const gridUpdateData = getAllGridData();
    setOriginalGridState(gridUpdateData);
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
    const objectSturdyAnchor = 'objectSturdyAnchor';
    removeObjectFromEnvironment(objectSturdyAnchor);

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
    setObjectData(`objectPulleyWheel`, `dimensions.width`, 25);
    setObjectData(`objectPulleyWheel`, `dimensions.height`, 15);
    showHideObjectAndMakeHoverable('s2', 'objectPulleyWheel', true);
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

    //move real donkey and hide
    setAnimationInProgress(true);
    setPreAnimationGridState(gridData, 'npcDonkey', false);
    setNpcData(`npcDonkey`, `visualPosition.x`, (npcData.visualPosition.x + 300)); //set this number when positioned
    setNpcData(`npcDonkey`, `visualPosition.y`, (npcData.visualPosition.y + 0)); //set this number when positioned
    setNpcData(`npcDonkey`, `activeSpriteUrl`, 's3');
    setNpcData(`npcDonkey`, `interactable.canHover`, false);

    //move object donkey to place of real and show
    setPreAnimationGridState(gridData, 'objectDonkeyFake', true);
    setObjectData(`objectDonkeyFake`, `visualPosition.x`, (originalDonkeyX)); //set this number when positioned
    setObjectData(`objectDonkeyFake`, `visualPosition.y`, (originalDonkeyY)); //set this number when positioned
    setObjectData(`objectDonkeyFake`, `activeSpriteUrl`, 's2');
    setObjectData(`objectDonkeyFake`, `interactable.canHover`, true);
}

async function donkeyMoveRopeAvailable(blank, dialogueString, realVerbUsed, objectId) {
    const navigationData = getNavigationData();
    await showText(dialogueString, getColorTextPlayer());

    removeObjectFromEnvironment(objectId);

    setNpcData(`npcDonkey`, `activeSpriteUrl`, 's2');
    setNpcData(`npcDonkey`, `interactable.canHover`, true);

    const objectToShowId = 'objectDonkeyRope';
    const spriteUrlObjectToShow = 's2';

    navigationData.stables.exits.e1.status = "open";
    setNavigationData(navigationData); //allow player to enter barn

    showHideObjectAndMakeHoverable(spriteUrlObjectToShow, objectToShowId, true);
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
    const navigationData = getNavigationData().libraryFoyer.exits.e1;
    navigationData.status = "open";
    setNavigationData(navigationData); //allow player to enter barn
    objectData.interactable.alreadyUsed = true;
    setNpcData(`npcLibrarian`, `interactable.receiveObjectScenarioId`, 1);

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

    const gridPositionX = 70; //68
    const gridPositionY = 15;

    const offsetX = getObjectData().objects['objectParrotHook'].offset.x * getCanvasCellWidth();
    const offsetY = getObjectData().objects['objectParrotHook'].offset.x * getCanvasCellHeight();

    const offSetAdjustmentX = offsetX - (0.6 * getCanvasCellWidth()); //change these to move object with fine control
    const offSetAdjustmentY = 0; //change these to move object with fine control

    const desiredVisualPositionX = Math.floor(gridPositionX * getCanvasCellWidth()) + offsetX + offSetAdjustmentX;
    const desiredVisualPositionY = Math.floor(gridPositionY * getCanvasCellHeight()) + offsetY + offSetAdjustmentY;

    setAnimationInProgress(true);
    setPreAnimationGridState(gridData, 'objectParrotHook', true);
    setObjectData(`objectParrotHook`, `visualPosition.x`, desiredVisualPositionX);
    setObjectData(`objectParrotHook`, `visualPosition.y`, desiredVisualPositionY);
    setObjectData(`objectParrotHook`, `dimensions.width`, 20);
    setObjectData(`objectParrotHook`, `dimensions.height`, 12);
    setObjectData(`objectParrotHook`, `interactable.canPickUp`, true);
    showHideObjectAndMakeHoverable('s1', 'objectParrotHook', true);  
}

function resizeBowlInObjectsJSON() {
    setObjectData(`objectBowl`, `dimensions.width`, 1);
    setObjectData(`objectBowl`, `dimensions.height`, 1);
}

function makeCowNotTalkableAndPliersUseable() {
    setNpcData(`npcCow`, `interactable.canTalk`, false);
    setObjectData(`objectPliers`, `interactable.activeStatus`, true);
}

function makeMirrorGiveableToWoman() {
    setObjectData(`objectParrotMirror`, `interactable.canGive`, true);
}

async function giveWomanMirror(npcId, dialogueString, blank, objectId) {
    const objectData = getObjectData().objects[objectId];
    const npcData = getNpcData().npcs[npcId];
    const language = getLanguage();

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
    setNpcData(`npcWomanLostMirror`, `interactable.canTalk`, false);

    //woman accepts mirror and speaks saying will give key to Den
    //key to den added to inventory directly
    //woman goes to cantTalk state with correcvt dialogue

}

async function removeSplinterFromCowsHoof(blank, dialogueString, blank2, objectId) {
    const objectData = getObjectData().objects[objectId];
    const dialogueData = getDialogueData().dialogue;
    const language = getLanguage();

    if (objectData.interactable.activeStatus && !objectData.interactable.alreadyUsed) {
        showText(dialogueString, getColorTextPlayer());
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
    const objectData = getObjectData().objects[objectId];
    const dialogueData = getDialogueData().dialogue;
    const language = getLanguage();
    const npcData = getNpcData().npcs[townDog];
    const gridData = getGridData();

    const giveScenarioId = npcData.interactable.receiveObjectScenarioId;
    const dialogueStringData = dialogueData.objectInteractions.verbGive[objectId].scenario[giveScenarioId].phase;

    handleInventoryAdjustment(objectId, 1, true);
    drawInventory(0);

    setNpcData(`${townDog}`, `activeSpriteUrl`, 's2');

    const gridPositionX = 34;
    const gridPositionY = 18;

    const offsetX = getObjectData().objects['objectBone'].offset.x * getCanvasCellWidth();
    const offsetY = getObjectData().objects['objectBone'].offset.x * getCanvasCellHeight();

    const offSetAdjustmentX = offsetX - (0.6 * getCanvasCellWidth()); //change these to move object with fine control
    const offSetAdjustmentY = 0; //change these to move object with fine control

    const desiredVisualPositionX = Math.floor(gridPositionX * getCanvasCellWidth()) + offsetX + offSetAdjustmentX;
    const desiredVisualPositionY = Math.floor(gridPositionY * getCanvasCellHeight()) + offsetY + offSetAdjustmentY;

    addObjectToEnvironment('objectBowl', 31, 16, 0, 0, 30, 20); //add empty bowl back in for dog having drunk it

    setObjectData(`objectBowl`, `dimensions.width`, 30);
    setObjectData(`objectBowl`, `dimensions.height`, 20);
    setObjectData(`objectBowl`, `interactable.canPickUp`, false);

    setAnimationInProgress(true);
    setPreAnimationGridState(gridData, 'objectBone', true);
    setObjectData(`objectBone`, `visualPosition.x`, desiredVisualPositionX);
    setObjectData(`objectBone`, `visualPosition.y`, desiredVisualPositionY);
    setObjectData(`objectBone`, `dimensions.width`, 20);
    setObjectData(`objectBone`, `dimensions.height`, 12);
    setObjectData(`objectBone`, `interactable.canPickUp`, true);
    showHideObjectAndMakeHoverable('s2', 'objectBone', true); 
    
    const orderOfStartingDialogue = getOrderOfDialogue(objectId, null, null, null, false, giveScenarioId);
    setCustomMouseCursor(getCustomMouseCursor('normal'));
    setGameState(getCutSceneState());

    await showCutSceneDialogue(0, dialogueStringData, orderOfStartingDialogue, npcData);

    setDialogueData('npcInteractions.verbLookAt.npcTownDog', '0', '1');
    setDialogueData('objectInteractions.verbLookAt.objectBowl', '0', '1');
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

        if (realVerbUsed === "verbPickUp") {
            try {
                eval(`${objectEvent.actionPickUp}(${null}, ${null}, ${null}, ${null})`);
            } catch (e) {
                console.error(`Error executing function ${objectEvent.actionGive1}:`, e);
            }
        }

        if (objectEvent.dialogueEvent) {
            try {
                eval(`${objectEvent.dialogueEvent}(${null}, ${null}, ${null}, '${special}')`);
            } catch (e) {
                console.error(`Error executing function ${objectEvent.actionGive1}:`, e);
            }
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
