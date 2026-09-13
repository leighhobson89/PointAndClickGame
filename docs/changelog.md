# Living documentation changelog

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
