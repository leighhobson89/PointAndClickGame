import { SCENARIO_SCHEMA_VERSION } from '../domain/scenarios/scenarios.mjs';
import { SAVE_SCHEMA_VERSION, validateSaveEnvelope } from '../domain/save/save-format.mjs';

export const CONTENT_SCHEMA_VERSION = 1;
export { SAVE_SCHEMA_VERSION, SCENARIO_SCHEMA_VERSION };

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isId = (value) => typeof value === 'string' && /^[a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9-]+)*$/.test(value);

export const contentSchemas = Object.freeze({
    navigationRoom: Object.freeze({
        required: ['bgUrl', 'alreadyVisited', 'screenTilesWidebgImg', 'scalingPlayerSpeed', 'scalingPlayerSize', 'exits'],
    }),
    grid: Object.freeze({ width: 80, height: 60, cellPattern: /^(?:n|w(?:1\d\d|2[0-4]\d|25[0-5])|e[1-9])$/ }),
    entity: Object.freeze({
        required: ['name', 'interactable', 'activeSpriteUrl', 'spriteUrl', 'gridPosition', 'dimensions'],
    }),
    dialogue: Object.freeze({ root: 'dialogue' }),
    dialogueGraph: Object.freeze({ required: ['id', 'startNodeId', 'nodes'] }),
    localisation: Object.freeze({ locales: ['en', 'es', 'de', 'it', 'fr'] }),
    puzzleAction: Object.freeze({ required: ['id', 'requires', 'effects'] }),
    // The save shape is not listed here: it is owned by
    // domain/save/save-format.mjs, and a second copy of its required keys would
    // be a duplicate that could drift.
    scenario: Object.freeze({ required: ['schemaVersion', 'id', 'seed', 'facts'] }),
});

function validateRequiredObject(value, required, label) {
    const errors = [];
    if (!isObject(value)) return [`${label} must be an object`];
    for (const key of required) {
        if (!(key in value)) errors.push(`${label}.${key} is required`);
    }
    return errors;
}

/**
 * Minimal transport envelope for a scenario. The complete fixture rules,
 * including room/fact/inventory/presentation checks, live in
 * `src/domain/scenarios/scenarios.mjs` and share this version constant.
 */
export function validateScenarioSchema(value) {
    const errors = validateRequiredObject(value, contentSchemas.scenario.required, 'scenario');
    if (value?.schemaVersion !== SCENARIO_SCHEMA_VERSION) errors.push(`scenario.schemaVersion must be ${SCENARIO_SCHEMA_VERSION}`);
    if (!isId(value?.id)) errors.push('scenario.id must be a stable ID');
    if (!Number.isInteger(value?.seed)) errors.push('scenario.seed must be an integer');
    if (!isObject(value?.facts)) errors.push('scenario.facts must be an object');
    return errors;
}

/**
 * The save shape is owned by `domain/save/save-format.mjs`; this stays as the
 * content-validation entry point so one command still checks every schema.
 */
export function validateSaveSchema(value) {
    return validateSaveEnvelope(value).errors;
}

export function validatePuzzleActionSchema(value, label = 'puzzle action') {
    const errors = validateRequiredObject(value, contentSchemas.puzzleAction.required, label);
    if (!isId(value?.id)) errors.push(`${label}.id must be a stable ID`);
    for (const key of ['requires', 'effects']) {
        if (!Array.isArray(value?.[key]) || value[key].some((fact) => !isId(fact))) {
            errors.push(`${label}.${key} must contain stable fact IDs`);
        }
    }
    return errors;
}

export function validateMapRoomSchema(value) {
    const errors = validateRequiredObject(
        value,
        ['schemaVersion', 'roomId', 'width', 'height', 'defaultCell', 'walkablePolygon', 'walkableCell', 'exits'],
        'map room',
    );
    if (value?.schemaVersion !== CONTENT_SCHEMA_VERSION) errors.push(`map room schemaVersion must be ${CONTENT_SCHEMA_VERSION}`);
    if (value?.roomId !== 'map') errors.push("map room roomId must be 'map'");
    if (value?.width !== 80 || value?.height !== 60) errors.push('map room must be 80 x 60 cells');
    if (!Array.isArray(value?.walkablePolygon) || value.walkablePolygon.length < 3) errors.push('map room needs a walkable polygon');
    if (!Array.isArray(value?.exits) || value.exits.length === 0) errors.push('map room needs at least one exit');
    return errors;
}
