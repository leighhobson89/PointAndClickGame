const express = require('express');
const path = require('path');

const app = express();
const host = process.env.HOST || '127.0.0.1';
const port = Number.parseInt(process.env.PORT || '4173', 10);

app.disable('x-powered-by');
app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
});
app.use(express.static(path.resolve(__dirname), {
    etag: false,
    fallthrough: false,
    index: 'index.html',
    maxAge: 0,
}));

const server = app.listen(port, host, () => {
    console.log(`Point-and-click game available at http://${host}:${port}`);
});

function shutDown() {
    server.close(() => process.exit(0));
}

process.on('SIGINT', shutDown);
process.on('SIGTERM', shutDown);

module.exports = { app, server };
