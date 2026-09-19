#!/usr/bin/env node

// Deterministically turns the approved Section 3 paint studies into the exact
// runtime package. Re-running this script is safe: source art is retained under
// resources/redesign/section-03-library-foyer and delivery files are replaced.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SECTION = path.join(ROOT, 'resources/redesign/section-03-library-foyer');
const STAGE = Object.freeze({ width: 832, height: 448 });

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(ROOT, '.playwright-browsers');

const files = Object.freeze({
    backgroundSource: path.join(SECTION, 'candidates/library-foyer-background-v2-stage-study.png'),
    foregroundSource: path.join(ROOT, 'resources/foregrounds/libraryFoyer.png'),
    grid: path.join(ROOT, 'resources/screenWalkableJSONS/masterJSONData.json'),
    marketClosedSource: path.join(SECTION, 'source-art/market-door-closed-source.png'),
    marketOpenSource: path.join(SECTION, 'source-art/market-door-open-source.png'),
    researchClosedSource: path.join(SECTION, 'source-art/research-door-closed-source.png'),
    researchOpenSource: path.join(SECTION, 'source-art/research-door-open-source.png'),
    marketClosedMask: path.join(ROOT, 'resources/objects/images/libraryFoyer_Exit_MarketStreetClosed.png'),
    marketOpenMask: path.join(ROOT, 'resources/objects/images/libraryFoyer_Exit_MarketStreetOpen.png'),
    researchClosedMask: path.join(ROOT, 'resources/objects/images/libraryFoyer_Exit_ResearchRoomClosed.png'),
    researchOpenMask: path.join(ROOT, 'resources/objects/images/libraryFoyer_Exit_ResearchRoomOpen.png'),
    background: path.join(ROOT, 'resources/backgrounds/libraryFoyer.webp'),
    foreground: path.join(ROOT, 'resources/foregrounds/libraryFoyer.webp'),
    marketClosed: path.join(ROOT, 'resources/objects/images/libraryFoyer_Exit_MarketStreetClosed.webp'),
    marketOpen: path.join(ROOT, 'resources/objects/images/libraryFoyer_Exit_MarketStreetOpen.webp'),
    researchClosed: path.join(ROOT, 'resources/objects/images/libraryFoyer_Exit_ResearchRoomClosed.webp'),
    researchOpen: path.join(ROOT, 'resources/objects/images/libraryFoyer_Exit_ResearchRoomOpen.webp'),
    walkableOverlay: path.join(SECTION, 'walkable/libraryFoyer-walkable-area.png'),
    walkableFragment: path.join(SECTION, 'walkable/libraryFoyer-grid.json'),
});

function requireSources() {
    for (const key of [
        'backgroundSource', 'foregroundSource', 'grid',
        'marketClosedSource', 'marketOpenSource', 'researchClosedSource', 'researchOpenSource',
        'marketClosedMask', 'marketOpenMask', 'researchClosedMask', 'researchOpenMask',
    ]) {
        const file = files[key];
        if (!fs.existsSync(file)) throw new Error(`Missing Section 3 source: ${path.relative(ROOT, file)}`);
    }
}

async function loadBrowser() {
    const playwright = await import(pathToFileURL(path.join(ROOT, 'node_modules/@playwright/test/index.js')).href);
    const chromium = playwright.chromium ?? playwright.default?.chromium;
    const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href);
    return { browser, page };
}

