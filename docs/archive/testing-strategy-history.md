# Testing strategy — proof history

How the suite was built, pass by pass, and the full-run records behind the timing gate. The live strategy, the current coverage, and the outstanding coverage order are in [testing-strategy.md](../testing-strategy.md).

## How the suite accumulated

The implemented `startup/new-game.spec.cjs` opened the served app in Chromium, selected English, clicked New Game, verified that the menu closed and the gameplay canvas/action UI appeared, and failed on page errors or failed local requests. The initial full run passed in approximately 2.104 seconds of runner time, establishing a valid under-180-second baseline. That was proof of harness operation, not broad product coverage.

The deterministic-state pass added seven Node unit tests for the state factory/store, live player identity, coordinate handling, transitions, and load failures. Browser coverage proved a visible fatal-load path, delayed-image readiness, reduced-motion intro sequencing, real click-to-walk movement, and stable listener counts/session generations across five New Game cycles.

The content-contract pass added four Node tests covering valid shipped content, Map-grid generation, reference/grid/locale/overlap/orphan failures, and minimal scenario/save schemas. Navigation browser coverage validated and decoded all 18 rooms, performed normal canvas entry and return clicks across every canonical connection with content-only starting-state arrangement, and proved all four gates refuse entry while locked.

The Section 3 extraction added 13 pure-rule and four adapter/application tests, bringing the Node suite to 24. They cover all nine stable verbs, two-target states, inventory idempotency, localisation fallback/interpolation, explicit librarian dialogue traversal, canonical puzzle facts and reasons, A*/fallback/pointer/hotspot rules, save migrations, dependency direction, DOM-to-store dispatch, draw order, session lifecycle, and readiness failures. Browser coverage drove the librarian through real Talk To and stable choice controls in `en`, `es`, `de`, `it`, and `fr`; a separate browser integration test round-tripped canonical state through `localStorage`.

The Section 4 debug-reachability pass added nine Node tests for the scenario schema, registry, fact-effect integrity, fact-derived mutations, checksum determinism, the seeded generator, the critical-path frontier, and the idle tracker, bringing the Node suite to 33. Browser coverage added the scenario controls themselves: same-seed checksum reproduction, all fourteen fixtures loading cleanly in under a second each, rejection of invalid scenarios before rendering, a real canvas click from `chapter1.map-entry` into the Map, idle probes during a slow walk, teleport validation, inventory presets and structured intents, milestone apply and refusal, repository save/load with simulated storage failure, locale and presentation toggles, the reproduction bundle, the DEBUG panel driving the same controller, a scenario-arranged research-room unlock performed with real clicks, milestone revert to an identical checksum, dialogue node inspection, and deterministic text speed and skipping. A dedicated release-server test proved the tools absent from production.

The Section 5 save pass added eleven Node tests for the save format, JSON and grid patching, migration and legacy finalisation, validation, and save policy, bringing the Node suite to 44. Browser coverage added the player-facing journeys: six milestone save-and-resume round trips through a full page reload, a mid-chapter Continue that proved derived state was rebuilt, a clean new game claiming the resume slot, a milestone checkpointing itself after a real unlock, a declared legacy save migrating, a manual save string moving a game into a fresh session, and three failure paths — corrupt data, an unsupported version, and a storage failure — each asserting that the running session is bit-for-bit unchanged.

The Section 6 chapter pass added fourteen Node tests for the progress model, bringing the Node suite to 58: objective reveal and completion, opt-in hint tiers, five-locale journal copy, availability and gate explanations expressed by objective, forward reachability, journal purity, choice variants, the completion summary, and the pickup and gate mappings. Browser coverage added the journal itself: spoiler safety, the three-tier hint ladder, an objective moving to done while the panel is open, gate explanations by objective, soft-lock checks across six scenarios and a claimed chapter, the completion summary, and all five locales rendered in a single session through `setLocale`.

The BUG-037 fix added two Node tests for the librarian graph — that the key request continues the same conversation, and that a later conversation resumes at the phase the player left her in — bringing the Node suite to 60.

## Full-run records

| Date | Result | Duration | Margin under the 180-second gate |
| --- | --- | --- | --- |
| 2026-09-14 | 61/61 | 154.365s | 26s |
| 2026-09-13 | 53/53 | 135.017s | 45s |
| 2026-09-13 | 38/38 | 78.772s | 101s |
| 2026-09-13 | 18/18 | 35.914s | 144s |

The trend is the point: save journeys are slow by nature because several reload the page, and conversation journeys are slow because they play real dialogue. The margin has been shrinking every pass.
