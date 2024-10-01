import { getCurrentSpeaker, getCurrentYposNpc, getNpcData, getSecondItemAlreadyHovered, getObjectToBeUsedWithSecondItem, getWaitingForSecondItem, getDisplayText, gameState, getAllGridData, getBeginGameStatus, getCanvasCellHeight, getCanvasCellWidth, getCurrentlyMoving, getCurrentScreenId, getCustomMouseCursor, getElements, getExitNumberToTransitionTo, getGameInProgress, getGameVisibleActive, getGridData, getGridSizeX, getGridSizeY, getGridTargetX, getGridTargetY, getHoverCell, getInitialStartGridReference, getLanguage, getMenuState, getNavigationData, getNextScreenId, getObjectData, getOriginalValueInCellWhereObjectOrNpcPlaced, getPlayerObject, getPreviousScreenId, getTransitioningNow, getTransitioningToAnotherScreen, getUpcomingAction, getVerbButtonConstructionStatus, getZPosHover, setCanvasCellHeight, setCanvasCellWidth, setCurrentlyMoving, setCurrentlyMovingToAction, setCustomMouseCursor, setExitNumberToTransitionTo, setGameStateVariable, setGridTargetX, setGridTargetY, setNextScreenId, setOriginalValueInCellWhereObjectOrNpcPlaced, setPlayerObject, setTargetX, setTargetY, setTransitioningNow, setTransitioningToAnotherScreen, setUpcomingAction, setVerbButtonConstructionStatus, setZPosHover, getHoveringInterestingObjectOrExit, getIsDisplayingText, getGameStateVariable, getCurrentXposNpc } from './constantsAndGlobalVars.js';
import { localize } from './localization.js';
import { aStarPathfinding, findAndMoveToNearestWalkable } from './pathFinding.js';
import { performCommand, parseCommand } from './handleCommands.js';
import { handleMouseMove, returnHoveredInterestingObjectOrExitName, updateInteractionInfo, drawTextOnCanvas, animateTransitionAndChangeBackground as changeBackground } from './ui.js';

let currentPath = [];
let currentPathIndex = 0;

//--------------------------------------------------------------------------------------------------------

export function startGame() {
    initializeCanvas();
    setUpObjects();
    initializePlayerPosition(getInitialStartGridReference().x, getInitialStartGridReference().y);
    gameLoop();
}

export function gameLoop() {
    const ctx = getElements().canvas.getContext('2d');

    ctx.clearRect(0, 0, getElements().canvas.width, getElements().canvas.height);

    // DEBUG
    const cellValue = getGridData().gridData[getHoverCell().y] && getGridData().gridData[getHoverCell().y][getHoverCell().x];
    const walkable = (cellValue.startsWith('e') || cellValue.startsWith('w'));
    drawGrid(ctx, getCanvasCellWidth(), getCanvasCellHeight(), getHoverCell().x, getHoverCell().y, walkable);
    //

    if (getGameStateVariable() === getGameVisibleActive()) {
        if (!getCurrentlyMoving() && getBeginGameStatus()) {
            findAndMoveToNearestWalkable({ x: Math.floor(getPlayerObject().xPos / getCanvasCellWidth()), y: Math.floor(getPlayerObject().yPos / getCanvasCellHeight()) }, { x: Math.floor(getPlayerObject().xPos / getCanvasCellWidth()), y: Math.floor(getPlayerObject().yPos / getCanvasCellHeight()) }, true);
        }

        if (!getBeginGameStatus()) {
            movePlayerTowardsTarget();
            checkAndChangeScreen();
        }
    }

    drawPlayerNpcsAndObjects(ctx);

    if (getDisplayText().value1) {
        drawTextOnCanvas(getDisplayText().value1, getDisplayText().value2, getCurrentXposNpc(), getCurrentYposNpc(), getCurrentSpeaker());
    }

    requestAnimationFrame(gameLoop);
}

