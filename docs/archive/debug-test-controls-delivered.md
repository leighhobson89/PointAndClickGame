# Debug and test controls — delivered

What the debug and test controls changed in the runtime when they landed, and the acceptance evidence that closed them. How the surface works today, and what it still owes, is in [debug-test-controls.md](../debug-test-controls.md).

## What changed in the runtime (2026-09-13)

- The always-available debug wheel markup, styles, and handlers were removed from `index.html`, `styles.css`, and `ui.js`. Nothing was lost: all four of its capabilities moved into the gated panel. Add item became the Inventory section's item select and presets; Show Grid became **Legacy grid view** alongside the richer additive overlays; Open Debug became **Open value window**; and Toggle Anim became **Toggle NPC animation**. The middle-click and NumpadSubtract shortcuts still open the panel.
- `updateDebugValues()` now returns immediately unless the legacy debug window is open, instead of serialising the whole grid every frame.
- Frame-time sampling and overlay drawing only run when a development build has installed the overlay renderer, so production frame cost is unchanged.
- `getTextDisplayDuration()` now applies a text-speed scale that only the debug controls change and that a new session resets to 1.

## Acceptance evidence

| Criterion | Evidence |
| --- | --- |
| Every Chapter 1 puzzle milestone, every room, the migrated librarian dialogue branch, inventory layout limits, and the declared error states are reachable through a named scenario plus normal input | `game-state/debug-scenarios.spec.cjs`, `puzzles/scenario-milestones.spec.cjs`, `dialogue/scenario-dialogue.spec.cjs`, `navigation/content-contract.spec.cjs`. Branches inside the unmigrated legacy conversations are not yet individually addressable (BUG-011). |
| Scenario load takes less than one second after app readiness | All fourteen fixtures are timed and asserted under 1000 ms |
| Loading the same scenario and seed twice produces the same checksum and visible state | Same-seed reproduction test, plus the revert-and-replay checksum test |
| Invalid state is rejected before rendering | Unknown room, unknown scenario, and impossible-fact cases leave room and checksum unchanged |
| Production confirms `window.__GAME_TEST__` and the panel are absent | `debug-absent-in-production.spec.cjs` against the release server |
| Scenario IDs and coverage mappings are documented in the relevant functional-area README | `e2e/README.md` and the area READMEs |
