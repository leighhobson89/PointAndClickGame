#!/usr/bin/env node

// Renders the art-direction review sheets.
//
//   node scripts/art-calibration.mjs rooms      per-room scale calibration sheets
//   node scripts/art-calibration.mjs contact    role-based contact sheets
//   node scripts/art-calibration.mjs all        both
//
// The room sheets are the tool for choosing `playerHeightNear` and
// `playerHeightFar`. They draw the player silhouette standing at several real
// walkable positions across the room's painted depth range, at gameplay scale,
// beside the sizes the legacy ramp produced. Character scale is an art
// judgement against the painting, so it has to be looked at rather than
// calculated; this puts the comparison in front of a human cheaply.
//
// Output goes to `test-reports/art/`, which is ignored by Git. These are review
// artefacts, not deliverables, and they are not part of the browser test suite
// or its timing gate.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

// The sheets are written into the output directory and opened over `file://`
// rather than pushed in with `setContent`. A `setContent` page has an
// `about:blank` origin and is not allowed to fetch `file://` subresources, so
// every background and sprite would silently render as a broken image.
const assetHref = (absolutePath) => path
    .relative(OUT_HTML_DIR, absolutePath)
    .replace(/\\/g, '/')
    .split('/')
    .map(encodeURIComponent)
    .join('/');

import { buildRoomScaleProfiles, roomIdForGrid } from '../src/domain/navigation/depth-scale.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'test-reports', 'art');
const OUT_HTML_DIR = OUT;

const STAGE_WIDTH = 832;
const STAGE_HEIGHT = 448;
const GRID_WIDTH = 80;
const GRID_HEIGHT = 60;
const CELL_WIDTH = STAGE_WIDTH / GRID_WIDTH;
const CELL_HEIGHT = STAGE_HEIGHT / GRID_HEIGHT;

// These sheets place the frame images themselves, so they need the art canvas
// ratio, not the narrower logical box the game uses for collision and depth.
// The walk frames are painted on a 280x375 canvas; drawing them to any other
// ratio squashes every frame.
const SPRITE_ASPECT = 280 / 375;

const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));

// A screenshot taken before decode finishes captures blank tiles, which reads
// as a missing asset rather than a slow one.
const settleImages = (page) => page.evaluate(() => Promise.all(
    Array.from(document.images)
        .filter((image) => !image.complete)
        .map((image) => new Promise((resolve) => { image.onload = resolve; image.onerror = resolve; })),
));

const legacyScale = (depthByte) => 0.1 + Math.min(Math.max((depthByte - 100) / 155, 0), 1) * 0.9;

// The per-room multiplier the replaced ramp used, kept here so the sheets can
// still show a before-and-after. It is deliberately not read back out of the
// navigation data: that field is gone, and reintroducing it would create a
// second scale model living alongside the real one.
const LEGACY_PLAYER_HEIGHT = 140;
const LEGACY_MULTIPLIERS = Object.freeze({
    libraryFoyer: 1.5, marketStreet: 0.7, researchRoom: 1.7, alley: 1, carpenter: 2,
    den: 3, house: 1.1, sewer: 2, kitchen: 2, barn: 1, deadTree: 1.7, cowPath: 0.8,
    roadIntoTown: 1.8, stinkingDump: 1, largePileOfPoo: 1, riverCrossing: 1, map: 1, stables: 1,
});

/**
 * Picks real walkable positions spread across the room's depth range, so the
 * sheet shows the player where a player can actually stand.
 */
function samplePositions(grid, count = 5) {
    const byDepth = new Map();
    for (let y = 0; y < grid.length; y += 1) {
        for (let x = 0; x < (grid[y]?.length ?? 0); x += 1) {
            const cell = grid[y][x];
            if (typeof cell !== 'string' || cell[0] !== 'w') continue;
            const depth = Number.parseInt(cell.slice(1), 10);
            if (!Number.isFinite(depth)) continue;
            if (!byDepth.has(depth)) byDepth.set(depth, []);
            byDepth.get(depth).push({ x, y });
        }
    }
    const depths = [...byDepth.keys()].sort((a, b) => a - b);
    if (depths.length === 0) return [];

    const picks = [];
    for (let index = 0; index < count; index += 1) {
        const depth = depths[Math.round((index / Math.max(1, count - 1)) * (depths.length - 1))];
        const candidates = byDepth.get(depth);
        // The deepest row at that depth reads as the floor rather than a ledge.
        const deepest = candidates.reduce((best, cell) => (cell.y > best.y ? cell : best), candidates[0]);
        const sameRow = candidates.filter((cell) => cell.y === deepest.y).sort((a, b) => a.x - b.x);
        const cell = sameRow[Math.floor(sameRow.length / 2)];
        if (!picks.some((pick) => pick.depth === depth)) picks.push({ ...cell, depth });
    }
    return picks;
}

