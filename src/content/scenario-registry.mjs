// Reviewed debug/test scenario fixtures.
//
// Every fixture states only canonical facts plus explicit presentation setup.
// Exit statuses are derived from the content contract's gate facts; entity and
// grid mutations come from the small reviewed FACT_EFFECTS table below. No
// fixture copies a world-state blob.

import { createScenario, validateScenario } from '../domain/scenarios/scenarios.mjs';

/**
 * Fact -> concrete world mutation. Each path is a dotted property on the
 * shipped object/NPC record and is checked against live content by
 * `test/unit/scenario-rules.test.mjs`, so a content rename fails the suite
 * rather than silently producing an unreachable scenario.
 */
export const FACT_EFFECTS = Object.freeze({
    'library.riddleKnown': {
        npcs: [{ npcId: 'npcLibrarian', path: 'interactable.canTalk', value: false }],
        objects: [{ objectId: 'objectPileOfBooksLibraryFoyer', path: 'interactable.canHover', value: true }],
    },
    'library.researchKeyFound': {
        objects: [{ objectId: 'objectKeyResearchRoom', path: 'objectPlacementLocation', value: '' }],
        inventory: [{ objectId: 'objectKeyResearchRoom' }],
    },
    'library.researchRoomUnlocked': {
        objects: [{ objectId: 'objectDoorLibraryFoyerResearchRoom', path: 'interactable.activeStatus', value: true }],
    },
    'research.mapClueFound': {
        objects: [{ objectId: 'objectIllegibleMap', path: 'objectPlacementLocation', value: '' }],
        inventory: [{ objectId: 'objectIllegibleMap' }],
    },
    'den.unlocked': {
        objects: [{ objectId: 'objectDoorToDen', path: 'interactable.activeStatus', value: true }],
        inventory: [{ objectId: 'objectKeyToDen' }],
    },
    'barn.unblocked': {
        npcs: [{ npcId: 'npcDonkey', path: 'npcPlacementLocation', value: '' }],
        inventory: [{ objectId: 'objectDonkeyRope' }],
    },
    'rigging.assembled': {
        inventory: [{ objectId: 'objectRopeAndHook' }, { objectId: 'objectPulleyWheel' }],
    },
    'bridge.repairMaterialsReady': {
        objects: [{ objectId: 'objectStackOfWood', path: 'objectPlacementLocation', value: '' }],
        inventory: [{ objectId: 'objectRopeAndHookWithStackOfWood' }],
    },
    'bridge.repaired': {
        grids: [{ roomId: 'riverCrossing', variantId: 'riverCrossingBridgeComplete' }],
    },
    'river.wolfResolved': {
        npcs: [{ npcId: 'npcWolf', path: 'npcPlacementLocation', value: '' }],
    },
    'chapter1.mapReached': {
        objects: [{ objectId: 'objectChapterOneMap', path: 'interactable.canHover', value: true }],
    },
});

const facts = (...factIds) => Object.fromEntries([['chapter1.started', true], ...factIds.map((factId) => [factId, true])]);

