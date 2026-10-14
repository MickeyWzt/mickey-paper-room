import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const output = path.join(root, '.vercel/output');
const target = path.join(output, 'static');
// A fresh build-output directory prevents retired assets from being published.
if (fs.existsSync(output)) throw new Error('Archive the existing .vercel/output before preparing a new release.');
const files = new Set(['index.html', 'room-v3.html']);
for (const name of fs.readdirSync(path.join(dist, 'assets'))) {
  if (/\.(js|css)$/.test(name)) files.add(`assets/${name}`);
}
for (const file of [...files]) {
  const content = fs.readFileSync(path.join(dist, file), 'utf8');
  for (const match of content.matchAll(/\/assets\/([a-zA-Z0-9_./-]+\.(?:glb|png|jpg|webp|woff2|json|js|css))/g)) files.add(`assets/${match[1]}`);
}
// Models and entrance props resolve these filenames dynamically in the application.
for (const file of ['room-v24-web.glb', 'player-v5-web.glb', 'details-v24.glb', 'furnishings-v24.glb', 'entrance-v8/plaque.png', 'entrance-v8/botanical-card.png', 'entrance-v8/wooden-stool.png', 'entrance-v13/potted-plant-alpha.png', 'FONT-SOURCE.txt', 'KENNEY-LICENSE.txt', 'OFL.txt']) files.add(`assets/${file}`);
const manifest = [];
for (const file of [...files].sort()) {
  const bytes = fs.readFileSync(path.join(dist, file));
  const destination = path.join(target, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
  manifest.push({ file, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
}
fs.writeFileSync(path.join(output, 'config.json'), JSON.stringify({ version: 3 }, null, 2));
fs.writeFileSync(path.join(root, '.vercel/release-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ files: manifest.length, bytes: manifest.reduce((n, f) => n + f.bytes, 0), manifest }, null, 2));
