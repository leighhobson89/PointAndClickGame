# Feature enhancement and implementation roadmap

## Release target: polished Chapter 1 vertical slice

The first meaningful product milestone should be the complete journey from Library Foyer to obtaining the Map, not a larger collection of unfinished rooms.

## Foundation features

1. **Complete save/resume** — delivered 2026-09-13. A versioned envelope, a single migration boundary, milestone checkpoints, rate-limited autosave, a menu `Continue`, manual export/import, and a two-phase restore that leaves the running session untouched when a save cannot be trusted. Contract in `save-format.md`.
2. **Canonical quest state and journal** — delivered 2026-09-13. 44 named actions over 56 facts, an objective model derived from those facts with no state of its own, three-tier opt-in hints in five locales, gate and action explanations expressed by objective, recorded choice variants, a chapter-completion summary, and a validator-enforced no-soft-lock guarantee. Model in `world-and-puzzles.md`.
3. **Content validation** — fail fast on missing assets, grids, destinations, IDs, dialogue links, and translations.
4. **Debug/test state controls** — delivered 2026-09-13. Fourteen deterministic scenarios, milestone transactions, overlays, and the gated DEBUG panel and `__GAME_TEST__` API described in `debug-test-controls.md`.
5. **Settings** — locale, text speed, volume groups, subtitles, reduced motion, hotspot assistance, and input preferences.

## Chapter 1 completion

- ~~Finalise the library tutorial~~ — delivered; stable nodes, choices, and consequence.
- ~~Reconcile room topology with the maintained world design~~ — delivered in Section 2.
- ~~Implement and validate every prerequisite on the dependency graph~~ — delivered in Section 6; the validator now rejects an unreachable action or an unproducible prerequisite.
- ~~Complete Map destination assets/data and Chapter 1 payoff~~ — delivered in Section 2, with the completion summary added in Section 6.
- ~~Ensure every object supports a useful or entertaining Look response~~ — delivered; all 42 objects answer Look in five locales.
- ~~Add hint/journal entries at major puzzle facts without revealing solutions prematurely~~ — delivered; objectives stay hidden until met and hints are opt-in, one tier at a time.
- ~~Audit soft-locks~~ — delivered; detection is enforced per step across the whole chapter and across every scenario fixture.
- Remaining: play each dependency chain end-to-end in a browser, author the missing rigging props (BUG-035), and add optional examine variants and character barks.

## Interaction improvements

- Contextual default click, with the full verb panel retained as an optional/classic interaction mode.
- Hotspot highlight/reveal with accessible names and adjustable intensity.
- Double-click or explicit fast-walk, plus skip for previously seen skippable animations.
- Clear two-item action state: first target, expected second target, cancel, and invalid combination response.
- Keyboard focus traversal, verb shortcuts, inventory navigation, dialogue selection, and Escape/back behaviour.
- Touch layout with large targets and no hover dependency.

## Narrative and replayability

- Explicit dialogue choices with stable node IDs and consequence facts.
- Optional examine responses and character barks to reward exploration.
- Hidden interactions/achievements only after the critical path is robust.
- Record choice variants in saves and expose a chapter-completion summary. Removed dialogue options already persist; the remaining work is Section 6's, once the non-library conversations move to explicit graphs and a mid-conversation save becomes meaningful.
- Defer large branching routes until the core graph and state migrations are proven.

## Presentation and audio

- Scene ambience loops and interaction SFX.
- Character/dialogue cues that do not conflict with text readability.
- Music transitions tied to locations and milestones.
- Subtitle/caption support for all meaningful audio.
- Art pipeline and UI upgrade described in `ui-and-art-direction.md`.

## Later releases

- Additional chapters built from the validated room/puzzle/dialogue schemas.
- Optional controller support.
- Cloud save only after local versioned saves are reliable and privacy/identity choices are explicit.
- Distribution packaging only after browser-offline mode, dependency security, signing/update strategy, and target platforms are defined.

## Feature definition of done

A feature is complete when its player behaviour, failure states, localisation, accessibility, save/load effect, debug reachability, automated coverage, and living documentation are all addressed.