const FIXTURES = [
    createScenario({
        id: 'chapter1.new-game',
        description: 'Exact clean player start in the Library Foyer.',
        seed: 1001,
        roomId: 'libraryFoyer',
        facts: facts(),
    }),
    createScenario({
        id: 'chapter1.library-riddle',
        description: 'Standing beside the librarian, immediately before the riddle choice.',
        seed: 1002,
        roomId: 'libraryFoyer',
        facts: facts(),
    }),
    createScenario({
        id: 'chapter1.research-unlock-ready',
        description: 'Riddle heard and research key carried; the player must still perform the unlock.',
        seed: 1003,
        roomId: 'libraryFoyer',
        facts: facts('library.riddleKnown', 'library.researchKeyFound'),
    }),
    createScenario({
        id: 'chapter1.town-open',
        description: 'Library tutorial complete; town exploration available.',
        seed: 1004,
        roomId: 'marketStreet',
        facts: facts('library.riddleKnown', 'library.researchKeyFound', 'library.researchRoomUnlocked', 'research.mapClueFound'),
    }),
    createScenario({
        id: 'chapter1.den-unlock-ready',
        description: 'Den key available in the alley; the player performs the gate interaction.',
        seed: 1005,
        roomId: 'alley',
        facts: facts('library.riddleKnown', 'library.researchKeyFound', 'library.researchRoomUnlocked', 'research.mapClueFound'),
    }),
    createScenario({
        id: 'chapter1.barn-unblock-ready',
        description: 'Donkey and carrot prerequisites positioned for the tested action.',
        seed: 1006,
        roomId: 'stables',
        facts: facts(),
        inventory: ['objectCarrot'],
    }),
    createScenario({
        id: 'chapter1.rigging-ready',
        description: 'Rope, pulley, and anchor prerequisites prepared at the river crossing.',
        seed: 1007,
        roomId: 'riverCrossing',
        facts: facts('library.riddleKnown', 'library.researchKeyFound', 'library.researchRoomUnlocked', 'research.mapClueFound', 'den.unlocked', 'barn.unblocked'),
    }),
    createScenario({
        id: 'chapter1.bridge-ready',
        description: 'Materials and puzzle facts ready; the player repairs the bridge.',
        seed: 1008,
        roomId: 'riverCrossing',
        facts: facts('library.riddleKnown', 'library.researchKeyFound', 'library.researchRoomUnlocked', 'research.mapClueFound', 'den.unlocked', 'barn.unblocked', 'rigging.assembled', 'bridge.repairMaterialsReady'),
    }),
    createScenario({
        id: 'chapter1.wolf-ready',
        description: 'Bridge repaired; the player performs the final obstacle resolution.',
        seed: 1009,
        roomId: 'riverCrossing',
        facts: facts('library.riddleKnown', 'library.researchKeyFound', 'library.researchRoomUnlocked', 'research.mapClueFound', 'den.unlocked', 'barn.unblocked', 'rigging.assembled', 'bridge.repairMaterialsReady', 'bridge.repaired'),
        inventory: ['objectBone'],
    }),
    createScenario({
        id: 'chapter1.map-entry',
        description: 'River gate resolved; the player walks into the Map overlook.',
        seed: 1010,
        roomId: 'riverCrossing',
        facts: facts('library.riddleKnown', 'library.researchKeyFound', 'library.researchRoomUnlocked', 'research.mapClueFound', 'den.unlocked', 'barn.unblocked', 'rigging.assembled', 'bridge.repairMaterialsReady', 'bridge.repaired', 'river.wolfResolved'),
    }),
    createScenario({
        id: 'system.inventory-full',
        description: 'Twelve carried items: ten visible slots plus overflow for scrolling and layout.',
        seed: 2001,
        roomId: 'marketStreet',
        facts: facts(),
        inventory: [
            'objectKeyResearchRoom', 'objectKeyToDen', 'objectIllegibleMap', 'objectCrowbar',
            'objectBowl', 'objectCarrot', 'objectGlove', 'objectMallet',
            'objectNails', 'objectPliers', 'objectPitchFork', 'objectMilkBottle',
        ],
    }),
    createScenario({
        id: 'system.long-localisation',
        description: 'German locale with slow text, used for the longest labels and dialogue lines.',
        seed: 2002,
        roomId: 'libraryFoyer',
        locale: 'de',
        facts: facts(),
        presentation: { textSpeed: 'slow' },
        simulate: { longLocalisation: true },
    }),
    createScenario({
        id: 'system.corrupt-save',
        description: 'Clean state used to drive the invalid and legacy save fixtures.',
        seed: 2003,
        roomId: 'libraryFoyer',
        facts: facts(),
        simulate: { saveFixture: 'corrupt' },
    }),
    createScenario({
        id: 'system.asset-failure',
        description: 'One declared background asset fails predictably during the next room change.',
        seed: 2004,
        roomId: 'libraryFoyer',
        facts: facts(),
        simulate: { assetFailure: './resources/backgrounds/marketStreet.png' },
    }),
];

export const SCENARIOS = Object.freeze(Object.fromEntries(FIXTURES.map((scenario) => [scenario.id, scenario])));

export const INVENTORY_PRESETS = Object.freeze({
    empty: Object.freeze([]),
    libraryTutorial: Object.freeze(['objectKeyResearchRoom']),
    riggingKit: Object.freeze(['objectRopeAndHook', 'objectPulleyWheel', 'objectDonkeyRope']),
    fullTwelve: Object.freeze(SCENARIOS['system.inventory-full'].inventory.map((entry) => entry.objectId)),
});

/**
 * Save fixtures used by the migration and corruption controls. `current` and
 * `legacy` are shaped by the save schema; `corrupt` is deliberately invalid.
 */
export const SAVE_MIGRATION_FIXTURES = Object.freeze({
    current: { schemaVersion: 1 },
    legacy: { schemaVersion: 0 },
    corrupt: { schemaVersion: 99 },
});

export function listScenarios() {
    return Object.values(SCENARIOS).map((scenario) => Object.freeze({
        id: scenario.id,
        description: scenario.description,
        roomId: scenario.roomId,
        seed: scenario.seed,
        factCount: Object.keys(scenario.facts).length,
    }));
}

export function getScenario(scenarioId) {
    return SCENARIOS[scenarioId] ?? null;
}

export function validateRegistry(context) {
    const errors = [];
    for (const scenario of Object.values(SCENARIOS)) {
        for (const error of validateScenario(scenario, context)) errors.push(`${scenario.id}: ${error}`);
    }
    return errors;
}
