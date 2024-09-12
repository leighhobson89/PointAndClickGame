import { localize } from './localization.js';
import { setTargetX, setTargetY, getTargetX, getTargetY, getInitialSpeedPlayer, setGameStateVariable, getBeginGameStatus, getMaxAttemptsToDrawEnemies, getPlayerObject, getMenuState, getGameVisibleActive, getNumberOfEnemySquares, getElements, getLanguage, getGameInProgress, gameState } from './constantsAndGlobalVars.js';

let playerObject = getPlayerObject();
export const enemySquares = [];

//--------------------------------------------------------------------------------------------------------

export function startGame() {
    initializeCanvas();
    initializePlayerPosition();
    initializeEnemySquares();

    gameLoop();
}

export function gameLoop() {
    if (getBeginGameStatus()) {
        playerObject = getPlayerObject();
    }
    const ctx = getElements().canvas.getContext('2d');
    if (gameState === getGameVisibleActive()) {
        ctx.clearRect(0, 0, getElements().canvas.width, getElements().canvas.height);
        movePlayerTowardsTarget();
        checkPlayerEnemyCollisions();

        drawMovingObject(ctx, playerObject.x, playerObject.y, playerObject.width, playerObject.height, 'green');

        enemySquares.forEach(square => {
            drawEnemySquare(ctx, square.x, square.y, square.width, square.height);
        });

        requestAnimationFrame(gameLoop);
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

function initializePlayerPosition() {
    const canvas = getElements().canvas;

    playerObject.x = canvas.width * 0.05;
    playerObject.y = canvas.height * 0.95 - playerObject.height;
}

function initializeEnemySquares() {
    enemySquares.length = 0;
    let attempts = 0;

    while (enemySquares.length < getNumberOfEnemySquares() && attempts < getMaxAttemptsToDrawEnemies()) {
        const newSquare = generateRandomSquare();

        if (!enemySquares.some(square => checkCollision(newSquare, square)) &&
            !checkCollision(newSquare, playerObject)) {
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

function movePlayerTowardsTarget() {
    if (getTargetX() === null || getTargetY() === null) return;

    const speed = getInitialSpeedPlayer();
    const dx = getTargetX() - (playerObject.x + playerObject.width / 2);
    const dy = getTargetY() - (playerObject.y + playerObject.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < speed) {
        playerObject.x = getTargetX() - playerObject.width / 2;
        playerObject.y = getTargetY() - playerObject.height / 2;
        setTargetX(null);
        setTargetY(null);
    } else {
        const directionX = dx / distance;
        const directionY = dy / distance;
        let initialX = playerObject.x + directionX * speed;
        let initialY = playerObject.y + directionY * speed;

        // Check for collisions with enemy squares
        const wouldCollide = enemySquares.some(square => 
            checkCollision({ ...playerObject, x: initialX, y: initialY }, square)
        );

        if (wouldCollide) {
            setTargetX(null);
            setTargetY(null);
            return;
        }

        // Check for collisions with canvas edges
        const canvas = getElements().canvas;
        
        // Check left and right canvas boundaries
        if (initialX < 0) {
            initialX = 0;
            setTargetX(null);
        } else if (initialX + playerObject.width > canvas.width) {
            initialX = canvas.width - playerObject.width;
            setTargetX(null);
        }

        // Check top and bottom canvas boundaries
        if (initialY < 0) {
            initialY = 0;
            setTargetY(null);
        } else if (initialY + playerObject.height > canvas.height) {
            initialY = canvas.height - playerObject.height;
            setTargetY(null);
        }

        playerObject.x = initialX;
        playerObject.y = initialY;
    }
}

function generateRandomSquare() {
    const size = 20;
    const x = Math.random() * (getElements().canvas.width - size);
    const y = Math.random() * (getElements().canvas.height - size);
    return { x, y, width: size, height: size };
}

function drawMovingObject(ctx, x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
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
        if (checkCollision(playerObject, square)) {
            resolveCollision(playerObject, square);
        }
    });
}

function resolveCollision(rectangle, square) {
    const rectCenterX = rectangle.x + rectangle.width / 2;
    const rectCenterY = rectangle.y + rectangle.height / 2;
    const squareCenterX = square.x + square.width / 2;
    const squareCenterY = square.y + square.height / 2;

    const dx = rectCenterX - squareCenterX;
    const dy = rectCenterY - squareCenterY;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
            rectangle.x = square.x + square.width;
        } else {
            rectangle.x = square.x - rectangle.width;
        }
    } else {
        if (dy > 0) {
            rectangle.y = square.y + square.height;
        } else {
            rectangle.y = square.y - rectangle.height;
        }
    }
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