# Testing strategy

## Objectives

Tests should protect player journeys and game rules while remaining fast enough to run routinely. Browser E2E tests must perform actual user input—clicks, pointer movement, keyboard actions, and visible assertions—rather than calling internal functions to claim a journey works. Debug controls may arrange a starting state, after which the behaviour under test must use the normal interface.

Since Section 4 that arrangement has a supported shape. A test loads a named scenario, which states canonical facts only and derives every exit, entity, grid, and inventory consequence from the content contract, then performs the behaviour under test with real clicks. Tests no longer reach into `constantsAndGlobalVars.js` to pose the world by hand.

## Commands and timing policy

- Full browser suite: `node tests all`
- One area: `node tests navigation`
- Up to three areas: `node tests navigation dialogue puzzles`
- Record video: append `--video`, or `--video=retain-on-failure` for failures only
- Help and current area names: `node tests --help`

Every runner invocation writes duration, scope, status, and captured Playwright output under `e2e/logs/`. These files are intentionally ignored except `.gitkeep`.

### Recorded runs

`--video` gives a run its own report and artefact folders under `test-reports/`, and adds it to the run history at `test-reports/history.html`: newest first, with status, duration, a link to that run's full Playwright report and runner log, and an inline player for every video. Recorded runs live outside `playwright-report/` and `test-results/` because Playwright clears both at the start of every run; keeping them separate is what makes historic runs reviewable after later runs finish. The last fifty are retained, and everything under `test-reports/` is generated and ignored by Git.

Recording is off by default. It costs run time and disk, so use it to review a journey or study an intermittent failure, not for routine runs — and note that a recorded full run is still measured against the same 180-second gate.

The full suite is allowed only if there is no prior full-run record or the latest full suite took **under 180 seconds**. A recorded duration of 180 seconds or greater blocks another full run. In that case, run at most three relevant functional areas without further permission. The `tests` runner enforces both rules.

## Two servers

Global setup starts two local servers so production absence is tested against a real release build rather than a simulation:

| Server | Port | Build |
| --- | --- | --- |
| Release | `E2E_PORT`, default 4174, and the Playwright `baseURL` | Exactly what ships. `/debug-capability` reports disabled and every debug module returns HTTP 404. |
| Debug | `E2E_DEBUG_PORT`, default 4175 | `GAME_DEBUG_TOOLS=1`, so the debug and test controls can be requested. |

Scenario-driven tests open the debug server through `openDebugGame(page)` in `e2e/_support/debug-session.cjs`. Tests that assert release behaviour use the default base URL.

## Current proof

The implemented `startup/new-game.spec.cjs` opens the served app in Chromium, selects English, clicks New Game, verifies that the menu closes and the gameplay canvas/action UI appears, and fails on page errors or failed local requests. The initial full run passed in approximately 2.104 seconds of runner time, establishing a valid under-180-second baseline. This is proof of harness operation, not broad product coverage.

The deterministic-state pass adds seven Node unit tests for the state factory/store, live player identity, coordinate handling, transitions, and load failures. Browser coverage now also proves a visible fatal-load path, delayed-image readiness, reduced-motion intro sequencing, real click-to-walk movement, and stable listener counts/session generations across five New Game cycles.

The content-contract pass adds four Node tests covering valid shipped content, Map-grid generation, reference/grid/locale/overlap/orphan failures, and minimal scenario/save schemas. Navigation browser coverage validates and decodes all 18 rooms, performs normal canvas entry and return clicks across every canonical connection with content-only starting-state arrangement, and proves all four gates refuse entry while locked.

The Section 3 extraction adds 13 pure-rule and four adapter/application tests, bringing the Node suite to 24 tests. They cover all nine stable verbs, two-target states, inventory idempotency, localisation fallback/interpolation, explicit librarian dialogue traversal, canonical puzzle facts and reasons, A*/fallback/pointer/hotspot rules, save migrations, dependency direction, DOM-to-store dispatch, draw order, session lifecycle, and readiness failures. Browser coverage drives the librarian through real Talk To and stable choice controls in `en`, `es`, `de`, `it`, and `fr`; a separate browser integration test round-trips canonical state through `localStorage`.

The Section 4 debug-reachability pass adds nine Node tests for the scenario schema, registry, fact-effect integrity, fact-derived mutations, checksum determinism, the seeded generator, the critical-path frontier, and the idle tracker, bringing the Node suite to 33. Browser coverage adds the scenario controls themselves: same-seed checksum reproduction, all fourteen fixtures loading cleanly in under a second each, rejection of invalid scenarios before rendering, a real canvas click from `chapter1.map-entry` into the Map, idle probes during a slow walk, teleport validation, inventory presets and structured intents, milestone apply and refusal, repository save/load with simulated storage failure, locale and presentation toggles, the reproduction bundle, the DEBUG panel driving the same controller, a scenario-arranged research-room unlock performed with real clicks, milestone revert to an identical checksum, dialogue node inspection, and deterministic text speed and skipping. A dedicated release-server test proves the tools are absent from production.

The Section 5 save pass adds eleven Node tests for the save format, JSON and grid patching, migration and legacy finalisation, validation, and save policy, bringing the Node suite to 44. Browser coverage adds the player-facing journeys: six milestone save-and-resume round trips through a full page reload, a mid-chapter Continue that proves derived state was rebuilt, a clean new game claiming the resume slot, a milestone checkpointing itself after a real unlock, a declared legacy save migrating, a manual save string moving a game into a fresh session, and three failure paths — corrupt data, an unsupported version, and a storage failure — each asserting that the running session is bit-for-bit unchanged.

