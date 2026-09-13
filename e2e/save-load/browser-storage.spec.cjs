const { test, expect } = require('@playwright/test');

test('versioned repository round-trips canonical state through browser storage', async ({ page }) => {
    await page.goto('/index.html');
    const result = await page.evaluate(async () => {
        const { createStorageRepository } = await import('/src/adapters/storage.mjs');
        const { createInitialGameState } = await import('/src/state/game-state.mjs');
        const key = 'e2e.section3.browser-storage';
        localStorage.removeItem(key);
        const repository = createStorageRepository(localStorage);
        const state = createInitialGameState({ roomId: 'libraryFoyer', language: 'de' });
        state.quests.facts['library.riddleKnown'] = true;
        await repository.save(key, state);
        const envelope = JSON.parse(localStorage.getItem(key));
        const restored = await repository.load(key);
        localStorage.removeItem(key);
        return {
            schemaVersion: envelope.schemaVersion,
            roomId: restored.location.currentRoomId,
            language: restored.settings.language,
            riddleKnown: restored.quests.facts['library.riddleKnown'],
        };
    });

    expect(result).toEqual({
        schemaVersion: 1,
        roomId: 'libraryFoyer',
        language: 'de',
        riddleKnown: true,
    });
});
