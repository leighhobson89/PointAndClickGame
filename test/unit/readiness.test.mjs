import test from 'node:test';
import assert from 'node:assert/strict';

import {
    hasExplicitCoordinates,
    loadJsonResource,
    validateGridData,
    waitForTransition,
} from '../../src/application/readiness.mjs';

test('zero is a supplied transition coordinate', () => {
    assert.equal(hasExplicitCoordinates(0, 0), true);
    assert.equal(hasExplicitCoordinates(0, 12), true);
    assert.equal(hasExplicitCoordinates(12, 0), true);
    assert.equal(hasExplicitCoordinates(undefined, 0), false);
    assert.equal(hasExplicitCoordinates(0, null), false);
});

test('loadJsonResource rejects a non-success HTTP status', async () => {
    const fetchImpl = async () => ({ ok: false, status: 404, statusText: 'Not Found' });
    await assert.rejects(
        loadJsonResource(fetchImpl, '/missing.json', 'Navigation data'),
        /HTTP 404 Not Found/,
    );
});

test('loadJsonResource rejects malformed JSON and invalid schemas', async () => {
    const malformed = async () => ({
        ok: true,
        url: '/broken.json',
        json: async () => { throw new SyntaxError('Unexpected token'); },
    });
    await assert.rejects(loadJsonResource(malformed, '/broken.json', 'Grid data'), /malformed JSON/);

    const invalidGrid = async () => ({ ok: true, url: '/grid.json', json: async () => ({ room: [[]] }) });
    await assert.rejects(
        loadJsonResource(invalidGrid, '/grid.json', 'Grid data', validateGridData),
        /80 x 60/,
    );
});

test('transition wait resolves on transitionend and has a reduced-motion timeout', async () => {
    const element = new EventTarget();
    const completed = waitForTransition(element, 100);
    element.dispatchEvent(new Event('transitionend'));
    assert.equal(await completed, 'transitionend');

    const startedAt = Date.now();
    assert.equal(await waitForTransition(element, 5), 'timeout');
    assert.ok(Date.now() - startedAt >= 4);
});
