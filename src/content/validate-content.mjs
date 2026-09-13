import { buildMapGrid } from './map-grid.mjs';
import { validateDialogueGraph } from '../domain/dialogue/dialogue.mjs';
import { libraryDialogueGraph } from './library-dialogue.mjs';
import {
    CONTENT_SCHEMA_VERSION,
    contentSchemas,
    validateMapRoomSchema,
    validatePuzzleActionSchema,
} from './schemas.mjs';

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const sorted = (values) => [...values].sort();
const sameMembers = (left, right) => JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
const pairKey = (left, right) => [left, right].sort().join('|');

function localeMapErrors(value, locales, path, errors) {
    if (!isObject(value)) return;
    const keys = Object.keys(value);
    if (keys.some((key) => locales.includes(key))) {
        for (const locale of locales) {
            if (typeof value[locale] !== 'string') errors.push(`${path}.${locale} must be a string (fallback requires every locale key)`);
        }
        return;
    }
    for (const [key, child] of Object.entries(value)) localeMapErrors(child, locales, `${path}.${key}`, errors);
}

function leafPaths(value, prefix = '', paths = []) {
    if (!isObject(value)) {
        paths.push(prefix);
        return paths;
    }
    for (const [key, child] of Object.entries(value)) leafPaths(child, prefix ? `${prefix}.${key}` : key, paths);
    return paths;
}

function rectangleForEntity(id, entity, kind) {
    const width = Math.floor(entity.dimensions.originalWidth) + 1;
    const height = Math.floor(entity.dimensions.originalHeight) + 1;
    return {
        id,
        kind,
        roomId: kind === 'object' ? entity.objectPlacementLocation : entity.npcPlacementLocation,
        x: entity.gridPosition.x,
        y: entity.gridPosition.y,
        width,
        height,
        anchor: { x: entity.gridPosition.x + Math.floor(width / 2), y: entity.gridPosition.y + height - 1 },
        labels: entity.name,
        shape: 'rectangle',
    };
}

function overlaps(left, right) {
    return Math.min(left.x + left.width, right.x + right.width) > Math.max(left.x, right.x)
        && Math.min(left.y + left.height, right.y + right.height) > Math.max(left.y, right.y);
}

function validateEntityReferences(entityId, entity, objects, npcs, rooms, actions, errors) {
    const usedOn = entity.usedOn ?? {};
    if (usedOn.useTogetherLocation && !rooms.has(usedOn.useTogetherLocation)
        && !objects[usedOn.useTogetherLocation] && !npcs[usedOn.useTogetherLocation]) {
        errors.push(`${entityId}.usedOn.useTogetherLocation references missing target '${usedOn.useTogetherLocation}'`);
    }
    for (const key of ['objectUseWith1', 'objectUseWith2']) {
        const reference = usedOn[key];
        if (reference && !objects[reference] && !rooms.has(reference)) errors.push(`${entityId}.usedOn.${key} references missing object/room '${reference}'`);
    }
    for (const key of ['npcUseWith1', 'npcGiveTo']) {
        const reference = usedOn[key];
        if (reference && !npcs[reference]) errors.push(`${entityId}.usedOn.${key} references missing NPC '${reference}'`);
    }
    for (const [key, action] of Object.entries(usedOn)) {
        if (key.startsWith('action') && action && !actions.has(action)) errors.push(`${entityId}.usedOn.${key} references undeclared action '${action}'`);
    }
    const oppositeDoor = entity.interactable?.doorToOpenCloseOnOtherSide;
    if (oppositeDoor && !objects[oppositeDoor]) errors.push(`${entityId} references missing opposite door '${oppositeDoor}'`);
}

