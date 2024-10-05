import { setCurrentExitOptionRow, setDialogueOptionsScrollReserve, setCurrentDialogueRowsOptionsIds, getCurrentExitOptionRow, getDialogueOptionsScrollReserve, getCurrentDialogueRowsOptionsIds, setTriggerQuestPhaseAdvance, getTriggerQuestPhaseAdvance, setReadyToAdvanceNpcQuestPhase, getReadyToAdvanceNpcQuestPhase, getInteractiveDialogueState, setPreAnimationGridState, getGridData, getPlayerObject, getCanvasCellHeight, getCanvasCellWidth, getColorTextPlayer, getDialogueData, getGameVisibleActive, getLanguage, getNavigationData, getNpcData, setCurrentSpeaker, getObjectData, setAnimationInProgress, setTransitioningToDialogueState, getTransitioningToDialogueState, setCustomMouseCursor, getCustomMouseCursor, getElements } from "./constantsAndGlobalVars.js";
import { addItemToInventory, setObjectData } from "./handleCommands.js";
import { updateInteractionInfo, addDialogueRow, drawInventory, removeDialogueRow, showText } from "./ui.js";
import { setGameState } from "./game.js";
import { localize } from "./localization.js";

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
                await showText(dialogueString, getColorTextPlayer());
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
                await showText(dialogueString, getColorTextPlayer());
            }
            break;
    }
}

function unlockResearchRoomDoor(objectToUseWith, dialogueString, realVerbUsed, special) {
    showText(dialogueString, getColorTextPlayer());
    const objectData = getObjectData().objects.objectDoorLibraryFoyerResearchRoom;
    const navigationData = getNavigationData().libraryFoyer.exits.e1;
    navigationData.status = "open";
    objectData.interactable.alreadyUsed = true;
}

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

//----------------------------------------------------------------------------------------------------------------

// Dialogue Engine
async function dialogueEngine(realVerbUsed, npcId) {
    const language = getLanguage();
    const npcData = getNpcData().npcs[npcId];
    const questPhase = npcData.interactable.questPhase;
    const dialoguePhase = npcData.interactable.dialoguePhase;
    const dialogueData = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase];

    if (npcData) { //update interactionInfo
        setTransitioningToDialogueState(true);
        updateInteractionInfo(localize('interactionTalkingTo', getLanguage(), 'verbsActionsInteraction') + " " + npcData.name[language], true);
    } else {
        console.log("Error finding NPC data, check code");
    }
    
    //play intro dialogue
    let dialogueString = dialogueData.introDialogue[language]; //to be shown when first reaching the npc and provoking a conversation, before the opening dialogue from them to us
    await showText(dialogueString, getColorTextPlayer());

    const orderOfStartingDialogue = getOrderOfDialogue(npcId, questPhase, dialoguePhase);
    const lengthOfDialoguePhase = Object.keys(orderOfStartingDialogue).length - 1; // number of conversation lines in phase

    console.log(orderOfStartingDialogue);
    setCustomMouseCursor(getCustomMouseCursor('normal'));
    setGameState(getInteractiveDialogueState());

    const showDialogue = async (dialoguePhase) => { //initialise opening dialogue
        const speaker = orderOfStartingDialogue[dialoguePhase];
        setCurrentSpeaker(speaker);
        const dialogueString = dialogueData.phase[dialoguePhase][language];
    
        const { xPos, yPos } = getTextPosition(speaker, npcData);
        const textColor = getTextColor(speaker, npcData.interactable.dialogueColor);
    
        await showText(dialogueString, textColor, xPos, yPos);
    
        if (dialoguePhase < orderOfStartingDialogue.end) { //opening chat before dialogue
            dialoguePhase++;
            await showDialogue(dialoguePhase);
        } else { //trigger dialogue options and advanced dialogue and at the end close down the dialogue state
            console.log("Calling extra events like dialogue options or giving items etc if needed and then ending flow");
            dialoguePhase = 0;

            let dialogueOptionsTexts = getDialogueOptionsForCurrentQuest(); //return language dialog options for this quest
            let exitOptionText = getExitOptionForCurrentQuest(); //return exit option for this quest
            
            let currentDialogueRowsOptionsIds = {}; //global variable to call in event listener   //object of row child numbers cross referencing option ids for this quest
            let currentExitOptionRow; //global variable to call in event listener   //current row that contains the option to exit
            let dialogueOptionsScrollReserve = {}; //global variable to call in event listener

            //clear all dialogue rows
            removeDialogueRow(0);
            
            //if can exit dialogue at this point is true {
                //if quest has dialog options else only show exit dialog option
                if (Object.keys(dialogueOptionsTexts).length > 0) {
                    //loop through dialog options and add them as rows in the dialogue options up to 3 times and add them to currentDialogueRowsOptionsIds object
                    //any more add to dialogueOptionsScrollReserve
                    //add exit option to next row
                } else {
                    //add exit option to first row
                }
            //} else {
                //if dialogueOptionsScrollReserve has at least one item in it
                //repeat condition above until 4 rows are filled or there are no more to add
            //}








            //if dialogue string ends in trailing space setReadyToAdvanceNpcQuestPhase to true
            // if (dialogueData.phase[lengthOfDialoguePhase - 1][language].endsWith(' ')) {
            //     setReadyToAdvanceNpcQuestPhase(true);
            // }

            //receive the clicked option from the event listener
            //store its Dialogue option number
            //mark if the option clicked was the one to advance the questPhase
            //if it was then setTriggerQuestPhaseAdvance() true
            //showDialog(0) to show player dialog option in canvas
            //play out response phase from npc
            
            //advance questPhase
            if (getReadyToAdvanceNpcQuestPhase() && getTriggerQuestPhaseAdvance()) {
                questPhase++; 
            }

            //iterate back to check questPhase dialog responses or automatic exit if implemented on this chat

            setCurrentSpeaker('player');
            setTransitioningToDialogueState(false);
            updateInteractionInfo(localize('interactionWalkTo', getLanguage(), 'verbsActionsInteraction'), false);
            setGameState(getGameVisibleActive());
            removeDialogueRow(0); //remove all dialogue rows
        }
    };
    
    showDialogue(0);

        //if there are options then:
    //present talking options
    //read in clicked item and set questId and dialoguePhase based on this
    //trigger cutscene state
    //play dialogue sequence
    //if last sequence contains a keyword to use in condition to do something like auto exit dialogue could be '!!' at the end of the string or something, or trigger event (could be 'give you' etc) then detect it and extract it
    //otherwise trigger gameActive state, return to list of dialogues minus the one just played (or not if keyword says so)
    //if there are NO options then return or trigger other event like give player item

