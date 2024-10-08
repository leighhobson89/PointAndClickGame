import { getGameVisibleActive, getPlayerObject, setQuestPhaseNpc, setReadyToAdvanceNpcQuestPhase, setCurrentScrollIndexDialogue, setDialogueScrollCount, setDialogueTextClicked, getDialogueTextClicked, setDialogueOptionClicked, getDialogueOptionClicked, setDialogueOptionsScrollReserve, setCurrentDialogueRowsOptionsIds, getCurrentDialogueRowsOptionsIds, setCanExitDialogueAtThisPoint, setCurrentExitOptionRow, getCurrentExitOptionRow, setCurrentExitOptionText, getCanvasCellHeight, getCanvasCellWidth, setCurrentSpeaker, getInteractiveDialogueState, getCustomMouseCursor, setCustomMouseCursor, getColorTextPlayer, setTransitioningToDialogueState, getQuestPhaseNpc, getDialogueData, getNpcData, getLanguage, setRemovedDialogueOptions, getRemovedDialogueOptions, getElements, getDialogueScrollCount, getResolveDialogueOptionClick, getExitOptionIndex, getCurrentExitOptionText, setResolveDialogueOptionClick, getCurrentScrollIndexDialogue, getDialogueOptionsScrollReserve, getCanExitDialogueAtThisPoint, setExitOptionIndex } from "./constantsAndGlobalVars.js";
import { hideDialogueArrows, showText, updateInteractionInfo, removeDialogueRow, addDialogueRow } from "./ui.js";
import { localize } from "./localization.js";
import { setGameState } from "./game.js"

