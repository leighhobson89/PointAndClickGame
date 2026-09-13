const { test, expect } = require('@playwright/test');

test('five New Game cycles keep one session listener set', async ({ page }) => {
    await page.addInitScript(() => {
        const listeners = new WeakMap();
        const originalAdd = EventTarget.prototype.addEventListener;
        const originalRemove = EventTarget.prototype.removeEventListener;

        EventTarget.prototype.addEventListener = function(type, listener, options) {
            let targetListeners = listeners.get(this);
            if (!targetListeners) {
                targetListeners = new Map();
                listeners.set(this, targetListeners);
            }
            if (!targetListeners.has(type)) targetListeners.set(type, new Set());
            targetListeners.get(type).add(listener);
            return originalAdd.call(this, type, listener, options);
        };

        EventTarget.prototype.removeEventListener = function(type, listener, options) {
            listeners.get(this)?.get(type)?.delete(listener);
            return originalRemove.call(this, type, listener, options);
        };

        window.__activeListenerCount = (targetName, type) => {
            const target = targetName === 'window' ? window : document.querySelector(targetName);
            return listeners.get(target)?.get(type)?.size ?? 0;
        };
    });

    await page.goto('/index.html');
    await page.locator('#btnEnglish').click();

    for (let generation = 1; generation <= 5; generation += 1) {
        await page.locator('#newGame').click();
        await expect(page.locator('#canvasContainer')).toBeVisible();
        await expect(page.locator('body')).toHaveAttribute('data-session-generation', String(generation));

        if (generation < 5) {
            await page.locator('#returnToMenu').click();
            await expect(page.locator('#menu')).toBeVisible();
        }
    }

    const counts = await page.evaluate(() => ({
        resize: window.__activeListenerCount('window', 'resize'),
        canvasMouseMove: window.__activeListenerCount('#canvas', 'mousemove'),
    }));

    expect(counts.resize).toBe(1);
    expect(counts.canvasMouseMove).toBe(2);
});
