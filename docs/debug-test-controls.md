# Debug and test controls

Status: **implemented (2026-09-13)**. This document now describes shipped behaviour. Anything still planned is marked as such.

## Goal

Provide a deterministic, validated way for developers and automated tests to reach any meaningful player experience in seconds. The system arranges state through the same canonical state model the game uses, and is unavailable in ordinary production play.

## Principles

- One state model: debug tools dispatch supported actions or load a validated scenario; they do not maintain parallel flags.
- Stable semantic IDs: controls refer to `roomId`, `itemId`, `dialogueNodeId`, and `factId`, never translated labels.
- Reproducible: each scenario has a schema version, explicit seed, state checksum, and known starting position.
- Safe: tools are served only when explicitly enabled, carry a visible DEBUG watermark, and are absent from release builds.
- Inspectable: invalid combinations are refused with useful prerequisite/conflict messages.
- E2E integrity: state setup may skip prerequisites, but the behaviour under test is completed through actual player UI input.

## Enablement

Two independent gates must agree. Either one alone enables nothing.

1. **Build capability.** The server answers `GET /debug-capability` with `{ "enabled": true }` only when `GAME_DEBUG_TOOLS=1`. When it is off, the server also returns HTTP 404 for every path in `scripts/debug-only-paths.cjs`, so a release build cannot even fetch the debug bootstrap. Start a development server with `npm run start:debug`.
2. **Session request.** The page installs nothing unless the URL carries `?debug=1` or a test bootstrap set `window.__GAME_TEST_CONFIG__.enabled = true`.

Development URL: `http://127.0.0.1:4173/index.html?debug=1`.

Test bootstrap:

```js
await page.addInitScript(() => {
    window.__GAME_TEST_CONFIG__ = { enabled: true, seed: 12345, showPanel: false };
});
await page.goto('http://127.0.0.1:4175/index.html');
await page.locator('#btnEnglish').click();
await page.locator('#newGame').click();
await page.evaluate(() => window.__GAME_TEST__.loadScenario('chapter1.bridge-ready'));
```

`e2e/_support/debug-session.cjs` wraps this as `openDebugGame(page)` and `loadScenario(page, id)`.

### Where the code lives

| Concern | Module | Boundary |
| --- | --- | --- |
| Scenario schema, validation, checksum, seeded RNG, fact-derived mutations, critical-path frontier | `src/domain/scenarios/scenarios.mjs` | domain (also used by the content schema boundary, so it ships) |
| Reviewed fixtures, fact-effect table, inventory presets, save fixtures | `src/content/scenario-registry.mjs` | content, debug-only |
| Every debug behaviour that does not need the DOM | `src/application/debug-controller.mjs` | application, debug-only |
| Named idle probes and `waitForIdle` | `src/application/idle.mjs` | application, debug-only |
| DEBUG-watermarked panel | `src/adapters/debug-panel.mjs` | adapter, debug-only |
| Additive canvas overlays | `src/adapters/debug-overlays.mjs` | adapter, debug-only |
| Wiring to the legacy runtime and the `__GAME_TEST__` surface | `debugTools.js` | composition, debug-only |

The panel and `__GAME_TEST__` are two presentations of one controller, so a button can never do something a test cannot, and neither can drift from the other.

## The `__GAME_TEST__` surface

```js
window.__GAME_TEST__ = {
    apiVersion: 1,
    scenarioSchemaVersion: 1,
    stateSchemaVersion: 1,
    listScenarios(), validateScenario(id, overrides), loadScenario(id, overrides), reloadScenario(overrides),
    waitForIdle(options), idlePending(), inspectSummary(), validateState(), checksum(), setSeed(seed),
    teleport({ roomId, exitId, x, y }), listRooms(), listAnchors(roomId), completePath(), cancelPath(), setMovementSpeed(id),
    setOverlays(options),
    addItem(id, quantity), removeItem(id, quantity), applyInventoryPreset(id), listInventory(), resetEntity(id),
    selectVerb(verbId), selectTarget(targetId), cancelCommand(),
    describeDialogue(npcId, nodeId), setTextSpeed(id), skipDialogueLine(), resetConversation(npcId), inspectNpc(npcId),
    listFacts(), explainAction(actionId), explainGate(roomId, exitId), applyMilestone(actionId),
    criticalPathFrontier(), factConflicts(),
    saveScenario(key), loadSavedScenario(key), selectMigrationFixture(id),
    simulateStorageFailure(enabled), simulateAssetFailure(url), simulateMissingKey(key),
    setLocale(locale), setViewportPreset(id), setAccessibilityOption(id, value), setInputMode(id),
    pause(), resume(), newSession(), exportSnapshot(), importSnapshot(snapshot),
    exportReproductionBundle(), log(), openLegacyDebugWindow(), panel: { toggle(force), isVisible() },
};
```