function movePlayerTowardsTarget() {
    const speed = getPlayerObject().speed;
    const player = getPlayerObject();
    const gridSizeX = getCanvasCellWidth();
    const gridSizeY = getCanvasCellHeight();

    const playerGridX = Math.floor(getPlayerObject().xPos / getCanvasCellWidth());
    const playerGridY = Math.floor(getPlayerObject().yPos / getCanvasCellHeight());

    const playerOffsetX = Math.floor(playerGridX + ((getPlayerObject().width / 2) / getCanvasCellWidth()));
    const playerOffsetY = Math.floor(playerGridY + getPlayerObject().height / getCanvasCellHeight());

    let targetX, targetY;

    if (getTransitioningNow()) {
        const exit = 'e' + getExitNumberToTransitionTo();
        const finalPosition = getNavigationData()[getPreviousScreenId()].exits[exit].finalPosition;        
        const tolerance = 3;

    if (Math.abs(playerOffsetX - finalPosition.x) <= tolerance && 
        Math.abs(playerOffsetY - finalPosition.y) <= tolerance) {
        currentPath = [];
        currentPathIndex = 0;
        setTransitioningNow(false);
        resizePlayerObject();
        getElements().customCursor.classList.remove('d-none');
        canvas.style.pointerEvents = 'auto';
        console.log("reached final position end of transition, transitioningNow: " + getTransitioningNow());
        }
    }

    if (currentPath.length > 0 && currentPathIndex < currentPath.length) {
        targetX = currentPath[currentPathIndex].x * gridSizeX;
        targetY = currentPath[currentPathIndex].y * gridSizeY - player.height;
    } else {
        return;
    }

    let collisionEdgeCanvas = checkEdgeCollision(player, targetX);
    if (collisionEdgeCanvas) return;

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

    if (Math.abs(player.xPos - targetX) < speed && Math.abs(player.yPos - targetY) < speed) {
        currentPathIndex++;

        if (currentPathIndex < currentPath.length) {
            const nextStep = currentPath[currentPathIndex];
            setTargetX(nextStep.x * gridSizeX);
            setTargetY(nextStep.y * gridSizeY - player.height);
        } else {
            console.log("waiting for second item: " + getWaitingForSecondItem());
            console.log("second item already hovered: " + getSecondItemAlreadyHovered());
            console.log("object to be used with second item: " + getObjectToBeUsedWithSecondItem());
            console.log("upcoming action: " + getUpcomingAction());
            console.log("verb conbstruciton status: " + getVerbButtonConstructionStatus());

            const commandToPerform = parseCommand(getUpcomingAction());
            console.log("command: " + commandToPerform);
            performCommand(commandToPerform, false); //we presume neither are inventory item if player moves // CHECK IF BUGS

            setCurrentlyMovingToAction(false);
            setCurrentlyMoving(false);
            if (getVerbButtonConstructionStatus() === 'interactionWalkTo') {
                updateInteractionInfo(localize('interactionWalkTo', getLanguage(), 'verbsActionsInteraction'), false);
            }
        }
    }

    resizePlayerObject(player);

    setPlayerObject('xPos', player.xPos);
    setPlayerObject('yPos', player.yPos);
}

