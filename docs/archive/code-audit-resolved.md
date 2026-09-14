# Code and content audit — resolved findings

The closed half of the original audit, kept because the reasoning behind each resolution still matters. The open findings are in [code-audit.md](../code-audit.md).

## Audited snapshot (original pass)

Counts describe the audited snapshot, not the current repository. Regenerate them after large content changes.

- World model: the original audit counted 19 rooms and 41 objects, before Debug Room was removed and the Map payoff object was added.
- Assets inspected: 253 PNG, 64 JPG, 5 PSD, 4 GIF, plus design documents and diagrams.
- Core code was roughly ten thousand physical lines, led by `game.js`, `ui.js`, `constantsAndGlobalVars.js`, `handleCommands.js`, and `events.js`.
- Repository history was dominated by binary material: the Git pack was approximately 906 MiB and included two tracked build ZIPs of about 49 MiB each.

## Audit accuracy review (2026-09-13)

These statements in earlier revisions of the audit were re-checked against source and were wrong or stale. They were corrected in place at the time, and the affected bug rows were updated.

| Earlier claim | Finding |
| --- | --- |
| "19 navigation records" and "`debugRoom` … points to nonexistent `libraryFoyerDebug`"; "`map` … background and grid are absent" | Stale. `resources/screenNavigation.json` now holds 18 rooms, Debug Room was intentionally removed, and the Map has art, a generated polygon grid, and reciprocal navigation. |
| "Market Street … five connections; the scene brief asked for four … needs an explicit design decision" | Stale. The contract declares `marketStreetExitCount: 5` and the validator enforces it. |
| "the current state capture/restore only persists language" | **Wrong.** `captureGameStatusForSaving()` returned the whole canonical snapshot and `restoreGameStatus()` replaced state from it, so room, position, inventory, quest facts, dialogue state, and world mutations were all persisted at the time of the claim. The real remaining gaps were different and were recorded against BUG-003. |
| BUG-022 recorded as resolved: "the edge-scroll named-global dependency was removed" | **Incomplete when written.** `game.js` still passed the browser-created global `canvas` to `setDynamicBackgroundWithOffset` inside `swapBackgroundOnRoomTransition`. That call now uses `getElements().canvas`. |
| BUG-023: "exposed Debug option" not suitable for release | Half resolved. The debug entry now requires explicit development enablement; the placeholder product title remained open and is carried by the live checklist. |

## Lifecycle and state

A versioned serialisable state factory/store provides the canonical lifecycle snapshot behind the legacy accessors. New sessions replace state, own and dispose their animation frame and session listeners, await validated data/localisation/image readiness, and fail into a visible alert.

The original finding — no explicit `boot`, `startSession`, `disposeSession`, `restoreSession`, so repeated starts retained state or duplicated listeners — is closed.

## Reachability

Section 4 added gated debug and test controls. Fourteen reviewed scenarios arrange canonical facts, derive every exit/entity/grid mutation from the content contract, and reach a validated state with a reproducible checksum in under a second. The always-available debug wheel was removed from the shipped page in favour of a build-gated DEBUG panel and a narrow versioned `__GAME_TEST__` API. See [debug-test-controls.md](../debug-test-controls.md).

## Click zones and hotspots

- Grid codes are validated against a schema, and undeclared overlaps and out-of-bounds hotspots are validation errors rather than report-only warnings.
- `npm run report:hotspots` generates the hotspot report with bounds, anchors, accessible labels, and minimum-target-size warnings.
- The debug panel's overlay layer draws walkability, movement costs, blocked cells, exits, hotspots, entity footprints, anchors, the computed path, and the player cell additively over a live frame. That is a developer tool, not the player-facing reveal.

## Interaction and verbs

Section 3 replaced runtime command reconstruction with `{ verbId, primaryTargetId, secondaryTargetId }` intents. Buttons, inventory items, canvas targets, and dialogue choices carry stable IDs; translated text is presentation only. Contextual default clicks and two-target Use/Give flows are governed by pure command-state rules.

## Content and data integrity

Material gaps recorded in the original audit, and how each closed:

- `debugRoom` had no usable matching grid/data set and pointed to a nonexistent `libraryFoyerDebug`. **Resolved:** intentionally removed from shipped content; the validator rejects its reintroduction. Its development purpose is served by the gated debug controls.
- `map` was referenced by navigation but had no background or grid. **Resolved:** the Map now has art, a deterministic polygon walk grid, reciprocal navigation, a stable payoff object, and the `chapter1.mapReached` fact.
- Debug object/NPC JSON paths referenced by code were absent. **Resolved:** those references were removed with Debug Room.
- The runtime topology differed from the supplied world map, which contains an Embassy while the runtime adds sewer/kitchen and separate barn/house interiors. **Resolved by declaration:** `chapter1-world-v1` makes the 18-room runtime topology authoritative and labels the diagram historical.
- Market Street exposed five connections while the scene brief asked for four. **Resolved by decision:** the contract declares five and the validator enforces exactly that.

## Save and load

The original audit said capture/restore persisted language only. That stopped being true when the canonical store landed, and the corrected note that replaced it listed four real gaps. All four are closed:

- **A version envelope on the player-facing path.** Every save the player can produce is a `{ format, schemaVersion: 2, savedAt, payload }` envelope, and every save entering the game passes through `migrateSave()` first. Declared versions 0 and 1 migrate; anything else is refused with a stable error code instead of being half-applied.
- **Derived state is rebuilt after restore.** Committing a restored state clears the old session, then rebuilds canvas metrics, entity placement and the walk-grid stamps, `visualPosition` and pixel dimensions, the background and foreground images, entity paths, and the inventory strip.
- **The content bundle is no longer inside the snapshot.** A save stores authored progress plus a patch against the shipped content. The E2E assertion is blunt: the stored JSON must not contain an asset path.
- **Local Resume, autosave, and checkpoints exist.** A `Continue` control in the menu is enabled only when a stored save can actually be read. The resume slot is written on New Game, at each declared milestone, on a rate-limited room change, and on manual save; a separate checkpoint slot holds the last milestone only.

## Localisation

Section 3 removed localisation `eval`: lookup has explicit locale/English fallback, a visible missing-key result, and interpolation restricted to supplied `${token}` names. The five-locale librarian journey proves that translated wording does not select actions or dialogue branches.

## Rendering and performance

Unawaited preloading was fixed in Section 1. The worst per-frame debug work was fixed in Section 4: `updateDebugValues()` no longer serialises the whole grid every frame unless the legacy debug window is open, and frame sampling and overlays only run in a development build.

## UI, responsiveness, hotspots, and accessibility — resolved 2026-09-14

- The world renders at one 832×448 logical size and scales through a responsive stage without rewriting authored coordinates. Pointer inversion is deterministic across the viewport matrix.
- Walk cells and player interaction targets are separate. Runtime grid codes project into labelled semantic rectangles with independent anchors; eight narrow exits receive minimum semantic targets without changing their authored geometry.
- The fixed Bootstrap-style HUD was replaced by a cohesive tokenised menu, toolbar, action sentence, classic/contextual verb panel, inventory cards, dialogue panel, settings, and status presentation.
- All room targets have semantic buttons and names. Keyboard verbs, inventory/dialogue navigation, focus management, Escape/back, live announcements, scene descriptions, touch parity, reduced motion, high contrast, hotspot assistance, and controller navigation are implemented.
- The graph-driven dialogue paginator displays three ordinary choices plus its persistent exit and reaches the remaining authored options with the existing arrows.
- The responsive/accessibility browser matrix and the full 69-journey suite pass; BUG-014, BUG-015, BUG-029, and BUG-038 are closed.
