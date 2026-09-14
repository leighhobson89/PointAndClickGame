#!/usr/bin/env node

// Builds the canonical asset manifest for the art bible.
//
// Every image under `resources/` is given a semantic ID, a role, its measured
// dimensions and byte weight, a content hash, and — where the content data
// references it — the room and world scale it is authored for. The manifest is
// the single place that answers "what art does this game actually ship, how big
// is it, and who points at it".
//
//   node scripts/asset-manifest.mjs           write the manifest and the report
//   node scripts/asset-manifest.mjs --check   exit non-zero on budget breaches
//
// The budgets live in `docs/art-bible.md`. They are duplicated here as data
// rather than prose so a breach fails a command instead of a code review.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    buildDepthField, buildRoomScaleProfiles, roomIdForGrid, sampleDepthByte,
} from '../src/domain/navigation/depth-scale.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESOURCES = path.join(ROOT, 'resources');

export const STAGE_WIDTH = 832;
export const STAGE_HEIGHT = 448;
export const STAGE_ASPECT = STAGE_WIDTH / STAGE_HEIGHT;

// Roles that are delivered to the player. Anything outside this set is working
// material and must never count against a delivery budget, but it is still
// listed so the repository weight has one honest total.
export const SHIPPED_ROLES = Object.freeze([
    'background', 'foreground', 'player', 'npc', 'objectWorld', 'objectInventory', 'cursor', 'layout',
]);

// maxBytes is the compressed on-disk budget for one file of that role.
// maxWidth/maxHeight are source-dimension ceilings. `exactStage` means the
// image is composited over the whole stage and must match it pixel for pixel.
export const ROLE_BUDGETS = Object.freeze({
    background: { maxBytes: 400 * 1024, exactStage: true },
    foreground: { maxBytes: 250 * 1024, exactStage: true },
    player: { maxBytes: 60 * 1024, maxWidth: 220, maxHeight: 420 },
    npc: { maxBytes: 120 * 1024, maxWidth: 400, maxHeight: 700 },
    objectWorld: { maxBytes: 80 * 1024, maxWidth: 512, maxHeight: 512 },
    objectInventory: { maxBytes: 24 * 1024, maxWidth: 128, maxHeight: 128 },
    cursor: { maxBytes: 8 * 1024, maxWidth: 64, maxHeight: 64 },
    layout: { maxBytes: 64 * 1024 },
    gridOverlay: null,
    reference: null,
    sourceArt: null,
});

const ROLE_LABELS = Object.freeze({
    background: 'Room background',
    foreground: 'Room foreground / occluder',
    player: 'Player animation frame',
    npc: 'NPC sprite',
    objectWorld: 'Object, world sprite',
    objectInventory: 'Object, inventory icon',
    cursor: 'Mouse cursor',
    layout: 'UI layout frame',
    gridOverlay: 'Authoring walk-grid overlay',
    reference: 'Reference / working image (not shipped)',
    sourceArt: 'Layered source art (not shipped)',
});

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.psd']);

/* ------------------------------------------------------------------ *
 * Image headers
 * ------------------------------------------------------------------ */

function readPngSize(buffer) {
    if (buffer.length < 24 || buffer.toString('ascii', 12, 16) !== 'IHDR') return null;
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readGifSize(buffer) {
    if (buffer.length < 10 || buffer.toString('ascii', 0, 3) !== 'GIF') return null;
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
}

function readPsdSize(buffer) {
    if (buffer.length < 22 || buffer.toString('ascii', 0, 4) !== '8BPS') return null;
    return { width: buffer.readUInt32BE(18), height: buffer.readUInt32BE(14) };
}

function readJpegSize(buffer) {
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
    // Start-of-frame markers carry the dimensions. Everything else is skipped by
    // its declared segment length, which is why this does not need a decoder.
    let offset = 2;
    while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) { offset += 1; continue; }
        const marker = buffer[offset + 1];
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
        const length = buffer.readUInt16BE(offset + 2);
        const isFrame = (marker >= 0xc0 && marker <= 0xc3)
            || (marker >= 0xc5 && marker <= 0xc7)
            || (marker >= 0xc9 && marker <= 0xcb)
            || (marker >= 0xcd && marker <= 0xcf);
        if (isFrame) return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
        if (length < 2) return null;
        offset += 2 + length;
    }
    return null;
}

