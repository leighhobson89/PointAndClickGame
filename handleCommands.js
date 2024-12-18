import { getCanvasCellHeight, getAllGridData, setNavigationData, getOriginalValueInCellWhereNpcPlaced, getSwappedDialogueObject, setSwappedDialogueObject, setDialoguesData, setNpcsData, getColorTextPlayer, getWaitingForSecondItem, getSecondItemAlreadyHovered, getObjectToBeUsedWithSecondItem, setWaitingForSecondItem, setObjectToBeUsedWithSecondItem, setObjectsData, setVerbButtonConstructionStatus, getNavigationData, getCurrentScreenId, getDialogueData, getLanguage, getObjectData, getPlayerInventory, setCurrentStartIndexInventory, getGridData, getOriginalValueInCellWhereObjectPlaced, setPlayerInventory, getLocalization, getElements, getNpcData, getCanvasCellWidth, getForcePlayerLocation, getInteractiveDialogueState } from "./constantsAndGlobalVars.js";
import { localize } from "./localization.js";
import { drawInventory, resetSecondItemState, showText, updateInteractionInfo } from "./ui.js";
import { executeInteractionEvent } from "./events.js";
import { dialogueEngine} from "./dialogue.js";
import { triggerPendingEvent, checkPendingEvents, updateGrid } from "./game.js";

export function performCommand(command, inventoryItem) {
    //console.log(command);
    if (command !== null) {
        const verbKey = command.verbKey;
        const objectId1 = command.objectId1;
        const objectId2 = command.objectId2;
        const isObjectTrueNpcFalse = command.isObjectTrueNpcFalse;
        const exitOrNot1 = command.exitOrNot1;
        const exitOrNot2 = command.exitOrNot2;
        const quantity = command.quantity;

        switch (verbKey) {
            case 'verbLookAt':
                handleLookAt(verbKey, objectId1, exitOrNot1, isObjectTrueNpcFalse);
                break;
            case 'verbPickUp':
                handlePickUp(verbKey, objectId1, exitOrNot1, isObjectTrueNpcFalse);
                break;
            case 'verbUse':
                handleUse(objectId1, objectId2, exitOrNot1, exitOrNot2, inventoryItem, quantity, isObjectTrueNpcFalse, verbKey);
                break;
            case 'verbOpen':
                handleOpen(verbKey, objectId1, exitOrNot1);
                break;
            case 'verbClose':
                handleClose(verbKey, objectId1, exitOrNot1);
                break;
            case 'verbPush':
                handlePush(verbKey, objectId1, exitOrNot1);
                break;
            case 'verbPull':
                handlePull(verbKey, objectId1, exitOrNot1);
                break;
            case 'verbTalkTo':
                handleTalkTo(verbKey, objectId1, exitOrNot1, isObjectTrueNpcFalse);
                break;
            case 'verbGive':
                handleGive(objectId1, objectId2, exitOrNot1, exitOrNot2, inventoryItem, quantity, isObjectTrueNpcFalse, verbKey);
                break;
        }
    }

    return;
}
function findExitToRoom(roomId) {
    const navigationData = getNavigationData();
    const currentScreenId = getCurrentScreenId();
    const currentRoomExits = navigationData[currentScreenId].exits;

    for (const exitKey in currentRoomExits) {
        if (currentRoomExits.hasOwnProperty(exitKey)) {
            const exit = currentRoomExits[exitKey];

            if (exit.connectsTo === roomId) {
                return exitKey;
            }
        }
    }

    return null;
}

export function handleLookAt(verb, objectId, exitOrNot, isObjectTrueNpcFalse) {
    const dialogueData = getDialogueData();
    const language = getLanguage();

    if (!isObjectTrueNpcFalse) {
        const dialogueString = dialogueData.dialogue.npcInteractions[verb][objectId][0][language];
        showText(dialogueString, getColorTextPlayer());
        return;

    }

    if (!exitOrNot) {
        const dialogueString = dialogueData.dialogue.objectInteractions[verb][objectId][0][language];

        if (dialogueString) {
            showText(dialogueString, getColorTextPlayer());
        } else {
            console.warn(`No dialogue found for ${verb} and object ${objectId} in language ${language}`);
        }
    } else {
        const connectsTo = getNavigationData()[getCurrentScreenId()].exits[findExitToRoom(objectId)].connectsTo;
        const openOrLocked = getNavigationData()[getCurrentScreenId()].exits[findExitToRoom(objectId)].status;
        const dialogueString = dialogueData.dialogue.objectInteractions[verb]?.exits[connectsTo][openOrLocked][language];

        if (dialogueString) {
            showText(dialogueString, getColorTextPlayer());
        } else {
            console.warn(`No dialogue found for ${verb} and object ${objectId} in language ${language}`);
        }
    }
}

export function handlePickUp(verb, objectId, exitOrNot, isObjectTrueNpcFalse) {
    const objectData = getObjectData();
    const dialogueData = getDialogueData();
    const language = getLanguage();
    const object = objectData.objects[objectId];

    if (!isObjectTrueNpcFalse) {
        handleCannotPickUpMessage(language, dialogueData);
        return;
    }

    if (!exitOrNot && !object) {
        console.warn(`Object ${objectId} not found.`);
        return;
    }

    if (!exitOrNot) {
        const quantity = object.interactable.quantity;
        if (object.interactable.canPickUp && object.interactable.canPickUpNow) {
            const dialogueString = dialogueData.dialogue.objectInteractions[verb]?.[objectId]?.[language];
            if (dialogueString) {
                showText(dialogueString, getColorTextPlayer());
            } else {
                console.warn(`No dialogue found for ${verb} and object ${objectId} in language ${language}`);
            }
            pickUpItem(objectId, quantity, verb, dialogueString);
        } else if (!object.interactable.canPickUpNow) {
            const objectEvent = getObjectEvents(objectId);

            if (objectEvent.actionCanPickUpButNotYet !== "") {
                executeInteractionEvent(objectEvent, "", verb, objectId);
            }
        } else {
            handleCannotPickUpMessage(language, dialogueData);
        }
        return;
    }

    handleCannotPickUpMessage(language, dialogueData);
}

