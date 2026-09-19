# Section 3 — Library Foyer room package

Status: approved by Leigh and wired on 2026-09-19.

This package restyles Leigh's Library Foyer into the painted storybook finish while preserving the room's identity and game geometry. The exact 832 x 448 delivery assets are generated with:

```text
npm run process:library-foyer
```

## References and generation brief

- Composition authority: `resources/backgrounds/libraryFoyer.png`.
- Interior finish, camera, and lighting: `resources/backgrounds/kitchen.png`.
- Library material vocabulary: `resources/backgrounds/researchRoom.png`.
- Runtime-layout reference: `references/library-foyer-runtime-layout.png`.

The accepted background brief asked for a warm, hand-painted storybook library foyer; the original room's perspective and recognisable layout; wall-to-wall bookcases; the librarian lectern and central paired chairs; the rear Research Room doorway, the larger Market Street arch and red curtain; a clear lower-half walk plane; a single warm chandelier key light; no characters, text, watermark, UI, loose replacement doors, or puzzle-state props. It explicitly required an exact 13:7 composition suitable for 832 x 448 delivery and asked the finish to match the supplied Research Room and Kitchen references.

The four door briefs asked for isolated transparent-background painted wooden door sprites that match the accepted room: closed and hinge-open states for the tall Market Street arch, and closed/locked and hinge-open states for the smaller Research Room arch. The first generated open states put their handles on the wrong sides and are retained with `v1-wrong-handle` filenames as rejected evidence. The corrected Market open state has its handle on the right; the corrected Research open state has its handle on the left while retaining its left hinges.

The legacy door alpha is design authority, not disposable old styling. Delivery processing uses the original four sprites as masks so the Research door keeps its distinct closed/open chair cut-outs and both doors retain their authored silhouettes. Only the RGB paint treatment is replaced.

Generated source candidates are retained unmodified under `candidates/` and `source-art/`. Provenance and licence notes for every shipped output are in `resources/asset-provenance.json`.

## Delivery package

| Asset | Runtime size | Purpose |
| --- | ---: | --- |
| `resources/backgrounds/libraryFoyer.webp` | 832 x 448 | Approved painted room |
| `resources/foregrounds/libraryFoyer.webp` | 832 x 448 | Chair, lectern, table, and book occlusion sampled from the accepted painting |
| `libraryFoyer_Exit_MarketStreetClosed.webp` / `Open.webp` | 84 x 347 | Market Street door states |
| `libraryFoyer_Exit_ResearchRoomClosed.webp` / `Open.webp` | 94 x 324 | Research Room door states |
| `walkable/libraryFoyer-grid.json` | 80 x 60 | Review copy of the shipped canonical grid |
| `walkable/libraryFoyer-walkable-area.png` | 832 x 448 | Walk/exit/no-go overlay on the accepted painting |
| `walkable/walkable-area.md` | — | Placement and walkable-area decision record |

The script crops the accepted 1708 x 921 study to its centred 1703 x 917 exact 13:7 region, then scales uniformly to 832 x 448. It never stretches the painting. Painted door RGB is fitted to the exact runtime aspect and masked by the state-specific legacy alpha. Foreground RGB is taken from the accepted background under the original occluder silhouette, avoiding seams.

## Placement lock

The room is accepted as one package. The door art, book interaction, hidden key, librarian, foreground occluders, exits, and walk grid must be reviewed together if the background changes again. Objects deliberately blended into the scene still need explicit geometry; visual camouflage is not permission for a hotspot to drift.

The browser acceptance in `e2e/rendering-layout/library-foyer-restyle.spec.cjs` protects the shipped dimensions, closed and open placements, Research chair cut-outs, load-time open-state rebuild, and background/foreground alignment after resizing between 1280 x 720 and 1920 x 1080. The librarian remains legacy art until the Section 7 NPC repaint, but her foot position and lectern relationship are reserved here.
