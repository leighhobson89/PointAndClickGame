import { getBeginGameStatus, getBridgeState, setBridgeState, getCurrentlyMovingToAction, getForcePlayerLocation, setVerbsBlockedExcept, getVerbsBlockedExcept, setPendingEvents, getCurrentScreenId, getElements, getCutSceneState, setPreAnimationGridState, getGridData, getColorTextPlayer, getDialogueData, getGameVisibleActive, getLanguage, getNavigationData, getNpcData, setCurrentSpeaker, getObjectData, setAnimationInProgress, setCustomMouseCursor, getCustomMouseCursor, getCanvasCellWidth, getCanvasCellHeight, getAllGridData, setNavigationData, getPendingEvents, getAnimationFinished, setForcePlayerLocation, getPlayerInventory, setTransitioningNow, getInitialStartGridReference, setCurrentScreenId, setNextScreenId, getInitialScreenId, setBeginGameStatus, setClickPoint } from "./constantsAndGlobalVars.js";
import { setScreenJSONData, setDialogueData, removeNpcFromEnvironment, removeObjectFromEnvironment, handleInventoryAdjustment, addItemToInventory, setObjectData, setNpcData } from "./handleCommands.js";
import { animateTransitionAndChangeBackground, setDynamicBackgroundWithOffset, drawInventory, showText } from "./ui.js";
import { gridValueSwapper, moveGridData, updateGrid, waitForAnimationToFinish, populatePathForEntityMovement, addEntityPath, setEntityPaths, getEntityPaths, addEntityToEnvironment, changeSpriteAndHoverableStatus, setGameState } from "./game.js";
import { dialogueEngine, getTextColor, getTextPosition, getOrderOfDialogue } from "./dialogue.js";

//OBJECTS DON'T NEED TO BE REMOVED FROM INVENTORY THIS IS HANDLED ELSEWHERE WHETHER THEY NEED TO BE REMOVED OR NOT
//REMEMBER TO CALL setOriginalGridData(gridData) AFTER MOVING OBJECTS AROUND ESPECIALLY IF ONE IS WHERE ANOTHER ONE WAS BEFORE
//EVENTS ADVANCING DIALOGUE QUEST OR SETTING TO NOT ABLE TO TALK SHOULD BE HANDLED IN THE EVENT NOT THE DIALOGUE ENGINE

export async function playCutsceneGameIntro() {
    setAnimationInProgress(true);
    let speakersArray;
    
    await animateTransitionAndChangeBackground('largePileOfPoo', 60, 55);
    await delay(1000);

    addEntityToEnvironment('npcNarrator', 10, 20, 0, 0, getNpcData().npcs['npcNarrator'].dimensions.originalWidth, getNpcData().npcs['npcNarrator'].dimensions.originalHeight, null, false, 'largePileOfPoo');
    setPreAnimationGridState(getAllGridData().largePileOfPoo, 'npcNarrator', false);
    updateGrid();

    await new Promise(async (resolve) => { //each new scene ie changing background needs to be wrapped in a promise inside this one nesting more and more each scene
        await delay(50);

        if (getBeginGameStatus()) {
            setBeginGameStatus(false);
            setClickPoint({x: null, y: null});
        }

        //Add a block of these lines for each scene of the intro, ie when changing bg or whatever
        speakersArray = [['player', 1], ['npcNarrator', 2]]; // Adjust this if more speakers are added
        const dialogueData = getDialogueData().dialogue.cutSceneDialogues.gameIntroScene1;
        const order = dialogueData.order;
        await dialogueEngine(null, null, false, dialogueData, speakersArray, order);

        removeNpcFromEnvironment('npcNarrator', 'largePileOfPoo');
        updateGrid();
        //comments below only apply if adding a new scene and must repeat for all scenes
        //setBeginGameStatus(true) might be needed here to stop drawing objects in the transition
        //await animateTransition................THE ANIMATE TRANSITION TO ANOTHER BACKGROUND
        //await delay(1000);
        //add narrator to new scene if necessary and if so...
        //await new Promise with 50ms delay and then setBeginGameStatus(false) and the dialogue engine and remove narrator if necessary and update grid all inside promise
        //resolve promise


        //final animate to starting screen
        await animateTransitionAndChangeBackground(getInitialScreenId(), getInitialStartGridReference().x, getInitialStartGridReference().y);
        resolve();
    });
}

async function cutSceneCarpenterFarmerDialogue() {
    const dialogueData = getDialogueData().dialogue.cutSceneDialogues.farmerAndCarpenterAfterFixingFence;
    const speakersArray = [['npcCarpenter', 1], ['npcFarmer', 2], ['npcCow', 3]];
    const order = dialogueData.order;

    await dialogueEngine(null, null, false, dialogueData, speakersArray, order);
    console.log ("farmer and carpenter dialogue triggered");
    await moveCarpenterOffScreen('cowPath', 1);
    console.log("carpenter has gone!");
}

async function cutSceneEnterKitchenFirstTime() {
    const language = getLanguage();
    const dialogueString = getDialogueData().dialogue.cutSceneDialogues.enterKitchenFirstTime[0][language];
    await showText(dialogueString, getColorTextPlayer());
}

