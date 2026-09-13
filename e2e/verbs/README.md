# Verb and command scenarios

Cover Look At, Pick Up, Use, Open, Close, Push, Pull, Talk To, and Give across objects, NPCs, exits, invalid targets, and second-target command construction.

Section 4 controls available here: `__GAME_TEST__.selectVerb(verbId)`, `selectTarget(targetId)`, `cancelCommand()`, and `resetEntity(entityId)` drive structured `{ verbId, primaryTargetId, secondaryTargetId }` intents without parsing the displayed action sentence, and restore a consumed or moved object to its scenario state between cases.

The real two-target flow is already proven end to end by `puzzles/scenario-milestones.spec.cjs`, which chooses Use, clicks the carried key, and clicks the door. The remaining nine-verb matrix, invalid-target feedback, and cancel behaviour belong here.

Scenarios to use: `chapter1.town-open` for world targets, `system.inventory-full` for inventory targets.
