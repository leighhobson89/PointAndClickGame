# Project working agreement

This repository belongs to Leigh. Address Leigh by name when it is natural and useful.

## Living documentation

- Treat `docs/` as part of the product, not an afterthought.
- After each completed prompt that changes code, data, tests, design, or known behaviour, update the relevant documents and append a short dated entry to `docs/changelog.md`.
- Record newly discovered defects in `docs/bugs.md`; do not silently bury them in a plan or test.
- Keep claims evidence-based. Mark planned behaviour separately from implemented behaviour.

## Editing and repository care

- Use the structured write/patch tool for hand-authored source and documentation changes. Do not compose file contents with shell redirection or inline shell-writing commands.
- Package managers and formatters may update their own generated files.
- Preserve Leigh's changes and avoid destructive Git commands.
- Keep generated dependencies, reports, logs, packages, and machine-local files out of Git according to `.gitignore`.

## Test execution policy

- Run all browser tests with `node tests all`.
- Run targeted functional areas with `node tests <area>`; at most three named areas may be run together without further permission.
- The runner must time and log every run.
- Append `--video` (or `--video=retain-on-failure`) to record a run. Recorded runs keep their own report and artefacts under `test-reports/` and are listed newest-first in `test-reports/history.html`.
- A full run is allowed only when no previous full-run record exists or the previous full run completed in under 180 seconds. If the last full run reached 180 seconds or more, run up to three relevant areas instead.
- Do not bypass the timing gate. Keep `e2e/README.md` and `docs/testing-strategy.md` current when the harness changes.

## Product guardrails

- Keep test/debug controls deterministic and unavailable in normal production play.
- Prefer stable semantic IDs and explicit state over parsing translated display text or encoding control flow in punctuation/whitespace.
- Preserve the authored humour and hand-built identity while improving consistency, accessibility, performance, and maintainability.
