import { localize } from './localization.js';
import { getInitialSpeedMovingEnemy, setGameStateVariable, getBeginGameStatus, getMaxAttemptsToDrawEnemies, getPlayerObject, getMenuState, getGameVisiblePaused, getGameVisibleActive, getNumberOfEnemySquares, getElements, getLanguage, getGameInProgress, gameState } from './constantsAndGlobalVars.js';

let playerObject = getPlayerObject();
let movingEnemy = {};

const enemySquares = [];

//--------------------------------------------------------------------------------------------------------

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

function initializeMovingEnemy() {
    let attempts = 0;

    do {
        movingEnemy = generateRandomCircle();
        attempts++;
    } while ((checkCollision(movingEnemy, playerObject) || enemySquares.some(square => checkCollision(movingEnemy, square))) &&
             attempts < getMaxAttemptsToDrawEnemies());

    if (attempts >= getMaxAttemptsToDrawEnemies()) {
        console.warn('Could not place the moving enemy without overlapping the player or any enemy squares.');
    }
}

export function startGame() {
    const ctx = getElements().canvas.getContext('2d');
    const container = getElements().canvasContainer;

    function updateCanvasSize() {
        const canvasWidth = container.clientWidth * 0.8;
        const canvasHeight = container.clientHeight * 0.8;

        getElements().canvas.style.width = `${canvasWidth}px`;
        getElements().canvas.style.height = `${canvasHeight}px`;

        getElements().canvas.width = canvasWidth;
        getElements().canvas.height = canvasHeight;
        
        ctx.scale(1, 1);
    }

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    initializeEnemySquares();
    initializeMovingEnemy();

    gameLoop();
}

export function gameLoop() {
    if (getBeginGameStatus()) {
        playerObject = getPlayerObject();
    }
    const ctx = getElements().canvas.getContext('2d');
    if (gameState === getGameVisibleActive() || gameState === getGameVisiblePaused()) {
        ctx.clearRect(0, 0, getElements().canvas.width, getElements().canvas.height);

        if (gameState === getGameVisibleActive()) {
            moveCircle(playerObject);

            moveCircle(movingEnemy);

            checkAllCollisions();
        }

        drawMovingObject(ctx, playerObject.x, playerObject.y, playerObject.width, playerObject.height, 'green');
        drawMovingObject(ctx, movingEnemy.x, movingEnemy.y, movingEnemy.width, movingEnemy.height, 'red');

        enemySquares.forEach(square => {
            drawEnemySquare(ctx, square.x, square.y, square.width, square.height);
        });

        requestAnimationFrame(gameLoop);
    }
}

function moveCircle(circle) {
    circle.x += circle.dx;
    circle.y += circle.dy;

    if (circle.x < 0 || circle.x + circle.width > getElements().canvas.width) {
        circle.dx = -circle.dx;
    }
    if (circle.y < 0 || circle.y + circle.height > getElements().canvas.height) {
        circle.dy = -circle.dy;
    }
}

function checkAllCollisions() {

    enemySquares.forEach(square => {
        if (checkCollision(playerObject, square)) {
            handleCollisionBetweenEnemySquares(playerObject, square);
        }
    });

    enemySquares.forEach(square => {
        if (checkCollision(movingEnemy, square)) {
            handleCollisionBetweenEnemySquares(movingEnemy, square);
        }
    });

    if (checkCollision(playerObject, movingEnemy)) {
        handleCollisionBetweenEnemySquares(playerObject, movingEnemy);
        handleCollisionBetweenEnemySquares(movingEnemy, playerObject);
    }
}

function generateRandomSquare() {
    const size = 20;
    const x = Math.random() * (getElements().canvas.width - size);
    const y = Math.random() * (getElements().canvas.height - size);
    return { x, y, width: size, height: size };
}

function generateRandomCircle() {
    const size = 50;
    const x = Math.random() * (getElements().canvas.width - size);
    const y = Math.random() * (getElements().canvas.height - size);
    const speed = getInitialSpeedMovingEnemy();
    const dx = (Math.random() < 0.5 ? -1 : 1) * speed;
    const dy = (Math.random() < 0.5 ? -1 : 1) * speed;
    return { x, y, width: size, height: size, dx, dy };
}

function drawMovingObject(ctx, x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); 
    ctx.arc(
        x + width / 2, 
        y + height / 2, 
        width / 2,     
        0,          
        Math.PI * 2     
    );
    ctx.closePath();   
    ctx.fill();       
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

function handleCollisionBetweenEnemySquares(rectangle, square) {
    const rectCenterX = rectangle.x + rectangle.width / 2;
    const rectCenterY = rectangle.y + rectangle.height / 2;
    const squareCenterX = square.x + square.width / 2;
    const squareCenterY = square.y + square.height / 2;

    const dx = Math.abs(rectCenterX - squareCenterX);
    const dy = Math.abs(rectCenterY - squareCenterY);
    const overlapX = rectangle.width / 2 + square.width / 2 - dx;
    const overlapY = rectangle.height / 2 + square.height / 2 - dy;

    if (overlapX >= overlapY) {
        if (rectCenterY < squareCenterY) {
            rectangle.dy = -Math.abs(rectangle.dy);
        } else {
            rectangle.dy = Math.abs(rectangle.dy);
        }
    } else {
        if (rectCenterX < squareCenterX) {
            rectangle.dx = -Math.abs(rectangle.dx);
        } else {
            rectangle.dx = Math.abs(rectangle.dx);
        }
    }
}

export function setGameState(newState) {
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
            getElements().pauseResumeGameButton.classList.remove('d-flex');
            getElements().pauseResumeGameButton.classList.add('d-none');
            if (getGameInProgress()) {
                getElements().copyButtonSavePopup.innerHTML = `${localize('copyButton', getLanguage())}`;
                getElements().closeButtonSavePopup.innerHTML = `${localize('closeButton', getLanguage())}`;
            }
            break;
        case getGameVisiblePaused():
            getElements().menu.classList.remove('d-flex');
            getElements().menu.classList.add('d-none');
            getElements().buttonRow.classList.remove('d-none');
            getElements().buttonRow.classList.add('d-flex');
            getElements().canvasContainer.classList.remove('d-none');
            getElements().canvasContainer.classList.add('d-flex');
            getElements().returnToMenuButton.classList.remove('d-none');
            getElements().returnToMenuButton.classList.add('d-flex');
            getElements().pauseResumeGameButton.classList.remove('d-none');
            getElements().pauseResumeGameButton.classList.add('d-flex');
            if (getBeginGameStatus()) {
                getElements().pauseResumeGameButton.innerHTML = `${localize('begin', getLanguage())}`;
            } else {
                getElements().pauseResumeGameButton.innerHTML = `${localize('resumeGame', getLanguage())}`;
            }
            
            getElements().returnToMenuButton.innerHTML = `${localize('menuTitle', getLanguage())}`;
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
            getElements().pauseResumeGameButton.classList.remove('d-none');
            getElements().pauseResumeGameButton.classList.add('d-flex');
            getElements().pauseResumeGameButton.innerHTML = `${localize('pause', getLanguage())}`;
            getElements().returnToMenuButton.innerHTML = `${localize('menuTitle', getLanguage())}`;
            break;
    }
}
