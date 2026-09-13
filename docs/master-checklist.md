# Master implementation checklist

This is the complete dependency-ordered delivery checklist. It consolidates every implementation or verification task in the maintained `docs/` set. Planned behaviour remains unchecked; a parent outcome is not complete while a required child or acceptance item is unchecked.

## 0. Preserve and agree the baseline — complete

- [x] Read the available game/puzzle design documents and Market Street scene brief.
- [x] Inspect the world map, puzzle dependency diagrams, dialogue flow, pulley flow, and representative art.
- [x] Audit architecture, runtime, content, click zones, localisation, assets, dependencies, repository weight, and known risks.
- [x] Create the living-documentation index, working agreement, bug register, refactor plan, roadmap, testing strategy, debug plan, and UI/art direction.
- [x] Restore `npm start` with a local server and health endpoint.
- [x] Add Playwright, Chromium setup, functional-area E2E folders, and the exact `node tests all` / `node tests <area>` runner.
- [x] Enforce test timing logs, the 180-second full-suite gate, and the three-area targeted limit.
- [x] Prove a real browser startup and New Game click.
- [x] Expand `.gitignore`; untrack generated builds while preserving local copies.
- [x] Record the baseline syntax/package/browser evidence and review the intended diff.

## 1. Establish deterministic state, lifecycle, and startup failure handling — implemented

- [x] Define `createInitialGameState()` and a versioned, plain serialisable canonical schema.
- [x] Add a store with actions, selectors, snapshots, subscriptions, validation, and replacement reset.
- [x] Preserve the legacy renderer's live player-object identity while canonical store updates publish, protecting per-frame movement.
- [x] Introduce explicit `bootApplication()`, `startGame()`, `disposeGame()`, restore, and reset boundaries.
- [x] Replace the empty `resetAllVariables()` with complete initial-state and transient-state replacement.
- [x] Give each session one owned animation frame and one disposable canvas/window listener set.
- [x] Preserve menu/localisation and freshly loaded content while clearing inventory, position, dialogue, movement, puzzle, and presentation residue.
- [x] Load required JSON concurrently, check HTTP success, validate startup shapes, and commit data atomically.
- [x] Await required image and data readiness before showing/starting gameplay.
- [x] Show an actionable `role="alert"` fatal-load state and leave the game loop stopped on failure.
- [x] Make transitions awaitable, provide a reduced-motion/no-event completion path, and accept zero coordinates.
- [x] Unit-test fresh-state isolation, store reset/actions/subscriptions, invalid state, coordinate zero, transition completion, malformed JSON, schema failure, and HTTP failure.
- [x] E2E-test five New Game cycles with stable listener counts, normal startup, fatal loading, delayed asset readiness, reduced-motion transition sequencing, and real click-to-walk movement.

Acceptance: each New Game has a fresh canonical state, one loop/listener set, an awaited readiness boundary, and a visible fail-fast path.

## 2. Make the content contract authoritative — implemented

- [x] Choose and version the canonical world topology; archive or label superseded diagrams/data.
- [x] Decide whether Market Street has four or five exits and align navigation, art, and hotspot geometry.
- [x] Restore or intentionally remove Debug Room; repair its grid, object/NPC data, destination, and return path if retained.
- [x] Supply and integrate the Map background, grid, navigation, interaction/payoff content, and return/chapter transition.
- [x] Define runtime or JSON schemas for room navigation, grids/codes, objects, NPCs, dialogue, localisation, puzzle facts/actions, scenarios, and saves.
- [x] Validate unique/stable IDs, files/assets, all references, grid dimensions/codes, and entity room membership.
- [x] Validate reciprocal exits or declared one-way exceptions, gate facts, in-bounds walkable spawns, interaction anchors, and hotspot bounds/overlaps.
- [x] Validate dialogue links/choice reachability, item/event references, locale completeness/fallback, puzzle reachability, and orphan mandatory facts.
- [x] Add a standalone content-validation command to normal checks and CI; fail startup clearly on invalid shipped content.
- [x] Add a hotspot authoring/inspection report covering rectangles/polygons, accessible labels, anchors, overlaps, and minimum target size.
- [x] E2E-test entering and returning from every intended room in every relevant gate state.

