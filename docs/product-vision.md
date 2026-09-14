# Product vision

## The game today

This is a hand-built, browser-based 2D point-and-click adventure. It uses an HTML canvas for the world and character, a classic nine-verb command panel, a ten-slot visible inventory strip, branching dialogue, room-to-room navigation, an A* grid, and JSON-backed rooms, objects, NPCs, dialogue, and localisation.

The opening places a young protagonist in a library foyer after losing his job. The intended Chapter 1 arc begins with a librarian, a riddle, and a key to the research room, then opens into a humorous town and countryside treasure hunt. The tone and dependency diagrams point clearly toward a Monkey Island-style experience: playful writing, multi-room item chains, environmental gags, and several ways for characters and objects to change the world.

## Intended player promise

The best version of this project should provide:

- A readable, inviting world in which every meaningful object has an authored response.
- Puzzles that are surprising but fair: information is discoverable, prerequisites are legible in hindsight, and failure never destroys progress.
- A modern presentation that retains a distinctive handmade identity rather than imitating a generic interface.
- Fast, precise input with mouse, keyboard, touch, and assistive technology support.
- Dialogue with personality, player choice, and clear consequences.
- Reliable save/resume and localisation across the whole experience.
- A development workflow where any story state can be reached deterministically and every important user journey is testable.

## Current scope versus aspiration

| Area | Current reality | Target |
| --- | --- | --- |
| Story | Chapter 1 content and events are substantially encoded, but the experience is incomplete and fragile | A polished chapter with a clear opening, puzzle escalation, payoff, and bridge to later chapters |
| World | 18 validated navigation records with reciprocal exits and four declared gates; Debug Room removed and the Map completed | A coherent, validated room graph matching the maintained world design |
| Puzzles | Large dependency chain exists across data and event code | Explicit quest/puzzle state with hints, diagnostics, and test coverage |
| Interaction | Responsive adventure console with classic/contextual verbs, mouse, keyboard, touch, controller, and semantic assistive paths | Preserve parity and feedback as story systems evolve |
| Visuals | Memorable assets with major style, scale, and finish variation | One intentional art bible, consistent character scale, lighting, perspective, and export standards |
| Audio | Described in the GDD but not implemented | Music, ambience, spatial cues, and responsive interaction SFX |
| Save/load | Versioned envelope, single migration boundary, world stored as a patch, milestone checkpoints, autosave, menu `Continue`, and a restore that changes nothing when a save cannot be trusted | Cloud saves, only once local saves, privacy, identity, and conflict policy are explicit |
| Quality | 62 Node tests and 69 real-click Playwright journeys, with deterministic scenarios reaching any Chapter 1 state in under a second | Unit/component tests plus deterministic real-click Playwright journeys across every functional area |

## Experience principles

1. **Funny before fussy.** The interface should disappear quickly and let writing, character, and discovery lead.
2. **No pixel hunting.** Hotspots need generous geometry, feedback, and optional reveal support.
3. **State must be explainable.** A developer should be able to answer why a gate is locked from one structured state snapshot.
4. **Data should describe the game.** Story data and stable IDs should drive behaviour; translated strings and punctuation should not be executable logic.
5. **Progress is precious.** Starting, saving, loading, and resuming must be deterministic and safe.
6. **Accessibility is a core input mode.** It is not a final cosmetic pass.
