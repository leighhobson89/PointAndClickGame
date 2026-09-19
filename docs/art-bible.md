# Art bible

The production standard for every visual asset in the game. It says what to draw against, what to export, and what will be rejected.

Approved direction: **storybook caricature adventure**. Hand-drawn irregularity is the point and is preserved. Perspective, character scale, outline weight, lighting, material rendering, and export are standardised around it. The Game Design Document's "pixel art" wording is superseded; the shipped assets are illustrated and painted, and the game is described that way from here on.

## 0. The gold standard

Approved by Leigh. Two shipped rooms are the reference every other room is normalised towards. They are not aspirational targets drawn for the purpose; they are existing art that already satisfies the rules below, so "match the standard" can be checked by putting two rooms side by side.

| Role | Room | Why it holds |
| --- | --- | --- |
| Exterior | **River Crossing** | The deepest foreground/middle/background separation in the set, the best foliage and rock rendering, a single clear light direction, and native 832 x 448. |
| Interior | **Kitchen** | One unambiguous key light from the window, eye-height camera, floor in the lower half, and furniture at believable human scale. Native 832 x 448. |

Neither needs redrawing. River Crossing and Kitchen change only by being re-exported to WebP for weight.

A room is "normalised" when it can be shown beside its role's standard and read as the same game — the same paint weight, the same outline treatment, the same saturation discipline, the same camera. Restyling is done **whole rooms at a time**; a scene containing both restyled and un-restyled elements is not shipped.

Rules below are marked **[enforced]** where a command fails on a breach, **[measured]** where a report states the number but nothing fails yet, and **[review]** where a human decides. Enforced rules are checked by `npm run check:assets` and by `npm run test:unit`; measured and review rules are checked against the reports and sheets from `npm run report:assets` and `npm run report:art`.

## 1. Stage, aspect, and safe area

The world renders into one logical stage of **832 x 448 pixels**, aspect **1.857**. CSS scales and letterboxes that bitmap; the renderer never works in any other coordinate space.

- A background or foreground ships at exactly 832 x 448. **[enforced]**
- A source painted at a larger size is exported down to 832 x 448; it is not shipped at source resolution and rescaled by the browser. **[enforced]**
- A source whose aspect is not 1.857 is letterboxed or extended to fit, never squeezed. Non-uniform scaling distorts every object in the scene and is the single fastest way to make character scale look wrong. **[enforced]**
- A room that is off the stage aspect is **re-composed at 832 x 448 as part of its restyle**, not cropped and not stretched. Approved by Leigh. Re-composing costs nothing extra on a room that is being redrawn anyway, and it is the only correction that neither discards painted content nor invents edge art in a style that is itself being replaced. A room under 2% off aspect — currently Dead Tree and Research Room — is close enough that a straight uniform re-export to 832 x 448 is the whole fix.
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
- An NPC's authored `dimensions.originalWidth`/`originalHeight` are its size **in grid cells at the room's near plane**. A person-sized NPC must measure **between 0.8 and 1.25 of the player's height at the same depth**. **[measured]** — the table is in [asset-report.md](asset-report.md). Animals are expected to sit outside the band and are exempt. Three humans currently sit outside it; the correction is computed and held in [bugs.md](bugs.md) against BUG-044, to be applied when the characters are repainted so scale is judged once against final art.
- Inside the band, an NPC's exact height is an **art judgement, not a target of 1.0**. Build is characterisation: the carpenter reads as an adult man at 1.08, the librarian as an elderly woman at 0.92, the farmer as a stocky old man at 0.81. Flattening every human to 1.0 would remove that.
- **The drawn box must keep the sprite's own aspect.** An entity is drawn into `originalWidth` x `originalHeight` cells, so a box whose aspect differs from the source image's aspect stretches the subject non-uniformly — the same fault as a mis-aspected background, applied to a character. Authored width therefore follows from authored height and the sprite: `width = height x cellHeight x spriteAspect / cellWidth`. **[measured]** — 48 of the 64 placed sprites are 5% or more off and 35 are 15% or more off, recorded as BUG-044 for the NPCs and BUG-045 for the objects. The tolerance is 5%, and the assertion that enforces it is written and verified but held until the art it measures is final.
- **One NPC, one canvas.** Every sprite an NPC can be drawn with — each facing, and each state such as the donkey roped and unroped — shares a single canvas size, padded with transparency where a pose is narrower. The engine holds one `dimensions` record per NPC, so sprites on disagreeing canvases cannot all be undistorted at once. This is the same rule the player's frames already follow.
- Re-proportioning an existing NPC **holds the foot cell and the horizontal centre** and moves `gridPosition` to suit the new size. Changing size without moving the position leaves the character floating or sunk, because `gridPosition` is its top-left corner. `gridPosition` must stay a whole cell, so the fractional part lives in the dimensions.
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
- The foot baseline sits at the same place in every frame of a direction, within 2% of canvas height. **[enforced]** — `scripts/player-gait-audit.mjs` measures the wired runtime pixels; [player-frame-geometry.md](player-frame-geometry.md) and `frame-geometry.csv` retain the full evidence.
- Drawn character height varies by at most 5% across a walk cycle; more than that reads as growing rather than striding. **[enforced]** by the same pixel audit.
- A frame's scale is set by the character's height alone. Fitting a frame to a width ceiling as well makes wide poses shrink, and because a side-on stride is about twice as wide as a front-on one, that lands almost entirely on the side views and reads as the character pumping in size as it walks. The canvas is instead made wide enough to hold the widest pose at full height. **[enforced]** — `scripts/process-player-redesign.ps1` refuses to write a frame that overflows the canvas.
- Frames are registered horizontally on the character's head-and-torso mass, not on the bounding box. A walk cycle's bounding box is set by whichever limb is thrown furthest out, so centring it slides the body around inside the frame every step.
- A walk cycle is **a loop, not a palindrome**: the last frame's heel strike is the foot the first frame plants. It is played straight through and round again. Playing it out and back runs the leg motion in reverse for half of every cycle, which is nearly invisible front-on and reads as a moonwalk side-on.
- The gait is paced by **distance covered, not by time elapsed**. The player's speed is scaled by depth, so a fixed-duration cycle makes the feet skate near the camera and mark time far from it. The engine advances the cycle by how far the character actually moved, against a stride that scales with its own drawn height, so one step covers the same share of the body at every depth.

