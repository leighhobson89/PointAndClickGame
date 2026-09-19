#!/usr/bin/env node

// Objective visual audit for the wired four-direction player walk.
//
//   node scripts/player-gait-audit.mjs
//
// The audit decodes the actual runtime PNGs in Chromium, checks registration
// and lateral stance progression from their pixels, and writes a four-row
// contact sheet plus JSON/Markdown evidence under test-reports/art/.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAME_ROOT = path.join(ROOT, 'resources', 'redesign', 'section-02-player', 'frames');
const OUTPUT_ROOT = path.join(ROOT, 'test-reports', 'art');
const DIRECTIONS = ['left', 'right', 'up', 'down'];
const frames = DIRECTIONS.flatMap((direction) => Array.from({ length: 9 }, (_, index) => ({
    direction,
    number: index + 1,
    id: `move${index + 1}_${direction}`,
    path: path.join(FRAME_ROOT, `move${index + 1}_${direction}.png`),
})));

function strictlyFalls(values) {
    return values.every((value, index) => index === 0 || value < values[index - 1]);
}

function strictlyRises(values) {
    return values.every((value, index) => index === 0 || value > values[index - 1]);
}

async function analyse(page, frame) {
    const href = pathToFileURL(frame.path).href;
    return page.evaluate(async ({ source, id, direction, number }) => {
        const image = new Image();
        image.src = source;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const threshold = 48; // Contact shadows are deliberately below this.
        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < canvas.height; y += 1) {
            for (let x = 0; x < canvas.width; x += 1) {
                if (pixels[((y * canvas.width + x) * 4) + 3] < threshold) continue;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }

        const drawnHeight = maxY - minY + 1;
        const span = (fromY, toY) => {
            let left = canvas.width;
            let right = -1;
            for (let y = Math.max(minY, fromY); y <= Math.min(maxY, toY); y += 1) {
                for (let x = 0; x < canvas.width; x += 1) {
                    if (pixels[((y * canvas.width + x) * 4) + 3] < threshold) continue;
                    left = Math.min(left, x);
                    right = Math.max(right, x);
                }
            }
            return right < left ? 0 : right - left + 1;
        };
        const groundColumns = [];
        for (let x = 0; x < canvas.width; x += 1) {
            let occupied = false;
            for (let y = Math.max(minY, maxY - 10); y <= maxY; y += 1) {
                if (pixels[((y * canvas.width + x) * 4) + 3] >= threshold) {
                    occupied = true;
                    break;
                }
            }
            groundColumns.push(occupied);
        }
        let groundContacts = 0;
        let emptyRun = 3;
        for (const occupied of groundColumns) {
            if (occupied && emptyRun > 2) groundContacts += 1;
            emptyRun = occupied ? 0 : emptyRun + 1;
        }

        return {
            id,
            direction,
            number,
            width: canvas.width,
            height: canvas.height,
            baseline: maxY,
            drawnHeight,
            drawnWidth: maxX - minX + 1,
            stanceWidth: span(maxY - Math.round(drawnHeight * 0.055), maxY),
            groundContacts,
            lowerBodyWidth: span(
                minY + Math.round(drawnHeight * 0.56),
                minY + Math.round(drawnHeight * 0.93),
            ),
        };
    }, { source: href, id: frame.id, direction: frame.direction, number: frame.number });
}

async function renderContactSheet(page, outputPath) {
    await page.setViewportSize({ width: 1320, height: 1520 });
    await page.evaluate(({ rows, sources }) => {
        document.head.innerHTML = `<style>
            html, body { margin: 0; background: #211a16; color: #f5e7ce; font: 16px Georgia, serif; }
            body { padding: 28px; }
            h1 { margin: 0 0 8px; font-size: 28px; }
            p { margin: 0 0 22px; color: #cdbda7; }
            section { display: grid; grid-template-columns: 74px repeat(9, 1fr); align-items: end; margin: 0 0 20px; }
            h2 { align-self: center; margin: 0; text-transform: capitalize; font-size: 19px; }
            figure { margin: 0; text-align: center; background: repeating-conic-gradient(#302820 0 25%, #382f26 0 50%) 0 / 18px 18px; border-bottom: 1px solid #75634e; }
            img { display: block; width: 122px; height: 163px; object-fit: contain; }
            figcaption { padding: 4px; background: #17120fdd; font: 12px system-ui, sans-serif; }
            .passing { outline: 3px solid #d9a82f; outline-offset: -3px; }
        </style>`;
        document.body.innerHTML = '<h1>Player walk-cycle audit</h1><p>Runtime frames 1–9. Gold marks the lateral passing/crossover pose.</p>';
        for (const direction of rows) {
            const section = document.createElement('section');
            section.innerHTML = `<h2>${direction}</h2>`;
            for (let number = 1; number <= 9; number += 1) {
                const id = `move${number}_${direction}`;
                const figure = document.createElement('figure');
                if ((direction === 'left' || direction === 'right') && number === 5) figure.className = 'passing';
                figure.innerHTML = `<img src="${sources[id]}"><figcaption>${number}</figcaption>`;
                section.append(figure);
            }
            document.body.append(section);
        }
    }, {
        rows: DIRECTIONS,
        sources: Object.fromEntries(frames.map((frame) => [frame.id, pathToFileURL(frame.path).href])),
    });
    await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0));
    await page.screenshot({ path: outputPath, fullPage: true });
}

