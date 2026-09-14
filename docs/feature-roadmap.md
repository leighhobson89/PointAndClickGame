# Feature enhancement and implementation roadmap

## Release target: polished Chapter 1 vertical slice

The first meaningful product milestone is the complete journey from Library Foyer to obtaining the Map, not a larger collection of unfinished rooms.

This document lists the features that are still missing, in implementation order. Features already shipped are recorded in [archive/feature-roadmap-delivered.md](archive/feature-roadmap-delivered.md).

## Foundation features

1. **Offline delivery** — bundle or remove the remaining CDN script so the game boots under a strict CSP with no runtime network dependency.

## Chapter 1 completion

- Play each dependency chain end-to-end in a browser, rather than at fact level.
- Author the missing rigging props so the pulley has a real source (BUG-035).
- Add optional examine variants and character barks that reward exploration without gating progress.
- Manual review of narrative continuity, humour, pacing, discoverability, and puzzle fairness. This is Leigh's pass.

## Narrative and replayability

- Move the remaining conversations onto explicit dialogue graphs with stable node IDs and consequence facts (BUG-011). Until then a mid-conversation save cannot resume in the conversation, and a conversation cannot be rewound for testing.
- Optional examine responses and character barks to reward exploration.
- Hidden interactions/achievements only after the critical path is robust.
- Defer large branching routes until the core graph and state migrations are proven.

## Presentation and audio

- Scene ambience loops and interaction SFX.
- Character/dialogue cues that do not conflict with text readability.
- Music transitions tied to locations and milestones.
- Subtitle/caption support for all meaningful audio.
- Art pipeline described in [ui-and-art-direction.md](ui-and-art-direction.md).

## Later releases

- Additional chapters built from the validated room/puzzle/dialogue schemas.
- Cloud save only after local versioned saves are reliable and privacy/identity choices are explicit.
- Distribution packaging only after browser-offline mode, dependency security, signing/update strategy, and target platforms are defined.

## Feature definition of done

A feature is complete when its player behaviour, failure states, localisation, accessibility, save/load effect, debug reachability, automated coverage, and living documentation are all addressed. At that point it moves to the delivered archive rather than staying here as a struck-through line.
