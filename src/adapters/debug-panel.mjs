// DEBUG panel.
//
// The panel is built in JavaScript, never shipped in index.html, and is only
// constructed by `debugTools.js` after the build capability and an explicit
// request both agree. Every control calls the same debug controller the
// `__GAME_TEST__` API uses, so a button can never do something a test cannot.

import { OVERLAY_IDS } from './debug-overlays.mjs';

export const DEBUG_PANEL_ID = 'debugPanel';
const WATERMARK_TEXT = 'DEBUG BUILD — NOT FOR PLAY';

const PANEL_STYLE = `
/* Above every in-game layer, including the fixed canvas border art. */
#${DEBUG_PANEL_ID} {
    position: fixed; top: 24px; left: 24px; z-index: 2147483000; width: 340px; max-height: 86vh;
    overflow-y: auto; background: rgba(18, 18, 22, 0.96); color: #f2f2f2;
    border: 2px solid #ffd400; border-radius: 8px; padding: 8px 10px 12px;
    font: 12px/1.45 "Segoe UI", system-ui, sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
#${DEBUG_PANEL_ID}[hidden] { display: none !important; }
#${DEBUG_PANEL_ID} .debug-watermark {
    position: sticky; top: 0; margin: -8px -10px 8px; padding: 4px 10px;
    background: repeating-linear-gradient(45deg, #ffd400, #ffd400 10px, #b39400 10px, #b39400 20px);
    color: #1a1a1a; font-weight: 700; letter-spacing: 0.08em; cursor: move; text-transform: uppercase;
}
#${DEBUG_PANEL_ID} h3 { font-size: 12px; margin: 10px 0 4px; color: #ffd400; text-transform: uppercase; letter-spacing: 0.06em; }
#${DEBUG_PANEL_ID} .debug-row { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; align-items: center; }
#${DEBUG_PANEL_ID} button { background: #2f3140; color: #f2f2f2; border: 1px solid #575a6e; border-radius: 4px; padding: 3px 7px; cursor: pointer; font-size: 11px; }
#${DEBUG_PANEL_ID} button:hover { background: #3d4055; }
#${DEBUG_PANEL_ID} select, #${DEBUG_PANEL_ID} input { background: #15161c; color: #f2f2f2; border: 1px solid #575a6e; border-radius: 4px; padding: 2px 4px; font-size: 11px; max-width: 100%; }
#${DEBUG_PANEL_ID} label { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; }
#${DEBUG_PANEL_ID} pre { background: #0e0f14; border: 1px solid #33364a; border-radius: 4px; padding: 6px; margin: 0; max-height: 190px; overflow: auto; white-space: pre-wrap; word-break: break-word; font-size: 10px; }
`;

function element(tagName, properties = {}, children = []) {
    const node = document.createElement(tagName);
    for (const [key, value] of Object.entries(properties)) {
        if (key === 'dataset') Object.assign(node.dataset, value);
        else if (key === 'text') node.textContent = value;
        else node.setAttribute(key, value);
    }
    for (const child of children) node.append(child);
    return node;
}

function button(controlId, label, onClick) {
    const node = element('button', { type: 'button', text: label, dataset: { debugControl: controlId } });
    node.addEventListener('click', onClick);
    return node;
}

function select(controlId, values, { labelledValues = null } = {}) {
    const node = element('select', { dataset: { debugControl: controlId }, 'aria-label': controlId });
    for (const value of values) {
        const option = element('option', { value, text: labelledValues?.[value] ?? value });
        node.append(option);
    }
    return node;
}

function section(title, rows) {
    return element('section', {}, [element('h3', { text: title }), ...rows]);
}

function row(children) {
    return element('div', { class: 'debug-row' }, children);
}

