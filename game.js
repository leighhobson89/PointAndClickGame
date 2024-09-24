import { localize } from './localization.js';
import { getCurrentlyMoving, setCurrentlyMoving, getNextScreenId, getPreviousScreenId, setPreviousScreenId, getGridTargetX, getGridTargetY, getNavigationData, getCurrentScreenId, setCurrentScreenId, setExitNumberToTransitionTo, getExitNumberToTransitionTo, getTransitioningToAnotherScreen, getCanvasCellWidth, getCanvasCellHeight, setCanvasCellWidth, setCanvasCellHeight, setGridTargetX, setGridTargetY, setPlayerObject, setTargetX, setTargetY, getTargetX, getTargetY, setGameStateVariable, getBeginGameStatus, getMaxAttemptsToDrawEnemies, getPlayerObject, getMenuState, getGameVisibleActive, getNumberOfEnemySquares, getElements, getLanguage, getGameInProgress, gameState, getGridData, getHoverCell, getGridSizeX, getGridSizeY, setTransitioningToAnotherScreen, getTransitioningNow, setTransitioningNow, setNextScreenId, getZPosHover, setZPosHover} from './constantsAndGlobalVars.js';
import { teleportToNearestWalkable, aStarPathfinding } from './pathFinding.js';
import { updateInteractionInfo, animateTransitionAndChangeBackground as changeBackground, handleMouseMove } from './ui.js';

export const enemySquares = [];
let currentPath = [];
let currentPathIndex = 0;

//--------------------------------------------------------------------------------------------------------

export function startGame() {
    initializeCanvas();
    initializePlayerPosition(5,59); //update this when we have a constant and call this on every new screen later
    //initializeEnemySquares();
    gameLoop();
}

