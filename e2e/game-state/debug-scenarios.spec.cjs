const { test, expect } = require('@playwright/test');
const { clickFurthestWalkableCell, clickGridCell, loadScenario, openDebugGame, summary, waitForIdle } = require('../_support/debug-session.cjs');

test.describe.configure({ timeout: 90_000 });

test('the same scenario and seed reproduce the same checksum and visible state', async ({ page }) => {
    await openDebugGame(page, { seed: 4242 });

    const first = await loadScenario(page, 'chapter1.bridge-ready');
    const firstSummary = await summary(page);

    // A different scenario in between proves the reload really rebuilds.
    const between = await loadScenario(page, 'chapter1.new-game');
    const second = await loadScenario(page, 'chapter1.bridge-ready');
    const secondSummary = await summary(page);

    expect(between.checksum).not.toBe(first.checksum);

    expect(second.checksum).toBe(first.checksum);
    expect(second.spawn).toEqual(first.spawn);
    expect(secondSummary.roomId).toBe(firstSummary.roomId);
    expect(secondSummary.facts).toEqual(firstSummary.facts);
    expect(secondSummary.inventory).toEqual(firstSummary.inventory);
    expect(secondSummary.locale).toBe(firstSummary.locale);
    expect(await page.evaluate(() => window.__GAME_TEST__.checksum())).toBe(first.checksum);
});

test('every reviewed scenario loads cleanly and in under one second', async ({ page }) => {
    await openDebugGame(page);

    const scenarioIds = await page.evaluate(() => window.__GAME_TEST__.listScenarios().map((scenario) => scenario.id));
    expect(scenarioIds).toHaveLength(14);

    const results = [];
    for (const scenarioId of scenarioIds) {
        const result = await loadScenario(page, scenarioId);
        results.push({ scenarioId, durationMs: result.durationMs, failures: result.failures, roomId: result.roomId });
        const state = await page.evaluate(() => window.__GAME_TEST__.validateState());
        expect(state.errors, `${scenarioId} must leave valid canonical state`).toEqual([]);
        expect(state.conflicts, `${scenarioId} must leave consistent facts`).toEqual([]);
    }

    expect(results.filter((result) => result.failures.length > 0)).toEqual([]);
    const slow = results.filter((result) => result.durationMs >= 1_000);
    expect(slow, 'scenario load must stay under one second after readiness').toEqual([]);
});

test('an invalid scenario is rejected before anything is rendered', async ({ page }) => {
    await openDebugGame(page);
    await loadScenario(page, 'chapter1.town-open');
    const before = await summary(page);

    const rejected = await page.evaluate(() => window.__GAME_TEST__.loadScenario('chapter1.town-open', { roomId: 'atlantis' }));
    expect(rejected.loaded).toBe(false);
    expect(rejected.errors.join(' ')).toContain('atlantis');

    const unknown = await page.evaluate(() => window.__GAME_TEST__.loadScenario('chapter1.doesNotExist'));
    expect(unknown.loaded).toBe(false);

    const impossible = await page.evaluate(() => window.__GAME_TEST__.validateScenario('chapter1.new-game', { facts: { 'bridge.repaired': true } }));
    expect(impossible.valid).toBe(false);
    expect(impossible.errors.join(' ')).toContain('bridge.repaired');

    const after = await summary(page);
    expect(after.roomId).toBe(before.roomId);
    expect(after.checksum).toBe(before.checksum);
    await expect(page.locator('#canvasContainer')).toBeVisible();
});

test('a scenario puts the player where a real click can finish the journey to the Map', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await openDebugGame(page);

    // Before the scenario, the river gate refuses entry and says why.
    await loadScenario(page, 'chapter1.new-game');
    expect(await page.evaluate(() => window.__GAME_TEST__.explainGate('riverCrossing', 'e2'))).toEqual({
        available: false,
        reason: 'missing-gate-fact',
        missingFactIds: ['river.wolfResolved'],
    });

    await loadScenario(page, 'chapter1.map-entry');
    expect(await page.evaluate(() => window.__GAME_TEST__.explainGate('riverCrossing', 'e2'))).toMatchObject({ available: true });
    expect((await summary(page)).roomId).toBe('riverCrossing');

    await page.evaluate(() => window.__GAME_TEST__.setMovementSpeed('fast'));
    await clickGridCell(page, 'e2');
    await expect.poll(async () => (await summary(page)).roomId, { timeout: 10_000 }).toBe('map');

    await waitForIdle(page);
    expect(runtimeErrors).toEqual([]);
});

