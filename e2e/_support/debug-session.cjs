// Shared helpers for scenario-driven browser tests.
//
// Tests use these to reach a state quickly, then drive the behaviour under
// test with real clicks and visible assertions. Nothing here asserts on
// translated display text.

const { expect } = require('@playwright/test');

const DEBUG_BASE_URL = `http://127.0.0.1:${process.env.E2E_DEBUG_PORT || '4175'}`;
const RELEASE_BASE_URL = `http://127.0.0.1:${process.env.E2E_PORT || '4174'}`;

const LANGUAGE_BUTTONS = Object.freeze({
    en: '#btnEnglish',
    es: '#btnSpanish',
    de: '#btnGerman',
    it: '#btnItalian',
    fr: '#btnFrench',
});

function debugUrl(pathname = '/index.html', query = '') {
    return `${DEBUG_BASE_URL}${pathname}${query}`;
}

function releaseUrl(pathname = '/index.html') {
    return `${RELEASE_BASE_URL}${pathname}`;
}

/**
 * Open the debug build with the test bootstrap installed and start a real
 * game through the ordinary menu buttons.
 */
async function openDebugGame(page, { locale = 'en', seed = 12345, showPanel = false } = {}) {
    // The opening cutscene uses long authored delays. Compressing timers keeps
    // startup quick; `restoreNativeTimers` puts real time back when a test
    // needs to observe a duration, such as the text-speed controls.
    await page.addInitScript(({ selectedSeed, panel }) => {
        window.__GAME_TEST_CONFIG__ = { enabled: true, seed: selectedSeed, showPanel: panel };
        const nativeSetTimeout = window.setTimeout.bind(window);
        window.__nativeSetTimeout = nativeSetTimeout;
        window.setTimeout = (callback, delay = 0, ...args) => nativeSetTimeout(callback, Math.min(delay, 5), ...args);
    }, { selectedSeed: seed, panel: showPanel });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(debugUrl());
    await expect(page.locator('body')).toHaveAttribute('data-debug-tools', 'enabled');
    await page.locator(LANGUAGE_BUTTONS[locale]).click();
    await page.locator('#newGame').click();
    await expect(page.locator('#canvasContainer')).toBeVisible();
    await waitForIdle(page);
}

async function restoreNativeTimers(page) {
    await page.evaluate(() => {
        if (window.__nativeSetTimeout) window.setTimeout = window.__nativeSetTimeout;
    });
}

async function waitForIdle(page, options = {}) {
    return page.evaluate((waitOptions) => window.__GAME_TEST__.waitForIdle(waitOptions), options);
}

async function loadScenario(page, scenarioId, overrides = undefined) {
    const result = await page.evaluate(
        ({ id, applied }) => window.__GAME_TEST__.loadScenario(id, applied),
        { id: scenarioId, applied: overrides },
    );
    expect(result.errors, `scenario ${scenarioId} should load cleanly`).toEqual([]);
    expect(result.loaded).toBe(true);
    return result;
}

async function summary(page) {
    return page.evaluate(() => window.__GAME_TEST__.inspectSummary());
}

/**
 * A viewport-independent digest of canonical progress, computed without any
 * scenario context so it can be compared across a page reload. Use it to prove
 * that a restored session is the same game, not merely a similar-looking one.
 */
async function canonicalChecksum(page) {
    return page.evaluate(async () => {
        const { stateChecksum } = await import('/src/domain/scenarios/scenarios.mjs');
        const { getCanonicalGameState } = await import('/constantsAndGlobalVars.js');
        return stateChecksum(getCanonicalGameState());
    });
}

/**
 * What the renderer rebuilt, as opposed to what the save carried: the room's
 * background, the walk-grid placement stamps, and one entity's recomputed
 * pixel geometry. A save deliberately stores none of these.
 */
