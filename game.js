import { getPendingEvents, setPendingEvents, setDonkeyMovedOffScreen, setParrotCompletedMovingToFlyer, setTargetYEntity, getNonPlayerAnimationFunctionalityActive, setTargetXEntity, setCantGoThatWay, getCantGoThatWay, getDrawGrid, getClickPoint, setClickPoint, setDialogueRows, getTransitioningToDialogueState, setBottomContainerHeight, getBottomContainerHeight, getInteractiveDialogueState, setResizedNpcsGridState, getOriginalValueInCellWhereNpcPlacedNew, setOriginalValueInCellWhereNpcPlacedNew, setResizedObjectsGridState, getAnimationInProgress, setAnimationInProgress, getPreAnimationGridState, setPreAnimationGridState, getOriginalGridState, setOriginalGridState, getOriginalValueInCellWhereObjectPlacedNew, setOriginalValueInCellWhereObjectPlacedNew, getCurrentSpeaker, getCurrentYposNpc, getNpcData, getWaitingForSecondItem, getDisplayText, getAllGridData, getBeginGameStatus, getCanvasCellHeight, getCanvasCellWidth, getCurrentScreenId, getCustomMouseCursor, getElements, getExitNumberToTransitionTo, getGameInProgress, getGameVisibleActive, getGridData, getGridSizeX, getGridSizeY, getGridTargetX, getGridTargetY, getHoverCell, getInitialStartGridReference, getLanguage, getMenuState, getNavigationData, getNextScreenId, getObjectData, getOriginalValueInCellWhereObjectPlaced, getPlayerObject, getPreviousScreenId, getTransitioningNow, getTransitioningToAnotherScreen, getUpcomingAction, getVerbButtonConstructionStatus, getZPosHover, setCanvasCellHeight, setCanvasCellWidth, setCurrentlyMovingToAction, setCustomMouseCursor, setExitNumberToTransitionTo, setGameStateVariable, setGridTargetX, setGridTargetY, setNextScreenId, setOriginalValueInCellWhereObjectPlaced, getOriginalValueInCellWhereNpcPlaced, setOriginalValueInCellWhereNpcPlaced, setPlayerObject, setTargetXPlayer, setTargetYPlayer, setTransitioningNow, setTransitioningToAnotherScreen, setUpcomingAction, setVerbButtonConstructionStatus, setZPosHover, getHoveringInterestingObjectOrExit, getGameStateVariable, getCurrentXposNpc, getLocalization, setGameInProgress, getColorTextPlayer, getDialogueData } from './constantsAndGlobalVars.js';
import { localize } from './localization.js';
import { aStarPathfinding } from './pathFinding.js';
import { setNpcData, setObjectData, performCommand, constructCommand } from './handleCommands.js';
import { updateDebugValues, handleEdgeScroll, setDynamicBackgroundWithOffset, handleMouseMove, returnHoveredInterestingObjectOrExitName, updateInteractionInfo, drawTextOnCanvas, animateTransitionAndChangeBackground as changeBackground, showText } from './ui.js';
import { executeInteractionEvent } from './events.js';

export let entityPaths = {};
let firstDraw = true;

//--------------------------------------------------------------------------------------------------------

export function startGame() {
    initializeCanvas();
    setUpObjectsAndNpcs();
    initializePlayerPosition(getInitialStartGridReference().x, getInitialStartGridReference().y);
    if (!getGameInProgress()) {
        gameLoop();
        setGameInProgress(true);
    }
}

export function gameLoop() {
    const screenData = getNavigationData()[getCurrentScreenId()];
    const screenTilesWide = screenData.screenTilesWidebgImg;

    if (getGameStateVariable() === getInteractiveDialogueState()) {

        const dialogueSection = getElements().dialogueSection;

        if (dialogueSection) {
            setDialogueRows(Array.from(dialogueSection.children).slice(0, 4));
        }
    }

    if (screenTilesWide > 1) {
        handleEdgeScroll();
    }

    //debug
    updateDebugValues();

    const bottomContainer = getElements().bottomContainer;

    bottomContainer.style.height = `${getBottomContainerHeight()}px`;
    bottomContainer.offsetHeight;
    const ctx = getElements().canvas.getContext('2d');

    ctx.clearRect(0, 0, getElements().canvas.width, getElements().canvas.height);

    if (getGameStateVariable() === getGameVisibleActive() || getGameStateVariable() === getInteractiveDialogueState()) {
        if (!getBeginGameStatus()) {
            movePlayerTowardsTarget();
            checkAndChangeScreen();
        }
    }
    
    // DEBUG
    drawDebugGrid(getDrawGrid());

    drawPlayerNpcsAndObjects(ctx);

    if (getDisplayText().value1) {
        drawTextOnCanvas(getDisplayText().value1, getDisplayText().value2, getCurrentXposNpc(), getCurrentYposNpc(), getCurrentSpeaker());
    }

    if (getNonPlayerAnimationFunctionalityActive()) { //debug flag by button
        moveOtherEntitiesOnCurrentScreen();
    }

    requestAnimationFrame(gameLoop);
}

function movePlayerTowardsTarget() {
    const gridData = getGridData();
    const speed = getPlayerObject().speed;
    const player = getPlayerObject();
    const gridSizeX = getCanvasCellWidth();
    const gridSizeY = getCanvasCellHeight();
    const dialogueData = getDialogueData().dialogue;
    const language = getLanguage();

    const playerGridX = Math.floor(player.xPos / gridSizeX);
    const playerGridY = Math.floor(player.yPos / gridSizeY);

    const playerOffsetX = Math.floor(playerGridX + ((player.width / 2) / gridSizeX));
    const playerOffsetY = Math.floor(playerGridY + player.height / gridSizeY);

    const cellValue = gridData.gridData[playerOffsetY + 1][playerOffsetX]; // Adjust for rounding

    let targetX, targetY;

    let commandToPerform;
    let cellClickValue;
    //console.log(cellValue);

    if (getClickPoint().x !== null && getClickPoint().y !== null) {
        cellClickValue = gridData.gridData[getClickPoint().y][getClickPoint().x];
    } else {
        return;
    }

    const screenOrObjectNameAndHoverStatus = returnHoveredInterestingObjectOrExitName(cellClickValue);


    if (screenOrObjectNameAndHoverStatus[1]) {
        commandToPerform = constructCommand(getUpcomingAction(), true);
    } else {
        commandToPerform = constructCommand(getUpcomingAction(), false);
    }

    if (getTransitioningNow()) {
        const exit = 'e' + getExitNumberToTransitionTo();
        const finalPosition = getNavigationData()[getPreviousScreenId()].exits[exit].finalPosition;        
        const tolerance = 3;

        // Check if player has reached the final position for the transition
        if (Math.abs(playerOffsetX - finalPosition.x) <= tolerance && 
            Math.abs(playerOffsetY - finalPosition.y) <= tolerance) {
            setClickPoint({x: null, y: (null)});
            entityPaths.player.path = [];
            entityPaths.player.currentIndex = 0;
            setTransitioningNow(false);
            resizeEntity(true, null, null);
            getElements().customCursor.classList.remove('d-none');
            canvas.style.pointerEvents = 'auto';
            initializeNonPlayerMovementsForScreen(getCurrentScreenId());
        }
    }

    if (!commandToPerform) {
        return;
    }

    // Normal movement logic
    //console.log("command to perform = " + commandToPerform.verbKey);
    if (commandToPerform.verbKey === 'verbWalkTo' || commandToPerform.verbKey === 'interactionWalkingTo' || commandToPerform.verbKey === 'verbOpen' || commandToPerform.verbKey === 'verbClose'  || commandToPerform.verbKey === 'verbPickUp') {
        if (entityPaths.player.path.length > 0 && entityPaths.player.currentIndex < entityPaths.player.path.length) {
            targetX = entityPaths.player.path[entityPaths.player.currentIndex].x * gridSizeX;
            targetY = entityPaths.player.path[entityPaths.player.currentIndex].y * gridSizeY - player.height;
        } else {
            return; // No target to move toward
        }
    } else {
        if (entityPaths.player.path.length > 0 && entityPaths.player.currentIndex < entityPaths.player.path.length - 10) {
            targetX = entityPaths.player.path[entityPaths.player.currentIndex].x * gridSizeX;
            targetY = entityPaths.player.path[entityPaths.player.currentIndex].y * gridSizeY - player.height;
        } else if (entityPaths.player.path.length > 0) {
            targetX = (playerGridX + 0.5) * gridSizeX;
            targetY = (playerGridY + 0.5) * gridSizeY;
        } else {
            return; // No target to move toward
        }
    }


    let collisionEdgeCanvas = checkEdgeCollision(player, targetX);
    //if (collisionEdgeCanvas) return; // Prevent movement if there's a collision

    // Move the player toward the target position
    if (Math.abs(player.xPos - targetX) > speed) {
        player.xPos += (player.xPos < targetX) ? speed : -speed;
    } else {
        player.xPos = targetX;
    }

    if (Math.abs(player.yPos - targetY) > speed) {
        player.yPos += (player.yPos < targetY) ? speed : -speed;
    } else {
        player.yPos = targetY;
    }

    // Check if player has reached the target position
    if (Math.abs(player.xPos - targetX) < speed && Math.abs(player.yPos - targetY) < speed) {

        entityPaths.player.currentIndex++;

        if (entityPaths.player.currentIndex < entityPaths.player.path.length) {
            const nextStep = entityPaths.player.path[entityPaths.player.currentIndex];
            setTargetXPlayer(nextStep.x * gridSizeX);
            setTargetYPlayer(nextStep.y * gridSizeY - player.height);
        } else {
            setClickPoint({x: null, y: (null)});
            // Logic for when the player reaches the final destination
            if (getCantGoThatWay()) {
                let dialogueString = dialogueData.globalMessages.cantGoThatWay[language];
                showText(dialogueString, getColorTextPlayer());
                setCantGoThatWay(false);
                return;
            } else {    
                performCommand(commandToPerform, false); // Perform the command
                setCurrentlyMovingToAction(false);
                if (getVerbButtonConstructionStatus() === 'interactionWalkTo' && !getTransitioningToDialogueState()) {
                    updateInteractionInfo(localize('interactionWalkTo', getLanguage(), 'verbsActionsInteraction'), false);
                }
            }
        }
    }

    resizeEntity(true, null, null);

    setPlayerObject('xPos', player.xPos);
    setPlayerObject('yPos', player.yPos);
}

