const { test, expect } = require('@playwright/test');

test.describe.configure({ timeout: 120_000 });

async function installTraversalFixture(page) {
    await page.addInitScript(() => {
        const nativeSetTimeout = window.setTimeout.bind(window);
        window.setTimeout = (callback, delay = 0, ...args) => nativeSetTimeout(callback, Math.min(delay, 5), ...args);
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [pattern, root] of [['**/objectsGame.json', 'objects'], ['**/npcGame.json', 'npcs']]) {
        await page.route(pattern, async (route) => {
            const response = await route.fetch();
            const data = await response.json();
            for (const [id, entity] of Object.entries(data[root])) {
                if (id !== 'npcNarrator') entity[root === 'objects' ? 'objectPlacementLocation' : 'npcPlacementLocation'] = '';
            }
            await route.fulfill({ response, json: data });
        });
    }
}

async function startFastGame(page, lockedGateId = null) {
    await page.goto('/index.html');
    await page.locator('#btnEnglish').click();
    await page.locator('#newGame').click();
    await expect.poll(async () => page.evaluate(async () => {
        const { getCanonicalGameState } = await import('/constantsAndGlobalVars.js');
        const state = getCanonicalGameState();
        return `${state.location.currentRoomId}:${state.presentation.mode}`;
    }), { timeout: 5_000 }).toBe('libraryFoyer:gameVisibleActive');
    await page.evaluate(async (selectedLockedGateId) => {
        const state = await import('/constantsAndGlobalVars.js');
        const navigation = state.getNavigationData();
        for (const [roomId, room] of Object.entries(navigation)) {
            for (const [exitId, exit] of Object.entries(room.exits)) {
                exit.status = `${roomId}.${exitId}` === selectedLockedGateId ? 'locked' : 'open';
            }
        }
        state.setNavigationData(navigation);
        const grids = state.getAllGridData();
        grids.riverCrossing = grids.riverCrossingBridgeComplete;
        state.setGridData(grids);
    }, lockedGateId);
}

async function clickExit(page, exitId, expectedRoomId) {
    const target = await page.evaluate(async (selectedExitId) => {
        const state = await import('/constantsAndGlobalVars.js');
        state.setPlayerObject('speed', 12);
        state.setPlayerObject('baselineSpeedForRoom', 12);
        const grid = state.getGridData().gridData;
        const cells = [];
        for (let y = 0; y < grid.length; y += 1) {
            for (let x = 0; x < grid[y].length; x += 1) if (grid[y][x] === selectedExitId) cells.push({ x, y });
        }
        return cells[Math.floor(cells.length / 2)];
    }, exitId);
    expect(target, `exit ${exitId} should have a clickable grid cell`).toBeTruthy();
    const size = await page.locator('#canvas').evaluate((canvas) => ({ width: canvas.clientWidth, height: canvas.clientHeight }));
    await page.locator('#canvas').click({ position: { x: ((target.x + 0.5) / 80) * size.width, y: ((target.y + 0.5) / 60) * size.height } });
    await expect.poll(async () => page.evaluate(async () => {
        const { getCanonicalGameState } = await import('/constantsAndGlobalVars.js');
        return getCanonicalGameState().location.currentRoomId;
    }), { timeout: 5_000 }).toBe(expectedRoomId);
}

async function arrangeAtExit(page, roomId, exitId) {
    await page.evaluate(async ({ selectedRoomId, selectedExitId }) => {
        const state = await import('/constantsAndGlobalVars.js');
        const game = await import('/game.js');
        state.setTransitioningNow(false);
        state.setTransitioningToAnotherScreen(false);
        state.setCurrentScreenId(selectedRoomId);
        state.setNextScreenId(selectedRoomId);
        state.setPreviousScreenId(selectedRoomId);
        state.setClickPoint({ x: null, y: null });
        game.entityPaths.player.path = [];
        game.entityPaths.player.currentIndex = 0;
        const grid = state.getGridData().gridData;
        const cells = [];
        for (let y = 0; y < grid.length; y += 1) for (let x = 0; x < grid[y].length; x += 1) if (grid[y][x] === selectedExitId) cells.push({ x, y });
        const target = cells[Math.floor(cells.length / 2)];
        const player = state.getPlayerObject();
        state.setPlayerObject('xPos', target.x * state.getCanvasCellWidth() - player.width / 2);
        state.setPlayerObject('yPos', target.y * state.getCanvasCellHeight() - player.height);
        document.querySelector('#canvas').style.pointerEvents = 'auto';
    }, { selectedRoomId: roomId, selectedExitId: exitId });
}

test('the browser validates the canonical graph and decodes every room background', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
        const readJson = async (url) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
            return response.json();
        };
        const [contract, grids, navigation, objects, npcs, dialogue, localization, mapRoom, foregrounds] = await Promise.all([
            readJson('/resources/content-contract.json'),
            readJson('/resources/screenWalkableJSONS/masterJSONData.json'),
            readJson('/resources/screenNavigation.json'),
            readJson('/resources/objectsGame.json'),
            readJson('/resources/npcGame.json'),
            readJson('/resources/dialogue.json'),
            readJson('/localization.json'),
            readJson('/resources/mapRoom.json'),
            readJson('/resources/screenWalkableJSONS/masterForegroundData.json'),
        ]);
        const { validateContentBundle } = await import('/src/content/validate-content.mjs');
        const validation = validateContentBundle({ contract, grids, navigation, objects, npcs, dialogue, localization, mapRoom, foregrounds });
        if (!validation.valid) throw new Error(validation.errors.join('; '));

        const transitions = [];
        const adjacency = new Map(contract.world.rooms.map((roomId) => [roomId, []]));
        for (const connection of contract.world.connections) {
            const forward = navigation[connection.from].exits[connection.exit];
            const reverse = navigation[connection.to].exits[connection.returnExit];
            if (connection.gateFact) {
                transitions.push({ id: `${connection.from}.${connection.exit}`, state: 'locked', entered: forward.status !== 'locked' });
                transitions.push({ id: `${connection.from}.${connection.exit}`, state: 'open', entered: true });
            } else {
                transitions.push({ id: `${connection.from}.${connection.exit}`, state: 'open', entered: forward.status === 'open' });
            }
            transitions.push({ id: `${connection.to}.${connection.returnExit}`, state: 'return', entered: reverse.connectsTo === connection.from });
            adjacency.get(connection.from).push(connection.to);
            adjacency.get(connection.to).push(connection.from);
        }

        const visited = new Set([contract.world.initialRoomId]);
        const queue = [contract.world.initialRoomId];
        while (queue.length) {
            for (const next of adjacency.get(queue.shift())) {
                if (!visited.has(next)) {
                    visited.add(next);
                    queue.push(next);
                }
            }
        }

        const decodedBackgrounds = [];
        for (const roomId of contract.world.rooms) {
            const response = await fetch(navigation[roomId].bgUrl);
            if (!response.ok) throw new Error(`${roomId} background: HTTP ${response.status}`);
            const bitmap = await createImageBitmap(await response.blob());
            decodedBackgrounds.push({ roomId, width: bitmap.width, height: bitmap.height });
            bitmap.close();
        }
        return { rooms: [...visited], transitions, decodedBackgrounds, chapterEndRoomId: contract.world.chapterEndRoomId };
    });

    expect(result.rooms).toHaveLength(18);
    expect(result.rooms).toContain(result.chapterEndRoomId);
    expect(result.transitions.every((transition) => transition.state === 'locked' ? !transition.entered : transition.entered)).toBe(true);
    expect(result.decodedBackgrounds).toHaveLength(18);
    expect(result.decodedBackgrounds.every((image) => image.width > 0 && image.height > 0)).toBe(true);
});

