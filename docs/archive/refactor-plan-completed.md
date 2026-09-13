# Refactor plan — completed phases

The delivered half of the staged refactor. Phases 0 to 3 are complete, and the debug/test half of Phase 4 is complete. The remaining work is in [refactor-plan.md](../refactor-plan.md).

## Phase 0 — Baseline and safety rails

Outcome: current behaviour can be observed and reproduced.

- Keep the Playwright startup proof green.
- Add content validation as a standalone Node command.
- Capture a canonical clean initial-state fixture and a few Chapter 1 milestone fixtures. Fourteen reviewed fixtures live in `src/content/scenario-registry.mjs`, validated against shipped content.
- Add error boundaries/fatal-load presentation and structured logging.

Exit criteria met: app start is deterministic, invalid content fails clearly, and all known defects are registered.

Two items originally listed here were not delivered with the phase and are carried by the live plan instead: declared performance budgets, and linting/formatting after a no-functional-change baseline.

## Phase 1 — Own the lifecycle and state

Outcome: one explicit game session can start, reset, save, restore, and dispose.

- Introduce `createInitialGameState()` returning plain serialisable data.
- Introduce a small store with `getState`, `dispatch`, and `subscribe`; no DOM or canvas references in state.
- Define `bootApplication()`, `startNewGame()`, `restoreGame()`, and `disposeGame()`.
- Move listeners and animation-frame ownership into disposable adapters.
- Replace `resetAllVariables()` with initial-state replacement and teardown.
- Add a versioned save schema and migration boundary.

Exit criteria met: five consecutive new sessions have one listener set and identical starting state; a representative mid-puzzle save round-trips.

Implementation status (2026-09-13): complete. The canonical serialisable state factory/store and explicit boot/start/dispose/reset lifecycle are in place. Startup data and image readiness are awaited, session listeners/animation frames are disposed, and five-start E2E coverage passes. Section 5 closed the remaining half: the versioned save schema and migration boundary now serve the player-facing path, and mid-puzzle round trips are proven at six milestones through a full page reload. `startGame(startCell)` takes an optional start cell so a restored session begins where the save left the player.

One Section 1 regression surfaced while the transition path was revisited and was fixed: making transitions awaitable had moved the `currentScreenId` commit to after the fade, leaving the game's idea of the current room behind the background actually on screen (BUG-033).

## Phase 2 — Extract pure domain modules

Outcome: game rules can be tested without a browser.

Delivered boundaries:

```text
src/
  domain/
    commands/
    dialogue/
    inventory/
    navigation/
    puzzles/
    save/
  application/
  adapters/
  content/
```

- Replace localised-sentence parsing with structured command intents.
- Convert events into idempotent actions with declared prerequisites/effects.
- Convert dialogue strings into explicit graph nodes.
- Separate A* and hotspot resolution from drawing and mutable globals.
- Prevent new circular imports with a dependency rule.

Exit criteria met: navigation, inventory combinations, dialogue transitions, puzzle prerequisites/effects, save migration, and pathfinding have fast unit tests.

Implementation status (2026-09-13): complete for the Section 3 seam. Browser-independent command, inventory, localisation, dialogue, puzzle, navigation, and save-migration rules now live under `src/domain`; orchestration, renderer/DOM/assets/storage adapters, and content loading are separated by dependency direction. `npm run check:dependencies` rejects upward imports, browser globals in domain code, and cycles in the extracted module graph. The runtime now sends stable command intents, uses an allow-listed event registry, records canonical Chapter 1 facts, and runs the librarian tutorial through explicit nodes and choice IDs. Remaining non-library dialogue and the large legacy global adapter are tracked as incremental migration debt rather than hidden inside this completed seam.

## Phase 3 — Stabilise content contracts

Outcome: data errors are caught before a player encounters them.

- Define runtime schemas for rooms, grids, entities, dialogue, localisation, and puzzle definitions.
- Validate every referenced asset and ID.
- Require reciprocal exits or a declared one-way exception.
- Validate spawn and interaction anchors as in-bounds/walkable.
- Add dialogue graph and puzzle reachability checks.
- Reconcile world map/version and restore or remove Debug Room/Map references intentionally.

Exit criteria met: `npm run validate:content` covers all shipped content and runs in CI and at startup. The contract is documented in [content-contract.md](../content-contract.md).

## Phase 4 — the debug and test half

Implementation status (2026-09-13): `window.__GAME_TEST__` drives structured verb/target intents, validated teleports, movement and text speed, inventory, dialogue inspection, and puzzle milestones without touching translated copy, and the debug panel is a second presentation of the same controller. The rest of Phase 4 — the logical stage, pointer transforms at multiple viewports, semantic hotspots, rendering layers, and the DOM mirror — remains in the live plan.
