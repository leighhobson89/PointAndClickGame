# Refactor plan

## Strategy

Refactor by creating tested seams around the running game. Do not pause development for a ground-up rewrite. Each phase must leave a playable vertical slice and should remove or isolate an identified risk.

Completed phases are recorded in [archive/refactor-plan-completed.md](archive/refactor-plan-completed.md). What follows is what is left.

## Phase 5 — Art/audio modernisation

Outcome: a cohesive release-quality presentation sits on stable systems.

- Process assets through the asset manifest/pipeline.
- Add the audio mixer and settings-aware ambience, music, and effects.
- Add captions for meaningful audio as it is authored.
- Add visual-regression coverage only after the scene art is approved.

Exit criteria: art, audio, performance, and offline packaging acceptance matrices pass.

## Phase 6 — Retire the legacy bridge

Outcome: no subsystem depends on the mutable global service locator.

- Migrate the non-library conversations onto explicit dialogue graphs, which is the last large consumer of encoded control strings (BUG-011).
- Remove the remaining circular imports between the legacy adapters (BUG-021).
- Retire `constantsAndGlobalVars.js` as a mutable database, moving each remaining accessor to the owning module or the canonical store.
- Remove the transitional adapters left behind by earlier phases, so no fact has two sources of truth.

Exit criteria: `npm run check:dependencies` covers the whole runtime rather than the extracted graph, and no module reads or writes shared mutable globals.

## Carried forward from earlier phases

Two items were listed in the baseline phase and not delivered with it:

- Define performance budgets for startup, frame time, image decode, and suite duration.
- Establish linting/formatting only after a no-functional-change baseline.

## Change rules

- One conceptual extraction per change; preserve public behaviour unless the ticket says otherwise.
- Characterise legacy behaviour before moving it.
- New domain code must not import DOM, canvas, file paths, translated copy, or global mutable state.
- Do not duplicate a state fact during migration without a documented temporary source of truth and deletion task.
- A refactor is complete only when legacy code and transitional adapters are removed, tests pass, and docs are updated.