function pickUpItem(objectId, quantity, verb, dialogueString) {
    const objectEvent = getObjectEvents(objectId);

    removeObjectFromEnvironment(objectId, getCurrentScreenId());
    addItemToInventory(objectId, quantity);

    console.log(getPlayerInventory());
    setCurrentStartIndexInventory(0);
    drawInventory(0);
    
    if (objectEvent.actionPickUp !== "") {
        executeInteractionEvent(objectEvent, dialogueString, verb, objectId);
    }
}

export function removeObjectFromEnvironment(objectId, placeToRemoveFrom) {
    const gridData = getAllGridData()[placeToRemoveFrom]; // Get the current grid data
    const roomId = placeToRemoveFrom;
    const originalValues = getOriginalValueInCellWhereObjectPlaced(); // Get original values in the cells

    if (originalValues.hasOwnProperty(roomId)) {
        let objectRemoved = false; // Flag to confirm if the object was removed

        // Attempt to remove the object
        for (const [position, data] of Object.entries(originalValues[roomId])) {
            if (data.objectId === objectId) {
                const [x, y] = position.split(',').map(Number); // Parse position

                if (y >= 0 && y < gridData.length && x >= 0 && x < gridData[y].length) {
                    // Remove the object by restoring the original value
                    gridData[y][x] = data.originalValue;
                    objectRemoved = true; // Set flag to true since the object is removed
                } else {
                    console.error(`Position out of bounds: (${x}, ${y})`);
                }
            }
        }

        if (objectRemoved) {
            // After removal, check for references to the objectId in gridData
            let foundReference = false;

            for (const [y, row] of gridData.entries()) {
                for (const [x, cell] of row.entries()) {
            
                    if (cell.slice(1).includes(objectId)) {
                        foundReference = true;
                        gridData[y][x] = 'n'; // This might cause problems if the object was on a w or other to start with
                    }
                }
            }

            if (foundReference) {
                console.log(`Warning: Object ID ${objectId} was still referenced in gridData and has been set to 'n'.`);
            } else {
                console.log(`Confirmation: Object ID ${objectId} has been successfully removed, and no references were found.`);
            }
        } else {
            console.log(`No objects found to remove for Object ID: ${objectId}`);
        }
    } else {
        console.error(`No original values found for roomId: ${roomId}`);
    }
}



export function removeNpcFromEnvironment(npcId, placeToRemoveFrom) {
    const gridData = getAllGridData()[placeToRemoveFrom]; // Get the current grid data
    const roomId = placeToRemoveFrom;
    const originalValues = getOriginalValueInCellWhereNpcPlaced();

    if (originalValues.hasOwnProperty(roomId)) {
        let npcRemoved = false; // Flag to confirm if the NPC was removed

        // Attempt to remove the NPC
        for (const [position, data] of Object.entries(originalValues[roomId])) {
            if (data.npcId === npcId) {
                const [x, y] = position.split(',').map(Number);

                if (y >= 0 && y < gridData.length && x >= 0 && x < gridData[y].length) {
                    // Remove the NPC by restoring the original value
                    gridData[y][x] = data.originalValue;
                    npcRemoved = true; // Set flag to true since the NPC is removed
                } else {
                    console.error(`Position out of bounds: (${x}, ${y})`);
                }
            }
        }

        if (npcRemoved) {
            // After removal, check for references to the npcId in gridData
            let foundReference = false;

            for (const [y, row] of gridData.entries()) {
                for (const [x, cell] of row.entries()) {

                    // Check if the cell references the npcId (assuming it starts with 'n')
                    if (cell.slice(1).includes(npcId)) {
                        foundReference = true;
                        gridData[y][x] = 'n'; // This might cause problems if the NPC was on a w or other to start with
                    }
                }
            }

            if (foundReference) {
                console.log(`Warning: NPC ID ${npcId} was still referenced in gridData and has been set to 'n'.`);
            } else {
                console.log(`Confirmation: NPC ID ${npcId} has been successfully removed, and no references were found.`);
            }
        } else {
            console.log(`No NPCs found to remove for NPC ID: ${npcId}`);
        }
    } else {
        console.error(`No original values found for roomId: ${roomId}`);
    }
}


export function addItemToInventory(objectId, quantity = 1) {
    const objectData = getObjectData().objects[objectId];
    const isStackable = objectData.interactable.stackable;
    const inventory = getPlayerInventory();

    if (!inventory.slot1) {
        inventory.slot1 = {
            object: objectId,
            quantity: isStackable ? quantity : 1,
            stackable: isStackable ? "true" : "false"
        };
        setPlayerInventory(inventory);
        return;
    }

    for (let slot in inventory) {
        if (inventory[slot] && inventory[slot].object === objectId) {
            if (isStackable) {
                inventory[slot].quantity += quantity;
                setPlayerInventory(inventory);
                return;
            }
        }
    }

    const slots = Object.keys(inventory);

    for (let i = slots.length - 1; i >= 0; i--) {
        const currentSlot = slots[i];
        const previousSlot = `slot${i + 2}`;

        if (inventory[currentSlot]) {
            inventory[previousSlot] = inventory[currentSlot];
        }
    }

    inventory.slot1 = {
        object: objectId,
        quantity: isStackable ? quantity : 1,
        stackable: isStackable ? "true" : "false"
    };

    setPlayerInventory(inventory);
}

export function handleInventoryAdjustment(objectId, quantity, overrideDecrementFalse) {
    const inventory = getPlayerInventory();
    const objectData = getObjectData().objects[objectId];

    if (objectData.interactable && (objectData.interactable.decrementQuantityOnUse || overrideDecrementFalse)) {
        for (let slot in inventory) {
            if (inventory[slot] && inventory[slot].object === objectId) {
                if (inventory[slot].quantity >= quantity) {
                    inventory[slot].quantity -= quantity;

                    if (inventory[slot].quantity === 0) {
                        let currentSlot = slot;

                        while (inventory[`slot${parseInt(currentSlot.replace('slot', '')) + 1}`]) {
                            const nextSlot = `slot${parseInt(currentSlot.replace('slot', '')) + 1}`;
                            inventory[currentSlot] = inventory[nextSlot];
                            currentSlot = nextSlot;
                        }

                        delete inventory[currentSlot];
                        console.log(getPlayerInventory());
                        console.log(`Removed ${objectId} from inventory. Slots shifted down.`);
                    } else {
                        console.log(`Decreased quantity of ${objectId} by ${quantity}. New quantity: ${inventory[slot].quantity}`);
                    }
                } else {
                    console.warn(`Not enough quantity to decrement. Current quantity: ${inventory[slot].quantity}.`);
                }
                setPlayerInventory(inventory);
                return;
            }
        }
        console.warn(`Object ID ${objectId} not found in inventory.`);
    }
}

