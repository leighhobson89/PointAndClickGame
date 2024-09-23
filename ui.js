import { getPreviousScreenId, setCurrentScreenId, getExitNumberToTransitionTo, setNavigationData, getNavigationData, setHoverCell, getHoverCell, getCanvasCellWidth, getCanvasCellHeight, getGridData, setGridData, gameState, getLanguage, setElements, getElements, setBeginGameStatus, getGameInProgress, setGameInProgress, getGameVisibleActive, getMenuState, getLanguageSelected, setLanguageSelected, setLanguage, getInitialScreenId, urlWalkableJSONS, urlNavigationData, getGridSizeX, getGridSizeY, getBeginGameStatus, getCurrentScreenId, setTransitioningNow, setPreviousScreenId } from './constantsAndGlobalVars.js';
import { handleRoomTransition, drawGrid, processClickPoint, setGameState, startGame, gameLoop, updateCursor, enemySquares, initializePlayerPosition } from './game.js';
import { initLocalization, localize } from './localization.js';
import { loadGameOption, loadGame, saveGame, copySaveStringToClipBoard } from './saveLoadGame.js';

document.addEventListener('DOMContentLoaded', async () => {
    setElements();
    loadGameData(urlWalkableJSONS, urlNavigationData);

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

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', updateCursor);
}

export function handleMouseMove(event, ctx) {
    const canvas = getElements().canvas;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const gridData = getGridData();

    const hoverX = Math.floor(mouseX / getCanvasCellWidth());
    const hoverY = Math.floor(mouseY / getCanvasCellHeight());

    if (hoverX >= 0 && hoverX < getGridSizeX() && hoverY >= 0 && hoverY < getGridSizeY()) {
        const cellValue = gridData.gridData[hoverY] && gridData.gridData[hoverY][hoverX];

        const walkable = (cellValue.includes('e') || cellValue === 'w');

        if (getHoverCell().x !== hoverX || getHoverCell().y !== hoverY) {
            setHoverCell(hoverX, hoverY);

            console.log(`Hovered Grid Position: (${getHoverCell().x}, ${getHoverCell().y}), Walkable: ${walkable}`);

            drawGrid(ctx, getGridSizeX(), getGridSizeY(), hoverX, hoverY, walkable);
        }
    }
}

function handleCanvasClick(event) {

    if (getBeginGameStatus) {
        setBeginGameStatus(false);
    }

    const canvas = getElements().canvas;
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    console.log(`Click Coordinates: (${clickX}, ${clickY})`);
    
    const clickPoint = { x: clickX, y: clickY};

    setBeginGameStatus(false);
    
    processClickPoint(clickPoint, true);
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

export function animateTransitionAndChangeBackground() {
    const overlay = document.getElementById('overlayCanvas');
    overlay.style.display = 'block';

    requestAnimationFrame(() => {
        overlay.classList.add('visible');
        overlay.classList.remove('hidden');
    });

    overlay.addEventListener('transitionend', () => {
        const newScreenId = handleRoomTransition();
        const exit = 'e' + getExitNumberToTransitionTo();

        const startPosition = getNavigationData()[getCurrentScreenId()]?.exits[exit]?.startPosition;
        const startX = startPosition.x;
        const startY = startPosition.y;

        initializePlayerPosition(startX, startY);
        fadeBackToGameInTransition();

        //problem is need to set a nextScreenId when user clicks and call it in the function below this line in the part for transitioing or add it
        setTransitioningNow(true);
        processClickPoint({
            x: getNavigationData()[getCurrentScreenId()].exits[exit].finalPosition.x,
            y: getNavigationData()[getCurrentScreenId()].exits[exit].finalPosition.y
        }, false);
        setPreviousScreenId(getCurrentScreenId());
        setCurrentScreenId(newScreenId);
    }, { once: true });
}

export function fadeBackToGameInTransition() {
    const overlay = document.getElementById('overlayCanvas');
    overlay.classList.add('hidden');
    overlay.classList.remove('visible');

    requestAnimationFrame(() => {
        overlay.classList.remove('visible');
        overlay.classList.add('hidden');
    });

    overlay.addEventListener('transitionend', () => {
        overlay.classList.add('hidden');
        overlay.style.display = 'none';
        console.log("transition complete!");
    }, { once: true });
}

export function loadGameData(gridUrl, screenNavUrl) {
    // Load grid data
    fetch(gridUrl)
        .then(response => response.json())
        .then(gridData => {
            setGridData(gridData);
            console.log("Grid data loaded:", getGridData());
        })
        .catch(error => {
            console.error("Error loading grid data:", error);
        });

    // Load navigation data
    fetch(screenNavUrl)
        .then(response => response.json())
        .then(navData => {
            setNavigationData(navData);
            console.log("Navigation data loaded:", getNavigationData());
        })
        .catch(error => {
            console.error("Error loading navigation data:", error);
        });
}

