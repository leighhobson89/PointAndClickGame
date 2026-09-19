# Bugs and risks

Open defects and material risks only. Closed defects, with the evidence that closed them, are in [archive/bugs-resolved.md](archive/bugs-resolved.md).

Severity: **P0** data loss/security/release blocker, **P1** major journey blocker, **P2** significant defect, **P3** polish/maintainability. Status is `open`, `planned`, or `verify`.

## Active register

| ID | Sev | Status | Finding and evidence | Required verification |
| --- | --- | --- | --- | --- |
| BUG-009 | P0 | verify | Localisation `eval` has been removed in favour of allow-listed `${token}` interpolation with explicit fallback/missing-key behaviour. Static search and unit/five-locale browser coverage pass; strict-CSP browser coverage remains. | Add the restrictive-CSP E2E and confirm no violations. |
| BUG-011 | P1 | open | The librarian tutorial uses validated explicit nodes, stable choices, a stable consequence, and a durable quest phase, but the other conversations still encode control flow in punctuation and spacing and their speaker order in a compact digit string. | Migrate the remaining conversations to explicit graphs and regression-test each consequence. |
| BUG-013 | P2 | open | External CDN scripts/styles are runtime single points of failure and lack a bundled offline/CSP strategy. The compact save-export string depends on the CDN-hosted LZString, although import also accepts plain JSON. | App boots with network disabled and a restrictive CSP. |
| BUG-016 | P2 | open | Partly fixed: `updateDebugValues()` returns before serialising the grid unless the legacy debug window is open, and frame sampling and overlays only run when a development build installs the overlay renderer. Extensive `console.log` output in movement, entity placement, text display, and transitions still remains in production. | Production mode has no debug spam and meets defined frame-time budgets. |
| BUG-017 | P2 | open | The player package now passes its role budget, leaving 81 of 179 shipped images over their own budgets and a 38.8 MB shipped set against a ~6 MB target. `bg.alley` is 3329x1801 and 8.5 MB for an 832x448 stage; `npc.librarian` is 382 KB for a 75x125 image. 13 exact-duplicate groups and 9 orphans remain. Evidence: `docs/asset-report.md`. | `npm run check:assets` exits zero, or every remaining breach is an approved exception. |
| BUG-050 | P3 | verify | The character flicked between a side pose and a back pose on diagonal paths. Facing was chosen by setting a horizontal direction and then letting any vertical component overwrite it outright, so a near-diagonal path swapped direction every few ticks. Fixed by choosing the dominant axis of travel with a bias towards the current facing. | Confirm a diagonal walk holds one facing instead of flapping. |
| BUG-041 | P2 | open | Six remaining room backgrounds are not the stage aspect and are non-uniformly stretched at runtime: `carpenter` by 28.2%, `sewer` by 18.3%, `marketStreet` by 7.3%, and `den`, `deadTree`, and `researchRoom` by about 1.3%. A stretched room distorts every painted object in it. Leigh has approved re-composing at 832x448 as part of each room's restyle; Dead Tree and Research Room need only a uniform re-export. Evidence: `docs/asset-report.md`. | Each remaining background ships at exactly 832x448 with no non-uniform scaling; `npm run check:assets` reports no aspect breach. |
| BUG-042 | P3 | open | The Den is painted from a much closer camera than every other room: its furniture is drawn at roughly twice the scale of comparable furniture elsewhere, so a correctly scaled character fills two thirds of the frame at 215–300 px against an interior norm of 145–200 px. The scale profile is honest about the art rather than hiding the mismatch, so the room reads as correct in isolation and wrong beside its neighbours. | Repaint the Den from the standard eye-height camera and bring its authored heights into the interior band. |
| BUG-044 | P2 | planned | Three human NPCs are authored at a different scale from the player standing beside them: `npcCarpenter` 2.65x, `npcWomanLostMirror` 1.74x, and `npcLibrarian` 0.57x. Six of the nine placed NPCs also have boxes that disagree with their sprite aspect. The correction was computed and verified in-game on 2026-09-14 and deliberately reversed until the characters are repainted. | Re-author the NPCs so each box keeps its sprite aspect and every person-sized NPC measures within 0.8–1.25 of the player, holding its foot cell and horizontal centre; then enforce both rules. |
| BUG-045 | P2 | open | Placed objects are drawn into boxes that disagree with their art, so many props are stretched non-uniformly. The Library Foyer's replacement door states now have matched canvases and fitted boxes, but the wider audit remains open. The worst remaining cases include other door-state variants, carrot, glove, donkey world sprites, and pliers. Evidence: `docs/asset-report.md`. | Re-author each remaining object's dimensions so its drawn box keeps the sprite aspect, giving state variants separate authored dimensions where required, and extend the aspect assertion from NPCs to objects. |
| BUG-046 | P3 | open | An NPC's directional and state sprites are authored on disagreeing canvases, and the engine holds only one `dimensions` record per NPC, so at most one of them can be undistorted. With the boxes now matching each NPC's active sprite, the others are stretched: `npc.donkeyNotOnRope` is 369x498 against `npc.donkeyOnRope`'s 538x508 and is drawn 43% too wide, and `npc.carpenterNpcLeft`/`Right` are 138x396 and 136x395 against `npc.carpenterNpcBack`'s 170x404 and are drawn about 21% too wide. The fault is in the exports, not the authored numbers. | Re-export each NPC's sprites onto one shared canvas per NPC, padded with transparency, as the art bible's "one NPC, one canvas" rule requires; the `test/unit/depth-scale.test.mjs` aspect assertion then holds for every sprite rather than only the active one. |
| BUG-043 | P3 | open | A layout regression predating this work: the supported-layout matrix reports 3 px of vertical overflow at 1440x900, against a tolerance of 1 px. Reproduced against commit `fb3a96e` with all current work reverted, so it is not caused by the scale changes. Evidence: `e2e/rendering-layout/responsive-interface.spec.cjs` failing at line 42. | The wide-screen matrix passes with zero vertical overflow again. |
| BUG-018 | P1 | open | Dependency audit reported 34 known vulnerabilities (4 low, 3 moderate, 25 high, 2 critical) in the installed tree, especially the legacy packaging/server chain. | Review upgrades, retest browser/desktop targets, and record an accepted zero/exception baseline. |
| BUG-021 | P2 | open | The extracted 21-module `src` graph is cycle-free and boundary-checked, but several legacy adapters still form circular imports and rely on the large mutable global-state bridge. | Continue migration under the dependency rule until the legacy cycles/global bridge are removed. |
| BUG-023 | P3 | open | The debug half is resolved: the always-available wheel menu was removed from `index.html`, `styles.css`, and `ui.js`, and the replacement panel requires both a debug-enabled build and an explicit session request. The placeholder product copy remains — the document title is still `Game` and the menu shows `Game Title Placeholder`. | Product title/copy approved and asserted in the startup browser test. |
| BUG-024 | P2 | open | Audio described by the GDD is not implemented, so the current experience lacks feedback, ambience, and scene tone. | Audio settings, interaction cues, ambience, music transitions, and mute persistence are tested. |
| BUG-031 | P2 | open | `resetConversation(npcId)` restores the NPC record but cannot rewind a legacy conversation's internal phase, because those conversations still encode progress outside the canonical state. It is a consequence of BUG-011 rather than a separate design fault. | After the remaining conversations move to explicit graphs, reset a mid-conversation NPC and replay the same branch to the same consequence. |
| BUG-032 | P3 | open | `simulateAssetFailure(url)` records the declared asset for assertion but does not intercept the request, so the `system.asset-failure` scenario cannot yet prove the loading/error presentation in a browser without a Playwright route. | A scenario alone makes one declared asset fail and the visible fatal/degraded state is asserted. |
| BUG-035 | P2 | open | The rigging chain's pulley has no authored origin. `objectPulleyWheel` has no placement room and no pickup source; it is created in the world by `combinePulleyAndSturdyAnchor`, which is why `rigging.assemble` can only declare `chapter1.started` as its prerequisite instead of "the player is carrying a pulley". The authored `pulleyRiggingFlow.txt` says "3 more objects to make", so this is unfinished content rather than lost logic. Until it is authored, the rigging thread is open from the first minute of the chapter, which is visible in the critical-path frontier. | Author the pulley's source (and the remaining rigging props), give `rigging.assemble` its real prerequisite, and cover the acquisition in the puzzles area. |
| BUG-036 | P3 | open | The canonical prerequisite gate in `executeAllowedAction` is not enforced for twenty-two of the event mappings; they record their action and log an anomaly instead of refusing to run. This is deliberate, because a blocking gate over a 44-action graph can only fail by stranding the player, but it does mean an out-of-order interaction is reported rather than prevented. | Once every chain has browser coverage proving its real ordering, promote the mappings to blocking gates one chain at a time, and assert `getProgressDiagnostics()` stays empty across the critical path. |

