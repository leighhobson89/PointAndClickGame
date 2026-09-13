// What happens when a save cannot be trusted, and how a save moves between
// sessions. The rule under test throughout is that progress is never partially
// applied: a save either restores completely or changes nothing at all.

const { test, expect } = require('@playwright/test');
const {
    canonicalChecksum,
    clearSaveSlots,
    debugUrl,
    loadScenario,
    openDebugGame,
    readSaveSlot,
    returnToMenu,
    summary,
    waitForIdle,
} = require('../_support/debug-session.cjs');

async function pasteAndLoad(page, saveString) {
    await page.locator('#loadGame').click();
    await expect(page.locator('#loadSaveGameStringPopup')).toBeVisible();
    await page.locator('#loadSaveGameStringTextArea').fill(saveString);
    await page.locator('#loadStringButton').click();
}

test('a corrupt save is refused and the running session is left exactly as it was', async ({ page }) => {
    await openDebugGame(page);
    await clearSaveSlots(page);
    await loadScenario(page, 'chapter1.rigging-ready');

    const before = await summary(page);
    // Taken in the menu, because the digest includes the presentation mode and
    // opening the menu legitimately changes it.
    await returnToMenu(page);
    const checksumBefore = await canonicalChecksum(page);

    await pasteAndLoad(page, 'this is not a save at all');

    await expect(page.locator('#saveStatus')).toHaveAttribute('data-save-event', 'save.restoreFailed');
    await expect(page.locator('#saveStatus')).toHaveAttribute('role', 'alert');

    const after = await summary(page);
    expect(after.roomId).toBe(before.roomId);
    expect(after.facts).toEqual(before.facts);
    expect(after.inventory).toEqual(before.inventory);
    expect(await canonicalChecksum(page)).toBe(checksumBefore);
});

test('a save from an unsupported future version is refused rather than half-applied', async ({ page }) => {
    await openDebugGame(page);
    await clearSaveSlots(page);
    await loadScenario(page, 'chapter1.town-open');

    const future = JSON.stringify({ format: 'pointAndClick.save', schemaVersion: 99, payload: { location: { currentRoomId: 'marketStreet' } } });

    await returnToMenu(page);
    const checksumBefore = await canonicalChecksum(page);
    await pasteAndLoad(page, future);

    await expect(page.locator('#saveStatus')).toHaveAttribute('data-save-code', 'save.unsupportedVersion');
    expect(await canonicalChecksum(page)).toBe(checksumBefore);
});

test('a declared legacy save migrates into the current format and restores', async ({ page }) => {
    await openDebugGame(page);
    await clearSaveSlots(page);
    await loadScenario(page, 'chapter1.den-unlock-ready');

    const before = await summary(page);

    // Build exactly what a version 1 save looked like: the whole canonical
    // state, content bundle included, under the old envelope.
    const legacy = await page.evaluate(async () => {
        const { getCanonicalGameState } = await import('/constantsAndGlobalVars.js');
        return JSON.stringify({ schemaVersion: 1, state: getCanonicalGameState() });
    });

    await page.goto(debugUrl());
    await expect(page.locator('body')).toHaveAttribute('data-debug-tools', 'enabled');
    await page.locator('#btnEnglish').click();
    await page.locator('#newGame').click();
    await expect(page.locator('#canvasContainer')).toBeVisible();
    await waitForIdle(page);

    await returnToMenu(page);
    await pasteAndLoad(page, legacy);
    await expect(page.locator('#canvasContainer')).toBeVisible();
    await waitForIdle(page);

    const after = await summary(page);
    expect(after.roomId).toBe(before.roomId);
    expect(after.facts).toEqual(before.facts);
    expect(after.inventory).toEqual(before.inventory);
});

test('a manual save string moves a game into a fresh session', async ({ page }) => {
    await openDebugGame(page);
    await clearSaveSlots(page);
    await loadScenario(page, 'chapter1.wolf-ready');

    const before = await summary(page);
    const checksumBefore = await canonicalChecksum(page);

    await returnToMenu(page);
    await page.locator('#saveGame').click();
    const saveString = await page.locator('#loadSaveGameStringTextArea').inputValue();
    await page.locator('#closeButtonSavePopup').click();

    // A brand-new session, with the stored slots cleared so only the pasted
    // string can carry the progress across.
    await page.goto(debugUrl());
    await expect(page.locator('body')).toHaveAttribute('data-debug-tools', 'enabled');
    await clearSaveSlots(page);
    await page.locator('#btnEnglish').click();
    await page.locator('#newGame').click();
    await expect(page.locator('#canvasContainer')).toBeVisible();
    await waitForIdle(page);

    expect((await summary(page)).facts).not.toContain('bridge.repaired');

    await returnToMenu(page);
    await pasteAndLoad(page, saveString);
    await expect(page.locator('#canvasContainer')).toBeVisible();
    await waitForIdle(page);

    const after = await summary(page);
    expect(after.roomId).toBe(before.roomId);
    expect(after.facts).toEqual(before.facts);
    expect(await canonicalChecksum(page)).toBe(checksumBefore);
});

test('a storage failure is reported without interrupting play, and Continue stays honest', async ({ page }) => {
    await openDebugGame(page);
    await loadScenario(page, 'chapter1.town-open');

    // Clear after arranging: committing the scenario's milestone facts
    // checkpoints them, which is the behaviour the milestone tests rely on.
    await clearSaveSlots(page);
    await returnToMenu(page);
    await expect(page.locator('#continueGame')).toHaveAttribute('data-has-save', 'false');
    const checksumBefore = await canonicalChecksum(page);

    // Make every write fail the way a full or blocked storage quota would.
    await page.evaluate(() => {
        window.__originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function blocked() { throw new Error('Simulated storage write failure'); };
    });

    await page.locator('#saveGame').click();

    await expect(page.locator('#saveStatus')).toHaveAttribute('data-save-event', 'save.failed');
    await expect(page.locator('#loadSaveGameStringPopup')).toBeHidden();
    expect(await readSaveSlot(page, 'resume')).toBeNull();
    await expect(page.locator('#continueGame')).toHaveClass(/disabled/);

    await page.evaluate(() => { Storage.prototype.setItem = window.__originalSetItem; });

    // The game itself never noticed.
    expect(await canonicalChecksum(page)).toBe(checksumBefore);
});
