# Save and load scenarios

Implemented in Section 5. The save contract these tests protect is documented in
`docs/save-format.md`.

## What is covered

`resume-and-milestones.spec.cjs` — the ordinary journey. A scenario arranges a
milestone, the player saves through the menu, the page is fully reloaded, and
`Continue` restores the game. Each case compares canonical progress with
`canonicalChecksum`, then checks `derivedRenderState` to prove the half a save
deliberately omits — background, canvas metrics, walk-grid placement stamps,
recomputed `visualPosition` — was rebuilt rather than restored. Six milestones
are covered: library, den, rigging, bridge, wolf, and Map. The Map case walks
through the opened river gate with a real canvas click first. Two further cases
prove a clean New Game claims the resume slot immediately, and that reaching a
declared milestone through real clicks checkpoints itself without the player
asking.

`failure-and-transfer.spec.cjs` — the paths where a save cannot be trusted, and
the path between sessions. A corrupt string, an unsupported future version, and
a blocked `localStorage` write each assert that the running session is unchanged
and that the failure is announced with a stable `data-save-event` or
`data-save-code`. A declared version 1 save migrates and restores; a manual save
string carries a game into a brand-new session with the stored slots cleared.

`browser-storage.spec.cjs` — the repository itself against real `localStorage`:
the stored envelope is version 2, carries a content *patch* rather than the
bundle, and round-trips room, locale, facts, and world mutations.

## Writing more

Scenarios to use: any `chapter1.*` milestone fixture, plus `system.corrupt-save`.

Two things will catch you out.

Loading a scenario commits its facts through the canonical store, and declared
milestones checkpoint themselves, so arranging a state legitimately writes save
slots. Call `clearSaveSlots` **after** `loadScenario`, not before.

`canonicalChecksum` includes the presentation mode, which changes when the menu
opens. Take the before and after readings in the same mode.

Section 4's debug controls remain available for arranging state:
`__GAME_TEST__.saveScenario(key)` and `loadSavedScenario(key)` now run through
the same versioned envelope as the player's saves, `selectMigrationFixture`
chooses the schema under test, and `simulateStorageFailure(true)` makes a write
fail deterministically.
