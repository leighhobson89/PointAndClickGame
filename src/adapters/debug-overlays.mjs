// Additive debug overlays.
//
// These draw on top of a finished frame; they never clear it, so the game
// stays visible underneath. Every layer is opt-in so an overlay session stays
// readable instead of becoming a wall of colour.

export const OVERLAY_IDS = Object.freeze([
    'walkGrid',
    'costs',
    'blocked',
    'exits',
    'hotspots',
    'footprints',
    'anchors',
    'path',
    'playerCell',
    'overlaps',
    'unreachable',
]);

export function createOverlayOptions(overrides = {}) {
    return Object.fromEntries(OVERLAY_IDS.map((id) => [id, overrides[id] === true]));
}

const COLORS = Object.freeze({
    walkGrid: 'rgba(255,255,255,0.16)',
    blocked: 'rgba(220,40,40,0.30)',
    exits: 'rgba(255,214,0,0.45)',
    hotspots: 'rgba(0,190,255,0.30)',
    footprints: 'rgba(255,0,255,0.28)',
    anchors: 'rgba(0,255,140,0.95)',
    path: 'rgba(60,120,255,0.55)',
    playerCell: 'rgba(255,255,255,0.85)',
    overlaps: 'rgba(255,90,0,0.55)',
    unreachable: 'rgba(120,0,160,0.45)',
});

const isExitCell = (cell) => typeof cell === 'string' && /^e[1-9]$/.test(cell);
const isBlockedCell = (cell) => cell === 'n';
const isObjectCell = (cell) => typeof cell === 'string' && cell.startsWith('o');
const isNpcCell = (cell) => typeof cell === 'string' && cell.startsWith('c');

function fillCell(context, cellWidth, cellHeight, x, y, color) {
    context.fillStyle = color;
    context.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {Object} scene
 * @param {string[][]} scene.grid current room walk grid
 * @param {number} scene.cellWidth
 * @param {number} scene.cellHeight
 * @param {Object} scene.options overlay toggles from createOverlayOptions
 * @param {{x:number,y:number}[]} [scene.path] current player path in cells
 * @param {{x:number,y:number}} [scene.playerCell]
 * @param {Array} [scene.hotspots] semantic hotspots for the current room
 * @param {Array} [scene.anchors] interaction anchors {id,x,y}
 * @param {Array} [scene.overlaps] overlapping hotspot rectangles
 * @param {Array} [scene.unreachable] unreachable hotspot rectangles
 */
export function drawDebugOverlays(context, scene = {}) {
    const { grid, cellWidth, cellHeight, options = {} } = scene;
    if (!context || !Array.isArray(grid) || !cellWidth || !cellHeight) return 0;

    let drawnLayers = 0;
    context.save();

    if (options.walkGrid || options.costs || options.blocked || options.exits || options.footprints) {
        for (let y = 0; y < grid.length; y += 1) {
            for (let x = 0; x < grid[y].length; x += 1) {
                const cell = grid[y][x];
                if (options.blocked && isBlockedCell(cell)) fillCell(context, cellWidth, cellHeight, x, y, COLORS.blocked);
                if (options.exits && isExitCell(cell)) fillCell(context, cellWidth, cellHeight, x, y, COLORS.exits);
                if (options.footprints && (isObjectCell(cell) || isNpcCell(cell))) fillCell(context, cellWidth, cellHeight, x, y, COLORS.footprints);
                if (options.walkGrid) {
                    context.strokeStyle = COLORS.walkGrid;
                    context.lineWidth = 1;
                    context.strokeRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                }
                if (options.costs && typeof cell === 'string' && cell.startsWith('w')) {
                    const cost = Number.parseInt(cell.slice(1), 10);
                    context.fillStyle = `rgba(0,${Math.min(255, Math.max(0, cost))},0,0.35)`;
                    context.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
                }
            }
        }
        drawnLayers += 1;
    }

    if (options.hotspots) {
        context.lineWidth = 2;
        for (const hotspot of scene.hotspots ?? []) {
            context.fillStyle = COLORS.hotspots;
            context.fillRect(hotspot.x * cellWidth, hotspot.y * cellHeight, hotspot.width * cellWidth, hotspot.height * cellHeight);
            context.strokeStyle = COLORS.anchors;
            context.strokeRect(hotspot.x * cellWidth, hotspot.y * cellHeight, hotspot.width * cellWidth, hotspot.height * cellHeight);
        }
        drawnLayers += 1;
    }

    if (options.overlaps) {
        context.fillStyle = COLORS.overlaps;
        for (const rectangle of scene.overlaps ?? []) {
            context.fillRect(rectangle.x * cellWidth, rectangle.y * cellHeight, rectangle.width * cellWidth, rectangle.height * cellHeight);
        }
        drawnLayers += 1;
    }

    if (options.unreachable) {
        context.fillStyle = COLORS.unreachable;
        for (const rectangle of scene.unreachable ?? []) {
            context.fillRect(rectangle.x * cellWidth, rectangle.y * cellHeight, rectangle.width * cellWidth, rectangle.height * cellHeight);
        }
        drawnLayers += 1;
    }

    if (options.anchors) {
        for (const anchor of scene.anchors ?? []) {
            context.fillStyle = COLORS.anchors;
            context.beginPath();
            context.arc((anchor.x + 0.5) * cellWidth, (anchor.y + 0.5) * cellHeight, Math.max(3, cellWidth * 0.35), 0, Math.PI * 2);
            context.fill();
        }
        drawnLayers += 1;
    }

    if (options.path) {
        context.fillStyle = COLORS.path;
        for (const step of scene.path ?? []) fillCell(context, cellWidth, cellHeight, step.x, step.y, COLORS.path);
        drawnLayers += 1;
    }

    if (options.playerCell && scene.playerCell) {
        context.strokeStyle = COLORS.playerCell;
        context.lineWidth = 2;
        context.strokeRect(scene.playerCell.x * cellWidth, scene.playerCell.y * cellHeight, cellWidth, cellHeight);
        drawnLayers += 1;
    }

    context.restore();
    return drawnLayers;
}
