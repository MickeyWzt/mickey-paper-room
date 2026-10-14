import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const stage = path.join(root, 'releases', new Date().toISOString().replace(/[:.]/g, '-'));
const files = new Set(['index.html', 'room-v3.html']);
for (const file of fs.readdirSync(path.join(dist, 'assets'))) {
  if (/\.(js|css)$/.test(file)) files.add(`assets/${file}`);
}
for (const file of [...files]) {
  const content = fs.readFileSync(path.join(dist, file), 'utf8');
  for (const match of content.matchAll(/\/assets\/([a-zA-Z0-9_./-]+\.(?:glb|png|webp|jpg|jpeg|woff2|json|js|css))/g)) files.add(`assets/${match[1]}`);
}
for (const file of ['room-v24-web.glb', 'player-v5-web.glb', 'details-v24.glb', 'furnishings-v24.glb', 'entrance-v8/plaque.png', 'entrance-v8/botanical-card.png', 'entrance-v8/wooden-stool.png', 'entrance-v13/potted-plant-alpha.png', 'FONT-SOURCE.txt', 'KENNEY-LICENSE.txt', 'OFL.txt']) files.add(`assets/${file}`);

// Resolve and read all assets before writing a release, so a missing resource
// cannot leave a directory that appears to contain a complete release.
const entries = [...files].sort().map(file => {
  if (file.split('/').includes('..')) throw new Error(`Unsafe asset path: ${file}`);
  const bytes = fs.readFileSync(path.join(dist, file));
  return { file, bytes, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
});
for (const entry of entries) {
  const target = path.join(stage, 'site', entry.file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, entry.bytes);
}
const manifest = entries.map(({ file, bytes, sha256 }) => ({ file, bytes: bytes.length, sha256 }));
fs.writeFileSync(path.join(stage, 'release-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ stage, files: manifest.length, bytes: manifest.reduce((sum, item) => sum + item.bytes, 0) }, null, 2));
