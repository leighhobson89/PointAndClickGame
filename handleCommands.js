import { getWaitingForSecondItem, getSecondItemAlreadyHovered, getObjectToBeUsedWithSecondItem, setWaitingForSecondItem, setObjectToBeUsedWithSecondItem, setObjectsData, setVerbButtonConstructionStatus, getNavigationData, getCurrentScreenId, getDialogueData, getLanguage, getObjectData, getPlayerInventory, setCurrentStartIndexInventory, getGridData, getOriginalValueInCellWhereObjectPlaced, setPlayerInventory, getLocalization, getCurrentStartIndexInventory, getElements } from "./constantsAndGlobalVars.js";
import { localize } from "./localization.js";
import { drawInventory, resetSecondItemState, showText, updateInteractionInfo } from "./ui.js";
import { machineDEBUGActivate } from "./events.js"

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
    const originalValues = getOriginalValueInCellWhereObjectPlaced();

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

export function handleWith(objectId1, objectId2, exitOrNot2, inventoryItem, quantity) {
    const objectData = getObjectData();
    const dialogueData = getDialogueData();
    const language = getLanguage();
    const object1 = objectData.objects[objectId1];
    const useTogetherLocation1 = object1.usedOn.useTogetherLocation;
    let useTogetherLocation2;
    
    if (objectId2 !== null) {
        const object2 = objectData.objects[objectId2];
        if (!exitOrNot2) {
            useTogetherLocation2 = object2.usedOn.useTogetherLocation;
        }
    } else {
        return;
    }


    let locationCorrect = false;
    let locationImportant = false;

    if (inventoryItem) { //check if second item is inventory item or not we know first one is for certain
        console.log("second object IS inventory Item");
    } else {
        console.log("second object is not inventory Item");
    }

    if (exitOrNot2) {
        console.log("second object is actually an exit");
    } else {
        console.log("second object is not an exit");
    }

    if (useTogetherLocation1 && useTogetherLocation2) { //using two inventory items together, need to have manually entered same useTogetherLocation in JSON.
        locationImportant = true;
        if (useTogetherLocation1 === useTogetherLocation2) {
            if (getCurrentScreenId() === useTogetherLocation1 && getCurrentScreenId() === useTogetherLocation2) {
                locationCorrect = true;
            }
        } else {
            // dialogue items cannot be useds together
            console.log("Both objects have a use together location but it doesn't match, cant be used together and check JSON!");
            return;
        }
    }

    if (locationImportant && !locationCorrect) {
        //dialogue not in right location to use items
        return;
    }


    //check here if an inventory item can b used with an environemnt item because at moment always gets used

    handleInventoryAdjustment(objectId1, quantity);
    if (!exitOrNot2) {
        handleInventoryAdjustment(objectId2, quantity);
    }
    drawInventory(0);

    console.log("finally using item");

    useItem(objectId1, objectId2, true);
}

export function useItem(objectId1, objectId2, useWith) { //function uses all items, use or use with
    const objectData = getObjectData();
    const dialogueData = getDialogueData();
    const language = getLanguage();
    const object1 = objectData.objects[objectId1];
    const object2 = objectData.objects[objectId2];
    const inventory = getPlayerInventory();

    if (!useWith && !objectId2) { //if a non inventory item the user has clicked to use in the room
        let dialogue;

        if (object1.interactable.activeStatus && !object1.interactable.alreadyUsed) {
            const objectEvent = getObjectEvents(objectId1);
            executeObjectEvent(objectEvent);
            dialogue = dialogueData.dialogue.objectInteractions.verbUse[objectId1].use.canUse[language];
        } else if (object1.interactable.alreadyUsed) {
            dialogue = dialogueData.dialogue.objectInteractions.verbUse[objectId1].use.alreadyUsed[language];
        } else {
            dialogue = dialogueData.dialogue.objectInteractions.verbUse[objectId1].use.cantUseYet[language];
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

    if (!object) {
        console.warn(`Object ${objectId} not found.`);
        return null;
    }

    const usedOn = object.usedOn;

    if (!usedOn) {
        console.warn(`'usedOn' property not found for object ${objectId}.`);
        return null;
    }

    let result = {};

    for (let key in usedOn) {
        if (usedOn.hasOwnProperty(key)) {
            result[key] = usedOn[key];
        }
    }

    return result;
}

function executeObjectEvent(objectEvent) {
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






