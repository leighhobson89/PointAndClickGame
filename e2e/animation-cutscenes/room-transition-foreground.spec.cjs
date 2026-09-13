// BUG-033 regression.
//
// While a room change was in flight the canvas already showed the new room, but
// the room identity only moved after the fade back finished. Every frame drawn
// in between asked for "the current room's foreground" and got the room the
// player had just left, so the previous room's foreground items appeared on top
// of the new background.
//
// The invariant this test holds is simple and checkable on every frame: the
// background being displayed and the room the game believes it is in must be
// the same room, and the has-foreground-items flag must belong to that room.

const { test, expect } = require('@playwright/test');
const { openDebugGame, loadScenario, restoreNativeTimers, waitForIdle } = require('../_support/debug-session.cjs');

/**
 * Record the displayed background, the current room, and the foreground flag on
 * every animation frame, so the transition can be inspected afterwards rather
 * than sampled at one lucky moment.
 */
async function startFrameSampler(page) {
    await page.evaluate(async () => {
        const state = await import('/constantsAndGlobalVars.js');
        window.__frameSamples = [];
        window.__samplerRunning = true;
        const filename = (value) => String(value ?? '').split('/').pop().split('\\').pop().replace(/['")]/g, '');
        const sample = () => {
            if (!window.__samplerRunning) return;
            const roomId = state.getCurrentScreenId();
            const room = state.getNavigationData()?.[roomId];
            window.__frameSamples.push({
                roomId,
                displayed: filename(document.getElementById('canvas').style.backgroundImage),
                expected: filename(room?.bgUrl),
                hasForeground: state.getCurrentScreenHasForegroundItems(),
                foregroundExpected: state.getForegroundsList().includes(filename(room?.bgUrl)),
            });
            requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
    });
}

async function stopFrameSampler(page) {
    return page.evaluate(() => {
        window.__samplerRunning = false;
        return window.__frameSamples;
    });
}

async function walkThroughExit(page, exitId) {
    const target = await page.evaluate(async (selectedExitId) => {
        const state = await import('/constantsAndGlobalVars.js');
        const grid = state.getGridData().gridData;
        const cells = [];
        for (let y = 0; y < grid.length; y += 1) {
            for (let x = 0; x < grid[y].length; x += 1) if (grid[y][x] === selectedExitId) cells.push({ x, y });
        }
        return cells[Math.floor(cells.length / 2)] ?? null;
    }, exitId);
    expect(target, `exit ${exitId} should be reachable in the current room`).toBeTruthy();

    const size = await page.locator('#canvas').evaluate((canvas) => ({ width: canvas.clientWidth, height: canvas.clientHeight }));
    await page.locator('#canvas').click({
        position: { x: ((target.x + 0.5) / 80) * size.width, y: ((target.y + 0.5) / 60) * size.height },
    });
}

test('a room change never shows the previous room\'s foreground on the new background', async ({ page }) => {
    await openDebugGame(page);
    await loadScenario(page, 'chapter1.town-open');

    // Startup runs with reduced motion and compressed timers to stay quick, but
    // the defect only exists while the fade is actually fading: under reduced
    // motion the overlay resolves immediately and no frame is drawn in the gap.
    // Real motion and real timers are restored for the transition itself.
    await restoreNativeTimers(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    // Stand at the exit and walk out, so the transition is a real one.
    await page.evaluate(async () => {
        const state = await import('/constantsAndGlobalVars.js');
        state.setPlayerObject('speed', 12);
        state.setPlayerObject('baselineSpeedForRoom', 12);
    });

    const startingRoom = await page.evaluate(async () => (await import('/constantsAndGlobalVars.js')).getCurrentScreenId());
    const exitId = await page.evaluate(async (roomId) => {
        const state = await import('/constantsAndGlobalVars.js');
        const exits = state.getNavigationData()[roomId].exits;
        return Object.keys(exits).sort()[0];
    }, startingRoom);

    await startFrameSampler(page);
    await walkThroughExit(page, exitId);

    await expect.poll(async () => page.evaluate(async () => (await import('/constantsAndGlobalVars.js')).getCurrentScreenId()), { timeout: 10_000 })
        .not.toBe(startingRoom);
    await waitForIdle(page);

    const samples = await stopFrameSampler(page);
    expect(samples.length, 'the sampler should have observed the transition').toBeGreaterThan(10);

    // Every frame must agree with itself. A disagreement is exactly the defect:
    // the new room on screen while the game still believed it was in the old one.
    const mismatched = samples.filter((sample) => sample.displayed && sample.expected && sample.displayed !== sample.expected);
    expect(mismatched.slice(0, 3)).toEqual([]);

    const wrongForegroundFlag = samples.filter((sample) => sample.expected && sample.hasForeground !== sample.foregroundExpected);
    expect(wrongForegroundFlag.slice(0, 3)).toEqual([]);

    // And the transition really did change rooms.
    expect(new Set(samples.map((sample) => sample.roomId)).size).toBeGreaterThan(1);
});