function handleCannotPickUpMessage(language, dialogueData) {
    const cannotPickUpMessage = dialogueData.dialogue.globalMessages.itemCannotBePickedUp?.[language];
    if (cannotPickUpMessage) {
        showText(cannotPickUpMessage, getColorTextPlayer());
    } else {
        console.warn(`No global message found for itemCannotBePickedUp in language ${language}`);
    }
}

// BREAKS IF USER MOVES MOUSE OFF OBJECT WHILE MOVING TOWARDS OBJECT TWO
export function handleUse(objectId1, objectId2, exitOrNot1, exitOrNot2, inventoryItem, quantity = 1, isObjectTrueNpcFalse, realVerbUsed) {
    const dialogueData = getDialogueData();
    const language = getLanguage();
    const useWith = checkIfItemCanBeUsedWith(objectId1, isObjectTrueNpcFalse, true);
    
    if ((!inventoryItem && useWith && !getWaitingForSecondItem() && isObjectTrueNpcFalse)) {
        handleCannotUsedUntilPickedUpMessage(language, dialogueData);
        return;
    }

    if (exitOrNot1 && !getWaitingForSecondItem()) {
        handleCannotUseExitMessage(language, dialogueData);
        return;
    }

    if (!inventoryItem && !getWaitingForSecondItem()) {
        if (!isObjectTrueNpcFalse) { //if is npc
            useItem(objectId1, null, useWith, null, null, false, null, realVerbUsed);
            return;
        }
        useItem(objectId1, null, useWith, null, null, true, null, realVerbUsed); //at this line we're always talking about object1 and no useWith scenario ie inventory item is always false by this point
        return;
    } else if (!getWaitingForSecondItem()) {
        setWaitingForSecondItem(true);
        setObjectToBeUsedWithSecondItem(objectId1);
        const interactiveInfoWith = getElements().interactionInfo.textContent + " " + localize('interactionWith', language, 'verbsActionsInteraction');
        updateInteractionInfo(interactiveInfoWith, false);
    } else {
        console.log("handling With use");
        handleWith(objectId1, objectId2, exitOrNot2, inventoryItem, quantity, isObjectTrueNpcFalse, realVerbUsed); //inventoryItem always refers to object2 by this point
        setVerbButtonConstructionStatus(null);
        resetSecondItemState();
        updateInteractionInfo(localize('interactionLookAt', getLanguage(), 'verbsActionsInteraction'), false);
    }
}

export async function handleWith(objectId1, objectId2, exitOrNot2, inventoryItem2, quantity, isObject2TrueNpcFalse, realVerbUsed) {
    const language = getLanguage();
    const objectData = getObjectData();
    const npcData = getNpcData();
    const object1 = objectData.objects[objectId1];
    const dialogueData = getDialogueData().dialogue.globalMessages;
    const useTogetherLocation1 = object1.usedOn.useTogetherLocation;
    const useWith2 = checkIfItemCanBeUsedWith(objectId2, isObject2TrueNpcFalse, false);

    let object2;
    let useTogetherLocation2;
    let dialogueString;

    if (objectId2 !== null) {
        if (isObject2TrueNpcFalse) {
            object2 = objectData.objects[objectId2];
            if (!exitOrNot2) {
                useTogetherLocation2 = object2.usedOn.useTogetherLocation;
            }
        } else {
            object2 = npcData.npcs[objectId2];
            useTogetherLocation2 = object2.usedOn.useTogetherLocation;
        }
    } else {
        return;
    }

    let locationCorrect;
    let locationImportant;

    if (useTogetherLocation1 && useTogetherLocation2) { 
        locationImportant = true;
        if (useTogetherLocation1 === useTogetherLocation2) {
            if (getCurrentScreenId() === useTogetherLocation1 && getCurrentScreenId() === useTogetherLocation2 && useWith2) {
                locationCorrect = true;
            } else {
                console.log("1: not right location to use these items together (2 inventory) - PASSED");
                dialogueString = dialogueData.correctItemsWrongLocation[language];
                await showText(dialogueString, getColorTextPlayer());
                return;
            }
        } else if (useTogetherLocation1 === objectId2 && useTogetherLocation2 === objectId1 && useWith2) {
            console.log("2: irrelevant location, can use these items together (2 inventory) - PASSED");
            handleInventoryAdjustment(objectId1, quantity, false);
            if (isObject2TrueNpcFalse) {
                handleInventoryAdjustment(objectId2, quantity, false);
            }
            drawInventory(0);
            useItem(objectId1, objectId2, true, exitOrNot2, inventoryItem2, true, isObject2TrueNpcFalse, realVerbUsed);
            return;
        } else {
            dialogueString = dialogueData.cantBeUsedTogether[language];
            console.log("3: Two items that are just not able to be used together - PASSED");
            await showText(dialogueString, getColorTextPlayer());
            return;
        }
    }

    if (!inventoryItem2 && !exitOrNot2) {
        if (object1.usedOn.objectUseWith1 === objectId2) {
            console.log("4: using object with environment object - PASSED");
            handleInventoryAdjustment(objectId1, quantity, false);
            drawInventory(0);
            useItem(objectId1, objectId2, true, exitOrNot2, inventoryItem2, true, isObject2TrueNpcFalse, realVerbUsed);
            return;
        } else if (object1.usedOn.npcUseWith1 === objectId2) {
            console.log("5: using object with npc - PASSED");
            handleInventoryAdjustment(objectId1, quantity, false);
            drawInventory(0);
            useItem(objectId1, objectId2, true, exitOrNot2, inventoryItem2, true, isObject2TrueNpcFalse, realVerbUsed);
            return;
        } else {
            dialogueString = dialogueData.cantBeUsedTogether[language];
            await showText(dialogueString, getColorTextPlayer());
            console.log("6: items cannot be used together (environment object) - PASSED");
            return;
        }
    }

    if (exitOrNot2) {
        if (object1.usedOn.objectUseWith1 === objectId2 && useTogetherLocation1 === getCurrentScreenId()) {
            console.log("7: using object on exit - PASSED");
            handleInventoryAdjustment(objectId1, quantity, false);
            drawInventory(0);
            useItem(objectId1, objectId2, true, exitOrNot2, inventoryItem2, true, isObject2TrueNpcFalse, realVerbUsed);
            return;
        } else {
            dialogueString = dialogueData.howWouldThatWorkWithThis[language];
            await showText(dialogueString, getColorTextPlayer());
            console.log("8: wrong object for exit - PASSED");
            return;
        }
    }

    if (object1.usedOn.objectUseWith1 === objectId2 && object2.usedOn.objectUseWith1 === objectId1 && isObject2TrueNpcFalse) {
        console.log("9: using two inventory items where location is important and location is correct - PASSED");
        handleInventoryAdjustment(objectId1, quantity, false);
        drawInventory(0);
        useItem(objectId1, objectId2, true, exitOrNot2, inventoryItem2, true, isObject2TrueNpcFalse, realVerbUsed);
        return;
    } else {
        dialogueString = dialogueData.cantBeUsedTogether[language];
        await showText(dialogueString, getColorTextPlayer()); // Wait for the text to finish before proceeding
        console.log("10: items just cant be used together at all - PASSED");
        return;
    }
}

