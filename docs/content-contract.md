# Authoritative content contract

Status: implemented  
Contract version: chapter1-world-v1  
Schema version: 1

## Authority and decisions

resources/content-contract.json is the machine-readable authority for shipped Chapter 1 topology, locales, grid rules, hotspot policy, gate facts, puzzle reachability, and legacy runtime action IDs. resources/screenNavigation.json supplies room presentation and transition coordinates but must agree with the contract.

- The canonical world contains 18 playable rooms, from libraryFoyer to the Chapter 1 payoff room map.
- Market Street intentionally has five exits: Road Into Town, Back Alley, Carpenter Workshop, Library Foyer, and Cow Path. The four-exit Market Street brief is a superseded concept reference.
- Debug Room is intentionally removed from shipped navigation and UI. Its old background is retained only as historical source material. Section 4 delivered its replacement: development-only scenarios, a gated DEBUG panel, and the `__GAME_TEST__` API reach any Chapter 1 state without a production room.
- The supplied world-map diagram remains a historical design source. Its Embassy/Farm Track/Large Tree/Inside naming is superseded by the versioned runtime IDs in the content contract.
- Files containing LastOneBackup, utilities/masterJSON/, utilities/jsonOutput/, and grid-reader outputs are authoring history, not runtime authority.

## Map payoff room

The map room is now complete enough to ship as the Chapter 1 destination:

- resources/backgrounds/map.png provides the room art.
- resources/mapRoom.json provides the polygonal walk area and accessible return exit; src/content/map-grid.mjs deterministically expands it to the canonical 80 x 60 grid.
- riverCrossing.e2 enters at a walkable left-side Map anchor after river.wolfResolved; map.e1 returns to the repaired bridge.
- objectChapterOneMap supplies a stable rectangular interaction hotspot, five-locale name and pickup response, inventory image, and completeChapterOne action. Pickup records chapter1.mapReached in canonical quest facts.
- The repaired-river source grid's historically reversed exit IDs are explicitly normalised by the contract, and the Map exit is extended clear of the decorative right border.

## Schemas and validation

src/content/schemas.mjs defines runtime boundaries for navigation rooms, 80 x 60 grids and codes, entities, dialogue/localisation, puzzle actions, scenarios, and saves. src/content/validate-content.mjs validates the combined content atomically. The save shape itself is owned by src/domain/save/save-format.mjs and documented in save-format.md; schemas.mjs delegates to it so one command still checks every schema.

The contract's puzzle.mandatoryFacts list has a second job since Section 5: it is the milestone list that drives save checkpoints. Adding a mandatory fact therefore makes it checkpoint itself. This is why Section 6 added 33 new facts without adding any mandatory ones: the fine detail of each chain drives the journal and the soft-lock check, while the eleven room gates and chapter milestones remain the things worth checkpointing.

Since Section 6 the puzzle section also carries:

- `chains` — the named threads of Chapter 1, each owning one player-facing objective.
- `objectives` — what the journal renders. Each declares `revealedBy` (when the player has met the puzzle) separately from `completedBy` (when it is solved), which is what keeps the journal spoiler-safe, plus how many hint tiers it offers. Titles and hints live in the `journal` section of `localization.json`, keyed `<objectiveId>.title` and `<objectiveId>.hintN`.
- `runtimePickupActions` — object ID to canonical action, so picking something up records its Chapter 1 step without a code change.
- `milestoneFacts` — the checkpoint list, currently identical to `mandatoryFacts` but named separately so the two can diverge without one silently changing the other's meaning.

The validator checks:

- exact room IDs, stable/unique entity and exit IDs, Market Street's exit decision, room membership, bounds, and required fields;
- all referenced room backgrounds, sprites, inventory art, objects, NPCs, doors, and allow-listed runtime actions;
- grid dimensions/codes, exit presence across declared variants, destination landing bounds/reachability, reciprocal exits, and explicit gate facts;
- five-locale completeness and fallback shape, dialogue entity references, terminal dialogue orders, and response reachability;
- puzzle action IDs, prerequisites/effects, reachable mandatory and milestone facts, orphan facts, actions unreachable from the initial facts, prerequisites no action can produce, and undeclared chains;
- objective IDs, their chains, their reveal/completion facts, their hint tiers, the presence of every objective title and hint in every locale, and pickup mappings naming a real action and a real object;
- hotspot bounds, undeclared overlaps, accessible labels, derived bottom-centre anchors, shape, and minimum target size.

Commands:

- npm run validate:content fails on an invalid shipped contract or missing file.
- npm run report:hotspots regenerates docs/hotspot-report.md and lists non-blocking minimum-size debt.
- npm run check runs content validation and Node unit tests.
- npm test runs content validation before the policy-controlled full browser suite.

Startup fetches the contract and Map definition with the other required data, validates the complete bundle before committing any content, and uses the existing visible fatal-load alert on failure.

## Current report boundary

The hotspot report records eight legacy exit shapes below the 3 x 3 authoring target. They remain usable wide strips or door-aligned shapes and are explicitly visible as Section 7 input; missing labels, out-of-bounds geometry, and undeclared overlaps are blocking errors now.
