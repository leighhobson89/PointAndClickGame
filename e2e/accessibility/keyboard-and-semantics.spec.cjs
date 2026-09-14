const { test, expect } = require('@playwright/test');
const { loadScenario, openDebugGame } = require('../_support/debug-session.cjs');

test('keyboard users can select verbs, discover named canvas hotspots, and go back', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await openDebugGame(page);
    await loadScenario(page, 'chapter1.town-open');

    await page.keyboard.press('1');
    await expect(page.locator('[data-verb-id="lookAt"]')).toHaveAttribute('aria-pressed', 'true');

    const hotspot = page.locator('.semantic-hotspot').first();
    await expect(hotspot).toBeAttached();
    await expect(hotspot).not.toHaveAttribute('aria-label', '');
    const targetId = await hotspot.getAttribute('data-target-id');
    await hotspot.focus();
    await expect(hotspot).toBeFocused();
    await page.keyboard.press('Enter');
    await expect.poll(async () => page.evaluate(async () => (await import('/constantsAndGlobalVars.js')).getUpcomingAction()?.primaryTargetId)).toBe(targetId);

    await page.keyboard.press('Escape');
    await expect(page.locator('#menu')).toBeVisible();
    expect(runtimeErrors).toEqual([]);
});

test('settings trap focus, persist preferences, and restore focus to the opener', async ({ page }) => {
    await openDebugGame(page);
    const opener = page.locator('#openSettingsGame');
    await opener.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#settingsPanel')).toBeVisible();
    await expect(page.locator('#settingTheme option')).toHaveCount(10);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'mountain');
    const themeSignatures = [];
    for (const theme of ['mountain', 'river', 'arctic', 'midnight', 'forest', 'sunset', 'desert', 'royal', 'rose', 'storybook']) {
        await page.locator('#settingTheme').selectOption(theme);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        themeSignatures.push(await page.evaluate(() => {
            const style = getComputedStyle(document.documentElement);
            return `${style.getPropertyValue('--surface')}|${style.getPropertyValue('--accent')}`;
        }));
    }
    expect(new Set(themeSignatures).size).toBe(10);
    await page.locator('#settingTheme').selectOption('midnight');
    await page.locator('#settingTextSpeed').selectOption('fast');
    await page.locator('#settingHotspotHelp').check();
    await page.locator('#settingHotspotIntensity').selectOption('strong');
    await page.locator('#closeSettings').click();
    await expect(opener).toBeFocused();
    await expect(page.locator('html')).toHaveAttribute('data-hotspot-help', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight');
    await expect(page.locator('html')).toHaveAttribute('data-hotspot-intensity', 'strong');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-hotspot-help', 'true');
    await page.locator('#openSettingsMenu').click();
    await expect(page.locator('#settingTheme')).toHaveValue('midnight');
    await expect(page.locator('#settingTextSpeed')).toHaveValue('fast');
    await expect(page.locator('#settingHotspotHelp')).toBeChecked();
    await expect(page.locator('#settingHotspotIntensity')).toHaveValue('strong');
});

test('every room exposes its canvas interactions as named semantic controls', async ({ page }) => {
    await openDebugGame(page);
    const rooms = await page.evaluate(() => window.__GAME_TEST__.listRooms().map((room) => room.roomId));
    for (const roomId of rooms) {
        await page.evaluate((id) => window.__GAME_TEST__.teleport({ roomId: id }), roomId);
        await expect.poll(async () => page.locator('.semantic-hotspot').count()).toBeGreaterThan(0);
        const semantics = await page.locator('.semantic-hotspot').evaluateAll((buttons) => {
            const stage = document.querySelector('#hotspotLayer').getBoundingClientRect();
            return buttons.map((button) => {
            const target = button.getBoundingClientRect();
            return {
                label: button.getAttribute('aria-label'),
                targetId: button.dataset.targetId,
                width: Math.min(target.right, stage.right) - Math.max(target.left, stage.left),
                height: Math.min(target.bottom, stage.bottom) - Math.max(target.top, stage.top),
            };
            });
        });
        expect(semantics.filter((hotspot) => !hotspot.label || !hotspot.targetId || hotspot.width < 43.99 || hotspot.height < 43.99), roomId).toEqual([]);
    }
});