export async function useItem(objectId1, objectId2, useWith, exitOrNot2, inventoryItem2, isObject1TrueNpcFalse, isObject2TrueNpcFalse, realVerbUsed) { //function uses all items, use or use with
    const objectData = getObjectData();
    const dialogueData = getDialogueData();
    const language = getLanguage();
    const npcData = getNpcData();

    let object1;
    let object2;
    let objectEvent;

    let dialogueString = "";

    if (isObject1TrueNpcFalse) {
        object1 = objectData.objects[objectId1];
        objectEvent = getObjectEvents(objectId1);
    } else { //npc
        object1 = npcData.npcs[objectId1];
        if (!isObject1TrueNpcFalse && object1.interactable.canTalk) { //dialogue window intiation
            await dialogueEngine(realVerbUsed, objectId1, true, null, null, null);
            const pendingEvent = checkPendingEvents(objectId1); //check for events triggered by two spaces end of dialogue in last response of npc ie if he is walking away

            if (pendingEvent) {
                const eventToTrigger = pendingEvent[0] + 'Event' + pendingEvent[2] + pendingEvent[3]; // i.e. dialogueEventnpcFarmercowPath
                pendingEvent[0] = eventToTrigger;
                triggerPendingEvent(pendingEvent);
            }
        } else {
            const cantTalkDialogueNumber = npcData.npcs[objectId1].interactable.cantTalkDialogueNumber;
            dialogueString = dialogueData.dialogue.npcInteractions.verbTalkTo[objectId1].cantTalkDialogue[cantTalkDialogueNumber][language];
            showText(dialogueString, npcData.npcs[objectId1].interactable.dialogueColor);
        }
        return;
    }

    if (objectId2) {
        if (isObject2TrueNpcFalse) {
            object2 = objectData.objects[objectId2];
        } else {
            object2 = npcData.npcs[objectId2];
        }
    }

    if (!useWith && !objectId2) { //Use item in room
        if (object1.interactable.activeStatus && !object1.interactable.alreadyUsed) {
            dialogueString = dialogueData.dialogue.objectInteractions.verbUse[objectId1].use.canUse[language];
            executeInteractionEvent(objectEvent, dialogueString, realVerbUsed, objectId1);
        } else if (object1.interactable.alreadyUsed) { //also can be an UNLOCKED door in any state of open/closed
            if (object1.interactable.canOpen && objectId1.includes('objectDoor')) { //unlocked door/container OPEN/CLOSED state
                executeInteractionEvent(objectEvent, dialogueString, realVerbUsed, objectId1);
                return;
            }
            dialogueString = dialogueData.dialogue.objectInteractions.verbUse[objectId1].use.alreadyUsed[language];
            await showText(dialogueString, getColorTextPlayer());
        } else { // also can be LOCKED door
            dialogueString = dialogueData.dialogue.objectInteractions.verbUse[objectId1].use.cantUseYet[language];
            await showText(dialogueString, getColorTextPlayer());
        }
    } else { //useWith
        if (!isObject2TrueNpcFalse) {
            dialogueString = dialogueData.dialogue.npcInteractions.verbUse.useWithNpc1[objectId2][language];
            executeInteractionEvent(objectEvent, dialogueString, realVerbUsed, objectId1);
            return;
        }
        if (!exitOrNot2 && isObject2TrueNpcFalse) {
            
            //add if it contains door then if alreadyUsed is true then return global already open message for doors
            if (objectId2.includes('objectDoor') && object2.interactable.alreadyUsed) {
                dialogueString = dialogueData.dialogue.globalMessages.alreadyUnlocked[language];
                showText(dialogueString, getColorTextPlayer());
                return;
            }

            if ((object1.interactable.activeStatus && object2.interactable.activeStatus) || !inventoryItem2) {
                if (object1.usedOn.actionUseWith11) {
                    dialogueString = dialogueData.dialogue.objectInteractions.verbUse.useWithObject1[objectId1][language];
                    executeInteractionEvent(objectEvent, dialogueString, realVerbUsed, objectId1);
                    return;
                } else {
                    dialogueString = dialogueData.dialogue.globalMessages.tryOtherWayAround[language];
                    await showText(dialogueString, getColorTextPlayer());
                }
            } else if (!object1.interactable.alreadyUsed) {
                dialogueString = dialogueData.dialogue.globalMessages.activeStatusNotSet[language];
                await showText(dialogueString, getColorTextPlayer());
            } else {
                dialogueString = dialogueData.dialogue.globalMessages.alreadyUsedButRetained[language];
                showText(dialogueString, getColorTextPlayer());
            }
        } else { //second object is an exit so we dont need to check object2 events, and possibly never will in any situation but in case...
            if (object1.interactable.activeStatus) {
                dialogueString = dialogueData.dialogue.objectInteractions.verbUse.useWithObject1[objectId1][language];
                executeInteractionEvent(objectEvent, dialogueString, realVerbUsed, objectId1);
                return;
            } else if (!object1.interactable.alreadyUsed) {
                dialogueString = dialogueData.dialogue.globalMessages.activeStatusNotSet[language];
                showText(dialogueString, getColorTextPlayer());
            } else {
                dialogueString = dialogueData.dialogue.globalMessages.alreadyUsedButRetained[language];
                await showText(dialogueString, getColorTextPlayer());
            }
        }
    }
}

