# Asset manifest report

Generated 2026-09-19 by `npm run report:assets`. Do not edit by hand.

The stage is 832x448 (aspect 1.8571). Budgets are defined in [art-bible.md](art-bible.md) and enforced by `scripts/asset-manifest.mjs --check`.

**179 shipped images totalling 38.8 MB**, out of 409 images totalling 107.5 MB in `resources/`.

## Weight and budget by role

| Role | Files | Total bytes | Over budget | Orphaned |
| --- | ---: | ---: | ---: | ---: |
| Reference / working image (not shipped) | 201 | 68.1 MB | 0 | 0 |
| Room background | 24 | 28.0 MB | 24 | 0 |
| NPC sprite | 20 | 3.5 MB | 7 | 0 |
| Object, world sprite | 59 | 2.9 MB | 18 | 7 |
| Player animation frame | 40 | 1.5 MB | 0 | 0 |
| Object, inventory icon | 22 | 1.2 MB | 22 | 0 |
| Room foreground / occluder | 8 | 0.9 MB | 4 | 0 |
| UI layout frame | 2 | 0.7 MB | 2 | 2 |
| Authoring walk-grid overlay | 28 | 0.5 MB | 0 | 0 |
| Layered source art (not shipped) | 1 | 0.0 MB | 0 | 0 |
| Mouse cursor | 4 | 0.0 MB | 4 | 0 |

## Budget breaches

81 shipped assets breach their role budget.

