const { test, expect } = require('@playwright/test');

test('the versioned repository round-trips canonical state through browser storage', async ({ page }) => {
    await page.goto('/index.html');
    const result = await page.evaluate(async () => {
        const { createStorageRepository } = await import('/src/adapters/storage.mjs');
        const { createInitialGameState } = await import('/src/state/game-state.mjs');
        const { SAVE_SCHEMA_VERSION } = await import('/src/domain/save/save-format.mjs');

        const pristine = {
            grids: { libraryFoyer: [['w1', 'w1'], ['n', 'w1']] },
            navigation: { libraryFoyer: { bgUrl: './resources/backgrounds/libraryFoyer.png', alreadyVisited: false } },
            objects: { objects: {} },
            npcs: { npcs: {} },
            dialogue: { dialogue: {} },
        };

        const key = 'e2e.section5.browser-storage';
        const storageKey = `pointAndClick.save.${key}`;
        localStorage.removeItem(storageKey);

        const repository = createStorageRepository(localStorage, { getPristineContent: () => pristine });
        const state = createInitialGameState({ roomId: 'libraryFoyer', language: 'de', content: { ...structuredClone(pristine), contract: {}, mapRoom: {} } });
        state.quests.facts['library.riddleKnown'] = true;
        state.content.navigation.libraryFoyer.alreadyVisited = true;

        await repository.save(key, state);
        const envelope = JSON.parse(localStorage.getItem(storageKey));

        const baseState = createInitialGameState({ content: { ...structuredClone(pristine), contract: {}, mapRoom: {} } });
        const restored = await repository.load(key, baseState);
        localStorage.removeItem(storageKey);

        return {
            expectedVersion: SAVE_SCHEMA_VERSION,
            schemaVersion: envelope.schemaVersion,
            carriesContentBundle: JSON.stringify(envelope).includes('libraryFoyer.png'),
            worldPatch: envelope.payload.world.patches.navigation,
            roomId: restored.location.currentRoomId,
            language: restored.settings.language,
            riddleKnown: restored.quests.facts['library.riddleKnown'],
            alreadyVisited: restored.content.navigation.libraryFoyer.alreadyVisited,
        };
    });

    expect(result.schemaVersion).toBe(result.expectedVersion);
    // The save stores what changed, not the shipped bundle it changed.
    expect(result.carriesContentBundle).toBe(false);
    expect(result.worldPatch).toEqual([{ op: 'set', path: ['libraryFoyer', 'alreadyVisited'], value: true }]);
    expect(result.roomId).toBe('libraryFoyer');
    expect(result.language).toBe('de');
    expect(result.riddleKnown).toBe(true);
    expect(result.alreadyVisited).toBe(true);
});