function moveOtherEntitiesOnCurrentScreen() {
    const gridData = getGridData();
    const gridSizeX = getCanvasCellWidth();
    const gridSizeY = getCanvasCellHeight();

    let entity;
    let isObjectTrueNpcFalse;

    for (const entityIdName in entityPaths) {
        const entityIdPrefix = entityIdName.slice(0, 3);

        if (entityIdPrefix !== 'pla') {
            switch (entityIdPrefix) {
                case "npc":
                    entity = getNpcData().npcs[entityIdName];
                    isObjectTrueNpcFalse = false;
                    break;
                case "obj":
                    entity = getObjectData().objects[entityIdName];
                    isObjectTrueNpcFalse = true;
                    break;
            }

            if (entity.objectPlacementLocation === getCurrentScreenId()) {
                const speed = entity.waypoints[entity.activeMoveSequence].speed;
        
                const positionToMeasureFromX = Math.floor(entity.visualPosition.x + (entity.dimensions.width / 2)); 
                const positionToMeasureFromY = Math.floor(entity.visualPosition.y + (entity.dimensions.height + entity.measureMovementYOffset));

                let targetX, targetY;

                if (entityPaths[entityIdName].path.length > 0 && entityPaths[entityIdName].currentIndex < entityPaths[entityIdName].path.length) {
                    setAnimationInProgress(true);
                    setPreAnimationGridState(gridData, entityIdName, isObjectTrueNpcFalse);
                }

                if (entityPaths[entityIdName].path.length > 0 && entityPaths[entityIdName].currentIndex < entityPaths[entityIdName].path.length) {

                    const rawTargetX = entityPaths[entityIdName].path[entityPaths[entityIdName].currentIndex].x * gridSizeX;
                    const rawTargetY = entityPaths[entityIdName].path[entityPaths[entityIdName].currentIndex].y * gridSizeY;

                    targetX = rawTargetX - (entity.dimensions.width / 2);
                    targetY = rawTargetY - (entity.dimensions.height + entity.measureMovementYOffset);

                    console.log(`Currently at ${positionToMeasureFromX / gridSizeX}, ${positionToMeasureFromY / gridSizeY}`);
                    console.log(`Moving towards ${targetX / getCanvasCellWidth()}, ${targetY / getCanvasCellHeight()}`);
                    console.log(JSON.stringify(entityPaths[entityIdName].path));
                } else {
                    return; // No target to move toward
                }
        
                if (Math.abs(entity.visualPosition.x - targetX) > speed) {
                    entity.visualPosition.x += (entity.visualPosition.x < targetX) ? speed : -speed;
                } else {
                    entity.visualPosition.x = targetX;
                }
        
                if (Math.abs(entity.visualPosition.y - targetY) > speed) {
                    entity.visualPosition.y += (entity.visualPosition.y < targetY) ? speed : -speed;
                } else {
                    entity.visualPosition.y = targetY;
                }

                const widthInCells = Math.floor(entity.dimensions.width / gridSizeX) + 1;
                const heightInCells = Math.floor(entity.dimensions.height / gridSizeY) + 1;
                const startX = entity.gridPosition.x;
                const startY = entity.gridPosition.y;
        
                const offsetX = (entity.offset.x || 0) * gridSizeX;  
                const offsetY = (entity.offset.y || 0) * gridSizeY; 
        
                for (let x = startX; x < startX + widthInCells; x++) {
                    for (let y = startY; y < startY + heightInCells; y++) {
                        const originalValue = gridData.gridData[y][x];
        
                        setOriginalValueInCellWhereObjectPlaced(getCurrentScreenId(), x, y, entityIdName, originalValue);
                        gridData.gridData[y][x] = `o${entityIdName}`;
                    }
                }
        
                if (Math.abs(entity.visualPosition.x - targetX) < speed && Math.abs(entity.visualPosition.y - targetY) < speed) {
                    entityPaths[entityIdName].currentIndex++;
        
                    if (entityPaths[entityIdName].currentIndex < entityPaths[entityIdName].path.length) {
                        const nextStep = entityPaths[entityIdName].path[entityPaths[entityIdName].currentIndex];
                        setTargetXEntity(entityIdName, nextStep.x * gridSizeX);
                        setTargetYEntity(entityIdName, nextStep.y * gridSizeY) + positionToMeasureFromY;
                    } else {
                        console.log(`Entity ${entityIdName} finished moving!`);
                        checkAndUpdateGlobalFlagsAfterEntityReachesTarget(entityIdName);
                    }
                }

                switch (entityIdPrefix) {
                    case "npc":
                        setNpcData(entityIdName, 'visualPosition.x', entity.visualPosition.x);
                        setNpcData(entityIdName, 'visualPosition.y', entity.visualPosition.y);
                        resizeEntity(false, entityIdName, false);
                        break;
                    case "obj":
                        setObjectData(entityIdName, 'visualPosition.x', entity.visualPosition.x);
                        setObjectData(entityIdName, 'visualPosition.y', entity.visualPosition.y);
                        resizeEntity(false, entityIdName, true);
                        break;
                }
            }
        }
    }
}


