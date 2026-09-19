# Point-and-Click Game living documentation

Last audited: 2026-09-19  
Owner: Leigh

This folder is the maintained source of truth for the current game, its intended direction, known faults, and delivery sequence.

The set is split in two. **The live documents below hold what is still outstanding.** Work that is finished moves into [archive/](archive/README.md), so a live document can be read as a to-do list without sorting history out of it first. No live document refers to an archived item; each links to its own archive file once, and nowhere else.

## Live documents — what is left to do

| Document | Purpose |
| --- | --- |
| [product vision](product-vision.md) | What the game is and aspires to become |
| [code and content audit](code-audit.md) | The open technical, runtime, content, and data findings |
| [world and puzzle model](world-and-puzzles.md) | World topology, the Chapter 1 dependency chain, and the authoring rules |
| [content contract](content-contract.md) | Versioned world authority, schemas, validation, and what is still outstanding against it |
| [save format](save-format.md) | Versioned save contract, migration boundary, slots, restore rules, and known limits |
| [hotspot report](hotspot-report.md) | Generated room/entity hotspot geometry and authoring warnings |
| [bugs](bugs.md) | Open defects and material risks, with status and required verification |
| [art bible](art-bible.md) | The approved production standard for every visual asset: scale, perspective, animation, budgets, and acceptance |
| [art redesign production plan](art-redesign-production-plan.md) | Remaining room/NPC/prop production packages and shared restyle rules |
| [asset report](asset-report.md) | Generated manifest report: roles, dimensions, budget breaches, duplicates, orphans |
| [player frame geometry](player-frame-geometry.md) | Generated measurement of every player animation frame's anchor and drawn size |
| [testing strategy](testing-strategy.md) | Current coverage, the timing gate, and the coverage still owed |
| [debug and test controls](debug-test-controls.md) | The shipped scenario, panel, and `__GAME_TEST__` surface |
| [master checklist](master-checklist.md) | The ordered, outstanding execution and acceptance checklist |
| [changelog](changelog.md) | Dated documentation and delivery record |

## The archive — what is already done

[archive/](archive/README.md) holds completed sections and retired documents: finished checklist work, delivered phases and features, resolved audit findings, the resolved bug register, accumulated test-proof history, and acceptance evidence. Nothing is deleted there, including the implementation notes explaining why a decision was taken.

`changelog.md`, `hotspot-report.md`, `asset-report.md`, and `player-frame-geometry.md` stay in the live set. The changelog is the running dated ledger; the other three are regenerated from current state by `npm run report:hotspots`, `npm run report:assets`, and `npm run report:art`, and always describe what is true now. `art-bible.md` also stays live: it is the standard the work is judged against rather than a record of work done.

## Maintenance contract

After each completed prompt:

1. Update the live documents affected by the change, removing what is now done.
2. Add the finished description to the matching file in `archive/`. Do not leave completed work sitting in a live document.
3. Add every newly found defect to `bugs.md`, with evidence and a state; move a row to `archive/bugs-resolved.md` once its evidence passes.
4. Update the checklist and roadmap if scope, order, or completion changes.
5. Add a concise entry to `changelog.md` describing code, tests, and documentation changed.
6. Record test command, result, and timing when tests are run. Machine-generated run logs stay under ignored `e2e/logs/`.

The project-local working rules are also recorded in `AGENTS.md` so they survive future sessions in this repository.
