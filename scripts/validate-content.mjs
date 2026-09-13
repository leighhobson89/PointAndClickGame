#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertValidContentBundle, formatHotspotReport, validateContentBundle } from '../src/content/validate-content.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const bundle = {
    contract: readJson('resources/content-contract.json'),
    grids: readJson('resources/screenWalkableJSONS/masterJSONData.json'),
    navigation: readJson('resources/screenNavigation.json'),
    objects: readJson('resources/objectsGame.json'),
    npcs: readJson('resources/npcGame.json'),
    dialogue: readJson('resources/dialogue.json'),
    localization: readJson('localization.json'),
    mapRoom: readJson('resources/mapRoom.json'),
    foregrounds: readJson('resources/screenWalkableJSONS/masterForegroundData.json'),
};

const result = validateContentBundle(bundle);
if (!result.valid) {
    console.error(`Content validation failed with ${result.errors.length} error(s):`);
    result.errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
}

const assetPaths = new Set();
const collectAssets = (value) => {
    if (typeof value === 'string' && value.startsWith('./resources/')) assetPaths.add(value.slice(2));
    else if (Array.isArray(value)) value.forEach(collectAssets);
    else if (value && typeof value === 'object') Object.values(value).forEach(collectAssets);
};
collectAssets(bundle.navigation);
collectAssets(bundle.objects);
collectAssets(bundle.npcs);
const missingAssets = [...assetPaths].filter((relativePath) => !fs.existsSync(path.join(root, relativePath)));
if (missingAssets.length) {
    console.error(`Content validation failed with ${missingAssets.length} missing asset(s):`);
    missingAssets.forEach((asset) => console.error(`- ${asset}`));
    process.exit(1);
}

const eventSource = fs.readFileSync(path.join(root, 'events.js'), 'utf8');
const missingActions = bundle.contract.runtimeActionIds.filter((actionId) =>
    !new RegExp(`(?:async\\s+)?function\\s+${actionId}\\s*\\(`).test(eventSource),
);
if (missingActions.length) {
    console.error(`Content validation failed with ${missingActions.length} missing runtime action implementation(s):`);
    missingActions.forEach((action) => console.error(`- ${action}`));
    process.exit(1);
}

if (process.argv.includes('--report-hotspots')) {
    const reportPath = path.join(root, 'docs', 'hotspot-report.md');
    fs.writeFileSync(reportPath, `${formatHotspotReport(assertValidContentBundle(bundle), bundle.contract)}\n`, 'utf8');
    console.log(`Hotspot report written to ${path.relative(root, reportPath)}.`);
}

console.log(`Content valid: ${bundle.contract.contentVersion}; ${bundle.contract.world.rooms.length} rooms, ${Object.keys(bundle.objects.objects).length} objects, ${Object.keys(bundle.npcs.npcs).length} NPCs, ${assetPaths.size} referenced assets.`);
if (result.warnings.length) console.log(`${result.warnings.length} non-blocking authoring warning(s); run npm run report:hotspots for details.`);
