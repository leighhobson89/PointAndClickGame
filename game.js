import { localize } from './localization.js';
import { getCanvasCellWidth, getCanvasCellHeight, setCanvasCellWidth, setCanvasCellHeight, getGridTargetX, getGridTargetY, setGridTargetX, setGridTargetY, setPlayerObject, setTargetX, setTargetY, getTargetX, getTargetY, getWalkSpeedPlayer, setGameStateVariable, getBeginGameStatus, getMaxAttemptsToDrawEnemies, getPlayerObject, getMenuState, getGameVisibleActive, getNumberOfEnemySquares, getElements, getLanguage, getGameInProgress, gameState, getInitialScreenId, getCurrentPath, getGridData} from './constantsAndGlobalVars.js';
import { aStarPathfinding } from './pathFinding.js';
export const enemySquares = [];
let hoverCell = { x: null, y: null };

//--------------------------------------------------------------------------------------------------------

export function startGame() {
    initializeCanvas();
    initializePlayerPosition();
    //initializeEnemySquares();
    gameLoop();
}

export function gameLoop() {
    const ctx = getElements().canvas.getContext('2d');
    if (gameState === getGameVisibleActive()) {
        ctx.clearRect(0, 0, getElements().canvas.width, getElements().canvas.height);

        // Redraw the grid based on current hover state
        const cellValue = getGridData()[hoverCell.y] && getGridData()[hoverCell.y][hoverCell.x];
        const walkable = (cellValue === 'walkable');

        drawGrid(ctx, getCanvasCellWidth(), getCanvasCellHeight(), hoverCell.x, hoverCell.y, walkable);

        movePlayerTowardsTarget();
        checkPlayerEnemyCollisions();
        drawObject(ctx, getPlayerObject());

        enemySquares.forEach(square => {
            drawEnemySquare(ctx, square.x, square.y, square.width, square.height);
        });

        requestAnimationFrame(gameLoop);
    }
}


function movePlayerTowardsTarget() {
    const player = getPlayerObject();
    const speed = player.speed;
    const gridSize = getCanvasCellWidth();

    const targetX = getTargetX();
    const targetY = getTargetY();

    if (player.xPos < targetX) {
        player.xPos = Math.min(player.xPos + speed, targetX);
    } else if (player.xPos > targetX) {
        player.xPos = Math.max(player.xPos - speed, targetX);
    }

    if (player.yPos < targetY) {
        player.yPos = Math.min(player.yPos + speed, targetY);
    } else if (player.yPos > targetY) {
        player.yPos = Math.max(player.yPos - speed, targetY);
    }

    player.xPos = Math.round(player.xPos / gridSize) * gridSize;
    player.yPos = Math.round(player.yPos / gridSize) * gridSize;

    if (!getBeginGameStatus()) {
        setPlayerObject(getPlayerObject().xPos, player.xPos);
        setPlayerObject(getPlayerObject().yPos, player.yPos);
    }
}

function drawGrid(ctx, cellWidth, cellHeight, hoverX, hoverY, walkable) {
    const cols = 80;
    const rows = 60;

    const targetX = getGridTargetX();
    const targetY = getGridTargetY();

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            if (x === targetX && y === targetY) {
                ctx.fillStyle = 'rgba(255, 165, 0, 0.5)';
                ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
            } else if (x === hoverX && y === hoverY) {
                if (walkable) {
                    ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
                    ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                } else {
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                    ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                }
            }

            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.strokeRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
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

        const cols = 80;
        const rows = 60;

        setCanvasCellWidth(canvasWidth / cols);
        setCanvasCellHeight(canvasHeight / rows);

        drawGrid(ctx, getCanvasCellWidth(), getCanvasCellHeight(), hoverCell.x, hoverCell.y);
    }

    window.addEventListener('load', updateCanvasSize);
    window.addEventListener('resize', updateCanvasSize);

    canvas.addEventListener('mousemove', (event) => handleMouseMove(event, ctx));
    updateCanvasSize();
}

function handleMouseMove(event, ctx) {
    const canvas = getElements().canvas;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const gridData = getGridData();

    const gridSizeX = getCanvasCellWidth();
    const gridSizeY = getCanvasCellHeight();

    const hoverX = Math.floor(mouseX / gridSizeX);
    const hoverY = Math.floor(mouseY / gridSizeY);

    if (hoverX >= 0 && hoverX < 80 && hoverY >= 0 && hoverY < 60) {
        const cellValue = gridData[hoverY] && gridData[hoverY][hoverX];

        const walkable = (cellValue === 'walkable');

        if (hoverCell.x !== hoverX || hoverCell.y !== hoverY) {
            hoverCell.x = hoverX;
            hoverCell.y = hoverY;

            console.log(`Hovered Grid Position: (${hoverCell.x}, ${hoverCell.y}), Walkable: ${walkable}`);

            drawGrid(ctx, gridSizeX, gridSizeY, hoverX, hoverY, walkable);
        }
    }
}

export function initializePlayerPosition() {
    const canvas = getElements().canvas;
    const player = getPlayerObject();

    // Calculate the position 5% from the left and 95% from the bottom
    const xPos = canvas.width * 0.05; // 5% from the left
    const yPos = canvas.height * 0.95 - player.height; // 95% from the bottom, adjusted for player's height

    // Set the player's position
    player.xPos = xPos;
    player.yPos = yPos;

    setTargetX(xPos);
    setTargetY(yPos);

    // Update the player object with the new position
    setPlayerObject(player);
}

function initializeEnemySquares() {
    enemySquares.length = 0;
    let attempts = 0;

    while (enemySquares.length < getNumberOfEnemySquares() && attempts < getMaxAttemptsToDrawEnemies()) {
        const newSquare = generateRandomSquare();

        if (!enemySquares.some(square => checkCollision(newSquare, square)) &&
            !checkCollision(newSquare, getPlayerObject())) {
            enemySquares.push(newSquare);
        }

        attempts++;
    }

    if (attempts >= getMaxAttemptsToDrawEnemies()) {
        console.warn(`Could not place all ${getNumberOfEnemySquares()} squares. Only ${enemySquares.length} squares were placed due to overlap constraints.`);
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
    return !(rect1.x + rect1.width < rect2.x ||
             rect1.x > rect2.x + rect2.width ||
             rect1.y + rect1.height < rect2.y ||
             rect1.y > rect2.y + rect2.height);
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

    const gridX = hoverCell.x;
    const gridY = hoverCell.y;

    setGridTargetX(gridX);
    setGridTargetY(gridY);

    // Get path using A* algorithm
    const path = aStarPathfinding({ x: Math.floor(player.xPos / getCanvasCellWidth()), y: Math.floor(player.yPos / getCanvasCellHeight()) }, { x: gridX, y: gridY }, getGridData());

    // Set the path for the player to follow
    if (path.length > 0) {
        // Set the first target in the path
        const nextStep = path[0];
        setTargetX(nextStep.x * getCanvasCellWidth());
        setTargetY(nextStep.y * getCanvasCellHeight());
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
