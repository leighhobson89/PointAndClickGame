# UI and art direction — completed UI

The outstanding art direction remains in [ui-and-art-direction.md](../ui-and-art-direction.md). This file records the Section 7 interface direction implemented on 2026-09-14.

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
