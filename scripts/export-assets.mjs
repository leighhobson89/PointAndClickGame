#!/usr/bin/env node

// Re-exports the shipped image set to its delivery form.
//
//   node scripts/export-assets.mjs --plan     print what would change, write nothing
//   node scripts/export-assets.mjs --write    perform the export
//
// PNG is the wrong container for painted scenery: a full-stage painting encodes
// to a few tens of kilobytes as WebP and to several megabytes as PNG. This
// script is the reproducible pass that fixes that, together with the crops and
// dimension ceilings each role is budgeted for. It never repaints anything; it
// only re-encodes, rescales uniformly, and crops transparent margins.
//
// The source image is never destroyed. Every original moves to
// `resources/source-art/`, which is classified as unshipped working material,
// so a later restyle starts from the full-resolution painting rather than from
// the delivered file.
//
// Decoding and encoding run in Chromium, which is already a development
// dependency for the browser suite. That avoids adding a native image library
// to a project that ships no server-side image processing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RESOURCES = path.join(ROOT, 'resources');
const SOURCE_ART = path.join(RESOURCES, 'source-art');

const STAGE_WIDTH = 832;
const STAGE_HEIGHT = 448;
const STAGE_ASPECT = STAGE_WIDTH / STAGE_HEIGHT;

// A room this close to the stage aspect is corrected by a uniform rescale; the
// error is well under a pixel of visible distortion. Anything further off is a
// composition problem that belongs to the room's restyle (BUG-041), so this
// script fits it inside the stage without baking the stretch in.
const ASPECT_TOLERANCE = 0.02;

// Quality ladder. Each file starts at the top and steps down only while it is
// over its role budget, so a cheap image is never degraded to pay for an
// expensive one.
const QUALITY_LADDER = [0.9, 0.85, 0.8, 0.72, 0.65];

// The subject fills the frame with a 6% margin, per the art bible's icon rule.
const ICON_MARGIN = 0.06;

const RECIPES = {
    // Painted, full-frame, no alpha requirement beyond what it already carries.
    background: { container: 'webp', fit: 'stage', maxBytes: 400 * 1024 },
    // Occluders carry a real alpha channel; WebP keeps it.
    foreground: { container: 'webp', fit: 'stage', maxBytes: 250 * 1024 },
    // Flat, hard-edged line art. PNG stays correct for these, so they are only
    // brought inside the dimension ceiling. The ceiling is the 280x375 canvas
    // every walk frame now shares: frames in one direction must share one
    // canvas, and the registration pass guarantees they already do, so this
    // only has to avoid shrinking them off it.
    player: { container: 'png', fit: 'within', maxWidth: 280, maxHeight: 375 },
    // Painted characters. Uniform scale only: trimming transparent margin would
    // change a sprite's aspect, and the authored cell dimensions are matched to
    // that aspect.
    npc: { container: 'webp', fit: 'within', maxWidth: 400, maxHeight: 700, maxBytes: 120 * 1024 },
    objectWorld: { container: 'webp', fit: 'within', maxWidth: 512, maxHeight: 512, maxBytes: 80 * 1024 },
    // An icon is a different crop of the same subject, so here trimming to the
    // subject is the point rather than a hazard.
    objectInventory: { container: 'webp', fit: 'icon', maxWidth: 128, maxHeight: 128, maxBytes: 24 * 1024 },
    cursor: { container: 'png', fit: 'within', maxWidth: 64, maxHeight: 64 },
};

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

/* ------------------------------------------------------------------ *
 * Chromium image work
 * ------------------------------------------------------------------ */

async function openBrowser() {
    const pw = await import(pathToFileURL(path.join(ROOT, 'node_modules/@playwright/test/index.js')).href);
    const chromium = pw.chromium ?? pw.default?.chromium;
    // Chromium gives every file:// document its own opaque origin, so drawing
    // one local image into a canvas owned by another taints it and blocks
    // `toDataURL`. The flag lifts that for this throwaway, offline, local-only
    // browser; nothing here loads a remote resource.
    const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
    const page = await browser.newPage();
    // The page also needs a real document before it can decode into a canvas;
    // an about:blank document cannot fetch file:// subresources at all.
    await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href);
    return { browser, page };
}