function checkIfItemCanBeUsedWith(objectId, isObjectTrueNpcFalse, useTrueUseWithFalse) {
    if (!isObjectTrueNpcFalse && useTrueUseWithFalse) { //npc use is just talk to
        return false;
    }

    if (!isObjectTrueNpcFalse) { //npc
        const npcData = getNpcData().npcs[objectId];
    
        if (npcData && npcData.interactable) {
            return npcData.interactable.canUseWith;
        } else {
            console.warn(`Npc with ID ${objectId} does not exist.`);
            ;
        }
    } 

    if (useTrueUseWithFalse) { //use
        const objectData = getObjectData().objects[objectId];
    
        if (objectData && objectData.interactable) {
            return objectData.interactable.canUseWith;
        } else {
            console.log(`Object with ID ${objectId} does not exist.`);
        } 
    } else {
        return true;
    }
}

function handleCannotUseExitMessage(language, dialogueData) {
    const cannotUseExitMessage = dialogueData.dialogue.globalMessages.itemCannotBeUsedWithExit?.[language];
    showText(cannotUseExitMessage, getColorTextPlayer());        
}

function handleCannotUsedUntilPickedUpMessage(language, dialogueData) {
    const cannotUseUntilPickedUpMessage = dialogueData.dialogue.globalMessages.itemCannotBeUsedUntilPickedUp?.[language];
    showText(cannotUseUntilPickedUpMessage, getColorTextPlayer());  
}

// Handle "Open" action
export function handleOpen(verb, objectId, exitOrNot) {
    const objectData = getObjectData().objects[objectId];
    const dialogueData = getDialogueData().dialogue;
    const language = getLanguage();
    let dialogueString;
    
    if (objectData) {
        if (objectData.interactable.canOpen) {
            handleUse(objectId, null, null, null, false, 1, true, verb);
        } else {
            dialogueString = dialogueData.globalMessages.itemCannotBeOpened[language];
            showText(dialogueString, getColorTextPlayer());
        }
    } else {
        dialogueString = dialogueData.globalMessages.itemCannotBeOpened[language];
        showText(dialogueString, getColorTextPlayer());
    }
}

// Handle "Close" action
export function handleClose(verb, objectId, exitOrNot) {
    const objectData = getObjectData().objects[objectId];
    const dialogueData = getDialogueData().dialogue;
    const language = getLanguage();
    let dialogueString;
    
    if (objectData) {
        if (objectData.interactable.canOpen) {
            handleUse(objectId, null, null, null, false, 1, true, verb);
        } else {
            dialogueString = dialogueData.globalMessages.itemCannotBeClosed[language];
            showText(dialogueString, getColorTextPlayer());
        }
    } else {
        dialogueString = dialogueData.globalMessages.itemCannotBeClosed[language];
        showText(dialogueString, getColorTextPlayer());
    }
}

// Handle "Push" action
export function handlePush(verb, objectId) {
    const objectData = getObjectData().objects[objectId];
    const dialogueData = getDialogueData().dialogue;
    const language = getLanguage();
    let dialogueString;

    if (objectData) { //can only push objects and not other types
        if (objectData.interactable.canPush && !objectData.interactable.canUse) {
            //handle cases where you can push but cannot use if ever comes about
        } else if (objectData.interactable.canPush) {
            handleUse(objectId, null, null, null, false, 1, true, verb);
        } else {
            dialogueString = dialogueData.globalMessages.itemCannotBePushed[language];
            showText(dialogueString, getColorTextPlayer());
        }
    } else {
        dialogueString = dialogueData.globalMessages.itemCannotBePushed[language];
        showText(dialogueString, getColorTextPlayer());
    }
}

// Handle "Pull" action
export function handlePull(verb, objectId) {
    const objectData = getObjectData().objects[objectId];
    const dialogueData = getDialogueData().dialogue;
    const language = getLanguage();
    let dialogueString;

    if (objectData) { //can only pull objects and not other types
        if (objectData.interactable.canPull && !objectData.interactable.canUse) {
            //handle cases where you can pull but cannot use if ever comes about
        } else if (objectData.interactable.canPull) {
            handleUse(objectId, null, null, null, false, 1, true, verb);
        } else {
            dialogueString = dialogueData.globalMessages.itemCannotBePulled[language];
            showText(dialogueString, getColorTextPlayer());
        }
    } else {
        dialogueString = dialogueData.globalMessages.itemCannotBePulled[language];
        showText(dialogueString, getColorTextPlayer());
    }
}

