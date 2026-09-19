import test from 'node:test';
import assert from 'node:assert/strict';

import {
    PLAYER_STEP_LENGTH_PER_HEIGHT,
    PLAYER_WALK_DIRECTIONS,
    PLAYER_WALK_FRAME_PHASE_ENDS,
    advancePlayerWalk,
    normaliseWalkPhase,
    playerWalkSprite,
    walkFrameForPhase,
} from '../../src/domain/animation/player-gait.mjs';

test('walk phase boundaries play the nine authored poses forward exactly once', () => {
    const starts = [0, ...PLAYER_WALK_FRAME_PHASE_ENDS.slice(0, -1)];
    assert.deepEqual(starts.map((phase) => walkFrameForPhase(phase)), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.equal(walkFrameForPhase(0.999), 9);
    assert.equal(walkFrameForPhase(1), 1);
});

test('every direction uses the same ordered gait and stable sprite keys', () => {
    const phases = PLAYER_WALK_FRAME_PHASE_ENDS.map((end, index) => {
        const start = index === 0 ? 0 : PLAYER_WALK_FRAME_PHASE_ENDS[index - 1];
        return (start + end) / 2;
    });

    for (const direction of PLAYER_WALK_DIRECTIONS) {
        assert.deepEqual(
            phases.map((phase) => playerWalkSprite(direction, phase)),
            Array.from({ length: 9 }, (_, index) => `move${index + 1}_${direction}`),
        );
    }
});

test('one body-relative step wraps to the same contact at every depth', () => {
    for (const drawnHeight of [45, 85, 140, 195, 300]) {
        const distance = drawnHeight * PLAYER_STEP_LENGTH_PER_HEIGHT;
        const result = advancePlayerWalk({ phase: 0, distance, drawnHeight, direction: 'right' });
        assert.ok(Math.abs(result.phase) < 1e-12);
        assert.equal(result.sprite, 'move1_right');
        assert.equal(result.stepLength, distance);
    }
});

test('sub-frame distance accumulates instead of being rounded away', () => {
    let phase = 0;
    for (let tick = 0; tick < 20; tick += 1) {
        phase = advancePlayerWalk({ phase, distance: 0.25, drawnHeight: 100, direction: 'up' }).phase;
    }
    assert.ok(phase > 0.1 && phase < 0.12);
});

test('walk phase wraps and invalid gait input is rejected', () => {
    assert.equal(normaliseWalkPhase(-0.25), 0.75);
    assert.equal(normaliseWalkPhase(2.25), 0.25);
    assert.throws(() => playerWalkSprite('diagonal', 0), /Unknown player walk direction/);
    assert.throws(
        () => advancePlayerWalk({ phase: 0, distance: -1, drawnHeight: 100, direction: 'left' }),
        /non-negative/,
    );
});
