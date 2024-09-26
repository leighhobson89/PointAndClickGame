import { getNavigationData, getCurrentScreenId, getDialogueData, getLanguage, getObjectData, getPlayerInventory, setCurrentStartIndexInventory, getGridData, getOriginalValueInCellWhereObjectPlaced, setPlayerInventory, getLocalization } from "./constantsAndGlobalVars.js";
import { drawInventory } from "./ui.js";


export function performCommand(command) {
    console.log(command);
    if (command !== null) {
        const verbKey = command.verbKey;
        const subjectToApplyCommand = command.objectId;
        const exitOrNot = command.exitOrNot;

        switch (verbKey) {
            case 'verbLookAt':
                handleLookAt(verbKey, subjectToApplyCommand, exitOrNot);
                break;
            case 'verbPickUp':
                handlePickUp(verbKey, subjectToApplyCommand, exitOrNot);
                break;
            case 'verbUse':
                handleUse(verbKey, subjectToApplyCommand, exitOrNot);
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
            console.log(dialogueString);
        } else {
            console.warn(`No dialogue found for ${verb} and object ${objectId} in language ${language}`);
        }
    } else {
        const connectsTo = getNavigationData()[getCurrentScreenId()].exits[findExitToRoom(objectId)].connectsTo;
        const openOrLocked = getNavigationData()[getCurrentScreenId()].exits[findExitToRoom(objectId)].status;
        const dialogueString = dialogueData.dialogue.objectInteractions[verb]?.exits[connectsTo][openOrLocked][language];

        if (dialogueString) {
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
    const quantity = object.interactable.quantity;

    if (!exitOrNot && !object) {
        console.warn(`Object ${objectId} not found.`);
        return;
    }

    if (!exitOrNot) {
        if (object?.interactable?.canPickUp) {
            const dialogueString = dialogueData.dialogue.objectInteractions[verb]?.[objectId]?.[language];
            if (dialogueString) {
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
    removeObjectFromEnvironment(objectId);
    addItemToInventory(objectId, quantity);
    console.log(getPlayerInventory());
    setCurrentStartIndexInventory(0);
    drawInventory(0); //runs outside canvas so doesnt have to be updated every frame and we reset the position to the top if they pick up an item
    triggerEvent(objectId);
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
function addItemToInventory(objectId, quantity = 1) {
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
function triggerEvent(objectId) {
    // Logic to check for and trigger any associated events
}
function handleCannotPickUpMessage(language, dialogueData) {
    const cannotPickUpMessage = dialogueData.dialogue.globalMessages.itemCannotBePickedUp?.[language];
    if (cannotPickUpMessage) {
        console.log(cannotPickUpMessage);
    } else {
        console.warn(`No global message found for itemCannotBePickedUp in language ${language}`);
    }
}
// Handle "Use" action

export function handleUse(verb, objectId) {
    console.log(`Using object: ${objectId}`);
    // Add your implementation here
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
}export function parseCommand(userCommand) {
    const objectData = getObjectData().objects;
    const language = getLanguage();
    const localization = getLocalization()[language]['verbsActionsInteraction'];
    const navigationData = getNavigationData();

    let commandParts = userCommand.split(' ');
    let objectMatch = null;
    let objectName = '';
    let verbPart = '';
    let exitOrNot = false;

    for (let i = commandParts.length - 1; i >= 0; i--) {
        objectName = commandParts.slice(i).join(' ');

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
        exitOrNot: exitOrNot
    };
}