// Helper function to determine the position of the text based on the speaker (player or NPC)
}

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
export function executeInteractionEvent(objectEvent, dialogueString, realVerbUsed, special) {
    if (objectEvent === 'dialogueEngine') {
        let npcId = special;
        eval(`${'dialogueEngine'}('${realVerbUsed}', '${npcId}')`);
        return;
    } else {
        const safeDialogueString = `'${dialogueString.replace(/'/g, "\\'")}'`;
        
        if (objectEvent.actionUse1) {
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

        if (objectEvent.actionUse2) {
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

        if (objectEvent.actionUseWith11) {
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

        if (objectEvent.actionUseWith12) {
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
    }
}

function getOrderOfDialogue(npcId, questPhase) {
    const order = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase].order;

    const dialogueOrder = {};
    let endPosition = -1;

    for (let i = 0; i < order.length; i++) {
        const char = order[i];

        if (char === '!') {
            endPosition = i - 1;
            dialogueOrder['end'] = `${i}-1`;
        } else {
            if (char === '0') {
                dialogueOrder[i] = 'player';
            } else if (char === '1') {
                dialogueOrder[i] = 'npc';
            } else {
                dialogueOrder[i] = `npc${parseInt(char)}`;
            }
        }
    }

    if (endPosition !== -1) {
        dialogueOrder['end'] = `${endPosition}`;
    }

    return dialogueOrder;
}







//async function giveMonkeyBanana(objectToUseWith, dialogueString, realVerbUsed, special) { //THIS FUNCTION WONT WORK ANYMORE IT IS THE OLD DEBUG IMPLEMENTATION
    //     const language = getLanguage();
    //     const npcData = getNpcData().npcs.npcMonkeyDEBUG;
    //     const questPhase = npcData.interactable.questPhase;
    //     const dialogueData = getDialogueData().dialogue.npcInteractions.verbUse.npcMonkeyDEBUG.quest[questPhase].phase;
    
    //     if (npcData.interactable.questPhase === 0 && npcData.interactable.dialoguePhase === 0) {
    
    //         const dialogueSpeakers = {
    //             0: "npc",
    //             1: "npc",
    //             2: "player"
    //         };
    
    //         setGameState(getCutSceneState());
    
    //         await showText(dialogueString, getColorTextPlayer());
    
    //         const showDialogue = (dialogueIndex) => {
    //             const dialogueText = dialogueData[dialogueIndex][language];
    //             const speaker = dialogueSpeakers[dialogueIndex];
    
    //             const { xPos, yPos } = getTextPosition(speaker, npcData);
    //             const textColor = getTextColor(speaker, npcData.interactable.dialogueColor);
    
    //             showText(dialogueText, () => {
    //                 if (npcData.interactable.questPhase === 0) {
    //                     if (dialogueIndex < 2) {
    //                         showDialogue(dialogueIndex + 1);
    //                     } else {
    //                         addItemToInventory("objectBatteryDEBUG", 1);
    //                         drawInventory(0);
    
    //                         npcData.interactable.questPhase++;
    //                         npcData.interactable.canUseWith = false;
    //                         setGameState(getGameVisibleActive());
    //                     }
    //                 }
    //             }, textColor, xPos, yPos);
    //         };
    
    //         showDialogue(npcData.interactable.dialoguePhase);
    //     }
    // }