### The approved player finish

The character ships in the **painted finish**, now used by the wired model, idles and movement frames. Leigh approved the finish and revised motion on 2026-09-19 and accepted the generated package without a further human paint-over.

The reasoning is that the rooms the game is being normalised towards are painted, and the NPCs that already match them — the carpenter, the farmer, the cow, the donkey, the seedy guy — are painted too. A flat, line-drawn player standing in a painted room beside a painted NPC is the largest single style break left in the game, and it is on the most-seen asset in it. Adopting the flat walk finish instead would narrow that break to one asset rather than remove it.

This **reverses the earlier direction**, which was to redraw the two side idles down into the flat walk finish.

### Current state of the player animation

The runtime set is the Section 2 candidate in `resources/redesign/section-02-player/frames/`, authored against a painted model sheet that settles the character's build — height in heads, shoulder and hip width, limb length, hair mass, boot bulk. That sheet is the reference every generated or machine-edited character asset must hold (see section 10). The legacy set in `resources/player/` is retained only as a rollback source and is not wired.

| Direction | Distinct frames | Canvas | Subject height | Finish |
| --- | ---: | --- | ---: | --- |
| left / right | 9 | 280 x 375 | 365 px | painted |
| up / down | 9 | 280 x 375 | 365 px | painted |
| idles, all four | 1 each | 280 x 375 | 365 px | painted |

Registration is compliant: subject height is 365 px and the foot baseline y=371 in all 40 frames, so height spread and baseline spread are both 0. Front/back source poses are reordered and mirrored into readable alternating steps. The lateral stance closes monotonically through `210, 173, 168, 144, 88` px into frame 5's true single-support crossover, then opens through `133, 182, 194, 215` px into the opposite contact; right mirrors left exactly in timing and silhouette. All 40 PNGs are below 60 KB, with a 44,984-byte maximum. Provenance/licence is recorded.

The set is accepted shipping art. Further changes are ordinary art revisions, not an outstanding acceptance gate.

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
| Player frame | 280 x 375 | 60 KB |
| NPC sprite | 400 x 700 | 120 KB |
| Object world sprite | 512 x 512 | 80 KB |
| Inventory icon | 128 x 128 | 24 KB |
| Cursor | 64 x 64 | 8 KB |
| UI layout frame | — | 64 KB |

Current standing against these budgets is in [asset-report.md](asset-report.md). At the time of writing 81 of 179 shipped images breach a budget and the shipped set totals 38.8 MB, against a target of roughly 6 MB. None of the breaches is a player frame.

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

The **Library Foyer**, **Market Street**, and **Back Alley** backgrounds began as Leigh's hand-drawn originals. The Library Foyer now has an accepted painted room package; Market Street and Back Alley remain to be restyled.

They are in scope for restyling and for corrected sizing and aspect like every other room, but the result must stay recognisably the same place: **the layout carries over and only the style changes.** The arrangement and identity of the archways, doorways, buildings, stalls, and passages are kept; their position in frame, their relationship to each other, and the route the player walks between them are preserved. Someone who knows the room must recognise it immediately after the restyle.

Regenerating any of the three from a prompt without working from the original composition is not an acceptable change, however good the result looks alone.

## 11. Acceptance

A room is accepted when, at gameplay scale and not at source resolution:

1. Character scale reads correctly against the architecture at the near, middle, and far walk positions.
2. Every NPC in the room agrees with the player: a human inside 0.8–1.25, and nobody drawn into a box that disagrees with their sprite's aspect. Both are re-derived and applied when the room's characters are repainted, not before.
3. The background is exactly 832 x 448 and nothing in the room is non-uniformly scaled.
4. One horizon, one light direction, one palette family.
5. Every character and free-standing prop has a contact shadow.
6. Outline weight and facial detail match the standard at the room's own scale.
7. Foreground occlusion works without halos.
8. A new walkable-area overlay and room-local 80 x 60 grid fragment have been generated from the accepted background and reviewed.
9. Every exit, object state, NPC, hidden-in-plain-sight hotspot, and foreground occluder is fitted to its exact painted location in both normal and resized views. A state-specific cut-out or eye-tuned offset is authored geometry and must not be replaced by a generic rectangle.
8. Every asset in the room is inside budget and carries provenance and licence.
9. The room is reviewed **beside its role's gold standard** — River Crossing for an exterior, Kitchen for an interior — and beside its own neighbours, never alone.

`npm run report:art` produces the sheets this review is done against: a per-room scale calibration sheet, an all-room montage, and a contact sheet per role.
