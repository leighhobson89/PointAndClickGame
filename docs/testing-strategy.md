# Testing strategy

## Objectives

Tests should protect player journeys and game rules while remaining fast enough to run routinely. Browser E2E tests must perform actual user input — clicks, pointer movement, keyboard actions, and visible assertions — rather than calling internal functions to claim a journey works. Debug controls may arrange a starting state, after which the behaviour under test must use the normal interface.

That arrangement has a supported shape. A test loads a named scenario, which states canonical facts only and derives every exit, entity, grid, and inventory consequence from the content contract, then performs the behaviour under test with real clicks. Tests do not reach into `constantsAndGlobalVars.js` to pose the world by hand.

How the suite was built pass by pass, and the full-run timing records, are in [archive/testing-strategy-history.md](archive/testing-strategy-history.md).

## Commands and timing policy

- Full browser suite: `node tests all`
- One area: `node tests navigation`
- Up to three areas: `node tests navigation dialogue puzzles`
- Record video: append `--video`, or `--video=retain-on-failure` for failures only
- Help and current area names: `node tests --help`

Every runner invocation writes duration, scope, status, and captured Playwright output under `e2e/logs/`. These files are intentionally ignored except `.gitkeep`.

The full suite is allowed only if there is no prior full-run record or the latest full suite took **under 180 seconds**. A recorded duration of 180 seconds or greater blocks another full run. In that case, run at most three relevant functional areas without further permission. The `tests` runner enforces both rules.

### Recorded runs

`--video` gives a run its own report and artefact folders under `test-reports/`, and adds it to the run history at `test-reports/history.html`: newest first, with status, duration, a link to that run's full Playwright report and runner log, and an inline player for every video. Recorded runs live outside `playwright-report/` and `test-results/` because Playwright clears both at the start of every run. The last fifty are retained, and everything under `test-reports/` is generated and ignored by Git.

Recording is off by default. It costs run time and disk, so use it to review a journey or study an intermittent failure, not for routine runs — and note that a recorded full run is still measured against the same 180-second gate.

## Two servers

Global setup starts two local servers so production absence is tested against a real release build rather than a simulation:

| Server | Port | Build |
| --- | --- | --- |
| Release | `E2E_PORT`, default 4174, and the Playwright `baseURL` | Exactly what ships. `/debug-capability` reports disabled and every debug module returns HTTP 404. |
| Debug | `E2E_DEBUG_PORT`, default 4175 | `GAME_DEBUG_TOOLS=1`, so the debug and test controls can be requested. |

Scenario-driven tests open the debug server through `openDebugGame(page)` in `e2e/_support/debug-session.cjs`. Tests that assert release behaviour use the default base URL.

## Where the suite stands

62 Node tests and 69 browser journeys. Latest full proof, run `2026-09-14T00-21-20-151Z-all`: `node tests all` passed 69/69 in 168.959 seconds.

**The margin under the gate is down to 11 seconds, and that is now the constraint on new browser coverage.** A browser test that needs a milestone state should arrange it with a scenario and `setMovementSpeed('instant')` rather than replay a journey another test already covers. The next addition of any size should be paired with trimming an existing journey, or the full suite stops being runnable under the gate and every future run becomes three areas at a time.

Two properties of the current suite are worth preserving as it grows.

The critical path is a unit test, not a browser journey. It plays all 44 canonical actions from a clean start and asserts, after every single step, both that no mandatory fact has become unreachable and that no objective has un-completed. That is the chapter's no-soft-lock guarantee, and it covers every step in about three milliseconds where a browser playthrough would cost minutes and still only cover one ordering. A companion test asserts the same property for every shipped scenario fixture. The browser suite is then spent on what only a browser can show — real clicks, real rendering, real focus.

Regression tests are verified against the unfixed code before they are trusted. The BUG-033 test samples every animation frame of a real room change and reports 23 disagreeing frames against the old code; it must run with real motion and real timers, because under the reduced-motion startup the defect's window has no frames in it. The BUG-037 test instruments the live text queue during the librarian conversation, recording every line with the speaker and position it will be drawn at, because that defect queued the player's line with no coordinates at all — invisible rather than misplaced, so sampling the canvas would not have caught it.

## Test pyramid

### Unit tests

Fast Node tests for pure rules:

- Pathfinding, costs, unreachable targets, and nearest interaction anchors.
- Pointer-to-grid/world transforms at boundaries and scaled viewports.
- Semantic hotspot projection, minimum targets, stable labels, and no walk-grid mutation.
- Player preference validation, persistence, clamping, and corrupt-storage recovery.
- Structured verb intent and two-target command rules.
- Inventory add/remove/combine/use and idempotency.
- Puzzle prerequisites/effects and reachability.
- Dialogue node traversal, option conditions, actions, and conversation entry points.
- Localisation interpolation/fallback without `eval`.
- Initial-state creation, reducers/actions, save serialisation, validation, and migrations.
- Save patching against shipped content, walk-grid authored deltas, legacy finalisation, and save policy.

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

Functional area ownership, and what each still owes:

| Area | Outstanding coverage |
| --- | --- |
| `startup` | Approved product title and menu copy |
| `navigation` | Anchors and return positions at non-default viewports |
| `localisation` | Long-text layout, mid-session switching under a strict CSP |
| `dialogue` | The non-library conversations, once they are graphs (BUG-011) |
| `inventory` | Combine, remove, and restore through real clicks |
| `verbs` | Two-target cancel and error feedback for all nine verbs |
| `puzzles` | Each dependency chain end-to-end with real clicks, rather than at fact level |
| `save-load` | Covered |
| `game-state` | Covered |
| `animation-cutscenes` | Scenarios for the major cutscene branches; skip behaviour |

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
- Assert on stable IDs from `inspectSummary()` or on `data-*` attributes, never on translated display text. Where a test needs authored copy, read it from shipped content in the running locale rather than hard-coding a translation.
- Prefer `waitForIdle()` to fixed waits; a timeout then names the busy subsystem.
- `restoreNativeTimers(page)` puts real time back when a test must observe a duration. Pair it with `page.emulateMedia({ reducedMotion: 'no-preference' })` when the behaviour under test only exists while an animation is actually animating.

Helpers in the same file: `canonicalChecksum(page)` digests canonical progress without scenario context, so it can be compared across a page reload — note that the digest includes the presentation mode, so take both readings in the same mode. `derivedRenderState(page)` reports what the renderer rebuilt rather than what a save carried. `returnToMenu(page)` opens the menu the way a player does, and `readSaveSlot`/`clearSaveSlots` inspect and reset stored saves.

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
- On failure retain screenshot and trace. Video is opt-in through the runner's `--video` flag.

## CI tiers

- Pull request: validation + unit + affected functional areas. The `debug-reachability-browser` job runs `node tests game-state puzzles dialogue --video=retain-on-failure`, and `save-and-transitions-browser` runs `node tests save-load animation-cutscenes startup --video=retain-on-failure`. Both upload `test-reports/` on failure, so a CI failure arrives with its own video and Playwright report. Save journeys are on every push because progress loss is the one failure a player cannot recover from.
- Main branch/nightly while full suite remains under 180 seconds: `node tests all`.
- Release: all automated tiers plus approved manual art/audio/accessibility checklist.
- Quarantine is temporary, owner/date-bound, and never counts as coverage.

## Coverage completion order

1. Each puzzle chain end-to-end with real clicks.
2. Inventory combine/remove/restore and two-target verb feedback.
3. The remaining conversations, once they are explicit graphs.
4. Animation transitions and cutscene skip.
