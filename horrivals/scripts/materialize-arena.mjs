import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const partsDir = path.join(root, '.arena-v8-parts');
const out = path.join(root, 'public', 'assets', 'ui', 'arena-v8.webp');

const files = fs.readdirSync(partsDir)
  .filter(name => /^part-\d+\.txt$/.test(name))
  .sort();

if (files.length !== 10) {
  throw new Error(`Expected 10 arena chunks, found ${files.length}`);
}

const base64 = files
  .map(name => fs.readFileSync(path.join(partsDir, name), 'utf8').trim())
  .join('');
const buffer = Buffer.from(base64, 'base64');

if (buffer.length !== 59032) {
  throw new Error(`arena-v8.webp materialization failed: ${buffer.length} bytes`);
}
if (buffer.subarray(0, 4).toString('ascii') !== 'RIFF' || buffer.subarray(8, 12).toString('ascii') !== 'WEBP') {
  throw new Error('arena-v8.webp is not a valid WebP RIFF container');
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buffer);
console.log(`Materialized arena-v8.webp: ${buffer.length} bytes`);