/**
 * Decodes one image, applies the recipe, and returns the encoded bytes.
 *
 * All of the pixel work happens inside the page because that is where a decoder
 * and a WebP encoder already exist.
 */
async function transcode(page, absoluteSource, recipe) {
    const href = pathToFileURL(absoluteSource).href;
    const result = await page.evaluate(async ({ href, recipe, stage, ladder, iconMargin, tolerance }) => {
        const image = new Image();
        image.src = href;
        await image.decode();

        const sourceWidth = image.naturalWidth;
        const sourceHeight = image.naturalHeight;

        // Work out the drawn rectangle first: which part of the source is kept,
        // and how large it is drawn.
        let sx = 0, sy = 0, sw = sourceWidth, sh = sourceHeight;

        if (recipe.fit === 'icon') {
            // Trim to the opaque bounding box so the subject fills the frame.
            const probe = document.createElement('canvas');
            probe.width = sourceWidth;
            probe.height = sourceHeight;
            const probeContext = probe.getContext('2d', { willReadFrequently: true });
            probeContext.drawImage(image, 0, 0);
            const { data } = probeContext.getImageData(0, 0, sourceWidth, sourceHeight);
            let minX = sourceWidth, minY = sourceHeight, maxX = -1, maxY = -1;
            for (let y = 0; y < sourceHeight; y += 1) {
                for (let x = 0; x < sourceWidth; x += 1) {
                    if (data[((y * sourceWidth) + x) * 4 + 3] > 8) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }
            if (maxX >= minX && maxY >= minY) {
                sx = minX; sy = minY; sw = (maxX - minX) + 1; sh = (maxY - minY) + 1;
            }
        }

        let targetWidth;
        let targetHeight;
        let letterbox = false;

        if (recipe.fit === 'stage') {
            const aspect = sw / sh;
            const stageAspect = stage.width / stage.height;
            if (Math.abs((aspect / stageAspect) - 1) <= tolerance) {
                // Close enough that a uniform rescale is the whole correction.
                targetWidth = stage.width;
                targetHeight = stage.height;
            } else {
                // Off-aspect. Fit inside the stage without distorting; the room
                // still reports as not stage-sized until it is re-composed.
                const scale = Math.min(stage.width / sw, stage.height / sh);
                targetWidth = Math.max(1, Math.round(sw * scale));
                targetHeight = Math.max(1, Math.round(sh * scale));
                letterbox = true;
            }
        } else if (recipe.fit === 'icon') {
            const usable = 1 - (iconMargin * 2);
            const scale = Math.min(
                (recipe.maxWidth * usable) / sw,
                (recipe.maxHeight * usable) / sh,
                // Never upscale a small icon into a blurry large one.
                1,
            );
            targetWidth = Math.max(1, Math.round(sw * scale));
            targetHeight = Math.max(1, Math.round(sh * scale));
        } else {
            const scale = Math.min(
                recipe.maxWidth / sw,
                recipe.maxHeight / sh,
                1,
            );
            targetWidth = Math.max(1, Math.round(sw * scale));
            targetHeight = Math.max(1, Math.round(sh * scale));
        }

        // An icon is delivered on a square slot with the subject centred inside
        // its margin, because the inventory lays out square cells.
        let canvasWidth = targetWidth;
        let canvasHeight = targetHeight;
        if (recipe.fit === 'icon') {
            const slot = Math.min(
                recipe.maxWidth,
                Math.round(Math.max(targetWidth, targetHeight) / (1 - (iconMargin * 2))),
            );
            canvasWidth = slot;
            canvasHeight = slot;
        }

        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(
            image,
            sx, sy, sw, sh,
            Math.round((canvasWidth - targetWidth) / 2),
            Math.round((canvasHeight - targetHeight) / 2),
            targetWidth, targetHeight,
        );

        const encode = (type, quality) => canvas.toDataURL(type, quality).split(',')[1];

        let dataUrlBase64;
        let usedQuality = null;
        if (recipe.container === 'png') {
            dataUrlBase64 = encode('image/png');
        } else {
            for (const quality of ladder) {
                dataUrlBase64 = encode('image/webp', quality);
                usedQuality = quality;
                const bytes = Math.floor((dataUrlBase64.length * 3) / 4);
                if (!recipe.maxBytes || bytes <= recipe.maxBytes) break;
            }
        }

        return {
            base64: dataUrlBase64,
            sourceWidth,
            sourceHeight,
            width: canvasWidth,
            height: canvasHeight,
            quality: usedQuality,
            letterbox,
            cropped: sw !== sourceWidth || sh !== sourceHeight,
        };
    }, { href, recipe, stage: { width: STAGE_WIDTH, height: STAGE_HEIGHT }, ladder: QUALITY_LADDER, iconMargin: ICON_MARGIN, tolerance: ASPECT_TOLERANCE });

    return { ...result, buffer: Buffer.from(result.base64, 'base64') };
}

/* ------------------------------------------------------------------ *
 * Plan
 * ------------------------------------------------------------------ */

function buildPlan() {
    const manifest = readJson(path.join(RESOURCES, 'asset-manifest.json'));
    const jobs = [];
    for (const asset of manifest.assets) {
        if (!asset.shipped) continue;
        const recipe = RECIPES[asset.role];
        if (!recipe) continue;
        const relative = asset.source.replace(/^\.\//, '');
        const absolute = path.join(ROOT, relative);
        if (!fs.existsSync(absolute)) continue;
        // An orphan is not delivered to anyone, so re-encoding it only spends
        // time. It is reported by the manifest and resolved there.
        if (asset.orphan) continue;

        const extension = recipe.container === 'png' ? '.png' : '.webp';
        const target = relative.replace(/\.[^.]+$/, extension);
        jobs.push({
            id: asset.id,
            role: asset.role,
            relative,
            absolute,
            target,
            targetAbsolute: path.join(ROOT, target),
            recipe,
            beforeBytes: asset.bytes,
            beforeSize: `${asset.width}x${asset.height}`,
        });
    }
    return jobs;
}

/* ------------------------------------------------------------------ *
 * References
 * ------------------------------------------------------------------ */

// Every place a shipped asset path is written down. `builds/` and
// `pointAndClickDesktop/` are generated output and are excluded by .gitignore,
// so they are regenerated rather than rewritten.
const REFERENCE_ROOTS = ['resources', 'src', 'e2e', 'test', 'scripts', 'utilities'];
const REFERENCE_FILES = [
    'constantsAndGlobalVars.js', 'game.js', 'events.js', 'ui.js', 'dialogue.js',
    'handleCommands.js', 'saveLoadGame.js', 'localization.js', 'pathFinding.js',
    'debugTools.js', 'index.html', 'styles.css',
];
const REFERENCE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.json', '.html', '.css']);

// The manifest is regenerated from the files on disk, so rewriting it here
// would only race with the next report.
const REFERENCE_EXCLUDE = new Set([path.join(RESOURCES, 'asset-manifest.json')]);

function collectReferenceFiles() {
    const files = [];
    for (const name of REFERENCE_FILES) {
        const absolute = path.join(ROOT, name);
        if (fs.existsSync(absolute)) files.push(absolute);
    }
    const walk = (directory) => {
        if (!fs.existsSync(directory)) return;
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const absolute = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === 'node_modules' || entry.name === 'source-art') continue;
                walk(absolute);
            } else if (REFERENCE_EXTENSIONS.has(path.extname(entry.name)) && !REFERENCE_EXCLUDE.has(absolute)) {
                files.push(absolute);
            }
        }
    };
    for (const root of REFERENCE_ROOTS) walk(path.join(ROOT, root));
    return files;
}