test('normal canvas clicks enter and return from every intended room with gates open', async ({ page }) => {
    await installTraversalFixture(page);
    await startFastGame(page);
    const contract = require('../../resources/content-contract.json');
    const visited = new Set();

    for (const connection of contract.world.connections) {
        await arrangeAtExit(page, connection.from, connection.exit);
        await clickExit(page, connection.exit, connection.to);
        visited.add(connection.to);
        await arrangeAtExit(page, connection.to, connection.returnExit);
        await clickExit(page, connection.returnExit, connection.from);
        visited.add(connection.from);
    }
    expect([...visited].sort()).toEqual([...contract.world.rooms].sort());
});

for (const gateId of ['libraryFoyer.e1', 'alley.e1', 'stables.e1', 'riverCrossing.e2']) {
    test(`locked gate ${gateId} refuses entry through the normal canvas`, async ({ page }) => {
        await installTraversalFixture(page);
        await startFastGame(page, gateId);
        const contract = require('../../resources/content-contract.json');
        const target = contract.world.connections.find((connection) => `${connection.from}.${connection.exit}` === gateId);
        const currentRoom = target.from;
        await arrangeAtExit(page, target.from, target.exit);
        const targetCell = await page.evaluate(async (exitId) => {
            const state = await import('/constantsAndGlobalVars.js');
            const grid = state.getGridData().gridData;
            const cells = [];
            for (let y = 0; y < grid.length; y += 1) for (let x = 0; x < grid[y].length; x += 1) if (grid[y][x] === exitId) cells.push({ x, y });
            return cells[Math.floor(cells.length / 2)];
        }, target.exit);
        const size = await page.locator('#canvas').evaluate((canvas) => ({ width: canvas.clientWidth, height: canvas.clientHeight }));
        await page.locator('#canvas').click({ position: { x: ((targetCell.x + 0.5) / 80) * size.width, y: ((targetCell.y + 0.5) / 60) * size.height } });
        await page.waitForTimeout(200);
        expect(await page.evaluate(async () => (await import('/constantsAndGlobalVars.js')).getCanonicalGameState().location.currentRoomId)).toBe(currentRoom);
    });
}
