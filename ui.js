import { setCurrentPath, getCurrentPath, getCurrentScreenId, getPathsData, loadPathsData, setTargetX, setTargetY, getTargetX, getTargetY, gameState, getLanguage, setElements, getElements, setBeginGameStatus, getGameInProgress, setGameInProgress, getGameVisibleActive, getMenuState, getLanguageSelected, setLanguageSelected, setLanguage, getInitialScreenId, getPlayerObject } from './constantsAndGlobalVars.js';
import { calculateDistance, moveToClosestPointThenFinal, getNearestPointOnPath, setGameState, startGame, gameLoop, updateCursor, enemySquares } from './game.js';
import { initLocalization, localize } from './localization.js';
import { loadGameOption, loadGame, saveGame, copySaveStringToClipBoard } from './saveLoadGame.js';

document.addEventListener('DOMContentLoaded', async () => {
    setElements();
    loadPathsData();

    getElements().newGameMenuButton.addEventListener('click', () => {
        setBeginGameStatus(true);
        if (!getGameInProgress()) {
            setGameInProgress(true);
        }
        disableActivateButton(getElements().resumeGameMenuButton, 'active', 'btn-primary');
        disableActivateButton(getElements().saveGameButton, 'active', 'btn-primary');
        setGameState(getGameVisibleActive());
        startGame(getInitialScreenId());
    });

    getElements().resumeGameMenuButton.addEventListener('click', () => {
        if (gameState === getMenuState()) {
            setGameState(getGameVisibleActive());
        }
        gameLoop();
    });

    getElements().returnToMenuButton.addEventListener('click', () => {
        setGameState(getMenuState());
    });

    getElements().btnEnglish.addEventListener('click', () => {
        handleLanguageChange('en');
        setGameState(getMenuState());
    });

    getElements().btnSpanish.addEventListener('click', () => {
        handleLanguageChange('es');
        setGameState(getMenuState());
    });

    getElements().btnGerman.addEventListener('click', () => {
        handleLanguageChange('de');
        setGameState(getMenuState());
    });

    getElements().btnItalian.addEventListener('click', () => {
        handleLanguageChange('it');
        setGameState(getMenuState());
    });

    getElements().btnFrench.addEventListener('click', () => {
        handleLanguageChange('fr');
        setGameState(getMenuState());
    });

    getElements().saveGameButton.addEventListener('click', function () {
        getElements().overlay.classList.remove('d-none');
        saveGame(true);
    });

    getElements().loadGameButton.addEventListener('click', function () {
        getElements().overlay.classList.remove('d-none');
        loadGameOption();
    });

    getElements().copyButtonSavePopup.addEventListener('click', function () {
        copySaveStringToClipBoard();
    });

    getElements().closeButtonSavePopup.addEventListener('click', function () {
        getElements().saveLoadPopup.classList.add('d-none');
        getElements().overlay.classList.add('d-none');
    });

    getElements().loadStringButton.addEventListener('click', function () {
        loadGame(true)
            .then(() => {
                setElements();
                getElements().saveLoadPopup.classList.add('d-none');
                document.getElementById('overlay').classList.add('d-none');
                setGameState(getMenuState());
            })
            .catch((error) => {
                console.error('Error loading game:', error);
            });
    });

    initializeCanvasEventListener();
    setGameState(getMenuState());
    handleLanguageChange(getLanguageSelected());
});

