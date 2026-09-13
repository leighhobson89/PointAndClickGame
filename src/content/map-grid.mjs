import { contentSchemas, validateMapRoomSchema } from './schemas.mjs';

function pointInPolygon(x, y, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i];
        const b = polygon[j];
        const crosses = (a.y > y) !== (b.y > y)
            && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x;
        if (crosses) inside = !inside;
    }
    return inside;
}

export function buildMapGrid(definition) {
    const errors = validateMapRoomSchema(definition);
    if (errors.length) throw new TypeError(`Invalid map room: ${errors.join('; ')}`);

    const { width, height } = definition;
    const grid = Array.from({ length: height }, (_row, y) =>
        Array.from({ length: width }, (_cell, x) =>
            pointInPolygon(x + 0.5, y + 0.5, definition.walkablePolygon)
                ? definition.walkableCell
                : definition.defaultCell,
        ),
    );

    for (const exit of definition.exits) {
        const { x, y, width: exitWidth, height: exitHeight } = exit.rectangle;
        for (let row = y; row < y + exitHeight; row += 1) {
            for (let column = x; column < x + exitWidth; column += 1) {
                if (grid[row]?.[column] !== undefined) grid[row][column] = exit.exitId;
            }
        }
    }

    const invalidCell = grid.flat().find((cell) => !contentSchemas.grid.cellPattern.test(cell));
    if (invalidCell) throw new TypeError(`Map room generated invalid cell '${invalidCell}'`);
    return grid;
}