## BUG-039 acceptance note

Only a human gate remains: Leigh's visual acceptance of the revised motion and a recorded final paint-over decision. The reproducible art, geometry, budget, provenance and test evidence is linked from the Section 2 production record; completed playback defects are in the resolved register.

## BUG-044: the computed correction, held for when the characters are repainted

Derived on 2026-09-14 against the shipped grids and room scale profiles, applied, verified in-game, and then reversed at Leigh's instruction so that character scale is judged once against final art rather than twice.

Each NPC's **foot cell and horizontal centre were held**, and `gridPosition` moved to suit the new size, so nobody floats, sinks, or slides sideways. Grid positions stay whole cells as the content contract requires, with the fractional part carried in the dimensions. Widths follow from the height and the sprite's own aspect, so nobody is stretched.

The three out-of-band humans were re-targeted to heights chosen as art judgements inside the 0.8–1.25 band rather than flattened to 1.0 — an adult man reads slightly taller than the player, an elderly librarian slightly shorter. The farmer at 0.81 and the seedy guy at 1.03 were already inside the band and kept their authored build, losing only their distortion.

**These numbers are correct for the art as it stands today.** Once a character is repainted its sprite aspect changes, so its width must be re-derived; the heights and the held foot cells remain the right starting point.

| NPC | Room | Cells now | Cells corrected | `gridPosition` now | corrected | Ratio now | corrected |
| --- | --- | --- | --- | --- | --- | ---: | ---: |
| `npcCarpenter` | carpenter | 6 x 32 | 3.93 x 13.02 | 37, 20 | 38, 39 | 2.65 | 1.08 |
| `npcWomanLostMirror` | roadIntoTown | 4 x 22 | 2.69 x 12.65 | 5, 26 | 6, 35 | 1.74 | 1.00 |
| `npcLibrarian` | libraryFoyer | 4.5 x 10 | 6.9 x 16.02 | 15, 34 | 14, 28 | 0.57 | 0.92 |
| `npcFarmer` | cowPath | 6 x 17 | 9.14 x 17 | 24, 26 | 22, 26 | 0.81 | 0.81 |
| `npcDonkey` | stables | 12 x 20 | 15.21 x 20 | 35, 35 | 33, 35 | 1.03 | 1.03 |
| `npcCow` | cowPath | 6 x 14 | 6.39 x 14 | 13, 27 | 13, 27 | 0.67 | 0.67 |
| `npcSeedyLookingGuy` | alley | 5 x 18 | 5.06 x 18 | 40, 34 | 40, 34 | 1.03 | 1.03 |
| `npcTownDog` | marketStreet | 4 x 7 | 3.81 x 7 | 40, 50 | 40, 50 | 0.25 | 0.25 |
| `npcWolf` | riverCrossing | 5 x 8 | 5.26 x 8 | 75, 27 | 75, 27 | 0.40 | 0.40 |

