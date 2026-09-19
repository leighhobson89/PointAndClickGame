// Distance-driven player gait.
//
// A walk frame is a pose at a point in a step, not a tiny stopwatch. Advancing
// by elapsed ticks makes the feet slide whenever room depth changes the world
// speed. This module keeps the gait as a normalised distance phase so the same
// authored step remains in time at every size and in every direction.

export const PLAYER_WALK_DIRECTIONS = Object.freeze(['left', 'right', 'up', 'down']);

// Cumulative frame ends in one normalised step. Contact is deliberately brief;
// recoil, passing and swing need slightly longer to read.
export const PLAYER_WALK_FRAME_PHASE_ENDS = Object.freeze([
    0.07, 0.18, 0.30, 0.42, 0.55, 0.66, 0.77, 0.88, 1,
]);

// One planted-foot contact to the opposite contact covers a little under half
// a body height in the authored lateral art. Using drawn height keeps cadence
// stable when room perspective scales both movement and character.
export const PLAYER_STEP_LENGTH_PER_HEIGHT = 0.45;

function assertDirection(direction) {
    if (!PLAYER_WALK_DIRECTIONS.includes(direction)) {
        throw new RangeError(`Unknown player walk direction: ${direction}`);
    }
}

export function normaliseWalkPhase(value) {
    if (!Number.isFinite(value)) return 0;
    const wrapped = value % 1;
    return wrapped < 0 ? wrapped + 1 : wrapped;
}

export function walkFrameForPhase(phase) {
    const normalised = normaliseWalkPhase(phase);
    const index = PLAYER_WALK_FRAME_PHASE_ENDS.findIndex((end) => normalised < end);
    return (index < 0 ? PLAYER_WALK_FRAME_PHASE_ENDS.length - 1 : index) + 1;
}

export function playerWalkSprite(direction, phase) {
    assertDirection(direction);
    return `move${walkFrameForPhase(phase)}_${direction}`;
}

export function advancePlayerWalk({ phase = 0, distance, drawnHeight, direction }) {
    assertDirection(direction);
    if (!Number.isFinite(distance) || distance < 0) {
        throw new RangeError('Player walk distance must be a finite non-negative number.');
    }
    if (!Number.isFinite(drawnHeight) || drawnHeight <= 0) {
        throw new RangeError('Player drawn height must be a finite positive number.');
    }

    const stepLength = Math.max(1, drawnHeight * PLAYER_STEP_LENGTH_PER_HEIGHT);
    const nextPhase = normaliseWalkPhase(phase + (distance / stepLength));
    return {
        phase: nextPhase,
        frame: walkFrameForPhase(nextPhase),
        sprite: playerWalkSprite(direction, nextPhase),
        stepLength,
    };
}
