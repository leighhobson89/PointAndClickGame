# Puzzle scenarios

Cover Chapter 1 dependency chains, object combinations, door unlocks, animal/NPC exchanges, bridge construction, puzzle ordering, soft-lock prevention, and completion rewards.

Implemented: `scenario-milestones.spec.cjs` and `journal-and-hints.spec.cjs`.

### `scenario-milestones.spec.cjs`

- `chapter1.research-unlock-ready` arranges the riddle and the carried key, then the unlock itself is performed with real input: choose Use, click the carried key in the inventory, click the door on the canvas. The canonical `library.researchRoomUnlocked` fact and the newly available gate are asserted afterwards.
- `chapter1.den-unlock-ready` proves that reverting is a scenario reload rather than a bespoke undo path: applying `den.unlock` and then reloading returns the exact starting checksum.
- Every chapter milestone fixture is loaded in order and checked three ways: the milestone it exists to test is on the critical-path frontier, every action the frontier offers is genuinely available, and the state is free of fact conflicts and soft-locks. The frontier is asserted as a membership rather than an exact list, because Chapter 1 legitimately runs several threads at once and an exact list would fail on any authored addition.

### `journal-and-hints.spec.cjs`

- The journal opens from `#openJournal`, is a real `role="dialog"`, and closes on Escape with focus and `aria-expanded` restored.
- It names only puzzles the player has met: at a clean start the library objective is active and the wolf and bridge objectives are not in the DOM at all.
- Hints start hidden and arrive one tier at a time, three tiers maximum, after which the control disables rather than looping. Each revealed tier is asserted to be authored copy rather than a fallback key.
- An objective moves to done while the panel is open, proving the journal follows the canonical store rather than needing to be reopened.
- A locked gate and a blocked action are explained by the objective that owns the missing fact, never by a raw fact ID.
- Six scenarios plus a freshly claimed chapter are checked for soft-locks.
- The completion summary is asserted both through the debug surface and through its rendered `data-*` attributes, including that every objective ends done.
- All five locales are rendered in one session through `setLocale`, and must produce five genuinely different strings. Reloading per locale is avoided on purpose: that pattern is what pushed the suite towards the 180-second gate in Section 5.

Scenarios used: `chapter1.new-game`, `chapter1.research-unlock-ready`, `chapter1.town-open`, `chapter1.den-unlock-ready`, `chapter1.barn-unblock-ready`, `chapter1.rigging-ready`, `chapter1.bridge-ready`, `chapter1.wolf-ready`, `chapter1.map-entry`.

Still to cover: each dependency chain played end-to-end with real clicks (only the library, den gate, bridge, wolf and Map steps are covered that way today), alternate solutions and orderings, and `chapter1.barn-unblock-ready` performed through play. The fact-level critical path is covered instead by `test/unit/progress-journal.test.mjs`, which walks all 44 actions and checks for a soft-lock after each one.
