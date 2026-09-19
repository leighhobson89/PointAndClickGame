# Player redesign — Section 2 production record

## Status

Mechanically complete gameplay candidate awaiting Leigh's final visual acceptance and the project's human paint-over decision. The wired art now contains a real lateral passing/crossover pose, readable front/back foot changes, a distance-driven nine-frame loop in every direction, and delivery-size PNGs. The legacy files in `resources/player/` remain the rollback and pose-reference source.

## Runtime package

- `player-model-sheet.png`: canonical painted model and four-direction appearance reference.
- `frames/`: 40 runtime PNGs on **280 x 375** transparent canvases — one idle and nine movement poses for each of up, down, left, and right.
- `frame-geometry.csv`: source bounds, registration scale, output subject dimensions, stance width, discarded debris, baseline, and byte size for every runtime frame.
- `source-sheets/`: unmodified generated sheets, including the bright-green chroma sources used for extraction.
- `source-poses/`: retained transparent replacement poses, currently the true lateral passing/crossover pose used for frame 5 in both mirrored side cycles.
- `processed-sheets/`: keyed sheets kept for visual diagnosis; these are not runtime assets and are written before the extraction aids below, so they show the true key result.
- `pose-references/`: existing-game gait references used to preserve direction and broad step order.

Run `scripts/process-player-redesign.ps1` from the repository root to rebuild the frames from the chroma sheets and retained pose. Pass `-Measure` to report the registration every frame would get, and whether the widest pose still fits the canvas, without writing anything. Run `npm run audit:player-walk` after a rebuild to validate the runtime pixels and render the four-direction contact sheet under `test-reports/art/`.

## Why the canvas is 280 px wide and the player's box is not

A side-on stride throws the arms and legs about twice as wide as a front-on one. The first version of this pipeline scaled each frame by `min(365/height, 196/width)`, and the width term bound only on the side views — so those frames, and only those, were shrunk to fit. Drawn character height swung between 302 and 365 px across a single cycle, which is what read in game as the character pumping in size when it walked sideways.

Scale now comes from height alone and the canvas is wide enough to hold the widest pose, which measures 237 px. The script fails rather than silently scaling a pose that will not fit.

The player's **logical** box is a separate thing and is unchanged: `PLAYER_SPRITE_ASPECT` in `game.js` still drives depth sampling, edge collision and grid coverage at the 200 x 375 ratio, while `PLAYER_ART_ASPECT` draws the wider art about the same centre line.

## What the extraction pass does, and why each step is there

1. **Chroma key** the green background to alpha.
2. **Despill** globally: clamp green to the stronger of red and blue across the whole frame. Keying alpha does not remove colour, so pixels where green only slightly outweighed the subject stayed opaque and stayed tinted — the green rim that survived the first version. This is safe only because nothing in the costume has a green channel above both of the others; a green costume would need a keyed-region mask instead.
3. **Discard detached parts**, keeping the character's largest connected region. The sheets carry flecks of stray colour lying on the ground away from the figure, and they matter out of proportion to their size: a fleck below the boots becomes the lowest opaque pixel, so the bounding box is measured to the fleck and the figure is planted above the baseline. Six of the nine right-facing frames were hovering over their own shadows because of this. The count of erased pixels is reported per frame so a rebuild that starts eating real limbs is visible rather than silent.
4. **Bleed edge colour** outward into the transparent margin without touching alpha, because the bicubic downscale samples neighbouring pixels regardless of their alpha and would otherwise pull the original background back in.
5. **Register**: scale on height to a 365 px subject, place the head-and-torso median on the canvas centre, and sit the feet on y=371. The anchor is the torso rather than the bounding box because a bounding box follows whichever limb is thrown furthest out, so pinning it slid the body around inside the frame every step.
6. **Contact shadow** sized from the stance — the spread of the boots — rather than from the frame width, so a thrown-out arm no longer swells the shadow out of step with the feet.

7. **PNG channel quantisation** in four-value colour buckets and eight-value alpha buckets. Maximum RGB error is two channel values, which is visually lossless at gameplay scale, while removing generator and bicubic noise that previously put 37 frames over budget.

## Measured result

Subject height is 365 px and the foot baseline y=371 in all 40 frames: height spread 0%, baseline spread 0%, against an under-5% and under-2% target. The pixel audit measures lateral stance widths of `210, 173, 168, 144, 88, 133, 182, 194, 215` in both mirrored directions: a monotonic close into frame 5's single-support crossover and a monotonic open into the opposite contact. Its passing/contact ratio is 0.409, and separated ground contacts change `2 → 1 → 2` from contact through crossover to opposite contact. Every frame is below the 60 KB player-frame budget; the largest is 44,984 bytes.

## Art and generation brief

- Tool path: built-in image generation.
- Finish: hand-painted storybook character art compatible with the approved painted side idles and the Kitchen/River Crossing world finish.
- Character identity: young adult adventurer; shoulder-length curly blond hair; beige laced tunic and brown belt; muted coral trousers; ochre-brown boots; clear, friendly silhouette with gently irregular dark contours.
- Model request: settle the conflicting existing builds in consistent front, back, left, and right views before generating animation.
- Animation request: nine distinct readable walk poses per direction, consistent identity/proportions/costume, orthographic game-sprite view, no camera change, no props, no text, no cropping or overlap.
- Extraction request: solid chroma-green background, isolated full-body poses, then key to true alpha and register feet to the common baseline with a soft neutral contact shadow.
- Source references: the existing directional gait frames under `resources/player/`, the approved painted side-idle finish, `docs/art-bible.md`, and `docs/ui-and-art-direction.md`.
- Human paint-over: none recorded yet; Leigh's latest art direction explicitly rejected the earlier wide-only lateral gait, leading to the retained crossover replacement.
- Provenance/licence review: recorded in `resources/asset-provenance.json`; final third-party-similarity and visual acceptance remain with the project owner.

## Still to do before this section closes

- Leigh's visual acceptance of the revised gait in motion.
- Record the final human paint-over decision. No mechanical, ordering, registration, reporting, provenance, or player-frame budget work remains.
