import { getPreAnimationGridState, getAnimationInProgress, setPreAnimationGridState, getGridData, getPlayerObject, getCanvasCellHeight, getCanvasCellWidth, getColorTextPlayer, getCutSceneState, getDialogueData, getGameVisibleActive, getLanguage, getNavigationData, getNpcData, setCurrentSpeaker, getObjectData, getAllGridData, getCurrentScreenId, setAnimationInProgress } from "./constantsAndGlobalVars.js";
import { addItemToInventory, setObjectData } from "./handleCommands.js";
import { drawInventory, showText } from "./ui.js";
import { setGameState } from "./game.js";

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
                setPreAnimationGridState(gridData, doorId);
                setObjectData(doorId, `interactable.activeStatus`, true);
                //door opening animation in future
                setObjectData(doorId, `activeSpriteUrl`, 's2');
            } else {
                const dialogueString = dialogueData.globalMessages.alreadyOpen[language];
                await showText(dialogueString, null, getColorTextPlayer());
            }
            break;
        case 'verbClose':
            if (objectData.interactable.activeStatus) {
                setAnimationInProgress(true);
                setPreAnimationGridState(gridData, doorId);
                setObjectData(doorId, `interactable.activeStatus`, false);
                //door closing animation in future
                setObjectData(doorId, `activeSpriteUrl`, 's1');
            } else {
                const dialogueString = dialogueData.globalMessages.alreadyClosed[language];
                await showText(dialogueString, null, getColorTextPlayer());
            }
            break;
    }
}

function unlockResearchRoomDoor(objectToUseWith, dialogueString, realVerbUsed, special) {
    showText(dialogueString, null, getColorTextPlayer());
    const objectData = getObjectData().objects.objectDoorLibraryFoyerResearchRoom;
    const navigationData = getNavigationData().libraryFoyer.exits.e1;
    navigationData.status = "open";
    objectData.interactable.alreadyUsed = true;
}

//Use objectBatteryDEBUG to activate objectMachineDEBUG
function useBatteryDEBUGOnMachineDEBUG(objectToUseWith, dialogueString, realVerbUsed, special) {
    showText(dialogueString, null, getColorTextPlayer());
    setObjectData(`objectMachineDEBUG`, `interactable.activeStatus`, true);
}

//Use objectMachineDEBUG to get objectBananaDEBUG
function machineDEBUGActivate(objectToUseWith, dialogueString, realVerbUsed, special) {
    showText(dialogueString, null, getColorTextPlayer());
    addItemToInventory("objectBananaDEBUG", 3);
    drawInventory(0);
    setObjectData(`objectMachineDEBUG`, `interactable.alreadyUsed`, true);
    setObjectData(`objectMachineDEBUG`, `interactable.activeStatus`, false);
}

//Give npcMonkeyDEBUG objectbananaDEBUG to get it to talk and give player a objectBatteryDEBUG

// Main function with refactored code
async function giveMonkeyBanana(objectToUseWith, dialogueString, realVerbUsed, special) {
    const language = getLanguage();
    const npcData = getNpcData().npcs.npcMonkeyDEBUG;
    const questPhase = npcData.interactable.questPhase;
    const dialogueData = getDialogueData().dialogue.npcInteractions.verbUse.npcMonkeyDEBUG.quest[questPhase].phase;

    if (npcData.interactable.questPhase === 0 && npcData.interactable.dialoguePhase === 0) {

        const dialogueSpeakers = {
            0: "npc",
            1: "npc",
            2: "player"
        };

        setGameState(getCutSceneState());

        await showText(dialogueString, null, getColorTextPlayer());

        const showDialogue = (dialogueIndex) => {
            const dialogueText = dialogueData[dialogueIndex][language];
            const speaker = dialogueSpeakers[dialogueIndex];

            const { xPos, yPos } = getTextPosition(speaker, npcData);
            const textColor = getTextColor(speaker, npcData.interactable.dialogueColor);

            showText(dialogueText, () => {
                if (npcData.interactable.questPhase === 0) {
                    if (dialogueIndex < 2) {
                        showDialogue(dialogueIndex + 1);
                    } else {
                        addItemToInventory("objectBatteryDEBUG", 1);
                        drawInventory(0);

                        npcData.interactable.questPhase++;
                        npcData.interactable.canUseWith = false;
                        setGameState(getGameVisibleActive());
                    }
                }
            }, textColor, xPos, yPos);
        };

        showDialogue(npcData.interactable.dialoguePhase);
    }
}

