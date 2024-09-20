import { localize } from './localization.js';
import { getGridTargetX, getGridTargetY, setGridTargetX, setGridTargetY, setPlayerObject, setTargetX, setTargetY, getTargetX, getTargetY, getInitialSpeedPlayer, setGameStateVariable, getBeginGameStatus, getMaxAttemptsToDrawEnemies, getPlayerObject, getMenuState, getGameVisibleActive, getNumberOfEnemySquares, getElements, getLanguage, getGameInProgress, gameState, getInitialScreenId, getCurrentPath} from './constantsAndGlobalVars.js';

export const enemySquares = [];

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

        drawGrid(ctx, 10);

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
    const speed = getInitialSpeedPlayer();
    const gridSize = 10;

    const targetX = getTargetX();
    const targetY = getTargetY();

    if (player.xPos < targetX) {
        player.xPos = Math.min(player.xPos + gridSize, targetX);
    } else if (player.xPos > targetX) {
        player.xPos = Math.max(player.xPos - gridSize, targetX);
    }

    if (player.yPos < targetY) {
        player.yPos = Math.min(player.yPos + gridSize, targetY);
    } else if (player.yPos > targetY) {
        player.yPos = Math.max(player.yPos - gridSize, targetY);
    }

    player.xPos = Math.round(player.xPos / gridSize) * gridSize;
    player.yPos = Math.round(player.yPos / gridSize) * gridSize;

    if (!getBeginGameStatus()) {
        setPlayerObject(getPlayerObject().xPos, player.xPos);
        setPlayerObject(getPlayerObject().yPos, player.yPos);
    }
}

function drawGrid(ctx, gridSize) {
    const canvas = getElements().canvas;
    const width = canvas.width;
    const height = canvas.height;

    // Get target grid coordinates (which were set in processClickPoint)
    const targetGridX = getGridTargetX();
    const targetGridY = getGridTargetY();

    // Default grid color
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;

    // Loop through the canvas and draw the grid
    for (let x = 0; x <= width; x += gridSize) {
        for (let y = 0; y <= height; y += gridSize) {

            // Check if this is the target grid square
            if (targetGridX !== null && targetGridY !== null &&
                Math.floor(x / gridSize) === targetGridX && 
                Math.floor(y / gridSize) === targetGridY) {
                
                // Offset the square we color
                const offsetX = Math.floor(getPlayerObject().width / (2 * gridSize));
                const offsetY = Math.floor(getPlayerObject().height / gridSize);

                // Color the adjusted target square
                ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // Highlight the square in red
                ctx.fillRect((targetGridX + offsetX) * gridSize, (targetGridY + offsetY) * gridSize, gridSize, gridSize);
            }

            // Draw grid lines
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }
}

export function initializeCanvas() {
    const canvas = getElements().canvas;
    const ctx = canvas.getContext('2d');
    const container = getElements().canvasContainer;

    function updateCanvasSize() {
        const bottomContainer = document.getElementById('bottomContainer');
    
        const viewportHeight = window.innerHeight;
        console.log(`Viewport Height: ${viewportHeight}px`);
    
        const bottomContainerHeight = bottomContainer ? bottomContainer.offsetHeight : 0;
    
        const canvasHeight = viewportHeight - bottomContainerHeight;
        const canvasWidth = container.clientWidth * 0.95;
    
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = `${canvasHeight}px`;
        container.style.overflow = 'hidden';
    
        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
    
        ctx.scale(1, 1);
    }

    window.addEventListener('load', updateCanvasSize);
    window.addEventListener('resize', updateCanvasSize);

    updateCanvasSize();
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

    const correctedClickX = clickX;
    const correctedClickY = clickY - player.height;

    console.log(`Corrected Click Coordinates: (${clickX}, ${correctedClickY})`);

    const gridSize = 10; // Define grid size

    const gridX = Math.floor(correctedClickX / gridSize);
    const gridY = Math.floor(correctedClickY / gridSize);

    setGridTargetX(gridX);
    setGridTargetY(gridY);

    setTargetX(correctedClickX);
    setTargetY(correctedClickY);

    console.log(`Grid Reference: (${gridX}, ${gridY})`);
    console.log(`Target set to (${getTargetX()}, ${getTargetY()}) in pixels`);
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
