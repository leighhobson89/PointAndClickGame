const { once } = require('events');

/**
 * Two servers run for the suite:
 *
 *  - the release server on E2E_PORT serves exactly what ships. It has no
 *    debug bootstrap and no `/debug-capability`, so the production-absence
 *    tests are checked against a real release build rather than a simulation;
 *  - the debug server on E2E_DEBUG_PORT enables the development-only debug and
 *    test controls, which is what the scenario-driven tests drive.
 */
module.exports = async function globalSetup() {
    process.env.HOST = '127.0.0.1';
    process.env.PORT = process.env.E2E_PORT || '4174';
    process.env.GAME_DEBUG_TOOLS = '0';

    const { server, createGameServer } = require('../../server');
    if (!server.listening) {
        await once(server, 'listening');
    }

    const debugPort = Number.parseInt(process.env.E2E_DEBUG_PORT || '4175', 10);
    const debug = createGameServer({ host: '127.0.0.1', port: debugPort, debugTools: true });
    if (!debug.server.listening) {
        await once(debug.server, 'listening');
    }

    const close = (target) => new Promise((resolve, reject) => {
        if (!target.listening) return resolve();
        target.close((error) => (error ? reject(error) : resolve()));
    });

    return async () => {
        await Promise.all([close(server), close(debug.server)]);
    };
};