export function resizeEntity(playerTrueNpcFalse, entityId, entityObjectTrueNpcFalse) {
    const player = getPlayerObject();
    const gridData = getGridData();

    let entity;
    let objectId;
    let npcId;

    let entityGridX;
    let entityGridY;
    let entityOffsetX;
    let entityOffsetY;

    if (entityObjectTrueNpcFalse) {
        entity = getObjectData().objects[entityId];
        objectId = entityId;
    } else if (entityObjectTrueNpcFalse !== null) {
        entity = getNpcData().npcs[entityId];
        npcId = entityId;
    }

    // Get the scaling factor for the screen
    const scalingFactor = getNavigationData()[getCurrentScreenId()].scalingPlayerSize || 1;

    if (playerTrueNpcFalse) {
        entityGridX = Math.floor(player.xPos / getCanvasCellWidth());
        entityGridY = Math.floor(player.yPos / getCanvasCellHeight());
        entityOffsetX = Math.floor(entityGridX + ((player.width / 2) / getCanvasCellWidth()));
        entityOffsetY = Math.floor(entityGridY + player.height / getCanvasCellHeight());
    } else { //npc or object
        entityGridX = Math.floor(entity.visualPosition.x / getCanvasCellWidth());
        entityGridY = Math.floor(entity.visualPosition.y / getCanvasCellHeight());
        entityOffsetX = Math.floor(entityGridX + ((entity.dimensions.width / 2)));
        entityOffsetY = Math.floor(entityGridY + entity.dimensions.height);
    }

    // Get the cell value from the grid
    const cellValue = gridData.gridData[entityOffsetY + 1][entityOffsetX]; // +1 to fix reading wrong cell due to rounding

    let zPosStringW;
    let zPosW;

    // If the cell value doesn't start with 'w' or 'b', return early
    if (!cellValue.startsWith('w') && !cellValue.startsWith('b')) {
        return;
    }

    // Extract the Z position value if the cell starts with 'w' or 'b'
    if (cellValue.startsWith('w') || cellValue.startsWith('b')) {
        zPosStringW = extractWValue(cellValue);
        zPosW = parseInt(zPosStringW, 10);
    }

    // Define size limits
    const furthestZPos = 100;
    const nearestZPos = 255;

    let originalPlayerWidth;
    let originalPlayerHeight;
    let originalEntityWidth;
    let originalEntityHeight;

    if (playerTrueNpcFalse) {
        originalPlayerWidth = player.originalWidth;
        originalPlayerHeight = player.originalHeight;

        const scaleFactorW = (zPosW - furthestZPos) / (nearestZPos - furthestZPos);
        const clampedScaleFactorW = Math.min(Math.max(scaleFactorW, 0), 1);

        const newWidthW = originalPlayerWidth * (0.1 + clampedScaleFactorW * 0.9) * scalingFactor;
        const newHeightW = originalPlayerHeight * (0.1 + clampedScaleFactorW * 0.9) * scalingFactor;

        const widthDifference = newWidthW - player.width;
        const heightDifference = newHeightW - player.height;

        const offsetX = (widthDifference / 2);
        const offsetY = (heightDifference);

        setPlayerObject('xPos', player.xPos - offsetX);
        setPlayerObject('yPos', player.yPos - offsetY);

        setPlayerObject('width', newWidthW);
        setPlayerObject('height', newHeightW);
    } else { //npc or object
        originalEntityWidth = entity.dimensions.originalWidth * getCanvasCellWidth();
        originalEntityHeight = entity.dimensions.originalHeight * getCanvasCellHeight();

        const scaleFactorW = (zPosW - furthestZPos) / (nearestZPos - furthestZPos);
        const clampedScaleFactorW = Math.min(Math.max(scaleFactorW, 0), 1);

        const newWidthW = originalEntityWidth * (0.1 + clampedScaleFactorW * 0.9) * scalingFactor;
        const newHeightW = originalEntityHeight * (0.1 + clampedScaleFactorW * 0.9) * scalingFactor;

        const widthDifference = newWidthW - entity.dimensions.width;
        const heightDifference = newHeightW - entity.dimensions.height;

        const offsetX = (widthDifference / 2);
        const offsetY = (heightDifference);

        if (playerTrueNpcFalse) {
            setPlayerObject('xPos', player.xPos - offsetX);
            setPlayerObject('yPos', player.yPos - offsetY);
    
            setPlayerObject('width', newWidthW);
            setPlayerObject('height', newHeightW);
        } else {
            if (entityObjectTrueNpcFalse) { //object
                setObjectData(`${objectId}`,`visualPosition.x`, entity.visualPosition.x - offsetX);
                setObjectData(`${objectId}`,`visualPosition.y`, entity.visualPosition.y - offsetY);

                setObjectData(`${objectId}`,`dimensions.width`, newWidthW * getCanvasCellWidth());
                setObjectData(`${objectId}`,`dimensions.height`, newHeightW * getCanvasCellHeight());
            } else { //npc
                setNpcData(`${npcId}`,`visualPosition.x`, entity.visualPosition.x - offsetX);
                setNpcData(`${npcId}`,`visualPosition.y`, entity.visualPosition.y - offsetY);

                setNpcData(`${npcId}`,`dimensions.width`, newWidthW);
                setNpcData(`${npcId}`,`dimensions.height`, newHeightW);
            }
        }
    }
}

export function drawDebugGrid(drawGrid) {
    let showGrid = drawGrid;
    if (showGrid) {
        const canvas = getElements().canvas;
        const context = canvas.getContext('2d');
        const gridSizeX = getGridSizeX();
        const gridSizeY = getGridSizeY();
        const cellWidth = getCanvasCellWidth();
        const cellHeight = getCanvasCellHeight();

        context.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the grid
        for (let x = 0; x < gridSizeX; x++) {
            for (let y = 0; y < gridSizeY; y++) {
                context.strokeStyle = '#000';
                context.strokeRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
            }
        }

        const hoverCell = getHoverCell();
        const gridData = getGridData();
        
        if (hoverCell) {
            const cellValue = gridData.gridData[hoverCell.y][hoverCell.x];

            // Determine the fill color based on the cell value
            if (cellValue.startsWith('w')) {
                setZPosHover(extractWValue(cellValue));
                context.fillStyle = `rgba(0, ${getZPosHover()}, 0, 0.5)`; 
            } else if (cellValue.startsWith('e')) {
                context.fillStyle = 'rgba(255, 255, 0, 0.5)'; //exit
            } else if (cellValue.startsWith('o')) {
                context.fillStyle = 'rgba(255, 0, 255, 0.5)'; //object
            } else if (cellValue.startsWith('c')) {
                context.fillStyle = 'rgba(0, 0, 255, 0.5)'; //npc
            } else if (cellValue.startsWith('b')) {
                setZPosHover(extractWValue(cellValue));
                context.fillStyle = `rgba(100, 0, ${getZPosHover()}, 0.5)`; 
            } else {
                context.fillStyle = 'rgba(255, 0, 0, 0.5)'; // default color
            }        

            // Fill the hovered cell
            context.fillRect(hoverCell.x * cellWidth, hoverCell.y * cellHeight, cellWidth, cellHeight);

            // Draw the cell value near the mouse pointer
            const string = `${cellValue}: ${hoverCell.x}, ${hoverCell.y}, ${getCurrentScreenId()}`;
            context.fillStyle = '#FFF'; // White color for the text
            context.font = '16px Arial'; // Set the font size and type
            context.fillText(string, hoverCell.x * cellWidth + 5, hoverCell.y * cellHeight + 20);
        }

        // Draw the current path if it exists
        if (entityPaths.player.path.length > 0) {
            context.fillStyle = 'rgba(0, 0, 255, 0.5)';
            for (const step of entityPaths.player.path) {
                context.fillRect(step.x * cellWidth, step.y * cellHeight, cellWidth, cellHeight);
            }
        }

        // Draw the black circles at fixed grid points
        const circlePositions = [
            { x: 10, y: 10 },
            { x: 10, y: 30 },
            { x: 30, y: 30 },
            { x: 30, y: 10 }
        ];
        
        context.fillStyle = '#000'; // Black fill color for circles
        const circleRadius = 3; // Half of 3px diameter

        for (const pos of circlePositions) {
            const centerX = (pos.x + 0.5) * cellWidth; // Center the circle in the grid cell
            const centerY = (pos.y + 0.5) * cellHeight;
            
            context.beginPath();
            context.arc(centerX, centerY, circleRadius, 0, Math.PI * 2); // Draw circle
            context.fill();
        }
    }
}


