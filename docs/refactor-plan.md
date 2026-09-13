# Refactor plan

## Strategy

Refactor by creating tested seams around the running game. Do not pause development for a ground-up rewrite. Each phase must leave a playable vertical slice and should remove or isolate an identified risk.

## Phase 0 — Baseline and safety rails

Outcome: current behaviour can be observed and reproduced.

- Keep the Playwright startup proof green.
- Add content validation as a standalone Node command.
- Capture a canonical clean initial-state fixture and a few Chapter 1 milestone fixtures.
- Add error boundaries/fatal-load presentation and structured logging.
- Define performance budgets for startup, frame time, image decode, and suite duration.
- Establish linting/formatting only after a no-functional-change baseline.

Exit criteria: app start is deterministic, invalid content fails clearly, and all known defects are registered.

## Phase 1 — Own the lifecycle and state

Outcome: one explicit game session can start, reset, save, restore, and dispose.

- Introduce `createInitialGameState()` returning plain serialisable data.
- Introduce a small store with `getState`, `dispatch`, and `subscribe`; no DOM or canvas references in state.
- Define `bootApplication()`, `startNewGame()`, `restoreGame()`, and `disposeGame()`.
- Move listeners and animation-frame ownership into disposable adapters.
- Replace `resetAllVariables()` with initial-state replacement and teardown.
- Add a versioned save schema and migration boundary.

Exit criteria: five consecutive new sessions have one listener set and identical starting state; a representative mid-puzzle save round-trips.

Implementation status (2026-09-13): the canonical serialisable state factory/store and explicit boot/start/dispose/reset lifecycle are in place. Startup data and image readiness are awaited, session listeners/animation frames are disposed, and five-start E2E coverage passes. Full mid-puzzle persistence and migrations remain Phase 5 work in the master checklist.

## Phase 2 — Extract pure domain modules

Outcome: game rules can be tested without a browser.

Suggested boundaries:

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
    game-session.js
    actions.js
  adapters/
    canvas-renderer.js
    dom-ui.js
    asset-loader.js
    storage.js
  content/
    loader.js
    validator.js
```

- Replace localised-sentence parsing with structured command intents.
- Convert events into idempotent actions with declared prerequisites/effects.
- Convert dialogue strings into explicit graph nodes.
- Separate A* and hotspot resolution from drawing and mutable globals.
- Prevent new circular imports with a dependency rule.

Exit criteria: navigation, inventory combinations, dialogue transitions, puzzle prerequisites/effects, save migration, and pathfinding have fast unit tests.

## Phase 3 — Stabilise content contracts

Outcome: data errors are caught before a player encounters them.

- Define JSON Schema or equivalent runtime schemas for rooms, grids, entities, dialogue, localisation, and puzzle definitions.
- Validate every referenced asset and ID.
- Require reciprocal exits or a declared one-way exception.
- Validate spawn and interaction anchors as in-bounds/walkable.
- Add dialogue graph and puzzle reachability checks.
- Reconcile world map/version and restore or remove Debug Room/Map references intentionally.

Exit criteria: one validation command covers all shipped content and runs in CI.

## Phase 4 — Rendering and input adapters

Outcome: display and input can change without changing puzzle rules.

- Use a canonical logical stage with deterministic scale/letterboxing.
- Isolate pointer-to-world conversion and test it at multiple viewports.
- Separate walk-grid cells from semantic hotspots/anchors.
- Await a declared asset-ready boundary.
- Add rendering layers, dirty-region/caching decisions only after profiling.
- Mirror hotspots into semantic DOM controls for keyboard and assistive access.

Exit criteria: the same domain actions work through pointer, keyboard, touch, and debug/test APIs.

## Phase 5 — UI/art/audio modernisation

Outcome: a cohesive release-quality presentation sits on stable systems.

- Apply the approved UI component/layout tokens.
- Process assets through the asset manifest/pipeline.
- Add transitions with reduced-motion alternatives.
- Add settings, audio mixer, subtitles, and accessibility options.
- Add responsive and visual-regression coverage.

Exit criteria: art, UI, performance, accessibility, and offline packaging acceptance matrices pass.

## Change rules

- One conceptual extraction per change; preserve public behaviour unless the ticket says otherwise.
- Characterise legacy behaviour before moving it.
- New domain code must not import DOM, canvas, file paths, translated copy, or global mutable state.
- Do not duplicate a state fact during migration without a documented temporary source of truth and deletion task.
- A refactor is complete only when legacy code and transitional adapters are removed, tests pass, and docs are updated.