async function openCloseGenericUnlockedDoor(objectToUseWith, dialogueString, realVerbUsed, doorId) {
    const objectData = getObjectData().objects[doorId];
    const dialogueData = getDialogueData().dialogue;
    const language = getLanguage();
    let gridData = getAllGridData();

    const doorToOpenCloseOnOtherSide = objectData.interactable.doorToOpenCloseOnOtherSide;

    async function openDoor(gridDataLocation, doorId) {
        const doorData = getObjectData().objects[doorId];

        const reduceExpandWidthFactor = doorData.openCloseScaleFactorX;
        const reduceExpandHeightFactor = doorData.openCloseScaleFactorY;

        setAnimationInProgress(true);
        removeObjectFromEnvironment(doorId, gridDataLocation);
        updateGrid();

        setTimeout(() => {
            addEntityToEnvironment(
                doorId,
                doorData.gridPosition.x + Math.floor(doorData.visualAnimatedStateOffsets.s2.x / getCanvasCellWidth()),
                doorData.gridPosition.y + Math.floor(doorData.visualAnimatedStateOffsets.s2.y / getCanvasCellHeight()),
                doorData.offset.x,
                doorData.offset.y,
                doorData.dimensions.width * reduceExpandWidthFactor,
                doorData.dimensions.height * reduceExpandHeightFactor,
                's2',
                true,
                doorData.objectPlacementLocation
            );
            setPreAnimationGridState('clear', null, null);
            updateGrid();

            setTimeout(() => {
                setObjectData(doorId, `interactable.activeStatus`, true);
                // door opening animation in future
            }, 50);
        }, 50);
    }

    async function closeDoor(gridDataLocation, doorId) {
        const doorData = getObjectData().objects[doorId];

        const reduceExpandWidthFactor = doorData.openCloseScaleFactorX;
        const reduceExpandHeightFactor = doorData.openCloseScaleFactorY;
    
        const restoreFactorWidth = 1 / reduceExpandWidthFactor;
        const restoreFactorHeight = 1 / reduceExpandHeightFactor;

        setAnimationInProgress(true);
        removeObjectFromEnvironment(doorId, gridDataLocation);
        updateGrid();

        setTimeout(() => {
            addEntityToEnvironment(
                doorId,
                doorData.gridPosition.x,
                doorData.gridPosition.y,
                doorData.offset.x,
                doorData.offset.y,
                doorData.dimensions.width * restoreFactorWidth,
                doorData.dimensions.height * restoreFactorHeight,
                's1',
                true,
                doorData.objectPlacementLocation
            );
            setPreAnimationGridState('clear', null, null);
            updateGrid();

            setTimeout(() => {
                setObjectData(doorId, `interactable.activeStatus`, false);
                // door closing animation in future
            }, 50);
        }, 50);
    }

    switch (realVerbUsed) {
        case 'verbOpen':
        case 'verbUse':
            if (!objectData.interactable.activeStatus) {
                await openDoor(getCurrentScreenId(), doorId);
                if (doorToOpenCloseOnOtherSide) {
                    const otherDoorData = getObjectData().objects[doorToOpenCloseOnOtherSide];
                    const gridDataLocation = otherDoorData.objectPlacementLocation;
                    gridData = gridData[otherDoorData.objectPlacementLocation];
                    await openDoor(gridDataLocation, doorToOpenCloseOnOtherSide);
                }
            } else {
                const alreadyOpenMessage = dialogueData.globalMessages.alreadyOpen[language];
                await showText(alreadyOpenMessage, getColorTextPlayer());
            }
            break;
        case 'verbClose':            
            if (objectData.interactable.activeStatus) {
                await closeDoor(getCurrentScreenId(), doorId);
                if (doorToOpenCloseOnOtherSide) {
                    const otherDoorData = getObjectData().objects[doorToOpenCloseOnOtherSide];
                    const gridDataLocation = otherDoorData.objectPlacementLocation;
                    gridData = gridData[otherDoorData.objectPlacementLocation];
                    await closeDoor(gridDataLocation, doorToOpenCloseOnOtherSide);
                }
            } else {
                const alreadyClosedMessage = dialogueData.globalMessages.alreadyClosed[language];
                await showText(alreadyClosedMessage, getColorTextPlayer());
            }
            break;
    }
}

async function placeParrotFlyerOnHook(blank, dialogueString, blank2, blank3) {
    const dialogueData = getDialogueData().dialogue;
    const language = getLanguage();
    let gridData = getGridData();

    removeObjectFromEnvironment('objectParrotHook', 'deadTree');
    updateGrid();

    setAnimationInProgress(true);
    addEntityToEnvironment('objectParrotFlyer', 47, 32, 0, 0, getObjectData().objects['objectParrotFlyer'].dimensions.originalWidth, getObjectData().objects['objectParrotFlyer'].dimensions.originalHeight, null, true, 'deadTree');
    changeSpriteAndHoverableStatus('s2', 'objectParrotFlyer', true);

    await showText(dialogueString, getColorTextPlayer());

    setPreAnimationGridState(gridData, 'objectParrotFlyer', true);

    setDialogueData('objectInteractions.verbLookAt.objectParrotFlyer', '0', '1');

    updateGrid();

    await moveParrotToFlyer();
    console.log('Parrot has finished moving to the flyer!');
    setObjectData(`objectParrotMirror`, `interactable.canPickUp`, true);

    dialogueString = dialogueData.postAnimationEventDialogue.animationParrotMoveToParrotFlyer[language];
    await showText(dialogueString, getColorTextPlayer());

    setObjectData(`objectParrotHook`, `usedOn.useTogetherLocation`, `objectDonkeyRope`);
}

async function moveParrotToFlyer() {
    if (!getAnimationFinished().includes('parrotFinishedMovingToFlyer')) {
        let gridData = getGridData();
        setDialogueData('objectInteractions.verbLookAt.objectParrakeet', '0', '1');
        setObjectData(`objectParrakeet`, `activeSpriteUrl`, 's2');
        setObjectData(`objectParrakeet`, `canMove`, true);
        addEntityPath(`objectParrakeet`, getObjectData().objects['objectParrakeet'].canMove, 'deadTree');
    
        const path = populatePathForEntityMovement('objectParrakeet', 0);
        path.splice(0,3);
        setEntityPaths('objectParrakeet', 'path', path);
    
        console.log(getEntityPaths()['objectParrakeet'].path);
        await waitForAnimationToFinish('parrotFinishedMovingToFlyer');
    }
}

async function combineMilkAndBowl(blank, dialogueString, blank2, blank3) {
    const objectMilkInBowl = 'objectMilkInBowl';

    addItemToInventory(objectMilkInBowl, 1);
    drawInventory(0);

    await showText(dialogueString, getColorTextPlayer());
}

async function combineRopeAndHook(blank, dialogueString, blank2, blank3) {
    const objectRopeAndHook = 'objectRopeAndHook';

    addItemToInventory(objectRopeAndHook, 1);
    drawInventory(0);

    await showText(dialogueString, getColorTextPlayer());
}

async function combineRopeAndHookWithStackOfWood(blank, dialogueString, blank2, blank3) {
    let gridData = getGridData();
    removeObjectFromEnvironment('objectStackOfWood', 'riverCrossing');
    updateGrid();

    //play animation of throwing rope

    setTimeout(() => {
        setAnimationInProgress(true);
        addEntityToEnvironment('objectRopeAndHookWithStackOfWood', 34, 23, 0, 0, getObjectData().objects['objectRopeAndHookWithStackOfWood'].dimensions.originalWidth, getObjectData().objects['objectRopeAndHookWithStackOfWood'].dimensions.originalHeight, 's1', true, 'riverCrossing');
        setPreAnimationGridState(gridData, 'objectPulleyWheel', true);
        updateGrid();
    }, 50);

    await showText(dialogueString, getColorTextPlayer());
}

