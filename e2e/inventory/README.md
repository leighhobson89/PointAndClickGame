# Inventory scenarios

Cover pickup, quantities, stacking, selection, two-item interactions, paging in both directions, consumption, empty slots, and inventory persistence.

Scenario to use: `system.inventory-full` carries twelve items, which is ten visible slots plus overflow, so scrolling and layout cases start from a reviewed fixture rather than a hand-built inventory. `__GAME_TEST__.applyInventoryPreset(...)` offers `empty`, `libraryTutorial`, `riggingKit`, and `fullTwelve`.

Currently exercised indirectly by `game-state/debug-scenarios.spec.cjs`, which asserts the twelve carried items, preset switching, rejection of unknown object IDs, and structured verb/target selection. Player-facing paging, stacking, and consumption journeys remain to be written here.