function roomSheetMarkup(rooms) {
    const sections = rooms.map((room) => {
        const figures = (positions, scaleFor, tone) => positions.map((position) => {
            const height = scaleFor(position.depth);
            const width = height * SPRITE_ASPECT;
            const footX = (position.x + 0.5) * CELL_WIDTH;
            const footY = (position.y + 1) * CELL_HEIGHT;
            return `<img class="figure ${tone}" src="${room.playerSprite}"
                style="left:${(footX - width / 2).toFixed(1)}px; top:${(footY - height).toFixed(1)}px;
                       width:${width.toFixed(1)}px; height:${height.toFixed(1)}px">
                <span class="tag ${tone}" style="left:${footX.toFixed(1)}px; top:${(footY + 2).toFixed(1)}px">
                    w${position.depth} · ${height.toFixed(0)}px</span>`;
        }).join('');

        return `<section>
            <h2>${room.id}</h2>
            <p class="meta">painted depth w${room.minByte}–w${room.maxByte} ·
               proposed ${room.profile.playerHeightFar.toFixed(0)}–${room.profile.playerHeightNear.toFixed(0)}px
               (${room.profile.depthRatio.toFixed(2)}x) ·
               legacy ${room.legacyFar.toFixed(0)}–${room.legacyNear.toFixed(0)}px
               (${(room.legacyNear / room.legacyFar).toFixed(2)}x)</p>
            <div class="pair">
                <figure><figcaption>Proposed</figcaption>
                    <div class="stage" style="background-image:url('${room.background}')">
                        ${figures(room.positions, (depth) => room.profile.playerHeightAt(depth), 'new')}
                    </div>
                </figure>
                <figure><figcaption>Legacy ramp</figcaption>
                    <div class="stage" style="background-image:url('${room.background}')">
                        ${figures(room.positions, (depth) => 140 * legacyScale(depth) * room.legacyMultiplier, 'old')}
                    </div>
                </figure>
            </div>
        </section>`;
    }).join('');

    return `<!doctype html><meta charset="utf-8"><title>Room scale calibration</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; padding:24px; background:#14120f; color:#f3ece1;
         font:14px/1.5 "Segoe UI", system-ui, sans-serif; }
  h1 { font-size:20px; margin:0 0 4px; }
  h2 { font-size:16px; margin:28px 0 2px; font-weight:600; }
  .meta { margin:0 0 8px; color:#b7a893; font-size:12px; font-variant-numeric:tabular-nums; }
  .pair { display:flex; gap:16px; flex-wrap:wrap; }
  figure { margin:0; }
  figcaption { font-size:11px; letter-spacing:.08em; text-transform:uppercase;
               color:#9c8d78; margin-bottom:4px; }
  .stage { position:relative; width:${STAGE_WIDTH}px; height:${STAGE_HEIGHT}px;
           background-size:100% 100%; outline:1px solid #3a3129; }
  .figure { position:absolute; image-rendering:auto; }
  .figure.new { filter:drop-shadow(0 0 2px #000); }
  .figure.old { filter:drop-shadow(0 0 2px #000) hue-rotate(150deg) saturate(2); opacity:.9; }
  .tag { position:absolute; transform:translateX(-50%); font-size:10px;
         font-variant-numeric:tabular-nums; padding:1px 4px; border-radius:3px;
         background:#000a; white-space:nowrap; }
  .tag.new { color:#9ff5c0; } .tag.old { color:#ff9db0; }
</style>
<h1>Room scale calibration — player at real walkable positions, gameplay scale</h1>
${sections}`;
}

function variantBackground(gridId) {
    const file = path.join(ROOT, 'resources', 'backgrounds', `${gridId}.png`);
    return fs.existsSync(file) ? file : null;
}

