const DIRECTIONS = Object.freeze([
    { x: 0, y: -1, cost: 1 }, { x: 1, y: 0, cost: 1 },
    { x: 0, y: 1, cost: 1 }, { x: -1, y: 0, cost: 1 },
    { x: 1, y: -1, cost: Math.SQRT2 }, { x: 1, y: 1, cost: Math.SQRT2 },
    { x: -1, y: -1, cost: Math.SQRT2 }, { x: -1, y: 1, cost: Math.SQRT2 },
]);

export function inBounds(grid, point) {
    return Number.isInteger(point?.x) && Number.isInteger(point?.y)
        && point.y >= 0 && point.y < grid.length && point.x >= 0 && point.x < (grid[point.y]?.length ?? 0);
}

export function movementCost(cell, directionCost = 1, { blocked = () => false, override = false } = {}) {
    if (override) return directionCost;
    if (blocked(cell)) return Infinity;
    if (cell === 'n') return directionCost * 10000;
    return directionCost;
}

export function findPath(grid, start, target, options = {}) {
    if (!Array.isArray(grid) || !inBounds(grid, start) || !inBounds(grid, target)) return [];
    const distance = (left, right) => Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
    const targetRadius = Math.max(0, options.targetRadius ?? 0);
    const open = [{ ...start, g: 0, f: distance(start, target), parent: null }];
    const bestCosts = new Map([[`${start.x},${start.y}`, 0]]);
    const closed = new Set();

    while (open.length) {
        open.sort((left, right) => left.f - right.f || left.g - right.g);
        const current = open.shift();
        const currentKey = `${current.x},${current.y}`;
        if (closed.has(currentKey)) continue;
        closed.add(currentKey);
        if (distance(current, target) <= targetRadius) {
            const path = [];
            for (let node = current; node; node = node.parent) path.push({ x: node.x, y: node.y });
            return path.reverse();
        }
        for (const direction of DIRECTIONS) {
            const point = { x: current.x + direction.x, y: current.y + direction.y };
            if (!inBounds(grid, point)) continue;
            const key = `${point.x},${point.y}`;
            if (closed.has(key)) continue;
            const stepCost = movementCost(grid[point.y][point.x], direction.cost, options);
            if (!Number.isFinite(stepCost)) continue;
            const g = current.g + stepCost;
            if (g >= (bestCosts.get(key) ?? Infinity)) continue;
            bestCosts.set(key, g);
            open.push({ ...point, g, f: g + distance(point, target), parent: current });
        }
    }
    return [];
}

export function findNearestWalkable(grid, target, isWalkable = (cell) => typeof cell === 'string' && (cell.startsWith('w') || cell.startsWith('e'))) {
    if (!Array.isArray(grid) || !grid.length) return null;
    const origin = {
        x: Math.min(Math.max(Math.floor(target.x), 0), grid[0].length - 1),
        y: Math.min(Math.max(Math.floor(target.y), 0), grid.length - 1),
    };
    const queue = [origin];
    const visited = new Set([`${origin.x},${origin.y}`]);
    while (queue.length) {
        const current = queue.shift();
        if (isWalkable(grid[current.y][current.x])) return current;
        for (const direction of DIRECTIONS.slice(0, 4)) {
            const next = { x: current.x + direction.x, y: current.y + direction.y };
            const key = `${next.x},${next.y}`;
            if (inBounds(grid, next) && !visited.has(key)) {
                visited.add(key);
                queue.push(next);
            }
        }
    }
    return null;
}

export function findPathWithFallback(grid, start, target, options = {}) {
    const direct = findPath(grid, start, target, options);
    if (direct.length) return Object.freeze({ path: direct, target, usedFallback: false });
    const fallbackTarget = findNearestWalkable(grid, target, options.isWalkable);
    const path = fallbackTarget ? findPath(grid, start, fallbackTarget, options) : [];
    return Object.freeze({ path, target: fallbackTarget, usedFallback: Boolean(path.length) });
}

export function pointerToWorld({ clientX, clientY }, rect, stage) {
    if (!rect || rect.width <= 0 || rect.height <= 0 || stage.width <= 0 || stage.height <= 0) throw new TypeError('Valid rectangle and stage dimensions are required');
    return Object.freeze({
        x: (clientX - rect.left) * (stage.width / rect.width),
        y: (clientY - rect.top) * (stage.height / rect.height),
    });
}

export function worldToGrid(point, { cellWidth, cellHeight, width, height }) {
    const x = Math.floor(point.x / cellWidth);
    const y = Math.floor(point.y / cellHeight);
    return Object.freeze({ x, y, inBounds: x >= 0 && x < width && y >= 0 && y < height });
}

export function resolveCellTarget(cellValue, { roomId, navigation = {}, objects = {}, npcs = {} } = {}) {
    if (typeof cellValue !== 'string') return null;
    if (/^e[1-9]$/.test(cellValue)) {
        const exit = navigation[roomId]?.exits?.[cellValue];
        return exit ? Object.freeze({ id: exit.connectsTo, kind: 'exit', exitId: cellValue, canHover: true }) : null;
    }
    if (cellValue.startsWith('o')) {
        const id = cellValue.slice(1);
        const object = objects[id];
        return object ? Object.freeze({ id, kind: 'object', canHover: object.interactable?.canHover === true, isDoor: id.includes('objectDoor'), isOpen: object.interactable?.activeStatus === true, canPickUp: object.interactable?.canPickUp === true }) : null;
    }
    if (cellValue.startsWith('c')) {
        const id = cellValue.slice(1);
        return npcs[id] ? Object.freeze({ id, kind: 'npc', canHover: npcs[id].interactable?.canHover === true }) : null;
    }
    return null;
}

export function resolveHotspot(hotspots, point) {
    return hotspots.find((hotspot) => point.x >= hotspot.x && point.x < hotspot.x + hotspot.width && point.y >= hotspot.y && point.y < hotspot.y + hotspot.height) ?? null;
}

export function resolveInteractionAnchor(target, anchors = {}) {
    return anchors[target?.id] ?? target?.anchor ?? null;
}

