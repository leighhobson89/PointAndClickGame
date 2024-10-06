import { setDialogueTextClicked, getDialogueTextClicked, setDialogueOptionClicked, setCanExitDialogueAtThisPoint, getCanExitDialogueAtThisPoint, setCurrentExitOptionRow, setDialogueOptionsScrollReserve, setCurrentDialogueRowsOptionsIds, getCurrentExitOptionRow, getDialogueOptionsScrollReserve, getCurrentDialogueRowsOptionsIds, setTriggerQuestPhaseAdvance, getTriggerQuestPhaseAdvance, setReadyToAdvanceNpcQuestPhase, getReadyToAdvanceNpcQuestPhase, getInteractiveDialogueState, setPreAnimationGridState, getGridData, getPlayerObject, getCanvasCellHeight, getCanvasCellWidth, getColorTextPlayer, getDialogueData, getGameVisibleActive, getLanguage, getNavigationData, getNpcData, setCurrentSpeaker, getObjectData, setAnimationInProgress, setTransitioningToDialogueState, getTransitioningToDialogueState, setCustomMouseCursor, getCustomMouseCursor, getElements, getDialogueOptionClicked } from "./constantsAndGlobalVars.js";
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

    const orderOfStartingDialogue = getOrderOfDialogue(npcId, questPhase, 'starting');

    console.log(orderOfStartingDialogue);
    setCustomMouseCursor(getCustomMouseCursor('normal'));
    setGameState(getInteractiveDialogueState());

    const showDialogue = async (dialoguePhase, type) => { //initialise opening dialogue
        if (type === 'starting') {
            const speaker = orderOfStartingDialogue[dialoguePhase];
            setCurrentSpeaker(speaker);
            const dialogueString = dialogueData.phase[dialoguePhase][language];
        
            const { xPos, yPos } = getTextPosition(speaker, npcData);
            const textColor = getTextColor(speaker, npcData.interactable.dialogueColor);
        
            await showText(dialogueString, textColor, xPos, yPos);
        }

        if (type === 'starting') {
            if (dialoguePhase < orderOfStartingDialogue.end) { //opening chat before dialogue
                dialoguePhase++;
                await showDialogue(dialoguePhase, 'starting');
            } else { //trigger dialogue options and advanced dialogue and at the end close down the dialogue state
                console.log("Calling extra events like dialogue options or giving items etc if needed and then ending flow");
                dialoguePhase = 0;
    
                let dialogueOptionsTexts = returnDialogueOptionsForCurrentQuest(npcId, questPhase);
                let exitOptionText = returnExitOptionForCurrentQuest(npcId, questPhase);
                
                setCanExitDialogueAtThisPoint(!!exitOptionText);
                removeDialogueRow(0);
    
                let dialogueOptionsCount = 0;
                let dialogueRowsOptionsIds = {};
            
                if (dialogueOptionsTexts.length > 0) {
                    let scrollReserve = [];
            
                    for (let i = 0; i < dialogueOptionsTexts.length; i++) {
                        let dialogueOptionText = dialogueOptionsTexts[i];
            
                        if (dialogueOptionsCount < 3) {                            
                            const dialogueData = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase].dialogueOptions;
                            
                            for (let phaseId in dialogueData) {
                                if (dialogueData[phaseId][language] === dialogueOptionText) {
                                    dialogueRowsOptionsIds[dialogueOptionsCount + 1] = phaseId;
                                    break;
                                }
                            }

                            addDialogueRow(dialogueOptionText);
                            dialogueOptionsCount++;
                        } else {
                            scrollReserve.push(dialogueOptionText);
                        }
                    }

                    setCurrentDialogueRowsOptionsIds(dialogueRowsOptionsIds);
                    setDialogueOptionsScrollReserve(scrollReserve);

                    if (getCanExitDialogueAtThisPoint()) {
                        addDialogueRow(exitOptionText);
                        setCurrentExitOptionRow(dialogueOptionsCount + 1);
                    } else if (scrollReserve.length > 0) {
                        addDialogueRow(scrollReserve[0]);
                        const dialogueData = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase].dialogueOptions;
                    
                        for (let phaseId in dialogueData) {
                            if (dialogueData[phaseId][language] === scrollReserve[0]) {
                                const nextRowIndex = dialogueOptionsCount + 1;
                                dialogueRowsOptionsIds[nextRowIndex] = phaseId; // Add the new option to the existing object
                                break;
                            }
                        }
                    }
                    
                    const userChoice = await waitForUserClickOnDialogueOption();
                    if (getCurrentDialogueRowsOptionsIds()[userChoice[0]]) {
                        setDialogueOptionClicked(getCurrentDialogueRowsOptionsIds()[userChoice[0]]);
                        setDialogueTextClicked(userChoice[1]);
                    } else {
                        setDialogueOptionClicked(getCurrentExitOptionRow());
                        type = 'exiting';
                    }

                } else {
                    addDialogueRow(exitOptionText);
                    setCurrentExitOptionRow(dialogueOptionsCount + 1);
                    
                    const userChoice = await waitForUserClickOnDialogueOption();
                    
                    if (userChoice[0] === getCurrentExitOptionRow()) {
                        setDialogueOptionClicked(userChoice[0]);
                        setDialogueTextClicked(userChoice[1]);
                        type = 'exiting';
                    }
                }

                if (type !== 'exiting') {

                }
                
                //if dialogue string ends in trailing space setReadyToAdvanceNpcQuestPhase to true
                // if (dialogueData.phase[lengthOfDialoguePhase - 1][language].endsWith(' ')) {
                //     setReadyToAdvanceNpcQuestPhase(true);
                //     
                // } else {
                //     make sure dialogue options are not available again if the quest doesnt move on    
                // }
    
                //mark if the option clicked was the one to advance the questPhase
                //if it was then setTriggerQuestPhaseAdvance() true
                //showDialog(0) to show player dialog option in canvas
                //play out response phase from npc
                
                //advance questPhase
                if (getReadyToAdvanceNpcQuestPhase() && getTriggerQuestPhaseAdvance()) {
                    questPhase++; 
                }
    
                //iterate back to check questPhase dialog responses or automatic exit if implemented on this chat
            }
        }
    
        if (getDialogueOptionClicked() === getCurrentExitOptionRow() && type === 'exiting') { //exiting out of dialogue
            removeDialogueRow(0);

            const orderOfExitDialogue = getOrderOfDialogue(npcId, questPhase, 'exiting');
            const dialogueString = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase].exitOption.phase[dialoguePhase][language];
            
            const speaker = orderOfExitDialogue[dialoguePhase];
            setCurrentSpeaker(speaker);

            const { xPos, yPos } = getTextPosition(speaker, npcData);
            const textColor = getTextColor(speaker, npcData.interactable.dialogueColor);
        
            await showText(dialogueString, textColor, xPos, yPos);
        
            if (dialoguePhase < orderOfExitDialogue.end) {
                dialoguePhase++;
                await showDialogue(dialoguePhase, 'exiting');
            } else {
                dialoguePhase = 0;
                setCurrentSpeaker('player');
                setTransitioningToDialogueState(false);
                updateInteractionInfo(localize('interactionWalkTo', getLanguage(), 'verbsActionsInteraction'), false);
                setGameState(getGameVisibleActive());
                return;
            }
        }
    };
    
    showDialogue(0, 'starting');

    //if there are options then:
    //read in clicked item and set questId and dialoguePhase based on this
    //trigger cutscene state
    //play dialogue sequence
    //if last sequence contains a keyword to use in condition to do something like auto exit dialogue could be '!!' at the end of the string or something, or trigger event (could be 'give you' etc) then detect it and extract it
    //otherwise trigger gameActive state, return to list of dialogues minus the one just played (or not if keyword says so)
    //if there are NO options then return or trigger other event like give player item
}

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

