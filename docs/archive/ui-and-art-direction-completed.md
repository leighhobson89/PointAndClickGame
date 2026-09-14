# UI and art direction — completed UI and art

The outstanding art direction remains in [ui-and-art-direction.md](../ui-and-art-direction.md). This file records the Section 7 interface direction and the Section 8 art-direction decisions implemented on 2026-09-14.

## Art direction decided

The approved direction is **storybook caricature adventure**, chosen over retro pixel art. The existing assets are illustrated and painted rather than pixel art, and the hand-drawn irregularity is the game's identity; standardising perspective, character scale, outline weight, lighting, material rendering, and export achieves consistency without sanding that off. The Game Design Document's pixel-art wording is superseded.

The production standard is [art-bible.md](../art-bible.md), which is a live reference rather than a to-do list and so does not live in this archive.

## Visual audit — resolved findings

The audit found several visual languages running at once. Two of its findings are now closed:

- **Character scale was inconsistent and was blamed on tuning.** It was a design fault. Measured across the game the player ranged from 9.8 px to 420 px, with within-room near-to-far ratios from 1.77x to 10x. This is now authored per room in stage pixels, anchored to each room's own painted depth range, and capped at a 4x ratio by an assertion over the shipped content.
- **Source sizes, crops, edge treatment, contrast, and lighting "vary widely" was an impression rather than a measurement.** It is now measured per asset in [asset-report.md](../asset-report.md) and per animation frame in [player-frame-geometry.md](../player-frame-geometry.md), and the specific defects are recorded as BUG-039 through BUG-042 rather than as a general complaint.

The remaining audit findings — differing treatments between rooms, River Crossing being more polished than its neighbours, and the player art being cruder than some NPCs — are unresolved and stay in the live document.

## Modern UI concept

The classic verb-table soul is now a refined adventure console:

- A flexible stage centres the fixed 832×448 world and letterboxes intentionally.
- A compact action sentence sits immediately below the stage with clear target emphasis.
- The verb panel is a responsive keyboard-navigable grid and can be hidden for contextual play.
- Inventory uses larger framed cards; arrow, keyboard, and touch scrolling share the same model.
- Dialogue uses a readable four-row panel with focusable choices, persistent exit choice, arrow pagination, and text-speed controls.
- Menu and settings use the same visual language rather than generic Bootstrap defaults.
- Loading, saving, error, and autosave feedback are visible but unobtrusive.

## Design tokens

The component system defines colour roles, display/UI typography, spacing, radii, borders, shadows, motion durations, reduced-motion behaviour, focus rings, and high-contrast mappings in `styles.css`. Ten selectable palettes—Mountain, River, Arctic, Midnight, Forest, Sunset, Desert, Royal, Rose, and Storybook—are derived from those roles; Mountain is the default.

Manual layout tuning is centralised in the root variables `--ui-height-reserve`, `--ui-max-width`, `--ui-offset-x`, `--ui-offset-y`, `--ui-shell-padding`, and `--ui-shell-gap`. This keeps device-specific adjustments out of component rules.

## Accessibility delivered

- Every hotspot, verb, inventory item, dialogue option, and menu action has a semantic role, accessible name, focus state, and keyboard path.
- Dialogue and important state changes are announced without reading every animation frame.
- Text remains usable at 200% sizing and with long strings in all five locales.
- Availability is not encoded by colour alone.
- Subtitle preferences, reduced motion, configurable text speed, high contrast, and optional subtle/strong hotspot assistance are persistent settings.
- Targets are at least 44×44 pixels; touch never depends on hover.
- Canvas has an accessible semantic mirror and a concise localised scene description.

## Acceptance evidence

`rendering-layout/responsive-interface.spec.cjs` covers 1280×720, 1440×900, 1920×1080, representative tablet/touch, 200% text sizing, all five locales, long localisation, high contrast, and reduced motion. `accessibility/keyboard-and-semantics.spec.cjs` covers keyboard-only actions, focus handling, live semantic controls, and all 18 rooms. The complete browser suite passed 69/69 in 168.959 seconds.

Pixel screenshot baselines remain intentionally approval-gated until the room art is standardised under Section 8. Structural visual assertions protect the approved UI composition without freezing inconsistent source art.
