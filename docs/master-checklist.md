# Master implementation checklist

This is the outstanding delivery checklist, in dependency order. It consolidates every implementation or verification task that is still open across the maintained `docs/` set. A parent outcome is not complete while a required child or acceptance item is unchecked.

Finished sections are not repeated here. They are recorded in [archive/master-checklist-completed.md](archive/master-checklist-completed.md).

Section numbers are stable identifiers and are kept as they were, so the changelog and the other documents continue to mean the same thing by "Section 7".

## 6. Finish the Chapter 1 vertical slice

- [ ] Prove each dependency chain end-to-end with real clicks in a browser. The library, den-gate, bridge, wolf, and Map steps are covered that way today; the rest are covered by the fact-level critical-path walk and by scenarios.
- [ ] Author the missing rigging props so the pulley has a real source (BUG-035).
- [ ] Add optional examine variants and character barks that reward exploration without gating progress.
- [x] Manually review narrative continuity, humour, pacing, discoverability, puzzle fairness, and the bridge into later chapters. **Leigh's review; automation cannot close this.** - REVIEWED

Acceptance: a new player can progress from the Library Foyer to the Map without a soft-lock and with clear, funny feedback. The no-soft-lock half is enforced by the content validator and by tests; the "clear and funny" half needs the manual review above.

## 8. Unify and optimise art, animation, and audio

- [ ] Approve “storybook caricature adventure” or another explicit art direction and reconcile the GDD’s pixel-art wording.
- [ ] Create an art bible covering aspect/safe area, camera/perspective/walk plane, character depth/scale, outlines/detail, shadows/palette/light, occlusion/alpha, animation naming/anchors/crops/directions, icons, and byte/dimension budgets.
- [ ] Build an asset manifest with semantic ID, role, source, dimensions, crop/anchor, room scale, hash, licence, and provenance.
- [ ] Generate role-based contact sheets plus exact/near-duplicate reports; alias intentional reuse.
- [ ] Select and approve one gold-standard room and player/NPC interaction, then normalise complete rooms without shipping partially mixed styles.
- [ ] Create a reproducible export/optimisation pipeline and compare at gameplay scale; enforce transfer, decode, memory, and frame-time budgets.
- [ ] Document AI-assisted composition/cleanup/upscale/style use, reference consistency, human paint-over, provenance, licensing, and in-game acceptance.
- [ ] Implement settings-aware music, scene ambience, location/milestone transitions, dialogue/character cues, interaction SFX, subtitles/captions, mixer, mute, and persistence (BUG-024).
- [ ] Profile startup, image decode, steady/scrolling/animated frame time, allocations, and event/log noise; remove the remaining per-frame debug logging from production (BUG-016).
- [ ] Perform room-by-room in-game visual, animation, audio, readability, and performance acceptance.

Acceptance: assets and sound feel intentionally related, meet budgets, preserve authored humour, and degrade safely with accessibility settings.

## 9. Harden dependencies, offline delivery, and release quality

- [ ] Decide browser/PWA versus Electron ownership, target platforms, and packaging directory structure.
- [ ] Bundle Bootstrap/jQuery/Popper/LZString or remove them; boot offline under a strict CSP with no runtime CDN dependency (BUG-013, and the last open half of BUG-009).
- [ ] Review all dependency advisories, upgrade deliberately without blind forced fixes, retest browser/desktop targets, and record a zero-vulnerability or approved-exception baseline (BUG-018).
- [ ] Move Electron and packaging-only tools to development scope where appropriate.
- [ ] Establish formatting/linting after a no-functional-change baseline and prevent new dependency cycles/named globals.
- [ ] Define measurable startup, frame-time, image decode/transfer, memory, and test-suite budgets and enforce them at suitable CI tiers.
- [ ] Add validation/unit/affected-area PR CI, under-180-second nightly/full CI, release automation, failure screenshots/traces, and intentional artefact retention.
- [ ] Keep E2E isolated in fresh contexts with controlled randomness/clocks/storage, locally served assets, and no test-order/save dependency.
- [ ] Make any quarantine temporary, owner/date-bound, visible, and excluded from coverage claims.
- [ ] Decide Git LFS or external source-art storage and reduce binary history through a separately approved, recoverable migration.
- [ ] Define release versioning, save compatibility, distribution artefacts, signing, updates, rollback, and platform smoke tests.
- [ ] Approve the product title and menu copy, replacing the `Game` document title and `Game Title Placeholder` menu text, and assert them in the startup browser test (BUG-023).
- [ ] Add optional achievements/hidden interactions only after the critical path is robust.
- [ ] Add additional chapters from validated schemas; defer cloud saves until local saves, privacy, identity, conflicts, and migration policy are explicit.
- [ ] Run the final security, CSP/offline, dependency, content, save compatibility, performance, accessibility, automated-test, and manual experience gates.

Acceptance: a reproducible release works offline, protects saves, has an explicit security baseline, and passes automated and human experience checks.

## Continuing migration debt

These are not a section of their own; each is carried by the section that will finish it.

- [ ] Migrate the non-library conversations to explicit dialogue graphs with stable node, choice, and consequence IDs (BUG-011). This also closes conversation reset (BUG-031) and lets a save resume inside a conversation rather than in the room.
- [ ] Remove the remaining legacy circular imports and the large mutable global-state bridge (BUG-021).
- [ ] Promote the recorded-only canonical action mappings back to blocking prerequisite gates, one chain at a time, as each chain gains browser coverage of its real ordering (BUG-036).
- [ ] Give scenarios to the major animation and cutscene branches, which still start from a normal New Game.
- [ ] Make simulated asset failure intercept the request rather than only recording the declared URL (BUG-032).

## Cross-cutting definition of done for every task

- [ ] Requested behaviour and failure states are implemented, or the task is explicitly recorded as analysis/design only.
- [ ] Stable IDs, localisation, accessibility, save/load effects, and debug reachability are addressed where relevant.
- [ ] Relevant unit/content/integration tests pass.
- [ ] Relevant E2E areas run through `node tests ...`; command, result, duration, and retained evidence are recorded.
- [ ] New defects are added to `bugs.md`; fixes move through `verify` to `resolved` only with the required evidence.
- [ ] Affected living docs are updated, completed items move to `docs/archive/`, and `docs/changelog.md` receives a dated entry.
- [ ] The diff is checked for secrets, generated output, unintended binaries, unrelated edits, and temporary compatibility code that now has a deletion task.
- [ ] Each change is one reviewable conceptual extraction and preserves characterised behaviour unless its task explicitly changes that behaviour.
- [ ] Refactors remove superseded legacy paths/adapters before completion and never leave an undocumented duplicate source of truth.

## Source coverage map

| Source document | Outstanding checklist coverage |
| --- | --- |
| `product-vision.md` | Sections 6, 8, and 9 |
| `code-audit.md` and `bugs.md` | Sections 6, 8, and 9 and the migration debt |
| `world-and-puzzles.md` | Section 6 |
| `refactor-plan.md` | Section 8, plus the migration debt |
| `feature-roadmap.md` | Sections 6, 8, and 9, including deferred features |
| `ui-and-art-direction.md` | Section 8 |
| `testing-strategy.md` | Acceptance lines and the cross-cutting definition of done |
| `debug-test-controls.md` | The scenario items in Sections 6 and 8 |
| `save-format.md` | The save compatibility gate in Section 9 |
