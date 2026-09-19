const { test, expect } = require('@playwright/test');

test('clicking a walkable library cell moves the player', async ({ page }) => {
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

    await page.waitForTimeout(100);
    await expect.poll(async () => page.evaluate(async () => {
        const { getCanonicalGameState } = await import('/constantsAndGlobalVars.js');
        const state = getCanonicalGameState();
        return `${state.location.currentRoomId}:${state.presentation.mode}`;
    }), { timeout: 5_000 }).toBe('libraryFoyer:gameVisibleActive');

    const beforeX = await page.evaluate(async () => {
        const { getCanonicalGameState } = await import('/constantsAndGlobalVars.js');
        return getCanonicalGameState().player.xPos;
    });
    const canvasSize = await page.locator('#canvas').evaluate((canvas) => ({
        width: canvas.clientWidth,
        height: canvas.clientHeight,
    }));

    // Library cell (15, 50) is a normal walkable cell in the authored 80 x 60 grid.
    await page.locator('#canvas').click({
        position: {
            x: (15.5 / 80) * canvasSize.width,
            y: (50.5 / 60) * canvasSize.height,
        },
    });

    await expect.poll(async () => page.evaluate(async () => {
        const { getCanonicalGameState } = await import('/constantsAndGlobalVars.js');
        return getCanonicalGameState().player.xPos;
    })).not.toBe(beforeX);
    expect(runtimeErrors).toEqual([]);
});

test('a no-path click cannot poison the next click target', async ({ page }) => {
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

    const result = await page.evaluate(async () => {
        const state = await import('/constantsAndGlobalVars.js');
        const game = await import('/game.js');
        const grid = state.getGridData().gridData;
        const player = state.getPlayerObject();
        const before = { x: player.xPos, y: player.yPos };
        const from = {
            x: Math.floor((player.xPos + player.width / 2) / state.getCanvasCellWidth()),
            y: Math.floor((player.yPos + player.height) / state.getCanvasCellHeight()),
        };
        let target = null;
        for (let y = 0; y < grid.length; y += 1) {
            for (let x = 0; x < grid[y].length; x += 1) {
                if (typeof grid[y][x] !== 'string' || !grid[y][x].startsWith('w')) continue;
                const distance = Math.abs(x - from.x) + Math.abs(y - from.y);
                if (!target || distance > target.distance) target = { x, y, distance };
            }
        }

        // Reproduce the state left by a rejected click: a red cursor and a
        // stale hover cell. A pointer/touch click must use its own coordinates,
        // never that previous mousemove cell.
        state.setHoverCell(0, 0);
        state.setCustomMouseCursor(state.getCustomMouseCursor('error'));
        const errorCursor = state.getElements().customCursorImage.getAttribute('src');
        await game.processLeftClickPoint({
            x: (target.x + 0.5) * state.getCanvasCellWidth(),
            y: (target.y + 0.5) * state.getCanvasCellHeight(),
        }, true);

        return {
            before,
            target,
            errorCursor,
            recoveredCursor: state.getElements().customCursorImage.getAttribute('src'),
            submitted: state.getClickPoint(),
        };
    });

    expect(result.errorCursor).toContain('mouseNoPathFound.png');
    expect(result.recoveredCursor).not.toContain('mouseNoPathFound.png');
    expect(result.submitted).toEqual({ x: result.target.x, y: result.target.y });
    await expect.poll(async () => page.evaluate(async () => {
        const { getPlayerObject } = await import('/constantsAndGlobalVars.js');
        const player = getPlayerObject();
        return `${Math.round(player.xPos)},${Math.round(player.yPos)}`;
    })).not.toBe(`${Math.round(result.before.x)},${Math.round(result.before.y)}`);
});

test('player and NPC frames are decoded into the shared cache before play', async ({ page }) => {
    await page.addInitScript(() => {
        const nativeSetTimeout = window.setTimeout.bind(window);
        window.setTimeout = (callback, delay = 0, ...args) =>
            nativeSetTimeout(callback, Math.min(delay, 10), ...args);
    });
    await page.goto('/index.html');
    await page.locator('#btnEnglish').click();
    await page.locator('#newGame').click();
    await expect(page.locator('#canvasContainer')).toBeVisible();

    const cache = await page.evaluate(async () => {
        const state = await import('/constantsAndGlobalVars.js');
        const images = await import('/src/adapters/image-cache.mjs');
        const required = [
            ...Object.values(state.getPlayerObject().sprites),
            ...Object.values(state.getNpcData().npcs).flatMap((npc) => Object.values(npc.spriteUrl ?? {})),
        ];
        const cached = new Set(images.cachedImageUrls());
        return {
            required: [...new Set(required)],
            missing: [...new Set(required)].filter((url) => !cached.has(url)),
        };
    });

    expect(cache.required.length).toBeGreaterThan(40);
    expect(cache.missing).toEqual([]);
});