// Handle "Talk To" action
export async function handleTalkTo(verb, npcId, exitOrNot, isObjectTrueNpcFalse) {
    let npcData;

    if (isObjectTrueNpcFalse && !exitOrNot) {
        npcData = getObjectData().objects[npcId]; //for special cases of objects standing in for npc, code is correct dont worry
        if (!npcData.interactable.specialNpcObjectStandIn) {
            npcData = getNpcData().npcs[npcId];
        }
    } else {
        npcData = getNpcData().npcs[npcId];
    }

    const dialogueData = getDialogueData().dialogue;
    const language = getLanguage();
    let dialogueString;
    
    if ((!isObjectTrueNpcFalse && !exitOrNot) || npcData) {
        if (npcData.interactable.canTalk) {
            handleUse(npcId, null, null, null, false, 1, false, verb);
        } else {
            if (!npcData.interactable.specialNpcObjectStandIn) {
                const cantTalkDialogueNumber = npcData.interactable.cantTalkDialogueNumber;
                dialogueString = dialogueData.npcInteractions.verbTalkTo[npcId].cantTalkDialogue[cantTalkDialogueNumber][language];
                
                await showText(dialogueString, npcData.interactable.dialogueColor);
                
                const pendingEvent = checkPendingEvents(npcId);

                if (pendingEvent) {
                    triggerPendingEvent(pendingEvent);
                }
            } else {
                dialogueString = dialogueData.objectInteractions.verbUse[npcId].use.cantUseYet[language];
                showText(dialogueString, npcData.interactable.dialogueColor);
            }
        }
    } else {
        dialogueString = dialogueData.globalMessages.itemCannotBeTalkedTo[language];
        showText(dialogueString, getColorTextPlayer());
    }
}

// Handle "Give" action
export function handleGive(objectId1, objectId2, exitOrNot1, exitOrNot2, inventoryItem, quantity, isObjectTrueNpcFalse, realVerbUsed) {
    const dialogueData = getDialogueData();
    const language = getLanguage();
    let canGiveObject;

    if (!getWaitingForSecondItem()) {
        canGiveObject = checkIfCanGiveOrShownCannotGiveMessage(exitOrNot1, isObjectTrueNpcFalse, objectId1, inventoryItem);
        if (!canGiveObject) return;
    }

    //by this point we have established that we have not done any of the items in the environment:
    //give environment object,
    //give exit, 
    //give non inventory but pickable object
    //give npc
    //give inventory item that cannot be given

    //and established that the item clicked can be given.

    if (!getWaitingForSecondItem()) {
        setWaitingForSecondItem(true);
        setObjectToBeUsedWithSecondItem(objectId1);
        const interactiveInfoTo = getElements().interactionInfo.textContent + " " + localize('interactionTo', language, 'verbsActionsInteraction');
        updateInteractionInfo(interactiveInfoTo, false);
    } else {
        console.log("handling Give To");
        handleTo(objectId1, objectId2, exitOrNot2, inventoryItem, quantity, isObjectTrueNpcFalse, realVerbUsed); //inventoryItem always refers to object2 by this point
        setVerbButtonConstructionStatus(null);
        resetSecondItemState();
        updateInteractionInfo(localize('interactionLookAt', getLanguage(), 'verbsActionsInteraction'), false);
    }
}

function checkIfCanGiveOrShownCannotGiveMessage(exitOrNot, isObjectTrueNpcFalse, objectId, inventoryItem) {
    let dialogueData = getDialogueData();
    let language = getLanguage();
    let dialogueString;
    let objectData;
    let canGive;

    if (isObjectTrueNpcFalse) {
        if (!exitOrNot) {
            objectData = getObjectData().objects[objectId]; //any object
            canGive = objectData.interactable.canGive;
        } else {
            canGive = false; //exit
        }
    } else {
        objectData = getNpcData().npcs[objectId]; //npc
    }

    if (exitOrNot) {
        dialogueString = dialogueData.dialogue.globalMessages.itemCannotGiveExitorBeGivenToExit[language]; //exits
    } else if (!isObjectTrueNpcFalse) {
        dialogueString = dialogueData.dialogue.globalMessages.itemCannotBeGivenAsIsNpc[language]; //npc
    } else if (inventoryItem && !canGive) {
        dialogueString = dialogueData.dialogue.globalMessages.itemCannotBeGiven[language]; //inventory objects that cannot be given
    } else if (!inventoryItem) {
        dialogueString = dialogueData.dialogue.globalMessages.itemNotInPossessionToGive[language]; //all objects in environemnt whether pickable or not
    } else {
        return true; // inventory items that can be given
    }
    
    showText(dialogueString, getColorTextPlayer()); 
    return false;
}

export async function handleTo(objectId1, objectId2, exitOrNot2, inventoryItem2, quantity, isObject2TrueNpcFalse, realVerbUsed) {
    //quantity at a later date if needed
    console.log("handle to");
    const language = getLanguage();
    const objectData = getObjectData();
    const object1 = objectData.objects[objectId1];
    const dialogueData = getDialogueData().dialogue;
    
    const giveTo2 = checkIfItemCanBeGivenToSecondItemAndReturnSlot(objectId1, objectId2, isObject2TrueNpcFalse, exitOrNot2);

    if (!giveTo2) { //if wrong npc or invalid Give To object then this is already handled and we can return
        return;
    }

    const npcData = getNpcData().npcs[objectId2];
    const giveScenarioId = npcData.interactable.receiveObjectScenarioId;
    const objectEvent = getObjectEvents(objectId1);

    //here we definitely have a valid combination (handle dialogue in event)
    executeInteractionEvent(objectEvent, "", realVerbUsed, objectId1);
}

function checkIfItemCanBeGivenToSecondItemAndReturnSlot(objectId1, objectId2, isObject2TrueNpcFalse, exitOrNot2) {
    let dialogueData = getDialogueData();
    let language = getLanguage();
    let dialogueString;

    if (!isObject2TrueNpcFalse) { //is npc
        const npcSlotForObject = extractNumberFromTheObjectsNpcGiveToValue(objectId1); //which slot does it belong in on npc?
        const npcForObject = extractNpcFromTheObjectsNpcGiveToValue(objectId1); //which npc is it given to
        if (objectId2 === npcForObject) { //correct npc
            return { "npc": npcForObject, "slot": npcSlotForObject };
        } else { //wrong npc
            dialogueString = dialogueData.dialogue.globalMessages.itemCannotBeGivenToThisNpc[language];
        }
    } else {
        if (exitOrNot2) {  //exits
            dialogueString = dialogueData.dialogue.globalMessages.itemCannotGiveExitorBeGivenToExit[language];
        } else if (isObject2TrueNpcFalse) { //any pickable or non pickable environment object, or any inventory object
            dialogueString = dialogueData.dialogue.globalMessages.itemCannotBeGivenToObject[language];
        }
    }
    showText(dialogueString, getColorTextPlayer());
        return false;
}

