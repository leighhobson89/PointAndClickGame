import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    buildDepthField,
    buildRoomScaleProfiles,
    createRoomScaleProfile,
    parseDepthByte,
    roomIdForGrid,
    sampleDepthByte,
    scaledEntitySize,
} from '../../src/domain/navigation/depth-scale.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));

// A three-row strip: a wall, a far band, and a near band, with an exit and a
// placed-object stamp punched through the walkable rows.
const STRIP = [
    ['n', 'n', 'n', 'n'],
    ['w100', 'w100', 'e1', 'w100'],
    ['w200', 'oobjectBarrel', 'w200', 'w200'],
];

test('a depth byte is read only from a walkable cell, and is clamped to the authored range', () => {
    assert.equal(parseDepthByte('w180'), 180);
    assert.equal(parseDepthByte('w099'), 100, 'below the authored floor clamps up rather than inventing a smaller scale');
    assert.equal(parseDepthByte('w999'), 255);
    for (const cell of ['n', 'e1', 'oobjectBarrel', 'cnpcWolf', '', null, undefined, 42]) {
        assert.equal(parseDepthByte(cell), null, `${String(cell)} is not a depth cell`);
    }
});

test('the depth field fills exits, walls, and placement stamps from the nearest painted cell', () => {
    const field = buildDepthField(STRIP);
    assert.equal(field.minByte, 100);
    assert.equal(field.maxByte, 200);
    assert.equal(field.paintedCells, 6, 'only the six walkable cells are painted');

    const at = (x, y) => field.bytes[y * field.width + x];
    assert.equal(at(2, 1), 100, 'the exit cell takes the depth of the floor beside it');
    assert.equal(at(1, 2), 200, 'the object stamp takes the depth of the floor beside it');
    assert.equal(at(0, 0), 100, 'the wall row is still defined, so a sample can never fall off the field');

    // This is the defect the field exists to remove: the previous code read the
    // live cell and abandoned the resize whenever it was not a `w` value, so a
    // player standing on an exit or a placed object kept its last size.
    assert.ok(field.bytes.every((value) => value >= 100), 'every cell resolves to a usable depth');
});

test('sampling is continuous across a cell boundary rather than stepping at it', () => {
    const field = buildDepthField(STRIP);
    const centreOfFar = sampleDepthByte(field, 0.5, 1.5);
    const centreOfNear = sampleDepthByte(field, 0.5, 2.5);
    const boundary = sampleDepthByte(field, 0.5, 2.0);

    assert.equal(centreOfFar, 100);
    assert.equal(centreOfNear, 200);
    assert.equal(boundary, 150, 'the boundary reads as the midpoint, not as either neighbour');

    let previous = sampleDepthByte(field, 0.5, 1.5);
    for (let y = 1.5; y <= 2.5; y += 0.05) {
        const current = sampleDepthByte(field, 0.5, y);
        assert.ok(current - previous < 12, `depth jumped by ${current - previous} at y=${y.toFixed(2)}`);
        previous = current;
    }
});

test('a room profile interpolates between its two authored player heights', () => {
    const profile = createRoomScaleProfile({
        playerHeightNear: 150, playerHeightFar: 50, minByte: 100, maxByte: 200,
    });

    assert.equal(profile.playerHeightAt(200), 150, 'the near plane is exactly the authored near height');
    assert.equal(profile.playerHeightAt(100), 50, 'the far plane is exactly the authored far height');
    assert.ok(Math.abs(profile.playerHeightAt(150) - 100) < 1e-9, 'the midpoint interpolates linearly');
    assert.equal(profile.depthRatio, 3);

    assert.equal(profile.scaleAt(200), 1, 'the curve is normalised to 1 at the near plane');
    assert.equal(profile.playerHeightAt(400), 150, 'a byte beyond the painted range clamps instead of extrapolating');
    assert.equal(profile.playerHeightAt(0), 50);
});

test('a room whose floor paints almost no depth gradient holds one size instead of amplifying paint noise', () => {
    const profile = createRoomScaleProfile({
        playerHeightNear: 150, playerHeightFar: 50, minByte: 200, maxByte: 202,
    });
    assert.equal(profile.playerHeightAt(200), 150);
    assert.equal(profile.playerHeightAt(202), 150);
    assert.equal(profile.depthRatio, 1);
});

test('entities scale on the same curve as the player, from their authored near-plane size', () => {
    const profile = createRoomScaleProfile({
        playerHeightNear: 150, playerHeightFar: 75, minByte: 100, maxByte: 200, entityScaleAtNear: 2,
    });

    const near = scaledEntitySize(profile, 200, { width: 10, height: 30 });
    assert.deepEqual(near, { width: 20, height: 60 }, 'at the near plane the entity is its authored size times the room multiplier');

    const far = scaledEntitySize(profile, 100, { width: 10, height: 30 });
    assert.equal(far.height / near.height, 0.5, 'the entity halves over exactly the range the player halves over');
    assert.equal(far.width / far.height, near.width / near.height, 'scaling never changes an entity aspect ratio');
});

test('a grid variant resolves to the room that owns it, longest match first', () => {
    const roomIds = ['riverCrossing', 'cowPath', 'den'];
    assert.equal(roomIdForGrid('riverCrossing', roomIds), 'riverCrossing');
    assert.equal(roomIdForGrid('riverCrossingBridgeComplete', roomIds), 'riverCrossing');
    assert.equal(roomIdForGrid('riverCrossingBridgeHalfComplete', roomIds), 'riverCrossing');
    assert.equal(roomIdForGrid('somewhereElse', roomIds), null);
});

test('every shipped room declares a usable scale profile, and the river crossing keeps one across its bridge states', () => {
    const navigation = readJson('resources/screenNavigation.json');
    const grids = readJson('resources/screenWalkableJSONS/masterJSONData.json');
    const { profiles } = buildRoomScaleProfiles(grids, navigation);

    for (const roomId of Object.keys(navigation)) {
        const profile = profiles.get(roomId);
        assert.ok(profile, `${roomId} has no scale profile`);
        assert.ok(profile.playerHeightNear > 0 && profile.playerHeightFar > 0, `${roomId} has a non-positive authored height`);
        assert.ok(
            profile.playerHeightFar <= profile.playerHeightNear,
            `${roomId} is authored taller at its far plane than at its near plane`,
        );
        // The ceiling is what makes the room set read as one game. The ramp this
        // replaced produced ratios up to 10x, which is why the player shrank to
        // a speck at the back of Market Street and the sewer.
        assert.ok(
            profile.depthRatio <= 4,
            `${roomId} has a ${profile.depthRatio.toFixed(2)}x near-to-far ratio, beyond the 4x perspective ceiling`,
        );
    }

    // The bridge grids paint different depth ranges. Unless the room's range is
    // the union across its variants, completing the bridge would resize the
    // player where they stand.
    const river = profiles.get('riverCrossing');
    for (const gridId of ['riverCrossing', 'riverCrossingBridgeComplete', 'riverCrossingBridgeHalfComplete']) {
        assert.ok(grids[gridId], `${gridId} is missing from the shipped grids`);
    }
    assert.equal(river.playerHeightNear, 150);
    assert.equal(river.playerHeightFar, 78);
});
