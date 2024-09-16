import { localize } from './localization.js';
import { setPlayerObject, getStartPosition, setCurrentPath, getCurrentScreenId, getPathsData, setTargetX, setTargetY, getTargetX, getTargetY, getInitialSpeedPlayer, setGameStateVariable, getBeginGameStatus, getMaxAttemptsToDrawEnemies, getPlayerObject, getMenuState, getGameVisibleActive, getNumberOfEnemySquares, getElements, getLanguage, getGameInProgress, gameState, getInitialScreenId, getCurrentPath } from './constantsAndGlobalVars.js';
import { traversePath } from './pathFinding.js';

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

        drawPathsForCurrentScreen(); //debug paths

        //movePlayerTowardsTarget(); CALL MOVEMENT CODE HERE

        checkPlayerEnemyCollisions();
        drawObject(ctx, getPlayerObject());

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
    const targetDistance = (percentage / 100) * totalLength;
    let accumulatedDistance = 0;

    for (let segment of path.segments) {
        const segmentStart = segment.start;
        const segmentEnd = segment.end;

        const segmentLength = calculateDistance(segmentStart.x, segmentStart.y, segmentEnd.x, segmentEnd.y);

        if (accumulatedDistance + segmentLength >= targetDistance) {
            const remainingDistance = targetDistance - accumulatedDistance;
            const segmentFraction = remainingDistance / segmentLength;

            const pointX = segmentStart.x + segmentFraction * (segmentEnd.x - segmentStart.x);
            const pointY = segmentStart.y + segmentFraction * (segmentEnd.y - segmentStart.y);

            return { x: pointX, y: pointY };
        }

        accumulatedDistance += segmentLength;
    }

    const lastSegment = path.segments[path.segments.length - 1];
    return { x: lastSegment.end.x, y: lastSegment.end.y };
}

function calculatePathLength(path) {
    let totalLength = 0;

    for (let segment of path.segments) {
        const { start, end } = segment;
        const segmentLength = calculateDistance(start.x, start.y, end.x, end.y);
        totalLength += segmentLength;
    }

    return totalLength;
}

function initializePlayerPosition() {
    const canvas = getElements().canvas;
    const data = getPathsData();

    const screen = data.screens.find(screen => screen.screenId === getCurrentScreenId());
    const path = screen.paths.find(p => p.pathId === getCurrentPath());

    if (!path) {
        console.error('Path not found');
        return;
    }

    const snapPercentage = getStartPosition();
    const snapPoint = getPathPoint(path, snapPercentage);

    const player = getPlayerObject();
    const playerX = snapPoint.x / 100 * canvas.width - player.width / 2;
    const playerY = snapPoint.y / 100 * canvas.height - player.height;

    setPlayerObject('xPos', playerX);
    setPlayerObject('yPos', playerY);
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

        path.segments.forEach((segment) => {
            const startX = segment.start.x / 100 * canvas.width;
            const startY = segment.start.y / 100 * canvas.height;
            const endX = segment.end.x / 100 * canvas.width;
            const endY = segment.end.y / 100 * canvas.height;

            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
        });

        ctx.stroke();

        if (path.junctions) {
            path.junctions.forEach(junction => {
                const x = junction.x / 100 * canvas.width;
                const y = junction.y / 100 * canvas.height;

                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    });
}

export function processClickPoint(clickPoint) {
    const data = getPathsData();
    const canvas = getElements().canvas;

    let closestPoint = null;
    let minDistance = Infinity;
    let closestSegment = null;
    let closestPath = null;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    data.screens.forEach(screen => {
        if (screen.screenId === getCurrentScreenId()) {
            screen.paths.forEach(path => {
                path.segments.forEach(segment => {
                    const segmentStart = {
                        x: segment.start.x / 100 * canvasWidth,
                        y: segment.start.y / 100 * canvasHeight
                    };
                    const segmentEnd = {
                        x: segment.end.x / 100 * canvasWidth,
                        y: segment.end.y / 100 * canvasHeight
                    };

                    const point = findClosestPointOnSegment(clickPoint, segmentStart, segmentEnd);
                    const distance = calculateDistance(
                        clickPoint.x / 100 * canvasWidth,
                        clickPoint.y / 100 * canvasHeight,
                        point.x,
                        point.y
                    );

                    if (distance < minDistance) {
                        minDistance = distance;
                        closestPoint = point;
                        closestSegment = segment;
                        closestPath = path;
                    }
                });
            });
        }
    });

    if (closestPoint) {
        console.log(`Click Point: ${JSON.stringify(clickPoint)}`);
        console.log(`Closest Point on Path Segment: ${JSON.stringify(closestPoint)}`);
        console.log(`Closest Segment: ${JSON.stringify(closestSegment)}`);
        console.log(`Closest Path: ${JSON.stringify(closestPath)}`);

        // Optional: Log junctions if destination is on a different path
        const player = getPlayerObject();
        const route = traversePath(player, closestPath.pathId, closestPoint);
        console.log(`Route: ${JSON.stringify(route)}`);
    }
}

function findClosestPointOnSegment(point, segmentStart, segmentEnd) {
    const px = point.x / 100 * getElements().canvas.width;
    const py = point.y / 100 * getElements().canvas.height;
    const x1 = segmentStart.x;
    const y1 = segmentStart.y;
    const x2 = segmentEnd.x;
    const y2 = segmentEnd.y;
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    if (dx === 0 && dy === 0) {
        return { x: x1, y: y1 }; // The segment is a point
    }
    
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    
    const clampedT = Math.max(0, Math.min(1, t));
    return { x: x1 + clampedT * dx, y: y1 + clampedT * dy };
}

function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
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