Acceptance: one command validates all shipped content, the maintained map and runtime agree, and no intended room is broken or orphaned.

## 3. Extract explicit, browser-independent game rules

- [x] Establish `domain`, `application`, `adapter`, and `content` module boundaries; prohibit domain imports of DOM, canvas, file paths, translated copy, or mutable globals.
- [x] Add a dependency rule, break existing circular imports as modules migrate, and remove reliance on the browser-created global `canvas` name.
- [x] Replace translated-sentence reconstruction with `{ verbId, primaryTargetId, secondaryTargetId }` command intents.
- [x] Implement and test all nine verbs, contextual default click, two-target state/cancel/error rules, and inventory add/remove/combine/use idempotency.
- [x] Replace localisation `eval` with allow-listed named interpolation tokens and explicit fallback/missing-key handling.
- [x] Define explicit dialogue nodes, choices, conditions, actions, and stable consequence IDs; migrate and characterise the library conversations first.
- [x] Convert event mutations into idempotent prerequisite/effect actions and one canonical set of Chapter 1 facts.
- [x] Add `whyUnavailable`/gate-reason selectors and make alternate solutions converge on shared facts.
- [x] Extract A*, costs, unreachable fallbacks, pointer-to-world transforms, walk-grid resolution, and semantic hotspot/anchor resolution as pure functions.
- [x] Add fast unit coverage for path boundaries/costs, navigation, inventory, commands, dialogue traversal, localisation, puzzle effects/reachability, save migrations, and pointer transforms.
- [x] Add integration coverage for session lifecycle with fake renderer/storage, renderer draw order with a recording context, DOM-to-store actions/rendering, asset readiness/errors, and browser storage.
- [x] E2E-test the library tutorial vertical slice in all five locales without locating actions by translated sentence fragments.

Acceptance: core rules run under Node without a browser, stable IDs drive behaviour, and punctuation/translation cannot execute control flow.

Implementation note (2026-09-13): Section 3 deliberately leaves the Map room artifacts and all authored room connections unchanged. Runtime navigation remains the source of truth; this extraction does not connect, disconnect, or otherwise reinterpret the sidelined Map room.

## 4. Build deterministic debug and test reachability — implemented

- [x] Create a versioned scenario schema, registry, minimal builder, deterministic seed, validation, and state checksum.
- [x] Add reviewed fixtures for every `chapter1.*` and `system.*` scenario in `debug-test-controls.md`.
- [x] Derive object/NPC/exit mutations from facts instead of copying large world-state blobs.
- [x] Add development/test-only bootstrap and the narrow versioned `__GAME_TEST__` API.
- [x] Implement `waitForIdle()` across assets, movement, dialogue, transitions, animation/cutscenes, and save queues.
- [x] Build DEBUG-watermarked session controls for new/load/reset/pause/resume, seed, snapshot import/export, schema version, and checksum.
- [x] Add validated room/anchor/coordinate teleport, complete/cancel path, and slow/normal/fast/instant movement controls.
- [x] Add inventory presets/add/remove, structured verb/target selection, consumed/moved-object reset, and selected-response diagnostics.
- [x] Add dialogue-node selection, choice condition/action inspection, instant/text-speed/skip, conversation reset, and NPC room/visibility/pose/fact inspection.
- [x] Add puzzle fact/prerequisite listing, milestone transactions, scenario-based revert, conflict validation, gate explanations, and a debug-only critical-path frontier.
- [x] Add real-repository scenario save/load, migration-fixture selection, locale/missing-key simulation, viewport/accessibility/input toggles, and deterministic asset/storage failures.
- [x] Add walk grid/cost, blocked cell, exit, hotspot, footprint, anchor, path, player-cell, overlap, and unreachable overlays.
- [x] Add structured action/error logging, current-state diagnostics, prerequisite/conflict explanations, asset readiness, and frame-time summary.
- [x] Add a reproduction-bundle export containing version, scenario, seed, actions, checksum, and errors.
- [x] Map scenarios to functional-area READMEs; prove same seed/state gives the same checksum and visible result in under one second after readiness.
- [x] Reject invalid scenarios before rendering and E2E-assert all debug symbols, APIs, panels, and query-only enablement are absent from production.

