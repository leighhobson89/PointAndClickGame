# Feature roadmap — delivered features

The shipped half of the roadmap. Outstanding features are in [feature-roadmap.md](../feature-roadmap.md).

A feature appears here only when its player behaviour, failure states, localisation, accessibility, save/load effect, debug reachability, automated coverage, and documentation were all addressed.

## Foundation

- **Complete save/resume** — delivered 2026-09-13. A versioned envelope, a single migration boundary, milestone checkpoints, rate-limited autosave, a menu `Continue`, manual export/import, and a two-phase restore that leaves the running session untouched when a save cannot be trusted. Contract in [save-format.md](../save-format.md).
- **Canonical quest state and journal** — delivered 2026-09-13. 44 named actions over 56 facts, an objective model derived from those facts with no state of its own, three-tier opt-in hints in five locales, gate and action explanations expressed by objective, recorded choice variants, a chapter-completion summary, and a validator-enforced no-soft-lock guarantee. Model in [world-and-puzzles.md](../world-and-puzzles.md).
- **Content validation** — delivered. Startup and `npm run validate:content` fail fast on missing assets, grids, destinations, IDs, dialogue links, and translations.
- **Debug/test state controls** — delivered 2026-09-13. Fourteen deterministic scenarios, milestone transactions, overlays, and the gated DEBUG panel and `__GAME_TEST__` API described in [debug-test-controls.md](../debug-test-controls.md).

## Chapter 1

- Finalise the library tutorial — delivered; stable nodes, choices, and consequence. The research-key journey was repaired again on 2026-09-14 (BUG-037), which also gave the conversation a durable quest phase so it resumes where the player left it.
- Reconcile room topology with the maintained world design — delivered in Section 2.
- Implement and validate every prerequisite on the dependency graph — delivered in Section 6; the validator rejects an unreachable action or an unproducible prerequisite.
- Complete Map destination assets/data and Chapter 1 payoff — delivered in Section 2, with the completion summary added in Section 6.
- Ensure every object supports a useful or entertaining Look response — delivered; all 42 objects answer Look in five locales.
- Add hint/journal entries at major puzzle facts without revealing solutions prematurely — delivered; objectives stay hidden until met and hints are opt-in, one tier at a time.
- Audit soft-locks — delivered; detection is enforced per step across the whole chapter and across every scenario fixture.

## Narrative

- Explicit dialogue choices with stable node IDs and consequence facts — delivered for the librarian tutorial only. The other conversations are BUG-011.
- Record choice variants in saves and expose a chapter-completion summary — delivered. Removed dialogue options persist as well.

## Interaction

- Clear two-item action state: first target, expected second target, cancel, and invalid combination response — delivered in Section 3 as pure command-state rules over stable verb and target IDs.
- **Responsive adventure console** — delivered 2026-09-14 in Section 7. The menu, command sentence, classic/contextual verbs, inventory, dialogue, save feedback, and settings share one tokenised responsive visual system around the fixed logical stage.
- **Accessible multi-input interaction** — delivered 2026-09-14. Named semantic room hotspots, optional reveal, keyboard shortcuts and traversal, dialogue/inventory navigation, touch-sized targets, Escape/back, live announcements, scene descriptions, double-click fast walk, skip, and controller focus/activation all dispatch the existing domain actions.
- **Persistent player settings** — delivered 2026-09-14. Ten UI themes, locale, text speed, volume groups, subtitles, reduced motion, high contrast, hotspot help/intensity, input mode, and classic verbs are validated, saved locally, and carried in canonical save state.
