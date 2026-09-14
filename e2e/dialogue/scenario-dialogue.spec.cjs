const { test, expect } = require('@playwright/test');
const { clickGridCell, loadScenario, openDebugGame, restoreNativeTimers, summary, waitForIdle } = require('../_support/debug-session.cjs');

test.describe.configure({ timeout: 90_000 });

test('the debug surface describes dialogue nodes, choices, conditions, and consequences by ID', async ({ page }) => {
    await openDebugGame(page);
    await loadScenario(page, 'chapter1.library-riddle');

    const start = await page.evaluate(() => window.__GAME_TEST__.describeDialogue('npcLibrarian'));
    expect(start).toMatchObject({ graphId: 'library.librarianTutorial', type: 'line', speaker: 'player' });

    const choices = await page.evaluate(() => window.__GAME_TEST__.describeDialogue('npcLibrarian', 'library.librarian.q0.choices'));
    expect(choices.type).toBe('choice');
    expect(choices.choices.map((choice) => choice.id)).toContain('library.librarian.askResearchKey');
    expect(choices.choices.every((choice) => typeof choice.textKey === 'string')).toBe(true);

    const consequence = await page.evaluate(() => window.__GAME_TEST__.describeDialogue('npcLibrarian', 'library.librarian.end.riddleKnown'));
    expect(consequence).toMatchObject({ type: 'end', actions: ['library.learnRiddle'] });

    expect(await page.evaluate(() => window.__GAME_TEST__.inspectNpc('npcLibrarian'))).toMatchObject({
        npcId: 'npcLibrarian',
        roomId: 'libraryFoyer',
        visible: true,
        canTalk: true,
    });
});

test('a dialogue scenario reaches the riddle consequence through real clicks', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

    await openDebugGame(page);
    await loadScenario(page, 'chapter1.library-riddle');
    await page.evaluate(() => window.__GAME_TEST__.setMovementSpeed('instant'));
    await page.evaluate(() => window.__GAME_TEST__.setTextSpeed('instant'));

    await page.locator('[data-verb-id="talkTo"]').click();
    await clickGridCell(page, 'cnpcLibrarian');

    for (const choiceId of ['library.librarian.askResearchKey', 'library.librarian.pressForResearchKey']) {
        const choice = page.locator(`[data-choice-id="${choiceId}"]`);
        await expect(choice).toBeVisible({ timeout: 20_000 });
        await expect(choice).not.toHaveText(new RegExp(choiceId.replace(/\./g, '\\.')));
        await choice.click();
    }

    await expect.poll(async () => (await summary(page)).facts, { timeout: 20_000 }).toContain('library.riddleKnown');
    await expect.poll(async () => page.evaluate(() => window.__GAME_TEST__.inspectNpc('npcLibrarian').canTalk), { timeout: 20_000 }).toBe(false);

    // Both choices are stable recorded variants, so how the player handled the
    // librarian is canonical progress that survives a save and reaches the
    // chapter summary rather than living only in dialogue state.
    expect(await page.evaluate(() => window.__GAME_TEST__.recordedChoices())).toEqual([
        'library.librarian.askResearchKey',
        'library.librarian.pressForResearchKey',
    ]);
    expect(await page.evaluate(() => window.__GAME_TEST__.chapterSummary())).toMatchObject({
        chapterComplete: false,
        choiceIds: ['library.librarian.askResearchKey', 'library.librarian.pressForResearchKey'],
    });

    await waitForIdle(page);
    expect((await summary(page)).presentationMode).toBe('gameVisibleActive');
    expect(runtimeErrors).toEqual([]);
});

test('text speed and line skipping are deterministic debug controls', async ({ page }) => {
    await openDebugGame(page);
    await loadScenario(page, 'system.long-localisation');

    expect((await summary(page)).locale).toBe('de');
    await restoreNativeTimers(page);
    expect(await page.evaluate(() => window.__GAME_TEST__.setTextSpeed('slow'))).toMatchObject({ speedId: 'slow', multiplier: 2 });

    // Nothing is on screen, so skipping is refused rather than faked.
    expect(await page.evaluate(() => window.__GAME_TEST__.skipDialogueLine())).toMatchObject({ reason: 'no-active-line' });

    // A structured intent avoids a walk so the test measures the text controls
    // only. Slow text keeps the line on screen long enough to prove the skip
    // control ends it early rather than the timer simply expiring.
    await page.evaluate(() => {
        window.__GAME_TEST__.selectVerb('lookAt');
        return window.__GAME_TEST__.selectTarget('npcLibrarian');
    });

    await expect.poll(async () => page.evaluate(() => window.__GAME_TEST__.inspectSummary().activeDialogue.displayingText), { timeout: 20_000 })
        .toBe(true);
    const skipped = await page.evaluate(() => window.__GAME_TEST__.skipDialogueLine());
    expect(skipped.skipped).toBe(true);

    expect((await waitForIdle(page, { timeoutMs: 15_000 })).idle).toBe(true);
    expect(await page.evaluate(() => window.__GAME_TEST__.inspectSummary().activeDialogue.displayingText)).toBe(false);
});

test('a seven-choice dialogue keeps four readable rows and scrolls to every authored option', async ({ page }) => {
    await openDebugGame(page);
    await loadScenario(page, 'chapter1.library-riddle');
    await page.evaluate(() => {
        window.__GAME_TEST__.setMovementSpeed('instant');
        window.__GAME_TEST__.setTextSpeed('instant');
    });
    await page.locator('[data-verb-id="talkTo"]').click();
    await clickGridCell(page, 'cnpcLibrarian');

    const rows = page.locator('.dialogueRow');
    await expect(rows).toHaveCount(4, { timeout: 20_000 });
    await expect(page.locator('[data-choice-id="library.librarian.q0.exit"]')).toBeVisible();
    await expect(page.locator('[data-choice-id="library.librarian.q0.aside5"]')).toHaveCount(0);

    await page.locator('#dialogueScrollDown').click();
    await page.locator('#dialogueScrollDown').click();
    await page.locator('#dialogueScrollDown').click();
    await expect(rows).toHaveCount(4);
    await expect(page.locator('[data-choice-id="library.librarian.q0.aside5"]')).toBeVisible();
    await expect(page.locator('[data-choice-id="library.librarian.q0.exit"]')).toBeVisible();

    await page.locator('[data-choice-id="library.librarian.q0.exit"]').click();
    await expect.poll(async () => (await summary(page)).presentationMode, { timeout: 20_000 }).toBe('gameVisibleActive');
});
