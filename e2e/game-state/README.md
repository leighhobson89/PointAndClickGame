# Game-state scenarios

Cover new-game reset, menu/resume, quest flags, pending events, object/NPC relocation, door and bridge state, current room, and clean repeated starts.

Implemented:

- `new-game-reset.spec.cjs` starts five sessions through the visible menu and verifies that session generations advance while disposable window/canvas listener counts remain constant.
- `debug-scenarios.spec.cjs` is the Section 4 proof. It reproduces a checksum from the same scenario and seed, loads all fourteen reviewed fixtures in under a second each, rejects invalid scenarios before rendering, drives a real canvas click from `chapter1.map-entry` into the Map, watches the idle probes during a slow walk, validates teleport input, exercises inventory presets and structured intents, applies and refuses milestones, round-trips saves and simulated failures, and exports a reproduction bundle. It also drives the DEBUG panel itself to prove the panel and `__GAME_TEST__` share one controller.
- `debug-absent-in-production.spec.cjs` runs against the release server and asserts that `/debug-capability` reports disabled, every debug module returns HTTP 404, `window.__GAME_TEST__` and the panel are absent, the retired always-on debug wheel is gone, and a `?debug=1` query string plus a test bootstrap still enable nothing.

Scenarios used: `chapter1.new-game`, `chapter1.bridge-ready`, `chapter1.town-open`, `chapter1.map-entry`, `system.inventory-full`, `chapter1.rigging-ready`, `chapter1.den-unlock-ready`.