// Dialogue Engine
export async function dialogueEngine(realVerbUsed, npcId) {
    const language = getLanguage();
    const npcData = getNpcData().npcs[npcId];

    let questPhase = getQuestPhaseNpc(npcId);
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

    const orderOfStartingDialogue = getOrderOfDialogue(npcId, questPhase, 'starting', null, true);

    console.log(orderOfStartingDialogue);
    setCustomMouseCursor(getCustomMouseCursor('normal'));
    setGameState(getInteractiveDialogueState());
    hideDialogueArrows();

    const showDialogue = async (dialoguePhase, type) => { //initialise opening dialogue
        console.log("questphase upon calling function is " + getQuestPhaseNpc(npcId));
        const autoExitOption = dialogueData.exitOption;
        if (type === 'starting') {
            const speaker = orderOfStartingDialogue[dialoguePhase];
            setCurrentSpeaker(speaker);
            const dialogueString = dialogueData.phase[dialoguePhase][language];
        
            const { xPos, yPos } = getTextPosition(speaker, npcData);
            const textColor = getTextColor(speaker, npcData.interactable.dialogueColor);
        
            await showText(dialogueString, textColor, xPos, yPos);
        }

        if (type === 'starting' || type === 'continuing' || type === 'advancing' || type === 'looping') { //just for clarity remove if block later
            if (dialoguePhase < orderOfStartingDialogue.end && type === 'starting') { //opening chat before dialogue
                dialoguePhase++;
                await showDialogue(dialoguePhase, 'starting');
            } else { //trigger dialogue options and advanced dialogue and at the end close down the dialogue state

                if (type !== 'continuing') {
                    dialoguePhase = 0;
                }
    
                let dialogueOptionsTexts = returnDialogueOptionsForCurrentQuest(npcId, questPhase);
                crossReferenceDialoguesAlreadySpoken(dialogueOptionsTexts, questPhase, npcId);
                dialogueOptionsTexts = returnDialogueOptionsForCurrentQuest(npcId, questPhase);


                let exitOptionText = returnExitOptionForCurrentQuest(npcId, questPhase);

                if (exitOptionText === null && npcData.interactable.questCutOffNumber === questPhase) {
                    exitOptionText = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase].autoExitOption.phase[0][language];              
                }

                setCurrentExitOptionText(exitOptionText);
                
                if (npcData.interactable.questCutOffNumber === questPhase) {
                    setCanExitDialogueAtThisPoint(false);
                } else {
                    setCanExitDialogueAtThisPoint(!!exitOptionText);
                }

                removeDialogueRow(0);
    
                let dialogueOptionsCount = 0;
                let dialogueRowsOptionsIds = {};

                if (dialogueOptionsTexts.length === 0 && !getCanExitDialogueAtThisPoint()) {
                    type = 'exiting';
                }
            
                if (dialogueOptionsTexts.length > 0 && (type === 'starting' || type === 'advancing') || type === 'looping') {
                    let scrollReserve = [];
            
                    for (let i = 0; i < dialogueOptionsTexts.length; i++) {
                        let dialogueOptionText = dialogueOptionsTexts[i];   
                        const dialogueData = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase].dialogueOptions;
                        
                        for (let phaseId in dialogueData) {
                            if (dialogueData[phaseId][language] === dialogueOptionText) {
                                dialogueRowsOptionsIds[dialogueOptionsCount + 1] = phaseId;
                                break;
                            }
                        }
                        dialogueOptionsCount++;
                        scrollReserve.push([dialogueOptionsCount + 1, dialogueOptionText]); 
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

                    const dialogueRows = Array.from(getElements().dialogueSection.children);

                    let userChoice;
                    
                    if (type !== 'exiting') {
                        userChoice = await waitForUserClickOnDialogueOption();

                        if (getCurrentDialogueRowsOptionsIds()[userChoice[0]]) {
                            setDialogueOptionClicked(getCurrentDialogueRowsOptionsIds()[userChoice[0]]);
                            setDialogueTextClicked(userChoice[1]);
                        } else {
                            setDialogueOptionClicked(getCurrentExitOptionRow() || questPhase === npcData.interactable.questCutOffNumber);
                            type = 'exiting';
                        }
                    }

                } else if (type === 'starting' || type === 'advancing') {
                    addDialogueRow(exitOptionText);
                    setCurrentExitOptionRow(dialogueOptionsCount + 1);
                    
                    const userChoice = await waitForUserClickOnDialogueOption();
                    
                    if (userChoice[0] === getCurrentExitOptionRow()) {
                        setDialogueOptionClicked(userChoice[0]);
                        setDialogueTextClicked(userChoice[1]);
                        type = 'exiting';
                    }
                }

                if (type !== 'exiting') { //play dialogue option, response and set quest where necessary
                    setDialogueScrollCount(0);
                    setCurrentScrollIndexDialogue(0);
                    const orderOfExitDialogue = getOrderOfDialogue(npcId, questPhase, 'continuing', (getDialogueOptionClicked()), true);
                    
                    if (type !== 'continuing') {
                        dialoguePhase = 0;

                        removeDialogueRow(0);
    
                        setCurrentSpeaker('player');
                        await showText(getDialogueTextClicked(), getColorTextPlayer()); //play dialog option in game
                    }
                        const dialogueString = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase].responses[getDialogueOptionClicked()].phase[dialoguePhase][language];
                        
                        const speaker = orderOfExitDialogue[dialoguePhase];
                        setCurrentSpeaker(speaker);
    
                        const { xPos, yPos } = getTextPosition(speaker, npcData);
                        const textColor = getTextColor(speaker, npcData.interactable.dialogueColor);
                    
                        await showText(dialogueString, textColor, xPos, yPos);

                    if (dialoguePhase < orderOfExitDialogue.end) {
                        dialoguePhase++;
                        await showDialogue(dialoguePhase, 'continuing');
                    } else {
                        dialoguePhase = 0;
                        setCurrentSpeaker('player');
                    }

                    if (getDialogueTextClicked()) {
                        if (getDialogueTextClicked().endsWith(' ')) {
                            console.log("advancing quest phase");
                            questPhase++;
                            setQuestPhaseNpc(npcId, questPhase);
                            console.log("updated questPhase to " + questPhase);
                            await showDialogue(0, 'advancing');
                        } else {
                            setReadyToAdvanceNpcQuestPhase(false);
                            console.log("NOT advancing quest phase");
                            changeDialogueOptionsForCurrentQuest(npcId, questPhase, getDialogueOptionClicked());
                            console.log(getRemovedDialogueOptions());
                            await showDialogue(0, 'looping');  
                        }
                    }
                }
                
                //if there are options then:
                //if last sequence contains a keyword to use in condition to do something could be '!!' at the end of the string or something, or trigger event (could be 'give you' etc) then detect it and extract it
                //if there are NO options then return or trigger other event like give player item
            }
        }
    
        if ((getDialogueOptionClicked() === getCurrentExitOptionRow() && type === 'exiting') || npcData.interactable.questCutOffNumber === questPhase && type === 'exiting') { //exiting out of dialogue
            removeDialogueRow(0);

            const orderOfExitDialogue = getOrderOfDialogue(npcId, questPhase, 'exiting', null, true);

            let dialogueString;

            if (npcData.interactable.questCutOffNumber === questPhase) {
                dialogueString = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase].autoExitOption.phase[dialoguePhase][language];
            } else {
                dialogueString = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase].exitOption.phase[dialoguePhase][language];
            }

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
                if (npcData.interactable.questCutOffNumber === questPhase) {
                    npcData.interactable.canTalk = false;
                    npcData.interactable.cantTalkDialogueNumber = 1;
                }
                setCurrentSpeaker('player');
                setDialogueScrollCount(0);
                setCurrentScrollIndexDialogue(0);
                setCurrentExitOptionRow(null);
                setCurrentExitOptionText(null);
                setTransitioningToDialogueState(false);
                updateInteractionInfo(localize('interactionWalkTo', getLanguage(), 'verbsActionsInteraction'), false);
                setGameState(getGameVisibleActive());
                setDialogueTextClicked(null);
                return;
            }
        }
    };
    
    showDialogue(0, 'starting');
}