export function drawPlayerNpcsAndObjects(ctx) {
    
    const player = getPlayerObject();
    const npcsData = getNpcData().npcs;
    const objectsData = getObjectData().objects;
    const gridData = getGridData().gridData;
    const cellWidth = getCanvasCellWidth();
    const cellHeight = getCanvasCellHeight();
    const drawnObjects = new Set();
    const drawnNpcs = new Set();

    // Draw objects and NPCs
    for (const [y, row] of gridData.entries()) {
        for (const [x, cellValue] of row.entries()) {

            // Draw objects
            if (cellValue.startsWith('o')) {
                const objectId = cellValue.substring(1);

                if (drawnObjects.has(objectId)) {
                    continue;
                }

                const object = objectsData[objectId];

                if (object && object.objectPlacementLocation === getCurrentScreenId()) {
                    const { visualPosition, dimensions, activeSpriteUrl, spriteUrl, offset, visualAnimatedStateOffsets } = object;

                    // Calculate draw positions with offsets
                    const drawX = visualPosition.x + (offset.x || 0) + (visualAnimatedStateOffsets[activeSpriteUrl]?.x || 0);
                    const drawY = visualPosition.y + (offset.y || 0) + (visualAnimatedStateOffsets[activeSpriteUrl]?.y || 0);

                    const scaledWidth = dimensions.width * cellWidth;
                    const scaledHeight = dimensions.height * cellHeight;

                    const img = new Image();
                    img.src = spriteUrl[activeSpriteUrl];

                    ctx.drawImage(img, drawX, drawY, scaledWidth, scaledHeight);

                    drawnObjects.add(objectId);

                    // Update gridData to mark cells occupied by the object
                    const startX = Math.floor(drawX / cellWidth);
                    const startY = Math.floor(drawY / cellHeight);
                    const widthInCells = Math.ceil(scaledWidth / cellWidth);
                    const heightInCells = Math.ceil(scaledHeight / cellHeight);

                    for (let gx = startX; gx < startX + widthInCells; gx++) {
                        for (let gy = startY; gy < startY + heightInCells; gy++) {
                            if (gx >= 0 && gy >= 0 && gx < gridData[0].length && gy < gridData.length) {
                                gridData[gy][gx] = `o${objectId}`;  // Mark grid cell as occupied by object
                            }
                        }
                    }
                }
            }

            // Draw NPCs
            if (cellValue.startsWith('c')) {
                const npcId = cellValue.substring(1);

                if (drawnNpcs.has(npcId)) {
                    continue;
                }

                const npc = npcsData[npcId];

                if (npc && npc.npcPlacementLocation === getCurrentScreenId()) {
                    const { visualPosition, dimensions, activeSpriteUrl, spriteUrl, offset } = npc;

                    // Calculate draw positions with offsets
                    const drawX = visualPosition.x + (offset.x || 0);
                    const drawY = visualPosition.y + (offset.y || 0);

                    const scaledWidth = dimensions.width * cellWidth;
                    const scaledHeight = dimensions.height * cellHeight;

                    const img = new Image();
                    img.src = spriteUrl[activeSpriteUrl];

                    ctx.drawImage(img, drawX, drawY, scaledWidth, scaledHeight);

                    drawnNpcs.add(npcId);

                    // Update gridData to mark cells occupied by the NPC
                    const startX = Math.floor(drawX / cellWidth);
                    const startY = Math.floor(drawY / cellHeight);
                    const widthInCells = Math.ceil(scaledWidth / cellWidth);
                    const heightInCells = Math.ceil(scaledHeight / cellHeight);

                    for (let gx = startX; gx < startX + widthInCells; gx++) {
                        for (let gy = startY; gy < startY + heightInCells; gy++) {
                            if (gx >= 0 && gy >= 0 && gx < gridData[0].length && gy < gridData.length) {
                                gridData[gy][gx] = `c${npcId}`;
                            }
                        }
                    }
                }
            }
        }
    }


    if (firstDraw) {
        setResizedObjectsGridState(gridData);
        setResizedNpcsGridState(gridData);
        initializeNonPlayerMovementsForScreen(getCurrentScreenId());
        firstDraw = false;

        console.log("EntityPaths:");
        console.log(entityPaths);
    }

    const playerXStart = player.xPos;
    const playerYStart = player.yPos + player.height;
    const playerWidth = player.width;
    const playerHeight = player.height;
    const skipCells = new Set();

    // Function to check for consecutive 'b' cells above or below the player
    function checkForConsecutiveBCells(gridX, gridYStart, direction) {
        let bCount = 0;
        for (let i = 0; i < 2; i++) {  // Check two cells in a row
            const gridY = gridYStart + i * direction;  // direction -1 for above, +1 for below
            if (gridY >= 0 && gridY < gridData.length && gridData[gridY][gridX].startsWith('b')) {
                bCount++;
            } else {
                break;  // Stop if a 'b' is not found
            }
        }
        return bCount === 2;  // Return true if two consecutive 'b' cells are found
    }

    // Determine whether the player is in front or behind the object
    const playerGridX = Math.floor(playerXStart / cellWidth);
    const playerGridY = Math.floor(playerYStart / cellHeight);
    let drawAllPlayer = false;

    // First, check above the player
    if (checkForConsecutiveBCells(playerGridX, playerGridY - 1, -1)) {
        // If two 'b' cells are found above, the player is in front of the object
        drawAllPlayer = true;
    } else if (checkForConsecutiveBCells(playerGridX, playerGridY + 1, 1)) {
        // If two 'b' cells are found below, the player is behind the object
        drawAllPlayer = false;
    }

    // Drawing logic based on the result
    if (drawAllPlayer) {
        // Draw the entire player without skipping cells
        for (let px = 0; px < playerWidth; px++) {
            for (let py = 0; py < playerHeight; py++) {
                const playerPixelX = playerXStart + px;
                const playerPixelY = playerYStart - py;

                const gridX = Math.floor(playerPixelX / cellWidth);
                const gridY = Math.floor(playerPixelY / cellHeight);

                if (gridY >= 0 && gridY < gridData.length && gridX >= 0 && gridX < gridData[0].length) {
                    ctx.fillStyle = player.color;
                    ctx.fillRect(playerPixelX, playerPixelY, 1, 1);
                }
            }
        }
    } else {
        // Apply the original skip logic if the player is behind the object
        for (let py = 0; py < playerHeight; py++) {
            const playerPixelY = playerYStart - py;
            const gridY = Math.floor(playerPixelY / cellHeight);
            const gridX = Math.floor(playerXStart / cellWidth);

            if (gridY >= 0 && gridY < gridData.length && gridX >= 0 && gridX < gridData[0].length) {
                if (gridData[gridY][gridX].startsWith('b')) {
                    skipCells.add(`${gridX},${gridY}`);
                    for (let i = 1; i <= 3; i++) {
                        if (gridX - i >= 0) {
                            skipCells.add(`${gridX - i},${gridY}`);
                        }
                        if (gridX + i < gridData[0].length) {
                            skipCells.add(`${gridX + i},${gridY}`);
                        }
                    }
                }
            }
        }

        // Now draw the player based on the skipCells logic
        for (let px = 0; px < playerWidth; px++) {
            for (let py = 0; py < playerHeight; py++) {
                const playerPixelX = playerXStart + px;
                const playerPixelY = playerYStart - py;

                const gridX = Math.floor(playerPixelX / cellWidth);
                const gridY = Math.floor(playerPixelY / cellHeight);

                if (gridY >= 0 && gridY < gridData.length && gridX >= 0 && gridX < gridData[0].length) {
                    if (!skipCells.has(`${gridX},${gridY}`)) {
                        ctx.fillStyle = player.color;
                        ctx.fillRect(playerPixelX, playerPixelY, 1, 1);
                    }
                }
            }
        }
    }



    //every frame we check to see if the grid objects have moved and then update the grid accordingly
    const originalValuesObject = {};
    const originalValuesNpc = {};
    
    for (let y = 0; y < gridData.length; y++) {
        for (let x = 0; x < gridData[y].length; x++) {
            const cellValue = gridData[y][x];
            // Record original values for occupied cells
            if (cellValue.startsWith('o')) {
                const objectId = cellValue.substring(1);
                setOriginalValueInCellWhereObjectPlacedNew(getCurrentScreenId(), x, y, objectId, cellValue);

                // Store original values in the object JSON
                if (!originalValuesObject[getCurrentScreenId()]) {
                    originalValuesObject[getCurrentScreenId()] = {};
                }
                originalValuesObject[getCurrentScreenId()][`${x},${y}`] = { objectId, originalValue: cellValue };
            }
            
            if (cellValue.startsWith('c')) {
                const npcId = cellValue.substring(1);
                setOriginalValueInCellWhereNpcPlacedNew(getCurrentScreenId(), x, y, npcId, cellValue);

                // Store original values in the npc JSON
                if (!originalValuesNpc[getCurrentScreenId()]) {
                    originalValuesNpc[getCurrentScreenId()] = {};
                }
                originalValuesNpc[getCurrentScreenId()][`${x},${y}`] = { npcId, originalValue: cellValue };
            }
        }
    }

    compareOriginalValuesAndUpdate();

    if (getAnimationInProgress()) {
        reconcileGridState();
    }

}

export function initializeCanvas() {
    const canvas = getElements().canvas;
    const ctx = canvas.getContext('2d');
    const container = getElements().canvasContainer;

    // Utility function to adjust sizes and positions of child elements inside bottomContainer
    function updateBottomContainerElements() {
        const bottomContainer = getElements().bottomContainer;
        const dialogueContainer = getElements().dialogueContainer;
        const verbsInventoryContainer = getElements().verbsInventoryContainer;
        
        // Adjust dialogue container's height to match bottom container
        dialogueContainer.style.height = `${bottomContainer.offsetHeight * 0.4}px`;

        // Adjust verbs and inventory container
        verbsInventoryContainer.style.height = `${bottomContainer.offsetHeight * 0.6}px`;

        // Dynamically adjust button sizes or other content
        const buttons = bottomContainer.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.style.height = `${bottomContainer.offsetHeight * 0.15}px`;
            button.style.fontSize = `${bottomContainer.offsetHeight * 0.05}px`;
        });

        // Adjust inventory items size to fit the container dynamically
        const inventoryItems = bottomContainer.querySelectorAll('.inventory-item img');
        inventoryItems.forEach(item => {
            item.style.width = `${bottomContainer.offsetHeight * 0.1}px`;
            item.style.height = `${bottomContainer.offsetHeight * 0.1}px`;
        });
    }

    function updateCanvasSize() {
        const viewportHeight = window.innerHeight;
        const bottomContainerHeight = getElements().bottomContainer.offsetHeight;

        setBottomContainerHeight(bottomContainerHeight - 10);

        const canvasHeight = viewportHeight - bottomContainerHeight;
        const canvasWidth = container.clientWidth * 0.8;

        container.style.width = '100%';
        container.style.height = `${canvasHeight}px`;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        canvas.style.backgroundSize = `${canvasWidth}px ${canvasHeight}px`;

        // Updating cell sizes based on canvas resizing
        const oldCellWidth = getCanvasCellWidth();
        const oldCellHeight = getCanvasCellHeight();

        const newCellWidth = canvasWidth / getGridSizeX();
        const newCellHeight = canvasHeight / getGridSizeY();
        setCanvasCellWidth(newCellWidth);
        setCanvasCellHeight(newCellHeight);

        // Update player position based on new cell size
        const player = getPlayerObject();
        player.xPos = (player.xPos / oldCellWidth) * newCellWidth;
        player.yPos = (player.yPos / oldCellHeight) * newCellHeight;

        setPlayerObject('xPos', player.xPos);
        setPlayerObject('yPos', player.yPos);

        // Redraw the grid with new cell sizes
        drawDebugGrid(getDrawGrid());

        // Update the elements inside bottomContainer
        updateBottomContainerElements();
    }

    window.addEventListener('load', updateCanvasSize);
    window.addEventListener('resize', updateCanvasSize);

    // Example event to handle mouse movements and interaction
    canvas.addEventListener('mousemove', (event) => handleMouseMove(event, ctx));

    updateCanvasSize(); // Initial setup
}