`inspectSummary()` returns IDs, facts, and readiness — never mutable internal object references.

### Idle probes

`waitForIdle()` resolves `{ idle, pending, waitedMs, timedOut }` once every probe has been quiet for two animation frames. The probes are `startup`, `movement`, `transition`, `dialogue`, `animation`, and `saveQueue`. A timeout names the probes that are still busy instead of failing opaquely.

### Determinism

- `setSeed(n)` installs a seeded generator (`mulberry32`) as the source of randomness, so a scenario plus a seed reproduces a run. The game currently uses no randomness; the seed is in place so that adding any cannot break reproducibility silently.
- `checksum()` is an FNV-1a hash of the canonical digest: schema version, scenario ID, seed, spawn cell, room, sorted true facts, bridge state, inventory, removed dialogue options, locale, and presentation mode. Player pixel coordinates are deliberately excluded because they are derived from the measured canvas size and would make the checksum depend on the viewport.

## Scenarios

A scenario states canonical facts and explicit presentation setup. It never copies a world-state blob.

```js
{
    schemaVersion: 1,
    id: 'chapter1.bridge-ready',
    description: '...',
    seed: 1008,
    roomId: 'riverCrossing',
    spawn: null,                   // derived from content when absent
    locale: 'en',
    facts: { 'chapter1.started': true, 'rigging.assembled': true, /* ... */ },
    inventory: [{ objectId: 'objectBone', quantity: 1 }],
    presentation: { mode: 'gameVisibleActive', movementSpeed: 'fast', textSpeed: 'instant' },
    simulate: {},                  // assetFailure, saveFixture, longLocalisation
}
```

### How mutations are derived

- **Exits** come from the content contract. For every connection, the exit is open unless it declares a `gateFact` that the scenario has not asserted. Adding a gate to the contract therefore needs no scenario edits.
- **Objects, NPCs, grid variants, and granted items** come from the reviewed `FACT_EFFECTS` table in `src/content/scenario-registry.mjs`, keyed by fact. `test/unit/scenario-rules.test.mjs` asserts that every path in that table exists in shipped content, so a content rename fails the suite rather than producing a silently broken scenario.
- **Spawn** is an explicit scenario coordinate, the contract's initial player reference for the opening room, or the authored start position of that room's lowest-numbered exit.

### Loading order

Validate, then reject or proceed. A rejected scenario changes nothing, including the rendered frame.

1. Validate the fixture and its fact consistency; return `{ loaded: false, errors }` if either fails.
2. Reset the session, restore pristine content captured at install time, and install the seed.
3. Apply the locale, close the facts over their prerequisites, and record them.
4. Apply the derived exit, entity, grid, and inventory mutations.
5. Rebuild the playable session so entity footprints and grids are stamped from the scenario's world.
6. Teleport to the room and spawn without a fade, then wait for idle.
7. Return `{ loaded: true, checksum, spawn, durationMs, applied, failures }`.

### Named scenario catalogue

| Scenario ID | Purpose |
| --- | --- |
| `chapter1.new-game` | Exact clean player start in Library Foyer |
| `chapter1.library-riddle` | Librarian conversation immediately before riddle choice |
| `chapter1.research-unlock-ready` | Required key/clue present; player must perform the unlock |
| `chapter1.town-open` | Library tutorial complete; town exploration available |
| `chapter1.den-unlock-ready` | Den key available; player performs gate interaction |
| `chapter1.barn-unblock-ready` | Donkey/carrot prerequisites positioned for the tested action |
| `chapter1.rigging-ready` | Rope/pulley/anchor prerequisites prepared |
| `chapter1.bridge-ready` | Materials and puzzle facts ready; player repairs bridge |
| `chapter1.wolf-ready` | Player performs final obstacle resolution |
| `chapter1.map-entry` | River gate resolved; player enters Map |
| `system.inventory-full` | Twelve items: ten visible slots plus overflow for scrolling/layout |
| `system.long-localisation` | German locale with slow text for the longest labels and lines |
| `system.corrupt-save` | Drives the invalid and legacy save fixtures |
| `system.asset-failure` | One declared asset fails predictably |

`e2e/README.md` maps each scenario to the functional area that owns it.

## Debug panel

The panel is built in JavaScript, never present in `index.html`, and carries a sticky `DEBUG BUILD — NOT FOR PLAY` watermark that also serves as its drag handle. Middle mouse click or NumpadSubtract toggles it, preserving the retired wheel menu's shortcuts. Every control has a stable `data-debug-control` ID.

