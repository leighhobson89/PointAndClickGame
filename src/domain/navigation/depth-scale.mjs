// Perspective scaling for the player and for world entities.
//
// Each walkable cell carries a depth byte, `w100` to `w255`, painted by hand
// over the room art. That byte says how far into the scene the cell is; it does
// not say how big anything should be. The size comes from the room's authored
// scale profile: how tall the player stands at the nearest walkable point of
// the room and at the furthest one, both in stage pixels.
//
// Two properties matter and neither was true of the ramp this replaces.
//
// First, the profile is anchored to the room's own painted depth range rather
// than to the full 100..255 byte range. A room whose floor is painted 168..247
// still uses its whole profile, so the authored heights mean what they say
// instead of meaning "some fraction of a global ramp".
//
// Second, the depth field is continuous. It is built once per room from the
// authored grid, its holes are filled from the nearest painted cell, and it is
// sampled bilinearly. Sampling the live grid cell under the player's feet was
// what made the size jump at cell boundaries and freeze wherever an object or
// an exit had overwritten the walk value.

export const DEPTH_BYTE_MIN = 100;
export const DEPTH_BYTE_MAX = 255;

// A room with an almost flat floor still needs a usable profile. Below this
// spread the depth byte is treated as carrying no usable gradient and the
// player holds the near height, rather than amplifying paint noise into
// visible size flicker.
const MIN_USEFUL_BYTE_SPREAD = 4;

const clamp = (value, low, high) => Math.min(Math.max(value, low), high);

/**
 * Reads the depth byte out of a grid cell. Returns null for anything that is
 * not a walkable depth cell: `n` walls, `e#` exits, and the `o…`/`c…` values
 * that object and NPC placement writes over the walk grid at runtime.
 */
export function parseDepthByte(cell) {
    if (typeof cell !== 'string' || cell.charCodeAt(0) !== 119 /* w */) return null;
    const value = Number.parseInt(cell.slice(1), 10);
    if (!Number.isFinite(value)) return null;
    return clamp(value, DEPTH_BYTE_MIN, DEPTH_BYTE_MAX);
}

/**
 * Builds the continuous depth field for one room.
 *
 * Cells with no painted depth are filled from the nearest painted cell by a
 * breadth-first sweep, so a player standing on an exit, on a placed object, or
 * one cell off the painted floor still resolves to the depth of the floor
 * beside them. The fill is over grid distance and is fully determined by the
 * input, so the same grid always produces the same field.
 */
export function buildDepthField(grid) {
    if (!Array.isArray(grid) || grid.length === 0) return null;
    const height = grid.length;
    const width = grid[0]?.length ?? 0;
    if (width === 0) return null;

    const bytes = new Int16Array(width * height).fill(-1);
    const queue = [];
    let minByte = DEPTH_BYTE_MAX;
    let maxByte = DEPTH_BYTE_MIN;
    let painted = 0;

    for (let y = 0; y < height; y += 1) {
        const row = grid[y];
        for (let x = 0; x < width; x += 1) {
            const depth = parseDepthByte(row?.[x]);
            if (depth === null) continue;
            const index = y * width + x;
            bytes[index] = depth;
            queue.push(index);
            if (depth < minByte) minByte = depth;
            if (depth > maxByte) maxByte = depth;
            painted += 1;
        }
    }

    if (painted === 0) return null;

    // Fill along each row first. A depth gradient is painted as bands that run
    // across the floor, so the cell beside a gap is a far better estimate of its
    // depth than the cell above it. A placement stamp punched into a floor row
    // is exactly this case, and a plain breadth-first fill would resolve the tie
    // towards whichever neighbour happened to be visited first — in practice the
    // row above, one depth band away.
    for (let y = 0; y < height; y += 1) {
        const rowStart = y * width;
        let lastPainted = -1;
        for (let x = 0; x < width; x += 1) {
            if (bytes[rowStart + x] !== -1) { lastPainted = x; continue; }
            let next = -1;
            for (let scan = x + 1; scan < width; scan += 1) {
                if (bytes[rowStart + scan] !== -1) { next = scan; break; }
            }
            if (lastPainted === -1 && next === -1) break; // the row has no paint at all
            const useLeft = next === -1 || (lastPainted !== -1 && (x - lastPainted) <= (next - x));
            bytes[rowStart + x] = bytes[rowStart + (useLeft ? lastPainted : next)];
            queue.push(rowStart + x);
        }
    }

    // Then a multi-source breadth-first fill for whatever is left, which is the
    // rows that carry no depth at all. Every cell ends up defined, so a sample
    // can never fall off the field.
    for (let head = 0; head < queue.length; head += 1) {
        const index = queue[head];
        const x = index % width;
        const y = (index - x) / width;
        const depth = bytes[index];

        if (x > 0 && bytes[index - 1] === -1) { bytes[index - 1] = depth; queue.push(index - 1); }
        if (x < width - 1 && bytes[index + 1] === -1) { bytes[index + 1] = depth; queue.push(index + 1); }
        if (y > 0 && bytes[index - width] === -1) { bytes[index - width] = depth; queue.push(index - width); }
        if (y < height - 1 && bytes[index + width] === -1) { bytes[index + width] = depth; queue.push(index + width); }
    }

    return { width, height, bytes, minByte, maxByte, paintedCells: painted };
}

/**
 * Samples the depth field at a continuous grid position, bilinearly over the
 * lattice of cell centres. `gridX`/`gridY` are in cells and may be fractional;
 * the caller converts from stage pixels so this stays independent of the
 * canvas size.
 */
