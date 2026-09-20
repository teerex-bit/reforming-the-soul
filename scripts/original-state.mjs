import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = ['reforming-the-soul', 'rts-website', 'rts-website-done-upload'];
const record = path.join(project, 'docs', 'one-page-test');
fs.mkdirSync(record, { recursive: true });
const files = [];
const directories = [];
for (const name of roots) {
  const root = path.join('C:/Users/TEEREX/Documents', name);
  function scan(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const location = path.join(directory, entry.name);
      const stat = fs.lstatSync(location);
      assert(!stat.isSymbolicLink(), `Unexpected filesystem link: ${location}`);
      const relative = `${name}/${path.relative(root, location).replaceAll('\\', '/')}`;
      if (stat.isDirectory()) {
        directories.push(relative);
        scan(location);
      } else {
        files.push({ path: relative, bytes: stat.size, mtimeMs: stat.mtimeMs,
          sha256: crypto.createHash('sha256').update(fs.readFileSync(location)).digest('hex') });
      }
    }
  }
  scan(root);
}
files.sort((a, b) => a.path.localeCompare(b.path));
directories.sort();
const state = { files, directories };
const baseline = path.join(record, 'original-before.json');
if (process.argv[2] === 'capture') {
  fs.writeFileSync(baseline, JSON.stringify(state, null, 2), { flag: 'wx' });
  console.log(`Captured ${files.length} original files and ${directories.length} directories.`);
} else if (process.argv[2] === 'verify') {
  assert.deepEqual(state, JSON.parse(fs.readFileSync(baseline, 'utf8')), 'Original site changed');
  const result = { checkedAt: new Date().toISOString(), files: files.length,
    directories: directories.length, contentChanges: 0, modificationTimeChanges: 0,
    addedOrRemovedPaths: 0, allOriginalFoldersUnchanged: true };
  fs.writeFileSync(path.join(record, 'original-verification.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} else throw new Error('Use capture or verify');
