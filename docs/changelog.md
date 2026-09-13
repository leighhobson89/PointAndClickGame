# Living documentation changelog

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