Acceptance: every important state is reachable quickly and reproducibly without creating a second state model or weakening release builds.

Implementation note (2026-09-13): enablement needs two independent gates — a server that advertises `/debug-capability` and refuses to serve the debug modules otherwise, plus an explicit `?debug=1` or test bootstrap. The E2E harness runs a release server and a debug server side by side so production absence is proven against a real release build. The always-available legacy debug wheel was removed from `index.html`, `styles.css`, and `ui.js`; its capabilities now live behind the gated panel. Two limits are recorded rather than hidden: legacy conversation phases cannot be rewound by `resetConversation` (BUG-031, a consequence of BUG-011), and simulated asset failure records the asset without intercepting the request (BUG-032).

## 5. Complete safe save, resume, and progress ownership — implemented

- [x] Define the versioned save format and migration boundary using stable canonical facts only.
- [x] Persist room/position, inventory, world mutations, quest facts, dialogue/choices, gates, locale/settings, and only required timing state.
- [x] Rebuild images, paths, DOM/canvas references, render caches, transient animations, and other derived state after restore.
- [x] Validate before apply, restore atomically, preserve the current session on failure, and recover clearly from corrupt/unsupported saves.
- [x] Implement local Resume, checkpoints/autosave, manual export/import, and unobtrusive save/error feedback.
- [x] Test clean initial snapshots, representative mid-puzzle round trips, legacy migrations, corrupt data, storage failure, and changed-language restore.
- [x] E2E-save/reload at library, den, rigging, bridge, wolf, and Map milestones and compare canonical plus derived visible state.

Acceptance: progress is never partially applied or silently discarded and remains compatible across declared schema versions.

Implementation note (2026-09-13): the format is documented in `save-format.md`. Two decisions are worth carrying forward. A save stores authored progress plus a *patch* against shipped content, never a copy of it, and position travels as a walk-grid cell rather than pixels, so a save is independent of the viewport that wrote it. Restoring is two-phase — read, migrate, validate and build a candidate state, and only then clear the session and rebuild the derived half — which is what makes a corrupt or unsupported save change nothing at all. "Resume" and "Continue" are kept as two separate menu controls because they are two different ideas: Resume returns to the session already running, Continue reopens the stored save. `dialogue.activeNodeId` is deliberately never persisted while BUG-011 stands, so a restore lands in the room rather than part-way through a conversation nobody can rewind.

Fixed alongside (BUG-033): a room change drew the previous room's foreground items over the new room's background, a regression introduced when Section 1 made transitions awaitable.

## 6. Complete and validate the Chapter 1 vertical slice

- [ ] Finalise the library tutorial: librarian, riddle, books/key, research-room access, and clear town exit.
- [ ] Implement every named Chapter 1 dependency, prerequisite, effect, acknowledgement, and availability explanation from the puzzle model.
- [ ] Complete the hook/mirror/rope, den/paper, donkey/barn/barrel/mallet, carpenter/cow/bench/nails, drain/bowl/milk/dog/bone, rigging/wood/bridge, wolf, and Map chains.
- [ ] Keep required clues/items available until solved, make default effects idempotent, review irreversible actions, and remove all known soft-locks.
- [ ] Give every meaningful object an authored/entertaining Look response and sensible invalid-action feedback.
- [ ] Add optional examine variants and character barks that reward exploration without gating progress.
- [ ] Add a journal/objective model derived from facts plus spoiler-safe tiered hints at major milestones.
- [ ] Record stable choice variants and add a chapter-completion summary.
- [ ] Defer large branching routes until the canonical graph and state migrations are proven.
- [ ] E2E the critical path, alternate solutions/orderings, milestone gates, recoverability, and Map payoff.
- [ ] Manually review narrative continuity, humour, pacing, discoverability, puzzle fairness, and the bridge into later chapters.