export function resizePlayerObject() {
    const player = getPlayerObject(); 
    const gridData = getGridData();

    const playerGridX = Math.floor(player.xPos / getCanvasCellWidth());
    const playerGridY = Math.floor(player.yPos / getCanvasCellHeight());

    const playerOffsetX = Math.floor(playerGridX + ((player.width / 2) / getCanvasCellWidth()));
    const playerOffsetY = Math.floor(playerGridY + player.height / getCanvasCellHeight());

    const cellValue = gridData.gridData[playerOffsetY + 1][playerOffsetX];// +1 to fix reading wrong cell due to rounding
    
    let zPosStringW;
    let zPosW;
    let zPosStringB;
    let zPosB;

    if (!cellValue.startsWith('w') && !cellValue.startsWith('b')) {
        return;
    }
    
    if (cellValue.startsWith('w')) {
        zPosStringW = extractWValue(cellValue);
        zPosW = parseInt(zPosStringW, 10);
    } else if (cellValue.startsWith('b')) {
        zPosStringB = extractBValue(cellValue);
        zPosB = parseInt(zPosStringB, 10);
    }

    // Define size limits
    const furthestZPos = 100;
    const nearestZPos = 255;
    const originalWidth = player.originalWidth;
    const originalHeight = player.originalHeight;

    if (cellValue.startsWith('w')) {
        const scaleFactorW = (zPosW - furthestZPos) / (nearestZPos - furthestZPos);
        const clampedScaleFactorW = Math.min(Math.max(scaleFactorW, 0), 1);
        const newWidthW = originalWidth * (0.1 + clampedScaleFactorW * 0.9);
        const newHeightW = originalHeight * (0.1 + clampedScaleFactorW * 0.9);
        const widthDifference = newWidthW - player.width;
        const heightDifference = newHeightW - player.height;
        setPlayerObject('xPos', player.xPos - widthDifference);
        setPlayerObject('yPos', player.yPos - heightDifference);
        setPlayerObject('width', newWidthW);
        setPlayerObject('height', newHeightW);
    } else if (cellValue.startsWith('b')) {
        const scaleFactorB = (zPosB - furthestZPos) / (nearestZPos - furthestZPos);
        const clampedScaleFactorB = Math.min(Math.max(scaleFactorB, 0), 1);
        const newWidthB = originalWidth * (0.1 + clampedScaleFactorB * 0.9);
        const newHeightB = originalHeight * (0.1 + clampedScaleFactorB * 0.9);
        const widthDifference = newWidthB - player.width;
        const heightDifference = newHeightB - player.height;
        setPlayerObject('xPos', player.xPos - widthDifference);
        setPlayerObject('yPos', player.yPos - heightDifference);
        setPlayerObject('width', newWidthB);
        setPlayerObject('height', newHeightB);
    }
}

export function drawGrid() {
    let showGrid = false; //DEBUG: false to hide grid
    if (showGrid) {
        const canvas = getElements().canvas;
    const context = canvas.getContext('2d');
    const gridSizeX = getGridSizeX();
    const gridSizeY = getGridSizeY();
    const cellWidth = getCanvasCellWidth();
    const cellHeight = getCanvasCellHeight();

    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let x = 0; x < gridSizeX; x++) {
        for (let y = 0; y < gridSizeY; y++) {
            context.strokeStyle = '#000';
            context.strokeRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
        }
    }

    // Draw Player position grid square
    //const playerGridX = Math.floor(getPlayerObject().xPos / getCanvasCellWidth());
    //const playerGridY = Math.floor(getPlayerObject().yPos / getCanvasCellHeight());

    //const playerOffsetX = playerGridX + ((getPlayerObject().width / 2) / getCanvasCellWidth());
    //const playerOffsetY = playerGridY + getPlayerObject().height / getCanvasCellHeight();

    //context.fillStyle = 'rgba(255, 0, 255, 0.5)';  // Semi-transparent purple for walkable cell
    //context.fillRect(playerOffsetX * cellWidth, playerOffsetY * cellHeight, cellWidth, cellHeight);

    const hoverCell = getHoverCell();
    const gridData = getGridData();
    if (hoverCell) {
        const cellValue = gridData.gridData[hoverCell.y][hoverCell.x];
        
        if (cellValue.startsWith('w')) {
            setZPosHover(extractWValue(gridData.gridData[hoverCell.y][hoverCell.x]));
            context.fillStyle = `rgba(0, ${getZPosHover()}, 0, 0.5)`; 
        } else if (cellValue.startsWith('e')) {
            context.fillStyle = 'rgba(255, 255, 0, 0.5)'; //exit
        } else if (cellValue.startsWith('o')) {
            context.fillStyle = 'rgba(255, 0, 255, 0.5)'; //object
        } else if (cellValue.startsWith('c')) {
            context.fillStyle = 'rgba(0, 0, 255, 0.5)'; //npc
        }if (cellValue.startsWith('b')) {
            setZPosHover(extractBValue(gridData.gridData[hoverCell.y][hoverCell.x]));
            context.fillStyle = `rgba(100, 0, ${getZPosHover()}, 0.5)`; 
        } else {
            context.fillStyle = 'rgba(255, 0, 0, 0.5)';
        }        
        
        context.fillRect(hoverCell.x * cellWidth, hoverCell.y * cellHeight, cellWidth, cellHeight);
    }

    if (currentPath.length > 0) {
        context.fillStyle = 'rgba(0, 0, 255, 0.5)';

        for (const step of currentPath) {
            context.fillRect(step.x * cellWidth, step.y * cellHeight, cellWidth, cellHeight);
        }
    }
    }
}