//----------------------------------------------------------------------------------------------------------------

// Helper function to determine the position of the text based on the speaker (player or NPC)
function getTextPosition(speaker, npcData) {
    let xPos, yPos;
    setCurrentSpeaker(speaker);

    if (speaker === 'player') {
        const player = getPlayerObject();
        xPos = player.xPos;
        yPos = player.yPos - 20;
    } else {
        const npcXGrid = npcData.gridPosition.x;
        const npcYGrid = npcData.gridPosition.y;
        xPos = npcXGrid * getCanvasCellWidth();
        yPos = npcYGrid * getCanvasCellHeight() - 20;
    }

    return { xPos, yPos };
}

function getTextColor(speaker, npcColor) {
    if (speaker === 'player') {
        return getColorTextPlayer();
    } else {
        return npcColor;
    }
}

// Executor function

export function executeObjectEvent(objectEvent, dialogueString, realVerbUsed, special) {
    // Ensure dialogueString is properly formatted for eval calls
    const safeDialogueString = `'${dialogueString.replace(/'/g, "\\'")}'`; // Escape single quotes in dialogueString
    
    // Check for actionUse1 and call its function if it exists
    if (objectEvent.actionUse1) {
        try {
            if (objectEvent.objectUse) {
                eval(`${objectEvent.actionUse1}('${objectEvent.objectUse}', ${safeDialogueString}, '${realVerbUsed}', '${special}')`); // Pass objectUse, dialogue, and realVerbUsed as arguments
            } else {
                eval(`${objectEvent.actionUse1}(${null}, ${safeDialogueString}, '${realVerbUsed}', '${special}')`); // Call without objectUse argument
            }
        } catch (e) {
            console.error(`Error executing function ${objectEvent.actionUse1}:`, e);
        }
    }

    // Check for actionUse2 and call its function if it exists
    if (objectEvent.actionUse2) {
        try {
            if (objectEvent.objectUse) {
                eval(`${objectEvent.actionUse2}('${objectEvent.objectUse}', ${safeDialogueString}, '${realVerbUsed}', '${special}')`); // Pass objectUse, dialogue, and realVerbUsed as arguments
            } else {
                eval(`${objectEvent.actionUse2}(${null}, ${safeDialogueString}, '${realVerbUsed}', '${special}')`);
            }
        } catch (e) {
            console.error(`Error executing function ${objectEvent.actionUse2}:`, e);
        }
    }

    // Check for actionUseWith11 and call it if it exists
    if (objectEvent.actionUseWith11) {
        try {
            if (objectEvent.objectUseWith1) {
                eval(`${objectEvent.actionUseWith11}('${objectEvent.objectUseWith1}', ${safeDialogueString}, '${realVerbUsed}', '${special}')`); // Pass objectUseWith1, dialogue, and realVerbUsed as arguments
            } else {
                eval(`${objectEvent.actionUseWith11}(${null}, ${safeDialogueString}, '${realVerbUsed}', '${special}')`);
            }
        } catch (e) {
            console.error(`Error executing function ${objectEvent.actionUseWith11}:`, e);
        }
    }

    // Check for actionUseWith12 and call it if it exists
    if (objectEvent.actionUseWith12) {
        try {
            if (objectEvent.objectUseWith1) {
                eval(`${objectEvent.actionUseWith12}('${objectEvent.objectUseWith1}', ${safeDialogueString}, '${realVerbUsed}', '${special}')`); // Pass objectUseWith1, dialogue, and realVerbUsed as arguments
            } else {
                eval(`${objectEvent.actionUseWith12}(${null}, ${safeDialogueString}, '${realVerbUsed}', '${special}')`);
            }
        } catch (e) {
            console.error(`Error executing function ${objectEvent.actionUseWith12}:`, e);
        }
    }
}



