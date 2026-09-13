const { test, expect } = require('@playwright/test');

test('clicking a walkable library cell moves the player', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await page.addInitScript(() => {
        const nativeSetTimeout = window.setTimeout.bind(window);
        window.setTimeout = (callback, delay = 0, ...args) =>
            nativeSetTimeout(callback, Math.min(delay, 10), ...args);
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/index.html');
    await page.locator('#btnEnglish').click();
    await page.locator('#newGame').click();

    await page.waitForTimeout(100);
    await expect.poll(async () => page.evaluate(async () => {
        const { getCanonicalGameState } = await import('/constantsAndGlobalVars.js');
        const state = getCanonicalGameState();
        return `${state.location.currentRoomId}:${state.presentation.mode}`;
    }), { timeout: 5_000 }).toBe('libraryFoyer:gameVisibleActive');

    const beforeX = await page.evaluate(async () => {
        const { getCanonicalGameState } = await import('/constantsAndGlobalVars.js');
        return getCanonicalGameState().player.xPos;
    });
    const canvasSize = await page.locator('#canvas').evaluate((canvas) => ({
        width: canvas.clientWidth,
        height: canvas.clientHeight,
    }));

    // Library cell (15, 50) is a normal walkable cell in the authored 80 x 60 grid.
    await page.locator('#canvas').click({
        position: {
            x: (15.5 / 80) * canvasSize.width,
            y: (50.5 / 60) * canvasSize.height,
        },
    });

    await expect.poll(async () => page.evaluate(async () => {
        const { getCanonicalGameState } = await import('/constantsAndGlobalVars.js');
        return getCanonicalGameState().player.xPos;
    })).not.toBe(beforeX);
    expect(runtimeErrors).toEqual([]);
});
