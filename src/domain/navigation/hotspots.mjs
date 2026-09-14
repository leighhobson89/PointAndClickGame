const TARGET_PREFIXES = Object.freeze(['e', 'o', 'c']);

function targetMetadata(code, { roomId, navigation, objects, npcs, locale }) {
    if (code.startsWith('e')) {
        const exit = navigation?.[roomId]?.exits?.[code];
        const destination = exit?.connectsTo;
        if (!exit || !destination) return null;
        return {
            id: `${roomId}.${code}`,
            targetId: destination,
            exitId: code,
            kind: 'exit',
            label: navigation?.[destination]?.[locale] ?? navigation?.[destination]?.en ?? destination,
        };
    }
    if (code.startsWith('o')) {
        const targetId = code.slice(1);
        const object = objects?.[targetId];
        if (!object) return null;
        return {
            id: targetId,
            targetId,
            kind: 'object',
            label: object.name?.[locale] ?? object.name?.en ?? targetId,
        };
    }
    if (code.startsWith('c')) {
        const targetId = code.slice(1);
        const npc = npcs?.[targetId];
        if (!npc) return null;
        return {
            id: targetId,
            targetId,
            kind: 'npc',
            label: npc.name?.[locale] ?? npc.name?.en ?? targetId,
        };
    }
    return null;
}

/**
 * Build the semantic counterpart of the canvas from the already-composed
 * runtime grid. Walking continues to use the authored grid; this projection is
 * only the accessible hit area and therefore cannot alter story or puzzle data.
 */
export function collectSemanticHotspots({ grid, roomId, navigation = {}, objects = {}, npcs = {}, locale = 'en' }) {
    if (!Array.isArray(grid) || !grid.length) return [];
    const cellsByCode = new Map();
    for (let y = 0; y < grid.length; y += 1) {
        for (let x = 0; x < (grid[y]?.length ?? 0); x += 1) {
            const code = grid[y][x];
            if (typeof code !== 'string' || !TARGET_PREFIXES.some((prefix) => code.startsWith(prefix))) continue;
            if (!cellsByCode.has(code)) cellsByCode.set(code, []);
            cellsByCode.get(code).push({ x, y });
        }
    }

    return [...cellsByCode.entries()].map(([code, cells]) => {
        const metadata = targetMetadata(code, { roomId, navigation, objects, npcs, locale });
        if (!metadata) return null;
        const minX = Math.min(...cells.map((cell) => cell.x));
        const maxX = Math.max(...cells.map((cell) => cell.x));
        const minY = Math.min(...cells.map((cell) => cell.y));
        const maxY = Math.max(...cells.map((cell) => cell.y));
        const centre = cells[Math.floor(cells.length / 2)];
        const sourceWidth = maxX - minX + 1;
        const sourceHeight = maxY - minY + 1;
        const width = metadata.kind === 'exit' ? Math.max(3, sourceWidth) : sourceWidth;
        const height = metadata.kind === 'exit' ? Math.max(3, sourceHeight) : sourceHeight;
        const gridWidth = grid[0].length;
        const gridHeight = grid.length;
        const x = Math.min(Math.max(0, minX - Math.floor((width - sourceWidth) / 2)), gridWidth - width);
        const y = Math.min(Math.max(0, minY - Math.floor((height - sourceHeight) / 2)), gridHeight - height);
        return Object.freeze({
            ...metadata,
            code,
            x,
            y,
            width,
            height,
            anchor: Object.freeze({ x: centre.x, y: centre.y }),
        });
    }).filter(Boolean).sort((left, right) => left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id));
}

export function hotspotSignature(roomId, hotspots) {
    return `${roomId}|${hotspots.map(({ id, x, y, width, height }) => `${id}:${x},${y},${width},${height}`).join('|')}`;
}
