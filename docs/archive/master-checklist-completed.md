# Master implementation checklist — completed sections

The delivered half of the checklist. Sections 0 to 5 are complete; the completed items of Section 6 are recorded at the end. The outstanding work lives in [master-checklist.md](../master-checklist.md).

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

## 3. Extract explicit, browser-independent game rules — implemented

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

Implementation note (2026-09-13): the format is documented in [save-format.md](../save-format.md). Two decisions are worth carrying forward. A save stores authored progress plus a *patch* against shipped content, never a copy of it, and position travels as a walk-grid cell rather than pixels, so a save is independent of the viewport that wrote it. Restoring is two-phase — read, migrate, validate and build a candidate state, and only then clear the session and rebuild the derived half — which is what makes a corrupt or unsupported save change nothing at all. "Resume" and "Continue" are kept as two separate menu controls because they are two different ideas: Resume returns to the session already running, Continue reopens the stored save. `dialogue.activeNodeId` is deliberately never persisted while BUG-011 stands, so a restore lands in the room rather than part-way through a conversation nobody can rewind.

Fixed alongside (BUG-033): a room change drew the previous room's foreground items over the new room's background, a regression introduced when Section 1 made transitions awaitable.

## 6. Chapter 1 vertical slice — the completed items

The unfinished items of this section remain in the live checklist.

- [x] Finalise the library tutorial: librarian, riddle, books/key, research-room access, and clear town exit.
- [x] Implement every named Chapter 1 dependency, prerequisite, effect, acknowledgement, and availability explanation from the puzzle model.
- [x] Complete the hook/mirror/rope, den/paper, donkey/barn/barrel/mallet, carpenter/cow/bench/nails, drain/bowl/milk/dog/bone, rigging/wood/bridge, wolf, and Map chains **as canonical facts**; every chain is modelled, wired to its runtime events and pickups, and proven reachable.
- [x] Keep required clues/items available until solved, make default effects idempotent, review irreversible actions, and remove all known soft-locks.
- [x] Give every meaningful object an authored/entertaining Look response and sensible invalid-action feedback.
- [x] Add a journal/objective model derived from facts plus spoiler-safe tiered hints at major milestones.
- [x] Record stable choice variants and add a chapter-completion summary.
- [x] Defer large branching routes until the canonical graph and state migrations are proven.
- [x] E2E the critical path, alternate solutions/orderings, milestone gates, recoverability, and Map payoff. The critical path is walked action by action as a unit test, which asserts after every one of the 44 steps that the chapter is still finishable. Milestone gates, gate explanations, recoverability, and the Map payoff are covered in the browser.

Implementation note (2026-09-13): the canonical puzzle graph went from an 11-action spine to 44 named actions over 56 facts, which is the whole of the Chapter 1 dependency diagram rather than a summary of it. Three decisions are worth carrying forward.

The runtime gate was deliberately **not** widened along with the graph. `executeAllowedAction` still refuses to re-run an event whose effects are already recorded, and the nine originally wired events keep their blocking prerequisite check, but the twenty-two mappings added here record their action and log a diagnostic instead of refusing to run. A blocking gate across a 44-action graph has exactly one failure mode — stranding the player behind a fact the runtime forgot to record — and that is the opposite of this section's goal. The graph is still enforced, in the validator, in the fact-level critical-path walk, and in `getProgressDiagnostics()`; it simply cannot brick a save. BUG-036 tracks promoting mappings back to blocking gates per chain, once each chain has browser coverage of its real ordering.

The journal holds no state. Objectives, hints, gate explanations, and the completion summary are all derived from facts on every render, so restoring a save restores the journal exactly and there is no second progress model to keep in step. The one thing the journal does own is how many hint tiers the player has asked to see, which is per-session and deliberately not saved: a hint is something you asked for once, not progress you earned.

Objectives stay hidden until the player has met the puzzle. That is what makes the journal spoiler-safe — it never names the wolf to someone who has not reached the river — and it is why an objective declares `revealedBy` separately from `completedBy`.

## Delivered against the later sections

These items belong to sections that are still open, but they are done and are not repeated in the live checklist.

- Video recording for browser runs: `node tests <scope> --video` records a run into its own `test-reports/` folder and lists it in `test-reports/history.html`. Recording stays off by default. (Section 9, test isolation and artefact retention.)

## 8. Art, animation, and audio — the completed items

Delivered 2026-09-14. The remaining Section 8 work stays in the live checklist.

- [x] **Approve an explicit art direction.** Storybook caricature adventure, approved by Leigh. The Game Design Document's "pixel art" wording is superseded; the shipped assets are illustrated and painted and the game is described that way from here on.
- [x] **Create the art bible.** [art-bible.md](../art-bible.md) covers stage aspect and safe area, camera and perspective and walk plane, character depth and scale, outline and detail, shadow, palette and light, occlusion and alpha, animation naming and anchors and crops and directions, inventory icons, byte and dimension budgets, reuse and aliasing, the AI-assisted asset policy, and the per-room acceptance gate. Each rule is marked as enforced by a command, measured by a report, or decided by review.
- [x] **Build the asset manifest.** `npm run report:assets` writes `resources/asset-manifest.json` and [asset-report.md](../asset-report.md) with semantic ID, role, source, dimensions, aspect, bytes, SHA-256, authored cell size, owning rooms, references, orphan state, budget breaches, and provenance and licence fields. `npm run check:assets` exits non-zero on a breach.
- [x] **Generate role-based contact sheets and duplicate reports.** `npm run report:art` renders a contact sheet per role with over-budget assets flagged, and the manifest reports exact-duplicate groups by content hash. Intentional reuse is to be aliased to one semantic ID; the report names the 13 groups to resolve.
- [x] **Rebuild the character scale mechanism.** `src/domain/navigation/depth-scale.mjs` replaces the global `0.1 + t * 0.9` ramp and the `scalingPlayerSize` multiplier with per-room authored heights in stage pixels, anchored to each room's own painted depth range, sampled from a continuous filled depth field. Covered by `test/unit/depth-scale.test.mjs`.
- [x] **Calibrate every room against its art.** All 18 rooms carry authored `playerHeightNear`, `playerHeightFar`, and `entityScaleAtNear`, chosen by reviewing the player at real walkable positions over each painting at gameplay scale.

