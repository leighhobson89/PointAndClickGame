# Dialogue scenarios

Cover interactive choices, non-interactive cutscenes, speaker order, text advancement, exit options, option removal, scrolling, quest-phase changes, and early exit markers.

`library-tutorial.spec.cjs` is the first migrated vertical slice. It selects each of the five languages, starts through the normal UI, chooses Talk To by `data-verb-id`, clicks the librarian on the canvas, follows stable `data-choice-id` branches, and verifies the canonical riddle fact and world consequence without matching translated action text.
