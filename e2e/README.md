# End-to-end test harness

Run the complete suite with `node tests all`. Run one to three functional areas with, for example, `node tests navigation localisation dialogue`.

Each functional area owns its tests and its scenario notes. The runner records elapsed time and status under `e2e/logs/`. A complete run is permitted only when there is no previous complete-run record or the previous complete run took less than 180 seconds. Targeted runs remain available when that limit is exceeded.

Only `startup/new-game.spec.cjs` is implemented in the initial proof of concept. The other folders are deliberate coverage boundaries, not claims of finished test coverage.
