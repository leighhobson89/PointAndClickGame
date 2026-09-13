# Puzzle scenarios

Cover Chapter 1 dependency chains, object combinations, door unlocks, animal/NPC exchanges, bridge construction, puzzle ordering, soft-lock prevention, and completion rewards.

Implemented: `scenario-milestones.spec.cjs`.

- `chapter1.research-unlock-ready` arranges the riddle and the carried key, then the unlock itself is performed with real input: choose Use, click the carried key in the inventory, click the door on the canvas. The canonical `library.researchRoomUnlocked` fact and the newly available gate are asserted afterwards.
- `chapter1.den-unlock-ready` proves that reverting is a scenario reload rather than a bespoke undo path: applying `den.unlock` and then reloading returns the exact starting checksum.
- Every chapter milestone fixture is loaded in order and its critical-path frontier and fact consistency are asserted, so a broken dependency chain fails here rather than during play.

Scenarios used: `chapter1.research-unlock-ready`, `chapter1.den-unlock-ready`, `chapter1.new-game`, `chapter1.town-open`, `chapter1.rigging-ready`, `chapter1.bridge-ready`, `chapter1.wolf-ready`, `chapter1.map-entry`.

Still to cover: alternate solutions and orderings, `chapter1.barn-unblock-ready` performed through play, and explicit soft-lock recovery checks.