export function sampleDepthByte(field, gridX, gridY) {
    if (!field) return null;
    const { width, height, bytes } = field;

    // Cell centres sit at +0.5, so shift onto the lattice before interpolating.
    const sampleX = clamp(gridX - 0.5, 0, width - 1);
    const sampleY = clamp(gridY - 0.5, 0, height - 1);

    const x0 = Math.floor(sampleX);
    const y0 = Math.floor(sampleY);
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, height - 1);
    const fx = sampleX - x0;
    const fy = sampleY - y0;

    const topLeft = bytes[y0 * width + x0];
    const topRight = bytes[y0 * width + x1];
    const bottomLeft = bytes[y1 * width + x0];
    const bottomRight = bytes[y1 * width + x1];

    const top = topLeft + (topRight - topLeft) * fx;
    const bottom = bottomLeft + (bottomRight - bottomLeft) * fx;
    return top + (bottom - top) * fy;
}

/**
 * Builds a room's scale profile from its two authored player heights and the
 * depth range the room actually paints.
 *
 * `scaleAt` is normalised to 1 at the near plane, so one curve drives both the
 * player and the world entities: the player multiplies its near height by it,
 * and an entity multiplies its authored near-plane size by it.
 */
export function createRoomScaleProfile({
    playerHeightNear,
    playerHeightFar,
    minByte = DEPTH_BYTE_MIN,
    maxByte = DEPTH_BYTE_MAX,
    entityScaleAtNear = 1,
} = {}) {
    const near = Number.isFinite(playerHeightNear) && playerHeightNear > 0 ? playerHeightNear : null;
    const far = Number.isFinite(playerHeightFar) && playerHeightFar > 0 ? playerHeightFar : near;
    if (near === null) return null;

    const spread = maxByte - minByte;
    const flat = spread < MIN_USEFUL_BYTE_SPREAD;
    const farRatio = flat ? 1 : clamp(far / near, 0.05, 1);

    const scaleAt = (depthByte) => {
        if (!Number.isFinite(depthByte)) return 1;
        if (flat) return 1;
        const t = clamp((depthByte - minByte) / spread, 0, 1);
        return farRatio + (1 - farRatio) * t;
    };

    return {
        minByte,
        maxByte,
        playerHeightNear: near,
        playerHeightFar: flat ? near : far,
        entityScaleAtNear: Number.isFinite(entityScaleAtNear) && entityScaleAtNear > 0 ? entityScaleAtNear : 1,
        depthRatio: flat ? 1 : near / far,
        scaleAt,
        playerHeightAt: (depthByte) => near * scaleAt(depthByte),
    };
}

/**
 * Resolves the size an entity should be drawn at, given its authored size at
 * the room's near plane. Returned in the same units the authored size was
 * given in, so the caller keeps its own pixel/cell convention.
 */
export function scaledEntitySize(profile, depthByte, { width, height }) {
    const scale = profile ? profile.scaleAt(depthByte) * profile.entityScaleAtNear : 1;
    return { width: width * scale, height: height * scale };
}

/**
 * Maps a grid ID onto the navigation room that owns it.
 *
 * A room can swap between several grids as the world changes — the river
 * crossing has one grid per bridge state — and those variants are named after
 * the room they belong to. The longest matching room ID wins so a room whose
 * ID is a prefix of another cannot capture it.
 */
export function roomIdForGrid(gridId, roomIds) {
    if (roomIds.includes(gridId)) return gridId;
    let best = null;
    for (const roomId of roomIds) {
        if (!gridId.startsWith(roomId)) continue;
        if (best === null || roomId.length > best.length) best = roomId;
    }
    return best;
}

/**
 * Builds every room's depth field and scale profile from the loaded grids and
 * navigation data, once.
 *
 * A room's byte range is the union over all of its grid variants. Without that
 * union the player would change size the moment the bridge was completed,
 * because the completed grid paints a wider depth range than the broken one
 * and the profile would stretch across it.
 */
export function buildRoomScaleProfiles(grids, navigation) {
    const roomIds = Object.keys(navigation ?? {});
    const fields = new Map();
    const ranges = new Map();

    for (const [gridId, grid] of Object.entries(grids ?? {})) {
        const rows = Array.isArray(grid)
            ? grid
            : Object.keys(grid).map(Number).sort((a, b) => a - b).map((key) => grid[key]);
        const field = buildDepthField(rows);
        if (!field) continue;
        fields.set(gridId, field);

        const roomId = roomIdForGrid(gridId, roomIds);
        if (!roomId) continue;
        const range = ranges.get(roomId);
        ranges.set(roomId, range
            ? { minByte: Math.min(range.minByte, field.minByte), maxByte: Math.max(range.maxByte, field.maxByte) }
            : { minByte: field.minByte, maxByte: field.maxByte });
    }

    const profiles = new Map();
    for (const roomId of roomIds) {
        const room = navigation[roomId];
        const range = ranges.get(roomId) ?? { minByte: DEPTH_BYTE_MIN, maxByte: DEPTH_BYTE_MAX };
        const profile = createRoomScaleProfile({
            playerHeightNear: room?.playerHeightNear,
            playerHeightFar: room?.playerHeightFar,
            entityScaleAtNear: room?.entityScaleAtNear,
            minByte: range.minByte,
            maxByte: range.maxByte,
        });
        if (profile) profiles.set(roomId, profile);
    }

    return { fields, profiles, roomIds };
}