`npcCow`, `npcFarmer`, and `npcWolf` are placed by `events.js` at explicit cells rather than from `npcPlacementLocation`, so their literals move with them. The farmer has a second placement at his house, at 46, 26, which moves to 44, 26 by the same centre-preserving shift.

Two open questions for the repaint, neither of which the numbers can settle:

- **The town dog is drawn at 0.25 of the player's height** — 37 px against 145 px at the front of Market Street. That is small for a dog even allowing for caricature. It is flagged as an animal and therefore exempt from the band, so nothing forces it to change; it is listed here because it is worth a look when Market Street is restyled.
- **`npc.librarian` is a 75 x 125 source carrying 382 KB.** Whatever is inside that file, 75 x 125 is too small a source for a character who has to read at 78 px and would be upscaled if she ever moved forward. She needs redrawing at a usable size rather than re-scaling.

## Recording policy

Newly discovered bugs receive the next stable ID and are added to the active register above.

When fixing an item, change its state to `verify` and link the covering test or evidence. Once the relevant suite passes, move the whole row into `archive/bugs-resolved.md` — resolved rows are never deleted, and never left in the active register, so this table always answers "what is still wrong" on its own.

A regression test for a fixed defect should be verified against the unfixed code before the row moves, and the evidence column should say what it reported there.
