# Living documentation changelog

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
