import { localize } from './localization.js';
import { getCanvasCellWidth, getCanvasCellHeight, setCanvasCellWidth, setCanvasCellHeight, setGridTargetX, setGridTargetY, setPlayerObject, setTargetX, setTargetY, getTargetX, getTargetY, setGameStateVariable, getBeginGameStatus, getMaxAttemptsToDrawEnemies, getPlayerObject, getMenuState, getGameVisibleActive, getNumberOfEnemySquares, getElements, getLanguage, getGameInProgress, gameState, getGridData, getHoverCell, getGridSizeX, getGridSizeY, getWalkSpeedPlayer} from './constantsAndGlobalVars.js';
import { aStarPathfinding } from './pathFinding.js';
import { handleMouseMove } from './ui.js';

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

        // Redraw the grid based on current hover state
        const cellValue = getGridData()[getHoverCell().y] && getGridData()[getHoverCell().y][getHoverCell().x];
        const walkable = (cellValue === 'walkable');

        drawGrid(ctx, getCanvasCellWidth(), getCanvasCellHeight(), getHoverCell().x, getHoverCell().y, walkable);

        if (!getBeginGameStatus()) {
            movePlayerTowardsTarget();
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
    const originalWidth = player.originalWidth;
    const originalHeight = player.originalHeight;
    const currentRow = Math.floor(player.yPos / getCanvasCellHeight());

    let targetX, targetY;

    // Calculate scale factor based on the current row
    const maxRow = 59; // Define the maximum row
    const minRow = 6; // Define the minimum row
    let scaleFactor = 1;

     // Calculate scale factor proportionally between maxRow and minRow
     if (currentRow === minRow) {
        scaleFactor = 0.4; // 60% reduction
    } else if (currentRow >= maxRow - 6) {
        scaleFactor = 1; // Original size
    } else {
        scaleFactor = 1 - ((maxRow - currentRow) / (maxRow - minRow)) * 0.7; // Scale proportionally
    }

    // Update player dimensions
    const newWidth = originalWidth * scaleFactor;
    const newHeight = originalHeight * scaleFactor;

    console.log("New Width: " + newWidth + " New Height: " + newHeight);

    // Update player object properties using setPlayerObject
    setPlayerObject('width', newWidth);
    setPlayerObject('height', newHeight);

    // Check if there's a valid target in the path
    if (currentPath.length > 0 && currentPathIndex < currentPath.length) {
        targetX = currentPath[currentPathIndex].x * gridSizeX;
        targetY = currentPath[currentPathIndex].y * gridSizeY - player.height; // Adjust for height
    } else {
        return; // No valid path
    }

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

    // Check if reached the current target
    if (Math.abs(player.xPos - targetX) < speed && Math.abs(player.yPos - targetY) < speed) {
        currentPathIndex++; // Move to the next target in the path

        // If we reach the end of the path, stop moving or reset the path
        if (currentPathIndex < currentPath.length) {
            const nextStep = currentPath[currentPathIndex];
            setTargetX(nextStep.x * gridSizeX);
            setTargetY(nextStep.y * gridSizeY - player.height); // Adjust for height
        }
    }

    // Update player object with new position
    setPlayerObject('xPos', player.xPos);
    setPlayerObject('yPos', player.yPos);
}

export function drawGrid() {
    let showGrid = true; //DEBUG: false to hide grid
    if (showGrid) {
        const canvas = getElements().canvas;
    const context = canvas.getContext('2d');
    const gridSizeX = getGridSizeX();
    const gridSizeY = getGridSizeY();
    const cellWidth = getCanvasCellWidth();
    const cellHeight = getCanvasCellHeight();

    // Clear the canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the grid
    for (let x = 0; x < gridSizeX; x++) {
        for (let y = 0; y < gridSizeY; y++) {
            context.strokeStyle = '#000';
            context.strokeRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
        }
    }

    // Draw the hover cell
    const hoverCell = getHoverCell(); // Assuming getHoverCell() returns {x, y}
    const gridData = getGridData();
    if (hoverCell) {
        const cellValue = gridData[hoverCell.y][hoverCell.x];
        
        if (cellValue === 'walkable') {
            context.fillStyle = 'rgba(0, 255, 0, 0.5)';  // Semi-transparent green for walkable cell
        } else {
            context.fillStyle = 'rgba(255, 0, 0, 0.5)';  // Semi-transparent red for non-walkable cell
        }
        
        context.fillRect(hoverCell.x * cellWidth, hoverCell.y * cellHeight, cellWidth, cellHeight);
    }

    // Draw the path as filled rectangles instead of lines
    if (currentPath.length > 0) {
        context.fillStyle = 'rgba(0, 0, 255, 0.5)';  // Semi-transparent blue for path

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
    } while (getGridData()[gridY] && getGridData()[gridY][gridX] !== 'walkable');

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

function setGridRefAsNonWalkable(gridX, gridY) {
    const gridData = getGridData();
    if (gridX >= 0 && gridY >= 0 && gridY < gridData.length && gridX < gridData[gridY].length) {
        gridData[gridY][gridX] = 'non_walkable';
        console.log("grid ref set to non walkable: " + gridData[gridY][gridX]);
    }
}


export function updateCursor(event) {
    const canvas = getElements().canvas;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    let isHoveringOverEnemy = false;

    for (const square of enemySquares) {
        if (mouseX >= square.x && mouseX <= square.x + square.width &&
            mouseY >= square.y && mouseY <= square.y + square.height) {
            isHoveringOverEnemy = true;
            break;
        }
    }

    if (isHoveringOverEnemy) {
        canvas.style.cursor = 'default';
    } else {
        canvas.style.cursor = 'pointer';
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

export function processClickPoint(event) {
    const canvas = getElements().canvas;
    const player = getPlayerObject();

    const rect = canvas.getBoundingClientRect();
    const clickX = event.x - rect.left;
    const clickY = event.y - rect.top;

    const gridX = getHoverCell().x;
    const gridY = getHoverCell().y;

    setGridTargetX(gridX);
    setGridTargetY(gridY);

    // Calculate the path using A* algorithm
    const path = aStarPathfinding(
        { x: Math.floor(player.xPos / getCanvasCellWidth()), y: Math.floor(player.yPos / getCanvasCellHeight()) },
        { x: gridX, y: gridY },
        getGridData()
    );

    // Update the path and reset the index
    currentPath = path;
    currentPathIndex = 0; // Reset index for new path

    // Immediately set the first target if the path is valid
    if (currentPath.length > 0) {
        const nextStep = currentPath[0];
        setTargetX(nextStep.x * getCanvasCellWidth());
        setTargetY(nextStep.y * getCanvasCellHeight() + player.height); // Adjust for height
    }

    console.log(`Path: ${JSON.stringify(path)}`);
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
