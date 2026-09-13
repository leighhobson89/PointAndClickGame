const { defineConfig } = require('@playwright/test');

// When the `tests` runner is asked to record video it sets E2E_RUN_ID, and the
// run's artefacts and report go under `test-reports/`. That matters: Playwright
// clears both `playwright-report/` and `test-results/` at the start of every
// run, so a later ordinary run would otherwise delete the recordings.
// Without E2E_RUN_ID nothing changes: one shared report folder and no video,
// keeping ordinary runs fast and small.
const runId = process.env.E2E_RUN_ID || null;
const video = process.env.E2E_VIDEO || 'off';

module.exports = defineConfig({
    testDir: './e2e',
    outputDir: runId ? `./test-reports/artifacts/${runId}` : './test-results',
    globalSetup: require.resolve('./e2e/_support/global-setup.cjs'),
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    timeout: 30_000,
    expect: {
        timeout: 10_000,
    },
    reporter: [
        ['list'],
        ['html', { outputFolder: runId ? `test-reports/runs/${runId}` : 'playwright-report', open: 'never' }],
    ],
    use: {
        baseURL: `http://127.0.0.1:${process.env.E2E_PORT || '4174'}`,
        browserName: 'chromium',
        headless: true,
        viewport: { width: 1440, height: 900 },
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        video,
    },
});
