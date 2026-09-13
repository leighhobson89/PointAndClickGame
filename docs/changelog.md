# Living documentation changelog

## 2026-09-13 — Safe save, resume, and progress ownership (Section 5)

- Added the versioned `pointAndClick.save` schema version 2 envelope and one migration boundary for every save entering the game. Declared versions 0 and 1 migrate; anything else is refused with a stable error code rather than half-applied. The whole format is pure domain code in `src/domain/save/save-format.mjs` and documented in the new `docs/save-format.md`.
- Stopped embedding the content bundle in saves. A save now records authored progress plus a patch against the shipped content: JSON operations for navigation, objects, NPCs, and dialogue, and individual authored walk-grid cells. The browser test asserts the blunt version of this — the stored JSON must not contain an asset path.
- Separated authored world state from derived state throughout. Entity placement stamps (`o…`/`c…` grid cells), `visualPosition`, and pixel `dimensions` are never saved and are rebuilt by the placement pass; an authored cell hidden under a placed entity is recovered from the value recorded beneath it. Player position travels as a walk-grid cell rather than pixels, so a save is independent of the viewport that wrote it.
- Made restoring two-phase. Reading, migrating, validating, and building the candidate state cannot touch the running session; only then is the old session cleared and the derived half rebuilt — canvas metrics, entity placement, visual positions, background and foreground images, entity paths, and the inventory strip. A corrupt, unreadable, or unsupported save therefore changes nothing at all.
- Added progress ownership as explicit policy in `src/application/save-service.mjs`: a `resume` slot and a `checkpoint` slot, milestone checkpoints driven by the content contract's `mandatoryFacts`, a room-change autosave rate-limited to one every thirty seconds, and a savability rule that waits while a conversation, cutscene, text line, or transition is in flight. Checkpointing subscribes to the canonical store rather than being called from each puzzle, so a milestone cannot be committed without being checkpointed.
- Added a `Continue` menu control, enabled only when a stored save can actually be read, kept deliberately separate from the existing `Resume`, which returns to the session already running. Added an unobtrusive save status line: polite `role="status"` for successes, assertive `role="alert"` for failures, with the event, reason, and error code published as `data-*` attributes so tests assert on stable IDs. Five-locale copy added for every new string.
- Rewrote `saveLoadGame.js` as a thin browser adapter over the shared format and service. Manual save writes the slot and reads it back, so the string handed to the player is the bytes that were stored; import accepts the compressed string or plain JSON, from the text area or a file, through one decode/migrate/validate/apply path. `createStorageRepository` is now a wrapper over the same envelope path, so the debug scenario tools and the player's saves cannot drift into separate formats.
- Fixed BUG-033, a Section 1 regression: during a room change the previous room's foreground items were drawn over the new room's background. Making transitions awaitable had moved the `currentScreenId` commit to after the fade, while the background swap stayed before it. The room identity now commits with the background while the overlay is still opaque; the has-foreground-items flag is derived synchronously from the background URL instead of inside its `onload`; and foreground images are cached per URL rather than reallocated every frame, which also removes a per-frame `new Image()` and a per-frame console warning.
- Resolved BUG-003 with its required evidence and recorded BUG-033 as resolved. Corrected the code audit's save section, which had been a list of four open gaps.

Test evidence: `npm.cmd run check` passed dependency boundaries, content validation, and all 44 Node tests — eleven of them new, covering the format, JSON and grid patching, legacy migration and finalisation, validation, and save policy. `node tests all` passed 53/53 browser tests in 135.017 seconds; log `e2e/logs/2026-09-13T21-48-29-181Z-all.log`. The new browser coverage round-trips six milestones (library, den, rigging, bridge, wolf, Map) through a full page reload and compares canonical progress plus rebuilt derived state, proves a clean New Game claims the resume slot, watches a milestone checkpoint itself after a real unlock, migrates a declared version 1 save, carries a manual save string into a fresh session, and shows a corrupt save, an unsupported version, and a blocked `localStorage` write each leaving the running session unchanged. The BUG-033 regression test was verified against the unfixed code, where it reports 23 frames in which the displayed room and the believed room disagreed.

Watch item: the full suite has gone from 78.8 to 135.6 seconds against the 180-second gate, because save journeys reload the page. Future browser tests should arrange milestone states with a scenario and instant movement rather than replaying covered journeys.

## 2026-09-13 — Deterministic debug and test reachability (Section 4)

