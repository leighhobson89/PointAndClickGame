const express = require('express');
const path = require('path');

// A release server refuses to serve these, so a production page cannot import
// the debug bootstrap even if someone appends `?debug=1`.
const { DEBUG_ONLY_PATHS } = require('./scripts/debug-only-paths.cjs');

function isDebugOnlyPath(requestPath) {
    const normalised = requestPath.replace(/\\/g, '/').replace(/\/+/g, '/');
    return DEBUG_ONLY_PATHS.includes(normalised);
}

/**
 * @param {Object} [options]
 * @param {boolean} [options.debugTools] serve the debug bootstrap and advertise
 *   `/debug-capability`. Defaults to the GAME_DEBUG_TOOLS environment variable,
 *   which is off unless a developer or the E2E harness sets it explicitly.
 */
function createGameApp({ debugTools = process.env.GAME_DEBUG_TOOLS === '1' } = {}) {
    const app = express();

    app.disable('x-powered-by');
    app.get('/health', (_request, response) => {
        response.status(200).json({ status: 'ok' });
    });
    app.get('/debug-capability', (_request, response) => {
        response.status(200).json({ enabled: debugTools === true, apiVersion: 1 });
    });

    if (!debugTools) {
        app.use((request, response, next) => {
            if (!isDebugOnlyPath(request.path)) return next();
            response.status(404).json({ error: 'Debug tools are not available in this build.' });
        });
    }

    app.use(express.static(path.resolve(__dirname), {
        etag: false,
        fallthrough: false,
        index: 'index.html',
        maxAge: 0,
    }));

    return app;
}

function createGameServer({ host = process.env.HOST || '127.0.0.1', port = Number.parseInt(process.env.PORT || '4173', 10), debugTools, onListening } = {}) {
    const app = createGameApp({ debugTools: debugTools ?? process.env.GAME_DEBUG_TOOLS === '1' });
    const server = app.listen(port, host, () => {
        const address = server.address();
        const actualPort = typeof address === 'object' && address ? address.port : port;
        console.log(`Point-and-click game available at http://${host}:${actualPort}${debugTools ? ' (debug tools enabled)' : ''}`);
        onListening?.(server);
    });
    return { app, server };
}

// The default server starts on import so `npm start` and the E2E global setup
// keep working unchanged. Additional servers (for example a debug-enabled one
// beside a release one) are created explicitly with createGameServer.
const started = createGameServer();

function shutDown() {
    started.server.close(() => process.exit(0));
}

process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);

module.exports = { app: started.app, server: started.server, createGameApp, createGameServer, DEBUG_ONLY_PATHS };