async function connectRopeAndHookWithWoodToPulley(blank, dialogueString, blank2, blank3) {
    let gridData = getGridData();
    let pulleyWheelOnScreen = false;
    let dialogueData = getDialogueData().dialogue;
    let language = getLanguage();

    for (const row of gridData.gridData) {
        for (const cellValue of row) {
            if (cellValue === 'oobjectPulleyWheel') {
                pulleyWheelOnScreen = true;
                break;
            }
        }
    }

    if (pulleyWheelOnScreen) {
        removeObjectFromEnvironment('objectRopeAndHookWithStackOfWood', 'riverCrossing');
        updateGrid();
        
        setTimeout(() => {
            setAnimationInProgress(true);
            addEntityToEnvironment(
                'objectRopeAndHookWithStackOfWoodOnPulley', 
                34, 17, 
                0.8, 0.4, 
                getObjectData().objects['objectRopeAndHookWithStackOfWoodOnPulley'].dimensions.originalWidth, 
                getObjectData().objects['objectRopeAndHookWithStackOfWoodOnPulley'].dimensions.originalHeight, 
                's1', true, 'riverCrossing'
            );
            setPreAnimationGridState(gridData, 'objectRopeAndHookWithStackOfWoodOnPulley', true);
            updateGrid();
        }, 50);
        
        await showText(dialogueString, getColorTextPlayer());
    } else {
        dialogueString = dialogueData.specialDialogue.pulleyNotOnScreen[language];
        await showText(dialogueString, getColorTextPlayer());
    }
}

async function hoistWoodOverHoleInBridgeAndBlockAllActionsExceptUse(blank, dialogueString, blank2, blank3) {
    let gridData = getGridData();

    setVerbsBlockedExcept(['interactionUse', 'interactionPull']);
    setForcePlayerLocation([33, 30]);

    await waitForPlayerToMoveToForceLocation();

    removeObjectFromEnvironment('objectRopeAndHookWithStackOfWoodOnPulley', 'riverCrossing');
    updateGrid();
    
    setTimeout(() => {
        setAnimationInProgress(true);
        addEntityToEnvironment(
            'objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted', 
            33, 16, 
            0.3, 0.5, 
            getObjectData().objects['objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted'].dimensions.originalWidth, 
            getObjectData().objects['objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted'].dimensions.originalHeight, 
            's1', true, 'riverCrossing'
        );
        setPreAnimationGridState(gridData, 'objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted', true);
        updateGrid();
    }, 50);

    await showText(dialogueString, getColorTextPlayer());

    setTimeout(() => {
        setAnimationInProgress(true);
        addEntityToEnvironment(
            'objectSuspiciousFencePost', 
            32, 26, 
            0, 0, 
            getObjectData().objects['objectSuspiciousFencePost'].dimensions.originalWidth, 
            getObjectData().objects['objectSuspiciousFencePost'].dimensions.originalHeight, 
            's1', true, 'riverCrossing'
        );
        setPreAnimationGridState(gridData, 'objectSuspiciousFencePost', true);
        updateGrid();
    }, 50);

    setObjectData(`objectSuspiciousFencePost`, `interactable.canUse`, true);
    setObjectData(`objectSuspiciousFencePost`, `interactable.activeStatus`, true);
}

async function tieRopeToSuspiciousFencePost(blank, dialogueString, blank2, blank3) {
    setVerbsBlockedExcept([]);
    setForcePlayerLocation([]);

    setObjectData(`objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted`, `interactable.canUse`, false);
    setObjectData(`objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted`, `interactable.activeStatus`, false);
    setObjectData(`objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted`, `interactable.alreadyUsed`, false);

    setDialogueData('objectInteractions.verbLookAt.objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted', '0', '1');

    await showText(dialogueString, getColorTextPlayer());

    setObjectData(`objectSuspiciousFencePost`, `interactable.canUse`, true);
    setObjectData(`objectSuspiciousFencePost`, `interactable.activeStatus`, false);
    setObjectData(`objectSuspiciousFencePost`, `interactable.alreadyUsed`, true);
}

async function addSplinterToPulley(blank, dialogueString, blank2, blank3) {

    await showText(dialogueString, getColorTextPlayer());

    setObjectData(`objectNails`, `interactable.activeStatus`, true);
    setDialogueData('objectInteractions.verbLookAt.objectNails', '0', '1');
    
    setDialogueData('objectInteractions.verbLookAt.objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted', '0', '2');
    setObjectData(`objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted`, `interactable.canUse`, true);
    setObjectData(`objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted`, `usedOn.useTogetherLocation`, `objectNails`);
    setObjectData(`objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted`, `interactable.activeStatus`, true);
    setObjectData(`objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted`, `interactable.alreadyUsed`, false);
}

async function buildBridgeSection(blank, dialogueString, blank2, blank3) {
    const gridData = getGridData();
    const dialogueData = getDialogueData().dialogue;
    const language = getLanguage();

    let bridgeState = getBridgeState();
    const inventory = getPlayerInventory();

    await showText(dialogueString, getColorTextPlayer());

    const hasMallet = Object.values(inventory).some(slot => slot.object === "objectMallet");

    if (bridgeState < 2 && hasMallet) {
        //build bridge section
        if (bridgeState === 0) {
            changeCanvasBgTemp('./resources/backgrounds/riverCrossingBridgeHalfComplete.png');
            setObjectData(`objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted`, `activeSpriteUrl`, 's2');

            setObjectData(`objectNails`, `interactable.decrementQuantityOnUse`, true);

            dialogueString = dialogueData.specialDialogue.buildFirstBridgeSection[language];
            await showText(dialogueString, getColorTextPlayer());

        } else if (bridgeState === 1) {
            setAnimationInProgress(true);

            changeCanvasBgTemp('./resources/backgrounds/riverCrossingBridgeComplete.png');
            setObjectData(`objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted`, `activeSpriteUrl`, 's3');
            setObjectData(`objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted`, `interactable.canHover`, false);
            
            //change grid to allow player to walk across bridge
            moveGridData('riverCrossingBridgeComplete', 'riverCrossing');
            gridValueSwapper('riverCrossing', 'e1', 'e2'); //this function may or not be needed after grid rebuilds depending on the random way the utility script allocates the e1 e2 numbers to the exits which can vary seemingly randomly
            
            addEntityToEnvironment(
                'objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted', 
                33, 16, 
                0.3, 0.5, 
                getObjectData().objects['objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted'].dimensions.originalWidth, 
                getObjectData().objects['objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted'].dimensions.originalHeight, 
                's3', true, 'riverCrossing'
            );
            setPreAnimationGridState(gridData, 'objectRopeAndHookWithStackOfWoodOnPulleyAndWoodHoisted', true);

            addEntityToEnvironment('npcWolf', 75, 27, 0, 0.5, getNpcData().npcs['npcWolf'].dimensions.originalWidth, getNpcData().npcs['npcWolf'].dimensions.originalHeight, 's1', false, 'riverCrossing')
            setPreAnimationGridState(gridData, 'npcWolf', true);
            updateGrid();

            dialogueString = dialogueData.specialDialogue.buildSecondBridgeSection[language];
            await showText(dialogueString, getColorTextPlayer());
        }

        setBridgeState(bridgeState + 1);
    } else {
        dialogueString = dialogueData.specialDialogue.noMalletOnBridge[language];
        await showText(dialogueString, getColorTextPlayer());
    }
}

