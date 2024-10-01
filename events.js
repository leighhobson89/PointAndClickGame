import { getPlayerObject, getCanvasCellHeight, getCanvasCellWidth, getColorTextPlayer, getCutSceneState, getDialogueData, getGameVisibleActive, getLanguage, getNavigationData, getNpcData, setCurrentSpeaker } from "./constantsAndGlobalVars.js";
import { addItemToInventory, setObjectData } from "./handleCommands.js";
import { drawInventory, showText } from "./ui.js";
import { setGameState } from "./game.js";

//OBJECTS DON'T NEED TO BE REMOVED FROM INVENTORY THIS IS HANDLED ELSEWHERE WHETHER THEY NEED TO BE REMOVED OR NOT

//Open libraryFoyer from debugRoom
function openLibraryFoyerFromDebugRoom() {
    getNavigationData().debugRoom.exits.e1.status = "open";
    setObjectData(`objectKeyDEBUG`, `interactable.alreadyUsed`, true);
}

//Use objectBatteryDEBUG to activate objectMachineDEBUG
function useBatteryDEBUGOnMachineDEBUG() {
    setObjectData(`objectMachineDEBUG`, `interactable.activeStatus`, true);
}

//Use objectMachineDEBUG to get objectBananaDEBUG
function machineDEBUGActivate() {
    addItemToInventory("objectBananaDEBUG", 3);
    drawInventory(0);
    setObjectData(`objectMachineDEBUG`, `interactable.alreadyUsed`, true);
    setObjectData(`objectMachineDEBUG`, `interactable.activeStatus`, false);
}

//Give npcMonkeyDEBUG objectbananaDEBUG to get it to talk and give player a objectBatteryDEBUG

// Main function with refactored code
function giveMonkeyBanana() {
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

export function executeObjectEvent(objectEvent) {
    // Check for actionUse1 and call its function if it exists
    if (objectEvent.actionUse1) {
        try {
            if (objectEvent.objectUse) {
                eval(`${objectEvent.actionUse1}('${objectEvent.objectUse}')`); // Pass objectUse as argument
            } else {
                eval(`${objectEvent.actionUse1}()`); // Call without arguments
            }
        } catch (e) {
            console.error(`Error executing function ${objectEvent.actionUse1}:`, e);
        }
    }

    // Check for actionUse2 and call its function if it exists
    if (objectEvent.actionUse2) {
        try {
            if (objectEvent.objectUse) {
                eval(`${objectEvent.actionUse2}('${objectEvent.objectUse}')`); // Pass objectUse as argument
            } else {
                eval(`${objectEvent.actionUse2}()`); // Call without arguments
            }
        } catch (e) {
            console.error(`Error executing function ${objectEvent.actionUse2}:`, e);
        }
    }

    // Check for actionUseWith11 and call it if it exists
    if (objectEvent.actionUseWith11) {
        try {
            if (objectEvent.objectUseWith1) {
                eval(`${objectEvent.actionUseWith11}('${objectEvent.objectUseWith1}')`); // Pass objectUseWith1 as argument
            } else {
                eval(`${objectEvent.actionUseWith11}()`); // Call without arguments
            }
        } catch (e) {
            console.error(`Error executing function ${objectEvent.actionUseWith11}:`, e);
        }
    }

    // Check for actionUseWith12 and call it if it exists
    if (objectEvent.actionUseWith12) {
        try {
            if (objectEvent.objectUseWith1) {
                eval(`${objectEvent.actionUseWith12}('${objectEvent.objectUseWith1}')`); // Pass objectUseWith1 as argument
            } else {
                eval(`${objectEvent.actionUseWith12}()`); // Call without arguments
            }
        } catch (e) {
            console.error(`Error executing function ${objectEvent.actionUseWith12}:`, e);
        }
    }
}