function validateNpcReferences(entityId, entity, objects, npcs, rooms, errors) {
    const usedOn = entity.usedOn ?? {};
    if (usedOn.useTogetherLocation && !rooms.has(usedOn.useTogetherLocation)
        && !objects[usedOn.useTogetherLocation] && !npcs[usedOn.useTogetherLocation]) {
        errors.push(`${entityId}.usedOn.useTogetherLocation references missing target '${usedOn.useTogetherLocation}'`);
    }
    for (const [key, objectId] of Object.entries(usedOn)) {
        if (key.startsWith('objectCanReceive') && objectId && !objects[objectId]) {
            errors.push(`${entityId}.usedOn.${key} references missing object '${objectId}'`);
        }
    }
}

function validateDialogueReferences(dialogue, objects, npcs, errors) {
    const walk = (value, path = 'dialogue') => {
        if (!isObject(value)) return;
        for (const [key, child] of Object.entries(value)) {
            if (/^object[A-Z]/.test(key) && key !== 'objectInteractions' && !objects[key]) errors.push(`${path} references missing object '${key}'`);
            if (/^npc[A-Z]/.test(key) && key !== 'npcInteractions' && !npcs[key]) errors.push(`${path} references missing NPC '${key}'`);
            walk(child, `${path}.${key}`);
        }
    };
    walk(dialogue);
}