// A RIFF/WEBP container holds one of three chunk layouts. `VP8 ` is lossy,
// `VP8L` lossless, and `VP8X` an extended header that states the canvas size
// directly. Each stores its dimensions in a different place and width-first.
function readWebpSize(buffer) {
    if (buffer.length < 30) return null;
    if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
    const chunk = buffer.toString('ascii', 12, 16);

    if (chunk === 'VP8X') {
        // Three-byte little-endian values holding size minus one.
        return {
            width: buffer.readUIntLE(24, 3) + 1,
            height: buffer.readUIntLE(27, 3) + 1,
        };
    }
    if (chunk === 'VP8 ') {
        // The 14-bit dimensions follow the three-byte start code 0x9d 0x01 0x2a.
        if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return null;
        return {
            width: buffer.readUInt16LE(26) & 0x3fff,
            height: buffer.readUInt16LE(28) & 0x3fff,
        };
    }
    if (chunk === 'VP8L') {
        if (buffer[20] !== 0x2f) return null;
        // 14 bits of width then 14 bits of height, packed little-endian, each
        // stored as size minus one.
        const bits = buffer.readUInt32LE(21);
        return {
            width: (bits & 0x3fff) + 1,
            height: ((bits >> 14) & 0x3fff) + 1,
        };
    }
    return null;
}

function readImageSize(buffer, extension) {
    switch (extension) {
        case '.png': return readPngSize(buffer);
        case '.gif': return readGifSize(buffer);
        case '.psd': return readPsdSize(buffer);
        case '.webp': return readWebpSize(buffer);
        case '.jpg':
        case '.jpeg': return readJpegSize(buffer);
        default: return null;
    }
}

/* ------------------------------------------------------------------ *
 * Role and identity
 * ------------------------------------------------------------------ */

function classify(relativePath) {
    const parts = relativePath.split('/');
    const folder = parts[1];
    const name = parts[parts.length - 1];

    // The pre-export originals are kept so a restyle starts from the full
    // painting, but they are not delivered and must not be budgeted.
    if (folder === 'source-art') return 'sourceArt';

    // The debug room is deliberately excluded from shipped content by the
    // content validator, so it must not be counted against a delivery budget.
    if (folder === 'backgrounds') return /^debugRoom\./.test(name) ? 'reference' : 'background';
    if (folder === 'foregrounds') return parts[2] === 'grids' ? 'gridOverlay' : 'foreground';
    if (folder === 'grids') return 'gridOverlay';
    if (folder === 'player') return 'player';
    if (folder === 'npcs') return 'npc';
    if (folder === 'mouse') return path.extname(name) === '.psd' ? 'sourceArt' : 'cursor';
    if (folder === 'layoutImages') return 'layout';
    if (folder === 'imageDump' || folder === 'briefs') return 'reference';
    // Keyed on the `Inv` suffix rather than on the extension, so an icon stays
    // an icon once it is re-exported from PNG to WebP.
    if (folder === 'objects') return /inv\.[^.]+$/i.test(name) ? 'objectInventory' : 'objectWorld';
    return 'reference';
}

// The semantic ID is the stable contract; the file path is an implementation
// detail that an export pipeline is allowed to change.
function semanticId(role, relativePath) {
    const base = path.basename(relativePath, path.extname(relativePath));
    const prefix = {
        background: 'bg', foreground: 'fg', player: 'player', npc: 'npc',
        objectWorld: 'obj', objectInventory: 'icon', cursor: 'cursor',
        layout: 'ui', gridOverlay: 'grid', reference: 'ref', sourceArt: 'src',
    }[role] ?? 'asset';
    return `${prefix}.${base}`;
}

