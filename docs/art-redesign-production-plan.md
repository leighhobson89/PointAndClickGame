# Art redesign production plan

This is the live production plan for the painting-gated work in [master-checklist.md](master-checklist.md) section 8. Finished sections move to [archive/art-redesign-production-plan-completed.md](archive/art-redesign-production-plan-completed.md).

The work is deliberately divided into complete visual packages. A room is never swapped into the game with only some of its visible elements restyled. Generated images are candidates for review and human paint-over, not automatically approved shipping art. Every accepted asset must satisfy [art-bible.md](art-bible.md), be checked at gameplay scale beside the relevant gold standard, and have its provenance and licence recorded before shipping.

## Production rules shared by every section

- Background and foreground compositions target the 832 x 448 stage from the start. They are recomposed, never stretched or blindly cropped.
- Interiors use Kitchen as the paint, camera, light, and scale reference; exteriors use River Crossing.
- The horizon stays near mid-frame, the walkable floor occupies the lower half, and required visual information stays outside the 24 px frame-safe band.
- Existing room identity and puzzle geography are invariants: exits, architectural landmarks, prop relationships, walk routes, and interaction locations stay recognisable.
- A character at the near plane must read in the applicable 145–200 px interior or 125–175 px exterior band, with a near-to-far ratio no greater than 4:1.
- Characters and free-standing props receive soft contact shadows consistent with one stated key-light direction.
- Stateful sprites are designed as a set. All frames for one NPC share one transparent canvas; object variants may use separate authored dimensions when their shapes differ.
- Inventory icons are separate 128 x 128 crops with a readable silhouette at 48 px, not reused oversized world sprites.
- No candidate replaces a shipped asset until its whole-room package passes the art-bible acceptance gate.

## Section 2 — Painted player model and animation source set

**Status (2026-09-14):** the generated model sheet and 40-frame candidate set are connected to the runtime from `resources/redesign/section-02-player/frames/`; the legacy `resources/player/` files remain untouched as rollback sources. All four movement directions use nine poses. Registration, green-edge cleanup and playback are done and measured: subject height 365 px and baseline y=371 in all 40 frames, on a 280 x 375 canvas. What is left before this section can close is art approval and packaging, not mechanics.

Settle the protagonist's build in a painted model sheet before producing animation: front, back, left, right, three-quarter construction views, head count, shoulders, hips, limbs, hair mass, hands, and boots. Use the approved painted side idles as finish references, resolving their 38% build disagreement with the front idle.

After model approval, author every idle and walk pose against it on the shared **280 x 375** registration. The canvas is wider than the player's logical box on purpose: a side-on stride is about twice as wide as a front-on one, and a canvas that cannot hold it forces a scale-down that reads as the character changing size mid-walk. Hold the foot baseline spread under 2% and character-height spread under 5%; add a soft contact shadow to every gameplay frame.

Remaining for this section: re-author the front and back walks, whose poses are currently too alike to read as a stride; complete the human paint-over; bring the 37 over-budget frames under 60 KB; and record the provenance/licence decision.

## Section 3 — Library Foyer whole-room restyle

Restyle Leigh's original Library Foyer without changing its layout. Preserve the positions and relationships of both exit doors, the central circulation route, librarian position, key/books puzzle landmarks, and foreground occluders. Recompose to 832 x 448 and match Research Room's library vocabulary plus Kitchen's paint weight, camera, and light discipline.

Generate the background and all visible foreground/door-state elements as one review package. The librarian redraw waits for Section 7, but the room reserves her final 0.8–1.25 player-relative scale.

## Section 4 — Market Street whole-room restyle

Restyle Leigh's original Market Street composition in the River Crossing exterior finish. Preserve all five exit readings, building/stall relationships, the town dog's route and silhouette space, the woman-with-mirror position, manhole interaction area, and existing walk corridor. Recompose to 832 x 448 rather than squeezing the 1000 x 581 source.

Generate the background, foreground occluders, and matching door/manhole state art as a single scene package. Keep the room's dominant hue controlled while letting puzzle interactables separate from it.

## Section 5 — Back Alley whole-room restyle

Restyle Leigh's original Back Alley while retaining the exact recognisable route between Market Street and the locked Den entrance, the seedy character's staging, and the milk-bottle interaction. Recompose the very large 3329 x 1801 source to 832 x 448 in the River Crossing exterior finish, with a coherent single key light and readable shadow shapes rather than generic darkness.

Generate the background, foreground occluders, and Den entrance open/closed states together. Reserve correct-scale staging for the seedy character and contact shadows.

## Section 6 — Sewer whole-room replacement

Replace the grey photographic tunnel language with a painted storybook sewer that still preserves the House-to-Kitchen route, ladder/exit readings, walk corridor, and all foreground occlusion. Recompose the 1366 x 622 source to 832 x 448, using Kitchen's lower interior saturation and material rendering while keeping damp stone, pipes, grime, and authored humour.

Generate background and alpha foreground as one package. The foreground must retain a clean alpha edge with no keyed halo.

## Section 7 — NPC repaint, proportion, and shared canvases

Repaint the human NPCs against the approved player model and room packages. Correct the carpenter, woman who lost her mirror, and librarian into the 0.8–1.25 same-depth band while preserving characterful build rather than flattening everyone to 1.0. Review the unusually small town dog during the Market Street pass.

Re-export every facing and state for each NPC on one shared transparent canvas per NPC, including the carpenter and donkey variants. Hold each NPC's foot cell and horizontal centre when final dimensions are applied, and give every pose a room-light-consistent contact shadow.

## Section 8 — Props, state variants, and inventory crops

Repaint or recrop every placed prop whose visual language or drawn-box aspect disagrees with its room package. Prioritise the severe variants recorded in BUG-045: Den and Market Street doors, carrot, glove, donkey world sprites, and pliers. Generate stateful objects as coherent sets, but allow each state its own authored box where the silhouette changes.

Create dedicated 128 x 128 inventory crops for every oversized/reused world sprite. Maintain subject identity between world and inventory art, with the inventory silhouette filling its slot with a 6% margin. Add soft contact shadows to every free-standing world prop; inventory icons remain shadowless unless the crop itself needs minimal grounding.

## Section 9 — Remaining-room normalisation and world acceptance

Review every room beside River Crossing or Kitchen and beside its neighbours. Uniformly re-export Dead Tree and Research Room to 832 x 448; recompose Carpenter to the stage aspect during its full-room normalisation; retain the two gold-standard rooms without repainting. Where a room already belongs to the approved painted majority, change only the inconsistent background/foreground/asset elements required for the whole room to pass together.

Once the painting is approved, apply the held NPC corrections, re-author object dimensions, converge `entityScaleAtNear` toward 1, rebuild grids/foreground masks where compositions changed, and run room-by-room visual acceptance. Final exports then enter the optimisation pipeline and receive provenance/licence records.