export function initializePlayerPosition(gridX, gridY) {
    const player = getPlayerObject();
    
    const cellWidth = getCanvasCellWidth();
    const cellHeight = getCanvasCellHeight();

    //resizePlayerObject(player);

    const xPos = gridX * cellWidth;
    const yPos = gridY * cellHeight - player.height;

    player.xPos = xPos;
    player.yPos = yPos;

    setTargetXPlayer(xPos);
    setTargetYPlayer(yPos);

    setPlayerObject('xPos', player.xPos);
    setPlayerObject('yPos', player.yPos);

    console.log(`Player initialized at grid position (${gridX}, ${gridY}), pixel position (${xPos}, ${yPos})`);
}

function checkEdgeCollision(player, targetX) {
    const newXPos = player.xPos + ((player.xPos < targetX) ? player.speed : - player.speed);
    let collisionOccurred = false;

    if (newXPos + player.width >= canvas.width) {
        player.xPos = canvas.width - player.width - getCanvasCellWidth();
        collisionOccurred = true;
    }

    if (collisionOccurred) {
        setTargetXPlayer(player.xPos);
        setTargetYPlayer(player.yPos);
        entityPaths.player.path = [];
        entityPaths.player.currentIndex = 0;
        return true;
    }
    return false;
}

//-------------------------------------------------------------------------------------------------------------

export function processLeftClickPoint(event, mouseClick) {
    if (getGameStateVariable() === getGameVisibleActive()) {
        const player = getPlayerObject();
        const localizationData = getLocalization();
        const language = getLanguage();

        const gridX = getHoverCell().x;
        const gridY = getHoverCell().y;

        if (mouseClick) {    
            setGridTargetX(gridX);
            setGridTargetY(gridY);
            setClickPoint({x: gridX, y: (gridY)});
        } else {
            setGridTargetX(event.x);
            setGridTargetY(event.y);
        }

        const verb = getVerbButtonConstructionStatus();
        const action = localizationData[language].verbsActionsInteraction[verb];
        console.log("CLICK: action = " + action);

        const path = aStarPathfinding(
            { x: Math.floor(player.xPos / getCanvasCellWidth()), y: Math.floor(player.yPos / getCanvasCellHeight()) },
            { x: getGridTargetX(), y: getGridTargetY() },
            action,
            'player',
            [],
            false
        );

        entityPaths.player.path = path;
        entityPaths.player.currentIndex = 0;

        setCustomMouseCursor(getCustomMouseCursor('clickInteresting'));

        if (entityPaths.player.path.length > 0) {
            if (!getTransitioningNow() && getVerbButtonConstructionStatus() === 'interactionWalkTo') {
                updateInteractionInfo(localize('interactionWalking', getLanguage(), 'verbsActionsInteraction'), true);
            }
            const cellValue = getGridData().gridData[getGridTargetY()] && getGridData().gridData[getGridTargetY()][getGridTargetX()];
            if (cellValue && cellValue.startsWith('e') && getVerbButtonConstructionStatus() === 'interactionWalkTo') {
                const exitNumberMatch = cellValue.match(/e(\d+)/);
                if (exitNumberMatch) {
                    const exitNumber = exitNumberMatch[1];
                    const exitData = getNavigationData()[getCurrentScreenId()].exits[`e${exitNumber}`];
                    console.log("Exit number:", exitNumber);

                    if (exitData.status === "open") {
                        setTransitioningToAnotherScreen(true);
                        setExitNumberToTransitionTo(exitNumber);
                    } else {
                        setCantGoThatWay(true);
                    }
                    
                    setNextScreenId(exitData.connectsTo);
                    updateInteractionInfo(localize('interactionWalkingTo', getLanguage(), 'verbsActionsInteraction') + " " + getLocationName(getNextScreenId()), true);
                }
            }

            console.log("verb construction: " + getVerbButtonConstructionStatus());

            if (getVerbButtonConstructionStatus() !== 'interactionWalkTo' && !getWaitingForSecondItem()) {
                const screenOrObjectNameAndHoverStatus = returnHoveredInterestingObjectOrExitName(cellValue);
                const screenName = screenOrObjectNameAndHoverStatus[0];
                if (screenOrObjectNameAndHoverStatus[1]){
                    updateInteractionInfo(
                        localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction') + 
                        " " + (screenName ? screenName : ""),
                        true
                    );
                }
            }
            

            const nextStep = entityPaths.player.path[0];
            setTargetXPlayer(nextStep.x * getCanvasCellWidth());
            setTargetYPlayer(nextStep.y * getCanvasCellHeight() + player.height);
        } else {
            setCustomMouseCursor(getCustomMouseCursor('error'));
        }
        setVerbButtonConstructionStatus(null);
        console.log("getHoveringInterestingObjectOrExit: " + getHoveringInterestingObjectOrExit());
        if (getWaitingForSecondItem()) {
            updateInteractionInfo(getElements().interactionInfo.textContent, true);
            setUpcomingAction(getElements().interactionInfo.textContent);
        }
        
        //console.log(`Path: ${JSON.stringify(path)}`);
    }
}

export function processRightClickPoint(event, mouseClick) {
    if (getGameStateVariable() === getGameVisibleActive()) {
        const player = getPlayerObject();
        const localizationData = getLocalization();
        const objectData = getObjectData().objects;
        const npcData = getNpcData().npcs;
        const language = getLanguage();

        const gridX = getHoverCell().x;
        const gridY = getHoverCell().y;

        if (mouseClick) {    
            setGridTargetX(gridX);
            setGridTargetY(gridY);
            setClickPoint({x: gridX, y: (gridY)});
        } else {
            setGridTargetX(event.x);
            setGridTargetY(event.y);
        }

        const cellValue = getGridData().gridData[getGridTargetY()] && getGridData().gridData[getGridTargetY()][getGridTargetX()];
        let verb = getVerbButtonConstructionStatus();

        if (cellValue.startsWith('o')) {
            if (cellValue.includes('objectDoor')) {
                if (!objectData[cellValue.slice(1)].interactable.activeStatus) {
                    verb = 'interactionOpen';
                } else {
                    verb = 'interactionClose';
                }
            } else {
                verb = 'interactionLookAt';
            }
        } else if (cellValue.startsWith('c')) {
            verb = 'interactionTalkTo';
        }

        console.log("verb is " + verb);

        const action = localizationData[language].verbsActionsInteraction[verb];
        console.log("CLICK: action = " + action);

        const path = aStarPathfinding(
            { x: Math.floor(player.xPos / getCanvasCellWidth()), y: Math.floor(player.yPos / getCanvasCellHeight()) },
            { x: getGridTargetX(), y: getGridTargetY() },
            action,
            'player',
            [],
            false
        );

        entityPaths.player.path = path;
        entityPaths.player.currentIndex = 0;

        setCustomMouseCursor(getCustomMouseCursor('clickInteresting'));

        if (entityPaths.player.path.length > 0) {
            if (!getTransitioningNow() && verb === 'interactionWalkTo') {
                updateInteractionInfo(localize('interactionWalking', getLanguage(), 'verbsActionsInteraction'), true);
            }

            if (cellValue && cellValue.startsWith('e') && verb === 'interactionWalkTo') {
                const exitNumberMatch = cellValue.match(/e(\d+)/);
                if (exitNumberMatch) {
                    const exitNumber = exitNumberMatch[1];
                    const exitData = getNavigationData()[getCurrentScreenId()].exits[`e${exitNumber}`];
                    console.log("Exit number:", exitNumber);

                    if (exitData.status === "open") {
                        setTransitioningToAnotherScreen(true);
                        setExitNumberToTransitionTo(exitNumber);
                    } else {
                        setCantGoThatWay(true);
                    }
                    
                    setNextScreenId(exitData.connectsTo);
                    updateInteractionInfo(localize('interactionWalkingTo', getLanguage(), 'verbsActionsInteraction') + " " + getLocationName(getNextScreenId()), true);
                }
            }

            if (verb !== 'interactionWalkTo' && !getWaitingForSecondItem()) {
                const screenOrObjectNameAndHoverStatus = returnHoveredInterestingObjectOrExitName(cellValue);
                const screenName = screenOrObjectNameAndHoverStatus[0];
                if (screenOrObjectNameAndHoverStatus[1]){
                    updateInteractionInfo(
                        localize(verb, getLanguage(), 'verbsActionsInteraction') + 
                        " " + (screenName ? screenName : ""),
                        true
                    );
                }
            }
            
            const nextStep = entityPaths.player.path[0];
            setTargetXPlayer(nextStep.x * getCanvasCellWidth());
            setTargetYPlayer(nextStep.y * getCanvasCellHeight() + player.height);
        } else {
            setCustomMouseCursor(getCustomMouseCursor('error'));
        }
        setVerbButtonConstructionStatus(null);
        console.log("getHoveringInterestingObjectOrExit: " + getHoveringInterestingObjectOrExit());
        if (getWaitingForSecondItem()) {
            updateInteractionInfo(getElements().interactionInfo.textContent, true);
            setUpcomingAction(getElements().interactionInfo.textContent);
        }
        
        //console.log(`Path: ${JSON.stringify(path)}`);
    }
}

