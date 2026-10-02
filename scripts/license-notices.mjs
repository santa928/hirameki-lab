import { readdirSync, readFileSync, realpathSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Preserve upstream notices in the shipped Pages artifact as well as in GitHub source.
const notices = [readFileSync('THIRD_PARTY_NOTICES.md', 'utf8'), ...readdirSync('third-party').map(file => `\n--- Supplemental upstream notice: ${file} ---\n${readFileSync(path.join('third-party', file), 'utf8')}`)];
/** Find nested upstream notices without traversing dependency links. */
function licenseFiles(root, relative = '') {
 return readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap(entry => {
  const file = path.join(relative, entry.name);
  if (entry.isDirectory() && !['node_modules', '.git'].includes(entry.name)) return licenseFiles(root, file);
  return entry.isFile() && /^(licen[cs]es?|copying|notice)(?=[._-]|$)/i.test(entry.name) ? [file] : [];
 });
}
const seen = new Set();
for (const version of readdirSync('node_modules/.pnpm')) {
 const directory = path.join('node_modules/.pnpm', version, 'node_modules');
 if (!existsSync(directory)) continue;
 const roots = readdirSync(directory).flatMap(name => name.startsWith('@') ? readdirSync(path.join(directory, name)).map(child => path.join(directory, name, child)) : [path.join(directory, name)]);
 for (const candidate of roots) {
  if (!existsSync(path.join(candidate, 'package.json'))) continue;
  const root = realpathSync(candidate); if (seen.has(root)) continue; seen.add(root);
  const metadata = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const files = licenseFiles(root);
  for (const file of files) notices.push(`\n--- ${metadata.name}@${metadata.version} / ${file} ---\n${readFileSync(path.join(root, file), 'utf8')}`);
 }
}
writeFileSync('dist/THIRD_PARTY_NOTICES.txt', notices.join('\n'));
