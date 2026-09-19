const { test, expect } = require('@playwright/test');

test('Library Foyer ships as one aligned, decoded room package', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await page.addInitScript(() => {
        const nativeSetTimeout = window.setTimeout.bind(window);
        window.setTimeout = (callback, delay = 0, ...args) =>
            nativeSetTimeout(callback, Math.min(delay, 10), ...args);
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/index.html');
    await page.locator('#btnEnglish').click();
    await page.locator('#newGame').click();
    await expect(page.locator('#canvasContainer')).toBeVisible();
    await expect.poll(async () => page.evaluate(async () => {
        const { getCanonicalGameState } = await import('/constantsAndGlobalVars.js');
        const state = getCanonicalGameState();
        return `${state.location.currentRoomId}:${state.presentation.mode}`;
    }), { timeout: 5_000 }).toBe('libraryFoyer:gameVisibleActive');

    const room = await page.evaluate(async () => {
        const state = await import('/constantsAndGlobalVars.js');
        const cache = await import('/src/adapters/image-cache.mjs');
        const objects = state.getObjectData().objects;
        const npcs = state.getNpcData().npcs;
        const cell = { width: state.getCanvasCellWidth(), height: state.getCanvasCellHeight() };
        const describeEntity = (id, entity, usesDrawOffset = false) => {
            return {
                id,
                sprites: entity.spriteUrl,
                rect: {
                    x: entity.visualPosition.x + (usesDrawOffset ? entity.offset.x : 0),
                    y: entity.visualPosition.y + (usesDrawOffset ? entity.offset.y : 0),
                    width: entity.dimensions.width * cell.width,
                    height: entity.dimensions.height * cell.height,
                },
            };
        };
        const urls = [
            './resources/backgrounds/libraryFoyer.webp',
            './resources/foregrounds/libraryFoyer.webp',
            ...Object.values(objects.objectDoorLibraryFoyerMarketStreet.spriteUrl),
            ...Object.values(objects.objectDoorLibraryFoyerResearchRoom.spriteUrl),
        ];
        const sizes = {};
        for (const url of urls) {
            const image = cache.imageFor(url);
            await image.decode();
            sizes[url] = { width: image.naturalWidth, height: image.naturalHeight };
        }
        const alphaAt = (url, x, y) => {
            const image = cache.imageFor(url);
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            context.drawImage(image, 0, 0);
            return context.getImageData(x, y, 1, 1).data[3];
        };
        return {
            background: document.getElementById('canvas').style.backgroundImage,
            sizes,
            marketDoor: describeEntity('objectDoorLibraryFoyerMarketStreet', objects.objectDoorLibraryFoyerMarketStreet, true),
            researchDoor: describeEntity('objectDoorLibraryFoyerResearchRoom', objects.objectDoorLibraryFoyerResearchRoom, true),
            books: describeEntity('objectPileOfBooksLibraryFoyer', objects.objectPileOfBooksLibraryFoyer),
            key: describeEntity('objectKeyResearchRoom', objects.objectKeyResearchRoom),
            librarian: describeEntity('npcLibrarian', npcs.npcLibrarian, true),
            researchCutouts: {
                closedChair: alphaAt('./resources/objects/images/libraryFoyer_Exit_ResearchRoomClosed.webp', 35, 270),
                closedDoor: alphaAt('./resources/objects/images/libraryFoyer_Exit_ResearchRoomClosed.webp', 70, 270),
                openChair: alphaAt('./resources/objects/images/libraryFoyer_Exit_ResearchRoomOpen.webp', 60, 230),
                openDoor: alphaAt('./resources/objects/images/libraryFoyer_Exit_ResearchRoomOpen.webp', 20, 230),
            },
            cached: urls.every((url) => cache.cachedImageUrls().includes(url)),
        };
    });

    expect(room.background).toContain('libraryFoyer.webp');
    expect(room.sizes['./resources/backgrounds/libraryFoyer.webp']).toEqual({ width: 832, height: 448 });
    expect(room.sizes['./resources/foregrounds/libraryFoyer.webp']).toEqual({ width: 832, height: 448 });
    expect(room.sizes['./resources/objects/images/libraryFoyer_Exit_MarketStreetClosed.webp']).toEqual({ width: 84, height: 347 });
    expect(room.sizes['./resources/objects/images/libraryFoyer_Exit_MarketStreetOpen.webp']).toEqual({ width: 84, height: 347 });
    expect(room.sizes['./resources/objects/images/libraryFoyer_Exit_ResearchRoomClosed.webp']).toEqual({ width: 94, height: 324 });
    expect(room.sizes['./resources/objects/images/libraryFoyer_Exit_ResearchRoomOpen.webp']).toEqual({ width: 94, height: 324 });
    expect(room.researchCutouts.closedChair).toBeLessThan(16);
    expect(room.researchCutouts.closedDoor).toBeGreaterThan(200);
    expect(room.researchCutouts.openChair).toBeLessThan(16);
    expect(room.researchCutouts.openDoor).toBeGreaterThan(200);
    expect(room.cached).toBe(true);

    // These are the painted doorway apertures in the approved 832x448 room.
    // Tolerances cover anti-aliased edges, not free placement drift.
    expect(room.marketDoor.rect.x).toBeGreaterThanOrEqual(509);
    expect(room.marketDoor.rect.x).toBeLessThanOrEqual(511);
    expect(room.marketDoor.rect.y).toBeGreaterThanOrEqual(215);
    expect(room.marketDoor.rect.y).toBeLessThanOrEqual(217);
    expect(room.marketDoor.rect.x + room.marketDoor.rect.width).toBeLessThanOrEqual(554);
    expect(room.marketDoor.rect.y + room.marketDoor.rect.height).toBeLessThanOrEqual(392);
    expect(room.researchDoor.rect.x).toBeGreaterThanOrEqual(380);
    expect(room.researchDoor.rect.x).toBeLessThanOrEqual(383);
    expect(room.researchDoor.rect.y).toBeGreaterThanOrEqual(222);
    expect(room.researchDoor.rect.y).toBeLessThanOrEqual(225);
    expect(room.researchDoor.rect.x + room.researchDoor.rect.width).toBeLessThanOrEqual(415);
    expect(room.researchDoor.rect.y + room.researchDoor.rect.height).toBeLessThanOrEqual(333);

    // The invisible interaction rectangle still overlaps the visible foreground
    // book stack instead of drifting into empty floor during the repaint.
    expect(room.books.rect.x).toBeGreaterThanOrEqual(154);
    expect(room.books.rect.x).toBeLessThanOrEqual(158);
    expect(room.books.rect.y).toBeGreaterThanOrEqual(342);
    expect(room.books.rect.y).toBeLessThanOrEqual(346);
    expect(room.books.rect.width).toBeGreaterThanOrEqual(123);
    expect(room.books.rect.width).toBeLessThanOrEqual(126);
    expect(room.books.rect.height).toBeGreaterThanOrEqual(96);
    expect(room.books.rect.height).toBeLessThanOrEqual(98);
    expect(room.key.rect.x).toBeGreaterThan(room.books.rect.x);
    expect(room.key.rect.y).toBeGreaterThan(room.books.rect.y);
    expect(room.key.rect.x + room.key.rect.width).toBeLessThan(room.books.rect.x + room.books.rect.width);
    expect(room.key.rect.y + room.key.rect.height).toBeLessThan(room.books.rect.y + room.books.rect.height);
    expect(room.librarian.rect.x).toBeGreaterThanOrEqual(175);
    expect(room.librarian.rect.x).toBeLessThanOrEqual(178);
    expect(room.librarian.rect.y).toBeGreaterThanOrEqual(256);
    expect(room.librarian.rect.y).toBeLessThanOrEqual(259);

    const open = await page.evaluate(async () => {
        const state = await import('/constantsAndGlobalVars.js');
        const events = await import('/events.js');
        const ids = ['objectDoorLibraryFoyerMarketStreet', 'objectDoorLibraryFoyerResearchRoom'];
        for (const id of ids) {
            const object = state.getObjectData().objects[id];
            await events.executeInteractionEvent(object.usedOn, '', 'verbOpen', id);
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
        const cell = { width: state.getCanvasCellWidth(), height: state.getCanvasCellHeight() };
        return Object.fromEntries(ids.map((id) => {
            const object = state.getObjectData().objects[id];
            return [id, {
                sprite: object.activeSpriteUrl,
                x: object.visualPosition.x + object.offset.x,
                y: object.visualPosition.y + object.offset.y,
                width: object.dimensions.width * cell.width,
                height: object.dimensions.height * cell.height,
            }];
        }));
    });
    expect(open.objectDoorLibraryFoyerMarketStreet).toMatchObject({ sprite: 's2' });
    expect(open.objectDoorLibraryFoyerMarketStreet.x).toBeGreaterThanOrEqual(561);
    expect(open.objectDoorLibraryFoyerMarketStreet.x + open.objectDoorLibraryFoyerMarketStreet.width).toBeLessThanOrEqual(605);
    expect(open.objectDoorLibraryFoyerResearchRoom).toMatchObject({ sprite: 's2' });
    expect(open.objectDoorLibraryFoyerResearchRoom.x).toBeGreaterThanOrEqual(318);
    expect(open.objectDoorLibraryFoyerResearchRoom.x + open.objectDoorLibraryFoyerResearchRoom.width).toBeLessThanOrEqual(352);
    const rebuilt = await page.evaluate(async () => {
        const state = await import('/constantsAndGlobalVars.js');
        const game = await import('/game.js');
        game.setUpObjectsAndNpcs();
        const objects = state.getObjectData().objects;
        return {
            marketX: objects.objectDoorLibraryFoyerMarketStreet.visualPosition.x + objects.objectDoorLibraryFoyerMarketStreet.offset.x,
            researchX: objects.objectDoorLibraryFoyerResearchRoom.visualPosition.x + objects.objectDoorLibraryFoyerResearchRoom.offset.x,
        };
    });
    expect(rebuilt.marketX).toBeCloseTo(open.objectDoorLibraryFoyerMarketStreet.x, 4);
    expect(rebuilt.researchX).toBeCloseTo(open.objectDoorLibraryFoyerResearchRoom.x, 4);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(100);
    expect(await page.locator('#canvas').evaluate((canvas) => canvas.style.backgroundSize)).toBe('100% 100%');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(100);
    expect(await page.locator('#canvas').evaluate((canvas) => canvas.style.backgroundSize)).toBe('100% 100%');
    expect(runtimeErrors).toEqual([]);
});
