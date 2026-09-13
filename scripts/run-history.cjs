// Browsable history of recorded test runs.
//
// Ordinary runs stay lean: one shared Playwright report folder and no video.
// When `node tests ... --video` records a run, that run gets its own report and
// artefact folders under `test-reports/`, and this module keeps an index page
// so earlier recorded runs stay reachable.
//
// `test-reports/` is deliberately separate from `playwright-report/` and
// `test-results/`, because Playwright clears both of those at the start of
// every run and would otherwise delete earlier recordings.

const fs = require('fs');
const path = require('path');

const HISTORY_LIMIT = 50;
const REPORT_ROOT = 'test-reports';

function historyFile(root) {
    return path.join(root, 'e2e', 'logs', 'run-history.json');
}

function indexFile(root) {
    return path.join(root, REPORT_ROOT, 'history.html');
}

/** Every `video.webm` produced by a run, relative to the repository root. */
function collectVideos(outputDirectory, root) {
    const videos = [];
    const visit = (directory) => {
        if (!fs.existsSync(directory)) return;
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            const absolute = path.join(directory, entry.name);
            if (entry.isDirectory()) visit(absolute);
            else if (entry.name.endsWith('.webm')) {
                videos.push({
                    // Test artefact folders are named after the test title.
                    test: path.basename(path.dirname(absolute)).replaceAll('-', ' '),
                    file: path.relative(root, absolute).replaceAll('\\', '/'),
                    bytes: fs.statSync(absolute).size,
                });
            }
        }
    };
    visit(outputDirectory);
    return videos.sort((left, right) => left.file.localeCompare(right.file));
}

function readHistory(root) {
    const file = historyFile(root);
    if (!fs.existsSync(file)) return [];
    try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]));
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Links are relative to test-reports/history.html.
function fromReport(repositoryRelativePath) {
    return repositoryRelativePath.startsWith(`${REPORT_ROOT}/`)
        ? repositoryRelativePath.slice(REPORT_ROOT.length + 1)
        : path.posix.join('..', repositoryRelativePath);
}

function renderIndex(entries) {
    const rows = entries.map((entry) => {
        const videos = entry.videos.length
            ? `<ul class="videos">${entry.videos.map((video) => `
                <li>
                    <a href="${escapeHtml(fromReport(video.file))}">${escapeHtml(video.test)}</a>
                    <span class="size">${escapeHtml(formatBytes(video.bytes))}</span>
                    <video controls preload="none" src="${escapeHtml(fromReport(video.file))}"></video>
                </li>`).join('')}</ul>`
            : '<p class="empty">No video recorded for this run.</p>';
        return `
        <section class="run ${entry.status}">
            <h2>${escapeHtml(entry.startedAt)} &mdash; <code>${escapeHtml(entry.scope)}</code></h2>
            <p class="meta">
                <span class="status">${escapeHtml(entry.status.toUpperCase())}</span>
                <span>${escapeHtml(entry.durationSeconds)}s</span>
                <span>${entry.videos.length} video${entry.videos.length === 1 ? '' : 's'}</span>
                <a href="${escapeHtml(`runs/${entry.runId}/index.html`)}">Playwright report</a>
                <a href="${escapeHtml(fromReport(entry.logFile))}">Runner log</a>
            </p>
            ${videos}
        </section>`;
    }).join('\n');

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Recorded test runs</title>
<style>
    :root { color-scheme: light dark; }
    body { margin: 0; padding: 1.5rem; font: 15px/1.5 system-ui, sans-serif; max-width: 60rem; }
    h1 { font-size: 1.4rem; margin-top: 0; }
    .run { border: 1px solid rgba(128,128,128,0.4); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1rem; }
    .run h2 { font-size: 1rem; margin: 0 0 0.35rem; }
    .meta { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; margin: 0 0 0.5rem; font-size: 0.85rem; }
    .status { font-weight: 700; letter-spacing: 0.04em; }
    .run.passed .status { color: #157f3b; }
    .run.failed .status { color: #b3261e; }
    .videos { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); gap: 0.75rem; }
    .videos li { border: 1px solid rgba(128,128,128,0.3); border-radius: 6px; padding: 0.5rem; }
    .videos video { width: 100%; margin-top: 0.4rem; border-radius: 4px; }
    .size { font-size: 0.75rem; opacity: 0.7; margin-left: 0.4rem; }
    .empty { font-size: 0.85rem; opacity: 0.7; margin: 0; }
    code { font-size: 0.9em; }
</style>
</head>
<body>
<h1>Recorded test runs</h1>
<p>Newest first. Runs appear here when recorded with <code>node tests &lt;scope&gt; --video</code>. Each run keeps its own Playwright report and artefacts, so earlier recordings are not overwritten.</p>
${rows || '<p class="empty">No recorded runs yet.</p>'}
</body>
</html>
`;
}

/**
 * Record one video run and refresh the index page.
 * @returns {{ videos: Array, indexPath: string }}
 */
function recordVideoRun(root, summary, outputDirectory) {
    const videos = collectVideos(outputDirectory, root);
    const entry = {
        runId: summary.runId,
        scope: summary.scope,
        startedAt: summary.startedAt,
        durationSeconds: summary.durationSeconds,
        status: summary.status,
        logFile: summary.logFile,
        videos,
    };

    const entries = [entry, ...readHistory(root).filter((existing) => existing.runId !== entry.runId)]
        .slice(0, HISTORY_LIMIT);

    fs.mkdirSync(path.dirname(historyFile(root)), { recursive: true });
    fs.writeFileSync(historyFile(root), `${JSON.stringify(entries, null, 2)}\n`, 'utf8');

    const target = indexFile(root);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, renderIndex(entries), 'utf8');

    return { videos, indexPath: path.relative(root, target).replaceAll('\\', '/') };
}

module.exports = { recordVideoRun, collectVideos, readHistory };
