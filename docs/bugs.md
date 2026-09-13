# Bugs and risks

Severity: **P0** data loss/security/release blocker, **P1** major journey blocker, **P2** significant defect, **P3** polish/maintainability. Status is `open`, `planned`, `verify`, or `resolved`.

## Active register

| ID | Sev | Status | Finding and evidence | Required verification |
| --- | --- | --- | --- | --- |
| BUG-001 | P1 | open | Debug Room is not runnable: referenced debug object/NPC JSON and grid are absent, and its exit targets nonexistent `libraryFoyerDebug`. | Debug room loads, all overlays validate, and its return exit works in E2E. |
| BUG-002 | P1 | open | The `map` destination is referenced and gated, but its background and room grid are absent. Unlocking/reaching it can fail at the Chapter 1 payoff. | Content validator passes and an E2E journey enters Map without page/runtime errors. |
| BUG-003 | P0 | open | Save/export captures and restores language only. Room, position, inventory, puzzle flags, dialogue, and world mutations are discarded. | Round-trip a mid-puzzle snapshot and assert every canonical state field plus derived rendering. |
| BUG-004 | P1 | resolved | `resetAllVariables()` now replaces canonical and transient state from a fresh factory. Fresh-state unit tests and five repeated browser starts pass. | Covered by `game-state.test.mjs` and `game-state/new-game-reset.spec.cjs`. |
| BUG-005 | P2 | resolved | The active animation frame and session resize/canvas listeners now have explicit ownership and disposal. Counts remain stable across five starts. | Covered by `game-state/new-game-reset.spec.cjs`. |
| BUG-006 | P2 | resolved | Transition helpers now await completion, remove listeners, and have a zero-duration/reduced-motion completion path. | Unit sequencing and the reduced-motion opening-transition E2E pass. |
| BUG-007 | P2 | resolved | Explicit coordinate checks now preserve `0` for either axis. | Unit coverage passes for `(0,0)`, `(0,n)`, `(n,0)`, and missing values. |
| BUG-008 | P1 | resolved | Startup checks HTTP success and JSON shape, commits the bundle atomically, displays a fatal alert, and does not start gameplay on failure. | HTTP/schema unit tests and the fatal-load browser test pass. |
| BUG-009 | P0 | open | Localisation evaluation uses `eval` on expressions from data. This is unsafe, brittle, and blocks a strict CSP. | Replace with allow-listed token interpolation; CSP E2E has no violations. |
| BUG-010 | P1 | open | Semantic commands are reconstructed from translated display strings. Translation wording/order or duplicate names can invoke the wrong target/action. | Commands carry stable IDs; all five locales pass identical semantic interaction tests. |
| BUG-011 | P1 | open | Dialogue control flow relies on invisible whitespace, punctuation such as `!!!`, and compressed order strings, allowing copy edits to break logic. | Explicit dialogue-node schema passes graph validation and legacy conversations are regression-tested. |
| BUG-012 | P2 | resolved | New Game now awaits required image preload and the validated data bundle before starting. | The delayed-library-background E2E keeps gameplay hidden until readiness and passes. |
| BUG-013 | P2 | open | External CDN scripts/styles are runtime single points of failure and lack a bundled offline/CSP strategy. | App boots with network disabled and a restrictive CSP. |
| BUG-014 | P1 | open | Mouse/canvas-only interactions lack semantic controls, keyboard parity, focus management, live announcements, and robust touch behaviour. | Keyboard-only and screen-reader-oriented E2E/a11y checks cover the critical path. |
| BUG-015 | P2 | open | Fixed positioning and hard-coded percentages make the HUD fragile across viewport size, zoom, and text expansion. | Visual/layout matrix passes desktop, laptop, tablet, 200% zoom, and long-localisation cases. |
| BUG-016 | P2 | open | Per-frame debug work and extensive console output can waste frame budget and obscure real faults. | Production mode has no debug spam and meets defined frame-time budgets. |
| BUG-017 | P2 | open | Source assets have inconsistent resolution, scale, crop, finish, and file weight; duplicate assets inflate delivery/history. | Asset validator/report passes the approved art/export budget. |
| BUG-018 | P1 | open | Dependency audit reported 34 known vulnerabilities (4 low, 3 moderate, 25 high, 2 critical) in the installed tree, especially the legacy packaging/server chain. | Review upgrades, retest browser/desktop targets, and record an accepted zero/exception baseline. |
| BUG-019 | P2 | open | Runtime room topology and naming diverge from the supplied world map; the Embassy is absent, while sewer/kitchen and alternate interior names appear. | A versioned canonical world spec is approved and data/diagram validation agrees. |
| BUG-020 | P2 | open | Market Street has five runtime connections while its authored scene brief specifies four. | Design decision recorded and both art hotspot geometry and navigation data match it. |
| BUG-021 | P2 | open | Several modules form circular imports and rely on a very large mutable global-state module, creating initialization-order and regression hazards. | Dependency rule prevents new cycles and extracted domain modules pass unit tests. |
| BUG-022 | P3 | open | Code relies in places on the browser-created global `canvas` identifier instead of an explicit element reference. | Static search is clear and tests run with no named-global dependency. |
| BUG-023 | P3 | open | Menu/title and debug-facing copy contain placeholders or development presentation (`Game`, exposed Debug option) not suitable for release. | Product title/copy approved; debug entry requires explicit development enablement. |
| BUG-024 | P2 | open | Audio described by the GDD is not implemented, so the current experience lacks feedback, ambience, and scene tone. | Audio settings, interaction cues, ambience, music transitions, and mute persistence are tested. |

## Resolved in the current foundation pass

| ID | Sev | Status | Resolution |
| --- | --- | --- | --- |
| BUG-025 | P1 | resolved | `npm start` referenced a missing `server.js`. A local Express static server and health endpoint now exist. Verified indirectly by the Playwright startup journey. |
| BUG-026 | P1 | resolved | There was no repeatable real-browser proof that the app opens and starts. The `startup` Playwright test now selects English, clicks New Game, and verifies the canvas/UI without local request or page errors. |
| BUG-027 | P1 | resolved | The first state-store adapter replaced the live player object on each property update, breaking click-to-walk code that retains the object during a frame. Player updates now preserve identity; the real-click navigation regression passes. |
| BUG-028 | P2 | resolved | Asynchronous background-image `onload` callbacks could let an older requested image overwrite a newer room. The URL is now selected synchronously after readiness; reduced-motion intro sequencing passes. |

## Recording policy

Do not delete resolved rows. When fixing an item, change its state to `verify`, link the covering test or evidence in the description, then mark `resolved` only after the relevant suite passes. Newly discovered bugs receive the next stable ID.
