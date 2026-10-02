import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Bind the immutable Pages artifact to the verified commit and its actual assets.
const commit = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(commit || '')) throw Error('Pass the verified full commit SHA');
const files = ['index.html', 'favicon.svg', 'mascot.png', ...readdirSync('dist/assets').map(name => `assets/${name}`)];
const sha256 = Object.fromEntries(files.map(file => [file, createHash('sha256').update(readFileSync(`dist/${file}`)).digest('hex')]));
writeFileSync('dist/version.json', JSON.stringify({ commit, sha256 }) + '\n');