export function drawPlayerNpcsAndObjects(ctx) {
    const player = getPlayerObject();
    const npcData = getNpcData().npcs;
    const objectsData = getObjectData().objects;
    const gridData = getGridData().gridData;
    const cellWidth = getCanvasCellWidth();
    const cellHeight = getCanvasCellHeight();
    const drawnObjects = new Set();
    const drawnNpcs = new Set();

    const baseCellWidth = 15;  // coefficients DO NOT TOUCH, change json dimensions and offset only
    const baseCellHeight = 5;  // coefficients DO NOT TOUCH, change json dimensions and offset only

    // Draw objects and NPCs
    for (let y = 0; y < gridData.length; y++) {
        for (let x = 0; x < gridData[y].length; x++) {
            const cellValue = gridData[y][x];

            if (cellValue.startsWith('o')) {
                const objectId = cellValue.substring(1);

                if (drawnObjects.has(objectId)) {
                    continue;
                }

                const object = objectsData[objectId];

                if (object && object.objectPlacementLocation === getCurrentScreenId()) {
                    const { visualPosition, dimensions, spriteUrl, offset } = object;

                    const drawX = visualPosition.x + (offset.x || 0);
                    const drawY = visualPosition.y + (offset.y || 0);

                    const scaledWidth = (dimensions.width * (cellWidth / baseCellWidth));
                    const scaledHeight = (dimensions.height * (cellHeight / baseCellHeight));

                    const img = new Image();
                    img.src = spriteUrl;

                    ctx.drawImage(img, drawX, drawY, scaledWidth, scaledHeight);

                    drawnObjects.add(objectId);
                }
            }

            if (cellValue.startsWith('c')) {
                const npcId = cellValue.substring(1);

                if (drawnNpcs.has(npcId)) {
                    continue;
                }

                const npc = npcData[npcId];

                if (npc && npc.npcPlacementLocation === getCurrentScreenId()) {
                    const { visualPosition, dimensions, spriteUrl, offset } = npc;

                    const drawX = visualPosition.x + (offset.x || 0);
                    const drawY = visualPosition.y + (offset.y || 0);

                    const scaledWidth = (dimensions.width * (cellWidth / baseCellWidth));
                    const scaledHeight = (dimensions.height * (cellHeight / baseCellHeight));

                    const img = new Image();
                    img.src = spriteUrl;

                    ctx.drawImage(img, drawX, drawY, scaledWidth, scaledHeight);

                    drawnNpcs.add(npcId);
                }
            }
        }
    }

    // Player drawing with pixel precision
    const playerXStart = player.xPos;
    const playerYStart = player.yPos;
    const playerWidth = player.width;
    const playerHeight = player.height;

    // Loop through each pixel row and column of the player's bounding box
    for (let px = 0; px < playerWidth; px++) {
        for (let py = 0; py < playerHeight; py++) {
            const playerPixelX = playerXStart + px;
            const playerPixelY = playerYStart + py;

            // Calculate which grid cell this pixel corresponds to
            const gridX = Math.floor(playerPixelX / cellWidth);
            const gridY = Math.floor(playerPixelY / cellHeight);

            // Check if the grid cell is within bounds and if it's not marked 'b'
            if (gridY >= 0 && gridY < gridData.length && gridX >= 0 && gridX < gridData[0].length) {
                if (gridData[gridY][gridX] !== 'b') {
                    // Draw this pixel if it's not overlapping a 'b' cell
                    ctx.fillStyle = player.color;
                    ctx.fillRect(playerPixelX, playerPixelY, 1, 1);
                }
            }
        }
    }
}


