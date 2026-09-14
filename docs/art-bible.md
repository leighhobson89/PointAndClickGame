# Art bible

The production standard for every visual asset in the game. It says what to draw against, what to export, and what will be rejected.

Approved direction: **storybook caricature adventure**. Hand-drawn irregularity is the point and is preserved. Perspective, character scale, outline weight, lighting, material rendering, and export are standardised around it. The Game Design Document's "pixel art" wording is superseded; the shipped assets are illustrated and painted, and the game is described that way from here on.

Rules below are marked **[enforced]** where a command fails on a breach, **[measured]** where a report states the number but nothing fails yet, and **[review]** where a human decides. Enforced rules are checked by `npm run check:assets` and by `npm run test:unit`; measured and review rules are checked against the reports and sheets from `npm run report:assets` and `npm run report:art`.

## 1. Stage, aspect, and safe area

The world renders into one logical stage of **832 x 448 pixels**, aspect **1.857**. CSS scales and letterboxes that bitmap; the renderer never works in any other coordinate space.

- A background or foreground ships at exactly 832 x 448. **[enforced]**
- A source painted at a larger size is exported down to 832 x 448; it is not shipped at source resolution and rescaled by the browser. **[enforced]**
- A source whose aspect is not 1.857 is letterboxed or extended to fit, never squeezed. Non-uniform scaling distorts every object in the scene and is the single fastest way to make character scale look wrong. **[enforced]**
- Keep the outer 24 pixels free of anything the player must read. The stage frame and vignette overlay that band.
- The walkable floor should occupy the lower half of the frame. A floor painted higher pushes the character into the scenery.

## 2. Camera, perspective, and the walk plane

Every room is drawn from **eye height, roughly 1.6 m above the floor, with no tilt**, so the horizon sits near the vertical middle of the frame and floor lines converge towards it.

- One horizon per room. Do not mix a high-camera floor with low-camera furniture.
- The camera distance must put an adult character at the front of the room at **about a third of the stage height**. A room painted from much closer forces every character in it to be drawn enormous, and then that room no longer matches its neighbours. **[review]**
- The walk plane is the painted floor. Anything the character can stand on carries a depth value; anything they cannot is unpainted.

### Depth values

Each walkable grid cell carries a depth byte from `w100` to `w255`. The byte is **position, not size**: it says how far into the scene the cell is, and the room's scale profile turns that into a height.

- Paint depth as bands that run across the floor, increasing towards the viewer. The fill that covers gaps works along rows, so a band that runs the width of the floor survives an object being placed on it.
- Use the room's own range; there is no need to reach `w100` or `w255`. The profile is anchored to whatever range the room paints.
- Never paint a lower depth in front of a higher one. That inverts the perspective and the character shrinks as it walks towards the viewer.

## 3. Character scale

A room declares its character scale in `screenNavigation.json` as two numbers in stage pixels:

| Field | Meaning |
| --- | --- |
| `playerHeightNear` | the player's drawn height at the room's nearest walkable point |
| `playerHeightFar` | the player's drawn height at its furthest walkable point |
| `entityScaleAtNear` | multiplier applied to an object's or NPC's authored cell size at the near plane |

Depth interpolates linearly between the two heights. The curve is normalised to 1 at the near plane and drives the player, the NPCs, and the objects, so one room has one perspective rather than several.

- **Near height**: exteriors 125–175 px, interiors 145–200 px. **[review]**
- **Near-to-far ratio at most 4:1.** **[enforced]** — asserted for every shipped room by `test/unit/depth-scale.test.mjs`. A ratio beyond this is a sign that the room is painted too deep for a single walk plane, or that the depth field is painted wrong.
- An NPC's authored `dimensions.originalWidth`/`originalHeight` are its size **in grid cells at the room's near plane**. A person-sized NPC must measure **between 0.8 and 1.25 of the player's height at the same depth**. **[measured]** — the table is in [asset-report.md](asset-report.md). Animals are expected to sit outside that band; humans are not. Three currently do: see BUG-044.
- `entityScaleAtNear` exists only to preserve the sizes objects were placed at before the scale profile was introduced. It should converge to 1 as object cell dimensions are re-authored; a room still holding a value far from 1 has objects whose declared size does not mean what it says.

