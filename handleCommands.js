import { setObjectsData, setVerbButtonConstructionStatus, getNavigationData, getCurrentScreenId, getDialogueData, getLanguage, getObjectData, getPlayerInventory, setCurrentStartIndexInventory, getGridData, getOriginalValueInCellWhereObjectPlaced, setPlayerInventory, getLocalization, getCurrentStartIndexInventory } from "./constantsAndGlobalVars.js";
import { localize } from "./localization.js";
import { drawInventory, showText, updateInteractionInfo } from "./ui.js";

export function performCommand(command, inventoryItem) {
    console.log(command);
    if (command !== null) {
        const verbKey = command.verbKey;
        const subjectToApplyCommand = command.objectId;
        const exitOrNot = command.exitOrNot;
        const quantity = command.quantity;

        switch (verbKey) {
            case 'verbLookAt':
                handleLookAt(verbKey, subjectToApplyCommand, exitOrNot);
                break;
            case 'verbPickUp':
                handlePickUp(verbKey, subjectToApplyCommand, exitOrNot);
                break;
            case 'verbUse':
                handleUse(verbKey, subjectToApplyCommand, exitOrNot, inventoryItem, quantity);
                break;
            case 'verbOpen':
                handleOpen(verbKey, subjectToApplyCommand, exitOrNot);
                break;
            case 'verbClose':
                handleClose(verbKey, subjectToApplyCommand, exitOrNot);
                break;
            case 'verbPush':
                handlePush(verbKey, subjectToApplyCommand, exitOrNot);
                break;
            case 'verbPull':
                handlePull(verbKey, subjectToApplyCommand, exitOrNot);
                break;
            case 'verbTalkTo':
                handleTalkTo(verbKey, subjectToApplyCommand, exitOrNot);
                break;
            case 'verbGive':
                handleGive(verbKey, subjectToApplyCommand, exitOrNot);
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

// Handle "Use" action
export function handleUse(verb, objectId, exitOrNot, inventoryItem, quantity = 1) {
    const objectData = getObjectData();
    const dialogueData = getDialogueData();
    const language = getLanguage();
    const object = objectData.objects[objectId];
    const inventory = getPlayerInventory();

    const use = checkIfItemCanBeUsed(objectId);  
    const useWith = checkIfItemCanBeUsedWith(objectId);
    
    if (!use || exitOrNot) { // cant use an exit although you might be able to use the door that blocks it if it isnt locked
        handleCannotUseMessage(language, dialogueData);
        return;
    }

    if (inventoryItem) { //inventory items are ALWAYS Use With and never Use although some will only be second objects ie the object you use something else with in which case it will return a message saying this has to be used with something else by being activeStatus = false
        handleInventoryAdjustment(objectId, quantity);
        drawInventory(getCurrentStartIndexInventory());
        setVerbButtonConstructionStatus(null);
        updateInteractionInfo(localize('interactionLookAt', getLanguage(), 'verbsActionsInteraction'), false);
    }

    if (useWith) {
        handleWith(objectId); // call handleWith() to handle objects that are used with something or someone
    } else {
        useItem(objectId, null, false); //trigger checks and events for environment items that can have just Use like unlocked doors, machines etc, we pass in true or false depending if use or useWith, in this case always false
    }
}

export function handleWith(verb, objectId, exitOrNot, inventoryItem, quantity = 1) {
    const objectData = getObjectData();
    const dialogueData = getDialogueData();
    const language = getLanguage();
    const object = objectData.objects[objectId];
    const inventory = getPlayerInventory();

    //get second item from user probably async call, ie call funtions to return to use item while waiting - investigate
    //check if second item is inventory item or not
    //if so check location is correct for using item (if important) and if item can be used with first item
    //adjust inventory for both items
    //if reach this point trigger useItem(objectId, secondObjectId, true)

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
            objectEvent = getObjectEvents(objectId1);
            executeObjectEvent(objectEvent); //READY FOR TESTING!!!!!!!!!
            dialogue = dialogueData.dialogue.objectInteractions.verbUse[objectId1].use.canUse[getLanguage()];
        } else if (object1.interactable.alreadyUsed) {
            dialogue = dialogueData.dialogue.objectInteractions.verbUse[objectId1].use.alreadyUsed[getLanguage()];
        } else {
            dialogue = dialogueData.dialogue.objectInteractions.verbUse[objectId1].use.cantUseYet[getLanguage()];
        }
        showText(dialogue);
    }
}

function checkIfItemCanBeUsed(objectId) {
    const objectData = getObjectData().objects[objectId];
    
    if (objectData && objectData.interactable) {
        return objectData.interactable.canUse;
    } else {
        console.warn(`Object with ID ${objectId} does not exist.`);
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

function handleCannotUseMessage(language, dialogueData) {
    const cannotUseMessage = dialogueData.dialogue.globalMessages.itemCannotBeUsed?.[language];
    if (cannotUseMessage) {
        showText(cannotUseMessage);
        console.log(cannotUseMessage);
    } else {
        console.warn(`No global message found for itemCannotBePickedUp in language ${language}`);
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

    let commandParts = userCommand.split(' ');
    let objectMatch = null;
    let objectName = '';
    let verbPart = '';
    let exitOrNot = false;
    let quantity = 1;

    for (let i = commandParts.length - 1; i >= 0; i--) {
        objectName = commandParts.slice(i).join(' ');
    
        const firstWord = objectName.split(' ')[0];
    
        if (!isNaN(firstWord)) {
            quantity = parseInt(firstWord);
        }
    
        for (const objectId in objectData) {
            if (objectData[objectId].name[language] === objectName) {
                objectMatch = objectId;
                verbPart = commandParts.slice(0, i).join(' ');
                break;
            }
        }
        if (objectMatch) {
            exitOrNot = false;
            break;
        }
    }
    

    if (!objectMatch) {
        for (const roomId in navigationData) {
            const roomName = navigationData[roomId][language];

            for (let i = commandParts.length - 1; i >= 0; i--) {
                const roomCommandName = commandParts.slice(i).join(' ');
                if (roomCommandName === roomName) {
                    objectMatch = roomId;
                    verbPart = commandParts.slice(0, i).join(' ');
                    break;
                }
            }
            if (objectMatch) {
                exitOrNot = true;
                break;
            }
        }
    }

    if (!objectMatch) {
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
        objectId: objectMatch,
        verbKey: verbKey,
        exitOrNot: exitOrNot,
        quantity: quantity
    };
}

function setObjectData(objectId, path, newValue) {
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
    if (objectEvent.actionUse1 && typeof global[objectEvent.actionUse1] === 'function') {
        if (objectEvent.objectUse) {
            global[objectEvent.actionUse1](objectEvent.objectUse); // Call with objectUse as argument
        } else {
            global[objectEvent.actionUse1](); // Call without arguments
        }
    }

    // Check for actionUse2 and call its function if it exists
    if (objectEvent.actionUse2 && typeof global[objectEvent.actionUse2] === 'function') {
        if (objectEvent.objectUse) {
            global[objectEvent.actionUse2](objectEvent.objectUse); // Call with objectUse as argument
        } else {
            global[objectEvent.actionUse2](); // Call without arguments
        }
    }

    // Check for actionUseWith11 and call it if it exists
    if (objectEvent.actionUseWith11 && typeof global[objectEvent.actionUseWith11] === 'function') {
        if (objectEvent.objectUseWith1) {
            global[objectEvent.actionUseWith11](objectEvent.objectUseWith1); // Call with objectUseWith1 as argument
        } else {
            global[objectEvent.actionUseWith11](); // Call without arguments
        }
    }

    // Check for actionUseWith12 and call it if it exists
    if (objectEvent.actionUseWith12 && typeof global[objectEvent.actionUseWith12] === 'function') {
        if (objectEvent.objectUseWith1) {
            global[objectEvent.actionUseWith12](objectEvent.objectUseWith1); // Call with objectUseWith1 as argument
        } else {
            global[objectEvent.actionUseWith12](); // Call without arguments
        }
    }
}




