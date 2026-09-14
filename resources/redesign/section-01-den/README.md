# Den redesign — Section 1 review record

## Status

Non-shipping composition candidate for Leigh's review. It does not replace the current Den and carries no approval, provenance, or licence assumption.

## Purpose

Correct BUG-042's too-close Den camera and BUG-041's off-stage aspect as a single full-background repaint study. Preserve the room's identity and gameplay geography while proving that it can support the art bible's 145–200 px interior near-plane character band.

## Files

- `den-background-source.png`: untouched 1709 x 920 image-generation result.
- `den-background-candidate.png`: centred, aspect-preserving 832 x 448 review export. Roughly 0.2 px was sampled from each horizontal edge during the uniform export; the image was not non-uniformly stretched.

## References

- Edit/composition target: `resources/backgrounds/den.png`.
- Style, camera, light, scale, and material reference: `resources/backgrounds/kitchen.png`.
- Standards: `docs/art-bible.md`, especially sections 0–5, 8, 10, and 11.

## Generation record

- Purpose: Den camera and whole-room composition study.
- Tool path: built-in image generation.
- Human paint-over: none yet.
- Licence review: required before any shipping use; no conclusion is recorded here.

Prompt:

> Use case: stylized-concept
>
> Asset type: 2D point-and-click adventure room background, Section 1 Den redesign candidate
>
> Input images: Image 1 is the current Den and is the strict composition/identity reference; Image 2 is Kitchen and is the strict interior paint, camera, perspective, outline, lighting, material, and polish reference.
>
> Primary request: repaint and recompose the current Den as a wide 832 x 448 storybook-caricature adventure background. It must immediately read as the same secret clockwork Den, but correct the current too-close oversized camera to the standard eye-height interior camera.
>
> Scene/backdrop: dark blue-grey masonry clandestine workshop with dense brass and copper pipes, clocks, gears, gauges, and quirky mechanisms; central exit doorway to the alley; work benches on left and right; timber-and-stone floor.
>
> Composition/framing: exact 13:7 landscape composition designed for an 832 x 448 game stage. Preserve Image 1's central door, bilateral bench layout, circular upper-right window/gauge, wall machinery density, and clear exit route. Pull the camera farther back, horizon near vertical midpoint, and make the walkable floor occupy the lower half with obvious near, middle, and far depth. Architecture and benches must plausibly fit an adult game character 145–200 pixels tall at the near plane. Keep the central door opening unobstructed and reserve clear floor space around the lower center and right-middle for player movement and a collectible crowbar sprite.
>
> Style/medium: hand-painted 2D storybook caricature, gently irregular ink contours, painterly stone/wood/brass textures, matching Image 2's visual language and finish; not pixel art, not photorealistic, not 3D.
>
> Lighting/mood: one coherent warm key light from upper left, with cool blue-violet ambient shadows; secretive, eccentric, inviting rather than horror.
>
> Color palette: muted navy and slate stone, warm walnut, restrained copper/brass and small amber accents; interior saturation no higher than Image 2.
>
> Constraints: background environment only. Keep important readable features outside the outer 24-pixel safe band. Door should be shown as an open doorway/recess suitable for later overlay of separate closed/open door-state sprites. Preserve strong readable silhouettes at gameplay scale.
>
> Avoid: any person, character, NPC, crowbar, loose paper, text, letters, numerals, logos, watermark, UI, border, vignette, baked-in contact-shadow blobs for future sprites, tilted camera, high overhead view, fisheye, mixed perspectives, giant furniture, excessive clutter on the walkable floor, pixel art, photorealism.

## Matching asset brief after background approval

The candidate deliberately leaves the stateful sprites out of the background. Once the composition is approved:

- Generate the central closed double-door and fully open state as one matched design set, front-facing within the candidate's central masonry reveal, warm upper-left light, walnut/red-brown paint, brass hardware, and transparent padded canvases. The open state must preserve the same hinge line and must not reuse the closed state's authored width.
- Generate the crowbar world sprite as a dark forged-iron silhouette, angled for visibility on the candidate's right-middle floor, with a soft upper-left-lit contact shadow. Create a separate square inventory crop from the same design, readable at 48 px with a 6% margin.
- Record the final shared references, prompt/operation, human paint-over, provenance, and licence review for every accepted output.
- Rebuild the Den grid, hotspots, door/object placement, room scale, and dimensions only after those visuals are fixed.