function toWebPath(relativePath) {
    return `./${relativePath}`;
}

/* ------------------------------------------------------------------ *
 * Content bindings
 * ------------------------------------------------------------------ */

function readJson(relative) {
    const file = path.join(ROOT, relative);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Normalises the several URL spellings the content data uses (`./resources/x`,
// `.\resources\x`, `resources/x`) onto one comparable key.
function normaliseUrl(url) {
    if (typeof url !== 'string' || url === '') return null;
    return url.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '').toLowerCase();
}

// Every hand-authored source file that can name an image, excluding the
// generated manifest itself and the desktop/build mirrors, which are copies.
function sourceFilesNamingAssets() {
    const files = [];
    for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        if (/\.(js|mjs|cjs|css|html)$/.test(entry.name)) files.push(path.join(ROOT, entry.name));
    }
    const srcRoot = path.join(ROOT, 'src');
    if (fs.existsSync(srcRoot)) {
        files.push(...walk(srcRoot).filter((file) => /\.(mjs|js|cjs)$/.test(file)));
    }
    return files;
}

function collectBindings() {
    const bindings = new Map();
    const add = (url, binding) => {
        const key = normaliseUrl(url);
        if (!key) return;
        if (!bindings.has(key)) bindings.set(key, []);
        bindings.get(key).push(binding);
    };

    const navigation = readJson('resources/screenNavigation.json') ?? {};
    for (const [roomId, room] of Object.entries(navigation)) {
        add(room?.bgUrl, { referencedBy: roomId, kind: 'roomBackground', room: roomId });
    }

    const objects = readJson('resources/objectsGame.json')?.objects ?? {};
    for (const [objectId, object] of Object.entries(objects)) {
        const room = object?.objectPlacementLocation || null;
        const cells = object?.dimensions
            ? { widthCells: object.dimensions.originalWidth, heightCells: object.dimensions.originalHeight }
            : null;
        for (const url of Object.values(object?.spriteUrl ?? {})) {
            add(url, { referencedBy: objectId, kind: 'objectSprite', room, ...cells });
        }
        for (const url of Object.values(object?.inventoryUrl ?? {})) {
            add(url, { referencedBy: objectId, kind: 'inventoryIcon', room: null });
        }
        if (typeof object?.inventoryUrl === 'string') {
            add(object.inventoryUrl, { referencedBy: objectId, kind: 'inventoryIcon', room: null });
        }
    }

    const npcs = readJson('resources/npcGame.json')?.npcs ?? {};
    for (const [npcId, npc] of Object.entries(npcs)) {
        const room = npc?.npcPlacementLocation || null;
        const cells = npc?.dimensions
            ? { widthCells: npc.dimensions.originalWidth, heightCells: npc.dimensions.originalHeight }
            : null;
        for (const url of Object.values(npc?.spriteUrl ?? {})) {
            add(url, { referencedBy: npcId, kind: 'npcSprite', room, ...cells });
        }
    }

    const foregrounds = readJson('resources/screenWalkableJSONS/masterForegroundData.json') ?? {};
    for (const roomId of Object.keys(foregrounds)) {
        add(`./resources/foregrounds/${roomId}.png`, { referencedBy: roomId, kind: 'roomForeground', room: roomId });
    }

    // The player sprite table lives in source, not in content data, so it is
    // read from there rather than re-listed here. A frame that the table stops
    // naming should show up as an orphan.
    const playerSource = fs.readFileSync(path.join(ROOT, 'constantsAndGlobalVars.js'), 'utf8');
    for (const match of playerSource.matchAll(/"([a-z0-9_]+)":\s*"(\.\/resources\/player\/[^"]+)"/gi)) {
        add(match[2], { referencedBy: 'player', kind: 'playerFrame', spriteKey: match[1], room: null });
    }

    // Cursors, event-swapped room variants, and UI frames are named in code and
    // stylesheets rather than in content data. Without this sweep they would be
    // reported as orphans, which would make the orphan list untrustworthy and
    // therefore ignored.
    for (const file of sourceFilesNamingAssets()) {
        const text = fs.readFileSync(file, 'utf8');
        const referencedBy = path.relative(ROOT, file).replace(/\\/g, '/');
        for (const match of text.matchAll(/(?:\.[\\/])?resources[\\/][\w./\\-]+\.(?:png|jpe?g|gif|webp)/gi)) {
            add(match[0], { referencedBy, kind: 'sourceReference', room: null });
        }
    }

    return bindings;
}

