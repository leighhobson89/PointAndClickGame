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

The art direction, the art bible, the asset manifest, the contact sheets, and the character scale mechanism are delivered and recorded in [archive/master-checklist-completed.md](archive/master-checklist-completed.md). What is left is the art production itself, the export pipeline, the audio, and the profiling.

**The painting is the gate.** Most of what follows is redrawing, which no automated pass can produce. The proportion work is measured and ready but is deliberately held behind it, so nothing is proportioned against art that is about to change. The order below reflects that: the mechanical items can proceed now, the rest wait on the brush.

- [x] Select and approve the gold standard the rest are normalised towards. **River Crossing** for exteriors and **Kitchen** for interiors, approved by Leigh and recorded in [art-bible.md](art-bible.md).
- [x] Decide which of the player's three finishes survives. The **painted** finish, approved by Leigh; this reverses BUG-039's original direction.
- [x] Decide how off-aspect rooms are corrected. **Re-composed at 832x448 during each room's restyle**, approved by Leigh — not cropped, not extended, not stretched.

Mechanical, and not blocked on painting:

- [ ] Create a reproducible export/optimisation pipeline — painted scenery to WebP, icons cropped for their slot, duplicates aliased to one semantic ID — and bring the shipped set from 38.1 MB inside budget (BUG-017).
- [ ] Record `provenance` and `licence` for all 167 shipped assets; the manifest carries the fields and they are all still `null`.
- [ ] Re-export each NPC's directional and state sprites onto one shared canvas per NPC, so every sprite is undistorted rather than only the active one (BUG-046).

Blocked on painting:

The image-generation and repaint sequence for this block is split into reviewable packages in [art-redesign-production-plan.md](art-redesign-production-plan.md).

- [ ] Re-compose the off-aspect backgrounds at 832x448 as part of each room's restyle (BUG-041). Dead Tree and Research Room are under 2% off and need only a uniform re-export.
- [ ] Repaint the Den from the standard eye-height camera and bring its authored heights into the interior band (BUG-042).
- [ ] Draw the player's character model sheet in the painted finish, then author every frame against it (BUG-039) including readable front and back walk cycles (BUG-040). **Candidate in game:** a model sheet and 40 generated frames supply four idles plus nine poses per direction without replacing the legacy files. Registration, key-edge cleanup and playback are measured and done; re-authoring the front and back poses, human paint-over, the byte budget, and provenance/licence review remain before acceptance.
- [ ] Restyle the three hand-drawn rooms — Library Foyer, Market Street, Back Alley — keeping each layout recognisably the same place, and the Sewer, which is the fourth style outlier.
- [ ] Re-author NPC proportions against the repainted characters, from the values held in [bugs.md](bugs.md) (BUG-044), then add the two assertions written for that pass.
- [ ] Re-author every placed object's dimensions so its drawn box keeps its sprite's aspect (BUG-045).
- [ ] Give the player and free-standing props a contact shadow, without which correct scaling still reads as floating.
- [ ] Normalise complete rooms against the gold standard without shipping partially mixed styles.
- [ ] Profile startup, image decode, steady/scrolling/animated frame time, allocations, and event/log noise; remove the remaining per-frame debug logging from production (BUG-016).
- [ ] Perform room-by-room in-game visual, animation, audio, readability, and performance acceptance against the art bible's acceptance gate.

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
| `art-bible.md` | The production standard Section 8 is judged against |
| `asset-report.md` and `player-frame-geometry.md` | Generated evidence for the Section 8 asset and animation items |
| `testing-strategy.md` | Acceptance lines and the cross-cutting definition of done |
| `debug-test-controls.md` | The scenario items in Sections 6 and 8 |
| `save-format.md` | The save compatibility gate in Section 9 |
