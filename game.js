import { localize } from './localization.js';
import { setCurrentPath, getCurrentScreenId, getPathsData, setTargetX, setTargetY, getTargetX, getTargetY, getInitialSpeedPlayer, setGameStateVariable, getBeginGameStatus, getMaxAttemptsToDrawEnemies, getPlayerObject, getMenuState, getGameVisibleActive, getNumberOfEnemySquares, getElements, getLanguage, getGameInProgress, gameState, getInitialScreenId, getCurrentPath } from './constantsAndGlobalVars.js';

let playerObject = getPlayerObject();
export const enemySquares = [];

//--------------------------------------------------------------------------------------------------------

export function startGame() {
    initializeCanvas();
    initializePlayerPosition();
    //initializeEnemySquares();

    gameLoop();
}

export function gameLoop() {
    if (getBeginGameStatus()) {
        playerObject = getPlayerObject();
    }
    const ctx = getElements().canvas.getContext('2d');
    if (gameState === getGameVisibleActive()) {
        ctx.clearRect(0, 0, getElements().canvas.width, getElements().canvas.height);

        drawPathsForCurrentScreen(); //debug paths

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

function getPathPoint(path, percentage) {
    const totalLength = calculatePathLength(path);
    const distance = (percentage / 100) * totalLength;

    let accumulatedLength = 0;
    let previousPoint = path.segments[0];

    for (let i = 1; i < path.segments.length; i++) {
        const currentPoint = path.segments[i];
        const segmentLength = Math.sqrt(
            Math.pow(currentPoint.x - previousPoint.x, 2) +
            Math.pow(currentPoint.y - previousPoint.y, 2)
        );

        if (distance <= accumulatedLength + segmentLength) {
            const segmentFraction = (distance - accumulatedLength) / segmentLength;

            return {
                x: previousPoint.x + segmentFraction * (currentPoint.x - previousPoint.x),
                y: previousPoint.y + segmentFraction * (currentPoint.y - previousPoint.y)
            };
        }

        accumulatedLength += segmentLength;
        previousPoint = currentPoint;
    }

    return path.segments[path.segments.length - 1];
}

function calculatePathLength(path) {
    let totalLength = 0;
    for (let i = 1; i < path.segments.length; i++) {
        const prevPoint = path.segments[i - 1];
        const currPoint = path.segments[i];
        totalLength += Math.sqrt(
            Math.pow(currPoint.x - prevPoint.x, 2) +
            Math.pow(currPoint.y - prevPoint.y, 2)
        );
    }
    return totalLength;
}

export function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export function moveToClosestPointThenFinal(closestPathPoint, finalMovePoint) {
    // Move to the closestPathPoint first
    setTargetX(closestPathPoint.x);
    setTargetY(closestPathPoint.y);
    console.log(`Moving to closestPathPoint: (${getTargetX()}, ${getTargetY()})`);

    // Listen for the player's arrival at closestPathPoint
    let intervalId = setInterval(() => {
        const player = getPlayerObject();
        const distanceToClosest = calculateDistance(player.x, player.y, closestPathPoint.x, closestPathPoint.y);

        if (distanceToClosest < 1) { // Player has reached the closestPathPoint
            clearInterval(intervalId);
            setTargetX(finalMovePoint.x);
            setTargetY(finalMovePoint.y);
            console.log(`Reached closestPathPoint, now moving to finalMovePoint: (${getTargetX()}, ${getTargetY()})`);
        }
    }, 100); // Check every 100ms
}

export function getNearestPointOnPath(path, clickX, clickY) {
    const canvas = getElements().canvas;
    const pathPoints = path.segments.map(segment => ({
        x: segment.x / 100 * canvas.width,
        y: segment.y / 100 * canvas.height
    }));

    const sampledPoints = [];
    const numSamples = 200; // Number of points to sample along the path

    for (let i = 0; i < pathPoints.length - 1; i++) {
        const p1 = pathPoints[i];
        const p2 = pathPoints[i + 1];
        
        for (let j = 0; j <= numSamples; j++) {
            const t = j / numSamples;
            const x = p1.x + t * (p2.x - p1.x);
            const y = p1.y + t * (p2.y - p1.y);
            sampledPoints.push({ x, y });
        }
    }

    let minDistance = Infinity;
    let closestPoint = null;

    for (const point of sampledPoints) {
        const distance = Math.sqrt((clickX - point.x) ** 2 + (clickY - point.y) ** 2);

        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = point;
        }
    }

    return closestPoint;
}

function initializePlayerPosition() {
    const canvas = getElements().canvas;
    const data = getPathsData();

    if (!data) {
        console.error('Path data not available');
        return;
    }

    const screen = data.screens.find(screen => screen.screenId === getCurrentScreenId());

    if (!screen) {
        console.error('Screen not found:', getCurrentScreenId());
        return;
    }

    const path = screen.paths.find(p => p.pathId === getCurrentPath());

    if (!path) {
        console.error('Path not found');
        return;
    }

    const snapPercentage = 5;
    const snapPoint = getPathPoint(path, snapPercentage);

    playerObject.x = snapPoint.x / 100 * canvas.width - playerObject.width / 2;
    playerObject.y = snapPoint.y / 100 * canvas.height - playerObject.height;
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
    const targetX = getTargetX();
    const targetY = getTargetY();
    
    if (targetX === null || targetY === null) return;

    const speed = getInitialSpeedPlayer();
    const playerCenterX = playerObject.x + playerObject.width / 2;
    const playerCenterY = playerObject.y + playerObject.height / 2;
    const dx = targetX - playerCenterX;
    const dy = targetY - playerCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < speed) {
        // Snap to target and clear target
        playerObject.x = targetX - playerObject.width / 2;
        playerObject.y = targetY - playerObject.height / 2;
        setTargetX(null);
        setTargetY(null);
    } else {
        // Move towards target
        const directionX = dx / distance;
        const directionY = dy / distance;
        const nextX = playerObject.x + directionX * speed;
        const nextY = playerObject.y + directionY * speed;

        // Collision checks
        const wouldCollide = enemySquares.some(square => 
            checkCollision({ ...playerObject, x: nextX, y: nextY }, square)
        );

        if (wouldCollide) {
            // Prevent movement if collision detected
            setTargetX(null);
            setTargetY(null);
            return;
        }

        // Check canvas boundaries
        const canvas = getElements().canvas;

        // Adjust position if hitting boundaries
        if (nextX < 0) {
            playerObject.x = 0;
        } else if (nextX + playerObject.width > canvas.width) {
            playerObject.x = canvas.width - playerObject.width;
        } else {
            playerObject.x = nextX;
        }

        if (nextY < 0) {
            playerObject.y = 0;
        } else if (nextY + playerObject.height > canvas.height) {
            playerObject.y = canvas.height - playerObject.height;
        } else {
            playerObject.y = nextY;
        }
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

function drawPathsForCurrentScreen() {
    const canvas = getElements().canvas;
    const ctx = canvas.getContext('2d');
    
    const data = getPathsData();
    if (!data) {
        console.error('Path data not available');
        return;
    }

    const screen = data.screens.find(screen => screen.screenId === getCurrentScreenId());

    if (!screen) {
        console.error('Screen not found:', getCurrentScreenId());
        return;
    }

    screen.paths.forEach(path => {
        ctx.strokeStyle = path.pathId === 'path1' ? 'red' : 'yellow';
        ctx.lineWidth = 1;
        ctx.beginPath();
        path.segments.forEach((segment, index) => {
            const x = segment.x / 100 * canvas.width;
            const y = segment.y / 100 * canvas.height;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Draw junctions
        path.junctions.forEach(junction => {
            const x = junction.x / 100 * canvas.width;
            const y = junction.y / 100 * canvas.height;

            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
        });
    });
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