test('waitForIdle reports the subsystem that is still busy', async ({ page }) => {
    await openDebugGame(page);
    await loadScenario(page, 'chapter1.town-open');

    const idleNow = await waitForIdle(page, { timeoutMs: 5_000 });
    expect(idleNow.idle).toBe(true);
    expect(idleNow.pending).toEqual([]);

    // A slow walk started by a real click keeps the movement probe busy.
    await page.evaluate(() => window.__GAME_TEST__.setMovementSpeed('slow'));
    await clickFurthestWalkableCell(page);
    await expect.poll(async () => page.evaluate(() => window.__GAME_TEST__.idlePending()), { timeout: 5_000 })
        .toContain('movement');

    const cancelled = await page.evaluate(() => window.__GAME_TEST__.cancelPath());
    expect(cancelled.detail ?? cancelled).toMatchObject({ cancelled: true });
    expect((await waitForIdle(page, { timeoutMs: 5_000 })).idle).toBe(true);
});

test('teleport validates the room, anchor, and coordinate before moving the player', async ({ page }) => {
    await openDebugGame(page);
    await loadScenario(page, 'chapter1.town-open');

    const anchors = await page.evaluate(() => window.__GAME_TEST__.listAnchors('carpenter'));
    expect(anchors.length).toBeGreaterThan(0);
    expect(anchors[0]).toMatchObject({ exitId: expect.any(String), connectsTo: expect.any(String) });

    const moved = await page.evaluate(() => window.__GAME_TEST__.teleport({ roomId: 'carpenter', exitId: 'e1' }));
    expect(moved.name ?? 'teleport').toBeTruthy();
    await waitForIdle(page);
    expect((await summary(page)).roomId).toBe('carpenter');

    const badRoom = await page.evaluate(() => window.__GAME_TEST__.teleport({ roomId: 'narnia' }));
    expect(badRoom.reason).toBe('unknown-room');
    const badCell = await page.evaluate(() => window.__GAME_TEST__.teleport({ roomId: 'carpenter', x: 900, y: -4 }));
    expect(badCell.reason).toBe('invalid-coordinate');
    expect((await summary(page)).roomId).toBe('carpenter');
});

test('inventory presets, structured intents, and entity reset work through stable IDs', async ({ page }) => {
    await openDebugGame(page);
    await loadScenario(page, 'system.inventory-full');

    const carried = await page.evaluate(() => window.__GAME_TEST__.listInventory());
    expect(carried).toHaveLength(12);
    expect(carried.every((item) => item.objectId.startsWith('object'))).toBe(true);

    await page.evaluate(() => window.__GAME_TEST__.applyInventoryPreset('riggingKit'));
    expect(await page.evaluate(() => window.__GAME_TEST__.listInventory().map((item) => item.objectId))).toEqual(
        expect.arrayContaining(['objectRopeAndHook', 'objectPulleyWheel', 'objectDonkeyRope']),
    );

    const unknown = await page.evaluate(() => window.__GAME_TEST__.addItem('objectNotReal'));
    expect(unknown.reason).toBe('unknown-object');

    // A structured intent, not a translated sentence.
    await page.evaluate(() => window.__GAME_TEST__.selectVerb('lookAt'));
    expect(await page.evaluate(() => window.__GAME_TEST__.selectTarget('objectRopeAndHook'))).toMatchObject({
        targetId: 'objectRopeAndHook',
    });

    await page.evaluate(() => window.__GAME_TEST__.addItem('objectCrowbar'));
    const reset = await page.evaluate(() => window.__GAME_TEST__.resetEntity('objectCrowbar'));
    expect(reset.kind).toBe('object');
});