| Asset | Role | Size | Bytes | Breach |
| --- | --- | --- | ---: | --- |
| `bg.alley` | background | 3329x1801 | 8544 KB | 8544 KB exceeds the 400 KB background budget; 3329x1801 is not the 832x448 stage size and is rescaled at runtime |
| `bg.libraryFoyer` | background | 1530x765 | 4576 KB | 4576 KB exceeds the 400 KB background budget; 1530x765 is aspect 2.000 against the stage's 1.857, so it is stretched by 7.7% |
| `npc.seedyGuy` | npc | 491x1255 | 1940 KB | 1940 KB exceeds the 120 KB npc budget; width 491 exceeds the 400 px npc ceiling; height 1255 exceeds the 700 px npc ceiling |
| `bg.testWide` | background | 1600x600 | 1592 KB | 1592 KB exceeds the 400 KB background budget; 1600x600 is aspect 2.667 against the stage's 1.857, so it is stretched by 43.6% |
| `bg.sewer` | background | 1366x622 | 1488 KB | 1488 KB exceeds the 400 KB background budget; 1366x622 is aspect 2.196 against the stage's 1.857, so it is stretched by 18.3% |
| `bg.marketStreet` | background | 1000x581 | 1463 KB | 1463 KB exceeds the 400 KB background budget; 1000x581 is aspect 1.721 against the stage's 1.857, so it is stretched by 7.3% |
| `bg.map` | background | 832x448 | 1028 KB | 1028 KB exceeds the 400 KB background budget |
| `bg.roadIntoTown` | background | 832x448 | 825 KB | 825 KB exceeds the 400 KB background budget |
| `bg.riverCrossingBridgeComplete` | background | 832x448 | 727 KB | 727 KB exceeds the 400 KB background budget |
| `bg.riverCrossing` | background | 832x448 | 726 KB | 726 KB exceeds the 400 KB background budget |
| `bg.riverCrossingBridgeHalfComplete` | background | 832x448 | 725 KB | 725 KB exceeds the 400 KB background budget |
| `fg.riverCrossingBridgeHalfComplete` | foreground | 832x448 | 725 KB | 725 KB exceeds the 250 KB foreground budget |
| `bg.cowPathRepairedFence` | background | 832x448 | 679 KB | 679 KB exceeds the 400 KB background budget |
| `bg.cowPathBrokenFence` | background | 832x448 | 679 KB | 679 KB exceeds the 400 KB background budget |
| `bg.kitchen` | background | 832x448 | 583 KB | 583 KB exceeds the 400 KB background budget |
| `bg.largePileOfPoo` | background | 832x448 | 577 KB | 577 KB exceeds the 400 KB background budget |
| `bg.stinkingDump` | background | 832x448 | 576 KB | 576 KB exceeds the 400 KB background budget |
| `bg.carpenter` | background | 800x600 | 539 KB | 539 KB exceeds the 400 KB background budget; 800x600 is aspect 1.333 against the stage's 1.857, so it is stretched by 28.2% |
| `bg.stablesTemp` | background | 832x448 | 520 KB | 520 KB exceeds the 400 KB background budget |
| `bg.house` | background | 832x448 | 518 KB | 518 KB exceeds the 400 KB background budget |
| `bg.stables` | background | 832x448 | 516 KB | 516 KB exceeds the 400 KB background budget |
| `bg.barn` | background | 832x448 | 491 KB | 491 KB exceeds the 400 KB background budget |
| `bg.den` | background | 704x384 | 484 KB | 484 KB exceeds the 400 KB background budget; 704x384 is aspect 1.833 against the stage's 1.857, so it is stretched by 1.3% |
| `bg.researchRoom` | background | 800x436 | 423 KB | 423 KB exceeds the 400 KB background budget; 800x436 is aspect 1.835 against the stage's 1.857, so it is stretched by 1.2% |
| `bg.deadTree` | background | 704x384 | 391 KB | 704x384 is aspect 1.833 against the stage's 1.857, so it is stretched by 1.3% |
| `npc.librarian` | npc | 75x125 | 382 KB | 382 KB exceeds the 120 KB npc budget |
| `ui.border_left` | layout | 410x1920 | 358 KB | 358 KB exceeds the 64 KB layout budget |
| `ui.border_right` | layout | 410x1920 | 358 KB | 358 KB exceeds the 64 KB layout budget |
| `obj.oldGRedGloveWorld` | objectWorld | 664x664 | 338 KB | 338 KB exceeds the 80 KB objectWorld budget; width 664 exceeds the 512 px objectWorld ceiling; height 664 exceeds the 512 px objectWorld ceiling |
| `icon.oldGRedGloveInv` | objectInventory | 676x676 | 326 KB | 326 KB exceeds the 24 KB objectInventory budget; width 676 exceeds the 128 px objectInventory ceiling; height 676 exceeds the 128 px objectInventory ceiling |
| `obj.manholeCover` | objectWorld | 260x257 | 263 KB | 263 KB exceeds the 80 KB objectWorld budget |
| `npc.carpenterNpc` | npc | 640x448 | 187 KB | 187 KB exceeds the 120 KB npc budget; width 640 exceeds the 400 px npc ceiling |
| `npc.donkeyOnRope` | npc | 538x508 | 153 KB | 153 KB exceeds the 120 KB npc budget; width 538 exceeds the 400 px npc ceiling |
| `obj.paperScrawledOnWorld` | objectWorld | 660x567 | 152 KB | 152 KB exceeds the 80 KB objectWorld budget; width 660 exceeds the 512 px objectWorld ceiling; height 567 exceeds the 512 px objectWorld ceiling |
| `icon.paperScrawledOnInv` | objectInventory | 660x567 | 152 KB | 152 KB exceeds the 24 KB objectInventory budget; width 660 exceeds the 128 px objectInventory ceiling; height 567 exceeds the 128 px objectInventory ceiling |
| `icon.ropeHookInv` | objectInventory | 660x567 | 139 KB | 139 KB exceeds the 24 KB objectInventory budget; width 660 exceeds the 128 px objectInventory ceiling; height 567 exceeds the 128 px objectInventory ceiling |
| `obj.ropeHookWorld` | objectWorld | 660x567 | 139 KB | 139 KB exceeds the 80 KB objectWorld budget; width 660 exceeds the 512 px objectWorld ceiling; height 567 exceeds the 512 px objectWorld ceiling |
| `obj.pileOfBooks` | objectWorld | 660x567 | 137 KB | 137 KB exceeds the 80 KB objectWorld budget; width 660 exceeds the 512 px objectWorld ceiling; height 567 exceeds the 512 px objectWorld ceiling |
| `npc.donkeyNotOnRope` | npc | 369x498 | 134 KB | 134 KB exceeds the 120 KB npc budget |
| `obj.donkeyOnRopeHappy` | objectWorld | 538x679 | 133 KB | 133 KB exceeds the 80 KB objectWorld budget; width 538 exceeds the 512 px objectWorld ceiling; height 679 exceeds the 512 px objectWorld ceiling |
| `npc.cowPain` | npc | 341x536 | 132 KB | 132 KB exceeds the 120 KB npc budget |
| `npc.cowHappy` | npc | 341x536 | 131 KB | 131 KB exceeds the 120 KB npc budget |
| `obj.donkeyNotOnRopeRight` | objectWorld | 538x679 | 115 KB | 115 KB exceeds the 80 KB objectWorld budget; width 538 exceeds the 512 px objectWorld ceiling; height 679 exceeds the 512 px objectWorld ceiling |
| `obj.donkeyNotOnRopeLeft` | objectWorld | 538x679 | 114 KB | 114 KB exceeds the 80 KB objectWorld budget; width 538 exceeds the 512 px objectWorld ceiling; height 679 exceeds the 512 px objectWorld ceiling |
| `obj.parrotBranch` | objectWorld | 485x266 | 106 KB | 106 KB exceeds the 80 KB objectWorld budget |
| `obj.keyDen` | objectWorld | 660x567 | 104 KB | 104 KB exceeds the 80 KB objectWorld budget; width 660 exceeds the 512 px objectWorld ceiling; height 567 exceeds the 512 px objectWorld ceiling |
| `icon.keyDenInv` | objectInventory | 660x567 | 104 KB | 104 KB exceeds the 24 KB objectInventory budget; width 660 exceeds the 128 px objectInventory ceiling; height 567 exceeds the 128 px objectInventory ceiling |
| `obj.libraryFoyer_Exit_MarketStreetClosed` | objectWorld | 71x353 | 101 KB | 101 KB exceeds the 80 KB objectWorld budget |
| `obj.stackOfWoodOnHookWorld` | objectWorld | 73x109 | 94 KB | 94 KB exceeds the 80 KB objectWorld budget |
| `obj.stackOfWoodOnBridgeWorld` | objectWorld | 287x154 | 93 KB | 93 KB exceeds the 80 KB objectWorld budget |
| `obj.crowbarWorld` | objectWorld | 344x626 | 88 KB | 88 KB exceeds the 80 KB objectWorld budget; height 626 exceeds the 512 px objectWorld ceiling |
| `icon.crowbarInv` | objectInventory | 660x567 | 87 KB | 87 KB exceeds the 24 KB objectInventory budget; width 660 exceeds the 128 px objectInventory ceiling; height 567 exceeds the 128 px objectInventory ceiling |
| `fg.libraryFoyer` | foreground | 1530x765 | 71 KB | 1530x765 is aspect 2.000 against the stage's 1.857, so it is stretched by 7.7% |
| `icon.splinterInv` | objectInventory | 438x425 | 70 KB | 70 KB exceeds the 24 KB objectInventory budget; width 438 exceeds the 128 px objectInventory ceiling; height 425 exceeds the 128 px objectInventory ceiling |
| `fg.marketStreet` | foreground | 1000x581 | 69 KB | 1000x581 is aspect 1.721 against the stage's 1.857, so it is stretched by 7.3% |
| `obj.parrotLeft` | objectWorld | 350x553 | 66 KB | height 553 exceeds the 512 px objectWorld ceiling |
| `obj.parrotRight` | objectWorld | 350x553 | 64 KB | height 553 exceeds the 512 px objectWorld ceiling |
| `icon.pliersInv` | objectInventory | 660x567 | 47 KB | 47 KB exceeds the 24 KB objectInventory budget; width 660 exceeds the 128 px objectInventory ceiling; height 567 exceeds the 128 px objectInventory ceiling |
| `obj.pliersWorld` | objectWorld | 660x567 | 47 KB | width 660 exceeds the 512 px objectWorld ceiling; height 567 exceeds the 512 px objectWorld ceiling |
| `obj.stackOfWoodOnHookOnFloorWorld` | objectWorld | 948x164 | 46 KB | width 948 exceeds the 512 px objectWorld ceiling |
| `icon.nailsInv` | objectInventory | 200x198 | 46 KB | 46 KB exceeds the 24 KB objectInventory budget; width 200 exceeds the 128 px objectInventory ceiling; height 198 exceeds the 128 px objectInventory ceiling |
| `icon.carrotInv` | objectInventory | 200x200 | 41 KB | 41 KB exceeds the 24 KB objectInventory budget; width 200 exceeds the 128 px objectInventory ceiling; height 200 exceeds the 128 px objectInventory ceiling |
| `fg.sewer` | foreground | 1366x622 | 40 KB | 1366x622 is aspect 2.196 against the stage's 1.857, so it is stretched by 18.3% |
| `icon.pulleyInv` | objectInventory | 200x240 | 38 KB | 38 KB exceeds the 24 KB objectInventory budget; width 200 exceeds the 128 px objectInventory ceiling; height 240 exceeds the 128 px objectInventory ceiling |
| `icon.parrotFlyerInv` | objectInventory | 200x200 | 37 KB | 37 KB exceeds the 24 KB objectInventory budget; width 200 exceeds the 128 px objectInventory ceiling; height 200 exceeds the 128 px objectInventory ceiling |
| `icon.IllegibleMapInv` | objectInventory | 200x198 | 33 KB | 33 KB exceeds the 24 KB objectInventory budget; width 200 exceeds the 128 px objectInventory ceiling; height 198 exceeds the 128 px objectInventory ceiling |
| `icon.bowlInv` | objectInventory | 200x198 | 27 KB | 27 KB exceeds the 24 KB objectInventory budget; width 200 exceeds the 128 px objectInventory ceiling; height 198 exceeds the 128 px objectInventory ceiling |
| `icon.milkInBowlInv` | objectInventory | 200x198 | 21 KB | width 200 exceeds the 128 px objectInventory ceiling; height 198 exceeds the 128 px objectInventory ceiling |
| `icon.ropeInv` | objectInventory | 150x100 | 20 KB | width 150 exceeds the 128 px objectInventory ceiling |
| `icon.hookInv` | objectInventory | 200x188 | 18 KB | width 200 exceeds the 128 px objectInventory ceiling; height 188 exceeds the 128 px objectInventory ceiling |
| `icon.malletInv` | objectInventory | 200x198 | 18 KB | width 200 exceeds the 128 px objectInventory ceiling; height 198 exceeds the 128 px objectInventory ceiling |
| `icon.boneInv` | objectInventory | 200x198 | 14 KB | width 200 exceeds the 128 px objectInventory ceiling; height 198 exceeds the 128 px objectInventory ceiling |
| `icon.goldKeyInv` | objectInventory | 200x200 | 8 KB | width 200 exceeds the 128 px objectInventory ceiling; height 200 exceeds the 128 px objectInventory ceiling |
| `icon.pitchForkInv` | objectInventory | 146x146 | 7 KB | width 146 exceeds the 128 px objectInventory ceiling; height 146 exceeds the 128 px objectInventory ceiling |
| `icon.milkBottleInv` | objectInventory | 200x198 | 6 KB | width 200 exceeds the 128 px objectInventory ceiling; height 198 exceeds the 128 px objectInventory ceiling |
| `cursor.mouseHoverInteresting` | cursor | 180x179 | 6 KB | width 180 exceeds the 64 px cursor ceiling; height 179 exceeds the 64 px cursor ceiling |
| `cursor.mouseClickInteresting` | cursor | 180x179 | 6 KB | width 180 exceeds the 64 px cursor ceiling; height 179 exceeds the 64 px cursor ceiling |
| `cursor.mouseNoPathFound` | cursor | 180x179 | 5 KB | width 180 exceeds the 64 px cursor ceiling; height 179 exceeds the 64 px cursor ceiling |
| `icon.parrotMirrorInv` | objectInventory | 187x194 | 5 KB | width 187 exceeds the 128 px objectInventory ceiling; height 194 exceeds the 128 px objectInventory ceiling |
| `bg.preStartBackgroundImage` | background | 800x600 | 2 KB | 800x600 is aspect 1.333 against the stage's 1.857, so it is stretched by 28.2% |
| `cursor.mouseCrosshair` | cursor | 180x179 | 2 KB | width 180 exceeds the 64 px cursor ceiling; height 179 exceeds the 64 px cursor ceiling |

