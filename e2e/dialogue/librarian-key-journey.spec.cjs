const { test, expect } = require('@playwright/test');
const { clickGridCell, openDebugGame, waitForIdle } = require('../_support/debug-session.cjs');

test.describe.configure({ timeout: 90_000 });

/**
 * Record every line the conversation hands to the renderer, with the speaker
 * and the position it will actually be drawn at. A line shown without claiming
 * its speaker is drawn at the previous speaker's coordinates, or at no
 * coordinates at all, which is invisible rather than merely misplaced.
 */
async function captureSpokenLines(page) {
    await page.evaluate(async () => {
        const state = await import('/constantsAndGlobalVars.js');
        const queue = state.getTextQueue();
        window.__SPOKEN_LINES__ = [];
        const nativePush = queue.push.bind(queue);
        queue.push = (...entries) => {
            for (const entry of entries) {
                window.__SPOKEN_LINES__.push({
                    text: entry.text,
                    speaker: state.getCurrentSpeaker(),
                    xPos: Number.isFinite(entry.xPos) ? entry.xPos : null,
                    yPos: Number.isFinite(entry.yPos) ? entry.yPos : null,
                });
            }
            return nativePush(...entries);
        };
    });
}

async function spokenLines(page) {
    return page.evaluate(() => window.__SPOKEN_LINES__.map((line) => ({ ...line })));
}

/**
 * The authored copy for a librarian line, read from shipped content in the
 * running locale, so the expectation stays semantic instead of hard-coding a
 * translated string.
 */
async function authoredLine(page, questId, path) {
    return page.evaluate(async ({ quest, keys }) => {
        const { getDialogueData, getLanguage } = await import('/constantsAndGlobalVars.js');
        let value = getDialogueData().dialogue.npcInteractions.verbTalkTo.npcLibrarian.quest[quest];
        for (const key of keys) value = value[key];
        return value[getLanguage()];
    }, { quest: questId, keys: path });
}

async function talkToLibrarian(page) {
    await page.locator('[data-verb-id="talkTo"]').click();
    await clickGridCell(page, 'cnpcLibrarian');
}

async function startLibrarianSession(page) {
    await openDebugGame(page);
    await page.evaluate(() => window.__GAME_TEST__.setMovementSpeed('instant'));
    await page.evaluate(() => window.__GAME_TEST__.setTextSpeed('instant'));
    await captureSpokenLines(page);
}

test('asking for the research room key speaks the player line and stays in the same conversation', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await startLibrarianSession(page);

    await talkToLibrarian(page);

    const askForKey = page.locator('[data-choice-id="library.librarian.askResearchKey"]');
    await expect(askForKey).toBeVisible({ timeout: 20_000 });
    const chosenText = (await askForKey.textContent()).trim();
    await askForKey.click();

    // The conversation continues into the librarian's second phase without
    // ending, so her next choices are the proof the journey carried on.
    await expect(page.locator('[data-choice-id="library.librarian.pressForResearchKey"]')).toBeVisible({ timeout: 20_000 });

    const spoken = await spokenLines(page);
    const playerLine = spoken.find((line) => line.text.trim() === chosenText);

    // The chosen option is spoken by the player, at the player's position.
    expect(playerLine, 'the chosen option should be spoken aloud').toBeTruthy();
    expect(playerLine.speaker).toBe('player');
    expect(playerLine.xPos).not.toBeNull();
    expect(playerLine.yPos).not.toBeNull();

    const keyResponses = [
        await authoredLine(page, '0', ['responses', '0', 'phase', '0']),
        await authoredLine(page, '0', ['responses', '0', 'phase', '1']),
    ];
    const greeting = await authoredLine(page, '1', ['phase', '0']);
    const spokenText = spoken.map((line) => line.text);

    // The librarian answers the request, and does not greet the player again
    // part way through the same exchange.
    for (const response of keyResponses) expect(spokenText).toContain(response);
    expect(spokenText).not.toContain(greeting);
    expect(spoken.every((line) => line.xPos !== null && line.yPos !== null)).toBe(true);
    expect(runtimeErrors).toEqual([]);
});

test('walking away after asking for the key resumes at the librarian second phase', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await startLibrarianSession(page);

    await talkToLibrarian(page);
    await page.locator('[data-choice-id="library.librarian.askResearchKey"]').click({ timeout: 20_000 });

    const leave = page.locator('[data-choice-id="library.librarian.q1.exit"]');
    await expect(leave).toBeVisible({ timeout: 20_000 });
    await leave.click();

    await expect.poll(async () => page.evaluate(() => window.__GAME_TEST__.inspectNpc('npcLibrarian').questPhase), { timeout: 20_000 }).toBe(1);
    await waitForIdle(page);

    await captureSpokenLines(page);
    await talkToLibrarian(page);

    // A fresh conversation now opens on her second phase: the greeting for a
    // player who is back, and the choices that follow the key request.
    await expect(page.locator('[data-choice-id="library.librarian.pressForResearchKey"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-choice-id="library.librarian.askResearchKey"]')).toHaveCount(0);

    const spokenText = (await spokenLines(page)).map((line) => line.text);
    expect(spokenText).toContain(await authoredLine(page, '1', ['phase', '0']));
    expect(spokenText).not.toContain(await authoredLine(page, '0', ['phase', '0']));
    expect(runtimeErrors).toEqual([]);
});
