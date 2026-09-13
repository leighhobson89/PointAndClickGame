# Localisation scenarios

Cover all five language selectors, menu and verb labels, room/object/NPC names, dialogue content, missing-key fallback, interpolation, and non-ASCII rendering.

Scenario to use: `system.long-localisation` starts in German with slow text, which is the worst case for label length and dialogue wrapping. `__GAME_TEST__.setLocale(...)` switches among the contract locales and refuses anything else, and `__GAME_TEST__.simulateMissingKey('section.key')` marks the document so a fallback case can be asserted without editing shipped localisation.

Five-locale coverage currently lives in `dialogue/library-tutorial.spec.cjs`. Layout under text expansion belongs with the Section 7 presentation work.