test('puzzle facts, milestones, and the critical-path frontier stay debug-only and consistent', async ({ page }) => {
    await openDebugGame(page);
    await loadScenario(page, 'chapter1.new-game');

    // A clean start opens five independent threads; the library tutorial is
    // the one the opening room points the player at.
    expect(await page.evaluate(() => window.__GAME_TEST__.criticalPathFrontier().map((entry) => entry.actionId).sort()))
        .toEqual(['carpenter.speakTo', 'house.takePitchfork', 'kitchen.takeMilk', 'library.learnRiddle', 'rigging.assemble']);

    expect(await page.evaluate(() => window.__GAME_TEST__.explainAction('bridge.repair'))).toMatchObject({
        available: false,
        reason: 'missing-prerequisites',
    });

    const blocked = await page.evaluate(() => window.__GAME_TEST__.applyMilestone('bridge.repair'));
    expect(blocked.available).toBe(false);

    const applied = await page.evaluate(() => window.__GAME_TEST__.applyMilestone('library.learnRiddle'));
    expect(applied.effects).toEqual(['library.riddleKnown']);
    expect(await page.evaluate(() => window.__GAME_TEST__.factConflicts())).toMatchObject({ valid: true });

    const facts = await page.evaluate(() => window.__GAME_TEST__.listFacts());
    expect(facts.find((fact) => fact.factId === 'library.riddleKnown')).toMatchObject({ satisfied: true, mandatory: true });
    expect(facts.find((fact) => fact.factId === 'chapter1.mapReached')).toMatchObject({ satisfied: false, mandatory: true });

    // The frontier is a debug affordance; the player UI never renders it.
    expect(await page.locator('#interactionInfo').textContent()).not.toContain('library.learnRiddle');
});

test('saves, migrations, locales, and simulated failures run through the real repository', async ({ page }) => {
    await openDebugGame(page);
    await loadScenario(page, 'chapter1.rigging-ready');

    const saved = await page.evaluate(() => window.__GAME_TEST__.saveScenario('e2e.section4.scenario'));
    expect(saved).toMatchObject({ saved: true });
    const loaded = await page.evaluate(() => window.__GAME_TEST__.loadSavedScenario('e2e.section4.scenario'));
    expect(loaded).toMatchObject({ loaded: true, roomId: 'riverCrossing' });

    expect(await page.evaluate(() => window.__GAME_TEST__.selectMigrationFixture('legacy'))).toMatchObject({ schemaVersion: 0 });
    expect(await page.evaluate(() => window.__GAME_TEST__.selectMigrationFixture('nonsense'))).toMatchObject({ fixtureId: 'nonsense' });

    await page.evaluate(() => window.__GAME_TEST__.simulateStorageFailure(true));
    expect(await page.evaluate(() => window.__GAME_TEST__.saveScenario('e2e.section4.failing'))).toMatchObject({ saved: false });
    await page.evaluate(() => window.__GAME_TEST__.simulateStorageFailure(false));

    await page.evaluate(() => window.__GAME_TEST__.setLocale('fr'));
    await expect.poll(async () => (await summary(page)).locale).toBe('fr');
    expect(await page.evaluate(() => window.__GAME_TEST__.setLocale('klingon'))).toMatchObject({ locale: 'klingon' });
    expect((await summary(page)).locale).toBe('fr');

    await page.evaluate(() => window.__GAME_TEST__.simulateMissingKey('ui.headerStringSave'));
    await expect(page.locator('html')).toHaveAttribute('data-debug-missing-key', 'ui.headerStringSave');
    await page.evaluate(() => window.__GAME_TEST__.setViewportPreset('1280x720'));
    await expect(page.locator('html')).toHaveAttribute('data-debug-viewport', '1280x720');
    await page.evaluate(() => window.__GAME_TEST__.setInputMode('keyboard'));
    await expect(page.locator('html')).toHaveAttribute('data-debug-input-mode', 'keyboard');
    expect(await page.evaluate(() => window.__GAME_TEST__.setAccessibilityOption('highContrast', 'toggle'))).toMatchObject({ value: true });
    expect(await page.evaluate(() => window.__GAME_TEST__.simulateAssetFailure('./resources/backgrounds/marketStreet.png')))
        .toMatchObject({ assetUrl: './resources/backgrounds/marketStreet.png' });
});

