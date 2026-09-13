const { test, expect } = require('@playwright/test');

test('reduced motion completes the opening transition before the cutscene advances', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/index.html');
    await page.locator('#btnEnglish').click();
    await page.locator('#newGame').click();

    await expect(page.locator('body')).toHaveAttribute('data-session-generation', '1');
    await page.waitForTimeout(1000);
    expect(runtimeErrors).toEqual([]);
    await expect(page.locator('#canvas')).toHaveCSS('background-image', /largePileOfPoo\.png/);
    await expect(page.locator('#overlayCanvas')).toBeHidden();
});