function extractNumberFromTheObjectsNpcGiveToValue(objectId) {
    const npcGiveToValue = getObjectData().objects[objectId].usedOn.npcGiveTo;
    const match = npcGiveToValue.match(/(\d+)$/);
    return match ? match[1] : null;
}

function extractNpcFromTheObjectsNpcGiveToValue(objectId) {
    const npc = getObjectData().objects[objectId].usedOn.npcGiveTo;
    const result = npc.replace(/\d+$/, '');
    return result;
}

export function constructCommand(userCommand, canHover) {
    const objectData = getObjectData().objects;
    const npcData = getNpcData().npcs;
    const language = getLanguage();
    const localization = getLocalization()[language]['verbsActionsInteraction'];
    const navigationData = getNavigationData();
    
    const waitingForSecondItem = getWaitingForSecondItem();
    
    let objectMatch1 = null;
    let objectMatch2 = null;
    let isObject1TrueNpcFalse = true;
    let isObject2TrueNpcFalse = true;
    let objectName = '';
    let verbPart = '';
    let exitOrNot1 = false;
    let exitOrNot2 = false;
    let quantity = 1;

    if (!canHover) {
        userCommand = localize('interactionWalkTo', getLanguage(), 'verbsActionsInteraction');

        let verbKey = 'verbWalkTo';

        return {
            objectId1: objectMatch1,
            objectId2: objectMatch2,
            isObjectTrueNpcFalse: isObject2TrueNpcFalse,
            verbKey: verbKey,
            exitOrNot1: "",
            exitOrNot2: exitOrNot2,
            quantity: quantity
        }
    }

    let commandParts = userCommand.split(' ');

    // Handle the case where we are waiting for the second item
    if (waitingForSecondItem) {
        // Extract the first object from getObjectToBeUsedWithSecondItem()
        const item1 = objectData[getObjectToBeUsedWithSecondItem()].name[language];
        // Extract the second object from getSecondItemAlreadyHovered()
        const item2 = getSecondItemAlreadyHovered();

        // Find the object IDs for object1 and object2 in the objectData
        for (const objectId in objectData) {
            if (objectData[objectId].name[language] === item1) {
                objectMatch1 = objectId;
            }
            if (objectData[objectId].name[language] === item2) {
                objectMatch2 = objectId;
            }
        }

        // The verb should be the first word in the commandParts array
        verbPart = commandParts[0];

        // Check if verbPart matches any in localization
        let verbKey = null;
        for (const key in localization) {
            if (localization[key] === verbPart) {
                verbKey = key;
                break;
            }
        }

        if (!verbKey) {
            console.warn('No verb match found for the command:', verbPart);
            return null;
        }

        if (!objectMatch2) { //check for npc only match2 as cant use npc with something
            for (const npcId in npcData) {
                if (npcData[npcId].name[language] === item2) {
                    objectMatch2 = npcId;
                    isObject2TrueNpcFalse = false;
                }
            }
        }

        // Now check if object2 (second item) is an exit (room) if not object or npc
        if (!objectMatch2) {
            for (const roomId in navigationData) {
                const roomName = navigationData[roomId][language];

                for (let i = commandParts.length - 1; i >= 0; i--) {
                    const roomCommandName = commandParts.slice(i).join(' ');
                    if (roomCommandName === roomName) {
                        objectMatch2 = roomId;
                        exitOrNot2 = true;
                        break;
                    }
                }
                if (objectMatch2) {
                    break;
                }
            }
        }

        return {
            objectId1: objectMatch1,  // First object ID (from getObjectToBeUsedWithSecondItem())
            objectId2: objectMatch2,  // Second object ID (from getSecondItemAlreadyHovered() or a room)
            isObjectTrueNpcFalse: isObject2TrueNpcFalse, //Return if the object is an NPC
            verbKey: verbKey,         // The verb/action
            exitOrNot1: "",           // No exit for the first item when waiting for the second item
            exitOrNot2: exitOrNot2,   // Exit status for the second item
            quantity: quantity        // Keep the current quantity logic
        };

    } else {
        // Handle the case where we're NOT waiting for a second item
        for (let i = commandParts.length - 1; i >= 0; i--) {
            objectName = commandParts.slice(i).join(' ');

            const firstWord = objectName.split(' ')[0];

            if (!isNaN(firstWord)) {
                quantity = parseInt(firstWord);
            }

            for (const objectId in objectData) {
                if (objectData[objectId].name[language] === objectName) {
                    objectMatch1 = objectId;
                    verbPart = commandParts.slice(0, i).join(' ');
                    isObject1TrueNpcFalse = true;
                    break;
                }
            }

            if (objectMatch1) {
                exitOrNot1 = false;
                break;
            }
        }

        if (!objectMatch1) {
            for (const npcId in npcData) {
                const npcName = npcData[npcId].name[language];

                for (let i = commandParts.length - 1; i >= 0; i--) {
                    const npcCommandName = commandParts.slice(i).join(' ');
                    if (npcCommandName === npcName) {
                        objectMatch1 = npcId;
                        verbPart = commandParts.slice(0, i).join(' ');
                        isObject1TrueNpcFalse = false;
                        break;
                    }
                }
                if (objectMatch1) {
                    break;
                }
            }
        }

        if (!objectMatch1) {
            for (const roomId in navigationData) {
                const roomName = navigationData[roomId][language];

                for (let i = commandParts.length - 1; i >= 0; i--) {
                    const roomCommandName = commandParts.slice(i).join(' ');
                    if (roomCommandName === roomName) {
                        objectMatch1 = roomId;
                        verbPart = commandParts.slice(0, i).join(' ');
                        exitOrNot1 = true;
                        break;
                    }
                }
                if (objectMatch1) {
                    break;
                }
            }
        }

        if (!objectMatch1) {
            console.warn('No object or room match found for the command:', userCommand);
            return null;
        }

        let verbKey = null;
        for (const key in localization) {
            if (localization[key] === verbPart) {
                verbKey = key;
                break;
            }
        }

        if (!verbKey) {
            console.warn('No verb match found for the command:', verbPart);
            return null;
        }

        return {
            objectId1: objectMatch1,  // Object or room ID from current logic
            objectId2: null,          // No second object when getWaitingForSecondItem() is false
            isObjectTrueNpcFalse: isObject1TrueNpcFalse,  //Return if the object is an NPC
            verbKey: verbKey,         // The verb/action
            exitOrNot1: exitOrNot1,   // Exit status for the first object
            exitOrNot2: "",           // No second exit when getWaitingForSecondItem() is false
            quantity: quantity        // Quantity remains unchanged
        };
    }
}