export function checkAndChangeScreen() {
    if (!getTransitioningToAnotherScreen()) {
        return;
    }

    const canvas = getElements().canvas;
    const player = getPlayerObject();
    const gridData = getGridData();

    const playerGridX = Math.floor(player.xPos / getCanvasCellWidth());
    const playerGridY = Math.floor(player.yPos / getCanvasCellHeight());

    const playerOffsetGridX = Math.floor(playerGridX + ((getPlayerObject().width / 2) / getCanvasCellWidth()));
    const playerOffsetGridY = Math.floor(playerGridY + (getPlayerObject().height / getCanvasCellHeight()));

    for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
            const checkX = playerOffsetGridX + dx;
            const checkY = playerOffsetGridY + dy;
    
            // Add boundary checks to prevent out-of-bounds access
            if (checkX >= 0 && checkX < 80 && checkY >= 0 && checkY < 60) {
                // Perform the check if within bounds
                if (gridData.gridData[checkY][checkX].startsWith('e') && gridData.gridData[checkY][checkX].includes(getExitNumberToTransitionTo())) {
                    console.log("Player is moving to another screen");
                    entityPaths.player.path = [];
                    entityPaths.player.currentIndex = 0;
                    setCurrentlyMovingToAction(false);
    
                    changeBackground();

                    const pendingEvent = checkPendingEvents();
                    let pendingEvents;

                    if (pendingEvent) {
                        triggerPendingEvent(pendingEvent);

                        pendingEvents = getPendingEvents();
                        const eventIndex = pendingEvents.findIndex(event => event === pendingEvent);

                        if (eventIndex > -1) {
                            pendingEvents.splice(eventIndex, 1);
                        }
                        setPendingEvents(pendingEvents);
                    }

                    setTransitioningToAnotherScreen(false);
                    return;
                }
            }
        }
    }
    
    return; 
}

export function triggerPendingEvent(pendingEvent) {
    setTimeout(() => { //allow time to transition
        const eventToTrigger = pendingEvent[0];
        executeInteractionEvent('triggeredByScreenEntryEvent', null, null, `${eventToTrigger}`, null, null, null);
    }, 2000);
}

export function handleRoomTransition() {
    const navigationData = getNavigationData();
    const currentScreenId = getCurrentScreenId();

    const exitNumber = 'e' + getExitNumberToTransitionTo();
    const screenData = navigationData[currentScreenId];

    if (screenData && screenData.exits && screenData.exits[exitNumber]) {
        const newScreenId = screenData.exits[exitNumber].connectsTo;
        entityPaths.player.path = [];
        entityPaths.player.currentIndex = 0;

        swapBackgroundOnRoomTransition(newScreenId);
        return newScreenId;
    } else {
        console.error("Exit not found for current screen and exit number:", currentScreenId, exitNumber);
    }
}

function swapBackgroundOnRoomTransition(newScreenId) {
    console.log("Loading background for " + newScreenId);
    const exit = 'e' + getExitNumberToTransitionTo();
    // Transition complete, update the background position here if needed
    const xPosCameraEnterHere = getNavigationData()[getCurrentScreenId()].exits[exit].xPosCameraEnterHere;
    const yPosCameraEnterHere = getNavigationData()[getCurrentScreenId()].exits[exit].yPosCameraEnterHere;
    const newBackgroundImage = getNavigationData()[getNextScreenId()].bgUrl; // Get the new background image
    const screenTilesWidebgImg = getNavigationData()[getNextScreenId()].screenTilesWidebgImg;
    //setDynamicBackgroundWithOffset(canvas, newBackgroundImage, xPosCameraEnterHere, yPosCameraEnterHere, screenTilesWidebgImg);
    setDynamicBackgroundWithOffset(canvas, newBackgroundImage, xPosCameraEnterHere, yPosCameraEnterHere, screenTilesWidebgImg);
    console.log("reached final position end of transition, transitioningNow: " + getTransitioningNow());
}

export function extractWValue(value) {

    if (typeof value === 'string' && (value.startsWith('w') || value.startsWith('b'))) {
        const matches = value.match(/[wb](\d{1,3})/);
        if (matches && matches[1]) {
            return matches[1];
        }
    }

    return null;
}

function getLocationName(id) {
    const navigationData = getNavigationData();

    if (navigationData.hasOwnProperty(id)) {
        return navigationData[id][getLanguage()];
    } else {
        return null;
    }
}

export function addEntityToEnvironment(entityId, xPos, yPos, xOffset = 0, yOffset = 0, width, height, sprite, isObjectTrueNpcFalse, placementLocation) {
    const gridData = getAllGridData();
    const cellWidth = getCanvasCellWidth();
    const cellHeight = getCanvasCellHeight();
    
    let entity;
    let entityData;
    let roomName;

    if (isObjectTrueNpcFalse) {
        setObjectData(`${entityId}`, `objectPlacementLocation`, `${placementLocation}`);
        setObjectData(`${entityId}`, `offset.x`, `${xOffset}`);
        setObjectData(`${entityId}`, `offset.y`, `${yOffset}`);
        setObjectData(`${entityId}`, `dimensions.width`, `${width}`);
        setObjectData(`${entityId}`, `dimensions.height`, `${height}`);
        entityData = getObjectData();
        entity = entityData.objects[entityId]; // Fetch the object data
        roomName = entity.objectPlacementLocation;
    } else {
        setNpcData(`${entityId}`, `npcPlacementLocation`, `${placementLocation}`);
        setNpcData(`${entityId}`, `offset.x`, `${xOffset}`);
        setNpcData(`${entityId}`, `offset.y`, `${yOffset}`);
        setNpcData(`${entityId}`, `dimensions.width`, `${width}`);
        setNpcData(`${entityId}`, `dimensions.height`, `${height}`);
        entityData = getNpcData();
        entity = entityData.npcs[entityId]; // Fetch the object data
        roomName = entity.npcPlacementLocation;
    }

    const roomGridData = gridData[roomName];

    // Calculate the dimensions in grid cells
    const widthInCells = Math.floor(width / cellWidth) + 1;
    const heightInCells = Math.floor(height / cellHeight) + 1;

    // Set object offset positions
    const offsetX = xOffset * cellWidth;
    const offsetY = yOffset * cellHeight;

    // Loop to place the object in the grid
    for (let x = xPos; x < xPos + widthInCells; x++) {
        for (let y = yPos; y < yPos + heightInCells; y++) {
            const originalValue = roomGridData[y][x];

            if (isObjectTrueNpcFalse) {
                setOriginalValueInCellWhereObjectPlaced(roomName, x, y, entityId, originalValue);
                roomGridData[y][x] = `o${entityId}`;
            } else {
                setOriginalValueInCellWhereNpcPlaced(roomName, x, y, entityId, originalValue);
                roomGridData[y][x] = `c${entityId}`;
            }
        }
    }

    // Update object's visual position based on the grid and offsets
    entity.visualPosition = {
        x: xPos * cellWidth + offsetX,
        y: yPos * cellHeight + offsetY
    };

    if (sprite) {
        entity.activeSpriteUrl = sprite;
    }

    console.log(`Placed entity ${entityId} in room ${roomName} at grid position (${xPos}, ${yPos}) with visual position (${entity.visualPosition.x}, ${entity.visualPosition.y}), using sprite ${sprite}`);
}

