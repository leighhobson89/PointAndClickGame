const { once } = require('events');

module.exports = async function globalSetup() {
    process.env.HOST = '127.0.0.1';
    process.env.PORT = process.env.E2E_PORT || '4174';

    const { server } = require('../../server');
    if (!server.listening) {
        await once(server, 'listening');
    }

    return async () => {
        if (!server.listening) return;
        await new Promise((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    };
};