async function derivedRenderState(page) {
    return page.evaluate(async () => {
        const state = await import('/constantsAndGlobalVars.js');
        const grid = state.getGridData().gridData ?? [];
        let placementCells = 0;
        for (const row of grid) for (const cell of row) if (/^[oc][A-Za-z]/.test(cell)) placementCells += 1;
        const objects = state.getObjectData().objects;
        const placed = Object.values(objects).find((object) => object.visualPosition);
        return {
            backgroundImage: document.getElementById('canvas').style.backgroundImage,
            cellWidth: state.getCanvasCellWidth(),
            placementCells,
            hasVisualPosition: Boolean(placed && Number.isFinite(placed.visualPosition.x)),
            foregroundFlag: state.getCurrentScreenHasForegroundItems(),
        };
    });
}

/** Open the menu from a running game the way a player does. */
async function returnToMenu(page) {
    await page.locator('#returnToMenu').click();
    await expect(page.locator('#menu')).toBeVisible();
}

async function readSaveSlot(page, slot = 'resume') {
    return page.evaluate((selected) => {
        const raw = localStorage.getItem(`pointAndClick.save.${selected}`);
        return raw === null ? null : JSON.parse(raw);
    }, slot);
}

async function clearSaveSlots(page) {
    await page.evaluate(() => {
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith('pointAndClick.save.')) localStorage.removeItem(key);
        }
    });
}

/**
 * Click the centre of a named grid cell value through the real canvas, the way
 * a player would. Returns the cell that was clicked.
 */
async function clickGridCell(page, cellValue) {
    const target = await page.evaluate(async (selectedValue) => {
        const { getGridData } = await import('/constantsAndGlobalVars.js');
        const grid = getGridData().gridData;
        const cells = [];
        for (let y = 0; y < grid.length; y += 1) {
            for (let x = 0; x < grid[y].length; x += 1) if (grid[y][x] === selectedValue) cells.push({ x, y });
        }
        return cells[Math.floor(cells.length / 2)] ?? null;
    }, cellValue);
    expect(target, `grid cell '${cellValue}' should exist in the current room`).toBeTruthy();
    const size = await page.locator('#canvas').evaluate((canvas) => ({ width: canvas.clientWidth, height: canvas.clientHeight }));
    await page.locator('#canvas').click({
        position: { x: ((target.x + 0.5) / 80) * size.width, y: ((target.y + 0.5) / 60) * size.height },
    });
    return target;
}

/**
 * Click the walkable cell furthest from the player in the current room, the
 * way a player starting a long walk would.
 */
async function clickFurthestWalkableCell(page) {
    const target = await page.evaluate(async () => {
        const state = await import('/constantsAndGlobalVars.js');
        const grid = state.getGridData().gridData;
        const player = state.getPlayerObject();
        const from = {
            x: Math.floor((player.xPos + player.width / 2) / state.getCanvasCellWidth()),
            y: Math.floor((player.yPos + player.height) / state.getCanvasCellHeight()),
        };
        let best = null;
        for (let y = 0; y < grid.length; y += 1) {
            for (let x = 0; x < grid[y].length; x += 1) {
                if (typeof grid[y][x] !== 'string' || !grid[y][x].startsWith('w')) continue;
                const distance = Math.abs(x - from.x) + Math.abs(y - from.y);
                if (!best || distance > best.distance) best = { x, y, distance };
            }
        }
        return best;
    });
    expect(target, 'the current room should contain a walkable cell').toBeTruthy();
    const size = await page.locator('#canvas').evaluate((canvas) => ({ width: canvas.clientWidth, height: canvas.clientHeight }));
    await page.locator('#canvas').click({
        position: { x: ((target.x + 0.5) / 80) * size.width, y: ((target.y + 0.5) / 60) * size.height },
    });
    return target;
}

module.exports = {
    DEBUG_BASE_URL,
    canonicalChecksum,
    clearSaveSlots,
    clickFurthestWalkableCell,
    derivedRenderState,
    RELEASE_BASE_URL,
    LANGUAGE_BUTTONS,
    clickGridCell,
    debugUrl,
    loadScenario,
    openDebugGame,
    readSaveSlot,
    releaseUrl,
    restoreNativeTimers,
    returnToMenu,
    summary,
    waitForIdle,
};
