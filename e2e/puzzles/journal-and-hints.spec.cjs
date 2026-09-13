const { test, expect } = require('@playwright/test');
const { loadScenario, openDebugGame, summary, waitForIdle } = require('../_support/debug-session.cjs');

test.describe.configure({ timeout: 90_000 });

// The journal is the player's view of the canonical fact set. These tests
// assert it through stable data-* IDs, never through translated copy, and
// check the two properties that matter most: it must not spoil a puzzle the
// player has not met, and it must never leave the chapter unfinishable.

const objective = (page, objectiveId) => page.locator(`.journal-objective[data-objective-id="${objectiveId}"]`);

async function openJournal(page) {
    await page.locator('#openJournal').click();
    await expect(page.locator('#journalPanel')).toBeVisible();
}

test('the journal opens, lists only objectives the player has met, and closes on Escape', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

    await openDebugGame(page);
    await loadScenario(page, 'chapter1.new-game');
    await openJournal(page);

    await expect(page.locator('#openJournal')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#journalPanel')).toHaveAttribute('role', 'dialog');

    // The opening question is present; a puzzle six chains away is not named.
    await expect(objective(page, 'objective.libraryAccess')).toHaveAttribute('data-objective-status', 'active');
    await expect(objective(page, 'objective.wolf')).toHaveCount(0);
    await expect(objective(page, 'objective.bridge')).toHaveCount(0);

    await expect(page.locator('#journalProgress')).toHaveAttribute('data-milestones-reached', '0');

    await page.keyboard.press('Escape');
    await expect(page.locator('#journalPanel')).toBeHidden();
    await expect(page.locator('#openJournal')).toHaveAttribute('aria-expanded', 'false');

    expect(runtimeErrors).toEqual([]);
});

test('hints are never shown until asked for, then arrive one spoiler-safe tier at a time', async ({ page }) => {
    await openDebugGame(page);
    await loadScenario(page, 'chapter1.new-game');
    await openJournal(page);

    const hints = page.locator('.journal-hints[data-objective-id="objective.libraryAccess"] .journal-hint');
    await expect(hints).toHaveCount(0);

    const hintButton = page.locator('.journal-hint-button[data-objective-id="objective.libraryAccess"]');
    await hintButton.click();
    await expect(hints).toHaveCount(1);
    await expect(hints.nth(0)).toHaveAttribute('data-hint-tier', '1');

    await hintButton.click();
    await expect(hints).toHaveCount(2);

    await hintButton.click();
    await expect(hints).toHaveCount(3);

    // Three tiers is the whole ladder; the control disables rather than looping.
    await expect(hintButton).toBeDisabled();

    // Every tier rendered real authored copy, not a fallback key.
    for (let index = 0; index < 3; index += 1) {
        const text = await hints.nth(index).textContent();
        expect(text.trim().length).toBeGreaterThan(0);
        expect(text).not.toContain('objective.libraryAccess');
    }
});

test('the journal follows real progress and moves an objective to done', async ({ page }) => {
    await openDebugGame(page);
    await loadScenario(page, 'chapter1.research-unlock-ready');
    await openJournal(page);

    await expect(objective(page, 'objective.libraryAccess')).toHaveAttribute('data-objective-status', 'active');

    // Perform the milestone while the journal is open; it is subscribed to the
    // canonical store, so it must update without being reopened.
    await page.evaluate(() => window.__GAME_TEST__.applyMilestone('library.unlockResearchRoom'));

    await expect(objective(page, 'objective.libraryAccess')).toHaveAttribute('data-objective-status', 'done');
    await expect(page.locator('#journalProgress')).not.toHaveAttribute('data-milestones-reached', '0');

    // The research-room question only exists once the door is open.
    await expect(objective(page, 'objective.mapClue')).toHaveAttribute('data-objective-status', 'active');
});