// Helper function to poll getCurrentlyMovingToAction() until it's false
async function waitForPlayerToMoveToForceLocation() {
    while (getCurrentlyMovingToAction()) {
        await new Promise(resolve => setTimeout(resolve, 50));  // Check every 50 ms
    }
}

async function combinePulleyAndSturdyAnchor(blank, dialogueString, blank2, blank3) {
    const gridData = getGridData();
    removeObjectFromEnvironment('objectSturdyAnchor', 'riverCrossing');
    updateGrid();

    setTimeout(() => {
        setAnimationInProgress(true);
        addEntityToEnvironment('objectPulleyWheel', 36, 16, 0, 0, getObjectData().objects['objectPulleyWheel'].dimensions.originalWidth, getObjectData().objects['objectPulleyWheel'].dimensions.originalHeight, 's1', true, 'riverCrossing');
        setPreAnimationGridState(gridData, 'objectPulleyWheel', true);
        updateGrid();
    }, 50);

    setDialogueData('objectInteractions.verbLookAt.objectPulleyWheel', '0', '1');
    setObjectData(`objectPulleyWheel`, `interactable.canPickUp`, false);
    await showText(dialogueString, getColorTextPlayer());
}

async function giveBoneToWolf(npcAndSlot, blank, realVerbUsed, special) {
    const language = getLanguage();
    const objectData = getObjectData().objects;
    const objectGiving = objectData.objectBone;
    const objectId = 'objectBone';
    const npcData = getNpcData().npcs.npcWolf;
    const giveScenarioId = npcData.interactable.receiveObjectScenarioId;
    const dialogueData = getDialogueData().dialogue.objectInteractions.verbGive[objectId].scenario[giveScenarioId].phase;
    const navigationData = getNavigationData();

    const orderOfStartingDialogue = getOrderOfDialogue(objectId, null, null, null, false, giveScenarioId, null);
    setCustomMouseCursor(getCustomMouseCursor('normal'));

    await showCutSceneDialogue(0, dialogueData, orderOfStartingDialogue, npcData);

    handleInventoryAdjustment(objectId, 1, true);
    drawInventory(0);

    setNpcData(`npcWolf`,`activeSpriteUrl`, `s2`);
    setDialogueData('npcInteractions.verbLookAt.npcWolf', '0', '1');
    setNpcData('npcWolf', 'interactable.canTalk', false);

    navigationData.riverCrossing.exits.e2.status = "open";
    setNavigationData(navigationData);

    //set a pending event for wolf to disappear when player has been to world map
}

async function giveCarrotToDonkey(npcAndSlot, blank, realVerbUsed, special) {
    const gridData = getGridData();
    const objectId = 'objectCarrot';
    const npcData = getNpcData().npcs.npcDonkey;
    const giveScenarioId = npcData.interactable.receiveObjectScenarioId;
    const dialogueData = getDialogueData().dialogue.objectInteractions.verbGive[objectId].scenario[giveScenarioId].phase;

    const orderOfStartingDialogue = getOrderOfDialogue(objectId, null, null, null, false, giveScenarioId, null);
    setCustomMouseCursor(getCustomMouseCursor('normal'));

    await showCutSceneDialogue(0, dialogueData, orderOfStartingDialogue, npcData);

    handleInventoryAdjustment(objectId, 1, false);
    drawInventory(0);

    const currentNpcDonkeyX = Math.floor(npcData.visualPosition.x / getCanvasCellWidth());
    const currentNpcDonkeyY = Math.floor(npcData.visualPosition.y / getCanvasCellHeight());
    const currentNpcDonkeyWidth = npcData.dimensions.width;

    removeNpcFromEnvironment('npcDonkey', 'stables');
    updateGrid();
    setNpcData(`npcDonkey`, `objectPlacementLocation`, ``);

    setTimeout(() => {
        addEntityToEnvironment('objectDonkeyFake', currentNpcDonkeyX, Math.floor(currentNpcDonkeyY - (70 / getCanvasCellHeight())), 0.5, 0, currentNpcDonkeyWidth, getObjectData().objects['objectDonkeyFake'].dimensions.originalHeight, 's2', true, 'stables');
        setPreAnimationGridState(gridData, 'objectDonkeyFake', true);
        updateGrid();
    }, 50);
}

function changeCanvasBgTemp(url) {
    const canvas = getElements().canvas;
    const screenTilesWidebgImg = getNavigationData()[getCurrentScreenId()].screenTilesWidebgImg;
    setDynamicBackgroundWithOffset(canvas, url, 0, 0, screenTilesWidebgImg);
}

async function donkeyMoveRopeAvailable(blank, dialogueString, realVerbUsed, objectId) {
    const gridData = getGridData();
    const navigationData = getNavigationData();

    setTimeout(() => {
    setObjectData(`objectDonkeyFake`, `activeSpriteUrl`, 's4');
    }, 50);

    await showText(dialogueString, getColorTextPlayer());
    moveDonkeyOffScreen(gridData);

    setTimeout(() => {
    navigationData.stables.exits.e1.status = "open";
    setNavigationData(navigationData); //allow player to enter barn
    }, 50);
}

async function moveDonkeyOffScreen(gridData) {
    const dialogueData = getDialogueData().dialogue;
    const language = getLanguage();

    setObjectData(`objectDonkeyFake`, `activeSpriteUrl`, 's3');
    setObjectData(`objectDonkeyFake`, `canMove`, true);
    addEntityPath(`objectDonkeyFake`, getObjectData().objects['objectDonkeyFake'].canMove, 'stables');

    const path = populatePathForEntityMovement('objectDonkeyFake', 0);
    path.splice(0,3);
    setEntityPaths('objectDonkeyFake', 'path', path);

    await waitForAnimationToFinish('donkeyMovedOffScreen');

    changeCanvasBgTemp('./resources/backgrounds/stables.png');
    removeObjectFromEnvironment('objectDonkeyFake', 'stables');
    updateGrid();
    
    setTimeout(() => {

        setObjectData(`objectDonkeyFake`, `objectPlacementLocation`, '');
    
        addEntityToEnvironment('objectDonkeyRope', 40, 43, 0.5, 0, getObjectData().objects['objectDonkeyRope'].dimensions.originalWidth, getObjectData().objects['objectDonkeyRope'].dimensions.originalHeight, null, true, 'stables');
        setPreAnimationGridState(gridData, 'objectDonkeyRope', true);
    
        updateGrid();
        }, 50);

        let dialogueString = dialogueData.postAnimationEventDialogue.animationDonkeyMovesOffScreen[language];
        await showText(dialogueString, getColorTextPlayer());
}