export function setDialogueData(path, dialogueSetToReplace, dialogueSetNewSource) {
    const dialogueData = getDialogueData();
    const swappedDialogueChanges = getSwappedDialogueObject() || {};

    const keys = path.match(/([^[\].]+|\[\d+\])/g);
    
    if (!keys) {
        console.warn("Invalid path format.");
        return;
    }

    let current = dialogueData.dialogue;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i].replace(/\[|\]/g, '');
        if (!current[key]) {
            console.warn(`Invalid path: ${key} does not exist in the dialogue.`);
            return;
        }
        current = current[key];
    }

    if (current[dialogueSetNewSource]) {
        if (!swappedDialogueChanges[dialogueSetToReplace]) {
            swappedDialogueChanges[dialogueSetToReplace] = current[dialogueSetToReplace];
        }

        current[dialogueSetToReplace] = { ...current[dialogueSetNewSource] };
        current[dialogueSetNewSource] = { ...swappedDialogueChanges[dialogueSetToReplace] };

        const globalKey = `${path}[${dialogueSetToReplace}]`;
        swappedDialogueChanges[globalKey] = dialogueSetNewSource;

        delete swappedDialogueChanges[dialogueSetToReplace];
    } else {
        console.warn(`Source dialogue ${dialogueSetNewSource} does not exist at path: ${path}`);
    }

    setDialoguesData(dialogueData);
    setSwappedDialogueObject(swappedDialogueChanges);
}

export function setObjectData(objectId, path, newValue) {
    const objectData = getObjectData();

    const keys = path.match(/([^[\].]+|\[\d+\])/g);
    
    if (!keys) {
        console.warn("Invalid path format.");
        return;
    }

    let current = objectData.objects[objectId];
    for (let i = 0; i < keys.length - 1; i++) {
        let key = keys[i].replace(/\[|\]/g, '');
        if (!current[key]) {
            console.warn(`Invalid path: ${key} does not exist in the object.`);
            return;
        }
        current = current[key];
    }

    const finalKey = keys[keys.length - 1].replace(/\[|\]/g, '');
    if (current.hasOwnProperty(finalKey)) {
        current[finalKey] = newValue;
        console.log(`Updated ${path} to`, newValue);
    } else {
        console.warn(`Invalid path: ${finalKey} does not exist in the object.`);
    }

    if (path.includes('gridPosition.x')) {
        objectData.objects[objectId].visualPosition.x = newValue * getCanvasCellWidth();
    }
    if (path.includes('gridPosition.y')) {
        objectData.objects[objectId].visualPosition.y = newValue * getCanvasCellHeight();
    }

    setObjectsData(objectData);
}

export function setNpcData(npcId, path, newValue) {
    const npcData = getNpcData();

    const keys = path.match(/([^[\].]+|\[\d+\])/g);
    
    if (!keys) {
        console.warn("Invalid path format.");
        return;
    }

    let current = npcData.npcs[npcId];
    for (let i = 0; i < keys.length - 1; i++) {
        let key = keys[i].replace(/\[|\]/g, '');
        if (!current[key]) {
            console.warn(`Invalid path: ${key} does not exist in the object.`);
            return;
        }
        current = current[key];
    }

    const finalKey = keys[keys.length - 1].replace(/\[|\]/g, '');
    if (current.hasOwnProperty(finalKey)) {
        current[finalKey] = newValue;
        console.log(`Updated ${path} to`, newValue);
    } else {
        console.warn(`Invalid path: ${finalKey} does not exist in the object.`);
    }

    if (path.includes('gridPosition.x')) {
        npcData.npcs[npcId].visualPosition.x = newValue * getCanvasCellWidth();
    }
    if (path.includes('gridPosition.y')) {
        npcData.npcs[npcId].visualPosition.y = newValue * getCanvasCellHeight();
    }

    setNpcsData(npcData);

}

function getObjectEvents(objectId) {
    const objectData = getObjectData();
    const object = objectData.objects[objectId];
    const usedOn = object.usedOn;
    let result = {};

    for (let key in usedOn) {
        if (usedOn.hasOwnProperty(key)) {
            result[key] = usedOn[key];
        }
    }

    return result;
}

export function setScreenJSONData(screenId, path, newValue) {
    const navigationData = getNavigationData(); // Fetch the current screen data

    // Split the path into its components (similar to other functions)
    const keys = path.match(/([^[\].]+|\[\d+\])/g);
    
    if (!keys) {
        console.warn("Invalid path format.");
        return;
    }

    // Get the specific screen object based on screenId
    let current = navigationData[screenId];
    
    if (!current) {
        console.warn(`Screen ID ${screenId} does not exist in the navigation data.`);
        return;
    }

    // Traverse through the object until we reach the last key
    for (let i = 0; i < keys.length - 1; i++) {
        let key = keys[i].replace(/\[|\]/g, '');
        if (!current[key]) {
            console.warn(`Invalid path: ${key} does not exist in the screen data.`);
            return;
        }
        current = current[key];
    }

    // Get the final key to update the value
    const finalKey = keys[keys.length - 1].replace(/\[|\]/g, '');
    
    if (current.hasOwnProperty(finalKey)) {
        current[finalKey] = newValue;
        console.log(`Updated ${path} for screen ${screenId} to`, newValue);
    } else {
        console.warn(`Invalid path: ${finalKey} does not exist in the screen data.`);
    }

    // Set the modified navigation data back
    setNavigationData(navigationData);
}