test('a locked gate and a blocked action are explained by objective, not by fact ID', async ({ page }) => {
    await openDebugGame(page);
    await loadScenario(page, 'chapter1.new-game');

    expect(await page.evaluate(() => window.__GAME_TEST__.explainGateObjective('den.unlocked'))).toMatchObject({
        available: false,
        reason: 'missing-gate-fact',
        blockingObjectiveId: 'objective.denAccess',
    });

    expect(await page.evaluate(() => window.__GAME_TEST__.explainObjectiveForAction('river.resolveWolf'))).toMatchObject({
        available: false,
        reason: 'missing-prerequisites',
        chain: 'river',
    });

    await loadScenario(page, 'chapter1.wolf-ready');
    expect(await page.evaluate(() => window.__GAME_TEST__.explainObjectiveForAction('river.resolveWolf')))
        .toMatchObject({ available: true, blockingObjectiveIds: [] });
});

test('no milestone scenario can strand the player, including after the chapter is claimed', async ({ page }) => {
    await openDebugGame(page);

    for (const scenarioId of ['chapter1.new-game', 'chapter1.town-open', 'chapter1.den-unlock-ready', 'chapter1.rigging-ready', 'chapter1.bridge-ready', 'chapter1.map-entry']) {
        await loadScenario(page, scenarioId);
        expect(await page.evaluate(() => window.__GAME_TEST__.softLocks()), scenarioId)
            .toMatchObject({ softLocked: false, unreachableMandatoryFactIds: [] });
        await waitForIdle(page);
    }

    await page.evaluate(() => window.__GAME_TEST__.applyMilestone('chapter1.claimMap'));
    expect((await summary(page)).facts).toContain('chapter1.mapReached');
    expect(await page.evaluate(() => window.__GAME_TEST__.softLocks())).toMatchObject({ softLocked: false });
});

test('completing the chapter shows a summary of what was done and what was merely poked at', async ({ page }) => {
    await openDebugGame(page);
    await loadScenario(page, 'chapter1.map-entry');
    await page.evaluate(() => window.__GAME_TEST__.applyMilestone('chapter1.claimMap'));

    const chapterSummary = await page.evaluate(() => window.__GAME_TEST__.chapterSummary());
    expect(chapterSummary.chapterComplete).toBe(true);
    expect(chapterSummary.milestonesReached).toBe(chapterSummary.milestoneCount);
    expect(chapterSummary.outstandingObjectiveIds).toEqual([]);

    await openJournal(page);
    const panel = page.locator('.journal-summary');
    await expect(panel).toHaveAttribute('data-chapter-complete', 'true');
    await expect(panel).toHaveAttribute('data-objectives-completed', String(chapterSummary.objectivesCompleted));

    // Every objective is reported done, and the completed list is not empty.
    await expect(page.locator('.journal-section-completed .journal-objective')).toHaveCount(chapterSummary.objectiveCount);
    await expect(page.locator('.journal-section-active')).toHaveCount(0);
});

test('the journal renders authored copy in every shipped locale', async ({ page }) => {
    // One session, five locales. Reloading per locale is what pushed the suite
    // towards the 180-second gate in Section 5, and the locale control drives
    // exactly the same localisation path a language button does.
    await openDebugGame(page);
    await loadScenario(page, 'chapter1.new-game');
    await openJournal(page);

    const seenTitles = new Set();
    for (const locale of ['en', 'es', 'de', 'it', 'fr']) {
        await page.evaluate((selected) => window.__GAME_TEST__.setLocale(selected), locale);

        const title = (await objective(page, 'objective.libraryAccess').locator('.journal-objective-title').textContent()).trim();
        expect(title.length, `${locale} objective title`).toBeGreaterThan(0);
        expect(title, `${locale} must not fall back to the key`).not.toContain('objective.libraryAccess');
        seenTitles.add(title);

        const panelTitle = await page.locator('#journalTitle').textContent();
        expect(panelTitle, `${locale} panel title`).not.toContain('panelTitle');
    }

    // Five locales must produce five genuinely different strings, which is
    // what proves the journal is translated rather than merely present.
    expect(seenTitles.size).toBe(5);
});