function getOrderOfDialogue(npcId, questPhase, type) {
    let order;

    switch(type) {
        case 'starting':
            order = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase].order;
            break;
        case 'exiting':
            order = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase].exitOption.order;
            break;
    }

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

function returnExitOptionForCurrentQuest(npcId, questId) {
    const language = getLanguage();
    const dialogueData = getDialogueData().dialogue.npcInteractions.verbTalkTo;
    const questData = dialogueData[npcId].quest[questId];

    if (!questData.exitOption) {
        console.error('No exit option found for this quest.');
        return null;
    }

    const exitOption = questData.exitOption.phase[0];
    const languageOptions = [];

    return exitOption[language];
}

function returnDialogueOptionsForCurrentQuest(npcId, questId) {
    const language = getLanguage();
    const dialogueData = getDialogueData().dialogue.npcInteractions.verbTalkTo;
    const questData = dialogueData[npcId].quest[questId];

    if (!questData.dialogueOptions) {
        console.error('No dialogue options found for this quest.');
        return [];
    }

    const dialogueOptions = questData.dialogueOptions;
    const languageOptions = [];

    for (let optionId in dialogueOptions) {
        const option = dialogueOptions[optionId];
        languageOptions.push(option[language]);   
    }

    return languageOptions;
}

function waitForUserClickOnDialogueOption() {
    return new Promise((resolve) => {
        const dialogueRows = Array.from(getElements().dialogueSection.children);

        dialogueRows.forEach((item, index) => {
            const oldListener = item.onclick;
            item.onclick = function() {
                dialogueRows.forEach(row => row.removeEventListener('click', oldListener));

                const result = [index + 1, item.textContent || item.innerText];
                resolve(result);
            };
        });
    });
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