### Current calibration

| Room | Far → near (px) | Ratio | Room | Far → near (px) | Ratio |
| --- | --- | ---: | --- | --- | ---: |
| alley | 55 → 130 | 2.36 | marketStreet | 45 → 145 | 3.22 |
| barn | 85 → 150 | 1.76 | researchRoom | 85 → 175 | 2.06 |
| carpenter | 95 → 180 | 1.89 | riverCrossing | 78 → 150 | 1.92 |
| cowPath | 50 → 125 | 2.50 | roadIntoTown | 48 → 170 | 3.54 |
| deadTree | 100 → 165 | 1.65 | sewer | 60 → 175 | 2.92 |
| den | 215 → 300 | 1.40 | stables | 78 → 145 | 1.86 |
| house | 62 → 150 | 2.42 | stinkingDump | 62 → 140 | 2.26 |
| kitchen | 100 → 185 | 1.85 | largePileOfPoo | 62 → 135 | 2.18 |
| libraryFoyer | 85 → 195 | 2.29 | map | 140 (flat) | 1.00 |

**The Den is the outlier and is not approved.** Its 215–300 px band is correct for the furniture as painted — the desks in it are drawn at roughly twice the scale of comparable furniture elsewhere — but it means the character fills two thirds of the frame. The room needs repainting from a normal camera height, after which its heights come down to the interior band. Until then the scale is honest about the art rather than hiding a mismatch.

## 4. Line, colour, light, and material

- **Outline**: a visible hand-drawn contour on characters and interactable props. Weight scales with the subject's drawn size, about 1 px per 60 px of drawn height. Background scenery may drop to a softer contour; it must not become outline-free.
- **Facial detail**: readable at the room's far height. If an expression disappears at `playerHeightFar`, it is drawn too fine.
- **Palette**: each room picks a dominant hue family and holds it. Interactables are allowed to sit outside it — that is how the player finds them.
- **Light**: one key direction per room, stated in the scene brief and consistent across every element in it, including characters passing through.
- **Shadow**: every character and free-standing prop gets a soft contact shadow on the walk plane. It is what plants them on the floor; without it, correct scaling still reads as floating.
- **Saturation**: interiors sit lower than exteriors. Do not fix a flat interior by raising saturation past its exterior neighbours.

## 5. Occlusion and alpha

- A foreground layer occludes the character and ships at 832 x 448 with a real alpha channel. **[enforced]**
- Alpha edges are anti-aliased, never keyed off a matte colour. A halo on a cut-out is a rejection.
- A prop that the character can pass behind belongs in the foreground layer, not the background.

## 6. Animation

Frames are named `<pose><index>_<direction>.png`, directions `left`, `right`, `up`, `down`, index from 1.

- Frames for one direction share one canvas size. **[enforced]**
- The foot baseline sits at the same place in every frame of a direction, within 2% of canvas height. **[measured]** — reported per frame in [player-frame-geometry.md](player-frame-geometry.md), not yet failing a command.
- Drawn character height varies by at most 5% across a walk cycle; more than that reads as growing rather than striding. **[measured]**
- The character is horizontally centred on its own footfall, not on the canvas.
- One full there-and-back walk cycle takes the same wall-clock time in every direction. The engine derives each direction's frame hold from a single cycle length, so a direction drawn from fewer frames holds each one longer rather than cycling faster.

### Current state of the player animation — not yet compliant

| Direction | Distinct frames | Canvas | Finish |
| --- | ---: | --- | --- |
| left / right | 9 | 200 x 375 | flat, line-based |
| up / down | 2 | 200 x 375 | softer, anti-aliased, 4–6x the byte weight |
| idle left / right | 1 | **800 x 1500** | painterly, visibly a different character rendering |
| idle up / down | 1 | 200 x 375 | matches the walk frames |

