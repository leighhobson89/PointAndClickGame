# Accessibility scenarios

Cover keyboard reachability, accessible names, focus visibility, dialogs, reduced motion, contrast, screen-reader status announcements, and non-pointer alternatives for canvas interactions.

Implemented Section 7 coverage:

- Keyboard verb selection, semantic canvas-hotspot activation, and Escape/back.
- Settings focus trap, preference persistence, and focus restoration to the opener.
- Named semantic controls for every interactive target in all 18 rooms.

Reduced motion, contrast, zoom/text expansion, and physical touch activation are paired with the layout matrix in `rendering-layout/responsive-interface.spec.cjs`.