/* ------------------------------------------------------------------ *
 * Walk
 * ------------------------------------------------------------------ */

function walk(directory, accumulator = []) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(full, accumulator);
        else accumulator.push(full);
    }
    return accumulator;
}

function checkBudget(role, bytes, size) {
    const budget = ROLE_BUDGETS[role];
    const breaches = [];
    if (!budget) return breaches;

    if (budget.maxBytes && bytes > budget.maxBytes) {
        breaches.push(`${(bytes / 1024).toFixed(0)} KB exceeds the ${(budget.maxBytes / 1024).toFixed(0)} KB ${role} budget`);
    }
    if (!size) return breaches;

    if (budget.exactStage && (size.width !== STAGE_WIDTH || size.height !== STAGE_HEIGHT)) {
        const aspect = size.width / size.height;
        const stretch = Math.abs(aspect - STAGE_ASPECT) / STAGE_ASPECT;
        breaches.push(stretch > 0.01
            ? `${size.width}x${size.height} is aspect ${aspect.toFixed(3)} against the stage's ${STAGE_ASPECT.toFixed(3)}, so it is stretched by ${(stretch * 100).toFixed(1)}%`
            : `${size.width}x${size.height} is not the ${STAGE_WIDTH}x${STAGE_HEIGHT} stage size and is rescaled at runtime`);
    }
    if (budget.maxWidth && size.width > budget.maxWidth) {
        breaches.push(`width ${size.width} exceeds the ${budget.maxWidth} px ${role} ceiling`);
    }
    if (budget.maxHeight && size.height > budget.maxHeight) {
        breaches.push(`height ${size.height} exceeds the ${budget.maxHeight} px ${role} ceiling`);
    }
    return breaches;
}