Acceptance: a new player can progress from the Library Foyer to the Map without a soft-lock and with clear, funny feedback.

## 7. Modernise input, UI, responsiveness, and accessibility

- [ ] Define a canonical logical stage, scale/letterbox policy, responsive breakpoints, and deterministic pointer mapping.
- [ ] Define renderer layers and introduce dirty-region/caching work only where profiling justifies it.
- [ ] Separate semantic rectangle/polygon hotspots and interaction anchors from walk-grid cells.
- [ ] Add optional hotspot reveal with accessible names/intensity and no pixel-hunting requirement.
- [ ] Add fast-walk/double-click and supported skip for previously seen skippable animations.
- [ ] Add keyboard focus traversal, verb shortcuts, inventory/dialogue navigation, Escape/back, touch parity, and no hover dependency.
- [ ] Mirror canvas hotspots as semantic DOM controls; add accessible names/roles, focus management, concise scene descriptions, and live announcements.
- [ ] Document and enforce minimum pointer/touch targets and input preferences; add optional controller support after core input parity.
- [ ] Define colour/type/spacing/radius/border/shadow/motion/focus/high-contrast tokens.
- [ ] Replace generic Bootstrap/fixed-percentage menu and HUD with cohesive responsive components.
- [ ] Improve action sentence, target emphasis, classic/contextual verb modes, inventory cards/overflow, dialogue panel/choices, and loading/save/error/autosave states.
- [ ] Add settings for locale, text speed, volume groups, subtitles/captions, reduced motion, high contrast, hotspot help, and input mode; persist them.
- [ ] Test 1280×720, 1440×900, 1920×1080, tablet/touch, 200% zoom, five locales, long strings, high contrast, reduced motion, keyboard-only, and screen-reader-oriented journeys.
- [ ] Add approved visual baselines only after intentional scene/component approval.

Acceptance: the same domain actions work by mouse, keyboard, touch, and assistive paths and remain usable under the full layout matrix.

## 8. Unify and optimise art, animation, and audio

- [ ] Approve “storybook caricature adventure” or another explicit art direction and reconcile the GDD’s pixel-art wording.
- [ ] Create an art bible covering aspect/safe area, camera/perspective/walk plane, character depth/scale, outlines/detail, shadows/palette/light, occlusion/alpha, animation naming/anchors/crops/directions, icons, and byte/dimension budgets.
- [ ] Build an asset manifest with semantic ID, role, source, dimensions, crop/anchor, room scale, hash, licence, and provenance.
- [ ] Generate role-based contact sheets plus exact/near-duplicate reports; alias intentional reuse.
- [ ] Select and approve one gold-standard room and player/NPC interaction, then normalise complete rooms without shipping partially mixed styles.
- [ ] Create a reproducible export/optimisation pipeline and compare at gameplay scale; enforce transfer, decode, memory, and frame-time budgets.
- [ ] Document AI-assisted composition/cleanup/upscale/style use, reference consistency, human paint-over, provenance, licensing, and in-game acceptance.
- [ ] Implement settings-aware music, scene ambience, location/milestone transitions, dialogue/character cues, interaction SFX, subtitles/captions, mixer, mute, and persistence.
- [ ] Profile startup, image decode, steady/scrolling/animated frame time, allocations, and event/log noise; remove per-frame debug spam from production.
- [ ] Perform room-by-room in-game visual, animation, audio, readability, and performance acceptance.

