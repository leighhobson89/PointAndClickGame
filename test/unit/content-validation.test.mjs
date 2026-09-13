import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildMapGrid } from '../../src/content/map-grid.mjs';
import { validateSaveSchema, validateScenarioSchema } from '../../src/content/schemas.mjs';
import { validateContentBundle } from '../../src/content/validate-content.mjs';
import { createSaveEnvelope } from '../../src/domain/save/save-format.mjs';
import { createInitialGameState } from '../../src/state/game-state.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

function loadBundle() {
    return {
        contract: readJson('resources/content-contract.json'),
        grids: readJson('resources/screenWalkableJSONS/masterJSONData.json'),
        navigation: readJson('resources/screenNavigation.json'),
        objects: readJson('resources/objectsGame.json'),
        npcs: readJson('resources/npcGame.json'),
        dialogue: readJson('resources/dialogue.json'),
        localization: readJson('localization.json'),
        mapRoom: readJson('resources/mapRoom.json'),
        foregrounds: readJson('resources/screenWalkableJSONS/masterForegroundData.json'),
    };
}

test('all shipped content satisfies the canonical contract', () => {
    const result = validateContentBundle(loadBundle());
    assert.deepEqual(result.errors, []);
    assert.equal(result.valid, true);
    assert.equal(result.grids.map.length, 60);
    assert.equal(result.grids.map[0].length, 80);
});

test('map grid produces a reachable return exit and walkable payoff area', () => {
    const mapRoom = readJson('resources/mapRoom.json');
    const grid = buildMapGrid(mapRoom);
    assert.ok(grid.flat().includes('e1'));
    assert.equal(grid[45][14], 'w210');
    assert.equal(grid[25][79], 'n');
});

test('content validation rejects broken references, grids, locales, overlaps, and orphan facts', () => {
    const missingRoom = loadBundle();
    missingRoom.navigation.marketStreet.exits.e1.connectsTo = 'missingRoom';
    assert.match(validateContentBundle(missingRoom).errors.join('\n'), /missingRoom/);

    const missingTarget = loadBundle();
    missingTarget.objects.objects.objectBowl.usedOn.objectUseWith1 = 'objectMissing';
    assert.match(validateContentBundle(missingTarget).errors.join('\n'), /objectMissing/);

    const openInitialGate = loadBundle();
    openInitialGate.navigation.riverCrossing.exits.e2.status = 'open';
    assert.match(validateContentBundle(openInitialGate).errors.join('\n'), /must begin locked/);

    const badGrid = loadBundle();
    badGrid.grids.libraryFoyer[0][0] = 'lava';
    assert.match(validateContentBundle(badGrid).errors.join('\n'), /invalid code 'lava'/);

    const badForeground = loadBundle();
    badForeground.foregrounds.libraryFoyer[0][0] = 'fog';
    assert.match(validateContentBundle(badForeground).errors.join('\n'), /foreground grid.*invalid code 'fog'/);

    const missingLocale = loadBundle();
    delete missingLocale.objects.objects.objectBowl.name.fr;
    assert.match(validateContentBundle(missingLocale).errors.join('\n'), /objectBowl\.name\.fr/);

    const overlap = loadBundle();
    overlap.objects.objects.objectMilkBottle.gridPosition = { ...overlap.objects.objects.objectDoorToDen.gridPosition };
    assert.match(validateContentBundle(overlap).errors.join('\n'), /undeclared hotspot overlap/);

    const orphan = loadBundle();
    orphan.contract.puzzle.actions = orphan.contract.puzzle.actions.filter((action) => action.id !== 'chapter1.claimMap');
    assert.match(validateContentBundle(orphan).errors.join('\n'), /chapter1\.mapReached.*unreachable/);
});

test('scenario and save boundaries reject malformed versions and accept their minimal schemas', () => {
    assert.deepEqual(validateScenarioSchema({ schemaVersion: 1, id: 'chapter1.map', seed: 7, facts: {} }), []);
    assert.ok(validateScenarioSchema({ schemaVersion: 2, id: 'bad id', seed: 1.5, facts: [] }).length >= 4);
    assert.deepEqual(validateSaveSchema(createSaveEnvelope({ state: createInitialGameState() })), []);
    assert.ok(validateSaveSchema({ schemaVersion: 9, payload: null }).length >= 2);
});