function markdown(report) {
    const lines = [
        '# Player walk-cycle audit', '',
        `Generated ${report.generatedAt}.`, '',
        `- Canvas: ${report.canvas}`,
        `- Subject baseline spread: ${report.baselineSpread}px`,
        `- Subject-height spread: ${report.heightSpread}px (${report.heightSpreadPercent.toFixed(2)}%)`,
        `- Left stance widths: ${report.lateral.left.join(', ')}`,
        `- Right stance widths: ${report.lateral.right.join(', ')}`,
        `- Passing/contact ratio: left ${report.lateral.leftPassingRatio.toFixed(3)}, right ${report.lateral.rightPassingRatio.toFixed(3)}`,
        `- Ground contacts (frame 1 → passing → frame 9): left ${report.lateral.leftGroundContacts.join(' → ')}, right ${report.lateral.rightGroundContacts.join(' → ')}`,
        '',
        'The lateral sequence closes monotonically from contact into frame 5 and opens monotonically from frame 5 into the opposite contact. Frame 5 has the narrow, single-support silhouette expected from the visible leg crossover.', '',
    ];
    return `${lines.join('\n')}\n`;
}

fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
for (const frame of frames) assert.ok(fs.existsSync(frame.path), `Missing ${frame.path}`);

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href);

try {
    const metrics = [];
    for (const frame of frames) metrics.push(await analyse(page, frame));

    assert.deepEqual([...new Set(metrics.map(({ width, height }) => `${width}x${height}`))], ['280x375']);
    const baselines = metrics.map((frame) => frame.baseline);
    const heights = metrics.map((frame) => frame.drawnHeight);
    const baselineSpread = Math.max(...baselines) - Math.min(...baselines);
    const heightSpread = Math.max(...heights) - Math.min(...heights);
    const heightSpreadPercent = (heightSpread / Math.max(...heights)) * 100;
    assert.ok(baselineSpread <= 7, `Baseline spread ${baselineSpread}px exceeds 2% of the canvas height`);
    assert.ok(heightSpreadPercent <= 5, `Height spread ${heightSpreadPercent.toFixed(2)}% exceeds 5%`);

    const stanceFor = (direction) => metrics
        .filter((frame) => frame.direction === direction)
        .sort((left, right) => left.number - right.number)
        .map((frame) => frame.stanceWidth);
    const left = stanceFor('left');
    const right = stanceFor('right');
    for (const [direction, widths] of [['left', left], ['right', right]]) {
        assert.ok(strictlyFalls(widths.slice(0, 5)), `${direction} stance must close into the passing pose: ${widths}`);
        assert.ok(strictlyRises(widths.slice(4)), `${direction} stance must open out of the passing pose: ${widths}`);
        assert.ok(widths[4] / Math.max(widths[0], widths[8]) <= 0.55,
            `${direction} passing pose is not narrow enough to read as crossover: ${widths}`);
        const sideFrames = metrics
            .filter((frame) => frame.direction === direction)
            .sort((a, b) => a.number - b.number);
        assert.ok(sideFrames[0].groundContacts >= 2 && sideFrames[8].groundContacts >= 2,
            `${direction} contact poses must ground both separated boots`);
        assert.equal(sideFrames[4].groundContacts, 1,
            `${direction} crossover must have one planted boot and one passing boot`);
    }

    const report = {
        generatedAt: new Date().toISOString(),
        canvas: '280x375',
        baselineSpread,
        heightSpread,
        heightSpreadPercent,
        lateral: {
            left,
            right,
            leftPassingRatio: left[4] / Math.max(left[0], left[8]),
            rightPassingRatio: right[4] / Math.max(right[0], right[8]),
            leftGroundContacts: [1, 5, 9].map((number) => metrics.find((frame) => frame.id === `move${number}_left`).groundContacts),
            rightGroundContacts: [1, 5, 9].map((number) => metrics.find((frame) => frame.id === `move${number}_right`).groundContacts),
        },
        frames: metrics,
    };
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'player-walk-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'player-walk-audit.md'), markdown(report));
    await renderContactSheet(page, path.join(OUTPUT_ROOT, 'player-walk-cycle.png'));
    console.log(markdown(report));
    console.log(`Contact sheet: ${path.join(OUTPUT_ROOT, 'player-walk-cycle.png')}`);
} finally {
    await browser.close();
}