export function initializeCanvas() {
    const canvas = getElements().canvas;
    const ctx = canvas.getContext('2d');
    const container = getElements().canvasContainer;

    function updateCanvasSize() {
        const canvas = getElements().canvas;
        const ctx = canvas.getContext('2d');
        const container = getElements().canvasContainer;

        const viewportHeight = window.innerHeight;
        const bottomContainerHeight = document.getElementById('bottomContainer')?.offsetHeight || 0;
        const canvasHeight = viewportHeight - bottomContainerHeight;
        const canvasWidth = container.clientWidth;

        container.style.width = '100%';
        container.style.height = `${canvasHeight}px`;
    
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        canvas.style.backgroundSize = `${canvasWidth}px ${canvasHeight}px`;

        const oldCellWidth = getCanvasCellWidth();
        const oldCellHeight = getCanvasCellHeight();

        const newCellWidth = canvasWidth / getGridSizeX();
        const newCellHeight = canvasHeight / getGridSizeY();
        setCanvasCellWidth(newCellWidth);
        setCanvasCellHeight(newCellHeight);

        const player = getPlayerObject();
        player.xPos = (player.xPos / oldCellWidth) * newCellWidth;
        player.yPos = (player.yPos / oldCellHeight) * newCellHeight;

        setPlayerObject('xPos', player.xPos);
        setPlayerObject('yPos', player.yPos);
    
        drawGrid(ctx, newCellWidth, newCellHeight, getHoverCell().x, getHoverCell().y);
    }    

    window.addEventListener('load', updateCanvasSize);
    window.addEventListener('resize', updateCanvasSize);

    canvas.addEventListener('mousemove', (event) => handleMouseMove(event, ctx));
    updateCanvasSize();
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

    setTargetX(xPos);
    setTargetY(yPos);

    setPlayerObject(player);

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
        setTargetX(player.xPos);
        setTargetY(player.yPos);
        currentPath = [];
        currentPathIndex = 0;
        return true;
    }
    return false;
}

//-------------------------------------------------------------------------------------------------------------

export function processClickPoint(event, mouseClick) {
    const player = getPlayerObject();
    const gridX = getHoverCell().x;
    const gridY = getHoverCell().y;

    if (mouseClick) {    
        setGridTargetX(gridX);
        setGridTargetY(gridY);
    } else {
        setGridTargetX(event.x);
        setGridTargetY(event.y);
    }

    const path = aStarPathfinding(
        { x: Math.floor(player.xPos / getCanvasCellWidth()), y: Math.floor(player.yPos / getCanvasCellHeight()) },
        { x: getGridTargetX(), y: getGridTargetY() },
        getGridData()
    );

    currentPath = path;
    currentPathIndex = 0;

    setCustomMouseCursor(getCustomMouseCursor('clickInteresting'));

    if (currentPath.length > 0) {
        setCurrentlyMoving(true);
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
                setTransitioningToAnotherScreen(true);
                setExitNumberToTransitionTo(exitNumber);
                setNextScreenId(exitData.connectsTo);
                updateInteractionInfo(localize('interactionWalkingTo', getLanguage(), 'verbsActionsInteraction') + " " + getLocationName(getNextScreenId()), true);
            }
        }

        console.log("verb construction: " + getVerbButtonConstructionStatus());

        if (getVerbButtonConstructionStatus() !== 'interactionWalkTo' && !getWaitingForSecondItem()) {
            const screenName = returnHoveredInterestingObjectOrExitName(cellValue);
            updateInteractionInfo(
                localize(getVerbButtonConstructionStatus(), getLanguage(), 'verbsActionsInteraction') + 
                " " + (screenName ? screenName : ""),
                true
            );
        }
        

        const nextStep = currentPath[0];
        setTargetX(nextStep.x * getCanvasCellWidth());
        setTargetY(nextStep.y * getCanvasCellHeight() + player.height);
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

            if (getGridTargetX() === checkX && getGridTargetY() === checkY && gridData.gridData[checkY] && gridData.gridData[checkY][checkX].startsWith('e') && gridData.gridData[checkY][checkX].includes(getExitNumberToTransitionTo())) {
                console.log("Player is moving to another screen");

                changeBackground();

                setTransitioningToAnotherScreen(false);
                return;
            }
        }
    }
    return; 
}

