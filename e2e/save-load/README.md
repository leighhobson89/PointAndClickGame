# Save and load scenarios

Cover manual save strings, copied data, file import, pasted-string load, malformed input, versioning, complete state restoration, language restoration, and save/load round trips.

`browser-storage.spec.cjs` integration-tests the versioned storage repository against real browser `localStorage`.

Section 4 added the arrangement these journeys need. `chapter1.rigging-ready` gives a mid-chapter state that `__GAME_TEST__.saveScenario(key)` and `loadSavedScenario(key)` round-trip through the real repository; `system.corrupt-save` plus `selectMigrationFixture('current' | 'legacy' | 'corrupt')` selects the save schema under test; and `simulateStorageFailure(true)` makes a write fail deterministically. Those controls are currently exercised by `game-state/debug-scenarios.spec.cjs`.

Scenarios to use: `chapter1.rigging-ready`, `system.corrupt-save`.

Full player-facing save/export/restore journeys, including derived-state rebuilding after restore, remain Section 5 work.
