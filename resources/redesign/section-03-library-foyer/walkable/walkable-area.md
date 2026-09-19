# Library Foyer walkable-area and placement record

Generated: 2026-09-19 from the accepted 832 x 448 background and the shipped `masterJSONData.json` authority.

The new painting preserves the established floor route, so the canonical 80 x 60 cell values remain valid. This is a deliberate reviewed decision, not an assumption based on the previous picture. Regenerate the overlay and fragment with `npm run process:library-foyer` after any scene change.

## Stage mapping

- Stage: 832 x 448 pixels.
- Grid: 80 x 60 cells.
- Logical cell: 10.4 x 7.4667 pixels.
- Green overlay: walkable depth cells (`w100`–`w255`).
- Yellow overlay: authored exits.
- Red overlay: non-walkable scene.

## Locked scene geometry

| Element | Grid / authored box | Logical stage rectangle or route | Review note |
| --- | --- | --- | --- |
| Research Room exit `e1` | cells x38–39, y33–45 | follows the small rear arch | Locked until the research key is used |
| Market Street exit `e2` | cells x50–51, y33–58 | follows the tall right arch | Open route to Market Street |
| Research door, closed | position (37,32), offset (-0.3,-1.8), 3 x 14.4 cells | about x381.4, y223.7, 31.2 x 107.5 px | Right-hand chair cut-out; handle on right |
| Research door, open | state offset -60 px | about x319, y223.7, 31.2 x 107.5 px | Moves left behind the chair; different triangular cut-out; handle on left |
| Market door, closed | position (49,32), offset (0.05,-2.7), 4 x 23 cells | about x510.2, y216.1, 41.6 x 171.7 px | Handle on left; fills the tall arch |
| Market door, open | state offset +60 px | about x562.2, y216.1, 41.6 x 171.7 px | Moves onto the right wall; handle on right |
| Book-pile hotspot | position (15,46), 12 x 13 cells | x156, y343.5, 124.8 x 97.1 px | Covers the complete visible foreground stack |
| Research key | position (22,48), 2 x 4 cells | x228.8, y358.4, 20.8 x 29.9 px | Intentionally nested within the book hotspot |
| Librarian | position (15,34), offset (1.8,0.4), 4.5 x 10 cells | about x174.7, y256.9, 46.8 x 74.7 px | Holds the established position behind the lectern |
| Foreground occluder | full 832 x 448 alpha layer | chair/lectern/table/books silhouette | Must remain pixel-aligned with the background |

The key/book overlap is declared in `resources/content-contract.json` because it represents the intended “hidden in plain sight” puzzle relationship. Any other new overlap remains a validation error.

## Restyle rule

Every future whole-room restyle must produce the same three proofs before it is wired in:

1. A fresh overlay rendered over the accepted background from the canonical runtime grid.
2. A room-local grid fragment and a placement table covering exits, objects, NPCs, hotspots, and foreground occluders.
3. An in-game acceptance check showing that visible art, semantic hotspots, and object state variants occupy the same authored locations.
