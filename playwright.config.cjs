const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './e2e',
    outputDir: './test-results',
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
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ],
    use: {
        baseURL: `http://127.0.0.1:${process.env.E2E_PORT || '4174'}`,
        browserName: 'chromium',
        headless: true,
        viewport: { width: 1440, height: 900 },
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        video: 'off',
    },
});