## Exact duplicates

Byte-identical files. Each group should become one asset with the other IDs aliased to it.

| Copies | Assets |
| ---: | --- |
| 2 | `bg.sewer`, `ref.sewer` |
| 2 | `ref.barninside2`, `ref.barninside5` |
| 2 | `obj.parrotLeft`, `ref.parrot` |
| 2 | `npc.blank`, `obj.blank` |
| 2 | `icon.bowlInv`, `obj.bowlWorld` |
| 2 | `icon.keyDenInv`, `obj.keyDen` |
| 2 | `icon.milkInBowlInv`, `obj.milkInBowlWorld` |
| 2 | `icon.paperScrawledOnInv`, `obj.paperScrawledOnWorld` |
| 2 | `icon.nailsInv`, `obj.nailsWorld` |
| 2 | `icon.pliersInv`, `obj.pliersWorld` |
| 2 | `icon.ropeHookInv`, `obj.ropeHookWorld` |
| 2 | `ref.move2_down`, `ref.still_down` |
| 2 | `ref.move2_up`, `ref.still_up` |

## Orphaned shipped assets

9 images sit in a shipped folder but no room, object, NPC, or player frame references them, totalling 1.3 MB.

| Asset | Role | Size | Bytes |
| --- | --- | --- | ---: |
| `ui.border_left` | layout | 410x1920 | 358 KB |
| `ui.border_right` | layout | 410x1920 | 358 KB |
| `obj.paperScrawledOnWorld` | objectWorld | 660x567 | 152 KB |
| `obj.pileOfBooks` | objectWorld | 660x567 | 137 KB |
| `obj.parrotBranch` | objectWorld | 485x266 | 106 KB |
| `obj.keyDen` | objectWorld | 660x567 | 104 KB |
| `obj.barn_Exit_StablesClosed` | objectWorld | 356x136 | 49 KB |
| `obj.milkInBowlWorld` | objectWorld | 200x198 | 21 KB |
| `obj.barn_Exit_StablesOpen` | objectWorld | 47x136 | 8 KB |

## Character scale against the player

Each placed NPC's drawn height beside the player's height at the same depth in the same room. A person-sized NPC should be near 1.0. This is what says whether the characters agree with each other; the room scale profile only guarantees the player agrees with the painting.

| NPC | Room | Depth | NPC height | Player height | Ratio |
| --- | --- | ---: | ---: | ---: | ---: |
| `npcCarpenter` | carpenter | w185 | 371 px | 140 px | **2.65** ⚠ |
| `npcWomanLostMirror` | roadIntoTown | w255 | 296 px | 170 px | **1.74** ⚠ |
| `npcSeedyLookingGuy` | alley | w197 | 107 px | 104 px | **1.03** |
| `npcDonkey` | stables | w215 | 121 px | 118 px | **1.03** |
| `npcLibrarian` | libraryFoyer | w143 | 49 px | 85 px | **0.57** ⚠ |
| `npcTownDog` | marketStreet | w255 | 37 px | 145 px | **0.25** ⚠ |

Animals are expected to sit away from 1.0. A flagged *human* NPC is drawn at a different scale from the player standing next to it.

## Provenance and licence

40 of 179 shipped assets have a recorded provenance and licence. The manifest leaves both `null` until a human records them, so an unrecorded asset is visible rather than assumed clear.