async function giveKeyToLibrarian(npcAndSlot, blank, realVerbUsed, special) {
    const language = getLanguage();
    const objectData = getObjectData().objects;
    const objectGiving = objectData.objectKeyResearchRoom;
    const objectId = 'objectKeyResearchRoom';
    const npcData = getNpcData().npcs.npcLibrarian;
    const giveScenarioId = npcData.interactable.receiveObjectScenarioId;
    const dialogueData = getDialogueData().dialogue.objectInteractions.verbGive[objectId].scenario[giveScenarioId].phase;

    const orderOfStartingDialogue = getOrderOfDialogue(objectId, null, null, null, false, giveScenarioId, null);
    setCustomMouseCursor(getCustomMouseCursor('normal'));

    await showCutSceneDialogue(0, dialogueData, orderOfStartingDialogue, npcData);
    if (giveScenarioId === 1) {
        handleInventoryAdjustment(objectId, 1, true);
        addItemToInventory('objectParrotFlyer', 1);
        drawInventory(0);
    }
}

function unlockResearchRoomDoor(objectToUseWith, dialogueString, realVerbUsed, special) {
    const objectData = getObjectData().objects.objectDoorLibraryFoyerResearchRoom;
    const navigationData = getNavigationData();
    navigationData.libraryFoyer.exits.e1.status = "open";
    setNavigationData(navigationData);
    objectData.interactable.alreadyUsed = true;
    setNpcData(`npcLibrarian`, `interactable.receiveObjectScenarioId`, 1);

    showText(dialogueString, getColorTextPlayer());
}

function unlockDenDoor(objectToUseWith, dialogueString, realVerbUsed, special) {
    const objectData = getObjectData().objects.objectDoorToDen;
    const navigationData = getNavigationData();
    navigationData.alley.exits.e1.status = "open";
    setNavigationData(navigationData);
    objectData.interactable.alreadyUsed = true;

    showText(dialogueString, getColorTextPlayer());
}

function allowInteractionPileOfBooks(objectToUseWith, dialogueString, realVerbUsed, special) {
    setNpcData(`npcLibrarian`, `interactable.canTalk`, false);
    setNpcData(`npcLibrarian`, `interactable.cantTalkDialogueNumber`, 1);
    setObjectData(`objectPileOfBooksLibraryFoyer`, `interactable.canHover`, true);
}

function moveBooksToGetResearchRoomKey(objectToUseWith, dialogueString, realVerbUsed, special) {
    showText(dialogueString, getColorTextPlayer());
    setObjectData(`objectKeyResearchRoom`, `interactable.canHover`, true);
    setObjectData(`objectKeyResearchRoom`, `activeSpriteUrl`, 's2');
    setObjectData(`objectPileOfBooksLibraryFoyer`, `interactable.alreadyUsed`, true);
    setObjectData(`objectPileOfBooksLibraryFoyer`, `interactable.activeStatus`, false);
}

function resetHookBackToTreePosition() {
    const gridData = getGridData();
    setAnimationInProgress(true);

    addEntityToEnvironment('objectParrotHook', 57, 36, 0, 0, getObjectData().objects['objectParrotHook'].dimensions.originalWidth, getObjectData().objects['objectParrotHook'].dimensions.originalHeight, null, true, 'deadTree');

    setPreAnimationGridState(gridData, 'objectParrotHook', true);
    changeSpriteAndHoverableStatus('s1', 'objectParrotHook', true); 
    setObjectData(`objectParrotHook`, `interactable.canPickUp`, true);
    
    updateGrid();
}

function setCarpenterSpokenToTrue() {
    const allGridData = getAllGridData();
    setNpcData(`npcCarpenter`, `interactable.spokenToYet`, true);
    console.log("spoke to carpenter now");

    removeObjectFromEnvironment('objectBrokenFenceFarmTrack', 'cowPath');
    updateGrid();

    addEntityToEnvironment('npcCow', 13, 27, 0, 0, getNpcData().npcs['npcCow'].dimensions.originalWidth, getNpcData().npcs['npcCow'].dimensions.originalHeight, 's1', false, 'cowPath');
    setPreAnimationGridState(allGridData.cowPath, 'npcCow', false);

    updateGrid();

    addEntityToEnvironment('npcFarmer', 24, 26, 0, 0, getNpcData().npcs['npcFarmer'].dimensions.originalWidth, getNpcData().npcs['npcFarmer'].dimensions.originalHeight, 's1', false, 'cowPath');
    setPreAnimationGridState(allGridData.cowPath, 'npcFarmer', false);
    
    updateGrid();

    setNpcData(`npcCow`,`interactable.canHover`, true);
    setNpcData(`npcFarmer`,`interactable.canHover`, true);
}

function carpenterStopPlayerPickingUpItemsEarly(blank,blank2, blank3, objectId) {
    const carpenterQuestPhase = getNpcData().npcs.npcCarpenter.interactable.questPhase;
    const carpenterDialogueColor = getNpcData().npcs.npcCarpenter.interactable.dialogueColor;
    if (carpenterQuestPhase < 2) {
        let dialogueString;
        dialogueString = getDialogueData().dialogue.specialDialogue.cannotPickUpPliersOrNailsYet[getLanguage()];

        showText(dialogueString, carpenterDialogueColor);        
    }
}