Acceptance: assets and sound feel intentionally related, meet budgets, preserve authored humour, and degrade safely with accessibility settings.

## 9. Harden dependencies, offline delivery, and release quality

- [ ] Decide browser/PWA versus Electron ownership, target platforms, and packaging directory structure.
- [ ] Bundle Bootstrap/jQuery/Popper/LZString or remove them; boot offline under a strict CSP with no runtime CDN dependency.
- [ ] Review all dependency advisories, upgrade deliberately without blind forced fixes, retest browser/desktop targets, and record a zero-vulnerability or approved-exception baseline.
- [ ] Move Electron and packaging-only tools to development scope where appropriate.
- [ ] Establish formatting/linting after a no-functional-change baseline and prevent new dependency cycles/named globals.
- [ ] Define measurable startup, frame-time, image decode/transfer, memory, and test-suite budgets and enforce them at suitable CI tiers.
- [ ] Add validation/unit/affected-area PR CI, under-180-second nightly/full CI, release automation, failure screenshots/traces, and intentional artefact retention.
- [ ] Keep E2E isolated in fresh contexts with controlled randomness/clocks/storage, locally served assets, and no test-order/save dependency; enable video only for targeted diagnosis. (The video half landed in Section 4: `node tests <scope> --video` records a run into its own `test-reports/` folder and lists it in `test-reports/history.html`. Recording stays off by default.)
- [ ] Make any quarantine temporary, owner/date-bound, visible, and excluded from coverage claims.
- [ ] Decide Git LFS or external source-art storage and reduce binary history through a separately approved, recoverable migration.
- [ ] Define release versioning, save compatibility, distribution artefacts, signing, updates, rollback, and platform smoke tests.
- [ ] Add optional achievements/hidden interactions only after the critical path is robust.
- [ ] Add additional chapters from validated schemas; defer cloud saves until local saves, privacy, identity, conflicts, and migration policy are explicit.
- [ ] Run the final security, CSP/offline, dependency, content, save compatibility, performance, accessibility, automated-test, and manual experience gates.

Acceptance: a reproducible release works offline, protects saves, has an explicit security baseline, and passes automated and human experience checks.

## Cross-cutting definition of done for every task

- [ ] Requested behaviour and failure states are implemented, or the task is explicitly recorded as analysis/design only.
- [ ] Stable IDs, localisation, accessibility, save/load effects, and debug reachability are addressed where relevant.
- [ ] Relevant unit/content/integration tests pass.
- [ ] Relevant E2E areas run through `node tests ...`; command, result, duration, and retained evidence are recorded.
- [ ] New defects are added to `bugs.md`; fixes move through `verify` to `resolved` only with the required evidence.
- [ ] Affected living docs and this checklist are updated; `docs/changelog.md` receives a dated entry.
- [ ] The diff is checked for secrets, generated output, unintended binaries, unrelated edits, and temporary compatibility code that now has a deletion task.
- [ ] Each change is one reviewable conceptual extraction and preserves characterised behaviour unless its task explicitly changes that behaviour.
- [ ] Refactors remove superseded legacy paths/adapters before completion and never leave an undocumented duplicate source of truth.

## Source coverage map

| Source document | Checklist coverage |
| --- | --- |
| `product-vision.md` | Sections 3, 5–9 |
| `save-format.md` | Section 5, plus the save compatibility gate in Section 9 |
| `code-audit.md` and `bugs.md` | Sections 1–3 and 7–9 |
| `world-and-puzzles.md` | Sections 2, 3, and 6 |
| `refactor-plan.md` | Sections 1–3, 7, and 8 |
| `feature-roadmap.md` | Sections 2–9, including deferred features |
| `ui-and-art-direction.md` | Sections 7 and 8 |
| `testing-strategy.md` | Acceptance lines and cross-cutting definition of done |
| `debug-test-controls.md` | Section 4 plus scenario/save/input acceptance elsewhere |
