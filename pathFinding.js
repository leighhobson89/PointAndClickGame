import {
    getCanvasCellHeight,
    getCanvasCellWidth,
    getGridData,
    getNpcData,
    getObjectData,
    getPlayerObject,
} from './constantsAndGlobalVars.js';
import { findNearestWalkable, findPath } from './src/domain/navigation/navigation.mjs';

const LARGE_INTERACTION_TARGETS = new Set([
    'oobjectStackOfWood',
    'oobjectRopeAndHookWithStackOfWood',
    'oobjectRopeAndHookWithStackOfWoodOnPulley',
]);

function entityFootPosition(start, subject) {
    const cellWidth = getCanvasCellWidth();
    const cellHeight = getCanvasCellHeight();
    const entity = subject === 'player'
        ? getPlayerObject()
        : subject.startsWith('n') ? getNpcData().npcs[subject] : getObjectData().objects[subject];
    const width = subject === 'player' ? entity.width : entity.dimensions.width;
    const height = subject === 'player' ? entity.height : entity.dimensions.height;
    return {
        x: Math.floor(start.x + (width / 2) / cellWidth),
        y: Math.floor(start.y + height / cellHeight),
    };
}

function redirectDoorTarget(grid, target) {
    const value = grid[target.y]?.[target.x];
    if (!value?.startsWith('o') || !value.includes('objectDoor')) return target;
    const candidates = [];
    for (let y = 0; y < grid.length; y += 1) {
        for (let x = 0; x < grid[y].length; x += 1) if (grid[y][x] === value) candidates.push({ x, y });
    }
    const bottom = Math.max(...candidates.map((point) => point.y));
    const middle = grid[0].length / 2;
    return candidates.filter((point) => point.y === bottom).sort((left, right) => Math.abs(left.x - middle) - Math.abs(right.x - middle))[0] ?? target;
}

function segment(grid, start, target, action, subject, overrideCellCost) {
    const targetValue = grid[target.y]?.[target.x];
    const targetRadius = action === 'talkTo' || action === 'give'
        ? 13
        : LARGE_INTERACTION_TARGETS.has(targetValue) ? 18 : 0;
    const options = {
        targetRadius,
        override: Boolean(overrideCellCost),
        blocked: (cell) => (subject === 'player' && cell.startsWith('c'))
            || (cell.startsWith('o') && getObjectData().objects[cell.slice(1)]?.interactable?.canHover === false),
    };
    const path = targetValue === 'n' ? [] : findPath(grid, start, target, options);
    if (path.length) return path;
    const fallback = findNearestWalkable(grid, target);
    return fallback ? findPath(grid, start, fallback, { ...options, targetRadius: 0 }) : [];
}

export function aStarPathfinding(start, target, action, subject, waypoints = [], overrideCellCost = false) {
    if (target?.x === null || target?.y === null) return [];
    const grid = getGridData().gridData;
    let current = entityFootPosition({ ...start }, subject);
    const points = [...waypoints.map((point) => ({ ...point })), { ...target }];
    const fullPath = [];
    for (const point of points) {
        const desired = subject === 'player' ? redirectDoorTarget(grid, point) : point;
        const partial = segment(grid, current, desired, action, subject, overrideCellCost);
        if (!partial.length) return [];
        fullPath.push(...(fullPath.length ? partial.slice(1) : partial));
        current = partial.at(-1);
    }
    return fullPath;
}

export function findAndMoveToNearestWalkable(start, target) {
    return findNearestWalkable(getGridData().gridData, target);
}