- Added a versioned scenario schema, seeded generator, viewport-independent state checksum, fact-consistency and prerequisite-closure rules, and a debug-only critical-path frontier as pure domain code.
- Added fourteen reviewed `chapter1.*` and `system.*` fixtures. Exit statuses are derived from the content contract's gate facts and entity/grid/inventory changes from a small reviewed fact-effect table, so no fixture copies a world-state blob.
- Added the debug controller, named idle probes with `waitForIdle()`, the additive canvas overlay layer, the DEBUG-watermarked panel, and the narrow versioned `window.__GAME_TEST__` surface. The panel and the API are two presentations of one controller.
- Gated enablement behind two independent checks: a server that advertises `/debug-capability` and returns HTTP 404 for every debug module otherwise, plus an explicit `?debug=1` or test bootstrap. Added `npm run start:debug`.
- Removed the always-available debug wheel menu from `index.html`, `styles.css`, and `ui.js`. All four of its tools moved into the gated panel — add item, legacy grid view, open value window, and toggle NPC animation — and its middle-click and NumpadSubtract shortcuts still open the panel. Resolved the debug half of BUG-023.
- Added optional video recording to the test runner: `node tests <scope> --video`, or `--video=<mode>` for a Playwright video mode. A recorded run gets its own report and artefacts under `test-reports/`, which is separate from `playwright-report/` and `test-results/` precisely because Playwright clears both at the start of every run. `test-reports/history.html` lists the last fifty recorded runs newest-first with status, duration, links to that run's Playwright report and runner log, and an inline player for each video. Added `npm run test:video`.
- Stopped `updateDebugValues()` serialising the whole grid every frame unless the legacy debug window is open, and kept frame sampling and overlays out of production builds; recorded the remaining console noise against BUG-016.
- Fixed the browser-created global `canvas` that Section 3 missed in `swapBackgroundOnRoomTransition`, and made text display speed a resettable scale with a supported skip path that still resolves queued promises.
- Corrected the code audit: room/object counts, the resolved Debug Room, Map, topology, and Market Street gaps, the hotspot tooling that now exists, and above all the save/load section, which wrongly claimed only language was persisted. BUG-003 now records the real defects: no version envelope on the player-facing save path, no derived-state rebuild after restore, the whole content bundle embedded in the save, and no local Resume.
- Split the E2E harness into a release server and a debug server so production absence is proven against a real release build; added `e2e/_support/debug-session.cjs` helpers and mapped every scenario to its owning functional-area README.
- Recorded two new defects found while building the controls: BUG-031 (legacy conversation phases cannot be rewound by `resetConversation`) and BUG-032 (simulated asset failure records the asset without intercepting the request).
- Added a `debug-reachability-browser` CI job running the game-state, puzzles, and dialogue areas with failure recording, and uploading `test-reports/` when it fails.

Test evidence: `npm run check` passed dependency boundaries, content validation, and all 33 Node tests. `node tests all` passed 38/38 browser tests in 78.772 seconds; log `e2e/logs/2026-09-13T17-10-11-980Z-all.log`. Video recording was verified by two recorded runs followed by an ordinary run, confirming the recordings and their reports survive. The new browser coverage includes same-seed checksum reproduction, all fourteen fixtures loading under one second each, invalid-scenario rejection before rendering, a real canvas click from `chapter1.map-entry` into the Map, a scenario-arranged research-room unlock performed with real clicks, milestone revert to an identical checksum, and the release-build absence of every debug symbol, module, and panel.

## 2026-09-13 — Browser-independent rules and stable interaction IDs

- Added dependency-enforced `domain`, `application`, `adapters`, and `content` boundaries without changing any room connection or Map-room content file.
- Replaced translated command reconstruction with stable semantic intents for all nine verbs, contextual clicks, and deterministic two-target Use/Give selection; made inventory add/remove/combine/use rules immutable and idempotent.
- Removed localisation `eval` in favour of explicit fallback, missing-key reporting, and allow-listed named interpolation.
- Added explicit dialogue graph/state rules and migrated the librarian tutorial to stable nodes, choices, and the `library.learnRiddle` consequence.
- Added canonical, prerequisite-aware Chapter 1 puzzle effects plus `whyUnavailable` and gate-reason selectors; adapted key runtime events to commit shared facts.
- Extracted pure A*, movement costs, unreachable fallback, pointer transforms, walk-grid target resolution, and semantic hotspot/anchor rules.
- Added session, renderer, DOM, asset, storage, and content adapters with Node integration coverage and real-browser `localStorage` coverage.
- Fixed BUG-030 found during verification: session reset now restores the stable `walkTo` default, retaining existing click movement and navigation behaviour.
- Updated BUG-009 to verify, resolved BUG-010 and BUG-022, and kept remaining legacy dialogue/import-cycle debt explicit in BUG-011 and BUG-021.

