const { test, expect } = require('@playwright/test');
const { openDebugGame } = require('../_support/debug-session.cjs');

function axisFor(direction) {
    return direction === 'left' || direction === 'right' ? 'horizontal' : 'vertical';
}

async function longestWalkableRun(page, axis) {
    return page.evaluate(async (selectedAxis) => {
        const { getGridData } = await import('/constantsAndGlobalVars.js');
        const grid = getGridData().gridData;
        const height = grid.length;
        const width = grid[0]?.length ?? 0;
        const walkable = (x, y) => typeof grid[y]?.[x] === 'string' && grid[y][x].startsWith('w');
        let best = null;

        if (selectedAxis === 'horizontal') {
            for (let y = 0; y < height; y += 1) {
                let start = null;
                for (let x = 0; x <= width; x += 1) {
                    if (x < width && walkable(x, y)) {
                        if (start === null) start = x;
                    } else if (start !== null) {
                        const candidate = { x1: start, y1: y, x2: x - 1, y2: y, length: x - start };
                        if (!best || candidate.length > best.length) best = candidate;
                        start = null;
                    }
                }
            }
        } else {
            for (let x = 0; x < width; x += 1) {
                let start = null;
                for (let y = 0; y <= height; y += 1) {
                    if (y < height && walkable(x, y)) {
                        if (start === null) start = y;
                    } else if (start !== null) {
                        const candidate = { x1: x, y1: start, x2: x, y2: y - 1, length: y - start };
                        if (!best || candidate.length > best.length) best = candidate;
                        start = null;
                    }
                }
            }
        }
        return best;
    }, axis);
}

async function recordWalk(page, direction) {
    const run = await longestWalkableRun(page, axisFor(direction));
    expect(run, `${direction} needs a straight walkable run`).toBeTruthy();
    expect(run.length, `${direction} needs enough travel to show a complete step`).toBeGreaterThanOrEqual(10);

    const reverse = direction === 'left' || direction === 'up';
    const start = reverse ? { x: run.x2, y: run.y2 } : { x: run.x1, y: run.y1 };
    const target = reverse ? { x: run.x1, y: run.y1 } : { x: run.x2, y: run.y2 };

    await page.evaluate(async ({ x, y }) => {
        await window.__GAME_TEST__.teleport({ roomId: 'libraryFoyer', x, y });
        window.__GAME_TEST__.setMovementSpeed('normal');
        const state = await import('/constantsAndGlobalVars.js');
        window.__walkSamples = [];
        window.__walkRecorder = window.setInterval(() => {
            const player = state.getCanonicalGameState().player;
            window.__walkSamples.push({
                sprite: player.activeSprite,
                phase: player.walkPhase,
                moving: state.getPlayerMovementStatus()[0] === 'moving',
            });
        }, 4);
    }, start);

    const canvasSize = await page.locator('#canvas').evaluate((canvas) => ({
        width: canvas.clientWidth,
        height: canvas.clientHeight,
    }));
    await page.locator('#canvas').click({
        position: {
            x: ((target.x + 0.5) / 80) * canvasSize.width,
            y: ((target.y + 0.5) / 60) * canvasSize.height,
        },
    });
    await expect.poll(() => page.evaluate((selectedDirection) => new Set(
        window.__walkSamples
            .filter(({ moving, sprite }) => moving && sprite.endsWith(`_${selectedDirection}`))
            .map(({ sprite }) => sprite),
    ).size, direction), { timeout: 10_000 }).toBe(9);

    return page.evaluate(() => {
        window.__GAME_TEST__.cancelPath();
        window.clearInterval(window.__walkRecorder);
        return window.__walkSamples;
    });
}

test('real walks play the nine-frame gait forward in all four directions', async ({ page }) => {
    test.setTimeout(60_000);
    await openDebugGame(page);

    for (const direction of ['left', 'right', 'up', 'down']) {
        const samples = await recordWalk(page, direction);
        const movementSprites = samples
            .filter(({ moving }) => moving)
            .map(({ sprite }) => sprite)
            .filter((sprite) => /^move\d+_/.test(sprite));
        expect(movementSprites.length, `${direction} should produce movement samples`).toBeGreaterThan(0);
        // A click can mark movement active one sample before the first movement
        // tick replaces the previous idle/move sprite. Audit the requested
        // direction from its first real pose rather than treating that stale
        // presentation sample as part of the new cycle.
        const directionalSprites = movementSprites.filter((sprite) => sprite.endsWith(`_${direction}`));
        expect(directionalSprites.length, `${direction} should become the active gait`).toBeGreaterThan(0);

        const transitions = directionalSprites
            .map((sprite) => Number.parseInt(sprite.match(/^move(\d+)_/)[1], 10))
            .filter((frame, index, list) => index === 0 || frame !== list[index - 1]);
        expect(new Set(transitions), `${direction} should show every authored pose`).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
        for (let index = 1; index < transitions.length; index += 1) {
            const expected = transitions[index - 1] === 9 ? 1 : transitions[index - 1] + 1;
            expect(transitions[index], `${direction} frame ${transitions[index - 1]} must advance forward`).toBe(expected);
        }
    }
});