export function gameLoop() {
    const ctx = getElements().canvas.getContext('2d');

    if (gameState === getGameVisibleActive()) {
        ctx.clearRect(0, 0, getElements().canvas.width, getElements().canvas.height);

        // DEBUG
        const cellValue = getGridData().gridData[getHoverCell().y] && getGridData().gridData[getHoverCell().y][getHoverCell().x];
        const walkable = (cellValue.includes('e') || cellValue.includes('w'));
        drawGrid(ctx, getCanvasCellWidth(), getCanvasCellHeight(), getHoverCell().x, getHoverCell().y, walkable);
        //

        if (!getCurrentlyMoving()) {
            teleportToNearestWalkable({ x: Math.floor(getPlayerObject().xPos / getCanvasCellWidth()), y: Math.floor(getPlayerObject().yPos / getCanvasCellHeight()) });
        }

        if (!getBeginGameStatus()) {
            movePlayerTowardsTarget();
            checkAndChangeScreen();
        }

        checkPlayerEnemyCollisions();
        drawObject(ctx, getPlayerObject());

        enemySquares.forEach(square => {
            drawEnemySquare(ctx, square.xPos, square.yPos, square.width, square.height);
        });

        requestAnimationFrame(gameLoop);
    }
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
        const previousScreenId = getPreviousScreenId();
        const finalPosition = getNavigationData()[getPreviousScreenId()].exits[exit].finalPosition;
        
        /*console.log("CurrentScreenId: " + getCurrentScreenId() + 
                    ", PreviousScreenId: " + previousScreenId + 
                    ", playerOffsetX: " + playerOffsetX + 
                    ", playerOffsetY: " + playerOffsetY + 
                    ", finalPositionX: " + finalPosition.x + 
                    ", finalPositionY: " + finalPosition.y + 
                    ", Offset Difference X: " + (finalPosition.x - playerOffsetX) + 
                    ", Offset Difference Y: " + (finalPosition.y - playerOffsetY));
                    */
        
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
            setCurrentlyMoving(false);
            console.log("Stopped moving!");
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

    if (!cellValue.includes('w')) {
        return;
    }
    
    const zPosString = extractWValue(cellValue);
    const zPos = parseInt(zPosString, 10);

    // Define size limits
    const furthestZPos = 100;
    const nearestZPos = 255;
    const originalWidth = player.originalWidth;
    const originalHeight = player.originalHeight;

    // Calculate scale factor based on zPos
    const scaleFactor = (zPos - furthestZPos) / (nearestZPos - furthestZPos);
    const clampedScaleFactor = Math.min(Math.max(scaleFactor, 0), 1);

    // Calculate new width and height
    const newWidth = originalWidth * (0.1 + clampedScaleFactor * 0.9); // Scale from 10% to 100%
    const newHeight = originalHeight * (0.1 + clampedScaleFactor * 0.9); // Same scaling for height

    // Calculate size difference
    const widthDifference = newWidth - player.width;
    const heightDifference = newHeight - player.height;

    // Move the player to accommodate the new size
    setPlayerObject('xPos', player.xPos - widthDifference);
    setPlayerObject('yPos', player.yPos - heightDifference);

    //console.log("Moving Player: xPos: " + player.xPos + ", yPos: " + player.yPos);

    // Set new dimensions for the player object
    setPlayerObject('width', newWidth);
    setPlayerObject('height', newHeight);
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
        
        if (cellValue.includes('w')) {
            setZPosHover(extractWValue(gridData.gridData[hoverCell.y][hoverCell.x]));
            context.fillStyle = `rgba(0, ${getZPosHover()}, 0, 0.5)`; 
        } else if (cellValue.includes('e')) {
            context.fillStyle = 'rgba(255, 255, 0, 0.5)';
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

export function initializeCanvas() {
    const canvas = getElements().canvas;
    const ctx = canvas.getContext('2d');
    const container = getElements().canvasContainer;

    function updateCanvasSize() {
        const canvas = getElements().canvas;
        const ctx = canvas.getContext('2d');
        const container = getElements().canvasContainer;
    
        // Calculate canvas dimensions
        const viewportHeight = window.innerHeight;
        const bottomContainerHeight = document.getElementById('bottomContainer')?.offsetHeight || 0;
        const canvasHeight = viewportHeight - bottomContainerHeight;
        const canvasWidth = container.clientWidth * 0.95;
    
        // Apply canvas sizing
        container.style.width = '100%';
        container.style.height = `${canvasHeight}px`;
    
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        canvas.style.backgroundSize = `${canvasWidth}px ${canvasHeight}px`;

        const oldCellWidth = getCanvasCellWidth();
        const oldCellHeight = getCanvasCellHeight();
        
        // Update grid size
        const newCellWidth = canvasWidth / getGridSizeX();
        const newCellHeight = canvasHeight / getGridSizeY();
        setCanvasCellWidth(newCellWidth);
        setCanvasCellHeight(newCellHeight);

        // Update player position based on new grid size
        const player = getPlayerObject();
        player.xPos = (player.xPos / oldCellWidth) * newCellWidth;
        player.yPos = (player.yPos / oldCellHeight) * newCellHeight;
    
        // Update the player object's properties
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

function generateRandomGridSquare() {
    let gridX, gridY, cellWidth, cellHeight;

    do {
        gridX = Math.floor(Math.random() * getGridSizeX());
        gridY = Math.floor(Math.random() * getGridSizeY());
        cellWidth = getCanvasCellWidth();
        cellHeight = getCanvasCellHeight();
    } while (!getGridData()[gridY] && getGridData()[gridY][gridX].includes('w'));

    return {
        xPos: gridX * cellWidth,
        yPos: gridY * cellHeight,
        width: cellWidth,
        height: cellHeight
    };
}

function initializeEnemySquares() {
    enemySquares.length = 0;
    let attempts = 0;

    while (enemySquares.length < getNumberOfEnemySquares() && attempts < getMaxAttemptsToDrawEnemies()) {
        const newSquare = generateRandomGridSquare();

        if (!enemySquares.some(square => checkCollision(newSquare, square)) &&
            !checkCollision(newSquare, getPlayerObject())) {
            enemySquares.push(newSquare);

            const gridX = Math.floor(newSquare.xPos / getCanvasCellWidth());
            const gridY = Math.floor(newSquare.yPos / getCanvasCellHeight());

            setGridRefAsNonWalkable(gridX, gridY);
        }

        attempts++;
    }

    if (attempts >= getMaxAttemptsToDrawEnemies()) {
        console.warn(`Could not place all ${getNumberOfEnemySquares()} squares. Only ${enemySquares.length} squares were placed due to overlap constraints.`);
    }
}

function setGridRefAsNonWalkable(gridX, gridY) { //for adding dynamic obstacles in game after loading for pathfinding to avoid
    const gridData = getGridData(); 
    if (gridX >= 0 && gridY >= 0 && gridY < gridData.length && gridX < gridData[gridY].length) {
        gridData[gridY][gridX] = 'n';
        console.log("grid ref set to non walkable: " + gridData[gridY][gridX]);
    }
}

function generateRandomSquare() {
    const size = 20;
    const x = Math.random() * (getElements().canvas.width - size);
    const y = Math.random() * (getElements().canvas.height - size);
    return { x, y, width: size, height: size };
}

function drawObject(ctx, object) {
    ctx.fillStyle = object.color;
    ctx.fillRect(object.xPos, object.yPos, object.width, object.height);
}

function drawEnemySquare(ctx, x, y, width, height) {
    ctx.fillStyle = 'yellow';
    ctx.fillRect(x, y, width, height);
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

function checkCollision(rect1, rect2) {
    const isCollision = !(rect1.xPos + rect1.width < rect2.xPos ||
                          rect1.xPos > rect2.xPos + rect2.width ||
                          rect1.yPos + rect1.height < rect2.yPos ||
                          rect1.yPos > rect2.yPos + rect2.height);
    return isCollision;
}

function checkPlayerEnemyCollisions() {
    enemySquares.forEach(square => {
        if (checkCollision(getPlayerObject(), square)) {
            resolveCollision(getPlayerObject(), square);
        }
    });
}

function resolveCollision(player, square) {
    const rectCenterX = player.xPos + player.width / 2;
    const rectCenterY = player.yPos + player.height / 2;
    const squareCenterX = square.x + square.width / 2;
    const squareCenterY = square.y + square.height / 2;

    const dx = rectCenterX - squareCenterX;
    const dy = rectCenterY - squareCenterY;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
            player.xPos = square.x + square.width;
        } else {
            player.xPos = square.x - player.width;
        }
    } else {
        if (dy > 0) {
            player.yPos = square.y + square.height;
        } else {
            player.yPos = square.y - player.height;
        }
    }
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

    if (currentPath.length > 0) {
        setCurrentlyMoving(true);
        console.log("Started Moving...");
        updateInteractionInfo("Walking");
        const cellValue = getGridData().gridData[getGridTargetY()] && getGridData().gridData[getGridTargetY()][getGridTargetX()];
        if (cellValue && cellValue.startsWith('e')) { 
            const exitNumberMatch = cellValue.match(/e(\d+)/);
            if (exitNumberMatch) {
                const exitNumber = exitNumberMatch[1];
                const exitData = getNavigationData()[getCurrentScreenId()].exits[`e${exitNumber}`];
                console.log("Exit number:", exitNumber);
                setTransitioningToAnotherScreen(true);
                setExitNumberToTransitionTo(exitNumber);
                setNextScreenId(exitData.connectsTo);
                console.log("on way to " + getNextScreenId());
            }
        }
        const nextStep = currentPath[0];
        setTargetX(nextStep.x * getCanvasCellWidth());
        setTargetY(nextStep.y * getCanvasCellHeight() + player.height);
    }

    console.log(`Path: ${JSON.stringify(path)}`);
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

            if (getGridTargetX() === checkX && getGridTargetY() === checkY && gridData.gridData[checkY] && gridData.gridData[checkY][checkX].includes('e') && gridData.gridData[checkY][checkX].includes(getExitNumberToTransitionTo())) {
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

    if (typeof value === 'string' && value.includes('w')) {
        const matches = value.match(/w(\d{1,3})/);
        if (matches && matches[1]) {
            return matches[1];
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
                getElements().copyButtonSavePopup.innerHTML = `${localize('copyButton', getLanguage())}`;
                getElements().closeButtonSavePopup.innerHTML = `${localize('closeButton', getLanguage())}`;
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
            getElements().returnToMenuButton.innerHTML = `${localize('menuTitle', getLanguage())}`;

            // Set verb buttons
            getElements().btnLookAt.innerHTML = `${localize('verbLookAt', getLanguage())}`;
            getElements().btnPickUp.innerHTML = `${localize('verbPickUp', getLanguage())}`;
            getElements().btnUse.innerHTML = `${localize('verbUse', getLanguage())}`;
            getElements().btnOpen.innerHTML = `${localize('verbOpen', getLanguage())}`;
            getElements().btnClose.innerHTML = `${localize('verbClose', getLanguage())}`;
            getElements().btnPush.innerHTML = `${localize('verbPush', getLanguage())}`;
            getElements().btnPull.innerHTML = `${localize('verbPull', getLanguage())}`;
            getElements().btnTalkTo.innerHTML = `${localize('verbTalkTo', getLanguage())}`;
            getElements().btnGive.innerHTML = `${localize('verbGive', getLanguage())}`;
            break;
    }
}
