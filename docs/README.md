# Point-and-Click Game living documentation

Last audited: 2026-09-13  
Owner: Leigh  
Audit basis: repository source and data, runtime smoke test, representative image inspection, the Game Design Document, Puzzle Design Document, world map, puzzle dependency graphs, dialogue mechanic diagram, pulley rigging flow, and Market Street brief.

This folder is the maintained source of truth for the current game, its intended direction, known faults, and delivery sequence. Documents distinguish **implemented**, **partially implemented**, and **planned** behaviour.

## Document map

| Document | Purpose |
| --- | --- |
| [product vision](product-vision.md) | What the game is and aspires to become |
| [code and content audit](code-audit.md) | Full technical, runtime, content, and data assessment |
| [world and puzzle model](world-and-puzzles.md) | World topology and intended Chapter 1 dependency chain |
| [bugs](bugs.md) | Confirmed defects and material risks, with status and verification |
| [refactor plan](refactor-plan.md) | Staged architecture improvement without a rewrite |
| [feature roadmap](feature-roadmap.md) | Missing features and implementation order |
| [UI and art direction](ui-and-art-direction.md) | Modern interaction, accessibility, and coherent visual direction |
| [testing strategy](testing-strategy.md) | Unit, integration, visual, accessibility, and simulated-user E2E plan |
| [debug and test controls](debug-test-controls.md) | Safe state-building tools for reaching every experience quickly |
| [master checklist](master-checklist.md) | Ordered, per-task execution and acceptance checklist |
| [changelog](changelog.md) | Dated documentation and delivery record |

## Maintenance contract

After each completed prompt:

1. Update documents affected by the change.
2. Add every newly found defect to `bugs.md`, with evidence and a state.
3. Update the checklist/roadmap if scope, order, or completion changes.
4. Add a concise entry to `changelog.md` describing code, tests, and documentation changed.
5. Record test command, result, and timing when tests are run. Machine-generated run logs stay under ignored `e2e/logs/`.

The project-local working rules are also recorded in `AGENTS.md` so they survive future sessions in this repository.