export function createDebugPanel(controller, { root = document.body, toggleKey = 'NumpadSubtract' } = {}) {
    if (!controller?.apiVersion) throw new TypeError('createDebugPanel requires a debug controller');

    const style = element('style', { text: PANEL_STYLE, dataset: { debugControl: 'panelStyle' } });
    style.textContent = PANEL_STYLE;
    const output = element('pre', { dataset: { debugControl: 'output' }, 'aria-live': 'polite' });
    const watermark = element('div', { class: 'debug-watermark', text: WATERMARK_TEXT, dataset: { debugControl: 'watermark' } });
    const panel = element('div', { id: DEBUG_PANEL_ID, role: 'region', 'aria-label': 'Debug controls', hidden: 'hidden' });

    const show = (value) => {
        output.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 1);
        return value;
    };
    const run = (work) => Promise.resolve()
        .then(work)
        .then(show)
        .catch((error) => show({ error: error.message }));

    const scenarioSelect = select('scenario', controller.listScenarios().map((scenario) => scenario.id));
    const roomSelect = select('room', controller.listRooms().map((entry) => entry.roomId));
    const itemSelect = select('item', controller.listObjectIds());
    const presetSelect = select('inventoryPreset', controller.listInventoryPresets());
    const verbSelect = select('verb', ['walkTo', 'lookAt', 'pickUp', 'use', 'open', 'close', 'push', 'pull', 'talkTo', 'give']);
    const npcSelect = select('npc', controller.listNpcIds());
    const actionSelect = select('milestone', controller.listActionIds());
    const localeSelect = select('locale', controller.listLocales());
    const migrationSelect = select('migrationFixture', controller.listMigrationFixtures());
    const movementSelect = select('movementSpeed', ['slow', 'normal', 'fast', 'instant']);
    const textSpeedSelect = select('textSpeed', ['slow', 'normal', 'fast', 'instant']);
    const viewportSelect = select('viewport', ['1280x720', '1440x900', '1920x1080', '834x1112']);
    const inputModeSelect = select('inputMode', ['pointer', 'keyboard', 'touch']);
    const seedInput = element('input', { type: 'number', value: '12345', dataset: { debugControl: 'seed' }, 'aria-label': 'seed' });
    const coordinateInput = element('input', { type: 'text', value: '', placeholder: 'x,y', size: '7', dataset: { debugControl: 'coordinate' }, 'aria-label': 'teleport coordinate' });
    const snapshotInput = element('textarea', { rows: '2', dataset: { debugControl: 'snapshot' }, 'aria-label': 'snapshot JSON', style: 'width:100%' });

    // Content can be reloaded between sessions, so refresh the data-driven
    // selects whenever the panel is opened or the summary is requested.
    const populate = () => {
        for (const [node, values] of [
            [itemSelect, controller.listObjectIds()],
            [actionSelect, controller.listActionIds()],
            [npcSelect, controller.listNpcIds()],
            [roomSelect, controller.listRooms().map((entry) => entry.roomId)],
        ]) {
            if (!values.length || node.options.length === values.length) continue;
            const selected = node.value;
            node.replaceChildren(...values.map((value) => element('option', { value, text: value })));
            if (values.includes(selected)) node.value = selected;
        }
        return controller.inspectSummary();
    };

    const overlayState = {};
    const overlayToggles = OVERLAY_IDS.map((overlayId) => {
        const input = element('input', { type: 'checkbox', dataset: { debugControl: `overlay.${overlayId}` } });
        input.addEventListener('change', () => {
            overlayState[overlayId] = input.checked;
            show(controller.setOverlays?.({ ...overlayState }) ?? overlayState);
        });
        return element('label', {}, [input, document.createTextNode(overlayId)]);
    });

    panel.append(
        watermark,
        section('Session', [
            row([
                button('newSession', 'New clean session', () => run(() => controller.newSession())),
                button('pause', 'Pause', () => run(() => controller.pause())),
                button('resume', 'Resume', () => run(() => controller.resume())),
            ]),
            row([scenarioSelect, button('loadScenario', 'Load', () => run(() => controller.loadScenario(scenarioSelect.value)))]),
            row([
                button('reloadScenario', 'Reset scenario', () => run(() => controller.reloadScenario())),
                button('validateScenario', 'Validate fixture', () => run(() => controller.validateScenarioFixture(scenarioSelect.value))),
            ]),
            row([seedInput, button('setSeed', 'Set seed', () => run(() => controller.setSeed(Number.parseInt(seedInput.value, 10))))]),
            row([
                button('exportSnapshot', 'Export snapshot', () => run(() => { const snapshot = controller.exportSnapshot(); snapshotInput.value = JSON.stringify(snapshot); return snapshot; })),
                button('importSnapshot', 'Import snapshot', () => run(() => controller.importSnapshot(JSON.parse(snapshotInput.value)))),
            ]),
            row([snapshotInput]),
            row([button('showVersions', 'Schema version + checksum', () => run(() => ({
                debugApiVersion: controller.apiVersion,
                scenarioSchemaVersion: controller.scenarioSchemaVersion,
                stateSchemaVersion: controller.stateSchemaVersion,
                checksum: controller.checksum(),
            })))]),
        ]),
        section('Location and movement', [
            row([roomSelect, coordinateInput, button('teleport', 'Teleport', () => {
                const [x, y] = coordinateInput.value.split(',').map((part) => Number.parseInt(part.trim(), 10));
                return run(() => controller.teleport({ roomId: roomSelect.value, x: Number.isInteger(x) ? x : null, y: Number.isInteger(y) ? y : null }));
            })]),
            row([button('listAnchors', 'List anchors', () => run(() => controller.listAnchors(roomSelect.value)))]),
            row([
                button('completePath', 'Complete path', () => run(() => controller.completePath())),
                button('cancelPath', 'Cancel path', () => run(() => controller.cancelPath())),
            ]),
            row([movementSelect, button('setMovementSpeed', 'Set movement speed', () => run(() => controller.setMovementSpeed(movementSelect.value)))]),
        ]),
        section('Overlays', [
            row(overlayToggles),
            row([
                button('toggleLegacyGridView', 'Legacy grid view', () => run(() => controller.toggleLegacyGridView())),
                button('toggleNonPlayerAnimation', 'Toggle NPC animation', () => run(() => controller.toggleNonPlayerAnimation())),
                button('openLegacyDebugWindow', 'Open value window', () => run(() => controller.openLegacyDebugWindow())),
            ]),
        ]),
        section('Inventory and verbs', [
            row([itemSelect, button('addItem', 'Add', () => run(() => controller.addItem(itemSelect.value))), button('removeItem', 'Remove', () => run(() => controller.removeItem(itemSelect.value)))]),
            row([presetSelect, button('applyInventoryPreset', 'Apply preset', () => run(() => controller.applyInventoryPreset(presetSelect.value)))]),
            row([button('listInventory', 'List inventory', () => run(() => controller.listInventory()))]),
            row([verbSelect, button('selectVerb', 'Select verb', () => run(() => controller.selectVerb(verbSelect.value)))]),
            row([button('selectTarget', 'Select target (item)', () => run(() => controller.selectTarget(itemSelect.value))), button('cancelCommand', 'Cancel', () => run(() => controller.cancelCommand()))]),
            row([button('resetEntity', 'Reset selected entity', () => run(() => controller.resetEntity(itemSelect.value))), button('currentCommand', 'Show intent', () => run(() => controller.currentCommand()))]),
        ]),
        section('Dialogue and characters', [
            row([npcSelect, button('startDialogue', 'Start conversation', () => run(() => controller.startDialogue(npcSelect.value)))]),
            row([button('describeDialogue', 'Choices and conditions', () => run(() => controller.describeDialogue(npcSelect.value))), button('inspectNpc', 'Inspect NPC', () => run(() => controller.inspectNpc(npcSelect.value)))]),
            row([textSpeedSelect, button('setTextSpeed', 'Set text speed', () => run(() => controller.setTextSpeed(textSpeedSelect.value)))]),
            row([button('skipDialogueLine', 'Skip line', () => run(() => controller.skipDialogueLine())), button('resetConversation', 'Reset conversation', () => run(() => controller.resetConversation(npcSelect.value)))]),
        ]),
        section('Puzzles and quests', [
            row([button('listFacts', 'List facts', () => run(() => controller.listFacts()))]),
            row([actionSelect, button('applyMilestone', 'Apply milestone', () => run(() => controller.applyMilestone(actionSelect.value)))]),
            row([button('explainAction', 'Explain availability', () => run(() => controller.explainAction(actionSelect.value))), button('factConflicts', 'Validate facts', () => run(() => controller.factConflicts()))]),
            row([button('criticalPathFrontier', 'Critical-path frontier', () => run(() => controller.criticalPathFrontier())), button('revertToScenario', 'Revert to scenario', () => run(() => controller.revertToScenario(scenarioSelect.value)))]),
        ]),
        section('Save, localisation, presentation', [
            row([button('saveScenario', 'Save through repository', () => run(() => controller.saveScenario('debug.scenario'))), button('loadSavedScenario', 'Load saved', () => run(() => controller.loadSavedScenario('debug.scenario')))]),
            row([migrationSelect, button('selectMigrationFixture', 'Use migration fixture', () => run(() => controller.selectMigrationFixture(migrationSelect.value)))]),
            row([localeSelect, button('setLocale', 'Switch locale', () => run(() => controller.setLocale(localeSelect.value))), button('simulateMissingKey', 'Missing key', () => run(() => controller.simulateMissingKey('ui.headerStringSave')))]),
            row([viewportSelect, button('setViewportPreset', 'Viewport', () => run(() => controller.setViewportPreset(viewportSelect.value)))]),
            row([
                button('toggleHighContrast', 'High contrast', () => run(() => controller.setAccessibilityOption('highContrast', 'toggle'))),
                button('toggleReducedMotion', 'Reduced motion', () => run(() => controller.setAccessibilityOption('reducedMotion', 'toggle'))),
                button('toggleTextScale', 'Text scale', () => run(() => controller.setAccessibilityOption('textScale', 'toggle'))),
            ]),
            row([inputModeSelect, button('setInputMode', 'Input mode', () => run(() => controller.setInputMode(inputModeSelect.value)))]),
            row([
                button('simulateAssetFailure', 'Fail next asset', () => run(() => controller.simulateAssetFailure('./resources/backgrounds/marketStreet.png'))),
                button('simulateStorageFailure', 'Fail storage', () => run(() => controller.simulateStorageFailure(true))),
            ]),
        ]),
        section('Diagnostics', [
            row([
                button('inspectSummary', 'Current state', () => run(() => populate())),
                button('waitForIdle', 'Wait for idle', () => run(() => controller.waitForIdle())),
            ]),
            row([
                button('showLog', 'Action log', () => run(() => controller.log())),
                button('clearLog', 'Clear log', () => run(() => controller.clearLog())),
                button('exportReproductionBundle', 'Reproduction bundle', () => run(() => controller.exportReproductionBundle())),
            ]),
            row([output]),
        ]),
    );

    root.append(style, panel);
    populate();

    // Dragging by the watermark bar keeps the classic movable debug window.
    let dragOffset = null;
    const onPointerDown = (event) => {
        dragOffset = { x: event.clientX - panel.getBoundingClientRect().left, y: event.clientY - panel.getBoundingClientRect().top };
    };
    const onPointerMove = (event) => {
        if (!dragOffset) return;
        panel.style.left = `${event.clientX - dragOffset.x}px`;
        panel.style.top = `${event.clientY - dragOffset.y}px`;
    };
    const onPointerUp = () => { dragOffset = null; };
    const onKeyDown = (event) => { if (event.code === toggleKey) togglePanel(); };
    const onMouseDown = (event) => { if (event.button === 1) togglePanel(); };

    function togglePanel(force) {
        panel.hidden = force === undefined ? !panel.hidden : !force;
        if (!panel.hidden) populate();
        return !panel.hidden;
    }

    watermark.addEventListener('mousedown', onPointerDown);
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);

    return Object.freeze({
        element: panel,
        toggle: togglePanel,
        isVisible: () => !panel.hidden,
        refresh: populate,
        dispose() {
            watermark.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('mousemove', onPointerMove);
            document.removeEventListener('mouseup', onPointerUp);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('mousedown', onMouseDown);
            panel.remove();
            style.remove();
        },
    });
}
