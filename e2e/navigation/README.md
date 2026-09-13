# Navigation scenarios

`click-to-walk.spec.cjs` completes the intro, clicks a known walkable Library Foyer cell through the canvas, and verifies that the canonical player position changes without a page error.

`content-contract.spec.cjs` validates the full bundle in Chromium, decodes all 18 room backgrounds, then uses a content-only fixture to remove entity obstruction and arrange each starting room. Every canonical forward/return transition is triggered by a normal canvas click, and the four gated exits are separately asserted in their locked state. Test setup may arrange location, bridge grid, and speed; the behaviour under test remains the ordinary pointer/transition path.

Since Section 4, room arrangement no longer needs bespoke per-test state pokes: `chapter1.map-entry` opens the river gate from canonical facts and `__GAME_TEST__.teleport({ roomId, exitId })` validates the room, anchor, and coordinate before moving the player. The real canvas click into the Map lives in `game-state/debug-scenarios.spec.cjs` because it also asserts the gate explanation.

Scenarios used: `chapter1.town-open`, `chapter1.map-entry`.

Remaining navigation work covers blocked cells, nearest-walkable fallback, edge scrolling, and more precise visible spawn/final-position assertions. `content-contract.spec.cjs` still arranges rooms directly and should migrate to the scenario helpers when its traversal fixture is revisited.
