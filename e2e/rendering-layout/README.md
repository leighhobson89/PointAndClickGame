# Rendering and layout scenarios

Cover canvas sizing, resize behavior, foreground occlusion, depth ordering, background offsets, custom cursor, text wrapping, inventory layout, and supported viewport sizes.

Section 4 controls available here: `__GAME_TEST__.setViewportPreset('1280x720' | '1440x900' | '1920x1080' | '834x1112')`, `setAccessibilityOption('highContrast' | 'reducedMotion' | 'textScale', value)`, `setInputMode('pointer' | 'keyboard' | 'touch')`, and `setOverlays({ walkGrid, costs, blocked, exits, hotspots, footprints, anchors, path, playerCell, overlaps, unreachable })`. Each writes a `data-debug-*` attribute on the document element so a test can assert the applied state by attribute rather than by measuring pixels.

Scenario to use: `system.asset-failure` declares one background that fails predictably, for loading and error presentation cases.

Approved visual baselines are deliberately deferred until Section 7 has settled the stage and component design.
