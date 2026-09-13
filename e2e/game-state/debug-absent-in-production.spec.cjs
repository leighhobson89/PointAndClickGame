const { test, expect } = require('@playwright/test');
const { DEBUG_ONLY_PATHS } = require('../../scripts/debug-only-paths.cjs');
const { releaseUrl, debugUrl } = require('../_support/debug-session.cjs');

// These run against the release server, which is started without debug tools,
// so this is a real production build rather than a simulated one.

test('the release build serves no debug module, panel, API, or capability', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

    await page.goto(releaseUrl('/index.html'));
    await expect(page.locator('#menu')).toBeVisible();

    const capability = await page.request.get(releaseUrl('/debug-capability'));
    expect(capability.ok()).toBe(true);
    expect(await capability.json()).toMatchObject({ enabled: false });

    for (const debugPath of DEBUG_ONLY_PATHS) {
        const response = await page.request.get(releaseUrl(debugPath));
        expect(response.status(), `${debugPath} must not be served by a release build`).toBe(404);
    }

    await page.locator('#btnEnglish').click();
    await page.locator('#newGame').click();
    await expect(page.locator('#canvasContainer')).toBeVisible();

    // The legacy always-on debug wheel is gone: neither its markup nor its
    // middle-click and NumpadSubtract shortcuts can reveal anything.
    await page.locator('#canvas').click({ button: 'middle', position: { x: 40, y: 40 } });
    await page.keyboard.press('NumpadSubtract');

    expect(await page.evaluate(() => ({
        testApi: typeof window.__GAME_TEST__,
        panel: document.querySelectorAll('#debugPanel').length,
        debugControls: document.querySelectorAll('[data-debug-control]').length,
        legacyWheel: document.querySelectorAll('#wheelMenuContainer, #selectItemButton, #drawGridButton, #debugWindowButton').length,
        bodyFlag: document.body.dataset.debugTools ?? null,
    }))).toEqual({ testApi: 'undefined', panel: 0, debugControls: 0, legacyWheel: 0, bodyFlag: null });

    expect(runtimeErrors).toEqual([]);
});

test('the journal is a player feature and works on a release build', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

    // The journal reads canonical facts and is not a debug affordance, so it
    // must work with no debug module served and no __GAME_TEST__ present.
    await page.goto(releaseUrl('/index.html'));
    await page.locator('#btnEnglish').click();
    await page.locator('#newGame').click();
    await expect(page.locator('#canvasContainer')).toBeVisible();

    await page.locator('#openJournal').click();
    await expect(page.locator('#journalPanel')).toBeVisible();

    const library = page.locator('.journal-objective[data-objective-id="objective.libraryAccess"]');
    await expect(library).toHaveAttribute('data-objective-status', 'active');
    await expect(page.locator('.journal-objective[data-objective-id="objective.wolf"]')).toHaveCount(0);

    // Hints work without any test API, and still arrive one tier at a time.
    const hints = page.locator('.journal-hints[data-objective-id="objective.libraryAccess"] .journal-hint');
    await expect(hints).toHaveCount(0);
    await page.locator('.journal-hint-button[data-objective-id="objective.libraryAccess"]').click();
    await expect(hints).toHaveCount(1);

    expect(await page.evaluate(() => typeof window.__GAME_TEST__)).toBe('undefined');

    await page.keyboard.press('Escape');
    await expect(page.locator('#journalPanel')).toBeHidden();
    expect(runtimeErrors).toEqual([]);
});

test('a debug query string alone cannot enable the tools on a release build', async ({ page }) => {
    await page.addInitScript(() => {
        window.__GAME_TEST_CONFIG__ = { enabled: true, seed: 1 };
    });
    await page.goto(`${releaseUrl('/index.html')}?debug=1`);
    await expect(page.locator('#menu')).toBeVisible();

    expect(await page.evaluate(() => typeof window.__GAME_TEST__)).toBe('undefined');
    expect(await page.locator('#debugPanel').count()).toBe(0);
});

test('the debug build only enables the tools when the session asks for them', async ({ page }) => {
    await page.goto(debugUrl('/index.html'));
    await expect(page.locator('#menu')).toBeVisible();

    // Capability is advertised, but nothing was requested, so nothing installs.
    expect(await (await page.request.get(debugUrl('/debug-capability'))).json()).toMatchObject({ enabled: true });
    expect(await page.evaluate(() => typeof window.__GAME_TEST__)).toBe('undefined');
    expect(await page.locator('#debugPanel').count()).toBe(0);

    await page.goto(debugUrl('/index.html', '?debug=1'));
    await expect(page.locator('body')).toHaveAttribute('data-debug-tools', 'enabled');
    expect(await page.evaluate(() => window.__GAME_TEST__.apiVersion)).toBe(1);
    await expect(page.locator('#debugPanel [data-debug-control="watermark"]')).toContainText('DEBUG BUILD');
});