async function setupCarpenterAndFarmerInCowPath() {
    const pendingEvents = getPendingEvents(); //add cutscene event for when player reaches to cowPath next time
    pendingEvents.push(['cutSceneCarpenterFarmerDialogue', 'transition', 'cowPath', null, null]);
    setPendingEvents(pendingEvents);

    const allGridData = getAllGridData();
    console.log("carpenter gone to stables");

    const farmerX = getNpcData().npcs['npcFarmer'].gridPosition.x;
    const farmerY = getNpcData().npcs['npcFarmer'].gridPosition.y;
    const farmerWidth = getNpcData().npcs['npcFarmer'].dimensions.originalWidth;
    const farmerHeight = getNpcData().npcs['npcFarmer'].dimensions.originalHeight;

    removeNpcFromEnvironment('npcFarmer', 'cowPath');
    updateGrid();
    setPreAnimationGridState(allGridData.cowPath, 'npcFarmer', false);

    setTimeout(() => {
        addEntityToEnvironment('npcFarmer', 46, 26, 0, 0, getNpcData().npcs['npcFarmer'].dimensions.originalWidth, getNpcData().npcs['npcFarmer'].dimensions.originalHeight, 's1', false, 'cowPath');
        setPreAnimationGridState(allGridData.cowPath, 'npcFarmer', false);

        updateGrid();

        setTimeout(() => {
            setNpcData(`npcCarpenter`, `dimensions.width`, farmerWidth - 2);
            setNpcData(`npcCarpenter`, `dimensions.height`, farmerHeight);
            setNpcData(`npcCarpenter`, `gridPosition.x`, farmerX);
            setNpcData(`npcCarpenter`, `gridPosition.y`, farmerY);
            addEntityToEnvironment('npcCarpenter', farmerX, farmerY, 0, 0, farmerWidth - 2, farmerHeight, 's3', false, 'cowPath');
            setPreAnimationGridState(allGridData.cowPath, 'npcCarpenter', false);
        
            setScreenJSONData('cowPath', 'bgUrl', './resources/backgrounds/cowPathRepairedFence.png');
            setObjectData(`objectPliers`, `interactable.canPickUpNow`, true);
            setObjectData(`objectNails`, `interactable.canPickUpNow`, true);
    
            updateGrid();
        }, 50);
    }, 50);
}

async function moveCarpenterOffScreen(location, waypointSet) {
    if (getCurrentScreenId() === location) {
        setNpcData(`npcCarpenter`, `activeSpriteUrl`, 's1');
        setNpcData(`npcCarpenter`, `canMove`, true);
        addEntityPath(`npcCarpenter`, getNpcData().npcs['npcCarpenter'].canMove, location);
    
        const path = populatePathForEntityMovement('npcCarpenter', waypointSet);
        path.splice(0,3);
        setEntityPaths('npcCarpenter', 'path', path);
    
        if (location === 'cowPath') {
            await waitForAnimationToFinish('carpenterMovedOffScreenCowPath');
            setNpcData(`npcFarmer`, `interactable.cantTalkDialogueNumber`, '1');
        } else if (location === 'carpenter') {
            await waitForAnimationToFinish('carpenterMovedOffScreenCarpenter');
            await setupCarpenterAndFarmerInCowPath();
        }
    
        removeNpcFromEnvironment('npcCarpenter', location);
        updateGrid();
    }
}

function makeCowTalkableAfterSpeakingToFarmer() {
    setNpcData(`npcCow`, `interactable.canTalk`, true);
}

function makeCowNotTalkableAndPliersUseable() {
    setNpcData(`npcCow`, `interactable.canTalk`, false);
    setObjectData(`objectPliers`, `interactable.activeStatus`, true);
}

function makeFarmerNotTalkableAndSetCarpenterQuestPhaseAfterInitialDialogue() {
    setNpcData(`npcFarmer`, `interactable.canTalk`, false);
    makeCowTalkableAfterSpeakingToFarmer();
    setNpcData(`npcCarpenter`, `interactable.questPhase`, 1);
    setNpcData(`npcCarpenter`, `interactable.questCutOffNumber`, 2);
}

function makeMirrorGiveableToWoman() {
    setObjectData(`objectParrotMirror`, `interactable.canGive`, true);
    setNpcData(`npcWomanLostMirror`, `interactable.canTalk`, false);
}

function openBarrelBarn(blank, dialogueString, blank2, barrel) {    
    setObjectData(`${barrel}`, `interactable.activeStatus`, false);
    setObjectData(`${barrel}`, `interactable.canUse`, false);
    changeSpriteAndHoverableStatus('s2', `${barrel}`, true);
    setDialogueData('objectInteractions.verbLookAt.objectBarrelBarn', '0', '1');

    showText(dialogueString, getColorTextPlayer());
}

function useGloveToAddMalletToInventory(blank, dialogueString) {
    const language = getLanguage();

    if (!getObjectData().objects['objectBarrelBarn'].interactable.activeStatus && !getObjectData().objects['objectBarrelBarn'].interactable.alreadyUsed) {
        setObjectData(`objectBarrelBarn`, `interactable.alreadyUsed`, true);
        setDialogueData('objectInteractions.verbLookAt.objectBarrelBarn', '0', '2');
        setDialogueData('objectInteractions.verbLookAt.objectGlove', '0', '1');
        addItemToInventory('objectMallet', 1);
        drawInventory(0);
        showText(dialogueString, getColorTextPlayer());
    } else if (!getObjectData().objects['objectBarrelBarn'].interactable.alreadyUsed) {
        dialogueString = getDialogueData().dialogue.globalMessages.activeStatusNotSet[language];
    } else {
        dialogueString = getDialogueData().dialogue.globalMessages.alreadyUsedButRetained[language];
    }
    showText(dialogueString, getColorTextPlayer());
}

async function giveWomanMirror(npcId, dialogueString, blank, objectId) {
    const npcData = getNpcData().npcs[npcId];

    const giveScenarioId = npcData.interactable.receiveObjectScenarioId;
    const dialogueData = getDialogueData().dialogue.objectInteractions.verbGive[objectId].scenario[giveScenarioId].phase;

    handleInventoryAdjustment(objectId, 1, true);
    drawInventory(0);

    const orderOfStartingDialogue = getOrderOfDialogue(objectId, null, null, null, false, giveScenarioId, null);
    setCustomMouseCursor(getCustomMouseCursor('normal'));
    setGameState(getCutSceneState());

    await showCutSceneDialogue(0, dialogueData, orderOfStartingDialogue, npcData);

    addItemToInventory('objectKeyToDen', 1);
    drawInventory(0);

    setDialogueData('npcInteractions.verbLookAt.npcWomanLostMirror', '0', '1');
    setNpcData(`npcWomanLostMirror`, `interactable.cantTalkDialogueNumber`, 1);
}

async function removeSplinterFromCowsHoof(blank, dialogueString, blank2, objectId) {
    const objectData = getObjectData().objects[objectId];
    const dialogueData = getDialogueData().dialogue;
    const language = getLanguage();

    if (objectData.interactable.activeStatus && !objectData.interactable.alreadyUsed) {
        showText(dialogueString, getColorTextPlayer());
        setNpcData(`npcCow`, `activeSpriteUrl`, `s2`);
        setNpcData(`npcCow`, `interactable.cantTalkDialogueNumber`, 1);
        setObjectData(`objectPliers`, `interactable.alreadyUsed`, true);
        setDialogueData('npcInteractions.verbLookAt.npcCow', '0', '1');
        addItemToInventory('objectSplinter', 1);
        drawInventory(0);
    } else {
        if (!objectData.interactable.alreadyUsed) {
            dialogueString = dialogueData.globalMessages.activeStatusNotSet[language];
            showText(dialogueString, getColorTextPlayer());
        } else {
            dialogueString = dialogueData.globalMessages.alreadyUsedButRetained[language];
            showText(dialogueString, getColorTextPlayer());
        }
    }

    const pendingEvents = getPendingEvents();
    pendingEvents.push(['moveFarmerToHisHouse', 'cantTalkDialogue', 'npcFarmer', 2, 1]); //eventFunction, type, entity, questPhase, cantTalkDialogueNumber
    setPendingEvents(pendingEvents);

    setNpcData(`npcFarmer`, `interactable.cantTalkDialogueNumber`, 2);
}