Test evidence: `npm.cmd run check` passed dependency/content validation and all 24 Node tests. `node tests all` passed all 18 browser tests in 35.914 seconds, including all five librarian locales, browser storage, click movement, every established open/locked navigation case, startup, reset, and reduced-motion sequencing; log: `e2e/logs/2026-09-13T16-10-10-625Z-all.log`.

## 2026-09-13 — Authoritative Chapter 1 content contract

- Added the versioned chapter1-world-v1 contract for 18 rooms, five locales, reciprocal topology, four gate facts, grid variants/transforms, hotspot policy, puzzle reachability, and legacy runtime actions.
- Chose five Market Street exits, labelled superseded map/brief/backups, intentionally removed the broken production Debug Room, and resolved BUG-001, BUG-019, and BUG-020.
- Added the Map overlook background, deterministic polygon walk grid, repaired-bridge transition/return geometry, stable payoff object, localised response, and chapter1.mapReached fact; resolved BUG-002.
- Added browser-safe schemas/combined validation plus standalone validate:content, report:hotspots, and check commands; startup now rejects an invalid combined content bundle atomically through the visible fatal alert.
- Corrected stale entity/action references, invalid grid codes, the stray e6, and reversed repaired-river exit IDs; extended the Map exit clear of the decorative border.
- Added four content/schema unit tests, CI validation/navigation jobs, a generated hotspot report, browser asset decoding for every room, normal canvas entry/return across every connection, and locked-state coverage for all four gates. Recorded the eight undersized legacy exit targets as BUG-029 for Section 7.

Test evidence: `npm.cmd run check` passed content validation and all 11 unit tests. `node tests navigation startup` passed all 10 targeted browser tests in 18.253 seconds; log: `e2e/logs/2026-09-13T07-33-17-837Z-navigation+startup.log`.

## 2026-09-13 — Deterministic state and startup lifecycle

- Audited every maintained document against the master checklist, expanded missing work, put it in dependency order, and added a source-coverage map.
- Added a versioned serialisable initial-state factory and canonical store with actions, selectors, validation, snapshots, reset, and subscriptions.
- Replaced the empty global reset, added explicit application boot and game-session disposal, cancelled the owned animation frame, and removed session listeners before restart.
- Made game-data loading concurrent, HTTP-aware, shape-validated, and atomic; required images and data are now awaited before gameplay.
- Added a visible fatal startup alert, awaitable/reduced-motion-safe transitions, and valid zero-coordinate handling.
- Preserved the live player reference required by legacy frame movement and made background selection immune to stale image-load callbacks.
- Added seven passing unit tests plus browser tests for fatal data failure, delayed asset readiness, reduced-motion sequencing, real click-to-walk movement, and five clean New Game cycles without listener growth.
- Updated the bug register: BUG-004 through BUG-008 and BUG-012 are resolved with their required unit/browser evidence.
- Recorded and resolved the store-adapter movement regression (BUG-027) and stale background race (BUG-028) found during browser verification.

Final test evidence: `npm.cmd run test:unit` passed 7 tests in 0.081 seconds. `node tests all` passed all 6 browser tests in 9.260 seconds, including click-to-walk and reduced-motion transitions. The browser run used the approved browser-capable context required to access the user-level Playwright cache.

## 2026-09-13 — Audit and test foundation

- Studied runtime source/data and all available relevant design resources: GDD, puzzle design, world map, full and Chapter 1 puzzle dependencies, dialogue flow, pulley flow, Market Street brief, and representative visual assets.
- Added the living documentation set covering product intent, full code/content audit, click zones, world/puzzle model, known bugs, incremental refactor, features, UI/art, unit/E2E testing, and debug/test controls.
- Added an ordered master implementation checklist and repository working agreement for Leigh.
- Added the Express development server and repaired the `npm start` entry point.
- Added Playwright, installed Chromium, and created functional-area E2E scaffolding.
- Added the exact `node tests all` / `node tests <area>` runner with logs, duration tracking, the 180-second full-run gate, and maximum three targeted areas.
- Added and passed a real-click startup proof: choose English, click New Game, and verify gameplay canvas/UI without local request failures or page errors.
- Made the startup request-failure assertion independent of the configured local E2E port.
- Expanded `.gitignore` for dependency folders, builds, Playwright outputs/logs, caches, environment files, and machine-local editor/OS files.
- Removed the three existing `builds/` outputs from Git tracking while preserving their local copies.

Test evidence: `node tests all` passed one Playwright test in 2.104 seconds during harness establishment. After the documentation and hygiene pass, syntax checks passed for the Node/ES-module sources and `node tests startup` passed in 4.877 seconds. Chromium execution required the approved browser-capable context because the managed workspace sandbox cannot read the user-level Playwright browser cache.