export function handleRoomTransition() {
    const navigationData = getNavigationData();
    const currentScreenId = getCurrentScreenId();

    const exitNumber = 'e' + getExitNumberToTransitionTo();
    const screenData = navigationData[currentScreenId];

    if (screenData && screenData.exits && screenData.exits[exitNumber]) {
        const newScreenId = screenData.exits[exitNumber].connectsTo;
        currentPath = [];
        currentPathIndex = 0;

        swapBackgroundOnRoomTransition(newScreenId);
        return newScreenId;
    } else {
        console.error("Exit not found for current screen and exit number:", currentScreenId, exitNumber);
    }
}

function swapBackgroundOnRoomTransition(newScreenId) {
    console.log("Loading background for " + newScreenId);
    const navigationData = getNavigationData();

    if (navigationData[newScreenId] && navigationData[newScreenId].bgUrl) {
        const bgUrl = navigationData[newScreenId].bgUrl;

        const canvas = document.querySelector("canvas");
        if (canvas) {
            canvas.style.backgroundImage = `url('${bgUrl}')`;
        } else {
            console.error("Canvas element not found!");
        }
    } else {
        console.error("Screen ID or bgUrl not found in navigation data!");
    }
}

export function extractWValue(value) {

    if (typeof value === 'string' && value.startsWith('w')) {
        const matches = value.match(/w(\d{1,3})/);
        if (matches && matches[1]) {
            return matches[1];
        }
    }

    return null;
}