export function buildManifest() {
    const bindings = collectBindings();
    const files = walk(RESOURCES)
        .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
        .sort();

    const assets = files.map((file) => {
        const relativePath = path.relative(ROOT, file).replace(/\\/g, '/');
        const extension = path.extname(file).toLowerCase();
        const buffer = fs.readFileSync(file);
        const size = readImageSize(buffer, extension);
        const role = classify(relativePath);
        const bound = bindings.get(normaliseUrl(relativePath)) ?? [];

        return {
            id: semanticId(role, relativePath),
            role,
            roleLabel: ROLE_LABELS[role],
            source: toWebPath(relativePath),
            shipped: SHIPPED_ROLES.includes(role),
            width: size?.width ?? null,
            height: size?.height ?? null,
            aspect: size ? Number((size.width / size.height).toFixed(4)) : null,
            bytes: buffer.length,
            sha256: createHash('sha256').update(buffer).digest('hex'),
            // Authored world size in grid cells, where the content data declares
            // one. This is what makes a character's scale comparable with the
            // player's across rooms.
            widthCells: bound.find((b) => b.widthCells != null)?.widthCells ?? null,
            heightCells: bound.find((b) => b.heightCells != null)?.heightCells ?? null,
            rooms: [...new Set(bound.map((b) => b.room).filter(Boolean))].sort(),
            referencedBy: [...new Set(bound.map((b) => b.referencedBy))].sort(),
            orphan: bound.length === 0 && SHIPPED_ROLES.includes(role),
            budgetBreaches: checkBudget(role, buffer.length, size),
            // Provenance and licence are authored, not derived. They stay null
            // until a human records them, so an unrecorded asset is visible
            // rather than silently assumed to be clear.
            provenance: null,
            licence: null,
        };
    });

    // Frames for one direction must share a canvas. A frame authored at a
    // different size is drawn into the same box as its neighbours, so it is
    // resampled by a different factor and reads as a different character.
    const framesByDirection = new Map();
    for (const asset of assets) {
        if (asset.role !== 'player' || !asset.width) continue;
        const direction = asset.id.split('_').pop();
        if (!framesByDirection.has(direction)) framesByDirection.set(direction, []);
        framesByDirection.get(direction).push(asset);
    }
    for (const [direction, frames] of framesByDirection) {
        const sizes = new Map();
        for (const frame of frames) {
            const key = `${frame.width}x${frame.height}`;
            sizes.set(key, (sizes.get(key) ?? 0) + 1);
        }
        if (sizes.size <= 1) continue;
        // The size most frames agree on is the direction's canvas; the rest are
        // the odd ones out and are the ones that carry the breach.
        const [expected] = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0];
        for (const frame of frames) {
            if (`${frame.width}x${frame.height}` === expected) continue;
            frame.budgetBreaches.push(`${frame.width}x${frame.height} does not match the ${expected} canvas the other ${direction} frames share`);
        }
    }

    const byHash = new Map();
    for (const asset of assets) {
        if (!byHash.has(asset.sha256)) byHash.set(asset.sha256, []);
        byHash.get(asset.sha256).push(asset.id);
    }
    const exactDuplicates = [...byHash.entries()]
        .filter(([, ids]) => ids.length > 1)
        .map(([sha256, ids]) => ({ sha256, ids: ids.sort() }))
        .sort((a, b) => b.ids.length - a.ids.length);

    return {
        generatedAt: new Date().toISOString().slice(0, 10),
        stage: { width: STAGE_WIDTH, height: STAGE_HEIGHT, aspect: Number(STAGE_ASPECT.toFixed(4)) },
        budgets: ROLE_BUDGETS,
        totals: summarise(assets),
        exactDuplicates,
        characterScale: measureCharacterScale(),
        assets,
    };
}

/**
 * Measures each placed NPC's drawn height against the player's height at the
 * same depth in the same room.
 *
 * This is the check that says whether characters agree with each other. The
 * room scale profile guarantees the *player* is right against the painting; it
 * cannot tell whether the NPC beside them was authored at the same scale,
 * because an NPC's size comes from its own cell dimensions. A person-sized NPC
 * should land near 1.0.
 */
export function measureCharacterScale() {
    const navigation = readJson('resources/screenNavigation.json') ?? {};
    const grids = readJson('resources/screenWalkableJSONS/masterJSONData.json') ?? {};
    const npcs = readJson('resources/npcGame.json')?.npcs ?? {};
    const { profiles, roomIds } = buildRoomScaleProfiles(grids, navigation);
    const cellHeight = STAGE_HEIGHT / 60;

    const fields = new Map();
    for (const [gridId, grid] of Object.entries(grids)) {
        const rows = Object.keys(grid).map(Number).sort((a, b) => a - b).map((key) => grid[key]);
        const field = buildDepthField(rows);
        if (field) fields.set(gridId, field);
    }

    const rows = [];
    for (const [npcId, npc] of Object.entries(npcs)) {
        const roomId = npc?.npcPlacementLocation;
        const profile = roomId ? profiles.get(roomId) : null;
        const field = fields.get(roomId);
        if (!profile || !field || !npc?.gridPosition || !npc?.dimensions) continue;
        if (roomIdForGrid(roomId, roomIds) !== roomId) continue;

        const depth = sampleDepthByte(
            field,
            npc.gridPosition.x + (npc.dimensions.originalWidth / 2),
            npc.gridPosition.y + npc.dimensions.originalHeight,
        );
        const npcHeight = npc.dimensions.originalHeight * cellHeight * profile.scaleAt(depth) * profile.entityScaleAtNear;
        const playerHeight = profile.playerHeightAt(depth);
        rows.push({
            npcId, roomId, depth: Math.round(depth),
            npcHeight, playerHeight, ratio: npcHeight / playerHeight,
        });
    }
    return rows.sort((a, b) => b.ratio - a.ratio);
}

