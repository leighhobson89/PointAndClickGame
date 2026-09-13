// Player-facing save, Continue, and milestone round trips.
//
// Every journey here arranges a state with a reviewed scenario and then uses
// the ordinary menu controls — Save Game, Return to Menu, Continue — so the
// path under test is the one a player takes. Assertions compare canonical
// progress across a full page reload and then check that the state a save
// deliberately does not carry was rebuilt.

const { test, expect } = require('@playwright/test');
const {
    canonicalChecksum,
    clearSaveSlots,
    clickGridCell,
    debugUrl,
    derivedRenderState,
    loadScenario,
    openDebugGame,
    readSaveSlot,
    returnToMenu,
    summary,
    waitForIdle,
} = require('../_support/debug-session.cjs');

/** Save through the menu the way a player does, and prove the slot was written. */
async function saveThroughMenu(page) {
    await returnToMenu(page);
    await page.locator('#saveGame').click();
    await expect(page.locator('#loadSaveGameStringPopup')).toBeVisible();
    const saveString = await page.locator('#loadSaveGameStringTextArea').inputValue();
    expect(saveString.length).toBeGreaterThan(0);
    await page.locator('#closeButtonSavePopup').click();
    return saveString;
}

/** Reload the page and continue the stored game through the menu button. */
async function reloadAndContinue(page, locale = 'en') {
    await page.goto(debugUrl());
    await expect(page.locator('body')).toHaveAttribute('data-debug-tools', 'enabled');
    await page.locator(`#btn${locale === 'en' ? 'English' : locale}`).click();
    await expect(page.locator('#continueGame')).toHaveAttribute('data-has-save', 'true');
    await page.locator('#continueGame').click();
    await expect(page.locator('#canvasContainer')).toBeVisible();
    await waitForIdle(page);
}

test('a mid-chapter game survives a full reload through Continue, with derived state rebuilt', async ({ page }) => {
    await openDebugGame(page);
    await clearSaveSlots(page);
    await loadScenario(page, 'chapter1.bridge-ready');

    const before = await summary(page);
    const checksumBefore = await canonicalChecksum(page);
    expect(before.facts).toContain('rigging.assembled');
    expect(before.inventory.length).toBeGreaterThan(0);

    await saveThroughMenu(page);

    // The stored save is a patch, not a copy of the shipped content.
    const stored = await readSaveSlot(page, 'resume');
    expect(stored.schemaVersion).toBe(2);
    expect(stored.payload.location.currentRoomId).toBe(before.roomId);
    expect(JSON.stringify(stored)).not.toContain('.png');
    expect(stored.payload.player.xPos).toBeUndefined();

    await reloadAndContinue(page);

    const after = await summary(page);
    expect(after.roomId).toBe(before.roomId);
    expect(after.facts).toEqual(before.facts);
    expect(after.inventory).toEqual(before.inventory);
    expect(after.locale).toBe(before.locale);
    expect(await canonicalChecksum(page)).toBe(checksumBefore);

    // None of this was in the save; all of it had to be rebuilt.
    const derived = await derivedRenderState(page);
    expect(derived.backgroundImage).toContain('.png');
    expect(derived.cellWidth).toBeGreaterThan(0);
    expect(derived.placementCells).toBeGreaterThan(0);
    expect(derived.hasVisualPosition).toBe(true);
});

/**
 * One case per Chapter 1 milestone, named by the fact the scenario has already
 * granted rather than the one it is poised to grant.
 */
const MILESTONES = [
    { milestone: 'library', scenario: 'chapter1.town-open', fact: 'library.researchRoomUnlocked' },
    { milestone: 'den', scenario: 'chapter1.rigging-ready', fact: 'den.unlocked' },
    { milestone: 'rigging', scenario: 'chapter1.bridge-ready', fact: 'rigging.assembled' },
    { milestone: 'bridge', scenario: 'chapter1.wolf-ready', fact: 'bridge.repaired' },
    { milestone: 'wolf', scenario: 'chapter1.map-entry', fact: 'river.wolfResolved' },
];