export function extractBValue(value) {

    if (typeof value === 'string' && value.startsWith('b')) {
        const matches = value.match(/w(\d{1,3})/);
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

export function setUpObjects() { 
    const objectsData = getObjectData();
    const npcsData = getNpcData();
    const gridData = getAllGridData();
    const cellWidth = getCanvasCellWidth();
    const cellHeight = getCanvasCellHeight();

    for (const objectId in objectsData.objects) {
        const object = objectsData.objects[objectId];
        const roomName = object.objectPlacementLocation;
        const roomGridData = gridData[roomName];
        
        if (!roomGridData) {
            console.warn(`No grid found for room: ${roomName}`);
            continue;
        }

        const widthInCells = Math.floor(object.dimensions.width / cellWidth) + 1;
        const heightInCells = Math.floor(object.dimensions.height / cellHeight) + 1;

        const startX = object.gridPosition.x;
        const startY = object.gridPosition.y;

        // Use proportional offsets (as percentages of cell dimensions)
        const offsetX = (object.offset.x || 0) * cellWidth;  // Scaled offset
        const offsetY = (object.offset.y || 0) * cellHeight; // Scaled offset

        for (let x = startX; x < startX + widthInCells; x++) {
            for (let y = startY; y < startY + heightInCells; y++) {
                const originalValue = roomGridData[y][x];
                setOriginalValueInCellWhereObjectOrNpcPlaced(roomName, x, y, objectId, originalValue);
                roomGridData[y][x] = `o${objectId}`;
            }
        }

        const finalX = startX * cellWidth + offsetX;
        const finalY = startY * cellHeight + offsetY;

        object.visualPosition = {
            x: finalX,
            y: finalY
        };

        console.log(`Successfully placed object ${objectId} in room ${roomName} at grid position (${startX}, ${startY}) with pixel position (${finalX}, ${finalY}).`);
    }

    for (const npcId in npcsData.npcs) {
        const npc = npcsData.npcs[npcId];
        const roomName = npc.npcPlacementLocation;
        const roomGridData = gridData[roomName];
        
        if (!roomGridData) {
            console.warn(`No grid found for room: ${roomName}`);
            continue;
        }

        const widthInCells = Math.floor(npc.dimensions.width / cellWidth) + 1;
        const heightInCells = Math.floor(npc.dimensions.height / cellHeight) + 1;

        const startX = npc.gridPosition.x;
        const startY = npc.gridPosition.y;

        for (let x = startX; x < startX + widthInCells; x++) {
            for (let y = startY; y < startY + heightInCells; y++) {
                const originalValue = roomGridData[y][x];
                setOriginalValueInCellWhereObjectOrNpcPlaced(roomName, x, y, npcId, originalValue);

                roomGridData[y][x] = `c${npcId}`;
            }
        }

        console.log("Original Values Npc:");
        console.log(getOriginalValueInCellWhereObjectOrNpcPlaced());

        console.log(`Successfully placed npc ${npcId} in room ${roomName} at grid position (${startX}, ${startY})).`);
    }

    console.log(getAllGridData());
}


//-------------------------------------------------------------------------------------------------------------

export function setGameState(newState) {
    console.log("Setting game state to " + newState);
    setGameStateVariable(newState);

    switch (newState) {
        case getMenuState():
            getElements().menu.classList.remove('d-none');
            getElements().menu.classList.add('d-flex');
            getElements().buttonRow.classList.add('d-none');
            getElements().buttonRow.classList.remove('d-flex');
            getElements().canvasContainer.classList.remove('d-flex');
            getElements().canvasContainer.classList.add('d-none');
            getElements().returnToMenuButton.classList.remove('d-flex');
            getElements().returnToMenuButton.classList.add('d-none');

            // Handle language buttons and localization
            const languageButtons = [getElements().btnEnglish, getElements().btnSpanish, getElements().btnGerman, getElements().btnItalian, getElements().btnFrench];
            languageButtons.forEach(button => {
                button.classList.remove('active');
            });

            const currentLanguage = getLanguage();
            console.log("Language is " + currentLanguage);
            switch (currentLanguage) {
                case 'en':
                    getElements().btnEnglish.classList.add('active');
                    break;
                case 'es':
                    getElements().btnSpanish.classList.add('active');
                    break;
                case 'de':
                    getElements().btnGerman.classList.add('active');
                    break;
                case 'it':
                    getElements().btnItalian.classList.add('active');
                    break;
                case 'fr':
                    getElements().btnFrench.classList.add('active');
                    break;
            }

            if (getGameInProgress()) {
                getElements().copyButtonSavePopup.innerHTML = `${localize('copyButton', getLanguage(), 'ui')}`;
                getElements().closeButtonSavePopup.innerHTML = `${localize('closeButton', getLanguage(), 'ui')}`;
            }
            break;

        case getGameVisibleActive():
            getElements().menu.classList.remove('d-flex');
            getElements().menu.classList.add('d-none');
            getElements().buttonRow.classList.remove('d-none');
            getElements().buttonRow.classList.add('d-flex');
            getElements().canvasContainer.classList.remove('d-none');
            getElements().canvasContainer.classList.add('d-flex');
            getElements().returnToMenuButton.classList.remove('d-none');
            getElements().returnToMenuButton.classList.add('d-flex');

            // Remove the pause/resume button
            // getElements().pauseResumeGameButton.classList.remove('d-flex');
            // getElements().pauseResumeGameButton.classList.add('d-none');

            // Set button labels based on game state
            getElements().returnToMenuButton.innerHTML = `${localize('menuTitle', getLanguage(), 'ui')}`;

            // Set verb buttons
            getElements().btnLookAt.innerHTML = `${localize('verbLookAt', getLanguage(), 'verbsActionsInteraction')}`;
            getElements().btnPickUp.innerHTML = `${localize('verbPickUp', getLanguage(), 'verbsActionsInteraction')}`;
            getElements().btnUse.innerHTML = `${localize('verbUse', getLanguage(), 'verbsActionsInteraction')}`;
            getElements().btnOpen.innerHTML = `${localize('verbOpen', getLanguage(), 'verbsActionsInteraction')}`;
            getElements().btnClose.innerHTML = `${localize('verbClose', getLanguage(), 'verbsActionsInteraction')}`;
            getElements().btnPush.innerHTML = `${localize('verbPush', getLanguage(), 'verbsActionsInteraction')}`;
            getElements().btnPull.innerHTML = `${localize('verbPull', getLanguage(), 'verbsActionsInteraction')}`;
            getElements().btnTalkTo.innerHTML = `${localize('verbTalkTo', getLanguage(), 'verbsActionsInteraction')}`;
            getElements().btnGive.innerHTML = `${localize('verbGive', getLanguage(), 'verbsActionsInteraction')}`;
            break;
            default:
                break;
    } 
}
