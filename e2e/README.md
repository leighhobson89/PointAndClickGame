# End-to-end test harness

Run the complete suite with `node tests all`. Run one to three functional areas with, for example, `node tests navigation localisation dialogue`.

Each functional area owns its tests and its scenario notes. The runner records elapsed time and status under `e2e/logs/`. A complete run is permitted only when there is no previous complete-run record or the previous complete run took less than 180 seconds. Targeted runs remain available when that limit is exceeded.

## Recording video

Add `--video` to any run to record every test, or `--video=<mode>` to pass a Playwright video mode through:

```
node tests all --video
node tests puzzles dialogue --video=retain-on-failure
```

Modes are `on`, `retain-on-failure`, `on-first-retry`, and `off` (the default).

A recorded run keeps its own Playwright report and artefacts under `test-reports/`, so earlier recordings survive later runs — Playwright clears `playwright-report/` and `test-results/` at the start of every run, which is why recorded runs live elsewhere. Open **`test-reports/history.html`** for the run history: newest first, each entry showing status, duration, a link to that run's full Playwright report, a link to its runner log, and an inline player for every video.

The last fifty recorded runs are kept. Everything under `test-reports/` is generated and ignored by Git.

Recording costs time and disk, so leave it off for routine runs and switch it on when a failure needs watching or a journey needs reviewing.

## Two servers

Global setup starts two local servers:

| Server | Port | Purpose |
| --- | --- | --- |
| Release | `E2E_PORT` (default 4174) | Exactly what ships. No `/debug-capability`, and the debug modules return HTTP 404. The default `baseURL`. |
| Debug | `E2E_DEBUG_PORT` (default 4175) | Development build with the debug and test controls available. |

Testing production absence against a real release server, rather than a simulated one, is the point of the split. `e2e/game-state/debug-absent-in-production.spec.cjs` asserts it.

## Writing a scenario-driven test

`e2e/_support/debug-session.cjs` holds the shared helpers:

```js
const { openDebugGame, loadScenario, clickGridCell, waitForIdle, summary } = require('../_support/debug-session.cjs');

await openDebugGame(page);                       // debug build, real menu clicks, idle
await loadScenario(page, 'chapter1.bridge-ready'); // arrange canonical facts only
await clickGridCell(page, 'oobjectSuspiciousFencePost'); // behaviour under test: real input
expect((await summary(page)).facts).toContain('bridge.repaired');
```

Setup may skip prerequisites. The behaviour under test must still be performed through ordinary input, and assertions use stable IDs rather than translated display text.

`restoreNativeTimers(page)` puts real time back after startup, for tests that need to observe a duration such as text speed. Pair it with `page.emulateMedia({ reducedMotion: 'no-preference' })` when the behaviour under test only exists while an animation is actually animating — under reduced motion a fade resolves immediately and its frames never happen.

Section 5 added four more helpers: `canonicalChecksum(page)` digests canonical progress without scenario context so it survives a page reload (it includes the presentation mode, so take both readings in the same mode); `derivedRenderState(page)` reports what the renderer rebuilt rather than what a save carried; `returnToMenu(page)` opens the menu the way a player does; and `readSaveSlot`/`clearSaveSlots` inspect and reset stored saves.

Note that loading a scenario commits its facts through the canonical store, and declared milestones checkpoint themselves, so arranging a state legitimately writes save slots. Clear them after `loadScenario`, not before.

## Scenario coverage map

| Scenario ID | Owning area | Used by |
| --- | --- | --- |
| `chapter1.new-game` | `game-state` | Reset baseline, critical-path frontier, locked-gate explanations |
| `chapter1.library-riddle` | `dialogue` | Librarian node/choice inspection and the real-click riddle consequence |
| `chapter1.research-unlock-ready` | `puzzles` | Use-key-on-door unlock performed with real clicks; the self-checkpointing milestone |
| `chapter1.town-open` | `navigation` | Idle probes, teleport validation, overlays and diagnostics; the library milestone resume journey, the save failure paths, and the BUG-033 transition regression |
| `chapter1.den-unlock-ready` | `puzzles` | Milestone apply, scenario revert, checksum stability; the legacy-save migration journey |
| `chapter1.barn-unblock-ready` | `puzzles` | Donkey/carrot prerequisites for the barn gate |
| `chapter1.rigging-ready` | `save-load` | Repository save/load round trip; the den milestone resume journey |
| `chapter1.bridge-ready` | `game-state` | Same-seed checksum reproduction; the rigging milestone resume journey |
| `chapter1.wolf-ready` | `puzzles` | Final obstacle prerequisites; the bridge milestone resume journey and the manual-string transfer |
| `chapter1.map-entry` | `navigation` | Real canvas click through the opened river gate into the Map; the wolf and Map milestone resume journeys |
| `system.inventory-full` | `inventory` | Twelve carried items, presets, overflow layout |
| `system.long-localisation` | `localisation` | German locale plus slow text and the skip control |
| `system.corrupt-save` | `save-load` | Migration fixture selection and storage failure |
| `system.asset-failure` | `rendering-layout` | Deterministic asset failure simulation |

The fixtures themselves live in `src/content/scenario-registry.mjs` and are validated against shipped content by `test/unit/scenario-rules.test.mjs`.

## Implementation status

Startup, game-state, navigation, dialogue, animation-cutscenes, puzzles, save-load, rendering-layout, and accessibility contain implemented tests. The remaining folders are deliberate coverage boundaries, not claims of finished coverage.

The latest full suite passed 69 journeys in 168.959 seconds against a 180-second gate, so the margin matters. Arrange a milestone state with a scenario and `setMovementSpeed('instant')` rather than replaying a journey another test already covers.
