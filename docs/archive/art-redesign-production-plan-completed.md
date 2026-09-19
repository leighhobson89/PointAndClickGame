# Completed art redesign production sections

This is the completed side of [art-redesign-production-plan.md](../art-redesign-production-plan.md).

## 2026-09-14 — Section 1: Den camera and room package

Created a non-shipping Den background candidate that changes the room from its close, oversized camera to the standard eye-height interior camera while preserving its recognisable identity: the central exit doorway, symmetrical work benches, dark masonry, dense clocks/gears/pipes, circular upper-right feature, and clandestine workshop mood.

The generated source uses the current Den as its strict composition reference and Kitchen as its strict interior style/camera reference. It was exported through a centred, aspect-preserving source crop to an exact 832 x 448 review image. The result has a horizon near mid-frame, a clear lower-half walk plane, one warm upper-left key light, cool ambient shadows, no characters, no puzzle-state sprites, no text, and no watermark.

Delivered review files:

- `resources/redesign/section-01-den/den-background-source.png` — untouched 1709 x 920 built-in generation output.
- `resources/redesign/section-01-den/den-background-candidate.png` — exact 832 x 448 review export.
- `resources/redesign/section-01-den/README.md` — purpose, references, prompt, status, and the matching door/crowbar asset brief.

This completes the first **generation section**, not the master-checklist painting task. The candidate is deliberately not wired into `screenNavigation.json`, not copied over `resources/backgrounds/den.png`, and not added to the shipped manifest. Leigh's visual approval, the matching door/crowbar assets, a human paint-over decision, provenance/licence review, grid/hotspot work, scale calibration, WebP export, and in-game acceptance remain required before BUG-041 or BUG-042 can close.

## 2026-09-19 — Section 2: player art and gait technical completion

Finished the player package's art and runtime mechanics through the final human acceptance gate:

- Replaced the wide-only lateral middle with a retained true passing pose. At frame 5 the knees and ankles visibly cross, one boot is planted and the other passes behind it; right is derived by mirroring the same approved source.
- Reordered both side cycles into monotonic contact-to-passing-to-opposite-contact stance widths: `210, 173, 168, 144, 88, 133, 182, 194, 215` pixels. The passing/contact ratio is 0.409 and grounded boot components change `2 → 1 → 2` in both directions.
- Reordered and mirrored the available front/back art into readable alternating steps. All four directions now use one forward 1→9→1 contract.
- Replaced tick timing with body-relative distance phase in `src/domain/animation/player-gait.mjs`, including explicit non-uniform phase durations so contact is brief and passing/swing remain readable at every room depth.
- Kept all 40 frames at 280×375, 365 px subject height and y=371 foot baseline, with 0 px baseline spread and 0% height spread. The output quantisation pass has at most two RGB channel values of error and brings the largest PNG to 44,984 bytes against the 60 KB budget.
- Corrected generated evidence so the manifest, geometry report and calibration sheets measure the wired redesign rather than the legacy rollback art. Authored provenance/licence metadata now covers all 40 runtime frames.
- Added a Chromium pixel audit and four-direction contact sheet, five gait unit tests, and a real-canvas browser test that observes every pose advancing forward in left, right, up and down walks.

The only remaining Section 2 work is Leigh's visual acceptance of the revised motion and the final human paint-over decision; those approval gates remain on the live plan.

### 2026-09-19 acceptance

Leigh approved the revised character animation and authorised the final package as-is. No additional human paint-over is required. This closes the Section 2 acceptance gate and BUG-039.

## 2026-09-19 — Section 3: Library Foyer whole-room restyle

Leigh approved the warm painted Library Foyer study and asked for it to be made functional. The approved source was uniformly fitted to an exact 832 x 448 WebP without non-uniform stretch, then wired with a matching alpha foreground and four new transparent door-state assets.

Both door objects were resized and repositioned onto the new painted apertures. The librarian retained her lectern relationship pending the later NPC repaint; the book-pile hotspot was expanded to the complete visible stack, and the hidden research key was repositioned inside it. That intentional overlap is explicit in the content contract.

Section 3 also established the room-restyle rule now carried by the live production plan: every accepted room receives a new walkable-area overlay, room-local grid fragment, and exact placement record. The Library package and full generation brief live in `resources/redesign/section-03-library-foyer/`; `npm run process:library-foyer` reproduces its exact delivery assets.

Evidence: content validation and all 76 unit tests pass; the Library-specific browser acceptance validates the exact assets, decoded cache state, apertures, book/key relationship, and librarian position. The wider rendering area continues to report only registered BUG-043, the pre-existing 3 px layout overflow.
