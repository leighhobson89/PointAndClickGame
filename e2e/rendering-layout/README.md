# Rendering and layout scenarios

Cover canvas sizing, resize behavior, foreground occlusion, depth ordering, background offsets, custom cursor, text wrapping, inventory layout, and supported viewport sizes.

Section 4 controls available here: `__GAME_TEST__.setViewportPreset('1280x720' | '1440x900' | '1920x1080' | '834x1112')`, `setAccessibilityOption('highContrast' | 'reducedMotion' | 'textScale', value)`, `setInputMode('pointer' | 'keyboard' | 'touch')`, and `setOverlays({ walkGrid, costs, blocked, exits, hotspots, footprints, anchors, path, playerCell, overlaps, unreachable })`. Section 7 consumes the presentation attributes, so the controls change the real UI instead of serving as assertion markers only.

Scenario to use: `system.asset-failure` declares one background that fails predictably, for loading and error presentation cases.

`responsive-interface.spec.cjs` now covers the 832×448 logical stage, aspect preservation, horizontal overflow, 44-pixel targets, 1280×720, 1440×900, 1920×1080, 834×1112 touch, 200% text sizing, five locales, long strings, high contrast, reduced motion, and a real touch activation.

Pixel scene baselines remain deliberately deferred until Section 8 approves and standardises the room art. Structural visual assertions protect the settled Section 7 component design without freezing known art inconsistencies.
