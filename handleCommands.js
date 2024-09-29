import { getWaitingForSecondItem, getSecondItemAlreadyHovered, getObjectToBeUsedWithSecondItem, setWaitingForSecondItem, setObjectToBeUsedWithSecondItem, setObjectsData, setVerbButtonConstructionStatus, getNavigationData, getCurrentScreenId, getDialogueData, getLanguage, getObjectData, getPlayerInventory, setCurrentStartIndexInventory, getGridData, getOriginalValueInCellWhereObjectOrNpcPlaced, setPlayerInventory, getLocalization, getCurrentStartIndexInventory, getElements } from "./constantsAndGlobalVars.js";
import { localize } from "./localization.js";
import { drawInventory, resetSecondItemState, showText, updateInteractionInfo } from "./ui.js";
import { executeObjectEvent } from "./events.js"

export function performCommand(command, inventoryItem) {
    console.log(command);
    if (command !== null) {
        const verbKey = command.verbKey;
        const objectId1 = command.objectId1;
        const objectId2 = command.objectId2;
        const exitOrNot1 = command.exitOrNot1;
        const exitOrNot2 = command.exitOrNot2;
        const quantity = command.quantity;

        switch (verbKey) {
            case 'verbLookAt':
                handleLookAt(verbKey, objectId1, exitOrNot1);
                break;
            case 'verbPickUp':
                handlePickUp(verbKey, objectId1, exitOrNot1);
                break;
            case 'verbUse':
                handleUse(objectId1, objectId2, exitOrNot1, exitOrNot2, inventoryItem, quantity);
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
                handleTalkTo(verbKey, objectId1, exitOrNot1);
                break;
            case 'verbGive':
                handleGive(objectId1, objectId2, exitOrNot1, exitOrNot2, inventoryItem, quantity);
                break;
            default:
                console.warn(`Unhandled verbKey: ${verbKey}`);
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

export function handleLookAt(verb, objectId, exitOrNot) {
    const dialogueData = getDialogueData();
    const language = getLanguage();

    if (!exitOrNot) {
        const dialogueString = dialogueData.dialogue.objectInteractions[verb]?.[objectId]?.[language];

        if (dialogueString) {
            showText(dialogueString);
            console.log(dialogueString);
        } else {
            console.warn(`No dialogue found for ${verb} and object ${objectId} in language ${language}`);
        }
    } else {
        const connectsTo = getNavigationData()[getCurrentScreenId()].exits[findExitToRoom(objectId)].connectsTo;
        const openOrLocked = getNavigationData()[getCurrentScreenId()].exits[findExitToRoom(objectId)].status;
        const dialogueString = dialogueData.dialogue.objectInteractions[verb]?.exits[connectsTo][openOrLocked][language];

        if (dialogueString) {
            showText(dialogueString);
            console.log(dialogueString);
        } else {
            console.warn(`No dialogue found for ${verb} and object ${objectId} in language ${language}`);
        }
    }
}

export function handlePickUp(verb, objectId, exitOrNot) {
    const objectData = getObjectData();
    const dialogueData = getDialogueData();
    const language = getLanguage();
    const object = objectData.objects[objectId];

    if (!exitOrNot && !object) {
        console.warn(`Object ${objectId} not found.`);
        return;
    }

    if (!exitOrNot) {
        const quantity = object.interactable.quantity;
        if (object?.interactable?.canPickUp) {
            const dialogueString = dialogueData.dialogue.objectInteractions[verb]?.[objectId]?.[language];
            if (dialogueString) {
                showText(dialogueString);
                console.log(dialogueString);
            } else {
                console.warn(`No dialogue found for ${verb} and object ${objectId} in language ${language}`);
            }
            pickUpItem(objectId, quantity);
        } else {
            handleCannotPickUpMessage(language, dialogueData);
        }
        return;
    }

    handleCannotPickUpMessage(language, dialogueData);
}

function pickUpItem(objectId, quantity) {
    removeObjectFromEnvironment(objectId); //DEBUG: comment out to stop object disappearing when picked up
    addItemToInventory(objectId, quantity);
    console.log(getPlayerInventory());
    setCurrentStartIndexInventory(0);
    drawInventory(0);
    triggerEvent(objectId, "verbPickUp");
}

function removeObjectFromEnvironment(objectId) {
    const gridData = getGridData().gridData;
    const roomId = getCurrentScreenId();
    const originalValues = getOriginalValueInCellWhereObjectOrNpcPlaced();

    if (originalValues.hasOwnProperty(roomId)) {
        for (const [position, data] of Object.entries(originalValues[roomId])) {
            if (data.objectId === objectId) {
                const [y, x] = position.split(',').map(Number);

                if (y >= 0 && y < gridData.length && x >= 0 && x < gridData[y].length) {
                    gridData[x][y] = data.originalValue;
                } else {
                    console.error(`Position out of bounds: (${x}, ${y})`);
                }
            }
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

function handleInventoryAdjustment(objectId, quantity) {
    const inventory = getPlayerInventory();
    const objectData = getObjectData().objects[objectId];

    if (objectData.interactable && objectData.interactable.decrementQuantityOnUse) {
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


function triggerEvent(objectId, verb) {
    switch (verb) {

    }
    // Logic to check for and trigger any associated events
}

function handleCannotPickUpMessage(language, dialogueData) {
    const cannotPickUpMessage = dialogueData.dialogue.globalMessages.itemCannotBePickedUp?.[language];
    if (cannotPickUpMessage) {
        showText(cannotPickUpMessage);
        console.log(cannotPickUpMessage);
    } else {
        console.warn(`No global message found for itemCannotBePickedUp in language ${language}`);
    }
}

// BREAKS IF USER MOVES MOUSE OFF OBJECT WHILE MOVING TOWARDS OBJECT TWO
export function handleUse(objectId1, objectId2, exitOrNot1, exitOrNot2, inventoryItem, quantity = 1) {
    const dialogueData = getDialogueData();
    const language = getLanguage();
    const useWith = checkIfItemCanBeUsedWith(objectId1);
    
    if ((!inventoryItem && useWith && !getWaitingForSecondItem())) {
        handleCannotUsedUntilPickedUpMessage(language, dialogueData);
        return;
    }

    if (exitOrNot1 && !getWaitingForSecondItem()) { // cant use an exit although you might be able to use the door that blocks it if it isnt locked
        handleCannotUseExitMessage(language, dialogueData);
        return;
    }

    if (!inventoryItem && !getWaitingForSecondItem()) { 
        useItem(objectId1, null, false); //at this line we're always talking about object1 and no useWith scenario ie inventory item is always false by this point
    } else if (!getWaitingForSecondItem()) {
        setWaitingForSecondItem(true);
        setObjectToBeUsedWithSecondItem(objectId1);
        const interactiveInfoWith = getElements().interactionInfo.textContent + " " + localize('interactionWith', language, 'verbsActionsInteraction');
        updateInteractionInfo(interactiveInfoWith, false);
    } else {
        console.log("handling With use");
        handleWith(objectId1, objectId2, exitOrNot2, inventoryItem, quantity); //inventoryItem always refers to object2 by this point
        setVerbButtonConstructionStatus(null);
        resetSecondItemState();
        updateInteractionInfo(localize('interactionLookAt', getLanguage(), 'verbsActionsInteraction'), false);
    }
}

export function handleWith(objectId1, objectId2, exitOrNot2, inventoryItem2, quantity) {
    const language = getLanguage();
    const objectData = getObjectData();
    const object1 = objectData.objects[objectId1];
    const dialogueData = getDialogueData().dialogue.globalMessages;
    const useTogetherLocation1 = object1.usedOn.useTogetherLocation;
    let object2;
    let useTogetherLocation2;
    let dialogueString;
    
    if (objectId2 !== null) {
        object2 = objectData.objects[objectId2];
        if (!exitOrNot2) {
            useTogetherLocation2 = object2.usedOn.useTogetherLocation;
        }
    } else {
        return;
    }

    let locationCorrect;
    let locationImportant;

    if (useTogetherLocation1 && useTogetherLocation2) { //using two inventory items together, need to have manually entered same useTogetherLocation in JSON.
        locationImportant = true;
        if (useTogetherLocation1 === useTogetherLocation2) {
            if (getCurrentScreenId() === useTogetherLocation1 && getCurrentScreenId() === useTogetherLocation2) {
                locationCorrect = true;
            } else {
                console.log("1: not right location to use these items together (2 inventory) - PASSED");
                dialogueString = dialogueData.correctItemsWrongLocation[language];
                showText(dialogueString);
                return;
            }
        } else if (useTogetherLocation1 === objectId2 && useTogetherLocation2 === objectId1 ) { //in json if location not important but items can be used togther use the other objectId in useTogetherLocation
            console.log("2: irrelevant location, can use these items together (2 inventory) - PASSED");
            handleInventoryAdjustment(objectId1, quantity);
            handleInventoryAdjustment(objectId2, quantity);
            drawInventory(0);
            useItem (objectId1, objectId2, true, exitOrNot2, inventoryItem2);
            return;
        } else {
            dialogueString = dialogueData.problemInLogic[language];
            console.log("3: Both objects have a use together location but it doesn't match, and they arent the other object cant be used together and check JSON! (2 inventory) - PASSED");
            showText(dialogueString);
            return;
        }
    }

    if (!inventoryItem2 && !exitOrNot2) { //second object not inventory but is environment object
        if (object1.usedOn.objectUseWith1 === objectId2) {
            console.log("4: using object with environment object - PASSED");
            handleInventoryAdjustment(objectId1, quantity);
            drawInventory(0);
            useItem (objectId1, objectId2, true, exitOrNot2, inventoryItem2);
            return;
        } else {
            dialogueString = dialogueData.cantBeUsedTogether[language];
            showText(dialogueString);
            console.log("5: items cannot be used together (envionment object) - PASSED");
            return;
        }
    }

    if (exitOrNot2) { //some items can be used on exits so if the object use with is the screenId of where the exit leads and the usetogether location is the current screen the user is on then allow useItem
        if (object1.usedOn.objectUseWith1 === objectId2 && useTogetherLocation1 === getCurrentScreenId()) {
            console.log("6: using object on exit - PASSED");
            handleInventoryAdjustment(objectId1, quantity);
            drawInventory(0);
            useItem (objectId1, objectId2, true, exitOrNot2, inventoryItem2);
            return;
        } else {
            dialogueString = dialogueData.howWouldThatWorkWithThis[language];
            showText(dialogueString);
            console.log("7: wrong object for exit - PASSED");
            return;
        }
    }

    if (object1.usedOn.objectUseWith1 === objectId2 && object2.usedOn.objectUseWith1 === objectId1) {
        console.log("8: using two inventory items where location is important and location is correct - PASSED");
        handleInventoryAdjustment(objectId1, quantity);
        drawInventory(0);
        useItem(objectId1, objectId2, true, exitOrNot2, inventoryItem2);
        return;
    } else {
        dialogueString = dialogueData.cantBeUsedTogether[language];
        showText(dialogueString);
        console.log("9: items just cant be used together at all - PASSED");
        return;
    }
}

export function useItem(objectId1, objectId2, useWith, exitOrNot2, inventoryItem2) { //function uses all items, use or use with
    const objectData = getObjectData();
    const dialogueData = getDialogueData();
    const language = getLanguage();
    const object1 = objectData.objects[objectId1];
    const object2 = objectData.objects[objectId2];

    const objectEvent1 = getObjectEvents(objectId1);

    let dialogue;

    if (!useWith && !objectId2) { //Use item in room
        if (object1.interactable.activeStatus && !object1.interactable.alreadyUsed) {
            executeObjectEvent(objectEvent1);
            dialogue = dialogueData.dialogue.objectInteractions.verbUse[objectId1].use.canUse[language];
        } else if (object1.interactable.alreadyUsed) {
            dialogue = dialogueData.dialogue.objectInteractions.verbUse[objectId1].use.alreadyUsed[language];
        } else {
            dialogue = dialogueData.dialogue.objectInteractions.verbUse[objectId1].use.cantUseYet[language];
        }
        showText(dialogue);
    } else { //useWith
        if (!exitOrNot2) {
            const objectEvent2 = getObjectEvents(objectId2); //in case in future we need to call events on object2

            if ((object1.interactable.activeStatus && object2.interactable.activeStatus) || !inventoryItem2) {
                if (object1.usedOn.actionUseWith11) {
                    executeObjectEvent(objectEvent1);
                    dialogue = dialogueData.dialogue.objectInteractions.verbUse.useWithObject1[objectId1][language];
                } else {
                    dialogue = dialogueData.dialogue.globalMessages.tryOtherWayAround[language];
                }
            } else if (!object1.interactable.alreadyUsed) {
                dialogue = dialogueData.dialogue.globalMessages.activeStatusNotSet[language];
            } else {
                dialogue = dialogueData.dialogue.globalMessages.alreadyUsedButRetained[language];
            }
        } else { //second object is an exit so we dont need to check object2 events, and possibly never will in any situation but in case...
            if (object1.interactable.activeStatus) {
                executeObjectEvent(objectEvent1);
                dialogue = dialogueData.dialogue.objectInteractions.verbUse.useWithObject1[objectId1][language];
            } else if (!object1.interactable.alreadyUsed) {
                dialogue = dialogueData.dialogue.globalMessages.activeStatusNotSet[language];
            } else {
                dialogue = dialogueData.dialogue.globalMessages.alreadyUsedButRetained[language];
            }
        }
        showText(dialogue);
    }
}

function checkIfItemCanBeUsedWith(objectId) {
    const objectData = getObjectData().objects[objectId];
    
    if (objectData && objectData.interactable) {
        return objectData.interactable.canUseWith;
    } else {
        console.warn(`Object with ID ${objectId} does not exist.`);
    }
}

function handleCannotUseExitMessage(language, dialogueData) {
    const cannotUseExitMessage = dialogueData.dialogue.globalMessages.itemCannotBeUsedWithExit?.[language];
    if (cannotUseExitMessage) {
        showText(cannotUseExitMessage);
        console.log(cannotUseExitMessage);
    } else {
        console.warn(`No global message found for itemCannotBeUsedWithExit in language ${language}`);
    }
}

function handleCannotUsedUntilPickedUpMessage(language, dialogueData) {
    const cannotUseUntilPickedUpMessage = dialogueData.dialogue.globalMessages.itemCannotBeUsedUntilPickedUp?.[language];
    if (cannotUseUntilPickedUpMessage) {
        showText(cannotUseUntilPickedUpMessage);
        console.log(cannotUseUntilPickedUpMessage);
    } else {
        console.warn(`No global message found for itemCannotBeUsedUntilPickedUp in language ${language}`);
    }
}

// Handle "Open" action
export function handleOpen(verb, objectId) {
    console.log(`Opening object: ${objectId}`);
    // Add your implementation here
}
// Handle "Close" action

export function handleClose(verb, objectId) {
    console.log(`Closing object: ${objectId}`);
    // Add your implementation here
}
// Handle "Push" action

export function handlePush(verb, objectId) {
    console.log(`Pushing object: ${objectId}`);
    // Add your implementation here
}
// Handle "Pull" action

export function handlePull(verb, objectId) {
    console.log(`Pulling object: ${objectId}`);
    // Add your implementation here
}
// Handle "Talk To" action

export function handleTalkTo(verb, objectId) {
    console.log(`Talking to object: ${objectId}`);
    // Add your implementation here
}
// Handle "Give" action

export function handleGive(verb, objectId) {
    console.log(`Giving object: ${objectId}`);
    // Add your implementation here
}

export function parseCommand(userCommand) {
    const objectData = getObjectData().objects;
    const language = getLanguage();
    const localization = getLocalization()[language]['verbsActionsInteraction'];
    const navigationData = getNavigationData();
    
    const waitingForSecondItem = getWaitingForSecondItem();
    
    let commandParts = userCommand.split(' ');
    let objectMatch1 = null;
    let objectMatch2 = null;
    let objectName = '';
    let verbPart = '';
    let exitOrNot1 = false;
    let exitOrNot2 = false;
    let quantity = 1;

    // Handle the case where we are waiting for the second item
    if (waitingForSecondItem) {
        // Extract the first object from getObjectToBeUsedWithSecondItem()
        const object1 = objectData[getObjectToBeUsedWithSecondItem()].name[language];
        // Extract the second object from getSecondItemAlreadyHovered()
        const object2 = getSecondItemAlreadyHovered();

        // Find the object IDs for object1 and object2 in the objectData
        for (const objectId in objectData) {
            if (objectData[objectId].name[language] === object1) {
                objectMatch1 = objectId;
            }
            if (objectData[objectId].name[language] === object2) {
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

        // Now check if object2 (second item) is an exit (room)
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
            verbKey: verbKey,         // The verb/action
            exitOrNot1: "",           // No exit for the first item when waiting for the second item
            exitOrNot2: exitOrNot2,   // Exit status for the second item
            quantity: quantity        // Keep the current quantity logic
        };

    } else {
        // Handle the case where we're NOT waiting for a second item (existing logic)
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
                    break;
                }
            }
            if (objectMatch1) {
                exitOrNot1 = false;
                break;
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
            verbKey: verbKey,         // The verb/action
            exitOrNot1: exitOrNot1,   // Exit status for the first object
            exitOrNot2: "",           // No second exit when getWaitingForSecondItem() is false
            quantity: quantity        // Quantity remains unchanged
        };
    }
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

    setObjectsData(objectData);
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