Sections and controls:

- **Session** — new clean session, pause, resume, scenario select and load, reset scenario, validate fixture, set seed, export/import snapshot, schema versions and checksum.
- **Location and movement** — room select, coordinate teleport, list anchors, complete path, cancel path, slow/normal/fast/instant movement.
- **Overlays** — walk grid, costs, blocked cells, exits, hotspots, entity footprints, anchors, current path, player cell, overlaps, unreachable. Overlays are additive and never clear the frame. The three original hand-built tools live here too: legacy grid view, toggle NPC animation, and open value window.
- **Inventory and verbs** — add/remove one item, inventory presets, list inventory, select verb, select target, cancel, show current structured intent, reset a consumed or moved entity.
- **Dialogue and characters** — start a conversation, show node choices with their conditions and actions, text speed, skip line, reset conversation, inspect NPC room/visibility/pose/facts.
- **Puzzles and quests** — list facts by satisfied and mandatory status, apply a milestone transaction, explain why an action or gate is unavailable, validate facts for conflicts, show the critical-path frontier, revert by reloading a scenario.
- **Save, localisation, presentation** — save/load through the real repository, migration fixture select, locale switch, missing-key simulation, viewport presets, high contrast, reduced motion, text scale, input mode, simulated asset and storage failures.
- **Diagnostics** — current state summary, wait for idle, structured action log, clear log, reproduction bundle.

## Reproduction bundle

`exportReproductionBundle()` returns the schema and API versions, capture time, scenario ID, seed, checksum, the full `inspectSummary()`, the timestamped action log, and any captured page errors or unhandled rejections. It is the single artefact to attach to a bug report.

## Production absence

`e2e/game-state/debug-absent-in-production.spec.cjs` runs against a real release server started without debug tools and asserts that `/debug-capability` reports disabled, every debug module returns HTTP 404, `window.__GAME_TEST__` and `#debugPanel` are absent, no `[data-debug-control]` element exists, the retired always-on debug wheel and its middle-click shortcut are gone, and that `?debug=1` combined with a test bootstrap still enables nothing.

## What changed in the runtime

- The always-available debug wheel markup, styles, and handlers were removed from `index.html`, `styles.css`, and `ui.js`. Nothing was lost: all four of its capabilities moved into the gated panel. Add item became the Inventory section's item select and presets; Show Grid became **Legacy grid view** alongside the richer additive overlays; Open Debug became **Open value window**; and Toggle Anim became **Toggle NPC animation**. The middle-click and NumpadSubtract shortcuts still open the panel.
- `updateDebugValues()` now returns immediately unless the legacy debug window is open, instead of serialising the whole grid every frame.
- Frame-time sampling and overlay drawing only run when a development build has installed the overlay renderer, so production frame cost is unchanged.
- `getTextDisplayDuration()` now applies a text-speed scale that only the debug controls change and that a new session resets to 1.

## Acceptance criteria

| Criterion | Evidence |
| --- | --- |
| Every Chapter 1 puzzle milestone, every room, the migrated librarian dialogue branch, inventory layout limits, and the declared error states are reachable through a named scenario plus normal input | `game-state/debug-scenarios.spec.cjs`, `puzzles/scenario-milestones.spec.cjs`, `dialogue/scenario-dialogue.spec.cjs`, `navigation/content-contract.spec.cjs`. Branches inside the unmigrated legacy conversations are not yet individually addressable (BUG-011). |
| Scenario load takes less than one second after app readiness | All fourteen fixtures are timed and asserted under 1000 ms |
| Loading the same scenario and seed twice produces the same checksum and visible state | Same-seed reproduction test, plus the revert-and-replay checksum test |
| Invalid state is rejected before rendering | Unknown room, unknown scenario, and impossible-fact cases leave room and checksum unchanged |
| Production confirms `window.__GAME_TEST__` and the panel are absent | `debug-absent-in-production.spec.cjs` against the release server |
| Scenario IDs and coverage mappings are documented in the relevant functional-area README | `e2e/README.md` and the area READMEs |

## Still planned

- Major animation and cutscene branches do not yet have their own scenarios; `animation-cutscenes` still starts from a normal New Game.
- `resetConversation(npcId)` restores the NPC record but cannot rewind a legacy conversation's internal phase, because the non-library conversations are still on the legacy representation (BUG-011).
- Simulated asset failure records the declared URL for assertion; it does not yet intercept the network request.
- Controller support for touch and keyboard input modes sets the document state that Section 7 will consume; it does not yet change input handling.
