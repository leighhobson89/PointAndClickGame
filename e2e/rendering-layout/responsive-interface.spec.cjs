const { test, expect } = require('@playwright/test');

test.use({ hasTouch: true });
const { loadScenario, openDebugGame } = require('../_support/debug-session.cjs');

test('the logical stage and controls remain usable across the supported layout matrix', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await openDebugGame(page);
    await loadScenario(page, 'system.inventory-full');

    expect(await page.locator('#canvas').evaluate((canvas) => ({ width: canvas.width, height: canvas.height })))
        .toEqual({ width: 832, height: 448 });

    for (const viewport of [
        { width: 1280, height: 720 },
        { width: 1366, height: 768 },
        { width: 1440, height: 900 },
        { width: 1920, height: 1080 },
        { width: 834, height: 1112 },
    ]) {
        await page.setViewportSize(viewport);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const layout = await page.evaluate(() => {
            const stage = document.querySelector('#gameStage').getBoundingClientRect();
            const canvas = document.querySelector('#canvas').getBoundingClientRect();
            const targets = [...document.querySelectorAll('.btn, .arrowNavigate, .inventory-item')]
                .filter((element) => !element.disabled && element.offsetParent !== null)
                .map((element) => element.getBoundingClientRect());
            return {
                stageRight: stage.right,
                canvasRatio: canvas.width / canvas.height,
                minimumTarget: Math.min(...targets.map((target) => Math.min(target.width, target.height))),
                horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                verticalOverflow: document.documentElement.scrollHeight - document.documentElement.clientHeight,
            };
        });
        expect(layout.stageRight).toBeLessThanOrEqual(viewport.width + 1);
        expect(layout.canvasRatio).toBeCloseTo(832 / 448, 2);
        expect(layout.minimumTarget).toBeGreaterThanOrEqual(43);
        expect(layout.horizontalOverflow).toBeLessThanOrEqual(1);
        if (viewport.width >= 1280) expect(layout.verticalOverflow, `${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(1);
    }

    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await expect(page.locator('#interactionInfo')).toBeVisible();
    await expect(page.locator('#inventoryScrollDown')).toBeVisible();
    expect(runtimeErrors).toEqual([]);
});

test('long localisation, reduced motion, contrast, and touch presentation are real UI states', async ({ page }) => {
    await openDebugGame(page);
    await loadScenario(page, 'system.long-localisation');
    await page.evaluate(() => {
        window.__GAME_TEST__.setAccessibilityOption('highContrast', true);
        window.__GAME_TEST__.setAccessibilityOption('reducedMotion', true);
        window.__GAME_TEST__.setInputMode('touch');
    });
    await expect(page.locator('html')).toHaveAttribute('data-high-contrast', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-input-mode', 'touch');
    await expect(page.locator('#interactionInfo')).toBeVisible();
    const hotspot = page.locator('.semantic-hotspot').first();
    await expect(hotspot).toBeAttached();
    const targetId = await hotspot.getAttribute('data-target-id');
    await hotspot.tap();
    await expect.poll(async () => page.evaluate(async () => (await import('/constantsAndGlobalVars.js')).getUpcomingAction()?.primaryTargetId)).toBe(targetId);
});