test('overlays, diagnostics, and the reproduction bundle describe the run', async ({ page }) => {
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    await openDebugGame(page, { seed: 777 });
    await loadScenario(page, 'chapter1.town-open');

    const overlays = await page.evaluate(() => window.__GAME_TEST__.setOverlays({
        walkGrid: true, costs: true, blocked: true, exits: true, hotspots: true,
        footprints: true, anchors: true, path: true, playerCell: true, overlaps: true, unreachable: true,
    }));
    expect(Object.values(overlays.options).every((enabled) => enabled === true)).toBe(true);
    await page.waitForTimeout(150);
    await page.evaluate(() => window.__GAME_TEST__.setOverlays({}));

    const paused = await page.evaluate(() => window.__GAME_TEST__.pause());
    expect(paused.paused).toBe(true);
    expect(await page.evaluate(() => window.__GAME_TEST__.resume())).toMatchObject({ paused: false });

    const snapshot = await page.evaluate(() => window.__GAME_TEST__.exportSnapshot());
    expect(snapshot).toMatchObject({ schemaVersion: 1, scenarioId: 'chapter1.town-open' });
    expect(await page.evaluate((value) => window.__GAME_TEST__.importSnapshot(value), snapshot)).toMatchObject({
        checksum: snapshot.checksum,
    });
    expect(await page.evaluate(() => window.__GAME_TEST__.importSnapshot({ state: { schemaVersion: 99 } }))).toHaveProperty('errors');

    const bundle = await page.evaluate(() => window.__GAME_TEST__.exportReproductionBundle());
    expect(bundle).toMatchObject({ schemaVersion: 1, apiVersion: 1, scenarioId: 'chapter1.town-open', seed: 1004 });
    expect(bundle.checksum).toMatch(/^[0-9a-f]{8}$/);
    expect(bundle.actions.length).toBeGreaterThan(0);
    expect(bundle.actions.some((entry) => entry.name === 'loaded')).toBe(true);
    expect(Array.isArray(bundle.errors)).toBe(true);
    expect(bundle.summary).toMatchObject({ roomId: 'marketStreet', presentationMode: 'gameVisibleActive' });
    expect(bundle.summary.frameTime.samples).toBeGreaterThan(0);
    expect(bundle.summary.assets).toHaveProperty('documentState');

    expect(runtimeErrors).toEqual([]);
});

test('the debug panel drives the same controller the test API uses', async ({ page }) => {
    await openDebugGame(page, { showPanel: true });
    const panel = page.locator('#debugPanel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('[data-debug-control="watermark"]')).toHaveText('DEBUG BUILD — NOT FOR PLAY');

    await panel.locator('[data-debug-control="scenario"]').selectOption('chapter1.den-unlock-ready');
    await panel.locator('[data-debug-control="loadScenario"]').click();
    await expect.poll(async () => (await summary(page)).roomId, { timeout: 15_000 }).toBe('alley');
    await expect(panel.locator('[data-debug-control="output"]')).toContainText('"loaded": true');

    await panel.locator('[data-debug-control="listFacts"]').click();
    await expect(panel.locator('[data-debug-control="output"]')).toContainText('research.mapClueFound');

    await panel.locator('[data-debug-control="inspectSummary"]').click();
    await expect(panel.locator('[data-debug-control="output"]')).toContainText('"roomId": "alley"');

    // Every panel section from the debug plan is present.
    for (const heading of ['Session', 'Location and movement', 'Overlays', 'Inventory and verbs', 'Dialogue and characters', 'Puzzles and quests', 'Save, localisation, presentation', 'Diagnostics']) {
        await expect(panel.locator('h3', { hasText: heading })).toHaveCount(1);
    }

    // The original hand-built tools survived the move behind the gate.
    await panel.locator('[data-debug-control="toggleLegacyGridView"]').click();
    await expect(panel.locator('[data-debug-control="output"]')).toContainText('"enabled": true');
    await panel.locator('[data-debug-control="toggleLegacyGridView"]').click();
    await panel.locator('[data-debug-control="toggleNonPlayerAnimation"]').click();
    await expect(panel.locator('[data-debug-control="output"]')).toContainText('"enabled": false');
    await panel.locator('[data-debug-control="toggleNonPlayerAnimation"]').click();

    await page.keyboard.press('NumpadSubtract');
    await expect(panel).toBeHidden();
    await page.keyboard.press('NumpadSubtract');
    await expect(panel).toBeVisible();
});
