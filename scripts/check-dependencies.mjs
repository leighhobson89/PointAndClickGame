import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(root, 'src');
const files = [];
const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) visit(absolute);
        else if (/\.m?js$/.test(entry.name)) files.push(absolute);
    }
};
visit(sourceRoot);

const rank = { domain: 0, content: 0, application: 1, state: 1, adapters: 2 };
const graph = new Map();
const errors = [];
for (const file of files) {
    const relative = path.relative(sourceRoot, file).replaceAll('\\', '/');
    const boundary = relative.split('/')[0];
    const text = fs.readFileSync(file, 'utf8');
    if (boundary === 'domain' && /\b(?:document|window|HTMLCanvasElement|CanvasRenderingContext2D|localStorage)\b/.test(text)) {
        errors.push(`${relative}: domain code may not use browser globals`);
    }
    const dependencies = [];
    for (const match of text.matchAll(/(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/g)) {
        if (!match[1].startsWith('.')) continue;
        const target = path.resolve(path.dirname(file), match[1]);
        const targetRelative = path.relative(sourceRoot, target).replaceAll('\\', '/');
        const targetBoundary = targetRelative.split('/')[0];
        dependencies.push(targetRelative);
        if ((rank[boundary] ?? 0) < (rank[targetBoundary] ?? 0)) errors.push(`${relative}: ${boundary} may not import ${targetBoundary}`);
    }
    graph.set(relative, dependencies);
}

const visiting = new Set();
const visited = new Set();
const walk = (file, chain = []) => {
    if (visiting.has(file)) errors.push(`dependency cycle: ${[...chain, file].join(' -> ')}`);
    if (visited.has(file) || visiting.has(file)) return;
    visiting.add(file);
    for (const dependency of graph.get(file) ?? []) if (graph.has(dependency)) walk(dependency, [...chain, file]);
    visiting.delete(file);
    visited.add(file);
};
for (const file of graph.keys()) walk(file);

if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
} else {
    console.log(`Dependency boundaries valid (${files.length} modules, no cycles).`);
}