for (const milestone of MILESTONES) {
    test(`saving and resuming at the ${milestone.milestone} milestone preserves canonical and visible state`, async ({ page }) => {
        await openDebugGame(page);
        await clearSaveSlots(page);
        await loadScenario(page, milestone.scenario);

        const before = await summary(page);
        const checksumBefore = await canonicalChecksum(page);
        expect(before.facts).toContain(milestone.fact);

        await saveThroughMenu(page);
        await reloadAndContinue(page);

        const after = await summary(page);
        expect(after.roomId).toBe(before.roomId);
        expect(after.facts).toEqual(before.facts);
        expect(after.inventory).toEqual(before.inventory);
        expect(await canonicalChecksum(page)).toBe(checksumBefore);

        const derived = await derivedRenderState(page);
        expect(derived.backgroundImage).toContain('.png');
        expect(derived.placementCells).toBeGreaterThan(0);
    });
}

test('saving and resuming at the Map milestone preserves canonical and visible state', async ({ page }) => {
    await openDebugGame(page);
    await clearSaveSlots(page);
    await loadScenario(page, 'chapter1.map-entry');

    // Walk into the Map through the opened river gate, as a player would.
    await page.evaluate(() => window.__GAME_TEST__.setMovementSpeed('instant'));
    await clickGridCell(page, 'e2');
    await expect.poll(async () => (await summary(page)).roomId, { timeout: 10_000 }).toBe('map');
    await waitForIdle(page);

    const before = await summary(page);
    const checksumBefore = await canonicalChecksum(page);

    await saveThroughMenu(page);
    await reloadAndContinue(page);

    const after = await summary(page);
    expect(after.roomId).toBe('map');
    expect(after.facts).toEqual(before.facts);
    expect(await canonicalChecksum(page)).toBe(checksumBefore);

    const derived = await derivedRenderState(page);
    expect(derived.backgroundImage).toContain('map');
    expect(derived.cellWidth).toBeGreaterThan(0);
});

test('a clean new game owns the resume slot immediately', async ({ page }) => {
    await openDebugGame(page);
    await clearSaveSlots(page);

    // Arrange a played-through state, save it, then start over.
    await loadScenario(page, 'chapter1.map-entry');
    await saveThroughMenu(page);
    expect((await readSaveSlot(page, 'resume')).payload.quests.facts['river.wolfResolved']).toBe(true);

    await page.locator('#newGame').click();
    await expect(page.locator('#canvasContainer')).toBeVisible();
    await waitForIdle(page);

    const fresh = await readSaveSlot(page, 'resume');
    expect(fresh.payload.quests.facts['river.wolfResolved']).toBeUndefined();
    expect(fresh.payload.location.currentRoomId).toBe('libraryFoyer');
    expect(fresh.label).toBe('newGame');
});

test('a milestone checkpoints itself without the player asking', async ({ page }) => {
    await openDebugGame(page);
    await clearSaveSlots(page);
    await loadScenario(page, 'chapter1.research-unlock-ready');

    // The real unlock, performed with real clicks: use the key on the door.
    await page.evaluate(() => window.__GAME_TEST__.setMovementSpeed('instant'));
    await page.locator('[data-verb-id="use"]').click();
    await page.locator('.inventory-item img[alt="objectKeyResearchRoom"]').click();
    await clickGridCell(page, 'oobjectDoorLibraryFoyerResearchRoom');

    await expect.poll(async () => (await summary(page)).facts, { timeout: 20_000 })
        .toContain('library.researchRoomUnlocked');

    const checkpoint = await readSaveSlot(page, 'checkpoint');
    expect(checkpoint, 'reaching a declared milestone writes the checkpoint slot').toBeTruthy();
    expect(checkpoint.label).toBe('library.researchRoomUnlocked');
    expect(checkpoint.payload.quests.facts['library.researchRoomUnlocked']).toBe(true);
});
