// Files that exist solely for the development-only debug and test controls.
//
// The server refuses to serve these unless debug tools are enabled, and the
// production-absence E2E test asserts that refusal. Keeping the list in one
// place means adding a debug module cannot accidentally leak into a release.

// `src/domain/scenarios/scenarios.mjs` is deliberately NOT in this list. It
// holds the scenario schema and checksum rules that `src/content/schemas.mjs`
// validates shipped content against, so it is ordinary production code that
// happens to describe scenarios; it exposes no debug surface of its own.
const DEBUG_ONLY_PATHS = Object.freeze([
    '/debugTools.js',
    '/src/application/debug-controller.mjs',
    '/src/application/idle.mjs',
    '/src/adapters/debug-panel.mjs',
    '/src/adapters/debug-overlays.mjs',
    '/src/content/scenario-registry.mjs',
]);

module.exports = { DEBUG_ONLY_PATHS };