export function setUpObjectsAndNpcs() { 
    const objectsData = getObjectData();
    const npcData = getNpcData();  // Fetch NPC data
    const gridData = getAllGridData();
    const cellWidth = getCanvasCellWidth();
    const cellHeight = getCanvasCellHeight();

    setOriginalGridState(gridData);

    // Loop to set up objects
    for (const objectId in objectsData.objects) {
        const object = objectsData.objects[objectId];
        const roomName = object.objectPlacementLocation;
        const roomGridData = gridData[roomName];
        
        if (!roomGridData) {
            console.warn(`No grid found for room: ${roomName}`);
            continue;
        }

        object.dimensions.width = object.dimensions.originalWidth;
        object.dimensions.height = object.dimensions.originalHeight;

        const widthInCells = Math.floor(object.dimensions.originalWidth / cellWidth) + 1;
        const heightInCells = Math.floor(object.dimensions.originalHeight / cellHeight) + 1;
        const startX = object.gridPosition.x;
        const startY = object.gridPosition.y;

        const offsetX = (object.offset.x || 0) * cellWidth;  
        const offsetY = (object.offset.y || 0) * cellHeight; 

        for (let x = startX; x < startX + widthInCells; x++) {
            for (let y = startY; y < startY + heightInCells; y++) {
                const originalValue = roomGridData[y][x];

                setOriginalValueInCellWhereObjectPlaced(roomName, x, y, objectId, originalValue);
                roomGridData[y][x] = `o${objectId}`;
            }
        }

        object.visualPosition = {
            x: startX * cellWidth + offsetX,
            y: startY * cellHeight + offsetY
        };

        console.log(`Placed object ${objectId} in room ${roomName} at grid position (${startX}, ${startY}) with visual position (${object.visualPosition.x}, ${object.visualPosition.y}).`);
    }

    // Loop to set up NPCs
    for (const npcId in npcData.npcs) {
        const npc = npcData.npcs[npcId];
        const roomName = npc.npcPlacementLocation;  // NPC location
        const roomGridData = gridData[roomName];
        
        if (!roomGridData) {
            console.warn(`No grid found for room: ${roomName}`);
            continue;
        }

        npc.dimensions.width = npc.dimensions.originalWidth;
        npc.dimensions.height = npc.dimensions.originalHeight;

        const widthInCells = Math.floor(npc.dimensions.width / cellWidth) + 1;
        const heightInCells = Math.floor(npc.dimensions.height / cellHeight) + 1;
        const startX = npc.gridPosition.x;
        const startY = npc.gridPosition.y;

        const offsetX = (npc.offset.x || 0) * cellWidth;  
        const offsetY = (npc.offset.y || 0) * cellHeight; 

        for (let x = startX; x < startX + widthInCells; x++) {
            for (let y = startY; y < startY + heightInCells; y++) {
                const originalValue = roomGridData[y][x];

                setOriginalValueInCellWhereNpcPlaced(roomName, x, y, npcId, originalValue);
                roomGridData[y][x] = `c${npcId}`;
            }
        }

        npc.visualPosition = {
            x: startX * cellWidth + offsetX,
            y: startY * cellHeight + offsetY
        };

        console.log(`Placed NPC ${npcId} in room ${roomName} at grid position (${startX}, ${startY}) with visual position (${npc.visualPosition.x}, ${npc.visualPosition.y}).`);
        console.log(gridData);

    }
}

export function compareOriginalValuesAndUpdate() {

    const originalValuesObject = getOriginalValueInCellWhereObjectPlaced();
    const newOriginalValuesObject = getOriginalValueInCellWhereObjectPlacedNew();

    const originalValuesNpc = getOriginalValueInCellWhereNpcPlaced();
    const newOriginalValuesNpc = getOriginalValueInCellWhereNpcPlacedNew();
    
    const originalGridState = getOriginalGridState(); 

    const differencesObject = {};
    const differencesNpc = {};

    for (const room in newOriginalValuesObject) {
        if (!originalValuesObject[room]) {
            originalValuesObject[room] = {};
        }

        for (const cell in newOriginalValuesObject[room]) {
            const newValue = newOriginalValuesObject[room][cell];

            if (!originalValuesObject[room][cell]) {
                if (!differencesObject[room]) {
                    differencesObject[room] = {};
                }
                differencesObject[room][cell] = {
                    message: "Cell exists in new values but not in original",
                    original: null,
                    new: newValue
                };

                const [x, y] = cell.split(',').map(Number); 
                const originalCellValue = originalGridState[room][y] && originalGridState[room][y][x] 
                    ? originalGridState[room][y][x] 
                    : null;

                originalValuesObject[room][cell] = {
                    objectId: newValue.objectId,
                    originalValue: originalCellValue
                };

                setOriginalValueInCellWhereObjectPlaced(room, x, y, newValue.objectId, originalCellValue);
            }
        }
    }

    for (const room in newOriginalValuesNpc) {
        if (!originalValuesNpc[room]) {
            originalValuesNpc[room] = {};
        }

        for (const cell in newOriginalValuesNpc[room]) {
            const newValue = newOriginalValuesNpc[room][cell];

            if (!originalValuesNpc[room][cell]) {
                if (!differencesNpc[room]) {
                    differencesNpc[room] = {};
                }
                differencesNpc[room][cell] = {
                    message: "Cell exists in new values but not in original",
                    original: null,
                    new: newValue
                };

                const [x, y] = cell.split(',').map(Number); 
                const originalCellValue = originalGridState[room][y] && originalGridState[room][y][x] 
                    ? originalGridState[room][y][x] 
                    : null;

                originalValuesNpc[room][cell] = {
                    objectId: newValue.npcId,
                    originalValue: originalCellValue
                };

                setOriginalValueInCellWhereNpcPlaced(room, x, y, newValue.npcId, originalCellValue);
            }
        }
    }
}

export function reconcileGridState() {
    console.log("reconcileGridStateCalled");
    // Retrieve the array of pre-animation states
    const preAnimationGridStates = getPreAnimationGridState();

    // Retrieve grids
    const originalGridState = getOriginalGridState()[getCurrentScreenId()];
    const currentGrid = getAllGridData()[getCurrentScreenId()];

    // Object to store all differences
    const allDifferences = [];

    // Loop through each pre-animation state
    for (let i = 0; i < preAnimationGridStates.length; i++) {
        const { id, grid, isObjectTrueNpcFalse } = preAnimationGridStates[i];

        const preAnimationGrid = grid.gridData;

        // Object to store the differences for this specific pre-animation state
        const differences = {
            id: id,
            currentDifferences: []
        };

        let cellPrefix;

        if (isObjectTrueNpcFalse) {
            cellPrefix = 'o' + id;
        } else {
            cellPrefix = 'c' + id;
        }

        // Compare pre-animation grid with the current grid, but only for the specified objectId
        for (let y = 0; y < preAnimationGrid.length; y++) {
            for (let x = 0; x < preAnimationGrid[y].length; x++) {
                const originalCell = preAnimationGrid[y][x];
                const currentCell = currentGrid[y][x];

                // Check if the current cell corresponds to the target objectId
                if (currentCell !== originalCell && String(currentCell).startsWith(cellPrefix)) {
                    differences.currentDifferences.push({ x, y, originalCell, currentCell });
                }
            }
        }

        // Reset cells in the current grid that match the objectId but are not in the differences list
        for (let y = 0; y < currentGrid.length; y++) {
            for (let x = 0; x < currentGrid[y].length; x++) {
                const currentCell = currentGrid[y][x];

                // If the current cell corresponds to the objectId and is not in the differences
                if (String(currentCell).startsWith(cellPrefix)) {
                    const isInDifferences = differences.currentDifferences.some(diff => diff.x === x && diff.y === y);

                    if (!isInDifferences) {
                        // Reset the cell to its original value from the originalGridState
                        currentGrid[y][x] = originalGridState[y][x];
                    }
                }
            }
        }

        // Now calculate the new position of the object based on grid cell offsets
        for (const diff of differences.currentDifferences) {
            const { x, y, currentCell } = diff;

            // Calculate the offset between the current position and the original one
            const offsetX = x;  // Assuming x is the current grid cell position
            const offsetY = y;  // Assuming y is the current grid cell position

            // Determine the new position in terms of grid cells (no need for pixel calculations)
            const newGridX = offsetX; // This is already in grid cells, so no conversion needed
            const newGridY = offsetY; // This is already in grid cells

            // Update the grid to reflect the new object position
            currentGrid[newGridY][newGridX] = cellPrefix;
        }

        // Store the differences for this specific object in the overall differences array
        allDifferences.push(differences);
    }

    // Console log the differences in the current grid for all objects
    //console.log(`All Differences for Pre-animation Objects:`, JSON.stringify(allDifferences, null, 2));
    //console.log(`Current Grid after resetting non-differing cells for all objects:`, JSON.stringify(currentGrid, null, 2));

    // Set animation state to false (animation completed)
    setAnimationInProgress(false);
    console.log("about to clear pre animation grid")
    setPreAnimationGridState('clear', null, null, null);
}

export function changeSpriteAndHoverableStatus(spriteUrlSNumber, objectId, showTrueHideFalse) {
    setObjectData(`${objectId}`, `activeSpriteUrl`, spriteUrlSNumber);
    setObjectData(`${objectId}`, `interactable.canHover`, showTrueHideFalse);
}

export function initializeEntityPathsObject() {
    //always add player
    entityPaths['player'] = {
        path: [],
        currentIndex: 0,
        placementScreenId: null
    };

    const objectsData = getObjectData().objects;
    const npcsData = getNpcData().npcs;

    for (const objectName in objectsData) {
        if (objectsData.hasOwnProperty(objectName)) {
            const object = objectsData[objectName];

            if (object.canMove === true) {
                entityPaths[objectName] = {
                    path: [],
                    currentIndex: 0,
                    placementScreenId: objectsData[objectName].objectPlacementLocation
                };
            }
        }
    }

    for (const npcName in npcsData) {
        if (npcsData.hasOwnProperty(npcName)) {
            const npc = npcsData[npcName];

            if (npc.canMove === true) {
                
                entityPaths[npcName] = {
                    path: [],
                    currentIndex: 0,
                    placementScreenId: npcsData[npcName].npcPlacementLocation
                };
            }
        }
    }

    console.log('Entity paths initialized:', entityPaths);
}

