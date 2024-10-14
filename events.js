import { setParrotCompletedMovingToFlyer, getParrotCompletedMovingToFlyer, getCutSceneState, setPreAnimationGridState, getGridData, getColorTextPlayer, getDialogueData, getGameVisibleActive, getLanguage, getNavigationData, getNpcData, setCurrentSpeaker, getObjectData, setAnimationInProgress, setCustomMouseCursor, getCustomMouseCursor, getCanvasCellWidth, getCanvasCellHeight } from "./constantsAndGlobalVars.js";
import { removeObjectFromEnvironment, handleInventoryAdjustment, addItemToInventory, setObjectData, setNpcData } from "./handleCommands.js";
import { drawInventory, showText } from "./ui.js";
import { getVisualPositionForObject, showHideObjectAndMakeHoverable, setGameState, gameLoop } from "./game.js";
import { getTextColor, getTextPosition, getOrderOfDialogue, dialogueEngine } from "./dialogue.js";

//OBJECTS DON'T NEED TO BE REMOVED FROM INVENTORY THIS IS HANDLED ELSEWHERE WHETHER THEY NEED TO BE REMOVED OR NOT

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
    const gridData = getGridData();

    setPreAnimationGridState(gridData, 'objectParrotHook', true);
    setObjectData(`objectParrotHook`, `visualPosition.x`, 1);
    setObjectData(`objectParrotHook`, `visualPosition.y`, 1);
    setObjectData(`objectParrotHook`, `dimensions.width`, 1); //20
    setObjectData(`objectParrotHook`, `dimensions.height`, 1); //15
    showHideObjectAndMakeHoverable('s2', 'objectParrotHook', false);

    await showText(dialogueString, getColorTextPlayer());

    const gridPositionX = 65;
    const gridPositionY = 14;

    const desiredVisualPositionX = Math.floor(gridPositionX * getCanvasCellWidth()) + (getObjectData().objects['objectParrotFlyer'].offset.x * getCanvasCellWidth());
    const desiredVisualPositionY = Math.floor(gridPositionY * getCanvasCellHeight())  + (getObjectData().objects['objectParrotFlyer'].offset.y * getCanvasCellHeight());

    // draw parrotflyer world on background left hook
    setPreAnimationGridState(gridData, 'objectParrotFlyer', true);
    setObjectData(`objectParrotFlyer`, `visualPosition.x`, desiredVisualPositionX);
    setObjectData(`objectParrotFlyer`, `visualPosition.y`, desiredVisualPositionY);
    setObjectData(`objectParrotFlyer`, `dimensions.width`, 20);
    setObjectData(`objectParrotFlyer`, `dimensions.height`, 15);
    showHideObjectAndMakeHoverable('s2', 'objectParrotFlyer', false);

    const waitForTimeout = (duration) => {
        return new Promise(resolve => setTimeout(resolve, duration));
    };

    await waitForTimeout(3000); //await animation function TODO
    setParrotCompletedMovingToFlyer(true);
    
    setObjectData(`objectParrotMirror`, `interactable.canPickUp`, true);

    dialogueString = dialogueData.postAnimationEventDialogue.animationParrotMoveToParrotFlyer[language];
    await showText(dialogueString, getColorTextPlayer());
}

async function combineMilkAndBowl(blank, dialogueString, blank2, blank3) {
    const objectMilkInBowl = 'objectMilkInBowl';

    addItemToInventory(objectMilkInBowl, 1);
    drawInventory(0);

    await showText(dialogueString, getColorTextPlayer());
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
    await showText(dialogueString, getColorTextPlayer());

    removeObjectFromEnvironment(objectId);

    setNpcData(`npcDonkey`, `activeSpriteUrl`, 's2');
    setNpcData(`npcDonkey`, `interactable.canHover`, true);

    const objectToShowId = 'objectDonkeyRope';
    const spriteUrlObjectToShow = 's2';

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
    objectData.interactable.alreadyUsed = true;
    setNpcData(`npcLibrarian`, `interactable.receiveObjectScenarioId`, 1);

    showText(dialogueString, getColorTextPlayer());
}

function allowInteractionPileOfBooks(objectToUseWith, dialogueString, realVerbUsed, special) {
    setObjectData(`objectPileOfBooksLibraryFoyer`, `interactable.canHover`, true);
}


function moveBooksToGetResearchRoomKey(objectToUseWith, dialogueString, realVerbUsed, special) {
    showText(dialogueString, getColorTextPlayer());
    setObjectData(`objectKeyResearchRoom`, `interactable.canHover`, true);
    setObjectData(`objectKeyResearchRoom`, `activeSpriteUrl`, 's2');
    setObjectData(`objectPileOfBooksLibraryFoyer`, `interactable.alreadyUsed`, true);
    setObjectData(`objectPileOfBooksLibraryFoyer`, `interactable.activeStatus`, false);
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