async function moveFarmerToHisHouse() {
    setNpcData(`npcFarmer`, `activeSpriteUrl`, 's2');
    setNpcData(`npcFarmer`, `canMove`, true);
    addEntityPath(`npcFarmer`, getNpcData().npcs['npcFarmer'].canMove, 'cowPath');

    const path = populatePathForEntityMovement('npcFarmer', 0);
    path.splice(0,3);
    setEntityPaths('npcFarmer', 'path', path);

    await waitForAnimationToFinish('moveFarmerToHisHouse');

    removeNpcFromEnvironment('npcFarmer', 'cowPath');
    updateGrid();
}

async function giveDogBowlOfMilk(townDog, dialogueString, blank2, objectId) {
    const dialogueData = getDialogueData().dialogue;
    const npcData = getNpcData().npcs[townDog];
    const gridData = getGridData();

    const giveScenarioId = npcData.interactable.receiveObjectScenarioId;
    const dialogueStringData = dialogueData.objectInteractions.verbGive[objectId].scenario[giveScenarioId].phase;

    handleInventoryAdjustment(objectId, 1, true);
    drawInventory(0);

    setNpcData(`${townDog}`, `activeSpriteUrl`, 's4');
    setObjectData(`objectBowl`, `interactable.canPickUp`, false);

    setAnimationInProgress(true);
    addEntityToEnvironment('objectBowl', 62, 49, 0, 0, getObjectData().objects['objectBowl'].dimensions.originalWidth, getObjectData().objects['objectBowl'].dimensions.originalHeight, null, true, 'marketStreet');
    setPreAnimationGridState(gridData, 'objectBowl', true);
    updateGrid();

    setTimeout(() => {
        addEntityToEnvironment('objectBone', 64, 53, 0, 0, getObjectData().objects['objectBone'].dimensions.originalWidth, getObjectData().objects['objectBone'].dimensions.originalHeight, null, true, 'marketStreet');
        setPreAnimationGridState(gridData, 'objectBone', true);

        updateGrid();
    }, 50);

    const orderOfStartingDialogue = getOrderOfDialogue(objectId, null, null, null, false, giveScenarioId, null);
    setCustomMouseCursor(getCustomMouseCursor('normal'));

    await showCutSceneDialogue(0, dialogueStringData, orderOfStartingDialogue, npcData);

    setDialogueData('npcInteractions.verbLookAt.npcTownDog', '0', '1');
    setDialogueData('objectInteractions.verbLookAt.objectBowl', '0', '1');

    setNpcData(`${townDog}`, `interactable.canTalk`, false);
}

async function showDialogueDisgustedToPickUpPoo() {
    const language = getLanguage();
    const dialogueString = getDialogueData().dialogue.specialDialogue.disgustedToTryAndPickUpPoo[language];
    await showText(dialogueString, getColorTextPlayer());
}

async function revealCarrotAndGlove(blank, dialogueString, blank2, blank3) {
    const language = getLanguage();

    if (getObjectData().objects['objectLargePileOfPoo'].interactable.alreadyUsed) {
        dialogueString = getDialogueData().dialogue.globalMessages.alreadyUsedButRetained[language];
    }

    setDialogueData('objectInteractions.verbLookAt.objectLargePileOfPoo', '0', '1');
    setObjectData(`objectLargePileOfPoo`, `interactable.alreadyUsed`, true);
    setObjectData(`objectCarrot`, `interactable.canHover`, true);
    setObjectData(`objectCarrot`, `activeSpriteUrl`, `s2`);
    setObjectData(`objectGlove`, `interactable.canHover`, true);
    setObjectData(`objectGlove`, `activeSpriteUrl`, `s2`);

    await showText(dialogueString, getColorTextPlayer());
}

async function showDialogueStuckFast() {
    const language = getLanguage();
    const dialogueString = getDialogueData().dialogue.specialDialogue.manholeCoverIsStuck[language];
    await showText(dialogueString, getColorTextPlayer());
}

async function showDialogueStuckInFence() {
    const language = getLanguage();
    const dialogueString = getDialogueData().dialogue.specialDialogue.metalBarStuckInFence[language];
    await showText(dialogueString, getColorTextPlayer());
}

async function showDialogueManholeWontGoBackOn() {
    const language = getLanguage();
    const dialogueString = getDialogueData().dialogue.specialDialogue.manholeWontGoBackOn[language];
    await showText(dialogueString, getColorTextPlayer());
}

async function useCrowBarOnManholeCover(blank, dialogueString) {
    const pendingEvents = getPendingEvents(); //add cutscene event for when player reaches to cowPath next time
    pendingEvents.push(['cutSceneEnterKitchenFirstTime', 'transition', 'kitchen', null, null]);
    setPendingEvents(pendingEvents);

    const allGridData = getAllGridData();

    setObjectData(`objectManholeCover`, `usedOn.actionCanPickUpButNotYet`, `showDialogueManholeWontGoBackOn`);
    setObjectData(`objectManholeCover`, `interactable.alreadyUsed`, true);
    setDialogueData('objectInteractions.verbLookAt.objectManholeCover', '0', '1');

    removeObjectFromEnvironment('objectManholeCover', 'house');
    updateGrid();
    setPreAnimationGridState(allGridData.house, 'objectManholeCover', true);

    setTimeout(() => {
        addEntityToEnvironment('objectManholeCover', 65, 50, 0, 0, getObjectData().objects['objectManholeCover'].dimensions.originalWidth, getObjectData().objects['objectManholeCover'].dimensions.originalHeight, 's2', true, 'house');
        setPreAnimationGridState(allGridData.house, 'objectManholeCover', true);

        updateGrid();
    }, 50);

    await showText(dialogueString, getColorTextPlayer());
}

async function genericFunctionToJustSayCanUseTextAndDoNothingElse(blank, dialogueString) {
    await showText(dialogueString, getColorTextPlayer());
}