export function initializeCanvasEventListener() {
    const canvas = getElements().canvas;

    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        let isClickOnEnemy = false;
        for (const square of enemySquares) {
            if (clickX >= square.x && clickX <= square.x + square.width &&
                clickY >= square.y && clickY <= square.y + square.height) {
                isClickOnEnemy = true;
                break;
            }
        }

        if (isClickOnEnemy) {
            console.log('Click ignored, hovering over enemy square.');
            return;
        }

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

        const playerObject = getPlayerObject();
        const startX = playerObject.x; // Player's current X position
        const startY = playerObject.y; // Player's current Y position

        // Get the point on the current path nearest to the click position
        let finalMovePointAndPath = getNearestPointOnPath(clickX, clickY);
        let movePoint = finalMovePointAndPath.point;
        movePoint.y = movePoint.y - playerObject.height / 2; // Align player feet on path

        console.log(`Start Position: (${startX}, ${startY})`);
        console.log(`Next Move Point: (${movePoint.x}, ${movePoint.y}) on Path ID: ${finalMovePointAndPath.pathId}`);

        // Initialize variables for finding the best path point
        let bestPathPoint = null;
        let minDistanceToStart = Infinity; // Track the minimum distance to start position for valid points

        // Loop through all paths to find the closest valid path point
        for (const path of screen.paths) {
            for (const segment of path.segments) {
                // Convert percentage coordinates to pixel coordinates
                const segmentX = segment.x / 100 * canvas.width; 
                const segmentY = segment.y / 100 * canvas.height;

                // Calculate distance from the start position to the segment
                const distanceToSegment = calculateDistance(startX, startY, segmentX, segmentY);
                // Calculate distance from the segment to the final move point
                const distanceFromSegmentToFinal = calculateDistance(segmentX, segmentY, movePoint.x, movePoint.y);
                // Calculate distance from the player to the final move point
                const distanceFromPlayerToFinal = calculateDistance(startX, startY, movePoint.x, movePoint.y);

                console.log(`Checking Segment Position: (${segmentX}, ${segmentY}) on Path ID: ${path.pathId}`);
                console.log(`Distance from Start to Segment: ${distanceToSegment}`);
                console.log(`Distance from Segment to Final Move Point: ${distanceFromSegmentToFinal}`);
                console.log(`Distance from Player to Final Move Point: ${distanceFromPlayerToFinal}`);

                // Check if this segment is closer to the finalMovePoint than the start position
                // and closer to the start position than the finalMovePoint
                if (distanceFromSegmentToFinal < distanceFromPlayerToFinal && distanceToSegment < distanceFromPlayerToFinal) {
                    // If it's a valid point, check if it's the closest valid one
                    if (distanceToSegment < minDistanceToStart) {
                        minDistanceToStart = distanceToSegment;
                        bestPathPoint = { x: segmentX, y: segmentY };
                        console.log(`Valid Path Point Found: (${bestPathPoint.x}, ${bestPathPoint.y}) on Path ID: ${path.pathId}`);
                        console.log(`This point is valid because it is closer to the final move point than the start position and closer to the start position than the final move point.`);
                    } else {
                        console.log(`Point is valid but not the closest one.`);
                    }
                } else {
                    console.log(`Point is not valid.`);
                }
            }
        }

        // Compare distances and decide where to move
        const distanceToFinalMovePoint = calculateDistance(startX, startY, movePoint.x, movePoint.y);

        console.log(`Distance to Final Move Point: ${distanceToFinalMovePoint}`);

        if (bestPathPoint) {
            // Move to the closest valid path point first, then to the finalMovePoint
            setTargetX(bestPathPoint.x);
            setTargetY(bestPathPoint.y - (getPlayerObject().height / 2));
            console.log(`Moving to closest valid path point: (${getTargetX()}, ${getTargetY()}) on Path ID: ${finalMovePointAndPath.pathId}`);

            // Listen for arrival at bestPathPoint and then move to finalMovePoint
            let intervalId = setInterval(() => {
                const player = getPlayerObject();
                const distanceToBestPoint = calculateDistance(player.x + player.width / 2, player.y + player.height, bestPathPoint.x, bestPathPoint.y);

                if (distanceToBestPoint < 1) { // Player has reached bestPathPoint
                    clearInterval(intervalId);
                    setTargetX(finalMovePointAndPath.finalPoint.x);
                    
                    if (finalMovePointAndPath.junction === true) {
                        setTargetY(finalMovePointAndPath.finalPoint.y - (getPlayerObject().height / 2));
                        console.log("Updating currentPath from " + getCurrentPath() + " to " + finalMovePointAndPath.newPathId);
                        setCurrentPath(finalMovePointAndPath.newPathId);
                    } else {
                        setTargetY(finalMovePointAndPath.finalPoint.y);
                    }
                    console.log(`Reached closest valid path point, now moving to finalMovePoint: (${getTargetX()}, ${getTargetY()})`);
                }
            }, 100); // Check every 100ms
        } else {
            // Move directly to the finalMovePoint
            setTargetX(movePoint.x);
            setTargetY(movePoint.y - (getPlayerObject().height / 2));
            console.log(`No valid path points found. Moving directly to finalMovePoint: (${getTargetX()}, ${getTargetY()})`);
        }
    });

    canvas.addEventListener('mousemove', updateCursor);
}

async function setElementsLanguageText() {
    // Localization text
    getElements().menuTitle.innerHTML = `<h2>${localize('menuTitle', getLanguage())}</h2>`;
    getElements().newGameMenuButton.innerHTML = `${localize('newGame', getLanguage())}`;
    getElements().resumeGameMenuButton.innerHTML = `${localize('resumeGame', getLanguage())}`;
    getElements().loadGameButton.innerHTML = `${localize('loadGame', getLanguage())}`;
    getElements().saveGameButton.innerHTML = `${localize('saveGame', getLanguage())}`;
    getElements().loadStringButton.innerHTML = `${localize('loadButton', getLanguage())}`;
}

export async function handleLanguageChange(languageCode) {
    setLanguageSelected(languageCode);
    await setupLanguageAndLocalization();
    setElementsLanguageText();
}

async function setupLanguageAndLocalization() {
    setLanguage(getLanguageSelected());
    await initLocalization(getLanguage());
}

export function disableActivateButton(button, action, activeClass) {
    switch (action) {
        case 'active':
            button.classList.remove('disabled');
            button.classList.add(activeClass);
            break;
        case 'disable':
            button.classList.remove(activeClass);
            button.classList.add('disabled');
            break;
    }
}