// Helper function to determine the position of the text based on the speaker (player or NPC)
export function getTextPosition(speaker, npcData) {
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

export function getTextColor(speaker, npcColor) {
    if (speaker === 'player') {
        return getColorTextPlayer();
    } else {
        return npcColor;
    }
}

export function getOrderOfDialogue(npcId, questPhase, type, responseId, talkTrueGiveFalse, giveScenarioId) {
    let order;

    if (talkTrueGiveFalse) { //talk
        switch (type) {
            case 'starting':
                order = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase].order;
                break;
            case 'exiting':
                if (getNpcData().npcs[npcId].interactable.questCutOffNumber > questPhase) {
                    order = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase].exitOption.order;
                } else {
                    order = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase].autoExitOption.order;
                }
                break;
            case 'continuing':
                order = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase].responses[responseId].order;
                break;
        }
    } else { //give
        order = getDialogueData().dialogue.objectInteractions.verbGive[npcId].scenario[giveScenarioId].order;
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
export function returnExitOptionForCurrentQuest(npcId, questId) {
    const language = getLanguage();
    const dialogueData = getDialogueData().dialogue.npcInteractions.verbTalkTo;
    const questData = dialogueData[npcId].quest[questId];

    if (!questData) {
        console.log("Hit the quest cut off, exiting...");
        return null;
    }

    if (!questData.exitOption) {
        console.log('No exit option found for this quest.');
        return null;
    }

    const exitOption = questData.exitOption.phase[0];
    const languageOptions = [];

    return exitOption[language];
}
export function returnDialogueOptionsForCurrentQuest(npcId, questId) {
    const language = getLanguage();
    const dialogueData = getDialogueData().dialogue.npcInteractions.verbTalkTo;
    const questData = dialogueData[npcId].quest[questId];

    if (!questData) {
        console.error('No dialogue options found for this quest.');
        return [];
    }

    const dialogueOptions = questData.dialogueOptions;
    const languageOptions = [];

    for (let optionId in dialogueOptions) {
        const option = dialogueOptions[optionId];
        if (!option[language]) {
            console.warn(`Dialogue option for language "${language}" not found for option ID "${optionId}".`);
            languageOptions.push("Option not available in this language."); // Or handle it appropriately
        } else {
            languageOptions.push(option[language]);
        }
    }

    return languageOptions;
}
export function changeDialogueOptionsForCurrentQuest(npcId, questPhase, optionIdToRemove) {
    const dialogueData = getDialogueData().dialogue.npcInteractions.verbTalkTo;
    const questData = dialogueData[npcId].quest[questPhase];

    const dialogueOptions = questData.dialogueOptions;
    const responses = questData.responses;

    if (dialogueOptions && dialogueOptions[optionIdToRemove]) {
        setRemovedDialogueOptions(npcId, questPhase, optionIdToRemove);

        delete dialogueOptions[optionIdToRemove];
    }

    if (responses && responses[optionIdToRemove]) {
        delete responses[optionIdToRemove];
    }
}
export function crossReferenceDialoguesAlreadySpoken(dialogueStrings, questPhase, npcId) {
    const removedDialogueOptions = getRemovedDialogueOptions();
    const language = getLanguage();

    if (removedDialogueOptions.length > 0 && questPhase > 0) {

        removedDialogueOptions.forEach(option => {
            if (option.npcId === npcId) {
                let optionText = null;
                if (getNpcData().npcs[npcId].interactable.questCutOffNumber === questPhase) {
                    return;
                } else {
                    const optionId = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase].dialogueOptions[option.optionId];
                    if (optionId) {
                        optionText = getDialogueData().dialogue.npcInteractions.verbTalkTo[npcId].quest[questPhase].dialogueOptions[option.optionId][language];
                    }

                    if (dialogueStrings.includes(optionText)) {
                        console.log(`Match found for removed dialogue option ${option.optionId}: "${optionText}"`);

                        changeDialogueOptionsForCurrentQuest(npcId, questPhase, option.optionId);
                    }
                }
            }
        });
    }
}

