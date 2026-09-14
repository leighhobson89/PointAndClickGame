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
| BUG-017 | P2 | open | Source assets have inconsistent resolution, scale, crop, finish, and file weight; duplicate assets inflate delivery/history. | Asset validator/report passes the approved art/export budget. |
| BUG-018 | P1 | open | Dependency audit reported 34 known vulnerabilities (4 low, 3 moderate, 25 high, 2 critical) in the installed tree, especially the legacy packaging/server chain. | Review upgrades, retest browser/desktop targets, and record an accepted zero/exception baseline. |
| BUG-021 | P2 | open | The extracted 21-module `src` graph is cycle-free and boundary-checked, but several legacy adapters still form circular imports and rely on the large mutable global-state bridge. | Continue migration under the dependency rule until the legacy cycles/global bridge are removed. |
| BUG-023 | P3 | open | The debug half is resolved: the always-available wheel menu was removed from `index.html`, `styles.css`, and `ui.js`, and the replacement panel requires both a debug-enabled build and an explicit session request. The placeholder product copy remains — the document title is still `Game` and the menu shows `Game Title Placeholder`. | Product title/copy approved and asserted in the startup browser test. |
| BUG-024 | P2 | open | Audio described by the GDD is not implemented, so the current experience lacks feedback, ambience, and scene tone. | Audio settings, interaction cues, ambience, music transitions, and mute persistence are tested. |
| BUG-031 | P2 | open | `resetConversation(npcId)` restores the NPC record but cannot rewind a legacy conversation's internal phase, because those conversations still encode progress outside the canonical state. It is a consequence of BUG-011 rather than a separate design fault. | After the remaining conversations move to explicit graphs, reset a mid-conversation NPC and replay the same branch to the same consequence. |
| BUG-032 | P3 | open | `simulateAssetFailure(url)` records the declared asset for assertion but does not intercept the request, so the `system.asset-failure` scenario cannot yet prove the loading/error presentation in a browser without a Playwright route. | A scenario alone makes one declared asset fail and the visible fatal/degraded state is asserted. |
| BUG-035 | P2 | open | The rigging chain's pulley has no authored origin. `objectPulleyWheel` has no placement room and no pickup source; it is created in the world by `combinePulleyAndSturdyAnchor`, which is why `rigging.assemble` can only declare `chapter1.started` as its prerequisite instead of "the player is carrying a pulley". The authored `pulleyRiggingFlow.txt` says "3 more objects to make", so this is unfinished content rather than lost logic. Until it is authored, the rigging thread is open from the first minute of the chapter, which is visible in the critical-path frontier. | Author the pulley's source (and the remaining rigging props), give `rigging.assemble` its real prerequisite, and cover the acquisition in the puzzles area. |
| BUG-036 | P3 | open | The canonical prerequisite gate in `executeAllowedAction` is not enforced for twenty-two of the event mappings; they record their action and log an anomaly instead of refusing to run. This is deliberate, because a blocking gate over a 44-action graph can only fail by stranding the player, but it does mean an out-of-order interaction is reported rather than prevented. | Once every chain has browser coverage proving its real ordering, promote the mappings to blocking gates one chain at a time, and assert `getProgressDiagnostics()` stays empty across the critical path. |

## Recording policy

Newly discovered bugs receive the next stable ID and are added to the active register above.

When fixing an item, change its state to `verify` and link the covering test or evidence. Once the relevant suite passes, move the whole row into `archive/bugs-resolved.md` — resolved rows are never deleted, and never left in the active register, so this table always answers "what is still wrong" on its own.

A regression test for a fixed defect should be verified against the unfixed code before the row moves, and the evidence column should say what it reported there.