//---------------------------------------------------------------------------------------------------------------------------------------------
// EVENTS TRIGGERED BY DIALOGUE FUNCTION // function names are by necessity and created dynamically based on dialogue situation
//---------------------------------------------------------------------------------------------------------------------------------------------

export async function dialogueEventnpcCarpentercarpenter() {
    console.log("triggering move carpenter off screen in workshop");
    await moveCarpenterOffScreen('carpenter', 0);
}
//---------------------------------------------------------------------------------------------------------------------------------------------

// Executor function
export async function executeInteractionEvent(objectEvent, dialogueString, realVerbUsed, special1) {
    if (objectEvent === 'triggeredEvent') {
        try {
            eval(`${special1}()`);
        } catch (error) {
            console.error(`Failed to trigger event: ${eventToTrigger}`, error);
        }
    } else {
        const safeDialogueString = `'${dialogueString.replace(/'/g, "\\'")}'`;
        
        if (objectEvent.actionUse1 && (realVerbUsed === 'verbUse' || realVerbUsed === 'verbOpen' || realVerbUsed === 'verbClose' || realVerbUsed === 'verbPush' || realVerbUsed === 'verbPull')) {
            try {
                if (objectEvent.objectUse) {
                    eval(`${objectEvent.actionUse1}('${objectEvent.objectUse}', ${safeDialogueString}, '${realVerbUsed}', '${special1}')`);
                } else {
                    eval(`${objectEvent.actionUse1}(${null}, ${safeDialogueString}, '${realVerbUsed}', '${special1}')`);
                }
            } catch (e) {
                console.error(`Error executing function ${objectEvent.actionUse1}:`, e);
            }
        }

        if (objectEvent.actionUse2 && (realVerbUsed === 'verbUse' || realVerbUsed === 'verbOpen' || realVerbUsed === 'verbClose' || realVerbUsed === 'verbPush' || realVerbUsed === 'verbPull')) {
            try {
                if (objectEvent.objectUse) {
                    eval(`${objectEvent.actionUse2}('${objectEvent.objectUse}', ${safeDialogueString}, '${realVerbUsed}', '${special1}')`);
                } else {
                    eval(`${objectEvent.actionUse2}(${null}, ${safeDialogueString}, '${realVerbUsed}', '${special1}')`);
                }
            } catch (e) {
                console.error(`Error executing function ${objectEvent.actionUse2}:`, e);
            }
        }

        if (objectEvent.actionUseWith11 && (realVerbUsed === "verbUse" || realVerbUsed === "verbOpen" || realVerbUsed === "verbPush" || realVerbUsed === "verbPull")) {
            try {
                if (objectEvent.objectUseWith1) {
                    eval(`${objectEvent.actionUseWith11}('${objectEvent.objectUseWith1}', ${safeDialogueString}, '${realVerbUsed}', '${special1}')`);
                } else {
                    eval(`${objectEvent.actionUseWith11}(${null}, ${safeDialogueString}, '${realVerbUsed}', '${special1}')`);
                }
            } catch (e) {
                console.error(`Error executing function ${objectEvent.actionUseWith11}:`, e);
            }
        }

        if (objectEvent.actionUseWith12 && (realVerbUsed === "verbUse" || realVerbUsed === "verbOpen" || realVerbUsed === "verbPush" || realVerbUsed === "verbPull")) {
            try {
                if (objectEvent.objectUseWith1) {
                    eval(`${objectEvent.actionUseWith12}('${objectEvent.objectUseWith1}', ${safeDialogueString}, '${realVerbUsed}', '${special1}')`);
                } else {
                    eval(`${objectEvent.actionUseWith12}(${null}, ${safeDialogueString}, '${realVerbUsed}', '${special1}')`);
                }
            } catch (e) {
                console.error(`Error executing function ${objectEvent.actionUseWith12}:`, e);
            }
        }

        if (objectEvent.actionGive1 && realVerbUsed === "verbGive") {
            try {
                eval(`${objectEvent.actionGive1}('${objectEvent.npcGiveTo}', ${safeDialogueString}, '${realVerbUsed}', '${special1}')`);
            } catch (e) {
                console.error(`Error executing function ${objectEvent.actionGive1}:`, e);
            }
        }

        if (realVerbUsed === "verbPickUp" && getObjectData().objects[special1].interactable.canPickUpNow) {
            try {
                eval(`${objectEvent.actionPickUp}(${null}, ${null}, ${null}, '${special1}')`);
            } catch (e) {
                console.error(`Error executing function ${objectEvent.actionPickUp}:`, e);
            }
        }

        if (realVerbUsed === "verbPickUp" && !getObjectData().objects[special1].interactable.canPickUpNow) {
            try {
                eval(`${objectEvent.actionCanPickUpButNotYet}(${null}, ${null}, ${null}, '${special1}')`);
            } catch (e) {
                console.error(`Error executing function ${objectEvent.actionCanPickUpButNotYet}:`, e);
            }
        }

        if (objectEvent.dialogueEvent) {
            try {
                eval(`${objectEvent.dialogueEvent}(${null}, ${null}, ${null}, '${special1}')`);
            } catch (e) {
                console.error(`Error executing function ${objectEvent.dialogueEvent}:`, e);
            }
        }
    }
}

export function turnNpcForDialogue(player, npc, npcId, originalState) {
    const playerXPos = player.xPos;
    const npcXPos = npc.visualPosition.x;

    if (npc.interactable.turnForDialogue) {
        if (originalState) {
            setNpcData(`${npcId}`, 'activeSpriteUrl', 's1'); 
            return;
        }
    
        if (playerXPos <= npcXPos) {
            setNpcData(`${npcId}`, 'activeSpriteUrl', 's2'); 
        } else {
            setNpcData(`${npcId}`, 'activeSpriteUrl', 's3'); 
        }
    }
    
}

async function showCutSceneDialogue(dialogueIndex, dialogueData, orderOfStartingDialogue, npcData) {
    const speaker = orderOfStartingDialogue[dialogueIndex];
    setCurrentSpeaker(speaker);
    const dialogueString = dialogueData[dialogueIndex][getLanguage()];

    const { xPos, yPos } = getTextPosition(speaker, npcData);
    const textColor = getTextColor(speaker, npcData.interactable.dialogueColor);

    await showText(dialogueString, textColor, xPos, yPos);

    if (dialogueIndex < orderOfStartingDialogue.end) {
        dialogueIndex++;
        await showCutSceneDialogue(dialogueIndex, dialogueData, orderOfStartingDialogue, npcData);
    } else {
        setGameState(getGameVisibleActive());
        setCurrentSpeaker('player');
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

//--------------------------------------------------------------------------------------------------------------------------------------
//--UNUSED EVENTS-----------------------------------------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------------------------------------------