function validateDialogueReachability(dialogue, errors) {
    const walk = (value, path = 'dialogue') => {
        if (!isObject(value)) return;
        if (typeof value.order === 'string') {
            const phase = value.phase ?? Object.fromEntries(Object.entries(value).filter(([key]) => /^\d+$/.test(key)));
            if (!value.order.endsWith('!')) errors.push(`${path}.order must have an explicit terminal marker`);
            if (value.order.replace(/!$/, '').length !== Object.keys(phase).length) {
                errors.push(`${path}.order must address every dialogue phase exactly once`);
            }
        }
        if (value.dialogueOptions && !sameMembers(Object.keys(value.dialogueOptions), Object.keys(value.responses ?? {}))) {
            errors.push(`${path} has a dialogue choice without a reachable response`);
        }
        for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`);
    };
    walk(dialogue);
}

function nearestNavigableCell(gridIds, grids, position, radius = 12) {
    return gridIds.some((gridId) => {
        const grid = grids[gridId];
        if (!grid) return false;
        for (let y = Math.max(0, position.y - radius); y <= Math.min(grid.length - 1, position.y + radius); y += 1) {
            for (let x = Math.max(0, position.x - radius); x <= Math.min(grid[y].length - 1, position.x + radius); x += 1) {
                if (grid[y][x] !== 'n') return true;
            }
        }
        return false;
    });
}

function exitHotspot(roomId, exitId, gridIds, grids, labels) {
    for (const gridId of gridIds) {
        const cells = [];
        const grid = grids[gridId];
        if (!grid) continue;
        for (let y = 0; y < grid.length; y += 1) {
            for (let x = 0; x < grid[y].length; x += 1) {
                if (grid[y][x] === exitId) cells.push({ x, y });
            }
        }
        if (!cells.length) continue;
        const minX = Math.min(...cells.map((cell) => cell.x));
        const maxX = Math.max(...cells.map((cell) => cell.x));
        const minY = Math.min(...cells.map((cell) => cell.y));
        const maxY = Math.max(...cells.map((cell) => cell.y));
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        return {
            id: `${roomId}.${exitId}`,
            kind: 'exit',
            roomId,
            x: minX,
            y: minY,
            width,
            height,
            anchor: cells[Math.floor(cells.length / 2)],
            labels,
            shape: cells.length === width * height ? 'rectangle' : 'grid polygon',
            variant: gridId,
        };
    }
    return null;
}

function validatePuzzle(contract, errors) {
    const facts = new Set(contract.puzzle?.initialFacts ?? []);
    const actionIds = new Set();
    const actions = contract.puzzle?.actions ?? [];
    actions.forEach((action, index) => {
        errors.push(...validatePuzzleActionSchema(action, `puzzle.actions[${index}]`));
        if (actionIds.has(action.id)) errors.push(`duplicate puzzle action ID '${action.id}'`);
        actionIds.add(action.id);
    });
    let changed = true;
    while (changed) {
        changed = false;
        for (const action of actions) {
            if (action.requires.every((fact) => facts.has(fact))) {
                for (const effect of action.effects) {
                    if (!facts.has(effect)) {
                        facts.add(effect);
                        changed = true;
                    }
                }
            }
        }
    }
    for (const fact of contract.puzzle?.mandatoryFacts ?? []) {
        if (!facts.has(fact)) errors.push(`mandatory puzzle fact '${fact}' is orphaned or unreachable`);
    }
}

export function validateContentBundle(bundle) {
    const errors = [];
    const warnings = [];
    const { contract, navigation, objects: objectRoot, npcs: npcRoot, dialogue, localization, mapRoom, foregrounds } = bundle;
    const grids = { ...(bundle.grids ?? {}) };
    errors.push(...validateDialogueGraph(libraryDialogueGraph).map((error) => `library dialogue: ${error}`));

    if (contract?.schemaVersion !== CONTENT_SCHEMA_VERSION) errors.push(`content contract schemaVersion must be ${CONTENT_SCHEMA_VERSION}`);
    errors.push(...validateMapRoomSchema(mapRoom));
    if (errors.length === 0) grids.map = buildMapGrid(mapRoom);
    for (const [gridId, transform] of Object.entries(contract?.world?.gridTransforms ?? {})) {
        if (!grids[gridId] || !Array.isArray(transform.swapExitIds) || transform.swapExitIds.length !== 2) continue;
        const [left, right] = transform.swapExitIds;
        grids[gridId] = grids[gridId].map((row) => row.map((cell) => cell === left ? right : cell === right ? left : cell));
        for (const fill of transform.fills ?? []) {
            const { x, y, width, height } = fill.rectangle;
            for (let row = y; row < y + height; row += 1) {
                for (let column = x; column < x + width; column += 1) grids[gridId][row][column] = fill.value;
            }
        }
    }

    const locales = contract?.locales ?? [];
    const roomIds = contract?.world?.rooms ?? [];
    const rooms = new Set(roomIds);
    const objects = objectRoot?.objects ?? {};
    const npcs = npcRoot?.npcs ?? {};
    const actions = new Set(contract?.runtimeActionIds ?? []);
    const exitHotspots = [];

    if (!rooms.size) errors.push('content contract defines no rooms');
    if (rooms.size !== roomIds.length) errors.push('content contract contains duplicate room IDs');
    if (rooms.has('debugRoom') || navigation?.debugRoom) errors.push('Debug Room is intentionally excluded from shipped content');
    if (!sameMembers(rooms, Object.keys(navigation ?? {}))) errors.push('navigation room IDs must exactly match the canonical world room IDs');
    if (navigation?.marketStreet && Object.keys(navigation.marketStreet.exits ?? {}).length !== contract.world.marketStreetExitCount) {
        errors.push(`Market Street must have exactly ${contract.world.marketStreetExitCount} exits`);
    }

    for (const roomId of rooms) {
        const room = navigation?.[roomId];
        if (!room) continue;
        for (const key of contentSchemas.navigationRoom.required) {
            if (!(key in room)) errors.push(`navigation.${roomId}.${key} is required`);
        }
        localeMapErrors(room, locales, `navigation.${roomId}`, errors);
        for (const locale of locales) {
            if (typeof room[locale] !== 'string' || room[locale].trim() === '') errors.push(`navigation.${roomId}.${locale} must be a non-empty accessible label`);
        }
        const gridIds = contract.world.gridVariants?.[roomId] ?? [roomId];
        if (!gridIds.some((gridId) => Array.isArray(grids[gridId]))) errors.push(`room '${roomId}' has no grid`);
        for (const [exitId, exit] of Object.entries(room.exits ?? {})) {
            if (!/^e[1-9]$/.test(exitId)) errors.push(`${roomId}.${exitId} is not a stable exit ID`);
            if (!rooms.has(exit.connectsTo)) errors.push(`${roomId}.${exitId} targets missing room '${exit.connectsTo}'`);
            for (const positionName of ['startPosition', 'finalPosition']) {
                const position = exit[positionName];
                if (!Number.isInteger(position?.x) || !Number.isInteger(position?.y)
                    || position.x < 0 || position.x >= contract.grid.width || position.y < 0 || position.y >= contract.grid.height) {
                    errors.push(`${roomId}.${exitId}.${positionName} must be in bounds`);
                }
                const destinationGridIds = contract.world.gridVariants?.[exit.connectsTo] ?? [exit.connectsTo];
                if (position && !nearestNavigableCell(destinationGridIds, grids, position)) {
                    errors.push(`${roomId}.${exitId}.${positionName} has no navigable landing within the player-footprint allowance`);
                }
            }
            const exitPresent = gridIds.some((gridId) => grids[gridId]?.some((row) => row.includes(exitId)));
            if (!exitPresent) errors.push(`${roomId}.${exitId} has no hotspot in its room grid or declared grid variants`);
            const hotspot = exitHotspot(roomId, exitId, gridIds, grids, navigation?.[exit.connectsTo]);
            if (hotspot) {
                exitHotspots.push(hotspot);
                if (hotspot.width < contract.hotspots.minimumWidthCells || hotspot.height < contract.hotspots.minimumHeightCells) {
                    warnings.push(`${hotspot.id} is smaller than the ${contract.hotspots.minimumWidthCells} x ${contract.hotspots.minimumHeightCells} target policy`);
                }
            }
        }
    }

    for (const [gridId, grid] of Object.entries(grids)) {
        if (!Array.isArray(grid) || grid.length !== contract.grid.height
            || grid.some((row) => !Array.isArray(row) || row.length !== contract.grid.width)) {
            errors.push(`grid '${gridId}' must be ${contract.grid.width} x ${contract.grid.height}`);
            continue;
        }
        for (let y = 0; y < grid.length; y += 1) {
            for (let x = 0; x < grid[y].length; x += 1) {
                const cell = grid[y][x];
                if (!contentSchemas.grid.cellPattern.test(cell)) errors.push(`grid '${gridId}' has invalid code '${cell}' at ${x},${y}`);
                if (/^e[1-9]$/.test(cell) && navigation[gridId] && !navigation[gridId].exits[cell]) {
                    errors.push(`grid '${gridId}' references undeclared exit '${cell}' at ${x},${y}`);
                }
            }
        }
    }

    const declaredGridIds = new Set([
        ...rooms,
        ...Object.values(contract.world.gridVariants ?? {}).flat(),
    ]);
    for (const [gridId, grid] of Object.entries(foregrounds ?? {})) {
        if (!declaredGridIds.has(gridId)) errors.push(`foreground grid '${gridId}' is not attached to a canonical room or variant`);
        if (!Array.isArray(grid) || grid.length !== contract.grid.height
            || grid.some((row) => !Array.isArray(row) || row.length !== contract.grid.width)) {
            errors.push(`foreground grid '${gridId}' must be ${contract.grid.width} x ${contract.grid.height}`);
            continue;
        }
        for (let y = 0; y < grid.length; y += 1) {
            for (let x = 0; x < grid[y].length; x += 1) {
                if (!/^(?:-|f[1-9])$/.test(grid[y][x])) {
                    errors.push(`foreground grid '${gridId}' has invalid code '${grid[y][x]}' at ${x},${y}`);
                }
            }
        }
    }

    const canonicalConnections = new Map();
    for (const connection of contract.world.connections ?? []) {
        const key = `${connection.from}.${connection.exit}`;
        if (canonicalConnections.has(key)) errors.push(`duplicate canonical connection '${key}'`);
        canonicalConnections.set(key, connection);
        const forward = navigation?.[connection.from]?.exits?.[connection.exit];
        const reverse = navigation?.[connection.to]?.exits?.[connection.returnExit];
        if (forward?.connectsTo !== connection.to) errors.push(`${key} does not target '${connection.to}'`);
        if (reverse?.connectsTo !== connection.from) errors.push(`${connection.to}.${connection.returnExit} is not reciprocal to '${key}'`);
        if (connection.gateFact && !(contract.puzzle?.mandatoryFacts ?? []).includes(connection.gateFact)) {
            errors.push(`${key} uses undeclared gate fact '${connection.gateFact}'`);
        }
        if (connection.gateFact && forward?.status !== 'locked') errors.push(`${key} must begin locked for gate '${connection.gateFact}'`);
        if (!connection.gateFact && forward?.status !== 'open') errors.push(`${key} must begin open`);
        if (reverse?.status !== 'open') errors.push(`${connection.to}.${connection.returnExit} must provide an open return path`);
    }
    for (const [roomId, room] of Object.entries(navigation ?? {})) {
        for (const [exitId, exit] of Object.entries(room.exits ?? {})) {
            const represented = [...canonicalConnections.values()].some((connection) =>
                (connection.from === roomId && connection.exit === exitId)
                || (connection.to === roomId && connection.returnExit === exitId));
            const declaredOneWay = (contract.world.oneWayExits ?? []).some((item) => item.roomId === roomId && item.exitId === exitId);
            if (!represented && !declaredOneWay) errors.push(`${roomId}.${exitId} is absent from canonical connections and one-way exceptions`);
            if (!rooms.has(exit.connectsTo)) errors.push(`${roomId}.${exitId} has an invalid destination`);
        }
    }

    const ids = new Set();
    const rectangles = [];
    for (const [kind, entities] of [['object', objects], ['npc', npcs]]) {
        for (const [id, entity] of Object.entries(entities)) {
            if (ids.has(id)) errors.push(`duplicate entity ID '${id}'`);
            ids.add(id);
            for (const key of contentSchemas.entity.required) {
                if (!(key in entity)) errors.push(`${id}.${key} is required`);
            }
            localeMapErrors(entity.name, locales, `${id}.name`, errors);
            for (const locale of locales) {
                if (typeof entity.name?.[locale] !== 'string' || entity.name[locale].trim() === '') errors.push(`${id}.name.${locale} must be a non-empty accessible label`);
            }
            const roomId = kind === 'object' ? entity.objectPlacementLocation : entity.npcPlacementLocation;
            if (roomId && !rooms.has(roomId)) errors.push(`${id} belongs to missing room '${roomId}'`);
            if (kind === 'object') validateEntityReferences(id, entity, objects, npcs, rooms, actions, errors);
            else validateNpcReferences(id, entity, objects, npcs, rooms, errors);
            if (roomId) {
                if (!Number.isInteger(entity.gridPosition?.x) || !Number.isInteger(entity.gridPosition?.y)
                    || !Number.isFinite(entity.dimensions?.originalWidth) || entity.dimensions.originalWidth <= 0
                    || !Number.isFinite(entity.dimensions?.originalHeight) || entity.dimensions.originalHeight <= 0) {
                    errors.push(`${id} must have integer grid coordinates and positive original dimensions`);
                    continue;
                }
                const rectangle = rectangleForEntity(id, entity, kind);
                rectangles.push(rectangle);
                if (rectangle.x < 0 || rectangle.y < 0 || rectangle.x + rectangle.width > contract.grid.width
                    || rectangle.y + rectangle.height > contract.grid.height) errors.push(`${id} hotspot is out of bounds`);
                if (rectangle.width < contract.hotspots.minimumWidthCells || rectangle.height < contract.hotspots.minimumHeightCells) {
                    warnings.push(`${id} is smaller than the ${contract.hotspots.minimumWidthCells} x ${contract.hotspots.minimumHeightCells} target policy`);
                }
                if (!Number.isInteger(rectangle.anchor.x) || !Number.isInteger(rectangle.anchor.y)
                    || rectangle.anchor.x < 0 || rectangle.anchor.x >= contract.grid.width
                    || rectangle.anchor.y < 0 || rectangle.anchor.y >= contract.grid.height) {
                    errors.push(`${id} interaction anchor must be an in-bounds grid cell`);
                }
                const activeSprite = entity.spriteUrl?.[entity.activeSpriteUrl];
                if (typeof activeSprite !== 'string' || !activeSprite.startsWith('./resources/')) {
                    errors.push(`${id} has no valid active sprite asset reference`);
                }
            }
        }
    }

    const allowedOverlaps = new Set((contract.hotspots.allowedOverlaps ?? []).map(([left, right]) => pairKey(left, right)));
    for (let leftIndex = 0; leftIndex < rectangles.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < rectangles.length; rightIndex += 1) {
            const left = rectangles[leftIndex];
            const right = rectangles[rightIndex];
            if (left.roomId === right.roomId && overlaps(left, right) && !allowedOverlaps.has(pairKey(left.id, right.id))) {
                errors.push(`undeclared hotspot overlap in '${left.roomId}': ${left.id} and ${right.id}`);
            }
        }
    }

    localeMapErrors(dialogue, locales, 'dialogue', errors);
    validateDialogueReferences(dialogue, objects, npcs, errors);
    validateDialogueReachability(dialogue, errors);
    if (!sameMembers(locales, Object.keys(localization ?? {}))) errors.push('localization root must exactly match contract locales');
    const referencePaths = new Set(leafPaths(localization?.[locales[0]] ?? {}));
    for (const locale of locales.slice(1)) {
        if (!sameMembers(referencePaths, leafPaths(localization?.[locale] ?? {}))) errors.push(`localization.${locale} does not match fallback locale '${locales[0]}'`);
    }

    validatePuzzle(contract, errors);
    return { valid: errors.length === 0, errors, warnings, grids, hotspots: [...rectangles, ...exitHotspots] };
}

export function assertValidContentBundle(bundle) {
    const result = validateContentBundle(bundle);
    if (!result.valid) throw new TypeError(`Content contract failed: ${result.errors.join('; ')}`);
    return result;
}

export function formatHotspotReport(result, contract) {
    const lines = [
        '# Hotspot authoring report',
        '',
        `Contract: \`${contract.contentVersion}\` (schema ${contract.schemaVersion})`,
        '',
        `Minimum target: ${contract.hotspots.minimumWidthCells} x ${contract.hotspots.minimumHeightCells} grid cells. Rectangle anchors are derived at bottom-centre; authored polygon exits come from room grids/templates.`,
        '',
        '| Room | ID | Shape | Bounds | Anchor | Accessible label (en) |',
        '| --- | --- | --- | --- | --- | --- |',
    ];
    for (const hotspot of [...result.hotspots].sort((left, right) => left.roomId.localeCompare(right.roomId) || left.id.localeCompare(right.id))) {
        lines.push(`| ${hotspot.roomId} | ${hotspot.id} | ${hotspot.shape} | ${hotspot.x},${hotspot.y} ${hotspot.width}x${hotspot.height} | ${hotspot.anchor.x},${hotspot.anchor.y} | ${hotspot.labels.en} |`);
    }
    lines.push('', '## Findings', '');
    if (result.warnings.length) result.warnings.forEach((warning) => lines.push(`- ${warning}`));
    else lines.push('- No target-size or legacy-grid warnings.');
    lines.push('', 'All undeclared overlaps and out-of-bounds hotspots are validation errors, not report-only warnings.', '');
    return lines.join('\n');
}
