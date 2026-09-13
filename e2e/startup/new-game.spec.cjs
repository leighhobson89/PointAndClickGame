const { test, expect } = require('@playwright/test');

test('opens the app and starts a new game in English', async ({ page }) => {
    const runtimeErrors = [];
    const failedLocalRequests = [];

    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('requestfailed', (request) => {
        const requestUrl = new URL(request.url());
        if (requestUrl.hostname === '127.0.0.1' || requestUrl.hostname === 'localhost') {
            failedLocalRequests.push(`${request.method()} ${request.url()}`);
        }
    });

    await page.goto('/index.html');

    await expect(page.locator('#menu')).toBeVisible();
    await expect(page.locator('#newGame')).toHaveText('New Game');

    await page.locator('#btnEnglish').click();
    await page.locator('#newGame').click();

    await expect(page.locator('#menu')).toBeHidden();
    await expect(page.locator('#canvasContainer')).toBeVisible();
    await expect(page.locator('#canvas')).toBeVisible();
    await expect(page.locator('#interactionInfo')).toContainText('Walk To');

    const canvasSize = await page.locator('#canvas').evaluate((canvas) => ({
        width: canvas.width,
        height: canvas.height,
    }));

    expect(canvasSize.width).toBeGreaterThan(0);
    expect(canvasSize.height).toBeGreaterThan(0);
    expect(failedLocalRequests).toEqual([]);
    expect(runtimeErrors).toEqual([]);
});