Implementation note: character scale was the reported fault and it was a design fault rather than a tuning one. The replaced ramp mapped the depth byte through a fixed 0.1-to-1.0 curve across a global 100–255 range, then multiplied by a per-room number that was simultaneously being used to correct the room's character size and to correct its depth range. Because each room paints only part of the byte range, the two jobs fought each other: the player was 9.8 px tall at the back of Market Street and 420 px tall at the front of the Den, a 43x spread across the game, with within-room ratios from 1.77x to 10x. Authoring the two heights directly removes the coupling; the ratios are now 1.40x to 3.54x and the 4x ceiling is asserted for every room by a unit test.

## 7. Modernise input, UI, responsiveness, and accessibility — implemented

- [x] Define a canonical logical stage, scale/letterbox policy, responsive breakpoints, and deterministic pointer mapping.
- [x] Define renderer layers and introduce dirty-region/caching work only where profiling justifies it. The stage, semantic hotspot mirror, transition overlay, and vignette are explicit layers; no speculative cache was added without profiling evidence.
- [x] Separate semantic rectangle hotspots and interaction anchors from walk-grid cells.
- [x] Add optional hotspot reveal with accessible names, subtle/strong intensity, and no pixel-hunting requirement.
- [x] Expand the eight undersized legacy exit targets to the 3-by-3-cell policy and clear the report's minimum-size warnings without changing authored walk geometry (BUG-029).
- [x] Add double-click fast walk and a supported skip control. Current authored content exposes spoken lines as skippable; no cutscene animation is yet declared safe to skip.
- [x] Add keyboard focus traversal, verb shortcuts, inventory/dialogue navigation, Escape/back, touch parity, and no hover dependency.
- [x] Mirror canvas hotspots as semantic DOM controls; add accessible names/roles, focus management, concise scene descriptions, and live announcements.
- [x] Consume input-mode state so touch, keyboard, pointer, and gamepad modes change real input handling.
- [x] Enforce 44-pixel minimum pointer/touch targets, persist input preferences, and add optional controller navigation.
- [x] Define colour/type/spacing/radius/border/shadow/motion/focus/high-contrast tokens.
- [x] Replace generic Bootstrap/fixed-percentage menu and HUD with cohesive responsive components.
- [x] Improve the action sentence, target emphasis, classic/contextual verb modes, inventory cards/overflow, dialogue panel/choices, and loading/save/error/autosave states.
- [x] Give graph-driven dialogue the legacy list's three-choice-plus-exit reserve and arrow behaviour (BUG-038).
- [x] Add and persist settings for ten UI themes, locale, text speed, volume groups, subtitles/captions, reduced motion, high contrast, hotspot help/intensity, input mode, and classic verbs.
- [x] Test 1280×720, 1440×900, 1920×1080, tablet/touch, 200% zoom, five locales, long strings, high contrast, reduced motion, keyboard-only, and screen-reader-oriented journeys.
- [x] Keep pixel baselines approval-gated. The approved component behaviour is protected by structural layout assertions; scene-art pixel baselines remain deliberately deferred until the Section 8 art direction is approved.

Acceptance: the same domain actions work by mouse, keyboard, touch, controller, and assistive paths and remain usable under the full layout matrix. **The UI is completely overhauled but the story isnt changed.** Room topology, puzzle data, and dialogue graph content are unchanged too.

Implementation note (2026-09-14): the canvas always renders the authored 832×448 logical world and CSS scales it without mutating world coordinates. Semantic hotspot rectangles are projected from the composed runtime grid into a separate DOM layer; narrow exits receive a centred minimum target only in that layer, so navigation geometry and story content stay untouched. Player preferences live in the canonical settings snapshot and local storage. The seven-choice librarian node still contains the same options and consequences, but presents them four at a time with the exit always available.

Evidence: `npm.cmd run check` passed dependency validation, the 18-room/42-object/10-NPC content contract, and 62 Node tests. `node tests all` passed 69/69 browser journeys in 168.959 seconds; log `e2e/logs/2026-09-14T00-21-20-151Z-all.log`. A final `node tests accessibility rendering-layout navigation` passed 12/12 in 30.669 seconds after checking edge-clamped targets. The accessibility suite exercises keyboard verbs, semantic room targets, focus restoration, and all-room names. The responsive suite covers the full layout matrix, 44-pixel targets, long localisation, high contrast, reduced motion, and real touch input. The dialogue suite proves the original seven authored choices remain reachable.