The Section 6 chapter pass adds fourteen Node tests for the progress model, bringing the Node suite to 58: objective reveal and completion, opt-in hint tiers, five-locale journal copy, availability and gate explanations expressed by objective, forward reachability, journal purity, choice variants, the completion summary, and the pickup and gate mappings.

The most important of them is the critical-path walk. It plays all 44 canonical actions from a clean start and asserts, after every single step, both that no mandatory fact has become unreachable and that no objective has un-completed. That is the chapter's no-soft-lock guarantee, and it is a unit test rather than a browser journey on purpose: it covers every step in about three milliseconds, where a browser playthrough of the same path would cost minutes and still only cover one ordering. The browser suite is then spent on the things only a browser can show — real clicks, real rendering, real focus. A companion test asserts the same property for every shipped scenario fixture, so a fixture can never place the player somewhere the chapter cannot be finished from.

Browser coverage adds the journal itself: spoiler safety (a puzzle the player has not met is absent from the DOM, not merely hidden), the three-tier hint ladder revealed one tier at a time, an objective moving to done while the panel is open, gate explanations by objective, soft-lock checks across six scenarios and a claimed chapter, the completion summary, and all five locales rendered in a single session through `setLocale` rather than five page loads.

A regression test for BUG-033 samples every animation frame of a real room change and asserts that the displayed background, the current room, and the has-foreground-items flag always agree. It has to run with real motion and real timers: under the reduced-motion startup the fade resolves immediately and the defect's window has no frames in it. The test was verified against the unfixed code, where it reports 23 disagreeing frames.

Latest full proof (2026-09-13): `node tests all` passed 53/53 browser tests in 135.017 seconds; log `e2e/logs/2026-09-13T21-48-29-181Z-all.log`. The run retained every established startup, navigation, dialogue, debug-reachability, and animation case alongside the new save-load coverage.

The margin under the 180-second gate is now the number to watch. It was 101 seconds after Section 4 and is 44 seconds after Section 5, because save journeys are slow by nature — several reload the page. Future browser tests that need a milestone state should arrange it with `setMovementSpeed('instant')` and a scenario rather than by replaying a journey another test already covers.

Previous full proofs (2026-09-13): 38/38 in 78.772 seconds; 18/18 in 35.914 seconds.

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
- Save patching against shipped content, walk-grid authored deltas, legacy finalisation, and save policy (blocked reasons, milestone checkpoints, autosave rate limiting, storage failure).

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
| `save-load` | Autosave/manual/export/import/migration/corruption — implemented in Section 5 |
| `game-state` | New-game reset, reload, deterministic scenarios |
| `animation-cutscenes` | Sequencing, skip, transition completion, reduced motion |
| `rendering-layout` | Stage scaling, layers, representative screenshots/locales |
| `accessibility` | Keyboard, focus, names/roles, announcements, zoom/touch |

## Using scenarios

```js
const { openDebugGame, loadScenario, clickGridCell, waitForIdle, summary } = require('../_support/debug-session.cjs');

await openDebugGame(page);                           // debug build, real menu clicks, idle
await loadScenario(page, 'chapter1.research-unlock-ready'); // arrange canonical facts only
await page.locator('[data-verb-id="use"]').click();  // behaviour under test: real input
await page.locator('.inventory-item img[alt="objectKeyResearchRoom"]').click();
await clickGridCell(page, 'oobjectDoorLibraryFoyerResearchRoom');
expect((await summary(page)).facts).toContain('library.researchRoomUnlocked');
```

Rules for scenario use:

- Arrange with a named fixture, never with ad-hoc state pokes. If a state is worth reaching twice, it is worth a reviewed fixture in `src/content/scenario-registry.mjs`.
- Perform the behaviour under test through the ordinary interface.
- Assert on stable IDs from `inspectSummary()` or on `data-*` attributes, never on translated display text.
- Prefer `waitForIdle()` to fixed waits; a timeout then names the busy subsystem.
- `restoreNativeTimers(page)` puts real time back when a test must observe a duration. Pair it with `page.emulateMedia({ reducedMotion: 'no-preference' })` when the behaviour under test only exists while an animation is actually animating.

Section 5 added four more helpers to the same file. `canonicalChecksum(page)` digests canonical progress without scenario context, so it can be compared across a page reload; note that the digest includes the presentation mode, so take both readings in the same mode. `derivedRenderState(page)` reports what the renderer rebuilt rather than what a save carried. `returnToMenu(page)` opens the menu the way a player does, and `readSaveSlot`/`clearSaveSlots` inspect and reset stored saves.

One behaviour is worth knowing before writing a save test: loading a scenario commits its facts through the canonical store, and declared milestones checkpoint themselves, so a scenario legitimately writes save slots. Clear the slots after arranging, not before.

The full scenario catalogue and the coverage map live in `debug-test-controls.md` and `e2e/README.md`.

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
- Randomness is seeded through `__GAME_TEST__.setSeed(n)` or the scenario's own seed; animation clocks and storage are controllable through test configuration.
- Tests never depend on order or another test's save.
- App assets are served locally; E2E must not require third-party network access.
- Debug scenario creation returns a state checksum and validation result.
- On failure retain screenshot and trace. Video is opt-in through the runner's `--video` flag, so size and time stay controlled while a recorded run remains reviewable afterwards.

## CI tiers

- Pull request: validation + unit + affected functional areas. The `debug-reachability-browser` job runs `node tests game-state puzzles dialogue --video=retain-on-failure`, and `save-and-transitions-browser` runs `node tests save-load animation-cutscenes startup --video=retain-on-failure`. Both upload `test-reports/` on failure, so a CI failure arrives with its own video and Playwright report. Save journeys are on every push because progress loss is the one failure a player cannot recover from.
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
