const { test, expect } = require('@playwright/test');
const { clickGridCell, loadScenario, openDebugGame, summary, waitForIdle } = require('../_support/debug-session.cjs');

test.describe.configure({ timeout: 90_000 });

// These are the tests Section 4 exists to make possible: a scenario arranges
// the prerequisites, and the milestone itself is then performed with the same
// clicks a player would use.

test('a scenario arranges the research-room prerequisites and the player performs the unlock', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

    await openDebugGame(page);
    await loadScenario(page, 'chapter1.research-unlock-ready');

    // The key is carried, the riddle is known, and the door is still locked.
    expect((await summary(page)).inventory).toContain('objectKeyResearchRoom');
    expect(await page.evaluate(() => window.__GAME_TEST__.explainGate('libraryFoyer', 'e1'))).toEqual({
        available: false,
        reason: 'missing-gate-fact',
        missingFactIds: ['library.researchRoomUnlocked'],
    });
    expect(await page.evaluate(() => window.__GAME_TEST__.explainAction('library.unlockResearchRoom')))
        .toMatchObject({ available: true, missingFactIds: [] });

    // Real input from here: choose Use, click the carried key, click the door.
    await page.evaluate(() => window.__GAME_TEST__.setMovementSpeed('instant'));
    await page.locator('[data-verb-id="use"]').click();
    await page.locator('.inventory-item img[alt="objectKeyResearchRoom"]').click();
    await clickGridCell(page, 'oobjectDoorLibraryFoyerResearchRoom');

    await expect.poll(async () => (await summary(page)).facts, { timeout: 20_000 })
        .toContain('library.researchRoomUnlocked');
    expect(await page.evaluate(() => window.__GAME_TEST__.explainGate('libraryFoyer', 'e1')))
        .toMatchObject({ available: true });

    // A real interaction performed in the right order must record its canonical
    // action cleanly, with no out-of-order anomaly logged against the graph.
    expect(await page.evaluate(() => window.__GAME_TEST__.progressDiagnostics())).toEqual([]);

    expect(runtimeErrors).toEqual([]);
});

test('a milestone scenario can be reverted and replayed to the same checksum', async ({ page }) => {
    await openDebugGame(page);

    const before = await loadScenario(page, 'chapter1.den-unlock-ready');
    await page.evaluate(() => window.__GAME_TEST__.applyMilestone('den.unlock'));
    const advanced = await summary(page);
    expect(advanced.facts).toContain('den.unlocked');

    // Reverting is a scenario reload, not a bespoke undo path.
    const reverted = await loadScenario(page, 'chapter1.den-unlock-ready');
    expect(reverted.checksum).toBe(before.checksum);
    expect((await summary(page)).facts).not.toContain('den.unlocked');
    expect(await page.evaluate(() => window.__GAME_TEST__.explainGate('alley', 'e1')))
        .toMatchObject({ available: false, missingFactIds: ['den.unlocked'] });
});

test('every chapter milestone scenario is reachable and leaves a consistent critical path', async ({ page }) => {
    await openDebugGame(page);

    // Chapter 1 runs several threads at once, so the frontier is a set rather
    // than a single next step. What each scenario must guarantee is that the
    // milestone it exists to test is genuinely performable from it, that every
    // action offered is really available and unfinished, and that the state is
    // one the real game could be in.
    const ordered = [
        ['chapter1.new-game', 'library.learnRiddle'],
        ['chapter1.research-unlock-ready', 'library.unlockResearchRoom'],
        ['chapter1.town-open', 'library.collectFlyer'],
        ['chapter1.den-unlock-ready', 'den.unlock'],
        ['chapter1.barn-unblock-ready', 'donkey.feed'],
        ['chapter1.rigging-ready', 'rigging.combineRopeAndHook'],
        ['chapter1.bridge-ready', 'bridge.repair'],
        ['chapter1.wolf-ready', 'river.resolveWolf'],
        ['chapter1.map-entry', 'chapter1.claimMap'],
    ];

    for (const [scenarioId, expectedMilestone] of ordered) {
        await loadScenario(page, scenarioId);
        const frontier = await page.evaluate(() => window.__GAME_TEST__.criticalPathFrontier().map((entry) => entry.actionId).sort());
        expect(frontier, `${scenarioId} frontier`).toContain(expectedMilestone);

        for (const actionId of frontier) {
            expect(await page.evaluate((id) => window.__GAME_TEST__.explainAction(id), actionId), `${scenarioId}: ${actionId}`)
                .toMatchObject({ available: true, missingFactIds: [] });
        }
        expect(await page.evaluate(() => window.__GAME_TEST__.factConflicts()), `${scenarioId} conflicts`).toMatchObject({ valid: true });
        expect(await page.evaluate(() => window.__GAME_TEST__.softLocks()), `${scenarioId} soft locks`)
            .toMatchObject({ softLocked: false, unreachableMandatoryFactIds: [] });
        await waitForIdle(page);
    }
});
