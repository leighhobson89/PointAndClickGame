# Save format and progress ownership

Status: **implemented**.

This document is the contract for player progress. It describes what a save
contains, what it deliberately leaves out, how an older save is brought
forward, and the rules that keep progress from being partially applied. The
outstanding work against it is in **Known limits** at the end.

## The shape of a save

A save is one JSON object.

```json
{
  "format": "pointAndClick.save",
  "schemaVersion": 2,
  "savedAt": "2026-09-13T18:16:03.585Z",
  "slot": "resume",
  "label": "rigging.assembled",
  "playTimeMs": 532,
  "payload": {
    "gameStateSchemaVersion": 1,
    "location": { "initialRoomId": "...", "currentRoomId": "...", "previousRoomId": "...", "nextRoomId": "..." },
    "player": { "cell": { "x": 12, "y": 40 }, "activeSprite": "still_left" },
    "inventory": { "slot1": { "objectId": "objectRopeAndHook", "quantity": 1 } },
    "quests": { "facts": { "chapter1.started": true }, "bridgeState": 2 },
    "dialogue": { "activeNodeId": null, "removedOptions": ["library.askAgain"] },
    "settings": { "language": "de", "selectedLanguage": "de", "oldLanguage": "de", "audioMuted": false },
    "world": {
      "patches": { "navigation": [{ "op": "set", "path": ["libraryFoyer", "alreadyVisited"], "value": true }] },
      "grids": { "cells": [["riverCrossing", 0, 1, "w1"]], "removedRooms": ["riverCrossingBridgeComplete"], "addedRooms": {} }
    }
  }
}
```

The format lives in `src/domain/save/save-format.mjs` and is pure: building and
applying a save touch no DOM, no storage, and no clock.

## What is persisted, and what is rebuilt

| Persisted | Rebuilt after restore |
| --- | --- |
| Current, previous, next, and initial room IDs | Background image and `backgroundSize` |
| Player's walk-grid cell and active sprite | Player pixel position, width, height, and room walk speed |
| Inventory slots and quantities | The inventory strip in the DOM |
| Quest facts and `bridgeState` | Gate availability and `whyUnavailable` explanations |
| Removed dialogue options | Any in-flight conversation (see below) |
| Locale and settings | Localised button and interaction copy |
| Authored world changes, as a patch against shipped content | Entity placement stamps in the walk grid, `visualPosition`, and pixel `dimensions` |
| Accumulated play time | Canvas cell metrics, entity paths, queued text, transition flags, render caches |

Two rules explain every row.

**Position travels as a grid cell, not as pixels.** Pixel coordinates are a
product of the canvas size at the moment of the save, so restoring them would
displace the player whenever the viewport differs from the one that wrote the
save. `initializePlayerPosition()` is the inverse of the capture.

**The world is a patch, never a copy.** The shipped content bundle is loaded and
validated first, and the save applies a small list of operations on top. That
keeps a save small, keeps it from pinning a player to the content of the day it
was written, and makes an unchanged world cost nothing.

### Walk-grid changes

The walk grid carries two different kinds of change and the save separates them.

- `o<objectId>` and `c<npcId>` cells are *placement stamps*, written by
  `setUpObjectsAndNpcs()`. They are derived and are never recorded.
- Everything else is authored — the repaired river bridge is the Chapter 1
  example — and is recorded as individual cells.

When an authored cell happens to be hidden beneath a placed entity, the value
recorded underneath it (`getUnderlyingCellValue`) is used, so the authored change
is not lost. On restore the cell patch is applied *before* entity placement, so
the placement pass records the correct authored value underneath each entity.

### In-flight conversations

`dialogue.activeNodeId` is always written as `null`. The non-library
conversations still hold their progress outside canonical state (BUG-011,
BUG-031), so a mid-conversation restore cannot be rebuilt honestly. A restore
lands the player in the room instead. Ordinary saving also waits while a
conversation, cutscene, text line, or room transition is in flight.

Milestone checkpoints are the deliberate exception: they are forced, because a
milestone usually commits *inside* the conversation that grants it, and the
progress is worth keeping.

## Versions and migration

`src/domain/save/migrations.mjs` is the only door into the game for a save.
Everything else sees the current envelope.

| Version | Shape | Handling |
| --- | --- | --- |
| 0 | `{ schemaVersion, state }` without quest or dialogue slices | Defaults are filled in, then migrated as version 1 |
| 1 | `{ schemaVersion, state }` with the whole canonical state, content bundle included | Progress is kept; the embedded bundle travels as `payload.legacyContent` |
| 2 | The current envelope | Used as is |

A version this build does not recognise is refused with
`SAVE_ERROR_CODES.unsupportedVersion` rather than half-applied.

Migration is pure, so it has no shipped content to diff a version 1 bundle
against. `finaliseLegacyWorld(envelope, pristineContent)` does that second step
once the caller holds the content, turning the embedded bundle into the same
patch a version 2 save would have stored.

## Slots and policy

`src/application/save-service.mjs` owns policy. It is DOM-free and storage-
agnostic, and reports what happened as stable event IDs that the adapter turns
into localised copy.

| Slot | Written by |
| --- | --- |
| `resume` | New Game, each milestone, a rate-limited room-change autosave, and manual Save Game |
| `checkpoint` | Each declared Chapter 1 milestone only |

Slots are stored under `pointAndClick.save.<slot>` in `localStorage`.

Milestones come from the content contract's `puzzle.mandatoryFacts`, so adding
a mandatory fact makes it checkpoint itself. Checkpointing listens to the
canonical store rather than being called from each puzzle, which means a
milestone cannot be committed without being checkpointed.

Room-change autosaves are rate limited to one every 30 seconds, so a player
pacing between two rooms does not write continuously.

## Restoring safely

Restoring is two-phase, and phase one cannot touch the running session.

1. **Read, migrate, validate, build.** `prepareRestore()` produces the candidate
   state. Any failure here throws a `SaveError` with a stable `code`, and the
   player's game is exactly as it was.
2. **Commit and rebuild.** Only then does `commitRestoredState()` clear the old
   session, replace canonical state, and rebuild the derived half: canvas
   metrics, entity placement and walk-grid stamps, visual positions, background
   and foreground images, entity paths, and the inventory strip.

A corrupt, unreadable, or unsupported save therefore changes nothing at all. So
does a storage failure on the way out: the write is reported on the status line
and play continues.

## Player-facing controls

| Control | Behaviour |
| --- | --- |
| **Continue** (menu) | Enabled only when a stored save can actually be read. Loads and validates shipped content, then restores. |
| **Resume** (menu) | Unchanged, and a different idea: it returns to the session already running. |
| **Save Game** (menu) | Writes the resume slot, reads it back, and shows the copy-and-paste string — so the copy the player is handed is the bytes that were stored. |
| **Load Game** (menu) | Accepts the compressed string or plain JSON, from the text area or a file, through one decode/migrate/validate/apply path. |

Feedback is one quiet line in the corner. Successes use a polite `role="status"`
region so a screen reader is not interrupted mid-sentence; failures use
`role="alert"`, because only a failure puts progress at risk. The event and
reason are also published as `data-save-event`, `data-save-reason`, and
`data-save-code`, so tests assert on stable IDs rather than translated copy.

## Known limits

- Export still uses LZString for the compact string, which is a CDN script
  (BUG-013). Import accepts plain JSON as well, so a save is never locked behind
  that library.
- Play time is accumulated across sessions but is not yet shown to the player.
- A save taken while a legacy conversation is part-way through resumes in the
  room, not in the conversation. That is a consequence of BUG-011.
