# Debug and test controls plan

## Goal

Provide a deterministic, validated way for developers and automated tests to reach any meaningful player experience in seconds. The system must arrange state through the same canonical state model used by the game, while remaining unavailable in ordinary production play.

## Principles

- One state model: debug tools dispatch supported actions or load a validated scenario; they do not maintain parallel flags.
- Stable semantic IDs: controls refer to `roomId`, `itemId`, `dialogueNodeId`, and `factId`, never translated labels.
- Reproducible: each scenario has a schema version, explicit seed, state checksum, and known starting position.
- Safe: tools are compiled/served only when explicitly enabled, carry a visible DEBUG watermark, and are rejected by release builds.
- Inspectable: invalid combinations are refused with useful prerequisite/conflict messages.
- E2E integrity: state setup may skip prerequisites, but the behaviour under test is completed through actual player UI input.

## Enablement

Recommended development URL: `?debug=1&scenario=chapter1.library-start`, accepted only when a development/test build flag is also present. A query string alone must not enable controls in production.

Recommended test bootstrap:

```js
await page.addInitScript(() => {
  window.__GAME_TEST_CONFIG__ = {
    enabled: true,
    scenarioId: 'chapter1.bridge-ready',
    seed: 12345
  };
});
await page.goto('/');
```

Expose a narrow, versioned test surface only in test mode:

```js
window.__GAME_TEST__ = {
  apiVersion: 1,
  loadScenario(id, overrides),
  waitForIdle(),
  inspectSummary(),
  validateState()
};
```

`inspectSummary()` should return IDs/facts and readiness, not mutable internal object references.

## Debug panel option set

### Session

- New clean session.
- Load named scenario.
- Reset current scenario.
- Pause/resume simulation.
- Set deterministic seed.
- Export/import debug snapshot.
- Display schema version and state checksum.

### Location and movement

- Choose room and valid spawn/interaction anchor.
- Teleport player to an explicit grid coordinate after validation.
- Toggle walk grid, costs, blocked cells, exits, hotspots, entity footprints, anchors, current path, and player cell.
- Complete/cancel current path.
- Slow/normal/fast/instant movement.
- Report unreachable/overlapping hotspots.

### Inventory and verbs

- Add/remove one item or load an inventory preset.
- Select/clear a verb and primary/secondary target.
- Show current structured command intent.
- Reset consumed/moved object to its scenario state.
- Report invalid combinations and the response rule chosen.

### Dialogue and characters

- Choose NPC and start at a valid dialogue node/phase.
- Show available choices, conditions, and actions.
- Set text speed or instant text.
- Skip current line/cutscene through its supported completion action.
- Reset one conversation.
- Inspect NPC room, visibility, pose, and narrative facts.

### Puzzles and quests

- List facts by chapter/quest and show satisfied prerequisites.
- Apply one milestone transaction with all declared effects.
- Revert to a named earlier milestone by reloading a scenario.
- Explain why an event/gate is unavailable.
- Validate current state for impossible/conflicting facts.
- Display the active critical-path frontier without revealing it in player mode.

### Save, localisation, and presentation

- Save/load current scenario through the real save repository.
- Select save schema version/migration fixture.
- Switch among all supported locales and simulate a missing key.
- Toggle viewport presets, high contrast, reduced motion, text scale, subtitle mode, and input type.
- Simulate slow/missing asset and storage failure in test mode.

### Diagnostics

- Structured event/action log with timestamps and source.
- Current room, position, animation, active dialogue, selected command, inventory IDs, quest facts, gate states, and save-dirty status.
- Asset readiness/errors and current frame-time summary.
- Copy a concise reproduction bundle: version, scenario, seed, actions, checksum, and errors.

## Named scenario catalogue

Start with small, reviewed fixtures:

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
| `system.inventory-full` | Ten visible slots plus overflow for scrolling/layout |
| `system.long-localisation` | Longest labels/dialogue in each locale |
| `system.corrupt-save` | Invalid and legacy save fixtures |
| `system.asset-failure` | One declared asset fails predictably |

Fixtures should contain only canonical facts and explicit presentation setup. Prefer builders that derive expected entity/exit mutations from facts over large copied world-state blobs.

## Implementation sequence

1. Create `createInitialGameState`, schema validation, and serialisable store.
2. Define puzzle facts/actions and selectors such as `whyUnavailable`.
3. Add scenario schema, registry, builder, checksum, and validation.
4. Add test-only bootstrap and minimal `__GAME_TEST__` API.
5. Add `waitForIdle` for asset, movement, dialogue, transition, and save queues.
6. Build the visible debug panel on the same commands.
7. Add overlays and reproduction-bundle export.
8. Add a release assertion that debug symbols/panel/API are absent.

## Acceptance criteria

- Every entry/exit, dialogue branch, inventory combination, major animation, error state, and puzzle milestone is reachable through a named scenario plus normal user input.
- Scenario load takes less than one second after app readiness on the development baseline.
- Loading the same scenario/seed twice produces the same checksum and visible state.
- Invalid state is rejected before rendering.
- Production E2E confirms `window.__GAME_TEST__` and the panel are absent.
- Scenario IDs and coverage mappings are documented in the relevant functional-area README.
