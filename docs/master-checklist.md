# Master implementation checklist

This is the ordered delivery checklist. Items are intentionally dependency-aware. Do not mark a parent task complete while any required acceptance item remains unchecked.

## 0. Preserve and agree the baseline — current task

- [x] Read available game/puzzle design documents and scene brief.
- [x] Inspect world map, puzzle dependency diagrams, dialogue flow, pulley rigging flow, and representative artwork.
- [x] Audit source architecture, content data, click zones, world graph, localisation, assets, dependencies, and repository weight.
- [x] Create living documentation index and project-local working agreement for Leigh.
- [x] Create bug register, refactor plan, feature roadmap, UI/art plan, testing plan, and debug-control plan.
- [x] Add Playwright and install Chromium.
- [x] Add functional-area E2E folders and exact `node tests all` / `node tests <area>` runner.
- [x] Enforce timing log, 180-second full-suite gate, and three-area targeted limit.
- [x] Prove browser startup and actual New Game click.
- [x] Expand `.gitignore` for dependencies, generated builds, test output, logs, caches, and local settings.
- [x] Remove already tracked generated build files from the Git index while retaining local copies.
- [x] Final verification: syntax/package check, targeted startup test, and clean review of intended changes.

## 1. Establish deterministic state and failure handling

- [ ] Define `createInitialGameState()` and canonical serialisable schema.
- [ ] Add store/actions/selectors with one source of truth.
- [ ] Implement session boot/start/dispose/reset; remove empty reset behaviour.
- [ ] Own and dispose all DOM/canvas/window listeners and animation frames.
- [ ] Await asset/data readiness before game loop.
- [ ] Check HTTP status/JSON schema and display actionable fatal-load UI.
- [ ] Unit-test clean restart, coordinate zero, transitions, and load failures.
- [ ] E2E: five clean New Game cycles with no retained state/listener growth.

## 2. Validate and reconcile content

- [ ] Choose/version the canonical world map and record topology decision.
- [ ] Decide Market Street's fourth/fifth exit intentionally.
- [ ] Repair/remove Debug Room broken references.
- [ ] Supply/repair Map background, grid, navigation, and payoff content.
- [ ] Define schemas for rooms, grids, objects, NPCs, dialogue, locale, and puzzles.
- [ ] Validate files, IDs, reciprocal exits, bounds, anchors, dialogue links, and locale keys.
- [ ] Add content validator command to normal checks/CI.
- [ ] E2E: enter and return from every intended room/gate state.

## 3. Make commands, dialogue, and puzzles explicit

- [ ] Replace translated sentence parsing with structured command intents.
- [ ] Replace `eval` localisation with allow-listed interpolation.
- [ ] Define explicit dialogue graph nodes/conditions/actions; migrate library first.
- [ ] Define Chapter 1 facts, prerequisites, idempotent effects, and availability explanations.
- [ ] Extract pathfinding/hotspot resolution as pure functions.
- [ ] Remove new/existing circular dependencies as modules migrate.
- [ ] Unit-test nine verbs, inventory combinations, dialogues, puzzle graph, and paths.
- [ ] E2E: library tutorial vertical slice in all five locales.

## 4. Build debug/test reachability

- [ ] Implement versioned scenario registry and builder.
- [ ] Add deterministic seed, validation, and state checksum.
- [ ] Add test-only bootstrap and narrow `__GAME_TEST__` API.
- [ ] Add reliable `waitForIdle()` across all async systems.
- [ ] Add named Chapter 1/system scenarios from `debug-test-controls.md`.
- [ ] Add debug panel for session/location/inventory/dialogue/puzzles/save/presentation.
- [ ] Add grid/hotspot/anchor/path overlays and availability explanations.
- [ ] Add reproduction bundle export.
- [ ] Assert debug API/panel is absent from production.

## 5. Complete save and resume

- [ ] Define versioned save format from canonical facts.
- [ ] Persist room/position, inventory, world mutations, quests, dialogue, locale/settings, and required timing state.
- [ ] Implement validation, atomic restore, migration, and corrupt-save recovery.
- [ ] Implement local Resume/autosave plus manual export/import.
- [ ] Ensure transient rendering caches are rebuilt rather than persisted.
- [ ] Unit-test round trips and migrations.
- [ ] E2E: save/reload at library, den, rigging, bridge, and Map milestones.

## 6. Complete and polish Chapter 1

- [ ] Implement each dependency-graph prerequisite/effect.
- [ ] Ensure required clues/items remain recoverable; eliminate soft-locks.
- [ ] Add journal/objectives and spoiler-safe hint tiers.
- [ ] Add authored feedback for meaningful and invalid actions.
- [ ] Complete Map entry/payoff and chapter transition.
- [ ] E2E critical path plus representative alternate/order variations.
- [ ] Manual narrative, humour, pacing, and puzzle-fairness review.

## 7. Modernise rendering, input, UI, and accessibility

- [ ] Add canonical responsive stage and tested pointer/world transform.
- [ ] Separate semantic hotspots from walk-grid geometry.
- [ ] Add keyboard, touch, focus, semantic DOM mirror, and announcements.
- [ ] Define design tokens and replace generic/fixed-position menu/HUD.
- [ ] Improve dialogue, inventory, two-target feedback, loading/save/error states.
- [ ] Add hotspot assistance, text speed, reduced motion, high contrast, and settings.
- [ ] Run responsive/localisation/zoom/accessibility matrix.
- [ ] Add approved visual regression baselines.

## 8. Unify and optimise art/audio

- [ ] Approve art direction and produce an art bible.
- [ ] Build asset manifest/contact sheets/duplicate report.
- [ ] Set canonical scene, character, animation, icon, and export standards.
- [ ] Restyle/normalise one gold-standard vertical slice, then migrate room by room.
- [ ] Optimise assets and enforce decoded/transfer budgets.
- [ ] Record provenance/licensing for source and AI-assisted assets.
- [ ] Implement music, ambience, SFX, subtitles, mixer, mute, and persistence.
- [ ] Perform in-game-scale visual/audio review and performance profiling.

## 9. Harden dependencies and delivery

- [ ] Decide browser/PWA versus Electron packaging ownership and structure.
- [ ] Bundle runtime dependencies; remove CDN requirement and enable strict CSP/offline boot.
- [ ] Review and upgrade vulnerable dependencies without blind forced fixes.
- [ ] Move desktop packaging tools to appropriate development scope.
- [ ] Consider Git LFS/external source-art storage and reduce binary history deliberately.
- [ ] Add CI tiers, artefact retention, release versioning, signing/update plan as applicable.
- [ ] Release gate: security, save compatibility, performance, accessibility, content validation, all permitted tests, and manual experience checklist pass.

## Per-task completion template

- [ ] Requested behaviour implemented or clearly reported as analysis-only.
- [ ] Relevant unit/content/integration tests added and passed.
- [ ] Relevant E2E areas run under timing policy; command/result/duration recorded.
- [ ] New bugs entered and fixed bugs verified in `bugs.md`.
- [ ] Relevant docs/checklist updated.
- [ ] `docs/changelog.md` updated.
- [ ] Git diff checked for generated files, secrets, unintended binaries, and unrelated changes.