/**
 * Repoints every written-down reference at the re-exported file.
 *
 * The replacement is on the repository-relative path with forward slashes,
 * which is the form every reference already uses, so a `./`-prefixed and a bare
 * reference are both covered by the same substitution.
 */
function rewriteReferences(renames, { write }) {
    // Some references are written as a bare quoted filename rather than a path
    // — `foregroundsList` in `constantsAndGlobalVars.js` is the notable one —
    // so a second pass catches those. It is deliberately restricted to a
    // quoted whole filename, so it can never rewrite a substring of a longer
    // name or a path that the first pass has already handled.
    const basenames = new Map();
    for (const [from, to] of renames) {
        const fromName = path.posix.basename(from);
        const toName = path.posix.basename(to);
        if (fromName !== toName) basenames.set(fromName, toName);
    }

    const changed = [];
    for (const file of collectReferenceFiles()) {
        const original = fs.readFileSync(file, 'utf8');
        let updated = original;
        let hits = 0;
        for (const [from, to] of renames) {
            if (from === to || !updated.includes(from)) continue;
            hits += updated.split(from).length - 1;
            updated = updated.split(from).join(to);
        }
        for (const [fromName, toName] of basenames) {
            for (const quote of ['"', "'", '`']) {
                const from = `${quote}${fromName}${quote}`;
                if (!updated.includes(from)) continue;
                hits += updated.split(from).length - 1;
                updated = updated.split(from).join(`${quote}${toName}${quote}`);
            }
        }
        if (hits > 0) {
            changed.push({ file: path.relative(ROOT, file), hits });
            if (write) fs.writeFileSync(file, updated, 'utf8');
        }
    }
    return changed;
}

