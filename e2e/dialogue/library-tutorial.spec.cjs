const { test, expect } = require('@playwright/test');

const LOCALES = [
    ['en', '#btnEnglish'],
    ['es', '#btnSpanish'],
    ['de', '#btnGerman'],
    ['it', '#btnItalian'],
    ['fr', '#btnFrench'],
];

const VERB_IDS = ['lookAt', 'pickUp', 'use', 'open', 'close', 'push', 'pull', 'talkTo', 'give'];

for (const [locale, languageButton] of LOCALES) {
    test(`librarian tutorial uses stable choices in ${locale}`, async ({ page }) => {
        const runtimeErrors = [];
        page.on('pageerror', (error) => runtimeErrors.push(error.message));
        await page.addInitScript(() => {
            const nativeSetTimeout = window.setTimeout.bind(window);
            window.setTimeout = (callback, delay = 0, ...args) =>
                nativeSetTimeout(callback, Math.min(delay, 10), ...args);
        });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto('/index.html');
        await page.locator(languageButton).click();
        await page.locator('#newGame').click();

        await expect.poll(async () => page.evaluate(async () => {
            const state = await import('/constantsAndGlobalVars.js');
            return `${state.getLanguage()}:${state.getCurrentScreenId()}:${state.getGameStateVariable()}`;
        }), { timeout: 5_000 }).toBe(`${locale}:libraryFoyer:gameVisibleActive`);

        await expect(page.locator('[data-verb-id]')).toHaveCount(VERB_IDS.length);
        expect(await page.locator('[data-verb-id]').evaluateAll((buttons) => buttons.map((button) => button.dataset.verbId))).toEqual(VERB_IDS);

        await page.locator('[data-verb-id="talkTo"]').click();
        const librarianCell = await page.evaluate(async () => {
            const { getGridData } = await import('/constantsAndGlobalVars.js');
            const grid = getGridData().gridData;
            for (let y = 0; y < grid.length; y += 1) {
                const x = grid[y].indexOf('cnpcLibrarian');
                if (x >= 0) return { x, y };
            }
            throw new Error('Librarian is not present in the Library Foyer grid');
        });
        const canvasSize = await page.locator('#canvas').evaluate((canvas) => ({
            width: canvas.clientWidth,
            height: canvas.clientHeight,
        }));
        await page.locator('#canvas').click({
            position: {
                x: ((librarianCell.x + 0.5) / 80) * canvasSize.width,
                y: ((librarianCell.y + 0.5) / 60) * canvasSize.height,
            },
        });

        const firstChoice = page.locator('[data-choice-id="library.librarian.askResearchKey"]');
        await expect(firstChoice).toBeVisible({ timeout: 10_000 });
        await expect(firstChoice).not.toHaveText(/library\.librarian\./);
        await firstChoice.click();

        const secondChoice = page.locator('[data-choice-id="library.librarian.pressForResearchKey"]');
        await expect(secondChoice).toBeVisible({ timeout: 10_000 });
        await expect(secondChoice).not.toHaveText(/library\.librarian\./);
        await secondChoice.click();

        await expect.poll(async () => page.evaluate(async () => {
            const state = await import('/constantsAndGlobalVars.js');
            return {
                riddleKnown: state.getQuestFacts()['library.riddleKnown'],
                mode: state.getGameStateVariable(),
                librarianCanTalk: state.getNpcData().npcs.npcLibrarian.interactable.canTalk,
                booksCanHover: state.getObjectData().objects.objectPileOfBooksLibraryFoyer.interactable.canHover,
            };
        }), { timeout: 10_000 }).toEqual({
            riddleKnown: true,
            mode: 'gameVisibleActive',
            librarianCanTalk: false,
            booksCanHover: true,
        });
        expect(runtimeErrors).toEqual([]);
    });
}
