import { getPlayerObject, getCanvasCellHeight, getCanvasCellWidth, getColorTextPlayer, getCutSceneState, getDialogueData, getGameVisibleActive, getLanguage, getNavigationData, getNpcData, setCurrentSpeaker, getObjectData } from "./constantsAndGlobalVars.js";
import { addItemToInventory, setObjectData } from "./handleCommands.js";
import { drawInventory, showText } from "./ui.js";
import { setGameState } from "./game.js";

//OBJECTS DON'T NEED TO BE REMOVED FROM INVENTORY THIS IS HANDLED ELSEWHERE WHETHER THEY NEED TO BE REMOVED OR NOT

//Open libraryFoyer from debugRoom
function openLibraryFoyerFromDebugRoom(object, dialogueString) {
    showText(dialogueString, null, getColorTextPlayer());
    getNavigationData().debugRoom.exits.e1.status = "open";
    setObjectData(`objectKeyDEBUG`, `interactable.alreadyUsed`, true);
}

function unlockResearchRoomDoor(object, dialogueString) {
    showText(dialogueString, null, getColorTextPlayer());
    const objectData = getObjectData().objects.objectDoorLibraryFoyer;
    const navigationData = getNavigationData().libraryFoyer.exits.e1;
    navigationData.status = "open";
    objectData.interactable.alreadyUsed = true; //code it so if you use the key on the door when alreadyUsed is true, you get the global cant use message
}

//Use objectBatteryDEBUG to activate objectMachineDEBUG
function useBatteryDEBUGOnMachineDEBUG(object, dialogueString) {
    showText(dialogueString, null, getColorTextPlayer());
    setObjectData(`objectMachineDEBUG`, `interactable.activeStatus`, true);
}

//Use objectMachineDEBUG to get objectBananaDEBUG
function machineDEBUGActivate(object, dialogueString) {
    showText(dialogueString, null, getColorTextPlayer());
    addItemToInventory("objectBananaDEBUG", 3);
    drawInventory(0);
    setObjectData(`objectMachineDEBUG`, `interactable.alreadyUsed`, true);
    setObjectData(`objectMachineDEBUG`, `interactable.activeStatus`, false);
}

//Give npcMonkeyDEBUG objectbananaDEBUG to get it to talk and give player a objectBatteryDEBUG

// Main function with refactored code
async function giveMonkeyBanana(object, dialogueString) {
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
            const textColor = getTextColor(speaker, 'yellow');

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

export function executeObjectEvent(objectEvent, dialogueString) {
    // Ensure dialogueString is properly formatted for eval calls
    const safeDialogueString = `'${dialogueString.replace(/'/g, "\\'")}'`; // Escape single quotes in dialogueString
    
    // Check for actionUse1 and call its function if it exists
    if (objectEvent.actionUse1) {
        try {
            if (objectEvent.objectUse) {
                eval(`${objectEvent.actionUse1}('${objectEvent.objectUse}', ${safeDialogueString})`); // Pass objectUse and dialogue as argument
            } else {
                eval(`${objectEvent.actionUse1}(${null}, ${safeDialogueString})`); // Call without objectUse argument
            }
        } catch (e) {
            console.error(`Error executing function ${objectEvent.actionUse1}:`, e);
        }
    }

    // Check for actionUse2 and call its function if it exists
    if (objectEvent.actionUse2) {
        try {
            if (objectEvent.objectUse) {
                eval(`${objectEvent.actionUse2}('${objectEvent.objectUse}', ${safeDialogueString})`); // Pass objectUse and dialogue as argument
            } else {
                eval(`${objectEvent.actionUse2}(${null}, ${safeDialogueString})`);
            }
        } catch (e) {
            console.error(`Error executing function ${objectEvent.actionUse2}:`, e);
        }
    }

    // Check for actionUseWith11 and call it if it exists
    if (objectEvent.actionUseWith11) {
        try {
            if (objectEvent.objectUseWith1) {
                eval(`${objectEvent.actionUseWith11}('${objectEvent.objectUseWith1}', ${safeDialogueString})`); // Pass objectUseWith1 and dialogue as argument
            } else {
                eval(`${objectEvent.actionUseWith11}(${null}, ${safeDialogueString})`);
            }
        } catch (e) {
            console.error(`Error executing function ${objectEvent.actionUseWith11}:`, e);
        }
    }

    // Check for actionUseWith12 and call it if it exists
    if (objectEvent.actionUseWith12) {
        try {
            if (objectEvent.objectUseWith1) {
                eval(`${objectEvent.actionUseWith12}('${objectEvent.objectUseWith1}', ${safeDialogueString})`); // Pass objectUseWith1 and dialogue as argument
            } else {
                eval(`${objectEvent.actionUseWith12}(${null}, ${safeDialogueString})`);
            }
        } catch (e) {
            console.error(`Error executing function ${objectEvent.actionUseWith12}:`, e);
        }
    }
}