function summarise(assets) {
    const byRole = {};
    for (const asset of assets) {
        const bucket = byRole[asset.role] ?? (byRole[asset.role] = { count: 0, bytes: 0, breaches: 0, orphans: 0 });
        bucket.count += 1;
        bucket.bytes += asset.bytes;
        bucket.breaches += asset.budgetBreaches.length > 0 ? 1 : 0;
        bucket.orphans += asset.orphan ? 1 : 0;
    }
    const shipped = assets.filter((a) => a.shipped);
    return {
        byRole,
        allFiles: assets.length,
        allBytes: assets.reduce((sum, a) => sum + a.bytes, 0),
        shippedFiles: shipped.length,
        shippedBytes: shipped.reduce((sum, a) => sum + a.bytes, 0),
    };
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;
const mb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

function renderReport(manifest) {
    const lines = [];
    const { totals } = manifest;

    lines.push('# Asset manifest report');
    lines.push('');
    lines.push(`Generated ${manifest.generatedAt} by \`npm run report:assets\`. Do not edit by hand.`);
    lines.push('');
    lines.push(`The stage is ${manifest.stage.width}x${manifest.stage.height} (aspect ${manifest.stage.aspect}). Budgets are defined in [art-bible.md](art-bible.md) and enforced by \`scripts/asset-manifest.mjs --check\`.`);
    lines.push('');
    lines.push(`**${totals.shippedFiles} shipped images totalling ${mb(totals.shippedBytes)}**, out of ${totals.allFiles} images totalling ${mb(totals.allBytes)} in \`resources/\`.`);
    lines.push('');

    lines.push('## Weight and budget by role');
    lines.push('');
    lines.push('| Role | Files | Total bytes | Over budget | Orphaned |');
    lines.push('| --- | ---: | ---: | ---: | ---: |');
    for (const [role, bucket] of Object.entries(totals.byRole).sort((a, b) => b[1].bytes - a[1].bytes)) {
        lines.push(`| ${ROLE_LABELS[role] ?? role} | ${bucket.count} | ${mb(bucket.bytes)} | ${bucket.breaches} | ${bucket.orphans} |`);
    }
    lines.push('');

    const breached = manifest.assets.filter((a) => a.budgetBreaches.length > 0);
    lines.push('## Budget breaches');
    lines.push('');
    if (breached.length === 0) {
        lines.push('None.');
    } else {
        lines.push(`${breached.length} shipped assets breach their role budget.`);
        lines.push('');
        lines.push('| Asset | Role | Size | Bytes | Breach |');
        lines.push('| --- | --- | --- | ---: | --- |');
        for (const asset of breached.sort((a, b) => b.bytes - a.bytes)) {
            const size = asset.width ? `${asset.width}x${asset.height}` : 'unknown';
            lines.push(`| \`${asset.id}\` | ${asset.role} | ${size} | ${kb(asset.bytes)} | ${asset.budgetBreaches.join('; ')} |`);
        }
    }
    lines.push('');

    lines.push('## Exact duplicates');
    lines.push('');
    if (manifest.exactDuplicates.length === 0) {
        lines.push('None.');
    } else {
        lines.push('Byte-identical files. Each group should become one asset with the other IDs aliased to it.');
        lines.push('');
        lines.push('| Copies | Assets |');
        lines.push('| ---: | --- |');
        for (const group of manifest.exactDuplicates) {
            lines.push(`| ${group.ids.length} | ${group.ids.map((id) => `\`${id}\``).join(', ')} |`);
        }
    }
    lines.push('');

    const orphans = manifest.assets.filter((a) => a.orphan);
    lines.push('## Orphaned shipped assets');
    lines.push('');
    if (orphans.length === 0) {
        lines.push('None.');
    } else {
        lines.push(`${orphans.length} images sit in a shipped folder but no room, object, NPC, or player frame references them, totalling ${mb(orphans.reduce((s, a) => s + a.bytes, 0))}.`);
        lines.push('');
        lines.push('| Asset | Role | Size | Bytes |');
        lines.push('| --- | --- | --- | ---: |');
        for (const asset of orphans.sort((a, b) => b.bytes - a.bytes)) {
            lines.push(`| \`${asset.id}\` | ${asset.role} | ${asset.width ? `${asset.width}x${asset.height}` : 'unknown'} | ${kb(asset.bytes)} |`);
        }
    }
    lines.push('');

    lines.push('## Character scale against the player');
    lines.push('');
    lines.push('Each placed NPC\'s drawn height beside the player\'s height at the same depth in the same room. A person-sized NPC should be near 1.0. This is what says whether the characters agree with each other; the room scale profile only guarantees the player agrees with the painting.');
    lines.push('');
    lines.push('| NPC | Room | Depth | NPC height | Player height | Ratio |');
    lines.push('| --- | --- | ---: | ---: | ---: | ---: |');
    for (const row of manifest.characterScale) {
        const flag = row.ratio > 1.25 || row.ratio < 0.8 ? ' ⚠' : '';
        lines.push(`| \`${row.npcId}\` | ${row.roomId} | w${row.depth} | ${row.npcHeight.toFixed(0)} px | ${row.playerHeight.toFixed(0)} px | **${row.ratio.toFixed(2)}**${flag} |`);
    }
    lines.push('');
    lines.push('Animals are expected to sit away from 1.0. A flagged *human* NPC is drawn at a different scale from the player standing next to it.');
    lines.push('');

    lines.push('## Provenance and licence');
    lines.push('');
    const recorded = manifest.assets.filter((a) => a.shipped && a.provenance !== null).length;
    const shippedCount = manifest.assets.filter((a) => a.shipped).length;
    lines.push(`${recorded} of ${shippedCount} shipped assets have a recorded provenance and licence. The manifest leaves both \`null\` until a human records them, so an unrecorded asset is visible rather than assumed clear.`);
    lines.push('');

    return `${lines.join('\n')}\n`;
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

function main() {
    const check = process.argv.includes('--check');
    const manifest = buildManifest();

    fs.writeFileSync(
        path.join(RESOURCES, 'asset-manifest.json'),
        `${JSON.stringify(manifest, null, 2)}\n`,
        'utf8',
    );
    fs.writeFileSync(path.join(ROOT, 'docs', 'asset-report.md'), renderReport(manifest), 'utf8');

    const breached = manifest.assets.filter((a) => a.budgetBreaches.length > 0);
    const orphans = manifest.assets.filter((a) => a.orphan);
    console.log(`Asset manifest: ${manifest.totals.shippedFiles} shipped images, ${mb(manifest.totals.shippedBytes)}.`);
    console.log(`Budget breaches: ${breached.length}. Exact duplicate groups: ${manifest.exactDuplicates.length}. Orphans: ${orphans.length}.`);
    console.log('Wrote resources/asset-manifest.json and docs/asset-report.md');

    if (check && breached.length > 0) {
        console.error(`\n${breached.length} assets breach their role budget. See docs/asset-report.md.`);
        process.exit(1);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