/* ------------------------------------------------------------------ *
 * Entry point
 * ------------------------------------------------------------------ */

async function main() {
    const write = process.argv.includes('--write');
    if (!write && !process.argv.includes('--plan')) {
        console.error('Pass --plan to preview or --write to export.');
        process.exitCode = 1;
        return;
    }

    const jobs = buildPlan();
    const { browser, page } = await openBrowser();

    const rows = [];
    let beforeTotal = 0;
    let afterTotal = 0;

    try {
        for (const job of jobs) {
            const result = await transcode(page, job.absolute, job.recipe);
            beforeTotal += job.beforeBytes;
            afterTotal += result.buffer.length;
            rows.push({ job, result });

            if (write) {
                fs.mkdirSync(path.dirname(job.targetAbsolute), { recursive: true });
                fs.writeFileSync(job.targetAbsolute, result.buffer);
                // Preserve the original under source-art, keeping its folder
                // structure so the pairing stays obvious.
                const preserved = path.join(SOURCE_ART, job.relative.replace(/^resources\//, ''));
                fs.mkdirSync(path.dirname(preserved), { recursive: true });
                fs.renameSync(job.absolute, preserved);
            }
        }
    } finally {
        await browser.close();
    }

    const renames = rows
        .map(({ job }) => [job.relative, job.target])
        .filter(([from, to]) => from !== to);
    const referenceChanges = rewriteReferences(renames, { write });

    rows.sort((a, b) => (b.job.beforeBytes - b.result.buffer.length) - (a.job.beforeBytes - a.result.buffer.length));

    console.log('| Asset | Role | Before | After | Saved |');
    console.log('| --- | --- | --- | --- | ---: |');
    for (const { job, result } of rows.slice(0, 30)) {
        const notes = [result.letterbox ? 'fitted, still off-aspect' : null, result.cropped ? 'cropped to subject' : null]
            .filter(Boolean).join(', ');
        console.log(
            `| \`${job.id}\` | ${job.role} | ${job.beforeSize} ${kb(job.beforeBytes)} | `
            + `${result.width}x${result.height} ${kb(result.buffer.length)}${notes ? ` (${notes})` : ''} | `
            + `${kb(job.beforeBytes - result.buffer.length)} |`,
        );
    }

    console.log('');
    console.log(`${renames.length} assets change filename; ${referenceChanges.length} files carry references to them:`);
    for (const change of referenceChanges.sort((a, b) => b.hits - a.hits)) {
        console.log(`  ${change.file} (${change.hits} references)`);
    }

    console.log('');
    console.log(`${rows.length} assets re-exported.`);
    console.log(`Before: ${(beforeTotal / 1048576).toFixed(1)} MB   After: ${(afterTotal / 1048576).toFixed(1)} MB   `
        + `Saved: ${((beforeTotal - afterTotal) / 1048576).toFixed(1)} MB `
        + `(${Math.round((1 - (afterTotal / beforeTotal)) * 100)}%)`);
    if (!write) console.log('\nNothing was written. Re-run with --write to apply.');
}

await main();
