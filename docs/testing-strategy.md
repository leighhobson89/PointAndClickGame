# Testing strategy

## Objectives

Tests should protect player journeys and game rules while remaining fast enough to run routinely. Browser E2E tests must perform actual user input—clicks, pointer movement, keyboard actions, and visible assertions—rather than calling internal functions to claim a journey works. Debug controls may arrange a starting state, after which the behaviour under test must use the normal interface.

## Commands and timing policy

- Full browser suite: `node tests all`
- One area: `node tests navigation`
- Up to three areas: `node tests navigation dialogue puzzles`
- Help and current area names: `node tests --help`

Every runner invocation writes duration, scope, status, and captured Playwright output under `e2e/logs/`. These files are intentionally ignored except `.gitkeep`.

The full suite is allowed only if there is no prior full-run record or the latest full suite took **under 180 seconds**. A recorded duration of 180 seconds or greater blocks another full run. In that case, run at most three relevant functional areas without further permission. The `tests` runner enforces both rules.

## Current proof

The implemented `startup/new-game.spec.cjs` opens the served app in Chromium, selects English, clicks New Game, verifies that the menu closes and the gameplay canvas/action UI appears, and fails on page errors or failed local requests. The initial full run passed in approximately 2.104 seconds of runner time, establishing a valid under-180-second baseline. This is proof of harness operation, not broad product coverage.

## Test pyramid

### Unit tests

Fast Node tests for pure rules:

- Pathfinding, costs, unreachable targets, and nearest interaction anchors.
- Pointer-to-grid/world transforms at boundaries and scaled viewports.
- Structured verb intent and two-target command rules.
- Inventory add/remove/combine/use and idempotency.
- Puzzle prerequisites/effects and reachability.
- Dialogue node traversal, option conditions, and actions.
- Localisation interpolation/fallback without `eval`.
- Initial-state creation, reducers/actions, save serialisation, validation, and migrations.

Target: hundreds of cases in seconds, with no browser, canvas, remote network, timeouts, or mutable shared fixtures.

### Content contract tests

- All JSON/schema validation.
- File/ID references and asset manifest.
- Room grid dimensions and valid codes.
- Reciprocal exits and valid spawn/interaction anchors.
- Dialogue links and localisation completeness.
- Puzzle graph reachability and no orphan mandatory facts.

### Integration/component tests

- Session lifecycle with fake renderer/storage.
- Renderer draw ordering against a recording context.
- DOM controls dispatch semantic actions and reflect store state.
- Asset loader readiness/error behaviour.
- Save repository against browser storage.

### End-to-end user simulation

Functional area ownership:

| Area | Planned coverage |
| --- | --- |
| `startup` | Menu, locale selection, new/resume, loading/errors |
| `navigation` | Walk, exits, gates, anchors, room return positions |
| `localisation` | Five locales, switching, long text, fallback |
| `dialogue` | Lines, choices, consequence, exit/focus |
| `inventory` | Add, select, scroll, combine, remove, restore |
| `verbs` | All nine verbs, two-target flows, cancel/error feedback |
| `puzzles` | Milestones, prerequisites, alternate paths, no soft-lock |
| `save-load` | Autosave/manual/export/import/migration/corruption |
| `game-state` | New-game reset, reload, deterministic scenarios |
| `animation-cutscenes` | Sequencing, skip, transition completion, reduced motion |
| `rendering-layout` | Stage scaling, layers, representative screenshots/locales |
| `accessibility` | Keyboard, focus, names/roles, announcements, zoom/touch |

## Scenario shape

Each E2E case should state:

1. Scenario/state fixture used, if any.
2. Player-visible precondition.
3. Actual input steps.
4. Visible/state outcome asserted through a supported test surface.
5. Relevant page errors, request failures, accessibility, and screenshot checks.
6. Cleanup/isolation guarantee.

Use stable `data-testid` only where roles/text/stable domain identifiers are insufficient. Do not locate critical actions by translated sentence fragments.

## Determinism and isolation

- Each test starts a fresh browser context and explicit game scenario.
- Randomness, animation clocks, and storage are controllable through test configuration.
- Tests never depend on order or another test's save.
- App assets are served locally; E2E must not require third-party network access.
- Debug scenario creation returns a state checksum and validation result.
- On failure retain screenshot and trace; enable video only for targeted diagnosis to control size/time.

## CI tiers

- Pull request: validation + unit + affected functional areas.
- Main branch/nightly while full suite remains under 180 seconds: `node tests all`.
- Release: all automated tiers plus approved manual art/audio/accessibility checklist.
- Quarantine is temporary, owner/date-bound, and never counts as coverage.

## Coverage completion order

1. New-game reset and fatal data loading.
2. Navigation/click mapping.
3. Structured verbs and inventory.
4. Dialogue and localisation.
5. Puzzle milestones.
6. Save/load round trips.
7. Animation transitions.
8. Responsive visuals and accessibility.