Three faults follow from this, all recorded in [bugs.md](bugs.md):

1. The side idle poses are drawn in a different style and at 4x the resolution of everything around them, so the character's appearance changes every time they stop walking.
2. The front and back walks have two distinct frames against the side walk's nine, because `move2_down` and `move2_up` are byte-identical to their idle poses.
3. The front and back frames are drawn with a different technique from the side frames.

Frame registration is **not** a fault: measured baseline spread is 0.8–1.9% and height spread 0.8–3.7%, inside the rules above.

## 7. Inventory icons

- Square, 128 x 128 maximum, transparent background. **[enforced]**
- The subject fills the frame with a 6% margin, silhouette readable at 48 px.
- An inventory icon and a world sprite are **different crops of the same subject** and are separate assets. Where they are currently the same file, that is a defect rather than intentional reuse.

## 8. Budgets

Per-file ceilings, enforced by `npm run check:assets`.

| Role | Max dimensions | Max bytes |
| --- | --- | ---: |
| Room background | 832 x 448 exactly | 400 KB |
| Room foreground | 832 x 448 exactly | 250 KB |
| Player frame | 220 x 420 | 60 KB |
| NPC sprite | 400 x 700 | 120 KB |
| Object world sprite | 512 x 512 | 80 KB |
| Inventory icon | 128 x 128 | 24 KB |
| Cursor | 64 x 64 | 8 KB |
| UI layout frame | — | 64 KB |

Current standing against these budgets is in [asset-report.md](asset-report.md). At the time of writing 83 of 167 shipped images breach a budget and the shipped set totals 38.1 MB, against a target of roughly 6 MB.

PNG is the wrong container for painted scenery. A full-stage painted background encodes to well under the 400 KB budget as WebP at quality 85, and to several megabytes as PNG. PNG stays correct for flat, hard-edged sprites and icons.

## 9. Reuse and aliasing

An asset used in two places is **one file with one semantic ID**, referenced twice. Shipping a byte-identical copy under a second name is a defect: it doubles transfer and decode cost and lets the two copies drift.

`npm run report:assets` lists exact-duplicate groups and orphaned assets. A duplicate group is resolved by picking one ID and pointing the other references at it, not by deleting a file something still names.

## 10. AI-assisted work

Generation and image editing are allowed for composition studies, texture repair, cleanup masks, resolution variants, and style exploration. They do not replace authored work.

Every generated or machine-edited asset must record:

- the named purpose it was made for;
- the reference set it was made against, including the character model sheet where a character appears;
- whether a human paint-over happened, and who did it;
- the tool and the prompt or operation;
- a licence review of the tool's output terms.

The manifest carries `provenance` and `licence` fields for this. They are `null` until a human fills them in, so an unrecorded asset shows up as unrecorded rather than being assumed clear. **No asset ships with an unresolved licence question.**

A generated asset that does not hold the character model, the room's light direction, and the outline rules is rejected regardless of how good it looks alone.

### The hand-drawn rooms

The Library Foyer and Market Street backgrounds are Leigh's hand-drawn originals. They are in scope for restyling and for corrected sizing and aspect like every other room, but the result must stay recognisably the same place: the arrangement and identity of the archways, doorways, buildings, and stalls carry over. Regenerating either scene from a prompt without working from the original composition is not an acceptable change.

## 11. Acceptance

A room is accepted when, at gameplay scale and not at source resolution:

1. Character scale reads correctly against the architecture at the near, middle, and far walk positions.
2. One horizon, one light direction, one palette family.
3. Every character and free-standing prop has a contact shadow.
4. Outline weight and facial detail match the standard at the room's own scale.
5. Foreground occlusion works without halos.
6. Every asset in the room is inside budget and carries provenance and licence.
7. The room is reviewed beside its neighbours, not alone.

`npm run report:art` produces the sheets this review is done against: a per-room scale calibration sheet, an all-room montage, and a contact sheet per role.
