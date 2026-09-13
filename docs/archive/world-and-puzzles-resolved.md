# World and puzzles — resolved model questions

The design questions the world and puzzle model has already answered, kept for the reasoning. The current model, the remaining content gap, and the authoring rules are in [world-and-puzzles.md](../world-and-puzzles.md).

## Design-map reconciliation

The supplied world map also names Embassy, Farm Track, Large Tree, Inside Barn, and Inside House. Those names, and the four-exit Market Street brief, are superseded historical references. The canonical contract uses Cow Path, Dead Tree, Barn, House, Sewer, Kitchen, no Embassy, and five Market Street exits.

The `chapter1-world-v1` contract in `resources/content-contract.json` is authoritative; the earlier diagrams remain historical intent where they differ.

## Original puzzle design assessment

Strengths identified in the first pass, all still true of the shipped chapter:

- Dependencies cross several locations and characters, encouraging exploration.
- Chains combine dialogue, inventory, environmental change, and comedy props.
- Multiple branches converge, giving Chapter 1 a satisfying macro-structure.
- The library opening provides a smaller tutorial puzzle before the wider map.

Risks identified in the first pass, and what became of them:

| Risk | Outcome |
| --- | --- |
| The graph is large enough that one missed flag or unavailable response can soft-lock progression. | Closed. A unit test walks all 44 actions and asserts after every step that no mandatory fact has become unreachable, and the validator rejects an unreachable action or an unproducible prerequisite. |
| Long dependency chains need intermediate acknowledgement and an optional journal/hint system. | Closed. The journal derives objectives from facts, with opt-in three-tier hints. |
| Several designed destinations/assets do not match the runnable data. | Closed by declaration and by completing the Map room; the runtime topology is authoritative. |
| Event logic mutates global object/navigation state directly, making graph reachability hard to prove. | Closed for reachability: every event that matters records a canonical action, and reachability is proven over the fact graph rather than over the event code. The global mutation itself is still there and is BUG-021. |
| Item combinations and interaction anchors need clear feedback to avoid brute-force verb use. | Partly closed: gates and unavailable actions explain themselves by objective. Hotspot reveal and richer feedback are Section 7. |
