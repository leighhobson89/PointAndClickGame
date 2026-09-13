# Game-state scenarios

Cover new-game reset, menu/resume, quest flags, pending events, object/NPC relocation, door and bridge state, current room, and clean repeated starts.

Implemented: `new-game-reset.spec.cjs` starts five sessions through the visible menu and verifies that session generations advance while disposable window/canvas listener counts remain constant.
