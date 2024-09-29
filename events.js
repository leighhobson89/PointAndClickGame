import { getNavigationData } from "./constantsAndGlobalVars.js";
import { addItemToInventory, setObjectData } from "./handleCommands.js";
import { drawInventory } from "./ui.js";

//OBJECTS DON'T NEED TO BE REMOVED FROM INVENTORY THIS IS HANDLED ELSEWHERE WHETHER THEY NEED TO BE REMOVED OR NOT

//Open libraryFoyer from debugRoom
function openLibraryFoyerFromDebugRoom() {
    getNavigationData().debugRoom.exits.e1.status = "open";
    setObjectData(`objectKeyDEBUG`, `interactable.alreadyUsed`, true);
}

//Use batteryDEBUG to activate machineDEBUG
function useBatteryDEBUGOnMachineDEBUG() {
    setObjectData(`objectMachineDEBUG`, `interactable.activeStatus`, true);
}

//Use MachineDEBUG to get bananaDEBUG
function machineDEBUGActivate() {
    addItemToInventory("objectBananaDEBUG", 1);
    drawInventory(0);
    setObjectData(`objectMachineDEBUG`, `interactable.alreadyUsed`, true);
    setObjectData(`objectMachineDEBUG`, `interactable.activeStatus`, false);
}

//Give monkey banana to get it to talk and give player 10 batteryDEBUG
function giveMonkeyBanana() {
    addItemToInventory("objectBatteryDEBUG", 10);
    drawInventory(0);
    //set dialogue stage for monkey TODO
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

