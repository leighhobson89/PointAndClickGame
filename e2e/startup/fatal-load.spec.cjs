const { test, expect } = require('@playwright/test');

test('a failed required data request shows a fatal error and does not start', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await page.route('**/masterJSONData.json', (route) => route.fulfill({ status: 503, body: 'unavailable' }));

    await page.goto('/index.html');
    await page.locator('#btnEnglish').click();
    await page.locator('#newGame').click();

    await expect(page.locator('#fatalLoadError')).toBeVisible();
    await expect(page.locator('#fatalLoadError')).toContainText('HTTP 503');
    await expect(page.locator('#menu')).toBeVisible();
    await expect(page.locator('#canvasContainer')).toBeHidden();
    expect(runtimeErrors).toEqual([]);
});

test('New Game waits for required image readiness', async ({ page }) => {
    await page.route('**/backgrounds/libraryFoyer.png', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
    });

    await page.goto('/index.html');
    await page.locator('#btnEnglish').click();
    await page.locator('#newGame').click();

    await expect(page.locator('#newGame')).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('#canvasContainer')).toBeHidden();
    await expect(page.locator('#canvasContainer')).toBeVisible();
    await expect(page.locator('#newGame')).toHaveAttribute('aria-busy', 'false');
});