export function addEntityPath(entityId, canMove, placementScreenId) {
    if (canMove === true) {
        entityPaths[entityId] = {
            path: [],
            currentIndex: 0,
            placementScreenId: placementScreenId
        };

        console.log(`Added entity path for ${entityId}:`, entityPaths[entityId]);
    } else {
        console.log(`Entity ${entityId} cannot move, not added to entityPaths.`);
    }
}

export function initializeNonPlayerMovementsForScreen(screen) {
    let path;
    for (const entityId in entityPaths) {
        if (entityPaths.hasOwnProperty(entityId) && entityId !== 'player' && entityPaths[entityId].placementScreenId === screen) {
            const entity = entityPaths[entityId];

            entityPaths[entityId].path = [];
            entityPaths[entityId].currentIndex = 0;

            console.log(`Starting movements for ${entityId} on screen ${screen}`);
            if (entityId.startsWith('o')) {
                path = populatePathForEntityMovement(entityId, getObjectData().objects[entityId].activeMoveSequence);
            }

            if (entityId.startsWith('n')) {
                path = populatePathForEntityMovement(entityId, getNpcData().npcs[entityId].activeMoveSequence);
            }

            path.splice(0,3); //workaround for dodgy animation at start

            entityPaths[entityId].path = path;
        } else {

        }
    }
}

export function populatePathForEntityMovement(entityId, moveSequence) {
    let path;
    let entity;
    const entityIdPrefix = entityId.slice(0, 3);
    
    // Retrieve entity based on the ID prefix
    switch (entityIdPrefix) {
        case "npc":
            entity = getNpcData().npcs[entityId];
            break;
        case "obj":
            entity = getObjectData().objects[entityId];
            break;
        default: 
            console.error("Invalid entityId prefix. Could not assign a JSON property to the passed entityId.");
            return;
    }

    const start = {
        x: Math.floor(entity.visualPosition.x / getCanvasCellWidth()),
        y: Math.floor(entity.visualPosition.y / getCanvasCellHeight())
    };

    if (!entity.waypoints || Object.keys(entity.waypoints).length === 0) {
        console.error("No waypoints available for this entity.");
        return;
    }

    const waypointSequence = entity.waypoints[moveSequence];
    if (!waypointSequence) {
        console.error(`No waypoints found for moveSequence "${moveSequence}".`);
        return;
    }

    if (!waypointSequence.target) {
        return;
    }

    const target = { x: waypointSequence.target.x, y: waypointSequence.target.y };
    const waypoints = waypointSequence.points.map(point => ({ x: point.x, y: point.y }));
    console.log(`Running pathfinder from (${start.x}, ${start.y}) to (${target.x}, ${target.y}) with waypoints:`, waypoints);

    path = aStarPathfinding(
        start,
        target,
        null,
        entityId,
        waypoints,
        true
    );

    path = path.map(step => ({
        x: step.x,
        y: step.y
    }));

    return path;
}

export function getEntityPaths() {
    return entityPaths;
}

export function setEntityPaths(entityId, key, value) {
    entityPaths[entityId][key] = value;
}

export function checkAndUpdateGlobalFlagsAfterEntityReachesTarget(entityId) {
    switch (entityId) {
        case 'objectParrakeet':
            setParrotCompletedMovingToFlyer(true);
            setObjectData(`objectParrakeet`, `activeMoveSequence`, 99);
            break;
        case 'objectDonkeyFake':
            setDonkeyMovedOffScreen(true); 
            break;
    }
}

export function checkPendingEvents() {
    const pendingEvents = getPendingEvents();

    for (let i = 0; i < pendingEvents.length; i++) {
        const eventLocation = pendingEvents[i][1];

        if (eventLocation === getNextScreenId()) {
            return pendingEvents[i];
        }
    }

    return null;
}

//-------------------------------------------------------------------------------------------------------------

export function setGameState(newState) {
    console.log("Setting game state to " + newState);
    setGameStateVariable(newState);

    switch (newState) {
        case getMenuState():
            // Handle menu state
            getElements().menu.classList.remove('d-none');
            getElements().menu.classList.add('d-flex');
            // Hide unnecessary elements
            getElements().buttonRow.classList.add('d-none');
            getElements().buttonRow.classList.remove('d-flex');
            getElements().canvasContainer.classList.remove('d-flex');
            getElements().canvasContainer.classList.add('d-none');
            getElements().returnToMenuButton.classList.remove('d-flex');
            getElements().returnToMenuButton.classList.add('d-none');
            // Handle language buttons
            const languageButtons = [getElements().btnEnglish, getElements().btnSpanish, getElements().btnGerman, getElements().btnItalian, getElements().btnFrench];
            languageButtons.forEach(button => {
                button.classList.remove('active');
            });
            const currentLanguage = getLanguage();
            console.log("Language is " + currentLanguage);
            switch (currentLanguage) {
                case 'en': getElements().btnEnglish.classList.add('active'); break;
                case 'es': getElements().btnSpanish.classList.add('active'); break;
                case 'de': getElements().btnGerman.classList.add('active'); break;
                case 'it': getElements().btnItalian.classList.add('active'); break;
                case 'fr': getElements().btnFrench.classList.add('active'); break;
            }

            if (getGameInProgress()) {
                getElements().copyButtonSavePopup.innerHTML = `${localize('copyButton', getLanguage(), 'ui')}`;
                getElements().closeButtonSavePopup.innerHTML = `${localize('closeButton', getLanguage(), 'ui')}`;
            }
            break;

        case getGameVisibleActive():
            // Handle the active game state
            getElements().menu.classList.remove('d-flex');
            getElements().menu.classList.add('d-none');
            getElements().buttonRow.classList.remove('d-none');
            getElements().buttonRow.classList.add('d-flex');
            getElements().canvasContainer.classList.remove('d-none');
            getElements().canvasContainer.classList.add('d-flex');
            getElements().returnToMenuButton.classList.remove('d-none');
            getElements().returnToMenuButton.classList.add('d-flex');
            // Set button labels based on game state
            getElements().returnToMenuButton.innerHTML = `${localize('menuTitle', getLanguage(), 'ui')}`;
            // Set verb buttons for actions
            getElements().btnLookAt.innerHTML = `${localize('verbLookAt', getLanguage(), 'verbsActionsInteraction')}`;
            getElements().btnPickUp.innerHTML = `${localize('verbPickUp', getLanguage(), 'verbsActionsInteraction')}`;
            getElements().btnUse.innerHTML = `${localize('verbUse', getLanguage(), 'verbsActionsInteraction')}`;
            getElements().btnOpen.innerHTML = `${localize('verbOpen', getLanguage(), 'verbsActionsInteraction')}`;
            getElements().btnClose.innerHTML = `${localize('verbClose', getLanguage(), 'verbsActionsInteraction')}`;
            getElements().btnPush.innerHTML = `${localize('verbPush', getLanguage(), 'verbsActionsInteraction')}`;
            getElements().btnPull.innerHTML = `${localize('verbPull', getLanguage(), 'verbsActionsInteraction')}`;
            getElements().btnTalkTo.innerHTML = `${localize('verbTalkTo', getLanguage(), 'verbsActionsInteraction')}`;
            getElements().btnGive.innerHTML = `${localize('verbGive', getLanguage(), 'verbsActionsInteraction')}`;

            // Hide the verbs and inventory container
            getElements().verbsInventoryContainer.classList.add('d-flex');
            getElements().verbsInventoryContainer.classList.remove('d-none');

            // Show the dialogue container
            getElements().dialogueContainer.classList.remove('d-flex');
            getElements().dialogueContainer.classList.add('d-none');
            break;

            case getInteractiveDialogueState():
            getElements().menu.classList.remove('d-flex');
            getElements().menu.classList.add('d-none');
            getElements().buttonRow.classList.remove('d-none');
            getElements().buttonRow.classList.add('d-flex');
            getElements().canvasContainer.classList.remove('d-none');
            getElements().canvasContainer.classList.add('d-flex');
            getElements().returnToMenuButton.classList.remove('d-none');
            getElements().returnToMenuButton.classList.add('d-flex');
            getElements().returnToMenuButton.innerHTML = `${localize('menuTitle', getLanguage(), 'ui')}`;

            // Hide the verbs and inventory container
            getElements().verbsInventoryContainer.classList.add('d-none');
            getElements().verbsInventoryContainer.classList.remove('d-flex');

            // Show the dialogue container
            getElements().dialogueContainer.classList.remove('d-none');
            getElements().dialogueContainer.classList.add('d-flex');
            break;

        default:
            console.log("Unknown game state");
            break;
    }
}