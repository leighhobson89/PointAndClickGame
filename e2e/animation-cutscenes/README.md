# Animation and cutscene scenarios

`reduced-transition.spec.cjs` verifies that the opening background transition completes in reduced-motion mode before the cutscene proceeds.

`room-transition-foreground.spec.cjs` is the BUG-033 regression. It samples every animation frame of a real room change and asserts that the background on screen, the room the game believes it is in, and the has-foreground-items flag always agree. Before the fix, the previous room's foreground items were drawn over the new room's background for the whole fade.

That test is a useful warning about this area: it must run with real motion and real timers. The shared `openDebugGame` helper starts sessions under reduced motion with compressed timers so startup stays fast, and under reduced motion the fade resolves immediately — the defect's window then contains no frames and the test passes against broken code. Call `restoreNativeTimers(page)` and `page.emulateMedia({ reducedMotion: 'no-preference' })` before the behaviour under test whenever what you are testing only exists while an animation is actually animating.

Cover intro playback, transition completion, movable NPC/object paths, direction sprites, animation flags, forced player movement, and skipping/advancing safely.
