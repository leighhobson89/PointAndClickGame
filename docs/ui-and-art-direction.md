# UI and art direction

## Visual audit

The project already has personality: exaggerated characters, odd props, rich environments, and a willingness to be visually funny. The problem is consistency, not lack of invention.

Representative inspection found several visual languages at once:

- Library, Market Street, and Alley use differing hand-drawn/painted treatments and perspective/detail levels.
- River Crossing is considerably more polished and painterly than many neighbouring scenes.
- Player art is relatively rudimentary and line-based while some NPCs are detailed caricatures.
- Source sizes, crops, edge treatment, contrast, and lighting vary widely.
- The GDD calls the game pixel art, but the current assets are predominantly illustrated/painted. The team should intentionally choose one description and production style.

Recommendation: embrace **storybook caricature adventure** rather than retro pixel art. Preserve hand-drawn irregularity, but standardise perspective, scale, material rendering, outlines, lighting, saturation, and export quality.

## Art bible to create

- Canonical scene aspect ratio and safe gameplay area.
- Camera height, horizon/perspective rules, and walk-plane conventions.
- Player and NPC world-height chart for near/mid/far depth.
- Outline weight, facial detail, shadow softness, palette, and lighting rules.
- Foreground occlusion conventions and alpha-edge requirements.
- Animation pose list, frame naming, anchor point, crop, and direction policy.
- Inventory icon framing/background and silhouette-readability rules.
- Maximum source/output dimensions and compressed byte budgets.
- AI-assisted asset policy: provenance, reference consistency, human paint-over, licensing review, and acceptance criteria.

## Asset improvement workflow

1. Inventory all assets into a manifest with semantic ID, role, source, dimensions, crop/anchor, room scale, hash, and licence/provenance.
2. Generate contact sheets grouped by backgrounds, NPCs, player animation, objects, inventory, and foregrounds.
3. Detect exact duplicates and visually near-duplicate assets; alias intentional reuse rather than shipping copies.
4. Select one gold-standard room and player/NPC interaction as the art target.
5. Normalise assets room by room; do not mix partially restyled elements in the same release scene.
6. Export through a reproducible pipeline and compare screenshots at gameplay scale, not only full-resolution source scale.
7. Add visual baselines only after the scene is approved, so tests protect intentional art rather than accidental inconsistency.

Image generation or recognition can help with composition studies, texture repair, cleanup masks, resolution variants, and style exploration. It should not silently replace authored work. Every generated/edited asset needs a named purpose, reference set, provenance record, consistent character model, and in-game visual review.

## Modern UI concept

Keep the classic verb-table soul, but treat it as a refined adventure console:

- A flexible stage centres the world and letterboxes intentionally.
- A compact action sentence sits immediately below the stage with clear target emphasis.
- The verb panel becomes a responsive grid on desktop, contextual radial/toolbar option on touch, and fully keyboard navigable.
- Inventory uses larger framed cards with quantities/state badges only where meaningful; wheel/arrow/keyboard scrolling share one model.
- Dialogue appears in a readable lower-third or character-aware panel, with speaker name, portrait option, focusable choices, and text-speed controls.
- Menu/settings use the same visual language rather than generic Bootstrap defaults.
- Loading, saving, error, and autosave feedback are visible but unobtrusive.

## Design tokens

Create tokens before component restyling:

- Colour: background, surface, raised surface, text, muted text, accent, focus, success, warning, error.
- Type: display, dialogue, UI, caption; minimum sizes and line lengths.
- Spacing and radius scales.
- Borders/shadows that match the illustrated world.
- Motion durations/easing and a zero/reduced-motion alternative.
- Focus ring and high-contrast mappings.

## Accessibility requirements

- Every hotspot, verb, inventory item, dialogue option, and menu action has a semantic role, accessible name, focus state, and keyboard path.
- Dialogue and important state changes are announced appropriately without reading every animation frame.
- Text remains usable at 200% zoom and with long German/French strings.
- Do not encode availability by colour alone.
- Provide subtitle/audio controls, reduced motion, configurable text speed, and optional hotspot assistance.
- Pointer targets meet a documented minimum; touch never depends on hover.
- Canvas has an accessible semantic mirror and a concise scene description.

## UI acceptance matrix

Test 1280×720, 1440×900, 1920×1080, a representative tablet/touch size, 200% browser zoom, all five locales, high contrast, reduced motion, keyboard-only, and screen-reader-oriented navigation. Approve both clean screenshots and actual task completion.
