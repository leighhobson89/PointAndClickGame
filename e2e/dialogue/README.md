# Dialogue scenarios

Cover interactive choices, non-interactive cutscenes, speaker order, text advancement, exit options, option removal, scrolling, quest-phase changes, and early exit markers.

`library-tutorial.spec.cjs` is the first migrated vertical slice. It selects each of the five languages, starts through the normal UI, chooses Talk To by `data-verb-id`, clicks the librarian on the canvas, follows stable `data-choice-id` branches, and verifies the canonical riddle fact and world consequence without matching translated action text.

`scenario-dialogue.spec.cjs` adds the Section 4 controls. It inspects nodes, choices, conditions, and the stable consequence ID for the librarian graph; reaches the riddle consequence from `chapter1.library-riddle` through real Talk To and choice clicks; and proves the text-speed and skip controls are deterministic by restoring real timers, setting slow text, and ending the line early.

Scenarios used: `chapter1.library-riddle`, `system.long-localisation`.

Still to cover: the non-library conversations, which remain on the legacy dialogue representation tracked by BUG-011.
