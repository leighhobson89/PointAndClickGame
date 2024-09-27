import { addItemToInventory, setObjectData } from "./handleCommands.js";
import { getObjectData } from "./constantsAndGlobalVars.js";
import { drawInventory } from "./ui.js";


export function machineDEBUGActivate(objectId) {
    addItemToInventory("bananaDEBUG", 1);
    drawInventory(0);
    setObjectData(`machineDEBUG`, `interactable.alreadyUsed`, true);
    setObjectData(`machineDEBUG`, `interactable.activeStatus`, false);
}