export function reattachDialogueOptionListeners() {
    const dialogueRows = Array.from(getElements().dialogueSection.children);

    dialogueRows.forEach((item, index) => {
        item.onclick = function () {
            let result = [index + 1 + getDialogueScrollCount(), item.textContent || item.innerText];
            const resolveClick = getResolveDialogueOptionClick();

            // Check if the clicked item is the exit option
            if (index + 1 === getExitOptionIndex()) {
                // Resolve with the exit option
                result = getExitOptionIndex(), getCurrentExitOptionText();
                if (resolveClick) {
                    resolveClick(result);
                    setResolveDialogueOptionClick(null);
                }
            } else {
                // Resolve with a normal dialogue option
                if (resolveClick) {
                    resolveClick(result);
                    setResolveDialogueOptionClick(null);
                }
            }
        };
    });
}
export function waitForUserClickOnDialogueOption() {
    return new Promise((resolve) => {
        setResolveDialogueOptionClick(resolve);
        updateDialogueDisplay(getCurrentExitOptionText());
    });
}

export function updateDialogueDisplay(exitOptionText) {
    let currentScrollIndex = getCurrentScrollIndexDialogue();
    const scrollReserve = getDialogueOptionsScrollReserve();
    removeDialogueRow(0);

    const dialogueOptionsToShow = [];

    for (let i = 0; i < 3; i++) {
        const index = currentScrollIndex + i;

        if (index < scrollReserve.length) {
            dialogueOptionsToShow.push(scrollReserve[index][1]);
        }
    }

    for (let text of dialogueOptionsToShow) {
        addDialogueRow(text);
    }

    if (getCanExitDialogueAtThisPoint()) {
        addDialogueRow(exitOptionText);
        setExitOptionIndex(dialogueOptionsToShow.length + 1);
    } else if (scrollReserve.length > currentScrollIndex + 3) {
        addDialogueRow(scrollReserve[currentScrollIndex + 3][1]);
    }

    updateArrowVisibility(currentScrollIndex, scrollReserve.length);
    reattachDialogueOptionListeners(getExitOptionIndex());
}

export function updateArrowVisibility(currentScrollIndex, totalOptions) {
    const upArrow = getElements().dialogueUpArrow;
    const downArrow = getElements().dialogueDownArrow;

    if (currentScrollIndex === 0) {
        upArrow.classList.add("arrow-disabled");
        upArrow.style.pointerEvents = 'none';
    } else {
        upArrow.classList.remove("arrow-disabled");
        upArrow.style.pointerEvents = 'auto';
    }

    let maxVisibleOptions;

    if (getCanExitDialogueAtThisPoint()) {
        maxVisibleOptions = 3;
    } else {
        maxVisibleOptions = 4;
    }

    if (currentScrollIndex + maxVisibleOptions >= totalOptions) {
        downArrow.classList.add("arrow-disabled");
        downArrow.style.pointerEvents = 'none';
    } else {
        downArrow.classList.remove("arrow-disabled");
        downArrow.style.pointerEvents = 'auto';
    }
}