async function renderRooms(browser, { sheets = true } = {}) {
    const navigation = readJson('resources/screenNavigation.json');
    const grids = readJson('resources/screenWalkableJSONS/masterJSONData.json');

    const { fields, profiles, roomIds } = buildRoomScaleProfiles(grids, navigation);

    const rooms = [];
    for (const [gridId, grid] of Object.entries(grids)) {
        const rows = Object.keys(grid).map(Number).sort((a, b) => a - b).map((key) => grid[key]);
        const field = fields.get(gridId);
        const ownerId = roomIdForGrid(gridId, roomIds);
        const profile = ownerId ? profiles.get(ownerId) : null;
        if (!field || !profile) continue;

        const room = navigation[ownerId] ?? {};
        const legacyMultiplier = LEGACY_MULTIPLIERS[ownerId] ?? 1;

        rooms.push({
            id: gridId,
            // A grid variant paints its own background — the completed bridge,
            // the repaired fence — so prefer the file named after the grid and
            // fall back to the room's declared background.
            background: assetHref(variantBackground(gridId) ?? path.join(ROOT, room.bgUrl.replace(/^\.\//, ''))),
            playerSprite: assetHref(path.join(ROOT, 'resources', 'player', 'still_right.png')),
            minByte: field.minByte,
            maxByte: field.maxByte,
            legacyMultiplier,
            legacyNear: LEGACY_PLAYER_HEIGHT * legacyScale(field.maxByte) * legacyMultiplier,
            legacyFar: LEGACY_PLAYER_HEIGHT * legacyScale(field.minByte) * legacyMultiplier,
            profile,
            positions: samplePositions(rows),
        });
    }

    rooms.sort((a, b) => a.id.localeCompare(b.id));
    fs.mkdirSync(OUT, { recursive: true });
    if (!sheets) return rooms;

    const sheet = path.join(OUT, 'room-scale-calibration.html');
    fs.writeFileSync(sheet, roomSheetMarkup(rooms), 'utf8');

    const page = await browser.newPage({ viewport: { width: 1760, height: 1000 } });
    await page.goto(pathToFileURL(sheet).href, { waitUntil: 'load' });
    await settleImages(page);

    await page.screenshot({ path: path.join(OUT, 'room-scale-calibration.png'), fullPage: true });

    for (const section of await page.locator('section').all()) {
        const id = await section.locator('h2').innerText();
        await section.screenshot({ path: path.join(OUT, 'rooms', `${id}.png`) });
    }
    await page.close();

    console.log(`Rendered ${rooms.length} room calibration sheets to test-reports/art/`);
    return rooms;
}

// One page showing every room's proposed sizing at half scale. Gross scale
// errors are obvious at this size, and it makes the whole game reviewable in
// one look instead of nineteen.
function montageMarkup(rooms) {
    const cards = rooms.map((room) => {
        const figures = room.positions.map((position) => {
            const height = room.profile.playerHeightAt(position.depth);
            const width = height * SPRITE_ASPECT;
            const footX = (position.x + 0.5) * CELL_WIDTH;
            const footY = (position.y + 1) * CELL_HEIGHT;
            return `<img src="${room.playerSprite}"
                style="left:${(footX - width / 2).toFixed(1)}px; top:${(footY - height).toFixed(1)}px;
                       width:${width.toFixed(1)}px; height:${height.toFixed(1)}px">`;
        }).join('');
        return `<figure>
            <div class="scaler"><div class="stage" style="background-image:url('${room.background}')">${figures}</div></div>
            <figcaption>${room.id}<br><span>w${room.minByte}–w${room.maxByte} ·
                ${room.profile.playerHeightFar.toFixed(0)}–${room.profile.playerHeightNear.toFixed(0)}px ·
                ${room.profile.depthRatio.toFixed(2)}x</span></figcaption>
        </figure>`;
    }).join('');

    return `<!doctype html><meta charset="utf-8"><title>Room scale montage</title>
<style>
  body { margin:0; padding:20px; background:#14120f; color:#f3ece1;
         font:13px/1.4 "Segoe UI", system-ui, sans-serif; }
  h1 { font-size:18px; margin:0 0 14px; }
  .grid { display:grid; grid-template-columns:repeat(3, ${STAGE_WIDTH / 2}px); gap:18px; }
  figure { margin:0; }
  .scaler { width:${STAGE_WIDTH / 2}px; height:${STAGE_HEIGHT / 2}px; overflow:hidden; outline:1px solid #3a3129; }
  .stage { position:relative; width:${STAGE_WIDTH}px; height:${STAGE_HEIGHT}px;
           background-size:100% 100%; transform:scale(.5); transform-origin:0 0; }
  .stage img { position:absolute; filter:drop-shadow(0 0 2px #000); }
  figcaption { margin-top:4px; font-size:12px; }
  figcaption span { color:#9c8d78; font-size:11px; font-variant-numeric:tabular-nums; }
</style>
<h1>Proposed player sizing, every room at half scale</h1>
<div class="grid">${cards}</div>`;
}

async function renderMontage(browser, rooms) {
    const sheet = path.join(OUT, 'room-scale-montage.html');
    fs.writeFileSync(sheet, montageMarkup(rooms), 'utf8');
    const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
    await page.goto(pathToFileURL(sheet).href, { waitUntil: 'load' });
    await settleImages(page);
    await page.screenshot({ path: path.join(OUT, 'room-scale-montage.png'), fullPage: true });
    await page.close();
    console.log('Rendered the all-room montage to test-reports/art/room-scale-montage.png');
}

async function renderContactSheets(browser) {
    const manifest = readJson('resources/asset-manifest.json');
    const roles = new Map();
    for (const asset of manifest.assets) {
        if (!asset.shipped) continue;
        if (!roles.has(asset.role)) roles.set(asset.role, []);
        roles.get(asset.role).push(asset);
    }

    fs.mkdirSync(path.join(OUT, 'contact'), { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

    for (const [role, assets] of roles) {
        assets.sort((a, b) => a.id.localeCompare(b.id));
        const tiles = assets.map((asset) => {
            const url = assetHref(path.join(ROOT, asset.source.replace(/^\.\//, '')));
            const over = asset.budgetBreaches.length > 0;
            return `<figure class="${over ? 'over' : ''}">
                <div class="well"><img src="${url}" alt=""></div>
                <figcaption>${asset.id}<br><span>${asset.width}x${asset.height} · ${(asset.bytes / 1024).toFixed(0)} KB</span></figcaption>
            </figure>`;
        }).join('');

        const sheet = path.join(OUT, `contact-${role}.html`);
        fs.writeFileSync(sheet, `<!doctype html><meta charset="utf-8"><title>${role}</title>
<style>
  body { margin:0; padding:24px; background:#14120f; color:#f3ece1;
         font:13px/1.4 "Segoe UI", system-ui, sans-serif; }
  h1 { font-size:18px; margin:0 0 16px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(180px,1fr)); gap:14px; }
  figure { margin:0; }
  .well { height:150px; display:grid; place-items:center; padding:6px;
          background:repeating-conic-gradient(#2a2520 0 25%, #211d19 0 50%) 0 0/16px 16px;
          border:1px solid #3a3129; border-radius:4px; }
  .over .well { border-color:#c65b6d; }
  img { max-width:100%; max-height:138px; object-fit:contain; }
  figcaption { margin-top:5px; font-size:11px; word-break:break-all; }
  figcaption span { color:#9c8d78; font-variant-numeric:tabular-nums; }
  .over figcaption { color:#ff9db0; }
</style>
<h1>Contact sheet — ${role} (${assets.length} assets, red = over budget)</h1>
<div class="grid">${tiles}</div>`, 'utf8');

        await page.goto(pathToFileURL(sheet).href, { waitUntil: 'load' });
        await settleImages(page);
        await page.screenshot({ path: path.join(OUT, 'contact', `${role}.png`), fullPage: true });
    }

    await page.close();
    console.log(`Rendered ${roles.size} contact sheets to test-reports/art/contact/`);
}

// Measures the opaque bounding box of every player frame.
//
// The sprite is drawn into a fixed box, so what actually plants the character
// on the floor is where the drawn pixels sit inside their canvas. If the foot
// baseline moves between frames the character bobs; if the drawn height moves,
// the character grows and shrinks as it walks. Both read as "the animation is
// wrong" without being visible in any single frame.
async function renderFrameGeometry(browser) {
    const manifest = readJson('resources/asset-manifest.json');
    const frames = manifest.assets
        .filter((asset) => asset.role === 'player')
        .sort((a, b) => a.id.localeCompare(b.id));

    const sheet = path.join(OUT, 'frame-geometry.html');
    fs.writeFileSync(sheet, `<!doctype html><meta charset="utf-8"><title>frame geometry</title>`, 'utf8');
    const page = await browser.newPage();
    await page.goto(pathToFileURL(sheet).href, { waitUntil: 'load' });

    const measured = await page.evaluate(async (sources) => {
        const results = [];
        for (const { id, src } of sources) {
            const image = new Image();
            image.src = src;
            await new Promise((resolve) => { image.onload = resolve; image.onerror = resolve; });
            if (!image.naturalWidth) { results.push({ id, error: 'did not load' }); continue; }

            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            context.drawImage(image, 0, 0);
            const { data } = context.getImageData(0, 0, canvas.width, canvas.height);

            let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
            for (let y = 0; y < canvas.height; y += 1) {
                for (let x = 0; x < canvas.width; x += 1) {
                    if (data[(y * canvas.width + x) * 4 + 3] < 16) continue;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
            if (maxY < 0) { results.push({ id, error: 'fully transparent' }); continue; }

            results.push({
                id,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                // Normalised so frames authored at different canvas sizes stay
                // comparable: 1 is the bottom of the canvas.
                baseline: (maxY + 1) / canvas.height,
                top: minY / canvas.height,
                drawnHeight: (maxY - minY + 1) / canvas.height,
                drawnWidth: (maxX - minX + 1) / canvas.width,
                centreX: ((minX + maxX) / 2) / canvas.width,
            });
        }
        return results;
    // Inlined as data URLs rather than linked over `file://`: a file-origin
    // image taints the canvas, and a tainted canvas refuses `getImageData`.
    }, frames.map((frame) => ({
        id: frame.id,
        src: `data:image/png;base64,${fs.readFileSync(path.join(ROOT, frame.source.replace(/^\.\//, ''))).toString('base64')}`,
    })));

    await page.close();

    const groups = new Map();
    for (const frame of measured) {
        if (frame.error) continue;
        const direction = frame.id.split('_').pop();
        if (!groups.has(direction)) groups.set(direction, []);
        groups.get(direction).push(frame);
    }

    const lines = ['# Player frame geometry', '',
        'Generated by `npm run report:art`. Do not edit by hand.', '',
        'Measured from the opaque bounding box of each frame, normalised to its own canvas so frames authored at different sizes stay comparable. `baseline` is where the lowest drawn pixel sits (1.0 is the bottom edge); `drawnHeight` is how much of the canvas the character fills.', '',
        '| Direction | Frames | Baseline spread | Height spread | Canvas sizes |',
        '| --- | ---: | ---: | ---: | --- |'];

    const spread = (values) => Math.max(...values) - Math.min(...values);
    for (const [direction, list] of [...groups].sort()) {
        const sizes = [...new Set(list.map((frame) => `${frame.canvasWidth}x${frame.canvasHeight}`))];
        lines.push(`| ${direction} | ${list.length} | ${(spread(list.map((f) => f.baseline)) * 100).toFixed(1)}% | ${(spread(list.map((f) => f.drawnHeight)) * 100).toFixed(1)}% | ${sizes.join(', ')} |`);
    }

    lines.push('', '## Every frame', '',
        '| Frame | Canvas | Baseline | Drawn height | Drawn width | Centre x |',
        '| --- | --- | ---: | ---: | ---: | ---: |');
    for (const frame of measured) {
        if (frame.error) { lines.push(`| \`${frame.id}\` | — | — | — | — | ${frame.error} |`); continue; }
        lines.push(`| \`${frame.id}\` | ${frame.canvasWidth}x${frame.canvasHeight} | ${frame.baseline.toFixed(3)} | ${frame.drawnHeight.toFixed(3)} | ${frame.drawnWidth.toFixed(3)} | ${frame.centreX.toFixed(3)} |`);
    }

    fs.writeFileSync(path.join(ROOT, 'docs', 'player-frame-geometry.md'), `${lines.join('\n')}\n`, 'utf8');
    console.log('Wrote docs/player-frame-geometry.md');
    return measured;
}

async function main() {
    const mode = process.argv[2] ?? 'all';
    const browser = await chromium.launch();
    try {
        if (mode === 'rooms' || mode === 'montage' || mode === 'all') {
            const rooms = await renderRooms(browser, { sheets: mode !== 'montage' });
            await renderMontage(browser, rooms);
        }
        if (mode === 'contact' || mode === 'all') await renderContactSheets(browser);
        if (mode === 'frames' || mode === 'all') await renderFrameGeometry(browser);
    } finally {
        await browser.close();
    }
}

main().catch((error) => { console.error(error); process.exit(1); });