async function renderPackage(page, grid) {
    const sources = Object.fromEntries(
        Object.entries(files)
            .filter(([key]) => key.endsWith('Source') || key.endsWith('Mask'))
            .map(([key, value]) => [key, pathToFileURL(value).href]),
    );

    return page.evaluate(async ({ sources, stage, grid }) => {
        async function decode(href) {
            const image = new Image();
            image.src = href;
            await image.decode();
            return image;
        }

        function canvas(width, height) {
            const element = document.createElement('canvas');
            element.width = width;
            element.height = height;
            return element;
        }

        function bytes(dataUrl) {
            return Math.floor((dataUrl.split(',')[1].length * 3) / 4);
        }

        function encode(element, type, maxBytes, qualities = [0.92, 0.88, 0.84, 0.78, 0.7]) {
            if (type === 'image/png') return element.toDataURL(type).split(',')[1];
            let result;
            for (const quality of qualities) {
                result = element.toDataURL(type, quality);
                if (bytes(result) <= maxBytes) break;
            }
            return result.split(',')[1];
        }

        function opaqueBounds(image) {
            const probe = canvas(image.naturalWidth, image.naturalHeight);
            const context = probe.getContext('2d', { willReadFrequently: true });
            context.drawImage(image, 0, 0);
            const pixels = context.getImageData(0, 0, probe.width, probe.height).data;
            let minX = probe.width, minY = probe.height, maxX = -1, maxY = -1;
            for (let y = 0; y < probe.height; y += 1) {
                for (let x = 0; x < probe.width; x += 1) {
                    if (pixels[((y * probe.width) + x) * 4 + 3] <= 8) continue;
                    minX = Math.min(minX, x); minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
                }
            }
            if (maxX < minX || maxY < minY) throw new Error('Door source has no opaque pixels');
            return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
        }

        function doorCanvas(image, legacyMask, width, height) {
            const bounds = opaqueBounds(image);
            const output = canvas(width, height);
            const context = output.getContext('2d', { willReadFrequently: true });
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = 'high';
            context.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, width, height);

            // The legacy alpha is authored scene geometry: the Research Room
            // states cut around different parts of the foreground chairs.
            // Preserve those silhouettes while replacing only the paint.
            const painted = context.getImageData(0, 0, width, height);
            const maskCanvas = canvas(width, height);
            const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true });
            maskContext.imageSmoothingEnabled = true;
            maskContext.imageSmoothingQuality = 'high';
            maskContext.drawImage(legacyMask, 0, 0, width, height);
            const mask = maskContext.getImageData(0, 0, width, height).data;
            for (let index = 0; index < painted.data.length; index += 4) {
                painted.data[index + 3] = mask[index + 3];
            }
            context.clearRect(0, 0, width, height);
            context.putImageData(painted, 0, 0);
            return output;
        }

        const [
            backgroundSource, foregroundSource,
            marketClosedSource, marketOpenSource, researchClosedSource, researchOpenSource,
            marketClosedMask, marketOpenMask, researchClosedMask, researchOpenMask,
        ] = await Promise.all([
            decode(sources.backgroundSource), decode(sources.foregroundSource),
            decode(sources.marketClosedSource), decode(sources.marketOpenSource),
            decode(sources.researchClosedSource), decode(sources.researchOpenSource),
            decode(sources.marketClosedMask), decode(sources.marketOpenMask),
            decode(sources.researchClosedMask), decode(sources.researchOpenMask),
        ]);

        // The approved study is 1708x921. Its largest exact 13:7 centre crop is
        // 1703x917; scaling that by 64/131 lands exactly on 832x448 without any
        // non-uniform stretch.
        const background = canvas(stage.width, stage.height);
        const backgroundContext = background.getContext('2d', { willReadFrequently: true });
        backgroundContext.imageSmoothingEnabled = true;
        backgroundContext.imageSmoothingQuality = 'high';
        backgroundContext.drawImage(backgroundSource, 2, 2, 1703, 917, 0, 0, stage.width, stage.height);

        // Reuse the established alpha silhouette for the chair/table occluder,
        // expanded by three stage pixels to tolerate the painterly edge. The
        // RGB comes from the approved background itself, so the layer is
        // pixel-identical where it overlaps and cannot introduce a seam.
        const oldMask = canvas(stage.width, stage.height);
        oldMask.getContext('2d').drawImage(foregroundSource, 0, 0, stage.width, stage.height);
        const oldAlpha = oldMask.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, stage.width, stage.height).data;
        const foreground = canvas(stage.width, stage.height);
        const foregroundContext = foreground.getContext('2d', { willReadFrequently: true });
        foregroundContext.drawImage(background, 0, 0);
        const foregroundPixels = foregroundContext.getImageData(0, 0, stage.width, stage.height);
        const radius = 3;
        for (let y = 0; y < stage.height; y += 1) {
            for (let x = 0; x < stage.width; x += 1) {
                let alpha = 0;
                for (let oy = -radius; oy <= radius && alpha === 0; oy += 1) {
                    for (let ox = -radius; ox <= radius; ox += 1) {
                        const px = x + ox, py = y + oy;
                        if (px < 0 || py < 0 || px >= stage.width || py >= stage.height) continue;
                        if (oldAlpha[((py * stage.width) + px) * 4 + 3] > 8) { alpha = 255; break; }
                    }
                }
                foregroundPixels.data[((y * stage.width) + x) * 4 + 3] = alpha;
            }
        }
        foregroundContext.clearRect(0, 0, stage.width, stage.height);
        foregroundContext.putImageData(foregroundPixels, 0, 0);

        // RGB is fitted to the runtime aspect; the original alpha retains every
        // chair cut-out and state-specific edge.
        const marketClosed = doorCanvas(marketClosedSource, marketClosedMask, 84, 347);
        const marketOpen = doorCanvas(marketOpenSource, marketOpenMask, 84, 347);
        const researchClosed = doorCanvas(researchClosedSource, researchClosedMask, 94, 324);
        const researchOpen = doorCanvas(researchOpenSource, researchOpenMask, 94, 324);

        const overlay = canvas(stage.width, stage.height);
        const overlayContext = overlay.getContext('2d');
        overlayContext.drawImage(background, 0, 0);
        overlayContext.fillStyle = 'rgba(0,0,0,.32)';
        overlayContext.fillRect(0, 0, stage.width, stage.height);
        const cellWidth = stage.width / 80;
        const cellHeight = stage.height / 60;
        for (let y = 0; y < grid.length; y += 1) {
            for (let x = 0; x < grid[y].length; x += 1) {
                const value = grid[y][x];
                overlayContext.fillStyle = typeof value === 'string' && value.startsWith('e')
                    ? 'rgba(255,220,35,.7)'
                    : typeof value === 'string' && value.startsWith('w')
                        ? 'rgba(40,220,90,.42)'
                        : 'rgba(220,45,45,.2)';
                overlayContext.fillRect(x * cellWidth, y * cellHeight, Math.ceil(cellWidth), Math.ceil(cellHeight));
            }
        }
        overlayContext.strokeStyle = 'rgba(255,255,255,.13)';
        overlayContext.lineWidth = 1;
        for (let x = 0; x <= 80; x += 1) { overlayContext.beginPath(); overlayContext.moveTo(x * cellWidth, 0); overlayContext.lineTo(x * cellWidth, stage.height); overlayContext.stroke(); }
        for (let y = 0; y <= 60; y += 1) { overlayContext.beginPath(); overlayContext.moveTo(0, y * cellHeight); overlayContext.lineTo(stage.width, y * cellHeight); overlayContext.stroke(); }

        return {
            background: encode(background, 'image/webp', 400 * 1024),
            foreground: encode(foreground, 'image/webp', 250 * 1024),
            marketClosed: encode(marketClosed, 'image/webp', 80 * 1024),
            marketOpen: encode(marketOpen, 'image/webp', 80 * 1024),
            researchClosed: encode(researchClosed, 'image/webp', 80 * 1024),
            researchOpen: encode(researchOpen, 'image/webp', 80 * 1024),
            walkableOverlay: encode(overlay, 'image/png'),
        };
    }, { sources, stage: STAGE, grid });
}

async function main() {
    requireSources();
    const allGrids = JSON.parse(fs.readFileSync(files.grid, 'utf8'));
    const grid = allGrids.libraryFoyer;
    if (!Array.isArray(grid) || grid.length !== 60 || grid.some((row) => row.length !== 80)) {
        throw new Error('Library Foyer must have one canonical 80x60 walk grid');
    }

    const { browser, page } = await loadBrowser();
    let output;
    try {
        output = await renderPackage(page, grid);
    } finally {
        await browser.close();
    }

    for (const [key, base64] of Object.entries(output)) {
        const target = files[key];
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, Buffer.from(base64, 'base64'));
        console.log(`${path.relative(ROOT, target)} ${fs.statSync(target).size} bytes`);
    }
    fs.writeFileSync(files.walkableFragment, `${JSON.stringify({ libraryFoyer: grid }, null, 2)}\n`, 'utf8');
    console.log(`${path.relative(ROOT, files.walkableFragment)} regenerated from runtime authority`);
}

await main();
